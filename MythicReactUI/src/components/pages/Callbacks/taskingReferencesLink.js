import React from 'react';
import {gql, useQuery} from '@apollo/client';
import {Autocomplete, Box, Button, Chip, CircularProgress, DialogActions, DialogContent, DialogTitle, Tab, Tabs, TextField, Typography} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import MemoryIcon from '@mui/icons-material/Memory';
import RouteIcon from '@mui/icons-material/AltRoute';
import {b64DecodeUnicode} from './ResponseDisplay';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import {snackActions} from '../../utilities/Snackbar';

export const linkReferenceKeyword = "link";
export const linkReferenceKinds = {
    callback: "callback",
    payload: "payload",
    edge: "edge",
};

const linkReferenceRegex = /@link:([^\s"']+)/g;

const safeDecode = (value) => {
    try{
        return value ? b64DecodeUnicode(value) : "";
    }catch(error){
        return value || "";
    }
}

const compactUUID = (value) => {
    const text = String(value || "");
    if(text.length <= 12){
        return text;
    }
    return `${text.slice(0, 8)}...${text.slice(-4)}`;
}

const parseLinkReferenceArguments = (body) => {
    const args = {};
    const parts = String(body || "").split(",");
    if(parts.length === 0){
        return undefined;
    }
    for(const part of parts){
        const [rawKey, ...valueParts] = part.split("=");
        if(valueParts.length === 0){
            return undefined;
        }
        const key = String(rawKey || "").trim().toLowerCase();
        const value = valueParts.join("=").trim();
        if(key === "" || value === "" || args[key] !== undefined){
            return undefined;
        }
        args[key] = value;
    }
    return args;
}

const canonicalLinkSelector = (args) => {
    return Object.keys(args).sort().map((key) => `${key}=${args[key]}`).join(",");
}

const getLinkReferenceKind = (args) => {
    if(args.callback !== undefined){
        return Object.keys(args).length === 2 && args.c2 ? linkReferenceKinds.callback : undefined;
    }
    if(args.payload !== undefined){
        return Object.keys(args).length === 3 && args.host && args.c2 ? linkReferenceKinds.payload : undefined;
    }
    if(args.edge !== undefined){
        return Object.keys(args).length === 1 ? linkReferenceKinds.edge : undefined;
    }
    return undefined;
}

const parseLinkReferenceFromMatch = (match) => {
    const args = parseLinkReferenceArguments(match[1]);
    const linkType = args ? getLinkReferenceKind(args) : undefined;
    if(!linkType){
        return undefined;
    }
    return {
        raw: match[0],
        keyword: linkReferenceKeyword,
        selector: canonicalLinkSelector(args),
        field: "",
        index: match.index,
        args,
        linkType,
    };
}

export const parseLinkReferences = (value) => {
    const references = [];
    for(const match of String(value || "").matchAll(linkReferenceRegex)){
        const reference = parseLinkReferenceFromMatch(match);
        if(reference){
            references.push(reference);
        }
    }
    return references;
}

export const isLinkReference = (reference) => reference?.keyword?.toLowerCase() === linkReferenceKeyword;

export const formatLinkCallbackReference = (callbackDisplayID, c2ProfileName) => {
    return `@link:callback=${callbackDisplayID},c2=${c2ProfileName}`;
}

export const formatLinkPayloadReference = (payloadUUID, host, c2ProfileName) => {
    return `@link:payload=${payloadUUID},host=${String(host || "").trim().toUpperCase()},c2=${c2ProfileName}`;
}

export const formatLinkEdgeReference = (edgeID) => {
    return `@link:edge=${edgeID}`;
}

export const linkReferenceDisplayQuery = gql`
query LinkReferenceDisplay($payload_uuids: [String!]!, $edge_ids: [Int!]!) {
    payload(where: {uuid: {_in: $payload_uuids}, deleted: {_eq: false}}) {
        id
        uuid
        description
        payloadtype {
            name
        }
        filemetum {
            filename_text
        }
    }
    callbackgraphedge(where: {id: {_in: $edge_ids}}) {
        id
        end_timestamp
        c2profile {
            id
            name
            is_p2p
        }
        destination {
            id
            display_id
            host
            user
            pid
            payload {
                uuid
                payloadtype {
                    name
                }
                filemetum {
                    filename_text
                }
            }
        }
    }
}
`;

export const emptyLinkReferenceDisplayContext = () => ({
    payloadsByUUID: {},
    edgesByID: {},
});

export const buildLinkReferenceDisplayContext = (data) => {
    const payloadsByUUID = (data?.payload || []).reduce((previous, payload) => {
        previous[payload.uuid] = payload;
        return previous;
    }, {});
    const edgesByID = (data?.callbackgraphedge || []).reduce((previous, edge) => {
        previous[edge.id] = edge;
        return previous;
    }, {});
    return {payloadsByUUID, edgesByID};
}

export const getLinkReferenceLookupVariables = (references) => {
    const payloadUUIDs = new Set();
    const edgeIDs = new Set();
    (references || []).forEach((reference) => {
        if(!isLinkReference(reference)){
            return;
        }
        if(reference.linkType === linkReferenceKinds.payload && reference.args?.payload){
            payloadUUIDs.add(reference.args.payload);
        }
        if(reference.linkType === linkReferenceKinds.edge && reference.args?.edge){
            const edgeID = Number(reference.args.edge);
            if(Number.isSafeInteger(edgeID) && edgeID > 0){
                edgeIDs.add(edgeID);
            }
        }
    });
    return {
        payload_uuids: Array.from(payloadUUIDs).sort((a, b) => a.localeCompare(b)),
        edge_ids: Array.from(edgeIDs).sort((a, b) => a - b),
    };
}

export const linkReferenceLookupVariablesKey = (variables) => {
    return `${(variables?.payload_uuids || []).join(",")}|${(variables?.edge_ids || []).join(",")}`;
}

export const hasLinkReferenceLookupVariables = (variables) => {
    return (variables?.payload_uuids || []).length > 0 || (variables?.edge_ids || []).length > 0;
}

const getLinkReferencePayloadLabel = (reference, linkReferences) => {
    const payload = linkReferences?.payloadsByUUID?.[reference.args.payload];
    return payload ? payloadFilename(payload) : compactUUID(reference.args.payload);
}

const getLinkReferenceEdgeLabel = (reference, linkReferences) => {
    const edge = linkReferences?.edgesByID?.[Number(reference.args.edge)];
    if(edge?.destination?.display_id && edge?.c2profile?.name){
        return `callback ${edge.destination.display_id} via ${edge.c2profile.name}`;
    }
    return `Callback graph edge ${reference.args.edge}`;
}

export const getLinkTaskReferenceReviewLabel = (reference) => {
    switch(reference.linkType){
        case linkReferenceKinds.callback:
            return "AgentConnect callback";
        case linkReferenceKinds.payload:
            return "AgentConnect payload";
        case linkReferenceKinds.edge:
            return "LinkInfo edge";
        default:
            return "Link";
    }
}

export const getLinkTaskReferenceReviewValue = (reference, context={}) => {
    const linkReferences = context.linkReferences || emptyLinkReferenceDisplayContext();
    switch(reference.linkType){
        case linkReferenceKinds.callback:
            return `Callback ${reference.args.callback} via ${reference.args.c2}`;
        case linkReferenceKinds.payload:
            return `${getLinkReferencePayloadLabel(reference, linkReferences)} on ${reference.args.host} via ${reference.args.c2}`;
        case linkReferenceKinds.edge:
            return getLinkReferenceEdgeLabel(reference, linkReferences);
        default:
            return reference.raw;
    }
}

export function LinkReferenceToken({reference, linkReferences}) {
    return (
        <MythicStyledTooltip title={reference.raw}>
            <span className="mythic-reference-token mythic-reference-token-link">
                {getLinkTaskReferenceReviewValue(reference, {linkReferences})}
            </span>
        </MythicStyledTooltip>
    )
}

const linkReferencePickerQuery = gql`
query LinkReferencePicker($operation_id: Int!, $callback_id: Int!) {
    callback(
        where: {active: {_eq: true}, operation_id: {_eq: $operation_id}, c2profileparametersinstances: {c2profile: {is_p2p: {_eq: true}}}},
        order_by: {display_id: desc}
    ) {
        id
        display_id
        host
        description
        agent_callback_id
        payload {
            uuid
            description
            auto_generated
            payloadtype {
                name
            }
            filemetum {
                filename_text
            }
            task {
                id
                display_id
                command_name
            }
        }
        c2profileparametersinstances(where: {c2profile: {is_p2p: {_eq: true}}}) {
            c2profile {
                id
                name
            }
        }
    }
    payload(
        where: {deleted: {_eq: false}, build_phase: {_eq: "success"}, operation_id: {_eq: $operation_id}, c2profileparametersinstances: {c2profile: {is_p2p: {_eq: true}}}},
        order_by: {id: desc}
    ) {
        id
        uuid
        description
        auto_generated
        payloadtype {
            name
        }
        filemetum {
            filename_text
            timestamp
        }
        task {
            id
            display_id
            command_name
        }
        c2profileparametersinstances(where: {c2profile: {is_p2p: {_eq: true}}}) {
            c2profile {
                id
                name
            }
        }
    }
    payloadonhost(
        where: {deleted: {_eq: false}, operation_id: {_eq: $operation_id}, payload: {c2profileparametersinstances: {c2profile: {is_p2p: {_eq: true}}}}},
        order_by: {host: asc}
    ) {
        host
    }
    callbackgraphedge(
        where: {operation_id: {_eq: $operation_id}, _or: [{source_id: {_eq: $callback_id}}, {destination_id: {_eq: $callback_id}}]},
        order_by: {id: desc}
    ) {
        id
        end_timestamp
        c2profile {
            id
            name
            is_p2p
        }
        source {
            id
            display_id
            host
            user
            pid
            description
            payload {
                uuid
                description
                payloadtype {
                    name
                }
                filemetum {
                    filename_text
                }
            }
        }
        destination {
            id
            display_id
            host
            user
            pid
            description
            payload {
                uuid
                description
                payloadtype {
                    name
                }
                filemetum {
                    filename_text
                }
            }
        }
    }
}
`;

const getUniqueP2PProfiles = (instances) => {
    const byName = {};
    (instances || []).forEach((instance) => {
        const profile = instance?.c2profile;
        if(profile?.name){
            byName[profile.name] = profile;
        }
    });
    return Object.values(byName).sort((a, b) => a.name.localeCompare(b.name));
}

const optionMatchesSearch = (option, search) => {
    const normalizedSearch = String(search || "").trim().toLowerCase();
    if(normalizedSearch === ""){
        return true;
    }
    return option.searchText.includes(normalizedSearch);
}

const taskLabel = (task) => {
    if(!task?.display_id){
        return "";
    }
    return `Task ${task.display_id}${task.command_name ? ` ${task.command_name}` : ""}`;
}

const payloadFilename = (payload) => safeDecode(payload?.filemetum?.filename_text) || compactUUID(payload?.uuid);

const callbackUserPidLabel = (callback) => {
    const user = callback?.user || "unknown user";
    const pid = callback?.pid === undefined || callback?.pid === null || callback?.pid === "" ? "" : `PID ${callback.pid}`;
    return [user, pid].filter(Boolean).join(" · ");
}

const buildCallbackOptions = (callbacks) => {
    return (callbacks || []).map((callback) => {
        const profiles = getUniqueP2PProfiles(callback.c2profileparametersinstances);
        const filename = payloadFilename(callback.payload);
        const sourceTask = taskLabel(callback.payload?.task);
        return {
            type: linkReferenceKinds.callback,
            id: `callback-${callback.id}`,
            title: `Callback ${callback.display_id}`,
            subtitle: `${callback.host || ""}${callback.description ? ` · ${callback.description}` : ""}`,
            detail: `${filename} · ${callback.payload?.payloadtype?.name || "payload"}${callback.payload?.auto_generated ? " · generated" : ""}${sourceTask ? ` · ${sourceTask}` : ""}`,
            profiles,
            callback,
            searchText: [
                callback.display_id,
                callback.host,
                callback.description,
                filename,
                callback.payload?.description,
                callback.payload?.payloadtype?.name,
                sourceTask,
                profiles.map((profile) => profile.name).join(" "),
            ].join(" ").toLowerCase(),
        };
    });
}

const buildPayloadOptions = (payloads) => {
    return (payloads || []).map((payload) => {
        const profiles = getUniqueP2PProfiles(payload.c2profileparametersinstances);
        const filename = payloadFilename(payload);
        const sourceTask = taskLabel(payload.task);
        return {
            type: linkReferenceKinds.payload,
            id: `payload-${payload.id}`,
            title: filename,
            subtitle: payload.description || compactUUID(payload.uuid),
            detail: `${payload.payloadtype?.name || "payload"}${payload.auto_generated ? " · generated" : ""}${sourceTask ? ` · ${sourceTask}` : ""}`,
            profiles,
            payload,
            searchText: [
                payload.uuid,
                filename,
                payload.description,
                payload.payloadtype?.name,
                payload.auto_generated ? "generated" : "",
                sourceTask,
                profiles.map((profile) => profile.name).join(" "),
            ].join(" ").toLowerCase(),
        };
    });
}

const edgePeer = (edge, callbackID) => {
    return String(edge.source?.id) === String(callbackID) ? edge.destination : edge.source;
}

const buildEdgeOptions = (edges, callbackID) => {
    return (edges || []).filter((edge) => edge.c2profile?.is_p2p).map((edge) => {
        const peer = edgePeer(edge, callbackID);
        const filename = payloadFilename(peer?.payload);
        const connectionActive = !edge.end_timestamp;
        const edgeSummary = {
            edgeLabel: `Edge ${edge.id}`,
            host: peer?.host || "Unknown host",
            callbackLabel: peer?.display_id ? `Callback ${peer.display_id}` : "Callback unknown",
            userPidLabel: callbackUserPidLabel(peer),
            payloadType: peer?.payload?.payloadtype?.name || "payload",
            connectionLabel: connectionActive ? "Active" : "Inactive",
            connectionActive,
            c2ProfileName: edge.c2profile?.name || "c2",
            filename,
            description: peer?.description || "",
        };
        return {
            type: linkReferenceKinds.edge,
            id: `edge-${edge.id}`,
            title: edgeSummary.host,
            subtitle: `${edgeSummary.callbackLabel} · ${edgeSummary.userPidLabel}`,
            detail: `${edgeSummary.payloadType} · ${edgeSummary.connectionLabel} · ${edgeSummary.c2ProfileName} · ${filename}`,
            profiles: edge.c2profile?.name ? [edge.c2profile] : [],
            edgeSummary,
            edge,
            searchText: [
                edge.id,
                edge.c2profile?.name,
                peer?.display_id,
                peer?.host,
                peer?.user,
                peer?.pid,
                peer?.description,
                filename,
                peer?.payload?.payloadtype?.name,
                edge.end_timestamp ? "inactive" : "active",
            ].join(" ").toLowerCase(),
        };
    });
}

const getHostOptions = (data) => {
    const hosts = new Set();
    (data?.callback || []).forEach((callback) => {
        if(callback.host){
            hosts.add(String(callback.host).toUpperCase());
        }
    });
    (data?.payloadonhost || []).forEach((payloadOnHost) => {
        if(payloadOnHost.host){
            hosts.add(String(payloadOnHost.host).toUpperCase());
        }
    });
    return Array.from(hosts).sort((a, b) => a.localeCompare(b));
}

function LinkInfoEdgeOptionSummary({option, icon}) {
    const edgeSummary = option.edgeSummary;
    const secondaryDetails = [
        edgeSummary.edgeLabel,
        edgeSummary.c2ProfileName,
        edgeSummary.filename,
        edgeSummary.description,
    ].filter(Boolean).join(" · ");
    return (
        <Box className="mythic-link-reference-edge-summary">
            <Box className="mythic-link-reference-edge-primary">
                <span className="mythic-link-reference-icon">{icon}</span>
                <Typography component="span" className="mythic-link-reference-edge-host">
                    {edgeSummary.host}
                </Typography>
                <Chip size="small" variant="outlined" label={edgeSummary.callbackLabel} className="mythic-link-reference-edge-chip" />
                <Chip size="small" variant="outlined" label={edgeSummary.userPidLabel} className="mythic-link-reference-edge-chip" />
                <Chip size="small" variant="outlined" label={edgeSummary.payloadType} className="mythic-link-reference-edge-chip" />
                <Chip
                    size="small"
                    variant="outlined"
                    label={edgeSummary.connectionLabel}
                    className={`mythic-link-reference-edge-chip mythic-link-reference-edge-state-${edgeSummary.connectionActive ? "active" : "inactive"}`}
                />
            </Box>
            <Typography component="span" className="mythic-link-reference-edge-secondary">
                {secondaryDetails}
            </Typography>
        </Box>
    )
}

function LinkReferenceOption({option, host, onSelect}) {
    const icon = option.type === linkReferenceKinds.callback ? <DeviceHubIcon fontSize="small" /> :
        option.type === linkReferenceKinds.payload ? <MemoryIcon fontSize="small" /> :
        <RouteIcon fontSize="small" />;
    const requiresHost = option.type === linkReferenceKinds.payload;
    const hostReady = !requiresHost || String(host || "").trim() !== "";
    const onSelectWithProfile = (profile) => {
        if(option.type === linkReferenceKinds.callback){
            onSelect(formatLinkCallbackReference(option.callback.display_id, profile.name));
            return;
        }
        if(option.type === linkReferenceKinds.payload){
            onSelect(formatLinkPayloadReference(option.payload.uuid, host, profile.name));
            return;
        }
        onSelect(formatLinkEdgeReference(option.edge.id));
    }
    const onSelectFromRow = () => {
        if(requiresHost && !hostReady){
            snackActions.warning("Select or enter the host for this payload link");
            return;
        }
        if(option.profiles.length === 1){
            onSelectWithProfile(option.profiles[0]);
            return;
        }
        if(option.profiles.length > 1){
            snackActions.warning("Select which C2 profile to use for this link");
        }
    }
    return (
        <Box className={`mythic-link-reference-row${option.profiles.length > 0 ? " mythic-link-reference-row-selectable" : ""}`}
             onClick={onSelectFromRow}
             onKeyDown={(event) => {
                 if(event.key === "Enter" || event.key === " "){
                     event.preventDefault();
                     onSelectFromRow();
                 }
             }}
             role="button"
             tabIndex={option.profiles.length > 0 ? 0 : -1}>
            {option.type === linkReferenceKinds.edge ? (
                <LinkInfoEdgeOptionSummary option={option} icon={icon} />
            ) : (
                <>
                    <Box className="mythic-link-reference-row-header">
                        <Typography component="span" className="mythic-link-reference-title">
                            <span className="mythic-link-reference-icon">{icon}</span>
                            {option.title}
                        </Typography>
                        <Typography component="span" className="mythic-link-reference-subtitle">
                            {option.subtitle}
                        </Typography>
                    </Box>
                    <Typography component="span" className="mythic-link-reference-detail" title={option.detail}>
                        {option.detail}
                    </Typography>
                </>
            )}
            <Box className="mythic-link-reference-actions">
                {option.profiles.map((profile) => (
                    <Button
                        key={profile.name}
                        size="small"
                        variant="outlined"
                        color="inherit"
                        disabled={!hostReady}
                        className="mythic-link-reference-action-button"
                        startIcon={<LinkIcon fontSize="small" />}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onSelectWithProfile(profile);
                        }}
                    >
                        {option.type === linkReferenceKinds.edge ? "Use edge" : `Use ${profile.name}`}
                    </Button>
                ))}
                {!hostReady &&
                    <Typography component="span" className="mythic-link-reference-requirement">
                        Payload host required
                    </Typography>
                }
            </Box>
        </Box>
    )
}

export function LinkReferencePickerDialog({operation_id, callback_id, parameterType, defaultHost="", onClose, onSelect}) {
    const [search, setSearch] = React.useState("");
    const [host, setHost] = React.useState(String(defaultHost || "").toUpperCase());
    const [agentConnectTab, setAgentConnectTab] = React.useState(linkReferenceKinds.callback);
    const {data, loading, error} = useQuery(linkReferencePickerQuery, {
        fetchPolicy: "no-cache",
        skip: !operation_id || !callback_id,
        variables: {operation_id, callback_id},
    });
    const callbackOptions = React.useMemo(() => buildCallbackOptions(data?.callback), [data]);
    const payloadOptions = React.useMemo(() => buildPayloadOptions(data?.payload), [data]);
    const edgeOptions = React.useMemo(() => buildEdgeOptions(data?.callbackgraphedge, callback_id), [callback_id, data]);
    const hostOptions = React.useMemo(() => getHostOptions(data), [data]);
    const options = React.useMemo(() => {
        if(parameterType === "LinkInfo"){
            return edgeOptions;
        }
        if(agentConnectTab === linkReferenceKinds.payload){
            return payloadOptions;
        }
        return callbackOptions;
    }, [agentConnectTab, callbackOptions, edgeOptions, parameterType, payloadOptions]);
    const visibleOptions = React.useMemo(() => {
        return options.filter((option) => optionMatchesSearch(option, search));
    }, [options, search]);
    const isAgentConnect = parameterType === "AgentConnect";
    const searchPlaceholder = !isAgentConnect ? "Edges, callbacks, C2 profiles" :
        agentConnectTab === linkReferenceKinds.payload ? "Payloads, C2 profiles" : "Callbacks, C2 profiles";
    return (
        <>
            <DialogTitle>{isAgentConnect ? "Select Payload / Callback for Linking" : "Select Existing Edge"}</DialogTitle>
            <DialogContent dividers className="mythic-reference-picker-dialog mythic-link-reference-picker-dialog">
                <Box className="mythic-link-reference-picker-header">
                    {isAgentConnect &&
                        <Tabs
                            value={agentConnectTab}
                            onChange={(event, newValue) => setAgentConnectTab(newValue)}
                            className="mythic-link-reference-tabs"
                        >
                            <Tab value={linkReferenceKinds.callback} label={`Callbacks (${callbackOptions.length})`} />
                            <Tab value={linkReferenceKinds.payload} label={`Payloads (${payloadOptions.length})`} />
                        </Tabs>
                    }
                    <Box className="mythic-link-reference-search-row">
                        <TextField
                            size="small"
                            fullWidth
                            autoFocus
                            color="secondary"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            label="Search"
                            placeholder={searchPlaceholder}
                            className="mythic-link-reference-search-field"
                        />
                        <Chip size="small" variant="outlined" label={loading ? "Loading" : `${visibleOptions.length} shown`} className="mythic-tasking-reference-chip" />
                    </Box>
                    {isAgentConnect && agentConnectTab === linkReferenceKinds.payload &&
                        <Box className="mythic-link-reference-host-row">
                            <Typography component="span" className="mythic-link-reference-host-label">
                                Connect to the following payload on this host
                            </Typography>
                            <Autocomplete
                                freeSolo
                                size="small"
                                options={hostOptions}
                                inputValue={host}
                                onInputChange={(event, newValue) => setHost(String(newValue || "").toUpperCase())}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        color="secondary"
                                        label="Host"
                                        placeholder="HOSTNAME"
                                    />
                                )}
                                className="mythic-link-reference-host-field"
                            />
                        </Box>
                    }
                </Box>
                {loading ? (
                    <Box display="flex" justifyContent="center" padding={2}>
                        <CircularProgress size={24} />
                    </Box>
                ) : error ? (
                    <Typography component="div" color="error">Failed to load link options.</Typography>
                ) : (
                    <Box className="mythic-link-reference-results">
                        {visibleOptions.map((option) => (
                            <LinkReferenceOption key={option.id} option={option} host={host} onSelect={onSelect} />
                        ))}
                        {visibleOptions.length === 0 &&
                            <Typography component="div">No matching link references.</Typography>
                        }
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
            </DialogActions>
        </>
    )
}
