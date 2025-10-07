import { toast } from 'react-toastify';
import NotificationsPausedIcon from '@mui/icons-material/NotificationsPaused';
import AlarmIcon from '@mui/icons-material/Alarm';
import Button from '@mui/material/Button';
import React from 'react';
import ButtonGroup from '@mui/material/ButtonGroup';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import SnoozeIcon from '@mui/icons-material/Snooze';
import {Dropdown, DropdownMenuItem} from "../MythicComponents/MythicNestedMenus";
import {getSkewedNow} from "./Time";
import {MythicStyledTooltip} from "../MythicComponents/MythicStyledTooltip";

export const CloseButton = ({ closeToast }) => {
  const dropdownAnchorRef = React.useRef(null);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dndWithTime = (doNotDisturbMinutes) => {
    localStorage.setItem("dnd", JSON.stringify({
      "doNotDisturb": true,
      "doNotDisturbTimeStart": getSkewedNow(),
      "doNotDisturbMinutes": doNotDisturbMinutes
    }))
    snackActions.clearAll()
  }
  const dropDownOptions = [
    {
      name: <div><AlarmIcon /> 5min</div>,
      click: () => {
        dndWithTime(5);
      }
    },
    {
      name: <div><AlarmIcon /> 30min</div>,
      click: () => {
        dndWithTime(30);
      }
    },
    {
      name: <div><AlarmIcon /> 1hr</div>,
      click: () => {
        dndWithTime(60);
      }
    },
    {
      name: <div><AlarmIcon /> 4hr</div>,
      click: () => {
        dndWithTime(60 * 4);
      }
    },
    {
      name: <div><SnoozeIcon /> 24hr</div>,
      click: () => {
        dndWithTime(60 * 24);
      }
    },
  ]
  const handleMenuItemClick = (event, index) => {
    dropDownOptions[index].click();
    setDropdownOpen(false);
  };
  const [dnd, setDnd] = React.useState(stillDoNotDisturb());
  return (
      <div  >
        {!dnd &&
            <>
            <ButtonGroup ref={dropdownAnchorRef} aria-label="split button" size={"small"}
                         style={{ float: "right", width: "70px"}}>
              <Button  aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                      aria-expanded={dropdownOpen ? 'true' : undefined}
                      aria-haspopup="menu" size={"small"}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropdownOpen(!dropdownOpen)
                      }}>
                <MythicStyledTooltip title={"Snooze Info and Warning messages for a period of time. Revert this at any time in your settings"}>
                  <NotificationsPausedIcon color={"error"} /> <ArrowDropDownIcon />
                </MythicStyledTooltip>
              </Button>
            </ButtonGroup>
              {dropdownOpen &&
                  <ClickAwayListener  mouseEvent={"onMouseDown"}
                      onClickAway={() => setDropdownOpen(false)}>
                    <Dropdown
                        isOpen={dropdownAnchorRef.current}
                        onOpen={setDropdownOpen}
                        externallyOpen={dropdownOpen}
                      menu={
                      dropDownOptions.map((option, index) => (
                            <DropdownMenuItem
                                key={option.name}
                                disabled={option.disabled}
                                onClick={(event) => handleMenuItemClick(event, index)}
                            >
                              {option.name}
                            </DropdownMenuItem>
                        ))}
                        />
                    </ClickAwayListener>
              }
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
const ToastComponent = ({msg, closeButton}) => {
  return (
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%"}}>
        {msg}
        {closeButton}
      </div>
  )
}
export const snackActions = {
  success(msg, options) {
    if(document.hidden){return}
    toast(msg, {position: "top-center", type: "success", onClick: this.dismiss, ...options});
  },
  warning(msg, options) {
    if(document.hidden){return}
    if(stillDoNotDisturb()){
      return;
    }
    toast(<ToastComponent msg={msg} closeButton={<CloseButton/>}/>, {position: "top-center", type: "warning", onClick: this.dismiss, ...options});
  },
  info(msg, options) {
    if(document.hidden){return}
    if(stillDoNotDisturb()){
      return;
    }
    toast(<ToastComponent msg={msg} closeButton={<CloseButton/>}/>, {position: "top-center", type: "info", onClick: this.dismiss, ...options});
  },
  error(msg, options) {
    if(document.hidden){return}
    toast(msg, {position: "top-center", type: "error", onClick: this.dismiss, ...options});
  },
  update(msg, toastID, options) {
    if(document.hidden){return}
    if(toast.isActive){
      toast.update(toastID, {...options, render: msg});
    }    
  },
  loading(msg, options) {
    if(document.hidden){return}
    toast.loading(msg,{position: "top-center", ...options})
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