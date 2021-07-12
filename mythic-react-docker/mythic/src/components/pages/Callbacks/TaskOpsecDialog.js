import React, {useState} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';
import { useSnackbar } from 'notistack';

const updateOpsecRequestMutation = gql`
mutation requestOpsecBypass ($task_id: Int!) {
    requestOpsecBypass(task_id: $task_id){
        status
        error
    }
}
`;
const getOpsecQuery = gql`
query getOPSECQuery ($task_id: Int!) {
  task_by_pk(id: $task_id) {
    opsec_pre_blocked
    opsec_pre_message
    opsec_pre_bypassed
    opsec_pre_bypass_user{
        username
        id
    }
    opsec_post_blocked
    opsec_pre_bypass_role
    opsec_post_message
    opsec_post_bypassed
    opsec_post_bypass_role
    opsec_post_bypass_user{
        username
        id
    }
    id
  }
}
`;

export function TaskOpsecDialog(props) {
    const [opsecMessage, setOpsecMessage] = useState("");
    const [opsecData, setOpsecData] = useState({});
    const { enqueueSnackbar } = useSnackbar();
    const { loading, error } = useQuery(getOpsecQuery, {
        variables: {task_id: props.task_id},
        onCompleted: data => {
            let message = "OPSEC PreCheck Message";
            console.log(data);
            if(data.task_by_pk.opsec_pre_bypass_user !== null){
                message += " (bypassed by " + data.task_by_pk.opsec_pre_bypass_user.username + ")";
            }
            message += ":\n\n" + data.task_by_pk.opsec_pre_message + "\n";
            if(data.task_by_pk.opsec_post_blocked){
                message += "\nOPSEC PostCheck Message";
                if(data.task_by_pk.opsec_post_bypass_user !== null){
                    message += " (bypassed by " + data.task_by_pk.opsec_post_bypass_user.username + ")";
                }
                message += ":\n\n" + data.task_by_pk.opsec_post_message + "\n";
                
            }
            setOpsecData(data.task_by_pk);
            setOpsecMessage(message);
        },
        fetchPolicy: "network-only"
    });
    const [updateOpsecRequest] = useMutation(updateOpsecRequestMutation, {
        update: (cache, {data}) => {
            if(data.requestOpsecBypass.status === "success"){
                enqueueSnackbar("Bypass processed successfully", {variant: "success"});
            }else{
                enqueueSnackbar(data.requestOpsecBypass.error, {variant: "warning"});
            }
        }
    });
    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const onRequestSubmit = () => {
       console.log(props.task_id);
        updateOpsecRequest({variables: {task_id: props.task_id}});
        props.onClose();
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Request OPSEC Bypass</DialogTitle>
        <DialogContent dividers={true}>
            <MythicTextField multiline={true} onChange={()=>{}} value={opsecMessage} />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          {(opsecData.opsec_pre_blocked === true && !opsecData.opsec_pre_bypassed) || (opsecData.opsec_post_blocked === true && !opsecData.opsec_post_bypassed) ?
          (
            <Button onClick={onRequestSubmit} variant="contained" color="secondary">Submit Bypass Request</Button>
          ) : (null) }
          
        </DialogActions>
  </React.Fragment>
  );
}

