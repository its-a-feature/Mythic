import React, {useState} from 'react';
import {useQuery, gql, useMutation} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import {MythicModifyStringDialog} from "../../MythicComponents/MythicDialog";

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
            props.onClose();
        }
    });
    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const onCommitSubmit = (newValue) => {
        updateComment({variables: {task_id: props.task_id, comment: newValue}});
    }

  return (
    <React.Fragment>
        <MythicModifyStringDialog title={`Edit Task Comment`}
                                  onClose={props.onClose}
                                  value={comment}
                                  dontCloseOnSubmit={true}
                                  onSubmit={onCommitSubmit} />
  </React.Fragment>
  );
}

