import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {MythicModifyStringDialog} from "../../MythicComponents/MythicDialog";

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
    opsec_pre_bypass_role
    opsec_pre_bypass_user{
        username
        id
    }
    opsec_post_blocked
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
    const { loading, error } = useQuery(getOpsecQuery, {
        variables: {task_id: props.task_id},
        onCompleted: data => {
            setOpsecData(data.task_by_pk);
            if(props.view === "pre"){
                let message = "OPSEC PreCheck Message";
                if(data.task_by_pk.opsec_pre_bypass_user !== null){
                    message += " (bypassed by " + data.task_by_pk.opsec_pre_bypass_user.username + ")";
                } else if(data.task_by_pk.opsec_pre_blocked && !data.task_by_pk.opsec_pre_bypassed){
                    message += " (required bypass role: " + data.task_by_pk.opsec_pre_bypass_role + ")";
                }
                message += ":\n\n" + data.task_by_pk.opsec_pre_message + "\n";
                setOpsecMessage(message);
            } else {
                let message = "OPSEC PostCheck Message";
                if(data.task_by_pk.opsec_post_bypass_user !== null){
                    message += " (bypassed by " + data.task_by_pk.opsec_post_bypass_user.username + ")";
                } else if(data.task_by_pk.opsec_post_blocked && !data.task_by_pk.opsec_post_bypassed) {
                    message += " (required bypass role: " + data.task_by_pk.opsec_post_bypass_role + ")";
                }
                message += ":\n\n" + data.task_by_pk.opsec_post_message + "\n";
                setOpsecMessage(message);
            }
            
            
        },
        fetchPolicy: "network-only"
    });
    const [updateOpsecRequest] = useMutation(updateOpsecRequestMutation, {
        update: (cache, {data}) => {
            if(data.requestOpsecBypass.status === "success"){
                snackActions.success("Bypass processed successfully");
            }else{
                snackActions.warning(data.requestOpsecBypass.error);
            }
        }
    });
    if (error) {
     console.error(error);
     return <div>Error! {error.message}</div>;
    }
    const requestAvailable = (opsecData.opsec_pre_blocked === true && !opsecData.opsec_pre_bypassed) || (opsecData.opsec_post_blocked === true && !opsecData.opsec_post_bypassed);
    const onRequestSubmit = () => {
       //console.log(props.task_id);
        updateOpsecRequest({variables: {task_id: props.task_id}});
        props.onClose();
    }
  
  return (
    <React.Fragment>
            <MythicModifyStringDialog title={`Request OPSEC Bypass`}
                                      onClose={props.onClose}
                                      maxRows={40}
                                      wrap={true}
                                      value={opsecMessage}
                                      onSubmit={requestAvailable ? onRequestSubmit : undefined}
                                      onSubmitText={"Submit Bypass Request"}
                                      dontCloseOnSubmit={true}
            />
  </React.Fragment>
  );
}

