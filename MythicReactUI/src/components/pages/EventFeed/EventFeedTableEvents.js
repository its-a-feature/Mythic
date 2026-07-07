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
      margin: 0,
      overflowX: 'auto',
    },

    [`& .${classes.inline}`]: {
      display: 'inline',
      margin: 0,
    }
}));

const GetEventStatusChip = ({message}) => {
    if(message.warning || message.level === "warning"){
        return (
            <MythicStatusChip
                label={message.resolved ? "Resolved" : "Warning"}
                status={message.resolved ? "success" : "error"}
            />
        );
    }
    return (
        <MythicStatusChip
            label={message.level}
            status={message.level === "warning" ? "warning" : "info"}
        />
    );
}
export function EventFeedTableEvents(props){

    const me = useReactiveVar(meState);
    const isWarning = props.warning || props.level === "warning";

    return (
        <StyledListItem alignItems="flex-start" className={classes.root}>
            <ListItemText disableTypography className={classes.root}
                primary={
                    <React.Fragment>
                    <Typography
                        component="span"
                        variant="caption"
                        className={classes.inline}
                    >
                        {toLocalTime(props.timestamp, me?.user?.view_utc_time || false)}
                    </Typography>
                      <Typography
                        component="strong"
                        variant="body1"
                        className={classes.inline}
                      >
                        {props.count > 1 ? " ( " + props.count + " )" : ""}
                      </Typography>

                    </React.Fragment>
                }
                secondary={
                <div className="mythic-search-result-inline mythic-search-result-inline-nowrap">
                    <GetEventStatusChip message={props} />
                    <pre className="mythic-search-result-code">
                        {props.message}
                    </pre>
                </div>
                }
            />
            <EventFeedTableEventsActions id={props.id} level={props.level} warning={isWarning}
              onUpdateResolution={props.onUpdateResolution}
              onUpdateLevel={props.onUpdateLevel}
              resolved={props.resolved}/>
        </StyledListItem>
    );
}
