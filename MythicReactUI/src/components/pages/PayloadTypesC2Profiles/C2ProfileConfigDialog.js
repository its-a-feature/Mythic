import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {textExtensionTypesToSyntax} from "../Callbacks/ResponseDisplayMedia";

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
    const [fetchedData, setFetchedData] = React.useState(false);
    const { loading, error } = useQuery(getProfileConfigQuery, {
        variables: {container_name: props.container_name, filename: props.filename},
        onCompleted: data => {
            if(data.containerDownloadFile.status === "error"){
                config.current = "Errored trying to read file from container\n" + data.containerDownloadFile.error;
            }else{
                //console.log(data);
                config.current = atob(data.containerDownloadFile.data);
            }
            setFetchedData(true);
        },
        fetchPolicy: "network-only"
    });
    const initialMode = React.useRef(getInitialMode(props.filename));

    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error! {error.message}</div>;
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
        <div style={{height: "calc(80vh)"}}>
            <ResponseDisplayPlaintext
                onChangeContent={setConfig}
                initial_mode={initialMode.current}
                plaintext={config.current}
                expand={true} />
        </div>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
          <Button variant="contained" onClick={onConfigSubmit} color="warning">
            Submit
          </Button>
        </DialogActions>
  </>
  );
}

