import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import { snackActions } from '../../utilities/Snackbar';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import "ace-builds/src-noconflict/ext-searchbox";
import {useTheme} from '@mui/material/styles';

const generateRedirectRulesMutation = gql`
query generateRedirectRulesMutation($uuid: String!) {
  redirect_rules(uuid: $uuid) {
      status
      error
      output
  }
}
`;

export function PayloadRedirectRulesDialog(props) {
    const [message, setMessage] = useState("");
    const theme = useTheme();
    const { loading, error } = useQuery(generateRedirectRulesMutation, {
        variables: {uuid: props.uuid},
        onCompleted: data => {
          if(data.redirect_rules.status === "success"){
            setMessage(data.redirect_rules.output);
          }else{
            snackActions.warning(data.redirect_rules.error);
            setMessage("Error!\n" + data.redirect_rules.error);
          }
            
        },
        fetchPolicy: "network-only"
    });
    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}} />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Payload Redirect Rules Check</DialogTitle>
        <DialogContent dividers={true}>
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
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

