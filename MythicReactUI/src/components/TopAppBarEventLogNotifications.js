import React from 'react';
import {useSubscription, gql } from '@apollo/client';
import Badge from '@mui/material/Badge';
import NotificationsActiveTwoToneIcon from '@mui/icons-material/NotificationsActiveTwoTone';
import { Link } from 'react-router-dom';
import { IconButton } from '@mui/material';
import {snackActions} from './utilities/Snackbar';
import {MythicStyledTooltip} from "./MythicComponents/MythicStyledTooltip";

const SUB_Event_Logs = gql`
subscription OperationAlertCounts{
  operation_stream(cursor: {initial_value: {updated_at: "1970-01-01"}, ordering: ASC}, batch_size: 1) {
    id
    alert_count
  }
}
 `;

export function TopAppBarEventLogNotifications(props) {
  const { loading, error, data } = useSubscription(SUB_Event_Logs, {
    onError: data => {
        snackActions.error("Mythic encountered an error getting event log messages: " + data.toString());
        console.error(data);
    }
  });

    return (
            <MythicStyledTooltip title="Event Feed">
                <IconButton
                    color="inherit"
                    component={Link}
                    disableFocusRipple={true}
                    disableRipple={true}
                    to='/new/EventFeed'
                    style={{float: "right"}}>
                    {error ? (
                        <Badge color="secondary" badgeContent={0}>
                            <NotificationsActiveTwoToneIcon fontSize={"large"}  />
                        </Badge>
                    ) : (
                        <Badge badgeContent={data?.operation_stream[0]?.alert_count || 0}
                               color="error" max={99}
                               sx={{marginTop: "3px"}}
                        >
                            <NotificationsActiveTwoToneIcon fontSize={"large"}
                            style={{marginTop: "-3px"}}/>
                        </Badge>
                    )}
                </IconButton>
            </MythicStyledTooltip>
    );
}
export function TopAppBarVerticalEventLogNotifications(props) {
    const { loading, error, data } = useSubscription(SUB_Event_Logs, {
        onError: data => {
            snackActions.error("Mythic encountered an error getting event log messages: " + data.toString());
            console.error(data);
        }
    });

    return (
            error ? (
                <Badge color="secondary" badgeContent={0}>
                    <NotificationsActiveTwoToneIcon style={{color: "white"}} fontSize={"medium"}  />
                </Badge>
            ) : (
                <Badge badgeContent={data?.operation_stream[0]?.alert_count || 0}
                       color="error" max={99}
                >
                    <NotificationsActiveTwoToneIcon style={{color: "white"}} fontSize={"medium"}/>
                </Badge>
            )
    );
}

