import React, { useEffect } from 'react';
import {gql, useMutation, useQuery } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {MythicSelectFromListDialog} from '../../MythicComponents/MythicSelectFromListDialog';
import {createTaskingMutation} from './CallbacksTabsTasking';
import {TaskParametersDialog} from './TaskParametersDialog';
import { MythicConfirmDialog } from '../../MythicComponents/MythicConfirmDialog';

const getLoadedCommandsBasedOnInput = ({cmd, ui_feature}) => {
    let filter_string = "";
    if(cmd !== undefined && cmd !== ""){
        filter_string = "{command: {cmd: {_eq: $cmd}}}"
    } else if(ui_feature !== undefined && ui_feature !== ""){
        filter_string = "{command: {supported_ui_features: {_contains: $ui_feature}}}";
    } else {
        console.log("invalid command and ui_feature", "cmd", cmd, "ui_feature", ui_feature)
        filter_string = "{command: {id: {_eq: 0}}}"
    }
    return gql`
    query GetLoadedCommandsQuery($callback_id: Int!, $ui_feature: jsonb, $cmd: String) {
        callback_by_pk(id: $callback_id){
            operation_id
            display_id
            active
            payload {
                payloadtype {
                    id
                }
            }
            loadedcommands(where: ${filter_string}) {
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
            callbacktokens(where: {deleted: {_eq: false}}) {
                token {
                  token_id
                  id
                  user
                  description
                }
                id
            }
        }
    }
    `;
}
const getLoadedCommandsQuery = gql`
query GetLoadedCommandsQuery($callback_id: Int!, $ui_feature: jsonb, $cmd: String) {
    callback_by_pk(id: $callback_id){
        operation_id
        active
        payload {
            payloadtype {
                id
            }
        }
        loadedcommands(where: {command: {supported_ui_features: {_contains: $ui_feature}}}) {
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
        callbacktokens(where: {deleted: {_eq: false}}) {
            token {
              token_id
              id
              user
              description
            }
            id
        }
    }
}
`;

export const TaskFromUIButton = ({callback_id, cmd, ui_feature, parameters, onTasked, tasking_location, getConfirmation, openDialog, acceptText, dontShowSuccessDialog}) =>{
    const [fileBrowserCommands, setFileBrowserCommands] = React.useState([]);
    const [openSelectCommandDialog, setOpenSelectCommandDialog] = React.useState(false);
    const [openParametersDialog, setOpenParametersDialog] = React.useState(false);
    const [selectedCommand, setSelectedCommand] = React.useState({});
    const [callbackTokenOptions, setCallbackTokenOptions] = React.useState([]);
    const [selectedCallbackToken, setSelectedCallbackToken] = React.useState({});
    const [openCallbackTokenSelectDialog, setOpenCallbackTokenSelectDialog] = React.useState(false);
    const [taskingVariables, setTaskingVariables] = React.useState({});
    const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
    const savedFinalVariables = React.useRef({});
    const [createTask] = useMutation(createTaskingMutation, {
        update: (cache, {data}) => {
            if(data.createTask.status === "error"){
                snackActions.error(data.createTask.error);
                onTasked({tasked: false});
            }else if(dontShowSuccessDialog){
                onTasked({tasked: true, variables: savedFinalVariables.current});
            }else {
                snackActions.success("Issued \"" + selectedCommand["cmd"] + "\" to Callback " + callback_id);
                onTasked({tasked: true, variables: savedFinalVariables.current});
            }
        },
        onError: data => {
            console.error(data);
            onTasked({tasked: false});
        }
    });
    const renderValue = (value) => {
        if(value === "Default Token"){
          return "Default Token";
        }
        if(value.User === null){
          if(value.description === null){
            return value.token_id + " - No Description";
          }else{
            return value.token_id + " - " + value.description;
          }
        }else{
          if(value.description === null){
            return value.token_id + " - " + value.user;
          }else{
            return value.token_id + " - " + value.user + " - " + value.description;
          }
          
        }
      }
    const {data: callbackData} = useQuery(getLoadedCommandsBasedOnInput({cmd, ui_feature}), {
        variables: {callback_id: callback_id, ui_feature: ui_feature, cmd: cmd },
        onCompleted: (data) => {
            if(data.callback_by_pk === null){
                snackActions.warning("Unknown callback");
                onTasked({tasked: false});
                return;
            }else if(!data.callback_by_pk.active){
                snackActions.warning("Callback isn't active");
                onTasked({tasked: false});
                return;
            }
            const availableCommands = data.callback_by_pk.loadedcommands.reduce( (prev, cur) => {
                if(typeof(parameters) === "string"){
                    return [...prev, {...cur.command, "parsedParameters": {}}];
                }else{
                    console.log("adding in parsed parameters", parameters);
                    return [...prev, {...cur.command, "parsedParameters": parameters}];
                }
                
            }, []);
            const availableTokens = data.callback_by_pk.callbacktokens.reduce( (prev, cur) => {
                return [...prev, {...cur.token, "display": renderValue(cur.token)}]
            }, []);
            setCallbackTokenOptions(availableTokens);
            setFileBrowserCommands(availableCommands);
            if(availableCommands.length === 0){
                if(ui_feature !== undefined){
                    snackActions.warning("No commands currently loaded that support the " + ui_feature + " feature");
                } else {
                    snackActions.warning("No commands currently loaded that by the name " + cmd);
                }
                
                onTasked({tasked: false});
            }else if(availableCommands.length === 1){
                setSelectedCommand({...availableCommands[0]});
            }else{
                setSelectedCommand({});
                setOpenSelectCommandDialog(true);
            }
        },
        fetchPolicy: "no-cache"
    });
    const onSubmitSelectedCommand = (cmd) => {
        setSelectedCommand(cmd);
    }
    const onSubmitTasking = ({variables}) => {
        if(getConfirmation){
            setTaskingVariables(variables);
            setOpenConfirmDialog(true);
            return;
        }

        if(callbackTokenOptions.length > 0){
            setOpenCallbackTokenSelectDialog(true);
            setTaskingVariables(variables);
        }else {
            createTask({variables: {...variables, callback_id: callbackData.callback_by_pk.display_id}})
        }
    }
    const submitParametersDialog = (cmd, new_parameters, files) => {
        setOpenParametersDialog(false);
        try{
            savedFinalVariables.current = JSON.parse(new_parameters);
            if(typeof parameters !== "string"){
                savedFinalVariables.current = {...parameters, ...savedFinalVariables.current}
                new_parameters = JSON.stringify(savedFinalVariables.current)
            }
        }catch(error){
            savedFinalVariables.current = new_parameters;
        }
        
        onSubmitTasking({variables: {callback_id: callback_id, command: cmd, params: new_parameters, files, tasking_location: "modal"}});
    }
    const onSubmitSelectedToken = (token) => {
        setSelectedCallbackToken(token);
    }
    const onSubmitConfirm = () => {
        if(callbackTokenOptions.length > 0){
            setOpenCallbackTokenSelectDialog(true);
        }else {
            createTask({variables: {...taskingVariables, callback_id: callbackData.callback_by_pk.display_id}})
        }
        setOpenConfirmDialog(false);
    }
    const onCancelConfirm = () => {
        setOpenConfirmDialog(false);
        console.log("in onCancelConfirm")
        onTasked({tasked: false});
    }
    useEffect( () => {
        if(selectedCallbackToken === ""){
            // we selected the default token to use
            createTask({variables: {...taskingVariables, callback_id: callbackData.callback_by_pk.display_id}});
        }
        if(selectedCallbackToken.token_id){
            createTask({variables: {...taskingVariables, callback_id: callbackData.callback_by_pk.display_id, token_id: selectedCallbackToken.token_id}});
        }
        
    }, [selectedCallbackToken])
    useEffect( () => {
        if(selectedCommand.commandparameters === undefined){
            return;
        }
        if(openDialog && selectedCommand.commandparameters.length > 0){
            setOpenParametersDialog(true);
            return;
        }
        let taskingLocation = tasking_location ? tasking_location : "browserscript";
        if(selectedCommand.commandparameters.length > 0){
            if(parameters === undefined || parameters === null){
                setOpenParametersDialog(true);
            }else{
                savedFinalVariables.current = parameters;
                if(typeof(parameters) === "string"){
                    onSubmitTasking({variables: {callback_id: callback_id, command: selectedCommand.cmd, params: parameters, tasking_location: "command_line"}});
                }else{
                    onSubmitTasking({variables: {callback_id: callback_id, command: selectedCommand.cmd, params: JSON.stringify(parameters), tasking_location: taskingLocation}});
                }
                
            }
        }else{
            if(parameters === undefined || parameters === null){
                savedFinalVariables.current = "";
                onSubmitTasking({variables: {callback_id: callback_id, command: selectedCommand.cmd, params: ""}});
            }else{
                savedFinalVariables.current = parameters;
                if(typeof(parameters) === "string"){
                    onSubmitTasking({variables: {callback_id: callback_id, command: selectedCommand.cmd, params: parameters, tasking_location: "command_line"}});
                }else{
                    onSubmitTasking({variables: {callback_id: callback_id, command: selectedCommand.cmd, params: JSON.stringify(parameters), tasking_location: taskingLocation}});
                }
            }
            
        }
    }, [selectedCommand])
    return (
        <div>
            {openSelectCommandDialog && 
                <MythicDialog fullWidth={true} maxWidth="md" open={openSelectCommandDialog}
                        onClose={()=>{setOpenSelectCommandDialog(false);onTasked({tasked: false});}} 
                        innerDialog={<MythicSelectFromListDialog onClose={()=>{setOpenSelectCommandDialog(false);}}
                                            onSubmit={onSubmitSelectedCommand} options={fileBrowserCommands} title={"Select Command"} 
                                            action={"select"} identifier={"id"} display={"cmd"}/>}
                    />
            }
            {openParametersDialog &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openParametersDialog} 
                    onClose={()=>{setOpenParametersDialog(false);onTasked({tasked: false});}} 
                    innerDialog={<TaskParametersDialog command={selectedCommand} callback_id={callback_id} payloadtype_id={callbackData.callback_by_pk.payload.payloadtype.id}
                        operation_id={callbackData.callback_by_pk.operation_id} 
                        onSubmit={submitParametersDialog} onClose={()=>{setOpenParametersDialog(false);}} />}
                />
            }
            {openCallbackTokenSelectDialog &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openCallbackTokenSelectDialog}
                    onClose={()=>{setOpenCallbackTokenSelectDialog(false);onTasked({tasked: false});}}
                    innerDialog={<MythicSelectFromListDialog onClose={()=>{setOpenCallbackTokenSelectDialog(false);onTasked({tasked: false});}}
                                        onSubmit={onSubmitSelectedToken} dontCloseOnSubmit={true} options={callbackTokenOptions} title={"Select Token"} 
                                        action={"select"} identifier={"id"} display={"display"}/>}
                />
            }
            {openConfirmDialog && 
                <MythicConfirmDialog onClose={onCancelConfirm} dontCloseOnSubmit={true} onSubmit={onSubmitConfirm} open={openConfirmDialog} acceptText={acceptText}/>
            }
        </div>
    )
}
