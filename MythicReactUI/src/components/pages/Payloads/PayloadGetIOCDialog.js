import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import { snackActions } from '../../utilities/Snackbar';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";

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
     return <LinearProgress style={{marginTop: "10px"}} />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
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

