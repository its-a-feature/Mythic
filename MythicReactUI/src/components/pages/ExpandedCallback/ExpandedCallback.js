import React  from 'react';
import {useSubscription, gql } from '@apollo/client';
import {ExpandedCallbackSideDetails} from './ExpandedCallbackSideDetails';
import  {useParams} from "react-router-dom";
import {CallbacksTabsTaskingPanel} from '../Callbacks/CallbacksTabsTasking';
import { snackActions } from '../../utilities/Snackbar';


const SUB_Callbacks = gql`
subscription CallbacksSubscription ($callback_id: Int!){
  callback_stream(batch_size: 1, cursor: {initial_value: {last_checkin: "1970-01-01"}}, where: {display_id: {_eq: $callback_id}}) {
    architecture
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
    
    const {callbackId} = useParams();
    const [callback, setCallbacks] = React.useState({"payload": {"payloadtype": {"name": ""}}, "callbacktokens": []});
    const [tabInfo, setTabInfo] = React.useState({callbackID: parseInt(callbackId)});
    useSubscription(SUB_Callbacks, {
        variables: {callback_id: callbackId}, fetchPolicy: "network-only",
        shouldResubscribe: true,
        onSubscriptionData: ({subscriptionData}) => {
          if(subscriptionData.data.callback_stream.length === 0){
            snackActions.error("Unknown Callback");
            return;
          }
          setCallbacks(subscriptionData.data.callback_stream[0]);
          setTabInfo({tabID: "interact", tabType: "interact", callbackID: parseInt(callbackId), 
          payloadtype: subscriptionData.data.callback_stream[0]["payload"]["payloadtype"]["name"],
          payloadDescription: subscriptionData.data.callback_stream[0]["payload"]["description"],
          callbackDescription: subscriptionData.data.callback_stream[0]["description"],
          operation_id: subscriptionData.data.callback_stream[0]["operation_id"],
          os: subscriptionData.data.callback_stream[0]["payload"]["os"]});
        }
    });

    return (
        <div style={{width: "100%", height: "100%", maxHeight: "100%", display: "flex", flexDirection: "row"}}>
          {tabInfo.payloadtype !== undefined ? (
            <React.Fragment>
              <ExpandedCallbackSideDetails me={props.me} callback={callback} />
              <CallbacksTabsTaskingPanel me={props.me} 
                style={{height:`calc(${96}vh)`, maxHeight:`calc(${96}vh)`, width:"69%", maxWidth: "69%", position: "absolute", overflow: "auto", display: "inline-flex", flexDirection: "column"}} 
                tabInfo={tabInfo} callbacktokens={callback.callbacktokens}/>
            </React.Fragment>
          ) : (
            <div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>Fetching Callback</div>
          )}
            
        </div>
    );
}
