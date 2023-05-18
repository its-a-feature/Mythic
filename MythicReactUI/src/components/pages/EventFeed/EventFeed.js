import React, {useCallback} from 'react';
import { gql, useMutation, useLazyQuery, useSubscription } from '@apollo/client';
import {EventFeedTable} from './EventFeedTable';
import {snackActions} from '../../utilities/Snackbar';

const GET_Event_Feed = gql`
query GetOperationEventLogs($offset: Int!, $limit: Int!) {
  operationeventlog(where: {deleted: {_eq: false}}, order_by: {id: desc}, limit: $limit, offset: $offset) {
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
  operationeventlog_aggregate(where: {deleted: {_eq: false}}) {
    aggregate {
      count
    }
  }
}
 `;
 const SUB_Event_Feed = gql`
subscription GetOperationEventLogs($fromNow: timestamp!) {
  operationeventlog_stream(cursor: {initial_value: {timestamp: $fromNow}, ordering: ASC}, batch_size: 10, where: {deleted: {_eq: false}}) {
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
  mutation UpdateResolveAllErrorsOperationEventLog {
    update_operationeventlog(where: {level: {_eq: "warning"}, resolved: {_eq: false}}, _set: {resolved: true}) {
      returning{
          id
          resolved
      }
    }
  }
   `;
export function EventFeed(props){
  const [pageData, setPageData] = React.useState({
    "totalCount": 0,
    "fetchLimit": 50
  });
  const [operationeventlog, setOperationEventLog] = React.useState([]);
  const [fromNow, setFromNow] = React.useState((new Date()).toISOString());
  
  useSubscription(SUB_Event_Feed, {
    variables: {fromNow}, fetchPolicy: "no-cache",
    onSubscriptionData: ({subscriptionData}) => {
      const newEvents = subscriptionData.data.operationeventlog_stream.reduce( (prev, cur) => {
        let indx = prev.findIndex( ({id}) => id === cur.id);
        if(indx > -1){
          let updatingPrev = [...prev];
          updatingPrev[indx] = cur;
          return [...updatingPrev];
        }
        return [...prev, cur];
      }, [...operationeventlog]);
      newEvents.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
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
        let tempPageData = {...pageData};
        tempPageData.totalCount = data.operationeventlog_aggregate.aggregate.count;
        setPageData(tempPageData);
        let newEventLog = [...data.operationeventlog];
        newEventLog.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
        setOperationEventLog(newEventLog);
        snackActions.success("Successfully fetched more events");
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
        snackActions.success("Resolved All Viewable Errors");
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
  const onChangePage = (event, value) => {
    snackActions.info("Fetching page...")
    getMoreTasking({variables: {offset: (value - 1) * pageData.fetchLimit, limit: pageData.fetchLimit}})
  }
  React.useEffect( () => {
    getMoreTasking({variables: {offset: 0, limit: pageData.fetchLimit}})
  }, [])
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
    updateResolveAllErrors();
  }, []);
  return (
      <EventFeedTable operationeventlog={operationeventlog}
                      onUpdateDeleted={onUpdateDeleted} onUpdateResolution={onUpdateResolution}
                      onUpdateLevel={onUpdateLevel}
                      resolveViewableErrors={resolveViewableErrors} resolveAllErrors={resolveAllErrors}
                      pageData={pageData} onChangePage={onChangePage}
      />
  );
}
