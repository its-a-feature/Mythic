import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useMutation, gql, useLazyQuery} from '@apollo/client';
import {snackActions} from "../../utilities/Snackbar";
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

const updateEventGroupMutation = gql(`
mutation updateEventGroupMutation($eventgroup_id: Int!, $updated_config: String) {
  eventingTriggerUpdate(eventgroup_id: $eventgroup_id, updated_config: $updated_config) {
    status
    error
  }
}
`)
const getExportWorkflow = gql(`
query exportWorkflow($eventgroup_id: Int!, $include_steps: Boolean!, $output_format: String!) {
  eventingExportWorkflow(eventgroup_id: $eventgroup_id, include_steps: $include_steps, output_format: $output_format) {
    status
    error
    workflow
  }
}
`)
const outputFormatOptions = ["yaml", "json", "toml"];
export function EventGroupTableEditDialog({onClose, selectedEventGroup}) {
    const workflowRef = React.useRef("");
    const [outputFormat, setOutputFormat] = React.useState("yaml");
    const [fetchedData, setFetchedData] = React.useState(false);
    const [UpdateEventGroupMutation] = useMutation(updateEventGroupMutation, {
        onCompleted: (data) => {
            if(data.eventingTriggerUpdate.status === "success"){
                snackActions.success("Successfully updated");
                onClose()
            } else {
                snackActions.error(data.eventingTriggerUpdate.error);
            }

        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to update");
        }
    });
    const [getExportedWorkflow] = useLazyQuery(getExportWorkflow, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.eventingExportWorkflow.status === "success"){
                workflowRef.current = data.eventingExportWorkflow.workflow;
                setFetchedData(!fetchedData);
            } else {
                snackActions.error(data.eventingExportWorkflow.error);
            }

        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to update");
        }
    });
    React.useEffect( () => {
        getExportedWorkflow({variables: {
            eventgroup_id: selectedEventGroup.id,
            include_steps: false,
            output_format: outputFormat}})
    }, [outputFormat, selectedEventGroup.id]);
    const onUpdateClick = () => {
        UpdateEventGroupMutation({variables: {eventgroup_id: selectedEventGroup.id, updated_config: workflowRef.current}})
    }
    const updateWorkflow = (newData) => {
        workflowRef.current = newData;
    }
    const onUpdateFormat = (event) => {
        setOutputFormat(event.target.value)
    }
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">
                Update metadata for the workflow
                <FormControl sx={{ display: "inline-block", marginLeft: "10px", float: "right", width: "7rem" }} size="small">
                    <TextField
                        label={"Output Format"}
                        select
                        size={"small"}
                        style={{ width: "100%"}}
                        value={outputFormat}
                        onChange={onUpdateFormat}
                    >
                        {outputFormatOptions.map( opt => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ) )}
                    </TextField>
                </FormControl>
            </DialogTitle>
            <DialogContent dividers={true} style={{height: "calc(70vh)", margin: 0, padding: 0}}>
                <ResponseDisplayPlaintext plaintext={workflowRef.current} onChangeContent={updateWorkflow} initial_mode={outputFormat} expand={true} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
                <Button onClick={onUpdateClick} variant="contained" color="success">
                    Update
                </Button>
            </DialogActions>
        </React.Fragment>
    );
}

