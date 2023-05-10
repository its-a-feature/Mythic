import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import { snackActions } from '../../utilities/Snackbar';

const updateDescriptionMutation = gql`
mutation updateDescription ($payload_id: Int!, $description: String) {
  update_payload_by_pk(pk_columns: {id: $payload_id}, _set: {description: $description}) {
    description
    id
  }
}
`;
const getDescriptionQuery = gql`
query getDescriptionQuery ($payload_id: Int!) {
  payload_by_pk(id: $payload_id) {
    description
    id
  }
}
`;

export function PayloadDescriptionDialog(props) {
    const [description, setDescription] = useState("");
    const { loading, error } = useQuery(getDescriptionQuery, {
        variables: {payload_id: props.payload_id},
        onCompleted: data => {
            setDescription(data.payload_by_pk.description)
        },
        fetchPolicy: "network-only"
    });
    const [updateDescription] = useMutation(updateDescriptionMutation, {
        onCompleted: (data) => {
            snackActions.success("Updated Description")
        }
    });
    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}} />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const onCommitSubmit = () => {
        updateDescription({variables: {payload_id: props.payload_id, description: description}});
        props.onClose();
    }
    const onChange = (name, value, error) => {
        setDescription(value);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Edit Payload Description</DialogTitle>
        <DialogContent dividers={true}>
            <MythicTextField autoFocus onChange={onChange} value={description} onEnter={onCommitSubmit}/>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
          <Button variant="contained" onClick={onCommitSubmit} color="success">
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

