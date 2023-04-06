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
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import DesktopDatePicker from '@mui/lab/DesktopDatePicker';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import 'date-fns';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import Paper from '@mui/material/Paper';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {Typography} from '@mui/material';

export function CreatePayloadParameter({onChange, parameter_type, default_value, name, required, verifier_regex, id, description, initialValue, choices, trackedValue, returnAllDictValues}){
    const [value, setValue] = React.useState("");
    const [valueNum, setValueNum] = React.useState(0);
    const [multiValue, setMultiValue] = React.useState([]);
    const [dictValue, setDictValue] = React.useState([]);
    const [dictOptions, setDictOptions] = React.useState([]);
    const [dictSelectOptions, setDictSelectOptions] = React.useState([]);
    const [dictSelectOptionsChoice, setDictSelectOptionsChoice] = React.useState("");
    const [chooseOptions, setChooseOptions] = React.useState([]);
    const [dateValue, setDateValue] = React.useState(new Date());
    const [arrayValue, setArrayValue] = React.useState([""]);
    const submitDictChange = (list) => {
        onChange(name, list, false);
    };
    useEffect( () => {
        if(parameter_type === "ChooseOne"){
            setValue(trackedValue);
            setChooseOptions(choices); 
        }else if(parameter_type === "Number"){
            setValueNum(trackedValue);
        }else if(parameter_type === "String"){
            setValue(trackedValue);
        }else if(parameter_type === "ChooseMultiple"){
            setMultiValue(trackedValue);
            setChooseOptions(choices); 
            
        }else if(parameter_type === "Date"){
            setDateValue(trackedValue);
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
        }else if(parameter_type === "Array"){
            setArrayValue(trackedValue);
        }else{
            console.log("hit an unknown parameter type")
        }
    }, [default_value, parameter_type, name]);
    
    const onChangeValue = (evt) => {
        setValue(evt.target.value);
        onChange(name, evt.target.value, false);
    }
    const onChangeMultValue = (evt) => {
        const { options } = evt.target;
        const tmpValue = [];
        for (let i = 0, l = options.length; i < l; i += 1) {
          if (options[i].selected) {
            tmpValue.push(options[i].value);
          }
        }
        setMultiValue(tmpValue);
        onChange(name, tmpValue, false);
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
        let choice = {...dictSelectOptionsChoice, value: "", default_show: true, value: dictSelectOptionsChoice.default_value};
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
            if(count == 0){
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
        setDateValue(date)
        onChange(name, date.toISOString().slice(0,10), "");
    }
    const toggleSwitchValue = (evt) => {
        let newVal = !value;
        setValue(newVal);
        onChange(name, newVal, false);
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
        if(value.includes("\n")){
            let new_values = value.split("\n");
            values = [...values, ...new_values.slice(1)];
            values[index] = values[index] + new_values[0];
        }else{
            values[index] = value;
        }
        
        setArrayValue(values);
        onChange(name, values, false);
    }
    const getParameterObject = () => {
        switch(parameter_type){
            case "Date":
                return (
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <Grid container justifyContent="flex-start">
                            <DesktopDatePicker
                            disableToolbar
                            variant="inline"
                            inputFormat="MM/dd/yyyy"
                            margin="normal"
                            value={dateValue}
                            onChange={onChangeDate}
                            renderInput={(params) => <TextField {...params}/>}
                            />
                        </Grid>
                    </LocalizationProvider>
                );
            case "ChooseOne":
                return (
                    <FormControl>
                        <Select
                          native
                          value={value}
                          onChange={onChangeValue}
                        >
                        {
                            chooseOptions.map((opt, i) => (
                                <option key={"buildparamopt" + i} value={opt}>{opt}</option>
                            ))
                        }
                        </Select>
                    </FormControl>
                );
            case "ChooseMultiple":
                return (
                    <FormControl>
                        <Select
                            native
                            value={multiValue}
                            multiple={true}
                            onChange={onChangeMultValue}
                        >
                        {
                            chooseOptions.map((opt, i) => (
                                <option key={"buildparamopt" + i} value={opt}>{opt}</option>
                            ))
                        }
                        </Select>
                    </FormControl>
                );
            case "Array":
                return (
                    <TableContainer component={Paper} className="mythicElement">
                        <Table size="small" style={{tableLayout: "fixed", maxWidth: "100%", "overflow": "auto"}}>
                            <TableBody>
                                {arrayValue.map( (a, i) => (
                                    <TableRow key={'array' + name + i} >
                                        <MythicStyledTableCell style={{width: "3rem"}}>
                                            <IconButton onClick={(e) => {removeArrayValue(i)}} size="large"><DeleteIcon color="error" /> </IconButton>
                                        </MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <MythicTextField required={required} fullWidth={true} placeholder={""} value={a} multiline={true}
                                                onChange={(n,v,e) => onChangeArrayText(v, e, i)} display="inline-block"
                                                validate={testParameterValues} errorText={"Must match: " + verifier_regex}
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
                        ) : (null) 
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
                    <MythicTextField required={required} value={valueNum} type={"number"}
                        onChange={onChangeNumber} display="inline-block" name={name} showLabel={false}
                        validate={testParameterValues} errorText={"Must match: " + verifier_regex}
                    />
                );
            case "Boolean":
                return (
                      <Switch
                        checked={Boolean(value)}
                        onChange={toggleSwitchValue}
                        inputProps={{ 'aria-label': 'primary checkbox' }}
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
            case "Number":
                return (valueNum*1) !== (initialValue *1);
            case "Boolean":
                return Boolean(value) !== Boolean(initialValue);
            default:
                return true;
        }
    }
    
    return (
            <TableRow key={"buildparam" + id}>
                <TableCell>
                    <MythicStyledTooltip title={name.length > 0 ? name : "No Description"}>
                        {description}
                        {modifiedValue() ? (
                            <Typography color="warning.main">Modified</Typography>
                        ) : (null)}
                    </MythicStyledTooltip>
                 </TableCell>
                <MythicStyledTableCell>
                    {getParameterObject()}
                </MythicStyledTableCell>
            </TableRow>
        )
}

