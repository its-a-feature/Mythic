import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import { snackActions } from '../../utilities/Snackbar';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";

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
        <div style={{height: "calc(80vh)", overflowY: "auto"}}>
            <ResponseDisplayPlaintext
                initial_mode={"apache_conf"}
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

