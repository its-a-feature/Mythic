import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {useTheme} from '@mui/material/styles';
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
    const [config, setConfig] = useState("");
    const { loading, error } = useQuery(getProfileConfigQuery, {
        variables: {container_name: props.container_name, filename: props.filename},
        onCompleted: data => {
            if(data.containerDownloadFile.status === "error"){
                setConfig("Errored trying to read file from container\n" + data.containerDownloadFile.error);
            }else{
                //console.log(data);
                setConfig(atob(data.containerDownloadFile.data));
            }
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
        props.onConfigSubmit(btoa(config));
        props.onClose();
    }

  return (
    <>
        <DialogTitle id="form-dialog-title">{props.container_name}'s {props.filename}</DialogTitle>
        <div style={{height: "calc(80vh)"}}>
            <ResponseDisplayPlaintext
                onChangeContent={setConfig}
                initial_mode={initialMode.current}
                plaintext={config}
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

