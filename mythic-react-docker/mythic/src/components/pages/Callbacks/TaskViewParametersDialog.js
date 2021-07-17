import React, {useState} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';

const getParametersQuery = gql`
query getParametersQuery ($task_id: Int!) {
  task_by_pk(id: $task_id) {
    display_params
    original_params
    params
    id
  }
}
`;

export function TaskViewParametersDialog(props) {
    const [comment, setComment] = useState("");
    const { loading, error } = useQuery(getParametersQuery, {
        variables: {task_id: props.task_id},
        onCompleted: data => {
            setComment("Original Parameters:\n" + data.task_by_pk.original_params + "\n\nAgent Parameters:\n" + data.task_by_pk.params + "\n\nDisplay Parameters:\n" + data.task_by_pk.display_params);
        },
        fetchPolicy: "network-only"
    });
    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">View Task Parameters</DialogTitle>
        <DialogContent dividers={true}>
            <MythicTextField multiline={true} value={comment} onChange={() => {}}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

