import {MythicTabPanel, MythicTabLabel} from '../../../components/MythicComponents/MythicTabPanel';
import React, {useEffect, useCallback} from 'react';
import {gql, useMutation, useLazyQuery, useQuery } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {MythicSelectFromListDialog} from '../../MythicComponents/MythicSelectFromListDialog';
import MythicTextField from '../../MythicComponents/MythicTextField';
import { useReactiveVar } from '@apollo/client';
import { meState } from '../../../cache';
import {useTheme} from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Tooltip from '@material-ui/core/Tooltip';
import RefreshIcon from '@material-ui/icons/Refresh';
import IconButton from '@material-ui/core/IconButton';
import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import {createTaskingMutation} from './CallbacksTabsTasking';
import {TaskParametersDialog} from './TaskParametersDialog';
import {CallbacksTabsProcessBrowserTree} from './CallbacksTabsProcessBrowserTree';
import {CallbacksTabsProcessBrowserTable} from './CallbacksTabsProcessBrowserTable';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';

const dataFragment = gql`
fragment objData on process {
    name
    process_id
    parent_process_id
    architecture
    bin_path
    integrity_level
    id
    user
}
`;
const taskFragment = gql`
fragment taskData on task {
    id
    callback {
        id
        host
        payload {
            id
            os
            payloadtype{
                ptype
            }
        }
    }
}
`;
const getNextProcessQuery = gql`
${dataFragment}
${taskFragment}
query getHostProcessesQuery($operation_id: Int!, $host: String!, $task_id: Int!) {
    process(where: {operation_id: {_eq: $operation_id}, host: {_eq: $host}, task_id: {_gt: $task_id}}, order_by: {task_id: asc}, limit: 1) {
        task {
            ...taskData
            processes(order_by: {process_id: asc}) {
                ...objData
            }
        }
    }
  }
`;
const getPrevProcessQuery = gql`
${dataFragment}
${taskFragment}
query getHostProcessesQuery($operation_id: Int!, $host: String!, $task_id: Int!) {
    process(where: {operation_id: {_eq: $operation_id}, host: {_eq: $host}, task_id: {_lt: $task_id}}, order_by: {task_id: desc}, limit: 1) {
        task {
            ...taskData
            processes(order_by: {name: asc}) {
                ...objData
            }
        }
    }
  }
`;
const getLatestTaskForHost = gql`
query getHostsQuery($operation_id: Int!, $host:String!){
    process_aggregate(where: {operation_id: {_eq: $operation_id}, host: {_eq: $host}}, distinct_on: task_id){
        aggregate {
            max {
              task_id
            }
        }
    }
}
`;
const getLoadedCommandsQuery = gql`
query GetLoadedCommandsQuery($callback_id: Int!, $payloadtype: String!, $ui_feature: String!) {
  loadedcommands(where: {callback_id: {_eq: $callback_id}, command: {supported_ui_features: {_iregex: $ui_feature}}}) {
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
      supported_ui_features
    }
  }
  command(where: {payloadtype: {ptype: {_eq: $payloadtype}}, script_only: {_eq: true}, deleted: {_eq: false}, supported_ui_features: {_iregex: $ui_feature }}){
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
      supported_ui_features
    }
}
`;
export function CallbacksTabsProcessBrowserLabel(props){
    return (
        <MythicTabLabel label={"Process Browser"} {...props}/>
    )
}
export const CallbacksTabsProcessBrowserPanel = (props) =>{
    const theme = useTheme();
    const me = useReactiveVar(meState);
    const fileBrowserRoots = React.useRef([]);
    const [fileBrowserRootsState, setFileBrowserRootsState] = React.useState([]);
    const [selectedFolder, setSelectedFolder] = React.useState([]);
    const [fileBrowserCommands, setFileBrowserCommands] = React.useState({});
    const [openSelectCommandDialog, setOpenSelectCommandDialog] = React.useState(false);
    const [openParametersDialog, setOpenParametersDialog] = React.useState(false);
    const [selectedCommand, setSelectedCommand] = React.useState({});
    const [searchCallback, setSearchCallback] = React.useState({});
    const [taskInfo, setTaskInfo] = React.useState({});
    const [uiFeature, setUIFeature] = React.useState("");
    const currentCallbackIDSetInTable = React.useRef();
    const [currentOS, setCurrentOS] = React.useState("");
    const makeTree = (root, element) => {
        if(root.process_id === element.parent_process_id){
            root.children.push({...element, children: []});
            return true;
        }else{
            // root isn't what we're looking for, but maybe a child of root is
            for(let i = 0; i < root.children.length; i++){
                if(makeTree(root.children[i], element)){
                    return true;
                }
            }
        }
        return false;
    }
    const [getNextProcessDataByHostAndTask] = useLazyQuery(getNextProcessQuery, {
        onError: data => {
            console.error(data)
        },
        fetchPolicy: "network-only",
        onCompleted: (data) => {
            if(data.process.length > 0){
                const dataTree = data.process[0].task.processes.reduce( (prev, cur) => {
                    if(cur.parent_process_id === null || cur.parent_process_id <= 0){
                        return [...prev, {...cur, children: []}]
                    }else{
                        // this means there is a parent id
                        // go through the current high level parent processes 
                        const updated = [...prev].map( (root) => {
                            makeTree(root, cur);
                            return {...root};
                        });
                        return [...updated];
                    }
                }, []);
                setFileBrowserRootsState(dataTree);
                setSelectedFolder(data.process[0].task.processes);
                setCurrentOS(data.process[0].task.callback.payload.os);
                setTaskInfo(data.process[0].task);
                snackActions.dismiss();
                snackActions.success("Successfully fetched process data");
            }else{
                snackActions.dismiss();
                snackActions.warning("No Newer Process Sets");
            }
            
        }
    });
    
    const [getPreviousProcessDataByHostAndTask] = useLazyQuery(getPrevProcessQuery, {
        onError: data => {
            console.error(data)
        },
        fetchPolicy: "network-only",
        onCompleted: (data) => {
            if(data.process.length > 0){
                const dataTree = data.process[0].task.processes.reduce( (prev, cur) => {
                    if(cur.parent_process_id === null || cur.parent_process_id <= 0){
                        return [...prev, {...cur, children: []}]
                    }else{
                        // this means there is a parent id
                        // go through the current high level parent processes 
                        const updated = [...prev].map( (root) => {
                            makeTree(root, cur);
                            return {...root};
                        });
                        return [...updated];
                    }
                }, []);
                setFileBrowserRootsState(dataTree);
                setSelectedFolder(data.process[0].task.processes);
                setCurrentOS(data.process[0].task.callback.payload.os);
                setTaskInfo(data.process[0].task);
                snackActions.dismiss();
                snackActions.success("Successfully fetched process data");
            }else{
                snackActions.dismiss();
                snackActions.warning("No Earlier Process Sets");
            }
            
        }
    });
    useQuery(getLatestTaskForHost, {
        variables: {operation_id: me.user.current_operation_id, host: props.callback[0].host},
        onCompleted: (data) => {
            if(data.process_aggregate.aggregate.max.task_id === null){
                snackActions.warning("No Process Data for " + props.callback[0].host)
            }else{
                snackActions.info("Fetching latest process data for " + props.callback[0].host);
                getNextProcessDataByHostAndTask({variables: {operation_id: me.user.current_operation_id, 
                    host: props.callback[0].host,
                    task_id: data.process_aggregate.aggregate.max.task_id - 1
                }});
            }
        }, fetchPolicy: "network-only"
    });
    useEffect( () => {
        fileBrowserRoots.current = fileBrowserRootsState;
    }, [fileBrowserRootsState])

    const [createTask] = useMutation(createTaskingMutation, {
        update: (cache, {data}) => {
            if(data.createTask.status === "error"){
                snackActions.error(data.createTask.error);
            }else{
                snackActions.success("Issued \"" + selectedCommand["cmd"] + "\" to Callback " + searchCallback.id);
            }
            setSelectedCommand({});
            setSearchCallback({});
            setUIFeature("");
        },
        onError: data => {
            console.error(data);
            setSelectedCommand({});
            setSearchCallback({});
            setUIFeature("");
        }
    });
    const [getCommandOptions] = useLazyQuery(getLoadedCommandsQuery, {
        onCompleted: (data) => {
            const availableCommands = data.loadedcommands.reduce( (prev, cur) => {
                return [...prev, cur.command];
            }, []);
            const finalCommands = data.command.reduce( (prev, cur) => {
                return [...prev, cur];
            }, [...availableCommands]);
            setFileBrowserCommands(finalCommands);
            if(finalCommands.length === 0){
                snackActions.warning("No commands currently loaded that support that feature");
            }else if(finalCommands.length === 1){
                setSelectedCommand({...finalCommands[0]});
            }else{
                setSelectedCommand({});
                setOpenSelectCommandDialog(true);
            }
        },
        fetchPolicy: "network-only"
    });
    useEffect( () => {
        if(selectedCommand["cmd"] !== undefined){
            if(selectedCommand["commandparameters"].length === 0){
                createTask({variables: {callback_id: searchCallback.id, command: selectedCommand["cmd"], params: ""}});
            }else{
                switch(uiFeature){
                    case "process_browser:list":
                        // need to do a popup for the user to select the file
                        setOpenParametersDialog(true);
                        break;              
                    default:
                        break;
                }
            }
            
        }
    }, [selectedCommand, createTask, searchCallback, uiFeature]);
    useEffect( () => {
        if(searchCallback.id !== undefined){
            getCommandOptions({variables: {callback_id: searchCallback.id, payloadtype: searchCallback.payload.payloadtype.ptype, ui_feature: searchCallback.ui_feature}});
        }
    }, [searchCallback, getCommandOptions]);
    const onListFilesButton = ({callbackID}) => {
        const callbackData = props.getCallbackData({callbackID});
        // clear out commands and re-fetch
        setFileBrowserCommands([]);
        if(callbackData.length > 0){
            setSearchCallback({...callbackData[0], "ui_feature": ".*process_browser:list.*"});
            setUIFeature("process_browser:list");
        }else{
            snackActions.warning("Callback doesn't exist or isn't active");
        }
    }
    const onNextButton = ({task_id}) => {
        getNextProcessDataByHostAndTask({variables: {operation_id: me.user.current_operation_id, 
            host: props.callback[0].host,
            task_id: task_id
        }})
    }
    const onPreviousButton = ({task_id}) => {
        getPreviousProcessDataByHostAndTask({variables: {operation_id: me.user.current_operation_id, 
            host: props.callback[0].host,
            task_id: task_id
        }})
    }
    const onDiffButton = ({task_id}) => {
        
    }
    const onTaskRowAction = ({path, host, filename, uifeature}) => {
        const callbackData = props.getCallbackData({callbackID: currentCallbackIDSetInTable.current});
        // clear out commands and re-fetch
        setFileBrowserCommands([]);
        if(callbackData.length > 0){
            setSearchCallback({...callbackData[0], "ui_feature": ".*" + uifeature + ".*"});
            setUIFeature(uifeature);
        }else{
            snackActions.warning("Callback doesn't exist or isn't active");
        }
    }
    const onSubmitSelectedCommand = (cmd) => {
        setSelectedCommand(cmd);
    }
    const submitParametersDialog = (cmd, parameters, files) => {
        setOpenParametersDialog(false);
        createTask({variables: {callback_id: searchCallback.id, command: cmd, params: parameters, files}});
    }
    const onChangeCallbackID = (callbackID) => {
        currentCallbackIDSetInTable.current = callbackID;
    }
    return (
        <MythicTabPanel {...props} >
            <div style={{maxHeight: `calc(${props.maxHeight}vh)`, overflow: "auto", height: `calc(${props.maxHeight-1}vh)`, width: `calc(31vw)`, display: "inline-block"}}>
                <CallbacksTabsProcessBrowserTree treeRoot={fileBrowserRootsState} theme={theme} />
            </div>
            <div style={{maxHeight: `calc(${props.maxHeight}vh)`, overflow: "auto", height: `calc(${props.maxHeight-1}vh)`, width: `calc(64vw)`, display: "inline-block"}}>
                <ProcessBrowserTableTop
                    onListFilesButton={onListFilesButton} 
                    onNextButton={onNextButton} 
                    onPreviousButton={onPreviousButton}
                    onDiffButton={onDiffButton}  
                    onChangeCallbackID={onChangeCallbackID}
                    taskInfo={taskInfo}/>
                <CallbacksTabsProcessBrowserTable selectedFolder={selectedFolder} onTaskRowAction={onTaskRowAction} os={currentOS}/>
            </div>
            <MythicDialog fullWidth={true} maxWidth="sm" open={openSelectCommandDialog}
                    onClose={()=>{setOpenSelectCommandDialog(false);}} 
                    innerDialog={<MythicSelectFromListDialog onClose={()=>{setOpenSelectCommandDialog(false);}}
                                        onSubmit={onSubmitSelectedCommand} options={fileBrowserCommands} title={"Select Command"} 
                                        action={"select"} identifier={"id"} display={"cmd"}/>}
                />
            <MythicDialog fullWidth={true} maxWidth="md" open={openParametersDialog} 
                    onClose={()=>{setOpenParametersDialog(false);}} 
                    innerDialog={<TaskParametersDialog command={selectedCommand} callback={searchCallback} onSubmit={submitParametersDialog} onClose={()=>{setOpenParametersDialog(false);}} />}
                />
        </MythicTabPanel>
    )
}
const ProcessBrowserTableTop = ({onListFilesButton, onNextButton, onPreviousButton, onDiffButton, onChangeCallbackID, taskInfo}) => {
    const theme = useTheme();
    const [hostname, setHostname] = React.useState("");
    const [callbackID, setCallbackID] = React.useState(0);
    const [manuallySetCallbackID, setManuallySetCallbackID] = React.useState(false);
    const [taskID, setTaskID] = React.useState(0);
    const onChangeID = (name, value, error) => {
        setManuallySetCallbackID(true);
        setCallbackID(parseInt(value));
    }
    const revertCallbackID = () => {
        setManuallySetCallbackID(false);
        if(taskInfo.callback !== undefined){
            setCallbackID(taskInfo.callback.id);
        }else{
            setCallbackID(0);
        }
        
    }
    useEffect( () => {
        if(taskInfo.callback !== undefined){
            setHostname(taskInfo.callback.host);    
            setTaskID(taskInfo.id);
        }
        if(!manuallySetCallbackID){
            if(taskInfo.callback !== undefined){
                setCallbackID(taskInfo.callback.id);
            }else{
                setCallbackID(0);
            }
            
        }
    }, [taskInfo, manuallySetCallbackID]);
    const onLocalListFilesButton = () => {
        if(callbackID > 0){
            onListFilesButton({callbackID})
        }else{
            snackActions.warning("Must set a callback number first");
        }
    }
    const onLocalNextButton = () => {
        if(callbackID > 0){
            snackActions.info("Fetching next process data...");
            onNextButton({task_id: taskInfo.id});
        }else{
            snackActions.warning("Must select a callback number first");
        }
    }
    const onLocalPreviousButton = () => {
        if(callbackID > 0){
            snackActions.info("Fetching previous process data...");
            onPreviousButton({task_id: taskInfo.id});
        }else{
            snackActions.warning("Must select a callback number first");
        }
    }
    const onLocalDiffButton = () => {
        if(callbackID > 0){
            onNextButton({callbackID});
        }else{
            snackActions.warning("Must select a callback number first");
        }
    }
    useEffect( () => {
        onChangeCallbackID(callbackID);
    }, [callbackID, onChangeCallbackID])
    return (
        <Grid container spacing={0} style={{paddingTop: "10px"}}>
            <Grid item xs={10}>
                <MythicTextField placeholder="Host Name" value={hostname} disabled
                    onChange={() => {}} name="Host Name" InputProps={{
                        endAdornment: 
                        <React.Fragment>
                            <Tooltip title="Fetch Previous Saved Process Listing">
                            <IconButton style={{padding: "3px"}} onClick={onLocalPreviousButton}><SkipPreviousIcon style={{color: theme.palette.info.main}}/></IconButton>
                        </Tooltip>
                        <Tooltip title="Task Callback to List Processes">
                            <IconButton style={{padding: "3px"}} onClick={onLocalListFilesButton}><RefreshIcon style={{color: theme.palette.info.main}}/></IconButton>
                        </Tooltip>
                        <Tooltip title="Fetch Next Saved Process Listing">
                            <IconButton style={{padding: "3px"}} onClick={onLocalNextButton}><SkipNextIcon style={{color: theme.palette.info.main}}/></IconButton>
                        </Tooltip>
                        <Tooltip title="Compare Previous Listing">
                            <IconButton style={{padding: "3px"}} onClick={onLocalDiffButton}><CompareArrowsIcon style={{color: theme.palette.info.main}}/></IconButton>
                        </Tooltip>
                        </React.Fragment>
                    }} />
            </Grid>
            <Grid item xs={1}>
                <MythicTextField type="number" placeholder="Callback" name="Callback"
                    onChange={onChangeID} value={callbackID} InputProps={{
                        endAdornment: manuallySetCallbackID ? (
                            <Tooltip title="Reset Callback ID">
                                <IconButton style={{padding: "3px"}} onClick={revertCallbackID}>
                                    <RotateLeftIcon style={{color: theme.palette.warning.main}}/></IconButton>
                            </Tooltip>
                        ) : (null),
                        style: {padding: 0, margin: 0}
                    }}/>
            </Grid>
            <Grid item xs={1}>
                <MythicTextField type="number" name="Task Data"
                    disabled value={taskID} onChange={() => {}}/>
            </Grid>
        </Grid>
    )
}
