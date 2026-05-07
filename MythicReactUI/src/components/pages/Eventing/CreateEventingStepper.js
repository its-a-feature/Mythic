import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DeleteIcon from '@mui/icons-material/Delete';
import { gql, useLazyQuery, useReactiveVar } from '@apollo/client';
import {meState} from "../../../cache";
import {Typography, IconButton, Switch} from '@mui/material';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {CreatePayloadParameter} from "../CreatePayload/CreatePayloadParameter";
import MythicTextField from "../../MythicComponents/MythicTextField";
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {snackActions} from "../../utilities/Snackbar";
import { useTheme } from '@mui/material/styles';
import {useDebounce} from "../../utilities/useDebounce";
import {MythicDialog, MythicModifyStringDialog} from "../../MythicComponents/MythicDialog";
import {testFileWebhookMutation} from "./CreateEventWorkflowDialog";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import {EventStepRenderDialog} from "./EventStepRender";
import {UploadEventFile, UploadEventGroupFile} from "../../MythicComponents/MythicFileUpload";
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import SearchIcon from '@mui/icons-material/Search';
import TerminalIcon from '@mui/icons-material/Terminal';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {MythicTableEmptyState, MythicTableLoadingState} from "../../MythicComponents/MythicStateDisplay";
import {MythicClientSideTablePagination, useMythicClientPagination} from "../../MythicComponents/MythicTablePagination";
import {TaskParametersDialog} from "../Callbacks/TaskParametersDialog";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";

function getSteps(){
    return ['Trigger Metadata', 'Steps', 'Confirm']
}
const stepDetails = [
    {
        title: "Trigger metadata",
        subtitle: "Name the workflow and define when it can run.",
    },
    {
        title: "Workflow steps",
        subtitle: "Build the ordered actions, inputs, outputs, and dependencies.",
    },
    {
        title: "Review and create",
        subtitle: "Validate the generated workflow before uploading it.",
    },
];
const debounceDelay = 500;
const taskFields = [
    "id", "agent_task_id", "display_id", "operation_id", "command_id", "command_name", "params",
    "status_timestamp_preprocessing", "status_timestamp_submitted", "status_timestamp_processing",
    "status_timestamp_processed", "timestamp", "callback_id", "operator_id", "status", "original_params",
    "display_params", "comment", "comment_operator_id", "stdout", "stderr", "completed", "opsec_pre_blocked",
    "opsec_pre_message", "opsec_pre_bypassed", "opsec_pre_bypass_role", "opsec_pre_bypass_user_id",
    "opsec_post_blocked", "opsec_post_message", "opsec_post_bypassed", "opsec_post_bypass_role",
    "opsec_post_bypass_user_id", "parent_task_id", "subtask_callback_function", "subtask_callback_function_completed",
    "group_callback_function", "group_callback_function_completed", "completed_callback_function",
    "completed_callback_function_completed", "subtask_group_name", "tasking_location", "parameter_group_name",
    "token_id", "response_count", "is_interactive_task", "interactive_task_type", "eventstepinstance_id",
    "apitokens_id", "has_intercepted_response"
].sort();
const payloadFields = [
    "id", "uuid", "description", "operator_id", "creation_time", "payload_type_id", "operation_id",
    "wrapped_payload_id", "deleted", "build_container", "build_phase", "build_message",
    "build_stderr", "build_stdout", "callback_alert", "auto_generated", "os", "task_id", "file_id",
    "timestamp", "eventstepinstance_id", "apitokens_id"
].sort();
const callbackFields = [
    "id", "display_id", "agent_callback_id", "init_callback", "last_checkin", "user", "host", "pid", "ip", "external_ip", "process_name",
    "description", "operator_id", "active", "registered_payload_id", "integrity_level", "locked", "locked_operator_id", "operation_id",
    "crypto_type", "dec_key", "enc_key", "os", "architecture", "domain", "extra_info", "sleep_info", "timestamp", "mythictree_groups",
    "dead", "eventstepinstance_id", "process_short_name", "color", "trigger_on_checkin_after_time", "cwd", "impersonation_context"
].sort();
const tagFields = [
    "id", "url", "data", "source", "operation_id", "filemeta_id", "mythictree_id", "credential_id",
    "task_id", "taskartifact_id", "keylog_id", "response_id", "tagtype"
].sort();
const callbackTriggerTaskCreateInputName = "CALLBACK_DISPLAY_ID";
const callbackTriggerNames = ["callback_checkin", "callback_new"];
const eventingTaskCreateExecutedTasksQuery = gql`
query EventingTaskCreateExecutedTasksQuery($operation_id: Int!, $command_name: String!) {
    task(where: {operation_id: {_eq: $operation_id}, _or: [{command_name: {_eq: $command_name}}, {command: {cmd: {_eq: $command_name}}}]}, order_by: {id: desc}, limit: 200) {
        id
        display_id
        command_name
        display_params
        mythic_parsed_params
        original_params
        parameter_group_name
        timestamp
        callback {
            display_id
            user
            host
            payload {
                payloadtype {
                    name
                }
            }
        }
        command {
            cmd
            payloadtype {
                name
            }
        }
    }
}
`;
const eventingTaskCreateCallbacksQuery = gql`
query EventingTaskCreateCallbacksQuery($operation_id: Int!, $command_name: String!) {
    loadedcommands(where: {callback: {active: {_eq: true}, operation_id: {_eq: $operation_id}}, command: {cmd: {_eq: $command_name}, deleted: {_eq: false}}}, order_by: {callback_id: desc}) {
        id
        callback {
            id
            display_id
            user
            host
            description
            operation_id
            payload {
                payloadtype {
                    id
                    name
                }
            }
        }
        command {
            id
            cmd
            help_cmd
            description
            needs_admin
            payload_type_id
            attributes
            supported_ui_features
            payloadtype {
                id
                name
            }
            commandparameters {
                id
                type
            }
        }
    }
}
`;
const getCallbackDisplayIdInput = () => ({
    name: callbackTriggerTaskCreateInputName,
    type: "env",
    value: "",
    value_type: "display_id",
});
const getTaskCreateDefaultsForTrigger = (trigger) => {
    if(!callbackTriggerNames.includes(trigger)){
        return {inputs: [], action_data: {}};
    }
    return {
        inputs: [getCallbackDisplayIdInput()],
        action_data: {
            callback_display_id: callbackTriggerTaskCreateInputName,
        },
    };
}
const upsertStepInputs = (existingInputs = [], inputsToUpsert = []) => {
    const nextInputs = Array.isArray(existingInputs) ? existingInputs.map((input) => ({...input})) : [];
    inputsToUpsert.forEach((input) => {
        const existingIndex = nextInputs.findIndex((currentInput) => currentInput.name === input.name);
        if(existingIndex >= 0){
            nextInputs[existingIndex] = {...nextInputs[existingIndex], ...input};
        }else{
            nextInputs.push({...input});
        }
    });
    return nextInputs;
}
const getSafeEventingInputName = (value, fallback = "FILE") => {
    const safeValue = String(value || fallback).replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    return (safeValue || fallback).toUpperCase();
}
const getUniqueEventingInputName = (baseName, existingNames) => {
    let nextName = baseName;
    let count = 2;
    while(existingNames.has(nextName)){
        nextName = `${baseName}_${count}`;
        count += 1;
    }
    existingNames.add(nextName);
    return nextName;
}
const parseTaskCreateParameters = (value) => {
    if(value === undefined || value === null || value === ""){
        return {};
    }
    if(typeof value !== "string"){
        return value;
    }
    try{
        return JSON.parse(value);
    }catch(error){
        return value;
    }
}
const formatTaskCreateParameters = (value) => {
    if(typeof value === "string"){
        try{
            return JSON.stringify(JSON.parse(value), null, 4);
        }catch(error){
            return value;
        }
    }
    return JSON.stringify(value || {}, null, 4);
}
const isValidJsonObjectOrArray = (value) => {
    if(typeof value !== "string" || value.trim() === ""){
        return false;
    }
    try{
        const parsed = JSON.parse(value);
        return parsed !== null && typeof parsed === "object";
    }catch(error){
        return false;
    }
}
const getExistingTaskParameterFill = (task) => {
    const parsedParams = task.mythic_parsed_params || "";
    if(parsedParams.trim() !== ""){
        return {
            type: "dictionary",
            value: parseTaskCreateParameters(parsedParams),
        };
    }
    const originalParams = task.original_params || "";
    if(isValidJsonObjectOrArray(originalParams)){
        return {
            type: "dictionary",
            value: JSON.parse(originalParams),
        };
    }
    return {
        type: "string",
        value: originalParams,
    };
}
const getFilteredEventingRows = (rows, filterText, getSearchText) => {
    const normalizedFilter = filterText.trim().toLowerCase();
    if(normalizedFilter === ""){
        return rows;
    }
    return rows.filter((row) => getSearchText(row).toLowerCase().includes(normalizedFilter));
}
const getEventingTaskCallbackDisplay = (task) => {
    if(!task.callback){
        return "Unknown callback";
    }
    return `${task.callback.display_id} - ${task.callback.user || ""}@${task.callback.host || ""}`;
}
const getEventingTaskPayloadType = (task) => task.command?.payloadtype?.name || task.callback?.payload?.payloadtype?.name || "";
function CreateEventingStepperNavigationButtons(props){
    const me = useReactiveVar(meState);
    const disabledButtons = (me?.user?.current_operation_id || 0) <= 0;
    return (

        <DialogActions className="mythic-eventing-wizard-actions">
            <Button className="mythic-table-row-action mythic-table-row-action-hover-warning" onClick={props.cancel} variant="outlined">Cancel</Button>
            <Button
                className="mythic-table-row-action"
                variant={"outlined"}
                disabled={props.first}
                onClick={props.back}
            >
                Back
            </Button>
                <Button
                    className={`mythic-table-row-action ${props.last ? "mythic-table-row-action-hover-success" : "mythic-table-row-action-hover-info"}`}
                    variant="outlined"
                    onClick={props.finished}
                    disabled={disabledButtons}
                >
                    {props.last ? "Create" : 'Next'}
                </Button>
        </DialogActions>
    );
}
const triggerOptions = ["manual", "mythic_start", "cron", "payload_build_start",
    "payload_build_finish", "task_create", "task_start", "task_finish", "user_output", "file_download",
    "file_upload", "screenshot", "alert", "callback_new", "task_intercept", "response_intercept", "callback_checkin",
    "tag_create"
].sort();
const runAsOptions = ["bot", "self", "trigger", "lead"];
const runAsOptionsData = {
    bot: {
        description: "A run_as value of 'bot' means that the operation's 'bot' account is used for execution instead of a specific human operator. Every time an operation is created, a \"bot\" account is also created and added to the operation as a standard \"operator\". Operators can upload the workflow files, but if the execution context is for the bot, then the admin of the operation must approve it to run."
    },
    self: {
        description: "A run_as value of self means that the workflow will execute under the context of the operator that uploaded it (i.e. YOU).",
    },
    trigger: {
        description: "A run_as value of trigger means that the workflow will execute under the context of the operator that triggered it (or bot if there wasn't an explicit trigger). For this case, each operator must provide their consent or it'll fail to run for operators that don't provide consent."
    },
    lead: {
        description: "A run_as value of lead means that the workflow will execute under the context of the operation admin. Naturally, the operation admin must approve this before this can execute."
    },
    operator: {
        description: "If you supply a value to run_as that's none of the other values (bot, self, trigger, lead), then it's assumed that you're trying to run within the context of a specific operator. If the name matches an existing operator, then that operator must be part of the operation and have granted consent. If you specify the name of a bot, then the lead of the operation must grant consent first."
    }
}
const triggerOptionsData = {
    manual: {
        description: "This workflow is triggered manually in the UI via the green run icon.",
        trigger_data: [],
        env: [],
    },
    mythic_start: {
        description: "This workflow is triggered when Mythic starts up",
        trigger_data: [],
        env: [],
    },
    cron: {
        description: "This workflow is triggered on a cron schedule",
        trigger_data: [
            {
                name: "cron",
                parameter_type: "String",
                default_value: "",
                value: "",
                initialValue: "",
                trackedValue: "",
                error: false,
                description: "a normal cron string indicating when you want to execute this workflow. This is a handy place to check out for cron execution strings (https://crontab.guru/)"
            }
        ],
        env: [],
    },
    payload_build_start: {
        description: "This workflow is triggered when a payload first starts being built.",
        trigger_data: [
            {
                name: "payload_types",
                parameter_type: "Array",
                default_value: "[]",
                value: [],
                initialValue: [],
                trackedValue: [],
                error: false,
                description: "a list of all the payload types where you want this to trigger. If you don't specify any, then it will trigger for all payload types."
            },
            {
                name: "selected_os",
                parameter_type: "Array",
                default_value: "[]",
                value: [],
                initialValue: [],
                trackedValue: [],
                error: false,
                description: "a list of all the selected os values you want this to trigger on. If you don't specify any, then it will trigger for all OS types."
            }
        ],
        env: payloadFields,
    },
    payload_build_finish: {
        description: "This workflow is triggered when a payload finishes being built (successfully or via error).",
        trigger_data: [
            {
                name: "payload_types",
                parameter_type: "Array",
                default_value: "[]",
                value: [],
                initialValue: [],
                trackedValue: [],
                error: false,
                description: "a list of all the payload types where you want this to trigger. If you don't specify any, then it will trigger for all payload types."
            },
            {
                name: "selected_os",
                parameter_type: "Array",
                default_value: "[]",
                value: [],
                initialValue: [],
                trackedValue: [],
                error: false,
                description: "a list of all the selected os values you want this to trigger on. If you don't specify any, then it will trigger for all OS types."
            }
        ],
        env: payloadFields,
    },
    task_create: {
        description: "This workflow is triggered when a Task is first created and sent for preprocessing at the payloadtype container",
        trigger_data: [
            {
                name: "payload_types_commands",
                parameter_type: "MapArray",
                default_value: "{}",
                value: {},
                initialValue: {},
                trackedValue: {},
                error: false,
                description: "a dictionary of payload type names to a list of all the command names where you want this workflow to trigger. If you specify a payload type name and no commands, then it will trigger for all commands for that payload type. Not specifying any payload types will trigger for all commands for all payload types."
            }
        ],
        env: taskFields,
    },
    task_start: {
        description: "This workflow is triggered when a Task is picked up by the agent to start executing",
        trigger_data: [
            {
                name: "payload_types_commands",
                parameter_type: "MapArray",
                default_value: "{}",
                value: {},
                initialValue: {},
                trackedValue: {},
                error: false,
                description: "a dictionary of payload type names to a list of all the command names where you want this workflow to trigger. If you specify a payload type name and no commands, then it will trigger for all commands for that payload type. Not specifying any payload types will trigger for all commands for all payload types."
            }
        ],
        env: taskFields,
    },
    task_finish: {
        description: "This workflow is triggered when a Task finishes either successfully or via error",
        trigger_data: [
            {
                name: "payload_types_commands",
                parameter_type: "MapArray",
                default_value: "{}",
                value: {},
                initialValue: {},
                trackedValue: {},
                error: false,
                description: "a dictionary of payload type names to a list of all the command names where you want this workflow to trigger. If you specify a payload type name and no commands, then it will trigger for all commands for that payload type. Not specifying any payload types will trigger for all commands for all payload types."
            }
        ],
        env: taskFields,
    },
    user_output: {
        description: "This workflow is triggered when a Task returns new output in the 'user_output' field for the user to see in the UI",
        trigger_data: [],
        env: [],
    },
    file_download: {
        description: "This workflow is triggered when a file finishes downloading from a callback to the Mythic server",
        trigger_data: [],
        env: [],
    },
    file_upload: {
        description: "This workflow is triggered when a file finishes uploading from the Mythic server to an agent",
        trigger_data: [],
        env: [],
    },
    screenshot: {
        description: "This workflow is triggered when a Task finishes sending a screenshot back to Mythic",
        trigger_data: [],
        env: [],
    },
    alert: {
        description: "This workflow is triggered when an agent sends an alert back to Mythic",
        trigger_data: [],
        env: []
    },
    callback_new: {
        description: "This workflow is triggered when a new callback is created",
        trigger_data: [
            {
                name: "payload_types",
                parameter_type: "Array",
                default_value: "[]",
                value: [],
                initialValue: [],
                trackedValue: [],
                error: false,
                description: "a list of all the payload types where you want this to trigger. If you don't specify any, then it will trigger for all payload types."
            },
            {
                name: "selected_os",
                parameter_type: "Array",
                default_value: "[]",
                value: [],
                initialValue: [],
                trackedValue: [],
                error: false,
                description: "a list of all the selected os values you want this to trigger on. If you don't specify any, then it will trigger for all OS types."
            }
        ],
        env: callbackFields,
    },
    callback_checkin: {
        description: "This workflow is triggered when a callback with a trigger threshold set (in minutes) checks in after a period of time greater than or equal to that threshold.",
        trigger_data: [
            {
                name: "payload_types",
                parameter_type: "Array",
                default_value: "[]",
                value: [],
                initialValue: [],
                trackedValue: [],
                error: false,
                description: "a list of all the payload types where you want this to trigger. If you don't specify any, then it will trigger for all payload types."
            },
            {
                name: "selected_os",
                parameter_type: "Array",
                default_value: "[]",
                value: [],
                initialValue: [],
                trackedValue: [],
                error: false,
                description: "a list of all the selected os values you want this to trigger on. If you don't specify any, then it will trigger for all OS types."
            }
        ],
        env: [...callbackFields, "previous_checkin", "checkin_difference"],
    },
    task_intercept: {
        description: "This workflow is triggered after a Task finishes its opsec_post check to allow one more chance for a task to be blocked.",
        trigger_data: [
            {
                name: "payload_types_commands",
                parameter_type: "MapArray",
                default_value: "{}",
                value: {},
                initialValue: {},
                trackedValue: {},
                error: false,
                description: "a dictionary of payload type names to a list of all the command names where you want this workflow to trigger. If you specify a payload type name and no commands, then it will trigger for all commands for that payload type. Not specifying any payload types will trigger for all commands for all payload types."
            }
        ],
        env: taskFields,
    },
    response_intercept: {
        description: "This workflow is triggered when a Task returns new output in the user_output field for the user to see in the UI, but first passes that output to this workflow for modification before saving it in the database.",
        trigger_data: [
        ],
        env: []
    },
    tag_create: {
        description: "This workflow is triggered when a new tag is created",
        trigger_data: [
            {
                name: "tag_types",
                parameter_type: "Array",
                default_value: "[]",
                value: [],
                initialValue: [],
                trackedValue: [],
                error: false,
                description: "a list of all the tag type names where you want this to trigger. If you don't specify any, then it will trigger for all tag types."
            }
        ],
        env: tagFields,
    }
}
const actionOptions = ["payload_create", "callback_create", "task_create", "custom_function", "conditional_check", "task_intercept", "response_intercept", "alert_create", "webhook_send"].sort();

const inputOptions = ["env", "upload", "download", "workflow", "mythic", "custom"].sort();
const inputOptionsData = {
    env: {
        description: "fetch the named value from the environment (including information that triggered the workflow)"
    },
    upload: {
        description: "this allows you to specify the name of a file that has been uploaded to Mythic. The resulting value is the agent_file_id UUID value for that file or \"\" if it doesn't exist."
    },
    download: {
        description: "this allows you to specify the name of a file that was downloaded to Mythic. The resulting value is the agent_file_id UUID value for that file, or \"\" if it doesn't exist."
    },
    workflow: {
        description: "this allows you to specify the name of a file that was uploaded as part of the workflow. You can see these files and upload/remove them by clicking the paperclip icon in the actions column when viewing the eventgroup workflow."
    },
    mythic: {
        description: "this allows you to get various pieces of information from Mythic that you can't get elsewhere. This is currently limited to apitoken."
    },
    output: {
        description: "this allows you to reference the output from a previous task by using the step name"
    },
    custom: {
        description: "this is a completely custom input that's whatever you desire"
    }
}
const outputOptionsData = {
    payload_create: {
        output_fields: payloadFields,
        description: "This action's output has access to all of a payload's fields or any custom value"
    },
    task_create: {
        output_fields: taskFields,
        description: "This action's output has access to all of a task's fields or any custom value"
    },
    callback_create: {
        output_fields: callbackFields,
        description: "This action's output has access to all of a callback's fields or any custom value"
    },
    custom_function: {
        output_fields: [],
        description: "This action's output has nothing provided by Mythic, but you can provide your own data"
    },
    conditional_check: {
        output_fields: [],
        description: "This action's output has nothing provided by Mythic, but you can provide your own data"
    },
    task_intercept: {
        output_fields: [],
        description: "This action's output has nothing provided by Mythic, but you can provide your own data"
    },
    response_intercept: {
        output_fields: [],
        description: "This action's output has nothing provided by Mythic, but you can provide your own data"
    },
    alert_create: {
        output_fields: [],
        description: "This action's output has nothing provided by Mythic, but you can provide your own data"
    },
    webhook_send: {
        output_fields: [],
        description: "This action's output has nothing provided by Mythic, but you can provide your own data"
    }
}
const ChooseOneOrCustom = ({choices, prevData, updateData, choicesLabel, textFieldPlaceholder,
                           textFieldName}) => {
    const [value, setValue] = React.useState("");
    const [type, setType] = React.useState(choices[0]);
    const onChangeLocalType = (e) => {
        setType(e.target.value);
    }
    const onChangeLocalValue = (name, newValue, error) => {
        setValue(newValue);
    }
    React.useEffect( () => {
        updateData({
            value, type
        });
    }, [value, type]);
    React.useEffect( () => {
        if(prevData){
            setValue(prevData.value);
            setType(prevData.type);
        }
    }, []);
    return (
        <div className="mythic-eventing-choice-row">
            <FormControl sx={{display: "inline-block", width: "100%",}}>
                <TextField
                    label={choicesLabel}
                    select
                    style={{width: "100%",}}
                    disabled={value.length > 0}
                    value={type}
                    onChange={onChangeLocalType}
                >
                    {choices.map((opt) => (
                        <MenuItem key={"step2inputs" + opt} value={opt}>
                            {opt}
                        </MenuItem>
                    ))}
                </TextField>
            </FormControl>
            <span className="mythic-eventing-choice-separator">or</span>
            <div className="mythic-eventing-choice-custom">
                <MythicTextField placeholder={textFieldPlaceholder} name={textFieldName}
                                 onChange={onChangeLocalValue}
                                 value={value}
                                 marginBottom={"0px"}/>
            </div>
        </div>
    )
}
const GetArrayValues = ({prevData, updateData, textFieldPlaceholder, textFieldName}) => {
    const [arrayValues, setArrayValues] = React.useState([]);
    const debouncedLocalInput = useDebounce(arrayValues, debounceDelay);
    React.useEffect( () => {
        updateData(arrayValues);
    }, [debouncedLocalInput]);
    const addElement = () => {
        setArrayValues([...arrayValues, ""]);
    }
    const removeElement = (i) => {
        const newLocalInput = [...arrayValues];
        newLocalInput.splice(i, 1);
        setArrayValues(newLocalInput);
    }
    const updateElement = (i, value) => {
        let newLocalInput = [...arrayValues];
        newLocalInput[i] = value;
        setArrayValues(newLocalInput);
    }
    React.useEffect( () => {
        if(prevData){
            setArrayValues(prevData);
        }
    }, [])
    return (
        <div className="mythic-eventing-array-list">
            {arrayValues.map( (a, i) => (
                <div className="mythic-eventing-array-row" key={"arrayentry" + i}>
                    <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={() => removeElement(i)}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                    <MythicTextField onChange={(name, value, error) => updateElement(i, value)} value={a}
                    name={textFieldName} placeholder={textFieldPlaceholder} marginBottom={"0px"}/>
                </div>
                )
            )}
            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" size="small" onClick={addElement}>
                <AddCircleOutlineIcon fontSize="small" />
            </IconButton>
        </div>
    )
}
const GetMultipleFileSelect = ({prevData, updateData}) => {
    const [files, setFiles] = React.useState([]);
    React.useEffect( () => {
        updateData(files);
    }, [files])
    React.useEffect( () => {
        if(prevData){
            setFiles(prevData);
        }
    }, [])
    const onFileMultChange = (evt) => {
        const selectedFiles = [...evt.target.files];
        setFiles((currentFiles) => {
            const existingFiles = new Set(currentFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
            const newFiles = selectedFiles.filter((file) => {
                const fileKey = `${file.name}:${file.size}:${file.lastModified}`;
                if(existingFiles.has(fileKey)){
                    return false;
                }
                existingFiles.add(fileKey);
                return true;
            });
            return [...currentFiles, ...newFiles];
        });
        evt.target.value = "";
    }
    const removeFile = (index) => {
        setFiles((currentFiles) => currentFiles.filter((_, i) => i !== index));
    }
    return (
        <div className="mythic-eventing-file-select">
            <Button className="mythic-table-row-action mythic-table-row-action-hover-success" variant="outlined" component="label" style={{display: "inline-block"}}>
                Select files
                <input onChange={onFileMultChange} type="file" hidden multiple />
            </Button>
            { files.length > 0 &&
                <div className="mythic-eventing-file-chip-list">
                    {files?.map((f, i) => (
                        <span className="mythic-eventing-file-chip" key={"selected-file" + f.name + i}>
                            <span className="mythic-eventing-file-chip-name">{f.name}</span>
                            <IconButton className="mythic-eventing-file-chip-remove" size="small" aria-label={"Remove " + f.name} onClick={() => removeFile(i)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </span>
                    ))}
                </div>
            }
        </div>
    )
}
const getRunAsDescription = ({runAs}) => {
    if(runAs.value !== ""){
        return runAsOptionsData["operator"]?.description;
    }
    return runAsOptionsData[runAs.type]?.description;
}
const CreateEventingStep1 = ({finished, back, first, last, cancel, prevData}) => {
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [trigger, setTrigger] = React.useState("manual");
    const [triggerData, setTriggerData] = React.useState([]);
    const [runAs, setRunAs] = React.useState({type: "bot", value: ""});
    const [keywords, setKeywords] = React.useState([]);
    const environmentRef = React.useRef("{}");
    const [files, setFiles] = React.useState([]);
    const onChangeTrigger = (event) => {
        setTrigger(event.target.value);
        setTriggerData(triggerOptionsData[event.target.value]?.trigger_data || []);
    }
    const onChangeTriggerData = (name, value, error) => {
        const newParams = triggerData.map((param) => {
            if (param.name === name) {
                return {...param, value, error}
            }
            return {...param};
        });
        setTriggerData(newParams);
    }
    const onChangeEnvironment = (newData) => {
        environmentRef.current = newData
    }
    const finishedStep1 = () => {
        if (environmentRef.current.length > 0) {
            try{
                JSON.parse(environmentRef.current);
            }catch(error){
                snackActions.error("Environment data should be a JSON dictionary or empty");
                return
            }
        }
        finished({
            name: name,
            description: description,
            trigger: trigger,
            trigger_data: triggerData.reduce( (prev, cur) => {
                return {...prev, [cur.name]: cur.value}
            }, {}),
            run_as: runAs,
            keywords: keywords,
            environment: environmentRef.current,
            files: files,
        });
    }
    React.useEffect( () => {
        if(prevData !== undefined){
            if(prevData.name !== undefined){
                setName(prevData.name);
            }
            if(prevData.description !== undefined){
                setDescription(prevData.description);
            }
            if(prevData.trigger !== undefined){
                setTrigger(prevData.trigger);
            }
            if(prevData.trigger_data !== undefined){
                let newTriggerData = [];
                for(const [key, value] of Object.entries(prevData.trigger_data)){
                    // key is like payload_types
                    let tempTriggerData = triggerOptionsData[prevData.trigger].trigger_data.filter(t => t.name === key);
                    if(tempTriggerData.length > 0){
                        newTriggerData.push(
                            {...tempTriggerData[0],
                                value: value,
                                initialValue: value,
                                trackedValue: value
                            }
                        )
                    }

                }
                setTriggerData(newTriggerData);
            }
            if(prevData.run_as !== undefined){
                setRunAs(prevData.run_as);
            }
            if(prevData.keywords !== undefined){
                setKeywords(prevData.keywords);
            }
            if(prevData.environment !== undefined){
                environmentRef.current = prevData.environment;
            }
            if(prevData.files !== undefined){
                setFiles(prevData.files);
            }
        }
    }, [prevData]);
    return (
        <div className="mythic-eventing-wizard-step">
            <div className="mythic-eventing-wizard-step-scroll">
                <div className="mythic-eventing-metadata-layout">
                    <div className="mythic-eventing-metadata-card mythic-eventing-metadata-card-wide">
                        <div className="mythic-eventing-metadata-card-header">
                            <div className="mythic-eventing-metadata-card-title">Workflow identity</div>
                            <div className="mythic-eventing-metadata-card-subtitle">Name and describe what this workflow is meant to do.</div>
                        </div>
                        <div className="mythic-eventing-metadata-field-grid">
                            <div className="mythic-eventing-metadata-field">
                                <div className="mythic-eventing-metadata-label">Workflow name</div>
                                <MythicTextField placeholder={"My custom workflow..."} onChange={(name, value, error) => setName(value)} value={name} marginBottom={"0px"} />
                            </div>
                            <div className="mythic-eventing-metadata-field">
                                <div className="mythic-eventing-metadata-label">Description</div>
                                <MythicTextField placeholder={"My custom workflow description..."} onChange={(name, value, error) => setDescription(value)} value={description} marginBottom={"0px"} />
                            </div>
                        </div>
                    </div>
                    <div className="mythic-eventing-metadata-card mythic-eventing-metadata-card-wide">
                        <div className="mythic-eventing-metadata-card-header">
                            <div className="mythic-eventing-metadata-card-title">Trigger behavior</div>
                            <div className="mythic-eventing-metadata-card-subtitle">{triggerOptionsData[trigger]?.description}</div>
                        </div>
                        <div className="mythic-eventing-metadata-field">
                            <div className="mythic-eventing-metadata-label">Trigger</div>
                            <FormControl sx={{ display: "inline-block", width: "100%" }} size="small">
                                <TextField
                                    label={"When should this workflow start"}
                                    select
                                    size={"small"}
                                    style={{ width: "100%"}}
                                    value={trigger}
                                    onChange={onChangeTrigger}
                                >
                                    {triggerOptions.map((opt) => (
                                        <MenuItem key={"step1" + opt} value={opt}>
                                            {opt}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </FormControl>
                        </div>
                        <div className="mythic-eventing-metadata-field">
                            <div className="mythic-eventing-metadata-label">Trigger data</div>
                            {triggerOptionsData[trigger]?.trigger_data?.length > 0 ?
                                (<div className="mythic-eventing-trigger-parameter-list">
                                    {triggerData?.map( t => (
                                        <CreatePayloadParameter key={t.name} onChange={onChangeTriggerData} displayMode="card" {...t} />
                                    ))}
                                </div>) :
                                (<div className="mythic-eventing-metadata-empty">None</div>)
                            }
                        </div>
                    </div>
                    <div className="mythic-eventing-metadata-card">
                        <div className="mythic-eventing-metadata-card-header">
                            <div className="mythic-eventing-metadata-card-title">Run context</div>
                            <div className="mythic-eventing-metadata-card-subtitle">{getRunAsDescription({runAs})}</div>
                        </div>
                        <div className="mythic-eventing-metadata-field">
                            <div className="mythic-eventing-metadata-label">Run as</div>
                            <ChooseOneOrCustom choices={runAsOptions} choicesLabel={""} updateData={setRunAs}
                                textFieldName={"Custom operator"} textFieldPlaceholder={"Specific operator..."}
                                prevData={prevData?.run_as}/>
                        </div>
                    </div>
                    <div className="mythic-eventing-metadata-card">
                        <div className="mythic-eventing-metadata-card-header">
                            <div className="mythic-eventing-metadata-card-title">Optional inputs</div>
                            <div className="mythic-eventing-metadata-card-subtitle">Keywords and files can be referenced by workflow steps later.</div>
                        </div>
                        <div className="mythic-eventing-metadata-field">
                            <div className="mythic-eventing-metadata-label">Keywords</div>
                            <GetArrayValues updateData={setKeywords} prevData={prevData?.keywords}
                            textFieldName={"keyword"} textFieldPlaceholder={"Keyword"}/>
                        </div>
                        <div className="mythic-eventing-metadata-field">
                            <div className="mythic-eventing-metadata-label">Files</div>
                            <GetMultipleFileSelect prevData={prevData?.files} updateData={setFiles} />
                        </div>
                    </div>
                    <div className="mythic-eventing-metadata-card mythic-eventing-metadata-card-wide">
                        <div className="mythic-eventing-metadata-card-header">
                            <div className="mythic-eventing-metadata-card-title">Environment</div>
                            <div className="mythic-eventing-metadata-card-subtitle">Provide JSON key-value pairs that every step can read.</div>
                        </div>
                        <div className="mythic-eventing-metadata-editor">
                            <ResponseDisplayPlaintext plaintext={environmentRef.current} onChangeContent={onChangeEnvironment} initial_mode={"json"} autoFormat={false} />
                        </div>
                    </div>
                </div>
            </div>
            <CreateEventingStepperNavigationButtons first={first} last={last} finished={finishedStep1} back={back} cancel={cancel} />
        </div>
    )
}

const getInputAdornment = (t) => {
    if(t === "custom"){return ""}
    if(inputOptions.includes(t)){
        return t + ".  ";
    }
    return "";
}
const getInputTypeDescription = (t) => {
    if(inputOptions.includes(t)){
        return inputOptionsData[t].description;
    }
    return inputOptionsData["output"].description;
}
const EventingStepConfigSection = ({title, description, children, className = ""}) => (
    <div className={`mythic-eventing-step-config-section ${className}`.trim()}>
        <div className="mythic-eventing-step-config-section-header">
            <div className="mythic-eventing-step-config-section-title">{title}</div>
            {description &&
                <div className="mythic-eventing-step-config-section-subtitle">{description}</div>
            }
        </div>
        <div className="mythic-eventing-step-config-section-body">
            {children}
        </div>
    </div>
)
const EventingStepFieldBlock = ({label, description, required = false, children, className = ""}) => (
    <div className={`mythic-eventing-step-field ${className}`.trim()}>
        <div className="mythic-eventing-step-field-heading">
            <span className="mythic-eventing-step-field-label">{label}</span>
            {required &&
                <span className="mythic-eventing-step-field-required">Required</span>
            }
        </div>
        {description &&
            <div className="mythic-eventing-step-field-description">{description}</div>
        }
        <div className="mythic-eventing-step-field-control">
            {children}
        </div>
    </div>
)
const eventingActionDataHelp = "At execution time, any values here that are the names of an input will be swapped out before the action runs.";
const EventingActionDataShell = ({children}) => (
    <>
        <Typography component="div" className="mythic-eventing-step-help-text">
            {eventingActionDataHelp}
        </Typography>
        <div className="mythic-eventing-action-data-list">
            {children}
        </div>
    </>
)
const EventingActionDataField = ({label, description, required = false, children, className = ""}) => (
    <div className={`mythic-eventing-action-data-card ${className}`.trim()}>
        <div className="mythic-eventing-action-data-copy">
            <div className="mythic-eventing-action-data-title-row">
                <Typography component="div" className="mythic-eventing-action-data-title">
                    {label}
                </Typography>
                {required &&
                    <span className="mythic-eventing-action-data-chip">Required</span>
                }
            </div>
            {description &&
                <Typography component="div" className="mythic-eventing-action-data-description">
                    {description}
                </Typography>
            }
        </div>
        <div className="mythic-eventing-action-data-control">
            {children}
        </div>
    </div>
)
const EventingStepEmptyInline = ({children}) => (
    <div className="mythic-eventing-step-empty-inline">{children}</div>
)
const EventingStepInputs = ({updateStep, index, localInputOptions, step1Data, prevData, syncKey = ""}) => {
    const theme = useTheme();
    const [localInputs, setLocalInputs] = React.useState(Array.isArray(prevData) ? prevData : []);
    const skipNextInputUpdate = React.useRef(false);
    const addLocalInput = () => {
        const newLocalInputs = [...localInputs, {
            name: "",
            type: localInputOptions[0],
            value: "",
            value_type: triggerOptionsData[step1Data.trigger].env.length > 0 ?
                triggerOptionsData[step1Data.trigger].env[0] : "",
        }];
        setLocalInputs(newLocalInputs);
    }
    const changeLocalInputType = (event, i) => {
        let newLocalInput = [...localInputs];
        newLocalInput[i].type = event.target.value;
        if(newLocalInput[i].type === "mythic"){
            newLocalInput[i].value = "apitoken";
        } else if(newLocalInput[i].type.includes(".")){
            newLocalInput[i].value = newLocalInput[i].type;
        } else {
            newLocalInput[i].value = "";
        }
        setLocalInputs(newLocalInput);
    }
    const onChangeLocalInputValueType = (event, i) => {
        let newLocalInput = [...localInputs];
        newLocalInput[i].value_type = event.target.value;
        setLocalInputs(newLocalInput);
    }
    const onChangeLocalInputName = (i, value) => {
        let newLocalInput = [...localInputs];
        newLocalInput[i].name = value;
        setLocalInputs(newLocalInput);
    }
    const onChangeLocalInputValue = (i, value) => {
        let newLocalInput = [...localInputs];
        newLocalInput[i].value = value;
        setLocalInputs(newLocalInput);
    }
    const removeLocalInput = (i) => {
        const newLocalInput = [...localInputs];
        newLocalInput.splice(i, 1);
        setLocalInputs(newLocalInput);
    }
    const debouncedLocalInput = useDebounce(localInputs, debounceDelay);
    React.useEffect( () => {
        if(skipNextInputUpdate.current){
            skipNextInputUpdate.current = false;
            return;
        }
        updateStep(index, "inputs", debouncedLocalInput);
    }, [debouncedLocalInput]);
    React.useEffect( () => {
        if(prevData.length > 0 && localInputs.length === 0){
            setLocalInputs(prevData);
        }
    }, [prevData]);
    React.useEffect( () => {
        if(syncKey !== ""){
            skipNextInputUpdate.current = true;
            setLocalInputs(prevData || []);
        }
    }, [syncKey]);
    return (
        <div className="mythic-eventing-step-dynamic-section">
            <div className="mythic-eventing-step-list">
                {localInputs.length === 0 &&
                    <EventingStepEmptyInline>No inputs configured.</EventingStepEmptyInline>
                }
                {localInputs.map( (d, i) => (
                    <div className="mythic-eventing-step-list-item mythic-eventing-step-list-item-editable" key={"localinputs" + i}>
                        <div className="mythic-eventing-step-input-grid">
                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger mythic-eventing-step-row-action" size="small" onClick={() => removeLocalInput(i)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                            <MythicTextField name={"Input name"} placeholder={"Input name"}
                                             onChange={(name, value, error) => onChangeLocalInputName(i, value)}
                                             value={localInputs[i].name}
                                             marginBottom={"0px"}/>
                            <FormControl sx={{display: "inline-block", width: "100%"}}>
                                <TextField
                                    label={"Input source"}
                                    select
                                    size={"small"}
                                    style={{width: "100%"}}
                                    value={localInputs[i].type}
                                    onChange={(e) => {
                                        changeLocalInputType(e, i)
                                    }}
                                >
                                    {localInputOptions.map((opt) => (
                                        <MenuItem key={"step2inputs" + opt} value={opt}>
                                            {opt}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </FormControl>
                            {localInputs[i].type === "env" && triggerOptionsData[step1Data.trigger].env.length > 0 ?
                                (
                                    <div className="mythic-eventing-choice-row mythic-eventing-step-choice-row">
                                        <FormControl sx={{display: "inline-block", width: "100%"}}>
                                            <TextField
                                                label={"Environment option"}
                                                select
                                                size={"small"}
                                                style={{width: "100%"}}
                                                disabled={localInputs[i].value.length > 0}
                                                value={localInputs[i].value_type}
                                                onChange={(e) => {
                                                    onChangeLocalInputValueType(e, i)
                                                }}
                                            >
                                                {triggerOptionsData[step1Data.trigger].env.map((opt) => (
                                                    <MenuItem key={"step2inputs" + opt} value={opt}>
                                                        {opt}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </FormControl>
                                        <span className="mythic-eventing-choice-separator">or</span>
                                        <div className="mythic-eventing-choice-custom">
                                            <MythicTextField placeholder={""} name={"Custom value"}
                                                             onChange={(name, value, error) => onChangeLocalInputValue(i, value)}
                                                             value={localInputs[i].value}
                                                             marginBottom={"0px"} />
                                        </div>
                                    </div>
                                )
                                :
                                (<MythicTextField placeholder={""} name={"Input value"}
                                                  onChange={(name, value, error) => onChangeLocalInputValue(i, value)}
                                                  value={localInputs[i].value}
                                                  marginBottom={"0px"} InputProps={{
                                    startAdornment:
                                        <Typography
                                            style={{color: theme.palette.secondary.main, marginRight: "5px"}}>
                                            {getInputAdornment(localInputs[i].type)}
                                        </Typography>
                                }}/>)
                            }
                            <div className="mythic-eventing-step-helper-text">{getInputTypeDescription(localInputs[i].type)}</div>
                        </div>
                    </div>
                ))}
            </div>
            <Button className="mythic-table-row-action mythic-table-row-action-hover-success" onClick={addLocalInput} variant="outlined" startIcon={<AddCircleIcon fontSize="small" />}>
                Add input
            </Button>
        </div>
    )
}
const EventingStepOutputs = ({updateStep, index, selectedAction, prevData}) => {
    const [localOutputs, setLocalOutputs] = React.useState([]);
    const addLocalOutput = () => {
        const newLocalOutput = [...localOutputs, {
            name: "",
            type: outputOptionsData[selectedAction].output_fields.length > 0 ?
                outputOptionsData[selectedAction].output_fields[0] : "",
            value: "",
        }];
        setLocalOutputs(newLocalOutput);
    }
    const onChangeLocalOutputName = (i, value) => {
        let newLocalOutput = [...localOutputs];
        newLocalOutput[i].name = value;
        setLocalOutputs(newLocalOutput);
    }
    const onChangeLocalOutputValue = (i, value) => {
        let newLocalOutput = [...localOutputs];
        newLocalOutput[i].value = value;
        setLocalOutputs(newLocalOutput);
    }
    const onChangeLocalOutputType = (event, i) => {
        let newLocalOutputs = [...localOutputs];
        newLocalOutputs[i].type = event.target.value;
        setLocalOutputs(newLocalOutputs);
    }
    const removeLocalOutput = (i) => {
        const newLocalOutput = [...localOutputs];
        newLocalOutput.splice(i, 1);
        setLocalOutputs(newLocalOutput);
    }
    const debouncedLocalOutput = useDebounce(localOutputs, debounceDelay);
    React.useEffect( () => {
        updateStep(index, "outputs", debouncedLocalOutput);
    }, [debouncedLocalOutput]);
    React.useEffect( () => {
        if(prevData.length > 0 && localOutputs.length === 0){
            setLocalOutputs(prevData);
        }
    }, [prevData]);
    return (
        <div className="mythic-eventing-step-dynamic-section">
            <div className="mythic-eventing-step-list">
                {localOutputs.length === 0 &&
                    <EventingStepEmptyInline>No outputs configured.</EventingStepEmptyInline>
                }
                {localOutputs.map( (d, i) => (
                    <div className="mythic-eventing-step-list-item mythic-eventing-step-list-item-editable" key={"localoutputs" + i}>
                        <div className="mythic-eventing-step-output-grid">
                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger mythic-eventing-step-row-action" size="small" onClick={() => removeLocalOutput(i)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                            <MythicTextField name={"Output name"} placeholder={"Output name"}
                                             onChange={(name, value, error) => onChangeLocalOutputName(i, value)}
                                             value={localOutputs[i].name}
                                             marginBottom={"0px"}/>
                            {outputOptionsData[selectedAction].output_fields.length > 0 ? (
                                <div className="mythic-eventing-choice-row mythic-eventing-step-choice-row">
                                    <FormControl sx={{display: "inline-block", width: "100%"}}>
                                        <TextField
                                            label={"Output option"}
                                            select
                                            size={"small"}
                                            style={{width: "100%"}}
                                            disabled={localOutputs[i].value.length > 0}
                                            value={localOutputs[i].type}
                                            onChange={(e) => {
                                                onChangeLocalOutputType(e, i)
                                            }}
                                        >
                                            {outputOptionsData[selectedAction].output_fields.map((opt) => (
                                                <MenuItem key={"step2inputs" + opt} value={opt}>
                                                    {opt}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </FormControl>
                                    <span className="mythic-eventing-choice-separator">or</span>
                                    <div className="mythic-eventing-choice-custom">
                                        <MythicTextField placeholder={""} name={"Custom value"}
                                                         onChange={(name, value, error) => onChangeLocalOutputValue(i, value)}
                                                         value={localOutputs[i].value}
                                                         marginBottom={"0px"}/>
                                    </div>
                                </div>
                            ) : (
                                <MythicTextField placeholder={""} name={"Custom value"}
                                                 onChange={(name, value, error) => onChangeLocalOutputValue(i, value)}
                                                 value={localOutputs[i].value}
                                                 marginBottom={"0px"}/>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <Button className="mythic-table-row-action mythic-table-row-action-hover-success" onClick={addLocalOutput} variant="outlined" startIcon={<AddCircleIcon fontSize="small" />}>
                Add output
            </Button>
        </div>
    )
}
const EventingTaskCreateExistingTaskDialog = ({loading, onClose, onSelect, tasks}) => {
    const [filterText, setFilterText] = React.useState("");
    const filteredTasks = React.useMemo(() => {
        return getFilteredEventingRows(tasks, filterText, (task) => [
            task.display_id,
            task.command_name,
            getEventingTaskCallbackDisplay(task),
            getEventingTaskPayloadType(task),
            task.parameter_group_name,
            task.display_params,
            task.original_params,
            task.mythic_parsed_params,
        ].join(" "));
    }, [filterText, tasks]);
    const pagination = useMythicClientPagination({
        items: filteredTasks,
        resetKey: `${tasks.length}:${filterText}`,
        rowsPerPage: 10,
    });
    return (
        <>
            <DialogTitle>Select an executed task</DialogTitle>
            <DialogContent dividers={true}>
                <Typography className="mythic-eventing-task-helper-summary" component="div">
                    Pick a previous task to copy its parsed parameters and parameter group into this step.
                </Typography>
                <div className="mythic-eventing-task-helper-filter">
                    <TextField
                        fullWidth
                        label="Filter tasks"
                        onChange={(event) => setFilterText(event.target.value)}
                        size="small"
                        value={filterText}
                    />
                </div>
                <TableContainer className="mythicElement mythic-dialog-table-wrap mythic-fixed-row-table-wrap mythic-eventing-task-helper-table">
                    <Table stickyHeader size="small" style={{height: "auto"}}>
                        <TableHead>
                            <TableRow>
                                <MythicStyledTableCell style={{width: "6rem"}}>Task</MythicStyledTableCell>
                                <MythicStyledTableCell>Callback</MythicStyledTableCell>
                                <MythicStyledTableCell style={{width: "8rem"}}>Payload type</MythicStyledTableCell>
                                <MythicStyledTableCell style={{width: "9rem"}}>Parameter group</MythicStyledTableCell>
                                <MythicStyledTableCell>Display parameters</MythicStyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <MythicTableLoadingState
                                    colSpan={5}
                                    columns={5}
                                    compact
                                    rows={4}
                                    title="Loading tasks"
                                    description="Fetching previous executions."
                                    minHeight={120}
                                />
                            ) : filteredTasks.length === 0 ? (
                                <MythicTableEmptyState
                                    colSpan={5}
                                    compact
                                    title="No matching tasks"
                                    description="No previous executions were found for that command."
                                    minHeight={180}
                                />
                            ) : pagination.pageData.map((task) => (
                                <TableRow
                                    hover
                                    key={task.id}
                                    onClick={() => onSelect(task)}
                                    style={{cursor: "pointer"}}
                                    tabIndex={0}
                                >
                                    <MythicStyledTableCell>{task.display_id}</MythicStyledTableCell>
                                    <MythicStyledTableCell>{getEventingTaskCallbackDisplay(task)}</MythicStyledTableCell>
                                    <MythicStyledTableCell>{getEventingTaskPayloadType(task)}</MythicStyledTableCell>
                                    <MythicStyledTableCell>{task.parameter_group_name || "Default"}</MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        <Typography className="mythic-eventing-task-helper-preview" component="div">
                                            {task.display_params || task.original_params || task.mythic_parsed_params || "No parameters"}
                                        </Typography>
                                    </MythicStyledTableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                {!loading &&
                    <MythicClientSideTablePagination pagination={pagination} />
                }
            </DialogContent>
            <DialogActions>
                <Button className="mythic-table-row-action" onClick={onClose} variant="outlined">Close</Button>
            </DialogActions>
        </>
    )
}
const EventingTaskCreateCallbackDialog = ({callbacks, loading, onClose, onSelect}) => {
    const [filterText, setFilterText] = React.useState("");
    const sortedCallbacks = React.useMemo(() => {
        return [...callbacks].sort((left, right) => (right.callback?.id || 0) - (left.callback?.id || 0));
    }, [callbacks]);
    const filteredCallbacks = React.useMemo(() => {
        return getFilteredEventingRows(sortedCallbacks, filterText, (entry) => [
            entry.callback?.display_id,
            entry.callback?.user,
            entry.callback?.host,
            entry.callback?.description,
            entry.callback?.payload?.payloadtype?.name,
            entry.command?.payloadtype?.name,
            entry.command?.cmd,
        ].join(" "));
    }, [filterText, sortedCallbacks]);
    const pagination = useMythicClientPagination({
        items: filteredCallbacks,
        resetKey: `${callbacks.length}:${filterText}`,
        rowsPerPage: 10,
    });
    return (
        <>
            <DialogTitle>Select a callback for tasking</DialogTitle>
            <DialogContent dividers={true}>
                <Typography className="mythic-eventing-task-helper-summary" component="div">
                    Choose an active callback that has this command loaded, then fill out the tasking modal without submitting a task.
                </Typography>
                <div className="mythic-eventing-task-helper-filter">
                    <TextField
                        fullWidth
                        label="Filter callbacks"
                        onChange={(event) => setFilterText(event.target.value)}
                        size="small"
                        value={filterText}
                    />
                </div>
                <TableContainer className="mythicElement mythic-dialog-table-wrap mythic-fixed-row-table-wrap mythic-eventing-task-helper-table">
                    <Table stickyHeader size="small" style={{height: "auto"}}>
                        <TableHead>
                            <TableRow>
                                <MythicStyledTableCell style={{width: "6rem"}}>Callback</MythicStyledTableCell>
                                <MythicStyledTableCell>User</MythicStyledTableCell>
                                <MythicStyledTableCell>Host</MythicStyledTableCell>
                                <MythicStyledTableCell style={{width: "8rem"}}>Callback type</MythicStyledTableCell>
                                <MythicStyledTableCell style={{width: "8rem"}}>Command type</MythicStyledTableCell>
                                <MythicStyledTableCell>Description</MythicStyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <MythicTableLoadingState
                                    colSpan={6}
                                    columns={6}
                                    compact
                                    rows={4}
                                    title="Loading callbacks"
                                    description="Finding active callbacks with this command."
                                    minHeight={120}
                                />
                            ) : filteredCallbacks.length === 0 ? (
                                <MythicTableEmptyState
                                    colSpan={6}
                                    compact
                                    title="No matching callbacks"
                                    description="No active callbacks have this command loaded."
                                    minHeight={180}
                                />
                            ) : pagination.pageData.map((entry) => (
                                <TableRow
                                    hover
                                    key={entry.id}
                                    onClick={() => onSelect(entry)}
                                    style={{cursor: "pointer"}}
                                    tabIndex={0}
                                >
                                    <MythicStyledTableCell>{entry.callback.display_id}</MythicStyledTableCell>
                                    <MythicStyledTableCell>{entry.callback.user}</MythicStyledTableCell>
                                    <MythicStyledTableCell>{entry.callback.host}</MythicStyledTableCell>
                                    <MythicStyledTableCell>{entry.callback.payload?.payloadtype?.name}</MythicStyledTableCell>
                                    <MythicStyledTableCell>{entry.command.payloadtype?.name}</MythicStyledTableCell>
                                    <MythicStyledTableCell>{entry.callback.description}</MythicStyledTableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                {!loading &&
                    <MythicClientSideTablePagination pagination={pagination} />
                }
            </DialogContent>
            <DialogActions>
                <Button className="mythic-table-row-action" onClick={onClose} variant="outlined">Close</Button>
            </DialogActions>
        </>
    )
}
const EventingStepActionDataTaskCreate = ({updateStep, index, prevData, step1Data, currentInputs, updateStepInputs, updateStep1Data}) => {
    const me = useReactiveVar(meState);
    const paramsDictionaryRef = React.useRef("");
    const appliedCallbackDefaultRef = React.useRef(false);
    const [openExistingTaskDialog, setOpenExistingTaskDialog] = React.useState(false);
    const [openCallbackDialog, setOpenCallbackDialog] = React.useState(false);
    const [taskOptions, setTaskOptions] = React.useState([]);
    const [callbackOptions, setCallbackOptions] = React.useState([]);
    const [taskingParameterContext, setTaskingParameterContext] = React.useState({open: false, callback: null, command: null});
    const [actionData, setActionData] = React.useState({
        callback_display_id: "",
        command_name: "",
        payload_type: "",
        params: "",
        params_dictionary: {},
        parameter_group_name: "Default",
        parent_task_id: "",
        is_interactive_task: false,
        interactive_task_type:"0"
    });
    const operationId = me?.user?.current_operation_id || 0;
    const [getExecutedTasks, {loading: loadingExecutedTasks}] = useLazyQuery(eventingTaskCreateExecutedTasksQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            const payloadType = actionData.payload_type.trim();
            const tasks = (data?.task || []).filter((task) => {
                if(payloadType === ""){
                    return true;
                }
                return task.command?.payloadtype?.name === payloadType || task.callback?.payload?.payloadtype?.name === payloadType;
            });
            setTaskOptions(tasks);
            setOpenExistingTaskDialog(true);
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to load previous task executions");
            setOpenExistingTaskDialog(false);
        }
    });
    const [getTaskingCallbacks, {loading: loadingTaskingCallbacks}] = useLazyQuery(eventingTaskCreateCallbacksQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            const payloadType = actionData.payload_type.trim();
            const callbacks = (data?.loadedcommands || []).filter((entry) => {
                if(payloadType === ""){
                    return true;
                }
                return entry.command?.payloadtype?.name === payloadType || entry.callback?.payload?.payloadtype?.name === payloadType;
            });
            setCallbackOptions(callbacks);
            setOpenCallbackDialog(true);
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to load callbacks for tasking");
            setOpenCallbackDialog(false);
        }
    });
    const debouncedLocalOutput = useDebounce(actionData, debounceDelay);
    React.useEffect( () => {
        let simplifiedParams = {};
        if(actionData.callback_display_id.length > 0){
            simplifiedParams.callback_display_id = actionData.callback_display_id;
        }
        if(actionData.command_name.length > 0){
            simplifiedParams.command_name = actionData.command_name;
        }
        if(actionData.payload_type.length > 0){
            simplifiedParams.payload_type = actionData.payload_type;
        }
        if(actionData.params.length > 0){
            simplifiedParams.params = actionData.params;
        }
        const paramsDictionaryValue = actionData.params_dictionary;
        const hasParamsDictionary = typeof paramsDictionaryValue === "string" ?
            paramsDictionaryValue.length > 0 :
            Object.keys(paramsDictionaryValue || {}).length > 0;
        if(hasParamsDictionary){
            try{
                simplifiedParams.params_dictionary = typeof paramsDictionaryValue === "string" ?
                    JSON.parse(paramsDictionaryValue) :
                    paramsDictionaryValue;
            }catch{
                simplifiedParams.params_dictionary = paramsDictionaryValue;
            }
        }
        if(actionData.parameter_group_name.length > 0 && actionData.parameter_group_name !== "Default"){
            simplifiedParams.parameter_group_name = actionData.parameter_group_name;
        }
        if(actionData.parent_task_id.length > 0){
            simplifiedParams.parent_task_id = actionData.parent_task_id;
        }
        if(actionData.is_interactive_task){
            simplifiedParams.is_interactive_task = actionData.is_interactive_task;
            simplifiedParams.interactive_task_type = actionData.interactive_task_type;
        }
        updateStep(index, "action_data", simplifiedParams);
    }, [debouncedLocalOutput]);
    const onChangeValue = (name, value, error) => {
        setActionData({...actionData, [name]: value});
    }
    const onChangeParamsDictionary = (newValue) => {
        paramsDictionaryRef.current = newValue;
        setActionData({...actionData, params_dictionary: newValue});
    }
    const fetchExistingTasks = () => {
        const commandName = actionData.command_name.trim();
        if(commandName === ""){
            snackActions.warning("Specify a command name first");
            return;
        }
        if(operationId <= 0){
            snackActions.warning("Select an operation before querying tasks");
            return;
        }
        setTaskOptions([]);
        setOpenExistingTaskDialog(true);
        getExecutedTasks({variables: {operation_id: operationId, command_name: commandName}});
    }
    const fetchTaskingCallbacks = () => {
        const commandName = actionData.command_name.trim();
        if(commandName === ""){
            snackActions.warning("Specify a command name first");
            return;
        }
        if(operationId <= 0){
            snackActions.warning("Select an operation before querying callbacks");
            return;
        }
        setCallbackOptions([]);
        setOpenCallbackDialog(true);
        getTaskingCallbacks({variables: {operation_id: operationId, command_name: commandName}});
    }
    const applyParametersToActionData = ({commandName, parameterGroupName, parameters, payloadType}) => {
        const formattedParameters = formatTaskCreateParameters(parameters);
        paramsDictionaryRef.current = formattedParameters;
        setActionData((current) => ({
            ...current,
            command_name: commandName || current.command_name,
            payload_type: payloadType || current.payload_type,
            params: "",
            params_dictionary: formattedParameters,
            parameter_group_name: parameterGroupName || "Default",
        }));
    }
    const applyParameterStringToActionData = ({commandName, parameterGroupName, parameters, payloadType}) => {
        paramsDictionaryRef.current = "";
        setActionData((current) => ({
            ...current,
            command_name: commandName || current.command_name,
            payload_type: payloadType || current.payload_type,
            params: parameters || "",
            params_dictionary: "",
            parameter_group_name: parameterGroupName || "Default",
        }));
    }
    const selectExistingTask = (task) => {
        const parameterFill = getExistingTaskParameterFill(task);
        const taskFillData = {
            commandName: task.command_name || task.command?.cmd || actionData.command_name,
            parameterGroupName: task.parameter_group_name || "Default",
            payloadType: task.command?.payloadtype?.name || actionData.payload_type,
        };
        if(parameterFill.type === "dictionary"){
            applyParametersToActionData({
                ...taskFillData,
                parameters: parameterFill.value,
            });
        }else{
            applyParameterStringToActionData({
                ...taskFillData,
                parameters: parameterFill.value,
            });
        }
        setOpenExistingTaskDialog(false);
        snackActions.success("Copied parameters from task " + task.display_id);
    }
    const selectTaskingCallback = (entry) => {
        setOpenCallbackDialog(false);
        setTaskingParameterContext({
            open: true,
            callback: entry.callback,
            command: {...entry.command, parsedParameters: {}},
        });
    }
    const applyCapturedFilesToInputs = (parameters, capturedFiles) => {
        if(!Array.isArray(capturedFiles) || capturedFiles.length === 0 || typeof parameters !== "object" || parameters === null || Array.isArray(parameters)){
            return parameters;
        }
        const nextParameters = {...parameters};
        const existingInputNames = new Set((currentInputs || []).map((input) => input.name).filter(Boolean));
        const newInputs = [];
        const filesToRegister = [];
        const existingFileNames = new Set((step1Data?.files || []).map((file) => file?.name).filter(Boolean));
        capturedFiles.forEach((fileEntry) => {
            const baseName = getSafeEventingInputName(fileEntry.inputName || `FILE_${fileEntry.parameterName}`, "FILE");
            const inputName = getUniqueEventingInputName(baseName, existingInputNames);
            if(Array.isArray(nextParameters[fileEntry.parameterName])){
                const values = [...nextParameters[fileEntry.parameterName]];
                values[fileEntry.index || 0] = inputName;
                nextParameters[fileEntry.parameterName] = values;
            }else{
                nextParameters[fileEntry.parameterName] = inputName;
            }
            newInputs.push({
                name: inputName,
                type: "upload",
                value: fileEntry.filename,
                value_type: "",
            });
            if(fileEntry.file?.name && !existingFileNames.has(fileEntry.file.name)){
                filesToRegister.push(fileEntry.file);
                existingFileNames.add(fileEntry.file.name);
            }
        });
        if(newInputs.length > 0){
            updateStepInputs(upsertStepInputs(currentInputs || [], newInputs));
        }
        if(filesToRegister.length > 0 && updateStep1Data){
            updateStep1Data((currentStep1Data) => ({
                ...currentStep1Data,
                files: [...(currentStep1Data?.files || []), ...filesToRegister],
            }));
        }
        return nextParameters;
    }
    const submitCapturedTaskingParameters = (cmd, newParameters, files, selectedParameterGroup, payloadType, metadata) => {
        const parsedParameters = metadata?.collapsedParameters || parseTaskCreateParameters(newParameters);
        const parametersWithFileInputs = applyCapturedFilesToInputs(parsedParameters, metadata?.capturedFiles || files);
        applyParametersToActionData({
            commandName: cmd,
            parameterGroupName: selectedParameterGroup,
            parameters: parametersWithFileInputs,
            payloadType,
        });
        setTaskingParameterContext({open: false, callback: null, command: null});
        snackActions.success("Captured tasking parameters for the eventing step");
    }
    React.useEffect( () => {
        if(prevData){
            let updatedData = {...actionData, ...prevData};
            if(typeof updatedData.params_dictionary !== 'string'){
                paramsDictionaryRef.current = JSON.stringify(updatedData.params_dictionary, null, 4);
                updatedData.params_dictionary = JSON.stringify(updatedData.params_dictionary, null, 4);
           } else {
                paramsDictionaryRef.current = updatedData.params_dictionary || "";
            }
            setActionData(updatedData);
        }
    }, []);
    React.useEffect( () => {
        if(appliedCallbackDefaultRef.current || !callbackTriggerNames.includes(step1Data?.trigger)){
            return;
        }
        const callbackInput = getCallbackDisplayIdInput();
        if(!(currentInputs || []).some((input) => input.name === callbackTriggerTaskCreateInputName)){
            updateStepInputs(upsertStepInputs(currentInputs || [], [callbackInput]));
        }
        setActionData((current) => {
            if(current.callback_display_id.length > 0){
                return current;
            }
            return {...current, callback_display_id: callbackTriggerTaskCreateInputName};
        });
        appliedCallbackDefaultRef.current = true;
    }, [currentInputs, step1Data?.trigger, updateStepInputs]);
    return (
        <EventingActionDataShell>
            <EventingActionDataField label="Callback Display ID"
                                     required
                                     description={"This is the display ID of the callback where you want to execute this task. Callback checkin and callback new triggers can use CALLBACK_DISPLAY_ID from env.display_id automatically."}
            >
                <MythicTextField onChange={onChangeValue} value={actionData.callback_display_id} name={"callback_display_id"} />
            </EventingActionDataField>
            <EventingActionDataField
                label="Command Name"
                required
                description={"This is the name of the command you want to execute. If this command is part of a command augmentation container (like forge), then you need to also specify that container's name in the payload_type field below."}
            >
                <div className="mythic-eventing-task-create-command-row">
                    <MythicTextField onChange={onChangeValue} value={actionData.command_name} name={"command_name"} />
                    <div className="mythic-eventing-task-create-command-actions">
                        <MythicStyledTooltip title="Use the parsed parameters from a previous execution of this command">
                            <span>
                                <Button
                                    className="mythic-table-row-action mythic-table-row-action-hover-info"
                                    disabled={actionData.command_name.trim() === ""}
                                    onClick={fetchExistingTasks}
                                    size="small"
                                    startIcon={<SearchIcon fontSize="small" />}
                                    variant="outlined"
                                >
                                    Use task
                                </Button>
                            </span>
                        </MythicStyledTooltip>
                        <MythicStyledTooltip title="Open the normal tasking modal on a selected callback and capture the final parameters">
                            <span>
                                <Button
                                    className="mythic-table-row-action mythic-table-row-action-hover-info"
                                    disabled={actionData.command_name.trim() === ""}
                                    onClick={fetchTaskingCallbacks}
                                    size="small"
                                    startIcon={<TerminalIcon fontSize="small" />}
                                    variant="outlined"
                                >
                                    Build params
                                </Button>
                            </span>
                        </MythicStyledTooltip>
                    </div>
                </div>
            </EventingActionDataField>
            <EventingActionDataField
                label="Payload Type"
                description="Use this if you want to specify a command name that belongs to a payload type other than the one backing this callback. This is useful for command augmentation commands."
            >
                <MythicTextField onChange={onChangeValue} value={actionData.payload_type} name={"payload_type"} />
            </EventingActionDataField>
            <EventingActionDataField
                label="Parameters"
                description="Specify a parameter string here, or use a dictionary of named parameters below."
            >
                <MythicTextField onChange={onChangeValue} value={actionData.params} name={"params"} />
            </EventingActionDataField>
            <EventingActionDataField
                label="Parameters Dictionary"
                description="Specify a dictionary of named parameters here, or use the string parameter value above."
            >
                <ResponseDisplayPlaintext plaintext={paramsDictionaryRef.current} autoFormat={false}
                                          onChangeContent={onChangeParamsDictionary} initial_mode={"json"}/>
            </EventingActionDataField>
            <EventingActionDataField
                label="Parameter Group Name"
                description="This can stay default unless you explicitly want your parameters treated as a specific parameter group."
            >
                <MythicTextField onChange={onChangeValue} value={actionData.parameter_group_name} name={"parameter_group_name"} />
            </EventingActionDataField>
            <EventingActionDataField
                label="Parent Task ID"
                description="Set this to the Task ID, not display ID or agent ID, of another task to make it appear as a subtask."
            >
                <MythicTextField onChange={onChangeValue} value={actionData.parent_task_id} name={"parent_task_id"} />
            </EventingActionDataField>
            <EventingActionDataField
                label="Interactive Task"
                description="Mark this as an interactive follow-on task inside an existing interactive task session."
            >
                <Switch onChange={(e) => {onChangeValue("is_interactive_task", e.target.checked, "")}} checked={actionData.is_interactive_task} />
            </EventingActionDataField>
            {actionData.is_interactive_task &&
                <EventingActionDataField
                    label="Interactive Task Type"
                    description="This indicates the kind of data sent as part of the interactive task. 0 means standard input and is a safe default."
                >
                    <MythicTextField onChange={onChangeValue} value={actionData.interactive_task_type} name={"interactive_task_type"} />
                </EventingActionDataField>
            }
            {openExistingTaskDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="lg"
                    open={openExistingTaskDialog}
                    onClose={() => setOpenExistingTaskDialog(false)}
                    innerDialog={<EventingTaskCreateExistingTaskDialog
                        loading={loadingExecutedTasks}
                        onClose={() => setOpenExistingTaskDialog(false)}
                        onSelect={selectExistingTask}
                        tasks={taskOptions}
                    />}
                />
            }
            {openCallbackDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="lg"
                    open={openCallbackDialog}
                    onClose={() => setOpenCallbackDialog(false)}
                    innerDialog={<EventingTaskCreateCallbackDialog
                        callbacks={callbackOptions}
                        loading={loadingTaskingCallbacks}
                        onClose={() => setOpenCallbackDialog(false)}
                        onSelect={selectTaskingCallback}
                    />}
                />
            }
            {taskingParameterContext.open &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="lg"
                    open={taskingParameterContext.open}
                    onClose={() => setTaskingParameterContext({open: false, callback: null, command: null})}
                    innerDialog={<TaskParametersDialog
                        captureOnly={true}
                        command={taskingParameterContext.command}
                        callback_id={taskingParameterContext.callback.id}
                        payloadtype_id={taskingParameterContext.callback.payload.payloadtype.id}
                        operation_id={taskingParameterContext.callback.operation_id}
                        onSubmit={submitCapturedTaskingParameters}
                        onClose={() => setTaskingParameterContext({open: false, callback: null, command: null})}
                    />}
                />
            }
        </EventingActionDataShell>
    )

}
const EventingStepActionDataCustomFunction = ({allSteps, updateStep, index, prevData}) => {
    const paramsDictionaryRef = React.useRef("");
    const [actionData, setActionData] = React.useState({
        container_name: "",
        function_name: "",
        parameters_dictionary: ""
    });
    const debouncedLocalOutput = useDebounce(actionData, debounceDelay);
    React.useEffect( () => {
        let simplifiedParams = {};
        simplifiedParams.container_name = actionData.container_name;
        simplifiedParams.function_name = actionData.function_name;
        try{
            let additionalParams = JSON.parse(paramsDictionaryRef.current);
            simplifiedParams = {...simplifiedParams, ...additionalParams};
        }catch{

        }
        updateStep(index, "action_data", simplifiedParams);
    }, [debouncedLocalOutput]);
    const onChangeValue = (name, value, error) => {
        setActionData({...actionData, [name]: value});
    }
    const onChangeParamsDictionary = (newValue) => {
        paramsDictionaryRef.current = newValue;
        setActionData({...actionData, parameters_dictionary: newValue});
    }
    React.useEffect( () => {
        if(prevData){
            let {container_name, function_name, params_dictionary, steps, ...otherData} = prevData;
            let updatedData = {
                container_name: container_name === undefined ? "" : container_name,
                function_name: function_name === undefined ? "" : function_name,
                parameters_dictionary: "",
            };
            if(typeof otherData !== 'string'){
                paramsDictionaryRef.current = JSON.stringify(otherData, null, 4);
            } else {
                paramsDictionaryRef.current = JSON.stringify(otherData || "");
            }
            setActionData(updatedData);
        }
    }, []);
    return (
        <EventingActionDataShell>
            <EventingActionDataField
                label="Container Name"
                required
                description={"This is the name of the container where the function is located"}
            >
                <MythicTextField onChange={onChangeValue} value={actionData.container_name} name={"container_name"} />
            </EventingActionDataField>
            <EventingActionDataField
                label="Function Name"
                required
                description={"This is the specific function to call"}
            >
                <MythicTextField onChange={onChangeValue} value={actionData.function_name} name={"function_name"} />
            </EventingActionDataField>
            <EventingActionDataField
                label="Extra Data Dictionary"
                description="Pass additional dictionary data to your custom function."
            >
                <ResponseDisplayPlaintext plaintext={paramsDictionaryRef.current} autoFormat={false}
                                          onChangeContent={onChangeParamsDictionary} initial_mode={"json"}/>
            </EventingActionDataField>
        </EventingActionDataShell>
    )

}
const EventingStepActionDataConditionalCheck = ({allSteps, updateStep, index, prevData}) => {
    const [actionData, setActionData] = React.useState({
        container_name: "",
        function_name: "",
        steps: []
    });
    const [stepOptions, setStepOptions] = React.useState([]);
    React.useEffect( () => {
        const stepNames = allSteps.map(s => s.name).filter(s => s !== allSteps[index].name);
        setStepOptions(stepNames);
    }, [allSteps]);
    const debouncedLocalOutput = useDebounce(actionData, debounceDelay);
    React.useEffect( () => {
        let simplifiedParams = {};
        simplifiedParams.container_name = actionData.container_name;
        simplifiedParams.function_name = actionData.function_name;
        simplifiedParams.steps = actionData.steps;
        updateStep(index, "action_data", simplifiedParams);
    }, [debouncedLocalOutput]);
    const onChangeValue = (name, value, error) => {
        setActionData({...actionData, [name]: value});
    }
    const addStep = () => {
        if (stepOptions.length > 0) {
            const remainingStepOptions = stepOptions.reduce((prev, cur) => {
                if (actionData.steps.includes(cur)) {
                    return [...prev];
                }
                return [...prev, cur];
            }, []);
            if(remainingStepOptions.length === 0){
                snackActions.warning("No more steps available to potentially skip");
                return;
            }
            const newSteps = [...actionData.steps, remainingStepOptions[0]];
            setActionData({...actionData, steps: newSteps});
        } else {
            snackActions.warning("No options for setting steps")
        }
    }
    const changeStep = (event, i) => {
        let newSteps = [...actionData.steps];
        newSteps[i] = event.target.value;
        setActionData({...actionData, steps: newSteps});
    }
    const removeStep = (i) => {
        const newSteps = [...actionData.steps];
        newSteps.splice(i, 1);
        setActionData({...actionData, steps: newSteps});
    }
    React.useEffect( () => {
        if(prevData){
            let {container_name, function_name, steps, ...otherData} = prevData;
            let updatedData = {
                container_name: container_name === undefined ? "" : container_name,
                function_name: function_name === undefined ? "" : function_name,
                steps: steps === undefined ? [] : steps,
            };
            setActionData(updatedData);
        }
    }, []);
    return (
        <EventingActionDataShell>
            <EventingActionDataField
                label="Container Name"
                required
                description={"This is the name of the container where the function is located"}
            >
                <MythicTextField onChange={onChangeValue} value={actionData.container_name} name={"container_name"} />
            </EventingActionDataField>
            <EventingActionDataField
                label="Function Name"
                required
                description={"This is the function that will determine if the steps called out in the \"Step Names\" array should be skipped or not."}
            >
                <MythicTextField onChange={onChangeValue} value={actionData.function_name} name={"function_name"} />
            </EventingActionDataField>
            <EventingActionDataField
                label="Step Names"
                description="These are the step names that can be conditionally skipped."
            >
                <div className="mythic-eventing-action-array-list">
                    {actionData.steps.map( (s, i) => (
                        <div className="mythic-eventing-action-array-row" key={"step" + s + i}>
                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={() => removeStep(i)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                            <FormControl sx={{display: "inline-block", width: "100%"}} size="small">
                                <TextField
                                    label={"Step to potentially skip"}
                                    select
                                    size={"small"}
                                    style={{width: "100%"}}
                                    value={s}
                                    onChange={(e) => changeStep(e, i)}
                                >
                                    {stepOptions.map((opt) => (
                                        <MenuItem key={"step1" + opt} value={opt}>
                                            {opt}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </FormControl>
                        </div>
                    ))}
                    <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" size="small" onClick={addStep}>
                        <AddCircleOutlineIcon fontSize="small" />
                    </IconButton>
                </div>
            </EventingActionDataField>
        </EventingActionDataShell>
    )

}
const EventingStepActionDataCreatePayload = ({allSteps, updateStep, index, prevData}) => {
    const defaultData = {
        "payload_type": "",
        "description": "",
        "filename": "",
        "selected_os": "",
        "build_parameters": [
            {"name": "", "value": ""}
        ],
        "commands": [],
        "c2_profiles": [
            {
                "c2_profile": "http",
                "c2_profile_parameters": {
                    "callback_host": "https://domain.com",
                },
            },
        ]
    };
    const paramsDictionaryRef = React.useRef(JSON.stringify(defaultData));
    const [actionData, setActionData] = React.useState("");
    const debouncedLocalOutput = useDebounce(actionData, debounceDelay);
    React.useEffect( () => {
        let simplifiedParams = {};
        try{
            let additionalParams = JSON.parse(paramsDictionaryRef.current);
            simplifiedParams = { ...additionalParams};
        }catch{

        }
        updateStep(index, "action_data", simplifiedParams);
    }, [debouncedLocalOutput]);
    const onChangeParamsDictionary = (newValue) => {
        paramsDictionaryRef.current = newValue;
        setActionData( newValue);
    }
    React.useEffect( () => {
        if(prevData){
            if(typeof prevData !== 'string'){
                let updatedData = {...defaultData};
                for(const [key, val] of Object.entries(prevData)){
                    if(updatedData[key] !== undefined){
                        updatedData[key] = val;
                    }
                }
                paramsDictionaryRef.current = JSON.stringify(updatedData, null, 4);
            } else {
                paramsDictionaryRef.current = JSON.stringify(prevData || "");
            }
            setActionData(prevData);
        }
    }, []);
    return (
        <EventingActionDataShell>
            <EventingActionDataField label="Payload Configuration" required>
                <ResponseDisplayPlaintext plaintext={paramsDictionaryRef.current} autoFormat={false}
                                          onChangeContent={onChangeParamsDictionary} initial_mode={"json"}/>
            </EventingActionDataField>
        </EventingActionDataShell>
    )

}
const EventingStepActionDataCreateCallback = ({allSteps, updateStep, index, prevData}) => {
    const defaultData = {
        user: "",
        host: "",
        pid: 0,
        ips: [],
        external_ip: "",
        process_name: "",
        integrity_level: 2,
        uuid: "This is the UUID of the payload that is generating this callback",
        os: "",
        architecture: "",
        domain: "",
        extra_info: "",
        sleep_info: "",
    };
    const paramsDictionaryRef = React.useRef(JSON.stringify(defaultData));
    const [actionData, setActionData] = React.useState("");
    const debouncedLocalOutput = useDebounce(actionData, debounceDelay);
    React.useEffect( () => {
        let simplifiedParams = {};
        try{
            let additionalParams = JSON.parse(paramsDictionaryRef.current);
            simplifiedParams = { ...additionalParams};
        }catch{

        }
        updateStep(index, "action_data", simplifiedParams);
    }, [debouncedLocalOutput]);
    const onChangeParamsDictionary = (newValue) => {
        paramsDictionaryRef.current = newValue;
        setActionData( newValue);
    }
    React.useEffect( () => {
        if(prevData){
            if(typeof prevData !== 'string'){
                let updatedData = {...defaultData};
                for(const [key, val] of Object.entries(prevData)){
                    if(updatedData[key] !== undefined){
                        updatedData[key] = val;
                    }
                }
                paramsDictionaryRef.current = JSON.stringify(updatedData, null, 4);
            } else {
                paramsDictionaryRef.current = JSON.stringify(prevData || "");
            }
            setActionData(prevData);
        }
    }, []);
    return (
        <EventingActionDataShell>
            <EventingActionDataField label="Callback Configuration" required>
                <ResponseDisplayPlaintext plaintext={paramsDictionaryRef.current} autoFormat={false}
                                          onChangeContent={onChangeParamsDictionary} initial_mode={"json"}/>
            </EventingActionDataField>
        </EventingActionDataShell>
    )

}
const EventingStepActionDataTaskIntercept = ({allSteps, updateStep, index, prevData}) => {
    const [actionData, setActionData] = React.useState({
        container_name: "",
    });
    const debouncedLocalOutput = useDebounce(actionData, debounceDelay);
    React.useEffect( () => {
        let simplifiedParams = {};
        simplifiedParams.container_name = actionData.container_name;
        try{
            simplifiedParams = {...simplifiedParams};
        }catch{

        }
        updateStep(index, "action_data", simplifiedParams);
    }, [debouncedLocalOutput]);
    const onChangeValue = (name, value, error) => {
        setActionData({...actionData, [name]: value});
    }
    React.useEffect( () => {
        if(prevData){
            let {container_name, ...otherData} = prevData;
            let updatedData = {
                container_name: container_name === undefined ? "" : container_name,
            };
            setActionData(updatedData);
        }
    }, []);
    return (
        <EventingActionDataShell>
            <EventingActionDataField label="Container Name" required>
                <MythicTextField onChange={onChangeValue} value={actionData.container_name} name={"container_name"} />
            </EventingActionDataField>
        </EventingActionDataShell>
    )

}
const EventingStepActionDataResponseIntercept = ({allSteps, updateStep, index, prevData}) => {
    const [actionData, setActionData] = React.useState({
        container_name: "",
    });
    const debouncedLocalOutput = useDebounce(actionData, debounceDelay);
    React.useEffect( () => {
        let simplifiedParams = {};
        simplifiedParams.container_name = actionData.container_name;
        try{
            simplifiedParams = {...simplifiedParams};
        }catch{

        }
        updateStep(index, "action_data", simplifiedParams);
    }, [debouncedLocalOutput]);
    const onChangeValue = (name, value, error) => {
        setActionData({...actionData, [name]: value});
    }
    React.useEffect( () => {
        if(prevData){
            let {container_name, ...otherData} = prevData;
            let updatedData = {
                container_name: container_name === undefined ? "" : container_name,
            };
            setActionData(updatedData);
        }
    }, []);
    return (
        <EventingActionDataShell>
            <EventingActionDataField label="Container Name" required>
                <MythicTextField onChange={onChangeValue} value={actionData.container_name} name={"container_name"} />
            </EventingActionDataField>
        </EventingActionDataShell>
    )

}
const EventingStepActionDataCreateAlert = ({allSteps, updateStep, index, prevData}) => {
    const alertLevelOptions = ["debug", "info", "warning"];
    const paramsDictionaryRef = React.useRef("{}");
    const [actionData, setActionData] = React.useState({
        alert: "",
        source: "",
        level: "warning",
        send_webhook: false,
        webhook_alert: "{}"
    });
    const debouncedLocalOutput = useDebounce(actionData, debounceDelay);
    React.useEffect( () => {
        let simplifiedParams = {};
        simplifiedParams.alert = actionData.alert;
        simplifiedParams.source = actionData.source;
        simplifiedParams.level = actionData.level;
        simplifiedParams.send_webhook = actionData.send_webhook;

        try{
            let additionalParams = JSON.parse(paramsDictionaryRef.current);
            simplifiedParams = {...simplifiedParams, webhook_alert: additionalParams};
        }catch{

        }
        updateStep(index, "action_data", simplifiedParams);
    }, [debouncedLocalOutput]);
    const onChangeValue = (name, value, error) => {
        setActionData({...actionData, [name]: value});
    }
    const onChangeParamsDictionary = (newValue) => {
        paramsDictionaryRef.current = newValue;
        setActionData({...actionData, webhook_alert: newValue});
    }
    const onChangeBoolean = (event) => {
        setActionData({...actionData, send_webhook: event.target.checked});
    }
    React.useEffect( () => {
        if(prevData){
            let {alert, source, level, send_webhook, webhook_alert, ...otherData} = prevData;
            let updatedData = {
                alert: alert === undefined ? "" : alert,
                source: source === undefined ? "" : source,
                level: level === undefined ? "warning" : level,
                send_webhook: send_webhook === undefined ? false : send_webhook,
                webhook_alert: webhook_alert === undefined ? "{}" : webhook_alert,
            };
            if(webhook_alert){
                if(typeof webhook_alert !== 'string'){
                    paramsDictionaryRef.current = JSON.stringify(webhook_alert, null, 4);
                } else {
                    paramsDictionaryRef.current = JSON.stringify(webhook_alert || "{}");
                }
            }
            setActionData(updatedData);
        }
    }, []);
    return (
        <EventingActionDataShell>
            <EventingActionDataField label="Alert Message" required>
                <MythicTextField onChange={onChangeValue} value={actionData.alert} name={"alert"} showLabel={false}
                                 placeholder={"Alert message to send to event log and toast notification"} />
            </EventingActionDataField>
            <EventingActionDataField
                label="Source"
                description="Optional source for webhooks and collapsed event log messages."
            >
                <MythicTextField onChange={onChangeValue} value={actionData.source} name={"source"} showLabel={false}
                                 placeholder={"message source"} />
            </EventingActionDataField>
            <EventingActionDataField
                label="Alert Level"
                description="'debug' goes to the event log, 'info' also shows a toast, and 'warning' increases warning counts and can send a webhook."
            >
                <FormControl sx={{ display: "inline-block", width: "100%" }} size="small">
                    <TextField
                        label={"What's the alert level of the message"}
                        select
                        size={"small"}
                        style={{ width: "100%"}}
                        value={actionData.level}
                        onChange={(e) => setActionData({...actionData, level: e.target.value})}
                    >
                        {alertLevelOptions.map((opt) => (
                            <MenuItem key={"step1" + opt} value={opt}>
                                {opt}
                            </MenuItem>
                        ))}
                    </TextField>
                </FormControl>
            </EventingActionDataField>
            <EventingActionDataField
                label="Send Webhook"
                description="Send alert data or custom JSON to the webhook container's custom processing."
            >
                <Switch
                    checked={actionData.send_webhook}
                    onChange={onChangeBoolean}
                    color={"info"}
                    inputProps={{ 'aria-label': 'primary checkbox' }}
                />
            </EventingActionDataField>
            <EventingActionDataField
                label="Custom Webhook Data"
                description="Pass additional dictionary data to your custom webhook parsing."
            >
                <ResponseDisplayPlaintext plaintext={paramsDictionaryRef.current} autoFormat={false}
                                          onChangeContent={onChangeParamsDictionary} initial_mode={"json"}/>
            </EventingActionDataField>
        </EventingActionDataShell>
    )

}
const EventingStepActionDataSendWebhook = ({allSteps, updateStep, index, prevData}) => {
    const paramsDictionaryRef = React.useRef("{}");
    const [actionData, setActionData] = React.useState({
        webhook_data: "{}"
    });
    const debouncedLocalOutput = useDebounce(actionData, debounceDelay);
    React.useEffect( () => {
        let simplifiedParams = {};
        try{
            let additionalParams = JSON.parse(paramsDictionaryRef.current);
            simplifiedParams = {...simplifiedParams, webhook_data: additionalParams};
        }catch{

        }
        updateStep(index, "action_data", simplifiedParams);
    }, [debouncedLocalOutput]);
    const onChangeParamsDictionary = (newValue) => {
        paramsDictionaryRef.current = newValue;
        setActionData({...actionData, webhook_data: newValue});
    }
    React.useEffect( () => {
        if(prevData){
            let {webhook_data, ...otherData} = prevData;
            let updatedData = {
                webhook_data: webhook_data === undefined ? "{}" : webhook_data,
            };
            if(webhook_data){
                if(typeof webhook_data !== 'string'){
                    paramsDictionaryRef.current = JSON.stringify(webhook_data, null, 4);
                } else {
                    paramsDictionaryRef.current = JSON.stringify(webhook_data || "{}");
                }
            }
            setActionData(updatedData);
        }
    }, []);
    return (
        <EventingActionDataShell>
            <EventingActionDataField
                label="Custom Webhook Data"
                description="Pass a dictionary of data to your custom webhook parsing."
            >
                <ResponseDisplayPlaintext plaintext={paramsDictionaryRef.current} autoFormat={false}
                                          onChangeContent={onChangeParamsDictionary} initial_mode={"json"}/>
            </EventingActionDataField>
        </EventingActionDataShell>
    )

}
const actionOptionsData = {
    payload_create: {
        description: "This action allows you to start building a payload. The action is over once the payload finishes (successfully or in error)",
        element: EventingStepActionDataCreatePayload
    },
    callback_create: {
        description: "This action allows you to create a new callback",
        element: EventingStepActionDataCreateCallback
    },
    task_create: {
        description: "This action allows you to issue a new task. This action is over once the task finishes (successfully or in error).",
        element: EventingStepActionDataTaskCreate
    },
    custom_function: {
        description: "This action allows you to execute a custom function within a custom event container that you install. The benefit here is that you can get access to the entirety of Mythic's Scripting and GraphQL API by using an input of mythic.apitoken . This allows you to do almost anything.",
        element: EventingStepActionDataCustomFunction
    },
    conditional_check: {
        description: "This action allows you to run a custom function within a custom event container that you create or install with the purpose of identifying if certain steps should be skipped or not. Normally, if a step hits an error then the entire workflow is cancelled, but you can use this conditional_check to run custom code to determine if potentially problematic steps should be skipped or not.",
        element: EventingStepActionDataConditionalCheck
    },
    task_intercept: {
        description: "This allows you to intercept a task after the task's opsec_post function finishes to have one final opportunity to block the task from executing. This can only be used in conjunction with the task_intercept trigger. You can have additional steps as part of the workflow, but one step must be task_intercept if you have a trigger of task_intercept.",
        element: EventingStepActionDataTaskIntercept
    },
    response_intercept: {
        description: "This allows you to intercept the user_output response of an agent before it goes to the Mythic UI for an operator. Just like with task_intercept, this must exist if you have a trigger of response_intercept and can't be used if that's not the trigger. This allows you to get access to the output that the agent returned, then modify it before forwarding it along to Mythic. This means you can modify the response (add context, change values, etc) before the user ever sees it. Tasks with output that's been intercepted will have a special symbol next to them in the UI.",
        element: EventingStepActionDataResponseIntercept
    },
    alert_create: {
        description: "This action allows you to create a new alert. This action is over immediately",
        element: EventingStepActionDataCreateAlert
    },
    webhook_send: {
        description: "This action allows you to send a custom webhook message. This action is over immediately",
        element: EventingStepActionDataSendWebhook
    }

}
const EventingStep = ({step, allSteps, updateStep, index, step1Data, updateStep1Data}) => {
    const [name, setName] = React.useState(step.name);
    const [description, setDescription] = React.useState(step.description);
    const [selectedAction, setSelectedAction] = React.useState(step.action);
    const [dependsOnOptions, setDependsOnOptions] = React.useState([]);
    const [dependsOn, setDependsOn] = React.useState([]);
    const [updatedActionOptions, setUpdatedActionOptions] = React.useState([]);
    const [continueOnError, setContinueOnError] = React.useState(step.continue_on_error || false);
    const [localInputOptions, setLocalInputOptions] = React.useState([]);
    const [inputEditorData, setInputEditorData] = React.useState(null);

    const onChangeName = (name, value, error) => {
        setName(value);
    }
    const debouncedName = useDebounce(name, debounceDelay);
    React.useEffect(() => {
        updateStep(index, "name", debouncedName)
    }, [debouncedName]);
    const onChangeDescription = (name, value, error) => {
        setDescription(value);
    }
    const debouncedDescription = useDebounce(description, debounceDelay);
    React.useEffect(() => {
        updateStep(index, "description", debouncedDescription);
    }, [debouncedDescription]);
    const onChangeAction = (event) => {
        setSelectedAction(event.target.value);
        updateStep(index, "action", event.target.value);
    }
    const addDependsOn = () => {
        if (dependsOnOptions.length > 0) {
            const remainingDependsOnOptions = dependsOnOptions.reduce((prev, cur) => {
                if (dependsOn.includes(cur)) {
                    return [...prev];
                }
                return [...prev, cur];
            }, []);
            if(remainingDependsOnOptions.length === 0){
                snackActions.warning("No more steps available to depend on");
                return;
            }
            const newDependsOn = [...dependsOn, remainingDependsOnOptions[0]];
            setDependsOn(newDependsOn);
            updateStep(index, "depends_on", newDependsOn);
        } else {
            snackActions.warning("No options for setting depends on")
        }
    }
    const changeDependsOn = (event, i) => {
        let newDependsOn = [...dependsOn];
        newDependsOn[i] = event.target.value;
        setDependsOn(newDependsOn);
        updateStep(index, "depends_on", newDependsOn);
    }
    const removeDependsOn = (i) => {
        const newDependsOn = [...dependsOn];
        newDependsOn.splice(i, 1);
        setDependsOn(newDependsOn);
        updateStep(index, "depends_on", newDependsOn);
    }
    const ActionDataElement = actionOptionsData[selectedAction]?.element;
    const onChangeContinueOnError = (evt) => {
        setContinueOnError(evt.target.checked)
        updateStep(index, "continue_on_error", evt.target.checked);
    }
    const updateStepInputs = React.useCallback((nextInputs) => {
        setInputEditorData(nextInputs);
        updateStep(index, "inputs", nextInputs);
    }, [index, updateStep]);
    const onInputsUpdatedFromEditor = React.useCallback((stepIndex, fieldName, nextInputs) => {
        setInputEditorData(null);
        updateStep(stepIndex, fieldName, nextInputs);
    }, [updateStep]);
    React.useEffect( () => {
        let actions = [...actionOptions];
        if(step1Data.trigger !== "task_intercept"){
            actions = actions.filter(a => a !== "task_intercept");
        }
        if(step1Data.trigger !== "response_intercept"){
            actions = actions.filter(a => a !== "response_intercept");
        }
        setUpdatedActionOptions(actions);
    }, []);
    React.useEffect(() => {
        const options = allSteps.filter( s => s.name !== name && s.name !== "").map(s => s.name);
        setDependsOnOptions(options);
        const stepBasedInputOptions = allSteps.filter(s => s.name !== name && s.name !== "").reduce( (prev, cur) => {
            let currentInputs = [...prev];
            cur?.outputs?.forEach( x => {
                if(!currentInputs.includes(`${cur.name}.${x.name}`)){
                    currentInputs.push(`${cur.name}.${x.name}`)
                }
            });
            return [...currentInputs];
        }, [...inputOptions])
        setLocalInputOptions(stepBasedInputOptions);
        if(step?.depends_on?.length >0 && dependsOn.length === 0){
            setDependsOn(step.depends_on);
        }
    }, [allSteps, name]);
    return (
        <div className="mythic-eventing-step-config-card mythic-eventing-step-config-card-modern">
            <div className="mythic-eventing-step-config-summary">
                <div className="mythic-eventing-step-config-summary-copy">
                    <div className="mythic-eventing-step-config-summary-title">{name || `Step ${index + 1}`}</div>
                    <div className="mythic-eventing-step-config-summary-subtitle">{description || "Describe what this step does and how it should run."}</div>
                </div>
                <div className="mythic-eventing-step-config-summary-actions">
                    <span className="mythic-eventing-step-action-chip">{selectedAction}</span>
                    <label className="mythic-eventing-step-switch-row">
                        <span className="mythic-eventing-step-switch-copy">
                            <span className="mythic-eventing-step-switch-title">Continue on error</span>
                            <span className="mythic-eventing-step-switch-subtitle">Allow later steps to run if this one fails.</span>
                        </span>
                        <Switch
                            checked={continueOnError}
                            onChange={onChangeContinueOnError}
                            color={"info"}
                            inputProps={{ 'aria-label': 'continue on error' }}
                        />
                    </label>
                </div>
            </div>
            <div className="mythic-eventing-step-config-content">
                <EventingStepConfigSection
                    className="mythic-eventing-step-config-section-wide"
                    title="Step identity"
                    description="Give this step a clear name so other steps can reference it."
                >
                    <div className="mythic-eventing-step-field-grid">
                        <EventingStepFieldBlock label="Name">
                            <MythicTextField placeholder={"Step name..."} onChange={onChangeName} value={name}
                                             marginBottom={"0px"}/>
                        </EventingStepFieldBlock>
                        <EventingStepFieldBlock label="Description">
                            <MythicTextField placeholder={"Step description..."} onChange={onChangeDescription} value={description}
                                             marginBottom={"0px"}/>
                        </EventingStepFieldBlock>
                    </div>
                </EventingStepConfigSection>
                <EventingStepConfigSection
                    className="mythic-eventing-step-config-section-wide"
                    title="Action"
                    description={actionOptionsData[selectedAction]?.description}
                >
                    <EventingStepFieldBlock label="Action type">
                        <FormControl sx={{ display: "inline-block", width: "100%" }} size="small">
                            <TextField
                                label={"What action should this step take"}
                                select
                                size={"small"}
                                style={{ width: "100%"}}
                                value={selectedAction}
                                onChange={onChangeAction}
                            >
                                {updatedActionOptions.map((opt) => (
                                    <MenuItem key={"step1" + opt} value={opt}>
                                        {opt}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </FormControl>
                    </EventingStepFieldBlock>
                </EventingStepConfigSection>
                <div className="mythic-eventing-step-section-stack">
                    <EventingStepConfigSection
                        title="Inputs"
                        description="Map values from triggers, environment data, Mythic, or earlier step outputs."
                    >
                        <EventingStepInputs index={index} localInputOptions={localInputOptions}
                                            step1Data={step1Data} updateStep={onInputsUpdatedFromEditor}
                                            prevData={inputEditorData || step?.inputs || []}
                                            syncKey={inputEditorData ? JSON.stringify(inputEditorData) : ""}/>
                    </EventingStepConfigSection>
                    <EventingStepConfigSection
                        title="Outputs"
                        description="Expose values from this step so later steps can use them."
                    >
                        <EventingStepOutputs index={index} selectedAction={selectedAction}
                                            step1Data={step1Data} updateStep={updateStep}
                                            prevData={step?.outputs || []}/>
                    </EventingStepConfigSection>
                </div>
                <EventingStepConfigSection
                    className="mythic-eventing-step-config-section-wide"
                    title="Action data"
                    description="Configure the values this action needs when it runs."
                >
                    <div className="mythic-eventing-step-action-data">
                        {ActionDataElement !== null && ActionDataElement !== undefined &&
                            <ActionDataElement allSteps={allSteps} updateStep={updateStep} index={index}
                                               prevData={step?.action_data} step1Data={step1Data}
                                               currentInputs={inputEditorData || step?.inputs || []}
                                               updateStepInputs={updateStepInputs}
                                               updateStep1Data={updateStep1Data} />
                        }
                    </div>
                </EventingStepConfigSection>
                <EventingStepConfigSection
                    className="mythic-eventing-step-config-section-wide"
                    title="Dependencies"
                    description="Choose steps that must finish before this step can start."
                >
                    <div className="mythic-eventing-step-dynamic-section">
                        <div className="mythic-eventing-step-list">
                            {dependsOn.length === 0 &&
                                <EventingStepEmptyInline>No dependencies configured.</EventingStepEmptyInline>
                            }
                            {dependsOn.map((d, i) => (
                                <div className="mythic-eventing-step-list-item" key={"dependson" + i}>
                                    <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={() => removeDependsOn(i)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                    <div className="mythic-eventing-step-list-content">
                                        <FormControl sx={{display: "inline-block", width: "100%"}} size="small">
                                            <TextField
                                                label={"Which step must complete before this step executes"}
                                                select
                                                size={"small"}
                                                style={{width: "100%"}}
                                                value={dependsOn[i]}
                                                onChange={(e) => {
                                                    changeDependsOn(e, i)
                                                }}
                                            >
                                                {dependsOnOptions.map((opt) => (
                                                    <MenuItem key={"step2depends_on" + opt} value={opt}>
                                                        {opt}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </FormControl>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button className="mythic-table-row-action mythic-table-row-action-hover-success" onClick={addDependsOn} variant="outlined" startIcon={<AddCircleIcon fontSize="small" />}>
                            Add dependency
                        </Button>
                    </div>
                </EventingStepConfigSection>
            </div>
        </div>
    )
}
const inputsHelp = `
Steps:
    Steps are the building blocks of workflows. They define the specific actions that happen, what to do if there's an error, what kind of data should get passed to the action, what kind of data to take in from outside sources (other steps, env, etc), and what kind of data to make available to other steps.

Inputs:
    Inputs are a dictionary with key/value pairs. When starting a step, Mythic iterates through the inputs and checks to see if the input's "key" is available in the step's action data. If it's present, then that key is swapped out with the corresponding value. This happens for all the inputs before the final action data is passed along to the action. This allows you to provide "placeholders" in your action data for things that you don't know while you're creating this workflow (for example: the callback id for a new callback trigger). 

Action data:
    Action data is the set of key/value pairs that are needed by the action to perform the required action. This is highly specific to the corresponding action and has been updated in the UI for each action that's available with required fields marked as required and descriptions for all other fields.

Outputs:
    Outputs are a dictionary with key/value pairs that allow you to expose data after one step for use in another step. Similar to Inputs, this allows you to forward along data that you might not know while writing the workflow. For example, an action that creates a new task might return that task's ID as output for use in a subsequent action. Some actions, like custom_function and conditional_check, allow you to return arbitrary other outputs that aren't defined in this workflow for you to use in subsequent tasks as well.
    `;
const CreateEventingStep2 = ({finished, back, first, last, cancel, prevData, step1Data, updateStep1Data}) => {
    const [steps, setSteps] = React.useState(prevData ? prevData : []);
    const [displayHelp, setDisplayHelp] = React.useState(false);
    const [activeStepIndex, setActiveStepIndex] = React.useState(0);
    const stepRefs = React.useRef({});
    const addStep = () => {
        const taskCreateDefaults = getTaskCreateDefaultsForTrigger(step1Data?.trigger);
        setSteps([...steps, {
            name: "",
            description: "",
            inputs: taskCreateDefaults.inputs,
            action: "task_create",
            action_data: taskCreateDefaults.action_data,
            outputs: [],
            depends_on: [],
            environment: {},
            continue_on_error: false
        }]);
    }
    const removeStep = (i) => {
        const newSteps = [...steps];
        newSteps.splice(i, 1);
        setSteps(newSteps);
        setActiveStepIndex((current) => Math.max(0, Math.min(current, newSteps.length - 1)));
    }
    const updateStep = (i, name, value) => {
        const newSteps = steps.map( (s, index) => {
            if(index !== i){
                return {...s};
            }
            return {...s, [name]: value};
        });
        setSteps(newSteps);
    }
    const finishedStep2 = () => {
        finished(steps);
    }
    const backStep2 = () => {
        back(steps);
    }
    const stepScrollRef = React.useRef(null);
    const updateActiveStepFromScroll = React.useCallback(() => {
        const scrollContainer = stepScrollRef.current;
        if(scrollContainer === null || steps.length === 0){
            return;
        }
        const containerRect = scrollContainer.getBoundingClientRect();
        const marker = containerRect.top + Math.min(120, containerRect.height * 0.25);
        const bestStep = steps.reduce((prev, cur, i) => {
            const stepElement = stepRefs.current[i];
            if(stepElement === undefined || stepElement === null){
                return prev;
            }
            const stepRect = stepElement.getBoundingClientRect();
            if(stepRect.top <= marker && stepRect.bottom >= marker){
                return {index: i, distance: 0};
            }
            const distance = Math.min(Math.abs(stepRect.top - marker), Math.abs(stepRect.bottom - marker));
            if(distance < prev.distance){
                return {index: i, distance};
            }
            return prev;
        }, {index: activeStepIndex, distance: Number.MAX_SAFE_INTEGER});
        setActiveStepIndex((current) => current === bestStep.index ? current : bestStep.index);
    }, [activeStepIndex, steps]);
    const scrollToStep = (i) => {
        setActiveStepIndex(i);
        stepRefs.current[i]?.scrollIntoView({behavior: "smooth", block: "start"});
    }
    React.useEffect( () => {
        if(prevData !== undefined){
            setSteps(prevData);
        }
    }, [prevData]);
    return (
        <div className="mythic-eventing-wizard-step">
            <div className="mythic-eventing-wizard-toolbar">
                <div>
                    <div className="mythic-eventing-wizard-toolbar-title">{steps.length} configured {steps.length === 1 ? "step" : "steps"}</div>
                    <div className="mythic-eventing-wizard-toolbar-subtitle">{step1Data?.trigger || "manual"} trigger</div>
                </div>
                <div className="mythic-eventing-wizard-toolbar-actions">
                    <Button className="mythic-table-row-action mythic-table-row-action-hover-info" onClick={() => setDisplayHelp(true)} variant={"outlined"}
                            size={"small"}>
                        Display Help
                    </Button>
                    <Button className="mythic-table-row-action mythic-table-row-action-hover-success" size={"small"} onClick={addStep} variant="outlined" startIcon={<AddCircleIcon fontSize="small" />}>
                        Add Step
                    </Button>
                </div>
            </div>
            {displayHelp &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={displayHelp}
                              onClose={(e) => {
                                  setDisplayHelp(false);
                              }}
                              innerDialog={<MythicModifyStringDialog title={"Helpful information about steps"}
                                                                     maxRows={20}
                                                                     value={inputsHelp} onClose={(e) => setDisplayHelp(false)}
                                                                     wrap={true}
                              />}
                />
            }
            <div className={`mythic-eventing-wizard-step-browser ${steps.length === 0 ? "mythic-eventing-wizard-step-browser-empty" : ""}`.trim()}>
                {steps.length > 0 &&
                    <div className="mythic-eventing-step-nav">
                        <div className="mythic-eventing-step-nav-header">
                            <div className="mythic-eventing-step-nav-title">Step index</div>
                            <div className="mythic-eventing-step-nav-subtitle">Jump to a step</div>
                        </div>
                        <div className="mythic-eventing-step-nav-list">
                            {steps.map((s, i) => (
                                <button
                                    className={`mythic-eventing-step-nav-item ${activeStepIndex === i ? "mythic-eventing-step-nav-item-active" : ""}`.trim()}
                                    key={"step-nav" + i}
                                    onClick={() => scrollToStep(i)}
                                    type="button"
                                >
                                    <span className="mythic-eventing-step-nav-number">{i + 1}</span>
                                    <span className="mythic-eventing-step-nav-copy">
                                        <span className="mythic-eventing-step-nav-name">{s.name || "Unnamed step"}</span>
                                        <span className="mythic-eventing-step-nav-action">{s.action || "task_create"}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                }
                <div className="mythic-eventing-wizard-step-scroll mythic-eventing-wizard-step-scroll-browser" onScroll={updateActiveStepFromScroll} ref={stepScrollRef}>
                    {steps.length === 0 ? (
                        <div className="mythic-eventing-wizard-empty">
                            <div className="mythic-eventing-wizard-empty-title">No steps configured</div>
                            <div className="mythic-eventing-wizard-empty-subtitle">Add a step to start building this workflow.</div>
                        </div>
                    ) : steps.map( (s, i) => (
                        <div
                            className="mythic-eventing-step-shell"
                            key={"step" + i}
                            ref={(element) => {
                                if(element){
                                    stepRefs.current[i] = element;
                                }
                            }}
                        >
                            <div className="mythic-eventing-step-shell-header">
                                <div>
                                    <div className="mythic-eventing-step-shell-title">Step {i + 1}</div>
                                    <div className="mythic-eventing-step-shell-subtitle">{s.name || "Unnamed step"}</div>
                                </div>
                                <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={() => removeStep(i)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </div>
                            <EventingStep step={s} allSteps={steps} updateStep={updateStep} index={i}
                                          step1Data={step1Data} updateStep1Data={updateStep1Data}/>
                        </div>
                    ))}
                </div>
            </div>
            <CreateEventingStepperNavigationButtons first={first} last={last} finished={finishedStep2} back={backStep2} cancel={cancel} />
        </div>
    )
}

const outputFormatOptions = ["json", "yaml", "toml"];
const CreateEventingStep3 = ({finished, back, first, last, cancel, prevData, step1Data, step2Data}) => {
    const [openEventStepRender, setOpenEventStepRender] = React.useState({open: false, data: {}});
    const [renderedVersion, setRenderedVersion] = React.useState("");
    const [outputFormat, setOutputFormat] = React.useState("json");
    const generatedWorkflowRef = React.useRef(null);
    const buildRenderedWorkflowData = React.useCallback(() => {
        let finalStepData = {
            name: step1Data.name,
            description: step1Data.description,
            trigger: step1Data.trigger,
            trigger_data: step1Data.trigger_data,
            keywords: step1Data.keywords,
            steps: [],
        };
        if(step1Data.run_as.value !== ""){
            finalStepData.run_as = step1Data.run_as.value;
        } else {
            finalStepData.run_as = step1Data.run_as.type;
        }
        if(step1Data.environment !== ""){
            try{
                finalStepData.environment = JSON.parse(step1Data.environment);
            }catch(error){
                snackActions.warning("Environment data from step 1 isn't JSON");
                return null;
            }
        }
        for(let i = 0; i < step2Data.length; i++){
            let stepData = {
                name: step2Data[i].name,
                description: step2Data[i].description,
                action: step2Data[i].action,
                depends_on: step2Data[i].depends_on,
                action_data: step2Data[i].action_data,
                inputs: {},
                outputs: {},
            };
            for(let j = 0; j < step2Data[i].inputs.length; j++){
                if(step2Data[i].inputs[j].type === "custom"){
                    stepData.inputs[step2Data[i].inputs[j].name] = step2Data[i].inputs[j].value;
                } else if(step2Data[i].inputs[j].type === "env") {
                    if (step2Data[i].inputs[j].value === "") {
                        stepData.inputs[step2Data[i].inputs[j].name] = "env." + step2Data[i].inputs[j].value_type;
                    } else {
                        stepData.inputs[step2Data[i].inputs[j].name] = "env." + step2Data[i].inputs[j].value;
                    }
                } else if(step2Data[i].inputs[j].type.includes(".")){
                    stepData.inputs[step2Data[i].inputs[j].name] = step2Data[i].inputs[j].value;
                } else {
                    stepData.inputs[step2Data[i].inputs[j].name] = step2Data[i].inputs[j].type + "." + step2Data[i].inputs[j].value;
                }
            }
            for(let j = 0; j < step2Data[i].outputs.length; j++){
                if(step2Data[i].outputs[j].value === ""){
                    stepData.outputs[step2Data[i].outputs[j].name] = step2Data[i].outputs[j].type;
                } else {
                    stepData.outputs[step2Data[i].outputs[j].name] = step2Data[i].outputs[j].value;
                }
            }
            finalStepData.steps.push(stepData);
        }
        return finalStepData;
    }, [step1Data, step2Data]);
    const [testFileMutation] = useLazyQuery(testFileWebhookMutation, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.eventingTestFile.status === "success"){
                snackActions.success("Valid file!");
            } else {
                snackActions.error(data.eventingTestFile.error);
            }
        },
        onError: (data) => {
            console.log(data);
        }
    });
    const [formatFileMutation] = useLazyQuery(testFileWebhookMutation, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.eventingTestFile.status === "success"){
                setRenderedVersion(data.eventingTestFile.formatted_output);
                snackActions.success("Valid file!");
            } else {
                snackActions.error(data.eventingTestFile.error);
            }
        },
        onError: (data) => {
            console.log(data);
        }
    });
    const [testFileForGraphMutation] = useLazyQuery(testFileWebhookMutation, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.eventingTestFile.status === "success"){
                setOpenEventStepRender({open: true, data: data.eventingTestFile.parsed_workflow});
            } else {
                snackActions.error(data.eventingTestFile.error);
            }
        },
        onError: (data) => {
            console.log(data);
        }
    })
    const previewGraph = () => {
        testFileForGraphMutation({variables: {file_contents: renderedVersion}});
    }
    const testOutput = () => {
        testFileMutation({variables: {file_contents: renderedVersion, output_format: outputFormat}})
    }
    const onChangeFileFormat = (e) => {
        const nextOutputFormat = e.target.value;
        setOutputFormat(nextOutputFormat);
        formatFileMutation({variables: {file_contents: renderedVersion, output_format: nextOutputFormat}});
    }
    const onChangeFileText = (newText) => {
        setRenderedVersion(newText);
    }
    React.useEffect( () => {
        let finalStepData = buildRenderedWorkflowData();
        if(finalStepData === null){
            return;
        }
        generatedWorkflowRef.current = finalStepData;
        setRenderedVersion(JSON.stringify(finalStepData, null, 2));
    }, [buildRenderedWorkflowData]);
    const finishedStep3 = async () => {
        let blob = new Blob([renderedVersion], { type: 'text/plain' });
        let file = new File([blob], `${step1Data.name}.${outputFormat}`, {type: "text/plain"});
        let uploadStatus = await UploadEventFile(file, "New Manual Eventing Workflow");
        if(!uploadStatus){
            snackActions.error("Failed to upload file");
        }
        if(uploadStatus.status === "error"){
            snackActions.error(uploadStatus.error);
        } else {
            snackActions.success("successfully created new workflow");
            if(step1Data.files.length > 0){
                let successCount = 0;
                for(let i = 0; i < step1Data.files.length; i++){
                    let fileuploadStatus = await UploadEventGroupFile(step1Data.files[i], uploadStatus.eventgroup_id);
                    if(fileuploadStatus.status === "error"){
                        snackActions.error(fileuploadStatus.error);
                    } else {
                        successCount += 1;
                    }
                }
                if(successCount === step1Data.files.length){
                    snackActions.success("All associated files uploaded");
                }
            }
            finished()
        }
    }
    return (
        <div className="mythic-eventing-wizard-step">
            <div className="mythic-eventing-wizard-step-scroll">
                <div className="mythic-eventing-wizard-review-card">
                <div className="mythic-eventing-wizard-review-toolbar">
                    <FormControl sx={{display: "inline-block", width: "12rem",}}>
                        <TextField
                            label={"Reformat output"}
                            select
                            size={"small"}
                            style={{width: "100%",}}
                            value={outputFormat}
                            onChange={onChangeFileFormat}
                        >
                            {outputFormatOptions.map((opt) => (
                                <MenuItem key={"step2inputs" + opt} value={opt}>
                                    {opt}
                                </MenuItem>
                            ))}
                        </TextField>
                    </FormControl>
                    <Button className="mythic-table-row-action mythic-table-row-action-hover-info" onClick={testOutput} size={"small"} variant="outlined">Test output</Button>
                    <Button className="mythic-table-row-action mythic-table-row-action-hover-info" onClick={previewGraph} size={"small"} variant="outlined" startIcon={<AccountTreeIcon fontSize="small" />}>
                        Graph
                    </Button>
                    {openEventStepRender.open &&
                        <MythicDialog fullWidth={true} maxWidth="xl" open={openEventStepRender.open}
                                      onClose={() => {
                                          setOpenEventStepRender({open: false, data: {}});
                                      }}
                                      innerDialog={<EventStepRenderDialog onClose={() => {
                                          setOpenEventStepRender({open: false, data: {}});
                                      }} selectedEventGroup={openEventStepRender.data} useSuppliedData={true}/>}
                        />
                    }
                </div>
                <div className="mythic-eventing-wizard-editor">
                <ResponseDisplayPlaintext autoFormat={false} plaintext={renderedVersion} onChangeContent={onChangeFileText} initial_mode={outputFormat} expand={true} />
                </div>
                </div>
            </div>
            <CreateEventingStepperNavigationButtons first={first} last={last} finished={finishedStep3} back={back} cancel={cancel}/>
        </div>
    )
}
export function CreateEventingStepper(props){
      const [payload, setPayload] = React.useState({});
      const [activeStep, setActiveStep] = React.useState(0);
      const updateStep1Data = React.useCallback((step1DataUpdate) => {
        setPayload((currentPayload) => {
            const currentStep1Data = currentPayload[0] || {};
            const nextStep1Data = typeof step1DataUpdate === "function" ?
                step1DataUpdate(currentStep1Data) :
                {...currentStep1Data, ...step1DataUpdate};
            return {...currentPayload, 0: nextStep1Data};
        });
      }, []);
      const getStepContent = (step) => {
          switch (step) {
            case 0:
              return <CreateEventingStep1 prevData={payload[0]} finished={handleStepData} back={() => cancelStep()} first={true} last={false} cancel={() => props.onClose(null, true)}/>;
            case 1:
              return <CreateEventingStep2 prevData={payload[1]} step1Data={payload[0]} updateStep1Data={updateStep1Data} finished={handleStepData} back={cancelStep} first={false} last={false} cancel={() => props.onClose(null, true)}/>;
          case 2:
              return <CreateEventingStep3 prevData={payload[2]} step1Data={payload[0]} step2Data={payload[1]} finished={finished} back={() => cancelStep()} first={false} last={true} cancel={() => props.onClose(null, true)}/>;
          default:
              return "unknown step";
          }
        }
      const handleStepData = (stepData) => {
        const nextPayload = {...payload, [activeStep]: stepData};
        if(activeStep === 0 && payload[0]?.trigger !== undefined && payload[0]?.trigger !== stepData.trigger){
            delete nextPayload[1];
            delete nextPayload[2];
        }
        setPayload(nextPayload);
        handleNext();
      }
      const cancelStep = (stepData) => {
        if(stepData !== undefined){
            setPayload({...payload, [activeStep]: stepData});
        }
        handleBack();
      }
      const steps = getSteps();
      const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
      };
      const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
      };
      const finished = () => {
          props.onClose(null, true);
      }
      const activeStepDetails = stepDetails[activeStep] || stepDetails[0];
    return (
        <DialogContent className="mythic-eventing-wizard-dialog-content">
            <div className="mythic-eventing-wizard">
                <div className="mythic-eventing-wizard-header">
                    <div className="mythic-eventing-wizard-title-row">
                        <div>
                            <div className="mythic-eventing-wizard-title">Create eventing workflow</div>
                            <div className="mythic-eventing-wizard-subtitle">Build a workflow from trigger metadata through generated output.</div>
                        </div>
                        <span className="mythic-eventing-wizard-progress-chip">Step {activeStep + 1} of {steps.length}</span>
                    </div>
                </div>
                <div className="mythic-eventing-wizard-content">
                    <div className="mythic-eventing-wizard-content-heading">
                        <div className="mythic-eventing-wizard-content-title">{activeStepDetails.title}</div>
                        <div className="mythic-eventing-wizard-content-subtitle">{activeStepDetails.subtitle}</div>
                    </div>
                {getStepContent(activeStep)}
                </div>
            </div>
        </DialogContent>
    );
} 
