import React, {useState} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useReactiveVar, useMutation} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';
import { meState } from '../../../cache';

const updateDescriptionMutation = gql`
mutation updateDescription ($payload_id: Int!, $description: String) {
  update_payload_by_pk(pk_columns: {id: $payload_id}, _set: {tag: $description}) {
    tag
    id
  }
}
`;
const getDescriptionQuery = gql`
query getDescriptionQuery ($payload_id: Int!) {
  payload_by_pk(id: $payload_id) {
    tag
    id
  }
}
`;

export function PayloadDescriptionDialog(props) {
    const [description, setDescription] = useState("");
    const me = useReactiveVar(meState);
    const { loading, error } = useQuery(getDescriptionQuery, {
        variables: {payload_id: props.payload_id},
        onCompleted: data => {
            setDescription(data.payload_by_pk.tag)
        },
        fetchPolicy: "network-only"
    });
    const [updateDescription] = useMutation(updateDescriptionMutation, {
        update: (cache, {data}) => {
            //console.log(data);
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
            <MythicTextField multiline={true} onChange={onChange} value={description} />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} color="primary">
            Close
          </Button>
          <Button onClick={onCommitSubmit} color="secondary">
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

