import React, { useEffect }  from 'react';
import { gql, useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useReactiveVar } from '@apollo/client';
import { meState } from '../../../cache';
import {EventFeedTable} from './EventFeedTable';
import {snackActions} from '../../utilities/Snackbar';

const OFFSET_SIZE = 10;
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
function EventFeedFunc(props){
  const me = useReactiveVar(meState);
  const [operationeventlog, setOperationEventLog] = React.useState([]);
  const [offset, setOffset] = React.useState(OFFSET_SIZE);
  const [getInitialEvents, { error }] = useLazyQuery(GET_Event_Feed, { 
    fetchPolicy: 'network-only',
    nextFetchPolicy: "cache-and-network",
    pollInterval: 3000,
    notifyOnNetworkStatusChange: true,
    onCompleted: (data) => {
      if(data.operationeventlog.length === 0){
        return;
      }
      const newEvents = data.operationeventlog.reduce( (prev, cur) => {
        if(prev.find(({ id }) => id === cur.id)){
          return [...prev];
        }
        if(operationeventlog.length == 0){
          return [...prev, cur];
        }else{
          return [cur, ...prev];
        }
      }, [...operationeventlog]);
      newEvents.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
      setOperationEventLog(newEvents);
    },
  });
  useEffect( () => {
      getInitialEvents({variables: {operation_id: me.user.current_operation_id, offset: 0, eventQuerySize: EVENT_QUERY_SIZE}})
  }, [])
  const [getMoreTasking, {  }] = useLazyQuery(GET_Event_Feed, {
      onError: data => {
          console.error(data)
      },
      fetchPolicy: "network-only",
      onCompleted: (data) => {
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
          setOffset(offset + OFFSET_SIZE);
          setOperationEventLog(newEvents);
      }
  });
  const [getSurroundingEventQuery, {  }] = useLazyQuery(GET_Surrounding_Events, {
    onError: data => {
        console.error(data)
    },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
        const newEvents = data.operationeventlog.reduce( (prev, cur) => {
          if(prev.find(({ id }) => id === cur.id)){
            return [...prev];
          }
          return [...prev, cur];
        }, [...operationeventlog]);
        setOperationEventLog(newEvents);
    }
});
  const [getNextError, {  }] = useLazyQuery(GET_Event_Feed_Next_Error, {
    onError: data => {
        console.error(data)
    },
    fetchPolicy: "network-only",
    onCompleted: (data) => {
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
        setOperationEventLog(newEvents);
    }
  });
  const [newOperationEventLog] = useMutation(Create_Operational_Event_Log);
  const [updateDeleted] = useMutation(Update_Deleted, {
    update: (cache, {data}) => {
        const removedMessage = data.update_operationeventlog.returning[0];
        const newMessages = operationeventlog.filter(op => (op.id !== removedMessage.id));
        setOperationEventLog(newMessages);
    }
  });
  const [updateResolution] = useMutation(Update_Resolution, {
    update: (cache, {data}) => {
      const updatedMessage = data.update_operationeventlog_by_pk;
      const updatedMessages = operationeventlog.map( (log) => {
        if(log.id == updatedMessage.id){
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
        if(log.id == updatedMessage.id){
          return {...log, level: updatedMessage.level};
        }
        return log;
      });
      setOperationEventLog(updatedMessages);
    }
  });
  const onUpdateDeleted = ({id}) => {
      updateDeleted({variables: {id}});
  }
  const onSubmitMessage = ({level, message}) => {
      newOperationEventLog({variables: {level, message}});
  }
  const onUpdateResolution = ({id, resolved}) => {
    updateResolution({variables: {id, resolved}});
  }
  const onUpdateLevel = ({id}) => {
    updateLevel({variables: {id}})
  }
  const loadMore = () => {
    getMoreTasking({variables: {operation_id: me.user.current_operation_id, offset: offset}})
  }
  const loadNextError = () => {
    getNextError({variables: {operation_id: me.user.current_operation_id}})
  }
  const getSurroundingEvents = ({id}) => {
    getSurroundingEventQuery({variables: {lower_id: id - SURROUNDING_EVENTS, upper_id: id + SURROUNDING_EVENTS, operation_id: me.user.current_operation_id}})
  }
  if (error) {
    console.error(error);
    snackActions.error("Failed to get event feed data");
    return null;
  }
  return (
      <EventFeedTable onSubmitMessage={onSubmitMessage} operationeventlog={operationeventlog} loadMore={loadMore} loadNextError={loadNextError}
                      onUpdateDeleted={onUpdateDeleted} onUpdateResolution={onUpdateResolution} onUpdateLevel={onUpdateLevel} getSurroundingEvents={getSurroundingEvents}
      />
  );
}
export const EventFeed = React.memo(EventFeedFunc, (prev, next) => {console.log(prev, next);});
