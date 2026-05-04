import React, {useEffect} from 'react';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MythicTextField from '../../MythicComponents/MythicTextField';
import DeleteIcon from '@mui/icons-material/Delete';
import {IconButton, Input, Button, MenuItem, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Tabs, Tab} from '@mui/material';
import {SchemaFormRenderer, emptyValueForSchema} from './SchemaFormRenderer';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import dayjs from 'dayjs';
import Switch from '@mui/material/Switch';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {Typography} from '@mui/material';
import {MythicFileContext} from "../../MythicComponents/MythicFileContext";
import {snackActions} from "../../utilities/Snackbar";
import {useTheme} from '@mui/material/styles';
import {gql, useMutation} from '@apollo/client';
import { Backdrop } from '@mui/material';
import {CircularProgress} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import InputLabel from '@mui/material/InputLabel';
import {DragAndDropFileUpload} from "../Callbacks/TaskParametersDialogRow";
import Paper from '@mui/material/Paper';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-toml';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-searchbox';

export const getDynamicQueryBuildParameterParams = gql`
mutation getDynamicBuildParamsMutation($payload_type: String!, $parameter_name: String!, $selected_os: String!){
    dynamicQueryBuildParameterFunction(payload_type: $payload_type, parameter_name: $parameter_name, selected_os: $selected_os){
        status
        error
        choices
        parameter_name
    }
}
`;
export const c2CustomRPCFunctionMutation = gql`
mutation c2CustomRPCFunctionMutation($c2_profile: String!, $function_name: String!, $arguments: jsonb){
    c2CustomRPCFunction(c2_profile: $c2_profile, function_name: $function_name, arguments: $arguments){
        status
        error
        result
    }
}
`;
function isTrue(value){
    if(typeof value === 'boolean'){
        return value;
    }
    if(typeof value === 'string'){
        return value.toLowerCase() === 'true' || value.toLowerCase() === 't';
    }
    console.log("unknown boolean value", value);
}
function getConfigEditorMode(parameterType, randomize, formatString){
    if(parameterType !== "String" || randomize || typeof formatString !== "string"){
        return null;
    }
    const normalized = formatString.trim();
    if(!normalized.toLowerCase().startsWith("ui:config_editor")){
        return null;
    }
    // tokens after "ui:config_editor": first is the language hint, remaining are key=value suffixes
    const parts = normalized.split(":");
    const tail = parts.slice(2);
    let languageHint = "text";
    let presetsFn = "";
    for(const raw of tail){
        const token = raw.trim();
        if(token === ""){ continue; }
        const eq = token.indexOf("=");
        if(eq === -1){
            // bare token → language hint (first one wins)
            if(languageHint === "text"){ languageHint = token.toLowerCase(); }
            continue;
        }
        const key = token.slice(0, eq).trim().toLowerCase();
        const value = token.slice(eq + 1).trim();
        if(key === "presets_fn"){ presetsFn = value; }
    }
    return {languageHint, presetsFn};
}
function getConfigStatus(value, languageHint){
    const raw = (value ?? "");
    const trimmed = raw.trim();
    if(trimmed === ""){ return {kind: "empty", label: "Using default"}; }
    const lineCount = raw.split(/\r?\n/).length;
    // only validate when the content is plausibly JSON
    const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
    if(looksJson){
        try{
            JSON.parse(trimmed);
        }catch(e){
            return {kind: "invalid", label: "Invalid JSON"};
        }
    }
    const format = (looksJson ? "JSON" : (languageHint === "toml" || languageHint === "json_toml" ? "TOML" : "TEXT"));
    return {kind: "set", label: `Custom · ${lineCount} line${lineCount === 1 ? "" : "s"}`, format};
}
function detectAceMode(languageHint, content){
    if(languageHint === "json"){ return "json"; }
    if(languageHint === "toml"){ return "toml"; }
    // json_toml (or anything else): sniff content
    const trimmed = (content || "").trim();
    if(trimmed === "" || trimmed.startsWith("{") || trimmed.startsWith("[")){
        return "json";
    }
    return "toml";
}
function getConfigEditorPlaceholder(languageHint){
    switch(languageHint){
        case "json_toml":
            return `{
  "name": "example",
  "post": {
    "uris": ["/"],
    "client": {
      "message": {
        "location": "body"
      }
    }
  }
}

# Or TOML:
# name = "example"
# [post]
# uris = ["/"]`;
        case "json":
            return `{
  "name": "example",
  "post": {
    "uris": ["/"]
  }
}`;
        case "toml":
            return `name = "example"
[post]
uris = ["/"]`;
        default:
            return "";
    }
}
export function CreatePayloadParameter({onChange, parameter_type, default_value, name, required, verifier_regex, id,
                                           description, initialValue, choices, trackedValue, instance_name,
                                           payload_type, selected_os, dynamic_query_function, randomize, format_string,
                                           c2_profile_name, display_name, choices_display_names, form_schema,
                                           displayMode = "table"}){
    const theme = useTheme();
    const configEditorMode = getConfigEditorMode(parameter_type, randomize, format_string);
    const choiceLabel = (val) => {
        const m = choices_display_names;
        if(m && typeof m === "object" && val in m && typeof m[val] === "string" && m[val].length > 0){
            return m[val];
        }
        return val;
    };
    const [configEditorOpen, setConfigEditorOpen] = React.useState(false);
    const aceEditorRef = React.useRef(null);
    const prePresetValueRef = React.useRef("");
    const [configEditorPresets, setConfigEditorPresets] = React.useState([]);
    const [editorTab, setEditorTab] = React.useState('source');
    const [visualParseError, setVisualParseError] = React.useState("");
    const [value, setValue] = React.useState("");
    const [valueNum, setValueNum] = React.useState(0);
    const [multiValue, setMultiValue] = React.useState([]);
    const [ChoiceOptions, setChoiceOptions] = React.useState([]);
    const [chooseOneCustomValue, setChooseOneCustomValue] = React.useState("");
    const [dictValue, setDictValue] = React.useState([]);
    const [dictOptions, setDictOptions] = React.useState([]);
    const [dictSelectOptions, setDictSelectOptions] = React.useState([]);
    const [dictSelectOptionsChoice, setDictSelectOptionsChoice] = React.useState("");
    const [dateValue, setDateValue] = React.useState(dayjs(new Date()));
    const [arrayValue, setArrayValue] = React.useState([]);
    const [typedArrayValue, setTypedArrayValue] = React.useState([]);
    const [fileValue, setFileValue] = React.useState({name: ""});
    const [fileMultValue, setFileMultValue] = React.useState([]);
    const [mapArray, setMapArray] = React.useState([]);
    const [backdropOpen, setBackdropOpen] = React.useState(false);
    const usingDynamicParamChoices = React.useRef(false);
    const [getDynamicParams] = useMutation(getDynamicQueryBuildParameterParams, {
        onCompleted: (data) => {
            if(data.dynamicQueryBuildParameterFunction.status === "success"){
                try{
                    let choicesInUse = [];
                    usingDynamicParamChoices.current = true;
                    setChoiceOptions([...data.dynamicQueryBuildParameterFunction.choices]);
                    choicesInUse = [...data.dynamicQueryBuildParameterFunction.choices];
                    if(parameter_type === "ChooseOne"){
                        if(choicesInUse.length > 0){
                            if(value !== "") {
                                setValue(value);
                                onChange(name, value, false);
                            } else if(choicesInUse.includes(default_value)) {
                                setValue(default_value);
                                onChange(name, default_value, false);
                            } else {
                                setValue(choicesInUse[0]);
                                onChange(name, choicesInUse[0], false);
                            }
                        }
                    } else if(parameter_type === "ChooseOneCustom"){
                        let newStandardValue = default_value;
                        if(choicesInUse.includes(default_value) && value !== "") {
                            setValue(default_value);
                        } else {
                            setValue(choicesInUse[0]);
                            newStandardValue = choicesInUse[0];
                        }
                        if(!choicesInUse.includes(value) && value !== "" ){
                            setChooseOneCustomValue(value);
                            newStandardValue = value;
                        }
                        onChange(name, newStandardValue, false);
                    } else if(parameter_type === "ChooseMultiple"){
                        if(choicesInUse.length > 0){
                            if(multiValue.length > 0) {
                                setMultiValue(multiValue);
                                onChange(name, multiValue, false);
                            } else if(choicesInUse.includes(default_value)) {
                                setMultiValue(default_value);
                                onChange(name, default_value, false);
                            } else {
                                setMultiValue([choicesInUse[0]]);
                                onChange(name, [choicesInUse[0]], false);
                            }
                        }
                    }
                }catch(error){
                    setBackdropOpen(false);
                    snackActions.warning("Failed to parse dynamic parameter results");
                }

            }else{
                snackActions.warning(data.dynamicQueryBuildParameterFunction.error);
            }
            setBackdropOpen(false);
        },
        onError: (data) => {
            snackActions.warning("Failed to perform dynamic parameter query");
            console.log(data);
            setBackdropOpen(false);
        }
    });
    // Form schema is delivered as a parameter-level field via the c2 sync
    // pipeline — no runtime RPC call required. Treat non-empty objects
    // with a `type` key as a valid schema.
    const hasFormSchema = !!(form_schema && typeof form_schema === "object" && !Array.isArray(form_schema) && typeof form_schema.type === "string" && form_schema.type.length > 0);
    const [invokeC2CustomRPC, {loading: c2CustomRPCLoading}] = useMutation(c2CustomRPCFunctionMutation, {
        onCompleted: (data) => {
            if(data?.c2CustomRPCFunction?.status === "success"){
                const result = data.c2CustomRPCFunction.result || {};
                if(Array.isArray(result.presets)){
                    const cleaned = result.presets
                        .filter(p => p && typeof p.filename === "string" && typeof p.content === "string")
                        .map(p => ({
                            filename: p.filename,
                            label: typeof p.label === "string" && p.label.length > 0 ? p.label : p.filename,
                            content: p.content,
                        }));
                    setConfigEditorPresets(cleaned);
                }
            } else {
                snackActions.warning(data?.c2CustomRPCFunction?.error || "Custom RPC failed");
            }
        },
        onError: (err) => {
            snackActions.warning("Failed to invoke C2 custom RPC");
            console.log(err);
        }
    });
    useEffect(() => {
        if(!configEditorMode || !configEditorMode.presetsFn || !c2_profile_name){ return; }
        invokeC2CustomRPC({variables: {
            c2_profile: c2_profile_name,
            function_name: configEditorMode.presetsFn,
            arguments: {},
        }});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [c2_profile_name, configEditorMode?.presetsFn]);
    const onSelectPreset = (filename) => {
        if(!filename){ return; }
        const preset = configEditorPresets.find(p => p.filename === filename);
        if(!preset){ return; }
        const prev = value ?? "";
        prePresetValueRef.current = prev;
        onChangeText(name, preset.content, testParameterValues(preset.content));
        if(prev !== "" && prev !== preset.content){
            showUndoSnackbar(`Loaded preset "${preset.label}".`, prev);
        }
    };
    const reIssueDynamicQueryFunction = () => {
        setBackdropOpen(true);
        snackActions.info("Querying payload type container for options...",  {autoClose: 1000});
        getDynamicParams({variables:{
                parameter_name: name,
                selected_os: selected_os,
                payload_type: payload_type,
            }})
        usingDynamicParamChoices.current = true;
    }
    const arrayMapToMap = (val) => {
        return val.reduce( ( prev, cur ) => {
            return {...prev, [cur[0]]: cur[1]}
        }, {})
    }
    const addMapArrayMap = () => {
        let map = [...mapArray, ["", []]];
        setMapArray(map);
        onChange(name, arrayMapToMap(map), false);
    }
    const updateMapArrayMap = (i, val) => {
        let map = [...mapArray];
        map[i][0] = val;
        setMapArray(map);
        onChange(name, arrayMapToMap(map), false);
    }
    const removeMapArrayMap = (i) => {
        let map = mapArray.toSpliced(i, 1)
        setMapArray(map);
        onChange(name, arrayMapToMap(map), false);
    }
    const addMapArray = (i) => {
        let map = [...mapArray];
        map[i][1].push("");
        setMapArray(map);
        onChange(name, arrayMapToMap(map), false);
    }
    const updateMapArray = (i, j, val) => {
        let map = [...mapArray];
        map[i][1][j] = val;
        setMapArray(map);
        onChange(name, arrayMapToMap(map), false);
    }
    const removeMapArray = (i, j, val) => {
        let map = [...mapArray];
        map[i][1].splice(j, 1);
        setMapArray(map);
        onChange(name, arrayMapToMap(map), false);
    }
    const submitDictChange = (list) => {
        onChange(name, list, false);
    };
    const onFileChange = (newFile) => {
        setFileValue({name: newFile.name});
        onChange(name, newFile);
    }
    const onFileMultChange = (newFiles) => {
        setFileMultValue([...newFiles]);
        onChange(name, [...newFiles]);
    }
    useEffect( () => {
        if( parameter_type === "ChooseOne" || parameter_type === "ChooseOneCustom" ){
            setChoiceOptions(choices);
            if(!choices.includes(trackedValue)){
                setChooseOneCustomValue(trackedValue);
                if(dynamic_query_function !== ""){
                    setValue(trackedValue);
                } else {
                    setValue(default_value);
                }
            } else {
                setValue(trackedValue);
                setChooseOneCustomValue("");
            }
        }else if(parameter_type === "Number"){
            setValueNum(trackedValue);
        }else if(parameter_type === "String"){
            setValue(trackedValue);
        }else if(parameter_type === "ChooseMultiple") {
            setMultiValue(trackedValue);
            setChoiceOptions(choices);
        }else if(parameter_type === "File") {
            if (typeof trackedValue === "string") {
                setFileValue({name: trackedValue, legacy: trackedValue !== ""});
            } else {
                setFileValue(trackedValue);
            }
        } else if(parameter_type === "FileMultiple"){
            setFileMultValue(trackedValue);
        }else if(parameter_type === "Date"){
            setDateValue(dayjs(trackedValue));
            onChange(name, trackedValue, "");
        }else if(parameter_type === "Dictionary" ){
            setDictOptions(choices);
            let initial = trackedValue.reduce( (prev, op) => {
                // find all the options that have a default_show of true
                if(op.default_show){
                    if(op.value){
                        return [...prev, {...op, value: op.value} ];
                    } else {
                        return [...prev, {...op, value: op.default_value} ];
                    }

                }else{
                    return [...prev];
                }
            }, [] );
            submitDictChange(initial);
            setDictValue(initial);
            let dictSelectOptionsInitial = choices.reduce( (prev, op) => {
                //for each option, check how many instances of it are allowed
                // then check how many we have currently
                const count = initial.reduce( (preCount, cur) => {
                    if(cur.name === op.name){return preCount + 1}
                    return preCount;
                }, 0);
                if(count === 0){
                    return [{...op, value: op.default_value}, ...prev ];
                }else{
                    return [...prev]
                }
            }, [{name: "Custom...", default_value: "", default_show: false}]);
            setDictSelectOptions(dictSelectOptionsInitial);
            setDictSelectOptionsChoice(dictSelectOptionsInitial[0]);
            
        }else if(parameter_type === "Boolean"){
            setValue( trackedValue );
        }else if(parameter_type === "Array") {
            setArrayValue(trackedValue);
        }else if(parameter_type === "TypedArray") {
            setTypedArrayValue(trackedValue);
        }else if(parameter_type === "MapArray") {
            let initial = [];
            for(const [key, val] of Object.entries(trackedValue)){
                initial.push([key, val]);
            }
            setMapArray(initial);
        }else{
            console.log("hit an unknown parameter type")
        }
        if(dynamic_query_function !== "" && dynamic_query_function !== undefined){
            if(!usingDynamicParamChoices.current){
                setBackdropOpen(true);
                snackActions.info("Querying payload type container for options...",  {autoClose: 1000});
                getDynamicParams({variables:{
                        parameter_name: name,
                        payload_type: payload_type,
                        selected_os: selected_os
                    }})
            }
            usingDynamicParamChoices.current = true;
        }
    }, [default_value, parameter_type, name, instance_name]);
    const onChangeTextChooseOneCustom = (name, newValue, error) => {
        setChooseOneCustomValue(newValue);
        if(newValue === ""){
            onChange(name, value, error);
        } else {
            onChange(name, newValue, error);
        }

    }
    const onChangeValue = (evt) => {
        setValue(evt.target.value);
        onChange(name, evt.target.value, false);
    }
    const onChangeMultValue = (evt) => {
        const { value:options } = evt.target;
        setMultiValue(options);
        onChange(name, options, false);
    }
    const onChangeText = (name, value, error) => {
        setValue(value);
        onChange(name, value, error);
    }
    const onConfigEditorUpload = async (evt) => {
        const file = evt.target.files?.[0];
        if(!file){
            return;
        }
        try{
            const uploadedValue = await file.text();
            setValue(uploadedValue);
            onChange(name, uploadedValue, testParameterValues(uploadedValue));
        }catch(error){
            snackActions.warning("Failed to read uploaded configuration file");
            console.error(error);
        }finally{
            evt.target.value = "";
        }
    }
    const onFormatConfigEditorJson = () => {
        if(value.trim() === ""){
            return;
        }
        try{
            const formattedValue = JSON.stringify(JSON.parse(value), null, 2);
            setValue(formattedValue);
            onChange(name, formattedValue, testParameterValues(formattedValue));
        }catch(error){
            snackActions.info("Only JSON formatting is available inline. TOML input is left as-is.");
        }
    }
    const parseSourceForVisual = () => {
        const raw = (value ?? "").trim();
        if(raw === ""){
            return hasFormSchema ? emptyValueForSchema(form_schema) : {};
        }
        return JSON.parse(raw);
    };
    const visualValue = React.useMemo(() => {
        if(editorTab !== 'visual') return null;
        try { return parseSourceForVisual(); }
        catch(_) { return null; }
    }, [editorTab, value, form_schema]);
    const onVisualChange = (newVal) => {
        try {
            const serialized = JSON.stringify(newVal, null, 2);
            onChangeText(name, serialized, testParameterValues(serialized));
        } catch(e) {
            snackActions.warning("Failed to serialize visual form state");
            console.log(e);
        }
    };
    const onSwitchToVisual = () => {
        try {
            parseSourceForVisual();
            setVisualParseError("");
            setEditorTab('visual');
        } catch(e) {
            setVisualParseError(e.message || String(e));
            setEditorTab('source');
        }
    };
    const showUndoSnackbar = (label, previousValue) => {
        snackActions.info(
            <span style={{display: "inline-flex", alignItems: "center", gap: "8px"}}>
                {label}
                <Button size="small" variant="outlined" onClick={(e) => {
                    e.stopPropagation();
                    onChangeText(name, previousValue, testParameterValues(previousValue));
                }}>
                    Undo
                </Button>
            </span>,
            {autoClose: 8000}
        );
    }
    const onClearConfigEditor = () => {
        const prev = value;
        setValue("");
        onChange(name, "", testParameterValues(""));
        if(prev !== ""){
            showUndoSnackbar("Config cleared.", prev);
        }
    }
    const onCopyConfigToClipboard = async () => {
        const raw = value ?? "";
        if(raw === ""){
            snackActions.info("Nothing to copy");
            return;
        }
        try{
            await navigator.clipboard.writeText(raw);
            snackActions.success("Copied to clipboard");
        }catch(err){
            snackActions.warning("Clipboard unavailable");
            console.error(err);
        }
    }
    React.useEffect(() => {
        if(!configEditorOpen){ return; }
        const t = setTimeout(() => {
            try { aceEditorRef.current?.focus(); } catch(_) {}
        }, 200);
        return () => clearTimeout(t);
    }, [configEditorOpen]);
    const onChangeNumber = (name, value, error) => {
        setValueNum(value);
        onChange(name, value, error);
    }
    const testParameterValues = (curVal) => {
        if( required && verifier_regex !== ""){
            return !RegExp(verifier_regex).test(curVal);
        }else if(verifier_regex !== "" && curVal !== ""){
            return !RegExp(verifier_regex).test(curVal);
        }else{
            return false;
        }
    }
    const onChangeDictVal = (evt, opt) => {
        const updated = dictValue.map( (op, i) => {
            if(i === opt){
                return {...op, value: evt.target.value, default_show: true};
            }else{
                return {...op}
            }
        } );
        submitDictChange(updated);
        setDictValue(updated);
    }
    const onChangeDictKey = (evt, index) => {
        const updated = dictValue.map( (op, i) => {
            if(i === index){
                return {...op, name: evt.target.value, default_show: true};
            }else{
                return {...op}
            }
        } );
        submitDictChange(updated);
        setDictValue(updated);
    }
    const addDictValEntry = () => {
        // add the selected value to our dict array
        let choice = {...dictSelectOptionsChoice, default_show: true, value: dictSelectOptionsChoice.default_value};
        if(choice.name === "Custom..."){
            choice.name = "";
        } 
        const newDictValue = [...dictValue, choice]
        setDictValue(newDictValue);
        // updated the dict array to the new set of options
        let dictSelectOptionsInitial = dictSelectOptions.reduce( (prev, op) => {
            //for each option, check how many instances of it are allowed
            // then check how many we have currently
            let count = newDictValue.reduce( (preCount, cur) => {
                if(cur.name === op.name){return preCount + 1}
                return preCount;
            }, 0);
            if(count === 0){
                return [...prev, {...op}];    
            }else{
                return [...prev]
            }
        }, []);
        if(dictSelectOptionsInitial.length === 0){
            dictSelectOptionsInitial = [{name: "Custom...", default_show: false, value: ""}]
        }
        submitDictChange(newDictValue);
        setDictSelectOptions(dictSelectOptionsInitial);
        setDictSelectOptionsChoice(dictSelectOptionsInitial[0]);
        
    }
    const removeDictEntry = (i) => {
        const newValues = dictValue.filter( (opt, index) => {
            if(i === index){return false}
            return true;
        });
        setDictValue(newValues);
        // updated the dict array to the new set of options
        let dictSelectOptionsInitial = dictOptions.reduce( (prev, op) => {
            //for each option, check how many instances of it are allowed
            // then check how many we have currently
            let count = newValues.reduce( (preCount, cur) => {
                if(cur.name === op.name){return preCount + 1}
                return preCount;
            }, 0);
            if(count === 0){
                return [{...op}, ...prev ];    
            }else{
                return [...prev]
            }
        }, [{name: "Custom...", default_show: false, default_value: ""}]);
        submitDictChange(newValues);
        setDictSelectOptions(dictSelectOptionsInitial);
        setDictSelectOptionsChoice(dictSelectOptionsInitial[0]);
    }
    const onChangeDate = (date) => {
        try {
            let newDayjsDate = dayjs(date);
            let newDayString = date.toISOString().slice(0,10);
            setDateValue(newDayjsDate);
            onChange(name, newDayString, "");
        }catch(error){
            snackActions.warning("invalid date")
            console.error("invalid date", date);
        }
    }
    const toggleSwitchValue = (evt) => {
        setValue(evt.target.checked);
        onChange(name, evt.target.checked, false);
    }
    const addNewArrayValue = () => {
        const newArray = [...arrayValue, ""];
        setArrayValue(newArray);
        onChange(name, newArray, false);
    }
    const removeArrayValue = (index) => {
        let removed = [...arrayValue];
        removed.splice(index, 1);
        setArrayValue(removed);
        onChange(name, removed, false);
    }
    const onChangeArrayText = (value, error, index) => {
        let values = [...arrayValue];
        values[index] = value;
        setArrayValue(values);
        onChange(name, values, false);
    }
    const addNewTypedArrayValue = () => {
        const newTypedArray = [...typedArrayValue, [default_value, ""]];
        setTypedArrayValue(newTypedArray);
        onChange(name, newTypedArray, false);
    }
    const removeTypedArrayValue = (index) => {
        let removed = [...typedArrayValue];
        removed.splice(index, 1);
        setTypedArrayValue(removed);
        onChange(name, removed, false);
    }
    const onChangeTypedArrayText = (value, error, index) => {
        let values = [...typedArrayValue];
        if(value.includes("\n")){
            let new_values = value.split("\n");
            values = [...values, [default_value, ...new_values.slice(1)]];
            values[index][1] = new_values[0];
        }else{
            values[index][1] = value;
        }

        setTypedArrayValue(values);
        onChange(name, values, false);
    }
    const onChangeTypedArrayChoice = (evt, index) => {
        let values = [...typedArrayValue];
        values[index][0] = evt.target.value;
        setTypedArrayValue(values);
        onChange(name, values, false);
    }
    const getParameterObject = () => {
        switch(parameter_type){
            case "Date":
                return (
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Grid container justifyContent="flex-start">
                            <DesktopDatePicker
                            format="MM/DD/YYYY"
                            margin="normal"
                            value={dateValue}
                            onChange={onChangeDate}
                            />
                        </Grid>
                    </LocalizationProvider>
                );
            case "FileMultiple":
                return (
                    <>
                        <DragAndDropFileUpload values={fileMultValue} multiple={true} onChange={onFileMultChange} />
                    </>
                )
            case "File":
                return (
                    <>
                        <DragAndDropFileUpload value={fileValue} multiple={false} onChange={onFileChange} />
                    </>

                )
            case "ChooseOne":
                return (
                    <div className="mythic-create-inline-control">
                        <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
                            <CircularProgress color="inherit" />
                        </Backdrop>
                        <FormControl>
                            {ChoiceOptions.length === 0 &&
                                <InputLabel>{"No Options Available"}</InputLabel>
                            }
                            <Select
                              value={value}
                              onChange={onChangeValue}
                            >
                            {
                                ChoiceOptions.map((opt, i) => (
                                    <MenuItem key={"buildparamopt" + i} value={opt}>{choiceLabel(opt)}</MenuItem>
                                ))
                            }
                            </Select>
                        </FormControl>
                        {dynamic_query_function !== "" && dynamic_query_function !== undefined &&
                            <MythicStyledTooltip title={"ReIssue Dynamic Query Function"} tooltipStyle={{display: "inline-block"}}>
                                <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small" onClick={reIssueDynamicQueryFunction}>
                                    <RefreshIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                    </div>
                );
            case "ChooseOneCustom":
                return (
                    <div style={{position: "relative"}}>
                        <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
                            <CircularProgress color="inherit" />
                        </Backdrop>
                        <div className="mythic-create-inline-control">
                            <FormControl style={{flex: "0 1 12rem"}}>
                                <Select
                                    multiple={false}
                                    disabled={chooseOneCustomValue !== ""}
                                    value={value}
                                    onChange={onChangeValue}
                                    input={<Input />}
                                >
                                    {
                                        ChoiceOptions.map((opt, i) => (
                                            <MenuItem key={name + i} value={opt}>{choiceLabel(opt)}</MenuItem>
                                        ))
                                    }
                                </Select>
                            </FormControl>
                            <span className="mythic-create-choice-divider">OR</span>
                            <MythicTextField name={name} requiredValue={required} placeholder={"Custom Value"} value={chooseOneCustomValue} multiline={true} maxRows={5}
                                             onChange={onChangeTextChooseOneCustom} display="inline-block"
                            />
                            {dynamic_query_function !== "" && dynamic_query_function !== undefined &&
                                <MythicStyledTooltip title={"ReIssue Dynamic Query Function"} tooltipStyle={{display: "inline-block"}}>
                                    <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small" onClick={reIssueDynamicQueryFunction}>
                                        <RefreshIcon fontSize="small" />
                                    </IconButton>
                                </MythicStyledTooltip>
                            }
                        </div>

                    </div>
                )
            case "ChooseMultiple":
                return (
                    <div className="mythic-create-inline-control">
                        <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
                            <CircularProgress color="inherit" />
                        </Backdrop>
                        <FormControl>
                            <InputLabel id={name + "select"} style={{paddingTop: "15px"}}>{"Select Multiple"}</InputLabel>
                            {ChoiceOptions.length === 0 &&
                                <InputLabel>{"No Options Available"}</InputLabel>
                            }
                            <Select
                                value={multiValue}
                                multiple={true}
                                onChange={onChangeMultValue}
                            >
                            {
                                ChoiceOptions.map((opt, i) => (
                                    <MenuItem key={"buildparamopt" + i} value={opt}>{choiceLabel(opt)}</MenuItem>
                                ))
                            }
                            </Select>
                        </FormControl>
                        {dynamic_query_function !== "" && dynamic_query_function !== undefined &&
                            <MythicStyledTooltip title={"ReIssue Dynamic Query Function"} tooltipStyle={{display: "inline-block"}}>
                                <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small" onClick={reIssueDynamicQueryFunction}>
                                    <RefreshIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                    </div>
                );
            case "Array":
                return (
                    <TableContainer className="mythicElement mythic-create-array-table">
                        <Table size="small" style={{tableLayout: "fixed", maxWidth: "100%", "overflow": "auto"}}>
                            <TableBody>
                                {arrayValue.map( (a, i) => (
                                    <TableRow key={'array' + name + i} style={{}} >
                                        <MythicStyledTableCell style={{width: "2rem"}}>
                                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={(e) => {removeArrayValue(i)}}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <MythicTextField requiredValue={required} fullWidth={true} placeholder={""} value={a} multiline={true}
                                                onChange={(n,v,e) => onChangeArrayText(v, e, i)} display="inline-block" autoFocus={i !== 0 && a === ""}
                                                validate={testParameterValues} errorText={"Must match: " + verifier_regex} marginBottom={"0px"}
                                            />
                                        </MythicStyledTableCell>
                                    </TableRow>
                                ))}
                                <TableRow >
                                    <MythicStyledTableCell style={{width: "3rem"}}>
                                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" size="small" onClick={addNewArrayValue}> <AddCircleIcon fontSize="small" /> </IconButton>
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell></MythicStyledTableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case "TypedArray":
                return (
                    <TableContainer className="mythicElement mythic-create-array-table">
                        <Table size="small" style={{tableLayout: "fixed", maxWidth: "100%", "overflow": "auto"}}>
                            <TableBody>
                                {typedArrayValue.map( (a, i) => (
                                    <TableRow key={'typedarray' + name + i} >
                                        <MythicStyledTableCell style={{width: "2rem", paddingLeft:"0"}}>
                                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={(e) => {removeTypedArrayValue(i)}}><DeleteIcon fontSize="small" /> </IconButton>
                                        </MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <div style={{display: "inline-flex", alignItems: "center", width: "100%"}}>
                                                <FormControl style={{width: "30%"}}>
                                                    <Select
                                                        value={a[0]}
                                                        onChange={(e) => onChangeTypedArrayChoice(e, i)}
                                                        input={<Input />}
                                                    >
                                                        {
                                                            choices.map((opt, i) => (
                                                                <MenuItem key={name + i} value={opt}>{choiceLabel(opt)}</MenuItem>
                                                            ))
                                                        }
                                                    </Select>
                                                </FormControl>
                                                <MythicTextField required={required} fullWidth={true} placeholder={""} value={a[1]} multiline={true}
                                                                 onChange={(n,v,e) => onChangeTypedArrayText(v, e, i)} display="inline-block" maxRows={5}
                                                                 validate={testParameterValues} errorText={"Must match: " + verifier_regex}
                                                />
                                            </div>

                                        </MythicStyledTableCell>
                                    </TableRow>
                                ))}
                                <TableRow >
                                    <MythicStyledTableCell style={{width: "5rem", paddingLeft:"0"}}>
                                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" size="small" onClick={addNewTypedArrayValue}> <AddCircleIcon fontSize="small" /> </IconButton>
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell></MythicStyledTableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )
            case "Dictionary":
                return (
                    <React.Fragment>
                        {dictValue.map( (opt, i) => (
                            <div className="mythic-create-dictionary-row" key={"dictval" + i}>
                                <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" onClick={(e) => {removeDictEntry(i)}} size="small"><DeleteIcon fontSize="small" /> </IconButton>
                                <Input startAdornment={<Button disabled>Key</Button>} size="small" value={opt.name} onChange={(e) => onChangeDictKey(e, i)}></Input>
                                <Input startAdornment={<Button disabled>Value</Button>} size="small" value={opt.value} onChange={(e) => onChangeDictVal(e, i)}></Input>
                            </div>
                        )
                        )}
                        {dictSelectOptions.length > 0 ? (
                            <div className="mythic-create-dictionary-add">
                                <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" size="small" onClick={addDictValEntry}> <AddCircleIcon fontSize="small" /> </IconButton>
                                <Select size="small" value={dictSelectOptionsChoice} onChange={(e) => setDictSelectOptionsChoice(e.target.value)}>
                                    {dictSelectOptions.map( (selectOpt, i) => (
                                        <MenuItem key={"selectopt" + name + i} value={selectOpt}>{selectOpt.name}</MenuItem>
                                    ) )}
                                </Select>
                                
                            </div>
                        ) : null
                        }
                    </React.Fragment>
                );
            case "String":
                if(configEditorMode !== null){
                    const aceMode = detectAceMode(configEditorMode.languageHint, value);
                    const status = getConfigStatus(value, configEditorMode.languageHint);
                    const hasPresets = !!configEditorMode.presetsFn && configEditorPresets.length > 0;
                    const matchingPresetFilename = (() => {
                        const v = value ?? "";
                        if(v === ""){ return ""; }
                        const match = configEditorPresets.find(p => p.content === v);
                        return match ? match.filename : "";
                    })();
                    const chipColor = status.kind === "invalid" ? "error" : status.kind === "set" ? "success" : "default";
                    return (
                        <React.Fragment>
                            <Paper variant="outlined" style={{padding: "8px 12px"}}>
                                <div style={{display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap"}}>
                                    <Button variant="outlined" component="label" size="small">
                                        Upload
                                        <input onChange={onConfigEditorUpload} type="file" hidden accept=".json,.toml,.txt,application/json,text/plain" />
                                    </Button>
                                    {hasPresets && (
                                        <FormControl size="small" style={{minWidth: "180px"}} disabled={c2CustomRPCLoading}>
                                            <InputLabel id={"preset_label_" + id}>Preset</InputLabel>
                                            <Select
                                                labelId={"preset_label_" + id}
                                                label="Preset"
                                                value={matchingPresetFilename}
                                                displayEmpty
                                                renderValue={(selected) => {
                                                    if(!selected){ return <em style={{opacity: 0.6}}>Choose a preset…</em>; }
                                                    const p = configEditorPresets.find(x => x.filename === selected);
                                                    return p ? p.label : selected;
                                                }}
                                                onChange={(e) => onSelectPreset(e.target.value)}>
                                                {configEditorPresets.map(p => (
                                                    <MenuItem key={p.filename} value={p.filename}>{p.label}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                    <Button variant="text" size="small" color="warning" onClick={onClearConfigEditor}>
                                        Clear
                                    </Button>
                                    <Button variant="contained" size="small" onClick={() => setConfigEditorOpen(true)}>
                                        Edit
                                    </Button>
                                    <div style={{marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center"}}>
                                        <MythicStyledTooltip title="Open editor">
                                            <Chip size="small" label={status.label} color={chipColor}
                                                  clickable
                                                  onClick={() => setConfigEditorOpen(true)} />
                                        </MythicStyledTooltip>
                                        <Chip size="small" variant="outlined" label={aceMode.toUpperCase()} />
                                    </div>
                                </div>
                            </Paper>
                            <Dialog open={configEditorOpen} onClose={() => setConfigEditorOpen(false)} maxWidth="lg" fullWidth>
                                <DialogTitle style={{paddingBottom: 0}}>
                                    {display_name && display_name.length > 0 ? display_name : name}
                                    {hasFormSchema && (
                                        <Tabs value={editorTab}
                                              onChange={(e, v) => { if(v === 'visual'){ onSwitchToVisual(); } else { setEditorTab('source'); } }}
                                              style={{marginTop: "4px", minHeight: "32px"}}
                                              TabIndicatorProps={{style: {height: "2px"}}}>
                                            <Tab value="visual" label="Visual" style={{minHeight: "32px", textTransform: "none"}} />
                                            <Tab value="source" label="Source" style={{minHeight: "32px", textTransform: "none"}} />
                                        </Tabs>
                                    )}
                                </DialogTitle>
                                <DialogContent dividers>
                                    {(!hasFormSchema || editorTab === 'source') && (
                                        <React.Fragment>
                                            <div style={{display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap"}}>
                                                <Typography variant="caption" color="text.secondary" style={{flex: "1 1 auto"}}>
                                                    Paste configuration inline, upload a local JSON/TOML file, or leave empty for default behavior without transforms.
                                                </Typography>
                                                <Button variant="text" size="small" onClick={onFormatConfigEditorJson}>
                                                    Format
                                                </Button>
                                                <Button variant="text" size="small" onClick={onCopyConfigToClipboard}>
                                                    Copy
                                                </Button>
                                            </div>
                                            {visualParseError && (
                                                <Typography variant="caption" color="error" style={{display: "block", marginBottom: "4px"}}>
                                                    Visual tab unavailable: {visualParseError}
                                                </Typography>
                                            )}
                                            <AceEditor
                                                mode={aceMode}
                                                theme={theme.palette.mode === 'dark' ? 'monokai' : 'github'}
                                                width="100%"
                                                minLines={20}
                                                maxLines={40}
                                                showPrintMargin={false}
                                                wrapEnabled={true}
                                                value={value}
                                                placeholder={getConfigEditorPlaceholder(configEditorMode.languageHint)}
                                                onChange={(newValue) => onChangeText(name, newValue, testParameterValues(newValue))}
                                                setOptions={{useWorker: false, tabSize: 2, useSoftTabs: true}}
                                                name={"ace_config_editor_" + id}
                                                onLoad={(editor) => { aceEditorRef.current = editor; }}
                                                editorProps={{$blockScrolling: true}}
                                            />
                                        </React.Fragment>
                                    )}
                                    {hasFormSchema && editorTab === 'visual' && visualValue !== null && (
                                        <SchemaFormRenderer schema={form_schema} value={visualValue} onChange={onVisualChange} />
                                    )}
                                </DialogContent>
                                <DialogActions>
                                    <Button onClick={() => setConfigEditorOpen(false)}>Close</Button>
                                </DialogActions>
                            </Dialog>
                        </React.Fragment>
                    );
                }
                return (
                    <MythicTextField required={required} value={value} multiline={true}
                        onChange={onChangeText} display="inline-block" name={name} showLabel={false}
                        validate={testParameterValues} errorText={"Must match: " + verifier_regex}
                    />
                );
            case "Number":
                return (
                    <MythicTextField requiredValue={required} value={valueNum} type={"number"}
                        onChange={onChangeNumber} display="inline-block" name={name} showLabel={false}
                        validate={testParameterValues} errorText={"Must match: " + verifier_regex}
                                     marginBottom={"0px"}
                    />
                );
            case "Boolean":
                return (
                      <Switch
                          color={"info"}
                        checked={isTrue(value)}
                        onChange={toggleSwitchValue}
                        inputProps={{ 'aria-label': 'info checkbox' }}
                      />
                );
            case "MapArray":
                return (
                    <>
                        <Table size="small" style={{tableLayout: "fixed", maxWidth: "100%", height: "100%", "overflow": "auto"}}>
                            <TableBody>
                            {mapArray.map( (val, i) => (
                                <TableRow key={"payloadtype" + i}>
                                    <MythicStyledTableCell style={{width: "2rem"}}>
                                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={(e) => {removeMapArrayMap(i)}}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        <MythicTextField autoFocus={true} name={"Payload Type Name"} onChange={(name, value) => updateMapArrayMap(i, value)} value={val[0]} />
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        <Table size="small" style={{tableLayout: "fixed", maxWidth: "100%", height: "100%", "overflow": "auto"}}>
                                            <TableBody>
                                                {val[1].map( (v, j) => (
                                                    <TableRow key={"payloadtypevalue" + i + j}>
                                                        <MythicStyledTableCell style={{width: "2rem"}}>
                                                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={(e) => {removeMapArray(i, j)}}>
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </MythicStyledTableCell>
                                                        <MythicStyledTableCell>
                                                            <MythicTextField autoFocus={true} name={"Command Name"} onChange={(name, value) => updateMapArray(i, j, value)} value={v}
                                                                onEnter={() => addMapArray(i)}/>
                                                        </MythicStyledTableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow>
                                                    <MythicStyledTableCell style={{width: "3rem"}}>
                                                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" size="small" onClick={() => addMapArray(i)}> <AddCircleIcon fontSize="small" /> </IconButton>
                                                    </MythicStyledTableCell>
                                                    <MythicStyledTableCell/>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </MythicStyledTableCell>
                                </TableRow>
                            ))}
                                <TableRow>
                                    <MythicStyledTableCell style={{width: "3rem"}}>
                                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" size="small" onClick={addMapArrayMap}> <AddCircleIcon fontSize="small" /> </IconButton>
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell/>
                                    <MythicStyledTableCell/>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </>
                )
           default:
            return null
        }
    }
    const modifiedValue = () => {
        switch(parameter_type){
            case "Date":
                return (new Date(dateValue)).toISOString().slice(0,10) !== initialValue;
            case "ChooseOne":
                return value !== initialValue;
            case "ChooseOneCustom":
                return value !== initialValue || chooseOneCustomValue !== "";
            case "ChooseMultiple":
                return initialValue === undefined ? false : multiValue.toString() !== initialValue.toString();
            case "Array":
                return arrayValue.toString() !== initialValue.toString();
            case "Dictionary":
                // quick check for the same object
                const initialValueShow = initialValue.filter( c => c.default_show);
                if(dictValue.length !== initialValueShow.length){return true}
                for(let i = 0; i < dictValue.length; i++){
                    if(JSON.stringify(dictValue[i], Object.keys(dictValue[i]).sort()) !== JSON.stringify(initialValueShow[i], Object.keys(initialValueShow[i]).sort())){return true}
                }
                return false;
            case "String":
                return value !== initialValue;
            case "File":
                return value !== "";
            case "Number":
                return (valueNum*1) !== (initialValue *1);
            case "Boolean":
                return Boolean(value) !== Boolean(initialValue);
            default:
                return true;
        }
    }
    const isModified = modifiedValue();
    if(displayMode === "card"){
        return (
            <div className={`mythic-create-parameter-card ${isModified ? "mythic-create-parameter-card-modified" : ""}`.trim()} key={"buildparam" + id}>
                <div className="mythic-create-parameter-copy">
                    <div className="mythic-create-parameter-title-row">
                        <Typography component="div" className="mythic-create-parameter-title">
                            {name}
                        </Typography>
                    </div>
                    <div className="mythic-create-parameter-chips">
                        <span className="mythic-create-parameter-chip">{parameter_type}</span>
                        {required && <span className="mythic-create-parameter-chip mythic-create-parameter-chip-required">Required</span>}
                        {isModified && <span className="mythic-create-parameter-chip mythic-create-parameter-chip-modified">Modified</span>}
                    </div>
                    {description &&
                        <Typography component="div" className="mythic-create-parameter-description">
                            {description}
                        </Typography>
                    }
                </div>
                <div className="mythic-create-parameter-control">
                    {getParameterObject()}
                </div>
            </div>
        )
    }
    return (
            <TableRow key={"buildparam" + id} hover>
                <MythicStyledTableCell>
                    <MythicStyledTooltip title={name.length > 0 ? name : "No Description"}>
                        <Typography style={{fontWeight: "600"}} >
                            {display_name && display_name.length > 0 ? display_name : name}
                        </Typography>
                        <Typography style={{fontSize: theme.typography.pxToRem(15), marginLeft: "10px"}}>
                            {description}
                        </Typography>

                        {isModified ? (
                            <Typography color="warning.main">Modified</Typography>
                        ) : null}
                    </MythicStyledTooltip>
                 </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {getParameterObject()}
                </MythicStyledTableCell>
            </TableRow>
        )
}
