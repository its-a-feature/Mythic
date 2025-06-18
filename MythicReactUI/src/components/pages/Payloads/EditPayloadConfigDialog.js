import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {gql, useMutation, useQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {exportPayloadConfigQuery} from "./PayloadsTableRow";
import {MythicModifyStringDialog} from "../../MythicComponents/MythicDialog";

const create_payload = gql`
 mutation createPayloadMutation($payload: String!) {
  createPayload(payloadDefinition: $payload) {
    error
    status
    uuid
  }
}
 `;

export function EditPayloadConfigDialog(props) {
    const [payloadConfig, setPayloadConfig] = React.useState("");
    useQuery(exportPayloadConfigQuery, {
        variables: {uuid: props.uuid},
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            //console.log(data)
            if(data.exportPayloadConfig.status === "success"){
                setPayloadConfig(data.exportPayloadConfig.config);
            }else{
                snackActions.error("Failed to export configuration: " + data.exportPayloadConfig.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to export configuration: " + data.message)
        }
    })
  const [createPayloadMutation] = useMutation(create_payload, {
        update: (cache, {data}) => {
            if(data.createPayload.status === "success"){
                snackActions.info("Submitted payload to build pipeline");
            }else{
                snackActions.error(data.createPayload.error);
            }
        }
    });
  const onCommitSubmit = (updatedConfig) => {
      createPayloadMutation({variables: {payload: updatedConfig}}).catch( (e) => {console.log(e)} );
      props.onClose();
  }
  return (
    <React.Fragment>
        <MythicModifyStringDialog title={"Create New Payload With Modified Config"}
                                  value={payloadConfig}
                                  dontCloseOnSubmit={true}
                                  onSubmit={onCommitSubmit}
                                  onSubmitText={"Create"}
                                  onClose={props.onClose}
                                  maxRows={30}
                                  />
  </React.Fragment>
  );
}

