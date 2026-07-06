import React from 'react';
import {Box} from '@mui/material';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {CreateInviteLinksDialog} from "./InviteLinksDialog";
import {APITokenScopeSelector, normalizeAPITokenScopeSelection} from "../../MythicComponents/APITokenScopeSelector";
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicDialogSection,
    MythicFormField,
    MythicFormGrid,
    MythicFormNote
} from "../../MythicComponents/MythicDialogLayout";


export function SettingsOperatorDialog(props) {
    const [username, setUsername] = React.useState(props.username ? props.username : "");
    const [passwordOld, setPasswordOld] = React.useState("");
    const [passwordNew, setPasswordNew] = React.useState("");
    const [email, setEmail] = React.useState(props.email ? props.email : "");
    const [openInviteLinkDialog, setOpenInviteLinkDialog] = React.useState(false);
    const onUsernameChange = (name, value, error) => {
        setUsername(value);
    }
    const onPasswordOldChange = (name, value, error) => {
        setPasswordOld(value);
    }
    const onPasswordNewChange = (name, value, error) => {
        setPasswordNew(value);
    }
    const onEmailChange = (name, value, error) => {
        setEmail(value);
    }
    const onAccept = () =>{
        props.onAccept(props.id, username, passwordOld, passwordNew, email);
    }
    const createInviteLink = () => {
        setOpenInviteLinkDialog(true);
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">
            <Box className="mythic-dialog-title-row">
                <Box component="span">{props.title}</Box>
                <MythicStyledTooltip tooltipStyle={{display: "inline-flex"}}
                                     title={"Generate invite link for somebody to create their own username/password"}>
                    <Button className="mythic-dialog-title-action" onClick={createInviteLink} size="small" variant="outlined">
                        Generate Invite Link
                    </Button>
                </MythicStyledTooltip>
            </Box>
            {openInviteLinkDialog &&
                <MythicDialog open={openInviteLinkDialog}
                              fullWidth={true}
                              onClose={()=>{setOpenInviteLinkDialog(false);}}
                              innerDialog={<CreateInviteLinksDialog onClose={()=>{setOpenInviteLinkDialog(false);}} create={true}  {...props}/>}
                />
            }
        </DialogTitle>

        <DialogContent dividers={true}>
            <MythicDialogBody>
                <MythicFormNote>
                    If you're an admin, you don't need to know a user's old password to set a new one.
                </MythicFormNote>
                <MythicDialogSection title="Account Details">
                    <MythicFormGrid minWidth="18rem" component="form" autoComplete="off">
                        <MythicFormField label="Username" required>
                            <MythicTextField
                                autoComplete={false}
                                autoFocus
                                placeholder={props.username}
                                value={username}
                                onChange={onUsernameChange}
                                id="username"
                                name="username"
                                showLabel={false}
                                marginTop="0px"
                                marginBottom="0px"
                            />
                        </MythicFormField>
                        {!props.userIsAdmin &&
                            <MythicFormField label={props.title === "New Operator" ? "Password" : "Old Password"}>
                                <MythicTextField
                                    id="passwordOld"
                                    value={passwordOld}
                                    onChange={onPasswordOldChange}
                                    name={props.title === "New Operator" ? "password" : "old password"}
                                    showLabel={false}
                                    type="password"
                                    marginTop="0px"
                                    marginBottom="0px"
                                />
                            </MythicFormField>
                        }
                        <MythicFormField label={props.title === "New Operator" ? "Confirm Password" : "New Password"}>
                            <MythicTextField
                                id="passwordNew"
                                value={passwordNew}
                                onChange={onPasswordNewChange}
                                name={props.title === "New Operator" ? "password again" : "new password"}
                                showLabel={false}
                                type="password"
                                marginTop="0px"
                                marginBottom="0px"
                            />
                        </MythicFormField>
                        <MythicFormField label="Email">
                            <MythicTextField
                                id="email"
                                value={email}
                                onChange={onEmailChange}
                                name={"email"}
                                showLabel={false}
                                type="text"
                                marginTop="0px"
                                marginBottom="0px"
                            />
                        </MythicFormField>
                    </MythicFormGrid>
                </MythicDialogSection>
            </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.handleClose}>
            Cancel
          </MythicDialogButton>
          <MythicDialogButton intent="primary" onClick={onAccept}>
            {props.title === "New Operator" ? "Create" : "Update"}
          </MythicDialogButton>
        </MythicDialogFooter>
  </React.Fragment>
  );
}
export function SettingsBotDialog(props) {
    const [username, setUsername] = React.useState(props.username ? props.username : "");

    const onUsernameChange = (name, value, error) => {
        setUsername(value);
    }

    const onAccept = () =>{
        props.onAccept(props.id, username);
    }

    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
            <DialogContent dividers={true}>
                <MythicDialogBody>
                    <MythicFormNote>
                        Bot accounts cannot log in. They can be assigned to operations and perform actions as part of workflows once approved.
                    </MythicFormNote>
                    <MythicDialogSection title="Bot Account">
                        <MythicFormGrid minWidth="18rem">
                            <MythicFormField label="Username" required>
                                <MythicTextField
                                    autoFocus
                                    placeholder={props.username}
                                    value={username}
                                    onChange={onUsernameChange}
                                    id="username"
                                    name="username"
                                    showLabel={false}
                                    marginTop="0px"
                                    marginBottom="0px"
                                />
                            </MythicFormField>
                        </MythicFormGrid>
                    </MythicDialogSection>
                </MythicDialogBody>
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={props.handleClose}>
                    Cancel
                </MythicDialogButton>
                <MythicDialogButton intent="primary" onClick={onAccept}>
                    {props.title === "New Bot Account" ? "Create" : "Update"}
                </MythicDialogButton>
            </MythicDialogFooter>
        </React.Fragment>
    );
}
export function SettingsAPITokenDialog(props) {
    const [name, setName] = React.useState(props.name ? props.name : "");
    const requiredScopes = React.useMemo(() => props.requiredScopes || [], [props.requiredScopes]);
    const requiredScopeDescriptions = props.requiredScopeDescriptions || {};
    const initialScopes = React.useMemo(() => props.initialScopes || [], [props.initialScopes]);
    const initialSelectedScopes = React.useMemo(() => (
        normalizeAPITokenScopeSelection([...initialScopes, ...requiredScopes])
    ), [initialScopes, requiredScopes]);
    const [selectedScopes, setSelectedScopes] = React.useState(initialSelectedScopes);
    React.useEffect(() => {
        if(initialSelectedScopes.length > 0){
            setSelectedScopes((prev) => normalizeAPITokenScopeSelection([...initialSelectedScopes, ...prev]));
        }
    }, [initialSelectedScopes]);

    const onUsernameChange = (name, value, error) => {
        setName(value);
    }

    const onAccept = () =>{
        props.onAccept(name.trim(), normalizeAPITokenScopeSelection(selectedScopes));
    }

    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">
                {props.title}
            </DialogTitle>
            <DialogContent dividers={true} >
                <MythicDialogBody>
                <MythicDialogSection title="Token Details">
                    <MythicFormGrid minWidth="18rem">
                        <MythicFormField
                            label="Token Name"
                            description="Use a short name that describes where this token will be used."
                            required
                        >
                            <MythicTextField
                                autoFocus
                                placeholder={props.name}
                                value={name}
                                onChange={onUsernameChange}
                                id="name"
                                name="name"
                                showLabel={false}
                                marginTop="0px"
                                marginBottom="0px"
                            />
                        </MythicFormField>
                    </MythicFormGrid>
                </MythicDialogSection>
                <MythicDialogSection
                    title="Scopes"
                    description="Tokens with no scopes are created with no API access. Write scopes include read access for the same resource."
                >
                    <APITokenScopeSelector
                        selectedScopes={selectedScopes}
                        onChange={setSelectedScopes}
                        requiredScopes={requiredScopes}
                        requiredScopeDescriptions={requiredScopeDescriptions}
                        fetchPolicy="no-cache"
                    />
                </MythicDialogSection>
                </MythicDialogBody>
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={props.handleClose}>
                    Cancel
                </MythicDialogButton>
                <MythicDialogButton disabled={name.trim() === ""} intent="primary" onClick={onAccept}>
                    {"Create New"}
                </MythicDialogButton>
            </MythicDialogFooter>
        </React.Fragment>
    );
}
