import React, {useEffect, useCallback, useMemo, useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ELK from 'elkjs/lib/elk.bundled.js';
import {useTheme} from '@mui/material/styles';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { Typography } from '@mui/material';
import { ReactFlow,
    applyEdgeChanges,
    Handle, Position, useReactFlow, ReactFlowProvider, Panel,
    MiniMap, Controls, ControlButton, useUpdateNodeInternals,
    getConnectedEdges, useNodesState, useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SwapCallsIcon from '@mui/icons-material/SwapCalls';
import {snackActions} from "../../utilities/Snackbar";
import {TaskLabelFlat, getLabelText} from './TaskDisplay';
import {MythicDialog, MythicViewJSONAsTableDialog} from "../../MythicComponents/MythicDialog";
import {MythicSelectFromListDialog} from "../../MythicComponents/MythicSelectFromListDialog";
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
        createTask({variables: {callback_id: selectedCallback.id, command: cmd, params: parameters, files}});
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
            title: 'Hide Callback',
            onClick: function(node) {
                hideCallback({variables: {callback_display_id: node.display_id}});
            }
        },
        {
            title: 'Interact',
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
            title: "Manually Remove Edge",
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
            title: "Manually Add Edge",
            onClick: function(node){
                setAddEdgeSource(node);
                setManuallyAddEdgeDialogOpen(true);
            }
        },
        {
            title: "Task Callback for Edge",
            onClick: function(node){
                setLinkCommands([]);
                setSelectedLinkCommand(null);
                setSelectedCallback(null);
                getLinkCommands({variables: {callback_id: node.id} });
                setSelectedCallback(node);
            }
        },
    ]}, [getLinkCommands, hideCallback, viewConfig, onOpenTab]);


    return (
    <>
        <div style={{padding: "10px"}}>
            <Typography variant='h4' style={{display:"inline-block", marginTop: "10px"}}>
            Callback {callback.display_id}'s Egress Path
            </Typography>
            <div style={{float: "right"}}>
                <FormControl sx={{ width: 200,  marginTop: "10px" }}>
                    <InputLabel id="demo-chip-label">Group Callbacks By</InputLabel>
                    <Select
                    labelId="demo-chip-label"
                    id="demo-chip"
                    
                    value={selectedGroupBy}
                    onChange={handleGroupByChange}
                    input={<OutlinedInput id="select-chip" label="Group Callbacks By" />}
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
                <FormControl sx={{minWidth: 300, marginTop: "10px"}}>
                    <InputLabel id="demo-multiple-chip-label">Display Properties per Callback</InputLabel>
                    <Select
                    labelId="demo-multiple-chip-label"
                    id="demo-multiple-chip"
                    multiple
                    value={selectedComponentOptions}
                    onChange={handleChange}
                    input={<OutlinedInput id="select-multiple-chip" label="Display Properties per Callback" />}
                    MenuProps={MenuProps}
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
        <DialogContent style={{height: "calc(70vh)" }}>
            {manuallyRemoveEdgeDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={manuallyRemoveEdgeDialogOpen}
                              onClose={()=>{setManuallyRemoveEdgeDialogOpen(false);}}
                              innerDialog={<MythicSelectFromListDialog onClose={()=>{setManuallyRemoveEdgeDialogOpen(false);}} identifier="id" display="display"
                                                                       onSubmit={onSubmitManuallyRemoveEdge} options={edgeOptions} title={"Manually Remove Edge"} action={"remove"} />}
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
                              innerDialog={<MythicSelectFromListDialog onClose={()=>{setOpenSelectLinkCommandDialog(false);}}
                                                                       onSubmit={onSubmitSelectedLinkCommand} options={linkCommands} title={"Select Link Command"}
                                                                       action={"select"} display={"display"} identifier={"display"}/>}
                />
            }
            <DrawC2PathElementsFlowWithProvider
                providedNodes={[callback]}
                edges={callbackgraphedges}
                view_config={viewConfig}
                theme={theme}
                contextMenu={contextMenu}
            />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
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
    return (
        <div style={{padding: 0, margin: 0, ...additionalStyles}}>
            {
                [...Array(data.sourceCount)].map((e, i) => (
                    <Handle type={"source"} id={`${i+1}`} key={`${i+1}`} style={data.sourceCount > 1 ? getOffset(i) : {}} isConnectable={false} position={sourcePosition} />
                ))

            }
            <img alt={data.img} style={{margin: "auto"}} src={data.img}  className={"circleImageNode"} />
            <Handle type={"target"} position={targetPosition} isConnectable={false}/>
            <Typography style={{textAlign: "center", margin: 0, padding: 0}} >{data.label}</Typography>
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

const elk = new ELK();
const getWidth = (node) => {
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
    return (node.maxNameLength * 8) + 10 + 100;
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
    if(node.type === "eventNode"){
        return 20;
    }
    return 80;
}
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
            layoutOptions: {
                ...options,
            },
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
export const DrawC2PathElementsFlow = ({edges, panel, view_config, contextMenu, providedNodes, filterOptions}) =>{
    const theme = useTheme();
    const [graphData, setGraphData] = React.useState({nodes: [], edges: [], groups: []});
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const selectedNodes = React.useRef([]);
    const extraNodes = React.useRef(providedNodes);
    const [edgeFlow, setEdgeFlow, onEdgesChange] = useEdgesState([]);
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [contextMenuCoord, setContextMenuCord] = React.useState({});
    const viewportRef = React.useRef(null);
    const contextMenuNode = React.useRef(null);
    const {fitView} = useReactFlow()
    const updateNodeInternals = useUpdateNodeInternals();
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
        setContextMenuCord({
            top:  event.clientY,
            left:  event.clientX,
        });
        setOpenContextMenu(true);
    }, [contextMenu])
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
    }, [setOpenContextMenu, graphData, selectedNodes.current, nodes]);
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
        const connectedEdges = getConnectedEdges(selectedNodes.current, graphData.edges);
        const updatedEdges = graphData.edges.map( e => {
            let included = connectedEdges.filter( ce => ce.id === e.id).length > 0;
            if(included){
                return {...e,
                    animated: e.animated,
                    oldAnimated: e.oldAnimated ? e.oldAnimated : e.animated,
                    oldStyle: e.oldStyle ? e.oldStyle : e.style,
                    style: {
                        stroke: e.style.stroke,
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
        })
        setEdgeFlow(updatedEdges);
        const updatedNodes = nodes.map( n => {
            let isSelected = selectedNodes.current.filter( s => s.id === n.id).length > 0;
            if(isSelected){
                return {...n, data: {...n.data, selected: true, anySelected: selectedNodes.current.length > 0}};
            } else {
                return {...n, data: {...n.data, selected: false, anySelected: selectedNodes.current.length > 0}};
            }
        });
        setNodes(updatedNodes);
    }, [graphData, nodes, selectedNodes.current])
    React.useEffect( () => {
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

        const add_edge_to_mythic = (edge, view_config) => {
            if(!edge.source.active && !view_config["show_all_nodes"]){return}
            add_node(edge.source, view_config);
            let found = false;
            let edgeID = `e${edge.source.id}-${edge.destination.id}-${edge.c2profile.name}`;
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
                        id: `e${edge.source.id}-${edge.destination.id}-${edge.c2profile.name}`,
                        mythic_id: edge.id,
                        source: `${edge.source.id}`,
                        target: "Mythic",
                        label: edge.c2profile.name,
                        animated: true,
                        data: {
                            source: {...edge.source, parentId: getGroupBy(edge.source, view_config)},
                            target: {parentId: "Mythic"},
                            end_timestamp: edge.end_timestamp,
                        }
                    },
                )
            }

            /*
            g.setEdge(edge.source.id, "Mythic",  {label: edge.c2profile.name, edge_id: edge.id, end_timestamp: edge.end_timestamp,
                style: edge.end_timestamp === null ? connected: disconnected, labelStyle: edgeLabelStyle,
                arrowheadStyle: edge.end_timestamp === null ? connectedArrow : disconnectedArrow}, edge.c2profile.name)

             */
        }
        const add_node = (node, view_config) => {
            let groupByValue = getGroupBy(node, view_config);
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
                        height: 50,
                        width: 50,
                        parentId: shouldUseGroups(view_config) ? groupByValue : undefined,
                        group: shouldUseGroups(view_config) ? groupByValue : undefined,
                        extent: shouldUseGroups(view_config) ? "parent" : undefined,
                        data: {
                            label: getLabel(node, view_config["label_components"]),
                            img: "/static/" + node.payload.payloadtype.name + "_" + theme.palette.mode + ".svg",
                            isMythic: false,
                            callback_id: node.id,
                            display_id: node.display_id,
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
            if(!found){
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
            let edgeID = `e${edge.source.id}-${edge.destination.id}-${edge.c2profile.name}`;
            if(egress_flow){
                if(edge.source.to_mythic){
                    edgeID = `e${edge.destination.id}-${edge.source.id}-${edge.c2profile.name}`;
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
                                id: `e${edge.destination.id}-${edge.source.id}-${edge.c2profile.name}`,
                                mythic_id: edge.id,
                                source: `${edge.destination.id}`,
                                target: `${edge.source.id}`,
                                label: edge.c2profile.name,
                                animated: true,
                                data: {
                                    end_timestamp: edge.end_timestamp,
                                    source: {...edge.destination, parentId: getGroupBy(edge.destination, view_config)},
                                    target: {...edge.source, parentId: getGroupBy(edge.source, view_config)},
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
                                id: `e${edge.source.id}-${edge.destination.id}-${edge.c2profile.name}`,
                                mythic_id: edge.id,
                                source: `${edge.source.id}`,
                                target: `${edge.destination.id}`,
                                label: edge.c2profile.name,
                                animated: true,
                                data: {
                                    end_timestamp: edge.end_timestamp,
                                    source: {...edge.source, parentId: getGroupBy(edge.source, view_config)},
                                    target: {...edge.target, parentId: getGroupBy(edge.target, view_config)},
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
                            id: `e${edge.source.id}-${edge.destination.id}-${edge.c2profile.name}`,
                            mythic_id: edge.id,
                            source: `${edge.source.id}`,
                            target: `${edge.destination.id}`,
                            label: edge.c2profile.name,
                            animated: true,
                            data: {
                                end_timestamp: edge.end_timestamp,
                                source: {...edge.source, parentId: getGroupBy(edge.source, view_config)},
                                target: {...edge.target, parentId: getGroupBy(edge.destination, view_config)},
                            }
                        },
                    )
                }
            }
        }
        const hasEdge = (sourceId, destinationId, c2ProfileName) => {
            for(let i = 0; i < tempEdges.length; i++){
                if(tempEdges[i].source === sourceId &&
                    tempEdges[i].destination === destinationId &&
                    tempEdges[i].data.label === c2ProfileName){
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
            for(let i = 0; i < tempEdges.length; i++){
                if(tempEdges[i].source === sourceId &&
                    tempEdges[i].destination === destinationId &&
                    tempEdges[i].data.label === c2ProfileName){
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
                    return [...prev];
                }
                return [...prev, cur];
            }, []);
            let edgesToUpdate = tempNewEdges.length;
            if (edgesToUpdate === 0) {return []}
            let edgesUpdated = 0;
            let toMythicIds = new Set();
            let loop_count = 0;
            while(edgesUpdated < edgesToUpdate){
                //console.log(edges, tempEdges, edgesToUpdate, edgesUpdated)

                tempNewEdges = tempNewEdges.map( e => {
                    //console.log(e)
                    if(!e.source.to_mythic && !e.destination.to_mythic){
                        if(e.source.id === e.destination.id){
                            e.source.to_mythic = true;
                            e.destination.to_mythic = true;
                            toMythicIds.add(e.source.id);

                            edgesUpdated += 1;
                        } else if(toMythicIds.has(e.source.id)){
                            e.source.to_mythic = true;
                            e.destination.to_mythic = false;
                            edgesUpdated += 1;
                        } else if(toMythicIds.has(e.destination.id)){
                            e.destination.to_mythic = true;
                            e.source.to_mythic = false;
                            edgesUpdated += 1;
                        } else {
                            // check if either source/destination has any edges that identify
                            tempNewEdges.forEach( e2 => {
                                if(e2.source.id === e.source.id){
                                    // only look at edges that contain our source
                                    if(e2.destination.to_mythic){
                                        e.source.to_mythic = true;
                                        edgesUpdated += 1;
                                    }
                                } else if(e2.destination.id === e.source.id){
                                    if(e2.source.to_mythic){
                                        e.source.to_mythic = true;
                                        edgesUpdated += 1;
                                    }
                                }
                            })
                        }
                    } else {
                        edgesUpdated += 1;
                    }
                    //edgesUpdated += 1;
                    return e;
                })
                loop_count += 1;
                if (loop_count > 2 * edgesToUpdate){
                    //console.log("aborting early", tempEdges, edgesUpdated)
                    edgesUpdated = edgesToUpdate;

                }
            }
            return tempNewEdges
        }
        if(extraNodes.current){
            for(let i = 0; i < extraNodes.current.length; i++){
                if(view_config["include_disconnected"]) {
                    if(filterRow(extraNodes.current[i])){
                        continue
                    }
                    add_node(extraNodes.current[i], view_config);
                }
            }
        }
        let updatedEdges = createNewEdges();
        // need to add fake edges between parent groups and Mythic so that rendering will be preserved
        updatedEdges.forEach( (edge) => {
            if(!view_config["include_disconnected"] && edge.end_timestamp !== null){return}
            if(edge.destination.id === edge.source.id){
                if(hasEdge(edge.source.id, "Mythic", edge.c2profile.name)){
                    // we already have an edge to Mythic from our source id, check if this edge is newer or not
                    if(edge.id > getEdge(edge.source.id, "Mythic", edge.c2profile.name).mythic_id){
                        add_edge_to_mythic(edge, view_config);
                    }
                }else{
                    //this is a new edge to mythic
                    add_edge_to_mythic(edge, view_config);
                }
            }else{
                let source_str_id = `${edge.source.id}`;
                let destination_str_id = `${edge.destination.id}`
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
        for(let i = 0; i < tempEdges.length; i++){
            if(tempEdges[i].data.end_timestamp === null){
                tempEdges[i].markerEnd = {
                    color: theme.palette.success.main,
                }
                tempEdges[i].style = {
                    stroke: theme.palette.success.main,
                    strokeWidth: 2,
                }
            } else {
                tempEdges[i].markerEnd = {
                    color: theme.palette.error.main,
                }
                tempEdges[i].style = {
                    stroke: theme.palette.error.main,
                    strokeWidth: 2,
                }
            }
            tempEdges[i].markerEnd.type = "arrowclosed"
            tempEdges[i].labelBgStyle = {
                fill: theme.tableHover,
                fillOpacity: 0.6,
            }
            tempEdges[i].labelStyle = {
                fill: theme.palette.background.contrast,
            }
            tempEdges[i].labelShowBg = true
            tempEdges[i].zIndex = 20;
            tempEdges[i].animated = tempEdges[i].data.end_timestamp === null;
        }
        if(shouldUseGroups(view_config)){
            // only add in edges from parents to parents/mythic if we're doing egress flow
            for(let i = 0; i < parentIds.length; i++){
                // every parentNode needs a connection to _something_ - either to Mythic or another parentNode
                for(let j = 0; j < tempEdges.length; j++){
                    //console.log("checking", parentNodes[i].id, tempEdges[j].data.source.parentNode, tempEdges[j].data.target.parentNode)
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
    }, [edges, view_config, theme, filterOptions]);
    React.useEffect( () => {
        (async () => {
            if(graphData.nodes.length > 0){
                const {newNodes, newEdges} = await createLayout({
                    initialGroups: graphData.groups,
                    initialNodes: graphData.nodes,
                    initialEdges: graphData.edges,
                    alignment: view_config["rankDir"]
                });
                setNodes(newNodes);
                setEdgeFlow(newEdges);
                window.requestAnimationFrame(() => {
                    for(let i = 0; i < newNodes.length; i++){
                        updateNodeInternals(newNodes[i].id);
                    }
                    fitView();
                });
            }
        })();
    }, [graphData, view_config]);
    return (
        <div style={{height: "100%", width: "100%"}} ref={viewportRef}>
                <ReactFlow
                    fitView
                    onlyRenderVisibleElements={false}
                    panOnScrollSpeed={30}
                    maxZoom={100}
                    minZoom={0}
                    nodes={nodes}
                    edges={edgeFlow}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    onPaneClick={onPaneClick}
                    onNodeContextMenu={onNodeContextMenu}
                    onNodeClick={onNodeSelected}
                >
                    <Panel position={"top-left"} >{panel}</Panel>
                    <Controls showInteractive={false} >
                        <ControlButton onClick={onDownloadImageClickPng} title={"Download PNG"}>
                            <CameraAltIcon />
                        </ControlButton>
                        <ControlButton onClick={onDownloadImageClickSvg} title={"Download SVG"}>
                            <InsertPhotoIcon />
                        </ControlButton>
                    </Controls>
                    <MiniMap pannable={true} zoomable={true}  />
                </ReactFlow>
            {openContextMenu &&
            <div style={{...contextMenuCoord, position: "fixed"}} className="context-menu">
                {contextMenu.map( (m) => (
                    <Button key={m.title} color={"info"} className="context-menu-button" onClick={() => {
                        m.onClick(contextMenuNode.current);
                        setOpenContextMenu(false);
                    }}>{m.title}</Button>
                    ))}
            </div>
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
            let included = connectedEdges.filter( ce => ce.id === e.id).length > 0;
            if(included){
                //this edge is supposed to be highlighted
                let alreadySelected = selectedEdges.current.filter( s => s.id === e.id).length > 0;
                // if the edge isn't already selected, mark it as selected
                if(!alreadySelected){
                    selectedEdges.current.push(e);
                }
                return {...graphEdge[0],
                    animated: graphEdge[0].animated,
                    oldAnimated: graphEdge[0].oldAnimated ? graphEdge[0].oldAnimated : graphEdge[0].animated,
                    oldStyle: graphEdge[0].oldStyle ? graphEdge[0].oldStyle : graphEdge[0].style,
                    style: {
                        stroke: graphEdge[0].style.stroke,
                        strokeWidth: 4,
                    },
                    oldLabelBgStyle: graphEdge[0].oldLabelBgStyle ? graphEdge[0].oldLabelBgStyle : graphEdge[0].labelBgStyle,
                    labelBgStyle: {
                        fill: theme.tableHover,
                        fillOpacity: 1.0,
                    },
                    oldLabelStyle: graphEdge[0].oldLabelStyle ? graphEdge[0].oldLabelStyle : graphEdge[0].labelStyle,
                    labelStyle: {
                        fill: theme.palette.background.contrast,
                        //fill: "transparent"
                    }
                }
            } else {
                // this edge isn't supposed to be included, so make sure it's not highlighted
                selectedEdges.current = selectedEdges.current.filter(s => s.id !== e.id);
                return {...graphEdge[0],
                    animated: false,
                    oldAnimated: graphEdge[0].oldAnimated  ? graphEdge[0].oldAnimated : graphEdge[0].animated,
                    oldStyle: graphEdge[0].oldStyle ? graphEdge[0].oldStyle : graphEdge[0].style,
                    style: {
                        stroke: theme.palette.secondary.main,
                        strokeWidth: 0.25,
                    },
                    oldLabelBgStyle: graphEdge[0].oldLabelBgStyle ? graphEdge[0].oldLabelBgStyle : graphEdge[0].labelBgStyle,
                    labelBgStyle: {
                        fill: theme.tableHover,
                        fillOpacity: 0.0,
                    },
                    oldLabelStyle: graphEdge[0].oldLabelStyle ? graphEdge[0].oldLabelStyle : graphEdge[0].labelStyle,
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
            if(included){
                return {...graphEdge[0],
                    animated: graphEdge[0].animated,
                    oldAnimated: graphEdge[0].oldAnimated ? graphEdge[0].oldAnimated : graphEdge[0].animated,
                    oldStyle: graphEdge[0].oldStyle ? graphEdge[0].oldStyle : graphEdge[0].style,
                    style: {
                        stroke: graphEdge[0].style.stroke,
                        strokeWidth: 4,
                    },
                    oldLabelBgStyle: graphEdge[0].oldLabelBgStyle ? graphEdge[0].oldLabelBgStyle : graphEdge[0].labelBgStyle,
                    labelBgStyle: {
                        fill: theme.tableHover,
                        fillOpacity: 1.0,
                        filter: `drop-shadow (#${theme.palette.info.main} 0px 0px 10px)`
                    },
                    oldLabelStyle: graphEdge[0].oldLabelStyle ? graphEdge[0].oldLabelStyle : graphEdge[0].labelStyle,
                    labelStyle: {
                        fill: theme.palette.background.contrast,
                        //fill: "transparent"
                    }
                }
            } else {
                return {...graphEdge[0],
                    animated: false,
                    oldAnimated: graphEdge[0].oldAnimated  ? graphEdge[0].oldAnimated : graphEdge[0].animated,
                    oldStyle: graphEdge[0].oldStyle ? graphEdge[0].oldStyle : graphEdge[0].style,
                    style: {
                        stroke: theme.palette.secondary.main,
                        strokeWidth: 0.25,
                    },
                    oldLabelBgStyle: graphEdge[0].oldLabelBgStyle ? graphEdge[0].oldLabelBgStyle : graphEdge[0].labelBgStyle,
                    labelBgStyle: {
                        fill: theme.tableHover,
                        fillOpacity: 0.0,
                    },
                    oldLabelStyle: graphEdge[0].oldLabelStyle ? graphEdge[0].oldLabelStyle : graphEdge[0].labelStyle,
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
        <div style={{height: "100%", width: "100%", overflow: "hidden"}} ref={viewportRef}>
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
                <Controls showInteractive={false} style={{marginLeft: "40px"}} >
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
            {openContextMenu &&
                <div style={{...contextMenuCoord, position: "fixed"}} className="context-menu">
                    {localContextMenu.map( (m) => (
                        <Button key={m?.key ? m.key : m.title} color={"info"} className="context-menu-button" onClick={() => {
                            m.onClick(contextMenuNode.current);
                            setOpenContextMenu(false);
                        }}>{m.title}</Button>
                    ))}
                </div>
            }
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