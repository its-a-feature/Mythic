import {MythicTabPanel, MythicTabLabel} from '../../../components/MythicComponents/MythicTabPanel';
import React, {useEffect, useRef} from 'react';
import {useQuery, gql, useMutation, useLazyQuery } from '@apollo/client';
import { TaskDisplay } from './TaskDisplay';
import {snackActions} from '../../utilities/Snackbar';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {TaskParametersDialog} from './TaskParametersDialog';
import {CallbacksTabsTaskingInput} from './CallbacksTabsTaskingInput';


export function CallbacksTabsTaskingLabel(props){
    return (
        <MythicTabLabel label={"Callback: " + props.tabInfo.callbackID} {...props}/>
    )
}
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
const getTaskingQuery = gql`
query getTasking($callback_id: Int!){
    task(where: {callback_id: {_eq: $callback_id}, parent_task_id: {_is_null: true}}, order_by: {id: asc}) {
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
}
 `;

export const CallbacksTabsTaskingPanel = (props) =>{
    const [commands, setCommands] = React.useState([]);
    const [openParametersDialog, setOpenParametersDialog] = React.useState(false);
    const [commandInfo, setCommandInfo] = React.useState({});
    const [taskingData, setTaskingData] = React.useState({task: []});
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
    const {loading, error} = useQuery(GetLoadedCommandsQuery, {
        variables: {callback_id: props.tabInfo.callbackID, payloadtype: props.tabInfo.payloadtype},
        onCompleted: data => {
            const cmds = data.loadedcommands.reduce( (prev, cur) => {
                const attributes = JSON.parse(cur.command.attributes);
                if(attributes["supported_os"].length === 0 || attributes["supported_os"].includes(props.tabInfo.os)){
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
                    if(attributes["supported_os"].length === 0 || attributes["supported_os"].includes(props.tabInfo.os)){
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
        }
        });
    const [getTasking, { loading: taskingLoading }] = useLazyQuery(getTaskingQuery, {
        onError: data => {
            console.error(data)
        },
        fetchPolicy: "network-only",
        nextFetchPolicy: "network-only",
        notifyOnNetworkStatusChange: true,
        pollInterval: 1000,
        onCompleted: (data) => {
            setTaskingData(data);
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
    
    //useEffect(scrollToBottom, [taskingData]);
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
        if(commandParams === undefined){
            snackActions.warning("Unknown command");
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
                
                taskingData.task.map( (task) => (
                    <TaskDisplay key={"taskinteractdisplay" + task.id} task={task} command_id={task.command == null ? 0 : task.command.id}  />
                ))
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