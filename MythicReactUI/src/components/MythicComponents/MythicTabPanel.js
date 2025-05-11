import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Tab from '@mui/material/Tab';
import React from 'react';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import {
    Draggable,
} from "@hello-pangea/dnd";

export function MythicTabPanel(props) {
    const { children, value, index, maxHeight, tabInfo, getCallbackData, queryParams, changeSearchParam, showDeleted, ...other } =
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
        selectedIndex,
        ...other
    } = props;
    const onClick = (e) => {
        //e.stopPropagation();
        onCloseTab({ tabID: tabInfo.tabID, index: index });
    };
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
        <Draggable draggableId={`callbacks-tab-${label}`} index={index} disableInteractiveElementBlocking={true}>
            {(provided, snapshot) => (
                <div ref={provided.innerRef}
                    {...provided.draggableProps}>
                    <Tab
                        className={selectedIndex === index || snapshot.isDragging ? "selectedCallback" : "" }
                        label={
                            <span onContextMenu={handleContextClick} style={{}} ref={dropdownAnchorRef}>
                                {label}
                                <IconButton component='div' size='small' onClick={onClick} {...other}>
                                    <CloseIcon />
                                </IconButton>
                            </span>
                        }
                        {...a11yProps(index)}
                        {...other}
                        {...provided.dragHandleProps}
                        style={{padding: "0px 5px 0px 5px", borderRadius: "4px", margin: 0,
                            borderBottom: selectedIndex === index ? `2px solid grey` : '',
                            backgroundColor: selectedIndex === index ? tabInfo.color : snapshot.isDragging ? tabInfo.color : ""}}
                    />
                    <Popper open={openContextMenu} anchorEl={dropdownAnchorRef.current} role={undefined} transition style={{zIndex: 40}}>
                        {({ TransitionProps, placement }) => (
                            <Grow
                                {...TransitionProps}
                                style={{
                                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                                }}
                            >
                                <Paper variant="outlined" className={"dropdownMenuColored"}>
                                    <ClickAwayListener onClickAway={handleClose} mouseEvent={"onMouseDown"}>
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
                </div>

            )}
        </Draggable>
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
