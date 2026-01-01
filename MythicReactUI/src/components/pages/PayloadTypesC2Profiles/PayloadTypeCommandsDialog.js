import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import PlayCircleFilledTwoToneIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import LinearProgress from '@mui/material/LinearProgress';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import Paper from '@mui/material/Paper';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {getDynamicQueryParamsString} from "../Callbacks/TaskParametersDialogRow";

const GET_Payload_Details = gql`
query GetPayloadDetails($payload_name: String!) {
  command(where: {payloadtype: {name: {_eq: $payload_name}}}, order_by: {cmd: asc}) {
    cmd
    description
    id
    version
    needs_admin
    deleted
  }
}
`;
const GET_CommandParameters = gql`
query GetCommandParameters($command_id: Int!) {
  commandparameters(where: {command_id: {_eq: $command_id}}) {
      choice_filter_by_command_attributes
      choices
      choices_are_all_commands
      choices_are_loaded_commands
      cli_name
      default_value
      description
      display_name
      dynamic_query_function
      limit_credentials_by_type
      name
      parameter_group_name
      required
      supported_agent_build_parameters
      supported_agents
      type
      ui_position
      verifier_regex
      id
  }
}
`;

export function PayloadTypeCommandDialog({service, payload_name, onClose}) {
    const [commands, setCommands] = useState([]);
    const [openScriptDialog, setOpenScriptDialog] = useState({
        open: false,
        command_id: 0,
        command_name: "",
    });

    const theme = useTheme();
    const { loading, error } = useQuery(GET_Payload_Details, {
        variables: {payload_name: payload_name},
        onCompleted: data => {
            const deleted = data.command.filter(c => c.deleted);
            const notDeleted = data.command.filter(c => !c.deleted);
            setCommands([...notDeleted, ...deleted]);
        }
        });
    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error! {error.message}</div>;
    }
    const onClickOpenScriptDialog = (e, command) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenScriptDialog({open: true, command_id: command.id, command_name: command.cmd});
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{payload_name}'s Commands</DialogTitle>
        <DialogContent dividers={true} style={{padding: 0}}>
            <Table size="small" stickyHeader={true} aria-label="details"
                   style={{"tableLayout": "fixed", "overflowWrap": "break-word", overflowY:"auto", width: "100%", height: "100%"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "20%"}}>Command</TableCell>
                        <TableCell style={{width: "6rem"}}>Version</TableCell>
                        <TableCell style={{width: "5rem"}}>Docs</TableCell>
                        <TableCell style={{width: "5rem"}}>Script</TableCell>
                        <TableCell>Description</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {
                        commands.map((param) => (
                            <TableRow key={"command" + param.id} hover style={{backgroundColor: param.deleted? theme.palette.action.disabledBackground : ''}}>
                                <TableCell>
                                    <Typography style={{textDecoration: param.deleted ? 'line-through' : ''}}>
                                        {param.cmd}
                                    </Typography>
                                    {param.needs_admin && <Typography style={{fontWeight: 600}} color={"warning"}>
                                        {"Needs Admin"}
                                    </Typography>}
                                </TableCell>
                                <TableCell>{param.version}</TableCell>
                                <TableCell>
                                    <IconButton
                                        href={service.wrapper ? "/docs/wrappers/" + service.name : "/docs/agents/" + service.name}
                                        target="_blank"
                                        size="large">
                                        <MenuBookIcon/>
                                    </IconButton>
                                </TableCell>
                                <TableCell>
                                    <IconButton onClick={(e) => onClickOpenScriptDialog(e, param)} >
                                        <PlayCircleFilledTwoToneIcon />
                                    </IconButton>
                                </TableCell>
                                <TableCell>{param.description}</TableCell>
                            </TableRow>
                        ))
                    }
                </TableBody>
            </Table>
            {openScriptDialog.open &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openScriptDialog.open}
                              onClose={()=>{setOpenScriptDialog({open: false, command_id: 0});}}
                              innerDialog={
                    <ScriptingCommandDialog command_id={openScriptDialog.command_id} command_name={openScriptDialog.command_name}
                                            onClose={()=>{setOpenScriptDialog({open: false, command_id: 0});}}
                    />
                }
            />}
        </DialogContent>
        <DialogActions>
            <Button variant="contained" onClick={onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

const exampleAgentConnect = `
    "host":"hostname where remote payload/callback is running",
    "agent_uuid":"payload uuid if trying to connect to payload",
    "c2_profile":{
        "name":"name of c2 profile",
        "parameters":{
            "parameter name":"parameter value",
        },
    "callback_uuid":"callback uuid if trying to connect to callback"
}
`;
const exampleUploadFile = (commandName, parameterName) => `newFileID = await mythic.register_file(
    mythic=mythic_instance, filename="test.txt", contents=b"this is a test"
)
status = await mythic.issue_task(
   mythic=mythic_instance,
   command_name="${commandName}",
   parameters={"${parameterName}": newFileID},
   callback_display_id=1,
)
`;
const exampleCredentialJson = `{
    "account":"tywin.lannister@SEVENKINGDOMS.LOCAL",
    "comment":"",
    "credential":"doIFO<..snip...>FM",
    "realm":"SEVENKINGDOMS.LOCAL",
    "type":"ticket"
}
`;
export function ScriptingCommandDialog({command_id, command_name, onClose}){
    const [params, setParams] = useState([]);
    const theme = useTheme();
    useQuery(GET_CommandParameters, {
        variables: {command_id: command_id},
        onCompleted: data => {
            const grouped = data.commandparameters.reduce( (prev, cur) => {
                if(prev[cur.parameter_group_name] === undefined){
                    prev[cur.parameter_group_name] = [cur];
                    return prev;
                }
                prev[cur.parameter_group_name].push(cur);
                prev[cur.parameter_group_name].sort((a, b) => {return a.ui_position < b.ui_position ? -1 : 1});
                return prev;
            }, {});
            let groupedArray = [];
            for(const key in grouped){
                groupedArray.push(grouped[key]);
            }
            setParams(groupedArray);
            console.log(groupedArray);
        }
    });
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">{command_name}'s Parameters</DialogTitle>
            <DialogContentText>
                <Typography component={"span"} style={{marginLeft: "10px", display: "block"}}>
                    Each "Parameter Group" is one way to issue this task. These "Parameter Groups" allow a single task to offer a wider range of tasking options with similar code paths without creating new commands for each option and by cleaning up the total parameter options to make it less confusing.
                </Typography>
                <Typography component={"span"} style={{marginLeft: "10px", display: "block"}}>
                    <b>Note:</b> Parameters with "Required" must have a value supplied by you, but everything else has a "Default Value" that will be supplied if you choose not to submit one.
                </Typography>
            </DialogContentText>
            <DialogContent dividers={true} style={{padding: 0}}>
                {params.map( (paramGroup) => (
                    <div key={paramGroup[0].parameter_group_name}>
                        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", }} variant={"elevation"}>
                            <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                                Parameter Group: {paramGroup[0].parameter_group_name}
                            </Typography>
                        </Paper>
                        <Table style={{tableLayout: "fixed"}}>
                            <TableHead>
                                <TableRow>
                                    <TableCell style={{width: "40%"}}>Name</TableCell>
                                    <TableCell>Value</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paramGroup.map( (param) => (
                                    <TableRow key={param.id}>
                                        <MythicStyledTableCell >
                                            <Typography style={{fontWeight: "600", wordBreak: "break-all"}} >
                                                {param.name}
                                            </Typography>
                                            <Typography variant={"body2"} style={{
                                                fontSize: theme.typography.pxToRem(14),
                                                wordBreak: "break-all"
                                            }}>
                                                {param.description}
                                            </Typography>
                                            {param.required && <Typography component="div" color={"warning"}>Required</Typography>}
                                        </MythicStyledTableCell>
                                        <TableCell style={{whiteSpace: "pre-wrap"}}>
                                            <Typography>
                                                <b>Value Type:</b> {param.type}
                                            </Typography>
                                            {param.verifier_regex !== "" &&
                                                <Typography>
                                                    Note: Value must match the following regex: {param.verifier_regex}
                                                </Typography>
                                            }
                                            <Typography>
                                                <b>Default Value:</b> {param.default_value}
                                            </Typography>
                                            {param.choices.length > 0 &&
                                                <Typography>
                                                    Choose from the following: {param.choices.join(", ")}
                                                </Typography>
                                            }
                                            {param.choices_are_all_commands &&
                                                <Typography>
                                                    <b>Note:</b> Provide any command name
                                                </Typography>
                                            }
                                            {param.choices_are_loaded_commands &&
                                                <Typography>
                                                    <b>Note:</b> Provide any currently loaded command name
                                                </Typography>
                                            }
                                            {param.dynamic_query_function !== "" &&
                                                <Typography>
                                                    <b>Note:</b> This command in the UI will dynamically give you a list of options to choose from either through the modal or via tab complete.
                                                    The following mutation can be used to dynamically generate the same choices. In this case, "other_parameters", are just the values of the other parameters you've set for this command in case they offer meaningful context for this dynamic function. They are provided as a standard dictionary (not a string)
                                                    <div className={"code-box"}>
                                                        <code>
                                                            {getDynamicQueryParamsString}
                                                        </code>
                                                    </div>

                                                </Typography>
                                            }
                                            {param.type === "File" &&
                                                <Typography>
                                                    <b>Note:</b> This parameter expects a file's AgentFileID (UUID) value. When issuing this task through the UI, you will be prompted to select a file from your file system to upload.
                                                    When scripting, you should upload a new file first and provide the returned AgentFileID here.<br/>
                                                    <div className={"code-box"}>
                                                        <code >
                                                            {exampleUploadFile(command_name, param.name)}
                                                        </code>
                                                    </div>
                                                </Typography>
                                            }
                                            {param.type === "TypedArray" &&
                                                <Typography>
                                                    <b>Note:</b> TypedArrays are arrays of strings that also carry along a "type" identifier with it. This is expressed in scripting and the code as an array of arrays.
                                                    In the UI, tab complete or the modal will show you how to fill this out.
                                                    When scripting, you can provide this nested array explicitly:
                                                    <div className={"code-box"}>
                                                        <code>
                                                            [ ["{param.choices[0]}", "test"], ["{param.choices[0]}", "values"] ]
                                                        </code>
                                                    </div>
                                                </Typography>
                                            }
                                            {param.type === "AgentConnect" &&
                                                <Typography>
                                                    <b>Note:</b> This parameter type is more complex and is meant to provide a handy way in the UI to allow an operator to select a payload or callback to connect to. In the UI, this dynamically resolves hosts and their payloads/callbacks to list out their P2P C2 profile options so that you can link up without remember things like randomized named pipe values.
                                                    You can do the same thing programmatically, but you'll have to fetch the pieces of information yourself and set the value as the resulting dictionary:
                                                    <div className={"code-box"}>
                                                        <code>
                                                            {exampleAgentConnect}
                                                        </code>
                                                    </div>
                                                </Typography>
                                            }
                                            {param.type === "LinkInfo" &&
                                                <Typography>
                                                    <b>Note:</b> This parameter type is more complex and is meant to provide a handy way in the UI to allow an operator to select an existing P2P link for either unlinking or relinking. The UI dynamically resolves existing "callbackgraphedge" values and their info.
                                                    You can do the same thing programmatically, but you'll have to fetch the pieces of information yourself and set the value as the resulting dictionary. You'll notice that the data is the exact same as if the type was "AgentConnect", it's just displayed in a different format in the UI.
                                                    <div className={"code-box"}>
                                                        <code>
                                                            {exampleAgentConnect}
                                                        </code>
                                                    </div>
                                                </Typography>
                                            }
                                            {param.type === "PayloadList" &&
                                                <>
                                                    <Typography>
                                                        <b>Note:</b> This parameter simply supplies a list of payloads for the user to select. From here, the actual value that's passed along is just the UUID of the payload the user selected.
                                                    </Typography>
                                                    {param.supported_agents.length > 0 &&
                                                        <Typography>
                                                            <b>Note:</b> This command has an explicit list of agents it supports; this is typically done in conjunction with the "PayloadList" type to help reduce the options to only valid ones.
                                                            <br/>The supported agents are: {param.supported_agents.join(", ")}
                                                        </Typography>
                                                    }
                                                    {Object.keys(param.supported_agent_build_parameters).length > 0 &&
                                                        <Typography>
                                                            <b>Note:</b> This command has an explicit list of build parameter values that must be set for them to be considered valid.
                                                            <br/>The supported agents and build parameter values are: {JSON.stringify(param.supported_agent_build_parameters, null, 2)}
                                                        </Typography>
                                                    }
                                                </>
                                            }
                                            {param.type === "CredentialJson" &&
                                                <>
                                                    <Typography>
                                                        <b>Note:</b> This parameter type allows the user to explicitly select a credential that exists in Mythic's credential store and pass along all of that data to the command.
                                                        The value supplied here is the actual JSON credential data like follows:
                                                        <div className={"code-box"}>
                                                            <code>{exampleCredentialJson}</code>
                                                        </div>
                                                    </Typography>
                                                    {param.limit_credentials_by_type.length > 0 &&
                                                        <Typography>
                                                            <b>Note:</b> This command limits the credential to those with the following types: {param.limit_credentials_by_type.join(", ")}
                                                        </Typography>
                                                    }
                                                </>

                                            }
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                    </div>
                ))}
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={onClose} color="primary">
                    Close
                </Button>
            </DialogActions>
        </React.Fragment>
    )
}

