import React  from 'react';
import {useSubscription, gql, useQuery } from '@apollo/client';
import {ExpandedCallbackSideDetails} from './ExpandedCallbackSideDetails';
import  {useParams} from "react-router-dom";
import {CallbacksTabsTaskingPanel} from '../Callbacks/CallbacksTabsTasking';
import { snackActions } from '../../utilities/Snackbar';
import Split from 'react-split';
import {Query_Callbacks_And_Edges, SUB_Edges, CallbackGraphEdgesContext} from "../Callbacks/CallbacksTop";
import {getSkewedNow} from "../../utilities/Time";

const SUB_Callbacks = gql`
subscription CallbacksSubscription ($callback_display_id: Int!){
  callback_stream(batch_size: 1, cursor: {initial_value: {timestamp: "1969-01-01"}}, where: {display_id: {_eq: $callback_display_id}}) {
    tags {
        tagtype {
            name
            color
            id
          }
        id
      }
    architecture
    cwd
    impersonation_context
    description
    display_id
    domain
    external_ip
    host
    id
    integrity_level
    ip
    last_checkin
    current_time
    init_callback
    locked
    mythictree_groups
    locked_operator {
      username
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
        agent_type
      }
      description
      id
    }
    callbacktokens(where: {deleted: {_eq: false}}) {
      token {
        token_id
        id
        user
        description
      }
      callback {
        id
      }
      id
    }
  }
}
 `;


export function ExpandedCallback(props){
    const fromNow = React.useRef(getSkewedNow());
    const {callbackDisplayId} = useParams();
    const [callback, setCallbacks] = React.useState({"payload": {"payloadtype": {"name": ""}}, "callbacktokens": []});
    const [tabInfo, setTabInfo] = React.useState({displayID: parseInt(callbackDisplayId)});
    const [callbackEdges, setCallbackEdges] = React.useState([]);
    useQuery(Query_Callbacks_And_Edges, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            setCallbackEdges(data.callbackgraphedge);
        }
    })
    useSubscription(SUB_Callbacks, {
        variables: {callback_display_id: tabInfo.displayID}, fetchPolicy: "network-only",
        shouldResubscribe: true,
        onData: ({data}) => {
          if(data.data.callback_stream.length === 0){
            snackActions.error("Unknown Callback");
            return;
          }
          setCallbacks(data.data.callback_stream[0]);
          setTabInfo({tabID: "interact", tabType: "interact",
          displayID: data.data.callback_stream[0]["display_id"],
          callbackID: data.data.callback_stream[0]["id"],
          payloadtype: data.data.callback_stream[0]["payload"]["payloadtype"]["name"],
          payloadDescription: data.data.callback_stream[0]["payload"]["description"],
          callbackDescription: data.data.callback_stream[0]["description"],
          operation_id: data.data.callback_stream[0]["operation_id"],
          os: data.data.callback_stream[0]["payload"]["os"]});
        }
    });
    useSubscription(SUB_Edges, {
        fetchPolicy: "network-only",
        variables: {fromNow: fromNow.current},
        onData: ({data}) => {
            const updated = data.data.callbackgraphedge_stream.reduce( (prev, cur) => {
                let existingIndex = prev.findIndex( (element, i, array) => element.id === cur.id);
                if(existingIndex === -1){
                    // cur isn't in our current list of callbacks
                    return [...prev, cur]
                }
                prev[existingIndex] = {...prev[existingIndex], ...cur};
                return [...prev];
            }, callbackEdges);
            setCallbackEdges(updated);
        }
    });
    return (
        <div style={{width: "100%", height: "100%", maxHeight: "100%",}}>
            <CallbackGraphEdgesContext.Provider value={callbackEdges}>
                {tabInfo.payloadtype !== undefined ? (
                    <Split direction="horizontal" style={{width: "100%", height: "100%", display: "flex", flexDirection: "row" }} sizes={[30, 70]} >
                        <div className="bg-gray-base" style={{display: "inline-flex"}}>
                            <ExpandedCallbackSideDetails me={props.me} callback={callback} />
                        </div>
                        <div className="bg-gray-light" style={{display: "inline-flex"}}>
                            <CallbacksTabsTaskingPanel me={props.me}
                                                       tabInfo={tabInfo}
                                                       collapseTaskRequest={() => {}}
                            />
                        </div>
                    </Split>
                ) : (
                    <div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>Fetching Callback</div>
                )}
            </CallbackGraphEdgesContext.Provider>
        </div>
    );
}
