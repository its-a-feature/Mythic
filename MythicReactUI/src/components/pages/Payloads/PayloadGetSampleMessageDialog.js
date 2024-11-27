import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import { snackActions } from '../../utilities/Snackbar';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";

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
     return <LinearProgress style={{marginTop: "10px"}} />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
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

