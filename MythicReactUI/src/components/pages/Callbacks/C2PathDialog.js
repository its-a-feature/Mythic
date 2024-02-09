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
import ReactFlow, {
    applyEdgeChanges, applyNodeChanges,
    Handle, Position, useReactFlow, ReactFlowProvider, Panel,
    MiniMap, Controls, ControlButton, useUpdateNodeInternals
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SwapCallsIcon from '@mui/icons-material/SwapCalls';
import {snackActions} from "../../utilities/Snackbar";
import {TaskLabelFlat, getLabelText} from './TaskDisplay';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {MythicSelectFromListDialog} from "../../MythicComponents/MythicSelectFromListDialog";
import {ManuallyAddEdgeDialog} from "./ManuallyAddEdgeDialog";
import {TaskParametersDialog} from "./TaskParametersDialog";
import {addEdgeMutation, createTaskingMutation, hideCallbackMutation, removeEdgeMutation} from "./CallbackMutations";
import {loadedLinkCommandsQuery} from "./CallbacksGraph";
import {useMutation, gql, useLazyQuery } from '@apollo/client';

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
const getSourcePosition = (direction) => {
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
const getTargetPosition = (direction) => {
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
    return (
        <div style={{padding: 0, margin: 0}}>
            {
                [...Array(data.sourceCount)].map((e, i) => (
                    <Handle type={"source"} id={`${i+1}`} key={`${i+1}`} style={data.sourceCount > 1 ? getOffset(i) : {}} position={sourcePosition} />
                ))

            }
            <img alt={data.img} style={{margin: "auto"}} src={data.img}  className={"circleImageNode"} />
            <Handle type={"target"} position={targetPosition} />
            <Typography style={{textAlign: "center", margin: 0, padding: 0}} >{data.label}</Typography>
        </div>
    )
}
function TaskNode({data}) {
    const sourcePosition = getSourcePosition(data["elk.direction"]);
    const targetPosition = getTargetPosition(data["elk.direction"]);
    return (
        <div >
            <Handle type={"source"} position={sourcePosition} />
            {data.id > 0 &&
                <TaskLabelFlat task={data} showOnSelectTask={!data.selected} onSelectTask={() => {data.onSelectTask(data)}}
                               graphView={true}
                />
            }
            <Handle type={"target"} position={targetPosition} />
        </div>
    )
}
function GroupNode({data}) {
    const sourcePosition = getSourcePosition(data["elk.direction"]);
    const targetPosition = getTargetPosition(data["elk.direction"]);
    return (
        <>
            <Handle hidden type={"source"} position={sourcePosition} />
            <div className={"groupNode"} style={{width: data.width, height: data.height, margin: "auto"}}>
                <Typography style={{textAlign: "center", margin: 0, padding: 0}} >{data.label}</Typography>
            </div>
            <Handle type={"target"} hidden position={targetPosition} />
        </>


    )
}
const nodeTypes = { "agentNode": AgentNode, "groupNode": GroupNode, "taskNode": TaskNode };

const elk = new ELK();
const getWidth = (node) => {
    if(node.type === "taskNode"){
        return getTaskWidth(node);
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
const getHeight = (node) => {
    if(node.hidden){
        return 0;
    }
    return 80;
}
export default async function createLayout({initialGroups, initialNodes, initialEdges, alignment}) {
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
                parentNode: current.id
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
export const DrawC2PathElementsFlow = ({edges, panel, view_config, theme, contextMenu, providedNodes}) =>{
    const [graphData, setGraphData] = React.useState({nodes: [], edges: [], groups: []});
    const [nodes, setNodes] = React.useState();
    const [edgeFlow, setEdgeFlow] = React.useState([]);
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [contextMenuCoord, setContextMenuCord] = React.useState({});
    const viewportRef = React.useRef(null);
    const contextMenuNode = React.useRef(null);
    const {fitView} = useReactFlow()
    const updateNodeInternals = useUpdateNodeInternals();
    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes) => setEdgeFlow((eds) => applyEdgeChanges(changes, eds)),
        []
    );
    const onDownloadImageClickSvg = () => {
        // we calculate a transform for the nodes so that all nodes are visible
        // we then overwrite the transform of the `.react-flow__viewport` element
        // with the style option of the html-to-image library
        snackActions.info("Saving image to svg...");
        toSvg(document.querySelector('.react-flow__viewport'), {
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
        toPng(document.querySelector('.react-flow__viewport'), {
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
    }, [setOpenContextMenu])
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
        let parentNodes = [];

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
                            source: {...edge.source, parentNode: getGroupBy(edge.source, view_config)},
                            target: {parentNode: "Mythic"},
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
                        width: 100,
                        parentNode: shouldUseGroups(view_config) ? groupByValue : null,
                        group: shouldUseGroups(view_config) ? groupByValue : null,
                        extent: shouldUseGroups(view_config) ? "parent" : null,
                        data: {
                            label: getLabel(node, view_config["label_components"]),
                            img: "/static/" + node.payload.payloadtype.name + ".svg",
                            isMythic: false,
                            callback_id: node.id,
                            display_id: node.display_id,
                        }
                    }
                )
            }
            found = false;
            for(let i = 0; i < parentNodes.length; i++){
                if(parentNodes[i].id === groupByValue){
                    found = true;
                    break;
                }
            }
            if(!found){
                parentNodes.push({
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
                                    source: {...edge.destination, parentNode: getGroupBy(edge.destination, view_config)},
                                    target: {...edge.source, parentNode: getGroupBy(edge.source, view_config)},
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
                                    source: {...edge.source, parentNode: getGroupBy(edge.source, view_config)},
                                    target: {...edge.target, parentNode: getGroupBy(edge.target, view_config)},
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
                                source: {...edge.source, parentNode: getGroupBy(edge.source, view_config)},
                                target: {...edge.target, parentNode: getGroupBy(edge.destination, view_config)},
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
                if(tempEdges[i].data.source.parentNode === sourceID &&
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
        const createNewEdges = () => {
            // loop through until all edges have one side marked as "toward_mythic"
            let edgesToUpdate = edges.length;
            if (edgesToUpdate === 0) {return []}
            let edgesUpdated = 0;
            let tempNewEdges = [...edges];
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
        if(providedNodes){
            for(let i = 0; i < providedNodes.length; i++){
                if(view_config["include_disconnected"]) {
                    add_node(providedNodes[i], view_config);
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
                    color: theme.palette.info.main,
                }
                tempEdges[i].style = {
                    stroke: theme.palette.info.main,
                    strokeWidth: 2,
                }
            } else {
                tempEdges[i].markerEnd = {
                    color: theme.palette.warning.main,
                }
                tempEdges[i].style = {
                    stroke: theme.palette.warning.main,
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
            for(let i = 0; i < parentNodes.length; i++){
                // every parentNode needs a connection to _something_ - either to Mythic or another parentNode
                for(let j = 0; j < tempEdges.length; j++){
                    //console.log("checking", parentNodes[i].id, tempEdges[j].data.source.parentNode, tempEdges[j].data.target.parentNode)
                    if(tempEdges[j].data.source.parentNode === parentNodes[i].id){
                        // don't process where source.parentNode == target.parentNode
                        if(parentNodes[i].id === tempEdges[j].data.target.parentNode){
                            //console.log("skipping")
                            continue
                        }
                        if(!hasFakeEdge(`${parentNodes[i].id}`)){
                            //console.log("adding new fake edge")
                            tempEdges.push(
                                {
                                    id: `e${parentNodes[i].id}-${tempEdges[j].data.target.parentNode}`,
                                    mythic_id: 0,
                                    source: `${parentNodes[i].id}`,
                                    target: tempEdges[j].data.target.parentNode,
                                    label: "",
                                    hidden: true,
                                    data: {
                                        source: {parentNode: parentNodes[i].id},
                                        target: tempEdges[j].data.target,
                                        label: "",
                                        end_timestamp: null
                                    }
                                },
                            )
                        } else if(tempEdges[j].data.target.parentNode === "Mythic") {
                            //console.log("fake edge is for Mythic, and one exists already - update it")
                            for(let k = tempEdges.length-1; k >= 0 ; k--){
                                if(tempEdges[k].source === parentNodes[i].id){
                                    tempEdges[k] = {
                                        id: `e${parentNodes[i].id}-${tempEdges[j].data.target.parentNode}`,
                                        mythic_id: 0,
                                        source: `${parentNodes[i].id}`,
                                        target: tempEdges[j].data.target.parentNode,
                                        label: "",
                                        hidden: true,
                                        data: {
                                            source: {parentNode: parentNodes[i].id},
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
                    id: `${parentNodes[i].id}-widthAdjuster`,
                    position: { x: 0, y: 0 },
                    type: "agentNode",
                    height: 100,
                    width: 50,
                    parentNode: `${parentNodes[i].id}`,
                    group: `${parentNodes[i].id}`,
                    hidden: true,
                    data: {label: `${parentNodes[i].id}`}
                })
            }
        }
        for(let i = 0; i < tempNodes.length; i++){
            let sourceCount = 0;
            for(let j = 0; j < tempEdges.length; j++){
                if(tempEdges[j].source === tempNodes[i].id){
                    sourceCount += 1;
                    tempEdges[j].sourceHandle = `${sourceCount}`;
                }
            }
            tempNodes[i].data.sourceCount = sourceCount;
        }
        //console.log([...parentNodes, ...tempNodes], tempEdges);
        setGraphData({
            groups: shouldUseGroups(view_config) ? parentNodes : [],
            nodes: tempNodes,
            edges: tempEdges
        })
    }, [edges, view_config, theme, providedNodes]);
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
                    <MiniMap pannable={true} />
                </ReactFlow>
            {openContextMenu &&
            <div style={{...contextMenuCoord, position: "fixed"}} className="context-menu">
                {contextMenu.map( (m) => (
                    <Button key={m.title} variant={"contained"} className="context-menu-button" onClick={() => {
                        m.onClick(contextMenuNode.current);
                        setOpenContextMenu(false);
                    }}>{m.title}</Button>
                    ))}
            </div>
            }
        </div>

    )
}

export const DrawTaskElementsFlowWithProvider = (props) => {
    return (
        <ReactFlowProvider>
            <DrawTaskElementsFlow {...props} />
        </ReactFlowProvider>
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
export const DrawTaskElementsFlow = ({edges, panel, view_config, theme, contextMenu}) =>{
    const [graphData, setGraphData] = React.useState({nodes: [], edges: [], groups: [], view_config});
    const [nodes, setNodes] = React.useState();
    const [edgeFlow, setEdgeFlow] = React.useState([]);
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [contextMenuCoord, setContextMenuCord] = React.useState({});
    const viewportRef = React.useRef(null);
    const contextMenuNode = React.useRef(null);
    const [localViewConfig, setLocalViewConfig] = React.useState(view_config);
    const {fitView} = useReactFlow();
    const updateNodeInternals = useUpdateNodeInternals();
    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes) => setEdgeFlow((eds) => applyEdgeChanges(changes, eds)),
        []
    );
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
    }, [setOpenContextMenu])
    React.useEffect( () => {
        let tempNodes = [];
        let tempEdges = [];
        let parentNodes = [];

        const add_node = (node, localViewConfig) => {

            let groupByValue = getGroupTaskBy(node, localViewConfig);
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
                        type: "taskNode",
                        height: 50,
                        width: 100,
                        parentNode: shouldUseTaskGroups(localViewConfig) && groupByValue !== "" ? groupByValue : null,
                        group: shouldUseTaskGroups(localViewConfig) && groupByValue !== "" ? groupByValue : null,
                        extent: shouldUseTaskGroups(localViewConfig) && groupByValue !== "" ? "parent" : null,
                        data: {
                            ...node,
                            parentNode: shouldUseTaskGroups(localViewConfig) && groupByValue !== "" ? groupByValue : null,
                            label: "",
                        }
                    }
                )
            }
            found = false;
            for(let i = 0; i < parentNodes.length; i++){
                if(parentNodes[i].id === groupByValue){
                    found = true;
                    break;
                }
            }
            if(!found && groupByValue !== ""){
                //console.log("adding parent", node)
                parentNodes.push({
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
            if(edge.source.id === edge.destination.id){
                return
            }
            createEdge(edge, localViewConfig);
        }
        const createEdge = (edge, localViewConfig) =>{
            let edgeID = `e${edge.source.id}-${edge.destination.id}`;
            //console.log("adding edge", edge);
            let groupByValueSource = getGroupTaskBy(edge.source, localViewConfig);
            let groupByValueDestination = getGroupTaskBy(edge.destination, localViewConfig);
            tempEdges.push(
                {
                    id: edgeID,
                    source: `${edge.source.id}`,
                    target: `${edge.destination.id}`,
                    animated: true,
                    label: "subtask",
                    data: {
                        label: "subtask",
                        source: {...edge.source, parentNode: shouldUseTaskGroups(localViewConfig) && groupByValueSource !== "" ? groupByValueSource : null},
                        target: {...edge.destination, parentNode: shouldUseTaskGroups(localViewConfig) && groupByValueDestination !== "" ? groupByValueDestination : null},
                    }
                },
            )
        }
        const hasFakeEdge = (sourceID) => {
            for(let i = 0; i < tempEdges.length; i++){
                if(tempEdges[i].data.source.parentNode === sourceID &&
                    tempEdges[i].data.label === ""
                ){
                    return true;
                }
            }
            return false;
        }
        edges.forEach( (edge) => {
            add_edge_p2p(edge, localViewConfig);
        });
        for(let i = 0; i < tempEdges.length; i++){
            tempEdges[i].markerEnd = {
                color: theme.palette.info.main,
            }
            tempEdges[i].style = {
                stroke: theme.palette.info.main,
                strokeWidth: 2,
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
        }
        if(shouldUseTaskGroups(localViewConfig)){
            // only add in edges from parents to parents/mythic if we're doing egress flow
            for(let i = 0; i < parentNodes.length; i++){
                // every parentNode needs a connection to _something_ - either to Mythic or another parentNode
                for(let j = 0; j < tempEdges.length; j++){
                    //console.log("checking", parentNodes[i].id, tempEdges[j].data.target.parentNode, tempEdges[j].data.source.id)
                    if(tempEdges[j].data.target.parentNode === parentNodes[i].id){
                        // don't process where source.parentNode == target.parentNode
                        //console.log("found match")
                        if(parentNodes[i].id === tempEdges[j].data.source.parentNode){
                            //console.log("skipping")
                            continue
                        }
                        if(!hasFakeEdge(`${parentNodes[i].id}`)){
                            //console.log("adding new fake edge")
                            tempEdges.push(
                                {
                                    id: `e${parentNodes[i].id}-${tempEdges[j].data.source.id}`,
                                    target: `${parentNodes[i].id}`,
                                    source: `${tempEdges[j].data.source.id}`,
                                    label: "",
                                    hidden: true,
                                    data: {
                                        source: {...parentNodes[i], parentNode: `${parentNodes[i].id}`},
                                        target: tempEdges[j].data.target,
                                        label: "",
                                    }
                                },
                            )
                        }
                    }
                }

                tempNodes.push({
                    id: `${parentNodes[i].id}-widthAdjuster`,
                    position: { x: 0, y: 0 },
                    type: "agentNode",
                    height: 100,
                    width: 50,
                    parentNode: `${parentNodes[i].id}`,
                    group: `${parentNodes[i].id}`,
                    hidden: true,
                    data: {label: `${parentNodes[i].id}`}
                })
            }
        }

        //console.log("parent groups", shouldUseTaskGroups(view_config), [...parentNodes, ...tempNodes], tempEdges);
        setGraphData({
            groups: shouldUseTaskGroups(localViewConfig) ? parentNodes : [],
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
            setLocalViewConfig({...localViewConfig, rankDir: "BT", group_by: "name"});
        } else {
            setLocalViewConfig({...localViewConfig, rankDir: "LR", group_by: "name"});
        }
    }
    return (
        <div style={{height: "100%", width: "100%"}} ref={viewportRef}>
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
                onNodeContextMenu={onNodeContextMenu}
            >
                <Panel position={"top-left"} >{panel}</Panel>
                <Controls showInteractive={false} >
                    <ControlButton onClick={toggleViewConfig} title={"Toggle View"}>
                        <SwapCallsIcon />
                    </ControlButton>
                </Controls>
            </ReactFlow>
            {openContextMenu &&
                <div style={{...contextMenuCoord}} className="context-menu">
                    {contextMenu.map( (m) => (
                        <Button key={m.title} variant={"contained"} className="context-menu-button" onClick={() => {
                            m.onClick(contextMenuNode.current);
                            setOpenContextMenu(false);
                        }}>{m.title}</Button>
                    ))}
                </div>
            }
        </div>

    )
}

