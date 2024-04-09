import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';

const updateStatusMutation = gql`
mutation updateStatus($task_id: Int!, $status: String) {
  update_task(where: {id: {_eq: $task_id}}, _set: {status: $status}) {
    returning {
      status
      commentOperator {
        username
      }
      id
    }
  }
}
`;

const updateStatusMutation_by_pk = gql`
mutation updateStatus ($task_id: Int!, $status: String) {
    update_task_by_pk(pk_columns: {id: $task_id}, _set: {status: $status}) {
      status
      commentOperator {
        username
      }
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
            setStatus("error:cancelled");
        },
        fetchPolicy: "network-only"
    });
    
    const [updateStatus] = useMutation(updateStatusMutation, {
        update: (cache, {data}) => {
            console.log(data);
        }
    });
    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const onCommitSubmit = () => {
        updateStatus({variables: {task_id: props.task_id, status: status}});
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

