import React, {useState} from 'react';
import {useQuery, gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {MythicConfirmDialog} from "../../MythicComponents/MythicConfirmDialog";
import Typography from '@mui/material/Typography';
import {MythicModifyStringDialog} from "../../MythicComponents/MythicDialog";

const updateDescriptionMutation = gql`
mutation updateDescription ($payload_uuid: String!, $description: String) {
  updatePayload(payload_uuid: $payload_uuid, description: $description) {
    description
    id
  }
}
`;
const updateCallbackDescriptionsMutation = gql`
mutation updateCallbackDescriptions($oldDescription: String!, $newDescription: String!, $payloadID: Int!){
    update_callback_many(updates: {where: {description: {_eq: $oldDescription}, registered_payload_id: {_eq: $payloadID}}, _set: {description: $newDescription}}) {
        affected_rows
      }
}
`;
const getDescriptionQuery = gql`
query getDescriptionQuery ($payload_id: Int!) {
  payload_by_pk(id: $payload_id) {
    description
    id
    callbacks {
      id
    }
  }
}
`;

export function PayloadDescriptionDialog(props) {
    const description = React.useRef("");
    const [oldDescription, setOldDescription] = useState("");
    const hasCallbacks = React.useRef(false);
    useQuery(getDescriptionQuery, {
        variables: {payload_id: props.payload_id},
        onCompleted: data => {
            description.current = data.payload_by_pk.description;
            setOldDescription(data.payload_by_pk.description);
            hasCallbacks.current = data.payload_by_pk.callbacks.length > 0;
        },
        fetchPolicy: "network-only"
    });
    const [updateDescription] = useMutation(updateDescriptionMutation, {
        onCompleted: (data) => {
            snackActions.success("Updated Payload Description");
            props.onClose();
        },
        onError: (data) => {
            console.log(data);
        }
    });
    const [updateCallbackDescriptions] = useMutation(updateCallbackDescriptionsMutation, {
        onCompleted: (data) => {
            if(data.update_callback_many.length > 0){
                if(data.update_callback_many[0].affected_rows){
                    snackActions.success("Updated " + data.update_callback_many[0].affected_rows + " callbacks");
                }
            }

        },
        onError: (data) => {
            console.log(data);
        }
    });
    const [openUpdateAll, setOpenUpdateAll] = React.useState(false);
    const updateAllDialogText =<>
        <Typography>
            Would you like to update the callback description for all callbacks using the old description of this payload? <br/><br/>
            If you explicitly set a new description for a callback, that will not be changed.
            If you cancel, then any interactive tab for a callback using the old description will no longer show "Callback: X", but will show the old description.
            <br/><br/>
            Updating all will update all callback's descriptions that matched this payload's old description to the new one. This will preserve the "Callback: X" display for interactive tabs.
        </Typography>
    </>;
    const onAcceptUpdateAll = () => {
        setOpenUpdateAll(false);
        updateCallbackDescriptions({variables: {
                payloadID: props.payload_id,
                oldDescription: oldDescription,
                newDescription: description.current,
            }});
        updatePayloadDescription();
        // now update all
    }
    const updatePayloadDescription = () => {
        setOpenUpdateAll(false);
        updateDescription({variables: {payload_uuid: props.payload_uuid, description: description.current}});
    }
    const onCommitSubmit = (updatedMessage) => {
        description.current = updatedMessage;
        if(hasCallbacks.current){
            setOpenUpdateAll(true);
        } else {
            updatePayloadDescription();
        }

    }

  return (
    <React.Fragment>
        <MythicModifyStringDialog title={"Edit Payload Description"}
                                  maxRows={5}
                                  onClose={props.onClose}
                                  value={oldDescription}
                                  dontCloseOnSubmit={true}
                                  onSubmit={onCommitSubmit} />
        {openUpdateAll &&
            <MythicConfirmDialog title={"Update Associated Callback's Descriptions?"}
                                 dontCloseOnSubmit={true}
                                 dialogText={updateAllDialogText}
                                 cancelText={"Update Only Payload"}
                                 acceptText={"Update Callbacks"}
                                 acceptColor={"success"}
                                 onClose={updatePayloadDescription}
                                 onSubmit={onAcceptUpdateAll}
                                 open={openUpdateAll}/>
        }
  </React.Fragment>
  );
}

