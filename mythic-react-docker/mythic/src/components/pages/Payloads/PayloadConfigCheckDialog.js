import React, {useState} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';
import { snackActions } from '../../utilities/Snackbar';

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

