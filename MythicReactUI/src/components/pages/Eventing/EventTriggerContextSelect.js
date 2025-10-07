import React, {useContext} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {useMutation,useQuery, gql} from '@apollo/client';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {IconButton} from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import DeleteIcon from '@mui/icons-material/Delete';
import {TextField} from '@mui/material';
import {snackActions} from "../../utilities/Snackbar";
import {MeContext} from "../../App";
import {EventGroupTable} from "./EventGroupTable";

const triggerManualMutation = gql(`
mutation triggerManualMutation($eventgroup_id: Int!, $env_data: jsonb){
    eventingTriggerManual(eventgroup_id: $eventgroup_id, env_data: $env_data){
        status
        error
    }   
}
`);
const triggerManualBulkMutation = gql(`
mutation triggerManualBulkMutation($eventgroup_id: Int!, $env_data: jsonb, $trigger_context_type: String!, $trigger_context_ids: [Int!]!){
    eventingTriggerManualBulk(eventgroup_id: $eventgroup_id, env_data: $env_data, trigger_context_type: $trigger_context_type, trigger_context_ids: $trigger_context_ids){
        status
        error
    }
}
`);
const getActiveWorkflows = gql(`
query getActiveWorkflows {
    eventgroup(where: {deleted: {_eq: false}, active: {_eq: true}, approved_to_run: {_eq: true}}, order_by: {id: desc}){
        id
        operator {
            username
        }
        filemetum {
            agent_file_id
            id
            filename_text
        }
        filemeta(where: {deleted: {_eq: false}}) {
            agent_file_id
            id
            filename_text
            deleted
        }
        name
        description
        trigger
        trigger_data
        next_scheduled_run
        keywords
        environment
        active
        deleted
        created_at
        run_as
        approved_to_run
        eventgroupapprovals(order_by: {id: asc}) {
          id
          operator {
            id
            username
          }
          approved
          created_at
          updated_at
        }
        eventgroupconsumingcontainers {
            id
            consuming_container_name
            all_functions_available
            function_names
            consuming_container {
                container_running
                subscriptions
            }
        }
    }
}
`);
export function EventTriggerContextSelectDialog({onClose, triggerContext}) {
    const me = useContext(MeContext);
    const [workflowOptions, setWorkflowOptions] = React.useState([]);
    const [selectedEventGroup, setSelectedEventGroup] = React.useState({id: 0});
    useQuery(getActiveWorkflows, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            setWorkflowOptions(data.eventgroup);
            if(data.eventgroup.length > 0){
                setSelectedEventGroup(data.eventgroup[0]);
            }
        },
        onError: (error) => {
            console.log(error);
        }
    })
    const [dictionaryData, setDictionaryData] = React.useState([]);
    const typeOptions = ["text", "number"];
    const [triggerManual] = useMutation(triggerManualMutation, {
        onCompleted: (data) => {
            if(data.eventingTriggerManual.status === "success"){
                snackActions.success("Successfully initiated trigger");
                onClose();
            } else {
                snackActions.error(data.eventingTriggerManual.error);
            }
        },
        onError: (data) => {
            console.log(data);
        }
    })
    const [triggerManualBulk] = useMutation(triggerManualBulkMutation, {
        onCompleted: (data) => {
            if(data.eventingTriggerManualBulk.status === "success"){
                snackActions.success("Successfully initiated trigger");
                onClose();
            } else {
                snackActions.error(data.eventingTriggerManualBulk.error);
            }
        },
        onError: (data) => {
            console.log(data);
        }
    })
    const handleWorkflowChange = (event) => {
        setSelectedEventGroup(event.target.value);
    }
    const addRow = () => {
        setDictionaryData([...dictionaryData, {
            "type": "text",
            "key": "",
            "value": "",
        }])
    }
    const changeRowType = (event, index) => {
        let newType = event.target.value;
        const newDictionaryData = dictionaryData.map( (row, i) => {
            if(index === i){
                return {key: row["key"], type: newType, value: newType === "number" ? 0 : ""};
            }
            return {...row};
        });
        setDictionaryData(newDictionaryData);
    }
    const removeRow = (index) => {
        let newDictionaryData = [...dictionaryData];
        newDictionaryData.splice(index, 1);
        setDictionaryData(newDictionaryData);
    }
    const onChangeRowKey = (value, index) => {
        const newDictionaryData = dictionaryData.map( (e, i) => {
            if(index === i){
                return {...e, key: value};
            }
            return {...e};
        });
        setDictionaryData(newDictionaryData);
    }
    const onChangeRowValue = (value, index) => {
        const newDictionaryData = dictionaryData.map( (e, i) => {
            if(index === i){
                return {...e, value: value};
            }
            return {...e};
        });
        setDictionaryData(newDictionaryData);
    }
    const onSubmit = () => {
        let keywordEnvData = dictionaryData.reduce( (prev, cur) => {
            try{
                if(cur.type === "number"){
                    prev[cur.key] = parseInt(cur.value);
                } else {
                    prev[cur.key] = cur.value;
                }
            }catch(error){
                prev[cur.key] = cur.value;
            }
            return {...prev};
        }, {});
        if(triggerContext.name !== undefined){
            keywordEnvData[triggerContext.name] = triggerContext.value;
            triggerManual({variables: {eventgroup_id: selectedEventGroup.id, env_data:keywordEnvData}});
        } else if(triggerContext.trigger_context_type !== undefined){
            triggerManualBulk({variables: {eventgroup_id: selectedEventGroup.id, env_data: keywordEnvData,
                trigger_context_type: triggerContext.trigger_context_type,
                trigger_context_ids: triggerContext.trigger_context_ids}})
        } else {
            snackActions.error("No trigger context name or type, can't submit");
        }

    }
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">Trigger a workflow</DialogTitle>
            <DialogContent dividers={true} style={{maxHeight: "calc(70vh)"}}>
                <DialogContentText>
                    Trigger a workflow with selected context and optional additional data.
                </DialogContentText>
                <Select
                    style={{marginBottom: "10px", width: "100%"}}
                    value={selectedEventGroup}
                    onChange={handleWorkflowChange}
                >
                    {
                        workflowOptions.map((opt, i) => (
                            <MenuItem key={opt.id} value={opt}>{opt.name + " - " + opt.description}</MenuItem>
                        ))
                    }
                </Select>
                {selectedEventGroup.id !== 0 &&
                    <EventGroupTable me={me} selectedEventGroup={selectedEventGroup} showInstances={false} showGraph={false}/>
                }
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{width: "50%"}}>Key</TableCell>
                            <TableCell>Value</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {dictionaryData.map( (e, index) => (
                            <TableRow key={"dictionarydata" + index}>
                                <MythicStyledTableCell style={{display: "flex"}} >
                                    <IconButton color={"error"} onClick={() => removeRow(index)} >
                                        <DeleteIcon />
                                    </IconButton>
                                    <Select
                                        style={{}}
                                        value={e.type}
                                        onChange={(evt) => changeRowType(evt, index)}
                                    >
                                        {
                                            typeOptions.map((opt, i) => (
                                                <MenuItem key={"type" + opt} value={opt}>{opt}</MenuItem>
                                            ))
                                        }
                                    </Select>
                                    <TextField value={e.key}
                                               style={{width: "100%"}}
                                               onChange={(evt) => onChangeRowKey(evt.target.value, index)} />
                                </MythicStyledTableCell>
                                <MythicStyledTableCell>
                                    <TextField value={e.value}
                                               style={{width: "100%"}}
                                               onChange={(evt) => onChangeRowValue(evt.target.value, index)} />
                                </MythicStyledTableCell>
                            </TableRow>
                        ))}
                        <TableRow>
                            <MythicStyledTableCell>
                                <Button onClick={addRow} color={"success"}>
                                    Add Entry
                                </Button>
                            </MythicStyledTableCell>
                            <MythicStyledTableCell></MythicStyledTableCell>
                        </TableRow>
                    </TableBody>
                </Table>

            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
                <Button onClick={onSubmit} variant="contained" color="success">
                    Submit
                </Button>
            </DialogActions>
        </React.Fragment>
    );
}