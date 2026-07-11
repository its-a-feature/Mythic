import React from "react";
import {gql, useLazyQuery, useSubscription} from "@apollo/client";
import {getSkewedNow} from "../../utilities/Time";
import {taskingDataFragment} from "./CallbackMutations";
import {createTaskChildrenStore, mergeTasksByID, nextLiveTaskLimit} from "./CallbackTaskingStreamUtils";

const INITIAL_LIVE_LIMIT = 20;
const FETCH_LIMIT = 30;

const TASKING_SUBSCRIPTION = gql`
${taskingDataFragment}
subscription getTasking($callback_id: Int!, $fromNow: timestamp!, $limit: Int) {
  task(where: {callback_id: {_eq: $callback_id}, parent_task_id: {_is_null: true}, timestamp: {_gt: $fromNow}}, order_by: {id: desc}, limit: $limit) {
    ...taskData
  }
}`;

const TASKING_PAGE_QUERY = gql`
${taskingDataFragment}
query getBatchTasking($callback_id: Int!, $offset: Int!, $fetchLimit: Int!) {
  task(where: {callback_id: {_eq: $callback_id}, parent_task_id: {_is_null: true}}, order_by: {id: desc}, limit: $fetchLimit, offset: $offset) {
    ...taskData
  }
  callback(where: {id: {_eq: $callback_id}}) {
    id
    display_id
  }
}`;

const CALLBACK_SUBTASKS_SUBSCRIPTION = gql`
${taskingDataFragment}
subscription getCallbackSubtasks($callback_id: Int!, $afterID: Int!) {
  task_stream(
    batch_size: 50,
    cursor: {initial_value: {id: $afterID}, ordering: ASC},
    where: {callback_id: {_eq: $callback_id}, parent_task_id: {_is_null: false}, is_interactive_task: {_eq: false}}
  ) {
    ...taskData
  }
}`;

const directChildrenFromTasks = (tasks) => tasks.flatMap((task) => (
  task.tasks || []
).map((child) => ({...child, parent_task_id: child.parent_task_id ?? task.id})));

export const useCallbackTaskingData = ({callbackID, active, onBackgroundChange, onMissingCallback}) => {
  const [tasks, setTasks] = React.useState([]);
  const tasksRef = React.useRef([]);
  const [liveLimit, setLiveLimit] = React.useState(INITIAL_LIVE_LIMIT);
  const [fetched, setFetched] = React.useState(false);
  const [fetchedAllTasks, setFetchedAllTasks] = React.useState(false);
  const fromNowRef = React.useRef(getSkewedNow().toISOString());
  const subscriptionInitializedRef = React.useRef(false);
  const childStreamCursorRef = React.useRef(0);
  const [taskChildrenStore] = React.useState(() => createTaskChildrenStore());

  const commitTasks = React.useCallback((incoming) => {
    const merged = mergeTasksByID(tasksRef.current, incoming);
    const changed = merged !== tasksRef.current;
    if(changed){
      tasksRef.current = merged;
      setTasks(merged);
    }
    taskChildrenStore.merge(directChildrenFromTasks(incoming));
    return changed;
  }, [taskChildrenStore]);

  useSubscription(TASKING_SUBSCRIPTION, {
    variables: {callback_id: callbackID, fromNow: fromNowRef.current, limit: liveLimit},
    fetchPolicy: "no-cache",
    ignoreResults: true,
    onError: (error) => console.error(error),
    onData: ({data}) => {
      const incoming = data.data?.task || [];
      const changed = commitTasks(incoming);
      if(subscriptionInitializedRef.current && !active && changed){
        onBackgroundChange();
      }
      subscriptionInitializedRef.current = true;
      setFetched(true);
      setLiveLimit((currentLimit) => nextLiveTaskLimit(currentLimit, incoming.length));
    },
  });

  useSubscription(CALLBACK_SUBTASKS_SUBSCRIPTION, {
    variables: {callback_id: callbackID, afterID: childStreamCursorRef.current},
    skip: !active,
    fetchPolicy: "no-cache",
    ignoreResults: true,
    onError: (error) => console.error(error),
    onData: ({data}) => {
      const incoming = data.data?.task_stream || [];
      taskChildrenStore.merge(incoming);
      childStreamCursorRef.current = Math.max(childStreamCursorRef.current, taskChildrenStore.getHighestTaskID());
    },
  });

  const [fetchTaskPage, {loading: loadingMore}] = useLazyQuery(TASKING_PAGE_QUERY, {
    fetchPolicy: "no-cache",
    onError: (error) => console.error(error),
    onCompleted: (data) => {
      if(data.callback.length === 0){
        onMissingCallback();
        return;
      }
      const existingIDs = new Set(tasksRef.current.map((task) => task.id));
      const foundNew = data.task.some((task) => !existingIDs.has(task.id));
      commitTasks(data.task);
      setFetchedAllTasks(!foundNew || data.task.length < FETCH_LIMIT);
    },
  });

  const loadMoreTasks = React.useCallback(() => {
    return fetchTaskPage({
      variables: {callback_id: callbackID, offset: tasksRef.current.length, fetchLimit: FETCH_LIMIT},
    });
  }, [callbackID, fetchTaskPage]);

  React.useEffect(() => {
    tasksRef.current = [];
    setTasks([]);
    setFetched(false);
    setFetchedAllTasks(false);
    setLiveLimit(INITIAL_LIVE_LIMIT);
    subscriptionInitializedRef.current = false;
    childStreamCursorRef.current = 0;
    loadMoreTasks();
  }, [callbackID, loadMoreTasks]);

  return {
    fetched,
    fetchedAllTasks,
    loadingMore,
    loadMoreTasks,
    taskChildrenStore,
    tasks,
  };
};
