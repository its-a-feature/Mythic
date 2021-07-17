import React, {useEffect} from 'react';
import {gql, useSubscription} from '@apollo/client';
import { meState } from '../cache';
import { useReactiveVar } from '@apollo/client';
import {snackActions} from './utilities/Snackbar';

//fromNow must be in ISO format for hasura/postgres stuff
//new Date().toISOString() will do it
const subscribe_payloads = gql`
subscription EventFeedNotificationSubscription($fromNow: timestamp!) {
  operationeventlog(limit: 1, where: {deleted: {_eq: false}, timestamp: {_gte: $fromNow}}, order_by: {timestamp: desc}) {
    operator {
        username
    }
    message
    level
    resolved
    source
  }
}
 `;

export function EventFeedNotifications(props) {
    const [fromNow, setFromNow] = React.useState(null);
    const me = useReactiveVar(meState);
    const { loading, error, data } = useSubscription(subscribe_payloads, {variables: {fromNow}});
    useEffect( () => {
        setFromNow(new Date().toISOString());
    }, []);
    useEffect( () => {
        //console.log(data, loading, error);
        if(!loading && !error && data && data.operationeventlog.length > 0){
            if(data.operationeventlog[0].source === "debug"){
                return;
            }
            if(data.operationeventlog[0].operator && me.user.username !== data.operationeventlog[0].operator.username){
                const message = data.operationeventlog[0].operator.username + ":" + data.operationaleventlog[0].message;
                snackActions.toast(message, data.operationeventlog[0].level, { autoHideDuration: 4000});
            }else if(!data.operationeventlog[0].operator){
                snackActions.toast(data.operationeventlog[0].message, data.operationeventlog[0].level, {autoHideDuration: 4000});
            }
        }else if(error){
            console.error(error);
            snackActions.warning("Mythic encountered an error getting operational event stream", {autoHideDuration: 2000});
        }
    }, [loading, data, error, me.user]);
    return (    
       null
    );
}

