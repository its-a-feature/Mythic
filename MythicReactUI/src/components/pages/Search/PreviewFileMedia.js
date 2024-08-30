import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {ResponseDisplayMedia} from "../Callbacks/ResponseDisplayMedia";
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {UploadEventFile} from "../../MythicComponents/MythicFileUpload";
import {snackActions} from "../../utilities/Snackbar";
import { gql, useLazyQuery } from '@apollo/client';

export function PreviewFileMediaDialog({agent_file_id, filename, onClose}) {
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">
            Previewing <b>{filename}</b>
        </DialogTitle>
        <DialogContent style={{height: "calc(95vh)", margin: 0, padding: 0}}>
          <ResponseDisplayMedia media={{agent_file_id, filename}} expand={true} />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}
const testFileWebhookMutation = gql`
    query testEventGroupFile($file_contents: String!){
        eventingTestFile(file_contents: $file_contents){
            status
            error
        }
    }
`;
export function TestEventGroupFileDialog({onClose}){
    const fileText = React.useRef("");
    const onChangeFileText = (newText) => {
        fileText.current = newText;
    }
    const submitAsFile = async (evt) => {
        let blob = new Blob([fileText.current], { type: 'text/plain' });
        let file = new File([blob], "manual_eventing.yaml", {type: "text/plain"});
        let uploadStatus = await UploadEventFile(file, "New Manual Eventing Workflow");
        if(!uploadStatus){
            snackActions.error("Failed to upload file");
        }
        if(uploadStatus.status === "error"){
            snackActions.error(uploadStatus.error);
        }
        onClose();
    }
    const [testFileMutation] = useLazyQuery(testFileWebhookMutation, {
        onCompleted: (data) => {
            if(data.eventingTestFile.status === "success"){
                snackActions.success("No error detected");
            } else {
                snackActions.error(data.eventingTestFile.error);
            }
        },
        onError: (data) => {
            console.log(data);
        }
    })
    const testFile = () => {
        testFileMutation({variables: {file_contents: fileText.current}});
    }
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">
                Create and Verify Eventing Workflow
            </DialogTitle>
            <DialogContent style={{height: "calc(95vh)", margin: 0, padding: 0}}>
                <ResponseDisplayPlaintext plaintext={fileText.current} onChangeContent={onChangeFileText} initial_mode={"yaml"} expand={true} />
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={onClose} color="primary">
                    Close
                </Button>
                <Button variant={"contained"} color={"success"} onClick={testFile}>
                    Test
                </Button>
                <Button variant={"contained"} color={"warning"} onClick={submitAsFile}>
                    Save and Submit
                </Button>
            </DialogActions>
        </React.Fragment>
    )
}
