import React from 'react';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import {C2ProfileBuildDialog} from './C2ProfileBuildDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import WifiIcon from '@mui/icons-material/Wifi';
import ButtonGroup from '@mui/material/ButtonGroup';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import {useMutation, gql} from '@apollo/client';
import {C2ProfileOutputDialog} from './C2ProfileOutputDialog';
import {C2ProfileConfigDialog} from './C2ProfileConfigDialog';
import {C2ProfileStartStopOutputDialog} from './C2ProfileStartStopOutputDialog';
import {snackActions} from '../../utilities/Snackbar';
import {useTheme} from '@mui/material/styles';
import {C2ProfileSavedInstancesDialog} from './C2ProfileSavedInstancesDialog';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';
import {C2ProfileListFilesDialog} from './C2ProfileListFilesDialog';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import IconButton from '@mui/material/IconButton';
import BuildIcon from '@mui/icons-material/Build';
import SaveIcon from '@mui/icons-material/Save';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import TableRow from '@mui/material/TableRow';
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";


const toggleDeleteStatus = gql`
mutation toggleC2ProfileDeleteStatus($c2profile_id: Int!, $deleted: Boolean!){
  update_c2profile_by_pk(pk_columns: {id: $c2profile_id}, _set: {deleted: $deleted}) {
    id
  }
}
`;
const startStopProfileMutation = gql`
mutation StartStopProfile($id: Int!, $action: String) {
  startStopProfile(id: $id, action: $action) {
    status
    error
    output
  }
}
`;
const setProfileConfigMutation = gql`
mutation setProfileConfiguration($container_name: String!, $file_path: String!, $data: String!) {
  containerWriteFile(container_name: $container_name, file_path: $file_path, data: $data) {
    status
    error
    filename
  }
}
`;

export function C2ProfilesRow({service, showDeleted}) {
    const theme = useTheme();
    const [openBuildingDialog, setOpenBuildingDialog] = React.useState(false);
    const [openListFilesDialog, setOpenListFilesDialog] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const dropdownAnchorRef = React.useRef(null);
    const handleDropdownToggle = () => {
        setDropdownOpen((prevOpen) => !prevOpen);
    };
    const handleDropdownClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
            return;
        }

        setDropdownOpen(false);
    };
    const [alreadyRunningStartStop, setAlreadyRunningStartStop] = React.useState(false);
    const [startStopProfile] = useMutation(startStopProfileMutation, {
        onError: data => {
            console.error(data);
        },
        onCompleted: data => {
            setAlreadyRunningStartStop(false);
            if(data.startStopProfile.output.length === 0){
                snackActions.info("No output from container");
                return;
            }
            setOutput(data.startStopProfile.output);
            setOpenProfileStartStopDialog(true);

        }
    });
    const onStartStopProfile = () => {
        setAlreadyRunningStartStop(true);
        if(service.running){
            snackActions.info("Submitting stop task. Waiting 3s for output ..." );
        }else{
            snackActions.info("Submitting start task. Waiting 3s for output ..." );
        }
        startStopProfile({variables: {id: service.id, action: service.running ? "stop" : "start"}});
    }
    const [openProfileDialog, setOpenProfileDialog] = React.useState(false);
    const [openProfileConfigDialog, setOpenProfileConfigDialog] = React.useState(false);
    const [output, setOutput] = React.useState("");
    const [openProfileStartStopDialog, setOpenProfileStartStopDialog] = React.useState(false);
    const [openProfileSavedInstancesDialog, setOpenProfileSavedInstancesDialog] = React.useState(false);
    const [configSubmit] = useMutation(setProfileConfigMutation, {
        update: (cache, {data}) => {

        },
        onError: data => {
            console.error(data);
        },
        onCompleted: data => {
            //console.log(data);
            if(data.containerWriteFile.status === "success"){
                snackActions.success("Updated file");
            }else{
                snackActions.error("Error updating: " + data.containerWriteFile.error );
            }
        }
    });
    const onConfigSubmit = (content) => {
        //console.log(content)
        configSubmit({variables: {container_name: service.name, file_path: "config.json", data: content}});
    }
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const [updateDeleted] = useMutation(toggleDeleteStatus, {
        onCompleted: data => {
        },
        onError: error => {
            if(service.deleted){
                snackActions.error("Failed to restore c2 profile");
            } else {
                snackActions.error("Failed to mark c2 profile as deleted");
            }

        }
    });
    const onAcceptDelete = () => {
        updateDeleted({variables: {c2profile_id: service.id, deleted: !service.deleted}})
        setOpenDeleteDialog(false);
    }
    if(service.deleted && !showDeleted){
        return null;
    }
    return (
        <>
            <TableRow hover>
                <MythicTableCell>
                    {service.deleted ? (
                        <IconButton onClick={()=>{setOpenDeleteDialog(true);}} color="success" size="small">
                            <RestoreFromTrashOutlinedIcon/>
                        </IconButton>
                    ) : (
                        <IconButton onClick={()=>{setOpenDeleteDialog(true);}} color="error" size="small">
                            <DeleteIcon/>
                        </IconButton>
                    )}
                </MythicTableCell>
                <MythicTableCell>
                    {service.is_p2p ?
                        (<FontAwesomeIcon icon={faLink}  style={{width: "80px", height: "80px", padding: "10px"}} />)
                        :
                        (<WifiIcon style={{width: "80px", height: "80px", padding: "10px"}}/>)
                    }
                </MythicTableCell>
                <MythicTableCell>
                    {service.name}
                </MythicTableCell>
                <MythicTableCell>{service.is_p2p ? "P2P" : "Egress"}</MythicTableCell>
                <MythicTableCell>
                    <Typography variant="body1" component="p">
                        <b>Author:</b> {service.author}
                    </Typography>
                    <Typography variant="body1" component="p">
                        <b>Supported Agents:</b> {service.payloadtypec2profiles.filter( (pt) => !pt.payloadtype.deleted ).map(c => c.payloadtype.name).join(", ")}
                    </Typography>
                    <Typography variant="body2" component="p" style={{whiteSpace: "pre-wrap"}}>
                        <b>Description: </b>{service.description}
                    </Typography>
                </MythicTableCell>
                <MythicTableCell>
                    <Typography variant="body2" component="p" >
                        <b>Container Status: </b>
                    </Typography>
                    <Typography variant="body2" component="p" color={service.container_running ? theme.palette.success.main : theme.palette.error.main} >
                        <b>{service.container_running ? "Online" : "Offline"}</b>
                    </Typography>
                    {!service.is_p2p && service.running &&
                        <React.Fragment>
                            <Typography variant="body2" component="p" >
                                <b>C2 Server Status: </b>
                            </Typography>
                            <Typography variant="body2" component="p" style={{ color:theme.palette.success.main}}>
                                <b>{"Accepting Connections"}</b>
                            </Typography>
                        </React.Fragment>
                    }
                    {!service.is_p2p && !service.running &&
                        <React.Fragment>
                            <Typography variant="body2" component="p" >
                                <b>C2 Server Status: </b>
                            </Typography>
                            <Typography variant="body2" component="p" style={{color:theme.palette.error.main}}>
                                <b>{"Not Accepting Connections"}</b>
                            </Typography>
                        </React.Fragment>
                    }
                </MythicTableCell>
                <MythicTableCell>
                    {service.container_running ? (
                        service.running ?
                            (
                                <ButtonGroup ref={dropdownAnchorRef} aria-label="split button" >
                                    <Button size="small"
                                            disabled={alreadyRunningStartStop}
                                            onClick={onStartStopProfile}
                                            style={{width: "100%"}}>
                                        {alreadyRunningStartStop ? "Waiting..." : "Stop Profile"}
                                    </Button>
                                    <Button
                                        size="small"
                                        disabled={alreadyRunningStartStop}
                                        aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                                        aria-expanded={dropdownOpen ? 'true' : undefined}
                                        aria-label="select merge strategy"
                                        aria-haspopup="menu"
                                        onClick={handleDropdownToggle}
                                    >
                                        <ArrowDropDownIcon />
                                    </Button>
                                </ButtonGroup>
                            )
                            :
                            (
                                service.is_p2p ? null : (
                                    <ButtonGroup size="small" ref={dropdownAnchorRef} aria-label="split button"  >
                                        <Button size="small"
                                                disabled={alreadyRunningStartStop}
                                                onClick={onStartStopProfile}
                                                style={{width: "100%"}}>
                                            {alreadyRunningStartStop ? "Waiting..." : "Start Profile"}
                                        </Button>
                                        <Button
                                            size="small"
                                                disabled={alreadyRunningStartStop}
                                            aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                                            aria-expanded={dropdownOpen ? 'true' : undefined}
                                            aria-label="select merge strategy"
                                            aria-haspopup="menu"
                                            onClick={handleDropdownToggle}
                                        >
                                            <ArrowDropDownIcon />
                                        </Button>
                                    </ButtonGroup>
                                )

                            )
                    ) : null}
                    <br/>
                    <MythicStyledTooltip title={"Documentation"}>
                        <IconButton
                            color={"secondary"}
                            href={"/docs/c2-profiles/" + service.name.toLowerCase()}
                            target="_blank"
                            size="medium">
                            <MenuBookIcon />
                        </IconButton>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={"Build Parameters"}>
                        <IconButton
                            color={"secondary"}
                            onClick={()=>{setOpenBuildingDialog(true);}}
                            size="medium">
                            <BuildIcon />
                        </IconButton>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={"Save/Edit Instances for Building"}>
                        <IconButton
                            onClick={() => {setOpenProfileSavedInstancesDialog(true);}}
                            color={"secondary"}
                            size="medium">
                            <SaveIcon />
                        </IconButton>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={service.container_running ? "View Files" : "Unable to view files because container is offline"}>
                        <IconButton
                            color={"secondary"}
                            disabled={!service.container_running}
                            onClick={()=>{setOpenListFilesDialog(true);}}
                            size="medium">
                            <AttachFileIcon />
                        </IconButton>
                    </MythicStyledTooltip>

                    <Popper open={dropdownOpen} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal style={{zIndex: 4}}>
                        {({ TransitionProps, placement }) => (
                            <Grow
                                {...TransitionProps}
                                style={{
                                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                                }}
                            >
                                <Paper className={"dropdownMenuColored"}>
                                    <ClickAwayListener onClickAway={handleDropdownClose} mouseEvent={"onMouseDown"}>
                                        <MenuList id="split-button-menu">
                                            <MenuItem key={"dropdownprofile" + service.id + "menu1"} onClick={()=>{setOpenProfileConfigDialog(true);}}>View/Edit Config</MenuItem>
                                            {
                                                service.running ?
                                                    (<MenuItem key={"dropdownprofile" + service.id + "menu2"} onClick={()=>{setOpenProfileDialog(true);}}>View Stdout/Stderr</MenuItem>) : null
                                            }
                                        </MenuList>

                                    </ClickAwayListener>
                                </Paper>
                            </Grow>
                        )}
                    </Popper>
                </MythicTableCell>
                {openBuildingDialog &&
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openBuildingDialog}
                                  onClose={()=>{setOpenBuildingDialog(false);}}
                                  innerDialog={<C2ProfileBuildDialog {...service} onClose={()=>{setOpenBuildingDialog(false);}}
                                                                     container_name={service.name} />}
                    />
                }
                {openProfileStartStopDialog &&
                    <MythicDialog fullWidth={true} maxWidth="xl" open={openProfileStartStopDialog}
                                  onClose={()=>{setOpenProfileStartStopDialog(false);}}
                                  innerDialog={<C2ProfileStartStopOutputDialog output={output}
                                                                               onClose={()=>{setOpenProfileStartStopDialog(false);}}
                                                                               container_name={service.name} />}
                    />
                }
                {openDelete &&
                    <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete}
                                         open={openDelete}
                                         acceptText={service.deleted ? "Restore" : "Remove"}
                                         acceptColor={service.deleted ? "success": "error"} />
                }
                {openProfileDialog &&
                    <MythicDialog fullWidth={true} maxWidth="xl"  open={openProfileDialog}
                                  onClose={()=>{setOpenProfileDialog(false);}}
                                  innerDialog={<C2ProfileOutputDialog {...service}  container_name={service.name}
                                                                      onClose={()=>{setOpenProfileDialog(false);}}
                                                                      profile_id={service.id} />}
                    />
                }
                {openProfileConfigDialog &&
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openProfileConfigDialog}
                                  onClose={()=>{setOpenProfileConfigDialog(false);}}
                                  innerDialog={<C2ProfileConfigDialog filename={"config.json"}
                                                                      onConfigSubmit={onConfigSubmit}
                                                                      container_name={service.name}
                                                                      onClose={()=>{setOpenProfileConfigDialog(false);}}
                                                                      profile_id={service.id} />}
                    />
                }
                {openProfileSavedInstancesDialog &&
                    <MythicDialog fullWidth={true} maxWidth="xl" open={openProfileSavedInstancesDialog}
                                  onClose={()=>{setOpenProfileSavedInstancesDialog(false);}}
                                  innerDialog={<C2ProfileSavedInstancesDialog {...service}
                                                                              onClose={()=>{setOpenProfileSavedInstancesDialog(false);}} />}
                    />
                }
                {openListFilesDialog &&
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openListFilesDialog}
                                  onClose={()=>{setOpenListFilesDialog(false);}}
                                  innerDialog={<C2ProfileListFilesDialog container_name={service.name} {...service} onClose={()=>{setOpenListFilesDialog(false);}} />}
                    />
                }
            </TableRow>
        </>

    );
}