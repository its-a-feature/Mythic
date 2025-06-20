import { IconButton, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import React from 'react';
import {TextField} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {CallbacksTabsTaskingFilterDialog} from './CallbacksTabsTaskingFilterDialog';
import {CallbacksTabsTaskingInputTokenSelect} from './CallbacksTabsTaskingInputTokenSelect';
import { gql, useSubscription, useMutation } from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import { validate as uuidValidate } from 'uuid';
import {MythicSelectFromListDialog} from "../../MythicComponents/MythicSelectFromListDialog";
import { Backdrop } from '@mui/material';
import {CircularProgress} from '@mui/material';
import {getDynamicQueryParams} from "./TaskParametersDialogRow";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import {GetMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import {getSkewedNow} from "../../utilities/Time";
import { useTheme } from '@mui/material/styles';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";

const GetLoadedCommandsSubscription = gql`
subscription GetLoadedCommandsSubscription($callback_id: Int!){
    loadedcommands(where: {callback_id: {_eq: $callback_id}}){
        id
        command {
            cmd
            id
            attributes
            payloadtype {
                name
                id
            }
            commandparameters {
                id
                parameter_type: type 
                choices
                dynamic_query_function
                required
                name
                ui_position
                parameter_group_name
                cli_name
                display_name
            }
        }
    }
}
`;
export const subscriptionCallbackTokens = gql`
subscription subscriptionCallbackTokens ($callback_id: Int!){
  callbacktoken(where: {deleted: {_eq: false}, callback_id: {_eq: $callback_id}}) {
    token {
      token_id
      id
      user
      description
    }
    id
  }
}
`;
const subscriptionTask = gql`
subscription tasksSubscription($callback_id: Int!){
    task_stream(batch_size: 100, cursor: {initial_value: {timestamp: "1970-01-01"}}, where: {callback_id: {_eq: $callback_id}, parent_task_id: {_is_null: true}}){
        id
        original_params
        display_params
        command_name
        comment
        tasking_location
        parameter_group_name
        status
        operator{
            username
        }
        command {
            cmd
            commandparameters {
                id
                type
                name
            }
            payloadtype {
                name
                use_display_params_for_cli_history
            }
        }
    }
}
`;
const contextSubscription = gql`
subscription CallbackMetadataForTasking($callback_id: Int!){
    callback_stream(batch_size: 1, cursor: {initial_value: {timestamp: "1970-01-01"}}, where: {id: {_eq: $callback_id} }){
        cwd
        impersonation_context
        extra_info
    }
}
`;
const GetUpDownArrowName = (task, useDisplayParamsForCLIHistoryUserSetting) => {
    if(task.command){
        if(task?.command?.payloadtype?.use_display_params_for_cli_history){
            if(useDisplayParamsForCLIHistoryUserSetting){
                return task.command.cmd + " " + task.display_params;
            }
            return task.command.cmd + " " + task.original_params;
        }
        return task.command.cmd + " " + task.original_params;
    } else {
        return task.command_name + " " + task.original_params;
    }
}
const GetCommandName = (task) => {
    if(task.command){
        return task.command.cmd;
    } else {
        return task.command_name;
    }
}
const GetDefaultValueForType = (parameter_type) => {
    switch(parameter_type){
        case "string":
            return "";
        case "typedArray":
        case "array":
            return [];
        case "number":
            return 0;
        case "boolean":
            return true;
        default:
            return undefined;
    }
}
const IsCLIPossibleParameterType = (parameter_type) => {
    switch(parameter_type){
        case "ChooseOne":
        case "ChooseOneCustom":
        case "Number":
        case "Boolean":
        case "Array":
        case "TypedArray":
        case "ChooseMultiple":
        case "String":
            return true;
        default:
            return false;
    }
}
const IsRepeatableCLIParameterType = (parameter_type) => {
    switch(parameter_type){
        case "Array":
        case "TypedArray":
        case "FileMultiple":
        case "ChooseMultiple":
            return true;
        default:
            return false;
    }
}

export function CallbacksTabsTaskingInputPreMemo(props){
    const toastId = "tasking-toast-message";
    const theme = useTheme();
    const inputRef = React.useRef(null);
    const snackMessageStyles = {position:"bottom-left", autoClose: 1000, toastId: toastId, style: {marginBottom: "30px"}};
    const snackReverseSearchMessageStyles = {position:"bottom-left", autoClose: 1000,  toastId: toastId, style: {marginBottom: "70px"}};
    const [commandPayloadType, setCommandPayloadType] = React.useState("");
    const [callbackContext, setCallbackContext] = React.useState({
        cwd: "",
        impersonation_context: "",
        extra_info: "",
    });
    const [message, setMessage] = React.useState("");
    const loadedOptions = React.useRef([]);
    const taskOptions = React.useRef([]);
    const taskOptionsIndex = React.useRef(-1);
    const [filteredTaskOptions, setFilteredTaskOptions] = React.useState([]);
    const [backdropOpen, setBackdropOpen] = React.useState(false);
    const tabOptions = React.useRef([]);
    const tabOptionsIndex = React.useRef(-1);
    const tabOptionsType = React.useRef("param_name");
    const lastValueTypedBeforeDynamicParamsRef = React.useRef("");
    const [getDynamicParams] = useMutation(getDynamicQueryParams, {
        onCompleted: (data) => {
            if(data.dynamic_query_function.status === "success"){
                try{
                    if(data.dynamic_query_function.choices && data.dynamic_query_function.choices.length > 0){
                        const choices = data.dynamic_query_function.choices.filter( c => {
                            if(c.toLowerCase().includes(lastValueTypedBeforeDynamicParamsRef.current.toLowerCase())){
                                return c;
                            }
                        })
                        if ( choices.length === 0){
                            tabOptions.current = [];
                            tabOptionsType.current = "param_name";
                            if (lastValueTypedBeforeDynamicParamsRef.current === ""){
                                snackActions.info("no available options", snackMessageStyles);
                            } else {
                                snackActions.info("no available options match the supplied data", snackMessageStyles);
                            }
                            setBackdropOpen(false);
                            return;
                        }
                        tabOptions.current = choices;
                        tabOptionsIndex.current = 0;
                        let newChoice = choices[0].includes(" ") ? "\"" + choices[0] + "\"" : choices[0];
                        let newMsg = message.substring(0, message.length - lastValueTypedBeforeDynamicParamsRef.current.length) + newChoice;
                        setMessage(newMsg);
                        tabOptionsType.current = "param_value";
                    } else {
                        snackActions.warning("no available options", snackMessageStyles);
                    }
                }catch(error){
                    console.log(error);
                    setBackdropOpen(false);
                    snackActions.warning("Failed to parse dynamic parameter results", snackMessageStyles);
                    tabOptions.current = [];
                    tabOptionsType.current = "param_name";
                }

            }else{
                snackActions.warning(data.dynamic_query_function.error, snackMessageStyles);
            }
            setBackdropOpen(false);
        },
        onError: (data) => {
            snackActions.warning("Failed to query payload type container for options", snackMessageStyles);
            console.log(data);
            setBackdropOpen(false);
        }
    });
    const [openFilterOptionsDialog, setOpenFilterOptionsDialog] = React.useState(false);
    const tokenOptions = React.useRef([]);
    const [activeFiltering, setActiveFiltering] = React.useState(false);
    const [unmodifiedHistoryValue, setUnmodifiedHistoryValue] = React.useState("parsed_cli");
    const [reverseSearching, setReverseSearching] = React.useState(false);
    const [reverseSearchString, setReverseSearchString] = React.useState('');
    const reverseSearchOptions = React.useRef([]);
    const reverseSearchIndex = React.useRef(-1);
    const mountedRef = React.useRef(true);
    const commandOptions = React.useRef([]);
    const commandOptionsForcePopup = React.useRef(false);
    const [openSelectCommandDialog, setOpenSelectCommandDialog] = React.useState(false);
    const me = useReactiveVar(meState);
    const useDisplayParamsForCLIHistoryUserSetting = React.useRef(GetMythicSetting({setting_name: "useDisplayParamsForCLIHistory", default_value: true}));
    const hideTaskingContext = React.useRef(GetMythicSetting({setting_name: "hideTaskingContext", default_value: false}));
    const forwardOrBackwardTabIndex = (event, currentIndex, options) => {
        if(event.shiftKey){
            let newIndex = currentIndex - 1;
            if (newIndex < 0 ){
                newIndex = options.length - 1;
            }
            return newIndex;
        } else {
            return (currentIndex + 1) % options.length;
        }
    }
    useSubscription(subscriptionCallbackTokens, {
        variables: {callback_id: props.callback_id}, fetchPolicy: "network-only",
        shouldResubscribe: true,
        onData: ({data}) => {
            if(!mountedRef.current || !props.parentMountedRef.current){
                return;
            }
            tokenOptions.current = data.data.callbacktoken;
        }
      });
    useSubscription(contextSubscription, {
        variables: {callback_id: props.callback_id}, fetchPolicy: "network-only",
        shouldResubscribe: true,
        onData: ({data}) => {
            if(!mountedRef.current || !props.parentMountedRef.current){
                return;
            }
            setCallbackContext(data.data.callback_stream[0]);
        }
    });
    useSubscription(subscriptionTask, {
        variables: {callback_id: props.callback_id}, fetchPolicy: "network-only",
        shouldResubscribe: true,
        onData: ({data}) => {
            if(!mountedRef.current || !props.parentMountedRef.current){
                return;
            }
            const newTasks = data.data.task_stream.reduce( (prev, cur) => {
                let prevIndex = prev.findIndex(t => t.id === cur.id);
                if(prevIndex >= 0){
                    prev[prevIndex] = {...cur};
                    return [...prev];
                } else {
                    return [...prev, {...cur}];
                }
            }, [...taskOptions.current]);
            newTasks.sort((a,b) => a.id > b.id ? -1 : 1);
            taskOptions.current= newTasks;
            const filteredOptions = newTasks.filter( c => applyFilteringToTasks(c));
            setFilteredTaskOptions(filteredOptions);
        }
    });
    useSubscription(GetLoadedCommandsSubscription, {
        variables: {callback_id: props.callback_id}, fetchPolicy: "network-only",
        shouldResubscribe: true,
        onData: ({data}) => {
            if(!mountedRef.current || !props.parentMountedRef.current){
                return;
            }
            const cmds = data.data.loadedcommands.map( c => {
                let cmdData = {...c.command};
                cmdData.commandparameters.sort( (a,b) => a.ui_position > b.ui_position ? 1 : -1);
                return cmdData;
            })
            cmds.push({cmd: "help", description: "Get help for a command or info about loaded commands", commandparameters: [], attributes: {supported_os: []}});
            cmds.push({cmd: "clear", description: "Clear 'submitted' jobs from being pulled down by an agent", commandparameters: [], attributes: {supported_os: []}});
            cmds.sort((a,b) => a.cmd > b.cmd ? 1 : -1);
            loadedOptions.current = cmds;
        }
    });
    React.useEffect( () => {
        //console.log("filter updated")
        const filteredOptions = taskOptions.current.filter( c => applyFilteringToTasks(c));
        setFilteredTaskOptions(filteredOptions);
        let active = false;
        if(props.filterOptions?.commandsList?.length > 0){
            active = true;
        } else if(props.filterOptions?.commentsFlag){
            active = true;
        } else if(props.filterOptions?.everythingButList?.length > 0){
            active = true;
        } else if(props.filterOptions?.hideErrors){
            active = true;
        } else if(props.filterOptions?.operatorsList?.length > 0){
            active = true;
        } else if(props.filterOptions?.parameterString !== ""){
            active = true;
        }
        setActiveFiltering(active);
    }, [props.filterOptions])
    React.useEffect( () => {
        return() => {
            mountedRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const applyFilteringToTasks = (task) => {
        if(!props.filterTasks){return false}
        if(task.display_params.includes("help") && task.operator.username !== me.user.username){
            return false;
          }
          if(props.filterOptions === undefined){
            return true;
          }
          if(props.filterOptions["operatorsList"]?.length > 0){
            if(!props.filterOptions["operatorsList"]?.includes(task.operator.username)){
              return false;
            }
          }
          if(props.filterOptions["commentsFlag"]){
            if(task.comment === ""){
              return false;
            }
          }
          if(props.filterOptions["commandsList"]?.length > 0){
            // only show these commands
            if(!props.filterOptions["commandsList"]?.includes(GetCommandName(task))){
              return false;
            }
          }
          if(props.filterOptions["everythingButList"]?.length > 0){
            if(task.command !== null){
              if(props.filterOptions["everythingButList"]?.includes(GetCommandName(task))){
                return false;
              }
            }
          }
          if(props.filterOptions["parameterString"] !== ""){
            let regex = new RegExp(props.filterOptions["parameterString"]);
            if(!regex.test(task.display_params)){
              return false;
            }
          }
          return true;
    }
    const handleInputChange = (event) => {
        tabOptions.current = [];
        tabOptionsType.current = "param_name";
        tabOptionsIndex.current = 0;
        setMessage(event.target.value);
        if(event.target.value.length <= 1){
            setUnmodifiedHistoryValue("parsed_cli");
        }
    }
    const onKeyDown = (event) => {
        if(event.key === "Enter" && (event.ctrlKey || event.metaKey)){
            setMessage(message + "\n");
            return;
        }
        if(event.key === "r" && event.ctrlKey){
            //this means they typed ctrl+r, so they're wanting to do a reverse search for a command
            setReverseSearching(true);
            setMessage("");
            setReverseSearchString("");
            setUnmodifiedHistoryValue("parsed_cli");
            setCommandPayloadType("");
            event.stopPropagation();
            event.preventDefault();
            return;
        }
        if(event.key === "Tab" || (event.key === " " && event.shiftKey )){
            // if we're still typing the command, we want this to cycle through possible matching commands
            // if we have a command, this should cycle through parameter names that are required
            event.stopPropagation();
            event.preventDefault();
            setUnmodifiedHistoryValue("parsed_cli");
            if(message.includes(" ")){
                // this means we're not trying to help with the initial command since there's already a space in what the user typed
                // first find the command in question
                let cmd = loadedOptions.current.filter( l => l.cmd === message.split(" ")[0]);
                if(!cmd || cmd.length === 0){
                    setCommandPayloadType("");
                    snackActions.warning("unknown command", snackMessageStyles);
                    return
                }
                if(commandPayloadType === ""){
                    // default to the same payload type name as the callback if possible
                    let cmdOpts = cmd.find(c => c?.payloadtype?.name === props.payloadtype_name)
                    if(cmdOpts){
                        setCommandPayloadType(props.payloadtype_name);
                        cmd = cmdOpts;
                    } else {
                        setCommandPayloadType(cmd[0]?.payloadtype?.name || "");
                        cmd = cmd[0];
                    }

                } else {
                    cmd = cmd.find(c => c?.payloadtype?.name === commandPayloadType);
                    if(!cmd){
                        setCommandPayloadType("");
                        snackActions.warning("unknown command", snackMessageStyles);
                        return
                    }
                }
                //commandPayloadTypeRef.current = cmd.payloadtype.name;
                if(cmd.cmd === "help"){
                    // somebody hit tab with either a blank message or a partial word
                    let helpCmd = message.split(" ");
                    if (helpCmd.length > 1) {
                        helpCmd = helpCmd[1];
                    } else {
                        helpCmd = "";
                    }
                    if(tabOptions.current.length === 0){
                        let opts = loadedOptions.current.filter( l => l.cmd.toLowerCase().startsWith(helpCmd.toLocaleLowerCase()) && (l.attributes.supported_os.length === 0 || l.attributes.supported_os.includes(props.callback_os)));
                        tabOptions.current = opts;
                        tabOptionsType.current = "param_name";
                        tabOptionsIndex.current = 0;
                        if(opts.length > 0){
                            setMessage("help " + opts[0].cmd);
                        }
                    }else{
                        let newIndex = forwardOrBackwardTabIndex(event, tabOptionsIndex.current, tabOptions.current);
                        tabOptionsIndex.current = newIndex;
                        setMessage("help " + tabOptions.current[newIndex].cmd);
                    }
                    return;
                }
                console.log(cmd.commandparameters);
                if(cmd.commandparameters.length > 0){
                    if(message[message.length -1] === " "){
                        // somebody hit tab after a parameter name or after a parameter value
                        const parsed = parseCommandLine(message, cmd);
                        if(parsed === undefined){
                            return;
                        }
                        const cmdGroupNames = determineCommandGroupName(cmd, parsed);
                        if(cmdGroupNames === undefined){
                            snackActions.warning("Two or more of the specified parameters can't be used together", snackMessageStyles);
                            return;
                        }
                        const [lastSuppliedParameter, lastSuppliedParameterHasValue] = getLastSuppliedArgument(cmd, message, parsed);
                        console.log("lastSuppliedParameter", lastSuppliedParameter, "has_value", lastSuppliedParameterHasValue);
                        lastValueTypedBeforeDynamicParamsRef.current = lastSuppliedParameterHasValue;
                        if (lastSuppliedParameter !== undefined && parsed[lastSuppliedParameter.cli_name] !== undefined && lastSuppliedParameterHasValue === ""){
                            if (lastSuppliedParameter.choices.length > 0){
                                const choices = lastSuppliedParameter.choices.filter( c => {
                                    if(c.toLowerCase().includes(lastValueTypedBeforeDynamicParamsRef.current.toLowerCase())){
                                        return c;
                                    }
                                })
                                tabOptions.current = choices;
                                tabOptionsIndex.current = 0;
                                tabOptionsType.current = "param_value";
                                let newChoice = choices[0].includes(" ") ? "\"" + choices[0] + "\"" : choices[0];
                                let newMsg = message.substring(0, message.length - lastValueTypedBeforeDynamicParamsRef.current.length) + newChoice;
                                setMessage(newMsg);
                                return;
                            } else if(lastSuppliedParameter.dynamic_query_function !== ""){
                                setBackdropOpen(true);
                                //snackActions.info("Querying payload type container for options...",   snackMessageStyles);
                                getDynamicParams({variables:{
                                        callback: props.callback_id,
                                        parameter_name: lastSuppliedParameter.name,
                                        command: cmd.cmd,
                                        payload_type: cmd.payloadtype.name
                                    }});
                                return;
                            }
                        }
                        console.log("cmdGroupNames in tab", cmdGroupNames);
                        for(let i = 0; i < cmd.commandparameters.length; i++){
                            if(cmd.commandparameters[i]["required"] &&
                                (!(cmd.commandparameters[i]["cli_name"] in parsed) || (IsRepeatableCLIParameterType(cmd.commandparameters[i]["parameter_type"])) ) &&
                                IsCLIPossibleParameterType(cmd.commandparameters[i]["parameter_type"]) &&
                                (cmdGroupNames.includes(cmd.commandparameters[i]["parameter_group_name"]) || cmdGroupNames.length === 0)){
                                const newMsg = message.trim() + " -" + cmd.commandparameters[i]["cli_name"];
                                setMessage(newMsg);
                                return;
                            }
                        }
                        for(let i = 0; i < cmd.commandparameters.length; i++){
                            if(!cmd.commandparameters[i]["required"] &&
                                (!(cmd.commandparameters[i]["cli_name"] in parsed) || (IsRepeatableCLIParameterType(cmd.commandparameters[i]["parameter_type"])) ) &&
                                IsCLIPossibleParameterType(cmd.commandparameters[i]["parameter_type"]) &&
                                (cmdGroupNames.includes(cmd.commandparameters[i]["parameter_group_name"]) || cmdGroupNames.length === 0)){
                                const newMsg = message.trim() + " -" + cmd.commandparameters[i]["cli_name"];
                                setMessage(newMsg);
                                return;
                            }
                        }
                    }else{
                        // somebody hit tab when looking at something like `shell dj` or `shell -command`
                        // so, we should check if the last word is a -CommandParameterName and if so, determine other parameters to replace it
                        // if we're looking at the first option, do nothing until they hit space
                        if(tabOptions.current.length > 0){
                            let newIndex = forwardOrBackwardTabIndex(event, tabOptionsIndex.current, tabOptions.current);
                            if(tabOptionsType.current === "param_name"){
                                tabOptionsIndex.current = newIndex;
                                let newMessage = message.split(" ").slice(0, -1).join(" ") + " -" + tabOptions.current[newIndex];
                                setMessage(newMessage);
                            }else if(tabOptionsType.current === "param_value"){
                                let oldChoice = tabOptions.current[tabOptionsIndex.current].includes(" ") ? "\"" + tabOptions.current[tabOptionsIndex.current] + "\"" : tabOptions.current[tabOptionsIndex.current];
                                let newChoice =tabOptions.current[newIndex].includes(" ") ? "\"" + tabOptions.current[newIndex] + "\"" : tabOptions.current[newIndex];
                                let newMessage = message.substring(0, message.length - oldChoice.length);
                                tabOptionsIndex.current = newIndex;
                                newMessage += newChoice;
                                setMessage(newMessage);
                            }
                            return;
                        }
                        const pieces = message.split(" ");
                        const lastFlag = pieces.slice(-1)[0];
                        // determine if this last thing we see is a flag or not
                        if(lastFlag.startsWith("-")){
                            // the last thing we see starts with - and doesn't have a space at the end, so treat this like a tab-completable command parameter
                            // so we need to remove it and see what group we're dealing with so far
                            const parsed = parseCommandLine(pieces.slice(0, -1).join(" "), cmd);
                            const cmdGroupNames = determineCommandGroupName(cmd, parsed);
                            if(cmdGroupNames === undefined){
                                snackActions.warning("Two or more of the specified parameters can't be used together", snackMessageStyles);
                                return;
                            }
                            // determine if we're looking at a valid flag name in lastFlag or if it's simply the start of a flag
                            //console.log("swapping parameter name, group options: ", cmdGroupNames);
                            let exactMatch = cmd.commandparameters.find(cur => 
                                cmdGroupNames.includes(cur.parameter_group_name) && 
                                cur.cli_name === lastFlag.slice(1) &&
                                IsCLIPossibleParameterType(cur.parameter_type) &&
                                (!(cur.cli_name in parsed) || (IsRepeatableCLIParameterType(cur.parameter_type)) )
                            );
                            let paramOptions = [];
                            if(exactMatch){
                                // what the user typed or what we filled out is an exact match to a parameter name
                                // the options should be all parameters in that group except for the ones already supplied in parsed
                                paramOptions = cmd.commandparameters.reduce( (prev, cur) => {
                                    if(cmdGroupNames.includes(cur.parameter_group_name) && 
                                        cur.cli_name !== lastFlag.slice(1) &&
                                        IsCLIPossibleParameterType(cur.parameter_type) &&
                                        (!(cur.cli_name in parsed) || (IsRepeatableCLIParameterType(cur.parameter_type)) ) ){
                                        return [...prev, cur.cli_name];
                                    }else{
                                        return [...prev];
                                    }
                                }, []);
                                paramOptions.push(lastFlag.slice(1));
                            }else{
                                // what the user typed isn't an exact match, so find things that start with what they're trying to type
                                paramOptions = cmd.commandparameters.reduce( (prev, cur) => {
                                    if(cmdGroupNames.includes(cur.parameter_group_name) && 
                                        cur.cli_name.toLowerCase().includes(lastFlag.slice(1).toLocaleLowerCase()) &&
                                        IsCLIPossibleParameterType(cur.parameter_type) &&
                                        (!(cur.cli_name in parsed) || (IsRepeatableCLIParameterType(cur.parameter_type)) ) ){
                                        return [...prev, cur.cli_name];
                                    }else{
                                        return [...prev];
                                    }
                                }, []);
                            }
                            paramOptions = paramOptions.reduce( (prev, cur) => {
                                if(prev.includes(cur)){
                                    return [...prev];
                                }else{
                                    return [...prev, cur];
                                }
                            }, [])
                            if(paramOptions.length > 0){
                                if(paramOptions.length === 1){
                                    tabOptions.current = [];
                                    tabOptionsType.current = "param_name";
                                    tabOptionsIndex.current = 0;
                                    let newMsg = pieces.slice(0,-1).join(" ") + " -" + paramOptions[0];
                                    setMessage(newMsg);
                                }else{
                                    tabOptions.current = paramOptions;
                                    tabOptionsType.current = "param_name";
                                    tabOptionsIndex.current = 0;
                                    let newMsg = pieces.slice(0,-1).join(" ") + " -" + paramOptions[0];
                                    setMessage(newMsg);
                                }
                                return;
                            }else{
                                snackActions.warning("Unknown Parameter Name", snackMessageStyles);
                                return;
                            }
                        }else{
                            // the last thing doesn't start with -, so we're just looking at text, do nothing for now
                            const parsed = parseCommandLine(message, cmd);
                            if(parsed === undefined){
                                return;
                            }
                            const cmdGroupNames = determineCommandGroupName(cmd, parsed);
                            if(cmdGroupNames === undefined){
                                snackActions.warning("Two or more of the specified parameters can't be used together", snackMessageStyles);
                                return;
                            }
                            const [lastSuppliedParameter, lastSuppliedParameterHasValue] = getLastSuppliedArgument(cmd, message, parsed);
                            console.log("lastSuppliedParameter", lastSuppliedParameter)
                            lastValueTypedBeforeDynamicParamsRef.current = lastSuppliedParameterHasValue;
                            if (lastSuppliedParameter !== undefined && parsed[lastSuppliedParameter.cli_name] !== undefined){
                                if (lastSuppliedParameter.choices.length > 0){
                                    const choices = lastSuppliedParameter.choices.filter( c => {
                                        if(c.toLowerCase().includes(lastValueTypedBeforeDynamicParamsRef.current.toLowerCase())){
                                            return c;
                                        }
                                    })
                                    tabOptions.current = choices;
                                    tabOptionsIndex.current = 0;
                                    tabOptionsType.current = "param_value";
                                    let newChoice = choices[0].includes(" ") ? "\"" + choices[0] + "\"" : choices[0];
                                    let newMsg = message.substring(0, message.length - lastValueTypedBeforeDynamicParamsRef.current.length) + newChoice;
                                    setMessage(newMsg);
                                    return;
                                } else if(lastSuppliedParameter.dynamic_query_function !== ""){
                                    setBackdropOpen(true);
                                    //snackActions.info("Querying payload type container for options...",   snackMessageStyles);
                                    getDynamicParams({variables:{
                                            callback: props.callback_id,
                                            parameter_name: lastSuppliedParameter.name,
                                            command: cmd.cmd,
                                            payload_type: cmd.payloadtype.name
                                        }});
                                    return;
                                }
                            }
                            return;
                        }
                        
                    }
                    
                    snackActions.info("No more arguments for command", snackMessageStyles);
                }else{
                    snackActions.info("No arguments for command", snackMessageStyles);
                }
                
            }else{
                // somebody hit tab with either a blank message or a partial word
                if(tabOptions.current.length === 0){
                    let opts = loadedOptions.current.filter( l => l.cmd.toLowerCase().includes(message.toLocaleLowerCase()) && (l.attributes.supported_os.length === 0 || l.attributes.supported_os.includes(props.callback_os)));
                    tabOptionsType.current = "param_name";
                    tabOptionsIndex.current = 0;
                    let startsWithOpts = opts.filter(s => s.cmd.startsWith(message.toLocaleLowerCase()));
                    let includesOpts = opts.filter(s => {
                        for(let i = 0; i < startsWithOpts.length; i++){
                            if(startsWithOpts[i].cmd === s.cmd){
                                return false;
                            }
                        }
                        return true;
                    })
                    opts = [...startsWithOpts, ...includesOpts];
                    tabOptions.current = opts;
                    if(opts.length > 0){
                        setMessage(opts[0].cmd);
                        setCommandPayloadType(opts[0]?.payloadtype?.name || "");
                    }
                }else{
                    let newIndex = forwardOrBackwardTabIndex(event, tabOptionsIndex.current, tabOptions.current);
                    tabOptionsIndex.current = newIndex;
                    setMessage(tabOptions.current[newIndex].cmd);
                    setCommandPayloadType(tabOptions.current[newIndex]?.payloadtype?.name || "");
                }
            }
        }else if(event.key === "Enter"){
            if(event.shiftKey){
                onSubmitCommandLine(event, true);
            }else{
                onSubmitCommandLine(event, false);
            }
            
        }else if(event.key === "ArrowUp"){
            event.preventDefault();
            event.stopPropagation();
            if(filteredTaskOptions.length === 0){
                snackActions.warning("No previous tasks", snackMessageStyles);
                return;
            }else{
                
                let newIndex = (taskOptionsIndex.current + 1);
                if(newIndex > filteredTaskOptions.length -1){
                    newIndex = filteredTaskOptions.length -1;
                }
                taskOptionsIndex.current = newIndex;
                setMessage(GetUpDownArrowName(filteredTaskOptions[newIndex], useDisplayParamsForCLIHistoryUserSetting.current));
                setUnmodifiedHistoryValue(filteredTaskOptions[newIndex].tasking_location);
                setCommandPayloadType(filteredTaskOptions[newIndex]?.command?.payloadtype?.name || "");
            }
        }else if(event.key === "ArrowDown"){
            if(filteredTaskOptions.length === 0){
                snackActions.warning("No previous tasks", snackMessageStyles);
                return;
            }else{
                let newIndex = (taskOptionsIndex.current - 1);
                if(newIndex < 0){
                    newIndex = 0;
                }
                taskOptionsIndex.current = newIndex;
                setMessage(GetUpDownArrowName(filteredTaskOptions[newIndex], useDisplayParamsForCLIHistoryUserSetting.current));
                setUnmodifiedHistoryValue(filteredTaskOptions[newIndex].tasking_location);
                setCommandPayloadType(filteredTaskOptions[newIndex]?.command?.payloadtype?.name || "");
            }
        }else if(!event.shiftKey){
            tabOptions.current = [];
            tabOptionsType.current = "param_name";
            tabOptionsIndex.current = 0;
            if(taskOptionsIndex.current !== -1){
                taskOptionsIndex.current = -1;
            }
        }
        if(message === "" && tabOptions.current.length === 0){
            setCommandPayloadType("");
        }
    }
    const parseToArgv = (str) => {
        const res = [];

        if(!str || typeof str !== 'string') return res;

        let sQuoted = false;
        let dQuoted = false;
        let backslash = false;
        let buffer = '';

        str.split('').forEach((value, i, s) => {
            //loop over every value in the string
            //console.log(value);
            if(value === "\\"){
                if(!backslash){
                    backslash = true;
                    return;
                } else {
                    backslash = false;
                    buffer += "\\\\"
                    return;
                }
                
            }
            if(!sQuoted && !dQuoted){
                //console.log("not sQuoted and not dQuoted");
                if(value === `'`){
                    if(backslash){
                        backslash = false;
                        buffer += "'";
                        return;
                    }
                    sQuoted = true;
                    buffer += value;
                    return;
                }
                else if(value === '"'){
                    if(backslash){
                        backslash = false;
                        buffer += '"';
                        return;
                    }
                    dQuoted = true;
                    //console.log("double quoted now, skipping char: ", value);
                    buffer += value;
                    return;
                }
                else if(value === " "){
                    if(backslash){
                        backslash = false;
                        //buffer += " ";
                        buffer += "\\";
                        //return;
                    }
                    if(buffer.length > 0){
                        if(buffer[buffer.length-1] === buffer[0] && [`'`, `"`].includes(buffer[0])){
                            //console.log("stripping off surrounding ' or \" for ", buffer)
                            res.push(buffer.slice(1, -1))
                        }else{
                            //console.log("not stripping off for", buffer);
                            res.push(buffer);
                        }
                        //console.log("pushed to buffer:", buffer);
                    }
                    buffer = '';
                    return;
                }
            }
            if(sQuoted && value === `'`){
                // if we're already inside of an explicit single quote and see another single quote, then we're not quoted anymore
                if(backslash){
                    buffer += "'";
                    backslash = false;
                    return;
                }
                sQuoted = false;
                if(buffer.length > 0 ){
                    buffer += value;
                }else{
                    buffer += value + value;
                }
                return;
            }
            if(dQuoted && value === `"`){
                if(backslash){
                    buffer += '"';
                    backslash = false;
                    return;
                }
                dQuoted = false;
                if(buffer.length > 0){
                    buffer += value;
                }else{
                    buffer += value + value;
                }
                return;
            }
            //console.log("adding to buffer: ", value);
            if(backslash){
                buffer += `\\${value}`;
                backslash = false;
            }else{
                buffer += value;
            }
            
        });
        if(backslash){
            buffer += "\\"; // try to account for a trailing \
        }
        if(buffer.length > 0){
            //console.log("pushed end buffer: ", buffer);
            if(buffer[buffer.length-1] === buffer[0] && [`'`, `"`].includes(buffer[0])){
                //console.log("stripping off surrounding ' or \" for ", buffer)
                res.push(buffer.slice(1, -1))
            }else{
                //console.log("not stripping off for", buffer);
                res.push(buffer);
            }
        }
        if(dQuoted) throw new SyntaxError('unexpected end of string while looking for matching double quote');
        if(sQuoted) throw new SyntaxError('unexpected end of string while looking for matching single quote');
        return res;
    }
    const parseArgvToDict = (argv, cmd) => {
        let stringArgs = [];
        let booleanArgs = [];
        let arrayArgs = [];
        let typedArrayArgs = [];
        let numberArgs = [];
        let fileArgs = [];
        let complexArgs = [];
        let allCLINames = [];
        for(let i = 0; i < cmd.commandparameters.length; i++){
            allCLINames.push("-" + cmd.commandparameters[i].cli_name);
            switch(cmd.commandparameters[i].parameter_type){
                case "ChooseOne":
                case "ChooseOneCustom":
                case "String":
                    stringArgs.push("-" + cmd.commandparameters[i].cli_name);
                    break;
                case "Number":
                    numberArgs.push("-" + cmd.commandparameters[i].cli_name);
                    break;
                case "Boolean":
                    booleanArgs.push("-" + cmd.commandparameters[i].cli_name);
                    break;
                case "Array":
                case "ChooseMultiple":
                    arrayArgs.push("-" + cmd.commandparameters[i].cli_name);
                    break;
                case "TypedArray":
                    typedArrayArgs.push("-" + cmd.commandparameters[i].cli_name);
                    break;
                case "File":
                    fileArgs.push("-" + cmd.commandparameters[i].cli_name);
                    break;
                default:
                    complexArgs.push("-" + cmd.commandparameters[i].cli_name);
            }
        }
        let result = {"_": []};
        let current_argument = "";
        let current_argument_type = "";
        for(let i = 0; i < argv.length; i++){
            let value = argv[i];
            if(current_argument === ""){
                // not currently processing the value for an argument
                // check to see if this is the start of a new argument
                // or a positional argument
                if(stringArgs.includes(value)){
                    current_argument_type = "string";
                    current_argument = value;
                    if(i === argv.length-1){
                        // special case where somebody did -flag at the end of the command
                        result[value.slice(1)] = GetDefaultValueForType(current_argument_type);
                    }
                }else if(booleanArgs.includes(value)){
                    current_argument_type = "boolean";
                    if(i === argv.length-1){
                        // special case where somebody did -flag at the end of the command
                        result[value.slice(1)] =  GetDefaultValueForType(current_argument_type);
                    }
                    current_argument = value;
                }else if(arrayArgs.includes(value)) {
                    current_argument_type = "array";
                    current_argument = value;
                    if(i === argv.length-1){
                        // special case where somebody did -flag at the end of the command
                        result[value.slice(1)] =  GetDefaultValueForType(current_argument_type);
                    }
                } else if(typedArrayArgs.includes(value)){
                    current_argument_type = "typedArray";
                    current_argument = value;
                    if(i === argv.length-1){
                        // special case where somebody did -flag at the end of the command
                        result[value.slice(1)] =  GetDefaultValueForType(current_argument_type);
                    }
                }else if(numberArgs.includes(value)) {
                    current_argument_type = "number";
                    current_argument = value;
                    if (i === argv.length - 1) {
                        // special case where somebody did -flag at the end of the command
                        result[value.slice(1)] =  GetDefaultValueForType(current_argument_type);
                    }
                }else if(fileArgs.includes(value)) {
                    current_argument_type = "file";
                    current_argument = value;
                    if (i === argv.length - 1) {
                        // special case where somebody did -flag at the end of the command
                        result[value.slice(1)] =  GetDefaultValueForType(current_argument_type);
                    }
                }else if(complexArgs.includes(value)){
                    current_argument_type = "complex";
                    current_argument = value;
                    if (i === argv.length - 1) {
                        // special case where somebody did -flag at the end of the command
                        result[value.slice(1)] =  GetDefaultValueForType(current_argument_type);
                    }
                } else {
                    // we don't have this as a named argument, so we'll process it as a positional one
                    result["_"].push(value);
                    current_argument = "";
                    current_argument_type = "";
                }
            } else {
                // we have a named argument that we just saw, so interpret this as that argument's value
                if(allCLINames.includes(value)){
                    if(result[current_argument.slice(1)] === undefined) {
                        result[current_argument.slice(1)] = GetDefaultValueForType(current_argument_type);
                    }
                    current_argument = "";
                    current_argument_type = "";
                    i -= 1;
                    continue;
                }
                switch(current_argument_type){
                    case "string":
                        result[current_argument.slice(1)] = value;
                        current_argument = "";
                        current_argument_type = "";
                        break;
                    case "file":
                        if(uuidValidate(value)){
                            result[current_argument.slice(1)] = value;
                            current_argument = "";
                            current_argument_type = "";
                            break;
                        }
                        snackActions.warning("File type value must be UUID of uploaded file: " + value, snackMessageStyles);
                        return undefined;
                    case "boolean":
                        if(["false", "true"].includes(value.toLowerCase())){
                            if(value.toLowerCase() === "false"){
                                result[current_argument.slice(1)] = false;
                            } else {
                                result[current_argument.slice(1)] = true;
                            }
                        }else{
                            // we see something like `-flag bob`, so interpret this as `-flag true bob`
                            result[current_argument.slice(1)] = true;
                        }
                        current_argument = "";
                        current_argument_type = "";
                        break;
                    case "number":
                        try{
                            let num = Number(value);
                            if(isNaN(num)){
                                snackActions.warning("Failed to parse number: " + value, snackMessageStyles);
                                return undefined;
                            }
                            result[current_argument.slice(1)] = num;
                        }catch(error){
                            snackActions.warning("Failed to parse number: " + error, snackMessageStyles);
                            return undefined;
                        }
                        current_argument = "";
                        current_argument_type = "";
                        break;
                    case "typedArray":
                        // in this case, it's not as easy as just parsing a single value
                        // this will be a greedy match until the value matches another named argument
                        if(stringArgs.includes(value)){
                            current_argument_type = "string";
                            current_argument = value;
                        }else if(booleanArgs.includes(value)){
                            current_argument_type = "boolean";
                            current_argument = value;
                        }else if(arrayArgs.includes(value)){
                            current_argument_type = "typedArray";
                            current_argument = value;
                        }else if(numberArgs.includes(value)){
                            current_argument_type = "number";
                            current_argument = value;
                        } else {
                            if(result[current_argument.slice(1)] === undefined){
                                result[current_argument.slice(1)] = [["",value]];
                            } else {
                                result[current_argument.slice(1)].push( ["", value]);
                            }
                        }
                        break;
                    case "array":
                        // in this case, it's not as easy as just parsing a single value
                        // this will be a greedy match until the value matches another named argument
                        if(stringArgs.includes(value)){
                            current_argument_type = "string";
                            current_argument = value;
                        }else if(booleanArgs.includes(value)){
                            current_argument_type = "boolean";
                            current_argument = value;
                        }else if(arrayArgs.includes(value)){
                            current_argument_type = "array";
                            current_argument = value;
                        }else if(numberArgs.includes(value)){
                            current_argument_type = "number";
                            current_argument = value;
                        } else {
                            if(result[current_argument.slice(1)] === undefined){
                                result[current_argument.slice(1)] = [value]
                            } else {
                                result[current_argument.slice(1)].push(value);
                            }
                        }
                        break;
                    case "complex":
                        try{
                            result[current_argument.slice(1)] = JSON.parse(value);
                        }catch(error){
                            result[current_argument.slice(1)] = value;
                        }
                        current_argument = "";
                        current_argument_type = "";
                        break;
                    default:
                        break;
                }
            }
        };
        return result;
    }
    const getLastSuppliedArgument = (cmd, command_line, yargs) => {
        let new_command_line = command_line;
        let last_command_parameter = undefined;
        const argv = parseToArgv(new_command_line);
        let has_value = false;
        for(let i = argv.length-1; i >= 0; i --){
            for(let j = 0; j < cmd.commandparameters.length; j++){
                if(`-${cmd.commandparameters[j].cli_name}` === argv[i]){
                    last_command_parameter = cmd.commandparameters[j];
                    has_value = i !== argv.length -1;
                    return [last_command_parameter, has_value ? argv[argv.length-1] : ""];
                }
            }
        }
        return [last_command_parameter, has_value ? argv[argv.length-1] : ""];
    }
    const parseCommandLine = (command_line, cmd) => {
        // given a command line and the associated command
        
        if(command_line.length > 0 && command_line[0] === "{"){
            try{
                let json_arguments = JSON.parse(command_line);
                json_arguments["_"] = [];
                return json_arguments;
            }catch(error){
                //looks like JSON, but doesn't parse like JSON
                snackActions.warning("Failed to parse custom JSON command line: " + error, snackMessageStyles);
                return undefined;
            }
        }
        
        try{
            let new_command_line = command_line;//.replaceAll("\\", "\\\\");
            //console.log("new_command_line", new_command_line);
            const argv = parseToArgv(new_command_line);
            console.log("argv", argv, "command_line", new_command_line);
            const yargs_parsed = parseArgvToDict(argv, cmd);
            console.log("yargs_parsed", yargs_parsed);
            return yargs_parsed;
        }catch(error){
            snackActions.warning("Failed to parse command line: " + error, snackMessageStyles);
            return undefined;
        }
    }
    const simplifyGroupNameChoices = (groupNames, cmd, parsed) => {
        // for each option in groupNames, see if we have all the required parameters
        // if there's 2+ options that meet all requirements, then we don't know which to do
        // if there's 1 option that meets all requirements and 1+ that still needs more, pick the first
        let finalGroupNames = [];
        for(let i = 0; i < groupNames.length; i++){
            let currentGroupName = groupNames[i];
            let foundAllRequired = true;
            for(let j = 0; j < cmd.commandparameters.length; j++){
                if(cmd.commandparameters[j]["parameter_group_name"] === currentGroupName){
                    if(cmd.commandparameters[j].required && (parsed[cmd.commandparameters[j].cli_name] === undefined &&
                    parsed[cmd.commandparameters[j].name] === undefined)){
                        foundAllRequired = false;
                    }
                }
            }
            if(foundAllRequired){
                finalGroupNames.push(currentGroupName);
            }
        }
        console.log(finalGroupNames)
        if(finalGroupNames.length === 0){
            return "";
        } else if(finalGroupNames.length === 1){
            return finalGroupNames[0];
        } else {
            return "";
        }
    }
    const determineCommandGroupName = (cmd, parsed) => {
        if(cmd.commandparameters.length === 0){
            return [];
        }
        if(!parsed){
            return [];
        }
        let cmdGroupOptions = cmd.commandparameters.reduce( (prev, cur) => {
            if(prev.includes(cur.parameter_group_name)){
                return [...prev];
            }
            return [...prev, cur.parameter_group_name];
        }, []);
        for(const key of Object.keys(parsed)){
            // for all the things we've parsed out so far, determine their parameter groups
            if( key !== "_"){
                // we don't care about positional arguments at the moment
                let paramGroups = [];
                let foundParamGroup = false;
                for(let i = 0; i < cmd.commandparameters.length; i++){
                    //console.log(cmd.commandparameters[i], key)
                    if(cmd.commandparameters[i]["cli_name"] === key || cmd.commandparameters[i]["display_name"] === key || cmd.commandparameters[i]["name"] === key){
                        foundParamGroup = true;
                        paramGroups.push(cmd.commandparameters[i]["parameter_group_name"])
                    }
                }
                // now paramGroups has all the group names associated with `key`
                // we have some set of possible options, so we need to find the intersection with paramGroups and cmdGroupOptions
                //console.log(cmdGroupOptions, paramGroups)
                let intersection = cmdGroupOptions.reduce( (prev, cur) => {
                    if(paramGroups.includes(cur)){
                        return [...prev, cur];
                    }
                    return [...prev];
                }, [])
                if(intersection.length === 0){
                    // this is a bad thing, we did an intersection and there's no similar parameter groups, but parameters have been supplied
                    // account for the scenario where we essentially have "extra" parameters supplied - extra ones don't count against you
                    if(foundParamGroup){
                        return undefined;
                    }
                } else {
                    cmdGroupOptions = [...intersection];
                }

            }
        }
        // now cmdGroupOptions is a list of all the matching parameter_group_names for the commandline arguments we've specified
        console.log("cmdGroupOptions", cmdGroupOptions)
        return cmdGroupOptions;
    }
    const fillOutPositionalArguments = (cmd, parsed, groupNames) => {
        let parsedCopy = {...parsed};
        parsedCopy["_"].shift(); // get rid of the command name from this list of arguments.
        if(cmd.commandparameters.length === 0){
            return parsedCopy;
        }
        if(groupNames.length === 0){
            return parsedCopy;
        }
        let usedGroupName = groupNames[0];
        if(groupNames.includes("Default")){
            usedGroupName = "Default";
        }
        // figure out how to deal with positional parameters
        const groupParameters = cmd.commandparameters.filter(c => c.parameter_group_name === usedGroupName);
        groupParameters.sort((a,b) => a.ui_position < b.ui_position ? -1 : 1);
        // now we have all of the parameters and they're sorted by `ui_position`
        console.log("groupParameters", groupParameters);
        let unSatisfiedArguments = [];
        for(let i = 0; i < groupParameters.length; i++){
            if( !(groupParameters[i]["cli_name"] in parsedCopy)){
                // this parameter hasn't been supplied yet, track it
                unSatisfiedArguments.push(groupParameters[i]); 
            }
        }
        // now iterate over the unsatisfied arguments and add in the positional parameters
        //console.log("unsatisfiedParameters", unSatisfiedArguments)
        for(let i = 0; i < unSatisfiedArguments.length; i++){
            // we cut this short by one so that the last unSatisifedArgument can do a greedy matching for the rest of what was supplied
            // this parameter hasn't been supplied yet, check if we have any positional parameters in parsedCopy["_"]
            if(parsedCopy["_"].length > 0){
                let temp = parsedCopy["_"].shift();
                switch(unSatisfiedArguments[i]["parameter_type"]){
                    case "ChooseOne":
                    case "ChooseOneCustom":
                    case "String":
                        parsedCopy[unSatisfiedArguments[i]["cli_name"]] = temp;
                        break;
                    case "Number":
                        try{
                            temp = Number(temp);
                            if(isNaN(temp)){
                                snackActions.warning("Failed to parse number: " + temp, snackMessageStyles);
                                return undefined;
                            }
                            parsedCopy[unSatisfiedArguments[i]["cli_name"]] = temp;
                        }catch(error){
                            snackActions.warning("Failed to parse number: " + error, snackMessageStyles);
                            return undefined;
                        }
                        break;
                    case "Boolean":
                        if(temp.toLowerCase() === "false"){
                            parsedCopy[unSatisfiedArguments[i]["cli_name"]] = false;
                        } else if(temp.toLowerCase() === "true"){
                            parsedCopy[unSatisfiedArguments[i]["cli_name"]] = true;
                        } else {
                            snackActions.warning("Failed to parse boolean: " + temp, snackMessageStyles);
                            return undefined;
                        }
                        break;
                    case "Array":
                    case "TypedArray":
                    case "FileMultiple":
                    case "ChooseMultiple":
                        if(parsedCopy[unSatisfiedArguments[i]["cli_name"]]){
                            parsedCopy[unSatisfiedArguments[i]["cli_name"]].push(temp);
                        } else {
                            parsedCopy[unSatisfiedArguments[i]["cli_name"]] = [temp];
                        }
                        i -= 1;
                        break;
                    default:
                        parsedCopy[unSatisfiedArguments[i]["cli_name"]] = temp;
                        break;
                }
            } else {
                break;
            }
        }
        //console.log("unsatisfied filled, but still some args", JSON.parse(JSON.stringify(parsedCopy)))
        if(unSatisfiedArguments.length > 0 && parsedCopy["_"].length > 0){
            //parsedCopy["_"] = parsedCopy["_"].map( c => typeof(c) === "string" && c.includes(" ") ? "\"" + c + "\"" : c);
            let temp = ""; //parsedCopy["_"].join(" ");
            // we need to keep inner quotes if they existed as we re-join things together
            let negativeIndex = message.length;
            for(let pci = parsedCopy["_"].length -1; pci >= 0; pci--){
                let startIndex = message.lastIndexOf(parsedCopy["_"][pci], negativeIndex);
                // now check if startIndex -1 == ' or " and startIndex + parsedCopy["_"][pci].length + 1 == ' or "
                negativeIndex = startIndex - 1; // update the negative index to move further 
                if(message[startIndex-1] === "'"){
                    if(startIndex + parsedCopy["_"][pci].length + 1 < message.length){
                        if(message[startIndex + parsedCopy["_"][pci].length + 1] === "'"){
                            temp = "'" + parsedCopy["_"][pci] + "' " + temp;
                        }
                    }else{
                        console.log("mismatched quotes?", message[startIndex-1], message[startIndex + parsedCopy["_"][pci].length + 1])
                    }
                }else if(message[startIndex -1] === '"'){
                    if(startIndex + parsedCopy["_"][pci].length  < message.length){
                        if(message[startIndex + parsedCopy["_"][pci].length ] === '"'){
                            temp = '"' + parsedCopy["_"][pci] + '" ' + temp;
                        }
                    }else{
                        console.log("mismatched quotes?", message[startIndex-1], message[startIndex + parsedCopy["_"][pci].length ])
                    }
                }else{
                    temp = parsedCopy["_"][pci] + " " + temp;
                }
                temp = temp.trim();
            }
            switch(unSatisfiedArguments[unSatisfiedArguments.length -1]["parameter_type"]){
                case "ChooseOne":
                case "ChooseOneCustom":
                case "String":
                    parsedCopy[unSatisfiedArguments[unSatisfiedArguments.length -1]["cli_name"]] += " " + temp;
                    break;
                case "Number":
                    try{
                        temp = Number(temp);
                        if(isNaN(temp)){
                            snackActions.warning("Failed to parse number: " + temp, snackMessageStyles);
                            return undefined;
                        }
                        parsedCopy[unSatisfiedArguments[unSatisfiedArguments.length -1]["cli_name"]] = temp;
                    }catch(error){
                        snackActions.warning("Failed to parse number: " + error, snackMessageStyles);
                        return undefined;
                    }
                    break;
                case "Boolean":
                    if(temp.toLowerCase() === "false"){
                        parsedCopy[unSatisfiedArguments[unSatisfiedArguments.length -1]["cli_name"]] = false;
                    } else if(temp.toLowerCase() === "true"){
                        parsedCopy[unSatisfiedArguments[unSatisfiedArguments.length -1]["cli_name"]] = true;
                    } else {
                        snackActions.warning("Failed to parse boolean: " + temp, snackMessageStyles);
                        return undefined;
                    }
                    break;
                case "Array":
                case "TypedArray":
                case "FileMultiple":
                case "ChooseMultiple":
                    parsedCopy[unSatisfiedArguments[unSatisfiedArguments.length -1]["cli_name"]] =
                        [parsedCopy[unSatisfiedArguments[unSatisfiedArguments.length -1]["cli_name"]], ...parsedCopy["_"]];
                    break;
                default:
                    parsedCopy[unSatisfiedArguments[unSatisfiedArguments.length -1]["cli_name"]] = temp;
                    break;
            }
            parsedCopy["_"] = [];
        }
        
        return parsedCopy;

    }
    const processCommandAndCommandLine = (cmd) => {
        if(commandOptionsForcePopup.current && cmd.commandparameters.length === 0){
            snackActions.info("No defined parameters for " +
                cmd?.cmd + "( " + cmd?.payloadtype?.name + "), so no modal available", snackMessageStyles);
            return;
        }
        let splitMessage = message.trim().split(" ");
        let cmdGroupName = ["Default"];
        let parsedWithPositionalParameters = {};
        let params = splitMessage.slice(1).join(" ");
        let failed_json_parse = true;
        try{
            parsedWithPositionalParameters = JSON.parse(params);
            if(['string', 'number', 'boolean', null].includes(typeof parsedWithPositionalParameters)){
                throw("failed to parse json");
            }
            cmdGroupName = determineCommandGroupName(cmd, parsedWithPositionalParameters);
            if(cmdGroupName !== undefined){
                cmdGroupName.sort()
            } else {
                snackActions.warning("Two or more of the specified parameters can't be used together", snackMessageStyles);
                return;
            }
            failed_json_parse = false;

        }catch(error){
            failed_json_parse = true;
        }
        if(failed_json_parse){
            let parsed = parseCommandLine(params, cmd);
            //console.log("result of parseCommandLine", parsed, !parsed)
            if(parsed === undefined){
                return;
            }
            parsed = {...parsed};
            //console.log(message, parsed);
            cmdGroupName = determineCommandGroupName(cmd, parsed);
            if(cmdGroupName !== undefined){
                cmdGroupName.sort();
            } else {
                snackActions.warning("Two or more of the specified parameters can't be used together", snackMessageStyles);
                return;
            }

            if(cmd.commandparameters.length > 0){
                parsed["_"].unshift(cmd);
                parsedWithPositionalParameters = fillOutPositionalArguments(cmd, parsed, cmdGroupName);
                console.log("what's left", parsedWithPositionalParameters);
                if(parsedWithPositionalParameters === undefined){
                    return;
                }
                if(parsedWithPositionalParameters["_"].length > 0){
                    snackActions.warning("Too many positional arguments given. Did you mean to quote some of them?", snackMessageStyles);
                    return;
                }
            }else{
                parsedWithPositionalParameters = parsed;
            }
        }
        if(cmdGroupName === undefined){
            snackActions.warning("Two or more of the specified parameters can't be used together", snackMessageStyles);
            return;
        }else if(cmdGroupName.length > 1){
            if(Boolean(commandOptionsForcePopup.current)){
                props.onSubmitCommandLine(message, cmd, parsedWithPositionalParameters, Boolean(commandOptionsForcePopup.current), cmdGroupName, unmodifiedHistoryValue);
            }else{
                if(cmdGroupName.includes("Default")){
                    props.onSubmitCommandLine(message, cmd, parsedWithPositionalParameters, Boolean(commandOptionsForcePopup.current), ["Default"], unmodifiedHistoryValue);
                }else{
                    let simplifiedGroupName = simplifyGroupNameChoices(cmdGroupName, cmd, parsedWithPositionalParameters)
                    if(simplifiedGroupName === "" ){
                        snackActions.warning("Passed arguments are ambiguous, use shift+enter for modal or provide more parameters", snackMessageStyles);
                        return;
                    } else {
                        props.onSubmitCommandLine(message, cmd, parsedWithPositionalParameters, Boolean(commandOptionsForcePopup.current), [simplifiedGroupName], unmodifiedHistoryValue);
                    }
                }
            }
            setMessage("");
            setCommandPayloadType("");
            taskOptionsIndex.current = -1;
            reverseSearchIndex.current = -1;
            setReverseSearching(false);
            setUnmodifiedHistoryValue("parsed_cli");
            return;
        }
        console.log("positional args added in:", parsedWithPositionalParameters);
        console.log("about to call onSubmitCommandLine", cmd);
        console.log("commandOptionsForcePopup", Boolean(commandOptionsForcePopup.current), "group name", cmdGroupName)
        props.onSubmitCommandLine(message, cmd, parsedWithPositionalParameters, Boolean(commandOptionsForcePopup.current), cmdGroupName, unmodifiedHistoryValue);
        setMessage("");
        setCommandPayloadType("");
        taskOptionsIndex.current = -1;
        reverseSearchIndex.current = -1;
        setReverseSearching(false);
        setUnmodifiedHistoryValue("parsed_cli");
    }
    const onSubmitCommandLine = (evt, force_parsed_popup) => {
        evt.preventDefault();
        evt.stopPropagation();
        //console.log("onSubmitCommandLine", evt, message);
        let splitMessage = message.trim().split(" ");
        let cmd = loadedOptions.current.filter( l => l.cmd === splitMessage[0]);
        if(cmd === undefined || cmd.length === 0){
            snackActions.warning("Unknown (or not loaded) command", snackMessageStyles);
            return;
        }
        commandOptionsForcePopup.current = force_parsed_popup;
        if(cmd.length === 1){
            processCommandAndCommandLine(cmd[0], force_parsed_popup)
            return;
        }
        if(commandPayloadType !== ""){
            cmd = cmd.find(c => c.payloadtype.name === commandPayloadType);
            if(cmd === undefined){
                snackActions.warning("Unknown (or not loaded) command", snackMessageStyles);
                return;
            }
            processCommandAndCommandLine(cmd, force_parsed_popup)
            return;
        }
        // two or more commands share the same name, we need to disambiguate between them
        cmd = cmd.map( c => {return {...c, display: `${c.cmd} (${c.payloadtype.name})`}});
        commandOptions.current = cmd;
        setOpenSelectCommandDialog(true);
    }
    const onClickFilter = () => {
        setOpenFilterOptionsDialog(true);
    }
    const handleReverseSearchInputChange = (event) => {
        setReverseSearchString(event.target.value);
        if(event.target.value.length === 0){
            setMessage("");
            setCommandPayloadType("");
            reverseSearchOptions.current = [];
            reverseSearchIndex.current = 0;
            return;
        }
        // need to do a reverse i search through taskOptions
        const lowerCaseTextSearch = event.target.value.toLowerCase();
        const matchingOptions = taskOptions.current.filter( x => (GetCommandName(x) + x.original_params).toLowerCase().includes(lowerCaseTextSearch));
        const filteredMatches = matchingOptions.filter( x => applyFilteringToTasks(x))
        reverseSearchOptions.current = filteredMatches;
        if(filteredMatches.length > 0){
            setMessage(GetCommandName(filteredMatches[0]) + " " + filteredMatches[0].original_params);
            setCommandPayloadType(filteredMatches[0]?.command?.payloadtype?.name || "");
        }
    }
    const onReverseSearchKeyDown = (event) => {
        if(event.key === "Escape"){
            setReverseSearching(false);
            reverseSearchIndex.current = 0;
            reverseSearchOptions.current=[];
        }else if(event.key === "Tab"){
            setReverseSearching(false);
            reverseSearchIndex.current = 0;
            reverseSearchOptions.current=[];
        }else if(event.key === "Enter"){
            setReverseSearching(false);
            reverseSearchIndex.current = 0;
            reverseSearchOptions.current=[];
            onSubmitCommandLine(event);
        }else if(event.key === "ArrowUp"){
            // go up through the reverseSearchOptions by incrementing reverseSearchIndex
            // setMessage to teh value
            if(reverseSearchOptions.current.length === 0){
                snackActions.warning("No matching options", snackReverseSearchMessageStyles);
                return;
            }else{
                let newIndex = (reverseSearchIndex.current + 1);
                if(newIndex > reverseSearchOptions.current.length -1){
                    newIndex = reverseSearchOptions.current.length -1;
                }
                reverseSearchIndex.current = newIndex;
                setMessage(GetUpDownArrowName(reverseSearchOptions.current[newIndex], useDisplayParamsForCLIHistoryUserSetting.current));
                setUnmodifiedHistoryValue(reverseSearchOptions.current[newIndex].tasking_location);
                setCommandPayloadType(reverseSearchOptions.current[newIndex]?.command?.payloadtype?.name || "");
            }
        }else if(event.key === "ArrowDown"){
            // go down through the reverseSearchOptions by decrementing reverseSearchIndex
            // setMessage to the value
            if(reverseSearchOptions.current.length === 0){
                snackActions.warning("No matching options", snackReverseSearchMessageStyles);
                return;
            }else{
                let newIndex = (reverseSearchIndex.current - 1);
                if(newIndex < 0){
                    newIndex = 0;
                }
                reverseSearchIndex.current = newIndex;
                setMessage(GetUpDownArrowName(reverseSearchOptions.current[newIndex], useDisplayParamsForCLIHistoryUserSetting.current));
                setUnmodifiedHistoryValue(reverseSearchOptions.current[newIndex].tasking_location);
                setCommandPayloadType(reverseSearchOptions.current[newIndex]?.command?.payloadtype?.name || "");
            }
        }else if(event.key === "r" && event.ctrlKey){
            //this means they typed ctrl+r, so they're wanting to do a reverse search for a command
            setReverseSearching(false);
            event.stopPropagation();
            event.preventDefault();
        }
    }
    React.useEffect( () => {
        if(inputRef.current){
            inputRef.current.focus();
        }
    }, [props.focus])
    return (
        <div style={{position: "relative"}}>
            {backdropOpen && <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
                <CircularProgress color="inherit" size={30}/>
            </Backdrop>
            }
            {reverseSearching &&
                <TextField
                    placeholder={"Search previous commands"}
                    onKeyDown={onReverseSearchKeyDown}
                    onChange={handleReverseSearchInputChange}
                    size="small"
                    color={"secondary"}
                    autoFocus={true}
                    variant="outlined"
                    value={reverseSearchString}
                    fullWidth={true}
                    InputProps={{
                        type: 'search',
                        startAdornment: <React.Fragment><Typography
                            style={{width: "10%"}}>reverse-i-search:</Typography></React.Fragment>
                    }}
                />
            }
            {callbackContext?.impersonation_context !== "" && !hideTaskingContext.current &&
                <MythicStyledTooltip title={"Impersonation Context"}>
                    <span className={"rounded-tab"} style={{backgroundColor: theme.taskContextImpersonationColor}}>
                        <b>{"User: "}</b>{callbackContext.impersonation_context}
                    </span>
                </MythicStyledTooltip>

            }
            {callbackContext?.cwd !== "" && !hideTaskingContext.current &&
                <MythicStyledTooltip title={"Current Working Directory"}>
                    <span className={"rounded-tab"} style={{backgroundColor: theme.taskContextCwdColor}}>
                        <b>{"Dir: "}</b>{callbackContext.cwd}
                    </span>
                </MythicStyledTooltip>
            }
            {callbackContext?.extra_info !== "" && !hideTaskingContext.current &&
                <MythicStyledTooltip title={"Extra Callback Context"}>
                    <span className={"rounded-tab"} style={{backgroundColor: theme.taskContextExtraColor}}>
                        {callbackContext.extra_info}
                    </span>
                </MythicStyledTooltip>

            }
            <TextField
                placeholder={"Task an agent..."}
                onKeyDown={onKeyDown}
                onChange={handleInputChange}
                size="small"
                color={"secondary"}
                variant="outlined"
                multiline={true}
                maxRows={15}
                disabled={reverseSearching}
                value={message}
                autoFocus={true}
                fullWidth={true}
                inputRef={inputRef}
                style={{marginBottom: "0px", marginTop: "0px", paddingTop: "0px"}}
                InputProps={{
                    type: 'search',
                    spellCheck: false,
                    autoFocus: true,
                    style: {paddingTop: "0px", paddingBottom: "0px", paddingRight: "5px"},
                    endAdornment:
                        <React.Fragment>
                            <IconButton
                                color="info"
                                variant="contained"
                                disableRipple={true}
                                disableFocusRipple={true}
                                onClick={onSubmitCommandLine}
                                size="large"><SendIcon/>
                            </IconButton>
                            {props.filterTasks &&
                                <IconButton
                                    color={activeFiltering ? "warning" : "secondary"}
                                    variant="contained"
                                    onClick={onClickFilter}
                                    style={{paddingLeft: 0}}
                                    disableRipple={true}
                                    disableFocusRipple={true}
                                    size="large"><TuneIcon/></IconButton>
                            }
                            {commandPayloadType !== "" &&
                                <MythicAgentSVGIcon payload_type={commandPayloadType}
                                                    style={{width: "35px", height: "35px"}}/>
                            }
                        </React.Fragment>
                    ,
                    startAdornment: <React.Fragment>
                        {tokenOptions.current.length > 0 ? (
                            <CallbacksTabsTaskingInputTokenSelect options={tokenOptions.current}
                                                                  changeSelectedToken={props.changeSelectedToken}/>
                        ) : null}

                    </React.Fragment>

                }}
            />
            {openFilterOptionsDialog &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openFilterOptionsDialog}
                              onClose={() => {
                                  setOpenFilterOptionsDialog(false);
                              }}
                              innerDialog={<CallbacksTabsTaskingFilterDialog
                                  filterCommandOptions={loadedOptions.current} onSubmit={props.onSubmitFilter}
                                  filterOptions={props.filterOptions} onClose={() => {
                                  setOpenFilterOptionsDialog(false);
                              }}/>}
                />
            }
            {openSelectCommandDialog &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openSelectCommandDialog}
                              onClose={() => {
                                  setOpenSelectCommandDialog(false)
                              }}
                              innerDialog={<MythicSelectFromListDialog onClose={() => {
                                  setOpenSelectCommandDialog(false);
                              }}
                                                                       onSubmit={processCommandAndCommandLine}
                                                                       options={commandOptions.current}
                                                                       title={"Select Command"}
                                                                       action={"select"} identifier={"id"}
                                                                       display={"display"}/>}
                />
            }
        </div>
    );
}

export const CallbacksTabsTaskingInput = React.memo(CallbacksTabsTaskingInputPreMemo);
