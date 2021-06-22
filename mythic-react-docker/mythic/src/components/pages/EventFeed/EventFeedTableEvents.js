import React from 'react';
import Typography from '@material-ui/core/Typography';
import { toLocalTime } from '../../utilities/Time';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import { makeStyles } from '@material-ui/core/styles';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
import {ThemeContext} from 'styled-components';
import { useContext} from 'react';
import {muiTheme} from '../../../themes/Themes.js';
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

function EventFeedTableEventsFunc(props){
    const classes = useStyles();
    const theme = useContext(ThemeContext);
    const me = useReactiveVar(meState);

    return (
            <ListItem alignItems="flex-start" style={{...props.style, backgroundColor: props.level === "warning" && props.resolved ? muiTheme.palette.success.main : (props.level === "warning" && !props.resolved ? muiTheme.palette.error.main : theme.eventMessageBackgroundColor)}}>
                <ListItemAvatar>
                    <Avatar>
                        {props.operator ? props.operator.username[0] : "M"}
                    </Avatar>
                </ListItemAvatar>
                <ListItemText disableTypography
                    primary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body1"
                            className={classes.inline}
                            style={{fontWeight: "bold", color: theme.text, margin: 0, padding: 0}}
                          >
                            {props.operator ? props.operator.username : "Mythic"}
                            {props.count > 1 ? " ( " + props.count + " )" : ""}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            className={classes.inline}
                            style={{margin: "0 0 0 10px", color: theme.text}}
                            >
                            {toLocalTime(props.timestamp, me.user.view_utc_time)}
                            </Typography>
                        </React.Fragment>
                    }
                    secondary={
                          <pre style={{margin: "0 0 0 0", padding: "0 0 0 0"}}>{props.message}</pre>
                    }
                    style={{overflowX: "auto"}}
                />
                <EventFeedTableEventsActions id={props.id} level={props.level} 
                  onUpdateDeleted={props.onUpdateDeleted}
                  onUpdateResolution={props.onUpdateResolution} 
                  onUpdateLevel={props.onUpdateLevel} 
                  getSurroundingEvents={props.getSurroundingEvents} 
                  resolved={props.resolved} 
                  theme={theme}/>

            </ListItem>
        )
}
export const EventFeedTableEvents = React.memo(EventFeedTableEventsFunc, (prev, next) => {
    if(prev.count !== next.count || prev.level !== next.level || prev.resolved !== next.resolved){
        return false;
    }
    return true;
});

