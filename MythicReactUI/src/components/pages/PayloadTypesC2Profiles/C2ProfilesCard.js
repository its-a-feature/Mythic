import React from 'react';
import { styled } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
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

const PREFIX = 'C2ProfilesCard';

const classes = {
  root: `${PREFIX}-root`,
  cardContent: `${PREFIX}-cardContent`
};

const StyledCard = styled(Card)((
  {
    theme
  }
) => ({
  [`&.${classes.root}`]: {
    width: "100%",
    display: "flex",
    marginBottom: "10px"
  },

  [`& .${classes.cardContent}`]: {
      textAlign: "left",
      paddingBottom: "5px",
      paddingTop: "0",
  }
}));

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
mutation setProfileConfiguration($id: Int!, $file_path: String!, $data: String!) {
  uploadContainerFile(id: $id, file_path: $file_path, data: $data) {
    status
    error
    filename
  }
}
`;

export function C2ProfilesCard(props) {
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
  const [startStopProfile] = useMutation(startStopProfileMutation, {
        update: (cache, {data}) => {
            
        },
        onError: data => {
            console.error(data);
        },
        onCompleted: data => {
            setOutput(data.startStopProfile.output);
            setOpenProfileStartStopDialog(true);
        }
    });
    const onStartStopProfile = () => {
        if(props.running){
            snackActions.info("Submitting stop task. Waiting 3s for output ..." );
        }else{
            snackActions.info("Submitting start task. Waiting 3s for output ..." );
        }  
        startStopProfile({variables: {id: props.id, action: props.running ? "stop" : "start"}});
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
            if(data.uploadContainerFile.status === "success"){
                snackActions.success("Updated file");
            }else{
                snackActions.error("Error updating: " + data.uploadContainerFile.error );
            }
        }
    });
    const onConfigSubmit = (content) => {
      //console.log(content)
      configSubmit({variables: {id: props.id, file_path: "config.json", data: content}});
    }
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const [updateDeleted] = useMutation(toggleDeleteStatus, {
      onCompleted: data => {
      },
      onError: error => {
        if(props.deleted){
          snackActions.error("Failed to restore c2 profile");
        } else {
          snackActions.error("Failed to mark c2 profile as deleted");
        }
        
      }
    });
    const onAcceptDelete = () => {
      updateDeleted({variables: {c2profile_id: props.id, deleted: !props.deleted}})
      setOpenDeleteDialog(false);
    }

  return (
    <StyledCard className={classes.root} elevation={5} style={{maxWidth: "100%"}}>
            {props.is_p2p ? 
            (<FontAwesomeIcon icon={faLink}  style={{width: "100px", height: "100px", marginTop: "25px"}} />)
            : 
            (<WifiIcon style={{width: "100px", height: "100px", marginTop: "25px"}}/>)
            }
        <div style={{maxWidth: "60%"}}>
          <Typography variant="h4" component="h1" style={{textAlign:"left", marginLeft: "10px", display: "inline-block"}}>{props.name}</Typography>
          <CardContent className={classes.cardContent}>
              <Typography variant="body1" component="p">
                <b>Author:</b> {props.author}
              </Typography>
              <Typography variant="body1" component="p">
                <b>Supported Agents:</b> {props.payloadtypec2profiles.filter( (pt) => !pt.payloadtype.deleted ).map(c => c.payloadtype.name).join(", ")}
              </Typography>
              <Typography variant="body2" component="p">
                <b>Description: </b>{props.description}
              </Typography>
              <Typography variant="body2" component="p" >
                <b>Container Status: </b>
              </Typography>
              <Typography variant="body2" component="p" color={props.container_running ? theme.palette.success.main : theme.palette.error.main} >
                <b>{props.container_running ? "Online" : "Offline"}</b>
              </Typography>
              {!props.is_p2p && props.running &&
              <React.Fragment>
                <Typography variant="body2" component="p" >
                  <b>C2 Server Status: </b>
                </Typography>
                <Typography variant="body2" component="p" style={{ color:theme.palette.success.main}}>
                  <b>{"Accepting Connections"}</b>
                </Typography>
              </React.Fragment>
              }
              {!props.is_p2p && !props.running &&
                <React.Fragment>
                  <Typography variant="body2" component="p" >
                    <b>C2 Server Status: </b>
                  </Typography>
                  <Typography variant="body2" component="p" style={{color:theme.palette.error.main}}>
                    <b>{"Not Accepting Connection"}</b>
                  </Typography>
                </React.Fragment>
              }
              <div >
                  {props.container_running ? (
                      props.running ?
                          (
                              <ButtonGroup variant="contained" color={"secondary"} ref={dropdownAnchorRef} aria-label="split button" >
                                  <Button size="small" color={props.running ? "success" : "error"} onClick={onStartStopProfile} style={{width: "100%"}}>Stop Profile</Button>
                                  <Button
                                      size="small"
                                      aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                                      aria-expanded={dropdownOpen ? 'true' : undefined}
                                      aria-label="select merge strategy"
                                      aria-haspopup="menu"
                                      color={props.running ? "success" : "error"}
                                      onClick={handleDropdownToggle}
                                  >
                                      <ArrowDropDownIcon />
                                  </Button>
                              </ButtonGroup>
                          )
                          :
                          (
                              props.is_p2p ? (
                                  null
                              ) : (
                                  <ButtonGroup size="small" variant="contained" ref={dropdownAnchorRef} aria-label="split button" color={props.running ? "success" : "error"} >
                                      <Button size="small" onClick={onStartStopProfile} color={props.running ? "success" : "error"} style={{width: "100%"}}>Start Profile</Button>
                                      <Button
                                          size="small"
                                          aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                                          aria-expanded={dropdownOpen ? 'true' : undefined}
                                          aria-label="select merge strategy"
                                          aria-haspopup="menu"
                                          color={props.running ? "success" : "error"}
                                          onClick={handleDropdownToggle}
                                      >
                                          <ArrowDropDownIcon />
                                      </Button>
                                  </ButtonGroup>
                              )

                          )
                  ) : (
                      <Button disabled color="secondary">Container Offline</Button>
                  )}
              </div>
          </CardContent>
        </div>

            <div style={{
                display: "inline-flex",
                paddingRight: "10px",
                marginLeft: "auto",
                justifyContent: "space-evenly",
                flexDirection: "column",
                alignContent: "flex-end",
                backgroundColor: theme.palette.textBackgroundColor,
            }}>
                <IconButton
                  color={"secondary"}
                  href={"/docs/c2-profiles/" + props.name.toLowerCase()}
                  target="_blank"
                  size="large">
                  <MenuBookIcon />
                </IconButton>
                <IconButton
                  color={"secondary"}
                  onClick={()=>{setOpenBuildingDialog(true);}}
                  size="large">
                    <BuildIcon />
                </IconButton>
                {openBuildingDialog &&
                  <MythicDialog fullWidth={true} maxWidth="lg" open={openBuildingDialog}
                    onClose={()=>{setOpenBuildingDialog(false);}}
                    innerDialog={<C2ProfileBuildDialog {...props} onClose={()=>{setOpenBuildingDialog(false);}} payload_name={props.name} />}
                />
                }
                {openProfileStartStopDialog &&
                  <MythicDialog fullWidth={true} maxWidth="lg" open={openProfileStartStopDialog}
                    onClose={()=>{setOpenProfileStartStopDialog(false);}}
                    innerDialog={<C2ProfileStartStopOutputDialog output={output} onClose={()=>{setOpenProfileStartStopDialog(false);}} payload_name={props.name} />}
                />
                }

                 <IconButton
                   onClick={() => {setOpenProfileSavedInstancesDialog(true);}}
                   color={"success"}
                   size="large">
                     <SaveIcon />
                 </IconButton>
                 {props.deleted ? (
                  <IconButton onClick={()=>{setOpenDeleteDialog(true);}} color="success" size="large">
                      <RestoreFromTrashOutlinedIcon/>
                  </IconButton>
                ) : (
                  <IconButton onClick={()=>{setOpenDeleteDialog(true);}} color="error" size="large">
                      <DeleteIcon/>
                  </IconButton>
                )}
                {props.container_running &&
                  <IconButton
                    color={"secondary"}
                    onClick={()=>{setOpenListFilesDialog(true);}}
                    size="large">
                      <AttachFileIcon />
                  </IconButton>
                }
                {openDelete &&
                  <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete}
                    open={openDelete}
                    acceptText={props.deleted ? "Restore" : "Remove"}
                    acceptColor={props.deleted ? "success": "error"} />
                }
                 {openProfileDialog &&
                  <MythicDialog fullWidth={true} maxWidth="lg" open={openProfileDialog}
                    onClose={()=>{setOpenProfileDialog(false);}}
                    innerDialog={<C2ProfileOutputDialog {...props}  payload_name={props.name} onClose={()=>{setOpenProfileDialog(false);}} profile_id={props.id} />}
                  />
                 }
                {openProfileConfigDialog &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openProfileConfigDialog}
                  onClose={()=>{setOpenProfileConfigDialog(false);}}
                  innerDialog={<C2ProfileConfigDialog filename={"config.json"} onConfigSubmit={onConfigSubmit} payload_name={props.name} onClose={()=>{setOpenProfileConfigDialog(false);}} profile_id={props.id} />}
                />
                }
                {openProfileSavedInstancesDialog &&
                  <MythicDialog fullWidth={true} maxWidth="xl" open={openProfileSavedInstancesDialog}
                    onClose={()=>{setOpenProfileSavedInstancesDialog(false);}}
                    innerDialog={<C2ProfileSavedInstancesDialog {...props} onClose={()=>{setOpenProfileSavedInstancesDialog(false);}} />}
                />
                }
                {openListFilesDialog &&
                  <MythicDialog fullWidth={true} maxWidth="md" open={openListFilesDialog}
                    onClose={()=>{setOpenListFilesDialog(false);}}
                    innerDialog={<C2ProfileListFilesDialog {...props} onClose={()=>{setOpenListFilesDialog(false);}} />}
                />
                }
            </div>
            <Popper open={dropdownOpen} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal style={{zIndex: 4}}>
              {({ TransitionProps, placement }) => (
                <Grow
                  {...TransitionProps}
                  style={{
                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                  }}
                >
                  <Paper style={{backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light, color: "white"}}>
                    <ClickAwayListener onClickAway={handleDropdownClose}>
                      <MenuList id="split-button-menu">
                        <MenuItem key={"dropdownprofile" + props.id + "menu1"} onClick={()=>{setOpenProfileConfigDialog(true);}}>View/Edit Config</MenuItem>
                       {
                        props.running ? 
                        (<MenuItem key={"dropdownprofile" + props.id + "menu2"} onClick={()=>{setOpenProfileDialog(true);}}>View Stdout/Stderr</MenuItem>) : (null)
                       }
                      </MenuList>
                      
                    </ClickAwayListener>
                  </Paper>
                </Grow>
              )}
            </Popper>
    </StyledCard>
  );
}
