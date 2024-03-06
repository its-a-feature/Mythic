import React from 'react';
import Paper from '@mui/material/Paper';
import { useQuery, gql} from '@apollo/client';
import { PieChart, pieArcLabelClasses } from '@mui/x-charts/PieChart';
import {useTheme} from '@mui/material/styles';
import { useDrawingArea } from '@mui/x-charts/hooks';
import { styled } from '@mui/material/styles';
import { LineChart } from '@mui/x-charts/LineChart';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { axisClasses } from '@mui/x-charts/ChartsAxis';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import {
    cheerfulFiestaPalette,
} from '@mui/x-charts/colorPalettes';
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import {useNavigate} from 'react-router-dom';
import { BarChart } from '@mui/x-charts/BarChart';
import {getStringSize} from "../Callbacks/ResponseDisplayTable";
import {toLocalTime} from "../../utilities/Time";

const GetCallbacks = gql`
query GetCallbacks {
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
        os
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
  taskartifact {
    base_artifact
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
    deleted
    port_type
    bytes_sent
    bytes_received
  }
  callbackgraphedge {
    c2profile {
      name
      is_p2p
    }
    end_timestamp
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
    console.log(status);
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

]
export function CallbacksCard({me}) {
    const theme = useTheme();
    const navigate = useNavigate();
    const [active, setActive] = React.useState({"active": 0, "recent": 0, "total": 0});
    const [tags, setTags] = React.useState([]);
    const [tasksPerDay, setTasksPerDay] = React.useState({x: [], y: []});
    const [taskArtifacts, setTaskArtifacts] = React.useState([]);
    const [commands, setCommands] = React.useState([{data: []}]);
    const [operators, setOperators] = React.useState([]);
    const [taskedUser, setTaskedUser] = React.useState([]);
    const [taskedHosts, setTaskedHosts] = React.useState([]);
    const [taskSuccessRate, setTaskSuccessRate] = React.useState([]);
    const [callbackPorts, setCallbackPorts] = React.useState([{data: []}]);
    const [c2profiles, setC2Profiles] = React.useState({series: [], labels: []})
    const handleErrorTaskClick = (event, itemIdentifier, item) => {
        //console.log(event, itemIdentifier, item);
        if(item.label.includes("not successful")){
            navigate("/new/search?searchField=Command&search=" + item.id + "&tab=tasks&taskStatus=error");
        } else {
            navigate("/new/search?searchField=Command&search=" + item.id + "&tab=tasks&taskStatus=");
        }

    };
    const handlePortClick = (event, itemIdentifier, item) => {
        //console.log(event, itemIdentifier, item);
        navigate("/new/search?tab=socks");
    };
    const handleArtifactClick = (event, itemIdentifier, item) => {
        //console.log(event, itemIdentifier, item);
        navigate("/new/search?tab=artifacts&searchField=Type&search=" + item.id);
    };
    const handleTagClick = (event, itemIdentifier, item) => {
        //console.log(event, itemIdentifier, item);
        navigate("/new/search?tab=tags&searchField=TagType&search=" + item.id);
    };
    const handleUserContextClick = (user) => {
        let search = user.split(" ");
        search = search[search.length - 1];
        if(search.length > 0){
            if(search[0] === "*"){
                search = search.substring(1);
            }
            navigate("/new/search?tab=callbacks&searchField=User&search=" + search);
        }

    }
    const handleHostContextClick = (host) => {
        let search = host.split(" ");
        search = search[search.length - 1];
        if(search.length > 0){
            navigate("/new/search?tab=callbacks&searchField=Host&search=" + search);
        }

    }
    useQuery(GetCallbacks, {fetchPolicy: "network-only",
        onCompleted: (data) => {
            let callbackData = {};
            let recent = 0;
            let now = new Date();
            // proces active status
            const newActive = data.callback.reduce( (prev, cur) => {
                if(!callbackData[cur.id]){
                    callbackData[cur.id] = {...cur,
                        init_callback: new Date(cur.init_callback + (me?.user?.view_utc_time ? "" : "Z") ),
                        last_checkin: new Date(cur.last_checkin + (me?.user?.view_utc_time ? "" : "Z")),
                        init_callback_day: new Date(cur.init_callback + (me?.user?.view_utc_time ? "" : "Z")),
                        last_checkin_day: new Date(cur.last_checkin + (me?.user?.view_utc_time ? "" : "Z"))}
                }
                if(now - callbackData[cur.id].last_checkin <= ONE_HOUR){
                    recent += 1;
                }
                if(cur.active){
                    return prev + 1;
                }
                return prev;
            }, 0);
            setActive({"active": newActive, "recent": recent, "total": data.callback.length});
            // process tag data
            const tagData = data.tagtype.map( t => {
                return {
                    id: t.name,
                    label: t.name,
                    value: t.tags_aggregate.aggregate.count
                }
            }).sort( (a,b) => b.value - a.value).slice(0, 10);
            setTags(tagData);
            // process command options
            const commandOptions = data.task.reduce( (prev, cur) => {
                if(cur.is_interactive_task){return prev}
                if(prev[cur.command_name]){
                    prev[cur.command_name] = prev[cur.command_name] + 1;
                } else {
                    prev[cur.command_name] = 1;
                }
                return prev;
            }, {});
            const commandErrorOptions = data.task.reduce( (prev, cur) => {
                if(cur.is_interactive_task){return prev}
                if(cur.status.toLowerCase().includes("error")){
                    if(prev[cur.command_name]){
                        prev[cur.command_name] = prev[cur.command_name] + 1;
                    } else {
                        prev[cur.command_name] = 1;
                    }
                }
                return prev;
            }, {});
            let commandArrayOptions = [];
            let commandErrorArrayOptions = [];
            for (const [key, value] of Object.entries(commandOptions)) {
                commandArrayOptions.push({
                    id: key,
                    label: key,
                    value: value
                })
            }
            for (const [key, value] of Object.entries(commandErrorOptions)) {
                commandErrorArrayOptions.push({
                    id: key,
                    label: key + " - not successful",
                    value: value
                })
            }
            commandArrayOptions = commandArrayOptions.sort((a, b) => b.value - a.value).slice(0, 10);
            commandErrorArrayOptions = commandErrorArrayOptions.sort((a, b) => b.value - a.value).slice(0, 10).map( (c, i) => {
                return {
                    ...c,
                    color: errorColors[i]
                }
            })
            setCommands([
                {
                    data: commandErrorArrayOptions,
                    highlightScope: { faded: 'global', highlighted: 'item' },
                    faded: {  color: 'gray' },
                    paddingAngle: 1,
                    cornerRadius: 4,
                    innerRadius: 30,
                    outerRadius: 60,
                },
                {
                    data: commandArrayOptions,
                    highlightScope: { faded: 'global', highlighted: 'item' },
                    faded: {  color: 'gray' },
                    paddingAngle: 1,
                    cornerRadius: 4,
                    outerRadius: 85,
                    innerRadius: 70
                }
            ]);
            // process c2 profile options
            const c2profileOptions = data.callbackgraphedge.reduce( (prev, cur) => {
                if(prev[cur.c2profile.name]){
                    prev[cur.c2profile.name].count += 1;
                } else {
                    prev[cur.c2profile.name] = {count: 1, is_p2p: cur.c2profile.is_p2p, dead: 0};
                }
                if(cur.end_timestamp){
                    prev[cur.c2profile.name].dead += 1;
                }
                return prev;
            }, {});
            let c2profileAliveOptions = [];
            let c2ProfileDeadOptions = [];
            let c2profileLabels = Object.keys(c2profileOptions).sort();
            for (let i = 0; i < c2profileLabels.length; i++) {
                c2profileAliveOptions.push(c2profileOptions[c2profileLabels[i]].count - c2profileOptions[c2profileLabels[i]].dead);
                c2ProfileDeadOptions.push(c2profileOptions[c2profileLabels[i]].dead);
            }
            // bar char will freak out if series has data but labels is empty
            if(c2profileLabels.length > 0){
                setC2Profiles({series:
                        [
                            {
                                data: c2ProfileDeadOptions,
                                highlightScope: { faded: 'global', highlighted: 'item' },
                                label: "dead",
                                //stack: "stackme",
                                color: 'rgba(129,129,129,0.3)',
                            },
                            {
                                data: c2profileAliveOptions,
                                highlightScope: { faded: 'global', highlighted: 'item' },
                                label: "alive",
                                //stack: "stackme",
                            },
                        ],
                    labels: c2profileLabels});
            }
            // process artifact types
            const artifactOptions = data.taskartifact.reduce( (prev, cur) => {
                if(prev[cur.base_artifact]){
                    prev[cur.base_artifact] = prev[cur.base_artifact] + 1;
                }else{
                    prev[cur.base_artifact] = 1;
                }
                return prev;
            }, {});
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
            // process tasks by operators
            let operatorTaskCounts = {};
            let taskedUserCounts = {};
            let taskedHostCounts = {};
            let taskedSuccessRateCounts = {};
            const allOperators = data.task.reduce( (prev, cur) => {
                // get tasked success rates
                let normalizedStatus = getTaskStatusNormalized(cur.status);
                if(taskedSuccessRateCounts[normalizedStatus]){
                    taskedSuccessRateCounts[normalizedStatus] += 1;
                } else {
                    taskedSuccessRateCounts[normalizedStatus] = 1;
                }
                // get counts per operator
                if(operatorTaskCounts[cur.operator.username]){
                    operatorTaskCounts[cur.operator.username] += 1;
                } else {
                    operatorTaskCounts[cur.operator.username] = 1;
                }
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

                    // get counts per tasked host
                    let currentHost = callbackData[cur.callback_id].host;
                    if(taskedHostCounts[ "[" + curGroup + "] " + currentHost ]){
                        taskedHostCounts[ "[" + curGroup + "] " + currentHost ] += 1;
                    } else {
                        taskedHostCounts[ "[" + curGroup + "] " + currentHost ] = 1;
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

                    // get counts per tasked host
                    let currentHost = callbackData[cur.callback_id].host;
                    if(taskedHostCounts[ currentHost ]){
                        taskedHostCounts[ currentHost ] += 1;
                    } else {
                        taskedHostCounts[  currentHost ] = 1;
                    }
                }
                // get operator activity counts
                if(prev.includes(cur.operator.username)){
                    return prev;
                }
                return [...prev, cur.operator.username];
            }, []);
            const taskDayOptions = data.task.reduce( (prev, cur) => {
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
            }, {});
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
                        yAxisKey: "callbackAxis",
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
                    yAxisKey: "taskAxis"
                })
            }
            setTasksPerDay({x: taskDayArrayOptions, y: taskDayArrayOperatorOptions});
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
            // process most tasked user
            let taskedUserOptions = [];
            for (const [key, value] of Object.entries(taskedUserCounts)) {
                taskedUserOptions.push({
                    id: key,
                    label: key,
                    value: value
                })
            }
            taskedUserOptions = taskedUserOptions.sort( (a, b) => b.value - a.value).slice(0, 10);
            setTaskedUser(taskedUserOptions);
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
            // process callback port types
            const callbackPortOptions = data.callbackport.reduce( (prev, cur) => {
                if(!prev[cur.port_type]){
                    prev[cur.port_type] = {"total": 0, "sent": 0, "received": 0};
                }
                prev[cur.port_type]["total"] += 1;
                prev[cur.port_type]["sent"] += cur.bytes_sent;
                prev[cur.port_type]["received"] += cur.bytes_received;
                return prev;
            }, {});
            let callbackPortArrayOptions = [];
            let callbackPortActiveArrayOptions = [];
            for (const [key, value] of Object.entries(callbackPortOptions)) {
                callbackPortArrayOptions.push({
                    id: key + " total",
                    label: key + " total",
                    value: value.total
                })
                callbackPortActiveArrayOptions.push({
                    id: key + " sent",
                    label: key + " Tx: " + getStringSize({cellData: {"plaintext": String(value.sent)}}),
                    value: value.sent,
                    //color: theme.palette.success.main,
                })
                callbackPortActiveArrayOptions.push({
                    id: key + " received",
                    label: key + " Rx: " + getStringSize({cellData: {"plaintext": String(value.received)}}),
                    value: value.received,
                    //color: 'rgba(164,164,164,0.07)',
                })
            }
            setCallbackPorts([
                {
                    data: callbackPortActiveArrayOptions,
                    highlightScope: { faded: 'global', highlighted: 'item' },
                    faded: {  color: 'gray' },
                    paddingAngle: 1,
                    cornerRadius: 4,
                    innerRadius: 30,
                    outerRadius: 60,
                },
                {
                    data: callbackPortArrayOptions,
                    highlightScope: { faded: 'global', highlighted: 'item' },
                    faded: { color: 'gray' },
                    paddingAngle: 1,
                    cornerRadius: 4,
                    outerRadius: 85,
                    innerRadius: 70
                },
            ]);
        },
        onError: (data) => {

        }
    });
    return (
        <>
            <div style={{display: "flex"}}>
                <CallbackDataCard data={active} mainTitle={"Active Callbacks"} secondTitle={"Recent Checkins <1hr"}
                    mainElement={
                        <>
                            <Typography variant={"h1"} style={{marginLeft: "5px", fontWeight: "bold", display: "inline-block"}}>
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
                />
                <StackedBarChartCard data={c2profiles.series} labels={c2profiles.labels}
                                     title={"Top C2 Profile Connections"} hidden={false}
                />

                <PieMultiChartCard data={commands} onClick={handleErrorTaskClick}
                                   title={"Top Command Stats"} hidden={true}
                />

                <TableDataCard data={taskedUser} title={"Top User Contexts"} leftKey={"label"} rightKey={"value"}
                               onRowClick={handleUserContextClick}
                               leftColumnTitle={"User"} rightColumnTitle={"Tasks"} />
                <TableDataCard data={taskedHosts} title={"Top Active Hosts"} leftKey={"label"} rightKey={"value"}
                               onRowClick={handleHostContextClick}
                               leftColumnTitle={"Host"} rightColumnTitle={"Tasks"} />
            </div>
            <div style={{}}>
                <LineTimeMultiChartCard data={tasksPerDay} view_utc_time={me?.user?.view_utc_time} />
            </div>
            <div style={{display: "flex"}}>
                <PieChartCard data={taskSuccessRate}
                              innerElement={ <PieCenterLabel>Task Status</PieCenterLabel> }
                              hidden={true}
                              additionalStyles={{
                              }}
                />

                <PieChartCard data={operators}
                              innerElement={ <PieCenterLabel>{"Operator Stats"}</PieCenterLabel> }
                              hidden={true}
                              additionalStyles={{
                              }}
                />
                <PieChartCard data={taskArtifacts}
                              innerElement={ <PieCenterLabel>Top Artifacts</PieCenterLabel> }
                              hidden={true}
                              onClick={handleArtifactClick}
                              additionalStyles={{
                              }}
                />
                <PieChartCard data={tags}
                              innerElement={ <PieCenterLabel>Top Tags</PieCenterLabel> }
                              hidden={true}
                              onClick={handleTagClick}
                              additionalStyles={{
                              }}
                />
                <PieMultiChartCard data={callbackPorts}
                                   onClick={handlePortClick}
                               title={"Port Usage"}
                              hidden={true}
                />
            </div>
        </>

    );
}
const StyledText = styled('text')(({ theme }) => ({
    fill: theme.palette.text.primary,
    textAnchor: 'middle',
    dominantBaseline: 'central',
    fontSize: 20,
}));
function PieCenterLabel({ children }) {
    const { width, height, left, top } = useDrawingArea();
    return (
        <StyledText x={left + width / 2} y={top + height / 2}>
            {children}
        </StyledText>
    );
}
const PieChartCard = ({data, width="100%", additionalStyles, innerElement, hidden, margin={
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
}, colors=cheerfulFiestaPalette, onClick}) => {
    const theme = useTheme();
    return (
        <Paper elevation={5} style={{
            marginBottom: "5px",
            marginTop: "5px",
            marginLeft: "5px",
            width: width,
            height: "100%",
            border: "1px solid gray",
            overflow: "hidden",
        }} variant={"elevation"}>
            <PieChart
                series={[
                    {
                        data: data,
                        highlightScope: { faded: 'global', highlighted: 'item' },
                        faded: { innerRadius: 50, additionalRadius: -10, color: 'gray' },
                        paddingAngle: 1,
                        cornerRadius: 4,
                        innerRadius: 70,
                        ...additionalStyles
                    },
                ]}
                height={200}
                margin={margin}
                sx={{
                    [`& .${pieArcLabelClasses.root}`]: {
                        fill: 'white',
                        fontWeight: 'bold',
                    },
                }}
                slotProps={{
                    legend: {
                        labelStyle: {
                            fontSize: 10,
                        },
                        direction: "column",
                        position: {
                            vertical: "middle",
                            horizontal: "right",
                        },
                        padding: 40,
                        itemMarkWidth: 10,
                        itemMarkHeight: 10,
                        markGap: 5,
                        itemGap: 20,
                        hidden: hidden
                    },
                }}
                colors={colors}
                onClick={onClick}
            >
                {innerElement}
            </PieChart>
        </Paper>
    )
}
const PieMultiChartCard = ({data, width="100%", hidden, title, margin={
    left: 10,
    right: 10,
    top: 30,
    bottom: 10,
}, colors=cheerfulFiestaPalette, onClick}) => {
    return (
        <Paper elevation={5} style={{
            marginBottom: "5px",
            marginTop: "5px",
            marginLeft: "5px",
            width: width,
            height: "100%",
            border: "1px solid gray",
            overflow: "hidden",
        }} variant={"elevation"}>
            <h3 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0, position: "absolute"}}>
                {title}
            </h3>
            <PieChart
                series={data}
                height={200}
                margin={margin}
                sx={{
                    [`& .${pieArcLabelClasses.root}`]: {
                        fill: 'white',
                        fontWeight: 'bold',
                    },
                }}
                slotProps={{
                    legend: {
                        labelStyle: {
                            fontSize: 10,
                        },
                        direction: "column",
                        position: {
                            vertical: "middle",
                            horizontal: "right",
                        },
                        padding: 40,
                        itemMarkWidth: 10,
                        itemMarkHeight: 10,
                        markGap: 5,
                        itemGap: 20,
                        hidden: hidden
                    },
                }}
                colors={colors}
                onClick={onClick}
            >
            </PieChart>
        </Paper>
    )
}
const CallbackDataCard = ({mainTitle, secondTitle, mainElement, secondaryElement, width="100%"}) => {
    return (
        <Paper elevation={5} style={{
            marginBottom: "5px",
            marginTop: "5px",
            marginLeft: "5px",
            width: width,
            height: 202,
            border: "1px solid gray",
            overflow: "hidden",
        }} variant={"elevation"}>
            <h3 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0}}>
                {mainTitle}
            </h3>
            {mainElement}
            <h3 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0}}>
                {secondTitle}
            </h3>
            {secondaryElement}
        </Paper>
    )
}
const TableDataCard = ({data, title, leftColumnTitle, rightColumnTitle, leftKey, rightKey, width="100%", onRowClick}) => {
    const theme = useTheme();
    return (
        <Paper elevation={5} style={{
            marginBottom: "5px",
            marginTop: "5px",
            marginLeft: "5px",
            width: width,
            height: 200,
            border: "1px solid gray",
            display: "flex",
            flexDirection: "column",
        }} variant={"elevation"}>
            <h3 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0}}>
                {title}
            </h3>
            <div style={{display: "flex", flexGrow: 1, overflowY: "auto"}}>
            <Table >
                <TableHead>
                    <TableRow>
                        <MythicTableCell>{leftColumnTitle}</MythicTableCell>
                        <MythicTableCell>{rightColumnTitle}</MythicTableCell>
                    </TableRow>
                </TableHead>
                <TableBody >
                    {data.map( (d, index) => (
                        <TableRow hover key={d[leftKey] + index} onClick={() => {onRowClick(d[leftKey])}} style={{cursor: "pointer"}}>
                            <MythicTableCell>{d[leftKey]}</MythicTableCell>
                            <MythicTableCell>{d[rightKey]}</MythicTableCell>
                        </TableRow>
                        )
                    )}
                </TableBody>
            </Table>
            </div>
        </Paper>
    )
}
const LineTimeChartCard = ({data, additionalStyles}) => {
    const [value, setValue] = React.useState([0, 0]);
    const [range, setRange] = React.useState([0, 0]);
    React.useEffect( () => {

        if(data.length > 0){
            setValue([0, data.length-1])
            setRange([0, data.length-1])
        }

    }, [data]);
    const minDistance = 1;
    const handleChange = (event, newValue, activeThumb) => {
        if (!Array.isArray(newValue)) {
            return;
        }

        if (newValue[1] - newValue[0] < minDistance) {
            if (activeThumb === 0) {
                const clamped = Math.min(newValue[0], 100 - minDistance);
                setValue([clamped, clamped + minDistance]);
            } else {
                const clamped = Math.max(newValue[1], minDistance);
                setValue([clamped - minDistance, clamped]);
            }
        } else {
            setValue(newValue);
        }
    };
    return (
        <Paper elevation={5} style={{
            marginBottom: "5px",
            marginTop: "10px",
            width: "100%",
            height: "100%",
            border: "1px solid gray",
            overflow: "hidden",
        }} variant={"elevation"}>
            <Typography variant={"h3"} style={{margin: 0, padding: 0, position: "relative", left: "30%"}}>
                Tasks Issued per Day
            </Typography>
            <LineChart
                xAxis={[
                    {
                        dataKey: 'x',
                        //valueFormatter: (v) => (new Date(v)).toISOString().substr(0, 10),
                        scaleType: "time",
                        min: data[value[0]]?.x || 0,
                        max: data[value[1]]?.x || 0,
                        id: 'bottomAxis',
                        labelStyle: {
                            fontSize: 10,
                        },
                        tickLabelStyle: {
                            angle: 25,
                            textAnchor: 'start',
                            fontSize: 5,
                        },

                    },
                ]}
                series={[
                    {
                        dataKey: 'y',
                        label: "mythic_admin",
                        showMark: ({index}) => index % 2 === 0,
                        //color: "#4e79a7"
                    }
                ]}
                sx={{
                    [`.${axisClasses.left} .${axisClasses.label}`]: {
                        transform: 'translate(-25px, 0)',
                    },
                    [`.${axisClasses.right} .${axisClasses.label}`]: {
                        transform: 'translate(30px, 0)',
                    },
                }}
                margin={{ top: 10 }}
                dataset={data}
                height={300}
                {...additionalStyles}
            ></LineChart>
            <Slider
                value={value}
                onChange={handleChange}
                valueLabelDisplay="auto"
                min={range[0]}
                max={range[1]}
                sx={{ mt: 2, width: "80%", left: "10%" }}
            />
        </Paper>

    )
}
const LineTimeMultiChartCard = ({data, additionalStyles, colors=cheerfulFiestaPalette, view_utc_time}) => {
    const [value, setValue] = React.useState([0, 0]);
    const [range, setRange] = React.useState([0, 0]);
    React.useEffect( () => {

        if(data.x.length > 0){
            setValue([data.x.length - 8 > 0 ? data.x.length - 8 : 0, data.x.length-1])
            setRange([0, data.x.length-1])
        }

    }, [data]);
    const minDistance = 1;
    const handleChange = (event, newValue, activeThumb) => {
        if (!Array.isArray(newValue)) {
            return;
        }

        if (newValue[1] - newValue[0] < minDistance) {
            if (activeThumb === 0) {
                const clamped = Math.min(newValue[0], 100 - minDistance);
                setValue([Math.max(0, clamped), Math.min(clamped + minDistance, data.x.length > 0 ? data.x.length -1 : 0)]);
            } else {
                const clamped = Math.max(newValue[1], minDistance);
                setValue([Math.max(0, clamped - minDistance), Math.min(clamped, data.x.length > 0 ? data.x.length -1 : 0)]);
            }
        } else {
            setValue(newValue);
        }
    };
    const sliderDate = (sliderVal, view_utc_time) => {
        if(view_utc_time){
            try {
                return data.x?.[sliderVal]?.toISOString()?.substr(0, 10);
            }catch(error){
                console.log("sliderDate utc error", error, sliderVal, data.x)
                return String(sliderVal);
            }
        }
        try {
            return data.x?.[sliderVal]?.toDateString();
        }catch(error){
            console.log("sliderDate error", error, sliderVal, data.x)
            return String(sliderVal);
        }
    }
    return (
        <Paper elevation={5} style={{
            marginBottom: "5px",
            marginTop: "10px",
            width: "100%",
            height: "100%",
            border: "1px solid gray",
            overflow: "hidden",
        }} variant={"elevation"}>
            <Typography variant={"h3"} style={{margin: 0, padding: 0, position: "relative", left: "30%"}}>
                Activity per Day {view_utc_time ? "( UTC )" : "( " + Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone + " )"}
            </Typography>
            <LineChart
                colors={colors}
                xAxis={[
                    {
                        data: data.x,
                        //valueFormatter: (v) => tooltipDate(v, view_utc_time),
                        scaleType: "time",
                        min: data?.x?.[value[0]] || 0,
                        max: data?.x?.[value[1]] || 0,
                        id: 'bottomAxis',
                        tickMinStep: 86400000,
                        labelStyle: {
                            fontSize: 10,
                        },
                        tickLabelStyle: {
                            angle: 25,
                            textAnchor: 'start',
                            fontSize: 5,
                        },
                    },
                ]}
                yAxis={[
                    {id: "taskAxis", scaleType: "linear"},
                    {id: "callbackAxis", scaleType: "linear"}
                ]}
                leftAxis={"taskAxis"}
                rightAxis={"callbackAxis"}
                series={data.y}
                sx={{
                    [`.${axisClasses.left} .${axisClasses.label}`]: {
                        transform: 'translate(-25px, 0)',
                    },
                    [`.${axisClasses.right} .${axisClasses.label}`]: {
                        transform: 'translate(30px, 0)',
                    },
                }}
                margin={{ top: 10 }}
                height={250}
                {...additionalStyles}
            ></LineChart>
            <Slider
                value={value}
                onChange={handleChange}
                color={"info"}
                size={"small"}
                valueLabelDisplay={"auto"}
                valueLabelFormat={sliderVal => sliderDate(sliderVal, view_utc_time)}
                min={range[0]}
                max={range[1]}
                sx={{ mt: 2, width: "80%", left: "10%" }}
            />
        </Paper>

    )
}
const StackedBarChartCard = ({data, labels, title, width="100%", hidden, colors=cheerfulFiestaPalette, margin={
    right: 10,
    top: 40,
    bottom: 10,
}}) => {
    return (
        <Paper elevation={5} style={{
            marginBottom: "5px",
            marginTop: "5px",
            marginLeft: "5px",
            width: width,
            height: "100%",
            border: "1px solid gray",
            overflow: "hidden",
        }} variant={"elevation"}>
            <h3 style={{marginTop: 0, marginLeft: "5px", marginBottom: 0, paddingBottom: 0, position: "absolute"}}>
                {title}
            </h3>
            <BarChart
                xAxis={[{
                    scaleType: "band",
                    data: labels,
                    tickLabelInterval: (value, index) => false
                }]}
                margin={margin}
                layout={"vertical"}
                series={data}
                height={200}
                colors={colors}
                slotProps={{
                    legend: {
                        labelStyle: {
                            fontSize: 10,
                        },
                        direction: "row",
                        position: {
                            vertical: "top",
                            horizontal: "right",
                        },
                        padding: 15,
                        itemMarkWidth: 10,
                        itemMarkHeight: 10,
                        markGap: 5,
                        itemGap: 20,
                        hidden: hidden
                    },
                }}
            />
        </Paper>
    )
}