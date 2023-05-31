import { IconButton, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import React from 'react';
import {TextField} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {CallbacksTabsTaskingFilterDialog} from './CallbacksTabsTaskingFilterDialog';
import {CallbacksTabsTaskingInputTokenSelect} from './CallbacksTabsTaskingInputTokenSelect';
import { gql, useSubscription } from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';

const GetLoadedCommandsSubscription = gql`
subscription GetLoadedCommandsSubscription($callback_id: Int!){
    loadedcommands(where: {callback_id: {_eq: $callback_id}}){
        id
        command {
            cmd
            id
            attributes
            commandparameters {
                id
                parameter_type: type 
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
const subscriptionCallbackTokens = gql`
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
    task(where: {callback_id: {_eq: $callback_id}, parent_task_id: {_is_null: true}}, order_by: {id: desc}){
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
        }
    }
}
`;

const GetUpDownArrowName = (task) => {
    if(task.command){
        return task.command.cmd + " " + task.original_params;
    } else {
        return task.command_name + " " + task.original_params;
    }
}

export function CallbacksTabsTaskingInputPreMemo(props){
    const snackMessageStyles = {anchorOrigin:{vertical: "bottom", horizontal: "left"}, autoHideDuration: 2000, preventDuplicate: true, maxSnack: 1, style:{marginBottom: "50px"}};
    const snackReverseSearchMessageStyles = {anchorOrigin:{vertical: "bottom", horizontal: "left"}, autoHideDuration: 1000, preventDuplicate: true, maxSnack: 1, style:{marginBottom: "100px"}};
    const [message, setMessage] = React.useState("");
    const [loadedOptions, setLoadedOptions] = React.useState([]);
    const [taskOptions, setTaskOptions] = React.useState([]);
    const [taskOptionsIndex, setTaskOptionsIndex] = React.useState(-1);
    const [filteredTaskOptions, setFilteredTaskOptions] = React.useState([]);

    const [tabOptions, setTabOptions] = React.useState([]);
    const [tabOptionsIndex, setTabOptionsIndex] = React.useState(-1);

    const [openFilterOptionsDialog, setOpenFilterOptionsDialog] = React.useState(false);
    const [tokenOptions, setTokenOptions] = React.useState([]);

    const [unmodifiedHistoryValue, setUnmodifiedHistoryValue] = React.useState("parsed_cli");
    const [reverseSearching, setReverseSearching] = React.useState(false);
    const [reverseSearchString, setReverseSearchString] = React.useState('');
    const [reverseSearchOptions, setReverseSearchOptions] = React.useState([]);
    const [reverseSearchIndex, setReverseSearchIndex] = React.useState(-1);
    const mountedRef = React.useRef(true);
    const me = useReactiveVar(meState);

    useSubscription(subscriptionCallbackTokens, {
        variables: {callback_id: props.callback_id}, fetchPolicy: "network-only",
        shouldResubscribe: true,
        onSubscriptionData: ({subscriptionData}) => {
            if(!mountedRef.current || !props.parentMountedRef.current){
                return;
            }
            setTokenOptions(subscriptionData.data.callbacktoken);
        }
      });
    useSubscription(subscriptionTask, {
        variables: {callback_id: props.callback_id}, fetchPolicy: "network-only",
        shouldResubscribe: true,
        onSubscriptionData: ({subscriptionData}) => {
            if(!mountedRef.current || !props.parentMountedRef.current){
                return;
            }
            setTaskOptions(subscriptionData.data.task);
            const filteredOptions = subscriptionData.data.task.filter( c => applyFilteringToTasks(c));
            setFilteredTaskOptions(filteredOptions);
        }
    });
    useSubscription(GetLoadedCommandsSubscription, {
        variables: {callback_id: props.callback_id}, fetchPolicy: "network-only",
        shouldResubscribe: true,
        onSubscriptionData: ({subscriptionData}) => {
            if(!mountedRef.current || !props.parentMountedRef.current){
                return;
            }
            const cmds = subscriptionData.data.loadedcommands.map( c => {
                let cmdData = {...c.command};
                return cmdData;
            })
            cmds.push({cmd: "help", description: "Get help for a command or info about loaded commands", commandparameters: [], attributes: {supported_os: []}});
            cmds.push({cmd: "clear", description: "Clear 'submitted' jobs from being pulled down by an agent", commandparameters: [], attributes: {supported_os: []}});
            cmds.sort((a,b) => a.cmd > b.cmd ? 1 : -1);
            setLoadedOptions(cmds);
        }
    });
    React.useEffect( () => {
        //console.log("filter updated")
        const filteredOptions = taskOptions.filter( c => applyFilteringToTasks(c));
        setFilteredTaskOptions(filteredOptions);
    }, [props.filterOptions])
    React.useEffect( () => {
        return() => {
            mountedRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const applyFilteringToTasks = (task) => {
        if(task.display_params.includes("help") && task.operator.username !== me.user.username){
            return false;
          }
          if(props.filterOptions === undefined){
            return true;
          }
          if(props.filterOptions["operatorsList"].length > 0){
            if(!props.filterOptions["operatorsList"].includes(task.operator.username)){
              return false;
            }
          }
          if(props.filterOptions["commentsFlag"]){
            if(task.comment === ""){
              return false;
            }
          }
          if(props.filterOptions["commandsList"].length > 0){
            // only show these commands
            if(!props.filterOptions["commandsList"].includes(task.command_name)){
              return false;
            }
          }
          if(props.filterOptions["everythingButList"].length > 0){
            if(task.command !== null){
              if(props.filterOptions["everythingButList"].includes(task.command_name)){
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
        setTabOptions([]);
        setTabOptionsIndex(0);
        setMessage(event.target.value);
        if(event.target.value.length === 0){
            setUnmodifiedHistoryValue("parsed_cli");
        }
    }
    const onKeyDown = (event) => {
        if(event.key === "r" && event.ctrlKey){
            //this means they typed ctrl+r, so they're wanting to do a reverse search for a command
            setReverseSearching(true);
            setMessage("");
            setReverseSearchString("");
            setUnmodifiedHistoryValue("parsed_cli");
            event.stopPropagation();
            event.preventDefault();
        }
        if(event.key === "Tab"){
            // if we're still typing the command, we want this to cycle through possible matching commands
            // if we have a command, this should cycle through parameter names that are required
            event.stopPropagation();
            event.preventDefault();
            setUnmodifiedHistoryValue("parsed_cli");
            if(message.includes(" ")){
                // this means we're not trying to help with the initial command since there's already a space in what the user typed
                // first find the command in question
                let cmd = loadedOptions.find( l => l.cmd === message.split(" ")[0]);
                if(cmd.commandparameters.length > 0){
                    if(message[message.length -1] === " "){
                        // somebody hit tab after a parameter name or after a parameter value
                        const parsed = parseCommandLine(message, cmd);
                        const cmdGroupNames = determineCommandGroupName(cmd, parsed);
                        if(cmdGroupNames === undefined){
                            snackActions.warning("Two or more of the specified parameters can't be used together", snackMessageStyles);
                            return;
                        }
                        console.log("cmdGroupNames in tab", cmdGroupNames);
                        // look for required arguments that aren't present in our parsed dictionary
                        for(const [key, value] of Object.entries(parsed)){
                            if(key !== "_"){
                                if(value !== value || value === undefined){
                                    snackActions.warning(key + " needs a valid value",snackMessageStyles);
                                    return;
                                }
                                if(value === undefined){
                                    // this means we parsed something and it's undefined, so we need a value
                                    if(message.endsWith(" -" + key)){
                                        //this value is undefined and it's the last one in the list, so we can potentially swap it out with another parameter
                                        for(let i = 0; i < cmd.commandparameters.length; i++){
                                            if(cmd.commandparameters[i]["required"] && 
                                                !(cmd.commandparameters[i]["cli_name"] in parsed) && 
                                                (cmdGroupNames.includes(cmd.commandparameters[i]["parameter_group_name"]) || cmdGroupNames.length === 0)){
                                                const newMsg = message.trim().slice(0, -1 * key.length) + cmd.commandparameters[i]["cli_name"];
                                                setMessage(newMsg);
                                                return;
                                            }
                                        }
                                        for(let i = 0; i < cmd.commandparameters.length; i++){
                                            if(!cmd.commandparameters[i]["required"] && 
                                                !(cmd.commandparameters[i]["cli_name"] in parsed) &&
                                                (cmdGroupNames.includes(cmd.commandparameters[i]["parameter_group_name"]) || cmdGroupNames.length === 0)){
                                                const newMsg = message.trim().slice(0, -1 * key.length) + cmd.commandparameters[i]["cli_name"];
                                                setMessage(newMsg);
                                                return;
                                            }
                                        }
                                    }
                                    snackActions.warning(key + " needs a value", snackMessageStyles);
                                    return;
                                }
                            }
                        }
                        for(let i = 0; i < cmd.commandparameters.length; i++){
                            if(cmd.commandparameters[i]["required"] && 
                                !(cmd.commandparameters[i]["cli_name"] in parsed) &&
                                (cmdGroupNames.includes(cmd.commandparameters[i]["parameter_group_name"]) || cmdGroupNames.length === 0)){
                                const newMsg = message.trim() + " -" + cmd.commandparameters[i]["cli_name"];
                                setMessage(newMsg);
                                return;
                            }
                        }
                        for(let i = 0; i < cmd.commandparameters.length; i++){
                            if(!cmd.commandparameters[i]["required"] && 
                                !(cmd.commandparameters[i]["cli_name"] in parsed) &&
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
                        if(tabOptions.length > 0){
                            const newIndex = (tabOptionsIndex + 1) % tabOptions.length;
                            setTabOptionsIndex(newIndex);
                            let newMessage = message.split(" ").slice(0, -1).join(" ") + " -" + tabOptions[newIndex];
                            setMessage(newMessage);
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
                                !(cur.cli_name in parsed)
                            );
                            let paramOptions = [];
                            if(exactMatch){
                                // what the user typed or what we filled out is an exact match to a parameter name
                                // the options should be all parameters in that group except for the ones already supplied in parsed
                                paramOptions = cmd.commandparameters.reduce( (prev, cur) => {
                                    if(cmdGroupNames.includes(cur.parameter_group_name) && 
                                        cur.cli_name !== lastFlag.slice(1) &&
                                        !(cur.cli_name in parsed)){
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
                                        cur.cli_name.toLowerCase().startsWith(lastFlag.slice(1).toLocaleLowerCase()) &&
                                        !(cur.cli_name in parsed)){
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
                                    setTabOptions([]);
                                    setTabOptionsIndex(0);
                                    let newMsg = pieces.slice(0,-1).join(" ") + " -" + paramOptions[0];
                                    setMessage(newMsg);
                                }else{
                                    setTabOptions(paramOptions);
                                    setTabOptionsIndex(0);
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
                            return;
                        }
                        
                    }
                    
                    snackActions.info("No more arguments for command", snackMessageStyles);
                }else{
                    snackActions.info("No arguments for command", snackMessageStyles);
                }
                
            }else{
                // somebody hit tab with either a blank message or a partial word
                if(tabOptions.length === 0){
                    let opts = loadedOptions.filter( l => l.cmd.toLowerCase().startsWith(message.toLocaleLowerCase()) && (l.attributes.supported_os.length === 0 || l.attributes.supported_os.includes(props.callback_os)));
                    setTabOptions(opts);
                    setTabOptionsIndex(0);
                    if(opts.length > 0){
                        setMessage(opts[0].cmd);
                    }
                }else{
                    setTabOptionsIndex( (tabOptionsIndex + 1) % tabOptions.length );
                    setMessage(tabOptions[(tabOptionsIndex + 1) % tabOptions.length].cmd)
                }
            }
        }else if(event.key === "Enter"){
            if(event.shiftKey){
                onSubmitCommandLine(event, true);
            }else{
                onSubmitCommandLine(event, false);
            }
            
        }else if(event.key === "ArrowUp"){
            if(filteredTaskOptions.length === 0){
                snackActions.warning("No previous tasks", snackMessageStyles);
                return;
            }else{
                
                let newIndex = (taskOptionsIndex + 1);
                if(newIndex > filteredTaskOptions.length -1){
                    newIndex = filteredTaskOptions.length -1;
                }
                setTaskOptionsIndex(newIndex);
                setMessage(GetUpDownArrowName(filteredTaskOptions[newIndex]));
                //setMessage(filteredTaskOptions[newIndex].command_name + " " + filteredTaskOptions[newIndex].original_params);
                setUnmodifiedHistoryValue(filteredTaskOptions[newIndex].tasking_location);
                //setMessage(taskOptions[newIndex].command_name + " " + taskOptions[newIndex].display_params);
            }
        }else if(event.key === "ArrowDown"){
            if(filteredTaskOptions.length === 0){
                snackActions.warning("No previous tasks", snackMessageStyles);
                return;
            }else{
                let newIndex = (taskOptionsIndex - 1);
                if(newIndex < 0){
                    newIndex = 0;
                }
                setTaskOptionsIndex(newIndex);
                setMessage(GetUpDownArrowName(filteredTaskOptions[newIndex]));
                //setMessage(filteredTaskOptions[newIndex].command_name + " " + filteredTaskOptions[newIndex].original_params);
                setUnmodifiedHistoryValue(filteredTaskOptions[newIndex].tasking_location);
                //setMessage(taskOptions[newIndex].command_name + " " + taskOptions[newIndex].display_params);
            }
        }else{
            setTabOptions([]);
            setTabOptionsIndex(0);
            if(taskOptionsIndex !== -1){
                setTaskOptionsIndex(-1);
            }
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
                        buffer += " ";
                        return;
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
        let numberArgs = [];
        for(let i = 0; i < cmd.commandparameters.length; i++){
            switch(cmd.commandparameters[i].parameter_type){
                case "Choice":
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
                case "ChoiceMultiple":
                    arrayArgs.push("-" + cmd.commandparameters[i].cli_name);
                    break;
                default:
                    stringArgs.push("-" + cmd.commandparameters[i].cli_name);
            }
        }
        let result = {"_": []};
        let current_argument = "";
        let current_argument_type = "";
        for(let i = 0; i < argv.length; i++){
            let value = argv[i];
            //console.log(argv[i], current_argument, current_argument_type)
            if(current_argument === ""){
                // not currently processing the value for an argument
                // check to see if this is the start of a new argument
                // or a positional argument
                if(stringArgs.includes(value)){
                    current_argument_type = "string";
                    current_argument = value;
                }else if(booleanArgs.includes(value)){
                    current_argument_type = "boolean";
                    if(i === argv.length-1){
                        // special case where somebody did -flag at the end of the command
                        result[value.slice(1)] = true;
                    }
                    current_argument = value;
                }else if(arrayArgs.includes(value)){
                    current_argument_type = "array";
                    current_argument = value;
                }else if(numberArgs.includes(value)){
                    current_argument_type = "number";
                    current_argument = value;
                } else {
                    // we don't have this as a named argument, so we'll process it as a positional one
                    result["_"].push(value);
                }
            } else {
                // we have a named argument that we just saw, so interpret this as that argument's value
                switch(current_argument_type){
                    case "string":
                        result[current_argument.slice(1)] = value;
                        current_argument = "";
                        current_argument_type = "";
                        break;
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
                    default:
                        break;
                }
                
            }
        };
        return result;
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
        // now iterate over the unsatisfied arguments and add in the positional paramters
        for(let i = 0; i < unSatisfiedArguments.length -1; i++){
            // we cut this short by one so that the last unSatisifedArgument can do a greedy matching for the rest of what was supplied
            // this parameter hasn't been supplied yet, check if we have any positional parameters in parsedCopy["_"]
            if(parsedCopy["_"].length > 0){
                let temp = parsedCopy["_"].shift();
                switch(unSatisfiedArguments[i]["parameter_type"]){
                    case "Choice":
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
                    case "ChoiceMultiple":
                        parsedCopy[unSatisfiedArguments[i]["cli_name"]] = [temp];
                        break;
                    default:
                        parsedCopy[unSatisfiedArguments[i]["cli_name"]] = temp;
                        break;
                }
            }
        }
        
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
                case "Choice":
                case "String":
                    parsedCopy[unSatisfiedArguments[unSatisfiedArguments.length -1]["cli_name"]] = temp;
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
                case "ChoiceMultiple":
                    parsedCopy[unSatisfiedArguments[unSatisfiedArguments.length -1]["cli_name"]] = parsedCopy["_"];
                    break;
                default:
                    parsedCopy[unSatisfiedArguments[unSatisfiedArguments.length -1]["cli_name"]] = temp;
                    break;
            }
            parsedCopy["_"] = [];
        }
        
        return parsedCopy;

    }
    const onSubmitCommandLine = (evt, force_parsed_popup) => {
        evt.preventDefault();
        evt.stopPropagation();
        //console.log("onSubmitCommandLine", evt, message);
        let splitMessage = message.trim().split(" ");
        let cmd = loadedOptions.find( l => l.cmd === splitMessage[0]);
        if(cmd === undefined){
            snackActions.warning("Unknown (or not loaded) command", snackMessageStyles);
            return;
        }
        let cmdGroupName = ["Default"];
        let parsedWithPositionalParameters = {};
        let params = splitMessage.slice(1).join(" ");
        if(unmodifiedHistoryValue.includes("modal") || unmodifiedHistoryValue.includes("browserscript")){
            // these are the two kinds that'll introduce dictionary values as original_params
            try{
                parsedWithPositionalParameters = JSON.parse(params);
                cmdGroupName = determineCommandGroupName(cmd, parsedWithPositionalParameters);
                if(cmdGroupName !== undefined){
                    cmdGroupName.sort()
                } else {
                    snackActions.warning("Two or more of the specified parameters can't be used together", snackMessageStyles);
                    return;
                }

            }catch(error){
                snackActions.warning("Failed to parse modified JSON value", snackMessageStyles);
                return;
            }   
        }else{
            let parsed = parseCommandLine(params, cmd);
            //console.log("result of parseCommandLine", parsed, !parsed)
            if(parsed === undefined){
                return;
            }
            parsed["_"].unshift(cmd);
            //console.log(message, parsed);
            cmdGroupName = determineCommandGroupName(cmd, parsed);
            if(cmdGroupName !== undefined){
                cmdGroupName.sort();
            } else {
                snackActions.warning("Two or more of the specified parameters can't be used together", snackMessageStyles);
                return;
            }

            if(cmd.commandparameters.length > 0){
                parsedWithPositionalParameters = fillOutPositionalArguments(cmd, parsed, cmdGroupName);
                //console.log(parsedWithPositionalParameters);
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
            if(Boolean(force_parsed_popup)){
                props.onSubmitCommandLine(message, cmd, parsedWithPositionalParameters, Boolean(force_parsed_popup), cmdGroupName, unmodifiedHistoryValue);
            }else{
                if(cmdGroupName.includes("Default")){
                    props.onSubmitCommandLine(message, cmd, parsedWithPositionalParameters, Boolean(force_parsed_popup), ["Default"], unmodifiedHistoryValue);
                }else{
                    let simplifiedGroupName = simplifyGroupNameChoices(cmdGroupName, cmd, parsedWithPositionalParameters)
                    if(simplifiedGroupName === "" ){
                        snackActions.warning("Passed arguments are ambiguous, use shift+enter for modal or provide more parameters", snackMessageStyles);
                        return;
                    } else {
                        props.onSubmitCommandLine(message, cmd, parsedWithPositionalParameters, Boolean(force_parsed_popup), [simplifiedGroupName], unmodifiedHistoryValue);
                    }
                }
            }
            setMessage("");
            setTaskOptionsIndex(-1);
            setReverseSearchIndex(-1);
            setReverseSearching(false);
            setUnmodifiedHistoryValue("parsed_cli");
            return;
        }
        console.log("positional args added in:", parsedWithPositionalParameters);
        props.onSubmitCommandLine(message, cmd, parsedWithPositionalParameters, Boolean(force_parsed_popup), cmdGroupName, unmodifiedHistoryValue);
        setMessage("");
        setTaskOptionsIndex(-1);
        setReverseSearchIndex(-1);
        setReverseSearching(false);
        setUnmodifiedHistoryValue("parsed_cli");
    }
    const onClickFilter = () => {
        setOpenFilterOptionsDialog(true);
    }
    const handleReverseSearchInputChange = (event) => {
        setReverseSearchString(event.target.value);
        if(event.target.value.length === 0){
            setMessage("");
            setReverseSearchOptions([]);
            setReverseSearchIndex(0);
            return;
        }
        // need to do a reverse i search through taskOptions
        const lowerCaseTextSearch = event.target.value.toLowerCase();
        const matchingOptions = taskOptions.filter( x => (x.command_name + " " + x.original_params).toLowerCase().includes(lowerCaseTextSearch));
        const filteredMatches = matchingOptions.filter( x => applyFilteringToTasks(x))
        setReverseSearchOptions(filteredMatches);
        if(filteredMatches.length > 0){
            setMessage(filteredMatches[0].command_name + " " + filteredMatches[0].original_params);
        }
    }
    const onReverseSearchKeyDown = (event) => {
        if(event.key === "Escape"){
            setReverseSearching(false);
            setReverseSearchIndex(0);
            setReverseSearchOptions([]);
        }else if(event.key === "Tab"){
            setReverseSearching(false);
            setReverseSearchIndex(0);
            setReverseSearchOptions([]);
        }else if(event.key === "Enter"){
            setReverseSearching(false);
            setReverseSearchIndex(0);
            setReverseSearchOptions([]);
            onSubmitCommandLine(event);
        }else if(event.key === "ArrowUp"){
            // go up through the reverseSearchOptions by incrementing reverseSearchIndex
            // setMessage to teh value
            if(reverseSearchOptions.length === 0){
                snackActions.warning("No matching options", snackReverseSearchMessageStyles);
                return;
            }else{
                const newIndex = (reverseSearchIndex + 1) % reverseSearchOptions.length;
                setReverseSearchIndex(newIndex);
                setMessage(reverseSearchOptions[newIndex].command_name + " " + reverseSearchOptions[newIndex].original_params);
            }
        }else if(event.key === "ArrowDown"){
            // go down through the reverseSearchOptions by decrementing reverseSearchIndex
            // setMessage to the value
            if(reverseSearchOptions.length === 0){
                snackActions.warning("No matching options", snackReverseSearchMessageStyles);
                return;
            }else{
                let newIndex = (reverseSearchIndex - 1) % reverseSearchOptions.length;
                if(newIndex < 0){
                    newIndex = reverseSearchOptions.length - 1;
                }
                setReverseSearchIndex(newIndex);
                setMessage(reverseSearchOptions[newIndex].command_name + " " + reverseSearchOptions[newIndex].original_params);
            }
        }else if(event.key === "r" && event.ctrlKey){
            //this means they typed ctrl+r, so they're wanting to do a reverse search for a command
            setReverseSearching(false);
            event.stopPropagation();
            event.preventDefault();
        }
    }
    return (
        <React.Fragment>
            {reverseSearching &&
                <TextField
                    placeholder={"Search previous commands"}
                    onKeyDown={onReverseSearchKeyDown}    
                    onChange={handleReverseSearchInputChange}                     
                    size="small"
                    autoFocus={true}
                    variant="outlined"
                    value={reverseSearchString}
                    fullWidth={true}
                    InputProps={{ type: 'search',
                        startAdornment: <React.Fragment><Typography style={{width: "10%"}}>reverse-i-search:</Typography></React.Fragment>
                    
                    }}
                />
            }
            <TextField
                placeholder={"Task an agent..."}
                onKeyDown={onKeyDown}    
                onChange={handleInputChange}                     
                size="small"
                variant="outlined"
                multiline={true}
                maxRows={15}
                disabled={reverseSearching}
                value={message}
                autoFocus={true}
                fullWidth={true}
                style={{marginBottom: "10px"}}
                InputProps={{ type: 'search',
                    endAdornment:
                    <React.Fragment>
                    <IconButton
                        color="primary"
                        variant="contained"
                        onClick={onSubmitCommandLine}
                        size="large"><SendIcon/></IconButton>
                    <IconButton
                        color="secondary"
                        variant="contained"
                        onClick={onClickFilter}
                        size="large"><TuneIcon/></IconButton>
                    </React.Fragment>,
                    startAdornment: <React.Fragment>
                        {tokenOptions.length > 0 ? (
                            <CallbacksTabsTaskingInputTokenSelect options={tokenOptions} changeSelectedToken={props.changeSelectedToken}/>
                        ) : (null)}
                        
                    </React.Fragment>
                
                }}
                />
              {openFilterOptionsDialog &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openFilterOptionsDialog} 
                    onClose={()=>{setOpenFilterOptionsDialog(false);}} 
                    innerDialog={<CallbacksTabsTaskingFilterDialog filterCommandOptions={loadedOptions} onSubmit={props.onSubmitFilter} filterOptions={props.filterOptions} onClose={()=>{setOpenFilterOptionsDialog(false);}} />}
                />
              }
        </React.Fragment>
    );
}
export const CallbacksTabsTaskingInput = React.memo(CallbacksTabsTaskingInputPreMemo);
