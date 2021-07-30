import {MythicTabPanel, MythicTabLabel} from '../../../components/MythicComponents/MythicTabPanel';
import React, {useEffect, useRef, useCallback, useLayoutEffect} from 'react';
import { gql, useMutation, useLazyQuery, useSubscription } from '@apollo/client';
import { TaskDisplay } from './TaskDisplay';
import {snackActions} from '../../utilities/Snackbar';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {TaskParametersDialog} from './TaskParametersDialog';
import {CallbacksTabsTaskingInput} from './CallbacksTabsTaskingInput';
import LinearProgress from '@material-ui/core/LinearProgress';
import { IconButton, Tooltip} from '@material-ui/core';
import AutorenewIcon from '@material-ui/icons/Autorenew';


export function CallbacksTabsTaskingLabel(props){
    return (
        <MythicTabLabel label={"Callback: " + props.tabInfo.callbackID} {...props}/>
    )
}
export const taskingDataFragment = gql`
    fragment taskData on task {
        comment
        commentOperator{
            username
        }
        completed
        id
        operator{
            username
        }
        original_params
        display_params
        status
        timestamp
        command {
          cmd
          id
        }
        responses(order_by: {id: desc}) {
          id
        }
        opsec_pre_blocked
        opsec_pre_bypassed
        opsec_post_blocked
        opsec_post_bypassed
        tasks {
            id
        }
    }
`;
const GetLoadedCommandsQuery = gql`
query GetLoadedCommandsQuery($callback_id: Int!, $payloadtype: String!) {
  loadedcommands(where: {callback_id: {_eq: $callback_id}}) {
    id
    command {
      cmd
      help_cmd
      description
      id
      needs_admin
      payload_type_id
      attributes
      commandparameters {
        id
        type 
      }
    }
  }
  command(where: {payloadtype: {ptype: {_eq: $payloadtype}}, script_only: {_eq: true}, deleted: {_eq: false}}){
      id
      cmd
      help_cmd
      description
      needs_admin
      attributes
      payload_type_id
      commandparameters {
          id
          type
      }
    }
}
`;
export const createTaskingMutation = gql`
mutation createTasking($callback_id: Int!, $command: String!, $params: String!, $files: String) {
  createTask(callback_id: $callback_id, command: $command, params: $params, files: $files) {
    status
    id
    error
  }
}
`;
// this is to listen for the latest taskings
const fetchLimit = 10;
const getTaskingQuery = gql`
${taskingDataFragment}
subscription getTasking($callback_id: Int!, $fromNow: timestamp!){
    task(where: {callback_id: {_eq: $callback_id}, parent_task_id: {_is_null: true}, timestamp: {_gt: $fromNow}}, order_by: {id: desc}, limit: 10) {
        ...taskData
    }
}
 `;
const getNextBatchTaskingQuery = gql`
${taskingDataFragment}
query getBatchTasking($callback_id: Int!, $offset: Int!, $fetchLimit: Int!){
    task(where: {callback_id: {_eq: $callback_id}, parent_task_id: {_is_null: true}}, order_by: {id: desc}, limit: $fetchLimit, offset: $offset) {
        ...taskData
    }
}
`;
export const CallbacksTabsTaskingPanel = ({tabInfo, maxHeight, callback, ...others}) =>{
    const [commands, setCommands] = React.useState([]);
    const [openParametersDialog, setOpenParametersDialog] = React.useState(false);
    const [commandInfo, setCommandInfo] = React.useState({});
    const [taskingData, setTaskingData] = React.useState({task: []});
    const taskingDataRef = React.useRef({task: []});
    const [fromNow, setFromNow] = React.useState((new Date()).toISOString());
    const [filterOptions, setFilterOptions] = React.useState({
        "operatorsList": [],
        "commentsFlag": false,
        "commandsList": [],
        "parameterString": "",
        "everythingButList": []
    });
    const loader = useRef(null);
    const [canScroll, setCanScroll] = React.useState(true);
    useEffect( () => {
        taskingDataRef.current = taskingData;
    }, [taskingData])
    const [fetched, setFetched] = React.useState(false);
    const [fetchedAllTasks, setFetchedAllTasks] = React.useState(false);
    const messagesEndRef = useRef(null);
    const [createTask] = useMutation(createTaskingMutation, {
        update: (cache, {data}) => {
            if(data.createTask.status === "error"){
                snackActions.error(data.createTask.error);
            }else{
                snackActions.success("Task created");
            }
        },
        onError: data => {
            console.error(data);
        }
    });
    
    const [getLoadedCommands ] = useLazyQuery(GetLoadedCommandsQuery, {
        onCompleted: data => {
            const cmds = data.loadedcommands.reduce( (prev, cur) => {
                const attributes = JSON.parse(cur.command.attributes);
                if(attributes["supported_os"].length === 0 || attributes["supported_os"].includes(tabInfo.os)){
                    return [...prev, cur.command];
                }else{
                    return [...prev];
                }
            }, [] );
            const allCmds = data.command.reduce( (prev, cur) => {
                if(prev.includes(cur.cmd)){
                    return [...prev];
                }else{
                    const attributes = JSON.parse(cur.attributes);
                    if(attributes["supported_os"].length === 0 || attributes["supported_os"].includes(tabInfo.os)){
                        return [...prev, cur];
                    }else{
                        return [...prev];
                    }
                }
            }, [...cmds]);
            allCmds.sort((a, b) => -b.cmd.localeCompare(a.cmd));
            setCommands(allCmds);
        },
        onError: data => {
            console.error(data)
        },
        fetchPolicy: "network-only"
    });
    
    
    const equalTaskTrees = (oldArray, newArray) => {
        if(oldArray.length !== newArray.length){
            return false;
        }
        for(let i = 0; i < oldArray.length; i++){
            if(oldArray[i].comment !== newArray[i].comment){
                return false;
            }
            if(oldArray[i].commentOperator !== newArray[i].commentOperator){
                return false;
            }
            if(oldArray[i].completed !== newArray[i].completed){
                return false;
            }
            if(oldArray[i].display_params !== newArray[i].display_params){
                return false;
            }
            if(oldArray[i].original_params !== newArray[i].original_params){
                return false;
            }
            if(oldArray[i].status !== newArray[i].status){
                return false;
            }
            if(oldArray[i].timestamp !== newArray[i].timestamp){
                return false;
            }
            if(oldArray[i].responses.length !== newArray[i].responses.length){
                return false;
            }
            if(oldArray[i].opsec_pre_blocked !== newArray[i].opsec_pre_blocked){
                return false;
            }
            if(oldArray[i].opsec_pre_bypassed !== newArray[i].opsec_pre_bypassed){
                return false;
            }
            if(oldArray[i].opsec_post_blocked !== newArray[i].opsec_post_blocked){
                return false;
            }
            if(oldArray[i].opsec_post_bypassed !== newArray[i].opsec_post_bypassed){
                return false;
            }
            if(oldArray[i].tasks.length !== newArray[i].tasks.length){
                return false;
            }
        }
        return true;
    }
    const subscriptionDataCallback = useCallback( ({subscriptionData}) => {
        if(!fetched){
            setFetched(true);
        }
        console.log(subscriptionData);
        const oldLength = taskingDataRef.current.task.length;
        const mergedData = subscriptionData.data.task.reduce( (prev, cur) => {
            const index = prev.findIndex(element => element.id === cur.id);
            if(index > -1){
                // need to update an element
                const updated = prev.map( (element) => {
                    if(element.id === cur.id){
                        return cur;
                    }else{
                        return element;
                    }
                });
                return updated;
            }else{
                return [...prev, cur];
            }
        }, [...taskingDataRef.current.task]);
        mergedData.sort( (a,b) => a.id < b.id ? -1 : 1);
        if(!equalTaskTrees(taskingDataRef.current.task, mergedData)){
            setTaskingData({task: mergedData});
        }
        if(mergedData.length > oldLength){
            setCanScroll(true);
        }     
    }, [fetched, setFetched, setCanScroll])
    useSubscription(getTaskingQuery, {
        variables: {callback_id: tabInfo.callbackID, fromNow:fromNow},
        onError: data => {
            console.error(data)
        },
        fetchPolicy: "no-cache",
        onSubscriptionData: subscriptionDataCallback});
    const scrollToBottom = useCallback( () => {
        if(taskingData && messagesEndRef.current){
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, [taskingData, messagesEndRef]);
    useLayoutEffect( () => {
        if(canScroll){
            scrollToBottom();
            setCanScroll(false);
        }
    }, [canScroll, scrollToBottom]);
    const [getInfiniteScrollTasking, {loading: loadingMore}] = useLazyQuery(getNextBatchTaskingQuery, {
        onError: data => {
            console.error(data);
        },
        onCompleted: (data) => {
            let foundNew = false;
            const mergedData = data.task.reduce( (prev, cur) => {
                const index = prev.findIndex(element => element.id === cur.id);
                if(index > -1){
                    // need to update an element
                    const updated = prev.map( (element) => {
                        if(element.id === cur.id){
                            return cur;
                        }else{
                            return element;
                        }
                    });
                    return updated;
                }else{
                    foundNew = true;
                    return [...prev, cur];
                }
            }, [...taskingData.task]);
            mergedData.sort( (a,b) => a.id < b.id ? -1 : 1);
            setTaskingData({task: mergedData});    
            if(!foundNew){
                snackActions.info("No older tasks available");
                setFetchedAllTasks(true);
            }else{
                if(data.task.length < fetchLimit){
                    setFetchedAllTasks(true);
                }else{
                    setFetchedAllTasks(false);
                }
                snackActions.success("Loaded tasks");
            }
        },
        fetchPolicy: "no-cache"
    });
    /*
    const loadMore = useCallback( (entries) => {
        if(entries[0].isIntersecting){
            //need to fetch the next set of tasks
            console.log("intersecting", fetchedAllTasks, canLoad)
            if(!fetchedAllTasks && canLoad){
                console.log("call infinite scroll");
                getInfiniteScrollTasking({variables: {callback_id: props.tabInfo.callbackID, offset: taskingData.task.length}});
            }
        }else{
            setCanLoad(true);
        }
    }, [fetchedAllTasks, canLoad, taskingData.task.length, getInfiniteScrollTasking, props.tabInfo.callbackID, setCanLoad]);
    useEffect( () => {
        const observer = new IntersectionObserver( loadMore, {rootMargin: "0px", threshold: 0.5});
        console.log(loader, loader.current);
        if(loader && loader.current){
            console.log("observing");
            observer.observe(loader.current);
        }
        return () => observer.disconnect();
    }, [loader, loadMore]);
    */
    useEffect( () => {
        getLoadedCommands({variables: {callback_id: tabInfo.callbackID, payloadtype: tabInfo.payloadtype}});
        getInfiniteScrollTasking({variables: {callback_id: tabInfo.callbackID, offset: taskingData.task.length, fetchLimit}});
        setCanScroll(true);
    }, [])
    const loadMoreTasks = () => {
        getInfiniteScrollTasking({variables: {callback_id: tabInfo.callbackID, offset: taskingData.task.length, fetchLimit}});
    }
    const onSubmitCommandLine = (message) => {
        const command = message.split(" ")[0];
        const params = message.substring(command.length).trim();
        if(command === "clear"){
            onCreateTask({callback_id: tabInfo.callbackID, command: command, params: params});
            return;
        }
        const commandParams = commands.find(com => com.cmd === command);
        if(commandParams === undefined){
            snackActions.warning("Unknown command");
            return; 
        }else if(commandParams.commandparameters.length === 0){
            // if there are no parameters, just send whatever the user types along
            onCreateTask({callback_id: tabInfo.callbackID, command: command, params: params});
        }else{
            // check if there's a "file" component that needs to be displayed
            const fileParamExists = commandParams.commandparameters.find(param => param.parameter_type === "File");
            if(fileParamExists || params.length === 0){
                //need to do a popup
                setCommandInfo({...commandParams, "typedParameters": message});
                setOpenParametersDialog(true);
                return;
            }else{
                onCreateTask({callback_id: tabInfo.callbackID, command: command, params: params});
            }            
        }
    }
    const submitParametersDialog = (cmd, parameters, files) => {
        setOpenParametersDialog(false);
        onCreateTask({callback_id: tabInfo.callbackID, command: cmd, params: parameters, files: files});
    }
    const onCreateTask = ({callback_id, command, params, files}) => {
        createTask({variables: {callback_id, command, params, files}});
    }
    const onSubmitFilter = (newFilter) => {
        setFilterOptions(newFilter);
    }
    return (
        <MythicTabPanel {...others} >
            <div style={{overflow: "auto", height: `calc(${maxHeight - 6}vh)`}}>
                <div ref={loader} style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
                    {!fetchedAllTasks && <Tooltip title="Fetch Older Tasks"> 
                        <IconButton onClick={loadMoreTasks} variant="contained" color="primary"  ><AutorenewIcon /></IconButton>
                        </Tooltip>}
                    {!fetched && <LinearProgress color="primary" thickness={2} style={{paddingTop: "5px"}}/>}
                    {loadingMore && <LinearProgress color="primary" thickness={2} style={{paddingTop: "5px"}}/>}
                </div>
                {
                    taskingData.task.map( (task) => (
                        <TaskDisplay key={"taskinteractdisplay" + task.id} task={task} command_id={task.command == null ? 0 : task.command.id} filterOptions={filterOptions} />
                    ))
                }
                <div ref={messagesEndRef} />
            </div>
            <MythicDialog fullWidth={true} maxWidth="md" open={openParametersDialog} 
                    onClose={()=>{setOpenParametersDialog(false);}} 
                    innerDialog={<TaskParametersDialog command={commandInfo} callback={callback} onSubmit={submitParametersDialog} onClose={()=>{setOpenParametersDialog(false);}} />}
                />
            <CallbacksTabsTaskingInput onSubmitFilter={onSubmitFilter} onSubmitCommandLine={onSubmitCommandLine} filterOptions={filterOptions} loadedOptions={commands} taskOptions={taskingData}/>
        </MythicTabPanel>
    )
}