import React, {useEffect} from 'react';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MythicTextField from '../../MythicComponents/MythicTextField';
import DeleteIcon from '@mui/icons-material/Delete';
import {IconButton, Input, Button, MenuItem, Grid, Chip, Tabs, Tab} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import dayjs from 'dayjs';
import Switch from '@mui/material/Switch';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {Typography} from '@mui/material';
import {snackActions} from "../../utilities/Snackbar";
import {useTheme} from '@mui/material/styles';
import {gql, useMutation} from '@apollo/client';
import { Backdrop } from '@mui/material';
import {CircularProgress} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import InputLabel from '@mui/material/InputLabel';
import {DragAndDropFileUpload} from "../Callbacks/TaskParametersDialogRow";
import DialogContent from '@mui/material/DialogContent';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-searchbox';
import {SchemaFormRenderer, emptyValueForSchema} from './SchemaFormRenderer';
import {MythicDialog} from '../../MythicComponents/MythicDialog';
import {MythicDraggableDialogTitle} from '../../MythicComponents/MythicDraggableDialogTitle';
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicDialogSection,
} from '../../MythicComponents/MythicDialogLayout';

export const getDynamicQueryBuildParameterParams = gql`
mutation getDynamicBuildParamsMutation($payload_type: String!, $parameter_name: String!, $selected_os: String!, $other_parameters: jsonb){
    dynamicQueryBuildParameterFunction(payload_type: $payload_type, parameter_name: $parameter_name, selected_os: $selected_os, other_parameters: $other_parameters){
        status
        error
        choices
        complex_choices {
            display_value
            value
        }
        parameter_name
    }
}
`;
export const getDynamicQueryC2ProfileParameterParams = gql`
mutation getDynamicC2ProfileParamsMutation($c2_profile_name: String!, $parameter_name: String!, $other_parameters: jsonb){
    dynamicQueryC2ProfileParameterFunction(c2_profile_name: $c2_profile_name, parameter_name: $parameter_name, other_parameters: $other_parameters){
        status
        error
        choices
        complex_choices {
            display_value
            value
        }
        parameter_name
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
function hasUsableJSONStringSchema(schema){
    return !!(
        schema &&
        typeof schema === "object" &&
        !Array.isArray(schema) &&
        typeof schema.type === "string" &&
        schema.type.length > 0
    );
}
function getJSONStringStatus(rawValue){
    const raw = rawValue === undefined || rawValue === null ? "" : String(rawValue);
    const trimmed = raw.trim();
    if(trimmed === ""){
        return {kind: "empty", label: "Empty"};
    }
    try{
        JSON.parse(trimmed);
    }catch{
        return {kind: "invalid", label: "Invalid JSON"};
    }
    const lineCount = raw.split(/\r?\n/).length;
    return {
        kind: "set",
        label: `Valid JSON (${lineCount} line${lineCount === 1 ? "" : "s"})`,
    };
}
function getJSONEditorPlaceholder(schema){
    if(hasUsableJSONStringSchema(schema)){
        return JSON.stringify(emptyValueForSchema(schema), null, 2);
    }
    return "{\n  \"name\": \"example\"\n}";
}
export function CreatePayloadParameter({onChange, parameter_type, default_value, name, required, verifier_regex, id,
                                           description, initialValue, choices, trackedValue, instance_name, choices_display_names,
                                            display_name, json_string_schema,
                                           payload_type, selected_os, c2_profile_name, dynamic_query_function, displayMode = "table",
                                       getOtherParameters}){
    const theme = useTheme();
    const hasJSONStringSchema = parameter_type === "JSONString" && hasUsableJSONStringSchema(json_string_schema);
    const [configEditorOpen, setConfigEditorOpen] = React.useState(false);
    const [editorTab, setEditorTab] = React.useState("source");
    const [visualParseError, setVisualParseError] = React.useState("");
    const aceEditorRef = React.useRef(null);
    const [value, setValue] = React.useState("");
    const [valueNum, setValueNum] = React.useState(0);
    const [multiValue, setMultiValue] = React.useState([]);
    const [ChoiceOptions, setChoiceOptions] = React.useState({
        choices: [],
        display_value_map: {}
    });
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
    const handleDynamicQueryCompleted = (data) => {
        const dynamicQueryResponse = data.dynamicQueryBuildParameterFunction || data.dynamicQueryC2ProfileParameterFunction;
        if(dynamicQueryResponse === undefined){
            snackActions.warning("Failed to parse dynamic parameter results");
            setBackdropOpen(false);
            return;
        }
        if(dynamicQueryResponse.status === "success"){
            try{
                if(parameter_type === "JSONString"){
                    const complexChoices = Array.isArray(dynamicQueryResponse.complex_choices) ? dynamicQueryResponse.complex_choices : [];
                    setChoiceOptions({
                        choices: complexChoices.map((choice) => choice.value),
                        display_value_map: complexChoices.reduce((prev, cur) => {
                            return {...prev, [cur.value]: cur.display_value}
                        }, {})
                    });
                    setBackdropOpen(false);
                    return;
                }
                let choicesInUse = [];
                usingDynamicParamChoices.current = true;
                if(dynamicQueryResponse.complex_choices !== undefined && dynamicQueryResponse.complex_choices.length > 0){
                    setChoiceOptions({
                        choices: dynamicQueryResponse.complex_choices.map( (choice) => {
                            return choice.value;
                        }),
                        display_value_map: dynamicQueryResponse.complex_choices.reduce( (prev, cur) => {
                            return {...prev, [cur.value]: cur.display_value}
                        }, {})
                    })
                    choicesInUse = dynamicQueryResponse.complex_choices.map( (choice) => {
                        return choice.value;
                    });
                } else {
                    setChoiceOptions({
                        choices: dynamicQueryResponse.choices,
                        display_value_map: dynamicQueryResponse.choices.reduce( (prev, cur) => {
                            return {...prev, [cur]: cur}
                        }, {})
                    })
                    choicesInUse = [...dynamicQueryResponse.choices];
                }

                if(parameter_type === "ChooseOne"){
                    if(choicesInUse.length > 0){
                        const currentValue = trackedValue !== undefined && trackedValue !== "" ? trackedValue : value;
                        if(currentValue !== "") {
                            setValue(currentValue);
                            onChange(name, currentValue, false);
                        } else if(choicesInUse.includes(default_value)) {
                            setValue(default_value);
                            onChange(name, default_value, false);
                        } else {
                            setValue(choicesInUse[0]);
                            onChange(name, choicesInUse[0], false);
                        }
                    }
                } else if(parameter_type === "ChooseOneCustom"){
                    const currentValue = trackedValue !== undefined && trackedValue !== "" ? trackedValue : value;
                    let newStandardValue = default_value;
                    if(choicesInUse.includes(default_value) && currentValue !== "") {
                        setValue(default_value);
                    } else {
                        setValue(choicesInUse[0]);
                        newStandardValue = choicesInUse[0];
                    }
                    if(!choicesInUse.includes(currentValue) && currentValue !== "" ){
                        setChooseOneCustomValue(currentValue);
                        newStandardValue = currentValue;
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
            snackActions.warning(dynamicQueryResponse.error);
        }
        setBackdropOpen(false);
    };
    const handleDynamicQueryError = (data) => {
        snackActions.warning("Failed to perform dynamic parameter query");
        console.log(data);
        setBackdropOpen(false);
    };
    const [getDynamicBuildParams] = useMutation(getDynamicQueryBuildParameterParams, {
        onCompleted: handleDynamicQueryCompleted,
        onError: handleDynamicQueryError
    });
    const [getDynamicC2Params] = useMutation(getDynamicQueryC2ProfileParameterParams, {
        onCompleted: handleDynamicQueryCompleted,
        onError: handleDynamicQueryError
    });
    const submitDynamicQueryFunction = () => {
        if(c2_profile_name !== undefined && c2_profile_name !== ""){
            getDynamicC2Params({variables:{
                    parameter_name: name,
                    c2_profile_name: c2_profile_name,
                    other_parameters: typeof getOtherParameters === "function" ? getOtherParameters() : {}
                }})
        } else {
            getDynamicBuildParams({variables:{
                    parameter_name: name,
                    selected_os: selected_os,
                    payload_type: payload_type,
                    other_parameters: typeof getOtherParameters === "function" ? getOtherParameters() : {}
                }})
        }
    }
    const reIssueDynamicQueryFunction = () => {
        setBackdropOpen(true);
        snackActions.info(`Querying ${c2_profile_name ? "C2 profile" : "payload type"} container for options...`,  {autoClose: 1000});
        submitDynamicQueryFunction();
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
            let currentChoices = [];
            let currentChoiceMap = {};
            if(choices_display_names !== null && choices_display_names !== undefined && Object.keys(choices_display_names).length > 0){
                currentChoices = choices;
                currentChoiceMap = choices_display_names;
            } else {
                currentChoices = choices;
                currentChoiceMap = choices.reduce( (prev, cur) => {
                    return {...prev, [cur]: cur}
                })
            }
            setChoiceOptions({
                choices: currentChoices,
                display_value_map: currentChoiceMap
            })
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
            let currentChoices = [];
            let currentChoiceMap = {};
            if(choices_display_names !== null && choices_display_names !== undefined && Object.keys(choices_display_names).length > 0){
                currentChoices = choices;
                currentChoiceMap = choices_display_names;
            } else {
                currentChoices = choices;
                currentChoiceMap = choices.reduce( (prev, cur) => {
                    return {...prev, [cur]: cur}
                })
            }
            setChoiceOptions({
                choices: currentChoices,
                display_value_map: currentChoiceMap
            })
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
            for (const [key, val] of Object.entries(trackedValue)) {
                initial.push([key, val]);
            }
            setMapArray(initial);
        }else if(parameter_type === "JSONString"){
            setValue(trackedValue);
        }else{
            console.log("hit an unknown parameter type")
        }
        if(dynamic_query_function !== "" && dynamic_query_function !== undefined){
            if(!usingDynamicParamChoices.current){
                setBackdropOpen(true);
                snackActions.info(`Querying ${c2_profile_name ? "C2 profile" : "payload type"} container for options...`,  {autoClose: 1000});
                submitDynamicQueryFunction();
            }
            usingDynamicParamChoices.current = true;
        }
        // Reinitialize only when the parameter identity or selected saved instance changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const onChangeJSONStringSource = (newValue) => {
        setVisualParseError("");
        onChangeText(name, newValue, testParameterValues(newValue));
    }
    const showUndoSnackbar = (label, previousValue) => {
        snackActions.info(
            <span style={{display: "inline-flex", alignItems: "center", gap: "8px"}}>
                {label}
                <Button
                    size="small"
                    variant="outlined"
                    onClick={(event) => {
                        event.stopPropagation();
                        onChangeJSONStringSource(previousValue);
                    }}
                >
                    Undo
                </Button>
            </span>,
            {autoClose: 8000}
        );
    }
    const onSelectJSONStringPreset = (presetValue) => {
        if(presetValue === ""){
            return;
        }
        const previousValue = value ?? "";
        const presetLabel = ChoiceOptions.display_value_map[presetValue] || "preset";
        onChangeJSONStringSource(presetValue);
        if(previousValue !== "" && previousValue !== presetValue){
            showUndoSnackbar(`Loaded preset "${presetLabel}".`, previousValue);
        }
    }
    const onConfigEditorUpload = async (evt) => {
        const file = evt.target.files?.[0];
        if(!file){
            return;
        }
        try{
            const uploadedValue = await file.text();
            onChangeJSONStringSource(uploadedValue);
        }catch(error){
            snackActions.warning("Failed to read uploaded configuration file");
            console.error(error);
        }finally{
            evt.target.value = "";
        }
    }
    const onFormatConfigEditorJson = () => {
        if((value ?? "").trim() === ""){
            return;
        }
        try{
            onChangeJSONStringSource(JSON.stringify(JSON.parse(value), null, 2));
        }catch{
            snackActions.warning("Source is not valid JSON");
        }
    }
    const parseSourceForVisual = () => {
        const raw = value === undefined || value === null ? "" : String(value);
        if(raw.trim() === ""){
            return hasJSONStringSchema ? emptyValueForSchema(json_string_schema) : {};
        }
        return JSON.parse(raw);
    }
    const visualValue = React.useMemo(() => {
        if(editorTab !== "visual"){
            return null;
        }
        try{
            return parseSourceForVisual();
        }catch{
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorTab, value, json_string_schema]);
    const onVisualChange = (newValue) => {
        try{
            const serialized = JSON.stringify(newValue, null, 2);
            onChangeJSONStringSource(serialized);
        }catch(error){
            snackActions.warning("Failed to serialize visual form state");
            console.error(error);
        }
    }
    const onSwitchToVisual = () => {
        try{
            parseSourceForVisual();
            setVisualParseError("");
            setEditorTab("visual");
        }catch(error){
            setVisualParseError(error.message || String(error));
            setEditorTab("source");
        }
    }
    const onClearConfigEditor = () => {
        const previousValue = value ?? "";
        onChangeJSONStringSource("");
        if(previousValue !== ""){
            showUndoSnackbar("Config cleared.", previousValue);
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
        }catch(error){
            snackActions.warning("Clipboard unavailable");
            console.error(error);
        }
    }
    React.useEffect(() => {
        if(!configEditorOpen){
            return undefined;
        }
        const focusTimer = setTimeout(() => {
            try{
                aceEditorRef.current?.focus();
            }catch{
                // The editor may not be mounted when the visual tab is selected.
            }
        }, 200);
        return () => clearTimeout(focusTimer);
    }, [configEditorOpen]);
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
                            {ChoiceOptions.choices.length === 0 &&
                                <InputLabel>{"No Options Available"}</InputLabel>
                            }
                            <Select
                              value={value}
                              onChange={onChangeValue}
                            >
                            {
                                ChoiceOptions.choices.map((opt, i) => (
                                    <MenuItem key={"buildparamopt" + i} value={opt}>{ChoiceOptions.display_value_map[opt]}</MenuItem>
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
                                        ChoiceOptions.choices.map((opt, i) => (
                                            <MenuItem key={name + i} value={opt}>{ChoiceOptions.display_value_map[opt]}</MenuItem>
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
                            {ChoiceOptions.choices.length === 0 &&
                                <InputLabel>{"No Options Available"}</InputLabel>
                            }
                            <Select
                                value={multiValue}
                                multiple={true}
                                onChange={onChangeMultValue}
                            >
                            {
                                ChoiceOptions.choices.map((opt, i) => (
                                    <MenuItem key={"buildparamopt" + i} value={opt}>{ChoiceOptions.display_value_map[opt]}</MenuItem>
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
                                                                <MenuItem key={name + i} value={opt}>{opt}</MenuItem>
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
                return (
                    <MythicTextField required={required} value={value} multiline={true}
                        onChange={onChangeText} display="inline-block" name={name} showLabel={false}
                        validate={testParameterValues} errorText={"Must match: " + verifier_regex}
                    />
                );
            case "JSONString": {
                const status = getJSONStringStatus(value);
                const chipColor = status.kind === "invalid" ? "error" : status.kind === "set" ? "success" : "default";
                const hasPresets = ChoiceOptions.choices.length > 0;
                const matchingPresetValue = ChoiceOptions.choices.includes(value) ? value : "";
                const editorTitle = display_name ? display_name : name;
                const openEditor = () => {
                    if(!hasJSONStringSchema){
                        setEditorTab("source");
                    }
                    setConfigEditorOpen(true);
                };
                return (
                    <React.Fragment>
                        <div style={{display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 0, position: "relative"}}>
                            <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
                                <CircularProgress color="inherit" />
                            </Backdrop>
                            <div className="mythic-create-inline-control" style={{alignItems: "center", flexWrap: "wrap"}}>
                                <Button
                                    className="mythic-table-row-action mythic-table-row-action-hover-info"
                                    component="label"
                                    size="small"
                                    variant="contained"
                                >
                                    Upload
                                    <input onChange={onConfigEditorUpload} type="file" hidden accept=".json,application/json,text/plain" />
                                </Button>
                                {hasPresets &&
                                    <FormControl size="small" style={{flex: "1 1 14rem", minWidth: "12rem"}}>
                                        <Select
                                            displayEmpty
                                            value={matchingPresetValue}
                                            renderValue={(selected) => {
                                                if(selected === ""){
                                                    return <em style={{opacity: 0.65}}>Choose preset</em>;
                                                }
                                                return ChoiceOptions.display_value_map[selected] || selected;
                                            }}
                                            onChange={(event) => onSelectJSONStringPreset(event.target.value)}
                                        >
                                            {ChoiceOptions.choices.map((presetValue, index) => (
                                                <MenuItem key={"jsonstringpreset" + index} value={presetValue}>
                                                    {ChoiceOptions.display_value_map[presetValue] || presetValue}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                }
                                <Button
                                    className="mythic-table-row-action mythic-table-row-action-hover-warning"
                                    size="small"
                                    variant="contained"
                                    onClick={onClearConfigEditor}
                                >
                                    Clear
                                </Button>
                                <Button
                                    className="mythic-table-row-action mythic-table-row-action-hover-success"
                                    size="small"
                                    variant="contained"
                                    onClick={openEditor}
                                >
                                    Edit
                                </Button>
                                <div style={{alignItems: "center", display: "flex", gap: "0.35rem", marginLeft: "auto", minWidth: 0}}>
                                    <Chip size="small" label={status.label} color={chipColor} />
                                    {dynamic_query_function !== "" && dynamic_query_function !== undefined &&
                                        <MythicStyledTooltip title={"ReIssue Dynamic Query Function"} tooltipStyle={{display: "inline-block"}}>
                                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small" onClick={reIssueDynamicQueryFunction}>
                                                <RefreshIcon fontSize="small" />
                                            </IconButton>
                                        </MythicStyledTooltip>
                                    }
                                </div>
                            </div>
                            {visualParseError !== "" &&
                                <Typography component="div" color="error" className="mythic-form-field-description">
                                    Visual tab unavailable: {visualParseError}
                                </Typography>
                            }
                        </div>
                        <MythicDialog
                            open={configEditorOpen}
                            maxWidth="lg"
                            onClose={() => setConfigEditorOpen(false)}
                            innerDialog={
                                <React.Fragment>
                                    <MythicDraggableDialogTitle>
                                        <div style={{display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 0}}>
                                            <Typography component="div" className="mythic-dialog-section-title">
                                                {editorTitle}
                                            </Typography>
                                            {hasJSONStringSchema &&
                                                <Tabs
                                                    value={editorTab}
                                                    onMouseDown={(event) => event.stopPropagation()}
                                                    onChange={(event, nextTab) => {
                                                        if(nextTab === "visual"){
                                                            onSwitchToVisual();
                                                        }else{
                                                            setEditorTab("source");
                                                        }
                                                    }}
                                                    style={{minHeight: "32px"}}
                                                    TabIndicatorProps={{style: {height: "2px"}}}
                                                >
                                                    <Tab value="visual" label="Visual" style={{minHeight: "32px", textTransform: "none"}} />
                                                    <Tab value="source" label="Source" style={{minHeight: "32px", textTransform: "none"}} />
                                                </Tabs>
                                            }
                                        </div>
                                    </MythicDraggableDialogTitle>
                                    <DialogContent
                                        dividers={true}
                                        className="mythic-json-dialog-body"
                                        style={{display: "flex", flexDirection: "column"}}
                                    >
                                        <MythicDialogBody compact>
                                            {(!hasJSONStringSchema || editorTab === "source") &&
                                                <MythicDialogSection
                                                    title="Source"
                                                    description="Edit the raw JSON string stored for this parameter."
                                                    actions={
                                                        <React.Fragment>
                                                            <Button size="small" variant="contained" onClick={onFormatConfigEditorJson}>
                                                                Format
                                                            </Button>
                                                            <Button size="small" variant="contained" onClick={onCopyConfigToClipboard}>
                                                                Copy
                                                            </Button>
                                                        </React.Fragment>
                                                    }
                                                >
                                                    {visualParseError !== "" &&
                                                        <Typography component="div" color="error" className="mythic-form-field-description" style={{marginBottom: "0.5rem"}}>
                                                            Visual tab unavailable: {visualParseError}
                                                        </Typography>
                                                    }
                                                    <AceEditor
                                                        mode="json"
                                                        theme={theme.palette.mode === 'dark' ? 'monokai' : 'github'}
                                                        width="100%"
                                                        minLines={20}
                                                        maxLines={40}
                                                        fontSize={13}
                                                        showPrintMargin={false}
                                                        wrapEnabled={true}
                                                        value={value ?? ""}
                                                        placeholder={getJSONEditorPlaceholder(json_string_schema)}
                                                        onChange={onChangeJSONStringSource}
                                                        setOptions={{useWorker: false, tabSize: 2, useSoftTabs: true}}
                                                        name={"ace_json_string_editor_" + id}
                                                        onLoad={(editor) => { aceEditorRef.current = editor; }}
                                                        editorProps={{$blockScrolling: true}}
                                                    />
                                                </MythicDialogSection>
                                            }
                                            {hasJSONStringSchema && editorTab === "visual" && visualValue !== null &&
                                                <MythicDialogSection
                                                    title="Visual"
                                                    description="Edit the JSON document through this parameter's schema."
                                                >
                                                    <SchemaFormRenderer
                                                        schema={json_string_schema}
                                                        value={visualValue}
                                                        onChange={onVisualChange}
                                                    />
                                                </MythicDialogSection>
                                            }
                                        </MythicDialogBody>
                                    </DialogContent>
                                    <MythicDialogFooter>
                                        <MythicDialogButton onClick={() => setConfigEditorOpen(false)}>
                                            Close
                                        </MythicDialogButton>
                                    </MythicDialogFooter>
                                </React.Fragment>
                            }
                        />
                    </React.Fragment>
                );
            }
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
            case "JSONString":
            case "String":
                return value !== initialValue;
            case "File":
                return value !== "";
            case "Number":
                return (valueNum*1) !== (initialValue *1);
            case "Boolean":
                return isTrue(value) !== isTrue(initialValue);
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
                            {display_name ? display_name : name}
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
                            {display_name ? display_name : name}
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
