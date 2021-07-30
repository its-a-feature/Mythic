import React from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import Switch from '@material-ui/core/Switch';

const GET_OperationData = gql`
query GetOperations($operation_id: Int!) {
  operation_by_pk(id: $operation_id) {
    name
    id
    channel
    display_name
    icon_emoji
    icon_url
    webhook
    webhook_message
    complete
  }
}
`;
const Update_Operation = gql`
mutation MyMutation($operation_id: Int!, $channel: String!, $complete: Boolean!, $display_name: String!, $icon_emoji: String!, $icon_url: String!, $name: String!, $webhook: String!, $webhook_message: String!) {
  update_operation_by_pk(pk_columns: {id: $operation_id}, _set: {channel: $channel, complete: $complete, display_name: $display_name, icon_emoji: $icon_emoji, icon_url: $icon_url, name: $name, webhook: $webhook, webhook_message: $webhook_message}) {
    id
    name
  }
}
`;
export function OperationTableRowNotificationsDialog(props) {
    const [name, setName] = React.useState("");
    const [channel, setChannel] = React.useState("");
    const [displayName, setDisplayName] = React.useState("");
    const [iconEmoji, setIconEmoji] = React.useState("");
    const [iconURL, setIconURL] = React.useState("");
    const [webhook, setWebhook] = React.useState("");
    const [webhookMessage, setWebhookMessage] = React.useState("");
    const [complete, setComplete] = React.useState(false);
    const [updateOperation] = useMutation(Update_Operation, {
      onCompleted: (data) => {
        console.log(data);
        snackActions.success("Successfully updated operation");
      },
      onError: (data) => {
        snackActions.error("Failed to update operation");
        console.log("error updating operation", data);
      }
    })
    useQuery(GET_OperationData, {
      fetchPolicy: "no-cache",
      variables: {operation_id: props.id},
      onCompleted: (data) => {
          setName(data.operation_by_pk.name);
          setChannel(data.operation_by_pk.channel);
          setDisplayName(data.operation_by_pk.display_name);
          setIconEmoji(data.operation_by_pk.icon_emoji);
          setIconURL(data.operation_by_pk.icon_url);
          setWebhook(data.operation_by_pk.webhook);
          setWebhookMessage(data.operation_by_pk.webhook_message);
          setComplete(data.operation_by_pk.complete);
      },
      onError: () => {
        snackActions.error("Failed to fetch data");
      }
    });
    const onTextChange = (name, value, error) => {
      switch(name){
        case "name":
          setName(value);
          break;
        case "Webhook Channel":
          setChannel(value);
          break;
        case "Webhook Display Name":
          setDisplayName(value);
          break;
        case "Webhook Icon Emoji":
          setIconEmoji(value);
          break;
        case "Webhook Icon URL":
          setIconURL(value);
          break;
        case "Webhook URL":
          setWebhook(value);
          break;
        case "Webhook POST Message":
          setWebhookMessage(value);
          break;
        default:
          break;
      }
    }
    const onBoolChange = (event) => {
      setComplete(event.target.checked);
    }
    const onAccept = () =>{
      updateOperation({variables: {
        operation_id: props.id,
        name: name,
        channel: channel,
        display_name: displayName,
        icon_emoji: iconEmoji,
        icon_url: iconURL,
        webhook: webhook,
        webhook_message: webhookMessage,
        complete: complete
      }});
      props.onClose();
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Modify {name}</DialogTitle>
        <DialogContent dividers={true} style={{maxHeight: "calc(70vh)"}}>
          <DialogContentText>
            Use this dialog to update some information about an operation.
          </DialogContentText>
          <MythicTextField
            autoFocus
            value={name}
            onChange={onTextChange}
            margin="dense"
            name="name"
          />
          Complete Operation? <Switch checked={complete} onChange={onBoolChange} color="secondary" />
          <MythicTextField
            margin="dense"
            value={channel}
            onChange={onTextChange}
            name="Webhook Channel"
          />
          <MythicTextField
            margin="dense"
            value={displayName}
            onChange={onTextChange}
            name="Webhook Display Name"
          />
          <MythicTextField
            margin="dense"
            value={iconEmoji}
            onChange={onTextChange}
            name="Webhook Icon Emoji"
          />
          <MythicTextField
            margin="dense"
            value={iconURL}
            onChange={onTextChange}
            name="Webhook Icon URL"
          />
          <MythicTextField
            margin="dense"
            value={webhook}
            onChange={onTextChange}
            name="Webhook URL"
          />
          <MythicTextField
            margin="dense"
            multiline={true}
            value={webhookMessage}
            onChange={onTextChange}
            name="Webhook POST Message"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Cancel
          </Button>
          <Button onClick={onAccept} variant="contained" color="secondary">
            Update
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

