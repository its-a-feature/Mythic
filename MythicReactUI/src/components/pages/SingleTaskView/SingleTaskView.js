import React, {useEffect} from 'react';
import {TaskDisplay} from '../Callbacks/TaskDisplay';
import {gql, useLazyQuery, useQuery } from '@apollo/client';
import  {useParams} from "react-router-dom";
import {TaskMetadataTable} from './MetadataTable';
import Checkbox from '@mui/material/Checkbox';
import {Link} from '@mui/material';
import {IncludeMoreTasksDialog} from './IncludeMoreTasksDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {snackActions} from '../../utilities/Snackbar';
import {copyStringToClipboard} from '../../utilities/Clipboard';
import {taskingDataFragment} from '../Callbacks/CallbackMutations'
import {meState} from "../../../cache";
import { useReactiveVar } from '@apollo/client';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import {MythicPageBody} from "../../MythicComponents/MythicPageBody";
import {MythicPageHeader, MythicPageHeaderChip, MythicSectionHeader} from "../../MythicComponents/MythicPageHeader";
import {MythicToolbarButton} from "../../MythicComponents/MythicTableToolbar";

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
        taskData.id > 0 &&
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
    const taskCount = tasks.filter((task) => task.type === "task").length;
    const callbackCount = tasks.filter((task) => task.type === "callback").length;
    const selectedRemoveCount = tasks.filter((task) => task.type === "task" && task.checked).length;
    const taskCountLabel = taskCount === 1 ? "1 task" : `${taskCount} tasks`;
    const callbackCountLabel = callbackCount === 1 ? "1 callback" : `${callbackCount} callbacks`;
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
    const enterRemoveMode = () => {
        setRemoving(true);
    }
    const cancelRemoveMode = () => {
        setRemoving(false);
        setTasks(tasks.map((task) => task.type === "task" ? {...task, checked: false} : task));
    }
    const removeSelectedTasks = () => {
        const remainingTaskRows = tasks.filter( (task) => task.type === "task" && !task.checked);
        const remainingCallbackDisplayIds = new Set(remainingTaskRows.map( (task) => task.callback.display_id));
        const remainingTasks = tasks.filter( (task) => {
            if(task.type === "task"){
                return !task.checked;
            }
            return remainingCallbackDisplayIds.has(task.display_id);
        }).map((task) => task.type === "task" ? {...task, checked: false} : task);
        setTasks(remainingTasks);
        const remainingTaskIDs = remainingTasks.reduce( (prev, cur) => {
            if(cur.type === "task"){
                const subIds = cur.tasks.filter( (subTask) => !prev.includes(subTask.display_id)).map( (subTask) => subTask.display_id);
                if(prev.includes(cur.display_id)){
                    return [...prev, ...subIds];
                }
                return [...prev, cur.display_id, ...subIds];
            }else{
                return [...prev];
            }
        }, []);
        setTaskIDs(remainingTaskIDs);
        setRemoving(false);
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
    const getCallbackTitle = (callback) => {
        const domain = callback.domain === "" ? "" : `${callback.domain}\\`;
        const integrity = callback.integrity_level > 2 ? "*" : "";
        return `${domain}${callback.user}${integrity}@${callback.host}`;
    }
  return (
    <MythicPageBody>
        <MythicPageHeader
            title="Task View"
            subtitle="Review task output, pull nearby task context into view, and inspect metadata collected by those tasks."
            meta={
                <>
                    <MythicPageHeaderChip label={taskCountLabel} />
                    <MythicPageHeaderChip label={callbackCountLabel} />
                    {removing && <MythicPageHeaderChip label={`${selectedRemoveCount} selected`} status={selectedRemoveCount > 0 ? "warning" : undefined} />}
                </>
            }
            actions={
                <>
                    <MythicToolbarButton className="mythic-table-row-action-hover-info" variant="outlined" onClick={getShareableLink} startIcon={<ContentCopyIcon fontSize="small" />}>
                        Share Link
                    </MythicToolbarButton>
                    {removing ? (
                        <>
                            <MythicToolbarButton className="mythic-table-row-action-hover-warning" variant="outlined" onClick={cancelRemoveMode} startIcon={<CloseIcon fontSize="small" />}>
                                Cancel
                            </MythicToolbarButton>
                            <MythicToolbarButton className="mythic-table-row-action-hover-danger" disabled={selectedRemoveCount === 0} variant="outlined" onClick={removeSelectedTasks} startIcon={<DeleteIcon fontSize="small" />}>
                                Remove Selected
                            </MythicToolbarButton>
                        </>
                    ) : (
                        <MythicToolbarButton className="mythic-table-row-action-hover-warning" variant="outlined" onClick={enterRemoveMode} startIcon={<PlaylistRemoveIcon fontSize="small" />}>
                            Remove Tasks
                        </MythicToolbarButton>
                    )}
                </>
            }
        />
        <div className="mythic-single-task-list">
            {tasks.map( (task) => (
                task.type === "task" ? (
                    <div className={`mythic-single-task-card-row${removing ? " mythic-single-task-card-row-removing" : ""}`} key={"taskdisplay:" + task.display_id}>
                        <div className="mythic-single-task-display">
                            <TaskDisplay me={me} task={task} command_id={task.command === null ? 0 : task.command.id} />
                        </div>
                        {removing ? (
                            <label className={`mythic-single-task-remove-control${task.checked ? " mythic-single-task-remove-control-selected" : ""}`}>
                                <Checkbox
                                    checked={task.checked}
                                    color="error"
                                    name={"task" + task.display_id}
                                    onChange={toggleTaskToRemove}
                                    size="small"
                                    inputProps={{ 'aria-label': `remove task ${task.display_id}` }}
                                />
                                <span>Remove</span>
                            </label>
                        ) : null}
                    </div>

                ) : (
                    <MythicSectionHeader
                        dense
                        key={"taskdisplayforcallback:" + task.id}
                        title={getCallbackTitle(task)}
                        subtitle={
                            <>
                                Callback <Link className="mythic-single-task-callback-link" color="inherit" underline="always" target="_blank" rel="noreferrer" href={"/new/callbacks/" + task.display_id}>#{task.display_id}</Link>
                            </>
                        }
                        actions={
                            <MythicToolbarButton className="mythic-table-row-action-hover-info" variant="outlined" onClick={() => {setTaskSearchInfo(task.display_id)}} startIcon={<PlaylistAddIcon fontSize="small" />}>
                                Include Tasks
                            </MythicToolbarButton>
                        }
                        sx={{mt: 0.75}}
                    />
                ))

            )
            }
        </div>
        {openIncludeMoreTasksDialog &&
            <MythicDialog fullWidth={true} maxWidth="md" open={openIncludeMoreTasksDialog}
                          onClose={()=>{setOpenIncludeMoreTasksDialog(false);}}
                          innerDialog={<IncludeMoreTasksDialog submitFetchTasks={submitIncludeMoreTasks} taskOptions={taskOptions} onClose={()=>{setOpenIncludeMoreTasksDialog(false);}} />}
            />
        }
        <TaskMetadataTable taskIDs={taskIDs} />
    </MythicPageBody>
  );
}
//
