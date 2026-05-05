import React, {useCallback} from 'react';
import {gql, useQuery, useSubscription, useMutation, useLazyQuery} from '@apollo/client';
import Typography from '@mui/material/Typography';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
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
import {MythicPageHeader} from "../../MythicComponents/MythicPageHeader";
import {MythicEmptyState, MythicErrorState, MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";
import {MythicClientSideTablePagination, useMythicClientPagination} from "../../MythicComponents/MythicTablePagination";


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
          scopes
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
      scopes
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
const getStatusLabel = (status) => {
    switch(status || ""){
        case "success":
            return "Success";
        case "running":
            return "Running";
        case "error":
            return "Error";
        case "cancelled":
            return "Cancelled";
        case "skipped":
            return "Skipped";
        case "queued":
            return "Queued";
        default:
            return "Waiting";
    }
}
const getStatusClass = (status) => {
    switch(status || ""){
        case "success":
            return "success";
        case "running":
            return "running";
        case "error":
            return "error";
        case "cancelled":
            return "cancelled";
        case "skipped":
            return "skipped";
        default:
            return "waiting";
    }
}
const hasEventingStatus = (status) => status !== undefined && status !== null && status !== "";
const getEventingStatusClass = (status) => hasEventingStatus(status) ? getStatusClass(status) : "configured";
const EventingStatusChip = ({data}) => {
    const hasStatus = hasEventingStatus(data?.status);
    return (
        <span className={`mythic-eventing-status-chip mythic-eventing-status-chip-${getEventingStatusClass(data?.status)}`.trim()}>
            {hasStatus ? <GetStatusSymbol data={data}/> : <PanoramaFishEyeIcon/>}
            <span>{hasStatus ? getStatusLabel(data?.status) : "Configured"}</span>
        </span>
    )
}
const EventingDetailChip = ({label, value}) => (
    value === undefined || value === null || value === "" ? null :
        <span className="mythic-eventing-detail-chip">
            <span className="mythic-eventing-detail-chip-label">{label}</span>
            <span className="mythic-eventing-detail-chip-value">{value}</span>
        </span>
)
const stringifyEventingValue = (value) => {
    if(value === undefined || value === null || value === ""){
        return "";
    }
    if(typeof value === "string"){
        return value;
    }
    try{
        return JSON.stringify(value, null, 2);
    }catch(error){
        return String(value);
    }
}
const EventingCodeBlock = ({value, emptyText="No data"}) => {
    const displayValue = stringifyEventingValue(value);
    return (
        <pre className={`mythic-eventing-code-block ${displayValue === "" ? "mythic-eventing-code-block-empty" : ""}`.trim()}>
            {displayValue === "" ? emptyText : displayValue}
        </pre>
    )
}
const EventingDetailSection = ({title, subtitle, count, actions, children, className = "", collapsible = false, defaultExpanded = false}) => {
    const [expanded, setExpanded] = React.useState(defaultExpanded);
    const isExpanded = collapsible ? expanded : true;
    const hasCount = count !== undefined && count !== null;
    const hasPositiveCount = Number(count) > 0;
    const toggleExpanded = () => {
        if(collapsible){
            setExpanded((expanded) => !expanded);
        }
    }
    return (
        <div className={`mythic-eventing-detail-section ${collapsible ? "mythic-eventing-detail-section-collapsible" : ""} ${isExpanded ? "mythic-eventing-detail-section-expanded" : "mythic-eventing-detail-section-collapsed"} ${className}`.trim()}>
            <div className="mythic-eventing-detail-section-header">
                {collapsible ? (
                    <button
                        aria-expanded={isExpanded}
                        className="mythic-eventing-detail-section-toggle"
                        onClick={toggleExpanded}
                        type="button"
                    >
                        <ExpandMoreIcon className="mythic-eventing-detail-section-toggle-icon" fontSize="small" />
                        <span className="mythic-eventing-detail-section-title-stack">
                            <span className="mythic-eventing-detail-section-title">{title}</span>
                            {subtitle &&
                                <span className="mythic-eventing-detail-section-subtitle">{subtitle}</span>
                            }
                        </span>
                    </button>
                ) : (
                    <div className="mythic-eventing-detail-section-title-stack">
                        <div className="mythic-eventing-detail-section-title">{title}</div>
                        {subtitle &&
                            <div className="mythic-eventing-detail-section-subtitle">{subtitle}</div>
                        }
                    </div>
                )}
                <div className="mythic-eventing-detail-section-actions">
                    {hasCount &&
                        <span className={`mythic-eventing-detail-count ${hasPositiveCount ? "mythic-eventing-detail-count-active" : "mythic-eventing-detail-count-empty"}`}>{count}</span>
                    }
                    {actions}
                </div>
            </div>
            {isExpanded &&
                <div className="mythic-eventing-detail-section-body">
                    {children}
                </div>
            }
        </div>
    )
}
const EventingSectionEmpty = ({title, description}) => (
    <div className="mythic-eventing-section-empty">
        <MythicEmptyState compact title={title} description={description} minHeight={118} />
    </div>
)
const EventingMetadataPair = ({label, original, instance, originalLabel="Configured", instanceLabel="Runtime"}) => (
    <div className="mythic-eventing-metadata-pair">
        <div className="mythic-eventing-metadata-pair-title">{label}</div>
        <div className="mythic-eventing-metadata-pair-grid">
            <div className="mythic-eventing-metadata-panel">
                <div className="mythic-eventing-metadata-panel-title">{originalLabel}</div>
                <EventingCodeBlock value={original} />
            </div>
            <div className="mythic-eventing-metadata-panel">
                <div className="mythic-eventing-metadata-panel-title">{instanceLabel}</div>
                <EventingCodeBlock value={instance} />
            </div>
        </div>
    </div>
)
const EventingHeaderTitle = ({statusData, title}) => (
    <span className="mythic-eventing-header-title">
        {statusData && <EventingStatusChip data={statusData}/>}
        <span>{title}</span>
    </span>
)
const EventingHeaderDuration = ({data}) => (
    <div className="mythic-eventing-header-duration">
        <span className="mythic-eventing-header-duration-label">Duration</span>
        <GetTimeDuration data={data} customStyle={{fontSize: "unset", marginLeft: 0}}/>
    </div>
)
const EventingDialogTitle = ({actions, meta, statusData, subtitle, title}) => (
    <div className="mythic-eventing-dialog-header">
        <MythicPageHeader
            actions={actions}
            meta={meta}
            subtitle={subtitle}
            title={<EventingHeaderTitle statusData={statusData} title={title}/>}
            sx={{m: 0}}
        />
    </div>
)
const EventingDialogState = ({description, onClose, title, type = "loading"}) => {
    const StateComponent = type === "error" ? MythicErrorState : MythicLoadingState;
    return (
        <>
            <EventingDialogTitle title={title} />
            <DialogContent dividers={true} className="mythic-eventing-detail-dialog-content mythic-eventing-detail-dialog-content-state">
                <StateComponent compact title={title} description={description} minHeight={190} />
            </DialogContent>
            <DialogActions className="mythic-eventing-detail-dialog-actions">
                <Button className="mythic-table-row-action" onClick={onClose} variant="outlined">
                    Close
                </Button>
            </DialogActions>
        </>
    )
}

function EventNode({data}) {
    const sourcePosition = getSourcePosition(data["elk.direction"]);
    const targetPosition = getTargetPosition(data["elk.direction"]);
    return (
        <>
            <Handle type={"source"} position={sourcePosition}/>
            <div className={`mythic-eventing-flow-node mythic-eventing-flow-node-${getEventingStatusClass(data?.status)}`.trim()}>
                <div className="mythic-eventing-flow-node-main">
                    <EventingStatusChip data={data}/>
                    <Typography className="mythic-eventing-flow-node-title">{data.name}</Typography>
                </div>
                <div className="mythic-eventing-flow-node-meta">
                    {data.action &&
                        <span className="mythic-eventing-flow-node-action">{data.action}</span>
                    }
                    {data.status &&
                        <GetTimeDuration data={data} />
                    }
                </div>
            </div>
            <Handle type={"target"} position={targetPosition}/>
        </>
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
                data: {
                    label: node.name,
                    ...node,
                    graph_id: useSuppliedData ? `${node.id}-${node.order}-${node.name}` : `${node.id}`,
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
                    target: destination.graph_id || destination.id,
                    source: source.graph_id || source.id,
                    label: "",
                    animated: true,
                    data: {
                        source: {...destination},
                        target: {...source},
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
            groups: [],
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
        <div className="mythic-eventing-flow-canvas" ref={viewportRef}>
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
                onNodeClick={onPaneClick}
                onPaneClick={onPaneClick}
                onNodeContextMenu={onNodeContextMenu}
            >
                {selectedEventGroup.id > 0 &&
                    <div className="mythic-eventing-flow-badge">Event group {selectedEventGroup.id}</div>
                }
                <Controls showInteractive={false} className="mythic-eventing-flow-controls">
                </Controls>
            </ReactFlow>
            {openContextMenu &&
                <div style={{...contextMenuCoord, position: "fixed"}} className="context-menu">
                    {contextMenu.map( (m) => (
                        <Button key={m.title} className="context-menu-button mythic-table-row-action mythic-table-row-action-hover-info" variant="outlined" onClick={() => {
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
                id: `${node.id}`,
                position: {x: 0, y: 0},
                type: "eventNode",
                maxNameLength: maxNameLength[node.order],
                data: {
                    label: node.eventstep.name,
                    ...node,
                    ...node.eventstep,
                    graph_id: `${node.id}`,
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
                    target: destination.graph_id || destination.id,
                    source: source.graph_id || source.id,
                    label: "",
                    animated: true,
                    data: {
                        source: {...destination},
                        target: {...source},
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
            groups: [],
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
        <div className="mythic-eventing-flow-canvas" ref={viewportRef}>
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
                onNodeClick={onPaneClick}
                onPaneClick={onPaneClick}
                onNodeContextMenu={onNodeContextMenu}
            >
                <div className="mythic-eventing-flow-badge">Instance {selectedEventGroupInstance}</div>
                <Controls showInteractive={false} className="mythic-eventing-flow-controls">
                </Controls>
            </ReactFlow>
            {openContextMenu &&
                <div style={{...contextMenuCoord, position: "fixed"}} className="context-menu">
                    {contextMenu.map( (m) => (
                        <Button key={m.title} className="context-menu-button mythic-table-row-action mythic-table-row-action-hover-info" variant="outlined" onClick={() => {
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
    return (
        <>
            <EventingDialogTitle
                title={selectedEventGroup.name}
                subtitle={selectedEventGroup.description}
            />
            <DialogContent dividers={true} className="mythic-eventing-render-dialog-content">
                <EventStepRenderFlowWithProvider selectedEventGroup={selectedEventGroup} useSuppliedData={useSuppliedData}/>
            </DialogContent>
            <DialogActions className="mythic-eventing-detail-dialog-actions">
                <Button className="mythic-table-row-action" onClick={onClose} variant="outlined">
                    Close
                </Button>
            </DialogActions>
        </>
    )
}
export function EventStepInstanceRenderDialog({selectedEventGroup, selectedEventGroupInstance, onClose}) {
    return (
        <>
            <EventingDialogTitle
                title={selectedEventGroup.name}
                subtitle={selectedEventGroup.description}
                meta={<EventingDetailChip label="Instance" value={selectedEventGroupInstance} />}
            />
            <DialogContent dividers={true} className="mythic-eventing-render-dialog-content">
                <EventStepInstanceRenderFlowWithProvider selectedEventGroupInstance={selectedEventGroupInstance}/>
            </DialogContent>
            <DialogActions className="mythic-eventing-detail-dialog-actions">
                <Button className="mythic-table-row-action" onClick={onClose} variant="outlined">
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
    if (loading){
        return <EventingDialogState title="Loading step details" description="Fetching runtime metadata and generated resources for this step." onClose={onClose} />
    }
    if (!data?.eventstepinstance_by_pk){
        return <EventingDialogState type="error" title="Unable to load step details" description="Mythic did not return data for this eventing step instance." onClose={onClose} />
    }
    const stepInstance = data.eventstepinstance_by_pk;
    const stepDefinition = stepInstance.eventstep;
    const hasStdout = stepInstance.stdout !== undefined && stepInstance.stdout !== null && stepInstance.stdout !== "";
    const hasStderr = stepInstance.stderr !== undefined && stepInstance.stderr !== null && stepInstance.stderr !== "";
    return (
        <>
            <EventingDialogTitle
                actions={<EventingHeaderDuration data={stepInstance} />}
                meta={
                    <>
                        <EventingDetailChip label="Action" value={stepDefinition.action} />
                        <EventingDetailChip label="Depends on" value={stepDefinition.depends_on?.length > 0 ? stepDefinition.depends_on.join(", ") : "None"} />
                    </>
                }
                statusData={stepInstance}
                subtitle={stepDefinition.description}
                title={stepDefinition.name}
            />
            <DialogContent dividers={true} className="mythic-eventing-detail-dialog-content">
                <EventingDetailSection
                    title="Metadata"
                    subtitle="Compare configured step values with the values captured during this execution."
                >
                    <Accordion
                        className="mythic-eventing-detail-accordion mythic-eventing-metadata-accordion"
                        TransitionProps={{ unmountOnExit: true }}
                        defaultExpanded={false}
                        onChange={() => {setExpandStepTable(!expandStepTable)}} expanded={expandStepTable}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`panel1c-metadata`}>
                            Original and runtime metadata
                        </AccordionSummary>
                        <AccordionDetails>
                            <div className="mythic-eventing-metadata-comparison">
                                <EventingMetadataPair label="Environment" original={stepDefinition.environment} instance={stepInstance.environment} />
                                <EventingMetadataPair label="Inputs" original={stepDefinition.inputs} instance={stepInstance.inputs} />
                                <EventingMetadataPair label="Outputs" original={stepDefinition.outputs} instance={stepInstance.outputs} />
                                <EventingMetadataPair label="Action data" original={stepDefinition.action_data} instance={stepInstance.action_data} />
                            </div>
                        </AccordionDetails>
                    </Accordion>
                </EventingDetailSection>
                <EventingDetailSection
                    collapsible
                    count={(hasStdout ? 1 : 0) + (hasStderr ? 1 : 0)}
                    title="Execution output"
                    subtitle="Output streams captured while this step ran."
                >
                    {!hasStdout && !hasStderr ? (
                        <EventingSectionEmpty
                            title="No output captured"
                            description="This step did not write stdout or stderr."
                        />
                    ) : (
                        <>
                            {hasStdout && (
                                <Accordion className="mythic-eventing-detail-accordion" TransitionProps={{unmountOnExit: true}} defaultExpanded={false}
                                           onChange={() => {
                                               setExpandStdout(!expandStdout)
                                           }} expanded={expandStdout}
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        aria-controls={`panel1c-stdout`}
                                    >
                                        View stdout
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <AceEditor
                                            mode="text"
                                            theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                                            fontSize={14}
                                            showGutter={true}
                                            height={"160px"}
                                            highlightActiveLine={true}
                                            value={stepInstance.stdout || ""}
                                            width={"100%"}
                                            minLines={4}
                                            maxLines={30}
                                            setOptions={{
                                                showLineNumbers: true,
                                                tabSize: 4,
                                                useWorker: false
                                            }}/>
                                    </AccordionDetails>
                                </Accordion>
                            )}
                            {hasStderr && (
                                <Accordion className="mythic-eventing-detail-accordion" TransitionProps={{ unmountOnExit: true }} defaultExpanded={false}
                                           onChange={() => {setExpandStderr(!expandStderr)}} expanded={expandStderr}
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        aria-controls={`panel1c-stderr`}
                                    >
                                        View stderr
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <AceEditor
                                            mode="text"
                                            theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                                            fontSize={14}
                                            showGutter={true}
                                            height={"160px"}
                                            highlightActiveLine={true}
                                            value={stepInstance.stderr || ""}
                                            width={"100%"}
                                            minLines={4}
                                            maxLines={30}
                                            setOptions={{
                                                showLineNumbers: true,
                                                tabSize: 4,
                                                useWorker: false
                                            }}/>
                                    </AccordionDetails>
                                </Accordion>
                            )}
                        </>
                    )}
                </EventingDetailSection>
                <EventDetailsCallbacksTable callbacks={stepInstance.callbacks} />
                <EventDetailsFilesTable files={stepInstance.filemeta} />
                <EventDetailsPayloadsTable payloads={stepInstance.payloads} deletePayload={deletePayload} />
                <EventDetailsTaskTable tasks={stepInstance.tasks} />
                <EventDetailsAPITokensTable tokens={stepInstance.apitokens} />
            </DialogContent>
            <DialogActions className="mythic-eventing-detail-dialog-actions">
                <Button className="mythic-table-row-action" onClick={onClose} variant="outlined">
                    Close
                </Button>
            </DialogActions>
        </>
    )
}
function EventGroupInstanceDetailDialog({selectedEventGroupInstance, onClose}) {
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
        return <EventingDialogState title="Loading workflow instance" description="Fetching generated resources and trigger metadata for this workflow run." onClose={onClose} />
    }
    if (!data?.eventgroupinstance_by_pk){
        return <EventingDialogState type="error" title="Unable to load workflow instance" description="Mythic did not return data for this eventing workflow instance." onClose={onClose} />
    }
    const groupInstance = data.eventgroupinstance_by_pk;
    return (
        <>
            <EventingDialogTitle
                actions={<EventingHeaderDuration data={groupInstance} />}
                meta={
                    <>
                        <EventingDetailChip label="Instance" value={selectedEventGroupInstance} />
                        <EventingDetailChip label="Trigger" value={groupInstance.trigger} />
                    </>
                }
                statusData={groupInstance}
                subtitle={groupInstance.eventgroup?.description}
                title={groupInstance.eventgroup?.name}
            />
            <DialogContent dividers={true} className="mythic-eventing-detail-dialog-content">
                <EventingDetailSection
                    title="Instance metadata"
                    subtitle="Runtime values captured for this workflow instance."
                >
                    <div className="mythic-eventing-metadata-comparison mythic-eventing-metadata-comparison-single">
                        <EventingMetadataPair label="Environment" original={groupInstance.environment} instance={groupInstance.trigger_metadata} originalLabel="Environment" instanceLabel="Trigger metadata" />
                    </div>
                </EventingDetailSection>
                <EventDetailsCallbacksTable callbacks={data?.callback} includeContext />
                <EventDetailsFilesTable files={data?.filemeta} />
                <EventDetailsPayloadsTable payloads={data.payload} deletePayload={deletePayload} />
                <EventDetailsTaskTable tasks={data.task} />
                <EventDetailsAPITokensTable tokens={data?.apitokens} />
            </DialogContent>
            <DialogActions className="mythic-eventing-detail-dialog-actions">
                <Button className="mythic-table-row-action" onClick={onClose} variant="outlined">
                    Close
                </Button>
            </DialogActions>
        </>
    )
}
function EventStepDetailDialog({selectedEventStep, onClose}) {
    const {loading, data} = useQuery(getEventStep, {
        fetchPolicy: "no-cache",
        variables: {eventstep_id: selectedEventStep},
        onCompleted: (completedData) => {
        },
        onError: (data) => {
        }
    })
    if (loading){
        return <EventingDialogState title="Loading step details" description="Fetching the configured values for this workflow step." onClose={onClose} />
    }
    if (!data?.eventstep_by_pk){
        return <EventingDialogState type="error" title="Unable to load step details" description="Mythic did not return data for this configured eventing step." onClose={onClose} />
    }
    const stepDefinition = data.eventstep_by_pk;
    return (
        <>
            <EventingDialogTitle
                meta={
                    <>
                        <EventingDetailChip label="Action" value={stepDefinition.action} />
                        <EventingDetailChip label="Depends on" value={stepDefinition.depends_on?.length > 0 ? stepDefinition.depends_on.join(", ") : "None"} />
                    </>
                }
                statusData={stepDefinition}
                subtitle={stepDefinition.description}
                title={stepDefinition.name}
            />
            <DialogContent dividers={true} className="mythic-eventing-detail-dialog-content">
                <EventingDetailSection
                    title="Configured metadata"
                    subtitle="Values defined by this workflow step before any runtime substitutions occur."
                >
                    <div className="mythic-eventing-metadata-static-grid">
                        <div className="mythic-eventing-metadata-panel">
                            <div className="mythic-eventing-metadata-panel-title">Environment</div>
                            <EventingCodeBlock value={stepDefinition.environment} />
                        </div>
                        <div className="mythic-eventing-metadata-panel">
                            <div className="mythic-eventing-metadata-panel-title">Inputs</div>
                            <EventingCodeBlock value={stepDefinition.inputs} />
                        </div>
                        <div className="mythic-eventing-metadata-panel">
                            <div className="mythic-eventing-metadata-panel-title">Outputs</div>
                            <EventingCodeBlock value={stepDefinition.outputs} />
                        </div>
                        <div className="mythic-eventing-metadata-panel">
                            <div className="mythic-eventing-metadata-panel-title">Action data</div>
                            <EventingCodeBlock value={stepDefinition.action_data} />
                        </div>
                    </div>
                </EventingDetailSection>
            </DialogContent>
            <DialogActions className="mythic-eventing-detail-dialog-actions">
                <Button className="mythic-table-row-action" onClick={onClose} variant="outlined">
                    Close
                </Button>
            </DialogActions>
        </>
    )
}
function EventDetailsCallbacksTable({callbacks, includeContext = false}){
    const callbackRows = callbacks || [];
    const callbackCount = callbackRows.length;
    const pagination = useMythicClientPagination({
        items: callbackRows,
        resetKey: includeContext ? "with-context" : "without-context",
    });
    return (
        <EventingDetailSection collapsible title="Callbacks generated" count={callbackCount}>
            {callbackCount === 0 ? (
                <EventingSectionEmpty
                    title="No callbacks generated"
                    description="This workflow has not produced any callbacks yet."
                />
            ) : (
                <>
                    <TableContainer className="mythicElement mythic-eventing-detail-table-wrap mythic-fixed-row-table-wrap">
                        <Table style={{height: "auto"}}>
                            <TableHead>
                                <TableRow>
                                    <MythicStyledTableCell>Callback</MythicStyledTableCell>
                                    {includeContext &&
                                        <MythicStyledTableCell>
                                            Context
                                        </MythicStyledTableCell>
                                    }
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pagination.pageData.map(trackedData => (
                                    <TableRow key={"callbacks" + trackedData.id} hover>
                                        <MythicStyledTableCell>
                                            <Link className="mythic-eventing-resource-link" color="textPrimary" underline="always" target="_blank"
                                                  href={"/new/callbacks/" + trackedData.display_id}>{trackedData.display_id}</Link>
                                        </MythicStyledTableCell>
                                        {includeContext &&
                                            <MythicStyledTableCell>
                                                <span className="mythic-eventing-resource-secondary">
                                                    {trackedData.user || "unknown"} @ {trackedData.host || "unknown"}
                                                    {trackedData.pid ? ` (${trackedData.pid})` : ""}
                                                    {trackedData.process_name ? ` - ${trackedData.process_name}` : ""}
                                                </span>
                                            </MythicStyledTableCell>
                                        }
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <MythicClientSideTablePagination pagination={pagination} />
                </>
            )}
        </EventingDetailSection>
    )
}
function EventDetailsAPITokensTable({tokens}){
    const tokenRows = tokens || [];
    const tokenCount = tokenRows.length;
    const pagination = useMythicClientPagination({items: tokenRows});
    return (
        <EventingDetailSection collapsible title="API tokens generated" count={tokenCount}>
            {tokenCount === 0 ? (
                <EventingSectionEmpty
                    title="No API tokens generated"
                    description="This workflow has not created any API tokens."
                />
            ) : (
                <>
                    <TableContainer className="mythicElement mythic-eventing-detail-table-wrap mythic-fixed-row-table-wrap">
                        <Table style={{height: "auto"}}>
                            <TableHead>
                                <TableRow>
                                    <TableCell style={{width: "2rem"}}></TableCell>
                                    <TableCell style={{width: "5rem"}}>Active</TableCell>
                                    <TableCell style={{width: "12rem"}}>Created By</TableCell>
                                    <TableCell style={{width: "7rem"}}>Token</TableCell>
                                    <TableCell style={{width: "9rem"}}>Type</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pagination.pageData.map(trackedData => (
                                    <APITokenRow key={"apitoken" + trackedData.id} {...trackedData}
                                                 onToggleActive={() => {}}
                                                 onDeleteAPIToken={() =>{}}
                                    >
                                    </APITokenRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <MythicClientSideTablePagination pagination={pagination} />
                </>
            )}
        </EventingDetailSection>
    )
}
function EventDetailsPayloadsTable({payloads, deletePayload}){
    const payloadRows = payloads || [];
    const payloadCount = payloadRows.length;
    const pagination = useMythicClientPagination({items: payloadRows});
    const [openDetailedView, setOpenDetailedView] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const selectedPayloadRef = React.useRef({});
    const [downloadBulk] = useMutation(downloadBulkQuery, {
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.downloadBulk.status === "success"){
                snackActions.success(<SnackMessage
                    file_id={data.downloadBulk.file_id}
                />, {toastId: data.downloadBulk.file_id, autoClose: false, closeOnClick: false});
            }else{
                snackActions.error(data.downloadBulk.error);
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
        for(let i = 0; i < payloadRows.length; i++){
            if(payloadRows[i].build_phase === "success" && !payloadRows[i].deleted){
                fileIds.push(payloadRows[i].filemetum.agent_file_id);
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
        <>
            {openDelete &&
                <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDelete}/>
            }
            {openDetailedView &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openDetailedView}
                              onClose={()=>{setOpenDetailedView(false);}}
                              innerDialog={<DetailedPayloadTable {...selectedPayloadRef.current} payload_id={selectedPayloadRef.current.id} onClose={()=>{setOpenDetailedView(false);}} />}
                />
            }
            <EventingDetailSection
                collapsible
                title="Payloads generated"
                count={payloadCount}
                actions={
                    payloadCount > 0 &&
                    <Button className="mythic-table-row-action mythic-table-row-action-hover-info" size="small" onClick={onDownloadBulkPayloads}
                            variant="outlined" startIcon={<ArchiveIcon fontSize="small" />}
                    >
                        Zip and download
                    </Button>
                }
            >
                {payloadCount === 0 ? (
                    <EventingSectionEmpty
                        title="No payloads generated"
                        description="This workflow has not generated any payloads."
                    />
                ) : (
                    <>
                    <TableContainer className="mythicElement mythic-eventing-detail-table-wrap mythic-fixed-row-table-wrap">
                        <Table style={{height: "auto"}}>
                            <TableHead>
                                <TableRow>
                                    <MythicStyledTableCell style={{width: "2rem"}}></MythicStyledTableCell>
                                    <MythicStyledTableCell style={{width: "60px"}}>Type</MythicStyledTableCell>
                                    <MythicStyledTableCell>Filename</MythicStyledTableCell>
                                    <MythicStyledTableCell style={{width: "3rem"}}>Status</MythicStyledTableCell>
                                    <MythicStyledTableCell style={{width: "3rem"}}></MythicStyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pagination.pageData.map(trackedData => (
                                    <TableRow key={"payloads" + trackedData.id} hover>
                                        <MythicStyledTableCell style={{width: "2rem"}}>
                                            {!trackedData.deleted &&
                                                <MythicStyledTooltip title={"Delete the payload from disk and mark as deleted. No new callbacks can be generated from this payload"}>
                                                    <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" disableFocusRipple={true}
                                                                disableRipple={true} onClick={()=>{onDeletePayload(trackedData)}}><DeleteIcon fontSize="small" /></IconButton>
                                                </MythicStyledTooltip>
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
                                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" disableFocusRipple={true}
                                                        disableRipple={true} size="small" onClick={() => onViewDetailedData(trackedData)}>
                                                <InfoIconOutline fontSize="small" />
                                            </IconButton>
                                        </MythicStyledTableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <MythicClientSideTablePagination pagination={pagination} />
                    </>
                )}
            </EventingDetailSection>
        </>
    )
}
function EventDetailsTaskTable({tasks}){
    const taskRows = tasks || [];
    const taskCount = taskRows.length;
    const pagination = useMythicClientPagination({items: taskRows});
    return (
        <EventingDetailSection collapsible title="Tasks issued" count={taskCount}>
            {taskCount === 0 ? (
                <EventingSectionEmpty
                    title="No tasks issued"
                    description="This workflow has not issued any tasks."
                />
            ) : (
                <>
                    <TableContainer className="mythicElement mythic-eventing-detail-table-wrap mythic-fixed-row-table-wrap">
                        <Table style={{height: "auto"}}>
                            <TableHead>
                                <TableRow>
                                    <MythicStyledTableCell style={{width: "4rem"}}>Type</MythicStyledTableCell>
                                    <MythicStyledTableCell>Callback</MythicStyledTableCell>
                                    <MythicStyledTableCell>Task</MythicStyledTableCell>
                                    <MythicStyledTableCell>Command</MythicStyledTableCell>
                                    <MythicStyledTableCell>Operator</MythicStyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pagination.pageData.map(trackedData => (
                                    <TableRow key={"tasks" + trackedData.id} hover>
                                        <MythicStyledTableCell style={{width: "4rem"}}>
                                            {trackedData.callback?.payload?.payloadtype?.name &&
                                                <MythicAgentSVGIcon payload_type={trackedData.callback.payload.payloadtype.name}
                                                                    style={{height: "40px"}} />
                                            }
                                        </MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <Link className="mythic-eventing-resource-link" color="textPrimary" underline="always" target="_blank"
                                                  href={"/new/callbacks/" + trackedData.callback.display_id}>{trackedData.callback.display_id}</Link>
                                        </MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <Link className="mythic-eventing-resource-link" color={"textPrimary"} underline={"always"} target={"_blank"}
                                                  href={"/new/task/" + trackedData.display_id}>{trackedData.display_id}</Link>
                                        </MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <span className="mythic-eventing-resource-command">{trackedData.command_name}</span> {trackedData.display_params}
                                        </MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            {trackedData.operator.username}
                                        </MythicStyledTableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <MythicClientSideTablePagination pagination={pagination} />
                </>
            )}
        </EventingDetailSection>
    )
}
function EventDetailsFilesTable({files}){
    const fileRows = files || [];
    const fileCount = fileRows.length;
    const pagination = useMythicClientPagination({items: fileRows});
    const [downloadBulk] = useMutation(downloadBulkQuery, {
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.downloadBulk.status === "success"){
                snackActions.success(<SnackMessage
                    file_id={data.downloadBulk.file_id}
                />, {toastId: data.downloadBulk.file_id, autoClose: false, closeOnClick: false});
            }else{
                snackActions.error(data.downloadBulk.error);
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
        for(let i = 0; i < fileRows.length; i++){
            if( !fileRows[i].deleted){
                fileIds.push(fileRows[i].agent_file_id);
            }
        }
        downloadBulk({variables:{files: fileIds}})
    }
    return (
        <EventingDetailSection
            collapsible
            title="Files tracked"
            count={fileCount}
            actions={
                fileCount > 0 &&
                <Button className="mythic-table-row-action mythic-table-row-action-hover-info" size="small" onClick={onDownloadBulkPayloads}
                        variant="outlined" startIcon={<ArchiveIcon fontSize="small" />}
                >
                    Zip and download
                </Button>
            }
        >
            {fileCount === 0 ? (
                <EventingSectionEmpty
                    title="No files tracked"
                    description="This workflow has not tracked any files."
                />
            ) : (
                <>
                    <TableContainer className="mythicElement mythic-eventing-detail-table-wrap mythic-fixed-row-table-wrap">
                        <Table style={{height: "auto"}}>
                            <TableHead>
                                <TableRow>
                                    <MythicStyledTableCell>File name</MythicStyledTableCell>
                                    <MythicStyledTableCell>Comment</MythicStyledTableCell>
                                    <MythicStyledTableCell>Size</MythicStyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pagination.pageData.map(trackedData => (
                                    <TableRow key={"filemeta" + trackedData.id} hover>
                                        <MythicStyledTableCell>
                                            {trackedData.deleted ? (
                                                <Typography variant="body2" style={{wordBreak: "break-all"}}>
                                                    {b64DecodeUnicode(trackedData.full_remote_path_text) === "" ?
                                                        b64DecodeUnicode(trackedData.filename_text) :
                                                        b64DecodeUnicode(trackedData.full_remote_path_text)}
                                                </Typography>
                                            ) : (
                                                <Link className="mythic-eventing-resource-link" color="textPrimary" underline="always" href={"/direct/download/" + trackedData.agent_file_id}>
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
                    </TableContainer>
                    <MythicClientSideTablePagination pagination={pagination} />
                </>
            )}
        </EventingDetailSection>
    )
}
