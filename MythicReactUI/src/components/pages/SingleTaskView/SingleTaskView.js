import React, {useEffect} from 'react';
import {TaskDisplay} from '../Callbacks/TaskDisplay';
import {gql, useLazyQuery, useQuery } from '@apollo/client';
import  {useParams} from "react-router-dom";
import {TaskMetadataTable} from './MetadataTable';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import {Button, Link} from '@mui/material';
import {IncludeMoreTasksDialog} from './IncludeMoreTasksDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {snackActions} from '../../utilities/Snackbar';
import {copyStringToClipboard} from '../../utilities/Clipboard';
import Switch from '@mui/material/Switch';
import {useTheme} from '@mui/material/styles';
import {taskingDataFragment} from '../Callbacks/CallbackMutations'
import {meState} from "../../../cache";
import { useReactiveVar } from '@apollo/client';

const tasksQuery = gql`
${taskingDataFragment}
query tasksQuery($task_range: [Int!]) {
    task(where: {display_id: {_in: $task_range}}, order_by: {display_id: asc}) {
        ...taskData
    }
}`;
const singleTaskQuery = gql`
${taskingDataFragment}
query tasksQuery($task_id: Int!) {
    task(where: {id: {_eq: $task_id}}, order_by: {display_id: asc}) {
        ...taskData
    }
}`;
const getTasksAcrossAllCallbacksQuery = gql`
${taskingDataFragment}
query tasksAcrossAllCallbacks($operation_id: Int!, $baseTask: Int!, $beforeCount: Int!, $afterCount: Int!){
    before: task(where: {operation_id: {_eq: $operation_id}, display_id:{_lt: $baseTask}}, order_by: {display_id: desc}, limit: $beforeCount) {
        ...taskData
    }
    after: task(where: {operation_id: {_eq: $operation_id}, display_id:{_gt: $baseTask}}, limit: $afterCount, order_by: {display_id: asc}) {
        ...taskData
    }
}`;
const getTasksAcrossACallbackQuery = gql`
${taskingDataFragment}
query tasksAcrossACallbacks($operation_id: Int!, $callback_display_id: Int!, $baseTask: Int!, $beforeCount: Int!, $afterCount: Int!){
    before: task(where: {operation_id: {_eq: $operation_id}, display_id:{_lt: $baseTask}, callback: {display_id: {_eq: $callback_display_id}}}, limit: $beforeCount, order_by: {display_id: desc}) {
        ...taskData
    }
    after: task(where: {operation_id: {_eq: $operation_id}, display_id:{_gt: $baseTask}, callback: {display_id: {_eq: $callback_display_id}}}, limit: $afterCount, order_by: {display_id: asc}) {
        ...taskData
    }
}`;
const getTasksAcrossAllCallbacksByOperatorQuery = gql`
${taskingDataFragment}
query tasksAcrossAllCallbacksByOperator($operation_id: Int!, $baseTask: Int!, $beforeCount: Int!, $afterCount: Int!, $operator: String!){
    before: task(where: {operation_id: {_eq: $operation_id}, display_id:{_lt: $baseTask}, operator: {username: {_eq: $operator}}}, limit: $beforeCount, order_by: {display_id: desc}) {
        ...taskData
    }
    after: task(where: {operation_id: {_eq: $operation_id}, display_id:{_gt: $baseTask}, operator: {username: {_eq: $operator}}}, limit: $afterCount, order_by: {display_id: asc}) {
        ...taskData
    }
}`;
export const RenderSingleTask = ({task_id}) => {
    const me = useReactiveVar(meState);
    const [taskData, setTaskData] = React.useState({});
    useQuery(singleTaskQuery, {
        variables: {task_id: task_id},
        onCompleted: completedData => {
            setTaskData(completedData.task[0]);
        }
    });
    return (
        taskData.id &&
        <TaskDisplay me={me} task={taskData} command_id={taskData.command === null ? 0 : taskData.command.id} />
    )
}
export function SingleTaskView(props){
    const me = props.me
    const {taskId} = useParams();
    const [taskIDs, setTaskIDs] = React.useState([]);
    const [taskOptions, setTaskOptions] = React.useState([]);
    const [tasks, setTasks] = React.useState([]);
    const [removing, setRemoving] = React.useState(false);
    const [openIncludeMoreTasksDialog, setOpenIncludeMoreTasksDialog] = React.useState(false);
    const theme = useTheme();
    const mergeData = (taskData) => {
        let allNewParents = taskData.filter( (task) => task.parent_task_id === null);
        let allData = [];
        let recent_callback = -1;
        if(allNewParents.length === 0){
            allNewParents = [...taskData];
        }
        const allParents = tasks.reduce( (prev, cur) => {
            if(cur.type === "task" && cur.parent_task_id === null){
                if(prev.find( (element) => element.display_id === cur.display_id)){
                    return [...prev];
                }
                return [...prev, {...cur, checked: false}];
            }
            return [...prev];
        }, [...allNewParents]);
        allParents.sort((a,b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
        allParents.forEach( (tsk) => {
            if(tsk.callback.display_id !== recent_callback){
                allData.push({"type": "callback", ...tsk.callback, checked: false});
            }
            recent_callback = tsk.callback.display_id;
            allData.push({"type": "task", ...tsk, checked: false});
        });
        setTasks(allData);
        const allTaskIds = taskData.reduce( (prev, cur) => {
            const subIds = cur.tasks.filter( (cur) => !prev.includes(cur.display_id)).map( (cur) => cur.display_id);
            if(prev.includes(cur.display_id)){
                return [...prev, ...subIds];
            }else{
                return [...prev, cur.display_id, ...subIds];
            }
        }, [...taskIDs]);
        setTaskIDs(allTaskIds);
    }
    const [getTasksAcrossAllCallbacks] = useLazyQuery(getTasksAcrossAllCallbacksQuery, {
        onCompleted: completedData => {
           snackActions.success("Successfully fetched tasks");
           mergeData([...completedData.before, ...completedData.after]);
        }
    });
    const [getTasksAcrossACallback] = useLazyQuery(getTasksAcrossACallbackQuery, {
        onCompleted: completedData => {
           snackActions.success("Successfully fetched tasks");
           mergeData([...completedData.before, ...completedData.after]);
        }
    });
    const [getTasksAcrossAllCallbacksByOperator] = useLazyQuery(getTasksAcrossAllCallbacksByOperatorQuery, {
        onCompleted: completedData => {
           snackActions.success("Successfully fetched tasks");
           mergeData([...completedData.before, ...completedData.after]);
        }
    });
    const [getTasks] = useLazyQuery(tasksQuery, {
     onCompleted: completedData => {
        mergeData(completedData.task);
     }
    });
    const [searchInfoCallbackDisplayId, setSearchInfoCallbackDisplayId] = React.useState(0);
    const setTaskSearchInfo = (callback_display_id) => {
        const opts = tasks.reduce( (prev, cur) => {
            if(cur.type === 'task' && cur.callback.display_id === callback_display_id){
                return [...prev, cur.display_id];
            }else{
                return [...prev];
            }
        }, []);
        setTaskOptions(opts);
        setSearchInfoCallbackDisplayId(callback_display_id);
        setOpenIncludeMoreTasksDialog(true);
    }
    const toggleTaskToRemove = (event) => {
        const updated = tasks.map( (task) => {
            if(task.type === "task" && ("task" + task.display_id) === event.target.name){
                return {...task, checked: event.target.checked};
            }
            return {...task};
        });
        setTasks(updated);
    }
    const removeTasksButton = () => {
        removing ? setRemoving(false) : setRemoving(true);
        const remainingTasks = tasks.filter( (task) => !task.checked);
        setTasks(remainingTasks);
        const remainingTaskIDs = remainingTasks.reduce( (prev, cur) => {
            if(cur.type === "task"){
                return [...prev, cur.display_id];
            }else{
                return [...prev];
            }
        }, []);
        setTaskIDs(remainingTaskIDs);
    }
    const collapse_range = (all_nums) =>{
        // takes in an array of the expanded numbers and collapses it down
        all_nums.sort( (a,b) => (a-b));
        // pulled from https://stackoverflow.com/a/2270987
        let ranges = [], rstart, rend;
        for (let i = 0; i < all_nums.length; i++) {
          rstart = all_nums[i];
          rend = rstart;
          while (all_nums[i + 1] - all_nums[i] === 1) {
            rend = all_nums[i + 1]; // increment the index if the numbers sequential
            i++;
          }
          ranges.push(rstart === rend ? rstart+'' : rstart + '-' + rend);
        }
        return ranges.join(",");
    }
    const expand_range = (range) =>{
        let numbers = [], ranges = range.split(",");
        for(let i = 0; i < ranges.length; i++){
            if(ranges[i].includes("-")){
                let split = ranges[i].split("-");
                split = split.map( (r) => parseInt(r) );
                numbers.push( ...[...Array(split[1]-split[0]+1).keys()].map(x => x+split[0]))
            }else{
                numbers.push(parseInt(ranges[i]));
            }
        }
        numbers.sort( (a,b) => a - b);
        return numbers;
    }
    const getShareableLink = () => {
        let ids = [...taskIDs];
        const range = collapse_range(ids);
        copyStringToClipboard(window.location.origin + "/new/tasks/by_range?tasks=" + range);
        snackActions.success("Copied link to clipboard!");
    }
    const submitIncludeMoreTasks = ({taskSelected, beforeCount, afterCount, search}) => {
        snackActions.info("Searching for tasks...");
        switch(search){
            case "all":
                getTasksAcrossAllCallbacks({variables: {operation_id: me.user.current_operation_id, baseTask: taskSelected, beforeCount, afterCount}});
                break;
            case "callback":
                getTasksAcrossACallback({variables: {baseTask: taskSelected,
                        beforeCount, afterCount,
                        operation_id: me.user.current_operation_id,
                        callback_display_id: searchInfoCallbackDisplayId }});
                break;
            default:
                getTasksAcrossAllCallbacksByOperator({variables: {operation_id: me.user.current_operation_id, baseTask: taskSelected, beforeCount, afterCount, operator: search}});
                break;
        }
    }
    useEffect( () => {
        if(window.location.pathname.includes("/new/tasks/by_range")){
            let params = new URLSearchParams(window.location.search);
            if(params.has("tasks")){
                let ids = expand_range(params.get("tasks"));
                getTasks({variables: {task_range: ids}});
            }else{
                snackActions.warning("URL Query missing '?tasks=' with a range of tasks")
            }
        }else{
            getTasks({variables: {task_range: [parseInt(taskId)]}});
        }      
    }, [getTasks, taskId]);
  return (
    <div style={{height: "100%", display: "flex", flexDirection: "column", width:"100%",}}>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main, marginBottom: "5px"}} variant={"elevation"}>
            <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Task View
            </Typography>
            <Button variant="contained" size="small" style={{display: "inline-block", float: "right", marginTop:"5px", marginRight:"10px", backgroundColor: theme.palette.success.main}} 
                onClick={getShareableLink}>Get Shareable link</Button>
            <Button variant="contained" size="small" style={{display: "inline-block", float: "right", marginTop:"5px", marginRight:"10px", backgroundColor: theme.palette.warning.main}} 
                onClick={removeTasksButton}>Remove Tasks From View</Button>
            
        </Paper>
        {tasks.map( (task) => (
            task.type === "task" ? (
                    <div key={"taskdisplay:" + task.display_id} style={{marginRight: "5px"}}>
                        <div style={{width: removing ? "95%" : "100%", display: "inline-block"}}>
                            <TaskDisplay me={me} task={task} command_id={task.command === null ? 0 : task.command.id} />
                        </div>
                        {removing ? (
                            <Switch
                                checked={task.checked}
                                onChange={toggleTaskToRemove}
                                name={"task" + task.display_id}
                                inputProps={{ 'aria-label': 'checkbox', 'color': theme.palette.error.main }}
                        />
                        ) : null}
                    </div>
                    
            ) : (
                <Paper key={"taskdisplayforcallback:" + task.id} elevation={5} style={{ marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                    <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                        {task.domain === "" ? null : (task.domain + "\\")}{task.user}{task.integrity_level > 2 ? ("*") : null}@{task.host} (
                        <Link style={{wordBreak: "break-all"}} color={"textPrimary"} underline="always" target="_blank" href={"/new/callbacks/" + task.display_id}>{task.display_id}</Link>
                        )
                    </Typography>
                    <Button variant="contained" size="small" style={{display: "inline-block", float: "right", marginTop:"5px", marginRight:"10px", backgroundColor: theme.palette.info.main}} 
                        onClick={() => {setTaskSearchInfo(task.display_id)}}>Include More Tasks</Button>
                </Paper>
            ))
            
            )
        }
        <MythicDialog fullWidth={true} maxWidth="md" open={openIncludeMoreTasksDialog} 
            onClose={()=>{setOpenIncludeMoreTasksDialog(false);}} 
            innerDialog={<IncludeMoreTasksDialog submitFetchTasks={submitIncludeMoreTasks} taskOptions={taskOptions} onClose={()=>{setOpenIncludeMoreTasksDialog(false);}} />}
        />
        <TaskMetadataTable taskIDs={taskIDs} />
    </div>
  );
}
//
