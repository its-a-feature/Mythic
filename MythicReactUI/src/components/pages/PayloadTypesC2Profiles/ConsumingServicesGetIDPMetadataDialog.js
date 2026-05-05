import React, {useState} from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { snackActions } from '../../utilities/Snackbar';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import "ace-builds/src-noconflict/ext-searchbox";
import {useTheme} from '@mui/material/styles';
import {MythicDialogBody, MythicDialogButton, MythicDialogFooter, MythicDialogSection} from "../../MythicComponents/MythicDialogLayout";


export function ConsumingServicesGetIDPMetadataDialog(props) {
    const [message, setMessage] = useState("");
    const theme = useTheme();
    React.useEffect( () => {
        const requestOptions = {
            method: "GET",
            headers: {'Content-Type': 'application/json', MythicSource: "web"},
        };
        fetch(`/auth_metadata/${props.container}/${props.idp}`, requestOptions).then((response) => {
            if(response.status !== 200){
                snackActions.warning("HTTP " + response.status + " Error: Check Mythic logs");
                return;
            }
            response.json().then(data => {
                if(data["status"] === "success"){
                    setMessage(data["metadata"]);
                } else {
                    setMessage("Failed to get metadata: \n" + data["error"]);
                }
            }).catch(error => {
                snackActions.warning("Error getting JSON from server: " + error.toString());
                console.log("Error trying to get json response", error, response);
            });
        }).catch(error => {
            if(error.toString() === "TypeError: Failed to fetch"){
                snackActions.warning("Please refresh and accept the SSL connection error");
            } else {
                snackActions.warning("Error talking to server: " + error.toString());
            }
            console.log("There was an error!", error);
        });
    }, []);
    
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.container}'s {props.idp} Metadata</DialogTitle>
        <DialogContent dividers={true}>
        <MythicDialogBody compact>
          <MythicDialogSection title="Identity Provider Metadata" description="Container metadata returned by the configured auth service.">
        <AceEditor 
              mode="text"
              theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
              fontSize={14}
              showGutter={true}
              height={"100px"}
              highlightActiveLine={true}
              value={message}
              width={"100%"}
              minLines={2}
              maxLines={50}
              setOptions={{
                showLineNumbers: true,
                tabSize: 4,
                useWorker: false
              }}/>
          </MythicDialogSection>
        </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
        </MythicDialogFooter>
  </React.Fragment>
  );
}
