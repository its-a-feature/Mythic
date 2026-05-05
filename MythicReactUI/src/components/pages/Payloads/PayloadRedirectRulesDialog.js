import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {MythicErrorState, MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";

const generateRedirectRulesMutation = gql`
query generateRedirectRulesMutation($uuid: String!) {
  redirectRules(uuid: $uuid) {
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
          if(data.redirectRules.status === "success"){
            setMessage(data.redirectRules.output);
          }else{
            snackActions.warning(data.redirectRules.error);
            setMessage("Error!\n" + data.redirectRules.error);
          }
            
        },
        fetchPolicy: "network-only"
    });
    if (loading) {
     return <MythicLoadingState compact title="Generating redirect rules" description="Fetching C2 redirect rules for this payload." minHeight={160} />;
    }
    if (error) {
     console.error(error);
     return <MythicErrorState compact title="Unable to generate redirect rules" description={error.message} minHeight={160} />;
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
