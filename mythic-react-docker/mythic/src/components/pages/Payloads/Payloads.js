import React from 'react';
import { PayloadsTable } from './PayloadsTable';
import {useMutation, useQuery, gql} from '@apollo/client';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';

const GET_Payloads = gql`
query GetPayloadsQuery($operation_id: Int!) {
  payload(where: {deleted: {_eq: false}, operation_id: {_eq: $operation_id}}) {
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
  payload(where: {deleted: {_eq: false}, operation_id: {_eq: $operation_id}}) {
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

const payloadsDelete = gql`
mutation PayloadsDeletePayloadMutation($id: Int!) {
  update_payload(where: {id: {_eq: $id}}, _set: {deleted: true}) {
    returning {
      id
    }
  }
}
`;
const payloadsCallbackAlert = gql`
mutation PayloadsCallbackAlertMutation($id: Int!, $callback_alert: Boolean!) {
  update_payload(where: {id: {_eq: $id}}, _set: {callback_alert: $callback_alert}) {
    returning {
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
        }
    });
    const [callbackAlert] = useMutation(payloadsCallbackAlert, {
        update: (cache, {data}) => {
        }
    });

    const onDeletePayload = (id) => {
        deletePayload({variables: {id}});
    }
    const onUpdateCallbackAlert = (id, callback_alert) => {
        callbackAlert({variables: {id, callback_alert}});
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
                console.log("in subscription", subscriptionData);
                if(!subscriptionData.data) return prev;
                console.log(prev);
                return Object.assign({}, prev, {
                    payload: [...prev.payload, subscriptionData.data]
                });
            }
        })}
            {...data} />
        </div>
    );
} 
