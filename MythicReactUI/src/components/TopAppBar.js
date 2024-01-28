import React from 'react';
import { styled } from '@mui/material/styles';
import clsx from 'clsx';
import { useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
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
import { TopAppBarNotifications } from './TopAppBarNotifications';
import { EventFeedNotifications } from './EventFeedNotifications';
import HelpIcon from '@mui/icons-material/Help';
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
import BarChartIcon from '@mui/icons-material/BarChart';
import HeadsetTwoToneIcon from '@mui/icons-material/HeadsetTwoTone';
import CodeIcon from '@mui/icons-material/Code';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBiohazard, faFlagCheckered} from '@fortawesome/free-solid-svg-icons';
import AttachmentIcon from '@mui/icons-material/Attachment';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import {faSocks} from '@fortawesome/free-solid-svg-icons';
import CameraAltTwoToneIcon from '@mui/icons-material/CameraAltTwoTone';
import {mythicVersion, mythicUIVersion} from '../index';
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
  mythicElement: `${PREFIX}-mythicElement`
};

const StyledAppBar = styled(AppBar)((
  {
    theme
  }
) => ({
  [`& .${classes.hide}`]: {
    display: 'none',
  },
  [`&.${classes.appBar}`]: {
    width: "100%",
    backgroundColor: theme.topAppBarColor,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  [`&.${classes.appBarShift}`]: {
    maxWidth: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
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
    backgroundColor: theme.palette.listSubHeader.default
  },

  [`& .${classes.nested}`]: {
    paddingLeft: theme.spacing(4),
  },
}));


const drawerWidth = 240;

export function TopAppBar(props) {
  const theme = useTheme();

  const feedbackRef = React.useRef(null);
  const settingsRef = React.useRef(null);
  const documentationRef = React.useRef(null);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [documentationAnchorEl, setDocumentationAnchorEl] = React.useState(null);
  const me = props.me;
  const isOpen = useReactiveVar(menuOpen);
  const [openGlobal, setOpenGlobal] = React.useState(false);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openOperations, setOpenOperations] = React.useState(false);
  const [openData, setOpenData] = React.useState(false);
  const [openFeedbackForm, setOpenFeedbackForm] = React.useState(false);
  const handleDrawerOpen = () => {
    menuOpen(true);
  };

  const handleDrawerClose = () => {
    menuOpen(false);
  };

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
  const handleLogout = () => {
    menuOpen(false);
    console.log("clicked logout, calling FailedRefresh");
    FailedRefresh();
  }

  return (
    <>
      {me?.user?.current_operation_id ? (<EventFeedNotifications me={me} />) : null }
      <StyledAppBar className={clsx(classes.appBar, {[classes.appBarShift]: isOpen,})}>
        
        { me?.loggedIn ? (
        <Toolbar variant="dense" >
            <IconButton
              edge="start"
              className={clsx(isOpen && classes.hide)}
              color="inherit"
              aria-label="menu"
              disableFocusRipple={true}
              disableRipple={true}
              onClick={handleDrawerOpen}
              >
                <MenuIcon fontSize={"large"} />
            </IconButton>
            <div style={{width: "100%"}}>
                <MythicStyledTooltip title="C2 Profiles and Payload Types">
                  <IconButton component={Link} to='/new/payloadtypes' color="inherit" size="large" disableFocusRipple={true}
                              disableRipple={true}>
                    <HeadsetTwoToneIcon fontSize={"large"} className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Payloads">
                    <IconButton component={Link} to='/new/payloads' color="inherit" disableFocusRipple={true}
                                disableRipple={true}>
                      <FontAwesomeIcon size={"lg"} icon={faBiohazard} />
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Search Operation">
                  <IconButton component={Link} to='/new/search?tab=callbacks&searchField=Host&search=' color="inherit"  disableFocusRipple={true}
                              disableRipple={true}>
                    <SearchIcon fontSize={"large"} className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Files">
                  <IconButton
                    component={Link}
                    to='/new/search?searchField=Filename&tab=files&location=Downloads'
                    color="inherit"
                    disableFocusRipple={true}
                    disableRipple={true}>
                    <AttachmentIcon fontSize={"large"} className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Artifacts">
                  <IconButton
                      disableFocusRipple={true}
                      disableRipple={true}
                    component={Link}
                    to='/new/search?searchField=Artifact&tab=artifacts'
                    color="inherit">
                    <FingerprintIcon fontSize={"large"} className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Proxies">
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
                <MythicStyledTooltip title="Active Callbacks">
                  <IconButton component={Link} to='/new/callbacks' color="inherit"  disableFocusRipple={true}
                              disableRipple={true}>
                    <PhoneCallbackIcon fontSize={"large"} className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Reporting" >
                  <IconButton component={Link} to='/new/reporting' color="inherit" disableFocusRipple={true}
                              disableRipple={true}>
                      <FontAwesomeIcon size={"lg"} icon={faFlagCheckered} />
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="MITRE ATT&CK" >
                  <IconButton component={Link} to='/new/mitre' color="inherit" disableFocusRipple={true}
                              disableRipple={true}>
                    <TableChartTwoToneIcon fontSize={"large"} className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Operation Tags" >
                  <IconButton component={Link} to='/new/tagtypes' color="inherit"  disableFocusRipple={true}
                              disableRipple={true}>
                    <LocalOfferTwoToneIcon fontSize={"large"} className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <Link style={{display: "inline-flex", alignItems: "center", paddingRight: "10px", color: "white", textDecoration: "none"}} to="/new/operations">
                        {me?.user?.current_operation || "No Operation Set"}
                </Link>
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
                    MenuListProps={{style: {backgroundColor: theme.palette.primary.main, color: "white"}}}
                >
                    <MenuItem divider={true} style={{display: "block"}} component={Link} to="/new/settings" onClick={handleClose} name="settings"> 
                      <Typography paragraph={true} variant="caption" style={{marginBottom: "0", color: "white"}}>Signed in as:</Typography>
                      <Typography paragraph={true} variant="body1"  style={{marginBottom: "0", fontWeight: 600, color: "white"}}> {me?.user?.username || "" } </Typography>
                    </MenuItem>
                    <MenuItem component={Link} to="/new/login" onClick={handleLogout}>Logout</MenuItem>
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
                    <HelpIcon fontSize={"large"} className="mythicElement"/>
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
                    MenuListProps={{style: {backgroundColor: theme.palette.primary.main, color: "white"}}}
                >
                    <MenuItem component={Link} target="_blank" to="/docs/agents" onClick={handleDocumentationClose}>Agent Documentation</MenuItem>
                    <MenuItem component={Link} target="_blank" to="/docs/wrappers" onClick={handleDocumentationClose}>Wrapper Documentation</MenuItem>
                    <MenuItem component={Link} target="_blank" to="/docs/c2-profiles" onClick={handleDocumentationClose}>C2 Profile Documentation</MenuItem>
                    <MenuItem component={Link} to={{pathname: "https://docs.mythic-c2.net"}} target="_blank" onClick={handleDocumentationClose}>Mythic Documentation</MenuItem>
                </Menu>
                <TopAppBarNotifications />
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
                    <ManageAccountsIcon fontSize={"large"} className="mythicElement" />
                  </MythicStyledTooltip>
                </IconButton>
                  {props.theme === 'dark' &&
                  <IconButton
                      disableFocusRipple={true}
                      disableRipple={true}
                    onClick={props.toggleTheme}
                    style={{float: "right", paddingRight: "0px", color: '#2f0e67'}}

                    >
                    <MythicStyledTooltip title="Change to Light Mode">
                      <DarkModeTwoToneIcon fontSize={"large"} className="mythicElement" />
                    </MythicStyledTooltip>
                  </IconButton>
                  }
                  {props.theme === 'light' &&
                      <IconButton
                          disableFocusRipple={true}
                          disableRipple={true}
                          onClick={props.toggleTheme}
                          style={{float: "right", paddingRight: "0px", color: '#eacc1b'}}

                      >
                        <MythicStyledTooltip title="Change to Dark Mode">
                          <LightModeTwoToneIcon fontSize={"large"} className="mythicElement" />
                        </MythicStyledTooltip>
                      </IconButton>
                  }
                
                </div>
            </div>
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
        <Divider />
        <List
        subheader={
          <ListSubheader className={classes.listSubHeader} component="div" id="nested-list-subheader">
            Home
          </ListSubheader>
        }>
            <div style={{marginLeft: "15px"}}>
            <b>Mythic Version:</b> v{mythicVersion}<br/>
            <b>UI Version:</b> v{mythicUIVersion}<br/>
            </div>
            
            <ListItem button component={Link} to='/new' key={"home"} onClick={handleDrawerClose}>
              <ListItemIcon ><SpaceDashboardTwoToneIcon fontSize={"large"} className="mythicElement" /></ListItemIcon>
              <ListItemText primary={"Dashboard"} />
            </ListItem>
        </List>
        <Divider />
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
              <Collapse in={openGlobal} unmountOnExit>
                <List component="div" disablePadding>
                  
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
                <ListItemIcon><PostAddIcon /></ListItemIcon>
                <ListItemText>Create</ListItemText>
                {openCreate ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={openCreate} unmountOnExit>
                  <List component="div" disablePadding>
                    <ListItem button className={classes.nested} component={Link} to='/new/createpayload' key={"createpayload"} onClick={handleDrawerClose} state={{from: 'TopAppBar'}}>
                      <ListItemIcon><PostAddIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
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
                <List component="div" disablePadding>
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
            <List
            subheader={
              <ListSubheader className={classes.listSubHeader} component="div" id="nested-list-subheader">
                Operational Views
              </ListSubheader>
            }>
              <ListItem button onClick={handleToggleData}>
                <ListItemIcon><BarChartIcon fontSize={"large"} /></ListItemIcon>
                <ListItemText>Operational Data</ListItemText>
                {openData ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={openData} unmountOnExit>
                <List component="div" disablePadding>
                    <ListItem button className={classes.nested} component={Link} to='/new/payloads' key={"payloads"} onClick={handleDrawerClose}>
                      <ListItemIcon><FontAwesomeIcon icon={faBiohazard} size="2x"/></ListItemIcon>
                      <ListItemText primary={"Payloads"} />
                    </ListItem>
                    <ListItem button className={classes.nested} component={Link} to='/new/search?tab=callbacks&searchField=Host&search=' key={"search"} onClick={handleDrawerClose}>
                      <ListItemIcon><SearchIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                      <ListItemText primary={"Search"} />
                    </ListItem>
                </List>
              </Collapse>
                <ListItem button component={Link} to='/new/callbacks' key={"callbacks"} onClick={handleDrawerClose}>
                  <ListItemIcon><PhoneCallbackIcon fontSize={"large"} className="mythicElement"/></ListItemIcon>
                  <ListItemText primary={"Active Callbacks"} />
                </ListItem>
            </List>
        <Divider />
      </StyledDrawer>
    </>
  );
}

