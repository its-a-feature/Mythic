import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {useTheme} from '@mui/material/styles';

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
    const { loading, error, data } = useQuery(getProfileOutputQuery, {
        variables: {id: props.profile_id},
        onCompleted: data => {
          //console.log("completed", data.getProfileOutput.output)
        },
        fetchPolicy: "network-only"
    });
    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error! {error.message}</div>;
    }
  
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
              height={"100px"}
              highlightActiveLine={true}
              value={data.getProfileOutput.output}
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

