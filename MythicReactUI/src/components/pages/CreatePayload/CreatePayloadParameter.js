import React, {useEffect} from 'react';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
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

export function CreatePayloadParameter({onChange, parameter_type, default_value, name, required, verifier_regex, id, description, initialValue, choices, trackedValue, returnAllDictValues}){
    const theme = useTheme();
    const [value, setValue] = React.useState("");
    const [valueNum, setValueNum] = React.useState(0);
    const [multiValue, setMultiValue] = React.useState([]);
    const [chooseOneCustomValue, setChooseOneCustomValue] = React.useState("");
    const [dictValue, setDictValue] = React.useState([]);
    const [dictOptions, setDictOptions] = React.useState([]);
    const [dictSelectOptions, setDictSelectOptions] = React.useState([]);
    const [dictSelectOptionsChoice, setDictSelectOptionsChoice] = React.useState("");
    const [chooseOptions, setChooseOptions] = React.useState([]);
    const [dateValue, setDateValue] = React.useState(dayjs(new Date()));
    const [arrayValue, setArrayValue] = React.useState([""]);
    const [typedArrayValue, setTypedArrayValue] = React.useState([]);
    const [fileValue, setFileValue] = React.useState({name: ""});
    const [fileMultValue, setFileMultValue] = React.useState([]);
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
        if(parameter_type === "ChooseOne" || parameter_type === "ChooseOneCustom"){
            setChooseOptions(choices);
            if(!choices.includes(trackedValue)){
                setChooseOneCustomValue(trackedValue);
                setValue(default_value);
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
            setChooseOptions(choices);
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
        }else if(parameter_type === "TypedArray"){
            setTypedArrayValue(trackedValue);
        }else{
            console.log("hit an unknown parameter type")
        }
    }, [default_value, parameter_type, name]);
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
            if(i === index){return false};
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
                                               extraStyles={{bottom: "-10px", position: "relative", marginLeft: "5px", marginRight: "5px"}} />
                        }
                    </>

                )
            case "ChooseOne":
                return (
                    <FormControl>
                        <Select
                          value={value}
                          onChange={onChangeValue}
                        >
                        {
                            chooseOptions.map((opt, i) => (
                                <MenuItem key={"buildparamopt" + i} value={opt}>{opt}</MenuItem>
                            ))
                        }
                        </Select>
                    </FormControl>
                );
            case "ChooseOneCustom":
                return (
                    <React.Fragment>
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
                                        chooseOptions.map((opt, i) => (
                                            <MenuItem key={name + i} value={opt}>{opt}</MenuItem>
                                        ))
                                    }
                                </Select>
                            </FormControl>
                            OR
                            <MythicTextField name={name} requiredValue={required} placeholder={"Custom Value"} value={chooseOneCustomValue} multiline={true} maxRows={5}
                                             onChange={onChangeTextChooseOneCustom} display="inline-block"
                            />
                        </div>

                    </React.Fragment>
                )
            case "ChooseMultiple":
                return (
                    <FormControl>
                        <Select
                            value={multiValue}
                            multiple={true}
                            onChange={onChangeMultValue}
                        >
                        {
                            chooseOptions.map((opt, i) => (
                                <MenuItem key={"buildparamopt" + i} value={opt}>{opt}</MenuItem>
                            ))
                        }
                        </Select>
                    </FormControl>
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
                                                onChange={(n,v,e) => onChangeArrayText(v, e, i)} display="inline-block" autoFocus={a === ""}
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
                        checked={Boolean(value)}
                        onChange={toggleSwitchValue}
                        inputProps={{ 'aria-label': 'info checkbox' }}
                      />
                );
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

