import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {MythicFormField} from '../../MythicComponents/MythicDialogLayout';

const emptyValueForSchema = (schema) => {
    switch(schema?.type){
        case "object": {
            const out = {};
            for(const field of (schema.fields || [])){
                if(typeof field?.name === "string" && field.name.length > 0){
                    out[field.name] = emptyValueForSchema(field);
                }
            }
            return out;
        }
        case "array":
            return [];
        case "enum":
            return Array.isArray(schema.choices) && schema.choices.length > 0 ? schema.choices[0] : "";
        case "string":
            return "";
        case "number":
            return 0;
        case "boolean":
            return false;
        case "string_map":
            return {};
        default:
            return null;
    }
};

const cloneValue = (value) => {
    if(value === null || value === undefined){return value}
    if(Array.isArray(value)){return value.map(cloneValue)}
    if(typeof value === "object"){
        const out = {};
        for(const key of Object.keys(value)){
            out[key] = cloneValue(value[key]);
        }
        return out;
    }
    return value;
};

const isObjectValue = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const shouldShow = (fieldSchema, parentValue) => {
    const showWhen = fieldSchema?.show_when;
    if(!showWhen || typeof showWhen.field !== "string" || !Array.isArray(showWhen.in)){
        return true;
    }
    return showWhen.in.includes(parentValue?.[showWhen.field]);
};

const resolveConditionalPlaceholder = (fieldSchema, parentValue) => {
    const placeholderWhen = fieldSchema?.placeholder_when;
    if(
        !placeholderWhen ||
        typeof placeholderWhen.field !== "string" ||
        !placeholderWhen.map ||
        typeof placeholderWhen.map !== "object"
    ){
        return fieldSchema;
    }
    const hint = placeholderWhen.map[parentValue?.[placeholderWhen.field]];
    if(typeof hint !== "string" || hint.length === 0){
        return fieldSchema;
    }
    return {...fieldSchema, placeholder: hint};
};

const FieldHelp = ({description}) => {
    if(!description){return null}
    return (
        <Typography component="div" className="mythic-form-field-description">
            {description}
        </Typography>
    );
};

const CollapsibleSection = ({label, summary, description, children}) => {
    const [collapsed, setCollapsed] = React.useState(false);
    const toggleCollapsed = () => setCollapsed((current) => !current);
    return (
        <Box component="section" className="mythic-dialog-section" sx={{p: 1, my: 1}}>
            <Box
                role="button"
                tabIndex={0}
                aria-expanded={!collapsed}
                className="mythic-dialog-section-header"
                onClick={toggleCollapsed}
                onKeyDown={(event) => {
                    if(event.key === "Enter" || event.key === " "){
                        event.preventDefault();
                        toggleCollapsed();
                    }
                }}
                sx={{
                    alignItems: "center",
                    cursor: "pointer",
                    mb: collapsed ? 0 : 0.65,
                    userSelect: "none",
                }}
            >
                <Box sx={{alignItems: "center", display: "flex", gap: 0.35, minWidth: 0}}>
                    {collapsed ?
                        <ChevronRightIcon fontSize="small" color="secondary" /> :
                        <ExpandMoreIcon fontSize="small" color="secondary" />
                    }
                    <Typography component="div" className="mythic-dialog-section-title">
                        {label}
                    </Typography>
                    {summary &&
                        <Typography component="span" className="mythic-form-field-description" sx={{mt: 0}}>
                            {summary}
                        </Typography>
                    }
                </Box>
            </Box>
            {!collapsed && description &&
                <Typography component="div" className="mythic-dialog-section-description" sx={{mb: 0.75}}>
                    {description}
                </Typography>
            }
            {!collapsed && children}
        </Box>
    );
};

const SchemaStack = ({children, depth}) => (
    <Box
        sx={{
            borderLeft: depth > 0 ? "2px solid" : 0,
            borderLeftColor: "divider",
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
            minWidth: 0,
            pl: depth > 0 ? 1.5 : 0,
            width: "100%",
        }}
    >
        {children}
    </Box>
);

const ObjectField = ({schema, value, onChange, depth = 0}) => {
    const safeValue = isObjectValue(value) ? value : {};
    const body = (
        <SchemaStack depth={depth}>
            {(schema.fields || []).map((fieldSchema) => {
                if(typeof fieldSchema?.name !== "string" || fieldSchema.name.length === 0){
                    return null;
                }
                if(!shouldShow(fieldSchema, safeValue)){
                    return null;
                }
                const resolvedSchema = resolveConditionalPlaceholder(fieldSchema, safeValue);
                const fieldValue = safeValue[fieldSchema.name];
                return (
                    <SchemaFormRenderer
                        key={fieldSchema.name}
                        schema={resolvedSchema}
                        value={fieldValue === undefined ? emptyValueForSchema(fieldSchema) : fieldValue}
                        depth={depth + 1}
                        onChange={(newFieldValue) => {
                            onChange({...safeValue, [fieldSchema.name]: newFieldValue});
                        }}
                    />
                );
            })}
        </SchemaStack>
    );

    if(depth === 0){
        return (
            <Box sx={{display: "flex", flexDirection: "column", gap: 0.75, minWidth: 0}}>
                {schema.label &&
                    <Typography component="div" className="mythic-dialog-section-title">
                        {schema.label}
                    </Typography>
                }
                {schema.description &&
                    <Typography component="div" className="mythic-dialog-section-description">
                        {schema.description}
                    </Typography>
                }
                {body}
            </Box>
        );
    }

    if(schema.label){
        return (
            <CollapsibleSection label={schema.label} description={schema.description}>
                {body}
            </CollapsibleSection>
        );
    }
    return body;
};

const ArrayOfPrimitiveField = ({schema, value, onChange, depth = 0}) => {
    const arr = Array.isArray(value) ? value : [];
    const itemSchema = schema.items || {type: "string"};
    const body = (
        <Box sx={{display: "flex", flexDirection: "column", gap: 0.75, minWidth: 0}}>
            {arr.map((item, index) => (
                <Box key={index} sx={{alignItems: "flex-start", display: "flex", gap: 0.75, minWidth: 0}}>
                    <Box sx={{flex: "1 1 auto", minWidth: 0}}>
                        <SchemaFormRenderer
                            schema={{...itemSchema, label: undefined, description: undefined}}
                            value={item}
                            depth={depth + 1}
                            onChange={(newItem) => {
                                const next = [...arr];
                                next[index] = newItem;
                                onChange(next);
                            }}
                        />
                    </Box>
                    <IconButton
                        className="mythic-compact-icon-action mythic-action-tone-hover mythic-tone-error"
                        size="small"
                        onClick={() => {
                            const next = [...arr];
                            next.splice(index, 1);
                            onChange(next);
                        }}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            ))}
            <Button
                className="mythic-compact-action mythic-action-tone-hover mythic-tone-success"
                size="small"
                variant="contained"
                startIcon={<AddCircleIcon fontSize="small" />}
                onClick={() => onChange([...arr, emptyValueForSchema(itemSchema)])}
            >
                Add
            </Button>
        </Box>
    );
    if(schema.label){
        return (
            <CollapsibleSection label={schema.label} summary={`(${arr.length})`} description={schema.description}>
                {body}
            </CollapsibleSection>
        );
    }
    return body;
};

const ArrayOfObjectField = ({schema, value, onChange, depth = 0}) => {
    const arr = Array.isArray(value) ? value : [];
    const itemSchema = schema.items || {type: "object", fields: []};
    const body = (
        <Box sx={{display: "flex", flexDirection: "column", gap: 0.75, minWidth: 0}}>
            {arr.map((item, index) => {
                const safeItem = isObjectValue(item) ? item : {};
                return (
                    <Box
                        className="mythic-dialog-section"
                        key={index}
                        sx={{
                            alignItems: "flex-start",
                            display: "grid",
                            gap: 1,
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            width: "100%",
                        }}
                    >
                        <SchemaStack depth={0}>
                            {(itemSchema.fields || []).map((fieldSchema) => {
                                if(typeof fieldSchema?.name !== "string" || fieldSchema.name.length === 0){
                                    return null;
                                }
                                if(!shouldShow(fieldSchema, safeItem)){
                                    return null;
                                }
                                const resolvedSchema = resolveConditionalPlaceholder(fieldSchema, safeItem);
                                const fieldValue = safeItem[fieldSchema.name];
                                return (
                                    <SchemaFormRenderer
                                        key={fieldSchema.name}
                                        schema={resolvedSchema}
                                        value={fieldValue === undefined ? emptyValueForSchema(fieldSchema) : fieldValue}
                                        depth={depth + 1}
                                        onChange={(newFieldValue) => {
                                            const next = [...arr];
                                            next[index] = {...safeItem, [fieldSchema.name]: newFieldValue};
                                            onChange(next);
                                        }}
                                    />
                                );
                            })}
                        </SchemaStack>
                        <IconButton
                            className="mythic-compact-icon-action mythic-action-tone-hover mythic-tone-error"
                            size="small"
                            onClick={() => {
                                const next = [...arr];
                                next.splice(index, 1);
                                onChange(next);
                            }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                );
            })}
            <Button
                className="mythic-compact-action mythic-action-tone-hover mythic-tone-success"
                size="small"
                variant="contained"
                startIcon={<AddCircleIcon fontSize="small" />}
                onClick={() => onChange([...arr, emptyValueForSchema(itemSchema)])}
            >
                Add
            </Button>
        </Box>
    );
    if(schema.label){
        return (
            <CollapsibleSection label={schema.label} summary={`(${arr.length})`} description={schema.description}>
                {body}
            </CollapsibleSection>
        );
    }
    return body;
};

const StringMapField = ({schema, value, onChange}) => {
    const obj = isObjectValue(value) ? value : {};
    const entries = Object.entries(obj);
    const keyLabel = schema.key_label || "Key";
    const valueLabel = schema.value_label || "Value";
    const renameKey = (oldKey, newKey) => {
        if(newKey === oldKey){
            return;
        }
        const next = {};
        for(const [key, val] of entries){
            next[key === oldKey ? newKey : key] = val;
        }
        onChange(next);
    };
    const addEntry = () => {
        const base = "new_key";
        let key = base;
        let index = 0;
        while(Object.prototype.hasOwnProperty.call(obj, key)){
            index += 1;
            key = `${base}_${index}`;
        }
        onChange({...obj, [key]: ""});
    };
    const body = (
        <Box sx={{display: "flex", flexDirection: "column", gap: 0.75, minWidth: 0}}>
            {entries.length > 0 &&
                <Table size="small">
                    <TableBody>
                        {entries.map(([key, val]) => (
                            <TableRow key={key}>
                                <TableCell sx={{borderBottom: 0, p: 0.5, width: "35%"}}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={keyLabel}
                                        defaultValue={key}
                                        onBlur={(event) => renameKey(key, event.target.value)}
                                    />
                                </TableCell>
                                <TableCell sx={{borderBottom: 0, p: 0.5}}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={valueLabel}
                                        multiline
                                        minRows={1}
                                        maxRows={5}
                                        value={val}
                                        onChange={(event) => onChange({...obj, [key]: event.target.value})}
                                    />
                                </TableCell>
                                <TableCell sx={{borderBottom: 0, p: 0.5, width: "2.5rem"}}>
                                    <IconButton
                                        className="mythic-compact-icon-action mythic-action-tone-hover mythic-tone-error"
                                        size="small"
                                        onClick={() => {
                                            const next = {...obj};
                                            delete next[key];
                                            onChange(next);
                                        }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            }
            <Button
                className="mythic-compact-action mythic-action-tone-hover mythic-tone-success"
                size="small"
                variant="contained"
                startIcon={<AddCircleIcon fontSize="small" />}
                onClick={addEntry}
            >
                Add entry
            </Button>
        </Box>
    );
    if(schema.label){
        return (
            <CollapsibleSection label={schema.label} summary={`(${entries.length})`} description={schema.description}>
                {body}
            </CollapsibleSection>
        );
    }
    return body;
};

const EnumField = ({schema, value, onChange}) => {
    const choices = Array.isArray(schema.choices) ? schema.choices : [];
    const displayNames = isObjectValue(schema.choices_display_names) ? schema.choices_display_names : {};
    return (
        <MythicFormField label={schema.label} description={schema.description}>
            <FormControl fullWidth size="small">
                <Select
                    displayEmpty
                    value={value ?? ""}
                    onChange={(event) => onChange(event.target.value)}
                >
                    {choices.map((choice) => (
                        <MenuItem key={String(choice)} value={choice}>
                            {displayNames[choice] || String(choice)}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </MythicFormField>
    );
};

const StringField = ({schema, value, onChange}) => (
    <MythicFormField label={schema.label} description={schema.description}>
        <TextField
            fullWidth
            size="small"
            multiline
            minRows={1}
            maxRows={5}
            placeholder={schema.placeholder}
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
        />
    </MythicFormField>
);

const NumberField = ({schema, value, onChange}) => (
    <MythicFormField label={schema.label} description={schema.description}>
        <TextField
            fullWidth
            size="small"
            type="number"
            value={value ?? 0}
            onChange={(event) => onChange(Number(event.target.value))}
        />
    </MythicFormField>
);

const BooleanField = ({schema, value, onChange}) => (
    <Box className="mythic-form-field">
        <FormControlLabel
            label={schema.label || ""}
            control={
                <Switch
                    checked={!!value}
                    color="info"
                    onChange={(event) => onChange(event.target.checked)}
                />
            }
        />
        <FieldHelp description={schema.description} />
    </Box>
);

export function SchemaFormRenderer({schema, value, onChange, depth = 0}){
    if(!schema){
        return null;
    }
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
                <Typography component="div" className="mythic-form-field-description">
                    Unknown schema type: {String(schema?.type)}
                </Typography>
            );
    }
}

export {emptyValueForSchema, cloneValue};
