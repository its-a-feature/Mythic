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
//   object      { type: "object", fields: [ {name, type, label, description, ...}, ... ] }
//   array       { type: "array", items: <schema>, label }  (items is itself a schema)
//   enum        { type: "enum", choices: [..], choiceLabels: {value: display}?, label }
//   string      { type: "string", label, placeholder? }
//   number      { type: "number", label }
//   boolean     { type: "boolean", label }
//   string_map  { type: "string_map", label, keyLabel?, valueLabel? }
//
// SchemaFormRenderer is controlled: pass `value` and `onChange`. It renders a
// section for the top-level schema and recurses for nested composites.

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

// Only keep own enumerable properties and primitive/plain types on output.
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

const ObjectField = ({schema, value, onChange}) => {
    const safeValue = (value && typeof value === "object" && !Array.isArray(value)) ? value : {};
    return (
        <div style={{marginTop: "4px", marginBottom: "8px"}}>
            {schema.label && (
                <Typography variant="subtitle2" style={{fontWeight: 600, marginTop: "8px", marginBottom: "4px"}}>
                    {schema.label}
                </Typography>
            )}
            {schema.description && (
                <Typography variant="caption" color="text.secondary" style={{display: "block", marginBottom: "4px"}}>
                    {schema.description}
                </Typography>
            )}
            <Paper variant="outlined" style={{padding: "8px 12px"}}>
                {(schema.fields || []).map(fieldSchema => {
                    const fieldValue = safeValue[fieldSchema.name];
                    return (
                        <SchemaFormRenderer
                            key={fieldSchema.name}
                            schema={fieldSchema}
                            value={fieldValue === undefined ? emptyValueForSchema(fieldSchema) : fieldValue}
                            onChange={(newFieldVal) => {
                                onChange({...safeValue, [fieldSchema.name]: newFieldVal});
                            }}
                        />
                    );
                })}
            </Paper>
        </div>
    );
};

const ArrayOfPrimitiveField = ({schema, value, onChange}) => {
    const arr = Array.isArray(value) ? value : [];
    const itemSchema = schema.items || {type: "string"};
    return (
        <div style={{marginTop: "4px", marginBottom: "8px"}}>
            {schema.label && (
                <Typography variant="subtitle2" style={{fontWeight: 600, marginBottom: "4px"}}>{schema.label}</Typography>
            )}
            {arr.map((item, i) => (
                <div key={i} style={{display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px"}}>
                    <SchemaFormRenderer
                        schema={{...itemSchema, label: undefined}}
                        value={item}
                        onChange={(newItem) => {
                            const next = [...arr];
                            next[i] = newItem;
                            onChange(next);
                        }}
                    />
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

const ArrayOfObjectField = ({schema, value, onChange}) => {
    const arr = Array.isArray(value) ? value : [];
    const itemSchema = schema.items;
    return (
        <div style={{marginTop: "4px", marginBottom: "8px"}}>
            {schema.label && (
                <Typography variant="subtitle2" style={{fontWeight: 600, marginBottom: "4px"}}>{schema.label}</Typography>
            )}
            {arr.map((item, i) => (
                <Paper variant="outlined" key={i} style={{padding: "8px 12px", marginBottom: "6px", position: "relative"}}>
                    <IconButton size="small" color="error" aria-label="remove"
                                style={{position: "absolute", right: 4, top: 4}}
                                onClick={() => {
                                    const next = [...arr];
                                    next.splice(i, 1);
                                    onChange(next);
                                }}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                    {(itemSchema.fields || []).map(fieldSchema => {
                        const fv = (item || {})[fieldSchema.name];
                        return (
                            <SchemaFormRenderer
                                key={fieldSchema.name}
                                schema={fieldSchema}
                                value={fv === undefined ? emptyValueForSchema(fieldSchema) : fv}
                                onChange={(newVal) => {
                                    const next = [...arr];
                                    next[i] = {...(item || {}), [fieldSchema.name]: newVal};
                                    onChange(next);
                                }}
                            />
                        );
                    })}
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
    const setVal = (k, v) => {
        onChange({...obj, [k]: v});
    };
    const removeKey = (k) => {
        const next = {...obj};
        delete next[k];
        onChange(next);
    };
    const addEntry = () => {
        // pick a unique empty key
        let base = "new_key";
        let i = 0;
        let key = base;
        while(key in obj){ i++; key = `${base}_${i}`; }
        onChange({...obj, [key]: ""});
    };
    return (
        <div style={{marginTop: "4px", marginBottom: "8px"}}>
            {schema.label && (
                <Typography variant="subtitle2" style={{fontWeight: 600, marginBottom: "4px"}}>{schema.label}</Typography>
            )}
            {entries.length > 0 && (
                <Table size="small">
                    <TableBody>
                        {entries.map(([k, v]) => (
                            <TableRow key={k}>
                                <TableCell style={{width: "35%", padding: "4px"}}>
                                    <TextField size="small" fullWidth label={keyLabel}
                                               defaultValue={k}
                                               onBlur={(e) => renameKey(k, e.target.value)} />
                                </TableCell>
                                <TableCell style={{padding: "4px"}}>
                                    <TextField size="small" fullWidth label={valueLabel}
                                               value={v}
                                               onChange={(e) => setVal(k, e.target.value)} />
                                </TableCell>
                                <TableCell style={{width: "32px", padding: "4px"}}>
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
        <FormControl size="small" fullWidth style={{marginTop: "4px", marginBottom: "4px"}}>
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
        </FormControl>
    );
};

const StringField = ({schema, value, onChange}) => (
    <TextField
        size="small"
        fullWidth
        label={schema.label}
        placeholder={schema.placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{marginTop: "4px", marginBottom: "4px"}}
    />
);

const NumberField = ({schema, value, onChange}) => (
    <TextField
        size="small"
        fullWidth
        type="number"
        label={schema.label}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{marginTop: "4px", marginBottom: "4px"}}
    />
);

const BooleanField = ({schema, value, onChange}) => (
    <FormControlLabel
        label={schema.label || ""}
        control={<Switch checked={!!value} onChange={(e) => onChange(e.target.checked)} />}
    />
);

export function SchemaFormRenderer({schema, value, onChange}){
    if(!schema) return null;
    switch(schema.type){
        case "object":
            return <ObjectField schema={schema} value={value} onChange={onChange} />;
        case "array":
            if(schema.items?.type === "object"){
                return <ArrayOfObjectField schema={schema} value={value} onChange={onChange} />;
            }
            return <ArrayOfPrimitiveField schema={schema} value={value} onChange={onChange} />;
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
