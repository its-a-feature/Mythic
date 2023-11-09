import React, {useEffect} from 'react';
import {gql, useSubscription} from '@apollo/client';
import {snackActions} from './utilities/Snackbar';

//fromNow must be in ISO format for hasura/postgres stuff
//new Date().toISOString() will do it
/*
const subscribe_payloads = gql`
subscription EventFeedNotificationSubscription($fromNow: timestamp!, $operation_id: Int!) {
  operationeventlog(limit: 1, where: {deleted: {_eq: false}, timestamp: {_gte: $fromNow}, operation_id: {_eq: $operation_id}}, order_by: {id: desc}) {
    operator {
        username
    }
    id
    message
    level
    resolved
    source
  }
}
 `;
 */
 const subscribe_payloads = gql`
 subscription EventFeedNotificationSubscription($fromNow: timestamp!) {
   operationeventlog_stream(cursor: {initial_value: {timestamp: $fromNow}, ordering: ASC}, batch_size: 1, where: {deleted: {_eq: false}}) {
     operator {
         username
     }
     id
     message
     level
     resolved
     source
   }
 }
  `;

export function EventFeedNotifications(props) {
    const me = props.me;
    const fromNow = React.useRef( (new Date()).toISOString() );
    const { loading, error, data } = useSubscription(subscribe_payloads, {
        variables: {fromNow: fromNow.current}, 
        fetchPolicy: "no-cache",
        shouldResubscribe: true,
        onError: (errorData) => {
            snackActions.warning("Failed to get event notifications");
        }
    });

    useEffect( () => {
        //console.log(data, loading, error, fromNow.current);
        if(!loading && !error && data && data.operationeventlog_stream.length > 0){
            if(data.operationeventlog_stream[0].source === "debug" || data.operationeventlog_stream[0].level === "debug" ){
                return;
            }
            if(data.operationeventlog_stream[0].resolved){
                return;
            }
            if(data.operationeventlog_stream[0].operator){
                const message = data.operationeventlog_stream[0].operator.username + ":\n" + data.operationeventlog_stream[0].message;
                if (data.operationeventlog_stream[0].level === "warning") {
                    snackActions.warning(message, { autoClose: 2000});
                } else {
                    snackActions.info(message, { autoClose: 2000});
                }

            }else {
                if (data.operationeventlog_stream[0].level === "warning") {
                    snackActions.warning(data.operationeventlog_stream[0].message, {autoClose: 3000});
                } else {
                    snackActions.info(
                        <div style={{width: "100%"}}>{data.operationeventlog_stream[0].message}</div>,
                    {autoClose: 3000});
                }

            }
        }else if(error){
            console.error(error);
            snackActions.error("Mythic encountered an error getting operational event stream", {autoHideDuration: 2000});
        }
    }, [loading, data, error, me.user]);
    return null;
}

