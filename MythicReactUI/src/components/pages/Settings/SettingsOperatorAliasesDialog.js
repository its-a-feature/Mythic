import React from 'react';
import {gql, useLazyQuery, useMutation, useQuery} from '@apollo/client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {snackActions} from '../../utilities/Snackbar';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import {MythicEmptyState, MythicLoadingState} from '../../MythicComponents/MythicStateDisplay';
import {downloadFileFromMemory} from '../../utilities/Clipboard';

const OPERATOR_ALIAS_QUERY = gql`
query OperatorAliasSettingsQuery($operator_id: Int!) {
  operator_alias(where: {operator_id: {_eq: $operator_id}}, order_by: [{consuming_container_id: asc_nulls_last}, {payloadtype_id: asc_nulls_last}, {alias_type: asc}, {name: asc}, {active: desc}, {alias: asc}]) {
    id
    operator_id
    name
    alias
    alias_type
    payloadtype_id
    consuming_container_id
    active
    payloadtype {
      id
      name
    }
    consuming_container {
      id
      name
    }
  }
  payloadtype(where: {deleted: {_eq: false}}, order_by: {name: asc}) {
    id
    name
  }
  consuming_container(where: {deleted: {_eq: false}, type: {_eq: "chat"}}, order_by: {name: asc}) {
    id
    name
    container_running
  }
}
`;

const EXPORT_OPERATOR_ALIASES = gql`
query ExportOperatorAliases {
  exportOperatorAliases {
    status
    error
    config
  }
}
`;

const IMPORT_OPERATOR_ALIASES = gql`
mutation ImportOperatorAliases($config: String!) {
  importOperatorAliases(config: $config) {
    status
    error
    imported_count
    skipped_count
    skipped_duplicate_count
    skipped_missing_count
    skipped_invalid_count
    skipped
  }
}
`;

const CREATE_OPERATOR_ALIAS = gql`
mutation CreateOperatorAlias($name: String!, $alias: String!, $alias_type: String, $payloadtype_id: Int, $consuming_container_id: Int, $active: Boolean) {
  operatorAliasCreate(name: $name, alias: $alias, alias_type: $alias_type, payloadtype_id: $payloadtype_id, consuming_container_id: $consuming_container_id, active: $active) {
    status
    error
    id
  }
}
`;

const UPDATE_OPERATOR_ALIAS = gql`
mutation UpdateOperatorAlias($id: Int!, $name: String!, $alias: String!, $alias_type: String, $payloadtype_id: Int, $consuming_container_id: Int, $active: Boolean!) {
  operatorAliasUpdate(id: $id, name: $name, alias: $alias, alias_type: $alias_type, payloadtype_id: $payloadtype_id, consuming_container_id: $consuming_container_id, active: $active) {
    status
    error
    id
  }
}
`;

const DELETE_OPERATOR_ALIAS = gql`
mutation DeleteOperatorAlias($id: Int!) {
  operatorAliasDelete(id: $id) {
    status
    error
    id
  }
}
`;

const normalizeAliasName = (value) => value.trim().replace(/^[/@]+/, '').toLowerCase();

export function SettingsOperatorAliasesDialog(props) {
    const operatorID = props.id || props.me?.user?.id;
    const fileInputRef = React.useRef(null);
    const [editingID, setEditingID] = React.useState(null);
    const [aliasName, setAliasName] = React.useState("");
    const [aliasText, setAliasText] = React.useState("");
    const [aliasType, setAliasType] = React.useState("command");
    const [scopeType, setScopeType] = React.useState(props.initialScopeType || "global");
    const [payloadTypeID, setPayloadTypeID] = React.useState("");
    const [containerID, setContainerID] = React.useState("");
    const [active, setActive] = React.useState(true);
    const {data, loading, refetch} = useQuery(OPERATOR_ALIAS_QUERY, {
        variables: {operator_id: operatorID},
        fetchPolicy: "no-cache",
        skip: !operatorID,
    });
    const [createAlias] = useMutation(CREATE_OPERATOR_ALIAS);
    const [updateAlias] = useMutation(UPDATE_OPERATOR_ALIAS);
    const [deleteAlias] = useMutation(DELETE_OPERATOR_ALIAS);
    const [exportAliases] = useLazyQuery(EXPORT_OPERATOR_ALIASES, {fetchPolicy: "no-cache"});
    const [importAliases] = useMutation(IMPORT_OPERATOR_ALIASES);
    const aliases = React.useMemo(() => data?.operator_alias || [], [data]);
    const payloadTypes = React.useMemo(() => data?.payloadtype || [], [data]);
    const chatContainers = React.useMemo(() => data?.consuming_container || [], [data]);
    React.useEffect(() => {
        if(scopeType === "chat" && containerID === "" && chatContainers.length > 0){
            setContainerID(`${chatContainers[0].id}`);
        }
        if(scopeType === "callback" && payloadTypeID === "" && payloadTypes.length > 0){
            const initialPayloadType = payloadTypes.find((payloadType) => payloadType.name === props.initialPayloadTypeName);
            setPayloadTypeID(`${initialPayloadType?.id || payloadTypes[0].id}`);
        }
    }, [scopeType, containerID, payloadTypeID, chatContainers, payloadTypes, props.initialPayloadTypeName]);
    const resetForm = () => {
        setEditingID(null);
        setAliasName("");
        setAliasText("");
        setAliasType("command");
        setScopeType(props.initialScopeType || "global");
        setPayloadTypeID(props.initialPayloadTypeID ? `${props.initialPayloadTypeID}` : "");
        setContainerID(props.initialContainerID ? `${props.initialContainerID}` : "");
        setActive(true);
    };
    const editAlias = (alias) => {
        setEditingID(alias.id);
        setAliasName(alias.name || "");
        setAliasText(alias.alias || "");
        setAliasType(alias.alias_type || "command");
        if(alias.consuming_container_id){
            setScopeType("chat");
            setContainerID(`${alias.consuming_container_id}`);
            setPayloadTypeID("");
        } else if(alias.payloadtype_id) {
            setScopeType("callback");
            setPayloadTypeID(`${alias.payloadtype_id}`);
            setContainerID("");
        } else {
            setScopeType("global");
            setPayloadTypeID("");
            setContainerID("");
        }
        setActive(Boolean(alias.active));
    };
    const variablesForSubmit = () => {
        const normalizedName = normalizeAliasName(aliasName);
        return {
            name: normalizedName,
            alias: aliasText.trim(),
            alias_type: aliasType,
            payloadtype_id: scopeType === "callback" ? Number(payloadTypeID) : null,
            consuming_container_id: scopeType === "chat" ? Number(containerID) : null,
            active,
        };
    };
    const submitAlias = () => {
        const variables = variablesForSubmit();
        if(variables.name === "" || variables.alias === ""){
            snackActions.warning("Name and alias are required");
            return;
        }
        if((scopeType === "chat" && !variables.consuming_container_id) || (scopeType === "callback" && !variables.payloadtype_id)){
            snackActions.warning("Select an alias scope");
            return;
        }
        const mutation = editingID ? updateAlias : createAlias;
        const mutationVariables = editingID ? {id: editingID, ...variables} : variables;
        mutation({variables: mutationVariables}).then(({data: mutationData}) => {
            const result = mutationData?.operatorAliasUpdate || mutationData?.operatorAliasCreate;
            if(result?.status === "success"){
                snackActions.success(editingID ? "Alias updated" : "Alias created");
                resetForm();
                refetch();
            } else {
                snackActions.error(result?.error || "Alias action failed");
            }
        }).catch((error) => snackActions.error(error.message));
    };
    const removeAlias = (alias) => {
        deleteAlias({variables: {id: alias.id}}).then(({data: mutationData}) => {
            const result = mutationData?.operatorAliasDelete;
            if(result?.status === "success"){
                snackActions.success("Alias deleted");
                if(editingID === alias.id){
                    resetForm();
                }
                refetch();
            } else {
                snackActions.error(result?.error || "Failed to delete alias");
            }
        }).catch((error) => snackActions.error(error.message));
    };
    const toggleAliasActive = (alias, nextActive) => {
        updateAlias({variables: {
            id: alias.id,
            name: alias.name,
            alias: alias.alias,
            alias_type: alias.alias_type || "command",
            payloadtype_id: alias.payloadtype_id || null,
            consuming_container_id: alias.consuming_container_id || null,
            active: nextActive,
        }}).then(({data: mutationData}) => {
            const result = mutationData?.operatorAliasUpdate;
            if(result?.status === "success"){
                snackActions.success(nextActive ? "Alias activated" : "Alias deactivated");
                if(editingID === alias.id){
                    setActive(nextActive);
                }
                refetch();
            } else {
                snackActions.error(result?.error || "Failed to update alias");
            }
        }).catch((error) => snackActions.error(error.message));
    };
    const exportOperatorAliases = () => {
        exportAliases().then(({data: exportData}) => {
            const result = exportData?.exportOperatorAliases;
            if(result?.status === "success"){
                downloadFileFromMemory(result.config || JSON.stringify({version: 1, aliases: []}, null, 2), "operator_aliases.json");
            } else {
                snackActions.error(result?.error || "Failed to export aliases");
            }
        }).catch((error) => snackActions.error(error.message));
    };
    const importOperatorAliases = (evt) => {
        const file = evt.target.files?.[0];
        if(!file){
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            importAliases({variables: {config: String(e.target.result)}}).then(({data: importData}) => {
                const result = importData?.importOperatorAliases;
                if(result?.status === "success"){
                    snackActions.success(`Imported ${result.imported_count || 0} aliases; skipped ${result.skipped_count || 0}`);
                    refetch();
                } else {
                    snackActions.error(result?.error || "Failed to import aliases");
                }
            }).catch((error) => snackActions.error(error.message));
        };
        reader.readAsText(file);
        evt.target.value = "";
    };
    const formDisabled = normalizeAliasName(aliasName) === "" ||
        aliasText.trim() === "" ||
        (scopeType === "chat" && containerID === "") ||
        (scopeType === "callback" && payloadTypeID === "");
    return (
        <>
            <DialogTitle>
                <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1}}>
                    <Typography component="div" variant="h6">Operator Aliases</Typography>
                    <Box sx={{display: "flex", gap: 1}}>
                        <MythicStyledTooltip title="Export aliases">
                            <Button size="small" variant="outlined" startIcon={<CloudDownloadIcon fontSize="small" />} onClick={exportOperatorAliases}>
                                Export
                            </Button>
                        </MythicStyledTooltip>
                        <MythicStyledTooltip title="Import aliases">
                            <Button size="small" variant="outlined" startIcon={<CloudUploadIcon fontSize="small" />} onClick={() => fileInputRef.current?.click()}>
                                Import
                                <input ref={fileInputRef} onChange={importOperatorAliases} type="file" accept="application/json,.json" hidden />
                            </Button>
                        </MythicStyledTooltip>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent dividers sx={{display: "flex", flexDirection: "column", gap: 2}}>
                <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 1.5}}>
                    <TextField
                        size="small"
                        label="Name"
                        value={aliasName}
                        onChange={(e) => setAliasName(e.target.value)}
                        InputProps={aliasType === "generic" ? {startAdornment: <InputAdornment position="start">@</InputAdornment>} : undefined}
                    />
                    <TextField
                        size="small"
                        label="Alias"
                        value={aliasText}
                        onChange={(e) => setAliasText(e.target.value)}
                    />
                    <FormControl size="small">
                        <InputLabel>Type</InputLabel>
                        <Select label="Type" value={aliasType} onChange={(e) => setAliasType(e.target.value)}>
                            <MenuItem value="command">Command</MenuItem>
                            <MenuItem value="generic">Generic</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small">
                        <InputLabel>Scope</InputLabel>
                        <Select label="Scope" value={scopeType} onChange={(e) => setScopeType(e.target.value)}>
                            <MenuItem value="global">Global</MenuItem>
                            <MenuItem value="chat">AI chat container</MenuItem>
                            <MenuItem value="callback">Callback payload type</MenuItem>
                        </Select>
                    </FormControl>
                    {scopeType === "chat" ? (
                        <FormControl size="small">
                            <InputLabel>Chat container</InputLabel>
                            <Select label="Chat container" value={containerID} onChange={(e) => setContainerID(e.target.value)}>
                                {chatContainers.map((container) => (
                                    <MenuItem value={`${container.id}`} key={container.id}>
                                        {container.name}{container.container_running ? "" : " (offline)"}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : scopeType === "callback" ? (
                        <FormControl size="small">
                            <InputLabel>Payload type</InputLabel>
                            <Select label="Payload type" value={payloadTypeID} onChange={(e) => setPayloadTypeID(e.target.value)}>
                                {payloadTypes.map((payloadType) => (
                                    <MenuItem value={`${payloadType.id}`} key={payloadType.id}>{payloadType.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : (
                        <Box />
                    )}
                    <FormControlLabel
                        control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
                        label="Active"
                    />
                    <Box sx={{display: "flex", justifyContent: "flex-end", gap: 1}}>
                        {editingID &&
                            <Button startIcon={<RestartAltIcon />} onClick={resetForm}>Reset</Button>
                        }
                        <Button variant="contained" disabled={formDisabled} onClick={submitAlias}>
                            {editingID ? "Update" : "Add"}
                        </Button>
                    </Box>
                </Box>
                {loading ? (
                    <MythicLoadingState compact />
                ) : aliases.length === 0 ? (
                    <MythicEmptyState compact title="No aliases configured" />
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Alias</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Scope</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {aliases.map((alias) => (
                                <TableRow key={alias.id} hover selected={editingID === alias.id}>
                                    <TableCell>
                                        <Typography variant="body2" sx={{fontFamily: "monospace"}}>{alias.alias_type === "generic" ? "@" : ""}{alias.name}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{fontFamily: "monospace", whiteSpace: "pre-wrap"}}>{alias.alias}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {alias.alias_type || "command"}
                                    </TableCell>
                                    <TableCell>
                                        {alias.consuming_container_id ? `AI: ${alias.consuming_container?.name || alias.consuming_container_id}` : alias.payloadtype_id ? `Callback: ${alias.payloadtype?.name || alias.payloadtype_id}` : "Global"}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
                                            <Switch
                                                checked={Boolean(alias.active)}
                                                onChange={(e) => toggleAliasActive(alias, e.target.checked)}
                                                inputProps={{'aria-label': 'Toggle alias active state'}}
                                            />
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        <MythicStyledTooltip title="Edit alias">
                                            <IconButton size="small" onClick={() => editAlias(alias)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </MythicStyledTooltip>
                                        <MythicStyledTooltip title="Delete alias">
                                            <IconButton size="small" color="error" onClick={() => removeAlias(alias)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </MythicStyledTooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={props.onClose}>Close</Button>
            </DialogActions>
        </>
    );
}
