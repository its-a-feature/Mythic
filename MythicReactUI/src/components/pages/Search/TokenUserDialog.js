import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';

const updateUserMutation = gql`
mutation updateUser($token_id: Int!, $user: String) {
  update_token_by_pk(pk_columns: {id: $token_id}, _set: {user: $user}) {
    user
    id
  }
}
`;
const getUserQuery = gql`
query getUserQuery ($token_id: Int!) {
  token_by_pk(id: $token_id) {
    user
    id
  }
}
`;

export function TokenUserDialog(props) {
    const [comment, setComment] = useState("");
    useQuery(getUserQuery, {
        variables: {token_id: props.token_id},
        onCompleted: data => {
            setComment(data.token_by_pk.user)
        },
        fetchPolicy: "network-only"
    });
    const [updateComment] = useMutation(updateUserMutation, {
        onCompleted: (data) => {
          //console.log('udpated');
          props.onUpdateUser({id: props.token_id, user: data.update_token_by_pk.user});
          props.onClose();
        },
        onError: (data) => {
          console.error(data);
          props.onClose();
        }
        
    });
    const onCommitSubmit = () => {
        updateComment({variables: {token_id: props.token_id, user: comment}});
        
    }
    const onChange = (name, value, error) => {
        setComment(value);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Edit Token User</DialogTitle>
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

