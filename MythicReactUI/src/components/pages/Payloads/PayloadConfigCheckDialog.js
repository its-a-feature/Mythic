import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import { snackActions } from '../../utilities/Snackbar';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";

const checkPayloadConfigurationQuery = gql`
query checkPayloadConfigurationQuery($uuid: String!) {
  config_check(uuid: $uuid) {
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
          if(data.config_check.status === "success"){
            setMessage(data.config_check.output);
          }else{
            snackActions.warning(data.config_check.error);
            setMessage("Error!\n" + data.config_check.error);
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

