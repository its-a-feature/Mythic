import React, {createContext} from 'react';
import {useSubscription, gql } from '@apollo/client';
import {CallbacksTable, CallbacksTableMaterialReactTable} from './CallbacksTable';
import {CallbacksGraph} from './CallbacksGraph';
import {useMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
export const CallbackGraphEdgesContext = createContext([]);
export const OnOpenTabContext = createContext( () => {});
export const CallbacksContext = createContext([]);
//
//callback(where: {active: {_eq: true}}){
const SUB_Callbacks = gql`
subscription CallbacksSubscription{
callback_stream(batch_size: 1000, cursor: {initial_value: {timestamp: "1970-01-01"}}) {
    architecture
    active
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
    last_checkin
    current_time
    mythictree_groups
    payload {
      os
      payloadtype {
        name
        agent_type
        id
      }
      description
      id
    }
  }
}
 `;
export const SUB_Edges = gql`
subscription CallbacksSubscription{
  callbackgraphedge(order_by: {id: desc, end_timestamp: desc_nulls_first}) {
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
    const [callbacks, setCallbacks] = React.useState([]);
    const [callbackEdges, setCallbackEdges] = React.useState([]);
    const mountedRef = React.useRef(true);
    useSubscription(SUB_Callbacks, {
        fetchPolicy: "no-cache",
        onData: ({data}) => {
          if(!mountedRef.current){
            return;
          }

          const updated = data.data.callback_stream.reduce( (prev, cur) => {
              console.log(cur)

              let existingIndex = prev.findIndex( (element, i, array) => element.id === cur.id);
              if(existingIndex === -1){
                  // cur isn't in our current list of callbacks
                  if(cur.active){return [...prev, cur]}
              }
              if(!cur.active){
                  if(existingIndex !== -1){
                      prev.splice(existingIndex, 1);
                      return [...prev];
                  }

              }
              prev[existingIndex] = {...prev[existingIndex], ...cur};
              return [...prev];
          }, callbacks);

          updated.sort( (a, b) => a.display_id > b.display_id ? -1 : 1);
          setCallbacks(updated);
        },
        onError: ({data}) => {
            console.log(data)
        },
    });
    useSubscription(SUB_Edges, {
        fetchPolicy: "network-only",
        onData: ({data}) => {
          if(!mountedRef.current){
            return;
          }
          setCallbackEdges(data.data.callbackgraphedge)
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
    }, []);
    const initialNewBrowserScriptTable = useMythicSetting({setting_name: "experiment-browserscripttable", default_value: "false"});
    return (
      <div style={{height: "100%", width: "100%"}}>
          <CallbackGraphEdgesContext.Provider value={callbackEdges}>
              <OnOpenTabContext.Provider value={onOpenTabLocal}>
                  <CallbacksContext.Provider value={callbacks}>
                      {props.topDisplay === "graph" ? (
                          <CallbacksGraph maxHeight={"100%"}  />
                      ) : initialNewBrowserScriptTable ? (
                          <CallbacksTableMaterialReactTable onOpenTab={onOpenTabLocal}
                                          parentMountedRef={mountedRef} me={me}/>
                      ) : (
                          <CallbacksTable onOpenTab={onOpenTabLocal}
                                          parentMountedRef={mountedRef} me={me}/>
                      )
                      }
                  </CallbacksContext.Provider>
              </OnOpenTabContext.Provider>
          </CallbackGraphEdgesContext.Provider>
        </div>
    );
}