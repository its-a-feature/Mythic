import React from 'react';
import { PayloadsTable } from './PayloadsTable';
import {useMutation, useQuery, gql} from '@apollo/client';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';

const GET_Payloads = gql`
query GetPayloadsQuery($operation_id: Int!) {
  payload(where: {deleted: {_eq: false}, operation_id: {_eq: $operation_id}}, order_by: {id: asc}) {
    auto_generated
    build_message
    build_phase
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
}

`;
const SUB_Payloads = gql`
subscription SubPayloadsQuery($operation_id: Int!) {
  payload(where: {deleted: {_eq: false}, operation_id: {_eq: $operation_id}}, order_by: {id: desc}, limit: 1) {
    auto_generated
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
  update_payload(where: {id: {_eq: $id}}, _set: {callback_alert: $callback_alert}) {
    returning{
        id
        callback_alert
    }
  }
}
`;

export function Payloads(props){
    const me = useReactiveVar(meState);
    const { loading, error, data, subscribeToMore } = useQuery(GET_Payloads, {variables: {operation_id: me.user.current_operation_id}, fetchPolicy: "network-only"});

    const [deletePayload] = useMutation(payloadsDelete, {
        update: (cache, {data}) => {
          const existingPayloads = cache.readQuery({
            query: GET_Payloads,
            variables: {operation_id: me.user.current_operation_id}
          });
          console.log(existingPayloads);
          const existingMinusDeleted = existingPayloads.payload.filter( (payload) => payload.id !== data.update_payload_by_pk.id);
          console.log(existingMinusDeleted);
          cache.writeQuery({
            query: GET_Payloads,
            data: {payloads: [...existingMinusDeleted]}
          });
        },
    });
    const [callbackAlert] = useMutation(payloadsCallbackAlert);

    const onDeletePayload = (id) => {
        deletePayload({variables: {id}});
    }
    const onUpdateCallbackAlert = (id, callback_alert) => {
        callbackAlert({
            variables: {id, callback_alert}
        
        });
    }
    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}} />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    return (
    <div style={{height: "calc(94vh)", marginTop:"10px"}}>
        <PayloadsTable 
            onDeletePayload={onDeletePayload} onUpdateCallbackAlert={onUpdateCallbackAlert} subscribeToMoreMessages={() => subscribeToMore({
            document: SUB_Payloads,
            variables: {operation_id: me.user.current_operation_id},
            updateQuery: (prev, {subscriptionData} ) => {
                if(!subscriptionData.data) return prev;
                let found = false;
                const updated = prev.payload.map( (p) => {
                    if(subscriptionData.data.payload.length > 0 && p.id === subscriptionData.data.payload[0].id){
                        found = true;
                        return {...p, ...subscriptionData.data.payload[0]};
                    }
                    return {...p}
                });
                if(found){
                    // we just updated an entry
                    return Object.assign({}, prev, {
                        payload: updated
                    });
                }else{
                    //this is a new entry
                    return Object.assign({}, prev, {
                        payload: [...prev.payload, subscriptionData.data]
                    });
                }
                
            }
        })}
            {...data} />
        </div>
    );
} 
