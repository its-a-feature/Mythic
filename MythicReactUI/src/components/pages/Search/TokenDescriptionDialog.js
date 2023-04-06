import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';

const updateCommentMutation = gql`
mutation updateComment ($token_id: Int!, $description: String) {
  update_token_by_pk(pk_columns: {id: $token_id}, _set: {description: $description}) {
    description
    id
  }
}
`;
const updateTokenFieldStringTemplate = ({target_object}) => {
  return gql`
  mutation updateTokenStringField ($token_id: Int!, $${target_object}: String!) {
    update_token_by_pk(pk_columns: {id: $token_id}, _set:{ ${target_object}: $${target_object} }) {
      id
      ${target_object}
  }
  `;
}
const getTokenFieldStringTemplate = ({target_object}) => {
  return gql`
  query getTokenStringField ($token_id: Int!, $${target_object}: String!) {
    token_by_pk(pk_columns: {id: $token_id}) {
      id
      ${target_object}
  }
  `;
}
const getCommentQuery = gql`
query getCommentQuery ($token_id: Int!) {
  token_by_pk(id: $token_id) {
    description
    id
  }
}
`;

export function TokenDescriptionDialog(props) {
    const [comment, setComment] = useState("");
    useQuery(getCommentQuery, {
        variables: {token_id: props.token_id},
        onCompleted: data => {
            setComment(data.token_by_pk.description)
        },
        fetchPolicy: "network-only"
    });
    const [updateComment] = useMutation(updateCommentMutation, {
        onCompleted: (data) => {
          props.onUpdateDescription({id: props.token_id, description: data.update_token_by_pk.description});
          props.onClose();
        },
        onError: (data) => {
          console.error(data);
          props.onClose();
        }
        
    });
    const onCommitSubmit = () => {
        updateComment({variables: {token_id: props.token_id, description: comment}});
        
    }
    const onChange = (name, value, error) => {
        setComment(value);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Edit Token Description</DialogTitle>
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

