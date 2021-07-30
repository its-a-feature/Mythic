import React, {useState} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';
import { snackActions } from '../../utilities/Snackbar';

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
        <DialogContent dividers={true}>
            <MythicTextField multiline={true} onChange={()=>{}} value={message} />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

