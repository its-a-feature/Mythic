import React from 'react';
import Typography from '@mui/material/Typography';
import { toLocalTime } from '../../utilities/Time';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import makeStyles from '@mui/styles/makeStyles';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import {useTheme} from '@mui/material/styles';
import {EventFeedTableEventsActions} from './EventFeedTableEventsActions';

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
    const theme = useTheme();
    const me = useReactiveVar(meState);

    return (
            <ListItem alignItems="flex-start" style={{...props.style, margin: 0, padding: "0 0 0 10px"}}>
                <ListItemAvatar style={{margin: "0 0 0 0", paddingTop: "10px"}}>
                    <Avatar style={{padding: "0 0 0 0", margin: "0 0 0 0"}}>
                        {props.operator ? props.operator.username[0] : "M"}
                    </Avatar>
                </ListItemAvatar>
                <ListItemText disableTypography style={{margin: "0 0 0 0"}}
                    primary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body1"
                            className={classes.inline}
                            style={{fontWeight: "bold", margin: 0, padding: 0}}
                          >
                            {props.operator ? props.operator.username : "Mythic"}
                            {props.count > 1 ? " ( " + props.count + " )" : ""}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            className={classes.inline}
                            style={{margin: "0 0 0 10px"}}
                            >
                            {toLocalTime(props.timestamp, me.user.view_utc_time)}
                            </Typography>
                        </React.Fragment>
                    }
                    secondary={
                          <pre style={{overflowX: "auto", width: "max-content", maxWidth: "97%", margin: "0 0 0 0", 
                          borderRadius: "9px", padding: "5px", 
                          backgroundColor: props.level === "warning" && props.resolved ? theme.palette.textBackgroundColorSuccess : (props.level === "warning" && !props.resolved ? theme.palette.textBackgroundColorError : (props.operator ? theme.palette.textBackgroundColor : theme.palette.textBackgroundColorMythic))}}>
                            {props.message}</pre>
                    }
                />
                <EventFeedTableEventsActions id={props.id} level={props.level} 
                  onUpdateDeleted={props.onUpdateDeleted}
                  onUpdateResolution={props.onUpdateResolution} 
                  onUpdateLevel={props.onUpdateLevel} 
                  getSurroundingEvents={props.getSurroundingEvents} 
                  resolved={props.resolved}/>

            </ListItem>
        )
}


