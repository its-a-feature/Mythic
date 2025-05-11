import React, {useCallback} from 'react';
import {gql, useQuery, useSubscription, useMutation, useLazyQuery} from '@apollo/client';
import Typography from '@mui/material/Typography';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import {Link} from '@mui/material';
import createLayout, {getSourcePosition, getTargetPosition} from "../Callbacks/C2PathDialog";
import {ReactFlow,
    applyEdgeChanges,
    applyNodeChanges,
    Controls,
    Handle,
    ReactFlowProvider,
    useReactFlow,
    useUpdateNodeInternals
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {useTheme} from '@mui/material/styles';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HideSourceIcon from '@mui/icons-material/HideSource';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import {adjustDurationOutput, adjustOutput} from "./EventGroupInstancesTable";
import Moment from 'react-moment';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {b64DecodeUnicode} from "../Callbacks/ResponseDisplay";
import {APITokenRow} from "../Settings/SettingsOperatorAPITokenRow";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import {DetailedPayloadTable} from "../Payloads/DetailedPayloadTable";
import InfoIconOutline from '@mui/icons-material/InfoOutlined';
import IconButton from '@mui/material/IconButton';
import {snackActions} from "../../utilities/Snackbar";
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import "ace-builds/src-noconflict/ext-searchbox";
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {PayloadsTableRowBuildStatus} from "../Payloads/PayloadsTableRowBuildStatus";
import ArchiveIcon from '@mui/icons-material/Archive';
import {downloadBulkQuery, SnackMessage} from "../Search/FileMetaTable";
import {MythicConfirmDialog} from "../../MythicComponents/MythicConfirmDialog";
import {payloadsDelete} from "../Payloads/Payloads";
import DeleteIcon from '@mui/icons-material/Delete';
import {getStringSize} from "../Callbacks/ResponseDisplayTable";


const getEventSteps = gql`
query GetEventSteps($eventgroup_id: Int!) {
  eventstep(where: {eventgroup_id: {_eq: $eventgroup_id}}) {
    id
    environment
    name
    description
    depends_on
    action
    action_data
    inputs
    outputs
    order
  }
}
 `;
const sub_eventstepinstance = gql`
subscription GetEventStepInstances($eventgroupinstance_id: Int!) {
  eventstepinstance_stream(cursor: {initial_value: {updated_at: "1970-01-01"}, ordering: ASC}, batch_size: 50, where: {eventgroupinstance_id: {_eq: $eventgroupinstance_id}}) {
    id
    eventstep {
        name
        id
        description
        depends_on
        order
    }
    created_at
    updated_at
    end_timestamp
    status
    order
  }
}
 `;
const get_eventstepinstance = gql`
query getEventStepInstanceDetails($eventstepinstance_id: Int!){
    eventstepinstance_by_pk(id: $eventstepinstance_id){
        environment
        inputs
        outputs
        id
        status
        updated_at
        created_at
        order
        end_timestamp
        action_data
        stdout
        stderr
        eventstep {
            action
            action_data
            description
            name
            inputs
            outputs
            environment
            depends_on
        }
        apitokens {
          name
          id
          deleted
          active
          token_value
          token_type
          operator {
            username
          }
          created_by_operator {
            username
            id
          }
        }
        callbacks {
          display_id
          id
        }
        filemeta {
          agent_file_id
          filename_text
          id
          deleted
          full_remote_path_text
          comment
          size
        }
        payloads {
          payloadtype {
            name
          }
          id
          build_phase
          filemetum {
            filename_text
            agent_file_id
            id
          }
        }
        tasks (order_by: {id: asc}) {
            id
            command_name
            display_id
            display_params
            operator {
                username
            }
            callback {
                display_id
                payload {
                    payloadtype {
                        name
                    }
                }
            }
        }
    }
}
`;
const get_eventgroupinstance = gql`
query getEventStepInstanceDetails($eventgroupinstance_id: Int!){
    eventgroupinstance_by_pk(id: $eventgroupinstance_id){
        environment
        id
        status
        updated_at
        created_at
        trigger
        trigger_metadata
        eventgroup {
            name
            description
        }
    }
    apitokens(where: {eventstepinstance: {eventgroupinstance_id: {_eq: $eventgroupinstance_id}}}) {
      name
      id
      deleted
      active
      token_value
      token_type
      operator {
        username
      }
      created_by_operator {
        username
        id
      }
    }
    callback(where: {eventstepinstance: {eventgroupinstance_id: {_eq: $eventgroupinstance_id}}}) {
      display_id
      user
      host
      pid
      process_name
      id
    }
    filemeta(where: {eventstepinstance: {eventgroupinstance_id: {_eq: $eventgroupinstance_id}}}) {
      agent_file_id
      filename_text
      id
      deleted
      full_remote_path_text
      comment
      size
    }
    payload(where: {eventstepinstance: {eventgroupinstance_id: {_eq: $eventgroupinstance_id}}}) {
      payloadtype {
        name
      }
      id
      build_phase
      deleted
      filemetum {
        id
        filename_text
        agent_file_id
      }
    }
    task(where: {eventstepinstance: {eventgroupinstance_id: {_eq: $eventgroupinstance_id}}}, order_by: {id: asc}) {
        id
        command_name
        display_id
        display_params
        operator {
            username
        }
        callback {
            display_id
            payload {
                payloadtype {
                    name
                }
            }
        }
    }
}
`;
const getEventStep = gql`
query getEventStepInformation($eventstep_id: Int!){
    eventstep_by_pk(id: $eventstep_id) {
        id
        environment
        name
        description
        depends_on
        action
        action_data
        inputs
        outputs
        order
  }
}
`;
const retryFromEventStepMutation = gql`
mutation retryFromEventStep($eventstepinstance_id: Int!, $retry_all_groups: Boolean){
    eventingTriggerRetryFromStep(eventstepinstance_id: $eventstepinstance_id, retry_all_groups: $retry_all_groups){
        status
        error
    }
}
`;

export const GetStatusSymbol = ({data}) => {
    let style = {marginRight: "5px"};
    switch (data?.status || "") {
        case "success":
            return (<MythicStyledTooltip title={"Completed Successfully"}>
                        <CheckCircleOutlineIcon color={"success"} style={{...style}}/>
                    </MythicStyledTooltip>)
        case "running":
            return (<MythicStyledTooltip title={"Running..."}>
                        <TimelapseIcon color={"info"} style={{...style}}/>
                    </MythicStyledTooltip>)
        case "error":
            return (<MythicStyledTooltip title={"Errored"}>
                        <HighlightOffIcon color={"error"} style={{...style}}/>
                    </MythicStyledTooltip>)
        case "cancelled":
            return (<MythicStyledTooltip title={"Canceled"}>
                        <HideSourceIcon color={"warning"} style={{...style}}/>
                    </MythicStyledTooltip>)
        case "skipped":
            return (<MythicStyledTooltip title={"Skipped"}>
                        <HideSourceIcon color={"info"} style={{...style}}/>
                    </MythicStyledTooltip>)
        default:
            return (<MythicStyledTooltip title={"Waiting..."}>
                        <PanoramaFishEyeIcon style={{...style}}/>
                    </MythicStyledTooltip>)
    }
}
const GetTimeDuration = ({data, customStyle}) => {
    const theme = useTheme();
    if(!data){
        return (
            <Typography style={{
                fontSize: theme.typography.pxToRem(12),
                color: theme.palette.text.secondary,
                float: "right",
                ...customStyle
            }}>
            </Typography>
        )
    }
    return (
        <Typography style={{
            fontSize: theme.typography.pxToRem(12),
            color: theme.palette.text.secondary,
            float: "right",
            ...customStyle
        }}>
            {data?.end_timestamp === null ? (
                data?.status === "queued" ? (
                    "Waiting..."
                ) : (
                    <Moment filter={(newTime) => adjustOutput(data, newTime)} interval={1000}
                            parse={"YYYY-MM-DDTHH:mm:ss.SSSSSSZ"}
                            withTitle
                            titleFormat={"YYYY-MM-DD HH:mm:ss"}
                            fromNow ago
                    >
                        {data?.created_at + "Z"}
                    </Moment>
                )

            ) : (
                <Moment filter={(newTime) => adjustDurationOutput(data, newTime)}
                        parse={"YYYY-MM-DDTHH:mm:ss.SSSSSSZ"}
                        withTitle
                        titleFormat={"YYYY-MM-DD HH:mm:ss"}
                >
                    {data?.created_at + "Z"}
                </Moment>
            )}

        </Typography>
    )
}

function EventNode({data}) {
    return (
        <div style={{display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between"}}>
            <div style={{display: "flex", flexDirection: "row"}}>
                <GetStatusSymbol data={data}/>
                <Typography >{data.name}</Typography>
            </div>
            {data.status &&
                <GetTimeDuration data={data} />
            }

        </div>
    )
}

function GroupNode({data}) {
    const sourcePosition = getSourcePosition(data["elk.direction"]);
    const targetPosition = getTargetPosition(data["elk.direction"]);
    return (
        <>
            <Handle type={"source"} position={sourcePosition}/>
            <div className={"groupEventNode"} style={{width: data.width, height: data.height, margin: "auto"}}>

            </div>
            <Handle type={"target"} position={targetPosition}/>
        </>
    )
}

const nodeTypes = {"eventNode": EventNode, "groupEventNode": GroupNode};

export const EventStepRenderFlowWithProvider = (props) => {
    return (
        <ReactFlowProvider>
            <EventStepRender {...props} />
        </ReactFlowProvider>
    )
}

function EventStepRender({selectedEventGroup, useSuppliedData}) {
    const theme = useTheme();
    const [steps, setSteps] = React.useState([]);
    const [nodes, setNodes] = React.useState([]);
    const [edges, setEdges] = React.useState([]);
    const currentEventStep = React.useRef(0);
    const [openEventStepDetails, setOpenEventStepDetails] = React.useState(false);
    const [graphData, setGraphData] = React.useState({nodes: [], edges: [], groups: []});
    const {fitView} = useReactFlow()
    const updateNodeInternals = useUpdateNodeInternals();
    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );
    const viewportRef = React.useRef(null);
    const [getEventStepsQuery] = useLazyQuery(getEventSteps, {
        variables: {eventgroup_id: selectedEventGroup.id},
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            setSteps(data.eventstep);
        },
        onError: (data) => {

        }
    });
    React.useEffect( () => {
        if(useSuppliedData){
            setSteps(selectedEventGroup.steps);
        } else {
            getEventStepsQuery();
        }
    }, [])
    const contextMenu = React.useMemo(() => {return [
        {
            title: 'View Details',
            onClick: function(node) {
                currentEventStep.current = node.id;
                setOpenEventStepDetails(true);
            }
        },
    ]}, []);
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [contextMenuCoord, setContextMenuCord] = React.useState({});
    const contextMenuNode = React.useRef(null);
    const onNodeContextMenu = useCallback( (event, node) => {
        if(!contextMenu){return}
        if(node.type === "groupEventNode"){
            return;
        }
        event.preventDefault();
        contextMenuNode.current = {...node.data};
        setContextMenuCord({
            top:  event.clientY,
            left:  event.clientX,
        });
        setOpenContextMenu(true);
    }, [contextMenu])
    const onPaneClick = useCallback( () => {
        setOpenContextMenu(false);

    }, []);
    React.useEffect(() => {
        const maxNameLength = steps.reduce( (prev, cur) => {
            if(prev[cur.order] === undefined){
                return {...prev, [cur.order]: cur.name.length};
            }
            if(prev[cur.order] < cur.name.length){
                return {...prev, [cur.order]: cur.name.length};
            }
            return {...prev};
        }, {});
        const tempNodes = steps.map(node => {
            return {
                id: useSuppliedData ? `${node.id}-${node.order}-${node.name}` : `${node.id}`,
                position: {x: 0, y: 0},
                type: "eventNode",
                maxNameLength: maxNameLength[node.order],
                parentId: `groupEventNode-${node.order}`,
                group: `groupEventNode-${node.order}`,
                extent: "parent",
                data: {
                    label: node.name,
                    ...node,
                    id: useSuppliedData ? `${node.id}-${node.order}-${node.name}` : `${node.id}`,
                }
            }
        });
        let tempEdges = [];
        let parentIds = [];
        for (let i = 0; i < tempNodes.length; i++) {
            let found = false;
            for (let j = 0; j < parentIds.length; j++) {
                if (parentIds[j].id === `groupEventNode-${tempNodes[i].data.order}`) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                let count = 1;
                for (let j = 0; j < tempNodes.length; j++) {
                    if (tempNodes[j].data.order === tempNodes[i].data.order) {
                        count += 1;
                    }
                }
                parentIds.push({
                    id: `groupEventNode-${tempNodes[i].data.order}`,
                    position: {x: 110, y: 110},
                    type: "groupEventNode",
                    width: 20,
                    height: 10,
                    groupHeight: count ,
                    data: {
                        label: "",
                    },

                });
            }
        }
        for (let i = 0; i < tempNodes.length; i++) {
            for (let j = 0; j < (tempNodes[i].data.depends_on?.length || 0); j++) {
                let source = tempNodes[i].data;
                let destination = {};
                for (let k = 0; k < tempNodes.length; k++) {
                    if (tempNodes[k].data.name === tempNodes[i].data.depends_on[j]) {
                        destination = tempNodes[k].data;
                        break;
                    }
                }
                let tmpEdge = {
                    id: `e${destination.id}-${source.id}`,
                    target: `groupEventNode-${destination.order}`,
                    source: `groupEventNode-${source.order}`,
                    label: "",
                    animated: true,
                    data: {
                        source: {...destination, parentId: `groupEventNode-${destination.order}`},
                        target: {...source, parentId: `groupEventNode-${source.order}`},
                    }
                };
                tmpEdge.markerEnd = {
                    color: theme.palette.info.main,
                }
                tmpEdge.style = {
                    stroke: theme.palette.info.main,
                    strokeWidth: 2,
                }
                tmpEdge.markerEnd.type = "arrowclosed"
                tmpEdge.labelBgStyle = {
                    fill: theme.tableHover,
                    fillOpacity: 0.6,
                }
                tmpEdge.labelStyle = {
                    fill: theme.palette.background.contrast,
                }
                tmpEdge.labelShowBg = true
                tmpEdge.zIndex = 20;
                let found = false;
                for (let k = 0; k < tempEdges.length; k++) {
                    if (tempEdges[k].id === tmpEdge.id) {
                        found = true;
                    }
                }
                if (!found) {
                    tempEdges.push(tmpEdge);
                }
            }
        }
        setGraphData({
            groups: parentIds,
            nodes: tempNodes,
            edges: tempEdges
        })
    }, [steps]);
    React.useEffect(() => {
        (async () => {
            if (graphData.nodes.length > 0) {
                const {newNodes, newEdges} = await createLayout({
                    initialGroups: graphData.groups,
                    initialNodes: graphData.nodes,
                    initialEdges: graphData.edges,
                    alignment: "RL",
                    elkOverwrites: {
                        "elk.padding": '[top=2,left=10,right=10,bottom=2]',
                        "elk.spacing.nodeNode": 5,
                    }
                });
                setNodes(newNodes);
                setEdges(newEdges);
                window.requestAnimationFrame(() => {
                    for (let i = 0; i < newNodes.length; i++) {
                        updateNodeInternals(newNodes[i].id);
                    }
                    fitView();
                });
            }
        })();
    }, [graphData]);
    return (
        <div style={{height: "100%", width: "100%"}} ref={viewportRef}>
            <ReactFlow
                fitView
                onlyRenderVisibleElements={false}
                panOnScrollSpeed={30}
                maxZoom={100}
                minZoom={0}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                onPaneClick={onPaneClick}
                onNodeContextMenu={onNodeContextMenu}
            >
                {selectedEventGroup.id > 0 &&
                    <Typography component={"h1"} style={{marginLeft: "10px"}}>
                        EventGroup: {selectedEventGroup.id}
                    </Typography>
                }
                <Controls showInteractive={false}>
                </Controls>
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
            {openEventStepDetails &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openEventStepDetails}
                              onClose={() => {
                                  setOpenEventStepDetails(false);
                              }}
                              innerDialog={
                                  <EventStepDetailDialog onClose={() => { setOpenEventStepDetails(false); }}
                                                                 selectedEventStep={currentEventStep.current}
                                  />}
                />
            }
        </div>
    )
}

export const EventStepInstanceRenderFlowWithProvider = (props) => {
    return (
        <ReactFlowProvider>
            <EventStepInstanceRender {...props} />
        </ReactFlowProvider>
    )
}

function EventStepInstanceRender({selectedEventGroupInstance}) {
    const theme = useTheme();
    const [steps, setSteps] = React.useState([]);
    const [nodes, setNodes] = React.useState([]);
    const [edges, setEdges] = React.useState([]);
    const currentEventStepInstance = React.useRef(0);
    const [openEventStepInstanceDetails, setOpenEventStepInstanceDetails] = React.useState(false);
    const [openEventGroupInstanceDetails, setOpenEventGroupInstanceDetails] = React.useState(false);
    const [graphData, setGraphData] = React.useState({nodes: [], edges: [], groups: []});
    const {fitView} = useReactFlow()
    const updateNodeInternals = useUpdateNodeInternals();
    const [retryFromEventStep] = useMutation(retryFromEventStepMutation, {
        onCompleted: (data) => {
            if(data.eventingTriggerRetryFromStep.status === "success"){
                snackActions.success("Successfully restarted event group");
            } else {
                snackActions.error(data.eventingTriggerRetryFromStep.error);
            }
        },
        onError: (data) => {

        }
    })
    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );
    const viewportRef = React.useRef(null);
    useSubscription(sub_eventstepinstance, {
        variables: {eventgroupinstance_id: selectedEventGroupInstance},
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            const newSteps = data.data.eventstepinstance_stream.reduce( (prev, cur) => {
                let indx = prev.findIndex( ({id}) => id === cur.id);
                if(indx > -1){
                    let updatingPrev = [...prev];
                    updatingPrev[indx] = cur;
                    return [...updatingPrev];
                }
                return [...prev, cur];
            }, [...steps]);
            newSteps.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
            setSteps(newSteps);
        }
    });
    const contextMenu = React.useMemo(() => {return [
        {
            title: 'View Details',
            onClick: function(node) {
                currentEventStepInstance.current = node.id;
                setOpenEventStepInstanceDetails(true);
            }
        },
        {
            title: "View Details From All Steps",
            onClick: function(node) {
                setOpenEventGroupInstanceDetails(true);
            }
        },
        {
            title: 'Re-run From Here',
            onClick: function(node) {
                retryFromEventStep({variables: {eventstepinstance_id: node.id}})
            }
        },
        {
            title: 'Re-run All Failed Instances From Here',
            onClick: function(node) {
                retryFromEventStep({variables: {eventstepinstance_id: node.id, retry_all_groups: true}})
            }
        },
    ]}, []);
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [contextMenuCoord, setContextMenuCord] = React.useState({});
    const contextMenuNode = React.useRef(null);
    const onNodeContextMenu = useCallback( (event, node) => {
        if(!contextMenu){return}
        if(node.type === "groupEventNode"){
            return;
        }
        event.preventDefault();
        contextMenuNode.current = {...node.data};
        setContextMenuCord({
            top:  event.clientY,
            left:  event.clientX,
        });
        setOpenContextMenu(true);
    }, [contextMenu])
    const onPaneClick = useCallback( () => {
        setOpenContextMenu(false);

    }, []);
    React.useEffect(() => {
        const maxNameLength = steps.reduce( (prev, cur) => {
            if(prev[cur.order] === undefined){
                return {...prev, [cur.order]: cur.eventstep.name.length};
            }
            if(prev[cur.order] < cur.eventstep.name.length){
                return {...prev, [cur.order]: cur.eventstep.name.length};
            }
            return {...prev};
        }, {});
        const tempNodes = steps.map(node => {
            return {
                id: `${node.eventstep.id}`,
                position: {x: 0, y: 0},
                type: "eventNode",
                maxNameLength: maxNameLength[node.order],
                parentId: `groupEventNode-${node.order}`,
                group: `groupEventNode-${node.order}`,
                dragHandle: '.eventnode-drag-handle',
                extent: "parent",
                data: {
                    label: node.eventstep.name,
                    ...node,
                    ...node.eventstep,
                    id: node.id //preserve the ID being for the instance
                }
            }
        });
        let tempEdges = [];
        let parentIds = [];
        for (let i = 0; i < tempNodes.length; i++) {
            let found = false;
            for (let j = 0; j < parentIds.length; j++) {
                if (parentIds[j].id === `groupEventNode-${tempNodes[i].data.order}`) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                let count = 1;
                for (let j = 0; j < tempNodes.length; j++) {
                    if (tempNodes[j].data.order === tempNodes[i].data.order) {
                        count += 1;
                    }
                }
                parentIds.push({
                    id: `groupEventNode-${tempNodes[i].data.order}`,
                    position: {x: 110, y: 110},
                    type: "groupEventNode",
                    width: 20,
                    height: 10,
                    groupHeight: count ,
                    data: {
                        label: "",
                    },

                });
            }
        }
        for (let i = 0; i < tempNodes.length; i++) {
            for (let j = 0; j < tempNodes[i].data.depends_on.length; j++) {
                let source = tempNodes[i].data;
                let destination = {};
                for (let k = 0; k < tempNodes.length; k++) {
                    if (tempNodes[k].data.name === tempNodes[i].data.depends_on[j]) {
                        destination = tempNodes[k].data;
                        break;
                    }
                }
                let tmpEdge = {
                    id: `e${destination.id}-${source.id}`,
                    target: `groupEventNode-${destination.order}`,
                    source: `groupEventNode-${source.order}`,
                    label: "",
                    animated: true,
                    data: {
                        source: {...destination, parentId: `groupEventNode-${destination.order}`},
                        target: {...source, parentId: `groupEventNode-${source.order}`},
                    }
                };
                tmpEdge.markerEnd = {
                    color: theme.palette.info.main,
                }
                tmpEdge.style = {
                    stroke: theme.palette.info.main,
                    strokeWidth: 2,
                }
                tmpEdge.markerEnd.type = "arrowclosed"
                tmpEdge.labelBgStyle = {
                    fill: theme.tableHover,
                    fillOpacity: 0.6,
                }
                tmpEdge.labelStyle = {
                    fill: theme.palette.background.contrast,
                }
                tmpEdge.labelShowBg = true
                tmpEdge.zIndex = 20;
                let found = false;
                for (let k = 0; k < tempEdges.length; k++) {
                    if (tempEdges[k].id === tmpEdge.id) {
                        found = true;
                    }
                }
                if (!found) {
                    tempEdges.push(tmpEdge);
                }
            }
        }
        setGraphData({
            groups: parentIds,
            nodes: tempNodes,
            edges: tempEdges
        })
    }, [steps]);
    React.useEffect(() => {
        (async () => {
            if (graphData.nodes.length > 0) {
                const {newNodes, newEdges} = await createLayout({
                    initialGroups: graphData.groups,
                    initialNodes: graphData.nodes,
                    initialEdges: graphData.edges,
                    alignment: "RL",
                    elkOverwrites: {
                        "elk.padding": '[top=2,left=10,right=10,bottom=2]',
                        "elk.spacing.nodeNode": 5,
                    }
                });
                setNodes(newNodes);
                setEdges(newEdges);
                window.requestAnimationFrame(() => {
                    for (let i = 0; i < newNodes.length; i++) {
                        updateNodeInternals(newNodes[i].id);
                    }
                    fitView();
                });
            }
        })();
    }, [graphData]);
    return (
        <div style={{height: "100%", width: "100%"}} ref={viewportRef}>
            <ReactFlow
                fitView
                onlyRenderVisibleElements={false}
                panOnScrollSpeed={30}
                maxZoom={100}
                minZoom={0}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                onPaneClick={onPaneClick}
                onNodeContextMenu={onNodeContextMenu}
            >
                <Typography component={"h1"} style={{marginLeft: "10px"}}>
                    Instance: {selectedEventGroupInstance}
                </Typography>
                <Controls showInteractive={false}>
                </Controls>
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
            {openEventStepInstanceDetails &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openEventStepInstanceDetails}
                              onClose={() => {
                                  setOpenEventStepInstanceDetails(false);
                              }}
                              innerDialog={
                                  <EventStepInstanceDetailDialog onClose={() => { setOpenEventStepInstanceDetails(false); }}
                                                                 selectedEventStepInstance={currentEventStepInstance.current}
                                  />}
                />
            }
            {openEventGroupInstanceDetails &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openEventGroupInstanceDetails}
                              onClose={() => {
                                  setOpenEventGroupInstanceDetails(false);
                              }}
                              innerDialog={
                                  <EventGroupInstanceDetailDialog onClose={() => { setOpenEventGroupInstanceDetails(false); }}
                                                                 selectedEventGroupInstance={selectedEventGroupInstance}
                                  />}
                />
            }
        </div>
    )
}

export function EventStepRenderDialog({selectedEventGroup, onClose, useSuppliedData}) {
    const theme = useTheme();
    return (
        <>
            <DialogTitle style={{padding: "10px"}}>
                <div>
                    <Typography variant='h4' style={{ marginTop: "10px"}}>
                        {selectedEventGroup.name}
                    </Typography>
                </div>

                <Typography style={{color: theme.palette.text.secondary}}>
                    {selectedEventGroup.description}
                </Typography>
            </DialogTitle>
            <DialogContent dividers={true} style={{height: "calc(75vh)"}}>
                <EventStepRenderFlowWithProvider selectedEventGroup={selectedEventGroup} useSuppliedData={useSuppliedData}/>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
            </DialogActions>
        </>
    )
}
export function EventStepInstanceRenderDialog({selectedEventGroup, selectedEventGroupInstance, onClose}) {
    const theme = useTheme();
    return (
        <>
            <DialogTitle style={{padding: "10px"}}>
                Workflow: {selectedEventGroup.name}
                <br/>
                <Typography style={{color: theme.palette.text.secondary,}}>
                    {selectedEventGroup.description}
                </Typography>

            </DialogTitle>
            <DialogContent dividers={true} style={{height: "calc(75vh)"}}>
                <EventStepInstanceRenderFlowWithProvider selectedEventGroupInstance={selectedEventGroupInstance}/>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
            </DialogActions>
        </>

    )
}
function EventStepInstanceDetailDialog({selectedEventStepInstance, onClose}) {
    const theme = useTheme();
    const [data, setData] = React.useState({});
    const [deletePayload] = useMutation(payloadsDelete, {
        onCompleted: (completedData) => {
            if(completedData.deleteFile.status === "success"){
                const updatedPayloads = data.eventstepinstance_by_pk.payloads.map( p => {
                    if(completedData.deleteFile.payload_ids.includes(p.id)){
                        return {...p, deleted: true};
                    }else{
                        return {...p}
                    }
                });
                let tempData = {...data};
                tempData.eventstepinstance_by_pk.payloads = updatedPayloads;
                setData(tempData);
                snackActions.success("Successfully deleted");
            }else{
                snackActions.error(completedData.deleteFile.error);
            }
        },
        onError: (data) => {
            snackActions.warning("Failed to delete payload");
            console.log(data);
        }
    });
    const [expandStdout, setExpandStdout] = React.useState(false);
    const [expandStderr, setExpandStderr] = React.useState(false);
    const [expandStepTable, setExpandStepTable] = React.useState(false);
    const {loading} = useQuery(get_eventstepinstance, {
        fetchPolicy: "no-cache",
        variables: {eventstepinstance_id: selectedEventStepInstance},
        onCompleted: (completedData) => {
            setData(completedData);
        },
        onError: (data) => {
        }
    })
    if (loading || !data.eventstepinstance_by_pk){
        return (
            <>
                <DialogTitle>Loading...</DialogTitle>
                <DialogActions>
                    <Button onClick={onClose} variant="contained" color="primary">
                        Close
                    </Button>
                </DialogActions>
            </>

        )
    }
    if (!data){
        return (
            <>
                <DialogTitle>Failed to find step data</DialogTitle>
                <DialogActions>
                    <Button onClick={onClose} variant="contained" color="primary">
                        Close
                    </Button>
                </DialogActions>
            </>

        )
    }
    return (
        <>
            <DialogTitle style={{padding: "10px"}}>
                <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}} >
                    <div>
                        <div style={{display: "flex", alignItems: "center"}}>
                            <GetStatusSymbol data={data.eventstepinstance_by_pk}/>
                            {data.eventstepinstance_by_pk.eventstep.name}
                        </div>
                        <Typography style={{color: theme.palette.text.secondary}}>
                            {data.eventstepinstance_by_pk.eventstep.description}
                        </Typography>
                        <Typography style={{color: theme.palette.text.secondary}}>
                        <b>Depends On:</b> {data.eventstepinstance_by_pk.eventstep.depends_on.join(", ")}
                        </Typography>
                    </div>

                    <div style={{display: "flex", alignItems: "baseline", float: "right"}}>
                        Duration: <GetTimeDuration data={data.eventstepinstance_by_pk}
                                                   customStyle={{fontSize: "unset", marginLeft: "10px"}}
                    />
                    </div>
                </div>

            </DialogTitle>
            <DialogContent dividers={true} style={{height: "calc(75vh)"}}>
                <Typography style={{width: "100%", padding: "10px",
                    backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main}}
                            variant={'h5'} component={Paper} >
                    Action: <b>{data.eventstepinstance_by_pk.eventstep.action}</b>
                </Typography>
                <Paper style={{marginTop: "5px"}}>
                    <Accordion
                        TransitionProps={{ unmountOnExit: true }} defaultExpanded={false}
                        onChange={() => {setExpandStepTable(!expandStepTable)}} expanded={expandStepTable}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls={`panel1c-stdout`}
                        >Original and Instance Metadata
                        </AccordionSummary>
                        <AccordionDetails style={{cursor: "default"}}>
                            <Table style={{width: "100%", overflow: "auto", tableLayout: "fixed", }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell style={{width: "10rem"}}></TableCell>
                                        <TableCell>Original Metadata</TableCell>
                                        <TableCell style={{width: "10rem"}}></TableCell>
                                        <TableCell>Instance Metadata</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <MythicTableCell>Original Environment</MythicTableCell>
                                        <MythicTableCell style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
                                            {data.eventstepinstance_by_pk.eventstep.environment !== null &&
                                                JSON.stringify(data.eventstepinstance_by_pk.eventstep.environment, null, 2)}</MythicTableCell>
                                        <MythicTableCell
                                            style={{borderLeft: "1px solid grey"}}>Environment</MythicTableCell>
                                        <MythicTableCell style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
                                            {data.eventstepinstance_by_pk.environment !== null &&
                                                JSON.stringify(data.eventstepinstance_by_pk.environment, null, 2)}</MythicTableCell>
                                    </TableRow>
                                    <TableRow>
                                        <MythicTableCell>Original Step Inputs</MythicTableCell>
                                        <MythicTableCell style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
                                            {data.eventstepinstance_by_pk.eventstep.inputs !== null &&
                                                JSON.stringify(data.eventstepinstance_by_pk.eventstep.inputs, null, 2)}</MythicTableCell>
                                        <MythicTableCell
                                            style={{borderLeft: "1px solid grey"}}>Step Inputs</MythicTableCell>
                                        <MythicTableCell style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
                                            {data.eventstepinstance_by_pk.inputs !== null &&
                                                JSON.stringify(data.eventstepinstance_by_pk.inputs, null, 2)}
                                        </MythicTableCell>
                                    </TableRow>
                                    <TableRow>
                                        <MythicTableCell>Original Step Outputs</MythicTableCell>
                                        <MythicTableCell style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
                                            {data.eventstepinstance_by_pk.eventstep.outputs !== null &&
                                                JSON.stringify(data.eventstepinstance_by_pk.eventstep.outputs, null, 2)}
                                        </MythicTableCell>
                                        <MythicTableCell
                                            style={{borderLeft: "1px solid grey"}}>Step Outputs</MythicTableCell>
                                        <MythicTableCell style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
                                            {data.eventstepinstance_by_pk.outputs !== null &&
                                                JSON.stringify(data.eventstepinstance_by_pk.outputs, null, 2)}
                                        </MythicTableCell>
                                    </TableRow>
                                    <TableRow>
                                        <MythicTableCell>Original Action Data</MythicTableCell>
                                        <MythicTableCell style={{whiteSpace: "pre"}}>
                                            {data.eventstepinstance_by_pk.eventstep.action_data !== null &&
                                                JSON.stringify(data.eventstepinstance_by_pk.eventstep.action_data, null, 2)}
                                        </MythicTableCell>
                                        <MythicTableCell
                                            style={{borderLeft: "1px solid grey"}}>Action Data</MythicTableCell>
                                        <MythicTableCell style={{whiteSpace: "pre"}}>
                                            {data.eventstepinstance_by_pk.action_data !== null &&
                                                JSON.stringify(data.eventstepinstance_by_pk.action_data, null, 2)}
                                        </MythicTableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </AccordionDetails>
                    </Accordion>
                </Paper>
                <Paper style={{marginTop: "5px"}}>
                    <Accordion TransitionProps={{unmountOnExit: true}} defaultExpanded={false}
                               onChange={() => {
                                   setExpandStdout(!expandStdout)
                               }} expanded={expandStdout}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls={`panel1c-stdout`}
                        >StdOut
                        </AccordionSummary>
                        <AccordionDetails style={{cursor: "default"}}>
                            <AceEditor
                                mode="text"
                                theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                                fontSize={14}
                                showGutter={true}
                                height={"100px"}
                                highlightActiveLine={true}
                                value={data.eventstepinstance_by_pk.stdout}
                                width={"100%"}
                                minLines={2}
                                maxLines={30}
                                setOptions={{
                                    showLineNumbers: true,
                                    tabSize: 4,
                                    useWorker: false
                                }}/>
                        </AccordionDetails>
                    </Accordion>
                </Paper>
                <Paper style={{marginTop: "5px"}}>
                    <Accordion TransitionProps={{ unmountOnExit: true }} defaultExpanded={false}
                               onChange={() => {setExpandStderr(!expandStderr)}} expanded={expandStderr}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls={`panel1c-stdout`}
                        >StdErr
                        </AccordionSummary>
                        <AccordionDetails style={{cursor: "default"}}>
                            <AceEditor
                                mode="text"
                                theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                                fontSize={14}
                                showGutter={true}
                                height={"100px"}
                                highlightActiveLine={true}
                                value={data.eventstepinstance_by_pk.stderr}
                                width={"100%"}
                                minLines={2}
                                maxLines={30}
                                setOptions={{
                                    showLineNumbers: true,
                                    tabSize: 4,
                                    useWorker: false
                                }}/>
                        </AccordionDetails>
                    </Accordion>
                </Paper>

                {data.eventstepinstance_by_pk.callbacks.length > 0 &&
                <>
                    <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                        <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                            Callbacks Generated
                        </Typography>
                    </Paper>
                    <Table>
                        <TableBody>
                            {data.eventstepinstance_by_pk.callbacks.map(trackedData => (
                                <TableRow key={"callbacks" + trackedData.id} hover >
                                    <MythicStyledTableCell>
                                        <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                              href={"/new/callbacks/" + trackedData.display_id}>{trackedData.display_id}</Link>
                                    </MythicStyledTableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </>
                }
                <EventDetailsFilesTable files={data.eventstepinstance_by_pk.filemeta} />
                <EventDetailsPayloadsTable payloads={data.eventstepinstance_by_pk.payloads} deletePayload={deletePayload} />
                <EventDetailsTaskTable tasks={data.eventstepinstance_by_pk.tasks} />
                {data.eventstepinstance_by_pk.apitokens.length > 0 &&
                    <>
                        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                            <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                                API Tokens generated
                            </Typography>
                        </Paper>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell style={{width: "2rem"}}></TableCell>
                                    <TableCell style={{width: "5rem"}}>Active</TableCell>
                                    <TableCell style={{width: "12rem"}}>Created By</TableCell>
                                    <TableCell style={{width: "7rem"}}>Token</TableCell>
                                    <TableCell style={{width: "9rem"}}>Type</TableCell>
                                    <TableCell >Name</TableCell>
                                    <TableCell ></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.eventstepinstance_by_pk.apitokens.map(trackedData => (
                                    <APITokenRow key={"apitoken" + trackedData.id} {...trackedData}
                                                 onToggleActive={() => {}}
                                                 onDeleteAPIToken={() =>{}}
                                    >
                                    </APITokenRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                }
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
            </DialogActions>
        </>
    )
}
function EventGroupInstanceDetailDialog({selectedEventGroupInstance, onClose}) {
    const theme = useTheme();
    const [data, setData] = React.useState({});
    const {loading} = useQuery(get_eventgroupinstance, {
        fetchPolicy: "no-cache",
        variables: {eventgroupinstance_id: selectedEventGroupInstance},
        onCompleted: (completedData) => {
            setData(completedData);
        },
        onError: (data) => {
        }
    });
    const [deletePayload] = useMutation(payloadsDelete, {
        onCompleted: (completedData) => {
            if(completedData.deleteFile.status === "success"){
                const updatedPayloads = data.payload.map( p => {
                    if(completedData.deleteFile.payload_ids.includes(p.id)){
                        return {...p, deleted: true};
                    }else{
                        return {...p}
                    }
                });
                setData({...data, payload: updatedPayloads});
                snackActions.success("Successfully deleted");
            }else{
                snackActions.error(completedData.deleteFile.error);
            }

        },
        onError: (data) => {
            snackActions.warning("Failed to delete payload");
            console.log(data);
        }
    });
    if (loading){
        return (
            <>
                <DialogTitle>Loading...</DialogTitle>
                <DialogActions>
                    <Button onClick={onClose} variant="contained" color="primary">
                        Close
                    </Button>
                </DialogActions>
            </>

        )
    }
    if (!data){
        return (
            <>
                <DialogTitle>Failed to find step data</DialogTitle>
                <DialogActions>
                    <Button onClick={onClose} variant="contained" color="primary">
                        Close
                    </Button>
                </DialogActions>
            </>

        )
    }

    return (
        <>
            <DialogTitle style={{padding: "10px"}}>
                <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}} >
                    <div>
                        <div style={{display: "flex", alignItems: "center"}}>
                            <GetStatusSymbol data={data?.eventgroupinstance_by_pk}/>
                            {data.eventgroupinstance_by_pk?.eventgroup?.name}
                        </div>
                        <Typography style={{color: theme.palette.text.secondary}}>
                            {data.eventgroupinstance_by_pk?.eventgroup?.description}
                        </Typography>
                    </div>

                    <div style={{display: "flex", alignItems: "baseline", float: "right"}}>
                        Duration: <GetTimeDuration data={data?.eventgroupinstance_by_pk}
                                                   customStyle={{fontSize: "unset", marginLeft: "10px"}}
                    />
                    </div>
                </div>

            </DialogTitle>
            <DialogContent dividers={true} style={{height: "calc(75vh)"}}>
                <Typography style={{width: "100%", padding: "10px",
                    backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main}}
                            variant={'h5'} component={Paper}>
                    Aggregated Results of Instance {selectedEventGroupInstance}: <b>{data.eventgroupinstance_by_pk?.eventgroup?.name}</b>
                </Typography>

                {data?.callback?.length > 0 &&
                    <>
                        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                            <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                                Callbacks Generated
                            </Typography>
                        </Paper>
                        <Table>
                            <TableBody>
                                {data.callback.map(trackedData => (
                                    <TableRow key={"callbacks" + trackedData.id} hover >
                                        <MythicStyledTableCell>
                                            Callback ID: <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                                  href={"/new/callbacks/" + trackedData.display_id}>{trackedData.display_id}</Link>
                                        </MythicStyledTableCell>
                                        <MythicTableCell>
                                            {trackedData.user} @ {trackedData.host} ( {trackedData.pid} )
                                        </MythicTableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                }
                <EventDetailsFilesTable files={data?.filemeta} />
                <EventDetailsPayloadsTable payloads={data.payload} deletePayload={deletePayload} />
                <EventDetailsTaskTable tasks={data.task} />
                {data?.apitokens?.length > 0 &&
                    <>
                        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                            <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                                API Tokens generated
                            </Typography>
                        </Paper>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell style={{width: "2rem"}}></TableCell>
                                    <TableCell style={{width: "5rem"}}>Active</TableCell>
                                    <TableCell style={{width: "12rem"}}>Created By</TableCell>
                                    <TableCell style={{width: "7rem"}}>Token</TableCell>
                                    <TableCell style={{width: "9rem"}}>Type</TableCell>
                                    <TableCell >Name</TableCell>
                                    <TableCell ></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.apitokens.map(trackedData => (
                                    <APITokenRow key={"apitoken" + trackedData.id} {...trackedData}
                                                 onToggleActive={() => {}}
                                                 onDeleteAPIToken={() =>{}}
                                    >
                                    </APITokenRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                }

            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
            </DialogActions>
        </>

    )
}
function EventStepDetailDialog({selectedEventStep, onClose}) {
    const theme = useTheme();
    const {loading, data} = useQuery(getEventStep, {
        fetchPolicy: "no-cache",
        variables: {eventstep_id: selectedEventStep},
        onCompleted: (completedData) => {
        },
        onError: (data) => {
        }
    })
    if (loading){
        return (
            <>
                <DialogTitle>Loading...</DialogTitle>
                <DialogActions>
                    <Button onClick={onClose} variant="contained" color="primary">
                        Close
                    </Button>
                </DialogActions>
            </>

        )
    }
    if (!data){
        return (
            <>
                <DialogTitle>Failed to find step data</DialogTitle>
                <DialogActions>
                    <Button onClick={onClose} variant="contained" color="primary">
                        Close
                    </Button>
                </DialogActions>
            </>

        )
    }
    return (
        <>
            <DialogTitle style={{padding: "10px"}}>
                <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}} >
                    <div>
                        <div style={{display: "flex", alignItems: "center"}}>
                            <GetStatusSymbol data={data.eventstep_by_pk}/>
                            {data.eventstep_by_pk.name}
                        </div>
                        <Typography style={{color: theme.palette.text.secondary}}>
                            {data.eventstep_by_pk.description}
                        </Typography>
                        <Typography style={{color: theme.palette.text.secondary}}>
                            <b>Depends On:</b> {data.eventstep_by_pk.depends_on.join(", ")}
                        </Typography>
                    </div>
                </div>

            </DialogTitle>
            <DialogContent dividers={true} style={{height: "calc(75vh)"}}>
                <Typography style={{width: "100%", padding: "10px",
                    backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main}}
                            variant={'h5'} component={Paper} >
                    Action: <b>{data.eventstep_by_pk.action}</b>
                </Typography>
                <Table style={{width: "100%", overflow: "auto", tableLayout: "fixed"}}>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{width: "10rem"}}></TableCell>
                            <TableCell >Original Metadata</TableCell>
                            <TableCell style={{width: "10rem"}}></TableCell>
                            <TableCell >Instance Metadata</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <MythicTableCell >Original Environment</MythicTableCell>
                            <MythicTableCell  style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
                                {data.eventstep_by_pk.environment !== null &&
                                    JSON.stringify(data.eventstep_by_pk.environment, null, 2)}</MythicTableCell>
                            <MythicTableCell style={{borderLeft: "1px solid grey"}}>Environment</MythicTableCell>
                            <MythicTableCell  style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}></MythicTableCell>
                        </TableRow>
                        <TableRow>
                            <MythicTableCell>Original Step Inputs</MythicTableCell>
                            <MythicTableCell  style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
                                {data.eventstep_by_pk.inputs !== null &&
                                    JSON.stringify(data.eventstep_by_pk.inputs, null, 2)}</MythicTableCell>
                            <MythicTableCell style={{borderLeft: "1px solid grey"}}>Step Inputs</MythicTableCell>
                            <MythicTableCell style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}></MythicTableCell>
                        </TableRow>
                        <TableRow>
                            <MythicTableCell>Original Step Outputs</MythicTableCell>
                            <MythicTableCell  style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
                                {data.eventstep_by_pk.outputs !== null &&
                                    JSON.stringify(data.eventstep_by_pk.outputs, null, 2)}
                            </MythicTableCell>
                            <MythicTableCell style={{borderLeft: "1px solid grey"}}>Step Outputs</MythicTableCell>
                            <MythicTableCell  style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}></MythicTableCell>
                        </TableRow>
                        <TableRow>
                            <MythicTableCell>Original Action Data</MythicTableCell>
                            <MythicTableCell style={{whiteSpace: "pre"}}>
                                {data.eventstep_by_pk.action_data !== null &&
                                    JSON.stringify(data.eventstep_by_pk.action_data, null, 2)}
                            </MythicTableCell>
                            <MythicTableCell style={{borderLeft: "1px solid grey"}}>Action Data</MythicTableCell>
                            <MythicTableCell style={{whiteSpace: "pre"}}></MythicTableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
            </DialogActions>
        </>

    )
}
function EventDetailsPayloadsTable({payloads, deletePayload}){
    const theme = useTheme();
    const [openDetailedView, setOpenDetailedView] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const selectedPayloadRef = React.useRef({});
    const [downloadBulk] = useMutation(downloadBulkQuery, {
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.download_bulk.status === "success"){
                snackActions.success(<SnackMessage
                    file_id={data.download_bulk.file_id}
                />, {toastId: data.download_bulk.file_id, autoClose: false, closeOnClick: false});
                //snackActions.success("", {persist: true, content: key => <MythicSnackDownload id={key} title="Download Zip File" innerText="Filenames are random UUIDs, so a JSON file is included with a mapping of UUID to real filename" downloadLink={window.location.origin + "/api/v1.4/files/download/" + data.download_bulk.file_id} />});
            }else{
                snackActions.error(data.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to zip up files");
        }
    });
    const onDownloadBulkPayloads = () => {
        snackActions.info("Zipping up files...");
        let fileIds = [];
        for(let i = 0; i < payloads.length; i++){
            if(payloads[i].build_phase === "success" && !payloads[i].deleted){
                fileIds.push(payloads[i].filemetum.agent_file_id);
            }
        }
        downloadBulk({variables:{files: fileIds}})
    }
    const onAcceptDelete = () => {
        deletePayload({variables: {id: selectedPayloadRef.current.filemetum.id}});
        setOpenDeleteDialog(false);
    }
    const onDeletePayload = (selectedData) => {
        selectedPayloadRef.current = selectedData;
        setOpenDeleteDialog(true);
    }
    const onViewDetailedData = (selectedData) => {
        selectedPayloadRef.current = selectedData;
        setOpenDetailedView(true);
    }
    return (
        payloads?.length > 0 &&
        <>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                    Payloads Generated
                </Typography>
                <Button size="small" onClick={onDownloadBulkPayloads} style={{float: "right", paddingBottom: 0}}
                        color="primary" variant="contained"
                >
                    <ArchiveIcon/>Zip & Download All Available Payloads
                </Button>
            </Paper>
            <Table>
                <TableBody>
                    {openDelete &&
                        <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDelete}/>
                    }
                    {openDetailedView &&
                        <MythicDialog fullWidth={true} maxWidth="lg" open={openDetailedView}
                                      onClose={()=>{setOpenDetailedView(false);}}
                                      innerDialog={<DetailedPayloadTable {...selectedPayloadRef.current} payload_id={selectedPayloadRef.current.id} onClose={()=>{setOpenDetailedView(false);}} />}
                        />
                    }
                    {payloads.map(trackedData => (
                        <TableRow key={"payloads" + trackedData.id} hover >
                            <MythicStyledTableCell style={{width: "2rem"}}>
                                {!trackedData.deleted &&
                                    <React.Fragment>
                                        <MythicStyledTooltip title={"Delete the payload from disk and mark as deleted. No new callbacks can be generated from this payload"}>
                                            <IconButton size="small" disableFocusRipple={true}
                                                        disableRipple={true} onClick={()=>{onDeletePayload(trackedData)}} color="error" variant="contained"><DeleteIcon/></IconButton>
                                        </MythicStyledTooltip>
                                    </React.Fragment>
                                }

                            </MythicStyledTableCell>
                            <MythicStyledTableCell style={{width: "60px"}}>
                                <MythicStyledTooltip title={trackedData.payloadtype.name}>
                                    <MythicAgentSVGIcon payload_type={trackedData.payloadtype.name} style={{height: "40px"}}/>
                                </MythicStyledTooltip>
                            </MythicStyledTableCell>
                            <MythicStyledTableCell>{b64DecodeUnicode(trackedData.filemetum.filename_text)}</MythicStyledTableCell>
                            <MythicStyledTableCell style={{width: "3rem"}}>
                                <PayloadsTableRowBuildStatus {...trackedData} />
                            </MythicStyledTableCell>
                            <MythicStyledTableCell style={{width: "3rem"}}>
                                <IconButton disableFocusRipple={true}
                                            disableRipple={true} size="small" color="info" onClick={() => onViewDetailedData(trackedData)}>
                                    <InfoIconOutline />
                                </IconButton>
                            </MythicStyledTableCell>

                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    )
}
function EventDetailsTaskTable({tasks}){
    const theme = useTheme();
    return (
        tasks?.length > 0 &&
        <>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                    Tasks Issued
                </Typography>
            </Paper>
            <Table>
                <TableBody>
                    {tasks.map(trackedData => (
                        <TableRow key={"tasks" + trackedData.id} hover >
                            <MythicStyledTableCell>
                                <MythicAgentSVGIcon payload_type={trackedData.callback.payload.payloadtype.name}
                                                    style={{height: "40px"}} />
                            </MythicStyledTableCell>
                            <MythicStyledTableCell>
                                Callback: <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                                href={"/new/callbacks/" + trackedData.callback.display_id}>{trackedData.callback.display_id}</Link>
                            </MythicStyledTableCell>
                            <MythicStyledTableCell>
                                Task: <Link style={{wordBreak: "break-all"}} color={"textPrimary"} underline={"always"} target={"_blank"}
                                            href={"/new/task/" + trackedData.display_id}>{trackedData.display_id}</Link>
                            </MythicStyledTableCell>
                            <MythicStyledTableCell>
                                <b>{trackedData.command_name}</b> {trackedData.display_params}
                            </MythicStyledTableCell>
                            <MythicStyledTableCell>
                                {trackedData.operator.username}
                            </MythicStyledTableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    )
}
function EventDetailsFilesTable({files}){
    const theme = useTheme();
    const [downloadBulk] = useMutation(downloadBulkQuery, {
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.download_bulk.status === "success"){
                snackActions.success(<SnackMessage
                    file_id={data.download_bulk.file_id}
                />, {toastId: data.download_bulk.file_id, autoClose: false, closeOnClick: false});
                //snackActions.success("", {persist: true, content: key => <MythicSnackDownload id={key} title="Download Zip File" innerText="Filenames are random UUIDs, so a JSON file is included with a mapping of UUID to real filename" downloadLink={window.location.origin + "/api/v1.4/files/download/" + data.download_bulk.file_id} />});
            }else{
                snackActions.error(data.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to zip up files");
        }
    });
    const onDownloadBulkPayloads = () => {
        snackActions.info("Zipping up files...");
        let fileIds = [];
        for(let i = 0; i < files.length; i++){
            if( !files[i].deleted){
                fileIds.push(files[i].agent_file_id);
            }
        }
        downloadBulk({variables:{files: fileIds}})
    }
    return (
        files?.length > 0 &&
        <>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                    Files Tracked
                </Typography>
                <Button size="small" onClick={onDownloadBulkPayloads} style={{float: "right", paddingBottom: 0}}
                        color="primary" variant="contained"
                >
                    <ArchiveIcon/>Zip & Download All Files
                </Button>
            </Paper>
            <Table>
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell>File Name</MythicStyledTableCell>
                        <MythicStyledTableCell>Comment</MythicStyledTableCell>
                        <MythicStyledTableCell>Size</MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {files.map(trackedData => (
                        <TableRow key={"filemeta" + trackedData.id} hover >
                            <MythicStyledTableCell>
                                {trackedData.deleted ? (
                                    <Typography variant="body2" style={{wordBreak: "break-all"}}>
                                        {b64DecodeUnicode(trackedData.full_remote_path_text) === "" ?
                                            b64DecodeUnicode(trackedData.filename_text) :
                                            b64DecodeUnicode(trackedData.full_remote_path_text)}
                                    </Typography>
                                ) : (
                                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" + trackedData.agent_file_id}>
                                        {b64DecodeUnicode(trackedData.full_remote_path_text) === "" ?
                                            b64DecodeUnicode(trackedData.filename_text) :
                                            b64DecodeUnicode(trackedData.full_remote_path_text)}
                                    </Link>
                                )
                                }
                            </MythicStyledTableCell>
                            <MythicStyledTableCell>
                                {trackedData.comment}
                            </MythicStyledTableCell>
                            <MythicStyledTableCell>
                                {getStringSize({cellData: {"plaintext": trackedData.size}})}
                            </MythicStyledTableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    )
}