import React, {useCallback} from 'react';
import { gql, useMutation, useLazyQuery, useSubscription } from '@apollo/client';
import {EventFeedTable} from './EventFeedTable';
import {snackActions} from '../../utilities/Snackbar';

const SURROUNDING_EVENTS = 5;
const EVENT_QUERY_SIZE = 100;
const GET_Event_Feed = gql`
query GetOperationEventLogs($operation_id: Int!, $offset: Int!, $eventQuerySize: Int!) {
  operationeventlog(where: {operation_id: {_eq: $operation_id}, deleted: {_eq: false}}, order_by: {id: desc}, limit: $eventQuerySize, offset: $offset) {
    id
    level
    message
    resolved
    timestamp
    count
    operator {
      id
      username
    }
  }
}
 `;
 const SUB_Event_Feed = gql`
subscription GetOperationEventLogs($operation_id: Int!, $fromNow: timestamp!, $eventQuerySize: Int!) {
  operationeventlog_stream(cursor: {initial_value: {timestamp: $fromNow}, ordering: ASC}, batch_size: $eventQuerySize, where: {operation_id: {_eq: $operation_id}, deleted: {_eq: false}}) {
    id
    level
    message
    resolved
    timestamp
    count
    operator {
      id
      username
    }
  }
}
 `;
const GET_Surrounding_Events = gql`
query GetSurroundingOperationEventLogs($operation_id: Int!, $lower_id: Int!, $upper_id: Int!) {
  operationeventlog(where: {operation_id: {_eq: $operation_id}, deleted: {_eq: false}, id: {_gt: $lower_id, _lt: $upper_id}}, order_by: {id: desc}) {
    id
    level
    message
    resolved
    timestamp
    count
    operator {
      id
      username
    }
  }
}
 `;
 const Create_Operational_Event_Log = gql`
mutation CreateOperationEventLog($message: String!, $level: String!) {
  insert_operationeventlog_one(object:{level: $level, message: $message}) {
    id
  }
}
 `;
 const GET_Event_Feed_Next_Error = gql`
 query GetOperationEventLogError($operation_id: Int!) {
   operationeventlog(where: {operation_id: {_eq: $operation_id}, deleted: {_eq: false}, level: {_eq: "warning"}, resolved: {_eq: false}}, order_by: {id: desc}) {
     id
     level
     message
     resolved
     timestamp
     count
     operator {
       id
       username
     }
   }
 }
  `;
  const Update_Deleted = gql`
mutation UpdateDeletedOperationEventLog($id: Int!) {
  update_operationeventlog(where:{id: {_eq: $id}}, _set: {deleted: true}) {
    returning{
        id
        deleted
    }
  }
}
 `;
 const Update_Resolution = gql`
mutation UpdateResolutionOperationEventLog($id: Int!, $resolved: Boolean!) {
  update_operationeventlog_by_pk(pk_columns:{id: $id}, _set: {resolved: $resolved}) {
    id
    resolved
  }
}
 `;
 const Update_Level = gql`
mutation UpdateLevelOperationEventLog($id: Int!) {
  update_operationeventlog_by_pk(pk_columns: {id: $id}, _set: {level: "warning"}) {
    id
    level
  }
}
 `;
 const Update_ResolveViewableErrors = gql`
 mutation UpdateResolveViewableErrorsOperationEventLog($ids: [Int]!) {
   update_operationeventlog(where:{id: {_in: $ids}}, _set: {resolved: true}) {
     returning{
         id
         resolved
     }
   }
 }
  `;
  const Update_ResolveAllErrors = gql`
  mutation UpdateResolveAllErrorsOperationEventLog($operation_id: Int!) {
    update_operationeventlog(where: {level: {_eq: "warning"}, resolved: {_eq: false}, operation_id: {_eq: $operation_id}}, _set: {resolved: true}) {
      returning{
          id
          resolved
      }
    }
  }
   `;
export function EventFeed(props){
  const me = props.me;
  const [operationeventlog, setOperationEventLog] = React.useState([]);
  const [offset, setOffset] = React.useState(0);
  const [fromNow, setFromNow] = React.useState((new Date()).toISOString());
  const [sortDirection, setSortDirection] = React.useState("asc");
  
  useSubscription(SUB_Event_Feed, {
    variables: {operation_id: me?.user?.current_operation_id || 0, fromNow, eventQuerySize: EVENT_QUERY_SIZE}, fetchPolicy: "no-cache",
    onSubscriptionData: ({subscriptionData}) => {
      //console.log("got subscription data")
      if(offset === 0){
        setOffset(subscriptionData.data.operationeventlog_stream.length);
      }
      const newEvents = subscriptionData.data.operationeventlog_stream.reduce( (prev, cur) => {
        let indx = prev.findIndex( ({id}) => id === cur.id);
        if(indx > -1){
          let updatingPrev = [...prev];
          updatingPrev[indx] = cur;
          return [...updatingPrev];
        }
        return [...prev, cur];
      }, [...operationeventlog]);
      if(sortDirection === "desc"){
        newEvents.sort((a,b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
      }else{
        newEvents.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
      }
      //console.log("finished processing subscription data")
      setOperationEventLog(newEvents);
    }
  });
  
  const [getMoreTasking] = useLazyQuery(GET_Event_Feed, {
      onError: data => {
          console.error(data)
      },
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        snackActions.dismiss();
          if(data.operationeventlog.length === 0){
            snackActions.info("No more events");
            return;
          }
          const newEvents = data.operationeventlog.reduce( (prev, cur) => {
            if(prev.find(({ id }) => id === cur.id)){
              return [...prev];
            }
            return [...prev, cur];
          }, [...operationeventlog]);
          setOffset(offset + EVENT_QUERY_SIZE);
          if(sortDirection === "desc"){
            newEvents.sort((a,b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
          }else{
            newEvents.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
          }
          setOperationEventLog(newEvents);
        snackActions.success("Successfully fetched more events");
      }
  });
  const [getSurroundingEventQuery] = useLazyQuery(GET_Surrounding_Events, {
    onError: data => {
        console.error(data)
    },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
        snackActions.dismiss();
        let foundNew = false;
        const newEvents = data.operationeventlog.reduce( (prev, cur) => {
          if(prev.find(({ id }) => id === cur.id)){
            return [...prev];
          }
          foundNew = true;
          return [...prev, cur];
        }, [...operationeventlog]);
        if(sortDirection === "desc"){
          newEvents.sort((a,b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
        }else{
          newEvents.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
        }
        setOperationEventLog(newEvents);
        if(foundNew){
          snackActions.success("Successfully fetched surrounding events");
        }else{
          snackActions.info("No additional surrounding events");
        }
        
    }
});
  const [getNextError] = useLazyQuery(GET_Event_Feed_Next_Error, {
    onError: data => {
        console.error(data)
    },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      snackActions.dismiss();
        if(data.operationeventlog.length === 0){
          snackActions.info("No more events");
          return;
        }
        const newEvents = data.operationeventlog.reduce( (prev, cur) => {
          if(prev.find(({ id }) => id === cur.id)){
            return [...prev];
          }
          return [...prev, cur];
        }, [...operationeventlog]);
        if(sortDirection === "desc"){
          newEvents.sort((a,b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
        }else{
          newEvents.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
        }
        setOperationEventLog(newEvents);
        snackActions.success("Successfully fetched more errors");
    }
  });
  const [updateDeleted] = useMutation(Update_Deleted, {
    update: (cache, {data}) => {
        const removedMessage = data.update_operationeventlog.returning[0];
        const newMessages = operationeventlog.filter(op => (op.id !== removedMessage.id));
        setOperationEventLog(newMessages);
        snackActions.success("Successfully deleted event log");
    }
  });
  const [updateResolution] = useMutation(Update_Resolution, {
    update: (cache, {data}) => {
      const updatedMessage = data.update_operationeventlog_by_pk;
      const updatedMessages = operationeventlog.map( (log) => {
        if(log.id === updatedMessage.id){
          return {...log, resolved: updatedMessage.resolved};
        }
        return log;
      });
      setOperationEventLog(updatedMessages);
    }
  });
  const [updateLevel] = useMutation(Update_Level, {
    update: (cache, {data}) => {
      const updatedMessage = data.update_operationeventlog_by_pk;
      const updatedMessages = operationeventlog.map( (log) => {
        if(log.id === updatedMessage.id){
          return {...log, level: updatedMessage.level};
        }
        return log;
      });
      setOperationEventLog(updatedMessages);
    }
  });
  const [updateResolveViewable] = useMutation(Update_ResolveViewableErrors, {
    update: (cache, {data}) => {
      snackActions.dismiss();
      if(data.update_operationeventlog.returning.length > 0){
        snackActions.success("Resolved All Errors");
        const updated_ids = data.update_operationeventlog.returning.map( (evt) => evt.id);
        const updatedMessages = operationeventlog.map( (log) => {
          if(updated_ids.includes(log.id)){
            return {...log, resolved: true};
          }else{
            return {...log}
          }
        });
        setOperationEventLog(updatedMessages);
      }else{
        snackActions.info("No Viewable Errors to Resolve");
      }
      
    }
  });
  const [updateResolveAllErrors] = useMutation(Update_ResolveAllErrors, {
    update: (cache, {data}) => {
      snackActions.dismiss()
      if(data.update_operationeventlog.returning.length > 0){
        snackActions.success("Resolved All Errors");
        const updated_ids = data.update_operationeventlog.returning.map( (evt) => evt.id);
        const updatedMessages = operationeventlog.map( (log) => {
          if(updated_ids.includes(log.id)){
            return {...log, resolved: true};
          }else{
            return {...log}
          }
        });
        setOperationEventLog(updatedMessages);
      }else{
        snackActions.info("No Errors to Resolve");
      }
      
    }
  });
  const onUpdateDeleted = useCallback( ({id}) => {
      snackActions.info("Deleting event log...");
      updateDeleted({variables: {id}});
  }, [])
  const onUpdateResolution = useCallback( ({id, resolved}) => {
    updateResolution({variables: {id, resolved}});
  }, []);
  const onUpdateLevel = useCallback( ({id}) => {
    updateLevel({variables: {id}})
  }, []);
  const loadMore = useCallback( () => {
    snackActions.info("Loading more events...");
    getMoreTasking({variables: {operation_id: me?.user?.current_operation_id || 0, offset: offset, eventQuerySize: EVENT_QUERY_SIZE}})
  }, [offset]);
  const loadNextError = useCallback( () => {
    snackActions.info("Loading more errors...");
    getNextError({variables: {operation_id: me?.user?.current_operation_id || 0}})
  }, []);
  const getSurroundingEvents = useCallback( ({id}) => {
    snackActions.info("Loading surrounding events...");
    getSurroundingEventQuery({variables: {lower_id: id - SURROUNDING_EVENTS, upper_id: id + SURROUNDING_EVENTS, operation_id: me?.user?.current_operation_id || 0}})
  }, []);
  const resolveViewableErrors = useCallback( () => {
    snackActions.info("Resolving Errors...");
    const resolveIds = operationeventlog.reduce( (prev, cur) => {
      if(cur.level === "warning" && !cur.resolved){
        return [...prev, cur.id];
      }else{
        return [...prev];
      }
    }, []);
    updateResolveViewable({variables: {ids: resolveIds}});
  }, [operationeventlog]);
  const resolveAllErrors = useCallback( () => {
    snackActions.info("Resolving Errors...");
    updateResolveAllErrors({variables: {operation_id: me?.user?.current_operation_id || 0}});
  }, []);
  const changeSortDirection = () => {
    if(sortDirection === "asc"){
      setSortDirection("desc");
      operationeventlog.sort((a,b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
    }else{
      setSortDirection("asc");
      operationeventlog.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
    }
  }
  React.useEffect( () => {
    loadMore();
  }, []);
  return (
      <EventFeedTable operationeventlog={operationeventlog} loadMore={loadMore} loadNextError={loadNextError}
                      onUpdateDeleted={onUpdateDeleted} onUpdateResolution={onUpdateResolution} onUpdateLevel={onUpdateLevel} getSurroundingEvents={getSurroundingEvents}
                      resolveViewableErrors={resolveViewableErrors} resolveAllErrors={resolveAllErrors} changeSortDirection={changeSortDirection} sortDirection={sortDirection}
      />
  );
}
