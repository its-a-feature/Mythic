import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';

const deleteTaskByPkMutation = gql`
mutation deleteTask($task_id: Int!) {
  delete_task_by_pk(id: $task_id) {
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
  }
}
`;

export function TaskDeleteDialog(props) {
    const [status, setStatus] = useState("");
    const { loading, error } = useQuery(getStatusQuery, {
        variables: {task_id: props.task_id},
        onCompleted: data => {
            //setStatus(data.task_by_pk.status)
            setStatus("Warning: This will delete Task!");
        },
        fetchPolicy: "network-only"
    });

    const [deleteTask] = useMutation(deleteTaskByPkMutation,{
      variables: {task_id: props.task_id}
    
    });

    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const onCommitSubmit = () => {
        deleteTask({variables: {task_id: props.task_id}});
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

