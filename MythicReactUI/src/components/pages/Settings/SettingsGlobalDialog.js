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
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";

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
    const [allowWebhooksOnNewCallbacks, setAllowWebhooksOnNewCallbacks] = React.useState(true);
    const [serverName, setServerName] = React.useState(false);
    const userPreferencesRef = React.useRef("{}");
    useQuery(GET_GLOBAL_SETTINGS, {fetchPolicy: "no-cache",
        onCompleted: (data) => {
            setDebugAgentMessage(data.getGlobalSettings.settings["server_config"]["debug_agent_message"])
            //setDebugAgentMessage(data.getGlobalSettings.settings["MYTHIC_DEBUG_AGENT_MESSAGE"]);
            setAllowInviteLinks(data.getGlobalSettings.settings["server_config"]["allow_invite_links"]);
            //setAllowInviteLinks(data.getGlobalSettings.settings["MYTHIC_SERVER_ALLOW_INVITE_LINKS"]);
            setServerName(data.getGlobalSettings.settings["server_config"]["name"]);
            //setServerName(data.getGlobalSettings.settings["MYTHIC_GLOBAL_SERVER_NAME"]);
            setAllowWebhooksOnNewCallbacks(data.getGlobalSettings.settings["server_config"]["allow_webhooks_on_new_callbacks"]);
            userPreferencesRef.current = JSON.stringify(data.getGlobalSettings.settings["preferences"], null, 2);
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
    const onAllowWebhooksOnNewCallbacksChange = (evt) => {
        setAllowWebhooksOnNewCallbacks(!allowWebhooksOnNewCallbacks);
    }
    const onAccept = () => {
      updateGlobalSettings({variables:{
          settings: {
              "server_config": {
                  "name": serverName,
                  "allow_invite_links": allowInviteLinks,
                  "debug_agent_message": debugAgentMessage,
                  "allow_webhooks_on_new_callbacks": allowWebhooksOnNewCallbacks,
              },
              "preferences": JSON.parse(userPreferencesRef.current)
          }
      }});
    }
    const onChangeServerName = (name, value, error) => {
        setServerName(value);
    }
    const onChangePreferences = (newData) => {
        userPreferencesRef.current = newData
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Configure Global Settings</DialogTitle>
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                  <TableRow hover>
                      <MythicStyledTableCell style={{width: "40%"}}>Adjust the local server name sent as part of webhooks. This can also be configured initially by the GLOBAL_SERVER_NAME config variable before Mythic starts for the first time.</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <MythicTextField value={serverName} onChange={onChangeServerName} showLabel={false}
                                           name={"serverName"} autoFocus={true} onEnter={onAccept}
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                <TableRow hover>
                  <MythicStyledTableCell style={{width: "40%"}}>Emit detailed agent message parsing information to the event logs. This is very noisy and can slow down the server. Also set by the MYTHIC_DEBUG_AGENT_MESSAGE config variable before Mythic starts for the first time.</MythicStyledTableCell>
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
                  <MythicStyledTableCell style={{width: "40%"}}>Allow Admin users to create one-time-use links that allow user creation. This can also be set by the MYTHIC_SERVER_ALLOW_INVITE_LINKS config variable before Mythic starts for the first time.</MythicStyledTableCell>
                  <MythicStyledTableCell>
                      <Switch
                          checked={allowInviteLinks}
                          onChange={onInviteLinkChange}
                          color="info"
                          inputProps={{ 'aria-label': 'primary checkbox' }}
                      />
                  </MythicStyledTableCell>
              </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell style={{width: "40%"}}>Allow Mythic to send webhook notifications on new callbacks. This can also be set by the MYTHIC_SERVER_ALLOW_WEBHOOKS_ON_NEW_CALLBACKS config variable before Mythic starts for the first time.</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={allowWebhooksOnNewCallbacks}
                              onChange={onAllowWebhooksOnNewCallbacksChange}
                              color="info"
                              inputProps={{ 'aria-label': 'primary checkbox' }}
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell style={{width: "40%"}}>Configure user preferences for new users. This does NOT override existing user preferences, but only applies to new users created after this is updated.</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <ResponseDisplayPlaintext plaintext={userPreferencesRef.current} onChangeContent={onChangePreferences} initial_mode={"json"} autoFormat={true} />
                      </MythicStyledTableCell>
                  </TableRow>
              </TableBody>
            </Table>
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

