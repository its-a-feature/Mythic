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
  mythicElement: {}
}));

export function TopAppBar(props) {
  const classes = useStyles();
  const theme = useTheme();
  const settingsRef = React.useRef(null);
  const [anchorEl, setAnchorEl] = React.useState(false);
  const me = useReactiveVar(meState);
  const isOpen = useReactiveVar(menuOpen);

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

  return (
    <div className={classes.root}>
      <AppBar position="sticky" className={clsx(classes.appBar, {[classes.appBarShift]: isOpen,})}>
        
        { me.loggedIn ? (
        <Toolbar variant="dense" position="sticky static">
            <IconButton edge="start" className={clsx(classes.menuButton, isOpen && classes.hide)} color="inherit" aria-label="menu" onClick={handleDrawerOpen}>
                <MenuIcon />
            </IconButton>
            <div>
                { me.user === null ? <Redirect to='/new/logout'/> : me.user.username}
                <TopAppBarNotifications />
                <EventFeedNotifications />
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
                    <MenuItem component={Link} to="/new/settings" onClick={handleClose} name="settings">My account</MenuItem>
                    <MenuItem component={Link} to="/new/logout" onClick={handleClose}>Logout</MenuItem>
                </Menu>
            </div>
        </Toolbar>
          ) : null
        } 
      </AppBar>
      <Drawer
            className={classes.drawer}
            variant="persistent"
            anchor="left"
            open={isOpen}
            classes={{
              paper: classes.drawerPaper,
            }}
          >
        <div className={classes.drawerHeader}>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'ltr' ? <ChevronLeftIcon className="mythicElement"/> : <ChevronRightIcon className="mythicElement"/>}
          </IconButton>
        </div>
        <Divider />
        <List>
            <ListItem button component={Link} to='/new' key={"home"}>
              <ListItemIcon><InboxIcon className="mythicElement"/></ListItemIcon>
              <ListItemText primary={"Home"} />
            </ListItem>
        </List>
        <Divider />
            <List>
                <ListItem button component={Link} to='/new/payloadtypes' key={"payloadtypes"}>
                  <ListItemIcon><InboxIcon className="mythicElement"/></ListItemIcon>
                  <ListItemText primary={"Payload Types"} />
                </ListItem>
                <ListItem button component={Link} to='/new/c2profiles' key={"c2profiles"}>
                  <ListItemIcon><WifiIcon className="mythicElement"/></ListItemIcon>
                  <ListItemText primary={"C2 Profiles"} />
                </ListItem>
                <ListItem button component={Link} to='/new/createpayload' key={"createpayload"}>
                  <ListItemIcon><InboxIcon className="mythicElement"/></ListItemIcon>
                  <ListItemText primary={"Create Payload"} />
                </ListItem>
                <ListItem button component={Link} to='/new/browserscripts' key={"browserscripts"}>
                  <ListItemIcon><CodeIcon className="mythicElement"/></ListItemIcon>
                  <ListItemText primary={"BrowserScripts"} />
                </ListItem>
            </List>
        <Divider />
            <List>
                <ListItem button component={Link} to='/new/payloads' key={"payloads"}>
                  <ListItemIcon><InboxIcon className="mythicElement"/></ListItemIcon>
                  <ListItemText primary={"View Payloads"} />
                </ListItem>
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

