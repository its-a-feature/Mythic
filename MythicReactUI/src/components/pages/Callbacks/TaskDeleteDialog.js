import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';

const deleteTaskByPkMutation = gql`
mutation createTask($callback_display_id: Int!, $task_id: String!, $parent_task_id: Int) {
  createTask(
            callback_id: $callback_display_id,
            command: "clear",
            params: $task_id,
            token_id: null,
            is_interactive_task: false,
            interactive_task_type: null,
            parent_task_id: $parent_task_id,
            tasking_location: "scripting",
            files: null){
    id
  }
}
`;


const getStatusQuery= gql`
query getStatusQuery ($task_id: Int!) {
  task_by_pk(id: $task_id) {
    status
    commentOperator {
      username
    }
    id
    display_id
    agent_task_id
    callback_id
    parent_task_id
    callback {
      display_id
    }
  }
}
`;

export function TaskDeleteDialog(props) {
    const [status, setStatus] = useState("");
    const [callback_display_id, setCallbackID] = useState("");
    const [task_id, setTaskID] = useState("");
    const [parent_task_id, setParentTaskID] = useState("");
    const { loading, error } = useQuery(getStatusQuery, {
        variables: {task_id: props.task_id},
        onCompleted: data => {
          setCallbackID(data.task_by_pk.callback.display_id);
          setTaskID(data.task_by_pk.display_id.toString());
          setParentTaskID(data.task_by_pk.parent_task_id);

          setStatus("Warning: This will 'clear' the task with display id of " + data.task_by_pk.display_id);
        },
        fetchPolicy: "network-only"
    });

    const [deleteTask] = useMutation(deleteTaskByPkMutation,{
      variables: {callback_display_id: callback_display_id , task_id: task_id, parent_task_id: parent_task_id}
    
    });

    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const onCommitSubmit = () => {
        //alert(callback_display_id + ":" + props.task_id + ":" + parent_task_id);
        deleteTask({variables: {callback_display_id: callback_display_id , task_id: task_id, parent_task_id: parent_task_id}});
        props.onClose();
    }
    const onChange = (name, value, error) => {
        setStatus(value);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Cancel Task</DialogTitle>
        <DialogContent dividers={true}>
            Are you sure?
            <MythicTextField autoFocus onEnter={onCommitSubmit} onChange={onChange} value={status} />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Cancel
          </Button>
          <Button onClick={onCommitSubmit} variant="contained" color="success">
            Confirm
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

