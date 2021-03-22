import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import DeleteIcon from '@material-ui/icons/Delete';
import { toLocalTime } from '../../utilities/Time';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';
import { makeStyles } from '@material-ui/core/styles';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import {ThemeContext} from 'styled-components';
import { useContext} from 'react';
import {muiTheme} from '../../../themes/Themes.js';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    maxWidth: '36ch',
  },
  inline: {
    display: 'inline',
  },
}));

export function EventFeedTableEvents(props){
    const classes = useStyles();
    const theme = useContext(ThemeContext);
    const [anchorEl, setAnchorEl] = React.useState(null);
    const me = useReactiveVar(meState);
    const handleClose = () => {
        setAnchorEl(null);
      };
    const getErrorState =() =>{
        return props.level === "warning" && !props.resolved;
    }
    const getResolvedState = () => {
        return props.level === "warning" && props.resolved;
    }
    const onUpdateResolution = () => {
        props.onUpdateResolution(props.id, !props.resolved);
        handleClose();
    }
    const onUpdateDeleted = () => {
        props.onUpdateDeleted(props.id);
        handleClose();
    }
    const onUpdateLevel = () => {
        props.onUpdateLevel(props.id);
        handleClose();
    }
    return (
            <ListItem alignItems="flex-start" style={{backgroundColor: getResolvedState() ? muiTheme.palette.success.main : (getErrorState() ? muiTheme.palette.error.main : theme.eventMessageBackgroundColor)}}>
                <ListItemAvatar>
                    <Avatar>
                        {props.operator ? props.operator.username[0] : "M"}
                    </Avatar>
                </ListItemAvatar>
                <ListItemText
                    primary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body1"
                            className={classes.inline}
                            style={{fontWeight: "bold", color: theme.text}}
                          >
                            {props.operator ? props.operator.username : "Mythic"}
                            {props.count > 1 ? " ( " + props.count + " )" : ""}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            className={classes.inline}
                            style={{marginLeft: "10px", color: theme.text}}
                            >
                            {toLocalTime(props.timestamp, me.user.view_utc_time)}
                            </Typography>
                        </React.Fragment>
                    }
                    secondary={
                        <React.Fragment>
                          <Typography
                            component="pre"
                            variant="body1"
                            className={classes.inline}
                            style={{"overflowWrap": "break-word", color: theme.text}}
                          >
                            {props.message}
                          </Typography>
                        </React.Fragment>
                    
                    }
                    style={{overflowX: "auto"}}
                />
                <ListItemSecondaryAction>
                    <IconButton aria-controls={"eventmenu" + props.id} aria-haspopup="true" onClick={(e)=>{setAnchorEl(e.currentTarget)}} style={{color: theme.text}}><MoreVertIcon/></IconButton>
                        <Menu elevation={5} id={"eventmenu" + props.id} anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleClose} >
                            {
                            getResolvedState() ? (
                                <MenuItem onClick={onUpdateResolution}>Unresolve</MenuItem>
                            ) : ( getErrorState() ? (
                                <MenuItem onClick={onUpdateResolution}>Resolve</MenuItem>
                                ) : (
                                <MenuItem onClick={onUpdateLevel}>Make Warning</MenuItem>
                                )
                            
                            )
                            }
                            <MenuItem onClick={onUpdateDeleted}><DeleteIcon/>Delete</MenuItem>
                        </Menu>
                  </ListItemSecondaryAction>
            </ListItem>
        )
}

