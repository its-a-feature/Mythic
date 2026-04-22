import React from 'react';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

// A schema descriptor is a JSON object. Supported `type` values:
//   object      { type: "object", fields: [ {name, type, label, description, show_when?, ...}, ... ] }
//   array       { type: "array", items: <schema>, label }
//   enum        { type: "enum", choices: [..], choiceLabels: {value: display}?, label }
//   string      { type: "string", label, placeholder? }
//   number      { type: "number", label }
//   boolean     { type: "boolean", label }
//   string_map  { type: "string_map", label, keyLabel?, valueLabel? }
//
// Conditional rendering: any field in an object's fields[] may carry
//   show_when: {field: "<siblingName>", in: [<values>]}
// and it will only be rendered when the sibling's current value is in the list.
//
// SchemaFormRenderer is controlled: pass `value` and `onChange`. The top-level
// call renders without a surrounding Paper; nested objects get a subtle left-
// border accent instead of stacking Paper inside Paper.

const emptyValueForSchema = (schema) => {
    switch(schema?.type){
        case "object": {
            const out = {};
            for(const f of (schema.fields || [])){
                out[f.name] = emptyValueForSchema(f);
            }
            return out;
        }
        case "array":      return [];
        case "enum":       return (schema.choices && schema.choices.length > 0) ? schema.choices[0] : "";
        case "string":     return "";
        case "number":     return 0;
        case "boolean":    return false;
        case "string_map": return {};
        default:           return null;
    }
};

const cloneValue = (v) => {
    if(v === null || v === undefined) return v;
    if(Array.isArray(v)) return v.map(cloneValue);
    if(typeof v === "object") {
        const out = {};
        for(const k of Object.keys(v)) out[k] = cloneValue(v[k]);
        return out;
    }
    return v;
};

const shouldShow = (fieldSchema, parentValue) => {
    const sw = fieldSchema?.show_when;
    if(!sw || !sw.field || !Array.isArray(sw.in)) return true;
    return sw.in.includes(parentValue?.[sw.field]);
};

const ObjectField = ({schema, value, onChange, depth}) => {
    const safeValue = (value && typeof value === "object" && !Array.isArray(value)) ? value : {};
    const body = (
        <React.Fragment>
            {(schema.fields || []).map(fieldSchema => {
                if(!shouldShow(fieldSchema, safeValue)) return null;
                const fieldValue = safeValue[fieldSchema.name];
                return (
                    <SchemaFormRenderer
                        key={fieldSchema.name}
                        schema={fieldSchema}
                        value={fieldValue === undefined ? emptyValueForSchema(fieldSchema) : fieldValue}
                        depth={(depth || 0) + 1}
                        onChange={(newFieldVal) => {
                            onChange({...safeValue, [fieldSchema.name]: newFieldVal});
                        }}
                    />
                );
            })}
        </React.Fragment>
    );

    // Top-level object gets no wrapper — content flows in the modal's natural
    // padding. Nested objects get a soft left-border accent and generous
    // interior padding.
    if(!depth || depth === 0){
        return (
            <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
                {schema.label && (
                    <Typography variant="subtitle1" style={{fontWeight: 700, letterSpacing: "0.3px"}}>
                        {schema.label}
                    </Typography>
                )}
                {body}
            </div>
        );
    }

    return (
        <div style={{marginTop: "12px", marginBottom: "8px"}}>
            {schema.label && (
                <Typography variant="subtitle2" style={{fontWeight: 600, marginBottom: "4px"}}>
                    {schema.label}
                </Typography>
            )}
            {schema.description && (
                <Typography variant="caption" color="text.secondary" style={{display: "block", marginBottom: "6px"}}>
                    {schema.description}
                </Typography>
            )}
            <div style={{
                borderLeft: "2px solid rgba(127,127,127,0.3)",
                paddingLeft: "14px",
                paddingRight: "4px",
                paddingTop: "4px",
                paddingBottom: "4px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
            }}>
                {body}
            </div>
        </div>
    );
};

const ArrayOfPrimitiveField = ({schema, value, onChange, depth}) => {
    const arr = Array.isArray(value) ? value : [];
    const itemSchema = schema.items || {type: "string"};
    return (
        <div style={{marginTop: "12px", marginBottom: "8px"}}>
            {schema.label && (
                <Typography variant="subtitle2" style={{fontWeight: 600, marginBottom: "6px"}}>
                    {schema.label}
                </Typography>
            )}
            {arr.map((item, i) => (
                <div key={i} style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px"}}>
                    <div style={{flexGrow: 1, minWidth: 0}}>
                        <SchemaFormRenderer
                            schema={{...itemSchema, label: undefined}}
                            value={item}
                            depth={(depth || 0) + 1}
                            onChange={(newItem) => {
                                const next = [...arr];
                                next[i] = newItem;
                                onChange(next);
                            }}
                        />
                    </div>
                    <IconButton size="small" color="error" aria-label="remove"
                                onClick={() => {
                                    const next = [...arr];
                                    next.splice(i, 1);
                                    onChange(next);
                                }}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </div>
            ))}
            <Button size="small" startIcon={<AddCircleIcon />}
                    onClick={() => onChange([...arr, emptyValueForSchema(itemSchema)])}>
                Add
            </Button>
        </div>
    );
};

const ArrayOfObjectField = ({schema, value, onChange, depth}) => {
    const arr = Array.isArray(value) ? value : [];
    const itemSchema = schema.items;
    return (
        <div style={{marginTop: "12px", marginBottom: "8px"}}>
            {schema.label && (
                <Typography variant="subtitle2" style={{fontWeight: 600, marginBottom: "6px"}}>
                    {schema.label}
                </Typography>
            )}
            {arr.map((item, i) => (
                <Paper variant="outlined" key={i}
                       style={{
                           padding: "12px 14px",
                           marginBottom: "10px",
                           display: "flex",
                           gap: "10px",
                           alignItems: "flex-start",
                       }}>
                    <div style={{flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px"}}>
                        {(itemSchema.fields || []).map(fieldSchema => {
                            if(!shouldShow(fieldSchema, item)) return null;
                            const fv = (item || {})[fieldSchema.name];
                            return (
                                <SchemaFormRenderer
                                    key={fieldSchema.name}
                                    schema={fieldSchema}
                                    value={fv === undefined ? emptyValueForSchema(fieldSchema) : fv}
                                    depth={(depth || 0) + 1}
                                    onChange={(newVal) => {
                                        const next = [...arr];
                                        next[i] = {...(item || {}), [fieldSchema.name]: newVal};
                                        onChange(next);
                                    }}
                                />
                            );
                        })}
                    </div>
                    <IconButton size="small" color="error" aria-label="remove"
                                style={{marginTop: "4px"}}
                                onClick={() => {
                                    const next = [...arr];
                                    next.splice(i, 1);
                                    onChange(next);
                                }}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Paper>
            ))}
            <Button size="small" startIcon={<AddCircleIcon />}
                    onClick={() => onChange([...arr, emptyValueForSchema(itemSchema)])}>
                Add
            </Button>
        </div>
    );
};

const StringMapField = ({schema, value, onChange}) => {
    const obj = (value && typeof value === "object" && !Array.isArray(value)) ? value : {};
    const entries = Object.entries(obj);
    const keyLabel = schema.keyLabel || "Key";
    const valueLabel = schema.valueLabel || "Value";
    const renameKey = (oldKey, newKey) => {
        if(newKey === oldKey) return;
        const next = {};
        for(const [k, v] of entries){
            if(k === oldKey){ next[newKey] = v; }
            else { next[k] = v; }
        }
        onChange(next);
    };
    const setVal = (k, v) => { onChange({...obj, [k]: v}); };
    const removeKey = (k) => {
        const next = {...obj};
        delete next[k];
        onChange(next);
    };
    const addEntry = () => {
        let base = "new_key";
        let i = 0;
        let key = base;
        while(key in obj){ i++; key = `${base}_${i}`; }
        onChange({...obj, [key]: ""});
    };
    return (
        <div style={{marginTop: "12px", marginBottom: "8px"}}>
            {schema.label && (
                <Typography variant="subtitle2" style={{fontWeight: 600, marginBottom: "6px"}}>
                    {schema.label}
                </Typography>
            )}
            {entries.length > 0 && (
                <Table size="small">
                    <TableBody>
                        {entries.map(([k, v]) => (
                            <TableRow key={k}>
                                <TableCell style={{width: "35%", padding: "6px 8px", borderBottom: "none"}}>
                                    <TextField size="small" fullWidth label={keyLabel}
                                               defaultValue={k}
                                               onBlur={(e) => renameKey(k, e.target.value)} />
                                </TableCell>
                                <TableCell style={{padding: "6px 8px", borderBottom: "none"}}>
                                    <TextField size="small" fullWidth label={valueLabel}
                                               value={v}
                                               onChange={(e) => setVal(k, e.target.value)} />
                                </TableCell>
                                <TableCell style={{width: "40px", padding: "6px 0px", borderBottom: "none"}}>
                                    <IconButton size="small" color="error" onClick={() => removeKey(k)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
            <Button size="small" startIcon={<AddCircleIcon />} onClick={addEntry}>
                Add entry
            </Button>
        </div>
    );
};

const EnumField = ({schema, value, onChange}) => {
    const choices = schema.choices || [];
    const labels = schema.choiceLabels || {};
    return (
        <FormControl size="small" fullWidth style={{marginTop: "8px", marginBottom: "4px"}}>
            {schema.label && <InputLabel>{schema.label}</InputLabel>}
            <Select
                value={value ?? ""}
                label={schema.label}
                onChange={(e) => onChange(e.target.value)}
            >
                {choices.map(c => (
                    <MenuItem key={c} value={c}>{labels[c] || c}</MenuItem>
                ))}
            </Select>
            {schema.description && (
                <Typography variant="caption" color="text.secondary" style={{marginTop: "4px"}}>
                    {schema.description}
                </Typography>
            )}
        </FormControl>
    );
};

const StringField = ({schema, value, onChange}) => (
    <div style={{marginTop: "8px", marginBottom: "4px"}}>
        <TextField
            size="small"
            fullWidth
            label={schema.label}
            placeholder={schema.placeholder}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
        />
        {schema.description && (
            <Typography variant="caption" color="text.secondary" style={{display: "block", marginTop: "4px"}}>
                {schema.description}
            </Typography>
        )}
    </div>
);

const NumberField = ({schema, value, onChange}) => (
    <div style={{marginTop: "8px", marginBottom: "4px"}}>
        <TextField
            size="small"
            fullWidth
            type="number"
            label={schema.label}
            value={value ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
        />
        {schema.description && (
            <Typography variant="caption" color="text.secondary" style={{display: "block", marginTop: "4px"}}>
                {schema.description}
            </Typography>
        )}
    </div>
);

const BooleanField = ({schema, value, onChange}) => (
    <div style={{marginTop: "8px", marginBottom: "4px"}}>
        <FormControlLabel
            label={schema.label || ""}
            control={<Switch checked={!!value} onChange={(e) => onChange(e.target.checked)} />}
        />
        {schema.description && (
            <Typography variant="caption" color="text.secondary" style={{display: "block"}}>
                {schema.description}
            </Typography>
        )}
    </div>
);

export function SchemaFormRenderer({schema, value, onChange, depth}){
    if(!schema) return null;
    switch(schema.type){
        case "object":
            return <ObjectField schema={schema} value={value} onChange={onChange} depth={depth} />;
        case "array":
            if(schema.items?.type === "object"){
                return <ArrayOfObjectField schema={schema} value={value} onChange={onChange} depth={depth} />;
            }
            return <ArrayOfPrimitiveField schema={schema} value={value} onChange={onChange} depth={depth} />;
        case "enum":
            return <EnumField schema={schema} value={value} onChange={onChange} />;
        case "string":
            return <StringField schema={schema} value={value} onChange={onChange} />;
        case "number":
            return <NumberField schema={schema} value={value} onChange={onChange} />;
        case "boolean":
            return <BooleanField schema={schema} value={value} onChange={onChange} />;
        case "string_map":
            return <StringMapField schema={schema} value={value} onChange={onChange} />;
        default:
            return (
                <Typography variant="caption" color="text.secondary">
                    Unknown schema type: {String(schema?.type)}
                </Typography>
            );
    }
}

export {emptyValueForSchema, cloneValue};
