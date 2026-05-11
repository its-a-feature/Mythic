import React, {useEffect, useCallback, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import ELK from 'elkjs/lib/elk.bundled.js';
import {useTheme} from '@mui/material/styles';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { Typography } from '@mui/material';
import { ReactFlow,
    EdgeLabelRenderer,getBezierPath, BaseEdge,
    Handle, Position, useReactFlow, ReactFlowProvider, Panel,
    MiniMap, Controls, ControlButton, useUpdateNodeInternals,
    getConnectedEdges, useNodesState, useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SwapCallsIcon from '@mui/icons-material/SwapCalls';
import WifiIcon from '@mui/icons-material/Wifi';
import InsertLinkTwoToneIcon from '@mui/icons-material/InsertLinkTwoTone';
import {snackActions} from "../../utilities/Snackbar";
import {TaskLabelFlat, getLabelText} from './TaskDisplay';
import {MythicDialog, MythicViewJSONAsTableDialog} from "../../MythicComponents/MythicDialog";
import {ManuallyAddEdgeDialog} from "./ManuallyAddEdgeDialog";
import {TaskParametersDialog} from "./TaskParametersDialog";
import {addEdgeMutation, createTaskingMutation, hideCallbackMutation, removeEdgeMutation} from "./CallbackMutations";
import {loadedLinkCommandsQuery} from "./CallbacksGraph";
import {useMutation, gql, useLazyQuery } from '@apollo/client';
import {TaskFromUIButton} from "./TaskFromUIButton";
import {MythicDisplayTextDialog} from "../../MythicComponents/MythicDisplayTextDialog";
import {ResponseDisplayTableDialogTable} from "./ResponseDisplayTableDialogTable";
import SendIcon from '@mui/icons-material/Send';
import {getIconName} from "./ResponseDisplayTable";
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { MythicAgentSVGIconNoTooltip} from "../../MythicComponents/MythicAgentSVGIcon";
import {ImageWithAuth} from "../../utilities/ImageWithAuth";
import {MythicDialogButton, MythicDialogFooter} from "../../MythicComponents/MythicDialogLayout";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const getEdgeEndpointIds = (edge) => [
    String(edge?.source?.id || ""),
    String(edge?.destination?.id || ""),
];
const getReachableCallbackIds = (edges, callbackId) => {
    const startId = String(callbackId || "");
    if(startId.length === 0){return new Set()}
    const reachable = new Set([startId]);
    let foundMore = true;
    while(foundMore){
        foundMore = false;
        for(let i = 0; i < edges.length; i++){
            const edge = edges[i];
            const [sourceId, destinationId] = getEdgeEndpointIds(edge);
            if(reachable.has(sourceId) && !reachable.has(destinationId)){
                reachable.add(destinationId);
                foundMore = true;
            }
            if(reachable.has(destinationId) && !reachable.has(sourceId)){
                reachable.add(sourceId);
                foundMore = true;
            }
        }
    }
    return reachable;
};
const getC2RouteSummary = (callback, callbackgraphedges) => {
    const edges = callbackgraphedges || [];
    const callbackId = String(callback?.id || "");
    const activeEdges = edges.filter((edge) => edge.end_timestamp === null);
    const endedEdges = edges.filter((edge) => edge.end_timestamp !== null);
    const activeReachableIds = getReachableCallbackIds(activeEdges, callbackId);
    const historicalReachableIds = getReachableCallbackIds(edges, callbackId);
    const directEgressRoutes = edges.filter((edge) => {
        const [sourceId, destinationId] = getEdgeEndpointIds(edge);
        return !edge.c2profile?.is_p2p && sourceId === callbackId && destinationId === callbackId;
    });
    const activeDirectRoutes = directEgressRoutes.filter((edge) => edge.end_timestamp === null);
    const activeRoutedEgressRoutes = activeEdges.filter((edge) => {
        if(edge.c2profile?.is_p2p){return false}
        const [sourceId, destinationId] = getEdgeEndpointIds(edge);
        return activeReachableIds.has(sourceId) || activeReachableIds.has(destinationId);
    });
    const historicalEgressRoutes = edges.filter((edge) => {
        if(edge.c2profile?.is_p2p){return false}
        const [sourceId, destinationId] = getEdgeEndpointIds(edge);
        return historicalReachableIds.has(sourceId) || historicalReachableIds.has(destinationId);
    });
    const baseCounts = {
        activeEdgeCount: activeEdges.length,
        endedEdgeCount: endedEdges.length,
        totalEdgeCount: edges.length,
        egressEdgeCount: edges.filter((edge) => !edge.c2profile?.is_p2p).length,
        p2pEdgeCount: edges.filter((edge) => edge.c2profile?.is_p2p).length,
    };
    if(activeDirectRoutes.length > 0){
        return {
            ...baseCounts,
            tone: "success",
            icon: "direct",
            label: "Direct route active",
            description: "This callback has an active direct route to Mythic.",
        };
    }
    if(directEgressRoutes.length > 0){
        return {
            ...baseCounts,
            tone: "error",
            icon: "direct",
            label: "Direct route ended",
            description: "This callback has direct route history, but the direct route is no longer active.",
        };
    }
    if(activeRoutedEgressRoutes.length > 0){
        return {
            ...baseCounts,
            tone: "success",
            icon: "p2p",
            label: "P2P route active",
            description: "This callback can reach Mythic through active peer-to-peer links.",
        };
    }
    if(historicalEgressRoutes.length > 0){
        return {
            ...baseCounts,
            tone: "warning",
            icon: "p2p",
            label: "Route history only",
            description: "The graph includes historical C2 links, but no active route from this callback reaches Mythic.",
        };
    }
    return {
        ...baseCounts,
        tone: edges.length > 0 ? "warning" : "neutral",
        icon: "p2p",
        label: edges.length > 0 ? "No egress route" : "No route data",
        description: edges.length > 0 ?
            "Links exist for this callback group, but none currently reach an egress route to Mythic." :
            "No C2 route data has been recorded for this callback yet.",
    };
};
const getCallbackDisplay = (callback) => callback?.display_id ? `#${callback.display_id}` : "Mythic";
const getEdgeRouteParts = (edge) => {
    const isDirect = edge?.source?.id === edge?.destination?.id && !edge?.c2profile?.is_p2p;
    return {
        source: getCallbackDisplay(edge?.source),
        profile: edge?.c2profile?.name || "Unknown profile",
        destination: isDirect ? "Mythic" : getCallbackDisplay(edge?.destination),
        active: edge?.end_timestamp === null,
        isP2P: edge?.c2profile?.is_p2p || false,
    };
};
const C2ActionRoute = ({edge}) => {
    const route = getEdgeRouteParts(edge);
    return (
        <div className="mythic-c2-action-route">
            <span>{route.source}</span>
            <span className="mythic-c2-action-route-profile">{route.profile}</span>
            <span>{route.destination}</span>
        </div>
    );
};
const getCollapsedGroupEdgeDetail = (edge) => {
    const isDirectEgress = edge.source?.id === edge.destination?.id && !edge.c2profile?.is_p2p;
    return {
        id: edge.id,
        active: edge.end_timestamp === null,
        end_timestamp: edge.end_timestamp,
        profile: edge.c2profile?.name || "Unknown profile",
        has_logo: edge.c2profile?.has_logo || false,
        isP2P: edge.c2profile?.is_p2p || false,
        source: getCallbackDisplay(edge.source),
        sourceCallbackId: edge.source?.id || null,
        sourceDisplayId: edge.source?.display_id || null,
        sourceHost: edge.source?.host || "",
        destination: isDirectEgress ? "Mythic" : getCallbackDisplay(edge.destination),
        destinationCallbackId: isDirectEgress ? null : edge.destination?.id || null,
        destinationDisplayId: isDirectEgress ? null : edge.destination?.display_id || null,
        destinationHost: edge.destination?.host || "",
        routesToMythic: edge.source_to_mythic || edge.destination_to_mythic || isDirectEgress,
    };
};
const getCollapsedGroupRouteSummary = (edgeDetails = []) => {
    const activeEdges = edgeDetails.filter((edge) => edge.active);
    const endedEdges = edgeDetails.filter((edge) => !edge.active);
    const activeRouteEdges = activeEdges.filter((edge) => edge.routesToMythic);
    const p2pEdges = edgeDetails.filter((edge) => edge.isP2P);
    const egressEdges = edgeDetails.filter((edge) => !edge.isP2P);
    const profileNames = Array.from(new Set(edgeDetails.map((edge) => edge.profile).filter(Boolean))).sort();
    const routeProfileNames = Array.from(new Set(activeRouteEdges.map((edge) => edge.profile).filter(Boolean))).sort();
    const tone = activeRouteEdges.length > 0 ? "success" : endedEdges.length > 0 ? "warning" : "neutral";
    const label = activeRouteEdges.length > 0 ? `${activeRouteEdges.length} active route${activeRouteEdges.length === 1 ? "" : "s"}` :
        endedEdges.length > 0 ? "Route history" : "No route data";
    return {
        tone,
        label,
        totalEdgeCount: edgeDetails.length,
        activeEdgeCount: activeEdges.length,
        endedEdgeCount: endedEdges.length,
        activeRouteCount: activeRouteEdges.length,
        p2pEdgeCount: p2pEdges.length,
        egressEdgeCount: egressEdges.length,
        profileNames,
        routeProfileNames,
    };
};
const C2CollapsedGroupEdgeDialog = ({details, onClose, onOpenCallbackTasking}) => {
    const [removedEdgeIds, setRemovedEdgeIds] = React.useState([]);
    const [removeEdge] = useMutation(removeEdgeMutation, {
        onCompleted: () => {
            snackActions.success("Successfully removed edge, updating graph...");
        },
        onError: (err) => {
            snackActions.error(err.message);
        }
    });
    const edges = React.useMemo(() => (
        (details?.edges || []).filter((edge) => !removedEdgeIds.includes(edge.id))
    ), [details?.edges, removedEdgeIds]);
    const routeSummary = React.useMemo(() => getCollapsedGroupRouteSummary(edges), [edges]);
    const [filter, setFilter] = React.useState("");
    const filteredEdges = React.useMemo(() => {
        const normalizedFilter = filter.trim().toLowerCase();
        if(normalizedFilter.length === 0){return edges}
        return edges.filter((edge) => [
            edge.source,
            edge.sourceHost,
            edge.destination,
            edge.destinationHost,
            edge.profile,
            edge.active ? "active" : "ended",
            edge.isP2P ? "p2p peer-to-peer" : "egress",
            edge.routesToMythic ? "routes to mythic" : "",
            edge.id,
        ].some((value) => String(value || "").toLowerCase().includes(normalizedFilter)));
    }, [edges, filter]);
    const visibleEdges = filteredEdges.slice(0, 250);
    const removeRepresentedEdge = (edge) => {
        if(!edge.active){return}
        removeEdge({variables: {edge_id: edge.id}}).then(() => {
            setRemovedEdgeIds((current) => current.includes(edge.id) ? current : [...current, edge.id]);
        }).catch(() => {});
    };
    const openCallbackTasking = (callbackId) => {
        if(!callbackId){return}
        if(onOpenCallbackTasking){
            onOpenCallbackTasking(callbackId);
        } else {
            snackActions.warning("Interacting with callbacks is not available here");
        }
    };
    return (
        <>
            <DialogTitle className="mythic-c2-action-title">
                <Typography component="div" className="mythic-c2-action-title-text">
                    {details?.groupLabel || "Callback Group"} Route Summary
                </Typography>
                <Typography component="div" className="mythic-c2-action-title-subtitle">
                    Collapsed C2 route activity represented by this aggregate graph edge.
                </Typography>
            </DialogTitle>
            <DialogContent dividers={true}>
                <div className="mythic-c2-action-body">
                    <div className="mythic-c2-collapsed-edge-summary">
                        <span className={`mythic-c2-collapsed-edge-chip mythic-c2-collapsed-edge-chip-${routeSummary.tone}`}>
                            {routeSummary.label}
                        </span>
                        <span className="mythic-c2-collapsed-edge-chip">{routeSummary.activeEdgeCount} active links</span>
                        <span className="mythic-c2-collapsed-edge-chip">{routeSummary.endedEdgeCount} ended links</span>
                        <span className="mythic-c2-collapsed-edge-chip">{routeSummary.egressEdgeCount} egress</span>
                        <span className="mythic-c2-collapsed-edge-chip">{routeSummary.p2pEdgeCount} p2p</span>
                    </div>
                    {routeSummary.profileNames.length > 0 &&
                        <Typography component="div" className="mythic-c2-collapsed-edge-profiles">
                            Profiles: {routeSummary.profileNames.join(", ")}
                        </Typography>
                    }
                    {edges.length > 0 &&
                        <OutlinedInput
                            className="mythic-c2-collapsed-edge-filter"
                            fullWidth
                            placeholder="Filter edges by callback, host, profile, or state"
                            size="small"
                            value={filter}
                            onChange={(event) => setFilter(event.target.value)}
                        />
                    }
                    {edges.length === 0 ?
                        <div className="mythic-c2-action-empty">
                            No C2 route edges are currently represented by this collapsed group.
                        </div> :
                    filteredEdges.length === 0 ?
                        <div className="mythic-c2-action-empty">
                            No represented edges match that filter.
                        </div> :
                        <div className="mythic-c2-action-list mythic-c2-collapsed-edge-list">
                            {visibleEdges.map((edge) => (
                                <div key={edge.id} className="mythic-c2-action-card mythic-c2-collapsed-edge-card">
                                    <div className="mythic-c2-action-card-main">
                                        <div className="mythic-c2-action-route">
                                            <span>{edge.source}</span>
                                            <span className="mythic-c2-action-route-profile">{edge.profile}</span>
                                            <span>{edge.destination}</span>
                                        </div>
                                        <Typography component="div" className="mythic-c2-action-card-description">
                                            {edge.isP2P ? "Peer-to-peer link" : "Egress link"}
                                            {edge.sourceHost && ` from ${edge.sourceHost}`}
                                            {edge.destinationHost && edge.destination !== "Mythic" && ` to ${edge.destinationHost}`}
                                        </Typography>
                                        <div className="mythic-c2-collapsed-edge-card-actions">
                                            {edge.sourceCallbackId && onOpenCallbackTasking &&
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    className="mythic-c2-collapsed-edge-action mythic-table-row-action mythic-table-row-action-hover-info"
                                                    onClick={() => openCallbackTasking(edge.sourceCallbackId)}
                                                >
                                                    Task {edge.source}
                                                </Button>
                                            }
                                            {edge.destinationCallbackId && edge.destinationCallbackId !== edge.sourceCallbackId && onOpenCallbackTasking &&
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    className="mythic-c2-collapsed-edge-action mythic-table-row-action mythic-table-row-action-hover-info"
                                                    onClick={() => openCallbackTasking(edge.destinationCallbackId)}
                                                >
                                                    Task {edge.destination}
                                                </Button>
                                            }
                                            {edge.active &&
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    className="mythic-c2-collapsed-edge-action mythic-table-row-action mythic-table-row-action-hover-error"
                                                    onClick={() => removeRepresentedEdge(edge)}
                                                >
                                                    Remove edge
                                                </Button>
                                            }
                                        </div>
                                    </div>
                                    <span className={`mythic-c2-action-state ${edge.active ? "mythic-c2-action-state-active" : "mythic-c2-action-state-ended"}`}>
                                        {edge.active ? "Active" : "Ended"}
                                    </span>
                                </div>
                            ))}
                            {filteredEdges.length > visibleEdges.length &&
                                <div className="mythic-c2-action-empty">
                                    Showing {visibleEdges.length} of {filteredEdges.length} matching represented edges.
                                </div>
                            }
                        </div>
                    }
                </div>
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={onClose}>Close</MythicDialogButton>
            </MythicDialogFooter>
        </>
    );
};
const C2ManualRemoveEdgeDialog = ({options = [], onSubmit, onClose}) => {
    const [selectedEdge, setSelectedEdge] = React.useState(options?.[0] || "");
    const submit = () => {
        if(selectedEdge === ""){return}
        onSubmit(selectedEdge);
        onClose();
    };
    return (
        <>
            <DialogTitle className="mythic-c2-action-title">
                <Typography component="div" className="mythic-c2-action-title-text">
                    Remove Active Edge
                </Typography>
                <Typography component="div" className="mythic-c2-action-title-subtitle">
                    Select the active C2 route edge to close from this graph.
                </Typography>
            </DialogTitle>
            <DialogContent dividers={true}>
                <div className="mythic-c2-action-body">
                    {options.length === 0 ?
                        <div className="mythic-c2-action-empty">
                            No active edges are available to remove for this callback.
                        </div> :
                        <div className="mythic-c2-action-list">
                            {options.map((edge) => {
                                const route = getEdgeRouteParts(edge);
                                const selected = selectedEdge?.id === edge.id;
                                return (
                                    <button
                                        type="button"
                                        key={edge.id}
                                        className={`mythic-c2-action-card ${selected ? "mythic-c2-action-card-selected" : ""}`}
                                        onClick={() => setSelectedEdge(edge)}
                                    >
                                        <div className="mythic-c2-action-card-main">
                                            <C2ActionRoute edge={edge} />
                                            <Typography component="div" className="mythic-c2-action-card-description">
                                                {route.isP2P ? "Peer-to-peer link" : "Direct egress link"} from {route.source} through {route.profile}.
                                            </Typography>
                                        </div>
                                        <span className={`mythic-c2-action-state ${route.active ? "mythic-c2-action-state-active" : "mythic-c2-action-state-ended"}`}>
                                            {route.active ? "Active" : "Ended"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    }
                </div>
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={onClose}>Close</MythicDialogButton>
                <MythicDialogButton disabled={selectedEdge === ""} onClick={submit} intent="destructive">
                    Remove Edge
                </MythicDialogButton>
            </MythicDialogFooter>
        </>
    );
};
const C2SelectLinkCommandDialog = ({options = [], callback, onSubmit, onClose}) => {
    const [selectedCommand, setSelectedCommand] = React.useState(options?.[0] || "");
    const submit = () => {
        if(selectedCommand === ""){return}
        onSubmit(selectedCommand);
        onClose();
    };
    return (
        <>
            <DialogTitle className="mythic-c2-action-title">
                <Typography component="div" className="mythic-c2-action-title-text">
                    Select Link Command
                </Typography>
                <Typography component="div" className="mythic-c2-action-title-subtitle">
                    Choose the graph-link command to task callback {getCallbackDisplay(callback)}.
                </Typography>
            </DialogTitle>
            <DialogContent dividers={true}>
                <div className="mythic-c2-action-body">
                    {options.length === 0 ?
                        <div className="mythic-c2-action-empty">
                            No loaded commands support graph link tasking for this callback.
                        </div> :
                        <div className="mythic-c2-action-list">
                            {options.map((option) => {
                                const command = option.command;
                                const selected = selectedCommand?.command?.id === command.id;
                                return (
                                    <button
                                        type="button"
                                        key={command.id}
                                        className={`mythic-c2-action-card ${selected ? "mythic-c2-action-card-selected" : ""}`}
                                        onClick={() => setSelectedCommand(option)}
                                    >
                                        <div className="mythic-c2-action-card-main">
                                            <div className="mythic-c2-action-command-row">
                                                <span className="mythic-c2-action-command-name">{command.cmd}</span>
                                                {command.needs_admin &&
                                                    <span className="mythic-c2-action-state mythic-c2-action-state-warning">Admin</span>
                                                }
                                            </div>
                                            <Typography component="div" className="mythic-c2-action-card-description">
                                                {command.help_cmd || command.description || "No command help available."}
                                            </Typography>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    }
                </div>
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={onClose}>Close</MythicDialogButton>
                <MythicDialogButton disabled={selectedCommand === ""} onClick={submit} intent="primary">
                    Configure Task
                </MythicDialogButton>
            </MythicDialogFooter>
        </>
    );
};

function getStyles(name, selectedOptions, theme) {
    return {
      fontWeight:
      selectedOptions.indexOf(name) === -1
          ? theme.typography.fontWeightRegular
          : theme.typography.fontWeightMedium,
    };
  }
export function C2PathDialog({callback, callbackgraphedges, onClose, onOpenTab}) {
    const theme = useTheme();
    const labelComponentOptions = ["display_id", "user", "host", "ip", "domain", "os", "process_name"];
    const [selectedComponentOptions, setSelectedComponentOptions] = React.useState(["display_id", "user"]);
    const [selectedGroupBy, setSelectedGroupBy] = React.useState("None");
    const groupByOptions = ["host", "user", "ip", "domain", "os", "process_name", "None"];
    const [viewConfig, setViewConfig] = React.useState({
        rankDir: "LR",
        label_components: selectedComponentOptions,
        packet_flow_view: true,
        include_disconnected: true,
        show_all_nodes: true,
        group_by: selectedGroupBy
    });
    const handleChange = (event) => {
        const {
          target: { value },
        } = event;
        setSelectedComponentOptions(
          // On autofill we get a stringified value.
          typeof value === 'string' ? value.split(',') : value,
        );
      };
    const handleGroupByChange = (event) => {
        setSelectedGroupBy(event.target.value);
    }
    useEffect( () => {
        setViewConfig({...viewConfig, label_components: selectedComponentOptions})
    }, [selectedComponentOptions])
    useEffect( () => {
        setViewConfig({...viewConfig, group_by: selectedGroupBy});
    }, [selectedGroupBy])
    // adding context menus and options
    const [linkCommands, setLinkCommands] = React.useState([]);
    const [openParametersDialog, setOpenParametersDialog] = React.useState(false);
    const [openSelectLinkCommandDialog, setOpenSelectLinkCommandDialog] = React.useState(false);
    const [selectedLinkCommand, setSelectedLinkCommand] = useState();
    const [selectedCallback, setSelectedCallback] = useState();
    const [manuallyRemoveEdgeDialogOpen, setManuallyRemoveEdgeDialogOpen] = useState(false);
    const [manuallyAddEdgeDialogOpen, setManuallyAddEdgeDialogOpen] = useState(false);
    const [edgeOptions, setEdgeOptions] = useState([]); // used for manuallyRemoveEdgeDialog
    const [addEdgeSource, setAddEdgeSource] = useState(null); // used for manuallyAddEdgeDialog
    const [getLinkCommands] = useLazyQuery(loadedLinkCommandsQuery, {fetchPolicy: "network-only",
        onCompleted: data => {
            const updatedCommands = data.loadedcommands.map( c => {return {command: {...c.command, parsedParameters: {}}}})
            if(updatedCommands.length === 1){
                //no need for a popup, there's only one possible command
                setSelectedLinkCommand(updatedCommands[0].command);
                setOpenParametersDialog(true);
            }else if(updatedCommands.length === 0){
                //no possible command can be used, do a notification
                snackActions.warning("No commands loaded support the ui feature 'graph_view:link'");
            }else{
                const cmds = updatedCommands.map( (cmd) => { return {...cmd, display: cmd.command.cmd} } );
                setLinkCommands(cmds);
                setSelectedLinkCommand(cmds[0].command);
                setOpenSelectLinkCommandDialog(true);
            }
        }});
    const onSubmitSelectedLinkCommand = (cmd) => {
        setSelectedLinkCommand(cmd.command);
        //console.log(cmd);
        setOpenParametersDialog(true);
    }
    const [createTask] = useMutation(createTaskingMutation, {
        update: (cache, {data}) => {
            if(data.createTask.status === "error"){
                snackActions.error(data.createTask.error);
            }else{
                snackActions.success("task created");
            }

        }
    });
    const submitParametersDialog = (cmd, parameters, files) => {
        setOpenParametersDialog(false);
        createTask({variables: {callback_display_id: selectedCallback.display_id, command: cmd, params: parameters, files}});
    }
    const [hideCallback] = useMutation(hideCallbackMutation, {
        update: (cache, {data}) => {
            //console.log(data);
        },
        onError: (error) => {
            console.log(error)
            snackActions.error(error.message);
            //setContextMenuOpen(false);
        },
        onCompleted: (data) => {
            if(data.updateCallback.status === "success"){
                snackActions.success("Successfully hid callback")
            }else{
                snackActions.error(data.updateCallback.error)
            }

            //setContextMenuOpen(false);
        }
    });
    const [manuallyRemoveEdge] = useMutation(removeEdgeMutation, {
        update: (cache, {data}) => {
            //console.log(data);
            snackActions.success("Successfully removed edge, updating graph...");
        },
        onError: (err) => {
            snackActions.error(err.message);
        }
    });
    const [manuallyAddEdge] = useMutation(addEdgeMutation, {
        update: (cache, {data}) => {
            //console.log(data);
            snackActions.success("Successfully added edge, updating graph...");
        },
        onError: (err) => {
            snackActions.error(err.message);
        }
    });
    const onSubmitManuallyRemoveEdge = (edge) => {
        if(edge === ""){
            snackActions.warning("No edge selected");
            return;
        }
        manuallyRemoveEdge({variables: {edge_id: edge.id}});
    }
    const onSubmitManuallyAddEdge = (source_id, profile, destination) => {
        if(profile === "" || destination === ""){
            snackActions.warning("Profile or Destination Callback not provided");
            return;
        }
        manuallyAddEdge({variables: {source_id: source_id, c2profile: profile.name, destination_id: destination.display_id}});
    }
    const contextMenu = useMemo(() => {return [
        {
            title: 'Open Tasking',
            onClick: function(node){
                //console.log(node);
                if(onOpenTab){
                    onOpenTab({tabType: "interact", tabID: node.callback_id + "interact", callbackID: node.callback_id});
                } else {
                    snackActions.warning("interacting with callbacks not available here");
                }

            }
        },
        {
            title: "Add P2P Edge",
            onClick: function(node){
                setAddEdgeSource(node);
                setManuallyAddEdgeDialogOpen(true);
            }
        },
        {
            title: "Remove Active Edge",
            onClick: function(node){
                const opts = callbackgraphedges.reduce( (prev, e) => {
                    if(e.source.id === node.id || e.destination.id === node.id){
                        if(e.end_timestamp === null){
                            if(e.source.id === e.destination.id){
                                return [...prev, {...e, "display": e.source.display_id + " --> " + e.c2profile.name + " --> Mythic"}];
                            } else {
                                return [...prev, {...e, "display": e.source.display_id + " --> " + e.c2profile.name + " --> " + e.destination.display_id}];
                            }

                        }else{
                            return [...prev];
                        }
                    } else {
                        return [...prev];
                    }
                }, []);
                setEdgeOptions(opts);
                setManuallyRemoveEdgeDialogOpen(true);
            }
        },
        {
            title: "Task Link Command",
            onClick: function(node){
                setLinkCommands([]);
                setSelectedLinkCommand(null);
                setSelectedCallback(null);
                getLinkCommands({variables: {callback_id: node.id} });
                setSelectedCallback(node);
            }
        },
        {
            title: 'Hide Callback',
            onClick: function(node) {
                hideCallback({variables: {callback_display_id: node.display_id}});
            }
        },
    ]}, [getLinkCommands, hideCallback, callbackgraphedges, onOpenTab]);

    const routeSummary = useMemo(
        () => getC2RouteSummary(callback, callbackgraphedges),
        [callback, callbackgraphedges]
    );
    const RouteSummaryIcon = routeSummary.icon === "direct" ? WifiIcon : InsertLinkTwoToneIcon;
    const callbackGraphNodeSignature = getCallbackGraphNodeSignature(callback);
    const callbackGraphNodeRef = React.useRef(null);
    const callbackGraphNodeSignatureRef = React.useRef("");
    const providedCallbackNodesRef = React.useRef([]);
    if(callbackGraphNodeSignatureRef.current !== callbackGraphNodeSignature){
        callbackGraphNodeSignatureRef.current = callbackGraphNodeSignature;
        callbackGraphNodeRef.current = getCallbackGraphNodeData(callback);
        providedCallbackNodesRef.current = callbackGraphNodeRef.current ? [callbackGraphNodeRef.current] : [];
    }

    return (
    <>
        <DialogTitle className="mythic-c2-path-title">
            <div className="mythic-c2-path-title-row">
                <div className="mythic-c2-path-title-copy">
                    <Typography component="div" className="mythic-c2-path-title-text">
                        Callback {callback.display_id}'s Egress Path
                    </Typography>
                    <Typography component="div" className="mythic-c2-path-title-subtitle">
                        Review routes, grouping, and link-tasking options for this callback.
                    </Typography>
                </div>
                <div className="mythic-c2-path-summary">
                    <span className={`mythic-c2-path-summary-chip mythic-c2-path-summary-chip-${routeSummary.tone}`}>
                        <RouteSummaryIcon fontSize="inherit" />
                        {routeSummary.label}
                    </span>
                    <span className="mythic-c2-path-summary-chip">{routeSummary.activeEdgeCount} active</span>
                    <span className="mythic-c2-path-summary-chip">{routeSummary.endedEdgeCount} ended</span>
                    <span className="mythic-c2-path-summary-chip">{routeSummary.egressEdgeCount} egress</span>
                    <span className="mythic-c2-path-summary-chip">{routeSummary.p2pEdgeCount} p2p</span>
                </div>
            </div>
        </DialogTitle>
        <DialogContent dividers={true} className="mythic-c2-path-content">
            <div className={`mythic-c2-path-route-panel mythic-c2-path-route-panel-${routeSummary.tone}`}>
                <div className="mythic-c2-path-route-state">
                    <span className="mythic-c2-path-route-icon">
                        <RouteSummaryIcon fontSize="small" />
                    </span>
                    <div className="mythic-c2-path-route-copy">
                        <Typography component="div" className="mythic-c2-path-route-label">
                            {routeSummary.label}
                        </Typography>
                        <Typography component="div" className="mythic-c2-path-route-description">
                            {routeSummary.description}
                        </Typography>
                    </div>
                </div>
                <div className="mythic-c2-path-legend">
                    <span className="mythic-c2-path-legend-item">
                        <WifiIcon fontSize="inherit" />
                        Direct to Mythic
                    </span>
                    <span className="mythic-c2-path-legend-item">
                        <InsertLinkTwoToneIcon fontSize="inherit" />
                        P2P route
                    </span>
                    <span className="mythic-c2-path-legend-item">
                        <span className="mythic-c2-path-edge-swatch mythic-c2-path-edge-swatch-active" />
                        Active link
                    </span>
                    <span className="mythic-c2-path-legend-item">
                        <span className="mythic-c2-path-edge-swatch mythic-c2-path-edge-swatch-ended" />
                        Ended link
                    </span>
                </div>
            </div>
            <div className="mythic-c2-path-toolbar">
                <div className="mythic-c2-path-toolbar-copy">
                    <Typography component="div" className="mythic-c2-path-toolbar-title">
                        Graph View
                    </Typography>
                    <Typography component="div" className="mythic-c2-path-toolbar-description">
                        Adjust labels and grouping without changing callback state.
                    </Typography>
                </div>
                <div className="mythic-c2-path-controls">
                <FormControl size="small" className="mythic-c2-path-control">
                    <InputLabel id="c2-path-group-label">Group By</InputLabel>
                    <Select
                    labelId="c2-path-group-label"
                    id="c2-path-group"
                    value={selectedGroupBy}
                    onChange={handleGroupByChange}
                    input={<OutlinedInput id="select-c2-path-group" label="Group By" />}
                    >
                    {groupByOptions.map((name) => (
                        <MenuItem
                        key={name}
                        value={name}
                        >
                        {name}
                        </MenuItem>
                    ))}
                    </Select>
                </FormControl>
                <FormControl size="small" className="mythic-c2-path-control mythic-c2-path-control-wide">
                    <InputLabel id="c2-path-label-components-label">Display Properties</InputLabel>
                    <Select
                    labelId="c2-path-label-components-label"
                    id="c2-path-label-components"
                    multiple
                    value={selectedComponentOptions}
                    onChange={handleChange}
                    input={<OutlinedInput id="select-c2-path-label-components" label="Display Properties" />}
                    MenuProps={MenuProps}
                    renderValue={(selected) => selected.join(", ")}
                    >
                    {labelComponentOptions.map((name) => (
                        <MenuItem
                            key={name}
                            value={name}
                            style={getStyles(name, selectedComponentOptions, theme)}
                            >
                        {name}
                        </MenuItem>
                    ))}
                    </Select>
                </FormControl>
                </div>
            </div>
            {manuallyRemoveEdgeDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={manuallyRemoveEdgeDialogOpen}
                              onClose={()=>{setManuallyRemoveEdgeDialogOpen(false);}}
                              innerDialog={<C2ManualRemoveEdgeDialog
                                  onClose={()=>{setManuallyRemoveEdgeDialogOpen(false);}}
                                  onSubmit={onSubmitManuallyRemoveEdge}
                                  options={edgeOptions}
                              />}
                />
            }
            {manuallyAddEdgeDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={manuallyAddEdgeDialogOpen}
                              onClose={()=>{setManuallyAddEdgeDialogOpen(false);}}
                              innerDialog={<ManuallyAddEdgeDialog onClose={()=>{setManuallyAddEdgeDialogOpen(false);}}
                                                                  onSubmit={onSubmitManuallyAddEdge} source={addEdgeSource} />}
                />
            }
            {openParametersDialog &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openParametersDialog}
                              onClose={()=>{setOpenParametersDialog(false);}}
                              innerDialog={<TaskParametersDialog command={selectedLinkCommand} callback={selectedCallback} onSubmit={submitParametersDialog} onClose={()=>{setOpenParametersDialog(false);}} />}
                />
            }
            {openSelectLinkCommandDialog &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={openSelectLinkCommandDialog}
                              onClose={()=>{setOpenSelectLinkCommandDialog(false);}}
                              innerDialog={<C2SelectLinkCommandDialog
                                  onClose={()=>{setOpenSelectLinkCommandDialog(false);}}
                                  onSubmit={onSubmitSelectedLinkCommand}
                                  options={linkCommands}
                                  callback={selectedCallback}
                              />}
                />
            }
            <div className="mythic-c2-path-canvas mythic-graph-canvas">
                <DrawC2PathElementsFlowWithProvider
                    providedNodes={providedCallbackNodesRef.current}
                    edges={callbackgraphedges}
                    view_config={viewConfig}
                    theme={theme}
                    contextMenu={contextMenu}
                    focusedCallbackId={callback.id}
                    onOpenTab={onOpenTab}
                />
            </div>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={onClose}>
            Close
          </MythicDialogButton>
        </MythicDialogFooter>
    </>
  );
}
export const getSourcePosition = (direction) => {
    if(direction === "RIGHT"){
        return Position.Right
    } else if(direction === "LEFT"){
        return Position.Left
    } else if(direction === "UP" || direction === "TOP"){
        return Position.Top
    } else if(direction === "DOWN" || direction === "BOTTOM"){
        return Position.Bottom
    } else {
        return Position.Top
    }
}
export const getTargetPosition = (direction) => {
    if(direction === "RIGHT"){
        return Position.Left
    } else if(direction === "LEFT"){
        return Position.Right
    } else if(direction === "UP" || direction === "TOP"){
        return Position.Bottom
    } else if(direction === "DOWN" || direction === "BOTTOM"){
        return Position.Top
    } else {
        return Position.Bottom
    }
}
function AgentNode({data}) {
    const theme = useTheme();
    const sourcePosition = getSourcePosition(data["elk.direction"]);
    const targetPosition = getTargetPosition(data["elk.direction"]);
    const egressRoutes = data?.egressRoutes || [];
    const visibleEgressRoutes = egressRoutes.slice(0, 2);
    const getOffset = (index) => {
        let offsetComponents = {location: "top", size: data.height};
        if(sourcePosition === Position.Top || sourcePosition === Position.Bottom){
            offsetComponents = {location: "left", size: data.width};
        }
        let size = (offsetComponents.size / data.sourceCount);
        return {[offsetComponents.location]: (size * index) + (size / 2)}

    }
    const additionalStyles = data?.anySelected ? data?.selected ? {
        boxShadow: `0px 0px 5px 0px ${theme.palette.secondary.main}`,
        borderRadius: "5px"
    } : {
        filter: "grayscale(1)",
        opacity: 0.5
    } : {};
    const nodeClasses = [
        "mythic-c2-agent-node",
        data?.isMythic ? "mythic-c2-agent-node-mythic" : "",
        data?.isFocused ? "mythic-c2-agent-node-focused" : "",
    ].filter(Boolean).join(" ");
    return (
        <div className={nodeClasses} style={{padding: 0, margin: 0, ...additionalStyles}}>
            {egressRoutes.length > 0 &&
                <div className="mythic-c2-agent-node-egress-routes">
                    {visibleEgressRoutes.map((route) => (
                        <span
                            key={`${route.profile}-${route.id}`}
                            className={`mythic-c2-agent-node-egress-route ${route.active ? "mythic-c2-agent-node-egress-route-active" : "mythic-c2-agent-node-egress-route-ended"}`}
                        >
                            {route.has_logo &&
                                <MythicAgentSVGIconNoTooltip
                                    payload_type={route.profile}
                                    is_p2p={false}
                                    className="mythic-c2-agent-node-egress-route-icon"
                                />
                            }
                            <span>{route.profile}</span>
                        </span>
                    ))}
                    {egressRoutes.length > visibleEgressRoutes.length &&
                        <span className="mythic-c2-agent-node-egress-route mythic-c2-agent-node-egress-route-more">
                            +{egressRoutes.length - visibleEgressRoutes.length}
                        </span>
                    }
                </div>
            }
            {
                [...Array(data.sourceCount)].map((e, i) => (
                    <Handle type={"source"} id={`${i+1}`} key={`${i+1}`} style={data.sourceCount > 1 ? getOffset(i) : {}} isConnectable={false} position={sourcePosition} />
                ))

            }
            <ImageWithAuth alt={data.img} style={{margin: egressRoutes.length > 0 ? "0 auto" : "auto"}} src={data.img}  className={"circleImageNode"} />
            <Handle type={"target"} position={targetPosition} isConnectable={false}/>
            <Typography className="mythic-c2-agent-node-label" >{data.label}</Typography>
        </div>
    )
}
function TaskNode({data}) {
    const sourcePosition = getSourcePosition(data["elk.direction"]);
    const targetPosition = getTargetPosition(data["elk.direction"]);
    return (
        <div >
            <Handle type={"source"} position={sourcePosition} isConnectable={false} />
            {data.id > 0 &&
                <TaskLabelFlat task={data} showOnSelectTask={!data.selected} onSelectTask={() => {data.onSelectTask(data)}}
                               graphView={true}
                />
            }
            <Handle type={"target"} position={targetPosition} isConnectable={false} />
        </div>
    )
}
function BrowserscriptNode({data}) {
    const theme = useTheme();
    const sourcePosition = getSourcePosition(data["elk.direction"]);
    const targetPosition = getTargetPosition(data["elk.direction"]);
    const additionalStyles = data?.anySelected ? data?.selected ? {
        boxShadow: `0px 0px 5px 0px ${theme.palette.secondary.main}`,
        borderRadius: "5px"
    } : {
        filter: "grayscale(1)",
        opacity: 0.5
    } : {};
    return (
        <div style={{padding: 0, margin: 0, display: "flex", flexDirection: "column", ...additionalStyles}}>
            <Handle type={"source"} position={sourcePosition} isConnectable={false} />
            {data.img}
            <div style={{top: 0, right: 0, height: "50%", width: "50%", position: "absolute"}}>
                {data.overlay_img}
            </div>
            <Handle type={"target"} position={targetPosition} isConnectable={false} />
            <Typography style={{textAlign: "center", margin: 0, padding: 0}} >{data.data.label}</Typography>
        </div>
    )
}
export function GroupNode({data}) {
    const sourcePosition = getSourcePosition(data["elk.direction"]);
    const targetPosition = getTargetPosition(data["elk.direction"]);
    if(data?.callbackGroup){
        const sourceHandleId = `${data.groupId}-source`;
        const targetHandleId = `${data.groupId}-target`;
        const onToggle = (event) => {
            event.stopPropagation();
            data.onToggleGroup?.(data.groupId);
        };
        const onShowMore = (event) => {
            event.stopPropagation();
            data.onShowMoreGroup?.(data.groupId);
        };
        const onShowFewer = (event) => {
            event.stopPropagation();
            data.onShowFewerGroup?.(data.groupId);
        };
        const onShowAll = (event) => {
            event.stopPropagation();
            data.onShowAllGroup?.(data.groupId, data.totalCount);
        };
        const onInspectRoutes = (event) => {
            event.stopPropagation();
            data.onInspectGroupRoutes?.(data.summaryDetails);
        };
        const onSelectMember = (event, memberId) => {
            event.stopPropagation();
            data.onSelectGroupMember?.(memberId);
        };
        return (
            <>
                <Handle id={sourceHandleId} type={"source"} position={sourcePosition} isConnectable={false} className="mythic-c2-group-node-handle" />
                <div
                    className={`mythic-c2-group-node ${data.expanded ? "mythic-c2-group-node-expanded" : "mythic-c2-group-node-collapsed"}`}
                    data-node-id={data.groupId}
                >
                    <div className="mythic-c2-group-node-header">
                        <div className="mythic-c2-group-node-title-wrap">
                            <Typography component="div" className="mythic-c2-group-node-kicker">
                                {data.groupTypeLabel || "Callback group"}
                            </Typography>
                            <Typography component="div" className="mythic-c2-group-node-title">
                                {data.label}
                            </Typography>
                        </div>
                        <button type="button" className="mythic-c2-group-node-toggle nodrag nopan" onClick={onToggle}>
                            {data.expanded ? "Hide callbacks" : "Show callbacks"}
                        </button>
                    </div>
                    <div className="mythic-c2-group-node-stats">
                        <button type="button" className="mythic-c2-group-node-stat nodrag nopan" onClick={onInspectRoutes}>{data.totalCount} callbacks</button>
                        <button type="button" className="mythic-c2-group-node-stat mythic-c2-group-node-stat-success nodrag nopan" onClick={onInspectRoutes}>{data.activeCount} active</button>
                        {data.routeSummary &&
                            <button type="button" className={`mythic-c2-group-node-stat mythic-c2-group-node-stat-${data.routeSummary.tone} nodrag nopan`} onClick={onInspectRoutes}>
                                {data.routeSummary.label}
                            </button>
                        }
                        {data.p2pCount > 0 &&
                            <button type="button" className="mythic-c2-group-node-stat nodrag nopan" onClick={onInspectRoutes}>{data.p2pCount} p2p</button>
                        }
                        {data.egressCount > 0 &&
                            <button type="button" className="mythic-c2-group-node-stat nodrag nopan" onClick={onInspectRoutes}>{data.egressCount} egress</button>
                        }
                    </div>
                    {data.routeSummary?.profileNames?.length > 0 &&
                        <div className="mythic-c2-group-node-muted">
                            Routes: {data.routeSummary.profileNames.slice(0, 3).join(", ")}
                            {data.routeSummary.profileNames.length > 3 ? ` +${data.routeSummary.profileNames.length - 3}` : ""}
                        </div>
                    }
                    {data.payloadTypes?.length > 0 &&
                        <div className="mythic-c2-group-node-muted">
                            Payloads: {data.payloadTypes.join(", ")}
                        </div>
                    }
                    {data.expanded &&
                        <div className="mythic-c2-group-node-members">
                            <div className="mythic-c2-group-node-members-row">
                                {(data.visibleMembers || []).map((member) => (
                                    <button
                                        type="button"
                                        key={member.id}
                                        className={`mythic-c2-group-node-member nodrag nopan ${member.active ? "mythic-c2-group-node-member-active" : ""}`}
                                        onClick={(event) => onSelectMember(event, member.id)}
                                    >
                                        #{member.display_id}
                                    </button>
                                ))}
                                {data.hiddenMemberCount > 0 &&
                                    <span className="mythic-c2-group-node-member mythic-c2-group-node-member-muted">
                                        +{data.hiddenMemberCount} hidden
                                    </span>
                                }
                            </div>
                            {data.totalCount > data.defaultMemberLimit &&
                                <div className="mythic-c2-group-node-actions nodrag nopan">
                                    {data.hiddenMemberCount > 0 &&
                                        <button type="button" onClick={onShowMore}>Show more</button>
                                    }
                                    {data.hiddenMemberCount > 0 &&
                                        <button type="button" onClick={onShowAll}>Show all</button>
                                    }
                                    {data.shownCount > data.defaultMemberLimit &&
                                        <button type="button" onClick={onShowFewer}>Show fewer</button>
                                    }
                                </div>
                            }
                        </div>
                    }
                </div>
                <Handle id={targetHandleId} type={"target"} position={targetPosition} isConnectable={false} className="mythic-c2-group-node-handle" />
            </>
        )
    }
    return (
        <>
            <Handle hidden type={"source"} position={sourcePosition} isConnectable={false} />
            <div className={"groupNode"} style={{width: data.width, height: data.height, margin: "auto"}}>
                <Typography style={{textAlign: "center", margin: 0, padding: 0}} >{data.label}</Typography>
            </div>
            <Handle type={"target"} hidden position={targetPosition} isConnectable={false} />
        </>


    )
}
const nodeTypes = { "agentNode": AgentNode, "groupNode": GroupNode, "taskNode": TaskNode, "browserscriptNode": BrowserscriptNode };

export function C2LabelEdge({  id,  sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data,
                                labelStyle, markerStart, markerEnd, labelBgStyle, style, label
                            }){
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });
    const showProfileLabel = !data?.collapsedGroupEdge && Boolean(label);
    const sourceAnchoredLabel = data?.collapsedGroupEdge || showProfileLabel;
    const sourceAnchoredLabelRatio = 0.05;
    const sourceLabelOffset = data?.collapsedGroupEdge ? 0 : 20;
    const sourceLabelOffsetX = sourcePosition === Position.Right ? sourceLabelOffset :
        sourcePosition === Position.Left ? -sourceLabelOffset : 0;
    const sourceLabelOffsetY = sourcePosition === Position.Bottom ? sourceLabelOffset :
        sourcePosition === Position.Top ? -sourceLabelOffset : 0;
    const edgeLabelX = sourceAnchoredLabel ? sourceX + ((targetX - sourceX) * sourceAnchoredLabelRatio) + sourceLabelOffsetX : labelX;
    const edgeLabelY = sourceAnchoredLabel ? sourceY + ((targetY - sourceY) * sourceAnchoredLabelRatio) + sourceLabelOffsetY : labelY;
    const edgeInteractionWidth = data?.collapsedGroupEdge ? 8 : 5;
    const profileLabelTransform = sourcePosition === Position.Right ? "translate(0, -50%)" :
        sourcePosition === Position.Left ? "translate(-100%, -50%)" :
        sourcePosition === Position.Bottom ? "translate(-50%, 0)" :
        sourcePosition === Position.Top ? "translate(-50%, -100%)" :
        "translate(-50%, -50%)";
    const labelTransform = data?.collapsedGroupEdge ? "translate(-50%, -50%)" :
        sourceAnchoredLabel ? profileLabelTransform : "translate(-40%, -50%)";
    return (
        <>
            <BaseEdge id={id} path={edgePath} labelStyle={labelStyle} markerEnd={markerEnd} markerStart={markerStart}
            labelShowBg={false} labelBgStyle={labelBgStyle}  style={style} label={""}
            interactionWidth={edgeInteractionWidth} labelX={edgeLabelX} labelY={edgeLabelY}/>
            <EdgeLabelRenderer>
                <div
                    style={{ position: "absolute",
                        zIndex: sourceAnchoredLabel ? 30 : 10,
                        pointerEvents: data?.collapsedGroupEdge ? "auto" : "none",
                        transform: `${labelTransform} translate(${edgeLabelX}px,${edgeLabelY}px)`,
                    }}
                    className={`nodrag nopan mythic-c2-edge-label ${sourceAnchoredLabel ? "mythic-c2-edge-label-source" : ""}`}
                >
                    {data?.collapsedGroupEdge ?
                        <button
                            type="button"
                            className={`mythic-c2-group-edge-summary mythic-c2-group-edge-summary-${data.routeSummary?.tone || "neutral"}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                data.onInspectCollapsedEdge?.(data.summaryDetails);
                            }}
                        >
                            <span>{data.routeSummary?.activeRouteCount || 0} routes</span>
                            <span>{data.routeSummary?.activeEdgeCount || 0} active</span>
                            <span>{data.routeSummary?.endedEdgeCount || 0} ended</span>
                        </button> :
                        showProfileLabel &&
                            <span className={`mythic-c2-edge-profile-chip ${data?.has_logo ? "mythic-c2-edge-profile-chip-with-icon" : ""}`}>
                                {data?.has_logo &&
                                    <MythicAgentSVGIconNoTooltip payload_type={label}
                                                                    is_p2p={data.is_p2p}
                                                                    className={"mythic-c2-edge-profile-icon"}/>
                                }
                                <span className="mythic-c2-edge-profile-name">
                                    {label}
                                </span>
                            </span>
                    }
                </div>
            </EdgeLabelRenderer>
        </>
    )
}
const edgeTypes = {
    C2IconEdge: C2LabelEdge
};
const elk = new ELK();
const getEdgeHighlightStroke = (edge, fallbackColor) => edge?.style?.stroke || edge?.oldStyle?.stroke || fallbackColor;
const getCallbackGroupWidth = (node) => {
    const data = node.data || {};
    if(data.expanded){
        return Math.max(380, Math.min(460, 330 + ((data.visibleMembers || []).length * 8)));
    }
    const labelWidth = String(data.label || "").length * 7;
    const profileWidth = (data.routeSummary?.profileNames || []).join(", ").length * 4;
    const payloadWidth = (data.payloadTypes || []).join(", ").length * 4;
    return Math.max(340, Math.min(460, 260 + labelWidth, 300 + profileWidth, 300 + payloadWidth));
};
const getCallbackGroupHeight = (node) => {
    const data = node.data || {};
    if(data.expanded){
        const memberRows = Math.min(3, Math.max(1, Math.ceil((data.visibleMembers || []).length / 6)));
        return 150 + (memberRows * 22) + (data.totalCount > data.defaultMemberLimit ? 30 : 0);
    }
    const routeLine = data.routeSummary?.profileNames?.length > 0 ? 18 : 0;
    const payloadLine = data.payloadTypes?.length > 0 ? 18 : 0;
    const extraStatRow = data.p2pCount > 0 && data.egressCount > 0 && data.routeSummary ? 22 : 0;
    return 132 + routeLine + payloadLine + extraStatRow;
};
const getWidth = (node) => {
    if(node.type === "groupNode" && node.data?.callbackGroup){
        return getCallbackGroupWidth(node);
    }
    if(node.type === "agentNode" && node.data?.egressRoutes?.length > 0){
        return Math.max(node.width || 0, 160, String(node.data.label || "").length * 7);
    }
    if(node.type === "taskNode"){
        return getTaskWidth(node);
    }
    if(node.type === "browserscriptNode"){
        return getBrowserscriptWidth(node);
    }
    if(node.type === "eventNode"){
        return getEventNodeWidth(node);
    }
    return Math.max(100, node.data.label.length * 7);
}
const getTaskWidth = (node) => {
    let nodeText = " ";
    if(node?.data?.command_name){
        nodeText = getLabelText(node.data, true);
    }
    return Math.max(325, (nodeText.length * 8) + 10)
}
const getEventNodeWidth = (node) => {
    return Math.max(190, (node.maxNameLength * 8) + 120);
}
const getBrowserscriptWidth = (node) => {
    let nodeText = " ";
    if(node?.data?.width){
        return node.data.width;
    }
    if(node?.data?.label){
        nodeText = getLabelText(node.data, true);
    }
    return Math.max(100, (nodeText.length * 10) + 10)
}
const getHeight = (node) => {
    if(node.hidden){
        return 0;
    }
    if(node.type === "groupNode" && node.data?.callbackGroup){
        return getCallbackGroupHeight(node);
    }
    if(node.type === "agentNode" && node.data?.egressRoutes?.length > 0){
        return Math.max(node.height || 0, 132);
    }
    if(node.type === "eventNode"){
        return 88;
    }
    return 80;
}
const getGroupLayoutOptions = (group, options) => {
    if(group.type === "groupNode" && group.data?.callbackGroup && group.data?.expanded){
        const topPadding = getCallbackGroupHeight(group) + 28;
        return {
            ...options,
            "elk.padding": `[top=${topPadding},left=18,right=18,bottom=18]`,
        };
    }
    return {
        ...options,
    };
};
export default async function createLayout({initialGroups, initialNodes, initialEdges, alignment, elkOverwrites}) {
    let elkAlignment = {
        "elk.alignment": "RIGHT" , //LEFT, RIGHT, TOP, BOTTOM, CENTER
        "elk.direction": "RIGHT" , //DOWN, LEFT, RIGHT, UP
    }
    if(alignment === "TB"){
        elkAlignment = {
            "elk.alignment": "TOP", //LEFT, RIGHT, TOP, BOTTOM, CENTER
            "elk.direction":  "UP", //DOWN, LEFT, RIGHT, UP
        }
    }else if(alignment === "BT"){
        elkAlignment = {
            "elk.alignment": "BOTTOM", //LEFT, RIGHT, TOP, BOTTOM, CENTER
            "elk.direction": "DOWN", //DOWN, LEFT, RIGHT, UP
        }
    }else if(alignment === "RL"){
        elkAlignment = {
            "elk.alignment": "RIGHT" , //LEFT, RIGHT, TOP, BOTTOM, CENTER
            "elk.direction": "LEFT" , //DOWN, LEFT, RIGHT, UP
        }
    }
    if(elkOverwrites === undefined){
        elkOverwrites = {};
    }
    const options = {
        "elk.algorithm": "layered",
        // TOP / UP
        // RIGHT / RIGHT
        ...elkAlignment,
        //"elk.topdownLayout": true,
        "elk.padding": '[top=30,left=10,right=10]',
        "elk.separateConnectedComponents": false,
        "elk.layered.compaction.connectedComponents": false,
        "elk.spacing.nodeNode": 40, // spacing between each node
        "elk.layered.spacing.nodeNodeBetweenLayers": 100, // spacing between nodes _within_ a group
        "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED", // centers them within a group, good
        //"elk.layered.compaction.postCompaction.strategy": "LEFT_RIGHT_CONNECTION_LOCKING",
        "elk.alg.layered.p4nodes.NodePlacementStrategy": "BRANDES_KOEPF",
        "elk.layered.spacing.edgeEdgeBetweenLayers": 20,
        "elk.layered.spacing.edgeNodeBetweenLayers": 40,
        "elk.layered.spacing.baseValue": 40,
        ...elkOverwrites
    }
    const graph = {
        id: "root",
        layoutOptions: {
            ...options,
        },
        children: [...initialGroups.map((group) => ({
            ...group,
            id: group.id,
            width: getWidth(group),
            height: getHeight(group),
            layoutOptions: getGroupLayoutOptions(group, options),
            children: initialNodes
                .filter((node) => node.group === group.id)
                .map((node) => ({
                    ...node,
                    id: node.id,
                    width: getWidth(node),
                    height: getHeight(node),
                    layoutOptions: {
                        ...options,
                    }
                }))
        })), ...initialNodes.reduce( (prev, cur) => {
            if(cur.group){return [...prev]}
            return [...prev, {...cur,
                id: cur.id,
                width: getWidth(cur),
                height: getHeight(cur),
                layoutOptions: {
                    ...options,
                },
                children: []
            }]
        }, [])],
        edges: initialEdges.map((edge) => ({
            ...edge,
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
            layoutOptions: {
                ...options,
            },
        }))
    };
    const layout = await elk.layout(graph);
    const nodes = layout.children.reduce((result, current) => {
        result.push({
            ...current,
            id: current.id,
            position: { x: current.x, y: current.y },
            data: {  label: current.id, ...current.data, width: current.width, height: current.height, ...options },
            style: { width: current.width, height: current.height }
        });

        current.children.forEach((child) =>
            result.push({
                ...child,
                id: child.id,
                position: { x: child.x, y: child.y },
                data: { label: child.id, ...child.data, width: child.width, height: child.height, ...options },
                style: { width: child.width, height: child.height },
                parentId: current.id
            })
        );

        return result;
    }, []);

    return {
        newNodes: nodes,
        newEdges: initialEdges
    };
}
const getLabel = (edge, label_components) => {
    return label_components.map( (name) => {
        if(name === "ip"){
            try{
                let parts = JSON.parse(edge[name]);
                //console.log("ip parts", parts)
                if(parts.length > 0 && parts[0].length > 0){
                    return parts[0]
                }
                //console.log("no ip parts for the following",edge[name])
                return "127.0.0.1";
            }catch(error){
                console.log(error)
                if(!edge[name] || edge[name].length === 0){
                    return "127.0.0.1"
                }
                return edge[name];
            }
        } else if(name === "user") {
            if(edge["integrity_level"] > 2){
                return edge[name] + "*";
            }else{
                return edge[name];
            }
        } else {
            return edge[name]
        }

    }).join(", ");
}
const getGroupBy = (node, view_config) => {
    if(!node){return ""}
    if(view_config.group_by === "None"){
        return "";
    }
    if(node[view_config.group_by].length === 0){
        return " ";
    } else if(view_config.group_by === "ip") {
        try{
            let parts = JSON.parse(node[view_config.group_by]);
            if(parts.length > 0 && parts[0].length > 0){
                return parts[0]
            }
            return "127.0.0.1";
        }catch(error){
            if(!node[view_config.group_by] || node[view_config.group_by].length === 0){
                return "127.0.0.1"
            }
            return node[view_config.group_by];
        }
    } else if(view_config.group_by === "user"){
        if(node["integrity_level"] > 2){
            return node[view_config.group_by] + "*";
        }else{
            return node[view_config.group_by];
        }
    } else{
        return node[view_config.group_by];
    }
}
const getCallbackGraphEndpoint = (node, view_config) => {
    if(!node){return {parentId: ""}}
    return {
        id: node.id,
        display_id: node.display_id,
        parentId: getCallbackGraphGroupId(node, view_config),
    }
}
const getCallbackGraphGroupLabel = (node, view_config) => {
    const groupByValue = getGroupBy(node, view_config);
    if(groupByValue === undefined || groupByValue === null || String(groupByValue).trim().length === 0){
        return "Ungrouped";
    }
    return String(groupByValue);
}
const getCallbackGraphGroupIdFromLabel = (label) => `callback-group:${label}`;
const getCallbackGraphGroupId = (node, view_config) => getCallbackGraphGroupIdFromLabel(getCallbackGraphGroupLabel(node, view_config));
const getCallbackGraphNodeData = (node) => {
    if(!node){return null}
    return {
        active: node.active,
        id: node.id,
        display_id: node.display_id,
        user: node.user,
        host: node.host,
        ip: node.ip,
        domain: node.domain,
        os: node.os,
        process_name: node.process_name,
        integrity_level: node.integrity_level,
        payload: {
            payloadtype: {
                name: node.payload?.payloadtype?.name || "",
                id: node.payload?.payloadtype?.id || 0,
            },
        },
    }
}
const getCallbackGraphNodeSignature = (node) => {
    if(!node){return ""}
    return [
        node.id,
        node.active,
        node.display_id,
        node.user,
        node.host,
        node.ip,
        node.domain,
        node.os,
        node.process_name,
        node.integrity_level,
        node.payload?.payloadtype?.name,
        node.payload?.payloadtype?.id,
    ].map((value) => String(value ?? "")).join("::");
}
const getCallbackGraphEdgeSignature = (edge) => {
    if(!edge){return ""}
    return [
        edge.id,
        edge.end_timestamp,
        edge.c2profile?.id,
        edge.c2profile?.name,
        edge.c2profile?.is_p2p,
        edge.c2profile?.has_logo,
        getCallbackGraphNodeSignature(edge.source),
        getCallbackGraphNodeSignature(edge.destination),
    ].map((value) => String(value ?? "")).join("::");
}
const getGraphInputSignature = ({edges, providedNodes, view_config, filterOptions, focusedCallbackId, theme, expandedGroupSignature, groupMemberLimitSignature}) => {
    const edgeSignature = (edges || [])
        .map(getCallbackGraphEdgeSignature)
        .sort()
        .join("||");
    const nodeSignature = (providedNodes || [])
        .map(getCallbackGraphNodeSignature)
        .sort()
        .join("||");
    const filterSignature = Object.entries(filterOptions || {})
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => `${key}:${String(value ?? "")}`)
        .join("||");
    const viewSignature = [
        view_config?.rankDir,
        view_config?.packet_flow_view,
        view_config?.include_disconnected,
        view_config?.show_all_nodes,
        view_config?.group_by,
        (view_config?.label_components || []).join(","),
    ].map((value) => String(value ?? "")).join("::");
    const themeSignature = [
        theme.palette.mode,
        theme.palette.success.main,
        theme.palette.error.main,
        theme.palette.secondary.main,
        theme.palette.background.contrast,
        theme.tableHover,
    ].map((value) => String(value ?? "")).join("::");
    return [edgeSignature, nodeSignature, filterSignature, viewSignature, focusedCallbackId, themeSignature, expandedGroupSignature, groupMemberLimitSignature].join("##");
}
const shouldUseGroups = (view_config) => {
    if(view_config["packet_flow_view"] && view_config.group_by !== "None"){
        return true;
    }
    return false;
}
export const DrawC2PathElementsFlowWithProvider = (props) => {
    return (
        <ReactFlowProvider>
            <DrawC2PathElementsFlow {...props} />
        </ReactFlowProvider>
    )
}
export const DrawC2PathElementsFlow = ({edges, panel, view_config, contextMenu, providedNodes, filterOptions, focusedCallbackId, onOpenTab}) =>{
    const theme = useTheme();
    const [graphData, setGraphData] = React.useState({nodes: [], edges: [], groups: []});
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const selectedNodes = React.useRef([]);
    const [edgeFlow, setEdgeFlow, onEdgesChange] = useEdgesState([]);
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [contextMenuCoord, setContextMenuCord] = React.useState({});
    const [collapsedEdgeDetails, setCollapsedEdgeDetails] = React.useState(null);
    const graphDataRef = React.useRef(graphData);
    const nodesRef = React.useRef(nodes);
    const viewportRef = React.useRef(null);
    const contextMenuNode = React.useRef(null);
    const {fitView} = useReactFlow()
    const updateNodeInternals = useUpdateNodeInternals();
    const defaultGroupMemberLimit = 12;
    const [expandedGroupIds, setExpandedGroupIds] = React.useState(() => new Set());
    const [groupMemberLimits, setGroupMemberLimits] = React.useState({});
    const expandedGroupSignature = React.useMemo(() => Array.from(expandedGroupIds).sort().join("|"), [expandedGroupIds]);
    const groupMemberLimitSignature = React.useMemo(() => Object.entries(groupMemberLimits)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => `${key}:${value}`)
        .join("|"), [groupMemberLimits]);
    const toggleGroupExpanded = React.useCallback((groupId) => {
        setExpandedGroupIds((current) => {
            const next = new Set(current);
            if(next.has(groupId)){
                next.delete(groupId);
            }else{
                next.add(groupId);
            }
            return next;
        });
    }, []);
    const showMoreGroupMembers = React.useCallback((groupId) => {
        setGroupMemberLimits((current) => ({
            ...current,
            [groupId]: (current[groupId] || defaultGroupMemberLimit) + defaultGroupMemberLimit,
        }));
    }, [defaultGroupMemberLimit]);
    const showFewerGroupMembers = React.useCallback((groupId) => {
        setGroupMemberLimits((current) => ({
            ...current,
            [groupId]: defaultGroupMemberLimit,
        }));
    }, [defaultGroupMemberLimit]);
    const showAllGroupMembers = React.useCallback((groupId, totalCount) => {
        setGroupMemberLimits((current) => ({
            ...current,
            [groupId]: totalCount || defaultGroupMemberLimit,
        }));
    }, [defaultGroupMemberLimit]);
    const inspectCollapsedGroupEdge = React.useCallback((details) => {
        setCollapsedEdgeDetails(details);
    }, []);
    React.useEffect(() => {
        graphDataRef.current = graphData;
    }, [graphData]);
    React.useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);
    const applyNodeSelection = React.useCallback((nextSelectedNodes) => {
        const currentGraphData = graphDataRef.current;
        const currentNodes = nodesRef.current;
        selectedNodes.current = nextSelectedNodes;
        const connectedEdges = getConnectedEdges(selectedNodes.current, currentGraphData.edges);
        const updatedEdges = currentGraphData.edges.map( e => {
            let included = connectedEdges.filter( ce => ce.id === e.id).length > 0;
            const fallbackStroke = theme.palette.text.secondary || theme.palette.secondary.main;
            if(included){
                return {...e,
                    animated: e.animated,
                    oldAnimated: e.oldAnimated ? e.oldAnimated : e.animated,
                    oldStyle: e.oldStyle ? e.oldStyle : e.style,
                    style: {
                        stroke: getEdgeHighlightStroke(e, fallbackStroke),
                        strokeWidth: 4,
                    }
                }
            } else {
                return {...e,
                    animated: false,
                    oldAnimated: e.oldAnimated  ? e.oldAnimated : e.animated,
                    oldStyle: e.oldStyle ? e.oldStyle : e.style,
                    style: {
                        stroke: theme.palette.secondary.main,
                        strokeWidth: 0.25,
                    }
                }
            }
        });
        setEdgeFlow(updatedEdges);
        const updatedNodes = currentNodes.map( n => {
            let isSelected = selectedNodes.current.filter( s => s.id === n.id).length > 0;
            if(isSelected){
                return {...n, data: {...n.data, selected: true, anySelected: selectedNodes.current.length > 0}};
            } else {
                return {...n, data: {...n.data, selected: false, anySelected: selectedNodes.current.length > 0}};
            }
        });
        setNodes(updatedNodes);
    }, [setEdgeFlow, setNodes, theme.palette.secondary.main, theme.palette.text.secondary]);
    const selectGroupCallback = React.useCallback((callbackId) => {
        const matchingNode = nodesRef.current.find((node) => (
            String(node.id) === String(callbackId) ||
            String(node.data?.id) === String(callbackId) ||
            String(node.data?.callback_id) === String(callbackId)
        ));
        if(!matchingNode){return}
        applyNodeSelection([matchingNode]);
    }, [applyNodeSelection]);
    const graphInputSignature = React.useMemo(() => getGraphInputSignature({
        edges,
        providedNodes,
        view_config,
        filterOptions,
        focusedCallbackId,
        theme,
        expandedGroupSignature,
        groupMemberLimitSignature,
    }), [
        edges,
        providedNodes,
        view_config,
        filterOptions,
        focusedCallbackId,
        theme,
        expandedGroupSignature,
        groupMemberLimitSignature,
    ]);
    const latestGraphInputs = React.useRef({});
    latestGraphInputs.current = {
        edges,
        providedNodes,
        view_config,
        filterOptions,
        focusedCallbackId,
        theme,
        expandedGroupIds,
        groupMemberLimits,
        defaultGroupMemberLimit,
        toggleGroupExpanded,
        showMoreGroupMembers,
        showFewerGroupMembers,
        showAllGroupMembers,
        inspectCollapsedGroupEdge,
        selectGroupCallback,
    };
    const getViewportContextMenuCoordinates = useCallback((event) => {
        return {
            top: event.clientY,
            left: event.clientX,
        };
    }, []);
    const onDownloadImageClickSvg = () => {
        // we calculate a transform for the nodes so that all nodes are visible
        // we then overwrite the transform of the `.react-flow__viewport` element
        // with the style option of the html-to-image library
        snackActions.info("Saving image to svg...");
        toSvg(viewportRef.current, {
            width: viewportRef.current.offsetWidth,
            height: viewportRef.current.offsetHeight,
            style: {
                width: viewportRef.current.clientWidth,
                height: viewportRef.current.clientHeight,
            },
        }).then((dataUrl) => {
            const a = document.createElement('a');
            a.setAttribute('download', 'c2_graph.svg');
            a.setAttribute('href', dataUrl);
            a.click();
        });
    };
    const onDownloadImageClickPng = () => {
        // we calculate a transform for the nodes so that all nodes are visible
        // we then overwrite the transform of the `.react-flow__viewport` element
        // with the style option of the html-to-image library
        snackActions.info("Saving image to png...");
        toPng(viewportRef.current, {
            width: viewportRef.current.offsetWidth,
            height: viewportRef.current.offsetHeight,
            style: {
                width: viewportRef.current.clientWidth,
                height: viewportRef.current.clientHeight,
            },
        }).then((dataUrl) => {
            const a = document.createElement('a');
            a.setAttribute('download', 'c2_graph.png');
            a.setAttribute('href', dataUrl);
            a.click();
        });
    };
    const onNodeContextMenu = useCallback( (event, node) => {
        if(!contextMenu){return}
        if(node.type === "groupNode"){
            return;
        }
        event.preventDefault();
        contextMenuNode.current = {...node.data, id: node.data.callback_id};
        setContextMenuCord(getViewportContextMenuCoordinates(event));
        setOpenContextMenu(true);
    }, [contextMenu, getViewportContextMenuCoordinates])
    const onPaneClick = useCallback( () => {
        setOpenContextMenu(false);
        selectedNodes.current = [];
        const updatedEdges = graphData.edges.map( e => {
            return {...e,
                animated: e.oldAnimated ? e.oldAnimated : e.animated,
                style: e.oldStyle ? e.oldStyle : e.style,
                oldAnimated: null,
                oldStyle: null
            }
        });
        setEdgeFlow(updatedEdges);
        const updatedNodes = nodes.map( n => {
            return {...n, data: {...n.data, selected: false, anySelected: false}};
        });
        setNodes(updatedNodes);
        //setGraphData({...graphData, edges: updatedEdges});
    }, [setOpenContextMenu, graphData, nodes, setEdgeFlow, setNodes]);
    const onNodeSelected = useCallback( (event, node) => {
        let nextSelectedNodes = [];
        if(event.shiftKey){
            let alreadySelected = selectedNodes.current.filter( s => s.id === node.id).length > 0;
            if(alreadySelected){
                nextSelectedNodes = selectedNodes.current.filter(s => s.id !== node.id);
            } else {
                nextSelectedNodes = [...selectedNodes.current, node];
            }
        } else {
            nextSelectedNodes = [node];
        }
        applyNodeSelection(nextSelectedNodes);
    }, [applyNodeSelection])
    React.useEffect( () => {
        const {
            edges = [],
            providedNodes = [],
            view_config,
            filterOptions,
            focusedCallbackId,
            theme,
            expandedGroupIds,
            groupMemberLimits,
            defaultGroupMemberLimit,
            toggleGroupExpanded,
            showMoreGroupMembers,
            showFewerGroupMembers,
            showAllGroupMembers,
            inspectCollapsedGroupEdge,
            selectGroupCallback,
        } = latestGraphInputs.current;
        let tempNodes = [{
            id: "Mythic",
            position: { x: 0, y: 0 },
            type: "agentNode",
            height: 100,
            width: 50,
            data: {label: "Mythic", img: "/static/mythic.svg", isMythic: true}
        }];
        let tempEdges = [];
        let parentIds = [];
        const useGroupSummaries = shouldUseGroups(view_config);
        const groupStats = new Map();
        const directEgressRoutesByNode = new Map();
        const getGroupMemberLimit = (groupId) => groupMemberLimits?.[groupId] || defaultGroupMemberLimit;
        const isDirectEgressEdge = (edge) => edge?.source?.id === edge?.destination?.id && !edge?.c2profile?.is_p2p;
        const registerDirectEgressRoute = (edge) => {
            if(!isDirectEgressEdge(edge)){return}
            if(!view_config["include_disconnected"] && edge.end_timestamp !== null){return}
            const nodeId = String(edge.source.id);
            if(!directEgressRoutesByNode.has(nodeId)){
                directEgressRoutesByNode.set(nodeId, new Map());
            }
            const profileName = edge.c2profile?.name || "Unknown profile";
            const nodeRoutes = directEgressRoutesByNode.get(nodeId);
            const existingRoute = nodeRoutes.get(profileName);
            if(!existingRoute || edge.id >= existingRoute.id){
                nodeRoutes.set(profileName, {
                    id: edge.id,
                    profile: profileName,
                    has_logo: edge.c2profile?.has_logo || false,
                    active: edge.end_timestamp === null,
                    end_timestamp: edge.end_timestamp,
                });
            }
        };
        const getDirectEgressRoutes = (nodeId) => {
            if(!useGroupSummaries){return []}
            const routes = Array.from(directEgressRoutesByNode.get(String(nodeId))?.values() || []);
            return routes.sort((a, b) => {
                if(a.active !== b.active){return a.active ? -1 : 1}
                return b.id - a.id;
            });
        };
        const getAgentNodeHeight = (nodeId) => getDirectEgressRoutes(nodeId).length > 0 ? 132 : 50;
        const getAgentNodeWidth = (nodeId) => getDirectEgressRoutes(nodeId).length > 0 ? 160 : 50;
        const ensureCallbackGroup = (node) => {
            if(!useGroupSummaries || !node){return null}
            const label = getCallbackGraphGroupLabel(node, view_config);
            const groupId = getCallbackGraphGroupIdFromLabel(label);
            if(!groupStats.has(groupId)){
                const groupInfo = {
                    id: groupId,
                    label,
                    members: new Map(),
                    totalCount: 0,
                    activeCount: 0,
                    p2pEdgeIds: new Set(),
                    egressEdgeIds: new Set(),
                    edgeDetails: new Map(),
                    payloadTypes: new Set(),
                    osValues: new Set(),
                };
                groupStats.set(groupId, groupInfo);
                parentIds.push({
                    id: groupId,
                    position: { x: 110, y: 110 },
                    type: "groupNode",
                    width: 280,
                    height: 118,
                    data: {
                        callbackGroup: true,
                        groupId,
                        label,
                    },
                });
            }
            return groupStats.get(groupId);
        };
        const registerGroupMember = (node, edge) => {
            const group = ensureCallbackGroup(node);
            if(!group || !node){return}
            if(!group.members.has(node.id)){
                group.members.set(node.id, node);
                group.totalCount += 1;
                if(node.active){
                    group.activeCount += 1;
                }
                if(node.payload?.payloadtype?.name){
                    group.payloadTypes.add(node.payload.payloadtype.name);
                }
                if(node.os){
                    group.osValues.add(node.os);
                }
            }
            if(edge?.c2profile?.is_p2p){
                group.p2pEdgeIds.add(edge.id);
            } else if(edge?.c2profile){
                group.egressEdgeIds.add(edge.id);
            }
            if(edge?.id !== undefined){
                group.edgeDetails.set(edge.id, getCollapsedGroupEdgeDetail(edge));
            }
        };
        const getVisibleGroupMemberIds = () => {
            const visibleMembersByGroup = new Map();
            groupStats.forEach((group) => {
                const expanded = expandedGroupIds?.has(group.id);
                const limit = Math.min(getGroupMemberLimit(group.id), group.totalCount);
                const members = Array.from(group.members.values())
                    .sort((a, b) => b.display_id - a.display_id);
                visibleMembersByGroup.set(group.id, new Set(expanded ? members.slice(0, limit).map((member) => member.id) : []));
            });
            return visibleMembersByGroup;
        };
        let visibleGroupMemberIds = new Map();
        const isCallbackNodeVisible = (node) => {
            if(!useGroupSummaries){return true}
            const groupId = getCallbackGraphGroupId(node, view_config);
            return visibleGroupMemberIds.get(groupId)?.has(node.id) || false;
        };
        const getGraphEndpointId = (node) => {
            if(!useGroupSummaries || isCallbackNodeVisible(node)){
                return `${node.id}`;
            }
            return getCallbackGraphGroupId(node, view_config);
        };
        const getGraphEndpointData = (node) => {
            if(!useGroupSummaries || isCallbackNodeVisible(node)){
                return getCallbackGraphEndpoint(node, view_config);
            }
            const label = getCallbackGraphGroupLabel(node, view_config);
            return {
                id: getCallbackGraphGroupIdFromLabel(label),
                display_id: label,
                parentId: getCallbackGraphGroupIdFromLabel(label),
                groupCollapsed: true,
            }
        };

        const add_edge_to_mythic = (edge, view_config) => {
            if(!edge.source.active && !view_config["show_all_nodes"]){return}
            add_node(edge.source, view_config);
            const sourceEndpointId = getGraphEndpointId(edge.source);
            let found = false;
            let edgeID = `e${sourceEndpointId}-Mythic-${edge.c2profile.name}`;
            for(let i = 0; i < tempEdges.length; i++){
                if(tempEdges[i].id === edgeID){
                    found = true;
                    if(edge.id >= tempEdges[i].mythic_id){
                        tempEdges[i].data.end_timestamp = edge.end_timestamp;
                    }
                    break;
                }
            }
            if(!found){
                tempEdges.push(
                    {
                        id: edgeID,
                        mythic_id: edge.id,
                        source: sourceEndpointId,
                        target: "Mythic",
                        type: "C2IconEdge",
                        animated: true,
                        label: edge.c2profile.name,
                        data: {
                            has_logo: edge.c2profile.has_logo,
                            is_p2p: edge.c2profile.is_p2p,
                            source: getGraphEndpointData(edge.source),
                            target: {parentId: "Mythic"},
                            end_timestamp: edge.end_timestamp,
                        }
                    },
                )
            }
        }
        const add_node = (node, view_config) => {
            const group = ensureCallbackGroup(node);
            if(useGroupSummaries && !isCallbackNodeVisible(node)){
                return;
            }
            let groupByValue = group?.id || getGroupBy(node, view_config);
            let nodeID = `${node.id}`;
            let found = false;
            for(let i = 0; i < tempNodes.length; i++){
                if(tempNodes[i].id === nodeID){
                    found = true;
                    break;
                }
            }
            if(!found){
                tempNodes.push(
                    {
                        id: `${node.id}`,
                        position: { x: 0, y: 0 },
                        type: "agentNode",
                        height: getAgentNodeHeight(node.id),
                        width: getAgentNodeWidth(node.id),
                        parentId: useGroupSummaries ? groupByValue : undefined,
                        group: useGroupSummaries ? groupByValue : undefined,
                        extent: useGroupSummaries ? "parent" : undefined,
                        data: {
                            label: getLabel(node, view_config["label_components"]),
                            img: "/static/" + node.payload.payloadtype.name + "_" + theme.palette.mode + ".svg",
                            isMythic: false,
                            isFocused: String(node.id) === String(focusedCallbackId),
                            callback_id: node.id,
                            display_id: node.display_id,
                            egressRoutes: getDirectEgressRoutes(node.id),
                        }
                    }
                )
            }
        }
        const add_direct_egress_to_node = (edge, view_config) => {
            if(!edge.source.active && !view_config["show_all_nodes"]){return}
            add_node(edge.source, view_config);
        }
        const add_edge_p2p = (edge, view_config) => {
            if(!edge.source.active && !edge.destination.active && !view_config["show_all_nodes"]){
                return;
            }else if(!view_config["show_all_nodes"]){
                //at least one of the two nodes is active and we don't want to show all the nodes
                if(edge.source.active){add_node(edge.source, view_config)}
                if(edge.destination.active){add_node(edge.destination, view_config)}
                // not adding an edge because one of the nodes could be non-existent
                if(!edge.source.active || !edge.destination.active){
                    return;
                }
            }else{
                add_node(edge.source, view_config);
                add_node(edge.destination, view_config);
            }
            if(view_config["packet_flow_view"]){
                createEdge(edge, true);
            }else{
                createEdge(edge, false);
            }
        }
        const createEdge = (edge, egress_flow) =>{
            let found = false;
            const sourceEndpointId = getGraphEndpointId(edge.source);
            const destinationEndpointId = getGraphEndpointId(edge.destination);
            if(edge.source.id !== edge.destination.id && sourceEndpointId === destinationEndpointId){
                return;
            }
            let edgeID = `e${sourceEndpointId}-${destinationEndpointId}-${edge.c2profile.name}`;
            if(egress_flow){
                if(edge.source_to_mythic){
                    edgeID = `e${destinationEndpointId}-${sourceEndpointId}-${edge.c2profile.name}`;
                    for(let i = 0; i < tempEdges.length; i++){
                        if(tempEdges[i].id === edgeID ){
                            found = true;
                            if(edge.id >= tempEdges[i].mythic_id){
                                tempEdges[i].data.end_timestamp = edge.end_timestamp;
                            }
                            break;
                        }
                    }
                    if(!found){
                        tempEdges.push(
                            {
                                id: edgeID,
                                mythic_id: edge.id,
                                source: destinationEndpointId,
                                target: sourceEndpointId,
                                label: edge.c2profile.name,
                                animated: true,
                                type: "C2IconEdge",
                                data: {
                                    end_timestamp: edge.end_timestamp,
                                    has_logo: edge.c2profile.has_logo,
                                    is_p2p: edge.c2profile.is_p2p,
                                    source: getGraphEndpointData(edge.destination),
                                    target: getGraphEndpointData(edge.source),
                                }
                            },
                        )
                    }

                    /*
                    g.setEdge(edge.destination.id, edge.source.id,  {label: edge.c2profile.name, edge_id: edge.id,end_timestamp: edge.end_timestamp,
                        style: edge.end_timestamp === null ? connected: disconnected, labelStyle: edgeLabelStyle,
                        arrowheadStyle: edge.end_timestamp === null ? connectedArrow : disconnectedArrow}, edge.c2profile.name)

                     */
                } else {
                    for(let i = 0; i < tempEdges.length; i++){
                        if(tempEdges[i].id === edgeID){
                            found = true;
                            if(edge.id >= tempEdges[i].mythic_id){
                                tempEdges[i].data.end_timestamp = edge.end_timestamp;
                            }
                            break;
                        }
                    }
                    if(!found){
                        tempEdges.push(
                            {
                                id: edgeID,
                                mythic_id: edge.id,
                                source: sourceEndpointId,
                                target: destinationEndpointId,
                                label: edge.c2profile.name,
                                animated: true,
                                type: "C2IconEdge",
                                data: {
                                    end_timestamp: edge.end_timestamp,
                                    has_logo: edge.c2profile.has_logo,
                                    is_p2p: edge.c2profile.is_p2p,
                                    source: getGraphEndpointData(edge.source),
                                    target: getGraphEndpointData(edge.destination),
                                }
                            },
                        )
                    }

                    /*
                    g.setEdge(edge.source.id, edge.destination.id,  {label: edge.c2profile.name, edge_id: edge.id,end_timestamp: edge.end_timestamp,
                        style: edge.end_timestamp === null ? connected: disconnected, labelStyle: edgeLabelStyle,
                        arrowheadStyle: edge.end_timestamp === null ? connectedArrow : disconnectedArrow}, edge.c2profile.name)

                     */
                }

            }else{
                for(let i = 0; i < tempEdges.length; i++){
                    if(tempEdges[i].id === edgeID){
                        found = true;
                        if(edge.id >= tempEdges[i].mythic_id){
                            tempEdges[i].data.end_timestamp = edge.end_timestamp;
                        }
                        break;
                    }
                }
                if(!found){
                    tempEdges.push(
                        {
                            id: edgeID,
                            mythic_id: edge.id,
                            source: sourceEndpointId,
                            target: destinationEndpointId,
                            label: edge.c2profile.name,
                            animated: true,
                            type: "C2IconEdge",
                            data: {
                                end_timestamp: edge.end_timestamp,
                                has_logo: edge.c2profile.has_logo,
                                is_p2p: edge.c2profile.is_p2p,
                                source: getGraphEndpointData(edge.source),
                                target: getGraphEndpointData(edge.destination),
                            }
                        },
                    )
                }
            }
        }
        const hasEdge = (sourceId, destinationId, c2ProfileName) => {
            const sourceKey = String(sourceId);
            const destinationKey = String(destinationId);
            for(let i = 0; i < tempEdges.length; i++){
                if(tempEdges[i].source === sourceKey &&
                    tempEdges[i].target === destinationKey &&
                    tempEdges[i].label === c2ProfileName){
                    return true;
                }
            }
            return false;
        }
        const hasFakeEdge = (sourceID) => {
            for(let i = 0; i < tempEdges.length; i++){
                if(tempEdges[i].data.source.parentId === sourceID &&
                    tempEdges[i].data.label === ""
                ){
                    return true;
                }
            }
            return false;
        }
        const getEdge = (sourceId, destinationId, c2ProfileName) => {
            const sourceKey = String(sourceId);
            const destinationKey = String(destinationId);
            for(let i = 0; i < tempEdges.length; i++){
                if(tempEdges[i].source === sourceKey &&
                    tempEdges[i].target === destinationKey &&
                    tempEdges[i].label === c2ProfileName){
                    return tempEdges[i];
                }
            }
            return false;
        }
        const filterRow = (row) => {
            if(filterOptions === undefined){return false}
            for(const [key,value] of Object.entries(filterOptions)){
                if(key === "agent"){
                    if(!String(row.payload.payloadtype.name).toLowerCase().includes(String(value).toLowerCase())){
                        return true;
                    }
                }else{
                    if(!String(row[key]).toLowerCase().includes(String(value).toLowerCase())){
                        return true;
                    }
                }

            }
            return false;
        }
        const createNewEdges = () => {
            // loop through until all edges have one side marked as "toward_mythic"
            let tempNewEdges = edges.reduce((prev, cur) => {
                if(filterRow(cur.source) || filterRow(cur.destination)){
                    return prev;
                }
                prev.push({
                    edge: cur,
                    sourceToMythic: false,
                    destinationToMythic: false,
                });
                return prev;
            }, []);
            let edgesToUpdate = tempNewEdges.length;
            if (edgesToUpdate === 0) {return []}
            let toMythicIds = new Set();
            for(let loop_count = 0; loop_count <= 2 * edgesToUpdate; loop_count++){
                let changed = false;
                let complete = true;
                for(let i = 0; i < tempNewEdges.length; i++){
                    const current = tempNewEdges[i];
                    const edge = current.edge;
                    if(!current.sourceToMythic && !current.destinationToMythic){
                        complete = false;
                        if(edge.source.id === edge.destination.id){
                            current.sourceToMythic = true;
                            current.destinationToMythic = true;
                            toMythicIds.add(edge.source.id);
                            changed = true;
                        } else if(toMythicIds.has(edge.source.id)){
                            current.sourceToMythic = true;
                            current.destinationToMythic = false;
                            changed = true;
                        } else if(toMythicIds.has(edge.destination.id)){
                            current.destinationToMythic = true;
                            current.sourceToMythic = false;
                            changed = true;
                        } else {
                            // check if either source/destination has any edges that identify
                            for(let j = 0; j < tempNewEdges.length; j++){
                                const candidate = tempNewEdges[j];
                                const candidateEdge = candidate.edge;
                                if(candidateEdge.source.id === edge.source.id){
                                    // only look at edges that contain our source
                                    if(candidate.destinationToMythic){
                                        current.sourceToMythic = true;
                                        changed = true;
                                        break;
                                    }
                                } else if(candidateEdge.destination.id === edge.source.id){
                                    if(candidate.sourceToMythic){
                                        current.sourceToMythic = true;
                                        changed = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                if(complete || !changed){break}
            }
            return tempNewEdges.map(({edge, sourceToMythic, destinationToMythic}) => ({
                ...edge,
                source_to_mythic: sourceToMythic,
                destination_to_mythic: destinationToMythic,
            }))
	        }
        let updatedEdges = createNewEdges();
        if(useGroupSummaries){
            updatedEdges.forEach(registerDirectEgressRoute);
        }
	        const registerEdgeNodesForGroups = (edge) => {
            if(!view_config["include_disconnected"] && edge.end_timestamp !== null){return}
            if(edge.destination.id === edge.source.id){
                if(edge.source.active || view_config["show_all_nodes"]){
                    registerGroupMember(edge.source, edge);
                }
                return;
            }
            if(!edge.source.active && !edge.destination.active && !view_config["show_all_nodes"]){
                return;
            }else if(!view_config["show_all_nodes"]){
                if(edge.source.active){registerGroupMember(edge.source, edge)}
                if(edge.destination.active){registerGroupMember(edge.destination, edge)}
            }else{
                registerGroupMember(edge.source, edge);
                registerGroupMember(edge.destination, edge);
            }
        };
        if(useGroupSummaries){
            if(providedNodes){
                for(let i = 0; i < providedNodes.length; i++){
                    if(view_config["show_all_nodes"]) {
                        if(filterRow(providedNodes[i])){
                            continue
                        }
                        registerGroupMember(providedNodes[i]);
                    }
                }
            }
            updatedEdges.forEach(registerEdgeNodesForGroups);
            visibleGroupMemberIds = getVisibleGroupMemberIds();
            parentIds = parentIds.map((groupNode) => {
                const group = groupStats.get(groupNode.id);
                if(!group){return groupNode}
                const expanded = expandedGroupIds?.has(group.id);
                const members = Array.from(group.members.values()).sort((a, b) => b.display_id - a.display_id);
                const edgeDetails = Array.from(group.edgeDetails.values()).sort((a, b) => b.id - a.id);
                const routeSummary = getCollapsedGroupRouteSummary(edgeDetails);
                const summaryDetails = {
                    groupId: group.id,
                    groupLabel: group.label,
                    routeSummary,
                    edges: edgeDetails,
                };
                const shownCount = expanded ? Math.min(getGroupMemberLimit(group.id), members.length) : 0;
                const visibleMembers = members.slice(0, shownCount).map((member) => ({
                    id: member.id,
                    display_id: member.display_id,
                    active: member.active,
                }));
                const data = {
                    ...groupNode.data,
                    callbackGroup: true,
                    id: group.id,
                    groupId: group.id,
                    label: group.label,
                    groupTypeLabel: `${view_config.group_by} group`,
                    expanded,
                    totalCount: group.totalCount,
                    activeCount: group.activeCount,
                    p2pCount: group.p2pEdgeIds.size,
                    egressCount: group.egressEdgeIds.size,
                    payloadTypes: Array.from(group.payloadTypes).sort().slice(0, 3),
                    routeSummary,
                    summaryDetails,
                    visibleMembers,
                    shownCount,
                    hiddenMemberCount: Math.max(0, members.length - shownCount),
                    defaultMemberLimit: defaultGroupMemberLimit,
                    onToggleGroup: toggleGroupExpanded,
                    onShowMoreGroup: showMoreGroupMembers,
                    onShowFewerGroup: showFewerGroupMembers,
                    onShowAllGroup: showAllGroupMembers,
                    onInspectGroupRoutes: inspectCollapsedGroupEdge,
                    onSelectGroupMember: selectGroupCallback,
                };
                return {
                    ...groupNode,
                    width: getCallbackGroupWidth({data}),
                    height: getCallbackGroupHeight({data}),
                    data,
                };
            });
        }
        if(providedNodes){
            for(let i = 0; i < providedNodes.length; i++){
                if(view_config["show_all_nodes"]) {
                    if(filterRow(providedNodes[i])){
                        continue
                    }
                    add_node(providedNodes[i], view_config);
                }
            }
        }
        const shouldRenderDetailedEdge = (edge) => {
            if(!useGroupSummaries){return true}
            if(edge.source.id === edge.destination.id){
                return isCallbackNodeVisible(edge.source);
            }
            return isCallbackNodeVisible(edge.source) && isCallbackNodeVisible(edge.destination);
        };
        const addCollapsedGroupRouteEdges = () => {
            if(!useGroupSummaries){return}
            parentIds.forEach((groupNode) => {
                const data = groupNode.data || {};
                if(!data.callbackGroup){return}
                const routeSummary = data.routeSummary || getCollapsedGroupRouteSummary([]);
                const group = groupStats.get(groupNode.id);
                const edgeDetails = Array.from(group?.edgeDetails?.values() || []).sort((a, b) => b.id - a.id);
                const latestEdgeId = edgeDetails.reduce((maxId, edge) => Math.max(maxId, edge.id || 0), 0);
                tempEdges.push({
                    id: `collapsed-route-${groupNode.id}-Mythic`,
                    mythic_id: latestEdgeId,
                    source: `${groupNode.id}`,
                    target: "Mythic",
                    sourceHandle: `${groupNode.id}-source`,
                    label: "",
                    animated: true,
                    type: "C2IconEdge",
                    data: {
                        collapsedGroupEdge: true,
                        routeSummary,
                        summaryDetails: {
                            groupId: groupNode.id,
                            groupLabel: data.label,
                            routeSummary,
                            edges: edgeDetails,
                        },
                        source: {parentId: groupNode.id},
                        target: {parentId: "Mythic"},
                        end_timestamp: routeSummary.activeRouteCount > 0 ? null : "collapsed",
                        onInspectCollapsedEdge: inspectCollapsedGroupEdge,
                    }
                });
            });
        };
        addCollapsedGroupRouteEdges();
        // need to add fake edges between parent groups and Mythic so that rendering will be preserved
        updatedEdges.forEach( (edge) => {
            if(!view_config["include_disconnected"] && edge.end_timestamp !== null){return}
            if(!shouldRenderDetailedEdge(edge)){return}
            if(isDirectEgressEdge(edge)){
                if(useGroupSummaries){
                    add_direct_egress_to_node(edge, view_config);
                }else{
                    add_edge_to_mythic(edge, view_config);
                }
            }else{
                let source_str_id = getGraphEndpointId(edge.source);
                let destination_str_id = getGraphEndpointId(edge.destination);
                if(source_str_id === destination_str_id){return}
                if(view_config["packet_flow_view"]){
                    // destination -> source
                    if(hasEdge(destination_str_id, source_str_id, edge.c2profile.name)){
                        //we've seen an edge between these two before
                        if(edge.id > getEdge(destination_str_id, source_str_id, edge.c2profile.name).mythic_id){
                            add_edge_p2p(edge, view_config);
                        }else{
                            //console.log("doing nothing, dropping data");
                        }
                    }else{
                        //this is a new edge
                        add_edge_p2p(edge, view_config);
                    }

                } else {
                    // source -> destination
                    if(hasEdge(source_str_id, destination_str_id, edge.c2profile.name)){
                        //we've seen an edge between these two before
                        if(edge.id > getEdge(source_str_id, destination_str_id, edge.c2profile.name).mythic_id){
                            add_edge_p2p(edge, view_config);
                        }else{
                            //console.log("doing nothing, dropping data");
                        }
                    }else{
                        //this is a new edge
                        add_edge_p2p(edge, view_config);
                    }
                }
            }
	        });
	        const visibleNodeCount = tempNodes.filter((node) => !node.hidden).length;
	        const shouldAnimateEdges = visibleNodeCount <= 20;
	        const getDefaultEdgeColor = (tone) => {
	            if(tone === "success" || tone === "active"){return theme.palette.success.main}
	            if(tone === "ended" || tone === "error"){return theme.palette.error.main}
	            if(tone === "warning"){return theme.palette.warning.main}
	            return theme.palette.text.secondary || theme.palette.divider;
	        };
	        for(let i = 0; i < tempEdges.length; i++){
	            const edgeTone = tempEdges[i].data?.collapsedGroupEdge ?
	                (tempEdges[i].data.routeSummary?.tone || "neutral") :
	                (tempEdges[i].data.end_timestamp === null ? "active" : "ended");
	            const edgeColor = getDefaultEdgeColor(edgeTone);
	            tempEdges[i].className = `mythic-c2-edge mythic-c2-edge-${edgeTone} ${tempEdges[i].data?.collapsedGroupEdge ? "mythic-c2-edge-aggregate" : "mythic-c2-edge-route"}`;
	            if(tempEdges[i].data?.collapsedGroupEdge){
	                const tone = tempEdges[i].data.routeSummary?.tone || "neutral";
	                tempEdges[i].markerEnd = {
	                    color: edgeColor,
	                };
	                tempEdges[i].style = {
	                    stroke: edgeColor,
	                    strokeWidth: tone === "success" ? 2.5 : 2.25,
	                    strokeDasharray: tone === "success" ? "7 5" : undefined,
	                    opacity: tone === "neutral" ? 0.78 : 0.92,
	                };
                tempEdges[i].labelBgStyle = {
                    fill: "transparent",
                    fillOpacity: 0,
                };
                tempEdges[i].labelStyle = {
                    fill: "transparent",
                };
                tempEdges[i].labelShowBg = false;
	                tempEdges[i].zIndex = 28;
                tempEdges[i].animated = shouldAnimateEdges && tone === "success";
	            }else if(tempEdges[i].data.end_timestamp === null){
	                tempEdges[i].markerEnd = {
	                    color: edgeColor,
	                }
	                tempEdges[i].style = {
	                    stroke: edgeColor,
	                    strokeWidth: 2.55,
	                    strokeDasharray: "7 5",
	                    opacity: 0.95,
	                }
	            } else {
	                tempEdges[i].markerEnd = {
	                    color: edgeColor,
	                }
	                tempEdges[i].style = {
	                    stroke: edgeColor,
	                    strokeWidth: 2.25,
	                    opacity: 0.88,
	                }
            }
            tempEdges[i].markerEnd.type = "arrowclosed"
            if(!tempEdges[i].data?.collapsedGroupEdge){
                tempEdges[i].labelBgStyle = {
                    fill: theme.tableHover,
                    fillOpacity: 0.8,
                }
                tempEdges[i].labelStyle = {
                    fill: theme.palette.background.contrast,
                }
                tempEdges[i].labelShowBg = true
	                tempEdges[i].zIndex = 26;
                tempEdges[i].animated = shouldAnimateEdges && tempEdges[i].data.end_timestamp === null;
            }
        }
        if(shouldUseGroups(view_config)){
            // only add in edges from parents to parents/mythic if we're doing egress flow
            for(let i = 0; i < parentIds.length; i++){
                // every parentNode needs a connection to _something_ - either to Mythic or another parentNode
                for(let j = 0; j < tempEdges.length; j++){
                    //console.log("checking", parentNodes[i].id, tempEdges[j].data.source.parentNode, tempEdges[j].data.target.parentNode)
                    if(tempEdges[j].source === parentIds[i].id){
                        continue;
                    }
                    if(tempEdges[j].data.source.parentId === parentIds[i].id){
                        // don't process where source.parentNode == target.parentNode
                        if(parentIds[i].id === tempEdges[j].data.target.parentId){
                            //console.log("skipping")
                            continue
                        }
                        if(!hasFakeEdge(`${parentIds[i].id}`)){
                            //console.log("adding new fake edge")
                            tempEdges.push(
                                {
                                    id: `e${parentIds[i].id}-${tempEdges[j].data.target.parentId}`,
                                    mythic_id: 0,
                                    source: `${parentIds[i].id}`,
                                    target: tempEdges[j].data.target.parentId,
                                    label: "",
                                    hidden: true,
                                    type: "C2IconEdge",
                                    data: {
                                        source: {parentId: parentIds[i].id},
                                        target: tempEdges[j].data.target,
                                        label: "",
                                        end_timestamp: null
                                    }
                                },
                            )
                        } else if(tempEdges[j].data.target.parentId === "Mythic") {
                            //console.log("fake edge is for Mythic, and one exists already - update it")
                            for(let k = tempEdges.length-1; k >= 0 ; k--){
                                if(tempEdges[k].source === parentIds[i].id){
                                    tempEdges[k] = {
                                        id: `e${parentIds[i].id}-${tempEdges[j].data.target.parentId}`,
                                        mythic_id: 0,
                                        source: `${parentIds[i].id}`,
                                        target: tempEdges[j].data.target.parentId,
                                        label: "",
                                        hidden: true,
                                        type: "C2IconEdge",
                                        data: {
                                            source: {parentId: parentIds[i].id},
                                            target: tempEdges[j].data.target,
                                            label: "",
                                            end_timestamp: null
                                        }
                                    }
                                    break;
                                }
                            }
                        } else {
                            //console.log("already have fake edge added, skipping")
                        }
                    }
                }

                if(!parentIds[i].data?.callbackGroup || parentIds[i].data?.expanded){
                    tempNodes.push({
                        id: `${parentIds[i].id}-widthAdjuster`,
                        position: { x: 0, y: 0 },
                        type: "agentNode",
                        height: 100,
                        width: 50,
                        parentId: `${parentIds[i].id}`,
                        group: `${parentIds[i].id}`,
                        hidden: true,
                        data: {label: `${parentIds[i].id}`}
                    })
                }
            }
        }
        for(let i = 0; i < tempNodes.length; i++) {
            let sourceCount = 0;
            for (let j = 0; j < tempEdges.length; j++) {
                if (tempEdges[j].source === tempNodes[i].id) {
                    sourceCount += 1;
                    tempEdges[j].sourceHandle = `${sourceCount}`;
                }
            }
            tempNodes[i].data.sourceCount = sourceCount;
        }
        //console.log([...tempNodes], tempEdges);
        setGraphData({
            groups: shouldUseGroups(view_config) ? parentIds : [],
            nodes: tempNodes,
            edges: tempEdges
        })
    }, [graphInputSignature]);
    React.useEffect( () => {
        let cancelled = false;
        (async () => {
            if(graphData.nodes.length > 0){
                const {newNodes, newEdges} = await createLayout({
                    initialGroups: graphData.groups,
                    initialNodes: graphData.nodes,
                    initialEdges: graphData.edges,
                    alignment: view_config["rankDir"]
                });
                if(cancelled){return}
                setNodes(newNodes);
                setEdgeFlow(newEdges);
                window.requestAnimationFrame(() => {
                    if(cancelled){return}
                    for(let i = 0; i < newNodes.length; i++){
                        updateNodeInternals(newNodes[i].id);
                    }
                    fitView();
                });
            }
        })();
        return () => {
            cancelled = true;
        }
    }, [graphData, view_config, setNodes, setEdgeFlow, updateNodeInternals, fitView]);
    const onlyRenderVisibleGraphElements = nodes.length > 20;
    const showMiniMap = nodes.length <= 250;
    return (
        <div className="mythic-graph-canvas mythic-c2-flow-canvas" style={{height: "100%", width: "100%", position: "relative"}} ref={viewportRef}>
                <ReactFlow
                    fitView
                    onlyRenderVisibleElements={onlyRenderVisibleGraphElements}
                    panOnScrollSpeed={30}
                    maxZoom={100}
                    minZoom={0}
                    nodes={nodes}
                    edges={edgeFlow}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onPaneClick={onPaneClick}
                    onNodeContextMenu={onNodeContextMenu}
                    onNodeClick={onNodeSelected}
                >
                    <Panel position={"top-left"} >{panel}</Panel>
                    <Controls showInteractive={false} className="mythic-graph-controls">
                        <ControlButton onClick={onDownloadImageClickPng} title={"Download PNG"}>
                            <CameraAltIcon />
                        </ControlButton>
                        <ControlButton onClick={onDownloadImageClickSvg} title={"Download SVG"}>
                            <InsertPhotoIcon />
                        </ControlButton>
                    </Controls>
                    {showMiniMap &&
                        <MiniMap pannable={true} zoomable={true}  />
                    }
                </ReactFlow>
            {openContextMenu && typeof document !== "undefined" && createPortal(
                <div style={{...contextMenuCoord, position: "fixed"}} className="context-menu mythic-graph-context-menu">
                    {contextMenu.map( (m) => (
                        <Button key={m.title} color={"info"} className="context-menu-button mythic-graph-context-menu-button" onClick={() => {
                            m.onClick(contextMenuNode.current);
                            setOpenContextMenu(false);
                        }}>{m.title}</Button>
                        ))}
                </div>,
                document.body
            )}
            {collapsedEdgeDetails &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="md"
                    open={Boolean(collapsedEdgeDetails)}
                    onClose={() => setCollapsedEdgeDetails(null)}
                    innerDialog={<C2CollapsedGroupEdgeDialog
                        details={collapsedEdgeDetails}
                        onClose={() => setCollapsedEdgeDetails(null)}
                        onOpenCallbackTasking={onOpenTab ? (callbackId) => {
                            onOpenTab({tabType: "interact", tabID: callbackId + "interact", callbackID: callbackId});
                            setCollapsedEdgeDetails(null);
                        } : undefined}
                    />}
                />
            }
        </div>

    )
}

const shouldUseTaskGroups = (view_config) => {
    if(view_config.group_by !== "None"){
        return true;
    }
    return false;
}
const getGroupTaskBy = (node, view_config) => {
    if(view_config.group_by === "None"){
        return "";
    }
    if(view_config.group_by === "name") {
        try{
            return node?.subtask_group_name || "";
        }catch(error){
            console.log("bad group by", node);
            return "";
        }
    }
}
const getGroupBrowserscriptBy = (node, view_config) => {
    if(view_config.group_by === undefined){return ""}
    if(view_config.group_by === "None" || view_config.group_by === ""){return ""}
    try{
        return node?.[view_config["group_by"]] || "";
    }catch(error){
        console.log(error)
    }
}
export const DrawBrowserScriptElementsFlowWithProvider = (props) => {
    return (
        <ReactFlowProvider>
            <DrawBrowserScriptElementsFlow {...props} />
        </ReactFlowProvider>
    )
}
export const DrawBrowserScriptElementsFlow = ({edges, panel, view_config, theme, contextMenu, providedNodes, task}) => {
    const [graphData, setGraphData] = React.useState({nodes: [], edges: [], groups: [], view_config});
    const selectedNodes = React.useRef([]);
    const selectedEdges = React.useRef([]);
    const [localContextMenu, setLocalContextMenu] = React.useState(contextMenu);
    const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
    const [openDictionaryButton, setOpenDictionaryButton] = React.useState(false);
    const [openStringButton, setOpenStringButton] = React.useState(false);
    const [openTableButton, setOpenTableButton] = React.useState(false);
    const [taskingData, setTaskingData] = React.useState({});
    const finishedTasking = () => {
        setOpenTaskingButton(false);
        setOpenDictionaryButton(false);
        setOpenStringButton(false);
        setOpenTableButton(false);
        setTaskingData({});
    }
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edgeFlow, setEdgeFlow, onEdgesChange] = useEdgesState([]);
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [contextMenuCoord, setContextMenuCord] = React.useState({});
    const viewportRef = React.useRef(null);
    const contextMenuNode = React.useRef(null);
    const [localViewConfig, setLocalViewConfig] = React.useState(view_config);
    const {fitView} = useReactFlow();
    const updateNodeInternals = useUpdateNodeInternals();
    const onPaneContextMenu = useCallback( (event) => {
        event.preventDefault();
        contextMenuNode.current = {};
        setContextMenuCord({
            top:  event.clientY,
            left:  event.clientX,
        });
        let tempContextMenu = [{
            title: "Unselect All",
            onClick: function() {
                selectedNodes.current = [];
                selectedEdges.current = [];
                const updatedEdges = edgeFlow.map( e => {
                    const graphEdge = graphData.edges.filter((edge) => edge.id === e.id);
                    if(graphEdge.length > 0){
                        return {...graphEdge[0],
                            animated: graphEdge[0].oldAnimated ? graphEdge[0].oldAnimated : graphEdge[0].animated,
                            style: graphEdge[0].oldStyle ? graphEdge[0].oldStyle : graphEdge[0].style,
                            oldAnimated: null,
                            oldStyle: null
                        }
                    }

                });
                const updatedNodes = nodes.map( n => {
                    return {...n, data: {...n.data, selected: false, anySelected: false}};
                });
                setNodes(updatedNodes);
                setEdgeFlow(updatedEdges);
            }
        }];
        setLocalContextMenu(tempContextMenu);
        setOpenContextMenu(true);
    }, [edgeFlow, nodes, setOpenContextMenu, graphData.edges])
    const onNodeContextMenu = useCallback( (event, node) => {
        if(!contextMenu){return}
        if(node.type === "groupNode"){
            return;
        }
        event.preventDefault();
        contextMenuNode.current = {...node.data, id: node.data.id};
        setContextMenuCord({
            top:  event.clientY,
            left:  event.clientX,
        });
        let tempContextMenu = [...contextMenu, {
            title: selectedNodes.current.length > 0 ? "Hide Selected Nodes" : "Hide Node",
            onClick: function(node) {
                if(selectedNodes.current.length > 0){
                    const newEdges = edgeFlow.filter( e => {
                        return selectedNodes.current.findIndex((node) => node.id === e.source || node.id === e.destination) < 0;
                    })
                    const newNodes = nodes.filter( n => {
                        return selectedNodes.current.findIndex((node) => node.id === n.id) < 0;
                    })
                    setEdgeFlow(newEdges);
                    setNodes(newNodes);
                    selectedNodes.current = [];
                } else {
                    const newEdges = edgeFlow.filter( e => e.source !== node.id && e.destination !== node.id)
                    const newNodes = nodes.filter( n => n.id !== node.id)
                    setEdgeFlow(newEdges);
                    setNodes(newNodes);
                }
            },
        },
            {
                title: "Show Only Selected",
                onClick: function (node) {
                    if (selectedNodes.current.length > 0) {
                        const newEdges = edgeFlow.filter(e => {
                            return selectedEdges.current.findIndex((edge) => edge.id === e.id) >= 0;
                        })
                        const newNodes = nodes.filter(n => {
                            return selectedNodes.current.findIndex((node) => node.id === n.id) >= 0;
                        })
                        setEdgeFlow(newEdges);
                        setNodes(newNodes);
                    } else {
                        const newEdges = edgeFlow.filter(e => e.source === node.id && e.destination === node.id)
                        const newNodes = nodes.filter(n => n.id === node.id)
                        setEdgeFlow(newEdges);
                        setNodes(newNodes);
                    }
                }
            }
        ];
        if(node?.data?.buttons?.length > 0){
            setLocalContextMenu([...tempContextMenu, ...node?.data?.buttons?.map(b => {
                let title = b.name;
                if( b?.startIcon){
                    title = <><FontAwesomeIcon icon={getIconName(b?.startIcon)} style={{color: b?.startIconColor  || ""}}/> {title}</>;
                } else if(b.type === "task"){
                    title =  <><SendIcon fontSize={"sm"} /> {b.name}</>
                }
                return {
                    title: title,
                    key: b.name,
                    onClick: function(node) {
                        switch(b.type){
                            case "task":
                                setTaskingData(b);
                                setOpenTaskingButton(true);
                                break;
                            case "dictionary":
                                setTaskingData(b);
                                setOpenDictionaryButton(true);
                                break;
                            case "string":
                                setTaskingData(b);
                                setOpenStringButton(true);
                                break;
                            case "table":
                                setTaskingData(b);
                                setOpenTableButton(true);
                                break;
                        }
                    }
                }
            })]);
        } else {
            setLocalContextMenu([...tempContextMenu]);
        }

        setOpenContextMenu(true);
    }, [contextMenu, edgeFlow, nodes, selectedNodes.current]);
    const onEdgeContextMenu = useCallback( (event, edge) => {
        event.preventDefault();
        contextMenuNode.current = {...edge};
        setContextMenuCord({
            top:  event.clientY,
            left:  event.clientX,
        });
        let tempContextMenu = [{
            title: selectedEdges.current.length > 0 ? "Hide Selected Edges" : "Hide Edge",
            onClick: function(edge) {
                if(selectedEdges.current.length > 0){
                    const newEdges = edgeFlow.filter( e => {
                        return selectedEdges.current.findIndex((n) => n.id === e.id) < 0;
                    })
                    setEdgeFlow(newEdges);
                } else {
                    const newEdges = edgeFlow.filter( e => e.id !== edge.id);
                    setEdgeFlow(newEdges);
                }
                selectedEdges.current = [];
            }
        }];
        if(edge?.data?.buttons?.length > 0){
            setLocalContextMenu([...tempContextMenu, ...edge?.data?.buttons?.map(b => {
                let title = b.name;
                if( b?.startIcon){
                    title = <><FontAwesomeIcon icon={getIconName(b?.startIcon)} style={{color: b?.startIconColor  || ""}}/> {title}</>;
                } else if(b.type === "task"){
                    title =  <><SendIcon fontSize={"sm"} /> {b.name}</>
                }
                return {
                    title: title,
                    onClick: function(edge) {
                        switch(b.type){
                            case "task":
                                setTaskingData(b);
                                setOpenTaskingButton(true);
                                break;
                            case "dictionary":
                                setTaskingData(b);
                                setOpenDictionaryButton(true);
                                break;
                            case "string":
                                setTaskingData(b);
                                setOpenStringButton(true);
                                break;
                            case "table":
                                setTaskingData(b);
                                setOpenTableButton(true);
                                break;
                        }
                    }
                }
            })]);
        } else {
            setLocalContextMenu([...tempContextMenu]);
        }
        setOpenContextMenu(true);
    }, [edgeFlow, nodes, selectedEdges.current]);
    const onPaneClick = useCallback( () => {
        setOpenContextMenu(false);
        //setGraphData({...graphData, edges: updatedEdges});
    }, [setOpenContextMenu, edgeFlow, nodes, graphData.edges]);
    const onNodeSelected = useCallback( (event, node) => {
        if(event.shiftKey){
            let alreadySelected = selectedNodes.current.filter( s => s.id === node.id).length > 0;
            if(alreadySelected){
                selectedNodes.current = selectedNodes.current.filter(s => s.id !== node.id);
            } else {
                selectedNodes.current.push(node);
            }
        } else {
            selectedNodes.current = [node];
        }
        const connectedEdges = getConnectedEdges(selectedNodes.current, edgeFlow);
        const updatedEdges = edgeFlow.map( e => {
            const graphEdge = graphData.edges.filter((edge) => edge.id === e.id);
            const baseEdge = graphEdge[0] || e;
            let included = connectedEdges.filter( ce => ce.id === e.id).length > 0;
            if(included){
                //this edge is supposed to be highlighted
                let alreadySelected = selectedEdges.current.filter( s => s.id === e.id).length > 0;
                // if the edge isn't already selected, mark it as selected
                if(!alreadySelected){
                    selectedEdges.current.push(e);
                }
                return {...baseEdge,
                    animated: baseEdge.animated,
                    oldAnimated: baseEdge.oldAnimated ? baseEdge.oldAnimated : baseEdge.animated,
                    oldStyle: baseEdge.oldStyle ? baseEdge.oldStyle : baseEdge.style,
                    style: {
                        stroke: getEdgeHighlightStroke(baseEdge, theme.palette.secondary.main),
                        strokeWidth: 4,
                    },
                    oldLabelBgStyle: baseEdge.oldLabelBgStyle ? baseEdge.oldLabelBgStyle : baseEdge.labelBgStyle,
                    labelBgStyle: {
                        fill: theme.tableHover,
                        fillOpacity: 1.0,
                    },
                    oldLabelStyle: baseEdge.oldLabelStyle ? baseEdge.oldLabelStyle : baseEdge.labelStyle,
                    labelStyle: {
                        fill: theme.palette.background.contrast,
                        //fill: "transparent"
                    }
                }
            } else {
                // this edge isn't supposed to be included, so make sure it's not highlighted
                selectedEdges.current = selectedEdges.current.filter(s => s.id !== e.id);
                return {...baseEdge,
                    animated: false,
                    oldAnimated: baseEdge.oldAnimated  ? baseEdge.oldAnimated : baseEdge.animated,
                    oldStyle: baseEdge.oldStyle ? baseEdge.oldStyle : baseEdge.style,
                    style: {
                        stroke: theme.palette.secondary.main,
                        strokeWidth: 0.25,
                    },
                    oldLabelBgStyle: baseEdge.oldLabelBgStyle ? baseEdge.oldLabelBgStyle : baseEdge.labelBgStyle,
                    labelBgStyle: {
                        fill: theme.tableHover,
                        fillOpacity: 0.0,
                    },
                    oldLabelStyle: baseEdge.oldLabelStyle ? baseEdge.oldLabelStyle : baseEdge.labelStyle,
                    labelStyle: {
                        fill: "transparent"
                    }
                }
            }
        });
        const updatedNodes = nodes.map( n => {
            let isSelected = selectedNodes.current.filter( s => s.id === n.id).length > 0;
            if(isSelected){
                return {...n, data: {...n.data, selected: true, anySelected: selectedNodes.current.length > 0}};
            } else {
                return {...n, data: {...n.data, selected: false, anySelected: selectedNodes.current.length > 0}};
            }
        });
        //setGraphData({...graphData, edges: updatedEdges});
        setEdgeFlow(updatedEdges);
        setNodes(updatedNodes);
    }, [edgeFlow, selectedNodes.current, selectedEdges.current, nodes, graphData]);
    const onEdgeSelected = useCallback( (event, edge) => {
        if(event.shiftKey){
            let alreadySelected = selectedEdges.current.filter( s => s.id === edge.id).length > 0;
            if(alreadySelected){
                selectedEdges.current = selectedEdges.current.filter(s => s.id !== edge.id);
            } else {
                selectedEdges.current.push(edge);
            }
        } else {
            selectedEdges.current = [edge];
        }
        const updatedEdges = edgeFlow.map( e => {
            let included = selectedEdges.current.filter( ce => ce.id === e.id).length > 0;
            const graphEdge = graphData.edges.filter((edge) => edge.id === e.id)
            const baseEdge = graphEdge[0] || e;
            if(included){
                return {...baseEdge,
                    animated: baseEdge.animated,
                    oldAnimated: baseEdge.oldAnimated ? baseEdge.oldAnimated : baseEdge.animated,
                    oldStyle: baseEdge.oldStyle ? baseEdge.oldStyle : baseEdge.style,
                    style: {
                        stroke: getEdgeHighlightStroke(baseEdge, theme.palette.secondary.main),
                        strokeWidth: 4,
                    },
                    oldLabelBgStyle: baseEdge.oldLabelBgStyle ? baseEdge.oldLabelBgStyle : baseEdge.labelBgStyle,
                    labelBgStyle: {
                        fill: theme.tableHover,
                        fillOpacity: 1.0,
                        filter: `drop-shadow (#${theme.palette.info.main} 0px 0px 10px)`
                    },
                    oldLabelStyle: baseEdge.oldLabelStyle ? baseEdge.oldLabelStyle : baseEdge.labelStyle,
                    labelStyle: {
                        fill: theme.palette.background.contrast,
                        //fill: "transparent"
                    }
                }
            } else {
                return {...baseEdge,
                    animated: false,
                    oldAnimated: baseEdge.oldAnimated  ? baseEdge.oldAnimated : baseEdge.animated,
                    oldStyle: baseEdge.oldStyle ? baseEdge.oldStyle : baseEdge.style,
                    style: {
                        stroke: theme.palette.secondary.main,
                        strokeWidth: 0.25,
                    },
                    oldLabelBgStyle: baseEdge.oldLabelBgStyle ? baseEdge.oldLabelBgStyle : baseEdge.labelBgStyle,
                    labelBgStyle: {
                        fill: theme.tableHover,
                        fillOpacity: 0.0,
                    },
                    oldLabelStyle: baseEdge.oldLabelStyle ? baseEdge.oldLabelStyle : baseEdge.labelStyle,
                    labelStyle: {
                        //fill: theme.palette.background.contrast,
                        fill: "transparent"
                    }
                }
            }
        })
        //setGraphData({...graphData, edges: updatedEdges});
        setEdgeFlow(updatedEdges);
    }, [edgeFlow, selectedEdges.current, graphData.edges]);
    React.useEffect( () => {
        let tempNodes = [];
        let tempEdges = [];
        let parentIds = [];

        const add_node = (node, localViewConfig) => {

            let groupByValue = getGroupBrowserscriptBy(node, localViewConfig);
            let nodeID = `${node.id}`;
            let found = false;
            for(let i = 0; i < tempNodes.length; i++){
                if(tempNodes[i].id === nodeID){
                    found = true;
                    break;
                }
            }
            if(!found){
                //console.log("adding node", node)
                tempNodes.push(
                    {
                        id: `${node.id}`,
                        position: { x: 0, y: 0 },
                        type: "browserscriptNode",
                        height: 50,
                        width: 50,
                        parentId: shouldUseTaskGroups(localViewConfig) && groupByValue !== "" ? groupByValue : undefined,
                        group: shouldUseTaskGroups(localViewConfig) && groupByValue !== "" ? groupByValue : undefined,
                        extent: shouldUseTaskGroups(localViewConfig) && groupByValue !== "" ? "parent" : undefined,
                        data: {
                            ...node,
                            parentId: shouldUseTaskGroups(localViewConfig) && groupByValue !== "" ? groupByValue : undefined,
                            label: "",
                        }
                    }
                )
            }
            found = false;
            for(let i = 0; i < parentIds.length; i++){
                if(parentIds[i].id === groupByValue){
                    found = true;
                    break;
                }
            }
            if(!found && groupByValue !== ""){
                //console.log("adding parent", node)
                parentIds.push({
                    id: groupByValue,
                    position: { x: 110, y: 110 },
                    type: "groupNode",
                    width: 200,
                    height: 200,
                    data: {
                        label: groupByValue,
                    },

                });
            }
        }
        const add_edge_p2p = (edge, localViewConfig) => {
            add_node(edge.source, localViewConfig);
            add_node(edge.destination, localViewConfig);
            //if(edge.source.id === edge.destination.id){
            //    return
            //}
            createEdge(edge, localViewConfig);
        }
        const createEdge = (edge, localViewConfig) =>{
            let edgeID = `e${edge.source.id}-${edge.destination.id}-${edge.label}`;
            //console.log("adding edge", edge);
            let groupByValueSource = getGroupTaskBy(edge.source, localViewConfig);
            let groupByValueDestination = getGroupTaskBy(edge.destination, localViewConfig);
            let dupEdges = tempEdges.filter( e => e.id === edgeID)
            if(dupEdges.length > 0){return}
            tempEdges.push(
                {
                    id: edgeID,
                    source: `${edge.source.id}`,
                    target: `${edge.destination.id}`,
                    animated: edge?.animate || true,
                    color: `${edge?.color}`,
                    label: `${edge.label}`,
                    data: {
                        ...edge,
                        label: `${edge.label}`,
                        source: {...edge.source, parentId: shouldUseTaskGroups(localViewConfig) && groupByValueSource !== "" ? groupByValueSource : undefined},
                        target: {...edge.destination, parentId: shouldUseTaskGroups(localViewConfig) && groupByValueDestination !== "" ? groupByValueDestination : undefined},
                    }
                },
            )
        }
        const hasFakeEdge = (sourceID) => {
            for(let i = 0; i < tempEdges.length; i++){
                if(tempEdges[i].data.source.parentId === sourceID &&
                    tempEdges[i].data.label === ""
                ){
                    return true;
                }
            }
            return false;
        }
        if(providedNodes){
            for(let i = 0; i < providedNodes.length; i++){
                add_node(providedNodes[i], view_config);
            }
        }
        edges.forEach( (edge) => {
            add_edge_p2p(edge, localViewConfig);
        });
        for(let i = 0; i < tempEdges.length; i++){
            let edgeColor = theme.palette.info.main;
            switch(tempEdges[i].color){
                case "primary":
                    edgeColor = theme.palette.primary.main;
                    break;
                case "secondary":
                    edgeColor = theme.palette.secondary.main;
                    break;
                case "error":
                    edgeColor = theme.palette.error.main;
                    break;
                case "warning":
                    edgeColor = theme.palette.warning.main;
                    break;
                case "success":
                    edgeColor = theme.palette.success.main;
                    break;
                case undefined:
                    break;
                default:
                    if(tempEdges[i].color.startsWith("#")){
                        edgeColor = tempEdges[i].color;
                    }
            }
            tempEdges[i].markerEnd = {
                color: edgeColor,
            }
            tempEdges[i].style = {
                stroke: edgeColor,
                strokeWidth: 2,
            }

            tempEdges[i].markerEnd.type = "arrowclosed"
            tempEdges[i].labelBgStyle = {
                fill: theme.tableHover,
                fillOpacity: 0.6,
            }
            tempEdges[i].labelStyle = {
                fill: theme.palette.background.contrast,
                //fill: "transparent"
            }
            //tempEdges[i].labelShowBg = true
            //tempEdges[i].zIndex = 20;
        }
        if(shouldUseTaskGroups(localViewConfig)){
            // only add in edges from parents to parents/mythic if we're doing egress flow
            for(let i = 0; i < parentIds.length; i++){
                // every parentNode needs a connection to _something_ - either to Mythic or another parentNode
                for(let j = 0; j < tempEdges.length; j++){
                    //console.log("checking", parentNodes[i].id, tempEdges[j].data.target.parentNode, tempEdges[j].data.source.id)
                    if(tempEdges[j].data.target.parentId === parentIds[i].id){
                        // don't process where source.parentNode == target.parentNode
                        //console.log("found match")
                        if(parentIds[i].id === tempEdges[j].data.source.parentId){
                            //console.log("skipping")
                            continue
                        }
                        if(!hasFakeEdge(`${parentIds[i].id}`)){
                            //console.log("adding new fake edge")
                            tempEdges.push(
                                {
                                    id: `e${parentIds[i].id}-${tempEdges[j].data.source.id}`,
                                    target: `${parentIds[i].id}`,
                                    source: `${tempEdges[j].data.source.id}`,
                                    label: "",
                                    hidden: true,
                                    data: {
                                        source: {...parentIds[i], parentId: `${parentIds[i].id}`},
                                        target: tempEdges[j].data.target,
                                        label: "",
                                    }
                                },
                            )
                        }
                    }
                }

                tempNodes.push({
                    id: `${parentIds[i].id}-widthAdjuster`,
                    position: { x: 0, y: 0 },
                    type: "browserscriptNode",
                    height: 100,
                    width: 50,
                    parentId: `${parentIds[i].id}`,
                    group: `${parentIds[i].id}`,
                    hidden: true,
                    data: {label: `${parentIds[i].id}`}
                })
            }
        }

        //console.log("parent groups", shouldUseTaskGroups(view_config), [...parentNodes, ...tempNodes], tempEdges);
        setGraphData({
            groups: shouldUseTaskGroups(localViewConfig) ? parentIds : [],
            nodes: tempNodes,
            edges: tempEdges,
            view_config: {...localViewConfig},
        });
    }, [edges, localViewConfig, theme]);
    React.useEffect( () => {
        (async () => {
            if(graphData.nodes.length > 0){
                const {newNodes, newEdges} = await createLayout({
                    initialGroups: graphData.groups,
                    initialNodes: graphData.nodes,
                    initialEdges: graphData.edges,
                    alignment: graphData.view_config.rankDir
                });
                setNodes(newNodes);
                setEdgeFlow(newEdges);
                for(let i = 0; i < newNodes.length; i++){
                    updateNodeInternals(newNodes[i].id);
                }
                //console.log("new graph data", newNodes, newEdges)
                window.requestAnimationFrame(() => {
                    for(let i = 0; i < newNodes.length; i++){
                        updateNodeInternals(newNodes[i].id);
                    }
                    fitView();
                });
            }
        })();
    }, [graphData]);
    const toggleViewConfig = () => {
        if(localViewConfig.rankDir === "LR"){
            setLocalViewConfig({...localViewConfig, rankDir: "BT", group_by: ""});
        } else {
            setLocalViewConfig({...localViewConfig, rankDir: "LR", group_by: ""});
        }
    }
    const onDownloadImageClickSvg = () => {
        // we calculate a transform for the nodes so that all nodes are visible
        // we then overwrite the transform of the `.react-flow__viewport` element
        // with the style option of the html-to-image library
        snackActions.info("Saving image to svg...");
        toSvg(viewportRef.current, {
            width: viewportRef.current.offsetWidth,
            height: viewportRef.current.offsetHeight,
            style: {
                width: viewportRef.current.clientWidth,
                height: viewportRef.current.clientHeight,
            },
        }).then((dataUrl) => {
            const a = document.createElement('a');
            a.setAttribute('download', 'task_output.svg');
            a.setAttribute('href', dataUrl);
            a.click();
        });
    };
    const revertHidden = () => {
        if(localViewConfig?.revert){
            setLocalViewConfig({...localViewConfig, revert: true});
        } else {
            setLocalViewConfig({...localViewConfig, revert: false});
        }

    }
    return (
        <div className="mythic-graph-canvas mythic-browser-script-graph-canvas" style={{height: "100%", width: "100%", overflow: "hidden"}} ref={viewportRef}>
            <ReactFlow
                fitView
                onlyRenderVisibleElements={false}
                panOnScrollSpeed={50}
                maxZoom={100}
                minZoom={0}
                nodes={nodes}
                edges={edgeFlow}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                onPaneClick={onPaneClick}
                onPaneContextMenu={onPaneContextMenu}
                onNodeContextMenu={onNodeContextMenu}
                onNodeClick={onNodeSelected}
                onEdgeContextMenu={onEdgeContextMenu}
                onEdgeClick={onEdgeSelected}
            >
                <Panel position={"top-left"} >{panel}</Panel>
                <Controls showInteractive={false} className="mythic-graph-controls mythic-browser-script-graph-controls" >
                    <ControlButton onClick={toggleViewConfig} title={"Toggle View"}>
                        <SwapCallsIcon />
                    </ControlButton>
                    <ControlButton onClick={onDownloadImageClickSvg} title={"Download SVG"}>
                        <InsertPhotoIcon />
                    </ControlButton>
                    <ControlButton onClick={revertHidden} title={"Revert Hidden"}>
                        <RestartAltIcon />
                    </ControlButton>
                </Controls>
                <MiniMap pannable={true} zoomable={true} />
            </ReactFlow>
            {openContextMenu && typeof document !== "undefined" && createPortal(
                <div style={{...contextMenuCoord, position: "fixed"}} className="context-menu mythic-graph-context-menu">
                    {localContextMenu.map( (m) => (
                        <Button key={m?.key ? m.key : m.title} color={"info"} className="context-menu-button mythic-graph-context-menu-button" onClick={() => {
                            m.onClick(contextMenuNode.current);
                            setOpenContextMenu(false);
                        }}>{m.title}</Button>
                    ))}
                </div>,
                document.body
            )}
            {openTaskingButton &&
                <TaskFromUIButton ui_feature={taskingData.ui_feature}
                                  callback_id={task.callback_id}
                                  parameters={taskingData.parameters}
                                  openDialog={taskingData?.openDialog || false}
                                  getConfirmation={taskingData?.getConfirmation || false}
                                  acceptText={taskingData?.acceptText || "confirm"}
                                  selectCallback={taskingData?.selectCallback || false}
                                  onTasked={finishedTasking}/>
            }
            {openDictionaryButton &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openDictionaryButton}
                              onClose={finishedTasking}
                              innerDialog={<MythicViewJSONAsTableDialog title={taskingData.title} leftColumn={taskingData.leftColumnTitle}
                                                                        rightColumn={taskingData.rightColumnTitle} value={taskingData.value} onClose={finishedTasking} />}
                />
            }
            {openStringButton &&
                <MythicDisplayTextDialog fullWidth={true} maxWidth="lg" open={openStringButton} title={taskingData?.title || "Title Here"} value={taskingData?.value || ""}
                                         onClose={finishedTasking}
                />
            }
            {openTableButton &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openTableButton}
                              onClose={finishedTasking}
                              innerDialog={<ResponseDisplayTableDialogTable title={taskingData?.title || "Title Here"}
                                                                            table={taskingData?.value || {}} callback_id={task.callback_id} onClose={finishedTasking} />}
                />
            }
        </div>

    )
}
