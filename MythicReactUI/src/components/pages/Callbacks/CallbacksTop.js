import React from 'react';
import {useSubscription, gql } from '@apollo/client';
import {CallbacksTable} from './CallbacksTable';
import {CallbacksGraph} from './CallbacksGraph';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material/styles';

const SUB_Callbacks = gql`
subscription CallbacksSubscription($operation_id: Int!){
  callback(where: {active: {_eq: true}, operation_id: {_eq: $operation_id}}, order_by: {id: desc}) {
    architecture
    display_id
    description
    domain
    external_ip
    host
    id
    integrity_level
    ip
    locked
    locked_operator {
      username
      id
    }
    extra_info
    sleep_info
    pid
    os
    user
    agent_callback_id
    operation_id
    process_name
    payload {
      os
      payloadtype {
        name
        id
      }
      description
      id
    }
  }
}
 `;
export const SUB_Edges = gql`
subscription CallbacksSubscription ($operation_id: Int!){
  callbackgraphedge(where: {operation_id: {_eq: $operation_id}}, order_by: {id: desc}) {
    id
    end_timestamp
    destination {
      active
      id
      display_id
      operation_id
      user
      host
      ip
      domain
      os
      process_name
      integrity_level
      extra_info
      payload {
        payloadtype {
          name
          id
        }
      }
      callbackc2profiles {
        c2profile {
          name
        }
      }
    }
    source {
      active
      id
      display_id
      operation_id
      user
      host
      ip
      domain
      os
      process_name
      integrity_level
      extra_info
      payload {
        payloadtype {
          name
          id
        }
      }
      callbackc2profiles {
        c2profile {
          name
        }
      }
    }
    c2profile {
      id
      is_p2p
      name
    }
  }
}
 `;
export function CallbacksTop(props){
    const me = props.me;
    const theme = useTheme();
    const [callbacks, setCallbacks] = React.useState([]);
    const [callbackEdges, setCallbackEdges] = React.useState([]);
    const mountedRef = React.useRef(true);
    const {} = useSubscription(SUB_Callbacks, {
        fetchPolicy: "no-cache",
        variables: {operation_id: me?.user?.current_operation_id || 0},
        onSubscriptionData: ({subscriptionData}) => {
          if(!mountedRef.current){
            return;
          }
          setCallbacks(subscriptionData.data.callback);
        },
    });
    useSubscription(SUB_Edges, {
        variables: {operation_id: me?.user?.current_operation_id || 0}, fetchPolicy: "network-only",
        onSubscriptionData: ({subscriptionData}) => {
          if(!mountedRef.current){
            return;
          }
          setCallbackEdges(subscriptionData.data.callbackgraphedge)
        }
    });
    const onOpenTabLocal = React.useCallback( ({tabType, tabID, callbackID}) => {
      for(let i = 0; i < callbacks.length; i++){
        if(callbacks[i]["id"] === callbackID){
          const tabData = {tabID, tabType, callbackID, 
              displayID: callbacks[i]["display_id"],
              payloadtype: callbacks[i]["payload"]["payloadtype"]["name"],
              payloadtype_id: callbacks[i]["payload"]["payloadtype"]["id"],
              operation_id: callbacks[i]["operation_id"],
              payloadDescription: callbacks[i]["payload"]["description"],
              callbackDescription: callbacks[i]["description"],
              host: callbacks[i]["host"],
              os: callbacks[i]["payload"]["os"]};
          props.onOpenTab(tabData);
        }
      }
    }, [callbacks, props.onOpenTab]);
    React.useEffect( () => {
      return() => {
        mountedRef.current = false;
      }
       // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return (
      <div style={{height: "100%", width: "100%"}}>
        {props.topDisplay === "graph" ? (
          <CallbacksGraph maxHeight={"100%"} topHeight={props.heights.top} key={"callbacksgraph"} onOpenTab={onOpenTabLocal} callbacks={callbacks } callbackgraphedges={callbackEdges} />
        ) : (
          <Paper style={{height: "100%", width: "100%", display: "flex", flexDirection: "column"}}>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px", width: "100%"}} variant={"elevation"}>
              <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                  Active Callbacks
              </Typography>
            </Paper>
            <CallbacksTable key={"callbackstable"} onOpenTab={onOpenTabLocal} callbacks={callbacks} callbackgraphedges={callbackEdges} parentMountedRef={mountedRef}/>
          </Paper>
          )}
        </div>
    );
}