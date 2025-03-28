import React from 'react';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DeleteIcon from '@mui/icons-material/Delete';
import { useReactiveVar } from '@apollo/client';
import {meState} from "../../../cache";
import {Table, TableBody, TableHead, TableRow, Typography, IconButton, Paper, Switch} from '@mui/material';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {CreatePayloadParameter} from "../CreatePayload/CreatePayloadParameter";
import MythicTextField from "../../MythicComponents/MythicTextField";
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {snackActions} from "../../utilities/Snackbar";
import { useTheme } from '@mui/material/styles';
import {useDebounce} from "../../utilities/useDebounce";
import {MythicDialog, MythicModifyStringDialog} from "../../MythicComponents/MythicDialog";
import {testFileWebhookMutation} from "./CreateEventWorkflowDialog";
import { useLazyQuery } from '@apollo/client';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import {EventStepRenderDialog} from "./EventStepRender";
import {UploadEventFile, UploadEventGroupFile} from "../../MythicComponents/MythicFileUpload";
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddCircleIcon from '@mui/icons-material/AddCircle';

function getSteps(){
    return ['Trigger Metadata', 'Steps', 'Confirm']
}
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
    "dead", "eventstepinstance_id", "process_short_name", "color", "trigger_on_checkin_after_time"
].sort();
const tagFields = [
    "id", "url", "data", "source", "operation_id", "filemeta_id", "mythictree_id", "credential_id",
    "task_id", "taskartifact_id", "keylog_id", "response_id", "tagtype"
].sort();
function CreateEventingStepperNavigationButtons(props){
    const me = useReactiveVar(meState);
    const disabledButtons = (me?.user?.current_operation_id || 0) <= 0;
    return (

        <DialogActions >
            <Button onClick={props.cancel} color={"warning"} variant="contained">Cancel</Button>
            <Button
                variant={"contained"}
                disabled={props.first}
                color="primary"
                onClick={props.back}
            >
                Back
            </Button>
                <Button
                    variant="contained"
                    color={ props.last ? "success": "primary"}
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
            }
        ],
        env: payloadFields,
    },
    task_create: {
        description: "This workflow is triggered when a Task is first created and sent for preprocessing at the payloadtype container",
        trigger_data: [],
        env: taskFields,
    },
    task_start: {
        description: "This workflow is triggered when a Task is picked up by the agent to start executing",
        trigger_data: [],
        env: taskFields,
    },
    task_finish: {
        description: "This workflow is triggered when a Task finishes either successfully or via error",
        trigger_data: [],
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
            }
        ],
        env: [...callbackFields, "previous_checkin", "checkin_difference"],
    },
    task_intercept: {
        description: "This workflow is triggered after a Task finishes its opsec_post check to allow one more chance for a task to be blocked.",
        trigger_data: [],
        env: taskFields,
    },
    response_intercept: {
        description: "This workflow is triggered when a Task returns new output in the user_output field for the user to see in the UI, but first passes that output to this workflow for modification before saving it in the database.",
        trigger_data: [],
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
        ]
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
        <div style={{display: "flex", alignItems: "center", width: "100%"}}>
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
            OR
            <MythicTextField placeholder={textFieldPlaceholder} name={textFieldName}
                             onChange={onChangeLocalValue}
                             value={value}
                             marginBottom={"0px"}/>
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
        <>
            {arrayValues.map( (a, i) => (
                <div style={{display: "flex", alignItems: "center"}} key={"arrayentry" + i}>
                    <IconButton onClick={() => removeElement(i)} color={"error"}>
                        <DeleteIcon />
                    </IconButton>
                    <MythicTextField onChange={(name, value, error) => updateElement(i, value)} value={a}
                    name={textFieldName} placeholder={textFieldPlaceholder}/>
                </div>
                )
            )}
            <IconButton onClick={addElement} color={"success"} >
                <AddCircleOutlineIcon />
            </IconButton>
        </>
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
        setFiles([...evt.target.files]);
    }
    return (
        <>
            <Button variant="contained" component="label" style={{display: "inline-block"}}>
                Select Files
                <input onChange={onFileMultChange} type="file" hidden multiple />
            </Button>
            { files.length > 0 &&
                <Typography>
                    {files?.map((f, i) => f.name).join(", ")}
                </Typography>
            }
            <br/>
        </>
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
        <>
            <div style={{flexGrow: 1, width: "100%", display: "flex", flexDirection: "column", overflowY: "auto"}}>
                <Table style={{tableLayout: "fixed", width: "100%",}}>
                    <TableHead>
                        <TableRow>
                            <MythicStyledTableCell style={{width: "10rem"}}></MythicStyledTableCell>
                            <MythicStyledTableCell></MythicStyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow hover>
                            <MythicStyledTableCell>Workflow Name</MythicStyledTableCell>
                            <MythicStyledTableCell>
                                <MythicTextField placeholder={"My Custom Workflow..."} onChange={(name, value, error) => setName(value)} value={name}
                                                 />
                            </MythicStyledTableCell>
                        </TableRow>
                        <TableRow hover>
                            <MythicStyledTableCell>Description</MythicStyledTableCell>
                            <MythicStyledTableCell>
                                <MythicTextField placeholder={"My Custom Workflow Description..."} onChange={(name, value, error) => setDescription(value)} value={description}
                                                 />
                            </MythicStyledTableCell>
                        </TableRow>
                        <TableRow hover>
                            <MythicStyledTableCell>Trigger</MythicStyledTableCell>
                            <MythicStyledTableCell>
                                <FormControl  sx={{ display: "inline-block", marginTop: "10px", width: "100%" }} size="small">
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
                                <Typography style={{}}>
                                    {triggerOptionsData[trigger]?.description}
                                </Typography>
                            </MythicStyledTableCell>
                        </TableRow>
                        <TableRow hover>
                            <MythicStyledTableCell>Trigger Data</MythicStyledTableCell>
                            <MythicStyledTableCell>
                                {triggerOptionsData[trigger]?.trigger_data?.length > 0 ?
                                    (<Table>
                                        <TableHead>
                                            <TableRow>
                                                <MythicStyledTableCell style={{width: "30%"}}></MythicStyledTableCell>
                                                <MythicStyledTableCell></MythicStyledTableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {triggerData?.map( t => (
                                                <CreatePayloadParameter key={t.name} onChange={onChangeTriggerData} {...t} />
                                            ))}
                                        </TableBody>
                                    </Table>) :
                                    (<Typography>
                                        N/A
                                    </Typography>)
                                }
                            </MythicStyledTableCell>
                        </TableRow>
                        <TableRow hover>
                            <MythicStyledTableCell>Run As</MythicStyledTableCell>
                            <MythicStyledTableCell>
                                <ChooseOneOrCustom choices={runAsOptions} choicesLabel={""} updateData={setRunAs}
                                    textFieldName={"Custom Operator"} textFieldPlaceholder={"Specific operator..."}
                                    prevData={prevData?.run_as}/>
                                <Typography style={{}}>
                                    {getRunAsDescription({runAs})}
                                </Typography>
                            </MythicStyledTableCell>
                        </TableRow>
                        <TableRow hover>
                            <MythicStyledTableCell>Keywords</MythicStyledTableCell>
                            <MythicStyledTableCell>
                                <GetArrayValues updateData={setKeywords} prevData={prevData?.keywords}
                                textFieldName={"keyword"} textFieldPlaceholder={"Keyword"}/>
                                <Typography >
                                    {"Keywords provide additional ways for the workflow to get executed. These are custom words you provide that can then be supplied via API calls to kick off this workflow outside of the trigger method."}
                                </Typography>
                            </MythicStyledTableCell>
                        </TableRow>
                        <TableRow hover>
                            <MythicStyledTableCell>Files</MythicStyledTableCell>
                            <MythicStyledTableCell>
                                <GetMultipleFileSelect prevData={prevData?.files} updateData={setFiles} />
                                <Typography>
                                    {"Files you upload here (or associate with the workflow later on via the paperclip icon) are available in all the steps via the workflow.filename identifier."}
                                </Typography>
                            </MythicStyledTableCell>
                        </TableRow>
                        <TableRow hover>
                            <MythicStyledTableCell>Environment</MythicStyledTableCell>
                            <MythicStyledTableCell>
                                This is a free form set of key-value pairs in JSON that you can provide to make available to all your steps for easy access. You can think of this kind of like global static variables.
                                <br/><br/>
                                <ResponseDisplayPlaintext plaintext={environmentRef.current} onChangeContent={onChangeEnvironment} initial_mode={"json"} autoFormat={false} />
                            </MythicStyledTableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
            <CreateEventingStepperNavigationButtons first={first} last={last} finished={finishedStep1} back={back} cancel={cancel} />
        </>
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
const EventingStepInputs = ({updateStep, index, localInputOptions, step1Data, prevData}) => {
    const theme = useTheme();
    const [localInputs, setLocalInputs] = React.useState([]);
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
        updateStep(index, "inputs", debouncedLocalInput);
    }, [debouncedLocalInput]);
    React.useEffect( () => {
        if(prevData.length > 0 && localInputs.length === 0){
            setLocalInputs(prevData);
        }
    }, [prevData]);
    return (
        <>
            {localInputs.map( (d, i) => (
                <React.Fragment key={"localinputs" + i}>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: "8px",
                        width: "100%"
                    }} >
                        <IconButton onClick={() => removeLocalInput(i)}>
                            <DeleteIcon color={"error"} style={{marginRight: "5px"}}/>
                        </IconButton>
                        <MythicTextField name={"Input Name"} placeholder={"Input Name"}
                                         onChange={(name, value, error) => onChangeLocalInputName(i, value)}
                                         value={localInputs[i].name}
                                         marginBottom={"0px"}/>
                        <FormControl sx={{display: "inline-block", width: "15rem",}}>
                            <TextField
                                label={"What kind of input"}
                                select
                                style={{width: "100%",}}
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
                                <div style={{display: "flex", alignItems: "center", width: "100%"}}>
                                    <FormControl sx={{display: "inline-block", width: "100%",}}>
                                        <TextField
                                            label={"Environment Options"}
                                            select
                                            style={{width: "100%",}}
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
                                    OR
                                    <MythicTextField placeholder={""} name={"Custom Value"}
                                                     onChange={(name, value, error) => onChangeLocalInputValue(i, value)}
                                                     value={localInputs[i].value}
                                                     marginBottom={"0px"} />
                                </div>
                            )
                            :
                            (<MythicTextField placeholder={""} name={"Input Value"}
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
                    </div>
                    {getInputTypeDescription(localInputs[i].type)}
                    <br/>
                </React.Fragment>
            ))}
            <Button onClick={addLocalInput} color={"success"}>
                <AddCircleIcon style={{marginRight: "5px", backgroundColor: "white", borderRadius: "10px"}} />
                Add New Input
            </Button>
        </>
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
        <>
            {localOutputs.map( (d, i) => (
                <React.Fragment key={"localoutputs" + i}>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: "8px",
                        width: "100%"
                    }}>
                        <IconButton onClick={() => removeLocalOutput(i)}>
                            <DeleteIcon color={"error"} style={{marginRight: "5px"}}/>
                        </IconButton>
                        <MythicTextField name={"Output Name"} placeholder={"Output Name"}
                                         onChange={(name, value, error) => onChangeLocalOutputName(i, value)}
                                         value={localOutputs[i].name}
                                         marginBottom={"0px"}/>
                        {outputOptionsData[selectedAction].output_fields.length > 0 &&
                            <>
                                <FormControl sx={{display: "inline-block", width: "100%",}}>
                                    <TextField
                                        label={"Output options"}
                                        select
                                        style={{width: "100%",}}
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
                                OR
                            </>
                        }

                        <MythicTextField placeholder={""} name={"Custom Value"}
                                         onChange={(name, value, error) => onChangeLocalOutputValue(i, value)}
                                         value={localOutputs[i].value}
                                         marginBottom={"0px"}/>
                    </div>
                </React.Fragment>
            ))}
            <Button onClick={addLocalOutput} color={"success"}>
                <AddCircleIcon style={{marginRight: "5px", backgroundColor: "white", borderRadius: "10px"}} />
                Add New Output
            </Button>
        </>
    )
}
const EventingStepActionDataTaskCreate = ({allSteps, updateStep, index, prevData}) => {
    const theme = useTheme();
    const paramsDictionaryRef = React.useRef("");
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
        if(actionData.params_dictionary.length > 0){
            try{
                simplifiedParams.params_dictionary = JSON.parse(actionData.params_dictionary);
            }catch{
                simplifiedParams.params_dictionary = actionData.params_dictionary;
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
    React.useEffect( () => {
        if(prevData){
            let updatedData = {...actionData, ...prevData};
            if(typeof updatedData.params_dictionary !== 'string'){
                paramsDictionaryRef.current = JSON.stringify(updatedData.params_dictionary, null, 4);
                updatedData.params_dictionary = JSON.stringify(updatedData.params_dictionary, null, 4);
           } else {
                paramsDictionaryRef.current = JSON.stringify(prevData?.params_dictionary || "");
            }
            setActionData(updatedData);
        }
    }, []);
    return (
        <>
            <Typography>
                {"At execution time, any values here that are the names of an INPUT will be swapped out. For example, if you have an input called CALLBACK_ID and set the 'Callback Display ID' to the value 'CALLBACK_ID', then when this step executes, 'CALLBACK_ID' will be swapped out with the value from the input section."}
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "30%"}}></MythicStyledTableCell>
                        <MythicStyledTableCell></MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Callback Display ID"}
                            </Typography>
                            <Typography style={{color: theme.palette.warning.main, fontWeight: 600}}>
                                {"Required"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <MythicTextField onChange={onChangeValue} value={actionData.callback_display_id} name={"callback_display_id"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Command Name"}
                            </Typography>
                            <Typography style={{color: theme.palette.warning.main, fontWeight: 600}}>
                                {"Required"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <MythicTextField onChange={onChangeValue} value={actionData.command_name} name={"command_name"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Payload Type"}
                            </Typography>
                            <Typography>
                                {"Use this if you want to specify a command_name that belongs to a payload type other than the one backing this callback. This is useful for things like command_augmentation commands"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <MythicTextField onChange={onChangeValue} value={actionData.payload_type} name={"payload_type"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Parameters"}
                            </Typography>
                            <Typography>
                                {"You can either specify a parameter string here or a dictionary of named parameters with the params dictionary option below"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <MythicTextField onChange={onChangeValue} value={actionData.params} name={"params"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Parameters Dictionary"}
                            </Typography>
                            <Typography>
                                {"You can either specify a dictionary of named parameters here or a string parameter value above"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <ResponseDisplayPlaintext plaintext={paramsDictionaryRef.current} autoFormat={false}
                                                      onChangeContent={onChangeParamsDictionary} initial_mode={"json"}/>
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Parameter Group Name"}
                            </Typography>
                            <Typography>
                                {"This can stay default unless you explicitly want your parameters to be treated as a specific parameter group (advanced use case)"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <MythicTextField onChange={onChangeValue} value={actionData.parameter_group_name} name={"parameter_group_name"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Parent Task ID"}
                            </Typography>
                            <Typography>
                                {"Set this to the Task ID (not display ID or agent ID) of another task to make it appear as a subtask"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <MythicTextField onChange={onChangeValue} value={actionData.parent_task_id} name={"parent_task_id"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Interactive Task"}
                            </Typography>
                            <Typography>
                                {"Toggle this to true to mark this as an interactive Task. This wouldn't be the task that starts an interactive task session, but for follow-on tasks inside of that interactive session."}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <Switch onChange={(e) => {onChangeValue("is_interactive_task", e.target.checked, "")}} checked={actionData.is_interactive_task}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    {actionData.is_interactive_task &&
                        <TableRow>
                            <MythicStyledTableCell>
                                <Typography style={{fontWeight: 600}}>
                                    {"Interactive Task Type"}
                                </Typography>
                                <Typography>
                                    {"This indicates the kind of data that's getting sent as part of the interactive task. 0 means standard input and is a safe default."}
                                </Typography>
                            </MythicStyledTableCell>
                            <MythicStyledTableCell >
                                <MythicTextField onChange={onChangeValue} value={actionData.interactive_task_type} name={"interactive_task_type"}
                                />
                            </MythicStyledTableCell>
                        </TableRow>
                    }
                </TableBody>
            </Table>
        </>
    )

}
const EventingStepActionDataCustomFunction = ({allSteps, updateStep, index, prevData}) => {
    const theme = useTheme();
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
        <>
            <Typography>
                {"At execution time, any values here that are the names of an INPUT will be swapped out. For example, if you have an input called CALLBACK_ID and set the 'Callback Display ID' to the value 'CALLBACK_ID', then when this step executes, 'CALLBACK_ID' will be swapped out with the value from the input section."}
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "30%"}}></MythicStyledTableCell>
                        <MythicStyledTableCell></MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Container Name"}
                            </Typography>
                            <Typography style={{color: theme.palette.warning.main, fontWeight: 600}}>
                                {"Required"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <MythicTextField onChange={onChangeValue} value={actionData.container_name} name={"container_name"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Function Name"}
                            </Typography>
                            <Typography style={{color: theme.palette.warning.main, fontWeight: 600}}>
                                {"Required"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <MythicTextField onChange={onChangeValue} value={actionData.function_name} name={"function_name"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Extra Data Dictionary"}
                            </Typography>
                            <Typography>
                                {"You can pass more dictionary data to your custom function here"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <br/><br/>
                            <ResponseDisplayPlaintext plaintext={paramsDictionaryRef.current} autoFormat={false}
                                                      onChangeContent={onChangeParamsDictionary} initial_mode={"json"}/>
                        </MythicStyledTableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </>
    )

}
const EventingStepActionDataConditionalCheck = ({allSteps, updateStep, index, prevData}) => {
    const theme = useTheme();
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
        <>
            <Typography>
                {"At execution time, any values here that are the names of an INPUT will be swapped out. For example, if you have an input called CALLBACK_ID and set the 'Callback Display ID' to the value 'CALLBACK_ID', then when this step executes, 'CALLBACK_ID' will be swapped out with the value from the input section."}
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "30%"}}></MythicStyledTableCell>
                        <MythicStyledTableCell></MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Container Name"}
                            </Typography>
                            <Typography style={{color: theme.palette.warning.main, fontWeight: 600}}>
                                {"Required"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <MythicTextField onChange={onChangeValue} value={actionData.container_name} name={"container_name"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Function Name"}
                            </Typography>
                            <Typography style={{color: theme.palette.warning.main, fontWeight: 600}}>
                                {"Required"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <MythicTextField onChange={onChangeValue} value={actionData.function_name} name={"function_name"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Step Names"}
                            </Typography>
                            <Typography>
                                {"This is an array of step names that you're conditionally going to skip"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell>
                            {actionData.steps.map( (s, i) => (
                                <div style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginTop: "8px"
                                }} key={"step" + s}>
                                    <IconButton onClick={() => removeStep(i)}>
                                        <DeleteIcon color={"error"} style={{marginRight: "5px"}}/>
                                    </IconButton>
                                    <FormControl sx={{display: "inline-block", marginTop: "10px", width: "100%"}}
                                                 size="small">
                                        <TextField
                                            label={"Step To Potentially Skip"}
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
                            <IconButton onClick={addStep} >
                                <AddCircleOutlineIcon color={"success"}/>
                            </IconButton>
                        </MythicStyledTableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </>
    )

}
const EventingStepActionDataCreatePayload = ({allSteps, updateStep, index, prevData}) => {
    const theme = useTheme();
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
        <>
            <Typography>
                {"At execution time, any values here that are the names of an INPUT will be swapped out. For example, if you have an input called CALLBACK_ID and set the 'Callback Display ID' to the value 'CALLBACK_ID', then when this step executes, 'CALLBACK_ID' will be swapped out with the value from the input section."}
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "30%"}}></MythicStyledTableCell>
                        <MythicStyledTableCell></MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Payload Configuration"}
                            </Typography>
                            <Typography style={{color: theme.palette.warning.main, fontWeight: 600}}>
                                {"Required"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <ResponseDisplayPlaintext plaintext={paramsDictionaryRef.current} autoFormat={false}
                                                      onChangeContent={onChangeParamsDictionary} initial_mode={"json"}/>
                        </MythicStyledTableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </>
    )

}
const EventingStepActionDataCreateCallback = ({allSteps, updateStep, index, prevData}) => {
    const theme = useTheme();
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
        <>
            <Typography>
                {"At execution time, any values here that are the names of an INPUT will be swapped out. For example, if you have an input called CALLBACK_ID and set the 'Callback Display ID' to the value 'CALLBACK_ID', then when this step executes, 'CALLBACK_ID' will be swapped out with the value from the input section."}
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "30%"}}></MythicStyledTableCell>
                        <MythicStyledTableCell></MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Callback Configuration"}
                            </Typography>
                            <Typography style={{color: theme.palette.warning.main, fontWeight: 600}}>
                                {"Required"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <ResponseDisplayPlaintext plaintext={paramsDictionaryRef.current} autoFormat={false}
                                                      onChangeContent={onChangeParamsDictionary} initial_mode={"json"}/>
                        </MythicStyledTableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </>
    )

}
const EventingStepActionDataTaskIntercept = ({allSteps, updateStep, index, prevData}) => {
    const theme = useTheme();
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
        <>
            <Typography>
                {"At execution time, any values here that are the names of an INPUT will be swapped out. For example, if you have an input called CALLBACK_ID and set the 'Callback Display ID' to the value 'CALLBACK_ID', then when this step executes, 'CALLBACK_ID' will be swapped out with the value from the input section."}
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "30%"}}></MythicStyledTableCell>
                        <MythicStyledTableCell></MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Container Name"}
                            </Typography>
                            <Typography style={{color: theme.palette.warning.main, fontWeight: 600}}>
                                {"Required"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <br/>
                            <MythicTextField onChange={onChangeValue} value={actionData.container_name} name={"container_name"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </>
    )

}
const EventingStepActionDataResponseIntercept = ({allSteps, updateStep, index, prevData}) => {
    const theme = useTheme();
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
        <>
            <Typography>
                {"At execution time, any values here that are the names of an INPUT will be swapped out. For example, if you have an input called CALLBACK_ID and set the 'Callback Display ID' to the value 'CALLBACK_ID', then when this step executes, 'CALLBACK_ID' will be swapped out with the value from the input section."}
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "30%"}}></MythicStyledTableCell>
                        <MythicStyledTableCell></MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Container Name"}
                            </Typography>
                            <Typography style={{color: theme.palette.warning.main, fontWeight: 600}}>
                                {"Required"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <br/>
                            <MythicTextField onChange={onChangeValue} value={actionData.container_name} name={"container_name"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </>
    )

}
const EventingStepActionDataCreateAlert = ({allSteps, updateStep, index, prevData}) => {
    const theme = useTheme();
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
        <>
            <Typography>
                {"At execution time, any values here that are the names of an INPUT will be swapped out. For example, if you have an input called CALLBACK_ID and set the 'Callback Display ID' to the value 'CALLBACK_ID', then when this step executes, 'CALLBACK_ID' will be swapped out with the value from the input section."}
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "30%"}}></MythicStyledTableCell>
                        <MythicStyledTableCell></MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Alert Message"}
                            </Typography>
                            <Typography style={{color: theme.palette.warning.main, fontWeight: 600}}>
                                {"Required"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <MythicTextField onChange={onChangeValue} value={actionData.alert} name={"alert"} showLabel={false}
                                             placeholder={"Alert message to send to event log and toast notification"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Source"}
                            </Typography>
                            <Typography >
                                {"Optional 'source' for the alert that shows up in webhooks and is used to collapse similar messages in the event log"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <MythicTextField onChange={onChangeValue} value={actionData.source} name={"source"} showLabel={false}
                                             placeholder={"message source"}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Alert Level"}
                            </Typography>
                            <Typography >
                                {"Set the alert level of the message. 'debug' will go to the event log without toast notifications. 'info' will do a toast notification. 'warning' will do a toast notification, increase the warning count, and send a webhook."}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <FormControl sx={{ display: "inline-block", marginTop: "10px", width: "100%" }} size="small">
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
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Send Webhook"}
                            </Typography>
                            <Typography >
                                {"If the alert level is 'warning' and there's a webhook container hooked up, then the 'alert' data gets sent as a webhook. Regardless of that though, and regardless of the alert level, toggling this to true allows you to send custom JSON field to the webhook container's custom processing."}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell >
                            <Switch
                                checked={actionData.send_webhook}
                                onChange={onChangeBoolean}
                                color={"info"}
                                inputProps={{ 'aria-label': 'primary checkbox' }}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Custom Webhook Data"}
                            </Typography>
                            <Typography>
                                {"You can pass more dictionary data to your custom webhook parsing here"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <ResponseDisplayPlaintext plaintext={paramsDictionaryRef.current} autoFormat={false}
                                                      onChangeContent={onChangeParamsDictionary} initial_mode={"json"}/>
                        </MythicStyledTableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </>
    )

}
const EventingStepActionDataSendWebhook = ({allSteps, updateStep, index, prevData}) => {
    const theme = useTheme();
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
        <>
            <Typography>
                {"At execution time, any values here that are the names of an INPUT will be swapped out. For example, if you have an input called CALLBACK_ID and set the 'Callback Display ID' to the value 'CALLBACK_ID', then when this step executes, 'CALLBACK_ID' will be swapped out with the value from the input section."}
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "30%"}}></MythicStyledTableCell>
                        <MythicStyledTableCell></MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <MythicStyledTableCell>
                            <Typography style={{fontWeight: 600}}>
                                {"Custom Webhook Data"}
                            </Typography>
                            <Typography>
                                {"You can pass a dictionary of data to your custom webhook parsing here"}
                            </Typography>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <br/><br/>
                            <ResponseDisplayPlaintext plaintext={paramsDictionaryRef.current} autoFormat={false}
                                                      onChangeContent={onChangeParamsDictionary} initial_mode={"json"}/>
                        </MythicStyledTableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </>
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
const EventingStep = ({step, allSteps, updateStep, index, step1Data}) => {
    const theme = useTheme();
    const [name, setName] = React.useState(step.name);
    const [description, setDescription] = React.useState(step.description);
    const [selectedAction, setSelectedAction] = React.useState(step.action);
    const [dependsOnOptions, setDependsOnOptions] = React.useState([]);
    const [dependsOn, setDependsOn] = React.useState([]);
    const [updatedActionOptions, setUpdatedActionOptions] = React.useState([]);
    const [continueOnError, setContinueOnError] = React.useState(step.continue_on_error);
    const [localInputOptions, setLocalInputOptions] = React.useState([]);

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
    const ActionDataElement = actionOptionsData[selectedAction].element;
    const onChangeContinueOnError = (evt) => {
        setContinueOnError(evt.target.checked)
        updateStep(index, "continue_on_error", evt.target.checked);
    }
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
        <Paper elevation={5} style={{marginBottom: "10px", marginTop: "5px", paddingLeft: "5px", paddingRight: "5px", borderBottom: `5px solid ${theme.palette.primary.main}`}}>
            <Table >
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "15%"}}></MythicStyledTableCell>
                        <MythicStyledTableCell></MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <MythicStyledTableCell>Name</MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <MythicTextField placeholder={"Step Name..."} onChange={onChangeName} value={name}
                                             marginBottom={"0px"}/>
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>Description</MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <MythicTextField placeholder={"Step Description..."} onChange={onChangeDescription} value={description}
                                             marginBottom={"0px"}/>
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>Action</MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <FormControl sx={{ display: "inline-block", marginTop: "10px", width: "100%" }} size="small">
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
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell> </MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <Typography style={{}}>
                                {actionOptionsData[selectedAction]?.description}
                            </Typography>
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>Inputs</MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <EventingStepInputs index={index} localInputOptions={localInputOptions}
                                                step1Data={step1Data} updateStep={updateStep}
                                                prevData={step?.inputs || []}/>
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>Action Data</MythicStyledTableCell>
                        <MythicStyledTableCell>
                            {ActionDataElement !== null &&
                                <ActionDataElement allSteps={allSteps} updateStep={updateStep} index={index} prevData={step?.action_data} />
                            }
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>Outputs</MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <EventingStepOutputs index={index} selectedAction={selectedAction}
                                                step1Data={step1Data} updateStep={updateStep}
                                                prevData={step?.outputs || []}/>
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>Depends On</MythicStyledTableCell>
                        <MythicStyledTableCell>
                            {dependsOn.map((d, i) => (
                                <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}
                                     key={"dependson" + i}>
                                    <DeleteIcon color={"error"} style={{marginRight: "5px"}}
                                                onClick={() => removeDependsOn(i)}/>
                                    <FormControl sx={{display: "inline-block", marginTop: "10px", width: "100%"}}
                                                 size="small">
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
                            ))}
                            <Button onClick={addDependsOn} color={"success"} >
                                <AddCircleIcon style={{marginRight: "5px", backgroundColor: "white", borderRadius: "10px"}} />
                                Add Step Dependency
                            </Button>
                        </MythicStyledTableCell>
                    </TableRow>
                    <TableRow>
                        <MythicStyledTableCell>Continue on Error</MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <Switch
                                checked={step.continue_on_error}
                                onChange={onChangeContinueOnError}
                                color={"info"}
                                inputProps={{ 'aria-label': 'primary checkbox' }}
                            />
                        </MythicStyledTableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </Paper>

    )
}
const inputsHelp = `
Steps:
    Steps are the building blocks of workflows. They define the specific actions that happen, what to do if there's an error, what kind of data should get passed to the action, what kind of data to take in from outside sources (other steps, env, etc), and what kind of data to make available to other steps.

Inputs:
    Inputs are a dictionary with key/value pairs. When starting a step, Mythic iterates through the inputs and checks to see if the input's "key" is available in the step's action data. If it's present, then that key is swapped out with the corresponding value. This happens for all the inputs before the final action data is passed along to the action. This allows you to provide "placeholders" in your action data for things that you don't know while you're creating this workflow (for example: the callback id for a new callback trigger). 

Action Data:
    Action data is the set of key/value pairs that are needed by the action to perform the required action. This is highly specific to the corresponding action and has been updated in the UI for each action that's available with required fields marked as required and descriptions for all other fields.

Outputs:
    Outputs are a dictionary with key/value pairs that allow you to expose data after one step for use in another step. Similar to Inputs, this allows you to forward along data that you might not know while writing the workflow. For example, an action that creates a new task might return that task's ID as output for use in a subsequent action. Some actions, like custom_function and conditional_check, allow you to return arbitrary other outputs that aren't defined in this workflow for you to use in subsequent tasks as well.
    `;
const CreateEventingStep2 = ({finished, back, first, last, cancel, prevData, step1Data}) => {
    const [steps, setSteps] = React.useState(prevData ? prevData : []);
    const [displayHelp, setDisplayHelp] = React.useState(false);
    const addStep = () => {
        setSteps([...steps, {
            name: "",
            description: "",
            inputs: [],
            action: "task_create",
            action_data: {},
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
    React.useEffect( () => {
        if(prevData !== undefined){
            setSteps(prevData);
        }
    }, [prevData]);
    return (
        <>
            <Button onClick={() => setDisplayHelp(true)} variant={"contained"} color={"primary"}
                    size={"small"}>
                Display Help
            </Button>
            <Button size={"small"} onClick={addStep} color={"success"}>
                <AddCircleIcon style={{marginRight: "5px", backgroundColor: "white", borderRadius: "10px"}} /> Add Step
            </Button>
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
            <div style={{flexGrow: 1, width: "100%", display: "flex", flexDirection: "column", overflowY: "auto"}}>
                <Table style={{tableLayout: "fixed", width: "100%",}}>
                    <TableHead>
                        <TableRow>
                            <MythicStyledTableCell style={{width: "3rem"}}></MythicStyledTableCell>
                            <MythicStyledTableCell></MythicStyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {steps.map( (s, i) => (
                            <TableRow key={"step" + i} >
                                <MythicStyledTableCell>
                                    <IconButton onClick={() => removeStep(i)}>
                                        <DeleteIcon color={"error"} />
                                    </IconButton>
                                </MythicStyledTableCell>
                                <MythicStyledTableCell>
                                    <EventingStep step={s} allSteps={steps} updateStep={updateStep} index={i} step1Data={step1Data}/>
                                </MythicStyledTableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <CreateEventingStepperNavigationButtons first={first} last={last} finished={finishedStep2} back={back} cancel={cancel} />
        </>
    )
}

const outputFormatOptions = ["json", "yaml", "toml"];
const CreateEventingStep3 = ({finished, back, first, last, cancel, prevData, step1Data, step2Data}) => {
    const [openEventStepRender, setOpenEventStepRender] = React.useState({open: false, data: {}});
    const [renderedVersion, setRenderedVersion] = React.useState("");
    const [outputFormat, setOutputFormat] = React.useState("json");
    const [testFileMutation] = useLazyQuery(testFileWebhookMutation, {
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
        testFileMutation({variables: {file_contents: renderedVersion, output_format: e.target.value}});
        setOutputFormat(e.target.value);
    }
    const onChangeFileText = (newText) => {
        setRenderedVersion(newText);
    }
    React.useEffect( () => {
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
                return;
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
        setRenderedVersion(JSON.stringify(finalStepData, null, 2));
        //setRenderedVersion(JSON.stringify(step2Data, null, 2));
    }, []);
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
        <>
            <div style={{flexGrow: 1, width: "100%", display: "inline-flex", flexDirection: "column", overflowY: "auto"}}>
                <div style={{display: "inline-flex", alignItems: "center", marginTop: "5px"}}>
                    <FormControl sx={{display: "inline-block", width: "100%",}}>
                        <TextField
                            label={"Reformat Output"}
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
                    <Button onClick={testOutput} size={"small"} color={"info"}>Test Output</Button>
                    <Button onClick={previewGraph} color={"info"} size={"small"}>
                        <AccountTreeIcon style={{marginRight: "5px"}} /> Graph
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
                <ResponseDisplayPlaintext autoFormat={false} plaintext={renderedVersion} onChangeContent={onChangeFileText} initial_mode={outputFormat} expand={true} />
            </div>
            <CreateEventingStepperNavigationButtons first={first} last={last} finished={finishedStep3} back={back} cancel={cancel}/>
        </>
    )
}
export function CreateEventingStepper(props){
      const [payload, setPayload] = React.useState({});
      const [activeStep, setActiveStep] = React.useState(0);
      const getStepContent = (step) => {
          switch (step) {
            case 0:
              return <CreateEventingStep1 prevData={payload[0]} finished={handleStepData} back={cancelStep} first={true} last={false} cancel={props.onClose}/>;
            case 1:
              return <CreateEventingStep2 prevData={payload[1]} step1Data={payload[0]} finished={handleStepData} back={cancelStep} first={false} last={false} cancel={props.onClose}/>;
          case 2:
              return <CreateEventingStep3 prevData={payload[2]} step1Data={payload[0]} step2Data={payload[1]} finished={finished} back={cancelStep} first={false} last={true} cancel={props.onClose}/>;
          default:
              return "unknown step";
          }
        }
      const handleStepData = (stepData) => {
        setPayload({...payload, [activeStep]: stepData});
        handleNext();
      }
      const cancelStep = () => {
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
    return (
        <DialogContent style={{height: "calc(95vh)", margin: 0, padding: 0, marginRight: "10px", marginLeft: "5px"}}>
            <div style={{display: "flex", flexDirection: "column", width: "100%", height: "100%"}}>
                <Stepper activeStep={activeStep} alternativeLabel style={{marginTop: "10px"}}>
                    {steps.map((label, index) => (
                        <Step key={label}
                              sx={{
                                  '& .MuiStepLabel-root .Mui-completed': {
                                      color: 'success.main', // circle color (COMPLETED)
                                  },
                                  '& .MuiStepLabel-label.Mui-completed.MuiStepLabel-alternativeLabel':
                                      {
                                          color: 'grey.500', // Just text label (COMPLETED)
                                      },
                                  '& .MuiStepLabel-root .Mui-active': {
                                      color: 'info.main', // circle color (ACTIVE)
                                  },
                                  '& .MuiStepLabel-label.Mui-active.MuiStepLabel-alternativeLabel':
                                      {
                                          fontWeight: "bold", // Just text label (ACTIVE)
                                          color: ''
                                      },
                                  '& .MuiStepLabel-root .Mui-active .MuiStepIcon-text': {
                                      fill: 'black', // circle's number (ACTIVE)
                                  },
                              }}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
                {getStepContent(activeStep)}
            </div>
        </DialogContent>
    );
} 
