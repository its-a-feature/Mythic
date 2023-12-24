import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {useTheme} from '@mui/material/styles';
import {snackActions} from "../../utilities/Snackbar";

const getProfileOutputQuery = gql`
query getProfileOutput($id: Int!) {
  getProfileOutput(id: $id) {
    status
    error
    output
  }
}
`;

export function C2ProfileOutputDialog(props) {
    const theme = useTheme();
    const [outputData, setOutputData] = React.useState("Waiting 3s for data...");
    useQuery(getProfileOutputQuery, {
        variables: {id: props.profile_id},
        onCompleted: data => {
            if(data.getProfileOutput.status === "success"){
                if(data.getProfileOutput.output.length === 0){
                    setOutputData("No data from server");
                } else {
                    setOutputData(data.getProfileOutput.output);
                }

            } else {
                snackActions.error(data.getProfileOutput.error);
            }

        },
        onError: data => {
            snackActions.error(data.message);
            console.log(data);
        },
        fetchPolicy: "no-cache"
    });
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.payload_name}'s Current Stdout/Stderr</DialogTitle>
        <DialogContent dividers={true}>
          <DialogContentText>
            This is the current Stdout/Stderr for the profile. This goes away once you close this dialog.
          </DialogContentText>
            <AceEditor 
              mode="json"
              theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
              fontSize={14}
              showGutter={true}
              height={"100%"}
              highlightActiveLine={true}
              value={outputData}
              width={"100%"}
              minLines={2}
              maxLines={50}
              setOptions={{
                showLineNumbers: true,
                tabSize: 4,
                useWorker: false
              }}/>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

