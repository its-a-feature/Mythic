import React from 'react';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { toLocalTime } from '../../utilities/Time';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import {EventFeedTableEventsActions} from './EventFeedTableEventsActions';
import {MythicStatusChip} from '../../MythicComponents/MythicStatusChip';

const PREFIX = 'EventFeedTableEvents';

const classes = {
    root: `${PREFIX}-root`,
    inline: `${PREFIX}-inline`
};

const StyledListItem = styled(ListItem)((
    {
        theme
    }
) => ({
    [`& .${classes.root}`]: {
      width: '100%',
    },

    [`& .${classes.inline}`]: {
      display: 'inline',
    }
}));

const GetEventStatusChip = ({message}) => {
    if(message.warning){
        return (
            <MythicStatusChip
                label={message.resolved ? "Resolved" : "Warning"}
                status={message.resolved ? "success" : "error"}
                sx={{mr: 1, flex: "0 0 auto"}}
            />
        );
    }
    return (
        <MythicStatusChip
            label={message.level}
            status={message.level === "warning" ? "warning" : "info"}
            sx={{mr: 1, flex: "0 0 auto"}}
        />
    );
}
export function EventFeedTableEvents(props){

    const me = useReactiveVar(meState);

    return (
        <StyledListItem alignItems="flex-start" style={{...props.style, margin: 0, padding: "0 0 0 10px"}}>
            <ListItemText disableTypography style={{margin: "0 0 0 0", flexGrow: 1, overflowX: 'auto'}}
                primary={
                    <React.Fragment>
                    <Typography
                        component="span"
                        variant="caption"
                        className={classes.inline}
                        style={{margin: "0 0 0 0px"}}
                    >
                        {toLocalTime(props.timestamp, me?.user?.view_utc_time || false)}
                    </Typography>
                      <Typography
                        component="span"
                        variant="body1"
                        className={classes.inline}
                        style={{fontWeight: "bold", margin: 0, padding: 0}}
                      >
                        {props.count > 1 ? " ( " + props.count + " )" : ""}
                      </Typography>

                    </React.Fragment>
                }
                secondary={
                <div style={{display: "flex", alignItems: "flex-start", overflowX: "auto"}}>
                    <GetEventStatusChip message={props} />
                    <pre style={{  margin: "0 0 0 0px", overflowX: "auto", maxWidth: "90%", wordBreak: "break-all", whiteSpace: "pre-wrap"}}>
                        {props.message}
                    </pre>
                </div>
                }
            />
            <EventFeedTableEventsActions id={props.id} level={props.level} warning={props.warning}
              onUpdateResolution={props.onUpdateResolution}
              onUpdateLevel={props.onUpdateLevel}
              resolved={props.resolved}/>
        </StyledListItem>
    );
}

