import React from 'react';
import {useSubscription, gql } from '@apollo/client';
import Badge from '@mui/material/Badge';
import NotificationsActiveTwoToneIcon from '@mui/icons-material/NotificationsActiveTwoTone';
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

export function TopAppBarVerticalEventLogNotifications(props) {
    const theme = useTheme();
    const [alerts, setAlerts] = React.useState(alertCount());
    const { loading, error } = useSubscription(SUB_Event_Logs, {
        onError: data => {
            console.log("vertical event log error")
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

