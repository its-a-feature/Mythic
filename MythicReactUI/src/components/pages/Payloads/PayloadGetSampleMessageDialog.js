import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {MythicErrorState, MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";

const generateSampleMessageMutation = gql`
query generateSampleMessageQuery($uuid: String!) {
  c2SampleMessage(uuid: $uuid) {
      status
      error
      output
  }
}
`;

export function PayloadGetSampleMessageDialog(props) {
    const [message, setMessage] = useState("");
    const { loading, error } = useQuery(generateSampleMessageMutation, {
        variables: {uuid: props.uuid},
        onCompleted: data => {
          if(data.c2SampleMessage.status === "success"){
            setMessage(data.c2SampleMessage.output);
          }else{
            snackActions.warning(data.c2SampleMessage.error);
            setMessage("Error!\n" + data.c2SampleMessage.error);
          }
            
        },
        fetchPolicy: "network-only"
    });
    if (loading) {
     return <MythicLoadingState compact title="Generating sample message" description="Fetching a C2 sample message for this payload." minHeight={160} />;
    }
    if (error) {
     console.error(error);
     return <MythicErrorState compact title="Unable to generate sample message" description={error.message} minHeight={160} />;
    }
    
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Payload Network Sample Message</DialogTitle>
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
