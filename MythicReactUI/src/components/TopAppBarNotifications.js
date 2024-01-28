import React from 'react';
import {useSubscription, gql } from '@apollo/client';
import Badge from '@mui/material/Badge';
import NotificationsActiveTwoToneIcon from '@mui/icons-material/NotificationsActiveTwoTone';
import { Link } from 'react-router-dom';
import { IconButton } from '@mui/material';
import {snackActions} from './utilities/Snackbar';
import { meState } from '../cache';
import { useReactiveVar } from '@apollo/client';
import {MythicStyledTooltip} from "./MythicComponents/MythicStyledTooltip";

const SUB_Event_Logs = gql`
subscription MySubscription($operation_id: Int!) {
  operation_by_pk(id: $operation_id) {
    id
    alert_count
  }
}
 `;

export function TopAppBarNotifications(props) {
    const me = useReactiveVar(meState);

  const { loading, error, data } = useSubscription(SUB_Event_Logs, {
      variables: {operation_id: me?.user?.current_operation_id || 0},
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
                        <Badge badgeContent={data?.operation_by_pk?.alert_count || 0}  color="error">
                            <NotificationsActiveTwoToneIcon fontSize={"large"}  />
                        </Badge>
                    )}
                </IconButton>
            </MythicStyledTooltip>
    );
}

