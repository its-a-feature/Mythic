import React from 'react';
import { makeStyles, withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Badge from '@material-ui/core/Badge';
import {C2ProfileBuildDialog} from './C2ProfileBuildDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import WifiIcon from '@material-ui/icons/Wifi';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Grow from '@material-ui/core/Grow';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import {useMutation, gql} from '@apollo/client';
import InsertLinkTwoToneIcon from '@material-ui/icons/InsertLinkTwoTone';
import {C2ProfileOutputDialog} from './C2ProfileOutputDialog';
import {C2ProfileConfigDialog} from './C2ProfileConfigDialog';
import {C2ProfileStartStopOutputDialog} from './C2ProfileStartStopOutputDialog';
import {snackActions} from '../../utilities/Snackbar';

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    display: "flex",
    margin: "10px"
  },
  expand: {
    transform: 'rotate(0deg)',
    marginLeft: 'auto',
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.shortest,
    }),
  },
  expandOpen: {
    transform: 'rotate(180deg)',
  },
  running: {
    backgroundColor: '#44b700',
    color: '#44b700',
  },
  notrunning: {
    backgroundColor: 'red',
    color: 'red',
  },
}));
const StyledAvatar = withStyles((theme) => ({
    badge: {
        boxShadow: "0 0 0 2px white",
        '&::after': {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          animation: '$ripple 1.2s infinite ease-in-out',
          border: '1px solid currentColor',
          content:'""'
        },
      },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}))(Badge);
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
  const classes = useStyles();
  let date = new Date();
  let now = date.getTime() + date.getTimezoneOffset() * 60000;
  let heartbeat = new Date(props.last_heartbeat);
  let difference = (now - heartbeat.getTime()) / 1000;
  const running = difference < 30 ? 'running' : 'notrunning';
  const [openBuildingDialog, setOpenBuildingDialog] = React.useState(false);
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
            snackActions.info("Submitting stop task..." );
        }else{
            snackActions.info("Submitting start task..." );
        }  
        startStopProfile({variables: {id: props.id, action: props.running ? "stop" : "start"}});
    }
    const [openProfileDialog, setOpenProfileDialog] = React.useState(false);
    const [openProfileConfigDialog, setOpenProfileConfigDialog] = React.useState(false);
    const [output, setOutput] = React.useState("");
    const [openProfileStartStopDialog, setOpenProfileStartStopDialog] = React.useState(false);
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
        configSubmit({variables: {id: props.id, file_path: "config.json", data: content}});
    }
  return (
    <Card className={classes.root} elevation={5} style={{maxWidth: "99%"}}>
        <div>
        <StyledAvatar overlap="circle" classes={{badge: classes[running]}} invisible={false} anchorOrigin={{vertical: "bottom", horizontal: "right"}}>
            {props.is_p2p ? 
            (<React.Fragment><InsertLinkTwoToneIcon fontSize="large"/><InsertLinkTwoToneIcon fontSize="large"/></React.Fragment>)
            : 
            (<WifiIcon fontSize="large"/>)
            }

        </StyledAvatar>
        </div>
      <div>
        <Typography variant="h4" component="h1" style={{textAlign:"left", marginLeft: "10px"}}>{props.name}</Typography>
        <CardContent style={{textAlign:"left"}}>
            <Typography variant="body1" component="p">
              <b>Author:</b> {props.author}
            </Typography>
            <Typography variant="body1" component="p">
              <b>Supported Agents:</b> {props.payloadtypec2profiles.map( (pt) => (pt.payloadtype.ptype + " ") )}
            </Typography>
            <Typography variant="body2" component="p">
              {props.description}
            </Typography>
            <Typography variant="body2" component="p">
            { props.translation_container ? (
                <Typography variant="body1" component="p">
                  <b>Translation Container:</b> {props.translation_container}
                </Typography>
            ) : (null)
            }
              
            </Typography>
        </CardContent>
        <CardActions >
            <Button size="small" variant="contained" color="primary" href={"/docs/c2-profiles/" + props.name.toLowerCase()} target="_blank">
              Docs
            </Button>
            <Button size="small" onClick={()=>{setOpenBuildingDialog(true);}} color="primary" variant="contained">Build Info</Button>
                <MythicDialog fullWidth={true} maxWidth="lg" open={openBuildingDialog} 
                    onClose={()=>{setOpenBuildingDialog(false);}} 
                    innerDialog={<C2ProfileBuildDialog {...props} onClose={()=>{setOpenBuildingDialog(false);}} payload_name={props.name} />}
                />
                <MythicDialog fullWidth={true} maxWidth="lg" open={openProfileStartStopDialog} 
                    onClose={()=>{setOpenProfileStartStopDialog(false);}} 
                    innerDialog={<C2ProfileStartStopOutputDialog output={output} onClose={()=>{setOpenProfileStartStopDialog(false);}} payload_name={props.name} />}
                />
             <ButtonGroup variant="contained" color={props.running ? "primary" : "secondary"} ref={dropdownAnchorRef} aria-label="split button">
             {
                props.running ?
                (
                    <Button size="small" onClick={onStartStopProfile}>Stop Profile</Button>
                )
                :
                (
                    <Button size="small" onClick={onStartStopProfile}>Start Profile</Button>
                )
             }
             <Button
                size="small"
                aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                aria-expanded={dropdownOpen ? 'true' : undefined}
                aria-label="select merge strategy"
                aria-haspopup="menu"
                onClick={handleDropdownToggle}
              >
                <ArrowDropDownIcon />
              </Button>
            </ButtonGroup>
            <MythicDialog fullWidth={true} maxWidth="lg" open={openProfileDialog} 
                onClose={()=>{setOpenProfileDialog(false);}} 
                innerDialog={<C2ProfileOutputDialog {...props} payload_name={props.name} onClose={()=>{setOpenProfileDialog(false);}} profile_id={props.id} />}
            />
            <MythicDialog fullWidth={true} maxWidth="lg" open={openProfileConfigDialog} 
                onClose={()=>{setOpenProfileConfigDialog(false);}} 
                innerDialog={<C2ProfileConfigDialog {...props} onConfigSubmit={onConfigSubmit} payload_name={props.name} onClose={()=>{setOpenProfileConfigDialog(false);}} profile_id={props.id} />}
            />
            <Popper open={dropdownOpen} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal>
              {({ TransitionProps, placement }) => (
                <Grow
                  {...TransitionProps}
                  style={{
                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                  }}
                >
                  <Paper>
                    <ClickAwayListener onClickAway={handleDropdownClose}>
                      <MenuList id="split-button-menu">
                        <MenuItem key={"dropdownprofile" + props.id + "menu1"} onClick={()=>{setOpenProfileConfigDialog(true);}}>View Config</MenuItem>
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
          </CardActions>
      </div>
    </Card>
  );
}
