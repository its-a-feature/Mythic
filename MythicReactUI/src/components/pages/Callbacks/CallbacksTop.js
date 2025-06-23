import React, {createContext} from 'react';
import {useSubscription, gql, useQuery } from '@apollo/client';
import {CallbacksTable} from './CallbacksTable';
import {CallbacksGraph} from './CallbacksGraph';
import {getSkewedNow} from "../../utilities/Time";
export const CallbackGraphEdgesContext = createContext([]);
export const OnOpenTabContext = createContext( () => {});
export const OnOpenTabsContext = createContext( () => {});
export const CallbacksContext = createContext([]);
//
//callback(where: {active: {_eq: true}}){
const SUB_Callbacks = gql`
subscription CallbacksSubscription($fromNow: timestamp!){
callback_stream(batch_size: 1000, cursor: {initial_value: {timestamp: $fromNow}}) {
    architecture
    cwd
    impersonation_context
    active
    dead
    color
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
    process_short_name
    last_checkin
    current_time
    mythictree_groups
    trigger_on_checkin_after_time
    tags {
        tagtype {
            name
            color
            id
          }
        id
    }
    callbackports(where: {deleted: {_eq: false}}) {
        local_port
        remote_port
        remote_ip
        port_type
        username
        password
        id
    }
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
export const Query_Callbacks_And_Edges = gql`
query InitialActiveCallbacksQuery{
callback(where: {active: {_eq: true}}) {
    architecture
    cwd
    impersonation_context
    active
    dead
    color
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
    process_short_name
    last_checkin
    current_time
    mythictree_groups
    trigger_on_checkin_after_time
    tags {
        tagtype {
            name
            color
            id
          }
        id
    }
    callbackports(where: {deleted: {_eq: false}}) {
        id
        local_port
        remote_port
        remote_ip
        port_type
        username
        password
    }
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
      tags {
        tagtype {
            name
            color
            id
          }
        id
      }
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
      tags {
        tagtype {
            name
            color
            id
          }
        id
      }
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
export const SUB_Edges = gql`
subscription CallbackEdgeSubscription($fromNow: timestamp!){
callbackgraphedge_stream(batch_size: 100, cursor: {initial_value: {updated_at: $fromNow}}) {
    id
    end_timestamp
    destination {
      active
      id
      color
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
      tags {
        tagtype {
            name
            color
            id
          }
        id
      }
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
      color
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
      tags {
        tagtype {
            name
            color
            id
          }
        id
      }
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
    const callbacks = React.useRef([]);
    const callbackEdges = React.useRef([]);
    const fromNow = React.useRef(getSkewedNow());
    const mountedRef = React.useRef(true);
    const [loading, setLoading] = React.useState(true);
    useSubscription(SUB_Callbacks, {
        variables: {fromNow: fromNow.current},
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            if(!mountedRef.current){
                return;
            }
            const updated = data.data.callback_stream.reduce( (prev, cur) => {
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
            }, callbacks.current);
            updated.sort( (a, b) => a.display_id > b.display_id ? -1 : 1);
            callbacks.current = updated;
        },
        onError: ({data}) => {
            console.log(data)
        },
    });
    useQuery(Query_Callbacks_And_Edges, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            const updated = data.callback.reduce( (prev, cur) => {
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
            }, callbacks.current);
            updated.sort( (a, b) => a.display_id > b.display_id ? -1 : 1);
            callbacks.current = updated;
            callbackEdges.current = data.callbackgraphedge;
            setLoading(false);
        }
    })
    useSubscription(SUB_Edges, {
        fetchPolicy: "network-only",
        variables: {fromNow: fromNow.current},
        onData: ({data}) => {
          if(!mountedRef.current){
            return;
          }
            const updated = data.data.callbackgraphedge_stream.reduce( (prev, cur) => {
                let existingIndex = prev.findIndex( (element, i, array) => element.id === cur.id);
                if(existingIndex === -1){
                    // cur isn't in our current list of callbacks
                    return [...prev, cur]
                }
                prev[existingIndex] = {...prev[existingIndex], ...cur};
                return [...prev];
            }, callbackEdges.current);
            callbackEdges.current = updated;
        }
    });
    const onOpenTabLocal = React.useCallback( ({tabType, tabID, callbackID}) => {
      for(let i = 0; i < callbacks.current.length; i++){
        if(callbacks.current[i]["id"] === callbackID){
          const tabData = {tabID, tabType, callbackID, 
              displayID: callbacks.current[i]["display_id"],
              payloadtype: callbacks.current[i]["payload"]["payloadtype"]["name"],
              payloadtype_id: callbacks.current[i]["payload"]["payloadtype"]["id"],
              operation_id: callbacks.current[i]["operation_id"],
              payloadDescription: callbacks.current[i]["payload"]["description"],
              callbackDescription: callbacks.current[i]["description"],
              host: callbacks.current[i]["host"],
              color: callbacks.current[i]["color"],
              os: callbacks.current[i]["payload"]["os"]};
          props.onOpenTab(tabData);
        }
      }
    }, [callbacks.current, props.onOpenTab]);
    const onOpenTabsLocal = React.useCallback( ({tabs}) => {
        let newTabData = [];
        for(let j = 0; j < tabs.length; j++){
            for(let i = 0; i < callbacks.current.length; i++){
                if(callbacks.current[i]["id"] === tabs[j].callbackID){
                    const tabData = {
                        tabID: tabs[j].tabID,
                        tabType: tabs[j].tabType,
                        callbackID: tabs[j].callbackID,
                        displayID: callbacks.current[i]["display_id"],
                        payloadtype: callbacks.current[i]["payload"]["payloadtype"]["name"],
                        payloadtype_id: callbacks.current[i]["payload"]["payloadtype"]["id"],
                        operation_id: callbacks.current[i]["operation_id"],
                        payloadDescription: callbacks.current[i]["payload"]["description"],
                        callbackDescription: callbacks.current[i]["description"],
                        host: callbacks.current[i]["host"],
                        color: callbacks.current[i]["color"],
                        os: callbacks.current[i]["payload"]["os"]};
                    newTabData.push(tabData);
                }
            }
        }
        props.onOpenTabs(newTabData);
    }, [callbacks.current, props.onOpenTabs]);
    React.useEffect( () => {
      return() => {
        mountedRef.current = false;
      }
       // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <div style={{height: "100%", width: "100%"}}>
          <CallbackGraphEdgesContext.Provider value={callbackEdges.current}>
              <OnOpenTabContext.Provider value={onOpenTabLocal}>
                  <OnOpenTabsContext.Provider value={onOpenTabsLocal}>
                      <CallbacksContext.Provider value={callbacks.current}>
                          {props.topDisplay === "graph" ? (
                              <CallbacksGraph onOpenTab={onOpenTabLocal} maxHeight={"100%"} clickedTabId={props.clickedTabId} />
                          ) : (
                              <CallbacksTable callbackTableGridRef={props.callbackTableGridRef}
                                              parentMountedRef={mountedRef} me={me}
                                              loading={loading}
                                              clickedTabId={props.clickedTabId}/>
                          )
                          }
                      </CallbacksContext.Provider>
                  </OnOpenTabsContext.Provider>
              </OnOpenTabContext.Provider>
          </CallbackGraphEdgesContext.Provider>
        </div>
    );
}