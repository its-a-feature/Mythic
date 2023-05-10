import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';

const updateCommentMutation = gql`
mutation updateComment ($task_id: Int!, $comment: String) {
  update_task_by_pk(pk_columns: {id: $task_id}, _set: {comment: $comment}) {
    comment
    commentOperator {
      username
    }
    id
  }
}
`;
const getCommentQuery = gql`
query getCommentQuery ($task_id: Int!) {
  task_by_pk(id: $task_id) {
    comment
    commentOperator {
      username
    }
    id
  }
}
`;

export function TaskCommentDialog(props) {
    const [comment, setComment] = useState("");
    const { loading, error } = useQuery(getCommentQuery, {
        variables: {task_id: props.task_id},
        onCompleted: data => {
            setComment(data.task_by_pk.comment)
        },
        fetchPolicy: "network-only"
    });
    const [updateComment] = useMutation(updateCommentMutation, {
        update: (cache, {data}) => {
            //console.log(data);
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
        updateComment({variables: {task_id: props.task_id, comment: comment}});
        props.onClose();
    }
    const onChange = (name, value, error) => {
        setComment(value);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Edit Task Comment</DialogTitle>
        <DialogContent dividers={true}>
            <MythicTextField autoFocus onEnter={onCommitSubmit} onChange={onChange} value={comment} />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button onClick={onCommitSubmit} variant="contained" color="success">
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

