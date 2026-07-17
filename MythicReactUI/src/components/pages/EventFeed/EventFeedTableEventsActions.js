import {MythicActionButton} from "../../MythicComponents/MythicActionButton";
import React from 'react';
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
    const handleClick = React.useCallback((e) => {
        setAnchorEl(e.currentTarget)
    }, []);
    return (
        <ListItemSecondaryAction >
            <MythicActionButton iconOnly
                aria-controls={"eventmenu" + props.id}
                aria-haspopup="true"
                appearance="raised"
                onClick={handleClick}
                size="small"><MoreVertIcon fontSize="small" />
            </MythicActionButton>
                <Menu elevation={5} id={"eventmenu" + props.id} anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} >
                    {
                        props.warning && props.resolved ? (
                            <MenuItem onClick={onUpdateResolution}>Unresolve</MenuItem>
                        ) : ( props.warning && !props.resolved ? (
                            <MenuItem onClick={onUpdateResolution}>Resolve</MenuItem>
                            ) : (
                            <MenuItem onClick={onUpdateLevel}>Make Warning</MenuItem>
                            )
                        )
                    }
                </Menu>
            </ListItemSecondaryAction>
    );
}
