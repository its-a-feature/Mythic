import React from 'react';
import clsx from 'clsx';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import AccountCircle from '@material-ui/icons/AccountCircle';
import Menu from '@material-ui/core/Menu';
import { Link } from 'react-router-dom';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import InboxIcon from '@material-ui/icons/MoveToInbox';
import { useReactiveVar } from '@apollo/client';
import { meState, menuOpen } from '../cache';
import Switch from '@material-ui/core/Switch';
import { TopAppBarNotifications } from './TopAppBarNotifications';
import { EventFeedNotifications } from './EventFeedNotifications';
import {Redirect} from 'react-router-dom';
import WifiIcon from '@material-ui/icons/Wifi';
import CodeIcon from '@material-ui/icons/Code';
import PhoneCallbackIcon from '@material-ui/icons/PhoneCallback';
import {ReactComponent as ReactLogo} from './mythic_red_small.svg';
import HomeIcon from '@material-ui/icons/Home';
import ListSubheader from '@material-ui/core/ListSubheader';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import LayersIcon from '@material-ui/icons/Layers';
import PostAddIcon from '@material-ui/icons/PostAdd';
import SupervisorAccountIcon from '@material-ui/icons/SupervisorAccount';
import EditIcon from '@material-ui/icons/Edit';
import BlockIcon from '@material-ui/icons/Block';
import { Typography } from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import BarChartIcon from '@material-ui/icons/BarChart';


const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    position: "sticky",
    top: "0",
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
  appBar: {
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
  mythicElement: {}
}));

export function TopAppBar(props) {
  const theme = useTheme();
  const classes = useStyles(theme);
  
  const settingsRef = React.useRef(null);
  const [anchorEl, setAnchorEl] = React.useState(false);
  const me = useReactiveVar(meState);
  const isOpen = useReactiveVar(menuOpen);
  const [openGlobal, setOpenGlobal] = React.useState(false);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openOperations, setOpenOperations] = React.useState(false);
  const [openData, setOpenData] = React.useState(false);
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
    <div className={classes.root} >

      <EventFeedNotifications />
      <AppBar position="sticky" className={clsx(classes.appBar, {[classes.appBarShift]: isOpen,})}>
        
        { me.loggedIn ? (
        <Toolbar variant="dense" position="sticky static">
            <IconButton edge="start" className={clsx(classes.menuButton, isOpen && classes.hide)} color="inherit" aria-label="menu" onClick={handleDrawerOpen}>
                <MenuIcon />
            </IconButton>
            <div>
                { me.user === null ? <Redirect to='/new/logout'/> : (
                  <Typography style={{display: "inline-block"}}>
                    {me.user.username}
                  </Typography>
                )}
                <TopAppBarNotifications />
                
                <IconButton
                    aria-label="account of current user"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    onClick={handleMenu}
                    ref={settingsRef}
                    color="inherit"
                >
                    <AccountCircle />
                </IconButton>
                <Menu
                    id="menu-appbar"
                    nodeRef={settingsRef}
                    anchorEl={()=>settingsRef.current}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    getContentAnchorEl={null}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    open={anchorEl}
                    onClose={handleClose}
                >
                    <MenuItem component={Link} to="/new/settings" onClick={handleClose} name="settings">Settings</MenuItem>
                    <MenuItem component={Link} to="/new/logout" onClick={handleClose}>Logout</MenuItem>
                </Menu>
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
            onEscapeKeyDown={handleDrawerClose}
          >
        <div className={classes.drawerHeader} role="presentation">
          <ReactLogo style={{width: "90%"}}/>
          v2.2.13
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'ltr' ? <ChevronLeftIcon className="mythicElement"/> : <ChevronRightIcon className="mythicElement"/>}
          </IconButton>
        </div>
        <Divider />
        <List
        subheader={
          <ListSubheader component="div" id="nested-list-subheader">
            Home
          </ListSubheader>
        }>
            <ListItem button component={Link} to='/new' key={"home"}>
              <ListItemIcon><HomeIcon className="mythicElement"/></ListItemIcon>
              <ListItemText primary={"Home"} />
            </ListItem>
        </List>
        <Divider />
            <List
            subheader={
              <ListSubheader component="div" id="nested-list-subheader">
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
                  <ListItem button className={classes.nested} component={Link} to='/new/payloadtypes' key={"payloadtypes"}>
                    <ListItemIcon><InboxIcon className="mythicElement"/></ListItemIcon>
                    <ListItemText primary={"Payload Types"} />
                  </ListItem>
                  <ListItem button className={classes.nested} component={Link} to='/new/c2profiles' key={"c2profiles"}>
                    <ListItemIcon><WifiIcon className="mythicElement"/></ListItemIcon>
                    <ListItemText primary={"C2 Profiles"} />
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
                    <ListItem button className={classes.nested} component={Link} to='/new/createpayload' key={"createpayload"}>
                      <ListItemIcon><PostAddIcon className="mythicElement"/></ListItemIcon>
                      <ListItemText primary={"Create Payload"} />
                    </ListItem>
                  </List>
                </Collapse>
              <ListItem button onClick={handleToggleOperations}>
                <ListItemIcon><SupervisorAccountIcon /></ListItemIcon>
                <ListItemText>Operations</ListItemText>
                {openOperations ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={openOperations} unmountOnExit>
                <List component="div" disablePadding>
                    <ListItem button className={classes.nested} component={Link} to='/new/operations' key={"modifyoperations"}>
                      <ListItemIcon><EditIcon className="mythicElement"/></ListItemIcon>
                      <ListItemText primary={"Modify Operations"} />
                    </ListItem>
                    <ListItem button className={classes.nested} component={Link} to='/new/commandblocklists' key={"modifyblocklists"}>
                      <ListItemIcon><BlockIcon className="mythicElement"/></ListItemIcon>
                      <ListItemText primary={"Command Block Lists"} />
                    </ListItem>
                </List>
              </Collapse>
                <ListItem button component={Link} to='/new/browserscripts' key={"browserscripts"}>
                  <ListItemIcon><CodeIcon className="mythicElement"/></ListItemIcon>
                  <ListItemText primary={"BrowserScripts"} />
                </ListItem>
            </List>
        <Divider />
            <List
            subheader={
              <ListSubheader component="div" id="nested-list-subheader">
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
                    <ListItem button className={classes.nested} component={Link} to='/new/payloads' key={"payloads"}>
                      <ListItemIcon><EditIcon className="mythicElement"/></ListItemIcon>
                      <ListItemText primary={"Payloads"} />
                    </ListItem>
                    <ListItem button className={classes.nested} component={Link} to='/new/search' key={"search"}>
                      <ListItemIcon><SearchIcon className="mythicElement"/></ListItemIcon>
                      <ListItemText primary={"Search"} />
                    </ListItem>
                </List>
              </Collapse>
                <ListItem button component={Link} to='/new/callbacks' key={"callbacks"}>
                  <ListItemIcon><PhoneCallbackIcon className="mythicElement"/></ListItemIcon>
                  <ListItemText primary={"Active Callbacks"} />
                </ListItem>
            </List>
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
      </Drawer>
    </div>
  );
}

