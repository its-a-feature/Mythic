import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {MythicErrorState, MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";

const generateIOCMutation = gql`
query generateIOCQuery($uuid: String!) {
  c2GetIOC(uuid: $uuid) {
      status
      error
      output
  }
}
`;

export function PayloadGetIOCDialog(props) {
    const [message, setMessage] = useState("");
    const { loading, error } = useQuery(generateIOCMutation, {
        variables: {uuid: props.uuid},
        onCompleted: data => {
          if(data.c2GetIOC.status === "success"){
            setMessage(data.c2GetIOC.output);
          }else{
            snackActions.warning(data.c2GetIOC.error);
            setMessage("Error!\n" + data.c2GetIOC.error);
          }
            
        },
        fetchPolicy: "network-only"
    });
    if (loading) {
     return <MythicLoadingState compact title="Generating IOCs" description="Fetching network indicators for this payload." minHeight={160} />;
    }
    if (error) {
     console.error(error);
     return <MythicErrorState compact title="Unable to generate IOCs" description={error.message} minHeight={160} />;
    }
    
  return (
      <React.Fragment>
          <DialogTitle id="form-dialog-title">Payload Network IOCs</DialogTitle>
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
