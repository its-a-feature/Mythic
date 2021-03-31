import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import DeleteIcon from '@material-ui/icons/Delete';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import {ThemeContext} from 'styled-components';
import { useContext} from 'react';
import { gql, useMutation } from '@apollo/client';

const Update_Resolution = gql`
mutation UpdateResolutionOperationEventLog($id: Int!, $resolved: Boolean!) {
  update_operationeventlog(where:{id: {_eq: $id}}, _set: {resolved: $resolved}) {
    returning{
        id
        resolved
    }
  }
}
 `;
 const Update_Level = gql`
mutation UpdateLevelOperationEventLog($id: Int!) {
  update_operationeventlog(where:{id: {_eq: $id}}, _set: {level: "warning"}) {
    returning{
        id
        level
    }
  }
}
 `;

function EventFeedTableEventsActionsFunc(props){
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [updateResolution] = useMutation(Update_Resolution);
    const [updateLevel] = useMutation(Update_Level);
    const onUpdateResolution = () => {
        handleClose();
        updateResolution({variables: {id: props.id, resolved: !props.resolved}});
    }
    const onUpdateLevel = (id) => {
        handleClose();
        updateLevel({variables: {id: props.id}});
    }
    const handleClose = () => {
        setAnchorEl(null);
      };
    const getErrorState =() =>{
        return props.level === "warning" && !props.resolved;
    }
    const getResolvedState = () => {
        return props.level === "warning" && props.resolved;
    }
    const onUpdateDeleted = () => {
        handleClose();
        props.onUpdateDeleted(props.id);
        
    }
    const handleClick = React.useCallback((e) => {
        setAnchorEl(e.currentTarget)
    });
    return (
                <ListItemSecondaryAction>
                    <IconButton aria-controls={"eventmenu" + props.id} aria-haspopup="true" onClick={handleClick} style={{color: props.theme.text}}><MoreVertIcon/></IconButton>
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
                            <MenuItem onClick={onUpdateDeleted}><DeleteIcon/>Delete</MenuItem>
                        </Menu>
                  </ListItemSecondaryAction>
        )
}
export const EventFeedTableEventsActions = React.memo(EventFeedTableEventsActionsFunc);
EventFeedTableEventsActions.whyDidYouRender = true;

