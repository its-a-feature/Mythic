import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {MythicErrorState, MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";

const checkPayloadConfigurationQuery = gql`
query checkPayloadConfigurationQuery($uuid: String!) {
  configCheck(uuid: $uuid) {
      status
      error
      output
  }
}
`;

export function PayloadConfigCheckDialog(props) {
    const [message, setMessage] = useState("");
    const { loading, error } = useQuery(checkPayloadConfigurationQuery, {
        variables: {uuid: props.uuid},
        onCompleted: data => {
          if(data.configCheck.status === "success"){
            setMessage(data.configCheck.output);
          }else{
            snackActions.warning(data.configCheck.error);
            setMessage("Error!\n" + data.configCheck.error);
          }
            
        },
        fetchPolicy: "network-only"
    });
    if (loading) {
     return <MythicLoadingState compact title="Checking configuration" description="Running payload configuration validation." minHeight={160} />;
    }
    if (error) {
     console.error(error);
     return <MythicErrorState compact title="Unable to check configuration" description={error.message} minHeight={160} />;
    }
    
  return (
      <React.Fragment>
          <DialogTitle id="form-dialog-title">Payload Config Check</DialogTitle>
          <div style={{height: "calc(80vh)", overflowY: "auto"}}>
              <ResponseDisplayPlaintext
                  initial_mode={"html"}
                  render_colors={false}
                  wrap_text={true}
                  plaintext={message}
                  expand={true}
              />
          </div>
          <DialogActions>
              <Button variant="contained" onClick={props.onClose} color="primary">
                  Close
              </Button>
          </DialogActions>
      </React.Fragment>
  );
}
