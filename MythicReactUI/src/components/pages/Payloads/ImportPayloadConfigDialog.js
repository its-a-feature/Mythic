import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';

const create_payload = gql`
 mutation createPayloadMutation($payload: String!) {
  createPayload(payloadDefinition: $payload) {
    error
    status
    uuid
  }
}
 `;

export function ImportPayloadConfigDialog(props) {
  const [fileValue, setFileValue] = React.useState({name: ""});
  const [createPayloadMutation] = useMutation(create_payload, {
        update: (cache, {data}) => {
            if(data.createPayload.status === "success"){
                snackActions.info("Submitted payload to build pipeline");
            }else{
                snackActions.error(data.createPayload.error);
            }
        }
    });
    const onCommitSubmit = () => {
      createPayloadMutation({variables: {payload: fileValue.contents}}).catch( (e) => {console.log(e)} );
        props.onClose();
    }
    const onFileChange = (evt) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const contents = e.target.result;
          setFileValue({name: evt.target.files[0].name, contents: contents});
      }
      reader.readAsBinaryString(evt.target.files[0]);
  }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Import Payload Config to Generate New Payload</DialogTitle>
        <DialogContent dividers={true}>
          <Button variant="contained" component="label"> 
              { fileValue.name === "" ? "Select File" : fileValue.name } 
              <input onChange={onFileChange} type="file" hidden /> 
          </Button>
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

