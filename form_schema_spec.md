# `form_schema` Specification

`form_schema` is a declarative JSON document that describes a structured form. Mythic's
Create-Payload UI renders it as the **Visual** editor for a C2 profile parameter, giving
operators a guided form instead of hand-editing a raw JSON config blob.

This document is the authoritative reference for the wire-format vocabulary. It is derived
from the renderer that consumes it — `MythicReactUI/src/components/pages/CreatePayload/SchemaFormRenderer.js`
— and the integration in `CreatePayloadParameter.js`. If you change the renderer, update
this file in the same commit.

---

## 1. Where `form_schema` lives

`form_schema` is a first-class field on a **C2 profile parameter**. It travels with the rest
of the parameter metadata through the c2 sync pipeline; there is no separate RPC call to fetch
it.

| Layer | Location |
|-------|----------|
| Sync struct | `C2Parameter.FormSchema` — `map[string]interface{}` / JSON key `form_schema` (`mythic-docker/src/rabbitmq/recv_c2_sync.go`) |
| DB struct | `C2profileparameters.FormSchema` — `MythicJSONText`, column `form_schema` (`mythic-docker/src/database/structs/C2profileparameters.go`) |
| Schema | `form_schema jsonb NOT NULL DEFAULT '{}'` on `c2profileparameters` (migration `3.3.21`, version `3003021`) |
| GraphQL | exposed as `form_schema` to all parameter-reading roles; fetched by `Step1SelectOS` and `Step4C2Profiles` |
| UI consumer | `CreatePayloadParameter` → `SchemaFormRenderer` |

A parameter ships a schema simply by populating this field during sync. No `form_fn=`
convention, no per-modal lookup.

---

## 2. When the Visual editor appears

The Visual editor is **not** shown for every parameter that has a `form_schema`. Two
conditions must both hold:

1. **The parameter opts into the config editor.** This applies only to a `String`
   parameter whose `format_string` begins with `ui:config_editor` (see `getConfigEditorMode`
   in `CreatePayloadParameter.js`). That gives the parameter the Upload / Edit / Source
   experience inside a dialog.

2. **The schema is valid** (`hasFormSchema`). The renderer treats `form_schema` as usable
   only when it is:
   - a non-`null` value,
   - an `object` (not an array), and
   - has a `type` that is a non-empty string.

   ```js
   const hasFormSchema = !!(form_schema
       && typeof form_schema === "object"
       && !Array.isArray(form_schema)
       && typeof form_schema.type === "string"
       && form_schema.type.length > 0);
   ```

When both hold, the config-editor dialog shows **Visual** and **Source** tabs. Otherwise only
the raw Source editor is shown.

> The `form_schema` column is `NOT NULL DEFAULT '{}'`, so a parameter that ships no schema
> carries an empty object. `{}` has no `type`, so it fails the gate above and only the Source
> editor is shown — exactly the intended "no schema" behavior.

### The JSON round-trip

The parameter's stored value is a **string** (the raw config). The Visual editor is a view
over the JSON parse of that string:

- **Entering Visual:** the current source is `JSON.parse`d into the value tree the form edits.
  If the source is empty, the tree is seeded with `emptyValueForSchema(form_schema)`
  (see §6). If the source is **not valid JSON**, the switch is blocked and an error is shown —
  so a TOML config cannot use the Visual tab.
- **Editing in Visual:** every change is serialized back with `JSON.stringify(value, null, 2)`
  and written to the parameter value.

**Consequence:** the top-level `form_schema` should describe a JSON document — in practice
`{"type": "object", ...}` (an `array` or `string_map` root also works). It must round-trip
cleanly through `JSON.parse` / `JSON.stringify`.

---

## 3. The schema descriptor

Every node in a `form_schema` is a JSON object with a `type`. `type` is **required**; an
unrecognized `type` renders a visible `Unknown schema type: <x>` notice rather than failing.

Supported types:

| `type` | Renders as | Value shape |
|--------|------------|-------------|
| `object` | a group of named sub-fields | JSON object keyed by each field's `name` |
| `array` | a repeatable list with Add/Delete | JSON array |
| `enum` | a dropdown (`Select`) | one chosen value |
| `string` | single-line/multi-line text field | string |
| `number` | numeric text field | number |
| `boolean` | a toggle (`Switch`) | boolean |
| `string_map` | an editable key/value table | JSON object (string→string) |

### Fields common to all types

| Key | Type | Applies to | Effect |
|-----|------|-----------|--------|
| `type` | string | all | **Required.** Selects the renderer. |
| `label` | string | all | Human-readable heading/caption. See per-type notes for placement and the collapsible behavior it triggers. |
| `description` | string | all | Secondary helper text shown under the control. |

---

## 4. Type reference

### 4.1 `object`

```json
{
  "type": "object",
  "label": "HTTP Profile",
  "description": "Top-level configuration",
  "fields": [
    { "name": "port", "type": "number", "label": "Port" },
    { "name": "use_ssl", "type": "boolean", "label": "Use SSL" }
  ]
}
```

| Key | Type | Required | Notes |
|-----|------|----------|-------|
| `fields` | array of schemas | yes | Each entry is itself a full schema descriptor **plus** a `name`. |

**`name` is mandatory on every entry in `fields`.** It is the JSON key the sub-value is stored
under and the React key used for rendering. Two fields with the same `name` collide.

Each field in `fields` may additionally carry `show_when` (§5.1) and `placeholder_when`
(§5.2).

**Layout / nesting behavior:**

- The **top-level** object (depth 0) renders with no surrounding card; its `label` is a bold
  heading. Content flows in the dialog's natural padding.
- A **nested** object (inside another object or an array) renders with a soft left-border
  accent and indentation.
  - If the nested object has a `label`, it is wrapped in a **collapsible section** (expandable
    header showing the label, plus the `description` underneath when expanded). Sections start
    **expanded**; there is no schema key to start a section collapsed.
  - If it has no `label`, it renders as a plain indented block.

### 4.2 `array`

```json
{
  "type": "array",
  "label": "URIs",
  "description": "Request paths the agent will use",
  "items": { "type": "string" }
}
```

| Key | Type | Required | Notes |
|-----|------|----------|-------|
| `items` | schema | yes | Schema for every element. Defaults to `{"type": "string"}` if omitted on the primitive path. |

Behavior:

- An **Add** button appends a new element seeded with `emptyValueForSchema(items)` (§6); each
  row has a delete button.
- When the array has a `label`, it is a collapsible section whose header shows a live count,
  e.g. `URIs (3)`, plus the `description`.
- **Array of objects** (`items.type === "object"`): each element is rendered in its own
  outlined card containing the item's `fields`. `show_when` / `placeholder_when` on those
  fields are evaluated **per element** against that element's own value.
- **Array of primitives** (anything else): each element is rendered with the item control and
  a delete button.

> Note: the `items` schema's own `label` is **not** displayed (it is stripped for primitive
> items and unused for object items). Put the human-readable name on the **array** node via
> its `label`.

### 4.3 `enum`

```json
{
  "type": "enum",
  "label": "Method",
  "choices": ["GET", "POST"],
  "choiceLabels": { "GET": "HTTP GET", "POST": "HTTP POST" }
}
```

| Key | Type | Required | Notes |
|-----|------|----------|-------|
| `choices` | array | yes | The selectable values. Each is used as both the stored value and the option key, so use **unique primitives** (strings recommended). |
| `choiceLabels` | object | no | Map of `value → display text`. A value with no entry shows its raw value. |

> The display-label key here is **`choiceLabels`** (camelCase), distinct from the
> `choices_display_names` field used by Mythic's native parameter types. Don't confuse them.

Empty value defaults to the first choice (or `""` if `choices` is empty).

### 4.4 `string`

```json
{ "type": "string", "label": "Host", "placeholder": "example.com" }
```

| Key | Type | Required | Notes |
|-----|------|----------|-------|
| `placeholder` | string | no | Hint text shown when empty. Can be made conditional via `placeholder_when` (§5.2). |

Renders a full-width text field. Empty value default is `""`.

### 4.5 `number`

```json
{ "type": "number", "label": "Interval" }
```

Renders a numeric text field. Input is coerced with `Number(...)`; empty value default is `0`.

### 4.6 `boolean`

```json
{ "type": "boolean", "label": "Enabled" }
```

Renders a toggle switch. Value is coerced with `!!`; empty value default is `false`.

### 4.7 `string_map`

```json
{
  "type": "string_map",
  "label": "Headers",
  "keyLabel": "Header",
  "valueLabel": "Contents"
}
```

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `keyLabel` | string | no | `"Key"` | Column label for keys. |
| `valueLabel` | string | no | `"Value"` | Column label for values. |

Renders an editable table of string→string entries:

- **Add entry** inserts a fresh key (`new_key`, then `new_key_1`, … to avoid collisions) with
  an empty value.
- A key is renamed **on blur**; values update live.
- When it has a `label`, it is a collapsible section with a live entry count.

Empty value default is `{}`.

---

## 5. Conditional rendering

These modifiers live on a **field within an object's `fields[]`** (or within an
array-of-object item's `fields[]`). They are evaluated against the **sibling** values in the
same object/element.

### 5.1 `show_when` — conditional visibility

```json
{
  "name": "key_path",
  "type": "string",
  "label": "Key Path",
  "show_when": { "field": "action", "in": ["xor", "aes"] }
}
```

| Key | Type | Notes |
|-----|------|-------|
| `field` | string | Name of a sibling field whose value is consulted. |
| `in` | array | The field renders only when the sibling's current value is in this list. |

The field is rendered **iff** `siblingValue ∈ in`. If `show_when` is absent or malformed
(missing `field`, or `in` is not an array), the field is always shown.

> **Hidden fields keep their value.** Hiding only suppresses rendering — the field's existing
> value remains in the object and will be serialized. Design your consumer to tolerate
> stale-but-hidden keys, or clear them server-side.

### 5.2 `placeholder_when` — conditional placeholder

```json
{
  "name": "operand",
  "type": "string",
  "label": "Operand",
  "placeholder_when": {
    "field": "action",
    "map": { "xor": "32-byte key", "prepend": "text to prepend" }
  }
}
```

| Key | Type | Notes |
|-----|------|-------|
| `field` | string | Name of a sibling field whose value is the lookup key. |
| `map` | object | `siblingValue → placeholder string`. |

Before rendering, the renderer looks up the sibling's current value in `map`. If it resolves
to a non-empty string, that string becomes the field's `placeholder`. No match (or the feature
absent) leaves any static `placeholder` untouched. Only meaningful on `string` fields, since
`placeholder` is consumed there.

---

## 6. Empty / default values

When a value is missing (a new object field, a freshly added array element, an empty config on
first Visual entry), the renderer seeds it from the schema via `emptyValueForSchema`:

| `type` | Seeded value |
|--------|--------------|
| `object` | `{}` with every field recursively seeded under its `name` |
| `array` | `[]` |
| `enum` | first `choices` entry, or `""` if none |
| `string` | `""` |
| `number` | `0` |
| `boolean` | `false` |
| `string_map` | `{}` |
| anything else | `null` |

---

## 7. Authoring notes & constraints

- **Root type.** Because the Visual editor is a view over `JSON.parse(value)`, the root
  `form_schema` should describe a JSON document — normally `{"type": "object", ...}`.
- **Round-trip cleanliness.** The value must survive `JSON.parse` → edit → `JSON.stringify`.
  Don't rely on comments, key ordering, or non-JSON syntax; those live only in the Source tab
  and are lost the moment a value is edited in Visual.
- **Name everything in `fields`.** Every object field needs a unique `name`.
- **Label the container, not the item.** For `array`, put the display name on the array node;
  `items.label` is ignored.
- **`type` is required everywhere.** A node without a recognized `type` renders an
  `Unknown schema type` notice.
- **Schema is data, not code.** It is stored as `jsonb` and shipped over the sync pipeline;
  keep it a plain JSON value with no functions or runtime references.

---

## 8. Worked example

A complete schema for an HTTP-style C2 config, exercising nesting, arrays of objects,
conditional fields, conditional placeholders, and a string map:

```json
{
  "type": "object",
  "label": "HTTP C2 Configuration",
  "fields": [
    { "name": "callback_host", "type": "string", "label": "Callback Host", "placeholder": "https://example.com" },
    { "name": "callback_port", "type": "number", "label": "Callback Port" },
    { "name": "use_ssl", "type": "boolean", "label": "Use SSL" },
    {
      "name": "get",
      "type": "object",
      "label": "GET Transport",
      "description": "Settings for GET-based polling",
      "fields": [
        { "name": "uris", "type": "array", "label": "URIs", "items": { "type": "string" } },
        {
          "name": "headers",
          "type": "string_map",
          "label": "Headers",
          "keyLabel": "Header",
          "valueLabel": "Value"
        }
      ]
    },
    {
      "name": "transforms",
      "type": "array",
      "label": "Message Transforms",
      "items": {
        "type": "object",
        "fields": [
          {
            "name": "action",
            "type": "enum",
            "label": "Action",
            "choices": ["base64", "xor", "prepend"],
            "choiceLabels": { "base64": "Base64", "xor": "XOR", "prepend": "Prepend" }
          },
          {
            "name": "value",
            "type": "string",
            "label": "Value",
            "show_when": { "field": "action", "in": ["xor", "prepend"] },
            "placeholder_when": {
              "field": "action",
              "map": { "xor": "hex-encoded key", "prepend": "bytes to prepend" }
            }
          }
        ]
      }
    }
  ]
}
```

This serializes to / parses from a JSON document like:

```json
{
  "callback_host": "https://example.com",
  "callback_port": 443,
  "use_ssl": true,
  "get": {
    "uris": ["/index", "/data"],
    "headers": { "User-Agent": "Mozilla/5.0" }
  },
  "transforms": [
    { "action": "base64" },
    { "action": "xor", "value": "deadbeef" }
  ]
}
```

---

## 9. Quick reference

```
node            := { "type": <T>, "label"?, "description"?, ...type-specific }

object          := { type:"object", fields: [ field, ... ] }
field           := node + { name: <string>, show_when?, placeholder_when? }
array           := { type:"array", items: node }
enum            := { type:"enum", choices: [<v>,...], choiceLabels?: { <v>: <label> } }
string          := { type:"string", placeholder? }
number          := { type:"number" }
boolean         := { type:"boolean" }
string_map      := { type:"string_map", keyLabel?, valueLabel? }

show_when       := { field: <siblingName>, in: [<v>, ...] }
placeholder_when:= { field: <siblingName>, map: { <siblingValue>: <placeholder> } }
```
