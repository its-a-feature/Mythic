import React from 'react';
import {Box, Checkbox, Chip, InputAdornment, TextField, Typography} from '@mui/material';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {CreateInviteLinksDialog} from "./InviteLinksDialog";
import SearchIcon from '@mui/icons-material/Search';
import {gql, useQuery} from "@apollo/client";
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicDialogSection,
    MythicFormField,
    MythicFormGrid,
    MythicFormNote
} from "../../MythicComponents/MythicDialogLayout";

const apiTokenScopeDefinitionsQuery = gql`
query apiTokenScopeDefinitionsQuery {
  apiTokenScopeDefinitions {
    status
    error
    scopes {
      name
      display_name
      description
      resource
      access
      includes
    }
    grantable_wildcards
  }
}
`;


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
    const [selectedScopes, setSelectedScopes] = React.useState([]);
    const [filter, setFilter] = React.useState("");
    const {data: scopeData, loading: scopeLoading, error: scopeQueryError} = useQuery(apiTokenScopeDefinitionsQuery, {
        fetchPolicy: "no-cache",
    });
    const availableScopes = React.useMemo(() => {
        if(scopeData?.apiTokenScopeDefinitions?.status !== "success"){
            return [];
        }
        return scopeData?.apiTokenScopeDefinitions?.scopes || [];
    }, [scopeData]);
    const grantableWildcards = React.useMemo(() => {
        return scopeData?.apiTokenScopeDefinitions?.grantable_wildcards || [];
    }, [scopeData]);
    const groupedScopes = React.useMemo(() => {
        return availableScopes.reduce((prev, cur) => {
            const resource = cur.resource || "other";
            return {
                ...prev,
                [resource]: [...(prev[resource] || []), cur],
            };
        }, {});
    }, [availableScopes]);
    const visibleResources = React.useMemo(() => {
        const normalizedFilter = filter.toLowerCase();
        return Object.keys(groupedScopes).sort().filter(resource => {
            if(normalizedFilter === ""){
                return true;
            }
            if(resource.toLowerCase().includes(normalizedFilter)){
                return true;
            }
            return groupedScopes[resource].some(scope =>
                scope.name.toLowerCase().includes(normalizedFilter) ||
                (scope.display_name || "").toLowerCase().includes(normalizedFilter) ||
                (scope.description || "").toLowerCase().includes(normalizedFilter)
            );
        });
    }, [filter, groupedScopes]);
    const visibleScopeCount = React.useMemo(() => {
        return visibleResources.reduce((prev, resource) => prev + groupedScopes[resource].length, 0);
    }, [groupedScopes, visibleResources]);
    const scopeLoadFailed = scopeQueryError !== undefined || scopeData?.apiTokenScopeDefinitions?.status === "error";
    const scopesUnavailable = scopeLoading || scopeLoadFailed;
    const selectedScopesLabel = selectedScopes.includes("*") ? "Full access selected" : `${selectedScopes.length} selected`;
    const fullAccessDisabled = !grantableWildcards.includes("*");

    const onUsernameChange = (name, value, error) => {
        setName(value);
    }

    const onAccept = () =>{
        props.onAccept(name.trim(), selectedScopes);
    }
    const onFilterChange = (event) => {
        setFilter(event.target.value);
    }
    const scopeIsSelected = (scope) => {
        return selectedScopes.includes(scope);
    }
    const toggleScope = (scope) => {
        if(scope === "*"){
            setSelectedScopes(scopeIsSelected("*") ? [] : ["*"]);
            return;
        }
        setSelectedScopes(prev => {
            const resource = scope.endsWith(".*") ? scope.slice(0, -2) : scope.split(".")[0];
            const withoutAll = prev.filter(s => s !== "*");
            const withoutResourceWildcard = withoutAll.filter(s => s !== `${resource}.*`);
            if(scope.endsWith(".*")){
                return prev.includes(scope) ? withoutResourceWildcard : [
                    ...withoutResourceWildcard.filter(s => !s.startsWith(`${resource}.`)),
                    scope,
                ].sort();
            }
            if(prev.includes(scope)){
                return withoutResourceWildcard.filter(s => s !== scope);
            }
            return [...withoutResourceWildcard, scope].sort();
        });
    }
    const selectVisibleScopes = () => {
        const visibleScopeNames = visibleResources.flatMap(resource => groupedScopes[resource].map(scope => scope.name));
        setSelectedScopes(prev => Array.from(new Set([
            ...prev.filter(scope => scope !== "*"),
            ...visibleScopeNames,
        ])).sort());
    }
    const clearScopes = () => {
        setSelectedScopes([]);
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
                    actions={
                        <>
                            <Chip className="mythic-api-token-scope-count" size="small" label={`${visibleScopeCount} visible`} />
                            <Chip className="mythic-api-token-scope-count" size="small" label={selectedScopesLabel} />
                            <Button disabled={scopesUnavailable || visibleScopeCount === 0 || scopeIsSelected("*")} size="small" onClick={selectVisibleScopes}>
                                Select Visible
                            </Button>
                            <Button disabled={selectedScopes.length === 0} size="small" onClick={clearScopes}>
                                Clear
                            </Button>
                        </>
                    }
                >
                <TextField
                    className="mythic-api-token-scope-search"
                    size="small"
                    fullWidth
                    value={filter}
                    onChange={onFilterChange}
                    placeholder="Search scopes"
                    disabled={scopesUnavailable}
                    InputProps={{startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>}}
                />
                <Box className="mythic-api-token-scope-library">
                    {scopesUnavailable &&
                        <Box className={`mythic-api-token-scope-state${scopeLoadFailed ? " mythic-api-token-scope-state-error" : ""}`}>
                            <Typography variant="body2">
                                {scopeLoading ? "Loading scopes..." : (scopeQueryError?.message || scopeData?.apiTokenScopeDefinitions?.error || "Failed to load scopes")}
                            </Typography>
                        </Box>
                    }
                    {!scopesUnavailable &&
                    <>
                    <Box
                        className={`mythic-api-token-scope-card mythic-api-token-scope-card-full${scopeIsSelected("*") ? " mythic-api-token-scope-card-selected" : ""}${fullAccessDisabled ? " mythic-api-token-scope-card-disabled" : ""}`}
                        component="label"
                    >
                        <Checkbox
                                disabled={!grantableWildcards.includes("*")}
                                checked={scopeIsSelected("*")}
                                onChange={() => toggleScope("*")}
                        />
                        <Box className="mythic-api-token-scope-card-copy">
                            <Typography className="mythic-api-token-scope-card-title">Full access (*)</Typography>
                            <Typography className="mythic-api-token-scope-card-description">
                                Grants every current and future API scope available to this operator.
                            </Typography>
                        </Box>
                    </Box>
                    {visibleResources.length === 0 &&
                        <Box className="mythic-api-token-scope-state">
                            <Typography variant="body2">No scopes match your search.</Typography>
                        </Box>
                    }
                    {visibleResources.map(resource => {
                        const resourceWildcard = `${resource}.*`;
                        const canGrantResourceWildcard = grantableWildcards.includes(resourceWildcard);
                        const resourceScopes = [...groupedScopes[resource]].sort((a, b) => (a.access || "").localeCompare(b.access || ""));
                        const resourceWildcardSelected = scopeIsSelected("*") || scopeIsSelected(resourceWildcard);
                        return (
                            <Box className="mythic-api-token-resource-card" key={resource}>
                                <Box className="mythic-api-token-resource-header">
                                    <Box sx={{minWidth: 0}}>
                                        <Typography className="mythic-api-token-resource-title">
                                            {resource.split("_").join(" ")}
                                        </Typography>
                                        <Typography className="mythic-api-token-resource-subtitle">
                                            {resourceScopes.length === 1 ? "1 available scope" : `${resourceScopes.length} available scopes`}
                                        </Typography>
                                    </Box>
                                    <Box
                                        className={`mythic-api-token-resource-wildcard${resourceWildcardSelected ? " mythic-api-token-resource-wildcard-selected" : ""}${!canGrantResourceWildcard ? " mythic-api-token-resource-wildcard-disabled" : ""}`}
                                        component="label"
                                    >
                                        <Checkbox
                                            size="small"
                                            disabled={scopeIsSelected("*") || !canGrantResourceWildcard}
                                            checked={resourceWildcardSelected}
                                            onChange={() => toggleScope(resourceWildcard)}
                                        />
                                        <span>{resourceWildcard}</span>
                                    </Box>
                                </Box>
                                <Box className="mythic-api-token-scope-grid">
                                    {resourceScopes.map(scope => {
                                        const includedByWildcard = scopeIsSelected("*") || scopeIsSelected(resourceWildcard);
                                        const scopeSelected = scopeIsSelected(scope.name) || includedByWildcard;
                                        return (
                                        <Box
                                            className={`mythic-api-token-scope-card${scopeSelected ? " mythic-api-token-scope-card-selected" : ""}${includedByWildcard ? " mythic-api-token-scope-card-inherited" : ""}`}
                                            component="label"
                                            key={scope.name}
                                        >
                                            <Checkbox
                                                    size="small"
                                                    disabled={includedByWildcard}
                                                    checked={scopeSelected}
                                                    onChange={() => toggleScope(scope.name)}
                                            />
                                            <Box className="mythic-api-token-scope-card-copy">
                                                <Box className="mythic-api-token-scope-card-title-row">
                                                    <Typography className="mythic-api-token-scope-card-title">{scope.display_name || scope.name}</Typography>
                                                    <Chip
                                                        className={`mythic-api-token-access-chip mythic-api-token-access-chip-${scope.access || "unknown"}`}
                                                        label={scope.access || "scope"}
                                                        size="small"
                                                    />
                                                </Box>
                                                <Typography className="mythic-api-token-scope-name">
                                                    {scope.name}
                                                </Typography>
                                                <Typography className="mythic-api-token-scope-card-description">
                                                    {scope.description}
                                                </Typography>
                                                {scope.includes?.length > 0 &&
                                                    <Typography className="mythic-api-token-scope-includes">
                                                        Includes {scope.includes.join(", ")}
                                                    </Typography>
                                                }
                                            </Box>
                                        </Box>
                                    )})}
                                </Box>
                            </Box>
                        );
                    })}
                    </>
                    }
                </Box>
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
