# `json_string_schema` Specification

`json_string_schema` is a declarative JSON document that describes a structured form. Mythic's Create-Payload UI renders it as the **Visual** editor for a C2 profile parameter or build parameter, giving operators a guided form instead of hand-editing a raw JSON config blob.

This document is the authoritative reference for the wire-format vocabulary.
 
---

## 1. Where `json_string_schema` lives

`json_string_schema` is a first-class field on **C2 profile parameter** and **build parameter**. It travels with the rest of the parameter metadata through the sync pipeline; there is no separate RPC call to fetch it.

## 2. When the Visual editor appears

The Visual editor is shown for every parameter that has a `json_string_schema` and is of type `JSONString`. The config-editor dialog shows **Visual** and **Source** tabs.

### The JSON round-trip

The parameter's stored value is a **string** (the raw config). The Visual editor is a view
over the JSON parse of that string:

- **Entering Visual:** the current source is `JSON.parse`d into the value tree the form edits.
  If the source is **not valid JSON**, the switch is blocked and an error is shown — so a TOML config cannot use the Visual tab.
- **Editing in Visual:** every change is serialized back with `JSON.stringify(value, null, 2)` and written to the parameter value.

**Consequence:** the top-level `json_string_schema` should describe a JSON document — in practice
`{"type": "object", ...}` (an `array` or `string_map` root also works). It must round-trip
cleanly through `JSON.parse` / `JSON.stringify`.
 
---

## 3. The schema descriptor

Every node in a `json_string_schema` is a JSON object with a `type`. `type` is **required**; an unrecognized `type` renders a visible `Unknown schema type: <x>` notice rather than failing.

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

**`name` is mandatory on every entry in `fields`.** It is the JSON key the sub-value is stored under and the React key used for rendering. Two fields with the same `name` collide.

Each field in `fields` may additionally carry `show_when` (§5.1) and `placeholder_when` (§5.2).

**Layout / nesting behavior:**

- The **top-level** object (depth 0) renders with no surrounding card; its `label` is a bold heading. Content flows in the dialog's natural padding.
- A **nested** object (inside another object or an array) renders with a soft left-border accent and indentation.
    - If the nested object has a `label`, it is wrapped in a **collapsible section** (expandable header showing the label, plus the `description` underneath when expanded). Sections start **expanded**; there is no schema key to start a section collapsed.
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

- An **Add** button appends a new element seeded with `emptyValueForSchema(items)` (§6); each row has a delete button.
- When the array has a `label`, it is a collapsible section whose header shows a live count, e.g. `URIs (3)`, plus the `description`.
- **Array of objects** (`items.type === "object"`): each element is rendered in its own outlined card containing the item's `fields`. `show_when` / `placeholder_when` on those fields are evaluated **per element** against that element's own value.
- **Array of primitives** (anything else): each element is rendered with the item control and a delete button.

> Note: the `items` schema's own `label` is **not** displayed (it is stripped for primitive items and unused for object items). Put the human-readable name on the **array** node via its `label`.

### 4.3 `enum`

 ```json
 {
   "type": "enum",
   "label": "Method",
   "choices": ["GET", "POST"],
   "choices_display_names": { "GET": "HTTP GET", "POST": "HTTP POST" }
 }
 ```

| Key | Type | Required | Notes |
 |-----|------|----------|-------|
| `choices` | array | yes | The selectable values. Each is used as both the stored value and the option key, so use **unique primitives** (strings recommended). |
| `choices_display_names` | object | no | Map of `value → display text`. A value with no entry shows its raw value. |

> This is the same `choices_display_names` key Mythic uses for the display labels of its native `ChooseOne` / `ChooseMultiple` parameters

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
   "key_label": "Header",
   "value_label": "Contents"
 }
 ```

| Key | Type | Required | Default | Notes |
 |-----|------|----------|---------|-------|
| `key_label` | string | no | `"Key"` | Column label for keys. |
| `value_label` | string | no | `"Value"` | Column label for values. |

Renders an editable table of string→string entries:

- **Add entry** inserts a fresh key (`new_key`, then `new_key_1`, … to avoid collisions) with an empty value.
- A key is renamed **on blur**; values update live.
- When it has a `label`, it is a collapsible section with a live entry count.

Empty value default is `{}`.
 
---

## 5. Conditional rendering

These modifiers live on a **field within an object's `fields[]`** (or within an array-of-object item's `fields[]`). They are evaluated against the **sibling** values in the same object/element.

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

The field is rendered **iff** `siblingValue ∈ in`. If `show_when` is absent or malformed (missing `field`, or `in` is not an array), the field is always shown.

> **Hidden fields keep their value.** Hiding only suppresses rendering — the field's existing value remains in the object and will be serialized. Design your consumer to tolerate stale-but-hidden keys, or clear them server-side.

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

Before rendering, the renderer looks up the sibling's current value in `map`. If it resolves to a non-empty string, that string becomes the field's `placeholder`. No match (or the feature absent) leaves any static `placeholder` untouched. Only meaningful on `string` fields, since `placeholder` is consumed there.
 
---

## 6. Empty / default values

When a value is missing (a new object field, a freshly added array element, an empty config on first Visual entry), the renderer seeds it from the schema via `emptyValueForSchema`:

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

> These are the **only** defaults `json_string_schema` provides — type-based zero values. There is no per-node `default` key, and no per-node randomization. For author-supplied default *content* and for randomized values, see §7.
 
---

## 7. Defaults and randomization (parameter-level, not schema-level)

`json_string_schema` describes **structure only**.
The renderer reads no `default`, `randomize`, or `format_string` keys on any node. Both "default data" and "random data" are governed one level up, by **peer fields on the parameter** that carries the schema, not by the schema itself.

### Where a form_schema field's initial content comes from

When the operator opens the Visual editor, the form is populated in this order of precedence:

1. **The parameter's current value / `default_value`** — a raw config **string**. The Visual tab
   runs `JSON.parse` on it and edits the resulting tree. This is the real way to ship a non-trivial default: set the
   parameter's `default_value` to a JSON string. (It must be JSON-parseable for Visual to seed from it — see §2's round-trip rule.)
2. **A preset** - The `JSONString` parameter can define a `dynamic_query_function`. If it does, this function is queried and you get back `ComplexChoices`. Each `ComplexChoice` has a `display_name` and a `value`. The `display_name` is shown as a dropdown choice option and if the user selects it, then the corresponding `value` (also a raw config string, parsed the same way) is set as the parameter's value.
3. **Type-based seeding** from §6 (`emptyValueForSchema`) when the source is empty — `""`, `0`, `[]`, etc.

So if you want the Visual form to open with meaningful values, put them in the parameter's `default_value` or ship presets; you cannot express them inside the schema.

### Randomization is parameter-level — and mutually exclusive with the Visual editor

A parameter gets a randomly-generated value via two peer fields:

| Parameter field | Wire key | Effect |
 |-----------------|----------|--------|
| `DefaultValue` | `default_value` | Static default value (any type matching the parameter type). |
| `Randomize` | `randomize` | When `true`, generate the value from `FormatString` **as a regex**. |
| `FormatString` | `format_string` | a randomize **regex** |

When `Randomize` is `true`, Mythic generates the value at build/instance time by feeding `FormatString` through its `reggen` regex generator (`mythic-docker/src/rabbitmq/utils.go:415`, `utils.Generate(formatString, 10)`), and `DefaultValue` is ignored.

Put randomized values (keys, URIs, tokens) in their **own** parameters, separate from any config-editor/`json_string_schema` field.

> `reggen` caps **unbounded** quantifiers (`+`, `*`, `{n,}`) at 10 repetitions, so prefer an explicit length (`{32}`) for keys. Anchors (`^`/`$`) aren't needed — it generates the whole string from the pattern.
 
---

## 8. Authoring notes & constraints

- **Root type.** Because the Visual editor is a view over `JSON.parse(value)`, the root `json_string_schema` should describe a JSON document — normally `{"type": "object", ...}`.
- **Round-trip cleanliness.** The value must survive `JSON.parse` → edit → `JSON.stringify`. Don't rely on comments, key ordering, or non-JSON syntax; those live only in the Source tab and are lost the moment a value is edited in Visual.
- **Name everything in `fields`.** Every object field needs a unique `name`.
- **Label the container, not the item.** For `array`, put the display name on the array node; `items.label` is ignored.
- **`type` is required everywhere.** A node without a recognized `type` renders an `Unknown schema type` notice.
- **Schema is data, not code.** It is stored as `jsonb` and shipped over the sync pipeline; keep it a plain JSON value with no functions or runtime references.

 ---

## 9. Worked example

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
           "key_label": "Header",
           "value_label": "Value"
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
             "choices_display_names": { "base64": "Base64", "xor": "XOR", "prepend": "Prepend" }
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

## 10. Quick reference

 ```
 node            := { "type": <T>, "label"?, "description"?, ...type-specific }
 
 object          := { type:"object", fields: [ field, ... ] }
 field           := node + { name: <string>, show_when?, placeholder_when? }
 array           := { type:"array", items: node }
 enum            := { type:"enum", choices: [<v>,...], choices_display_names?: { <v>: <label> } }
 string          := { type:"string", placeholder? }
 number          := { type:"number" }
 boolean         := { type:"boolean" }
 string_map      := { type:"string_map", key_label?, value_label? }
 
 show_when       := { field: <siblingName>, in: [<v>, ...] }
 placeholder_when:= { field: <siblingName>, map: { <siblingValue>: <placeholder> } }
 ```