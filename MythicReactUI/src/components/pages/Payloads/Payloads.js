import React from 'react';
import { PayloadsTable } from './PayloadsTable';
import {useMutation, gql, useSubscription, useQuery, useLazyQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';

const payloadFragment = gql`
fragment payloadData on payload {
  build_message
  build_phase
  build_stderr
  callback_alert
  id
  operator {
    id
    username
  }
  uuid
  description
  deleted
  auto_generated
  payloadtype {
    id
    name
  }
  payload_build_steps(order_by: {step_number: asc}) {
    step_name
    step_number
    step_success
    step_skip
    start_time
    end_time
    step_stdout
    step_stderr
    id
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
subscription SubPayloadsQuery($now: timestamp!) {
  payload_stream(batch_size: 10, cursor: {initial_value: {timestamp: $now}, ordering: ASC}) {
    ...payloadData
  }
}
`;
const PayloadsQuery = gql`
${payloadFragment}
query PayloadsQuery($offset: Int!, $limit: Int!, $showDeleted: Boolean!) {
  payload(order_by: {id: desc}, offset: $offset, limit: $limit, where: {_or: [{deleted: {_eq: false}}, {deleted: {_eq: $showDeleted}}]}) {
    ...payloadData
  }
  payload_aggregate(where: {_or: [{deleted: {_eq: false}}, {deleted: {_eq: $showDeleted}}]}) {
    aggregate {
      count
    }
  }
}
`;
const payloadsDelete = gql`
mutation PayloadsDeletePayloadMutation($id: Int!) {
  deleteFile(file_id: $id) {
      file_ids
      status
      error
      payload_ids
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
const restorePayloadMutation = gql`
mutation RestorePayloadToUndeleted($id: Int!){
  update_payload_by_pk(pk_columns: {id: $id}, _set: {deleted: false}){
    id
    deleted
  }
}
`;

export function Payloads(props){
    const [fromNow, setFromNow] = React.useState((new Date()).toISOString());
    const [payloads, setPayloads] = React.useState([]);
    const [pageData, setPageData] = React.useState({
      "totalCount": 0,
      "fetchLimit": 20,
      "showDeleted": false
    });
    const mountedRef = React.useRef(true);
    useSubscription(SUB_Payloads, {
      variables: {now:  fromNow},
      fetchPolicy: "no-cache",
      onData: ({data}) => {
        //console.log("got data", subscriptionData.data.payload_stream)
        if(!mountedRef.current){
          return  null;
        }
        const updated = data.data.payload_stream.reduce( (prev, cur) => {
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
      onCompleted: (data) => {
        console.log("completed")
      },
      onError: (data) => {
        snackActions.warning("Failed to get payloads");
        console.log(data);
      }
      });
    
    useQuery(PayloadsQuery, {
      variables: {offset: 0, limit: pageData.fetchLimit, showDeleted: false},
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
          let tempPageData = {...pageData};
          tempPageData.totalCount = data.payload_aggregate.aggregate.count;
          setPageData(tempPageData);
          setPayloads(data.payload);
      },
      onError: (data) => {

      }
    })
    const [fetchNewPage] = useLazyQuery(PayloadsQuery, {
      onCompleted: (data) => {
          snackActions.dismiss();
          let tempPageData = {...pageData};
          tempPageData.totalCount = data.payload_aggregate.aggregate.count;
          setPageData(tempPageData);
          setPayloads(data.payload);
      },
      onError: (data) => {

      }
    })
    const onChangePage = (event, value) => {
      snackActions.info("Fetching page...")
      fetchNewPage({variables: {offset: (value - 1) * pageData.fetchLimit, limit: pageData.fetchLimit, showDeleted: pageData.showDeleted}})
    }
    const [deletePayload] = useMutation(payloadsDelete, {
        onCompleted: (data) => {
          if(data.deleteFile.status === "success"){
            const updated = payloads.map( (p) => {
              if(data.deleteFile.payload_ids.includes(p.id)){
                return {...p, deleted: true};
              }else{
                return {...p}
              }
            });
            setPayloads(updated);
            snackActions.success("Successfully deleted");
          }else{
            snackActions.error(data.deleteFile.error);
          }
          
        },
        onError: (data) => {
          snackActions.warning("Failed to delete payload");
          console.log(data);
        }
    });
    const [restorePayload] = useMutation(restorePayloadMutation, {
      onCompleted: (data) => {
        const updated = payloads.map( (payload) => {
          if(payload.id === data.update_payload_by_pk.id){
            return {...payload, ...data.update_payload_by_pk};
          }else{
            return {...payload};
          }
        });
        setPayloads(updated);
        if(data.update_payload_by_pk.deleted === false){
          snackActions.success("Successfully marked payload as not deleted");
        }
      },
      onError: (data) => {
        snackActions.warning("Failed to mark as not deleted");
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
    const onRestorePayload = (id) => {
      restorePayload({
        variables: {id}
      })
    }
    const onChangeShowDeleted = (showDeleted) => {
      setPageData({...pageData, showDeleted: showDeleted});
      if(showDeleted){
        snackActions.info("Fetching deleted payloads...");
      } else {
        snackActions.info("Hiding deleted payloads...");
      }
      fetchNewPage({variables: {offset:0, limit: pageData.fetchLimit, showDeleted: showDeleted}})
    }
    React.useEffect( () => {
      return() => {
        mountedRef.current = false;
      }
       // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return (
        <div style={{display: "flex", height: "100%", flexDirection: "column"}}>
          <PayloadsTable pageData={pageData} me={props.me} 
            onDeletePayload={onDeletePayload} 
            onUpdateCallbackAlert={onUpdateCallbackAlert} 
            payload={payloads} 
            onRestorePayload={onRestorePayload}
            onChangePage={onChangePage}
            onChangeShowDeleted={onChangeShowDeleted}
            />
        </div>
        
    );
} 
