import {MythicTabPanel, MythicTabLabel} from '../../../components/MythicComponents/MythicTabPanel';
import { IconButton } from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import React, {useEffect, useRef} from 'react';
import {TextField} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import {useQuery, gql, useMutation, useLazyQuery } from '@apollo/client';
import { TaskDisplay } from './TaskDisplay';
import LinearProgress from '@material-ui/core/LinearProgress';
import { useSnackbar } from 'notistack';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {TaskParametersDialog} from './TaskParametersDialog';
import {CallbacksTabsTaskingInput} from './CallbacksTabsTaskingInput';
import {useReactiveVar} from '@apollo/client';
import { meState } from '../../../cache';
import {getBrowserScripts, getSupportScripts, scriptsQuery, sort_tableDefinition, escapeHTMLDefinition} from '../../utilities/BrowserScriptHelpers';


export function CallbacksTabsTaskingLabel(props){
    return (
        <MythicTabLabel label={"Callback: " + props.tabInfo.callbackID} {...props}/>
    )
}
const GetLoadedCommandsQuery = gql`
query GetLoadedCommandsQuery($callback_id: Int!) {
  loadedcommands(where: {callback_id: {_eq: $callback_id}}) {
    id
    command {
      cmd
      help_cmd
      description
      id
      needs_admin
      payload_type_id
      commandparameters {
        id
        type 
      }
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
const getTaskingQuery = gql`
query getTasking($callback_id: Int!){
    task(where: {callback_id: {_eq: $callback_id}}, order_by: {id: asc}) {
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
  }
}
 `;
const getTaskingSubscription = gql`
subscription getNewUpdatedTaskingSubscription($callback_id: Int!) {
  task(where: {callback_id: {_eq: $callback_id}}, limit: 1, order_by: {timestamp: desc}) {
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
  }
}
 `;
const escapeHTML = escapeHTMLDefinition;
const sort_table = sort_tableDefinition;
var browserscripts = {};
var support_scripts = {};
export const CallbacksTabsTaskingPanel = (props) =>{
    const { enqueueSnackbar } = useSnackbar();
    const me = useReactiveVar(meState);
    const [commands, setCommands] = React.useState([]);
    const [browserScripts, setBrowserScripts] = React.useState({});
    const [supportScripts, setSupportScripts] = React.useState({});
    const [openParametersDialog, setOpenParametersDialog] = React.useState(false);
    const [commandInfo, setCommandInfo] = React.useState({});
    const [getScripts, { loading: scriptLoading}] = useLazyQuery(scriptsQuery, {
        onCompleted: data => {
            console.log(data);
            //consolidate the browserscriptoperation and browserscript 
            // operation scripts get applied instead of operator-specific scripts
            
            try{
                eval(getSupportScripts(data));
                eval(getBrowserScripts(data));
            }catch(error){
                console.error(error);
            }
            console.log(browserscripts);
            setBrowserScripts(browserscripts);
            console.log(support_scripts);
            setSupportScripts(supportScripts);
        },
        onError: data => {
            console.error(data)
        }
    });
    const [createTask] = useMutation(createTaskingMutation, {
        update: (cache, {data}) => {
            if(data.createTask.status === "error"){
                enqueueSnackbar(data.createTask.error, {variant: "error"});
            }else{
                enqueueSnackbar("task created", {variant: "success"});
            }
        },
        onError: data => {
            console.error(data);
        }
    });
    const {loading, error} = useQuery(GetLoadedCommandsQuery, {
        variables: {callback_id: props.tabInfo.callbackID},
        onCompleted: data => {
            const cmds = data.loadedcommands.map( (cmd) => {
                return cmd.command;
            } );
            cmds.sort((a, b) => -b.cmd.localeCompare(a.cmd))
            setCommands(cmds);
        },
        onError: data => {
            console.error(data)
        }
        });
    const [getTasking, { loading: taskingLoading, data: taskingData, subscribeToMore: subscribeToMoreTasks }] = useLazyQuery(getTaskingQuery, {
        onCompleted: data => {
            subscribeToMoreTasks({
            document: getTaskingSubscription,
            variables: {callback_id: props.tabInfo.callbackID},
            updateQuery: (prev, {subscriptionData} ) => {
                //console.log("got subscription data", subscriptionData);
                if(!subscriptionData.data) return prev;
                if(subscriptionData.data.task.length === 0) return prev;
                const exists = prev.task.find(
                  ({ id }) => id === subscriptionData.data.task[0].id
                );
                if (exists) return prev;
                return Object.assign({}, prev, {
                    task: [...prev.task, subscriptionData.data.task[0]]
                });
            },
        })
        },
        onError: data => {
            console.error(data)
        }
    });
    const messagesEndRef = useRef(null);
    const scrollToBottom = () => {
        if(taskingData && messagesEndRef.current){
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }
    useEffect( () => {
        getTasking({variables: {callback_id: props.tabInfo.callbackID} });
    }, [getTasking, props.tabInfo.callbackID]);
    
    useEffect(scrollToBottom, [taskingData]);
    useEffect( () => {getScripts({variables: {operator_id: me.user.id, operation_id: me.user.current_operation_id } }); }, []);
    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}} />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const onSubmitCommandLine = (message) => {
        const command = message.split(" ")[0];
        const params = message.substring(command.length).trim();
        if(command === "clear"){
            onCreateTask({callback_id: props.tabInfo.callbackID, command: command, params: params});
            return;
        }
        const commandParams = commands.find(com => com.cmd === command);
        console.log(commandParams);
        if(commandParams === undefined){
            enqueueSnackbar("Unknown command", {variant: "warning"});
            return; 
        }else if(commandParams.commandparameters.length === 0){
            // if there are no parameters, just send whatever the user types along
            onCreateTask({callback_id: props.tabInfo.callbackID, command: command, params: params});
        }else{
            // check if there's a "file" component that needs to be displayed
            const fileParamExists = commandParams.commandparameters.find(param => param.parameter_type === "File");
            if(fileParamExists || params.length === 0){
                //need to do a popup
                setCommandInfo({...commandParams, "typedParameters": message});
                setOpenParametersDialog(true);
                return;
            }else{
                onCreateTask({callback_id: props.tabInfo.callbackID, command: command, params: params});
            }            
        }
    }
    const submitParametersDialog = (cmd, parameters, files) => {
        setOpenParametersDialog(false);
        onCreateTask({callback_id: props.tabInfo.callbackID, command: cmd, params: parameters, files: files});
    }
    const onCreateTask = ({callback_id, command, params, files}) => {
        createTask({variables: {callback_id, command, params, files}});
    }

    
    return (
        <MythicTabPanel {...props} >
            <div style={{maxHeight: `calc(${props.maxHeight - 6}vh)`, overflow: "auto", height: `calc(${props.maxHeight - 6}vh)`}}>
            {
             taskingLoading ? (<LinearProgress style={{marginTop: "10px"}}/>) : (taskingData &&
                taskingData.task.map( (task) => (
                    <TaskDisplay key={"taskinteractdisplay" + task.id} task={task} command_id={task.command.id} browserscripts={browserScripts}  />
                ))
             )
             
            }
            <div ref={messagesEndRef} />
            </div>
            <MythicDialog fullWidth={true} maxWidth="md" open={openParametersDialog} 
                    onClose={()=>{setOpenParametersDialog(false);}} 
                    innerDialog={<TaskParametersDialog command={commandInfo} callback={props.callback[0]} onSubmit={submitParametersDialog} onClose={()=>{setOpenParametersDialog(false);}} />}
                />
            <CallbacksTabsTaskingInput onSubmitCommandLine={onSubmitCommandLine} loadedOptions={commands} taskOptions={taskingData}/>
        </MythicTabPanel>
    )
}
CallbacksTabsTaskingPanel.whyDidYouRender = true;
