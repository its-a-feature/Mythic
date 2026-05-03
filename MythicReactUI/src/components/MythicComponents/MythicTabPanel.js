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
import Badge from '@mui/material/Badge';
import {useTheme} from '@mui/material/styles';
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
export function a11yProps(index) {
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
        highlight,
        newDataForTab,
        ...other
    } = props;
    const onClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        onCloseTab({ tabID: tabInfo.tabID, index: index });
    };
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const dropdownAnchorRef = React.useRef(null);
    const theme = useTheme();
    const handleContextClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
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
        <Draggable draggableId={`callbacks-tab-${tabInfo.tabID}`} index={index} disableInteractiveElementBlocking={true}>
            {(provided, snapshot) => (
                <div ref={provided.innerRef}
                    {...provided.draggableProps}>
                    {(() => {
                        const selected = selectedIndex === index || snapshot.isDragging;
                        const tabAccent = tabInfo?.color || theme.palette.primary.main;
                        return (
                    <Tab
                        label={
                            <span onContextMenu={handleContextClick} style={{}} ref={dropdownAnchorRef}>
                                <Badge color="success" variant="dot" invisible={!highlight} >
                                    {label}
                                </Badge>
                                <IconButton component='div' size='small' onClick={onClick} {...other}>
                                    <CloseIcon />
                                </IconButton>
                            </span>
                        }
                        {...a11yProps(index)}
                        {...other}
                        {...provided.dragHandleProps}
                        style={{
                            padding: "0px 6px",
                            margin: "0 3px 0 0",
                            minHeight: "32px",
                            borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
                            border: `1px solid ${theme.borderColor}`,
                            borderTop: `2px solid ${selected ? tabAccent : "transparent"}`,
                            borderBottom: selected ? `1px solid ${theme.palette.background.paper}` : `1px solid ${theme.borderColor}`,
                            backgroundColor: selected ? theme.palette.background.paper : theme.surfaces?.muted,
                            color: theme.palette.text.primary,
                        }}
                    />
                        );
                    })()}
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
