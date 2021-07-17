import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';

export function EventFeedTableEventsActions(props){
    const [anchorEl, setAnchorEl] = React.useState(null);
    
    const onUpdateResolution = () => {
        handleClose();
        props.onUpdateResolution({id: props.id, resolved: !props.resolved});
    }
    const onUpdateLevel = () => {
        handleClose();
        props.onUpdateLevel({id:props.id});
    }
    const handleClose = () => {
        setAnchorEl(null);
      };
    const onUpdateDeleted = () => {
        handleClose();
        props.onUpdateDeleted({id:props.id});
    }
    const getSurroundingEvents = () => {
        handleClose();
        props.getSurroundingEvents({id:props.id});
    }
    const handleClick = React.useCallback((e) => {
        setAnchorEl(e.currentTarget)
    }, []);
    return (
        <ListItemSecondaryAction>
            <IconButton aria-controls={"eventmenu" + props.id} aria-haspopup="true" onClick={handleClick}><MoreVertIcon/></IconButton>
                <Menu elevation={5} id={"eventmenu" + props.id} anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} >
                    {
                        props.level === "warning" && props.resolved ? (
                            <MenuItem onClick={onUpdateResolution}>Unresolve</MenuItem>
                        ) : ( props.level === "warning" && !props.resolved ? (
                            <MenuItem onClick={onUpdateResolution}>Resolve</MenuItem>
                            ) : (
                            <MenuItem onClick={onUpdateLevel}>Make Warning</MenuItem>
                            )
                        )
                    }
                    <MenuItem onClick={getSurroundingEvents}>Get Surrounding Events</MenuItem>
                    <MenuItem onClick={onUpdateDeleted}><DeleteIcon/>Delete</MenuItem>
                </Menu>
            </ListItemSecondaryAction>
        )
}

