import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Tab from '@mui/material/Tab';
import React from 'react';
import { useCallback } from 'react';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';

export function MythicTabPanel(props) {
    const { children, value, index, maxHeight, tabInfo, getCallbackData, queryParams, changeSearchParam, ...other } =
        props;
    const style =
        props.style === undefined
            ? {
                  display: value === index ? 'flex' : 'none',
                  flexDirection: 'column',
                  flexGrow: 1,
                  width: '100%',
                  maxWidth: '100%',
                  overflowY: "auto",
              }
            : props.style;
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`scrollable-auto-tabpanel-${index}`}
            aria-labelledby={`scrollable-auto-tab-${index}`}
            style={style}
            {...other}>
            {<React.Fragment>{children}</React.Fragment>}
        </div>
    );
}
function a11yProps(index) {
    return {
        id: `scrollable-auto-tab-${index}`,
        'aria-controls': `scrollable-auto-tabpanel-${index}`,
    };
}
function allowDrop(ev) {
    ev.preventDefault();
 }
 
 function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.dataTransfer.setData("opacity", ev.target.style.opacity);
    ev.target.style.opacity = "0.2";
 }

 function onDragEnter(ev){
    let node = ev.target.getAttribute("role") === "tab" ? ev.target : ev.target.closest('[role="tab"]');
    node.style.borderLeft = "3px dotted red";
    //console.log("ondragenter");
 }

 function onDragLeave(ev){
    let node = ev.target.closest('[role="tab"]');
    if(ev.target.getAttribute("role") === "tab"){
        //console.log("leaving tab", ev.target)
        node.style.border = "";
    } else if(node.contains(ev.target)){
        //console.log("onDragLeave, nodeContains", node, ev.target)
    }else{
        node.style.border = "";
        //console.log("onDragLeave, not contains", node, ev.target)
    }
 }
 
 function drop(ev) {
    // shares dataTransfer with drag function
   ev.preventDefault();
   const data = ev.dataTransfer.getData("text");
   const tabList = ev.target.closest("div[role='tablist']"); 
   let node = ev.target.getAttribute("role") === "tab" ? ev.target : ev.target.closest('[role="tab"]');
   //console.log(tabList, data, node.nextSibling);
   node.style.border = "";
   document.getElementById(data).style.opacity = ev.dataTransfer.getData("opacity");
   for(let i = 0; i < tabList.children.length; i++){
        tabList.children[i].style.border = "";
   }
   //tabList.insertBefore(document.getElementById(data), node.nextSibling);
   //console.log("selected", data, "toLeftOf", node.id);
   return {"selected": data, "toLeftOf": node.id};
 }
export function MythicTabLabel(props) {
    const {
        label,
        index,
        fullWidth,
        maxHeight,
        contextMenuOptions,
        onCloseTab,
        selectionFollowsFocus,
        textColor,
        indicator,
        tabInfo,
        onEditTabDescription,
        getCallbackData,
        onDragTab,
        ...other
    } = props;
    const onClick = (e) => {
        e.stopPropagation();
        onCloseTab({ tabID: tabInfo.tabID, index: index });
    };
    const theme = useTheme();
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const dropdownAnchorRef = React.useRef(null);
    const handleContextClick = (event) => {
        event.preventDefault();
        if(contextMenuOptions && contextMenuOptions.length > 0){
            setOpenContextMenu(true);
        }
    }
    const handleMenuItemClick = (event, menuIndex) => {
        contextMenuOptions[menuIndex].click({event, index});
        setOpenContextMenu(false);
    };
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }
        setOpenContextMenu(false);
      };
    return (
        <Tab
            onDrop={(ev) => onDragTab(drop(ev))}
            onDragOver={allowDrop}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            draggable={onDragTab ? true : false}
            onDragStart={drag}
            label={
                <span onContextMenu={handleContextClick} style={{ display: 'inline-block', zIndex: 1}} ref={dropdownAnchorRef}>
                    {label}
                    <IconButton component='div' size='small' onClick={onClick} {...other}>
                        <CloseIcon />
                    </IconButton>
                    <Popper open={openContextMenu} anchorEl={dropdownAnchorRef.current} role={undefined} transition style={{zIndex: 40}}>
                  {({ TransitionProps, placement }) => (
                    <Grow
                      {...TransitionProps}
                      style={{
                        transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                      }}
                    >
                      <Paper variant="outlined" style={{backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light, color: "white"}}>
                        <ClickAwayListener onClickAway={handleClose}>
                          <MenuList id="split-button-menu"  >
                            {contextMenuOptions.map((option, index) => (
                              <MenuItem
                                key={option.name + index}
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
                </span>
            }
            
            {...a11yProps(index)}
            {...other}
            style={{padding: "0px 5px 0px 5px"}}
        />
    );
}
export function MythicSearchTabLabel(props) {
    const { label, index, fullWidth, maxHeight, selectionFollowsFocus, textColor, indicator, iconComponent, ...other } =
        props;
    return (
        <Tab
            label={
                <span>
                    {label}
                    <br />
                    {iconComponent}
                </span>
            }
            {...a11yProps(index)}
            {...other}
        />
    );
}
