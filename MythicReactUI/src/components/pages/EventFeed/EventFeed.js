import React, {useCallback} from 'react';
import { gql, useMutation, useLazyQuery, useSubscription } from '@apollo/client';
import {EventFeedTable} from './EventFeedTable';
import {snackActions} from '../../utilities/Snackbar';
import {alertCount} from "../../../cache";

const GET_Event_Feed_Warnings = gql`
query GetOperationEventLogs($offset: Int!, $limit: Int!, $search: String!, $level: String!, $resolved: Boolean!) {
  operationeventlog(where: {deleted: {_eq: false}, message: {_ilike: $search}, level: {_like: $level}, resolved: {_eq: $resolved}, warning: {_eq: true}}, order_by: {id: desc}, limit: $limit, offset: $offset) {
    id
    level
    message
    resolved
    timestamp
    count
    source
    warning
  }
  operationeventlog_aggregate(where: {deleted: {_eq: false}, message: {_ilike: $search}, level: {_like: $level}, resolved: {_eq: $resolved}, warning: {_eq: true}}) {
    aggregate {
      count
    }
  }
}
 `;
const GET_Event_Feed_No_Warnings = gql`
query GetOperationEventLogs($offset: Int!, $limit: Int!, $search: String!, $level: String!) {
  operationeventlog(where: {deleted: {_eq: false}, message: {_ilike: $search}, level: {_ilike: $level}}, order_by: {id: desc}, limit: $limit, offset: $offset) {
    id
    level
    message
    resolved
    timestamp
    count
    source
    warning
  }
  operationeventlog_aggregate(where: {deleted: {_eq: false}, message: {_ilike: $search}, level: {_ilike: $level}}) {
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
    source
    warning
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
  update_operationeventlog_by_pk(pk_columns: {id: $id}, _set: {warning: true, resolved: false}) {
    id
    warning
    resolved
  }
}
 `;
 const Update_ResolveViewableErrors = gql`
 mutation UpdateResolveViewableErrorsOperationEventLog($ids: [Int]!) {
   update_operationeventlog(where:{id: {_in: $ids}, warning: {_eq: true}}, _set: {resolved: true}) {
     returning{
         id
         resolved
     }
   }
 }
  `;
 const Update_ResolveAllErrors = gql`
  mutation UpdateResolveAllErrorsOperationEventLog {
    update_operationeventlog(where: {resolved: {_eq: false}, warning: {_eq: true}}, _set: {resolved: true}) {
      returning{
          id
          resolved
      }
    }
  }
   `;
export function EventFeed({}){
  const [pageData, setPageData] = React.useState({
    "totalCount": 0,
    "fetchLimit": 100
  });
  const [operationeventlog, setOperationEventLog] = React.useState([]);
  const [fromNow, setFromNow] = React.useState((new Date()).toISOString());
  const [search, setSearch] = React.useState("");
  const [level, setLevel] = React.useState("info");
  useSubscription(SUB_Event_Feed, {
    variables: {fromNow}, fetchPolicy: "no-cache",
    onData: ({data}) => {
      const newEvents = data.data.operationeventlog_stream.reduce( (prev, cur) => {
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

  const [getMoreEventFeedWithWarning] = useLazyQuery(GET_Event_Feed_Warnings, {
      onError: data => {
          console.error(data)
      },
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
        snackActions.dismiss();
        let tempPageData = {...pageData};
        tempPageData.totalCount = data.operationeventlog_aggregate.aggregate.count;
        setPageData(tempPageData);
        let newEventLog = [...data.operationeventlog];
        newEventLog.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
        setOperationEventLog(newEventLog);
      }
  });
  const [getMoreEventFeed] = useLazyQuery(GET_Event_Feed_No_Warnings, {
    onError: data => {
      console.error(data)
    },
    fetchPolicy: "no-cache",
    onCompleted: (data) => {
      snackActions.dismiss();
      let tempPageData = {...pageData};
      tempPageData.totalCount = data.operationeventlog_aggregate.aggregate.count;
      setPageData(tempPageData);
      let newEventLog = [...data.operationeventlog];
      newEventLog.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
      setOperationEventLog(newEventLog);
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
          return {...log, warning: updatedMessage.warning, resolved: updatedMessage.resolved};
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
  const onUpdateResolution = useCallback( ({id, resolved}) => {
    updateResolution({variables: {id, resolved}});
  }, []);
  const onUpdateLevel = useCallback( ({id}) => {
    updateLevel({variables: {id}})
  }, []);
  const onChangePage = (event, value, newLevel) => {
    snackActions.info("Fetching page...");
    let localSearch = "%_%";
    if(search !== ""){
      localSearch = "%" + search + "%";
    }
    let localLevel = level;
    if(newLevel){
      localLevel = newLevel;
    }
    let localResolved = undefined;
    if(localLevel === "All Levels"){
      localLevel = "%_%";
    } else if(localLevel === "warning (unresolved)"){
      localResolved = false;
      localLevel = "%_%";
    } else if(localLevel === "warning (resolved)"){
      localResolved = true;
      localLevel = "%_%";
    } else {
        localLevel = "%" + localLevel + "%";
    }
    if(localResolved === undefined){
      getMoreEventFeed({variables: {offset: (value - 1) * pageData.fetchLimit,
          limit: pageData.fetchLimit,
          search: localSearch,
          level: localLevel
        }})
    } else {
      getMoreEventFeedWithWarning({variables: {offset: (value - 1) * pageData.fetchLimit,
          limit: pageData.fetchLimit,
          search: localSearch,
          level: localLevel,
          resolved: localResolved
        }})
    }

  }
  React.useEffect( () => {
    if( alertCount() === 0 ){
      getMoreEventFeed({variables: {offset: 0, limit: pageData.fetchLimit, search: "%_%", level: "%info%"}});
    }
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
  const onSearchChange = (searchQuery) => {
    setSearch(searchQuery);
    onChangePage(null, 1);
  }
  const onLevelChange = (levelValue) => {
    setLevel(levelValue);
    onChangePage(null, 1, levelValue);
  }
  return (
      <EventFeedTable operationeventlog={operationeventlog}
                      onUpdateResolution={onUpdateResolution}
                      onUpdateLevel={onUpdateLevel}
                      resolveViewableErrors={resolveViewableErrors}
                      resolveAllErrors={resolveAllErrors}
                      pageData={pageData}
                      onChangePage={onChangePage}
                      onSearch={onSearchChange}
                      onLevelChange={onLevelChange}
      />
  );
}
