import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import { snackActions } from '../../utilities/Snackbar';
import {b64DecodeUnicode} from '../Callbacks/ResponseDisplay';

const updateDescriptionMutation = gql`
mutation updateDescription ($file_id: Int!, $filename: bytea!) {
  update_filemeta_by_pk(pk_columns: {id: $file_id}, _set: {filename: $filename}) {
    filename_text
    id
  }
}
`;
const getFilenameQuery = gql`
query getFilenameQuery ($payload_id: Int!) {
  payload_by_pk(id: $payload_id) {
    filemetum {
      filename_text
      id
    }
    id
  }
}
`;

export function PayloadFilenameDialog(props) {
    const [description, setDescription] = useState("");
    const [fileId, setFileId] = useState();
    const { loading, error } = useQuery(getFilenameQuery, {
        variables: {payload_id: props.payload_id},
        onCompleted: data => {
            setDescription(b64DecodeUnicode(data.payload_by_pk.filemetum.filename_text));
            setFileId(data.payload_by_pk.filemetum.id);
        },
        fetchPolicy: "network-only"
    });
    const [updateDescription] = useMutation(updateDescriptionMutation, {
        onCompleted: (data) => {
          snackActions.success("Updated filename");
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
        updateDescription({variables: {file_id: fileId, filename: description}});
        props.onClose();
    }
    const onChange = (name, value, error) => {
        setDescription(value);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Edit Payload Filename</DialogTitle>
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

