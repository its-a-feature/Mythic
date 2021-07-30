import React from 'react';
import { PayloadsTable } from './PayloadsTable';
import {useMutation, useQuery, gql, useSubscription} from '@apollo/client';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
const payloadFragment = gql`
fragment payloadData on payload {
  build_message
  build_phase
  build_stderr
  callback_alert
  creation_time
  id
  operator {
    id
    username
  }
  uuid
  tag
  payloadtype {
    id
    ptype
  }
  filemetum {
    agent_file_id
    filename_text
    id
  }
  payloadc2profiles {
    c2profile {
      running
      name
      is_p2p
      container_running
    }
  }
}
`;
const SUB_Payloads = gql`
${payloadFragment}
subscription SubPayloadsQuery($operation_id: Int!) {
  payload(where: {deleted: {_eq: false}, operation_id: {_eq: $operation_id}, auto_generated: {_eq: false}}, order_by: {id: desc}) {
    ...payloadData
  }
}
`;
const Get_Payloads = gql`
${payloadFragment}
query GetPayloadsQuery($operation_id: Int!) {
  payload(where: {deleted: {_eq: false}, operation_id: {_eq: $operation_id}, auto_generated: {_eq: false}}, order_by: {id: desc}, limit: 20) {
    ...payloadData
  }
}
`;
const payloadsDelete = gql`
mutation PayloadsDeletePayloadMutation($id: Int!) {
  update_payload_by_pk(pk_columns: {id: $id}, _set: {deleted: true}) {
      id
      deleted
  }
}
`;
const payloadsCallbackAlert = gql`
mutation PayloadsCallbackAlertMutation($id: Int!, $callback_alert: Boolean!) {
  update_payload_by_pk(pk_columns: {id: $id}, _set: {callback_alert: $callback_alert}) {
    id
    callback_alert
  }
}
`;

export function Payloads(props){
    const me = useReactiveVar(meState);
    const [payloads, setPayloads] = React.useState([]);
    useQuery(Get_Payloads, {
      variables: {operation_id: me.user.current_operation_id},
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
        const updated = data.payload.reduce( (prev, cur) => {
          const index = prev.findIndex( (p) => p.id === cur.id );
          if(index > -1){
            prev[index] = {...cur};
            return [...prev];
          }else{
            return [cur, ...prev];
          }
        }, [...payloads])
        updated.sort( (a,b) => a.id > b.id ? -1 : 1);
        setPayloads(updated);
      },
    })
    useSubscription(SUB_Payloads, {
      variables: {operation_id: me.user.current_operation_id},
      fetchPolicy: "no-cache",
      onSubscriptionData: ({subscriptionData}) => {
        const updated = subscriptionData.data.payload.reduce( (prev, cur) => {
          const index = prev.findIndex( (p) => p.id === cur.id );
          if(index > -1){
            prev[index] = {...cur};
            return [...prev];
          }else{
            return [cur, ...prev];
          }
        }, [...payloads])
        updated.sort( (a,b) => a.id > b.id ? -1 : 1);
        setPayloads(updated);
      },
      onError: (data) => {
        snackActions.warning("Failed to get payloads");
        console.log(data);
      }
      });
    const [deletePayload] = useMutation(payloadsDelete, {
        onCompleted: (data) => {
          const updated = payloads.filter( (payload) => payload.id !== data.update_payload_by_pk.id);
          setPayloads(updated);
          snackActions.success("Successfully deleted");
        },
        onError: (data) => {
          snackActions.warning("Failed to delete payload");
          console.log(data);
        }
    });
    const [callbackAlert] = useMutation(payloadsCallbackAlert, {
      onCompleted: (data) => {
        const updated = payloads.map( (payload) => {
          if(payload.id === data.update_payload_by_pk.id){
            return {...payload, ...data.update_payload_by_pk};
          }else{
            return {...payload};
          }
        });
        if(data.update_payload_by_pk.callback_alert){
          snackActions.success("Now Alerting on New Callbacks");
        }else{
          snackActions.success("No Longer Alerting on New Callbacks");
        }
        
        setPayloads(updated);
      },
      onError: (data) => {
        snackActions.warning("Failed to update callback alerting status");
        console.log(data);
      }
    });
    const onDeletePayload = (id) => {
        deletePayload({variables: {id}});
    }
    const onUpdateCallbackAlert = (id, callback_alert) => {
        callbackAlert({
            variables: {id, callback_alert}
        
        });
    }
    return (
      <div style={{height: "calc(94vh)", maxHeight: "calc(94vh)", marginTop:"10px"}}>
        <PayloadsTable onDeletePayload={onDeletePayload} onUpdateCallbackAlert={onUpdateCallbackAlert} payload={payloads} />
      </div>
    );
} 
