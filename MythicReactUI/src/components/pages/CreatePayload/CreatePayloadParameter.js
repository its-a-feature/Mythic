import React, {useEffect} from 'react';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MythicTextField from '../../MythicComponents/MythicTextField';
import DeleteIcon from '@mui/icons-material/Delete';
import {IconButton, Input, Button, MenuItem, Grid} from '@mui/material';
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
function isTrue(value){
    if(typeof value === 'boolean'){
        return value;
    }
    if(typeof value === 'string'){
        return value.toLowerCase() === 'true' || value.toLowerCase() === 't';
    }
    console.log("unknown boolean value", value);
}
export function CreatePayloadParameter({onChange, parameter_type, default_value, name, required, verifier_regex, id,
                                           description, initialValue, choices, trackedValue, instance_name,
                                           payload_type, selected_os, dynamic_query_function}){
    const theme = useTheme();
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
    const [arrayValue, setArrayValue] = React.useState([""]);
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
    const onFileChange = (evt) => {
        setFileValue({name: evt.target.files[0].name});
        onChange(name, evt.target.files[0]);
    }
    const onFileMultChange = (evt) => {
        setFileMultValue([...evt.target.files]);
        onChange(name, [...evt.target.files]);
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
                        <Button variant="contained" component="label">
                            Select Files
                            <input onChange={onFileMultChange} type="file" hidden multiple />
                        </Button>
                        { fileMultValue.length > 0 &&
                            fileMultValue?.map((f, i) => (
                                <div key={i} style={{display: "inline-block"}}>
                                    {typeof f === "string" && <MythicFileContext agent_file_id={f}
                                                                                 extraStyles={{bottom: "-10px", position: "relative", marginLeft: "5px", marginRight: "5px"}} />}
                                    {typeof f !== "string" && (f.name)}
                                </div>
                            ))
                        }
                    </>
                )
            case "File":
                return (
                    <>
                        <Button variant="contained" component="label">
                            { fileValue.legacy ? "Select New File" : fileValue.name === "" ? "Select File" : fileValue.name }
                            <input onChange={onFileChange} type="file" hidden />
                        </Button>
                        {fileValue.legacy &&
                            <MythicFileContext agent_file_id={fileValue.name}
                                               extraStyles={{ position: "relative", marginLeft: "5px", marginRight: "5px"}} />
                        }
                    </>

                )
            case "ChooseOne":
                return (
                    <div style={{position: "relative", display: "flex", alignItems: "center", overflow: "hidden"}}>
                        <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
                            <CircularProgress color="inherit" />
                        </Backdrop>
                        <FormControl style={{width: "100%"}}>
                            {ChoiceOptions.length === 0 &&
                                <InputLabel>{"No Options Available"}</InputLabel>
                            }
                            <Select
                              value={value}
                              onChange={onChangeValue}
                            >
                            {
                                ChoiceOptions.map((opt, i) => (
                                    <MenuItem key={"buildparamopt" + i} value={opt}>{opt}</MenuItem>
                                ))
                            }
                            </Select>
                        </FormControl>
                        {dynamic_query_function !== "" && dynamic_query_function !== undefined &&
                            <MythicStyledTooltip title={"ReIssue Dynamic Query Function"} tooltipStyle={{display: "inline-block"}}>
                                <IconButton onClick={reIssueDynamicQueryFunction}>
                                    <RefreshIcon />
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
                        <div style={{width: "100%", display: "flex", alignItems: "center"}}>
                            <FormControl style={{width: "20%"}}>
                                <Select
                                    multiple={false}
                                    disabled={chooseOneCustomValue !== ""}
                                    value={value}
                                    onChange={onChangeValue}
                                    input={<Input />}
                                >
                                    {
                                        ChoiceOptions.map((opt, i) => (
                                            <MenuItem key={name + i} value={opt}>{opt}</MenuItem>
                                        ))
                                    }
                                </Select>
                            </FormControl>
                            OR
                            <MythicTextField name={name} requiredValue={required} placeholder={"Custom Value"} value={chooseOneCustomValue} multiline={true} maxRows={5}
                                             onChange={onChangeTextChooseOneCustom} display="inline-block"
                            />
                            {dynamic_query_function !== "" && dynamic_query_function !== undefined &&
                                <MythicStyledTooltip title={"ReIssue Dynamic Query Function"} tooltipStyle={{display: "inline-block"}}>
                                    <IconButton onClick={reIssueDynamicQueryFunction}>
                                        <RefreshIcon />
                                    </IconButton>
                                </MythicStyledTooltip>
                            }
                        </div>

                    </div>
                )
            case "ChooseMultiple":
                return (
                    <div style={{position: "relative", display: "flex", alignItems: "center", overflow: "hidden"}}>
                        <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
                            <CircularProgress color="inherit" />
                        </Backdrop>
                        <FormControl style={{width: "100%"}}>
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
                                    <MenuItem key={"buildparamopt" + i} value={opt}>{opt}</MenuItem>
                                ))
                            }
                            </Select>
                        </FormControl>
                        {dynamic_query_function !== "" && dynamic_query_function !== undefined &&
                            <MythicStyledTooltip title={"ReIssue Dynamic Query Function"} tooltipStyle={{display: "inline-block"}}>
                                <IconButton onClick={reIssueDynamicQueryFunction}>
                                    <RefreshIcon />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                    </div>
                );
            case "Array":
                return (
                    <TableContainer >
                        <Table size="small" style={{tableLayout: "fixed", maxWidth: "100%", "overflow": "auto"}}>
                            <TableBody>
                                {arrayValue.map( (a, i) => (
                                    <TableRow key={'array' + name + i} style={{}} >
                                        <MythicStyledTableCell style={{width: "2rem"}}>
                                            <IconButton onClick={(e) => {removeArrayValue(i)}} color="error">
                                                <DeleteIcon/>
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
                                        <IconButton onClick={addNewArrayValue} size="large"> <AddCircleIcon color="success"  /> </IconButton>
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell></MythicStyledTableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                );
            case "TypedArray":
                return (
                    <TableContainer >
                        <Table size="small" style={{tableLayout: "fixed", maxWidth: "100%", "overflow": "auto"}}>
                            <TableBody>
                                {typedArrayValue.map( (a, i) => (
                                    <TableRow key={'typedarray' + name + i} >
                                        <MythicStyledTableCell style={{width: "2rem", paddingLeft:"0"}}>
                                            <IconButton onClick={(e) => {removeTypedArrayValue(i)}} size="large"><DeleteIcon color="error" /> </IconButton>
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
                                        <IconButton onClick={addNewTypedArrayValue} size="large"> <AddCircleIcon color="success"  /> </IconButton>
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
                            <div key={"dictval" + i}>
                                <IconButton style={{width: "5%"}} onClick={(e) => {removeDictEntry(i)}} size="large"><DeleteIcon color="error" /> </IconButton>
                                <Input style={{width:"20%"}} startAdornment={<Button disabled>Key</Button>} size="small" value={opt.name} onChange={(e) => onChangeDictKey(e, i)}></Input>
                                <Input style={{width:"75%"}} startAdornment={<Button disabled>value</Button>} size="small" value={opt.value} onChange={(e) => onChangeDictVal(e, i)}></Input>
                            </div>
                        )
                        )}
                        {dictSelectOptions.length > 0 ? (
                            <div>
                                <IconButton onClick={addDictValEntry} size="large"> <AddCircleIcon color="success"  /> </IconButton>
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
                                        <IconButton onClick={(e) => {removeMapArrayMap(i)}} color="error">
                                            <DeleteIcon/>
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
                                                            <IconButton onClick={(e) => {removeMapArray(i, j)}} color="error">
                                                                <DeleteIcon/>
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
                                                        <IconButton onClick={() => addMapArray(i)} size="large"> <AddCircleIcon color="success"  /> </IconButton>
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
                                        <IconButton onClick={addMapArrayMap} size="large"> <AddCircleIcon color="success"  /> </IconButton>
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
    
    return (
            <TableRow key={"buildparam" + id} hover>
                <MythicStyledTableCell>
                    <MythicStyledTooltip title={name.length > 0 ? name : "No Description"}>
                        <Typography style={{fontWeight: "600"}} >
                            {name}
                        </Typography>
                        <Typography style={{fontSize: theme.typography.pxToRem(15), marginLeft: "10px"}}>
                            {description}
                        </Typography>

                        {modifiedValue() ? (
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

