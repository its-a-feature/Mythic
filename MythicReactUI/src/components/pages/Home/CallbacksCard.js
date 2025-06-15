import React from 'react';
import {gql, useLazyQuery, useMutation} from '@apollo/client';
import {useTheme} from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import {useNavigate} from 'react-router-dom';
import {getStringSize} from "../Callbacks/ResponseDisplayTable";
import {getSkewedNow} from "../../utilities/Time";
import Paper from '@mui/material/Paper';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import {CallbackDataCard, GaugeCard, LineTimeMultiChartCard, PieChartCard, TableDataCard} from './DashboardComponents';
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {b64DecodeUnicode} from "../Callbacks/ResponseDisplay";
import {PayloadsTableRowBuildStatus} from "../Payloads/PayloadsTableRowBuildStatus";
import InfoIconOutline from '@mui/icons-material/InfoOutlined';
import {MythicDialog, MythicModifyStringDialog} from "../../MythicComponents/MythicDialog";
import {DetailedPayloadTable} from "../Payloads/DetailedPayloadTable";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import {TestEventGroupFileDialog} from "../Eventing/CreateEventWorkflowDialog";
import {initialWorkflow} from "../Eventing/Eventing";
import {EventStepInstanceRenderDialog, GetStatusSymbol} from "../Eventing/EventStepRender";
import IconButton from '@mui/material/IconButton';
import ReplayIcon from '@mui/icons-material/Replay';
import OpenInNewTwoToneIcon from '@mui/icons-material/OpenInNewTwoTone';
import {snackActions} from "../../utilities/Snackbar";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {meState} from "../../../cache";
import {restartWebsockets} from "../../../index";
import {addUserToOperation, updateCurrentOperationMutation} from "../Operations/OperationTableRow";
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import {OperationTableRowNotificationsDialog} from "../Operations/OperationTableRowNotificationsDialog";
import {OperationTableRowUpdateOperatorsDialog} from "../Operations/OperationTableRowUpdateOperatorsDialog";
import EditIcon from '@mui/icons-material/Edit';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import {newOperationMutation, Update_Operation} from "../Operations/OperationTable";
import {GetMythicSetting, useSetMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import FormatListBulletedAddIcon from '@mui/icons-material/FormatListBulletedAdd';
import AddchartIcon from '@mui/icons-material/Addchart';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import {MythicSelectFromListDialog} from "../../MythicComponents/MythicSelectFromListDialog";
import {PreviewFileMediaDialog} from "../Search/PreviewFileMedia";
import {faPhotoVideo} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Link} from '@mui/material';
import {ResponseDisplayScreenshotModal} from "../Callbacks/ResponseDisplayScreenshotModal";
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import {taskingDataFragment} from "../Callbacks/CallbackMutations";
import {TaskDisplayInteractiveSearch} from "../Search/SearchTabInteractiveTasks";
import {TaskDisplay} from "../Callbacks/TaskDisplay";
import {copyStringToClipboard} from "../../utilities/Clipboard";
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {faCopy} from '@fortawesome/free-solid-svg-icons';
import MythicTextField from "../../MythicComponents/MythicTextField";

const LeadDashboardQuery = gql`
${taskingDataFragment}
query GetDashboardData($operator_id: Int!) {
  callback(order_by: {id: asc}) {
    active
    mythictree_groups
    host
    id
    user
    integrity_level
    init_callback
    last_checkin
    payload {
        payloadtype {
            name
        }
    }
  }
  task(order_by: {id: asc}) {
    operator {
        username
    }
    id
    status
    completed
    callback_id
    command_name
    status_timestamp_preprocessing
  }
  recentTasks: task(limit: 10, order_by: {id: desc}){
    ...taskData
  }
  taskartifact {
    base_artifact
    needs_cleanup
    resolved
    id
  }
  tagtype {
      name
      id
      tags_aggregate {
        aggregate {
          count
        }
      }
  }
  callbackport {
    id
    port_type
    bytes_sent
    bytes_received
    local_port
    remote_ip
    remote_port
  }
  eventgroupinstance(order_by: {id: desc}, limit: 10) {
    eventgroup {
      name
      id
    }
    status
    trigger
    current_order_step
    total_order_steps
    id
  }
  payload(order_by: {id: desc}, limit: 10, where: {deleted: {_eq: false}, auto_generated: {_eq: false}}) {
    build_phase
    uuid
    id
    filemetum {
      filename_text
      agent_file_id
    }
    payloadtype {
      name
    }
  }
  operation(order_by: {id: desc}, where: {complete: {_eq: false}, deleted: {_eq: false}}) {
    name
    complete
    id
  }
  operator(where: {id: {_eq: $operator_id}}){
    admin
  }
  filemeta(limit: 10, order_by: {id: desc}, where: {deleted: {_eq: false}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
    agent_file_id
    complete
    chunks_received
    filename_text
    id
    host
    total_chunks
  }
  screenshots: filemeta(limit: 10, order_by: {id: desc}, where: {deleted: {_eq: false}, is_screenshot: {_eq: true}}) {
    agent_file_id
    id
  }
  credential(limit: 10, order_by: {id: desc}, where: {deleted: {_eq: false}}) {
    account
    realm
    type
    credential_text
    comment
    id
  }
}
`;
function getTaskStatusNormalized (taskStatus) {
    let status = taskStatus.toLowerCase();
    if(status.includes("error")){
        return "error"
    }
    if(["success", "complete", "completed"].includes(status)){
        return "success"
    }
    if(status.includes("processing")){
        return "processing"
    }
    if(status.includes("processed")){
        return "processed"
    }
    if(status.includes("delegating")){
        return "processing"
    }
    if(status.includes("submitted")){
        return "submitted"
    }
    if(status.includes("clear")){
        return "processed"
    }
    if(status.includes("opsec")){
        return "opsec"
    }
    return "submitted"


}
function getNormalizedTaskStatusColor (theme, taskStatus) {
    if(taskStatus === "error"){
        return theme.palette.error.main;
    }
    if(taskStatus === "success"){
        return theme.palette.success.main;
    }
    if(taskStatus === "processing"){
        return theme.palette.warning.main;
    }
    if(taskStatus === "processed" || taskStatus === "submitted"){
        return theme.palette.info.main;
    }
    if(taskStatus === "opsec"){
        return theme.palette.error.main;
    }
    return theme.palette.primary.main;

}
// Hour in milliseconds
const ONE_HOUR = 60 * 60 * 1000;
const errorColors = [
    "#de1212",
    "#d56b6b",
    "#de6012",
    "#de126e",
    "#d712de",
    "#e06597",
    "#de7d54",
    "#640909",
    "#7e0a86",
    "#832f0b",
];

const dashboardOptions = ["operator", "lead", "custom"];
const ActiveCallbacksDashboardElement = ({me, data, editing, removeElement}) => {
    const [recentHours, setRecentHours] = React.useState(1);
    const navigate = useNavigate();
    const [active, setActive] = React.useState({"active": 0, "recent": 0, "total": 0});
    React.useEffect( () => {
        let callbackData = {};
        let recent = 0;
        let now = getSkewedNow();
        // proces active status
        const newActive = data?.callback?.reduce( (prev, cur) => {
            if(!callbackData[cur.id]){
                callbackData[cur.id] = {...cur,
                    init_callback: new Date(cur.init_callback + (me?.user?.view_utc_time ? "" : "Z") ),
                    last_checkin: new Date(cur.last_checkin + (me?.user?.view_utc_time ? "" : "Z")),
                    init_callback_day: new Date(cur.init_callback + (me?.user?.view_utc_time ? "" : "Z")),
                    last_checkin_day: new Date(cur.last_checkin + (me?.user?.view_utc_time ? "" : "Z"))}
            }
            if(now - callbackData[cur.id].last_checkin <= ONE_HOUR * recentHours){
                recent += 1;
            }
            if(cur.active){
                return prev + 1;
            }
            return prev;
        }, 0);
        setActive({"active": newActive, "recent": recent, "total": data?.callback?.length});
    }, [data, recentHours]);
    const onChangeRecent = (name, value, error) => {
        setRecentHours(value);
    }
    return (
        <CallbackDataCard data={active}
                          mainTitle={
                            <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between", marginBottom: "0px" }}>
                                {"Active Callbacks"}
                                <MythicTextField type={"number"} value={recentHours} name={"recent hours"} onChange={onChangeRecent}
                                                 showLabel={true} inline={true} marginBottom={"0px"}
                                                 variant={"standard"}
                                                 width={5} />
                            </div>}
                          secondTitle={
                            <div style={{display: "flex", flexDirection: "row"}}>
                                {"Recent Checkins <" + recentHours + "hrs"}
                            </div>
                          }
                          mainElement={
                              <>
                                  <Typography variant={"h1"} style={{
                                      marginLeft: "5px",
                                      fontWeight: "bold",
                                      display: "inline-block"
                                  }} onClick={() => navigate("/new/callbacks")}>
                                      {active.active}
                                  </Typography>
                                  <Typography variant={"h5"} style={{display: "inline-block"}}>
                                      / {active.total}
                                  </Typography>
                              </>
                          }
                          secondaryElement={
                              <Typography variant={"h2"} style={{marginLeft: "5px", fontWeight: "bold"}}>
                                  {active.recent}
                              </Typography>
                          }
                          editing={editing}
                          removeElement={removeElement}
        />
    )
}
const HealthInstalledServicesDashboardElement = ({me, data, editing, removeElement}) => {
    const [online, setOnline] = React.useState({"online": 0, "total": 0});
    React.useEffect(() => {
        const requestOptions = {
            method: "GET",
            headers: {'Content-Type': 'application/json', MythicSource: "web"},
        };
        fetch('/healthDetailed', requestOptions).then((response) => {
            response.json().then(data => {
                //console.log(data);
                let total = 0;
                let currentOnline = 0;
                for (const [key, value] of Object.entries(data.installed_services_success)) {
                    total += 1;
                    if(value){
                        currentOnline += 1;
                    }
                }
                setOnline({online: currentOnline, total: total});
            }).catch(error => {
                snackActions.warning("Error getting JSON from server: " + error.toString());
                console.log("Error trying to get json response", error, response);
            });
        }).catch(error => {
            if(error.toString() === "TypeError: Failed to fetch"){
                snackActions.warning("Please refresh and accept the SSL connection error");
            } else {
                snackActions.warning("Error talking to server: " + error.toString());
            }
            console.log("There was an error!", error);
        });
    }, [data]);
    return (
        <GaugeCard data={online} title={"Installed Services Online"} editing={editing}
                   removeElement={removeElement} />
    )
}
const Top10TagTypesDashboardElement = ({me, data, editing, removeElement}) => {
    const [tags, setTags] = React.useState([]);
    const navigate = useNavigate();
    const handleTagClick = (event, itemIdentifier, item) => {
        //console.log(event, itemIdentifier, item);
        navigate("/new/search?tab=tags&searchField=TagType&search=" + item.id);
    };
    React.useEffect(() => {
        // process tag data
        const tagData = data?.tagtype?.map( t => {
            return {
                id: t.name,
                label: t.name,
                value: t.tags_aggregate.aggregate.count
            }
        })?.sort( (a,b) => b.value - a.value)?.slice(0, 10) || [];
        setTags(tagData);
    }, [data]);
    return (
        <PieChartCard data={tags}
                      title={"Top 10 Tags"}
                      hidden={false}
                      onClick={handleTagClick} editing={editing}
                      removeElement={removeElement}
                      additionalStyles={{}}
        />
    )
}
const Top10ArtifactsDashboardElement = ({me, data, editing, removeElement}) => {
    const [taskArtifacts, setTaskArtifacts] = React.useState([]);
    const navigate = useNavigate();
    const handleArtifactClick = (event, itemIdentifier, item) => {
        //console.log(event, itemIdentifier, item);
        navigate("/new/search?tab=artifacts&searchField=Type&search=" + item.id);
    };
    React.useEffect(() => {
        // process artifact types
        const artifactOptions = data?.taskartifact?.reduce( (prev, cur) => {
            if(prev[cur.base_artifact]){
                prev[cur.base_artifact] = prev[cur.base_artifact] + 1;
            }else{
                prev[cur.base_artifact] = 1;
            }
            return prev;
        }, {}) || {};
        let artifactArrayOptions = [];
        for (const [key, value] of Object.entries(artifactOptions)) {
            artifactArrayOptions.push({
                id: key,
                label: key,
                value: value
            })
        }
        artifactArrayOptions = artifactArrayOptions.sort( (a, b) => b.value - a.value).slice(0, 10);
        setTaskArtifacts(artifactArrayOptions);
    }, [data]);
    return (
        <PieChartCard data={taskArtifacts}
                      title={"Top 10 Artifacts"}
                      hidden={false}
                      onClick={handleArtifactClick}
                      editing={editing}
                      removeElement={removeElement}
                      additionalStyles={{}}
        />
    )
}
const ProxyUsageDashboardElement = ({me, data, editing, removeElement}) => {
    const navigate = useNavigate();
    const [callbackPorts, setCallbackPorts] = React.useState([]);
    const handlePortClick = (entry) => {
        //console.log(event, itemIdentifier, item);
        navigate("/new/search?tab=socks");
    };
    React.useEffect(() => {
        // process callback port types
        const callbackPortOptions = data?.callbackport?.reduce( (prev, cur) => {
            /*
            if(!prev[`Total ${cur.port_type}`]){
                prev[`Total ${cur.port_type}`] = {"sent": 0, "received": 0, "total": 0};
            }
            prev[`Total ${cur.port_type}`]["sent"] += cur.bytes_sent;
            prev[`Total ${cur.port_type}`]["received"] += cur.bytes_received;
            prev[`Total ${cur.port_type}`]["total"] += cur.bytes_sent + cur.bytes_received;

             */
            switch(cur.port_type){
                case "rpfwd":
                    if(!prev[`${cur.local_port}->${cur.remote_ip}:${cur.remote_port}`]){
                        prev[`${cur.local_port}->${cur.remote_ip}:${cur.remote_port}`] = {
                            sent: 0, received: 0, total: 0
                        }
                    }
                    prev[`${cur.local_port}->${cur.remote_ip}:${cur.remote_port}`].sent += cur.bytes_sent;
                    prev[`${cur.local_port}->${cur.remote_ip}:${cur.remote_port}`].received += cur.bytes_received;
                    prev[`${cur.local_port}->${cur.remote_ip}:${cur.remote_port}`].total += cur.bytes_sent + cur.bytes_received;
                    break;
                case "socks":
                    if(!prev[`socks: ${cur.local_port}`]){
                        prev[`socks: ${cur.local_port}`] = {
                            sent: 0, received: 0, total: 0
                        }
                    }
                    prev[`socks: ${cur.local_port}`].sent += cur.bytes_sent;
                    prev[`socks: ${cur.local_port}`].received += cur.bytes_received;
                    prev[`socks: ${cur.local_port}`].total += cur.bytes_sent + cur.bytes_received;
                    break;
            }
            return prev;
        }, {}) || {};
        let callbackPortActiveArrayOptions = [];
        for (const [key, value] of Object.entries(callbackPortOptions)) {
            callbackPortActiveArrayOptions.push({
                label: key,
                value: <>
                    <Typography>
                        {"Tx: " + getStringSize({cellData: {"plaintext": String(value.sent)}})}
                    </Typography>
                    <Typography>
                        {"Rx: " + getStringSize({cellData: {"plaintext": String(value.received)}})}
                    </Typography>
                </>,
                total: value.total,
                //color: theme.palette.success.main,
            })
        }
        callbackPortActiveArrayOptions = callbackPortActiveArrayOptions.sort( (a, b) => b.total - a.total).slice(0, 10);
        setCallbackPorts(callbackPortActiveArrayOptions);
    }, [data]);
    return (
        <TableDataCard title={"Top Proxy Activity"}
                       tableHead={
                           <TableHead>
                               <TableRow>
                                   <MythicTableCell>{"Proxy"}</MythicTableCell>
                                   <MythicTableCell>{"Traffic"}</MythicTableCell>
                               </TableRow>
                           </TableHead>
                       }
                       tableBody={
                           <TableBody >
                               {callbackPorts.map( (d, index) => (
                                       <TableRow hover key={d.label + index} onClick={() => {handlePortClick(d)}} style={{cursor: "pointer"}}>
                                           <MythicTableCell>{d.label}</MythicTableCell>
                                           <MythicTableCell>{d.value}</MythicTableCell>
                                       </TableRow>
                                   )
                               )}
                           </TableBody>
                       }
                       editing={editing}
                       removeElement={removeElement}/>
    )
}
const Top10UserContextsDashboardElement = ({me, data, editing, removeElement}) => {
    const navigate = useNavigate();
    const [taskedUser, setTaskedUser] = React.useState([]);
    const handleUserContextClick = (user) => {
        let search = user.label.split(" ");
        search = search[search.length - 1];
        if(search.length > 0){
            if(search[0] === "*"){
                search = search.substring(1);
            }
            navigate("/new/search?tab=callbacks&searchField=User&search=" + search);
        }

    }
    React.useEffect(() => {
        // process most tasked user
        let callbackData = {};
        let taskedUserOptions = [];
        let taskedUserCounts = {};
        data?.callback?.reduce( (prev, cur) => {
            if(!callbackData[cur.id]){
                callbackData[cur.id] = {...cur}
            }
            return prev;
        }, 0);
        data?.task?.reduce( (prev, cur) => {
            // get counts per tasked user
            for(let i = 0; i < callbackData[cur.callback_id].mythictree_groups.length; i++){
                let curGroup = callbackData[cur.callback_id].mythictree_groups[i];
                let currentTaskedUser = callbackData[cur.callback_id].user;
                if(callbackData[cur.callback_id].integrity_level > 2){
                    currentTaskedUser = "*" + currentTaskedUser;
                }
                if( taskedUserCounts[ "[" + curGroup + "] " + currentTaskedUser] ){
                    taskedUserCounts[ "[" + curGroup + "] " + currentTaskedUser] += 1;
                } else {
                    taskedUserCounts[ "[" + curGroup + "] " + currentTaskedUser] = 1;
                }
            }
            if(callbackData[cur.callback_id].mythictree_groups.length === 0){
                let currentTaskedUser = callbackData[cur.callback_id].user;
                if(callbackData[cur.callback_id].integrity_level > 2){
                    currentTaskedUser = "*" + currentTaskedUser;
                }
                if( taskedUserCounts[ currentTaskedUser] ){
                    taskedUserCounts[ currentTaskedUser] += 1;
                } else {
                    taskedUserCounts[ currentTaskedUser] = 1;
                }
            }
            return prev;
        }, []);
        for (const [key, value] of Object.entries(taskedUserCounts)) {
            taskedUserOptions.push({
                id: key,
                label: key,
                value: value
            })
        }
        taskedUserOptions = taskedUserOptions.sort( (a, b) => b.value - a.value).slice(0, 10);
        setTaskedUser(taskedUserOptions);
    }, [data]);
    return (
        <TableDataCard title={"Top 10 User Contexts"}
                       onRowClick={handleUserContextClick}
                       tableHead={
                           <TableHead>
                               <TableRow>
                                   <MythicTableCell>{"User"}</MythicTableCell>
                                   <MythicTableCell>{"Tasks"}</MythicTableCell>
                               </TableRow>
                           </TableHead>
                       }
                       tableBody={
                           <TableBody >
                               {taskedUser.map( (d, index) => (
                                   <TableRow hover key={d.label + index} onClick={() => {handleUserContextClick(d)}} style={{cursor: "pointer"}}>
                                        <MythicTableCell>{d.label}</MythicTableCell>
                                        <MythicTableCell>{d.value}</MythicTableCell>
                                    </TableRow>
                                    )
                                 )}
                            </TableBody>
                       }
                       editing={editing}
                       removeElement={removeElement}
        />
    )
}
const Top10HostContextsDashboardElement = ({me, data, editing, removeElement}) => {
    const navigate = useNavigate();
    const [taskedHosts, setTaskedHosts] = React.useState([]);
    const handleHostContextClick = (host) => {
        let search = host.label.split(" ");
        search = search[search.length - 1];
        if(search.length > 0){
            navigate("/new/search?tab=callbacks&searchField=Host&search=" + search);
        }

    }
    React.useEffect(() => {
        // process most tasked user
        let callbackData = {};
        let taskedHostCounts = {};
        data?.callback?.reduce( (prev, cur) => {
            if(!callbackData[cur.id]){
                callbackData[cur.id] = {...cur}
            }
            return prev;
        }, 0);
        data?.task?.reduce( (prev, cur) => {

            // get counts per tasked user
            for(let i = 0; i < callbackData[cur.callback_id].mythictree_groups.length; i++){
                let curGroup = callbackData[cur.callback_id].mythictree_groups[i];
                // get counts per tasked host
                let currentHost = callbackData[cur.callback_id].host;
                if(taskedHostCounts[ "[" + curGroup + "] " + currentHost ]){
                    taskedHostCounts[ "[" + curGroup + "] " + currentHost ] += 1;
                } else {
                    taskedHostCounts[ "[" + curGroup + "] " + currentHost ] = 1;
                }
            }
            if(callbackData[cur.callback_id].mythictree_groups.length === 0){

                // get counts per tasked host
                let currentHost = callbackData[cur.callback_id].host;
                if(taskedHostCounts[ currentHost ]){
                    taskedHostCounts[ currentHost ] += 1;
                } else {
                    taskedHostCounts[  currentHost ] = 1;
                }
            }
            return prev;
        }, []);
        // process most tasked hosts
        let taskedHostOptions = [];
        for (const [key, value] of Object.entries(taskedHostCounts)) {
            taskedHostOptions.push({
                id: key,
                label: key,
                value: value
            })
        }
        taskedHostOptions = taskedHostOptions.sort( (a, b) => b.value - a.value).slice(0, 10);
        setTaskedHosts(taskedHostOptions);
    }, [data]);
    return (
        <TableDataCard title={"Top 10 Active Hosts"}
                       tableHead={
                           <TableHead>
                               <TableRow>
                                   <MythicTableCell>{"Host"}</MythicTableCell>
                                   <MythicTableCell>{"Tasks"}</MythicTableCell>
                               </TableRow>
                           </TableHead>
                       }
                       tableBody={
                           <TableBody >
                               {taskedHosts.map( (d, index) => (
                                       <TableRow hover key={d.label + index} onClick={() => {handleHostContextClick(d)}} style={{cursor: "pointer"}}>
                                           <MythicTableCell>{d.label}</MythicTableCell>
                                           <MythicTableCell>{d.value}</MythicTableCell>
                                       </TableRow>
                                   )
                               )}
                           </TableBody>
                       }
                       editing={editing}
                       removeElement={removeElement}/>
    )
}
const Top10RecentPayloadsDashboardElement = ({me, data, editing, removeElement}) => {
    const navigate = useNavigate();
    const [payloads, setPayloads] = React.useState([]);
    const [openDetailedView, setOpenDetailedView] = React.useState({open: false, payload: {}});
    const clickDetail = (e, p) => {
        e.stopPropagation();
        setOpenDetailedView({open: true, payload: {...p}});
    }

    React.useEffect(() => {
        let newPayloadData = data?.payload?.map( p => {
            return {
                payload: p,
                id: p.uuid,
                label: <div style={{display: "flex", alignItems: "center"}}>
                    <MythicStyledTooltip title={p.payloadtype.name} tooltipStyle={{marginRight: "5px"}}>
                        <MythicAgentSVGIcon payload_type={p.payloadtype.name} style={{width: "20px", height: "20px"}} />
                    </MythicStyledTooltip>
                    {b64DecodeUnicode(p.filemetum.filename_text)}
                </div>,
                value: <>
                    <PayloadsTableRowBuildStatus {...p} />
                    <MythicStyledTooltip title={"View Payload Configuration"} tooltipStyle={{marginRight: "5px"}}>
                        <InfoIconOutline color={"info"} onClick={(e)=> clickDetail(e, p)} />
                    </MythicStyledTooltip>
                </>
            }
        }) || [];
        setPayloads(newPayloadData);
    }, [data]);
    if( data.payload && payloads.length === 0){
        return (
            <div style={{
                marginRight: "5px",
                width: "100%",
                height: "100%",
                border: "1px solid gray",
                position: "relative",
                borderRadius: "4px",
            }} >
                <h3 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0}}>
                    {"No Payloads Created"}
                </h3>
                <div style={{height: 200, overflowY: "auto"}}>
                    <div style={{
                        position: "absolute",
                        top: "45%",
                        left: "15%",
                        borderRadius: "4px",
                    }}>
                        <Button color={"success"} variant={"contained"}
                                onClick={() => navigate("/new/createpayload")}
                                style={{marginRight: "20px", float: "right"}}
                                startIcon={<AddCircleIcon color="success" style={{backgroundColor: "white", borderRadius: "10px"}}/>} >
                            Create Your First Payload
                        </Button>
                    </div>
                </div>
            </div>
        )
    }
    return (
        <>
            <TableDataCard title={"Recently Created Payloads"}
                           tableHead={
                               <TableHead>
                                   <TableRow>
                                       <MythicTableCell>{"Payload"}</MythicTableCell>
                                       <MythicTableCell>{"Actions"}</MythicTableCell>
                                   </TableRow>
                               </TableHead>
                           }
                           tableBody={
                               <TableBody >
                                   {payloads.map( (d, index) => (
                                           <TableRow hover key={d.label + index} >
                                               <MythicTableCell>{d.label}</MythicTableCell>
                                               <MythicTableCell>{d.value}</MythicTableCell>
                                           </TableRow>
                                       )
                                   )}
                               </TableBody>
                           }
                           editing={editing}
                           removeElement={removeElement}
                           customizeElement={
                                <MythicStyledTooltip title={"Create new Payload"}>
                                    <IconButton style={{padding: 0}} size={"small"} onClick={() => navigate("/new/createpayload")}>
                                        <AddCircleIcon color="success" style={{backgroundColor: "white", borderRadius: "10px"}}/>
                                    </IconButton>
                                </MythicStyledTooltip>
                           }
            />
            {openDetailedView.open &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openDetailedView.open}
                              onClose={() => {
                                  setOpenDetailedView({open: false, payload: {}});
                              }}
                              innerDialog={<DetailedPayloadTable {...openDetailedView.payload}
                                                                 payload_id={openDetailedView.payload.id}
                                                                 onClose={() => {
                                                                     setOpenDetailedView({open: false, payload: {}});
                                                                 }}/>}
                />
            }
        </>

    )
}
const Top10RecentWorkflowsDashboardElement = ({me, data, editing, removeElement}) => {
    const navigate = useNavigate();
    const [openNewWorkflowModal, setOpenNewWorkflowModal] = React.useState(false);
    const [workflows, setWorkflows] = React.useState([]);
    const [viewWorkflow, setViewWorkflow] = React.useState({open: false, workflow: {}});
    const clickDetail = (e, p) => {
        e.stopPropagation();
        setViewWorkflow({open: true, workflow: {...p}});
    }
    const handleHostContextClick = (entry) => {
        navigate(`/new/eventing?eventgroup=${entry.entry.eventgroup.id}&eventgroupinstance=${entry.entry.id}`);
    }
    React.useEffect(() => {
        let newPayloadData = data?.eventgroupinstance?.map( p => {
            return {
                entry: p,
                id: p.id,
                label: <>
                    <Typography>
                        {p.eventgroup.name}
                    </Typography>
                </>,
                value: <>
                    <GetStatusSymbol data={p} />
                    <MythicStyledTooltip title={"Open Graph in Modal"}>
                        <OpenInNewTwoToneIcon color={"secondary"} onClick={(e) => clickDetail(e, p)} />
                    </MythicStyledTooltip>
                </>
            }
        }) || [];
        setWorkflows(newPayloadData);
    }, [data]);
    if( data.eventgroupinstance && workflows.length === 0){
        return (
            <div style={{
                marginRight: "5px",
                width: "100%",
                height: "100%",
                border: "1px solid gray",
                position: "relative",
                borderRadius: "4px",
            }} >
                <h3 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0}}>
                    {"No Workflows Created"}
                </h3>
                <div style={{height: 200, overflowY: "auto"}}>
                    <div style={{
                        position: "absolute",
                        top: "45%",
                        left: "15%",
                        borderRadius: "4px",
                    }}>
                        <Button color={"success"} variant={"contained"}
                                onClick={() => setOpenNewWorkflowModal(true)}
                                style={{marginRight: "20px", float: "right"}}
                                startIcon={<AddCircleIcon color="success" style={{backgroundColor: "white", borderRadius: "10px"}}/>} >
                            Create a Workflow
                        </Button>
                    </div>
                    {openNewWorkflowModal &&
                        <MythicDialog fullWidth={true} maxWidth="xl" open={openNewWorkflowModal}
                                      onClose={(e) => {
                                          setOpenNewWorkflowModal(false);
                                      }}
                                      innerDialog={<TestEventGroupFileDialog
                                          initialWorkflow={initialWorkflow}
                                          onClose={(e) => {
                                              setOpenNewWorkflowModal(false);
                                          }}/>}
                        />
                    }
                </div>
            </div>
        )
    }
    return (
        <>
            <TableDataCard title={"Workflow Executions"}
                           tableHead={
                               <TableHead>
                                   <TableRow>
                                       <MythicTableCell>{"Workflow"}</MythicTableCell>
                                       <MythicTableCell>{"Status"}</MythicTableCell>
                                   </TableRow>
                               </TableHead>
                           }
                           tableBody={
                               <TableBody >
                                   {workflows.map( (d, index) => (
                                           <TableRow hover key={d.label + index} onClick={() => {handleHostContextClick(d)}} style={{cursor: "pointer"}}>
                                               <MythicTableCell>{d.label}</MythicTableCell>
                                               <MythicTableCell>{d.value}</MythicTableCell>
                                           </TableRow>
                                       )
                                   )}
                               </TableBody>
                           }
                           editing={editing}
                           removeElement={removeElement}
                           customizeElement={
                               <MythicStyledTooltip title={"Create new Workflow"}>
                                   <IconButton style={{padding: 0}} size={"small"} onClick={() => setOpenNewWorkflowModal(true)}>
                                       <AddCircleIcon color="success" style={{backgroundColor: "white", borderRadius: "10px"}}/>
                                   </IconButton>
                               </MythicStyledTooltip>
                           }
            />
            {viewWorkflow.open &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={viewWorkflow.open}
                              onClose={() => {
                                  setViewWorkflow({open: false, workflow: {}});
                              }}
                              innerDialog={
                                  <EventStepInstanceRenderDialog onClose={() => { setViewWorkflow({open: false, workflow: {}}); }}
                                                                 selectedEventGroupInstance={viewWorkflow.workflow.id}
                                                                 selectedEventGroup={viewWorkflow.workflow.eventgroup.id}
                                  />}
                />
            }
            {openNewWorkflowModal &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openNewWorkflowModal}
                              onClose={(e) => {
                                  setOpenNewWorkflowModal(false);
                              }}
                              innerDialog={<TestEventGroupFileDialog
                                  initialWorkflow={initialWorkflow}
                                  onClose={(e) => {
                                      setOpenNewWorkflowModal(false);
                                  }}/>}
                />
            }
        </>

    )
}
const MyOperationsDashboardElement = ({me, data, reloadDashboard, editing, removeElement}) => {
    const [operations, setOperations] = React.useState([]);
    const [openNewOperation, setOpenNewOperationDialog] = React.useState(false);
    const currentOperationRef = React.useRef(0);
    const [newOperation] = useMutation(newOperationMutation, {
        onCompleted: (data) => {
            //console.log(data);
            if(data.createOperation.status === "success"){
                snackActions.success("Successfully created operation!");
            }else{
                snackActions.error(data.createOperation.error);
            }
        },
        onError: (data) => {
            snackActions.error("Unable to create new operation - Access Denied")
            console.log(data);
        }
    });
    const [openUpdateNotifications, setOpenUpdateNotifications] = React.useState(false);
    const [openUpdateOperators, setOpenUpdateOperators] = React.useState(false);
    const [addUserToOperationMutation] = useMutation(addUserToOperation, {
        variables: {operation_id: currentOperationRef.current, add_users: [me.user.id]},
        onCompleted: (data) => {
            if(data.updateOperatorOperation.status === "success"){
                snackActions.success("Added to operation, updating current...");
                updateCurrentOperation({variables: {operator_id: me.user.user_id, operation_id: currentOperationRef.current}})
            } else {
                snackActions.error(data.updateOperatorOperation.error);
            }
        }
    });
    const [updateCurrentOperation] = useMutation(updateCurrentOperationMutation, {
        onCompleted: (data) => {
            if(data.updateCurrentOperation.status === "success"){
                meState({...meState(), user: {...meState().user,
                        current_operation_id: data.updateCurrentOperation.operation_id,
                        current_operation: data.updateCurrentOperation.name,
                        current_operation_complete: data.updateCurrentOperation.complete,
                        current_operation_banner_text: data.updateCurrentOperation.banner_text,
                        current_operation_banner_color: data.updateCurrentOperation.banner_color,
                    }});
                localStorage.setItem("user", JSON.stringify(meState().user));
                restartWebsockets();
                reloadDashboard();
            }else if(data.updateCurrentOperation.error.includes("not a member")){
                // add ourselves as a member and try again
                addUserToOperationMutation();
            } else {
                snackActions.error(data.updateCurrentOperation.error);
            }
        },
        onError: (data) => {
            snackActions.error("Failed to update current operation");
            console.error(data);
        }
    });
    const [updateOperation] = useMutation(Update_Operation, {
        onCompleted: (data) => {
            if(data.updateOperation.status === "success"){
                snackActions.success("Successfully updated operation");

                meState({...meState(), user: {...meState().user,
                        current_operation_id: data.updateOperation.id,
                        current_operation: data.updateOperation.name,
                        current_operation_complete: data.updateOperation.complete,
                        current_operation_banner_text: data.updateOperation.banner_text,
                        current_operation_banner_color: data.updateOperation.banner_color,
                    }});
                localStorage.setItem("user", JSON.stringify(meState().user));
            } else {
                snackActions.error(data.updateOperation.error);
            }

        },
        onError: (data) => {
            snackActions.error("Failed to update operation");
            console.log("error updating operation", data);
        }
    });
    const makeCurrentOperation = (p) => {
        currentOperationRef.current = p.id;
        updateCurrentOperation({variables: {operator_id: me.user.user_id, operation_id: p.id}})
    }
    const handleHostContextClick = (entry) => {

    }
    const onUpdateOperation = ({operation_id, name, channel, webhook, complete, banner_text, banner_color}) => {
        updateOperation({variables:{
                operation_id,
                name,
                channel,
                webhook,
                complete,
                banner_text,
                banner_color
            }});
    }
    const onSubmitNewOperation = (operation_name) => {
        newOperation({variables: {name: operation_name}})
    }
    React.useEffect(() => {
        let newPayloadData = data?.operation?.map( p => {
            return {
                operation: p,
                id: p.id,
                label: <>
                {p.name}
                </>,
                value: <>
                    {p.id === me.user.current_operation_id ? ("Current Operation") : (
                        <React.Fragment>
                            <Button size="small" startIcon={<PlayArrowIcon/>}
                                    onClick={()=>makeCurrentOperation(p)}
                                    color="info">
                                Make Current
                            </Button>
                        </React.Fragment>
                    )}
                </>
            }
        }) || [];
        setOperations(newPayloadData);
    }, [data]);
    if( data.operation && operations.length === 0){
        return (
            <div style={{
                marginRight: "5px",
                width: "100%",
                height: "100%",
                border: "1px solid gray",
                position: "relative",
                borderRadius: "4px",
            }} >
                <h3 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0}}>
                    {"You Belong to No Operations"}
                </h3>
                <div style={{height: 200, overflowY: "auto"}}>
                    <div style={{
                        position: "absolute",
                        top: "45%",
                        left: "15%",
                        borderRadius: "4px",
                    }}>
                        {data?.operator[0]?.admin &&
                            <Button color={"success"} variant={"contained"}
                                    onClick={() => setOpenNewOperationDialog(true)}
                                    style={{marginRight: "20px", float: "right"}}
                                    startIcon={<AddCircleIcon color="success" style={{backgroundColor: "white", borderRadius: "10px"}}/>} >
                                Create Operation
                            </Button>
                        }
                        {!data?.operator[0]?.admin &&
                            <Typography>
                                {"Ask an admin to create an operation for you or a lead to add you to an existing operation"}
                            </Typography>
                        }
                    </div>
                    {openNewOperation &&
                        <MythicDialog
                            fullWidth={true}
                            open={openNewOperation}
                            onClose={() => {setOpenNewOperationDialog(false);}}
                            innerDialog={
                                <MythicModifyStringDialog title={"New Operation's Name"}
                                                          onClose={() => {setOpenNewOperationDialog(false);}}
                                                          value={""}
                                                          onSubmit={onSubmitNewOperation}
                                />
                            }
                        />
                    }
                </div>
            </div>
        )
    }
    return (
        <>
            <TableDataCard title={"Ongoing Operations"}
                           tableHead={
                               <TableHead>
                                   <TableRow>
                                       <MythicTableCell>{"Operation"}</MythicTableCell>
                                       <MythicTableCell>{"Configure"}</MythicTableCell>
                                       <MythicTableCell>{"Operators"}</MythicTableCell>
                                       <MythicTableCell>{"Status"}</MythicTableCell>
                                   </TableRow>
                               </TableHead>
                           }
                           tableBody={
                               <TableBody >
                                   {operations.map( (d, index) => (
                                           <TableRow hover key={d.label + index} onClick={() => {handleHostContextClick(d)}} style={{cursor: "pointer"}}>
                                               <MythicTableCell>{d.label}</MythicTableCell>
                                               <MythicTableCell>
                                                   <Button size="small" onClick={()=>{setOpenUpdateNotifications(true);}} startIcon={<EditIcon/>}
                                                                  disabled={me?.user?.current_operation_id !== d.operation.id}
                                                                  color={d.operation.complete ? "success" : "primary"} variant="contained">Edit</Button>
                                                   {openUpdateNotifications &&
                                                       <MythicDialog open={openUpdateNotifications} fullWidth maxWidth={"lg"}
                                                                     onClose={()=>{setOpenUpdateNotifications(false);}}
                                                                     innerDialog={<OperationTableRowNotificationsDialog onClose={()=>{setOpenUpdateNotifications(false);}} id={d.operation.id} onUpdateOperation={onUpdateOperation} />}
                                                       />
                                                   }
                                               </MythicTableCell>
                                               <MythicTableCell>
                                                   <Button size="small" onClick={()=>{setOpenUpdateOperators(true);}}
                                                                  disabled={me?.user?.current_operation_id !== d.operation.id}
                                                                  startIcon={<AssignmentIndIcon/>} color={d.operation.complete ? "success" : "primary"} variant="contained">Edit</Button>
                                                   {openUpdateOperators &&
                                                       <MythicDialog open={openUpdateOperators} maxHeight={"calc(80vh)"} fullWidth maxWidth={"lg"}
                                                                     onClose={()=>{setOpenUpdateOperators(false);}}
                                                                     innerDialog={<OperationTableRowUpdateOperatorsDialog id={d.operation.id} onClose={()=>{setOpenUpdateOperators(false);}}/>}
                                                       />
                                                   }
                                               </MythicTableCell>
                                               <MythicTableCell>{d.value}</MythicTableCell>
                                           </TableRow>
                                       )
                                   )}
                               </TableBody>
                           }
                           editing={editing}
                           removeElement={removeElement}
                           customizeElement={
                               <MythicStyledTooltip title={"Create new Operation"}>
                                   <IconButton style={{padding: 0}} size={"small"} onClick={() => setOpenNewOperationDialog(true)}>
                                       <AddCircleIcon color="success" style={{backgroundColor: "white", borderRadius: "10px"}}/>
                                   </IconButton>
                               </MythicStyledTooltip>
                           }
            />
            {openNewOperation &&
                <MythicDialog
                    fullWidth={true}
                    open={openNewOperation}
                    onClose={() => {setOpenNewOperationDialog(false);}}
                    innerDialog={
                        <MythicModifyStringDialog title={"New Operation's Name"}
                                                  onClose={() => {setOpenNewOperationDialog(false);}}
                                                  value={""}
                                                  onSubmit={onSubmitNewOperation}
                        />
                    }
                />
            }
        </>

    )
}
const Top10CommandErrorStatsDashboardElement = ({me, data, editing, removeElement}) => {
    const navigate = useNavigate();
    const [commands, setCommands] = React.useState([]);
    const handleErrorTaskClick = (event, item) => {
        //console.log(event, item);
        navigate("/new/search?searchField=Command&search=" + commands[0].data[item.dataIndex].id + "&tab=tasks&taskStatus=error");
    };
    React.useEffect(() => {
        // process command options
        const commandErrorOptions = data?.task?.reduce( (prev, cur) => {
            if(cur.is_interactive_task){return prev}
            if(cur.status.toLowerCase().includes("error")){
                if(prev[cur.command_name]){
                    prev[cur.command_name] = prev[cur.command_name] + 1;
                } else {
                    prev[cur.command_name] = 1;
                }
            }
            return prev;
        }, {}) || {};
        let commandErrorArrayOptions = [];
        for (const [key, value] of Object.entries(commandErrorOptions)) {
            commandErrorArrayOptions.push({
                id: key,
                label: key,
                value: value
            })
        }
        commandErrorArrayOptions = commandErrorArrayOptions.sort((a, b) => b.value - a.value).slice(0, 10).map( (c, i) => {
            return {
                ...c,
                color: errorColors[i]
            }
        })
        setCommands(commandErrorArrayOptions);
    }, [data]);
    return (
        <PieChartCard data={commands} onClick={handleErrorTaskClick}
                           title={"Top 10 Command Error Stats"} hidden={false}
                           editing={editing}
                           removeElement={removeElement}
        />
    )
}
const Top10CommandStatsDashboardElement = ({me, data, editing, removeElement}) => {
    const navigate = useNavigate();
    const [commands, setCommands] = React.useState([]);
    const handleErrorTaskClick = (event, item) => {
        //console.log(event, item);
        navigate("/new/search?searchField=Command&search=" + commands[1].data[item.dataIndex].id + "&tab=tasks&taskStatus=");
    };
    React.useEffect(() => {
        // process command options
        const commandOptions = data?.task?.reduce( (prev, cur) => {
            if(cur.is_interactive_task){return prev}
            if(prev[cur.command_name]){
                prev[cur.command_name] = prev[cur.command_name] + 1;
            } else {
                prev[cur.command_name] = 1;
            }
            return prev;
        }, {}) || {};
        let commandArrayOptions = [];
        for (const [key, value] of Object.entries(commandOptions)) {
            commandArrayOptions.push({
                id: key,
                label: key,
                value: value
            })
        }
        commandArrayOptions = commandArrayOptions.sort((a, b) => b.value - a.value).slice(0, 10);
        setCommands(commandArrayOptions);
    }, [data]);
    return (
        <PieChartCard data={commands} onClick={handleErrorTaskClick}
            title={"Top 10 Command Stats"} hidden={false}
                           editing={editing}
                           removeElement={removeElement}
            />
    )
}
const OperatorActivityDashboardElement = ({me, data, editing, removeElement}) => {
    const [operators, setOperators] = React.useState([]);
    React.useEffect( () => {
        let operatorTaskCounts = {};
        data?.task?.reduce( (prev, cur) => {
            // get counts per operator
            if(operatorTaskCounts[cur.operator.username]){
                operatorTaskCounts[cur.operator.username] += 1;
            } else {
                operatorTaskCounts[cur.operator.username] = 1;
            }
            // get operator activity counts
            if(prev.includes(cur.operator.username)){
                return prev;
            }
            return [...prev, cur.operator.username];
        }, []);
        // process operator task rates
        let operatorOptions = [];
        for (const [key, value] of Object.entries(operatorTaskCounts)) {
            operatorOptions.push({
                id: key,
                label: key,
                value: value
            })
        }
        operatorOptions = operatorOptions.sort( (a, b) => b.value - a.value).slice(0, 10);
        setOperators(operatorOptions);
    }, [data]);
    return (
        <PieChartCard data={operators}
                      title={"Operator Activity"}
                      hidden={false}
                      editing={editing}
                      removeElement={removeElement}
                      additionalStyles={{}}
        />
    )
}
const TaskStatusDashboardElement = ({me, data, editing, removeElement}) => {
    const theme = useTheme();
    const [taskSuccessRate, setTaskSuccessRate] = React.useState([]);
    React.useEffect( () => {
        let taskedSuccessRateCounts = {};
        data?.task?.reduce( (prev, cur) => {
            // get tasked success rates
            let normalizedStatus = getTaskStatusNormalized(cur.status);
            if(taskedSuccessRateCounts[normalizedStatus]){
                taskedSuccessRateCounts[normalizedStatus] += 1;
            } else {
                taskedSuccessRateCounts[normalizedStatus] = 1;
            }
            return prev;
        }, []);
        // process task success rates
        let taskedSuccessRateOptions = [];
        for (const [key, value] of Object.entries(taskedSuccessRateCounts)) {
            taskedSuccessRateOptions.push({
                id: key,
                label: key,
                value: value,
                color: getNormalizedTaskStatusColor(theme, key)
            })
        }
        taskedSuccessRateOptions = taskedSuccessRateOptions.sort( (a, b) => b.value - a.value).slice(0, 10);
        setTaskSuccessRate(taskedSuccessRateOptions);
    }, [data]);
    return (
        <PieChartCard data={taskSuccessRate}
                      title={"Task Status"}
                      hidden={false}
                      editing={editing}
                      removeElement={removeElement}
                      additionalStyles={{
                      }}
        />
    )
}
const ActivityPerDayDashboardElement = ({me, data, editing, removeElement}) => {
    const [tasksPerDay, setTasksPerDay] = React.useState({x: [], y: []});
    React.useEffect( () => {
        let callbackData = {};
        // proces active status
        data?.callback?.reduce( (prev, cur) => {
            if(!callbackData[cur.id]){
                callbackData[cur.id] = {...cur,
                    init_callback: new Date(cur.init_callback + (me?.user?.view_utc_time ? "" : "Z") ),
                    last_checkin: new Date(cur.last_checkin + (me?.user?.view_utc_time ? "" : "Z")),
                    init_callback_day: new Date(cur.init_callback + (me?.user?.view_utc_time ? "" : "Z")),
                    last_checkin_day: new Date(cur.last_checkin + (me?.user?.view_utc_time ? "" : "Z"))}
            }
            return prev;
        }, 0);
        const allOperators = data?.task?.reduce( (prev, cur) => {
            // get operator activity counts
            if(prev.includes(cur.operator.username)){
                return prev;
            }
            return [...prev, cur.operator.username];
        }, []) || [];
        const taskDayOptions = data?.task?.reduce( (prev, cur) => {
            let curDate = new Date(cur.status_timestamp_preprocessing + (me?.user?.view_utc_time ? "" : "Z"));
            if(me?.user?.view_utc_time){
                curDate = curDate.toDateString();
                //curDate = curDate.toISOString().substr(0, 10) + "T00:00";
            } else {
                curDate = curDate.toLocaleDateString();
            }
            if(prev[curDate]){
                prev[curDate][cur.operator.username] = prev[curDate][cur.operator.username] + 1;
            }else{
                prev[curDate] = {
                };
                for(let i = 0; i < allOperators.length; i++){
                    if(allOperators[i] === cur.operator.username){
                        prev[curDate][allOperators[i]] = 1;
                    } else {
                        prev[curDate][allOperators[i]] = 0;
                    }
                }
            }
            return prev;
        }, {}) || {};
        let taskDayArrayOperatorOptions = [];
        let taskDayArrayOptions = [];
        let activeCallbacksByDayOptions = [];
        for(let i = 0; i < allOperators.length; i++){
            let currentOperatorData = [];
            for (const [key, value] of Object.entries(taskDayOptions)) {
                if(i === 0){
                    let taskingDate = new Date(key );
                    if(me?.user?.view_utc_time){
                        taskDayArrayOptions.push(taskingDate);
                    } else {
                        taskingDate.setTime(taskingDate.getTime() + (taskingDate.getTimezoneOffset() * 60 * 1000));
                        taskDayArrayOptions.push(taskingDate);
                    }

                    // sub process active callbacks on this day
                    let callbacksActiveOnThisDay = 0;
                    for(const [callbackID, callbackValues] of Object.entries(callbackData)){
                        if(callbackValues.init_callback_day <= taskingDate &&
                            callbackValues.last_checkin_day >= taskingDate){
                            callbacksActiveOnThisDay += 1;
                        }
                    }
                    activeCallbacksByDayOptions.push(callbacksActiveOnThisDay);
                }
                if(value[allOperators[i]] === 0){
                    currentOperatorData.push(0);
                }else{
                    currentOperatorData.push(value[allOperators[i]]);
                }

            }
            if(i === 0){
                taskDayArrayOperatorOptions.push({
                    data: activeCallbacksByDayOptions,
                    label: "Active Callbacks",
                    area: false,
                    highlightScope: {
                        highlighted: "series",
                        faded: "global",
                    },
                    color: '#44b636',
                    yAxisId: "callbackAxis",
                })
            }
            taskDayArrayOperatorOptions.push({
                data: currentOperatorData,
                label: allOperators[i],
                area: false,
                highlightScope: {
                    highlighted: "series",
                    faded: "global",
                },
                yAxisId: "taskAxis"
            })
        }
        setTasksPerDay({x: taskDayArrayOptions, y: taskDayArrayOperatorOptions});
    }, [data]);
    return (
        <LineTimeMultiChartCard data={tasksPerDay} view_utc_time={me?.user?.view_utc_time} editing={editing}
                                removeElement={removeElement}/>
    )
}
const Top10RecentFileDownloadsDashboardElement = ({me, data, editing, removeElement}) => {
    const [files, setFiles] = React.useState([]);
    const [openPreviewMediaDialog, setOpenPreviewMediaDialog] = React.useState({open: false, file: {}});
    const onPreviewMedia = (e, p) => {
        e.stopPropagation();
        setOpenPreviewMediaDialog({open: true, file: {...p}});
    }

    React.useEffect(() => {
        let newPayloadData = data?.filemeta?.map( p => {
            let newFile = {...p, filename_text: b64DecodeUnicode(p.filename_text)};
            return {
                filemeta: newFile,
                id: p.id,
                label: <div style={{display: "flex", alignItems: "center"}}>
                    {newFile.host}
                </div>,
                value: <div style={{display: "flex", alignItems: "center"}}>
                    <MythicStyledTooltip title={"Preview Media"}>
                        <FontAwesomeIcon icon={faPhotoVideo} style={{height: "20px",  position: "relative", cursor: "pointer", display: "inline-block", marginRight: "10px"}}
                                         onClick={(e) => onPreviewMedia(e, newFile)} />
                    </MythicStyledTooltip>
                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" + newFile.agent_file_id}>{newFile.filename_text}</Link>
                    {!newFile.complete &&
                        <Typography color="secondary" >({newFile.chunks_received} / <b>{newFile.total_chunks}</b>) Chunks</Typography>
                    }
                </div>,
            }
        }) || [];
        setFiles(newPayloadData);
    }, [data]);
    return (
        <>
            <TableDataCard title={"Recently Downloaded Files"}
                           tableHead={
                               <TableHead>
                                   <TableRow>
                                       <MythicTableCell>{"Host"}</MythicTableCell>
                                       <MythicTableCell>{"File"}</MythicTableCell>
                                   </TableRow>
                               </TableHead>
                           }
                           tableBody={
                               <TableBody >
                                   {files.map( (d, index) => (
                                           <TableRow hover key={d.label + index} >
                                               <MythicTableCell>{d.label}</MythicTableCell>
                                               <MythicTableCell>{d.value}</MythicTableCell>
                                           </TableRow>
                                       )
                                   )}
                               </TableBody>
                           }
                           editing={editing}
                           removeElement={removeElement}
            />
            {openPreviewMediaDialog.open &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewMediaDialog.open}
                              onClose={(e)=>{setOpenPreviewMediaDialog({open: false, file: {}});}}
                              innerDialog={<PreviewFileMediaDialog
                                  agent_file_id={openPreviewMediaDialog.file.agent_file_id}
                                  filename={openPreviewMediaDialog.file.filename_text}
                                  onClose={(e)=>{setOpenPreviewMediaDialog({open: false, file: {}});}} />}
                />
            }
        </>

    )
}
const Top10RecentScreenshotsDashboardElement = ({me, data, editing, removeElement}) => {
    const [files, setFiles] = React.useState([]);
    const now = (getSkewedNow()).toISOString();
    const [openScreenshot, setOpenScreenshot] = React.useState({open: false, screenshots: [], start: 0});
    const onPreviewMedia = (e, p) => {
        e.stopPropagation();
        setOpenScreenshot({open: true, screenshots: files, start: p});
    }
    const [activeStep, setActiveStep] = React.useState(0);
    const maxSteps = files?.length || 1;
    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };
    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    React.useEffect(() => {
        let newPayloadData = data?.screenshots?.map( (p, i) => {
            return p.agent_file_id;
        }) || [];
        setFiles(newPayloadData);
    }, [data]);
    return (
        <>
            <TableDataCard title={"Recent Screenshots"}
                           tableHead={
                               <TableHead>
                                   <TableRow>
                                       <MythicTableCell></MythicTableCell>
                                       <MythicTableCell></MythicTableCell>
                                       <MythicTableCell></MythicTableCell>
                                   </TableRow>
                               </TableHead>
                           }
                           tableBody={
                               <TableBody>
                                   {files.length > 0 &&
                                       <TableRow style={{display: "flex", height: "100%", width: "100%", alignItems: "center", justifyContent: "space-between"}}>
                                           <MythicTableCell style={{borderBottom: 0}}>
                                               <Button onClick={handleBack} disabled={activeStep === 0}>
                                                   {<KeyboardArrowLeft/>}
                                               </Button>
                                           </MythicTableCell>
                                           <MythicTableCell>
                                               <img onClick={(e) => onPreviewMedia(e, activeStep)}
                                                    src={"/api/v1.4/files/screencaptures/" + files[activeStep] + "?" + now}
                                                    style={{height: "200px", cursor: "pointer"}}/>
                                           </MythicTableCell>
                                            <MythicTableCell style={{borderBottom: 0}} >
                                                <Button
                                                    onClick={handleNext}
                                                    disabled={activeStep === maxSteps - 1}
                                                >
                                                    {<KeyboardArrowRight/>}
                                                </Button>
                                            </MythicTableCell>
                                       </TableRow>
                                   }

                               </TableBody>
                           }
                           editing={
                               editing
                           }
                           removeElement={
                               removeElement
                           }
            />
            { openScreenshot.open &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openScreenshot.open}
                              onClose={() => {
                                  setOpenScreenshot({open: false, screenshots: [], start: 0});
                              }}
                              innerDialog={<ResponseDisplayScreenshotModal images={openScreenshot.screenshots}
                                                                           startIndex={openScreenshot.start}
                                                                           onClose={() => {
                                                                               setOpenScreenshot({
                                                                                   open: false,
                                                                                   screenshots: [],
                                                                                   start: 0
                                                                               });
                                                                           }}/>
                }/>
            }
        </>

    )
}
const Top10RecentTasksDashboardElement = ({me, data, editing, removeElement}) => {
    const [tasks, setTasks] = React.useState([]);

    React.useEffect(() => {
        let newPayloadData = data?.recentTasks || [];
        setTasks(newPayloadData);
    }, [data]);
    return (
        <>
            <TableDataCard title={"Recent Tasking"}
                           tableHead={
                               <TableHead>
                                   <TableRow>
                                       <MythicTableCell></MythicTableCell>
                                   </TableRow>
                               </TableHead>
                           }
                           tableBody={
                               <TableBody>
                                   <TableRow>
                                       <MythicTableCell>
                                           {tasks.map( (task) => (
                                               task.is_interactive_task ? (
                                                   <TaskDisplayInteractiveSearch key={"taskinteractdisplay" + task.id} me={me} task={task} responsesSurrounding={5} />
                                               ) : (
                                                   <TaskDisplay key={"taskinteractdisplay" + task.id} me={me} task={task} command_id={task.command == null ? 0 : task.command.id} />
                                               )
                                           ))}
                                       </MythicTableCell>
                                   </TableRow>
                               </TableBody>
                           }
                           editing={
                               editing
                           }
                           removeElement={
                               removeElement
                           }
            />
        </>

    )
}
const Top10RecentCredentialsDashboardElement = ({me, data, editing, removeElement}) => {
    const [credentials, setCredentials] = React.useState([]);

    React.useEffect(() => {
        let newPayloadData = data?.credential || [];
        setCredentials(newPayloadData);
    }, [data]);
    const onCopyToClipboard = (data) => {
        let result = copyStringToClipboard(data);
        if(result){
            snackActions.success("Copied text!");
        }else{
            snackActions.error("Failed to copy text");
        }
    }
    return (
        <>
            <TableDataCard title={"Recent Credentials"}
                           tableHead={
                               <TableHead>
                                   <TableRow>
                                       <MythicTableCell>Account</MythicTableCell>
                                       <MythicTableCell>Comment</MythicTableCell>
                                   </TableRow>
                               </TableHead>
                           }
                           tableBody={
                               <TableBody>
                                   {credentials.map(c => (
                                       <TableRow key={c.id} hover>
                                           <MythicStyledTableCell style={{ whiteSpace: "pre-line",wordBreak: "break-all", display: "flex", flexDirection: "row"}}>
                                               <MythicStyledTooltip title={"Copy Credential to clipboard"}>
                                                   <IconButton onClick={() => onCopyToClipboard(c.credential_text)} size="small">
                                                       <FontAwesomeIcon icon={faCopy}/>
                                                   </IconButton>
                                               </MythicStyledTooltip>
                                               <span>
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}><b>Account: </b>{c.account}</Typography>
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}><b>Realm: </b>{c.realm}</Typography>
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}><b>Type: </b>{c.type}</Typography>
                                               </span>
                                           </MythicStyledTableCell>
                                           <MythicTableCell>
                                               <Typography variant="body2" style={{whiteSpace: "pre-line",wordBreak: "break-all",}}>{c.comment}</Typography>
                                           </MythicTableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           }
                           editing={
                               editing
                           }
                           removeElement={
                               removeElement
                           }
            />
        </>

    )
}

const OperatorDashboard = ({me, setLoading, loading}) => {
    const [analysisData, setAnalysisData] = React.useState({});

    async function processData({data}) {
        setAnalysisData(data)
    }

    const [fetchData] = useLazyQuery(LeadDashboardQuery, {
        fetchPolicy: "no-cache",
        variables: {operator_id: me.user.id},
        onCompleted: (data) => {
            processData({data}).then(r => setLoading(false));
        },
        onError: (data) => {
            console.log("onError fetchData");
        }
    });
    React.useEffect(() => {
        if (loading) {
            fetchData();
        }
    }, [loading]);
    const reloadDashboard = () => {
        setLoading(true);
    }
    return (
        <>
            <div style={{display: "flex", marginLeft: "5px", marginBottom: "5px", marginTop: "5px"}}>
                <ActiveCallbacksDashboardElement me={me} data={analysisData}/>
                <Top10RecentPayloadsDashboardElement me={me} data={analysisData}/>
                <Top10RecentWorkflowsDashboardElement me={me} data={analysisData}/>
            </div>
            <div style={{display: "flex", marginLeft: "5px", marginBottom: "5px"}}>
                <ProxyUsageDashboardElement me={me} data={analysisData}/>
                <Top10RecentFileDownloadsDashboardElement me={me} data={analysisData}/>
                <Top10RecentCredentialsDashboardElement me={me} data={analysisData}/>
            </div>
            <div style={{display: "flex", marginLeft: "5px", marginBottom: "5px"}}>
                <Top10RecentTasksDashboardElement me={me} data={analysisData}/>
            </div>
            <div style={{display: "flex", marginLeft: "5px", marginBottom: "5px"}}>
                <Top10RecentScreenshotsDashboardElement me={me} data={analysisData}/>
                <MyOperationsDashboardElement me={me} data={analysisData} reloadDashboard={reloadDashboard}/>
            </div>
        </>
    )
}
const LeadDashboard = ({me, setLoading, loading}) => {
    const [analysisData, setAnalysisData] = React.useState({});

    async function processData({data}) {
        setAnalysisData(data);
    }
    const [fetchData] = useLazyQuery(LeadDashboardQuery, {fetchPolicy: "network-only",
        variables: {operator_id: me.user.id},
        onCompleted: (data) => {
            processData({data}).then(r => setLoading(false));
        },
        onError: (data) => {

        }
    });
    React.useEffect( () => {
        fetchData();
    }, []);
    return (
        <>
            <div style={{display: "flex", marginLeft: "5px", marginBottom: "5px", marginTop: "5px"}}>
                <ActiveCallbacksDashboardElement me={me} data={analysisData} />
                <Top10CommandStatsDashboardElement me={me} data={analysisData} />
                <Top10UserContextsDashboardElement me={me} data={analysisData} />
                <Top10HostContextsDashboardElement me={me} data={analysisData} />
            </div>
            <div style={{display: "flex", marginLeft: "5px", marginBottom: "5px"}}>
                <ActivityPerDayDashboardElement me={me} data={analysisData} />
            </div>
            <div style={{display: "flex", marginLeft: "5px"}}>
                <TaskStatusDashboardElement me={me} data={analysisData} />
                <OperatorActivityDashboardElement me={me} data={analysisData} />
                <Top10ArtifactsDashboardElement me={me} data={analysisData} />
                <Top10TagTypesDashboardElement me={me} data={analysisData} />
                <ProxyUsageDashboardElement me={me} data={analysisData} />
            </div>
        </>
    )
}
const DashboardElementOptions = [
    "Active Callbacks",
    "Top 10 Issued Commands",
    "Top 10 Failed Commands",
    "Health - Installed Services",
    "Payloads",
    "Activity Timeline",
    "Top 10 User Contexts",
    "Top 10 Host Contexts",
    "My Operations",
    "Eventing Status",
    "Task Completion Status",
    "Operator Activity",
    "Top 10 Task Artifacts",
    "Top 10 TagTypes",
    "Proxy Usage",
    "Downloads",
    "Screenshots",
    "Tasking",
    "Credentials"
].sort();

const CustomDashboard = ({me, setLoading, loading, editing}) => {
    const initialDashboardView = GetMythicSetting({
        setting_name: "customDashboardElements",
        default_value: [[]],
    });
    const [updateSetting] = useSetMythicSetting();
    const [analysisData, setAnalysisData] = React.useState({});
    const [dashboards, setDashboards] = React.useState([...initialDashboardView]);
    const [fetchData] = useLazyQuery(LeadDashboardQuery, {fetchPolicy: "no-cache",
        variables: {operator_id: me.user.id},
        onCompleted: (data) => {
            setAnalysisData(data);
            setLoading(false);
        },
        onError: (data) => {
            console.log("onError fetchData");
        }
    });
    React.useEffect( () => {
        if(loading){
            fetchData();
        }
    }, [loading]);
    const [openAddElement, setOpenAddElement] = React.useState({open: false, row: 0});
    const reloadDashboard = () => {
        setLoading(true);
    }
    const removeDashboardElement = (e, i, j) => {
        let currentDashboards = [...dashboards];
        currentDashboards[i] = currentDashboards[i].toSpliced(j, 1);
        setDashboards(currentDashboards);
    }
    const addDashboardElement = (e) => {
        let currentDashboards = [...dashboards];
        currentDashboards[openAddElement.row] = [...currentDashboards[openAddElement.row]];
        currentDashboards[openAddElement.row].push(e.id);
        setDashboards(currentDashboards);
    }
    const addDashboardRow = (i) => {
        let currentDashboards = [...dashboards];
        currentDashboards = [...currentDashboards.slice(0, i+1), [], ...currentDashboards.slice(i+1)];
        setDashboards(currentDashboards);
    }
    const removeDashboardRow = (i) => {
        if(dashboards.length === 1){
            snackActions.error("Must have at least one row");
            return;
        }
        setDashboards(dashboards.toSpliced(i, 1));
    }
    React.useEffect( () => {
        updateSetting({setting_name: "customDashboardElements", value: dashboards});
    }, [dashboards]);
    const getDashboardElement = React.useCallback( (e, i, j) => {
        switch(e){
            case "Active Callbacks":
                return <ActiveCallbacksDashboardElement key={i + e + j} me={me} data={analysisData}
                                                        editing={editing}
                                                        removeElement={() => removeDashboardElement(e, i, j)} />;
            case "Top 10 Issued Commands":
                return <Top10CommandStatsDashboardElement key={i + e + j} me={me} data={analysisData}
                                                          editing={editing}
                                                          removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Top 10 Failed Commands":
                return <Top10CommandErrorStatsDashboardElement key={i + e + j} me={me} data={analysisData}
                                                          editing={editing}
                                                          removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Health - Installed Services":
                return <HealthInstalledServicesDashboardElement key={i + e + j} me={me} data={analysisData}
                                                       editing={editing}
                                                       removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Payloads":
                return <Top10RecentPayloadsDashboardElement key={i + e + j} me={me} data={analysisData}
                                                            editing={editing}
                                                            removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Activity Timeline":
                return <ActivityPerDayDashboardElement key={i + e + j} me={me} data={analysisData}
                                                       editing={editing}
                                                       removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Top 10 User Contexts":
                return <Top10UserContextsDashboardElement key={i + e + j} me={me} data={analysisData}
                                                          editing={editing}
                                                          removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Top 10 Host Contexts":
                return <Top10HostContextsDashboardElement key={i + e + j} me={me} data={analysisData}
                                                          editing={editing}
                                                          removeElement={() => removeDashboardElement(e, i, j)}/>
            case "My Operations":
                return <MyOperationsDashboardElement key={i + e + j} me={me} data={analysisData}
                                                  editing={editing} reloadDashboard={reloadDashboard}
                                                  removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Eventing Status":
                return <Top10RecentWorkflowsDashboardElement key={i + e + j} me={me} data={analysisData}
                                                             editing={editing}
                                                             removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Task Completion Status":
                return <TaskStatusDashboardElement key={i + e + j} me={me} data={analysisData}
                                                      editing={editing}
                                                      removeElement={() => removeDashboardElement(e, i, j)} />
            case "Operator Activity":
                return <OperatorActivityDashboardElement key={i + e + j} me={me} data={analysisData}
                                                         editing={editing}
                                                         removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Top 10 Task Artifacts":
                return <Top10ArtifactsDashboardElement key={i + e + j} me={me} data={analysisData}
                                                       editing={editing}
                                                       removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Top 10 TagTypes":
                return <Top10TagTypesDashboardElement key={i + e + j} me={me} data={analysisData}
                                                      editing={editing}
                                                      removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Proxy Usage":
                return <ProxyUsageDashboardElement key={i + e + j} me={me} data={analysisData}
                                                   editing={editing}
                                                   removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Downloads":
                return <Top10RecentFileDownloadsDashboardElement key={i + e + j} me={me} data={analysisData}
                                                                 editing={editing}
                                                                 removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Screenshots":
                return <Top10RecentScreenshotsDashboardElement key={i + e + j} me={me} data={analysisData}
                                                               editing={editing}
                                                               removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Tasking":
                return <Top10RecentTasksDashboardElement key={i + e + j} me={me} data={analysisData}
                                                         editing={editing}
                                                         removeElement={() => removeDashboardElement(e, i, j)}/>
            case "Credentials":
                return <Top10RecentCredentialsDashboardElement key={i + e + j} me={me} data={analysisData}
                                                               editing={editing}
                                                               removeElement={() => removeDashboardElement(e, i, j)}/>
        }
    }, [me, analysisData, removeDashboardElement]);
    return (
        <div style={{height: "100%", overflowY: "auto"}}>
            {dashboards.map((d, i) => (
                <div key={"dashboardRow" + i}
                     style={{display: "flex", marginLeft: "5px", marginTop: "5px", borderRadius: "4px", }}>
                    {editing &&
                        <div style={{display: "flex", flexDirection: "column", width: "40px", justifyContent: "center"}}>
                            <MythicStyledTooltip title={"Add New Chart To This Row"}>
                                <IconButton onClick={() => setOpenAddElement({open: true, row: i})} >
                                    <AddchartIcon color={"success"} />
                                </IconButton>
                            </MythicStyledTooltip>
                            <MythicStyledTooltip title={"Add Row After This Row"}>
                                <IconButton onClick={() => addDashboardRow(i)}>
                                    <FormatListBulletedAddIcon color={"success"} />
                                </IconButton>
                            </MythicStyledTooltip>
                            <MythicStyledTooltip title={"Remove This Row"}>
                                <IconButton onClick={() => removeDashboardRow(i)}>
                                    <PlaylistRemoveIcon color={"error"} />
                                </IconButton>
                            </MythicStyledTooltip>
                        </div>
                    }
                    {d.map((e,j) => (
                        getDashboardElement(e, i, j)
                    ))}

                </div>
            ))}
            {openAddElement.open &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openAddElement.open}
                              onClose={()=>{setOpenAddElement({open: false, row: 0});}}
                              innerDialog={<MythicSelectFromListDialog onClose={()=>{setOpenAddElement({open: false, row: 0})}}
                                                                       onSubmit={addDashboardElement}
                                                                       options={DashboardElementOptions.map(e => {return{id: e}})}
                                                                       title={"Select Dashboard Element to Add"}
                                                                       action={"select"}
                                                                       identifier={"id"}
                                                                       display={"id"}
                                                                       dontCloseOnSubmit={false} />}
                />
            }
        </div>
    )
}

export function CallbacksCard({me}) {
    const theme = useTheme();
    const [loading, setLoading] = React.useState(true);
    const [editing, setEditing] = React.useState(false);
    const initialDashboardView = GetMythicSetting({
        setting_name: "dashboard",
        default_value: "operator",
        output: "string"
    });
    const [dashboard, setDashboard] = React.useState(initialDashboardView);
    const [updateSetting] = useSetMythicSetting();
    const onChangeDashboardOption = (event) => {
        setDashboard(event.target.value);
        updateSetting({setting_name: "dashboard", value: event.target.value});
        setLoading(true);
    }
    return (
        <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative"}}>
            <Paper elevation={5} variant={"elevation"} style={{
                backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,
                display: "flex", alignItems: "center", justifyContent: "space-between"
            }}
            >
                <Typography variant="h5" style={{textAlign: "left", display: "inline-block", marginLeft: "10px"}}>
                    Welcome <b>{me.user.username}</b>
                    {me.user.current_operation_id === 0 ? null : (
                        <>
                        {" to"} <b>{me.user.current_operation}</b>'s Dashboard
                        </>
                    )}

                </Typography>
                <span>
                    <TextField
                        style={{color: "white", marginTop: "5px", width: "10rem"}}
                        InputProps={{style: {color: "white"}}}
                        size={"small"}
                        select={true}
                        label={"Dashboard Perspective"}
                        value={dashboard}
                        onChange={onChangeDashboardOption}
                    >
                    {
                        dashboardOptions.map((opt, i) => (
                            <MenuItem key={"searchopt" + opt} value={opt}>{opt}</MenuItem>
                        ))
                    }
                </TextField>
                    <MythicStyledTooltip title={"Analyze Operation Data Again"}>
                        <IconButton style={{color: "white"}} onClick={() => setLoading(true)}>
                            <ReplayIcon />
                        </IconButton>
                    </MythicStyledTooltip>
                    {dashboard === "custom" &&
                        <MythicStyledTooltip title={editing ? "Stop Editing Dashboard Contents":"Edit Dashboard Contents"}>
                            <IconButton style={{color: "white"}} onClick={() => setEditing(!editing)}>
                                <EditIcon />
                            </IconButton>
                        </MythicStyledTooltip>
                    }
                </span>
            </Paper>
            <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative", overflowY: "auto"}}>
                {loading &&
                    <div style={{
                        overflow: "hidden",
                        zIndex: "5",
                        position: "absolute",
                        height: "100%",
                        width: "100%",
                        backgroundColor: "rgba(37,37,37,0.35)"
                    }}>
                        <div style={{
                            position: "absolute",
                            left: "45%",
                            top: "40%",
                            borderRadius: "4px",
                            border: "1px solid black",
                            padding: "5px",
                            backgroundColor: "rgba(37,37,37,0.92)", color: "white",
                        }}>
                            {"Analyzing Operation..."}
                        </div>
                    </div>
                }
                {dashboard === "operator" && <OperatorDashboard
                    me={me} loading={loading} setLoading={setLoading}
                />}
                {dashboard === "lead" && <LeadDashboard
                    me={me} loading={loading} setLoading={setLoading}
                />}
                {dashboard === "custom" && <CustomDashboard
                    me={me} loading={loading} setLoading={setLoading} editing={editing}
                />}
            </div>
        </div>

    );
}
