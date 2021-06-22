import React from 'react';
import {useSubscription, gql } from '@apollo/client';
import Badge from '@material-ui/core/Badge';
import MailIcon from '@material-ui/icons/Mail';
import { Link } from 'react-router-dom';
import { IconButton } from '@material-ui/core';
import CircularProgress from '@material-ui/core/CircularProgress';
import ErrorIcon from '@material-ui/icons/Error';
import {snackActions} from './utilities/Snackbar';

const SUB_Event_Logs = gql`
subscription MySubscription {
  operationeventlog_aggregate(where: {deleted: {_eq: false}, level: {_eq: "warning"}, resolved: {_eq: false}}) {
    aggregate{
        count
    }
  }
}
 `;
 
 
export function TopAppBarNotifications(props) {
  const { loading, error, data } = useSubscription(SUB_Event_Logs, {
    onError: data => {
        snackActions.error("Mythic encountered an error getting event log messages: " + data.toString());
        console.error(data);
    }
  });

    return (    
        <IconButton color="inherit" component={Link} to='/new/EventFeed'>
            { 
                loading ? (
                    <Badge color="secondary" badgeContent={0}>
                        <CircularProgress size={20} thickness={4} />
                    </Badge>
                ) : 
                
                (
                    error ? (
                        <Badge color="secondary" badgeContent={0}>
                            <ErrorIcon />
                        </Badge>
                    ) : (
                        <Badge color="secondary" badgeContent={data.operationeventlog_aggregate.aggregate.count}>
                            <MailIcon />
                        </Badge>
                    )
                )
                
            }
            
        </IconButton>
    );
}

