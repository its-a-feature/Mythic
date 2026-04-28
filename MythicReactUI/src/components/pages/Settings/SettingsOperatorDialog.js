import React from 'react';
import {Box, Checkbox, Chip, Divider, FormControlLabel, InputAdornment, TextField, Typography} from '@mui/material';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {CreateInviteLinksDialog} from "./InviteLinksDialog";
import SearchIcon from '@mui/icons-material/Search';
import {gql, useQuery} from "@apollo/client";

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
            {props.title}
            <MythicStyledTooltip tooltipStyle={{float: "right", display: "inline-block"}}
                                 title={"Generate invite link for somebody to create their own username/password"}>
                <Button onClick={createInviteLink} variant={"contained"}>
                    Generate Invite Link
                </Button>
            </MythicStyledTooltip>
            {openInviteLinkDialog &&
                <MythicDialog open={openInviteLinkDialog}
                              fullWidth={true}
                              onClose={()=>{setOpenInviteLinkDialog(false);}}
                              innerDialog={<CreateInviteLinksDialog onClose={()=>{setOpenInviteLinkDialog(false);}} create={true}  {...props}/>}
                />
            }
        </DialogTitle>

        <DialogContent dividers={true}>
          <DialogContentText>
                <b>Note:</b> If you're an admin, you don't need to know a user's old password to set a new one.
          </DialogContentText>
            <form autoComplete={"off"}>
                <MythicTextField
                    autoComplete={false}
                    autoFocus
                    placeholder={props.username}
                    value={username}
                    onChange={onUsernameChange}
                    margin="dense"
                    id="username"
                    name="username"
                />
                {!props.userIsAdmin &&
                    <MythicTextField
                        margin="dense"
                        id="passwordOld"
                        value={passwordOld}
                        onChange={onPasswordOldChange}
                        name={props.title === "New Operator" ? "password" : "old password"}
                        type="password"
                    />
                }

                <MythicTextField
                    margin="dense"
                    id="passwordNew"
                    value={passwordNew}
                    onChange={onPasswordNewChange}
                    name={props.title === "New Operator" ? "password again" : "new password"}
                    type="password"
                />
                <MythicTextField
                    margin="dense"
                    id="email"
                    value={email}
                    onChange={onEmailChange}
                    name={"email"}
                    type="text"
                />
            </form>

        </DialogContent>
        <DialogActions>
          <Button onClick={props.handleClose} variant="contained" color="primary">
            Cancel
          </Button>
          <Button onClick={onAccept} variant="contained" color="success">
            {props.title === "New Operator" ? "Create" : "Update"}
          </Button>
        </DialogActions>
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
                <DialogContentText>
                    <b>Note:</b> Bot accounts cannot log in. They can be assigned to operations and perform actions as part of workflows (once approved).
                </DialogContentText>
                <MythicTextField
                    autoFocus
                    placeholder={props.username}
                    value={username}
                    onChange={onUsernameChange}
                    margin="dense"
                    id="username"
                    name="username"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={props.handleClose} variant="contained" color="primary">
                    Cancel
                </Button>
                <Button onClick={onAccept} variant="contained" color="success">
                    {props.title === "New Bot Account" ? "Create" : "Update"}
                </Button>
            </DialogActions>
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

    const onUsernameChange = (name, value, error) => {
        setName(value);
    }

    const onAccept = () =>{
        props.onAccept(name, selectedScopes);
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
            <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
            <DialogContent dividers={true} >
                <MythicTextField
                    autoFocus
                    placeholder={props.name}
                    value={name}
                    onChange={onUsernameChange}
                    margin="dense"
                    id="name"
                    name="name"
                />
                <Box sx={{display: "flex", alignItems: "center", gap: 1, mt: 2, mb: 1}}>
                    <Typography variant="subtitle2" sx={{flexGrow: 1}}>
                        Scopes
                    </Typography>
                    <Chip size="small" label={`${selectedScopes.length} selected`} />
                    <Button size="small" onClick={selectVisibleScopes}>
                        Select Visible
                    </Button>
                    <Button size="small" onClick={clearScopes}>
                        Clear
                    </Button>
                </Box>
                <DialogContentText sx={{mb: 1}}>
                    Tokens with no scopes are created with no API access. Write scopes include read access for the same resource.
                </DialogContentText>
                <TextField
                    size="small"
                    fullWidth
                    value={filter}
                    onChange={onFilterChange}
                    placeholder="Search scopes"
                    disabled={scopeLoading || scopeQueryError !== undefined || scopeData?.apiTokenScopeDefinitions?.status === "error"}
                    InputProps={{startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>}}
                    sx={{mb: 1}}
                />
                <Box sx={{border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, maxHeight: "45vh", overflowY: "auto"}}>
                    {(scopeLoading || scopeQueryError !== undefined || scopeData?.apiTokenScopeDefinitions?.status === "error") &&
                        <Box sx={{p: 1.25}}>
                            <Typography variant="body2" color={scopeLoading ? "text.secondary" : "error"}>
                                {scopeLoading ? "Loading scopes..." : (scopeQueryError?.message || scopeData?.apiTokenScopeDefinitions?.error || "Failed to load scopes")}
                            </Typography>
                        </Box>
                    }
                    {!scopeLoading && scopeQueryError === undefined && scopeData?.apiTokenScopeDefinitions?.status !== "error" &&
                    <>
                    <Box sx={{p: 1.25}}>
                        <FormControlLabel
                            control={<Checkbox
                                disabled={!grantableWildcards.includes("*")}
                                checked={scopeIsSelected("*")}
                                onChange={() => toggleScope("*")}
                            />}
                            label={
                                <Box>
                                    <Typography variant="body2">Full access (*)</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Grants every current and future API scope available to this operator.
                                    </Typography>
                                </Box>
                            }
                        />
                    </Box>
                    <Divider />
                    {visibleResources.map(resource => {
                        const resourceWildcard = `${resource}.*`;
                        const canGrantResourceWildcard = grantableWildcards.includes(resourceWildcard);
                        const resourceScopes = groupedScopes[resource].sort((a, b) => a.access.localeCompare(b.access));
                        return (
                            <Box key={resource} sx={{p: 1.25, borderBottom: theme => `1px solid ${theme.palette.divider}`}}>
                                <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 0.5}}>
                                    <Typography variant="subtitle2" sx={{textTransform: "capitalize", flexGrow: 1}}>
                                        {resource.split("_").join(" ")}
                                    </Typography>
                                    <FormControlLabel
                                        sx={{mr: 0}}
                                        control={<Checkbox
                                            size="small"
                                            disabled={scopeIsSelected("*") || !canGrantResourceWildcard}
                                            checked={scopeIsSelected(resourceWildcard)}
                                            onChange={() => toggleScope(resourceWildcard)}
                                        />}
                                        label={<Typography variant="body2">{resourceWildcard}</Typography>}
                                    />
                                </Box>
                                <Box sx={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 1}}>
                                    {resourceScopes.map(scope => (
                                        <Box
                                            key={scope.name}
                                            sx={{
                                                border: theme => `1px solid ${theme.palette.divider}`,
                                                borderRadius: 1,
                                                px: 1,
                                                py: 0.5,
                                            }}
                                        >
                                            <FormControlLabel
                                                sx={{alignItems: "flex-start", mr: 0}}
                                                control={<Checkbox
                                                    size="small"
                                                    disabled={scopeIsSelected("*") || scopeIsSelected(resourceWildcard)}
                                                    checked={scopeIsSelected(scope.name) || scopeIsSelected("*") || scopeIsSelected(resourceWildcard)}
                                                    onChange={() => toggleScope(scope.name)}
                                                />}
                                                label={
                                                    <Box>
                                                        <Typography variant="body2">{scope.display_name || scope.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {scope.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{display: "block"}}>
                                                            {scope.description}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        );
                    })}
                    </>
                    }
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.handleClose} variant="contained" color="primary">
                    Cancel
                </Button>
                <Button onClick={onAccept} variant="contained" color="success">
                    {"Create New"}
                </Button>
            </DialogActions>
        </React.Fragment>
    );
}
