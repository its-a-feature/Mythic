import React, { useEffect, useRef } from 'react';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Switch from '@mui/material/Switch';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';
import MenuItem from '@mui/material/MenuItem';
import SmartToyTwoToneIcon from '@mui/icons-material/SmartToyTwoTone';
import GroupAddTwoToneIcon from '@mui/icons-material/GroupAddTwoTone';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import IconButton from '@mui/material/IconButton';
import {useMutation, gql} from '@apollo/client';
import {meState} from "../../../cache";
import {snackActions} from "../../utilities/Snackbar";

const updateCurrentOperationMutation = gql`
mutation updateCurrentOpertionMutation($operator_id: Int!, $operation_id: Int!) {
  updateCurrentOperation(user_id: $operator_id, operation_id: $operation_id) {
    status
    error
    operation_id
  }
}
`;

export function OperationTableRowUpdateOperatorsDialogRow(props){
    const [checked, setChecked] = React.useState(false);
    const [viewMode, setViewMode] = React.useState("operator");
    const [blockListName, setBlockListName] = React.useState({});
    const options = ["operator", "spectator", "lead"];
    const inputRef = useRef(null);
    const [updateCurrentOperation] = useMutation(updateCurrentOperationMutation, {
        onCompleted: (data) => {
            if(data.updateCurrentOperation.status === "success"){
                snackActions.success("Successfully updated current operation");
            }else if(data.updateCurrentOperation.error.includes("not a member")){
                // add ourselves as a member and try again
                snackActions.warning("Must make user a member of the operation first");
            } else {
                snackActions.error(data.updateCurrentOperation.error);
            }
        },
        onError: (data) => {
            snackActions.error("Failed to update current operation");
            console.error(data);
        }
    })
    const makeCurrentOperation = () => {
        updateCurrentOperation({variables: {operator_id: props.operator.id, operation_id: props.operation_id}})
    }
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
            <TableRow hover>
                <TableCell><Switch checked={checked} onChange={onBoolChange} color="success" /></TableCell>
                <TableCell>
                    <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                        {props.operator.account_type === "bot" &&
                            <SmartToyTwoToneIcon style={{marginRight: "10px"}}/>
                        }
                        {props.operator.username}
                    </div>
                </TableCell>
                <TableCell>
                    {checked ? (
                        <FormControl style={{width: "100%"}}>
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
                  ) : null}
                </TableCell>
                <TableCell>
                  {checked ? (
                    <FormControl style={{width: "100%"}}>
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
                  ) : null}
                </TableCell>
                <TableCell>
                    {checked && props.operation_id !== props.operator?.operation?.id && props.operator.id !== meState().user.id ? (
                        <MythicStyledTooltip title={"Update current operation to this operation"}>
                            <IconButton onClick={makeCurrentOperation}>
                                <GroupAddTwoToneIcon />
                            </IconButton>
                        </MythicStyledTooltip>
                    ) : null}
                </TableCell>
            </TableRow>
        </React.Fragment>
        )
}

