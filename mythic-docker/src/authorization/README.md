# Authorization policies

The `authorization` package owns scope constants, definitions, and helpers.
JWT, HTTP, and RPC code import these directly from this package.

Database models declare their permissions with a value-receiver method returning
plain Go data. `PolicyProvider` is the interface; `ResourcePolicy` is its result.
For example, the credential model declares:

```go
func (Credential) AuthorizationPolicy() authz.ResourcePolicy {
    return authz.ResourcePolicy{
        Table:         authz.TableRef{Schema: "public", Name: "credential"},
        OperationPath: []string{"operation_id"},
        Read:          authz.Rule{Permission: authz.SCOPE_CREDENTIAL_READ},
        Write:         authz.Rule{Permission: authz.SCOPE_CREDENTIAL_WRITE},
        Relationships: []authz.RelationshipBinding{
            {Name: "apitoken", Target: Apitokens{}},
        },
    }
}
```

`OperationPath` can traverse relationships, for example
`[]string{"payload", "operation_id"}`. When ownership can come from alternative
paths, use `OperationPaths` instead:

```go
OperationPaths: [][]string{
    {"operation_id"},
    {"payload", "operation_id"},
},
```

These paths are combined with OR, and each is checked against the same scope's
allowed operation IDs. This covers both saved presets and payload-associated
build parameter instances whose own operation ID is null. Declare only one of
`OperationPath` and `OperationPaths`; empty alternatives and invalid paths fail
generation. For alternative paths, Hasura checks mutations against the complete
row rather than rejecting an individual operation field during preflight.

A resource with no operation path uses an
actor-ID claim for its scope gate; existing user-role permissions still constrain
which rows and writes the actor can access. Explicit `Rule{Public: true}` marks
authenticated catalogs that require no resource scope. An empty rule does not
silently grant access.

`ChatChannel` and `ChatMessage` demonstrate category rules:

```go
Read: authz.Rule{ByValue: &authz.ValueRule{
    Path: []string{"channel", "channel_type"},
    Cases: []authz.ValueCase{
        {Value: ChatChannelTypeStandard, Permission: authz.SCOPE_CHAT_READ},
        {Value: ChatChannelTypeAI, Permission: authz.SCOPE_CHAT_AI_READ},
    },
}},
```

A broad chat query requires at least one category grant and returns only granted
categories. Explicit IDs and category predicates require that category's grant;
an explicitly targeted AI mutation requires `chat-ai.write` even when the caller
can read AI chat. Runtime target facts are resolved within the token's operation
and memoized for the entire HTTP request, including batches.

For identifier-based checks, declare the lookup alongside the model's rule:

```go
Lookup: &authz.ValueLookup{
    Column: "id",
    Query: `SELECT channel_type FROM chat_channel
            WHERE id=$1 AND operation_id=$2`,
},
```

`Column` is the database identifier column. `$1` receives the requested identifier
and `$2` receives the token's fixed operation. The query must return one category
and constrain both its row and any joined operation rows. `ChatMessage` shows an
explicit join query. There is no SQL-generation framework or database access
during generation. The compiler checks identifier columns and parameter slots,
and derives native GraphQL lookup bindings from column aliases and the category
path's existing relationship metadata. For example, a message's `channel_id`
uses the channel model's lookup without repeating that SQL in the message model.

The auth hook executes the compiled query with bound parameters and caches facts
across aliases and batch entries. Its resolver and the generic preflight have
no chat table names or chat-specific dispatch. Static resource permissions,
such as the AI-only request model, require no category query.

## Offline generation

From the repository root:

```sh
make build_authorization
make check_authorization
make test_authorization
```

The same targets are available in `mythic-docker/src/Makefile`, beside protobuf
generation. The server build runs the freshness check. Generation reads only:

- Go model methods and `db`/`json` tags;
- the scope catalog in `authorization/catalog.go`;
- authored Hasura metadata and `actions.graphql` in `hasura-docker/metadata`;
- declarative route scope middleware in `webserver/initialize.go`.

Both server Dockerfiles use `mythic-docker` as their build context. From the
repository root:

```sh
make build_authorization
make -C mythic-docker build_container
```

Run `make build_authorization` before the first local image build and after
changing any generator input listed above. It updates the generated artifacts
and refreshes a gitignored copy of the complete Hasura metadata under
`mythic-docker/src/authorization/hasura-metadata/`. It reuses the compiled metadata
bytes and removes obsolete files from that local copy. Both Dockerfiles already
copy `src/`, so the server build can read the copy within its existing context.

The freshness check uses `hasura-docker/metadata` when available and falls back
to the local copy inside Docker. The check never creates or refreshes that copy;
if it is missing, the build asks you to run `make build_authorization` first.
Hasura continues to load its deployed metadata from `hasura-docker/metadata`.

The CLI's generated Compose definition and the CI release build also use the
`mythic-docker` context. CI copies the checked-in Hasura metadata into the local
build folder before building, so a fresh checkout has the input required by the
server's freshness check.

The generator discovers model methods with Go's parser, emits a typed registry,
then compiles and evaluates the actual Go declarations. It derives relationships
from metadata and typed associations. Add a local `RelationshipBinding` only
when the source cannot resolve an association; unknown targets and conflicting
bindings fail generation. There is no separate table-to-permission registry to
maintain and no live-schema introspection or checked-in introspection snapshot.

Outputs are `database/structs/authorization.generated.go`,
`authorization/metadata.generated.json`, and updated permissions directly in
`hasura-docker/metadata`. The Hasura image and CLI use that same metadata folder;
there is no separate generated deployment tree. Commit generated changes with
their Go declarations. The JSON file is the server's embedded preflight index,
not a second copy of Hasura's deployment configuration.

Normal sessions and API tokens use the same roles: `operator`, `spectator`,
`operation_admin`, and `mythic_admin`. Each role combines its authored row and
column permissions with the Go model's scope checks. Interactive sessions emit
real operation IDs for their scopes, then the authored role filters determine
which rows they may access. This preserves selected-operation filters as well as
administrator and owner views that intentionally span operations. Tokens emit
only their concrete grants for their fixed operation. No separate `token_*`
roles are generated.

Each managed permission has an `authzgen:` comment identifying its generated
scope guard as the final term in the outer `_and` of `filter`/`check`. Edit the
preceding authored conditions and the allowed columns normally, then run
`make build_authorization`. The generator replaces that final term rather than
appending another guard. It also checks resulting rows on updates. For example:

```yaml
filter:
  _and:
    - operation_id:                         # Authored row restriction
        _eq: X-Hasura-Current-Operation-Id
    - operation_id:                         # Generated from the Go read rule
        _in: x-hasura-credential-read-operation-ids
```

Keep the ownership comment and generated wrapper when editing these permissions.
`make check_authorization` checks that deployed metadata matches the Go policies
without changing any files. Repeated generation is tested, including replacing
scope rules and activating/removing field rules.

Write row restrictions directly. An explicit root `filter: {}` can intentionally
allow all rows, and `relationship: {}` can require a related row. Empty branches
inside `_and` or `_or` are rejected during generation: they add no constraint in
an AND and bypass sibling conditions in an OR. The compiler omits empty guards
when composing permissions instead of emitting these branches.

Static Action permissions come from `TokenScopeMiddleware`. Authenticated-only
Actions declare `TokenScopeMiddleware(nil)` explicitly. Dynamic Actions declare
target facts in their model policy's `Actions` list; `ChatChannel` has examples.
`Resource` selects the model rule, `Access` selects read/write, and `Argument`
names the identifier argument. For creation, `ValueArgument` supplies a category
directly, with `DefaultValue` used when omitted; no lookup is needed. An omitted
optional identifier retains the broad query's category filtering behavior.
Its `ReadWhen` argument rule preserves read-only personal mute updates inside
the shared channel-update Action. Dynamic checks retain route scope requirements.
A registered Action without either declaration fails generation. Obsolete
Actions without registered routes fail preflight closed.

## Request flow

Database lookups and HTTP caching have separate responsibilities:
`database.GetUserOperation` is the single operation/membership query and accepts
the already loaded owner plus an explicit operation ID. Login/refresh summaries
use it through `database.GetUserCurrentOperation`; authenticated requests use
`authentication.GetRequestOperation`, which caches the result in Gin. Likewise,
`GetRequestUser` reuses the owner that authentication already loaded instead of
calling the uncached `database.GetUserFromID` again. A token's operation always
comes from its claims, independently of the owner's interactive selection.
Authenticated HTTP handlers should use these cached helpers for the caller and
their current operation. Keep explicit database lookups for target accounts,
other operations, credential verification and login/background work; those are
different data or require a fresh read. Request caches are not shared between
HTTP requests or between an auth callback and an Action execution request.

1. Nginx sends HTTP GraphQL and WebSockets directly to Hasura. Its POST auth hook
   authenticates once and caches the token record, owner, claims, operation
   membership, and exact scope set in the Gin context. The CLI explicitly enables
   `HASURA_GRAPHQL_AUTH_HOOK_SEND_REQUEST_BODY=true` so HTTP preflight receives
   the complete operation or batch.
2. For HTTP GraphQL, parse each selected document once and check roots, nested
   relationships, filters, orderings, and mutation inputs against generated
   descriptors. Check every batch entry before returning session claims.
3. On failure, the hook returns 401. Hasura rejects the request with its generic
   `access-denied` authentication error; it does not forward the hook's detailed
   error body. Missing grants error even when the database has no matching rows.
   Use `scopeCheck` for a specific permission diagnostic.
4. Build Hasura session variables from the cached identity, role and scopes.
   Return these variables directly to Hasura to enforce row and column
   permissions. Missing grants have empty operation/actor ID arrays; shared roles
   intersect these predicates with their authored row permissions, including
   post-update checks. No GraphQL proxy, signed handoff or admin-secret forwarding
   is needed for ordinary requests.

For example, `task.read` uses `x-hasura-task-read-operation-ids = "{3}"` for a
token bound to operation 3, or `"{}"` when ungranted. Global resources use the
corresponding actor-ID array with Hasura `_exists`. Ordinary clients cannot
override claims with `X-Hasura-*` headers: the hook derives session variables from
the authenticated credential. The built-in Hasura `admin` role is never used
for ordinary requests.
Hasura's admin-secret access remains available for administrative clients.

WebSocket connection authentication has no HTTP operation to preflight.
WebSockets use native Hasura row filtering and connection-time claims;
missing grants can return empty results, and revocation takes effect
after reconnection. They have no forced credential renewal. Hasura remains
responsible for the full GraphQL schema and execution;
existing Actions and their SDL remain the API contract. Actions still call their
Mythic handlers to execute and authenticate with the original bearer credential;
that execution request is separate from the auth-webhook callback.

`scopeCheck` is authenticated but requires no resource scope, so a token missing
a permission can still ask why access was denied. For example:

```graphql
query {
  scopeCheck(resource: "task", action: "read", operation_id: 9) {
    allowed
    reason
    required_scope
    message
  }
}
```

A token without `task.read` receives `allowed: false`, `reason: "missing_scope"`
and `required_scope: "task.read"`. A token bound to another operation receives
`reason: "operation_not_available"` when it has the scope. This checks grants and
operation availability; authored row restrictions still determine access to
particular records. The direct `/scope_check_webhook` API is also retained.

RabbitMQ resolves source authorization once per delivery, verifies the current
token and owner authority, and shares that result with its handler. Background
work retains the triggering token's scope ceiling. A token ID associated with a
task, callback, payload, or chat channel records provenance and lifecycle; it
does not restrict the token to that individual object.

## Toggling credential-value access

`credential.value.read` is registered for token issuance, scope discovery and
`scopeCheck(resource: "credential", action: "value.read")`. It includes metadata
read access. Neither `credential.read` nor `credential.write` includes value
access; existing tokens do not gain the new grant automatically. New `*` and
`credential.*` issuance includes it, subject to the issuing token's ceiling.

The restriction is enabled by the following three-line block in
`database/structs/Credential.go`. Comment out this block to disable enforcement,
or uncomment it to enable enforcement:

```go
FieldReads: []authz.FieldReadRule{
    {Fields: CredentialValueFields, Permission: authz.SCOPE_CREDENTIAL_VALUE_READ},
},
```

After either change, run `make build_authorization` and rebuild/deploy the server
and Hasura metadata together. No catalog, handler, RPC or UI edits are needed.
The scope remains registered while enforcement is disabled, so tokens can be
prepared before re-enabling it. Issue replacement tokens with the explicit value
grant where needed; wildcard grants on existing tokens remain frozen.

`CredentialValueFields` identifies the raw `credential` column and computed
`credential_text`. The GraphQL name `credential_raw` and Go JSON name
`credential` are derived from existing metadata and struct tags.

When a field rule is activated, the compiler generates internal `authz_base_*`
and `authz_field_*` helpers, composed under the same shared role with Hasura
inherited roles. These helpers serve both sessions and API tokens; they are
absent when no field rules are active. Regeneration restores their field
selections before rebuilding the split, and removes obsolete helpers when the
rule is deactivated. Ungranted projected fields become `null` while record
metadata remains visible. Queries may select the fields without the value
permission; filtering, ordering, or distinct/count column arguments involving
protected values error before execution. Write rules remain separate.

Direct Go response paths use `ProjectFields(table, scopeSet, response)` with the
same model declaration. `UpdateCredentialWebhook` and
`MythicRPCCredentialSearch` already apply it; credential RPC value predicates
also check the rule. New direct response paths that expose protected fields must
apply this shared projection. Its response remains JSON with explicit nulls. Metadata-only
references require the credential read grant. These checks reuse the task's
resolved scope set; they do not authenticate or expand grants again.

`webserver/controllers/authorization_integration_test.go` is the integration
fixture: it enables the field rule locally even if its source block is disabled,
compiles the production models, and loads the output into disposable Hasura and
PostgreSQL containers. It verifies raw/computed masking over HTTP, aggregate
nodes and native WebSockets; Action and RPC masking; predicate denial; session
compatibility; batch atomic denial; token delegation and revocation; operation
binding; and owner-role limits. Compiler tests also disable/re-enable the field
block and verify that generated permissions are restored exactly. The fixture
never changes a running Mythic database.

With the local `mythic_postgres:latest` and `mythic_graphql:latest` images present:

```sh
make test_authorization_integration
```

## Token issuance and upgrade

`database.CreateAPIToken` is the shared issuance boundary for HTTP, RPC,
container startup, and workflow inputs. Creation requires a positive
`operation_id` and an explicit nonempty list of scopes. It trims and lowercases
the requested strings once, expands wildcards and catalog implications once,
checks the caller's ceiling, and stores a sorted concrete grant list. Repeated
request checks use exact set membership. No normalization helpers or runtime
wildcard expansion are needed.

The database prevents changing an issued token's owner or operation. Delegation
must stay in the parent's operation and cannot exceed the parent's grants.
Children are independent after issuance; revoking their parent alone does not
revoke them. The owner's current account status and role remain an upper bound.
Removing membership permanently revokes that owner's tokens for the operation;
rejoining does not reactivate them. Existing account-credential and provenance
lifecycle revocations still apply.

Migration `003003028_3.3.28.sql` enforces operation bindings and concrete scopes.
Invalid active credentials must be retired before applying those constraints.
Update token-creation clients to send `operation_id` and nonempty `scopes`, then
issue replacements. There is no legacy-token compatibility path.
