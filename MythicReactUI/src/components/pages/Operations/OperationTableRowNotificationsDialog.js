import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import {getReadableTextColor, MythicColorSwatchInput} from '../../MythicComponents/MythicColorInput';
import {
  MythicDialogBody,
  MythicDialogGrid,
  MythicDialogSection
} from '../../MythicComponents/MythicDialogLayout';

const GET_OperationData = gql`
query GetOperations($operation_id: Int!) {
  operation_by_pk(id: $operation_id) {
    name
    id
    channel
    webhook
    complete
    deleted
    banner_text
    banner_color
  }
}
`;

export function OperationTableRowNotificationsDialog(props) {
    const [name, setName] = React.useState("");
    const [channel, setChannel] = React.useState("");
    const [webhook, setWebhook] = React.useState("");
    const [complete, setComplete] = React.useState(false);
    const [bannerText, setBannerText] = React.useState("");
    const [bannerColor, setBannerColor] = React.useState("#be2a2a");
    useQuery(GET_OperationData, {
      fetchPolicy: "no-cache",
      variables: {operation_id: props.id},
      onCompleted: (data) => {
          setName(data.operation_by_pk.name);
          setChannel(data.operation_by_pk.channel);
          setWebhook(data.operation_by_pk.webhook);
          setComplete(data.operation_by_pk.complete);
          setBannerText(data.operation_by_pk.banner_text);
          if(data.operation_by_pk.banner_color !== ""){
              setBannerColor(data.operation_by_pk.banner_color);
          }
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
        case "Webhook URL":
          setWebhook(value);
          break;
        case "Banner Text":
          setBannerText(value);
          break;
        default:
          break;
      }
    }
    const onBoolChange = (event) => {
      setComplete(event.target.checked);
    }
    const onAccept = () =>{
      props.onUpdateOperation({
        operation_id: props.id,
        name: name,
        channel: channel,
        webhook: webhook,
        complete: complete,
          banner_text: bannerText,
          banner_color: bannerColor,
      });
      props.onClose();
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Modify {name}</DialogTitle>
        <DialogContent dividers={true} style={{maxHeight: "calc(70vh)"}}>
          <MythicDialogBody>
            <MythicDialogSection title="Operation Details">
              <MythicDialogGrid>
                <MythicTextField
                  autoFocus
                  value={name}
                  onChange={onTextChange}
                  name="name"
                />
                <FormControlLabel
                  className="mythic-dialog-switch-row"
                  label="Complete Operation"
                  labelPlacement="start"
                  control={<Switch checked={complete} onChange={onBoolChange} color="warning" />}
                />
              </MythicDialogGrid>
            </MythicDialogSection>
            <MythicDialogSection title="Webhook Notifications">
              <MythicDialogGrid>
                <MythicTextField
                  value={channel}
                  onChange={onTextChange}
                  name="Webhook Channel"
                />
                <MythicTextField
                  value={webhook}
                  onChange={onTextChange}
                  name="Webhook URL"
                />
              </MythicDialogGrid>
            </MythicDialogSection>
            <MythicDialogSection
                title="Operation Banner"
                actions={
                  <MythicColorSwatchInput
                      color={bannerColor}
                      label="Operation banner color"
                      onChange={setBannerColor}
                  />
                }
            >
              <MythicTextField
                  value={bannerText}
                  onChange={onTextChange}
                  name="Banner Text"
              />
              <Box
                  className="mythic-dialog-preview"
                  sx={{
                      mt: 1,
                      backgroundColor: bannerColor,
                  }}
              >
                  <Typography sx={{color: getReadableTextColor(bannerColor), fontWeight: 700}}>
                      {bannerText || "Operation Banner"}
                  </Typography>
              </Box>
            </MythicDialogSection>
          </MythicDialogBody>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Cancel
          </Button>
          <Button onClick={onAccept} variant="contained" color="success">
            Update
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}
