import React from 'react';
import { styled } from '@mui/material/styles';
import clsx from 'clsx';
import { useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ManageAccountsTwoToneIcon from '@mui/icons-material/ManageAccountsTwoTone';
import Menu from '@mui/material/Menu';
import { Link } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useReactiveVar } from '@apollo/client';
import { menuOpen, FailedRefresh } from '../cache';
import { TopAppBarEventLogNotifications } from './TopAppBarEventLogNotifications';
import { EventFeedNotifications } from './EventFeedNotifications';
import HelpTwoToneIcon from '@mui/icons-material/HelpTwoTone';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import {ReactComponent as ReactLogo} from './mythic_red_small.svg';
import SpaceDashboardTwoToneIcon from '@mui/icons-material/SpaceDashboardTwoTone';
import ListSubheader from '@mui/material/ListSubheader';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LayersTwoToneIcon from '@mui/icons-material/LayersTwoTone';
import TableChartTwoToneIcon from '@mui/icons-material/TableChartTwoTone';
import PostAddIcon from '@mui/icons-material/PostAdd';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import EditIcon from '@mui/icons-material/Edit';
import { Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import HeadsetTwoToneIcon from '@mui/icons-material/HeadsetTwoTone';
import CodeIcon from '@mui/icons-material/Code';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBiohazard, faFlagCheckered} from '@fortawesome/free-solid-svg-icons';
import AttachmentIcon from '@mui/icons-material/Attachment';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import {faSocks} from '@fortawesome/free-solid-svg-icons';
import CameraAltTwoToneIcon from '@mui/icons-material/CameraAltTwoTone';
import {mythicUIVersion} from '../index';
import {MythicStyledTooltip} from './MythicComponents/MythicStyledTooltip';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ThumbDownTwoTone from '@mui/icons-material/ThumbDownTwoTone';
import { MythicDialog } from './MythicComponents/MythicDialog';
import {MythicFeedbackDialog} from './MythicComponents/MythicFeedbackDialog';
import LocalOfferTwoToneIcon from '@mui/icons-material/LocalOfferTwoTone';
import StorageIcon from '@mui/icons-material/Storage';
import PublicIcon from '@mui/icons-material/Public';
import LightModeTwoToneIcon from '@mui/icons-material/LightModeTwoTone';
import DarkModeTwoToneIcon from '@mui/icons-material/DarkModeTwoTone';
import PlayCircleFilledTwoToneIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {TopAppBarEventingNotifications} from "./TopAppBarEventingNotifications";
import {useQuery, gql} from '@apollo/client';
import VerifiedTwoToneIcon from '@mui/icons-material/VerifiedTwoTone';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssignmentIcon from '@mui/icons-material/Assignment';


const PREFIX = 'TopAppBar';

const classes = {
  root: `${PREFIX}-root`,
  title: `${PREFIX}-title`,
  hide: `${PREFIX}-hide`,
  drawer: `${PREFIX}-drawer`,
  drawerPaper: `${PREFIX}-drawerPaper`,
  drawerHeader: `${PREFIX}-drawerHeader`,
  listSubHeader: `${PREFIX}-listSubHeader`,
  appBar: `${PREFIX}-appBar`,
  appBarShift: `${PREFIX}-appBarShift`,
  nested: `${PREFIX}-nested`,
  mythicElement: `${PREFIX}-mythicElement`,
  menuButton: `${PREFIX}-menuButton`,
};

const StyledAppBar = styled(AppBar)((
  {
    theme
  }
) => ({
  [`& .${classes.hide}`]: {
    display: 'none',
  },
  [`& .${classes.menuButton}`]: {
    display: 'inline-block',
  },
  [`&.${classes.appBar}`]: {
    width: "100%",
    backgroundColor: theme.topAppBarColor,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    borderTopRightRadius: theme.palette.mode === "dark" ? "3px" : 0,
    borderTopLeftRadius: theme.palette.mode === "dark" ? "3px" : 0,
    position: "sticky",
    overflow: "hidden",
    maxHeight: "48px"
  },
  [`&.${classes.appBarShift}`]: {
    maxWidth: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    borderTopRightRadius: theme.palette.mode === "dark" ? "3px" : 0,
    borderTopLeftRadius: theme.palette.mode === "dark" ? "3px" : 0,
  },
}));
const StyledDrawer = styled(Drawer)((
    {
      theme
    }
) => ({
  [`& .${classes.title}`]: {
    flexGrow: 1,
  },

  [`&.${classes.drawer}`]: {
    width: drawerWidth,
    flexShrink: 0,
  },

  [`& .${classes.drawerPaper}`]: {
    width: drawerWidth,
  },

  [`& .${classes.drawerHeader}`]: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    justifyContent: 'flex-end',
  },

  [`& .${classes.listSubHeader}`]: {
    backgroundColor: theme.palette.listSubHeader.default,
    borderTopLeftRadius: "3px",
    borderTopRightRadius: "3px",
  },

  [`& .${classes.nested}`]: {
    paddingLeft: theme.spacing(4),
  },
}));


const drawerWidth = 240;
const GET_SETTINGS = gql`
query getGlobalSettings {
  getGlobalSettings {
    settings
  }
}
`;
export function TopAppBar(props) {
  const theme = useTheme();
  const me = props.me;
  const isOpen = useReactiveVar(menuOpen);
  const [openGlobal, setOpenGlobal] = React.useState(false);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openOperations, setOpenOperations] = React.useState(false);
  const [openData, setOpenData] = React.useState(false);
  const [serverVersion, setServerVersion] = React.useState("...");
  const [serverName, setServerName] = React.useState("...");
  useQuery(GET_SETTINGS, {fetchPolicy: "no-cache",
    onCompleted: (data) => {
      setServerVersion(data.getGlobalSettings.settings["MYTHIC_SERVER_VERSION"]);
      setServerName(data.getGlobalSettings.settings["MYTHIC_GLOBAL_SERVER_NAME"]);
    }
  });
  const handleDrawerOpen = () => {
    menuOpen(true);
  };

  const handleDrawerClose = () => {
    menuOpen(false);
  };

  const handleToggleGlobal = () => {
    setOpenGlobal(!openGlobal);
  }
  const handleToggleCreate = () => {
    setOpenCreate(!openCreate);
  }
  const handleToggleOperations = () => {
    setOpenOperations(!openOperations);
  }
  const handleToggleData = () => {
    setOpenData(!openData);
  }

  return (
    <>
      {me?.user?.current_operation_id ? (<EventFeedNotifications me={me} />) : null }
      <StyledAppBar className={clsx(classes.appBar, {[classes.appBarShift]: isOpen,})}>
        
        { me?.loggedIn ? (
        <Toolbar variant="dense" style={{width: "100%"}} >
            <IconButton
              edge="start"
              className={clsx(isOpen && classes.hide, !isOpen && classes.menuButton)}
              color="inherit"
              aria-label="menu"
              disableFocusRipple={true}
              disableRipple={true}
              onClick={handleDrawerOpen}
              >
                <MenuIcon fontSize={"large"} />
            </IconButton>
            <span style={{width: "100%"}}>
              <span className={'hideOnSmallWidth'}>
                <TopBarShortcuts />
                {me?.user?.current_operation_id === 0 ? (
                    <Link style={{display: "inline-flex", alignItems: "center", paddingRight: "10px", color: "#f84d4d",
                      fontWeight: "bold",}} to="/new/operations">
                      {"CLICK HERE TO SET OPERATION!"}
                    </Link>
                ) : (
                    <>
                      <Link style={{paddingRight: "10px", color: "white", textDecoration: "none", fontSize: "1em"}} to="/new/operations">
                        {me?.user?.current_operation}
                        {me?.user?.current_operation_complete &&
                            <IconButton disabled>
                              <VerifiedTwoToneIcon style={{padding: 0, color: "white"}} />
                            </IconButton>
                        }
                      </Link>
                    </>
                )}
              </span>
            </span>

          <TopBarRightShortcuts me={me} toggleTheme={props.toggleTheme} serverName={serverName} />
        </Toolbar>
          ) : null
        } 
      </StyledAppBar>
      <StyledDrawer
            className={classes.drawer}
            anchor="left"
            open={isOpen}
            classes={{
              paper: classes.drawerPaper,
            }}
            onClose={handleDrawerClose}
          >
        <div className={classes.drawerHeader} role="presentation">
          <ReactLogo style={{width: "80%", display: "inline-block"}}/>
          
            <IconButton onClick={handleDrawerClose} size="large">
              {theme.direction === 'ltr' ? <ChevronLeftIcon className="mythicElement"/> : <ChevronRightIcon className="mythicElement"/>}
            </IconButton>
        </div>
        <List
        subheader={
          <ListSubheader className={classes.listSubHeader} component="div" id="nested-list-subheader">
            Home
          </ListSubheader>
        }>
            <Typography style={{marginLeft: "15px", fontSize: 12}}>
            <b>Mythic Version:</b> v{serverVersion}<br/>
            <b>UI Version:</b> v{mythicUIVersion}<br/>
            </Typography>
            
            <ListItem button component={Link} to='/new' key={"home"} onClick={handleDrawerClose}>
              <ListItemIcon ><SpaceDashboardTwoToneIcon fontSize={"large"} className="mythicElement" /></ListItemIcon>
              <ListItemText primary={"Dashboard / Home"} />
            </ListItem>
        </List>

            <List
            subheader={
              <ListSubheader className={classes.listSubHeader} component="div" id="nested-list-subheader">
                Operational Views
              </ListSubheader>
            }>
              <ListItem className={classes.listSubHeader} button component={Link} to='/new/callbacks' key={"callbacks"} onClick={handleDrawerClose}>
                <ListItemIcon><PhoneCallbackIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                <ListItemText primary={"Active Callbacks"} />
              </ListItem>
              <ListItem button className={classes.listSubHeader} component={Link} to='/new/payloads' key={"payloads"} onClick={handleDrawerClose}>
                <ListItemIcon><FontAwesomeIcon icon={faBiohazard} size="2x"/></ListItemIcon>
                <ListItemText primary={"Payloads"} />
              </ListItem>
              <ListItem button onClick={handleToggleData}>
                <ListItemIcon><SearchIcon fontSize={"large"} /></ListItemIcon>
                <ListItemText>Search</ListItemText>
                {openData ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={openData} unmountOnExit>
                <List component="div" disablePadding style={{border: 0}}>
                    <ListItem button className={classes.nested} component={Link} to='/new/search?tab=callbacks&searchField=Host&search=' onClick={handleDrawerClose}>
                      <ListItemIcon><PhoneCallbackIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                      <ListItemText primary={"Callbacks"} />
                    </ListItem>
                  <ListItem button className={classes.nested} component={Link} to='/new/search?tab=tasks&searchField=Command+and+Parameters&search=&taskStatus=' onClick={handleDrawerClose}>
                    <ListItemIcon><AssignmentIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                    <ListItemText primary={"Tasks"} />
                  </ListItem>
                  <ListItem button className={classes.nested} component={Link} to='/new/search?tab=payloads&searchField=Filename&search=&taskStatus=&c2=All+C2&payloadtype=All+Payload+Types'  onClick={handleDrawerClose}>
                    <ListItemIcon><FontAwesomeIcon size={"2x"} icon={faBiohazard} /></ListItemIcon>
                    <ListItemText primary={"Payloads"} />
                  </ListItem>
                  <ListItem button className={classes.nested} component={Link} to='/new/search?searchField=Filename&tab=files&location=Downloads&host=&search='  onClick={handleDrawerClose}>
                    <ListItemIcon><AttachmentIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                    <ListItemText primary={"Files"} />
                  </ListItem>
                  <ListItem button className={classes.nested} component={Link} to='/new/search?t?searchField=Account&tab=credentials&search=' onClick={handleDrawerClose}>
                    <ListItemIcon><VpnKeyIcon fontSize={"large"} className="mythicElement" /></ListItemIcon>
                    <ListItemText primary={"Credentials"} />
                  </ListItem>
                  <ListItem button className={classes.nested} component={Link} to='/new/search?tab=keylogs&searchField=Host&search='onClick={handleDrawerClose}>
                    <ListItemIcon><KeyboardIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                    <ListItemText primary={"Keylogs"} />
                  </ListItem>
                  <ListItem button className={classes.nested} component={Link} to='/new/search?tab=artifacts&searchField=Host&search=' onClick={handleDrawerClose}>
                    <ListItemIcon><FingerprintIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                    <ListItemText primary={"Artifacts"} />
                  </ListItem>
                  <ListItem button className={classes.nested} component={Link} to='/new/search?tab=tokens&searchField=Host&search='  onClick={handleDrawerClose}>
                    <ListItemIcon><ConfirmationNumberIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                    <ListItemText primary={"Tokens"} />
                  </ListItem>
                  <ListItem button className={classes.nested} component={Link} to='/new/search?tab=socks' onClick={handleDrawerClose}>
                    <ListItemIcon><FontAwesomeIcon size={"2x"} icon={faSocks} /></ListItemIcon>
                    <ListItemText primary={"Proxies"} />
                  </ListItem>
                  <ListItem button className={classes.nested} component={Link} to='/new/search?tab=processes&searchField=Name&search=&host='  onClick={handleDrawerClose}>
                    <ListItemIcon><AccountTreeIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                    <ListItemText primary={"Processes"} />
                  </ListItem>
                  <ListItem button className={classes.nested} component={Link} to='/new/search?tab=tags&searchField=TagType&search=&host='  onClick={handleDrawerClose}>
                    <ListItemIcon><LocalOfferTwoToneIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                    <ListItemText primary={"Tags"} />
                  </ListItem>
                </List>

              </Collapse>
              <ListItem button className={classes.listSubHeader} component={Link} to='/new/mitre' onClick={handleDrawerClose}>
                <ListItemIcon><TableChartTwoToneIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                <ListItemText primary={"ATT&CK"} />
              </ListItem>
              <ListItem button className={classes.listSubHeader} component={Link} to='/new/reporting' onClick={handleDrawerClose}>
                <ListItemIcon><FontAwesomeIcon size={"2x"} icon={faFlagCheckered} /></ListItemIcon>
                <ListItemText primary={"Reporting"} />
              </ListItem>
              <ListItem button className={classes.listSubHeader} component={Link} to='/new/tagtypes' onClick={handleDrawerClose}>
                <ListItemIcon><LocalOfferTwoToneIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                <ListItemText primary={"Tags"} />
              </ListItem>
              <ListItem button className={classes.listSubHeader} component={Link} to='/new/eventing' onClick={handleDrawerClose}>
                <ListItemIcon><PlayCircleFilledTwoToneIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                <ListItemText primary={"Eventing"} />
              </ListItem>

            </List>
        <List
            subheader={
              <ListSubheader className={classes.listSubHeader} component="div" id="nested-list-subheader">
                Global Configurations
              </ListSubheader>
            }>
          <ListItem button onClick={handleToggleGlobal}>
            <ListItemIcon><LayersTwoToneIcon fontSize={"large"} /></ListItemIcon>
            <ListItemText>Services</ListItemText>
            {openGlobal ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={openGlobal} unmountOnExit >
            <List component="div" disablePadding style={{border: 0}}>
              <ListItem button className={classes.nested} target="_blank" component={Link} to='/jupyter' key={"jupyter"} onClick={handleDrawerClose}>
                <ListItemIcon><CodeIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                <ListItemText primary={"Jupyter Notebooks"} />
              </ListItem>
              <ListItem button className={classes.nested} target="_blank" component={Link} to='/console' key={"console"} onClick={handleDrawerClose}>
                <ListItemIcon><StorageIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                <ListItemText primary={"GraphQL Console"} />
              </ListItem>
              <ListItem button className={classes.nested} component={Link} to='/new/consuming_services' key={"consuming"} onClick={handleDrawerClose}>
                <ListItemIcon><PublicIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                <ListItemText primary={"Consuming Services"} />
              </ListItem>
            </List>
          </Collapse>
          <ListItem button onClick={handleToggleCreate}>
            <ListItemIcon><PostAddIcon fontSize={"large"} /></ListItemIcon>
            <ListItemText>Create</ListItemText>
            {openCreate ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={openCreate} unmountOnExit>
            <List component="div" disablePadding style={{border: 0}}>
              <ListItem button className={classes.nested} component={Link} to='/new/createpayload' key={"createpayload"} onClick={handleDrawerClose} state={{from: 'TopAppBar'}}>
                <ListItemIcon><FontAwesomeIcon size={"2x"} icon={faBiohazard} /></ListItemIcon>
                <ListItemText primary={"Create Payload"} />
              </ListItem>
              <ListItem button className={classes.nested} component={Link} to='/new/createwrapper' key={"createwrapper"} onClick={handleDrawerClose}>
                <ListItemIcon><PostAddIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                <ListItemText primary={"Create Wrapper"} />
              </ListItem>
            </List>
          </Collapse>
          <ListItem button onClick={handleToggleOperations}>
            <ListItemIcon><SupervisorAccountIcon fontSize={"large"} /></ListItemIcon>
            <ListItemText>Operation Config</ListItemText>
            {openOperations ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={openOperations} unmountOnExit>
            <List component="div" disablePadding style={{border: 0}}>
              <ListItem button className={classes.nested} component={Link} to='/new/payloadtypes' key={"payloadtypes"} onClick={handleDrawerClose}>
                <ListItemIcon><HeadsetTwoToneIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                <ListItemText primary={"Agents & C2"} />
              </ListItem>
              <ListItem button className={classes.nested} component={Link} to='/new/operations' key={"modifyoperations"} onClick={handleDrawerClose}>
                <ListItemIcon><EditIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                <ListItemText primary={"Modify Operations"} />
              </ListItem>
              <ListItem button className={classes.nested} component={Link} to='/new/browserscripts' key={"browserscripts"} onClick={handleDrawerClose}>
                <ListItemIcon><CodeIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                <ListItemText primary={"BrowserScripts"} />
              </ListItem>
            </List>
          </Collapse>
        </List>
        <Divider />
      </StyledDrawer>
      {me?.user?.current_operation_banner_text !== "" &&
        <Typography style={{backgroundColor: me?.user?.current_operation_banner_color,
          width: "100%", textAlign: "center", fontWeight: "600", color: "white", borderRadius: "4px", border: "1px solid grey"}} >
          {me?.user?.current_operation_banner_text}
        </Typography>
      }
    </>
  );
}

function TopBarShortcuts({}){
  return (
      <>
        <MythicStyledTooltip title="C2 Profiles and Payload Types" >
          <IconButton component={Link} to='/new/payloadtypes'
                      color="inherit"
                      size="large" disableFocusRipple={true}
                      disableRipple={true}>
            <HeadsetTwoToneIcon fontSize={"large"} className="mythicElement"/>
          </IconButton>
        </MythicStyledTooltip>
        <MythicStyledTooltip title="Payloads" arrow >
          <IconButton component={Link} to='/new/payloads' color="inherit" disableFocusRipple={true}
                      disableRipple={true}>
            <FontAwesomeIcon size={"lg"} icon={faBiohazard} />
          </IconButton>
        </MythicStyledTooltip>
        <MythicStyledTooltip title="Search Operation" arrow >
          <IconButton component={Link} to='/new/search?tab=callbacks&searchField=Host&search=' color="inherit"  disableFocusRipple={true}
                      disableRipple={true}>
            <SearchIcon fontSize={"large"} className="mythicElement"/>
          </IconButton>
        </MythicStyledTooltip>
        <MythicStyledTooltip title="Files" arrow >
          <IconButton
              component={Link}
              to='/new/search?searchField=Filename&tab=files&location=Downloads'
              color="inherit"
              disableFocusRipple={true}
              disableRipple={true}>
            <AttachmentIcon fontSize={"large"} className="mythicElement"/>
          </IconButton>
        </MythicStyledTooltip>
        <MythicStyledTooltip title="Artifacts" arrow >
          <IconButton
              disableFocusRipple={true}
              disableRipple={true}
              component={Link}
              to='/new/search?searchField=Artifact&tab=artifacts'
              color="inherit">
            <FingerprintIcon fontSize={"large"} className="mythicElement"/>
          </IconButton>
        </MythicStyledTooltip>
        <MythicStyledTooltip title="Proxies" arrow >
          <IconButton component={Link} to='/new/search?tab=socks' color="inherit" disableFocusRipple={true}
                      disableRipple={true}>
            <FontAwesomeIcon size={"lg"} icon={faSocks} />
          </IconButton>
        </MythicStyledTooltip>
        <MythicStyledTooltip title="Screenshots" arrow >
          <IconButton
              component={Link}
              to='/new/search?searchField=Filename&tab=files&location=Screenshots'
              color="inherit"
              disableFocusRipple={true}
              disableRipple={true}
          >
            <CameraAltTwoToneIcon fontSize={"large"} />
          </IconButton>
        </MythicStyledTooltip>
        <MythicStyledTooltip title="Credentials" arrow >
          <IconButton
              component={Link}
              to='/new/search?searchField=Account&tab=credentials'
              color="inherit"
              disableFocusRipple={true}
              disableRipple={true}>
            <VpnKeyIcon fontSize={"large"} className="mythicElement" />
          </IconButton>
        </MythicStyledTooltip>
        <MythicStyledTooltip title="Active Callbacks" arrow >
          <IconButton component={Link} to='/new/callbacks' color="inherit"  disableFocusRipple={true}
                      disableRipple={true}>
            <PhoneCallbackIcon fontSize={"large"} className="mythicElement"/>
          </IconButton>
        </MythicStyledTooltip>
        <MythicStyledTooltip title="Reporting" arrow  >
          <IconButton component={Link} to='/new/reporting' color="inherit" disableFocusRipple={true}
                      disableRipple={true}>
            <FontAwesomeIcon size={"lg"} icon={faFlagCheckered} />
          </IconButton>
        </MythicStyledTooltip>
        <MythicStyledTooltip title="MITRE ATT&CK" arrow  >
          <IconButton component={Link} to='/new/mitre' color="inherit" disableFocusRipple={true}
                      disableRipple={true}>
            <TableChartTwoToneIcon fontSize={"large"} className="mythicElement"/>
          </IconButton>
        </MythicStyledTooltip>
        <MythicStyledTooltip title="Operation Tags" arrow  >
          <IconButton component={Link} to='/new/tagtypes' color="inherit"  disableFocusRipple={true}
                      disableRipple={true}>
            <LocalOfferTwoToneIcon fontSize={"large"} className="mythicElement"/>
          </IconButton>
        </MythicStyledTooltip>
        <MythicStyledTooltip title="Eventing Scripts" arrow  >
          <TopAppBarEventingNotifications />
        </MythicStyledTooltip>
      </>
  )
}
function TopBarRightShortcuts({me, toggleTheme, serverName}){
  const theme = useTheme();
  const feedbackRef = React.useRef(null);
  const settingsRef = React.useRef(null);
  const documentationRef = React.useRef(null);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [documentationAnchorEl, setDocumentationAnchorEl] = React.useState(null);
  const [openFeedbackForm, setOpenFeedbackForm] = React.useState(false);
  const handleLogout = () => {
    menuOpen(false);
    FailedRefresh();
  }
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = (evt) => {
    setAnchorEl(null);
  };
  const handleDocumentationMenu = (event) => {
    setDocumentationAnchorEl(event.currentTarget);
  };
  const handleDocumentationClose = (evt) => {
    setDocumentationAnchorEl(null);
  };
    return (
        <>
          <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}

          >
            <MenuItem disabled divider={true} style={{display: "block"}}>
              <Typography paragraph={true} variant={"caption"} style={{marginBottom: "0"}}>Server Name:</Typography>
              <Typography paragraph={true} variant={"body1"} style={{marginBottom: "0", fontWeight: 600}}>{serverName}</Typography>
            </MenuItem>
            <MenuItem divider={true} style={{display: "block"}} component={Link} to="/new/settings" onClick={handleClose} name="settings">
              <Typography paragraph={true} variant="caption" style={{marginBottom: "0"}}>Signed in as:</Typography>
              <Typography paragraph={true} variant="body1"  style={{marginBottom: "0", fontWeight: 600}}> {me?.user?.username || "" } </Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
          <div style={{display: "inline-flex", justifyContent: "flex-end", float: "right"}}>
            <IconButton
                aria-label="feedback"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={() => setOpenFeedbackForm(true)}
                ref={feedbackRef}
                color="inherit"
                style={{float: "right", }}
                disableFocusRipple={true}
                disableRipple={true}>
              <MythicStyledTooltip title="Send Support Feedback">
                <ThumbDownTwoTone fontSize={"large"} className="mythicElement" />
              </MythicStyledTooltip>
            </IconButton>
            {openFeedbackForm &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openFeedbackForm}
                              onClose={()=>{setOpenFeedbackForm(false);}}
                              innerDialog={<MythicFeedbackDialog
                                  title={"Submit Feedback via Webhook"}
                                  onClose={()=>{setOpenFeedbackForm(false);}} />}
                />
            }
            <IconButton
                aria-label="documentation links"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleDocumentationMenu}
                ref={documentationRef}
                color="inherit"
                style={{float:"right"}}
                disableFocusRipple={true}
                disableRipple={true}>
              <MythicStyledTooltip title="Help">
                <HelpTwoToneIcon fontSize={"large"} className="mythicElement"/>
                <KeyboardArrowDownIcon />
              </MythicStyledTooltip>
            </IconButton>
            <Menu
                id="menu-appbar"
                anchorEl={documentationAnchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
                open={Boolean(documentationAnchorEl)}
                onClose={handleDocumentationClose}
            >
              <MenuItem component={Link} target="_blank" to="/docs/agents" onClick={handleDocumentationClose}>Agent Documentation</MenuItem>
              <MenuItem component={Link} target="_blank" to="/docs/wrappers" onClick={handleDocumentationClose}>Wrapper Documentation</MenuItem>
              <MenuItem component={Link} target="_blank" to="/docs/c2-profiles" onClick={handleDocumentationClose}>C2 Profile Documentation</MenuItem>
              <MenuItem component={Link} to={{pathname: "https://docs.mythic-c2.net"}} target="_blank" onClick={handleDocumentationClose}>Mythic Documentation</MenuItem>
            </Menu>
            <TopAppBarEventLogNotifications />
            <IconButton
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                ref={settingsRef}
                color="inherit"
                style={{float: "right", }}
                disableFocusRipple={true}
                disableRipple={true} >
              <MythicStyledTooltip title="Settings or Logout">
                <ManageAccountsTwoToneIcon fontSize={"large"} className="mythicElement" />
                <KeyboardArrowDownIcon />
              </MythicStyledTooltip>
            </IconButton>
            {theme.palette.mode === 'dark' &&
                <IconButton
                    disableFocusRipple={true}
                    disableRipple={true}
                    onClick={toggleTheme}
                    style={{float: "right", paddingRight: "0px", color: '#2f0e67'}}
                >
                  <MythicStyledTooltip title="Change to Light Mode">
                    <DarkModeTwoToneIcon fontSize={"large"} className="mythicElement" />
                  </MythicStyledTooltip>
                </IconButton>
            }
            {theme.palette.mode === 'light' &&
                <IconButton
                    disableFocusRipple={true}
                    disableRipple={true}
                    onClick={toggleTheme}
                    style={{float: "right", paddingRight: "0px", color: '#eacc1b'}}
                >
                  <MythicStyledTooltip title="Change to Dark Mode">
                    <LightModeTwoToneIcon fontSize={"large"} className="mythicElement" />
                  </MythicStyledTooltip>
                </IconButton>
            }

          </div>
        </>
    )
}