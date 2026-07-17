import {MythicActionButton} from "../../MythicComponents/MythicActionButton";
import {MythicTabPanel, MythicTabLabel} from '../../MythicComponents/MythicTabPanel';
import React, {useEffect, useRef} from 'react';
import { useMutation } from '@apollo/client';
import { TaskDisplayConsole } from './TaskDisplay';
import {snackActions} from '../../utilities/Snackbar';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {TaskParametersDialog} from './TaskParametersDialog';
import {CallbacksTabsTaskingInput} from './CallbacksTabsTaskingInput';
import LinearProgress from '@mui/material/LinearProgress';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import {MythicModifyStringDialog} from '../../MythicComponents/MythicDialog';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import {createTaskingMutation} from "./CallbackMutations";
import { validate as uuidValidate } from 'uuid';
import {useTaskReferenceSubmitter} from "./taskingReferences";
import {useCallbackTaskingData} from "./useCallbackTaskingData";


export function CallbacksTabsTaskingConsoleLabel(props){
    const [description, setDescription] = React.useState(props.tabInfo.payloadDescription !== props.tabInfo.callbackDescription ? props.tabInfo.callbackDescription : "Callback: " + props.tabInfo.displayID)
    const [openEditDescriptionDialog, setOpenEditDescriptionDialog] = React.useState(false);
    useEffect( () => {
        if(props.tabInfo.customDescription !== "" && props.tabInfo.customDescription !== undefined){
            setDescription(props.tabInfo.customDescription);
        }else if(props.tabInfo.payloadDescription !== props.tabInfo.callbackDescription){
            setDescription(props.tabInfo.callbackDescription);
        }else{
            setDescription("Console Callback: " + props.tabInfo.displayID);
        }
    }, [props.tabInfo.payloadDescription, props.tabInfo.customDescription]);
    useEffect( () => {
        let savedDescription = localStorage.getItem(`${props.me.user.id}-${props.tabInfo.operation_id}-${props.tabInfo.tabID}`);
        if(savedDescription && savedDescription !== ""){
            setDescription(savedDescription);
        }
    }, []);
    const editDescriptionSubmit = (description) => {
        props.onEditTabDescription(props.tabInfo, description);
        localStorage.setItem(`${props.me.user.id}-${props.tabInfo.operation_id}-${props.tabInfo.tabID}`, description);
    }
    const contextMenuOptions = props.contextMenuOptions.concat([
        {
            name: 'Set Tab Description',
            click: ({event}) => {
                setOpenEditDescriptionDialog(true);
            }
        },
    ]);
    return (
        <React.Fragment>
            <MythicTabLabel label={description} highlight={props.newDataForTab[props.tabInfo.tabID]} onDragTab={props.onDragTab} me={props.me} {...props} contextMenuOptions={contextMenuOptions}/>
            {openEditDescriptionDialog &&
                <MythicDialog fullWidth={true} open={openEditDescriptionDialog}  onClose={() => {setOpenEditDescriptionDialog(false);}}
                              innerDialog={
                                  <MythicModifyStringDialog title={"Edit Tab's Description - Displays as one line"} onClose={() => {setOpenEditDescriptionDialog(false);}} value={description} onSubmit={editDescriptionSubmit} />
                              }
                />
            }
        </React.Fragment>
    )
}

export const CallbacksTabsTaskingConsolePanel = ({tabInfo, index, value, onCloseTab, parentMountedRef, me, setNewDataForTab}) =>{
    const active = index === value;
    const [scrollToBottom, setScrollToBottom] = React.useState(false);
    const [openParametersDialog, setOpenParametersDialog] = React.useState(false);
    const [commandInfo, setCommandInfo] = React.useState({});
    const [selectedToken, setSelectedToken] = React.useState({});
    const [filterOptions, setFilterOptions] = React.useState({
        "operatorsList": [],
        "commentsFlag": false,
        "commandsList": [],
        "parameterString": "",
        "everythingButList": [],
        "hideErrors": false
    });
    const mountedRef = React.useRef(true);
    const messagesEndRef = useRef(null);
    const newlyIssuedTasks = useRef([]);
    const [createTask] = useMutation(createTaskingMutation, {
        update: (cache, {data}) => {
            if(data.createTask.status === "error"){
                snackActions.error(data.createTask.error);
            }else{
                newlyIssuedTasks.current.push(data.createTask.id);
                //snackActions.success("Task created", {autoClose: 1000});
            }
        },
        onError: data => {
            console.error(data);
        }
    });
    const {submitTask, dialog: taskReferenceSubmitDialog} = useTaskReferenceSubmitter(createTask);
    const onBackgroundChange = React.useCallback(() => {
        setNewDataForTab((previous) => previous[tabInfo.tabID] ? previous : {...previous, [tabInfo.tabID]: true});
    }, [setNewDataForTab, tabInfo.tabID]);
    const {
        fetched,
        fetchedAllTasks,
        loadingMore,
        loadMoreTasks,
        taskChildrenStore,
        tasks,
    } = useCallbackTaskingData({
        callbackID: tabInfo.callbackID,
        active,
        onBackgroundChange,
        onMissingCallback: () => onCloseTab(tabInfo),
    });
    const taskingData = React.useMemo(() => ({task: tasks}), [tasks]);
    useEffect( () => {
        return() => {
            mountedRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect( () => {
        if(fetched && tasks.length > 0 && !scrollToBottom){
            setScrollToBottom(true);
        }
        if(scrollToBottom){
            messagesEndRef.current?.scrollIntoView();
        }
    }, [fetched, scrollToBottom, tasks.length]);
    const onSubmitCommandLine = (message, cmd, parsed, force_parsed_popup, cmdGroupNames, previousTaskingLocation, taskReferenceOptions={}) => {
        //console.log(message, cmd, parsed);
        let params = message.split(" ");
        delete params[0];
        params = params.join(" ").trim();
        let newTaskingLocation = "parsed_cli";
        if(previousTaskingLocation.includes("modal")){
            newTaskingLocation = "modal_modified"
        }else if(previousTaskingLocation.includes("browserscript")){
            newTaskingLocation = "browserscript_modified";
        }
        if(cmd.commandparameters.length === 0){
            // if there are no parameters, just send whatever the user types along
            onCreateTask({callback_display_id: tabInfo.displayID,
                command: cmd.cmd,
                params: params,
                parameter_group_name: "Default",
                tasking_location: newTaskingLocation,
                payload_type: cmd.payloadtype?.name,
                selected_task_references: taskReferenceOptions.selected_task_references,
            });
        }else{
            // check if there's a "file" component that needs to be displayed
            const fileParamExists = cmd.commandparameters.find(param => {
                if(param.parameter_type === "File" && cmdGroupNames.includes(param.parameter_group_name)){
                    if(!(param.cli_name in parsed || param.name in parsed || param.display_name in parsed)){
                        return true;
                    }
                    if(param.cli_name in parsed && uuidValidate(parsed[param.cli_name])){
                        return false; // no need for a popup, already have a valid file specified
                    } else if(param.name in parsed && uuidValidate(parsed[param.name])){
                        return false;
                    } else if(param.display_name in parsed && uuidValidate(parsed[param.display_name])){
                        return false;
                    }
                }

            });
            //console.log("missing File for group? ", fileParamExists, cmdGroupNames);
            let missingRequiredPrams = false;
            if(cmdGroupNames.length === 1){
                const missingParams = cmd.commandparameters.filter(param => param.required && param.parameter_group_name === cmdGroupNames[0] && !(param.cli_name in parsed || param.name in parsed || param.display_name in parsed));
                if(missingParams.length > 0){
                    missingRequiredPrams = true;
                    console.log("missing required params", missingParams,parsed);
                }
            }else if(cmdGroupNames > 1 && !force_parsed_popup){
                // need to force a popup because the tasking is ambiguous
                console.log("command is ambiguous");
                force_parsed_popup = true;
            }
            if(fileParamExists || force_parsed_popup || missingRequiredPrams){
                //need to do a popup
                if(cmdGroupNames.length > 0){
                    setCommandInfo({...cmd, "parsedParameters": parsed, groupName: cmdGroupNames[0], taskReferenceOptions});
                }else{
                    setCommandInfo({...cmd, "parsedParameters": parsed, taskReferenceOptions});
                }
                setOpenParametersDialog(true);

            }else{
                delete parsed["_"];
                onCreateTask({callback_display_id: tabInfo.displayID,
                    command: cmd.cmd,
                    params: JSON.stringify(parsed),
                    tasking_location: newTaskingLocation,
                    original_params: params,
                    parameter_group_name: cmdGroupNames[0],
                    payload_type: cmd.payloadtype?.name,
                    selected_task_references: taskReferenceOptions.selected_task_references,
                    taskReferenceEditCommandInfo: {...cmd, parsedParameters: parsed, groupName: cmdGroupNames[0], taskReferenceOptions},
                });
            }
        }
    }
    const onSubmitAliasCommandLine = (message, alias) => {
        const trimmed = message.trim();
        const command = trimmed.split(/\s+/)[0];
        const params = trimmed.length > command.length ? trimmed.slice(command.length).trim() : "";
        onCreateTask({
            callback_display_id: tabInfo.displayID,
            command,
            params,
            parameter_group_name: "Default",
            tasking_location: "alias",
            payload_type: alias?.payloadtype?.name || tabInfo.payloadtype,
        });
    };
    const submitParametersDialog = (cmd, parameters, files, selectedParameterGroup, payload_type, metadata={}) => {
        setOpenParametersDialog(false);
        const selectedTaskReferences = [
            ...(commandInfo.taskReferenceOptions?.selected_task_references || []),
            ...(metadata.selectedTaskReferences || []),
        ];
        onCreateTask({callback_display_id: tabInfo.displayID,
            command: cmd,
            params: parameters,
            files: files,
            tasking_location: "modal",
            parameter_group_name: selectedParameterGroup,
            payload_type: payload_type,
            selected_task_references: selectedTaskReferences,
            taskReferenceEditCommandInfo: commandInfo,
        });
    }
    const getTaskReferenceEditParameters = (variables) => {
        try{
            const parsedParameters = JSON.parse(variables.params || "{}");
            if(parsedParameters && typeof parsedParameters === "object" && !Array.isArray(parsedParameters)){
                return parsedParameters;
            }
        }catch(error){
            // fall through to an empty parameter object
        }
        return {};
    }
    const openTaskReferenceEditDialog = (variables, commandContext) => {
        if(!commandContext?.id){
            return;
        }
        const selectedTaskReferences = variables.selected_task_references || commandContext.taskReferenceOptions?.selected_task_references || [];
        setCommandInfo({
            ...commandContext,
            parsedParameters: getTaskReferenceEditParameters(variables),
            groupName: variables.parameter_group_name || commandContext.groupName,
            taskReferenceOptions: {
                ...(commandContext.taskReferenceOptions || {}),
                selected_task_references: selectedTaskReferences,
            },
        });
        setOpenParametersDialog(true);
    }
    const onCreateTask = ({callback_display_id, command, params, files, tasking_location, original_params, parameter_group_name, payload_type, selected_task_references, taskReferenceEditCommandInfo}) => {
        const variables = {callback_display_id, command, params, files, tasking_location, original_params, parameter_group_name, payload_type, selected_task_references};
        if(selectedToken.token_id !== undefined){
            variables.token_id = selectedToken.token_id;
        }
        submitTask({
            variables,
            onTaskReferenceReviewCancel: taskReferenceEditCommandInfo ? (pendingVariables) => openTaskReferenceEditDialog(pendingVariables, taskReferenceEditCommandInfo) : undefined,
        });
    }
    const onSubmitFilter = (newFilter) => {
        setFilterOptions(newFilter);
    }
    const changeSelectedToken = (token) => {
        if(token === "Default Token"){
            setSelectedToken("Default Token");
            return;
        }
        if(token.token_id !== selectedToken.token_id){
            setSelectedToken(token);
        }
    }
    return (
        <MythicTabPanel index={index} value={value} >

            {!fetched && <LinearProgress color="primary" thickness={2} style={{paddingTop: "5px"}}/>}
            {loadingMore && <LinearProgress color="primary" thickness={2} style={{paddingTop: "5px"}}/>}
            {taskReferenceSubmitDialog}
            <div style={{overflowY: "auto", flexGrow: 1, width: "100%"}} id={`taskingPanelConsole${tabInfo.callbackID}`}>
                {!fetchedAllTasks &&
                    <MythicStyledTooltip title="Fetch Older Tasks" style={{marginLeft: "50%"}}>
                        <MythicActionButton colorMode="always" tone="success" iconOnly
                            onClick={loadMoreTasks}
                            variant="contained"
                            size="large"><AutorenewIcon /></MythicActionButton>
                    </MythicStyledTooltip>}
                {
                    taskingData.task.map((task) => (
                        <TaskDisplayConsole key={"taskinteractdisplayconsole" + task.id} me={me} task={task}
                                            command_id={task.command == null ? 0 : task.command.id}
                                            filterOptions={filterOptions} newlyIssuedTasks={newlyIssuedTasks.current}
                                            taskChildrenStore={taskChildrenStore} active={active}/>
                    ))
                }
                <div ref={messagesEndRef}/>
            </div>

            <CallbacksTabsTaskingInput filterTasks={true} me={me} onSubmitFilter={onSubmitFilter} onSubmitCommandLine={onSubmitCommandLine} onSubmitAliasCommandLine={onSubmitAliasCommandLine} changeSelectedToken={changeSelectedToken}
                                       filterOptions={filterOptions} callback_id={tabInfo.callbackID}
                                       callback_display_id={tabInfo.displayID}
                                       operation_id={tabInfo.operation_id}
                                       payloadtype_name={tabInfo.payloadtype} focus={index === value}
                                       callback_os={tabInfo.os} parentMountedRef={mountedRef} active={active} />
            {openParametersDialog &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openParametersDialog}
                              onClose={()=>{setOpenParametersDialog(false);}}
                              innerDialog={<TaskParametersDialog command={commandInfo} callback_id={tabInfo.callbackID}
                                                                 callback_display_id={tabInfo.displayID}
                                                                 payloadtype_id={tabInfo.payloadtype_id} operation_id={tabInfo.operation_id}
                                                                 onSubmit={submitParametersDialog} onClose={()=>{setOpenParametersDialog(false);}}
                              />}
                />
            }

        </MythicTabPanel>
    );
}
