import React from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {DragAndDropFileUpload} from "../Callbacks/TaskParametersDialogRow";
import {
  MythicDialogBody,
  MythicDialogButton,
  MythicDialogFooter,
  MythicDialogSection
} from '../../MythicComponents/MythicDialogLayout';

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
    const onFileChange = (newFile) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const contents = e.target.result;
          setFileValue({name: newFile.name, contents: contents});
      }
      reader.readAsBinaryString(newFile);
  }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Import Payload Config to Generate New Payload</DialogTitle>
        <DialogContent dividers={true}>
          <MythicDialogBody>
            <MythicDialogSection title="Payload Config File" description="Upload an exported payload configuration.">
            <DragAndDropFileUpload value={fileValue} multiple={false} onChange={onFileChange} />
            </MythicDialogSection>
          </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
          <MythicDialogButton intent="primary" onClick={onCommitSubmit}>
            Submit
          </MythicDialogButton>
        </MythicDialogFooter>
  </React.Fragment>
  );
}
