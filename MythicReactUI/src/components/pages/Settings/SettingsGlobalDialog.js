import React from 'react';
import Box from '@mui/material/Box';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Switch from '@mui/material/Switch';
import {useMutation, useQuery, gql} from '@apollo/client';
import {snackActions} from "../../utilities/Snackbar";
import MythicTextField from "../../MythicComponents/MythicTextField";
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicDialogSection,
    MythicFormField,
    MythicFormGrid,
    MythicFormSwitchRow
} from "../../MythicComponents/MythicDialogLayout";

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
    const [serverName, setServerName] = React.useState("");
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
        <DialogContent dividers={true}>
            <MythicDialogBody>
                <MythicDialogSection title="Server Identity">
                    <MythicFormGrid minWidth="20rem">
                        <MythicFormField
                            label="Server Name"
                            description="Used in webhook payloads. This can also be configured before first start with GLOBAL_SERVER_NAME."
                        >
                            <MythicTextField
                                value={serverName}
                                onChange={onChangeServerName}
                                showLabel={false}
                                name={"serverName"}
                                autoFocus={true}
                                onEnter={onAccept}
                                marginTop="0px"
                                marginBottom="0px"
                            />
                        </MythicFormField>
                    </MythicFormGrid>
                </MythicDialogSection>
                <MythicDialogSection title="Server Behavior">
                    <MythicFormSwitchRow
                        label="Debug Agent Messages"
                        description="Emit detailed agent message parsing information to event logs. This is noisy and can slow down the server."
                        control={
                            <Switch
                                checked={debugAgentMessage}
                                onChange={onDebugAgentMessageChange}
                                color="info"
                                inputProps={{ 'aria-label': 'Debug agent messages' }}
                            />
                        }
                    />
                    <MythicFormSwitchRow
                        label="Invite Links"
                        description="Allow admin users to create one-time-use links that let new users create accounts."
                        control={
                            <Switch
                                checked={allowInviteLinks}
                                onChange={onInviteLinkChange}
                                color="info"
                                inputProps={{ 'aria-label': 'Allow invite links' }}
                            />
                        }
                    />
                    <MythicFormSwitchRow
                        label="New Callback Webhooks"
                        description="Allow Mythic to send webhook notifications when new callbacks arrive."
                        control={
                            <Switch
                                checked={allowWebhooksOnNewCallbacks}
                                onChange={onAllowWebhooksOnNewCallbacksChange}
                                color="info"
                                inputProps={{ 'aria-label': 'Allow webhooks on new callbacks' }}
                            />
                        }
                    />
                </MythicDialogSection>
                <MythicDialogSection
                    title="Default User Preferences"
                    description="Applies only to users created after this setting is saved. Existing user preferences are not overwritten."
                >
                    <Box className="mythic-form-code-editor">
                        <ResponseDisplayPlaintext plaintext={userPreferencesRef.current} onChangeContent={onChangePreferences} initial_mode={"json"} autoFormat={true} />
                    </Box>
                </MythicDialogSection>
            </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Cancel
          </MythicDialogButton>
          <MythicDialogButton intent="primary" onClick={onAccept}>
            Update
          </MythicDialogButton>
        </MythicDialogFooter>
  </React.Fragment>
  );
}
