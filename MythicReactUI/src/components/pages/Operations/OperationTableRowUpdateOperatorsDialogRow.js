import React, { useEffect, useRef } from 'react';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Switch from '@mui/material/Switch';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';
import MenuItem from '@mui/material/MenuItem';


export function OperationTableRowUpdateOperatorsDialogRow(props){
    const [checked, setChecked] = React.useState(false);
    const [viewMode, setViewMode] = React.useState("operator");
    const [blockListName, setBlockListName] = React.useState({});
    const options = ["operator", "spectator", "lead"];
    const inputRef = useRef(null); 
    useEffect( () => {
      setChecked(props.operator.checked);
      setViewMode(props.operator.view_mode);
      //console.log(props.operator);
      if(!props.operator.disabledcommandsprofile){
        setBlockListName("")
      }else{
        setBlockListName(props.operator.disabledcommandsprofile.name);
      }
      

    }, [props.operator]);
    const onBoolChange = (event) => {
      setChecked(event.target.checked);
      props.updateOperator({...props.operator, checked: event.target.checked, view_mode: viewMode});
    }
    const handleChange = (event) => {
      setViewMode(event.target.value);
      props.updateOperator({...props.operator, checked, view_mode: event.target.value});
    };
    const handleBlockListChange = (event) => {
      setBlockListName(event.target.value);
      const blockListItemIndex = props.commandBlockLists.findIndex( cbl => cbl.name === event.target.value);
      if(blockListItemIndex > -1){
        props.updateOperator({...props.operator, checked, disabledcommandsprofile: props.commandBlockLists[blockListItemIndex]});
      }else{
        props.updateOperator({...props.operator, checked, disabledcommandsprofile: null});
      }
      
    }
    return (
        <React.Fragment>
            <TableRow>
                <TableCell><Switch checked={checked} onChange={onBoolChange} color="success" /></TableCell>
                <TableCell>{props.operator.username}</TableCell>
                <TableCell>
                  {checked ? (
                    <FormControl style={{width: "100%"}}>
                      <InputLabel ref={inputRef}>Options</InputLabel>
                      <Select
                        labelId="demo-dialog-select-label"
                        id="demo-dialog-select"
                        value={viewMode}
                        onChange={handleChange}
                        input={<Input style={{width: "100%"}}/>}
                      >
                        {options.map( (opt) => (
                            <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                        ) )}
                      </Select>
                    </FormControl>
                  ) : (null)}
                </TableCell>
                <TableCell>
                  {checked ? (
                    <FormControl style={{width: "100%"}}>
                      <InputLabel ref={inputRef}>Block List Options</InputLabel>
                      <Select
                        labelId="demo-dialog-select-label"
                        id="demo-dialog-select"
                        value={blockListName}
                        onChange={handleBlockListChange}
                        input={<Input style={{width: "100%"}}/>}
                      >
                        <MenuItem value={-1} key={"None"}>None</MenuItem>
                        {props.commandBlockLists.map( (opt) => (
                            <MenuItem value={opt.name} key={props.operator.username + opt.name}>{opt.name}</MenuItem>
                        ) )}
                      </Select>
                    </FormControl>
                  ) : (null)}
                </TableCell>
            </TableRow>
        </React.Fragment>
        )
}

