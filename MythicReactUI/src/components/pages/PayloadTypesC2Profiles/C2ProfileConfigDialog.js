import React from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {textExtensionTypesToSyntax} from "../Callbacks/ResponseDisplayMedia";
import {MythicDialogButton, MythicDialogFooter} from "../../MythicComponents/MythicDialogLayout";
import {MythicErrorState, MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";

const getProfileConfigQuery = gql`
query getProfileConfigOutput($container_name: String!, $filename: String!) {
  containerDownloadFile(container_name: $container_name, filename: $filename) {
    status
    error
    filename
    data
  }
}
`;
const getInitialMode = (filename) => {
    let extension = filename.split(".");
    if(extension.length > 0){
        extension = extension[extension.length - 1];
        if(textExtensionTypesToSyntax[extension]){
            return textExtensionTypesToSyntax[extension];
        }
    } else {
        if(textExtensionTypesToSyntax[filename]){
            return textExtensionTypesToSyntax[filename];
        }
    }
    return "html";
}
export function C2ProfileConfigDialog(props) {
    const config = React.useRef("");
    const { loading, error } = useQuery(getProfileConfigQuery, {
        variables: {container_name: props.container_name, filename: props.filename},
        onCompleted: data => {
            if(data.containerDownloadFile.status === "error"){
                config.current = "Errored trying to read file from container\n" + data.containerDownloadFile.error;
            }else{
                //console.log(data);
                config.current = atob(data.containerDownloadFile.data);
            }
        },
        fetchPolicy: "network-only"
    });
    const initialMode = React.useRef(getInitialMode(props.filename));

    if (loading) {
     return (
       <>
         <DialogTitle id="form-dialog-title">{props.container_name}'s {props.filename}</DialogTitle>
         <DialogContent dividers={true}>
           <MythicLoadingState title="Loading file" description="Fetching file contents from the service container." minHeight={180} />
         </DialogContent>
       </>
     );
    }
    if (error) {
     console.error(error);
     return (
       <>
         <DialogTitle id="form-dialog-title">{props.container_name}'s {props.filename}</DialogTitle>
         <DialogContent dividers={true}>
           <MythicErrorState title="Unable to load file" description={error.message} minHeight={180} />
         </DialogContent>
       </>
     );
    }
    const onConfigSubmit = () => {
        props.onConfigSubmit(btoa(config.current));
        props.onClose();
    }
    const setConfig = (newData) => {
        config.current = newData;
    }

  return (
    <>
        <DialogTitle id="form-dialog-title">{props.container_name}'s {props.filename}</DialogTitle>
        <DialogContent dividers={true} style={{padding: 0}}>
        <div style={{height: "calc(80vh)"}}>
            <ResponseDisplayPlaintext
                onChangeContent={setConfig}
                initial_mode={initialMode.current}
                plaintext={config.current}
                expand={true} />
        </div>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
          <MythicDialogButton intent="warning" onClick={onConfigSubmit}>
            Submit
          </MythicDialogButton>
        </MythicDialogFooter>
  </>
  );
}
