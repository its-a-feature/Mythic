import React from 'react';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';

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
            <IconButton
                aria-controls={"eventmenu" + props.id}
                aria-haspopup="true"
                onClick={handleClick}
                size="large"><MoreVertIcon/></IconButton>
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
    );
}

