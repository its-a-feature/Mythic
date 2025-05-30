import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import Typography from '@mui/material/Typography';
import TableRow from '@mui/material/TableRow';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import {useMutation, useQuery, gql} from '@apollo/client';
import {snackActions} from "../../utilities/Snackbar";
import MythicTextField from "../../MythicComponents/MythicTextField";
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";

export const GET_GLOBAL_SETTINGS = gql`
query getGlobalSettings {
  getGlobalSettings {
    settings
  }
}
`;
const UpdateGlobalSettingsMutation = gql`
mutation updateGlobalSettings($settings: jsonb!) {
    updateGlobalSettings(settings: $settings){
        status
        error
    }
}
`;
export function SettingsGlobalDialog(props) {
    const [debugAgentMessage, setDebugAgentMessage] = React.useState(false);
    const [allowInviteLinks, setAllowInviteLinks] = React.useState(false);
    const [serverName, setServerName] = React.useState(false);
    useQuery(GET_GLOBAL_SETTINGS, {fetchPolicy: "no-cache",
        onCompleted: (data) => {
            setDebugAgentMessage(data.getGlobalSettings.settings["MYTHIC_DEBUG_AGENT_MESSAGE"]);
            setAllowInviteLinks(data.getGlobalSettings.settings["MYTHIC_SERVER_ALLOW_INVITE_LINKS"]);
            setServerName(data.getGlobalSettings.settings["MYTHIC_GLOBAL_SERVER_NAME"]);
        }
    });
    const [updateGlobalSettings] = useMutation(UpdateGlobalSettingsMutation, {
        onCompleted: (result) => {
            if(result.updateGlobalSettings.status === "success"){
                snackActions.success("Successfully updated");
            } else {
                snackActions.error(result.updateGlobalSettings.error);
            }
            props.onClose();
        },
        onError: (err) => {
            console.log(err);
            snackActions.error("Unable to update global without Admin permissions");
            props.onClose();
        }
    });
    const onDebugAgentMessageChange = (evt) => {
        setDebugAgentMessage(!debugAgentMessage);
    }
    const onInviteLinkChange = (evt) => {
        setAllowInviteLinks(!allowInviteLinks);
    }
    const onAccept = () => {
      updateGlobalSettings({variables:{
          settings: {
              "MYTHIC_DEBUG_AGENT_MESSAGE": debugAgentMessage,
              "MYTHIC_SERVER_ALLOW_INVITE_LINKS": allowInviteLinks,
              "MYTHIC_GLOBAL_SERVER_NAME": serverName,
          }
      }});
    }
    const onChangeServerName = (name, value, error) => {
        setServerName(value);
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Configure Global Settings</DialogTitle>
        <DialogContentText style={{marginLeft: "20px", marginBottom: "20px"}}>
            <Typography component={"span"} style={{fontWeight: "600", display: "inline-block"}} color={"error"} >
                Note:
            </Typography>
            {" Changes here do not persist after a Mythic reboot. If you want changes to persist please update the local .env file."}
        </DialogContentText>
            <TableContainer  className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                  <TableRow hover>
                      <MythicStyledTableCell style={{width: "60%"}}>Adjust the local server name sent as part of webhooks. This can also be set by the GLOBAL_SERVER_NAME config variable.</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <MythicTextField value={serverName} onChange={onChangeServerName} showLabel={false}
                                           name={"serverName"} autoFocus={true} onEnter={onAccept}
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                <TableRow hover>
                  <MythicStyledTableCell style={{width: "60%"}}>Emit detailed agent message parsing information to the event logs. This is very noisy and can slow down the server. Also set by the MYTHIC_DEBUG_AGENT_MESSAGE config variable.</MythicStyledTableCell>
                  <MythicStyledTableCell>
                      <Switch
                          checked={debugAgentMessage}
                          onChange={onDebugAgentMessageChange}
                          color="info"
                          inputProps={{ 'aria-label': 'primary checkbox' }}
                      />
                  </MythicStyledTableCell>
                </TableRow>
              <TableRow hover>
                  <MythicStyledTableCell style={{width: "60%"}}>Allow Admin users to create one-time-use links that allow user creation. This can also be set by the MYTHIC_SERVER_ALLOW_INVITE_LINKS config variable.</MythicStyledTableCell>
                  <MythicStyledTableCell>
                      <Switch
                          checked={allowInviteLinks}
                          onChange={onInviteLinkChange}
                          color="info"
                          inputProps={{ 'aria-label': 'primary checkbox' }}
                      />
                  </MythicStyledTableCell>
              </TableRow>
              </TableBody>
            </Table>
        </TableContainer>
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

