import React from 'react';
import clsx from 'clsx';
import { useTheme } from '@mui/material/styles';
import makeStyles from '@mui/styles/makeStyles';
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
import InboxIcon from '@mui/icons-material/MoveToInbox';
import { useReactiveVar } from '@apollo/client';
import { meState, menuOpen, FailedRefresh } from '../cache';
import Switch from '@mui/material/Switch';
import { TopAppBarNotifications } from './TopAppBarNotifications';
import { EventFeedNotifications } from './EventFeedNotifications';
import WifiIcon from '@mui/icons-material/Wifi';
import HelpIcon from '@mui/icons-material/Help';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import {ReactComponent as ReactLogo} from './mythic_red_small.svg';
import HomeIcon from '@mui/icons-material/Home';
import ListSubheader from '@mui/material/ListSubheader';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LayersIcon from '@mui/icons-material/Layers';
import TableChartIcon from '@mui/icons-material/TableChart';
import PostAddIcon from '@mui/icons-material/PostAdd';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import EditIcon from '@mui/icons-material/Edit';
import { Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BarChartIcon from '@mui/icons-material/BarChart';
import HeadsetIcon from '@mui/icons-material/Headset';
import CodeIcon from '@mui/icons-material/Code';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBiohazard, faFlagCheckered} from '@fortawesome/free-solid-svg-icons';
import AttachmentIcon from '@mui/icons-material/Attachment';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import {faSocks} from '@fortawesome/free-solid-svg-icons';
import {faCamera} from '@fortawesome/free-solid-svg-icons';
import {mythicVersion, mythicUIVersion} from '../index';
import {MythicStyledTooltip} from './MythicComponents/MythicStyledTooltip';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import { MythicDialog } from './MythicComponents/MythicDialog';
import {MythicFeedbackDialog} from './MythicComponents/MythicFeedbackDialog';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StorageIcon from '@mui/icons-material/Storage';
import PublicIcon from '@mui/icons-material/Public';


const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
  },
  title: {
    flexGrow: 1,
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
    justifyContent: 'flex-end',
  },
  listSubHeader: {
    backgroundColor: theme.palette.listSubHeader.default
  },
  appBar: {
    width: "100%",
    backgroundColor: theme.topAppBarColor,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    maxWidth: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  nested: {
    paddingLeft: theme.spacing(4),
  },
  mythicElement: {},
}));

export function TopAppBar(props) {
  const theme = useTheme();
  const classes = useStyles(theme);
  const feedbackRef = React.useRef(null);
  const settingsRef = React.useRef(null);
  const documentationRef = React.useRef(null);
  const [anchorEl, setAnchorEl] = React.useState(false);
  const [documentationAnchorEl, setDocumentationAnchorEl] = React.useState(false);
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
    setAnchorEl(true);
  };

  const handleClose = (evt) => {
    setAnchorEl(false);
  };
  const handleDocumentationMenu = (event) => {
    setDocumentationAnchorEl(true);
  };
  const handleDocumentationClose = (evt) => {
    setDocumentationAnchorEl(false);
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
    <React.Fragment >

      {me?.user?.current_operation_id ? (<EventFeedNotifications me={me} />) : (null) }
      <AppBar className={clsx(classes.appBar, {[classes.appBarShift]: isOpen,})}>
        
        { me?.loggedIn ? (
        <Toolbar variant="dense" >
            <IconButton
              edge="start"
              className={clsx(classes.menuButton, isOpen && classes.hide)}
              color="inherit"
              aria-label="menu"
              onClick={handleDrawerOpen}
              size="large">
                <MenuIcon />
            </IconButton>
            <div style={{width: "100%"}}>
                <MythicStyledTooltip title="C2 Profiles and Payload Types">
                  <IconButton component={Link} to='/new/payloadtypes' color="inherit" size="large">
                    <HeadsetIcon className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Payloads">
                    <IconButton component={Link} to='/new/payloads' color="inherit" size="medium">
                      <FontAwesomeIcon icon={faBiohazard} />
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Search Operation">
                  <IconButton component={Link} to='/new/search' color="inherit" size="large">
                    <SearchIcon className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Files">
                  <IconButton
                    component={Link}
                    to='/new/search?searchField=Filename&tab=files&location=Downloads'
                    color="inherit"
                    size="large">
                    <AttachmentIcon className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Artifacts">
                  <IconButton
                    component={Link}
                    to='/new/search?searchField=Artifact&tab=artifacts'
                    color="inherit"
                    size="large">
                    <FingerprintIcon className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Proxies">
                  <IconButton component={Link} to='/new/search?tab=socks' color="inherit" size="medium">
                      <FontAwesomeIcon icon={faSocks} />
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Screenshots" arrow >
                  <IconButton
                    component={Link}
                    to='/new/search?searchField=Filename&tab=files&location=Screenshots'
                    color="inherit"
                    size="medium">
                      <FontAwesomeIcon icon={faCamera} />
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Credentials" arrow >
                  <IconButton
                    component={Link}
                    to='/new/search?searchField=Account&tab=credentials'
                    color="inherit"
                    size="large">
                      <VpnKeyIcon className="mythicElement" />
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Active Callbacks">
                  <IconButton component={Link} to='/new/callbacks' color="inherit" size="large">
                    <PhoneCallbackIcon className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Reporting" >
                  <IconButton component={Link} to='/new/reporting' color="inherit" size="medium">
                      <FontAwesomeIcon icon={faFlagCheckered} />
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="MITRE ATT&CK" >
                  <IconButton component={Link} to='/new/mitre' color="inherit" size="medium">
                    <TableChartIcon className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Operation Tags" >
                  <IconButton component={Link} to='/new/tagtypes' color="inherit" size="medium">
                    <LocalOfferIcon className="mythicElement"/>
                  </IconButton>
                </MythicStyledTooltip>
                <Link style={{display: "inline-flex", alignItems: "center", paddingRight: "10px", color: "white", textDecoration: "none"}} to="/new/operations">
                        {me?.user?.current_operation || "No Operation Set"}
                </Link>
                <Menu
                    id="menu-appbar"
                    nodeRef={settingsRef}
                    anchorEl={()=>settingsRef.current}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    getContentAnchorEl={null}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'center',
                    }}
                    open={anchorEl}
                    onClose={handleClose}
                    MenuListProps={{style: {backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light, color: "white"}}}
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
                  size="large">
                  <MythicStyledTooltip title="Send Support Feedback">
                    <ThumbDownOffAltIcon className="mythicElement" />
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
                  size="large">
                  <MythicStyledTooltip title="Help">
                    <HelpIcon className="mythicElement"/>  
                  </MythicStyledTooltip>
                </IconButton>
                <Menu
                    id="menu-appbar"
                    nodeRef={documentationRef}
                    anchorEl={()=>documentationRef.current}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    getContentAnchorEl={null}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'center',
                    }}
                    open={documentationAnchorEl}
                    onClose={handleDocumentationClose}
                    MenuListProps={{style: {backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light, color: "white"}}}
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
                  size="large">
                  <MythicStyledTooltip title="Settings or Logout">
                    <ManageAccountsIcon className="mythicElement" />
                  </MythicStyledTooltip>
                </IconButton>
                
                
                </div>
            </div>
        </Toolbar>
          ) : null
        } 
      </AppBar>
      <Drawer
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
              <ListItemIcon ><HomeIcon className="mythicElement" /></ListItemIcon>
              <ListItemText primary={"Home"} />
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
                <ListItemIcon><LayersIcon /></ListItemIcon>
                <ListItemText>Services</ListItemText>
                {openGlobal ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={openGlobal} unmountOnExit>
                <List component="div" disablePadding>
                  
                  <ListItem button className={classes.nested} target="_blank" component={Link} to='/jupyter' key={"jupyter"} onClick={handleDrawerClose}>
                    <ListItemIcon><CodeIcon className="mythicElement"/></ListItemIcon>
                    <ListItemText primary={"Jupyter Notebooks"} />
                  </ListItem>
                  <ListItem button className={classes.nested} target="_blank" component={Link} to='/console' key={"console"} onClick={handleDrawerClose}>
                    <ListItemIcon><StorageIcon className="mythicElement"/></ListItemIcon>
                    <ListItemText primary={"GraphQL Console"} />
                  </ListItem>
                  <ListItem button className={classes.nested} component={Link} to='/new/consuming_services' key={"consuming"} onClick={handleDrawerClose}>
                    <ListItemIcon><PublicIcon className="mythicElement"/></ListItemIcon>
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
                      <ListItemIcon><PostAddIcon className="mythicElement"/></ListItemIcon>
                      <ListItemText primary={"Create Payload"} />
                    </ListItem>
                    <ListItem button className={classes.nested} component={Link} to='/new/createwrapper' key={"createwrapper"} onClick={handleDrawerClose}>
                      <ListItemIcon><PostAddIcon className="mythicElement"/></ListItemIcon>
                      <ListItemText primary={"Create Wrapper"} />
                    </ListItem>
                  </List>
                </Collapse>
              <ListItem button onClick={handleToggleOperations}>
                <ListItemIcon><SupervisorAccountIcon /></ListItemIcon>
                <ListItemText>Operation Config</ListItemText>
                {openOperations ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={openOperations} unmountOnExit>
                <List component="div" disablePadding>
                  <ListItem button className={classes.nested} component={Link} to='/new/payloadtypes' key={"payloadtypes"} onClick={handleDrawerClose}>
                    <ListItemIcon><HeadsetIcon className="mythicElement"/></ListItemIcon>
                    <ListItemText primary={"Agents & C2"} />
                  </ListItem>
                    <ListItem button className={classes.nested} component={Link} to='/new/operations' key={"modifyoperations"} onClick={handleDrawerClose}>
                      <ListItemIcon><EditIcon className="mythicElement"/></ListItemIcon>
                      <ListItemText primary={"Modify Operations"} />
                    </ListItem>
                    <ListItem button className={classes.nested} component={Link} to='/new/browserscripts' key={"browserscripts"} onClick={handleDrawerClose}>
                      <ListItemIcon><CodeIcon className="mythicElement"/></ListItemIcon>
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
                <ListItemIcon><BarChartIcon /></ListItemIcon>
                <ListItemText>Operational Data</ListItemText>
                {openData ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={openData} unmountOnExit>
                <List component="div" disablePadding>
                    <ListItem button className={classes.nested} component={Link} to='/new/payloads' key={"payloads"} onClick={handleDrawerClose}>
                      <ListItemIcon><FontAwesomeIcon icon={faBiohazard} size="lg"/></ListItemIcon>
                      <ListItemText primary={"Payloads"} />
                    </ListItem>
                    <ListItem button className={classes.nested} component={Link} to='/new/search' key={"search"} onClick={handleDrawerClose}>
                      <ListItemIcon><SearchIcon className="mythicElement"/></ListItemIcon>
                      <ListItemText primary={"Search"} />
                    </ListItem>
                </List>
              </Collapse>
                <ListItem button component={Link} to='/new/callbacks' key={"callbacks"} onClick={handleDrawerClose}>
                  <ListItemIcon><PhoneCallbackIcon className="mythicElement"/></ListItemIcon>
                  <ListItemText primary={"Active Callbacks"} />
                </ListItem>
            </List>
        <Divider />
        <List
            subheader={
              <ListSubheader className={classes.listSubHeader} component="div" id="nested-list-subheader">
                Optional Configurations
              </ListSubheader>
            }>
              <ListItem>
              <Switch
            checked={props.theme === 'dark'}
            onChange={props.toggleTheme}
            color="primary"
            inputProps={{ 'aria-label': 'primary checkbox' }}
            name="darkMode"
          />
          <div style={{display: "inline-block"}}> Enable Dark Mode </div>
              </ListItem>
              </List>
        
      </Drawer>
    </React.Fragment>
  );
}

