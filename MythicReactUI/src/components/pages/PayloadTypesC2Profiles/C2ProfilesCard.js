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
import {C2ProfileSavedInstancesDialog} from './C2ProfileSavedInstancesDialog';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';
import {C2ProfileListFilesDialog} from './C2ProfileListFilesDialog';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import IconButton from '@mui/material/IconButton';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import TableRow from '@mui/material/TableRow';
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import {C2ProfileStatusSummary} from "./InstalledServiceStatus";


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
                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-success" onClick={()=>{setOpenDeleteDialog(true);}} size="small">
                            <RestoreFromTrashOutlinedIcon fontSize="small" />
                        </IconButton>
                    ) : (
                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" onClick={()=>{setOpenDeleteDialog(true);}} size="small">
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    )}
                </MythicTableCell>
                <MythicTableCell>
                    {service.has_logo ? (
                        <>
                            <MythicAgentSVGIcon payload_type={service.name} is_p2p={service.is_p2p} style={{width: "80px", padding: "5px", objectFit: "unset"}} />
                        </>
                    ) : (
                        service.is_p2p ?
                            (<FontAwesomeIcon icon={faLink}  style={{width: "80px", height: "80px", padding: "10px"}} />)
                            :
                            (<WifiIcon style={{width: "80px", height: "80px", padding: "10px"}}/>)
                    )}

                </MythicTableCell>
                <MythicTableCell>
                    <div className="mythic-installed-service-identity">
                        <span className="mythic-installed-service-name">{service.name}</span>
                        <C2ProfileStatusSummary service={service} />
                    </div>
                </MythicTableCell>
                <MythicTableCell>{service.is_p2p ? "P2P" : "Egress"}</MythicTableCell>
                <MythicTableCell>
                    <Typography variant="body1" component="p">
                        <b>Author:</b> {service.author}
                    </Typography>
                    {service.semver !== "" &&
                        <Typography variant="body1" component="p">
                            <b>Version:</b> {service.semver}
                        </Typography>
                    }
                    <Typography variant="body1" component="p">
                        <b>Supported Agents:</b> {service.payloadtypec2profiles.filter( (pt) => !pt.payloadtype.deleted ).map(c => c.payloadtype.name).join(", ")}
                    </Typography>
                    <Typography variant="body2" component="p" style={{whiteSpace: "pre-wrap"}}>
                        <b>Description: </b>{service.description}
                    </Typography>
                </MythicTableCell>
                <MythicTableCell>
                    {service.container_running ? (
                        service.running ?
                            (
                                <ButtonGroup className="mythic-split-action-group" ref={dropdownAnchorRef} aria-label="split button" >
                                    <Button size="small"
                                            className="mythic-table-row-action mythic-table-row-action-danger"
                                            disabled={alreadyRunningStartStop}
                                            onClick={onStartStopProfile}
                                            style={{width: "100%"}}>
                                        {alreadyRunningStartStop ? "Waiting..." : "Stop Profile"}
                                    </Button>
                                    <Button
                                        size="small"
                                        className="mythic-table-row-icon-action mythic-table-row-icon-action-danger"
                                        disabled={alreadyRunningStartStop}
                                        aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                                        aria-expanded={dropdownOpen ? 'true' : undefined}
                                        aria-label="select merge strategy"
                                        aria-haspopup="menu"
                                        onClick={handleDropdownToggle}
                                    >
                                        <ArrowDropDownIcon fontSize="small" />
                                    </Button>
                                </ButtonGroup>
                            )
                            :
                            (
                                service.is_p2p ? null : (
                                    <ButtonGroup className="mythic-split-action-group" size="small" ref={dropdownAnchorRef} aria-label="split button"  >
                                        <Button size="small"
                                                className="mythic-table-row-action mythic-table-row-action-success"
                                                disabled={alreadyRunningStartStop}
                                                onClick={onStartStopProfile}
                                                style={{width: "100%"}}>
                                            {alreadyRunningStartStop ? "Waiting..." : "Start Profile"}
                                        </Button>
                                        <Button
                                            size="small"
                                            className="mythic-table-row-icon-action mythic-table-row-icon-action-success"
                                                disabled={alreadyRunningStartStop}
                                            aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                                            aria-expanded={dropdownOpen ? 'true' : undefined}
                                            aria-label="select merge strategy"
                                            aria-haspopup="menu"
                                            onClick={handleDropdownToggle}
                                        >
                                            <ArrowDropDownIcon fontSize="small" />
                                        </Button>
                                    </ButtonGroup>
                                )

                            )
                    ) : null}
                    <div className="mythic-table-row-actions" style={{marginTop: "0.4rem"}}>
                    <MythicStyledTooltip title={"Documentation"}>
                        <IconButton
                            className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                            href={"/docs/c2-profiles/" + service.name.toLowerCase()}
                            target="_blank"
                            size="small">
                            <MenuBookIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={"Build Parameters"}>
                        <IconButton
                            className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                            onClick={()=>{setOpenBuildingDialog(true);}}
                            size="small">
                            <TuneIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={"Save/Edit Instances for Building"}>
                        <IconButton
                            className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                            onClick={() => {setOpenProfileSavedInstancesDialog(true);}}
                            size="small">
                            <SaveIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={service.container_running ? "View Files" : "Unable to view files because container is offline"}>
                        <IconButton
                            className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                            disabled={!service.container_running}
                            onClick={()=>{setOpenListFilesDialog(true);}}
                            size="small">
                            <AttachFileIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                    </div>

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
