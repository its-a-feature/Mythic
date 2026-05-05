import React, {useState} from 'react';
import DialogContent from '@mui/material/DialogContent';
import PlayCircleFilledTwoToneIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {getDynamicQueryParamsString} from "../Callbacks/TaskParametersDialogRow";
import {MythicDialogBody, MythicDialogButton, MythicDialogFooter, MythicDialogSection} from "../../MythicComponents/MythicDialogLayout";
import {MythicErrorState, MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";
import {MythicStatusChip} from "../../MythicComponents/MythicStatusChip";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {
    formatParameterValue,
    ParameterCodeBlock,
    ParameterMetadataItem
} from "./InstalledServiceParameterDetails";

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
     return (
        <>
            <DialogTitle id="form-dialog-title">{payload_name}'s Commands</DialogTitle>
            <DialogContent dividers={true}>
                <MythicLoadingState title="Loading commands" description="Fetching command metadata for this payload type." minHeight={180} />
            </DialogContent>
        </>
     );
    }
    if (error) {
     return (
        <>
            <DialogTitle id="form-dialog-title">{payload_name}'s Commands</DialogTitle>
            <DialogContent dividers={true}>
                <MythicErrorState title="Unable to load commands" description={error.message} minHeight={180} />
            </DialogContent>
        </>
     );
    }
    const onClickOpenScriptDialog = (e, command) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenScriptDialog({open: true, command_id: command.id, command_name: command.cmd});
    }
    const activeCommandCount = commands.filter((command) => !command.deleted).length;
    const deletedCommandCount = commands.length - activeCommandCount;
    const adminCommandCount = commands.filter((command) => !command.deleted && command.needs_admin).length;
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{payload_name}'s Commands</DialogTitle>
        <DialogContent dividers={true}>
            <MythicDialogBody compact>
            <MythicDialogSection
                title="Commands"
                description={`${activeCommandCount} active command${activeCommandCount === 1 ? "" : "s"} available for this payload type.`}
            >
            <div className="mythic-status-stack" style={{marginBottom: "0.65rem"}}>
                <MythicStatusChip label={`${activeCommandCount} Active`} status="success" />
                {adminCommandCount > 0 &&
                    <MythicStatusChip label={`${adminCommandCount} Admin`} status="warning" />
                }
                {deletedCommandCount > 0 &&
                    <MythicStatusChip label={`${deletedCommandCount} Deleted`} status="deleted" />
                }
            </div>
            <TableContainer className="mythicElement" style={{height: "100%"}}>
            <Table size="small" stickyHeader={true} aria-label="details"
                   style={{"tableLayout": "fixed", "overflowWrap": "break-word", overflowY:"auto", width: "100%", height: "100%"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "24%"}}>Command</TableCell>
                        <TableCell style={{width: "6rem"}}>Version</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell style={{width: "6.5rem"}}>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {
                        commands.map((param) => (
                            <TableRow key={"command" + param.id} hover style={{backgroundColor: param.deleted? theme.palette.action.disabledBackground : ''}}>
                                <TableCell>
                                    <Typography className="mythic-parameter-title" style={{textDecoration: param.deleted ? 'line-through' : ''}}>
                                        {param.cmd}
                                    </Typography>
                                    <div className="mythic-status-stack" style={{marginTop: "0.35rem"}}>
                                        {param.needs_admin &&
                                            <MythicStatusChip label="Needs Admin" status="warning" />
                                        }
                                        {param.deleted &&
                                            <MythicStatusChip label="Deleted" status="deleted" />
                                        }
                                    </div>
                                </TableCell>
                                <TableCell>{param.version}</TableCell>
                                <TableCell>{param.description}</TableCell>
                                <TableCell>
                                    <div className="mythic-table-row-actions mythic-table-row-actions-nowrap">
                                        <MythicStyledTooltip title="Documentation">
                                            <IconButton
                                                className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                                                href={service.wrapper ? "/docs/wrappers/" + service.name : "/docs/agents/" + service.name}
                                                target="_blank"
                                                size="small">
                                                <MenuBookIcon fontSize="small" />
                                            </IconButton>
                                        </MythicStyledTooltip>
                                        <MythicStyledTooltip title="Scripting parameters">
                                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" onClick={(e) => onClickOpenScriptDialog(e, param)} size="small">
                                                <PlayCircleFilledTwoToneIcon fontSize="small" />
                                            </IconButton>
                                        </MythicStyledTooltip>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    }
                </TableBody>
            </Table>
            </TableContainer>
            </MythicDialogSection>
            </MythicDialogBody>
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
        <MythicDialogFooter>
            <MythicDialogButton onClick={onClose}>
            Close
          </MythicDialogButton>
        </MythicDialogFooter>
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
    const {loading, error} = useQuery(GET_CommandParameters, {
        variables: {command_id: command_id},
        onCompleted: data => {
            const grouped = data.commandparameters.reduce( (prev, cur) => {
                const groupName = cur.parameter_group_name || "Default";
                if(prev[groupName] === undefined){
                    prev[groupName] = [cur];
                    return prev;
                }
                prev[groupName].push(cur);
                return prev;
            }, {});
            const groupedArray = Object.keys(grouped).sort((a, b) => a.localeCompare(b)).map((key) => {
                return grouped[key].sort((a, b) => a.ui_position < b.ui_position ? -1 : 1);
            });
            setParams(groupedArray);
        }
    });
    if (loading) {
        return (
            <>
                <DialogTitle id="form-dialog-title">{command_name}'s Parameters</DialogTitle>
                <DialogContent dividers={true}>
                    <MythicLoadingState title="Loading command parameters" description="Fetching scripting metadata for this command." minHeight={180} />
                </DialogContent>
            </>
        );
    }
    if (error) {
        return (
            <>
                <DialogTitle id="form-dialog-title">{command_name}'s Parameters</DialogTitle>
                <DialogContent dividers={true}>
                    <MythicErrorState title="Unable to load command parameters" description={error.message} minHeight={180} />
                </DialogContent>
            </>
        );
    }
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">{command_name}'s Parameters</DialogTitle>
            <DialogContent dividers={true}>
                <MythicDialogBody compact>
                    {params.length === 0 ? (
                        <MythicDialogSection title="No Parameters" description="This command does not define scripting parameters." />
                    ) : (
                        params.map( (paramGroup) => {
                            const parameterGroupName = paramGroup[0].parameter_group_name || "Default";
                            return (
                                <MythicDialogSection
                                    key={parameterGroupName}
                                    title={`Parameter Group: ${parameterGroupName}`}
                                    description={`${paramGroup.length} parameter${paramGroup.length === 1 ? "" : "s"} in this group.`}
                                >
                                    <div className="mythic-parameter-list">
                                        {paramGroup.map((param) => (
                                            <ScriptingParameterCard key={param.id} commandName={command_name} param={param} />
                                        ))}
                                    </div>
                                </MythicDialogSection>
                            );
                        })
                    )}
                </MythicDialogBody>
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={onClose}>
                    Close
                </MythicDialogButton>
            </MythicDialogFooter>
        </React.Fragment>
    )
}

const ScriptingParameterCard = ({commandName, param}) => {
    const choices = param.choices || [];
    return (
        <div className="mythic-parameter-card">
            <div className="mythic-parameter-card-header">
                <div>
                    <div className="mythic-parameter-title">{param.name}</div>
                    <div className="mythic-parameter-description">
                        {param.description || "No description provided."}
                    </div>
                </div>
                <div className="mythic-status-stack">
                    <MythicStatusChip label={param.type} status="neutral" showIcon={false} />
                    {param.required &&
                        <MythicStatusChip label="Required" status="warning" />
                    }
                </div>
            </div>
            <div className="mythic-metadata-grid">
                <ParameterMetadataItem label="Value Type" value={param.type} />
                <ParameterMetadataItem label="Default Value" value={param.default_value} code />
                {param.display_name &&
                    <ParameterMetadataItem label="Display Name" value={param.display_name} />
                }
                {param.cli_name &&
                    <ParameterMetadataItem label="CLI Name" value={param.cli_name} code />
                }
                {param.verifier_regex &&
                    <ParameterMetadataItem label="Verifier Regex" value={param.verifier_regex} code />
                }
                {choices.length > 0 &&
                    <ParameterMetadataItem label="Choices" value={choices.join(", ")} code />
                }
            </div>
            <ScriptingParameterNotes commandName={commandName} param={param} />
        </div>
    );
};

const ScriptingParameterNotes = ({commandName, param}) => {
    const choices = param.choices || [];
    const typedArrayChoice = choices.length > 0 ? choices[0] : "type";
    const supportedAgents = param.supported_agents || [];
    const supportedBuildParameters = param.supported_agent_build_parameters || {};
    const credentialTypes = param.limit_credentials_by_type || [];
    return (
        <div className="mythic-parameter-notes">
            {param.choices_are_all_commands &&
                <div className="mythic-parameter-note"><strong>Command Choice:</strong> Provide any command name.</div>
            }
            {param.choices_are_loaded_commands &&
                <div className="mythic-parameter-note"><strong>Loaded Command Choice:</strong> Provide any command name currently loaded into the callback.</div>
            }
            {param.dynamic_query_function &&
                <div className="mythic-parameter-note">
                    <strong>Dynamic Choices:</strong> Use this mutation to generate the same choices outside the UI.
                    <ParameterCodeBlock>{getDynamicQueryParamsString}</ParameterCodeBlock>
                </div>
            }
            {param.type === "File" &&
                <div className="mythic-parameter-note">
                    <strong>File Value:</strong> Upload the file first, then provide the returned AgentFileID.
                    <ParameterCodeBlock>{exampleUploadFile(commandName, param.name)}</ParameterCodeBlock>
                </div>
            }
            {param.type === "TypedArray" &&
                <div className="mythic-parameter-note">
                    <strong>Typed Array:</strong> Provide nested arrays with a type identifier and value.
                    <ParameterCodeBlock>{`[ ["${typedArrayChoice}", "test"], ["${typedArrayChoice}", "values"] ]`}</ParameterCodeBlock>
                </div>
            }
            {param.type === "AgentConnect" &&
                <div className="mythic-parameter-note">
                    <strong>Agent Connect:</strong> Provide the connection target and C2 profile parameters as a dictionary.
                    <ParameterCodeBlock>{exampleAgentConnect}</ParameterCodeBlock>
                </div>
            }
            {param.type === "LinkInfo" &&
                <div className="mythic-parameter-note">
                    <strong>Link Info:</strong> Provide the existing P2P link information as a dictionary.
                    <ParameterCodeBlock>{exampleAgentConnect}</ParameterCodeBlock>
                </div>
            }
            {param.type === "PayloadList" &&
                <>
                    <div className="mythic-parameter-note">
                        <strong>Payload Value:</strong> The submitted value is the selected payload UUID.
                    </div>
                    {supportedAgents.length > 0 &&
                        <div className="mythic-parameter-note">
                            <strong>Supported Agents:</strong> {supportedAgents.join(", ")}
                        </div>
                    }
                    {Object.keys(supportedBuildParameters).length > 0 &&
                        <div className="mythic-parameter-note">
                            <strong>Required Build Parameter Values:</strong>
                            <ParameterCodeBlock>{JSON.stringify(supportedBuildParameters, null, 2)}</ParameterCodeBlock>
                        </div>
                    }
                </>
            }
            {param.type === "CredentialJson" &&
                <>
                    <div className="mythic-parameter-note">
                        <strong>Credential JSON:</strong> Provide the full credential JSON value.
                        <ParameterCodeBlock>{exampleCredentialJson}</ParameterCodeBlock>
                    </div>
                    {credentialTypes.length > 0 &&
                        <div className="mythic-parameter-note">
                            <strong>Allowed Credential Types:</strong> {formatParameterValue(credentialTypes)}
                        </div>
                    }
                </>
            }
        </div>
    );
};
