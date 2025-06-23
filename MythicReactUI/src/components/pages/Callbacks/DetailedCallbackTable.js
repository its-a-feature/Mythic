import React from 'react';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import {useQuery, gql, useMutation} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {ExpandedCallbackSideDetailsTable} from '../ExpandedCallback/ExpandedCallbackSideDetails';
import { toLocalTime } from '../../utilities/Time';
import {PayloadsTableRowBuildProcessPerStep} from '../Payloads/PayloadsTableRowBuildProgress';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import {b64DecodeUnicode} from './ResponseDisplay';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {AddRemoveCallbackCommandsDialog} from './AddRemoveCallbackCommandsDialog';
import { snackActions } from '../../utilities/Snackbar';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import {DetailedPayloadTable, ParseForDisplay} from "../Payloads/DetailedPayloadTable";
import {Button, Link, IconButton} from '@mui/material';
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import MenuBookIcon from '@mui/icons-material/MenuBook';
import InfoIconOutline from '@mui/icons-material/InfoOutlined';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {HostFileDialog} from "../Payloads/HostFileDialog";
import PublicIcon from '@mui/icons-material/Public';
import {payloadsCallbackAllowed} from "../Payloads/Payloads";
import Switch from '@mui/material/Switch';

const GET_Payload_Details = gql`
query GetCallbackDetails($callback_id: Int!) {
  callback_by_pk(id: $callback_id){
    tags {
        tagtype {
            name
            color
            id
          }
        id
      }
    payload {
      uuid
      id
      creation_time
      callback_allowed
      payloadtype{
          name
          agent_type
          id
      }
      filemetum {
        filename_text
        agent_file_id
        id
        md5
        sha1
      }
      operator {
        username
      }
      eventstepinstance{
        id
        eventgroupinstance {
            id
            eventgroup {
                id
                name
            }
        }
        eventstep {
            id
            name
        }
      }
      payload_build_steps(order_by: {step_number: asc}) {
        step_name
        step_number
        step_success
        step_stdout
        step_stderr
        step_skip
        step_description
        start_time
        end_time
        id
      }
      buildparameterinstances {
        value
        id
        enc_key_base64
        dec_key_base64
        buildparameter {
          description
          parameter_type
          id
        }
      }
      os
    }
    c2profileparametersinstances(order_by: {c2profile: {name: asc}}) {
      value
      c2profileparameter {
        description
        parameter_type
      }
      c2profile {
        name
      }
      enc_key_base64
      dec_key_base64
    }
    loadedcommands{
      id
      version
      command {
        cmd
        id
        version
        payloadtype {
            name
        }
      }
    }
    architecture
    enc_key_base64
    dec_key_base64
    crypto_type
    description
    domain
    external_ip
    host
    id
    display_id
    integrity_level
    last_checkin
    current_time
    ip
    locked
    locked_operator {
      username
    }
    extra_info
    sleep_info
    pid
    os
    user
    agent_callback_id
    operation_id
    process_name
    init_callback
    mythictree_groups
    cwd
    impersonation_context
  }
  
}
`;
const AddLoadedCommand = gql`
mutation addLoadedCommand($command_id: Int!, $callback_id: Int!){
  insert_loadedcommands_one(object: {callback_id: $callback_id, command_id: $command_id}){
    id
    command {
      cmd
    }
  }
}
`;
const RemoveLoadedCommand = gql`
mutation removeLoadedCommand($id: Int!){
  delete_loadedcommands_by_pk(id: $id){
    id
    command {
      cmd
    }
  }
}
`;
export function DetailedCallbackTable(props){
    const theme = useTheme();
    const me = useReactiveVar(meState);
    const [openHostDialog, setOpenHostDialog] = React.useState(false);
    const [openDetailedView, setOpenDetailedView] = React.useState(false);
    const [openAddRemoveCommandsDialog, setOpenAddRemoveCommandsDialog] = React.useState(false);
    const [commands, setCommands] = React.useState([]);
    const [buildParameters, setBuildParameters] = React.useState([]);
    const [c2Profiles, setC2Profiles] = React.useState([]);
    const [openProgressIndicator, setOpenProgressIndicator] = React.useState(false);
    const [addProgress, setAddProgress] = React.useState(0);
    const addTotal = React.useRef(0);
    const [removeProgress, setRemoveProgress] = React.useState(0);
    const removeTotal = React.useRef(0);
    const commandMods = React.useRef({"add": 0, 
                                      "remove": 0,
                                      "commandsToAdd": [],
                                      "commandsToRemove": []})
    const [addLoadedCommands] = useMutation(AddLoadedCommand, {
      onCompleted: data => {
        commandMods.current.add += 1;
        setAddProgress(commandMods.current.add);
        issueNextMod();
      },
      onError: error => {
        snackActions.error(error.message);
        commandMods.current.add += 1;
        issueNextMod();
      }
    })
    const [removeLoadedCommands] = useMutation(RemoveLoadedCommand, {
      onCompleted: data => {
        commandMods.current.remove += 1;
        setRemoveProgress(commandMods.current.remove);
        issueNextMod();
      },
      onError: error => {
        snackActions.error(error.message);
        issueNextMod();
      }
    })
    const [payloadCallbackAllowed, setPayloadCallbackAllowed] = React.useState(true);
    const issueNextMod = () => {
      if(commandMods.current.add >= addTotal.current){
        if(commandMods.current.remove >= removeTotal.current) {
          snackActions.success("Finished adjusting commands");
        } else {
          removeLoadedCommands({variables: {id: commandMods.current.commandsToRemove[commandMods.current.remove].id}})
        }
      } else {
        addLoadedCommands({variables: {callback_id: props.callback_id, command_id: commandMods.current.commandsToAdd[commandMods.current.add].id}})
        }
    }
    const addRemoveCommandsSubmit = ({commandsToAdd, commandsToRemove}) => {
      addTotal.current = commandsToAdd.length;
      removeTotal.current = commandsToRemove.length;
      commandMods.current.commandsToAdd = commandsToAdd
      commandMods.current.commandsToRemove = commandsToRemove
      if(commandsToAdd.length === 0 && commandsToRemove.length === 0){
        snackActions.info("Not adding or removing any commands")
      } else {
        setOpenProgressIndicator(true);
        issueNextMod();
      }
    }
    const normalizeAdd = (value) => ((value - 0) * 100) / (Math.max(addTotal.current - 0, 1));
    const normalizeRemove = (value) => ((value - 0) * 100) / (Math.max(removeTotal.current - 0, 1));
    const onCloseProgress = () => {
      setOpenProgressIndicator(false);
      setAddProgress(0);
      setRemoveProgress(0);
      commandMods.current.add = 0;
      commandMods.current.remove = 0;
      commandMods.current.commandsToAdd = [];
      commandMods.current.commandsToRemove = [];
    }
    const { loading, error, data } = useQuery(GET_Payload_Details, {
        fetchPolicy: "no-cache",
        variables: {callback_id: props.callback_id},
        onCompleted: data => {
            const commandState = data.callback_by_pk.loadedcommands.map( (c) => 
            { 
                return {cmd: c.command.cmd, mythic: c.command.version, payload: c.version, payload_type: c.command.payloadtype.name}
            }).sort((a,b) => (a.cmd > b.cmd) ? 1: ((b.cmd > a.cmd) ? -1 : 0));
            setCommands(commandState);
            const buildParametersState = data.callback_by_pk.payload.buildparameterinstances.map( (b) =>
            {
              return {description: b.buildparameter.description, 
                value: b.value, 
                parameter_type: b.buildparameter.parameter_type,
                enc_key: b.enc_key_base64,
                dec_key: b.dec_key_base64
              }
            }).sort((a,b) => (a.description > b.description) ? 1: ((b.description > a.description) ? -1 : 0));
            setBuildParameters(buildParametersState);
            const c2Profiles = data.callback_by_pk.c2profileparametersinstances.reduce( (prev, cur) => {
                if( !(cur.c2profile.name in prev) ){
                    return {...prev, [cur.c2profile.name]: [{description: cur.c2profileparameter.description, 
                      value: cur.value, 
                      enc_key: cur.enc_key_base64, 
                      dec_key: cur.dec_key_base64,
                      parameter_type: cur.c2profileparameter.parameter_type,
                    }]}
                }
                return {...prev, [cur.c2profile.name]: [...prev[cur.c2profile.name], {description: cur.c2profileparameter.description, 
                  value: cur.value, 
                  enc_key: cur.enc_key_base64, 
                  dec_key: cur.dec_key_base64,
                  parameter_type: cur.c2profileparameter.parameter_type,
                }]}
            }, {});
            const c2ProfilesState = Object.keys(c2Profiles).reduce( (prev, cur) => {
                return [...prev, {
                    c2_profile: cur,
                    parameters: c2Profiles[cur].sort((a,b) => (a.description > b.description) ? 1: ((b.description > a.description) ? -1 : 0))
                }];
            }, []);
            setC2Profiles(c2ProfilesState);
            setPayloadCallbackAllowed(data.callback_by_pk.payload.callback_allowed);
        }
        });
    const [toggleCallbackAllowedMutation] = useMutation(payloadsCallbackAllowed, {
        onCompleted: (data) => {
            if(data.updatePayload.status === "success"){
                setPayloadCallbackAllowed(data.updatePayload.callback_allowed);
                if(data.updatePayload.callback_allowed){
                    snackActions.success("New Callbacks allowed from this Payload");
                } else {
                    snackActions.warning("No new Callback allowed from this Payload");
                }
            } else {
                console.log(data.updatePayload);
            }
        },
        onError: (data) => {
            console.log(data);
        }
    });
    const onToggleCallbackAllowed = () => {
        toggleCallbackAllowedMutation({variables: {payload_uuid: data.callback_by_pk.payload.uuid, callback_allowed: !payloadCallbackAllowed}})
    }
    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}}/>;
    }
    if (error) {
     console.error(error);
     return <div>Error! {error.message}</div>;
    }
    return (
        <React.Fragment>
          <DialogTitle id="form-dialog-title">Callback Configuration</DialogTitle>
          <DialogContent dividers={true}>
          <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
              <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                  Callback Information
              </Typography>
            </Paper>
            <ExpandedCallbackSideDetailsTable {...data.callback_by_pk} />
                
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
              <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                  Payload Information
              </Typography>
            </Paper>
            <Table size="small" aria-label="details" style={{ "overflowWrap": "break-word"}}>
                <TableHead>
                  <TableRow hover>
                    <TableCell >Payload Info</TableCell>
                    <TableCell>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow hover>
                        <TableCell>Payload Type</TableCell>
                        <TableCell>{data.callback_by_pk.payload.payloadtype.name}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Selected OS</TableCell>
                        <TableCell>{data.callback_by_pk.payload.os}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>UUID</TableCell>
                        <TableCell>
                            {data.callback_by_pk.payload.uuid}
                            <IconButton disableFocusRipple={true}
                                        disableRipple={true} size="small" color="info" onClick={() => setOpenDetailedView(true)}>
                                <InfoIconOutline />
                            </IconButton>
                        </TableCell>
                        {openDetailedView ? (
                            <MythicDialog fullWidth={true} maxWidth="lg" open={openDetailedView}
                                          onClose={()=>{setOpenDetailedView(false);}}
                                          innerDialog={<DetailedPayloadTable {...props} payload_id={data.callback_by_pk.payload.id} onClose={()=>{setOpenDetailedView(false);}} />}
                            />
                        ) : null }
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Creation Time</TableCell>
                        <TableCell>{toLocalTime(data.callback_by_pk.payload.creation_time, me.user.view_utc_time)}</TableCell>
                    </TableRow>
                    { data.callback_by_pk.payload.filemetum ? (
                        <TableRow key={'filename_text'} hover>
                            <TableCell>Filename</TableCell>
                            <TableCell>{b64DecodeUnicode(data.callback_by_pk.payload.filemetum.filename_text)}</TableCell>
                        </TableRow>
                    ) : null }
                    <TableRow hover>
                        <TableCell>Download URL</TableCell>
                        <TableCell style={{display: "flex", alignItems: "center"}}>
                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" + data.callback_by_pk.payload.filemetum.agent_file_id}>
                                {window.location.origin + "/direct/download/" + data.callback_by_pk.payload.filemetum.agent_file_id}
                            </Link>
                            <MythicStyledTooltip title={"Host Payload Through C2"} >
                                <PublicIcon color={"info"} style={{marginLeft: "20px", cursor: "pointer"}} onClick={()=>{setOpenHostDialog(true);}}  />
                            </MythicStyledTooltip>
                            {openHostDialog &&
                                <MythicDialog fullWidth={true} maxWidth="md" open={openHostDialog}
                                              onClose={()=>{setOpenHostDialog(false);}}
                                              innerDialog={<HostFileDialog file_uuid={data.callback_by_pk.payload.filemetum.agent_file_id}
                                                                           file_name={b64DecodeUnicode(data.callback_by_pk.payload.filemetum.filename_text)}
                                                                           onClose={()=>{setOpenHostDialog(false);}} />}
                                />
                            }
                        </TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>SHA1</TableCell>
                        <TableCell>{data.callback_by_pk.payload.filemetum.sha1}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>MD5</TableCell>
                        <TableCell>{data.callback_by_pk.payload.filemetum.md5}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Created By</TableCell>
                        <TableCell>{data.callback_by_pk.payload?.operator?.username}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>New Callbacks Allowed?</TableCell>
                        <TableCell>
                            <Switch
                                checked={payloadCallbackAllowed}
                                onChange={onToggleCallbackAllowed}
                                color="info"
                                inputProps={{'aria-label': 'primary checkbox'}}
                                name="callback_allowed"
                            />
                        </TableCell>
                    </TableRow>
                    {data.callback_by_pk.payload?.eventstepinstance &&
                        <>
                            <TableRow hover>
                                <TableCell>Generated via Eventing</TableCell>
                                <TableCell>
                                    <Link color="textPrimary" underline="always"
                                          href={"/new/eventing?eventgroup=" +
                                              data.callback_by_pk.payload?.eventstepinstance?.eventgroupinstance?.eventgroup.id +
                                              "&eventgroupinstance=" +
                                              data.callback_by_pk.payload?.eventstepinstance?.eventgroupinstance?.id
                                          }>
                                        {data.callback_by_pk.payload?.eventstepinstance?.eventgroupinstance?.eventgroup?.name} -
                                        {data.callback_by_pk.payload?.eventstepinstance?.eventstep?.name}
                                    </Link>
                                </TableCell>
                            </TableRow>
                        </>
                    }
                </TableBody>
              </Table>
              <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                    Build Parameters
                </Typography>
              </Paper>
            <Table size="small" aria-label="details" style={{ "overflowWrap": "break-word"}}>
                <TableHead>
                  <TableRow>
                    <TableCell style={{width: "50%"}}>Parameter</TableCell>
                    <TableCell>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody style={{whiteSpace: "pre-line"}}>
                  {
                    buildParameters.map( (cmd, i) => (
                        <TableRow key={"buildprop" + i + "for" + data.callback_by_pk.payload.id} hover>
                            <TableCell>{cmd.description}</TableCell>
                            <TableCell>
                            {
                                cmd.parameter_type === "Dictionary" ? (
                                    JSON.stringify(JSON.parse(cmd.value), null, 2)
                                ) : (
                                  cmd.parameter_type === "Array" || cmd.parameter_type === "ChooseMultiple" ? (
                                    JSON.parse(cmd.value).map(c => c + "\n")
                                  ): (cmd.value)
                                )
                              }
                                  {cmd.enc_key === null ? null : (<React.Fragment>
                                    <br/><b>Encryption Key: </b> {cmd.enc_key}
                                  </React.Fragment>) }
                                {cmd.dec_key === null ? null : (<React.Fragment>
                                    <br/><b>Decryption Key: </b> {cmd.dec_key}
                                </React.Fragment>) }
                            </TableCell>
                        </TableRow>
                    ))
                    
                  }
                </TableBody>
              </Table>
              <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                    Build Steps
                </Typography>
              </Paper>
              <Table size="small" aria-label="details" style={{ "overflowWrap": "break-word"}}>
                <TableHead>
                  <TableRow>
                    <TableCell style={{width: "30%"}}>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody style={{whiteSpace: "pre-line"}}>
                  {
                    data.callback_by_pk.payload.payload_build_steps.map( (step, i) => (
                        <TableRow key={"buildstep" + i}>
                            <TableCell>{step.step_name}</TableCell>
                            <TableCell>{step.step_description}</TableCell>
                            <TableCell>
                              <PayloadsTableRowBuildProcessPerStep key={'buildstepicon' + i} 
                                payload_build_steps={data.callback_by_pk.payload.payload_build_steps} 
                                step_number={step.step_number} />
                            </TableCell>
                        </TableRow>
                    ))
                    
                  }
                </TableBody>
              </Table>
                { c2Profiles.map( (c2) => (
                    <React.Fragment key={"c2frag" + data.callback_by_pk.payload.id + c2.c2_profile}>
                          <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                            <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                                {c2.c2_profile}
                            </Typography>
                          </Paper>
                        <Table size="small" aria-label="details" style={{"overflowWrap": "break-word"}}>
                            <TableHead>
                              <TableRow>
                                <TableCell style={{width: "50%"}}>Parameter</TableCell>
                                <TableCell>Value</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody style={{whiteSpace: "pre-line"}}>
                              {
                                c2.parameters.map( (cmd, j) => (
                                    <TableRow key={"c2frag" + data.callback_by_pk.payload.id + c2.c2_profile + j} hover>
                                        <TableCell>{cmd.description}</TableCell>
                                        <TableCell>
                                            <ParseForDisplay cmd={cmd} />
                                            {cmd.enc_key === null ? null : (<React.Fragment>
                                                <br/><b>Encryption Key: </b> {cmd.enc_key}
                                              </React.Fragment>) }
                                            {cmd.dec_key === null ? null : (<React.Fragment>
                                                <br/><b>Decryption Key: </b> {cmd.dec_key}
                                            </React.Fragment>) }
                                        </TableCell>
                                    </TableRow>
                                ))
                              }
                            </TableBody>
                          </Table>
                      </React.Fragment>
                ))}
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
              <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                  Loaded Commands
                  
              </Typography>
              <Button style={{float: "right"}} variant="contained" size="small" onClick={()=>{setOpenAddRemoveCommandsDialog(true)}} >Add/Remove Commands</Button>
            </Paper>
            <Table size="small" aria-label="details" style={{"overflowWrap": "break-word"}}>
            <TableHead>
              <TableRow>
                <TableCell style={{width: "40px"}}>Payload</TableCell>
                <TableCell>Command Name</TableCell>
                <TableCell>Mythic Version</TableCell>
                <TableCell>Loaded Version</TableCell>
                <TableCell style={{width: "5rem"}}>Documentation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {
                commands.map( (cmd) => (
                    <TableRow key={cmd.cmd + cmd.payload_type} hover>
                        <TableCell>
                            <MythicAgentSVGIcon payload_type={cmd.payload_type} style={{width: "40px"}}/>
                        </TableCell>
                        <TableCell>{cmd.cmd} ({cmd.payload_type})</TableCell>
                        <TableCell>{cmd.mythic}</TableCell>
                        <TableCell>{cmd.payload}</TableCell>
                        <TableCell>
                          <IconButton variant="contained" target="_blank"
                             href={"/docs/agents/" + cmd.payload_type + "/commands/" + cmd.cmd}>
                              <MenuBookIcon />
                          </IconButton>
                        </TableCell>
                    </TableRow>
                ))
              }
              {openAddRemoveCommandsDialog &&
                  <MythicDialog fullWidth={true} maxWidth="md" open={openAddRemoveCommandsDialog} 
                      onClose={()=>{setOpenAddRemoveCommandsDialog(false);}} 
                      innerDialog={<AddRemoveCallbackCommandsDialog
                          callback_id={props.callback_id}
                        display_id={props.display_id} onClose={()=>{setOpenAddRemoveCommandsDialog(false);}} onSubmit={addRemoveCommandsSubmit} />}
                  />
                }
                {openProgressIndicator &&
                    <Dialog
                      open={openProgressIndicator}
                      onClose={onCloseProgress}
                      scroll="paper"
                      fullWidth={true}
                      aria-labelledby="scroll-dialog-title"
                      aria-describedby="scroll-dialog-description"
                    >
                        <DialogContent>
                          {addProgress === addTotal.current ? (
                            "Adding Commands - Complete!"
                          ) : (
                            "Adding Commands..."
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgress variant="determinate" value={normalizeAdd(addProgress)} valueBuffer={addProgress + 1} />
                            </Box>
                              <Typography  style={{width: "5rem"}} variant="body2" color="text.secondary">{addProgress} / {addTotal.current} </Typography>
                            </Box>
                          {removeProgress === removeTotal.current ? (
                            "Removing Commands - Complete!"
                          ) : (
                            "Removing Commands..."
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgress variant="determinate" value={normalizeRemove(removeProgress)} valueBuffer={removeProgress + 1} />
                            </Box>
                              <Typography style={{width: "5rem"}} variant="body2" color="text.secondary">{removeProgress} / {removeTotal.current} </Typography>
                          </Box>
                        </DialogContent>
                    </Dialog>
                    
                  }
            </TableBody>
          </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={props.onClose} variant="contained" color="primary">
              Close
            </Button>
        </DialogActions>
        </React.Fragment>
        )
}

