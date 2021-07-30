import React, { useEffect, useRef } from 'react';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Switch from '@material-ui/core/Switch';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';


export function OperationTableRowUpdateOperatorsDialogRow(props){
    const [checked, setChecked] = React.useState(false);
    const [viewMode, setViewMode] = React.useState("operator");
    const options = ["operator", "spectator", "lead", "developer"];
    const inputRef = useRef(null); 
    useEffect( () => {
      setChecked(props.operator.checked);
      setViewMode(props.operator.view_mode);
    }, [props.operator]);
    const onBoolChange = (event) => {
      setChecked(event.target.checked);
      props.updateOperator({...props.operator, checked: event.target.checked, view_mode: viewMode});
    }
    const handleChange = (event) => {
      setViewMode(event.target.value);
      props.updateOperator({...props.operator, checked, view_mode: event.target.value});
    };
    return (
        <React.Fragment>
            <TableRow>
                <TableCell><Switch checked={checked} onChange={onBoolChange} color="secondary" /></TableCell>
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
            </TableRow>
        </React.Fragment>
        )
}

