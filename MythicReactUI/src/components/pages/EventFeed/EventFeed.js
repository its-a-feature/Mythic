import React, {useCallback} from 'react';
import { gql, useApolloClient, useMutation, useSubscription } from '@apollo/client';
import {EventFeedTable} from './EventFeedTable';
import {snackActions} from '../../utilities/Snackbar';
import {buildEventFeedRequest, capEventPage, createCoalescedScheduler, eventMatchesFilter, isWarningEvent} from "./EventFeedUtils";

const GET_Event_Feed_Warnings = gql`
query GetOperationEventLogs($offset: Int!, $limit: Int!, $search: String!, $resolved: Boolean!) {
  operationeventlog(where: {deleted: {_eq: false}, message: {_ilike: $search}, resolved: {_eq: $resolved}, _or: [{warning: {_eq: true}}, {level: {_eq: "warning"}}]}, order_by: {id: desc}, limit: $limit, offset: $offset) {
    id
    level
    message
    resolved
    timestamp
    count
    source
    warning
  }
  operationeventlog_aggregate(where: {deleted: {_eq: false}, message: {_ilike: $search}, resolved: {_eq: $resolved}, _or: [{warning: {_eq: true}}, {level: {_eq: "warning"}}]}) {
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
    update_operationeventlog(where: {resolved: {_eq: false}, _or: [{warning: {_eq: true}}, {level: {_eq: "warning"}}]}, _set: {resolved: true}) {
      returning{
          id
          resolved
      }
    }
  }
   `;
export const levelOptions = [
  "All Levels", "warning (unresolved)", "warning (resolved)", "info", "debug", "api", "auth", "agent"
];
export function EventFeed(){
  const apolloClient = useApolloClient();
  const [pageData, setPageData] = React.useState({
    "totalCount": 0,
    "fetchLimit": 100
  });
  const [operationeventlog, setOperationEventLog] = React.useState([]);
  const operationEventLogRef = React.useRef([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const fromNow = React.useRef((new Date()).toISOString()).current;
  const [search, setSearch] = React.useState("");
  const [level, setLevel] = React.useState("info");
  const requestSequenceRef = React.useRef(0);
  const refreshPageRef = React.useRef(null);
  const schedulerRef = React.useRef(null);
  const filterRef = React.useRef({level, search});
  React.useEffect(() => {
    operationEventLogRef.current = operationeventlog;
  }, [operationeventlog]);
  React.useEffect(() => {
    filterRef.current = {level, search};
  }, [level, search]);
  useSubscription(SUB_Event_Feed, {
    variables: {fromNow}, fetchPolicy: "no-cache",
    ignoreResults: true,
    onData: ({data}) => {
      const incoming = data.data?.operationeventlog_stream || [];
      const visibleIDs = new Set(operationEventLogRef.current.map((event) => event.id));
      if(incoming.some((event) => visibleIDs.has(event.id) || eventMatchesFilter(event, filterRef.current))){
        schedulerRef.current?.schedule();
      }
    }
  });

  const fetchEventPage = React.useCallback(async ({showToast = false} = {}) => {
    const requestID = ++requestSequenceRef.current;
    const request = buildEventFeedRequest({page: currentPage, limit: pageData.fetchLimit, search, level});
    if(showToast){
      snackActions.info("Fetching page...");
    }
    try{
      const {data} = await apolloClient.query({
        query: request.warning ? GET_Event_Feed_Warnings : GET_Event_Feed_No_Warnings,
        variables: request.variables,
        fetchPolicy: "no-cache",
      });
      if(requestID !== requestSequenceRef.current){
        return;
      }
      const nextEvents = capEventPage(data.operationeventlog || [], pageData.fetchLimit);
      operationEventLogRef.current = nextEvents;
      setOperationEventLog(nextEvents);
      setPageData((current) => ({
        ...current,
        totalCount: data.operationeventlog_aggregate?.aggregate?.count || 0,
      }));
      if(showToast){
        snackActions.dismiss();
      }
    }catch(error){
      if(requestID === requestSequenceRef.current){
        console.error(error);
      }
    }
  }, [apolloClient, currentPage, level, pageData.fetchLimit, search]);
  refreshPageRef.current = fetchEventPage;
  React.useEffect(() => {
    const scheduler = createCoalescedScheduler({callback: () => refreshPageRef.current({showToast: false})});
    schedulerRef.current = scheduler;
    return () => {
      scheduler.cancel();
      if(schedulerRef.current === scheduler){
        schedulerRef.current = null;
      }
    };
  }, [currentPage, level, search]);
  React.useEffect(() => {
    fetchEventPage({showToast: false});
  }, [fetchEventPage]);
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
      schedulerRef.current?.schedule();
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
      schedulerRef.current?.schedule();
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
        schedulerRef.current?.schedule();
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
        schedulerRef.current?.schedule();
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
  const onChangePage = (event, value) => {
    setCurrentPage(value);
  }
  const resolveViewableErrors = useCallback( () => {
    snackActions.info("Resolving Errors...");
    const resolveIds = operationeventlog.reduce( (prev, cur) => {
      if(isWarningEvent(cur) && !cur.resolved){
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
    setCurrentPage(1);
  }
  const onLevelChange = (levelValue) => {
    setLevel(levelValue);
    setCurrentPage(1);
  }
  return (
      <EventFeedTable operationeventlog={operationeventlog}
                      onUpdateResolution={onUpdateResolution}
                      onUpdateLevel={onUpdateLevel}
                      resolveViewableErrors={resolveViewableErrors}
                      resolveAllErrors={resolveAllErrors}
                      pageData={pageData}
                      currentPage={currentPage}
                      onChangePage={onChangePage}
                      onSearch={onSearchChange}
                      onLevelChange={onLevelChange}
      />
  );
}
