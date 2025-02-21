import React, {useEffect} from 'react';
import {gql, useSubscription} from '@apollo/client';
import {snackActions} from './utilities/Snackbar';
import {getSkewedNow} from "./utilities/Time";

//fromNow must be in ISO format for hasura/postgres stuff
//new Date().toISOString() will do it

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
    const [fromNow, setFromNow] = React.useState(getSkewedNow().toISOString());
    //const fromNow = React.useRef(  );
    useSubscription(subscribe_payloads, {
        variables: {fromNow: fromNow },
        fetchPolicy: "no-cache",
        shouldResubscribe: true,
        onError: (errorData) => {
           console.log(errorData);
        },
        onData: ({data}) => {
            if (data.data.operationeventlog_stream.length > 0){
                if(data.data.operationeventlog_stream[0].level === "api" || data.data.operationeventlog_stream[0].level === "debug" ){
                    return;
                }
                if(data.data.operationeventlog_stream[0].resolved){
                    return;
                }
                if(data.data.operationeventlog_stream[0].operator){
                    const message = data.data.operationeventlog_stream[0].operator.username + ":\n" + data.data.operationeventlog_stream[0].message;
                    if (data.data.operationeventlog_stream[0].level === "warning") {
                        snackActions.warning(message, { autoClose: 2000});
                    } else {
                        snackActions.info(message, { autoClose: 2000});
                    }

                }else {
                    if (data.data.operationeventlog_stream[0].level === "warning") {
                        snackActions.warning(data.data.operationeventlog_stream[0].message, {autoClose: 3000});
                    } else {
                        snackActions.info(
                            <div style={{width: "100%"}}>{data.data.operationeventlog_stream[0].message}</div>,
                            {autoClose: 3000});
                    }

                }
                }
        }
    });
    return null
}

