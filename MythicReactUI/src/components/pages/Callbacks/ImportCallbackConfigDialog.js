import React from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {DragAndDropFileUpload} from './TaskParametersDialogRow';
import {
  MythicDialogBody,
  MythicDialogButton,
  MythicDialogFooter,
  MythicDialogSection
} from '../../MythicComponents/MythicDialogLayout';

const import_callback = gql`
 mutation importCallbackConfigMutation($config: jsonb!) {
  importCallbackConfig(config: $config) {
    error
    status
  }
}
 `;

export function ImportCallbackConfigDialog(props) {
  const [fileValue, setFileValue] = React.useState({name: ""});
  const [createCallbackMutation] = useMutation(import_callback, {
        update: (cache, {data}) => {
            if(data.importCallbackConfig.status === "success"){
                snackActions.info("Successfully imported new callback");
            }else{
                snackActions.error(data.importCallbackConfig.error);
            }
        }
    });
    const onCommitSubmit = () => {
        try {
            let jsonConfig = JSON.parse(fileValue.contents);
            createCallbackMutation({variables: {config: jsonConfig}}).catch( (e) => {console.log(e)} );
            props.onClose();
        }catch(error){
            snackActions.error("Failed to parse configuration")
        }
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
        <DialogTitle id="form-dialog-title">Import Callback Config From Other Mythic Server</DialogTitle>

        <DialogContent dividers={true}>
            <MythicDialogBody>
              <MythicDialogSection
                  title="Callback Config File"
                  description="Upload an exported callback configuration from another Mythic server."
              >
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
