import React, {useEffect} from 'react';
import {TaskDisplay} from '../Callbacks/TaskDisplay';
import {gql, useLazyQuery } from '@apollo/client';
import  {useParams} from "react-router-dom";
import {TaskMetadataTable} from './MetadataTable';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import {Button, Grid} from '@mui/material';
import {IncludeMoreTasksDialog} from './IncludeMoreTasksDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {snackActions} from '../../utilities/Snackbar';
import {copyStringToClipboard} from '../../utilities/Clipboard';
import Switch from '@mui/material/Switch';
import {useTheme} from '@mui/material/styles';
const taskInfoFragment = gql`
fragment TaskData on task {
    comment
    display_id
    callback_id
    commentOperator{
        username
    }
    completed
    id
    operator{
        username
    }
    display_params
    original_params
    command_name
    status
    timestamp
    command {
        cmd
        id
    }
    callback {
        id
        host
        user
        display_id
        integrity_level
        domain
    }
    responses_aggregate{
        aggregate{
            count
        }
    }
    parent_task_id
    opsec_pre_blocked
    opsec_pre_bypassed
    opsec_post_blocked
    opsec_post_bypassed
    response_count
    tasks {
        id
    }
    tags(order_by: {id: asc}) {
        tagtype {
            name
            color
            id
        }
        id
    }
    token {
        id
    }
}
`;
const tasksQuery = gql`
${taskInfoFragment}
query tasksQuery($task_range: [Int!], $operation_id: Int!) {
    task(where: {display_id: {_in: $task_range}, operation_id: {_eq: $operation_id}}, order_by: {display_id: asc}) {
        ...TaskData
    }
}`;
const getTasksAcrossAllCallbacksQuery = gql`
${taskInfoFragment}
query tasksAcrossAllCallbacks($operation_id: Int!, $baseTask: Int!, $beforeCount: Int!, $afterCount: Int!){
    before: task(where: {operation_id: {_eq: $operation_id}, display_id:{_lt: $baseTask}}, order_by: {display_id: desc}, limit: $beforeCount) {
        ...TaskData
    }
    after: task(where: {operation_id: {_eq: $operation_id}, display_id:{_gt: $baseTask}}, limit: $afterCount, order_by: {display_id: asc}) {
        ...TaskData
    }
}`;
const getTasksAcrossACallbackQuery = gql`
${taskInfoFragment}
query tasksAcrossACallbacks($callback_id: Int!, $baseTask: Int!, $beforeCount: Int!, $afterCount: Int!){
    before: task(where: {operation_id: {_eq: $operation_id}, display_id:{_lt: $baseTask}}, limit: $beforeCount, order_by: {display_id: desc}) {
        ...TaskData
    }
    after: task(where: {operation_id: {_eq: $operation_id}, display_id:{_gt: $baseTask}}, limit: $afterCount, order_by: {display_id: asc}) {
        ...TaskData
    }
}`;
const getTasksAcrossAllCallbacksByOperatorQuery = gql`
${taskInfoFragment}
query tasksAcrossAllCallbacksByOperator($operation_id: Int!, $baseTask: Int!, $beforeCount: Int!, $afterCount: Int!, $operator: String!){
    before: task(where: {operation_id: {_eq: $operation_id}, display_id:{_lt: $baseTask}, operator: {username: {_eq: $operator}}}, limit: $beforeCount, order_by: {display_id: desc}) {
        ...TaskData
    }
    after: task(where: {operation_id: {_eq: $operation_id}, display_id:{_gt: $baseTask}, operator: {username: {_eq: $operator}}}, limit: $afterCount, order_by: {display_id: asc}) {
        ...TaskData
    }
}`;
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
                if(prev.find( (element) => element.id === cur.id)){
                    return [...prev];
                }
                return [...prev, {...cur, checked: false}];
            }
            return [...prev];
        }, [...allNewParents]);
        
        allParents.sort((a,b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
        allParents.forEach( (tsk) => {
            if(tsk.callback.id !== recent_callback){
                allData.push({"type": "callback", ...tsk.callback, checked: false});
            }
            recent_callback = tsk.callback.id;
            allData.push({"type": "task", ...tsk, checked: false});
        });
        setTasks(allData);
        const allTaskIds = taskData.reduce( (prev, cur) => {
            const subIds = cur.tasks.filter( (cur) => !prev.includes(cur.id)).map( (cur) => cur.id);
            if(prev.includes(cur.id)){
                return [...prev, ...subIds];
            }else{
                return [...prev, cur.id, ...subIds];
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
    const [getTasksAcrossACallback,] = useLazyQuery(getTasksAcrossACallbackQuery, {
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
    const setTaskSearchInfo = (callback_id) => {
        const opts = tasks.reduce( (prev, cur) => {
            if(cur.type === 'task' && cur.callback.id === callback_id){
                return [...prev, cur.id];
            }else{
                return [...prev];
            }
        }, []);
        setTaskOptions(opts);
        
        setOpenIncludeMoreTasksDialog(true);
    }
    const toggleTaskToRemove = (event) => {
        const updated = tasks.map( (task) => {
            if(task.type === "task" && ("task" + task.id) === event.target.name){
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
                return [...prev, cur.id];
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
        copyStringToClipboard("/new/tasks/by_range?tasks=" + range);
        snackActions.success("Copied link to clipboard!");
    }
    const submitIncludeMoreTasks = ({taskSelected, beforeCount, afterCount, search}) => {
        snackActions.info("Searching for tasks...");
        switch(search){
            case "all":
                getTasksAcrossAllCallbacks({variables: {operation_id: me.user.current_operation_id, baseTask: taskSelected, beforeCount, afterCount}});
                break;
            case "callback":
                getTasksAcrossACallback({variables: {}});
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
                console.log(params.get("tasks"));
                let ids = expand_range(params.get("tasks"));
                getTasks({variables: {task_range: ids}, operation_id: me?.user?.current_operation_id || 0});
            }else{
                snackActions.warning("URL Query missing '?tasks=' with a range of tasks")
            }
        }else{
            getTasks({variables: {task_range: [parseInt(taskId)], operation_id: me?.user?.current_operation_id || 0}});
        }      
    }, [getTasks, taskId]);
  return (
    <div style={{marginTop: "10px", maxHeight: "calc(94vh)", width:"100%", marginBottom: "10px" }}>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main, marginBottom: "5px", marginTop: "10px", marginRight: "5px"}} variant={"elevation"}>
            <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Task View
            </Typography>
            <Button variant="contained" size="small" style={{display: "inline-block", float: "right", marginTop:"5px", marginRight:"10px", backgroundColor: theme.palette.success.main}} 
                onClick={getShareableLink}>Get Shareable link</Button>
            <Button variant="contained" size="small" style={{display: "inline-block", float: "right", marginTop:"5px", marginRight:"10px", backgroundColor: theme.palette.warning.main}} 
                onClick={removeTasksButton}>Remove Tasks From View</Button>
            <Button variant="contained" color={"primary"} size="small" style={{display: "inline-block", float: "right", marginTop:"5px", marginRight:"10px"}} 
                onClick={(evt) => {evt.stopPropagation(); snackActions.warning("Not implemented yet");}}>Add Tags To All</Button>
            
        </Paper>
        {tasks.map( (task) => (
            task.type === "task" ? (
                    <Grid container alignItems="stretch" key={"taskdisplay:" + task.id} style={{marginRight: "5px"}}>
                        <Grid item style={{display: "inline-flex", width: removing ? "96%" : "100%"}}>
                            <TaskDisplay me={me}  task={task} command_id={task.command === null ? 0 : task.command.id} />
                        </Grid>
                        <Grid item  style={{display: "inline-flex"}}>
                        {removing ? (
                            <Switch
                                checked={task.checked}
                                onChange={toggleTaskToRemove}
                                name={"task" + task.id}
                                inputProps={{ 'aria-label': 'checkbox', 'color': theme.palette.error.main }}
                        />
                        ) : (null)}
                        </Grid>
                    </Grid>
                    
            ) : (
                <Paper key={"taskdisplayforcallback:" + task.id} elevation={5} style={{ marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                    <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                        {task.domain === "" ? (null) : (task.domain + "\\")}{task.user}{task.integrity_level > 2 ? ("*") : (null)}@{task.host} ({task.id})
                    </Typography>
                    <Button variant="contained" size="small" style={{display: "inline-block", float: "right", marginTop:"5px", marginRight:"10px", backgroundColor: theme.palette.info.main}} 
                        onClick={() => {setTaskSearchInfo(task.id)}}>Include More Tasks</Button>                  
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
