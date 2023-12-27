import { toast } from 'react-toastify';
import NotificationsPausedIcon from '@mui/icons-material/NotificationsPaused';
import AlarmIcon from '@mui/icons-material/Alarm';
import Button from '@mui/material/Button';
import React from 'react';
import ButtonGroup from '@mui/material/ButtonGroup';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import SnoozeIcon from '@mui/icons-material/Snooze';

export const CloseButton = ({ closeToast }) => {
  const theme = useTheme();
  const dropdownAnchorRef = React.useRef(null);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dndWithTime = (doNotDisturbMinutes) => {
    localStorage.setItem("dnd", JSON.stringify({
      "doNotDisturb": true,
      "doNotDisturbTimeStart": new Date(),
      "doNotDisturbMinutes": doNotDisturbMinutes
    }))
    snackActions.clearAll()
  }
  const dropDownOptions = [
    {
      name: <div><AlarmIcon /> 1min</div>,
      click: () => {
        dndWithTime(1);
      }
    },
    {
      name: <div><AlarmIcon /> 5min</div>,
      click: () => {
        dndWithTime(5);
      }
    },
    {
      name: <div><AlarmIcon /> 10min</div>,
      click: () => {
        dndWithTime(10);
      }
    },
    {
      name: <div><AlarmIcon /> 30min</div>,
      click: () => {
        dndWithTime(30);
      }
    },
    {
      name: <div><SnoozeIcon /> 1 year</div>,
      click: () => {
        dndWithTime(60 * 24 * 365);
      }
    },
  ]
  const handleMenuItemClick = (event, index) => {
    dropDownOptions[index].click();
    setDropdownOpen(false);
  };
  const [dnd, setDnd] = React.useState(stillDoNotDisturb());
  return (
      <div >
        {!dnd &&
            <>
            <ButtonGroup ref={dropdownAnchorRef} aria-label="split button" style={{marginRight: "10px", marginTop:"10px", float: "right"}}>
              <Button  aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                      aria-expanded={dropdownOpen ? 'true' : undefined}
                      aria-haspopup="menu"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropdownOpen(!dropdownOpen)
                      }}>
                <NotificationsPausedIcon color={"error"} /> <ArrowDropDownIcon />
              </Button>
            </ButtonGroup>
            <Popper open={dropdownOpen} anchorEl={dropdownAnchorRef.current} role={undefined} transition style={{zIndex: 10000}}>
              {({ TransitionProps, placement }) => (
                  <Grow
                      {...TransitionProps}
                      style={{
                        transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                      }}
                  >
                    <Paper style={{backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light, color: "white"}}>
                      <ClickAwayListener onClickAway={() => setDropdownOpen(false)}>
                        <MenuList id="split-button-menu">
                          {dropDownOptions.map((option, index) => (
                              <MenuItem
                                  key={"index" + index}
                                  onClick={(event) => handleMenuItemClick(event, index)}
                              >
                                {option.name}
                              </MenuItem>
                          ))}
                        </MenuList>
                      </ClickAwayListener>
                    </Paper>
                  </Grow>
              )}
            </Popper>
            </>
        }
        {dnd &&
            <div style={{display: "flex", }}><AlarmIcon color={"warning"} /> Info/Warning messages snoozed</div>
        }
      </div>
  )
}
const stillDoNotDisturb = () => {
  let doNotDisturbData = localStorage.getItem('dnd');
  if(doNotDisturbData === null){
    localStorage.setItem("dnd", JSON.stringify({
      "doNotDisturb": false,
      "doNotDisturbTimeStart": new Date()
    }));
    return false;
  }
  doNotDisturbData = JSON.parse(doNotDisturbData);
  if(!doNotDisturbData.doNotDisturb){return false}
  let diff = Math.abs(new Date() - (new Date(doNotDisturbData.doNotDisturbTimeStart)));
  if(diff < doNotDisturbData.doNotDisturbMinutes * 60 * 1000){
    // still hasn't been 10 min yet, don't disturb
    return true
  }
  localStorage.setItem("dnd", JSON.stringify({
    "doNotDisturb": false,
    "doNotDisturbTimeStart": new Date()
  }));
  return false; // disturb now!
}
export const snackActions = {
  success(msg, options) {
    toast(msg, {position: toast.POSITION.TOP_CENTER, type: "success", ...options});
  },
  warning(msg, options) {
    if(stillDoNotDisturb()){
      return;
    }
    toast(msg, {position: toast.POSITION.TOP_CENTER, type: "warning", closeButton: CloseButton, ...options});
  },
  info(msg, options) {
    if(stillDoNotDisturb()){
      return;
    }
    toast(msg, {position: toast.POSITION.TOP_CENTER, type: "info", closeButton: CloseButton, ...options});
  },
  error(msg, options) {
    toast(msg, {position: toast.POSITION.TOP_CENTER, type: "error", ...options});
  },
  update(msg, toastID, options) {
    if(toast.isActive){
      toast.update(toastID, {...options, render: msg});
    }    
  },
  loading(msg, options) {
    toast.loading(msg,{position: toast.POSITION.TOP_CENTER, ...options})
  },
  dismiss(){
    toast.dismiss();
    toast.clearWaitingQueue();
  },
  clearAll(){
    toast.dismiss();
    toast.clearWaitingQueue();
  }
}