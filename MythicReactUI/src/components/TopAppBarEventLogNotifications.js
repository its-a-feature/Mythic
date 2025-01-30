import React from 'react';
import {useSubscription, gql } from '@apollo/client';
import Badge from '@mui/material/Badge';
import NotificationsActiveTwoToneIcon from '@mui/icons-material/NotificationsActiveTwoTone';
import { Link } from 'react-router-dom';
import { IconButton } from '@mui/material';
import {MythicStyledTooltip} from "./MythicComponents/MythicStyledTooltip";
import { useTheme } from '@mui/material/styles';
import {alertCount} from "../cache";

const SUB_Event_Logs = gql`
subscription OperationAlertCounts{
  operation_stream(cursor: {initial_value: {updated_at: "1970-01-01"}, ordering: ASC}, batch_size: 1) {
    id
    alert_count
  }
}
 `;

export function TopAppBarEventLogNotifications(props) {
    const [alerts, setAlerts] = React.useState(alertCount());
    const { loading, error } = useSubscription(SUB_Event_Logs, {
        onError: data => {
            console.error(data);
        },
        onData: ({data}) => {

            const newAlertCount = data.data.operation_stream[0].alert_count;
            if(newAlertCount !== alerts){
                setAlerts(newAlertCount);
                alertCount(newAlertCount);
            }
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
                        <Badge color="secondary" badgeContent={"X"}>
                            <NotificationsActiveTwoToneIcon fontSize={"large"}  />
                        </Badge>
                    ) : (
                        <Badge badgeContent={alerts}
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
    const theme = useTheme();
    const [alerts, setAlerts] = React.useState(alertCount());
    const { loading, error } = useSubscription(SUB_Event_Logs, {
        onError: data => {
            console.error(data);
        },
        onData: ({data}) => {

            const newAlertCount = data.data.operation_stream[0].alert_count;
            if(newAlertCount !== alerts){
                setAlerts(newAlertCount);
                alertCount(newAlertCount);
            }
        }
    });

    return (
            error ? (
                <Badge color="secondary" badgeContent={"X"}>
                    <NotificationsActiveTwoToneIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"}  />
                </Badge>
            ) : (
                <Badge badgeContent={alerts}
                       color="error" max={99}
                >
                    <NotificationsActiveTwoToneIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"}/>
                </Badge>
            )
    );
}

