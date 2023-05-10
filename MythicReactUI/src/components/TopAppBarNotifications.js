import React from 'react';
import {useSubscription, gql } from '@apollo/client';
import Badge from '@mui/material/Badge';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { Link } from 'react-router-dom';
import { IconButton, Tooltip } from '@mui/material';
import {snackActions} from './utilities/Snackbar';
import { meState } from '../cache';
import { useReactiveVar } from '@apollo/client';
import makeStyles from '@mui/styles/makeStyles';

const SUB_Event_Logs = gql`
subscription MySubscription($operation_id: Int!) {
  operation_by_pk(id: $operation_id) {
    id
    alert_count
  }
}
 `;
 
 const useStyles = makeStyles((theme) => ({
    tooltip: {
      backgroundColor: theme.palette.background.contrast,
      color: theme.palette.text.contrast,
      boxShadow: theme.shadows[1],
      fontSize: 13
    },
    arrow: {
      color: theme.palette.background.contrast,
    }
  }));
export function TopAppBarNotifications(props) {
    const me = useReactiveVar(meState);
    const classes = useStyles();
  const { loading, error, data } = useSubscription(SUB_Event_Logs, {
      variables: {operation_id: me?.user?.current_operation_id || 0},
    onError: data => {
        snackActions.error("Mythic encountered an error getting event log messages: " + data.toString());
        console.error(data);
    }
  });

    return (
        <IconButton
            color="inherit"
            component={Link}
            to='/new/EventFeed'
            style={{float: "right"}}
            size="large">
            <Tooltip title="Event Feed" arrow classes={{tooltip: classes.tooltip, arrow: classes.arrow}}>
            { 
                    error ? (
                        <Badge color="secondary" badgeContent={0}>
                            <NotificationsActiveIcon  />
                        </Badge>
                    ) : (
                        <Badge badgeContent={data?.operation_by_pk?.alert_count || 0} color="error">
                            <NotificationsActiveIcon  />
                        </Badge>
                    )
                                
            }
            </Tooltip>
        </IconButton>
    );
}

