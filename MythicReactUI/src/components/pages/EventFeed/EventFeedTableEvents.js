import React from 'react';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { toLocalTime } from '../../utilities/Time';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import {useTheme} from '@mui/material/styles';
import {EventFeedTableEventsActions} from './EventFeedTableEventsActions';

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

const GetPreAdornment = ({message}) => {
    const theme = useTheme();
    const getColor = React.useCallback(() => {
        if(message.level === "warning"){
            if(message.resolved){
                return theme.palette.success.main;
            } else {
                return theme.palette.error.main;
            }
        }
        return theme.palette.info.main;
    }, [theme, message.level, message.resolved]);
    const getSymbol = React.useCallback(() => {
        if(message.level === "warning"){
            if(message.resolved){
                return "+";
            } else {
                return "!";
            }
        }
        return "*";
    }, [theme, message.level, message.resolved]);
    return (
        <>
            <p style={{display: "inline-block", fontWeight: "bold", color: getColor(), margin: "0 0 0 0"}}>[</p>
            <p style={{display: "inline-block", fontWeight: "bold", color: getColor(), margin: "0 0 0 0"}}>{getSymbol()}</p>
            <p style={{display: "inline-block", fontWeight: "bold", color: getColor(), margin: "0 10px 0 0"}}>]</p>
        </>
    )
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
                <div style={{display: "flex", overflowX: "auto"}}>
                    <GetPreAdornment message={props} />
                    <pre style={{  margin: "0 0 0 0px", overflowX: "auto", maxWidth: "90%", wordBreak: "break-all", whiteSpace: "pre-wrap"}}>
                        {props.message}
                    </pre>
                </div>
                }
            />
            <EventFeedTableEventsActions id={props.id} level={props.level}
              onUpdateResolution={props.onUpdateResolution}
              onUpdateLevel={props.onUpdateLevel}
              resolved={props.resolved}/>
        </StyledListItem>
    );
}


