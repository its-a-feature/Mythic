const EMPTY_CHILDREN = Object.freeze([]);

const comparableTaskFields = [
  "comment", "completed", "display_params", "original_params", "status", "timestamp",
  "response_count", "opsec_pre_blocked", "opsec_pre_bypassed", "opsec_post_blocked",
  "opsec_post_bypassed", "has_intercepted_response", "tasking_location",
];

const relationIDsEqual = (left = [], right = []) => {
  if(left.length !== right.length){
    return false;
  }
  for(let index = 0; index < left.length; index++){
    if(left[index]?.id !== right[index]?.id){
      return false;
    }
  }
  return true;
};

export const taskRowsEqual = (left, right) => {
  if(left === right){
    return true;
  }
  if(!left || !right || left.id !== right.id){
    return false;
  }
  for(const field of comparableTaskFields){
    if(left[field] !== right[field]){
      return false;
    }
  }
  return left.command?.id === right.command?.id &&
    left.operator?.username === right.operator?.username &&
    left.commentOperator?.username === right.commentOperator?.username &&
    relationIDsEqual(left.tags, right.tags) &&
    relationIDsEqual(left.tasks, right.tasks);
};

export const mergeTasksByID = (existing = [], incoming = []) => {
  if(incoming.length === 0){
    return existing;
  }
  const tasksByID = new Map(existing.map((task) => [task.id, task]));
  incoming.forEach((task) => {
    const current = tasksByID.get(task.id);
    tasksByID.set(task.id, taskRowsEqual(current, task) ? current : task);
  });
  const merged = Array.from(tasksByID.values()).sort((left, right) => left.id - right.id);
  if(merged.length === existing.length && merged.every((task, index) => task === existing[index])){
    return existing;
  }
  return merged;
};

export const nextLiveTaskLimit = (currentLimit, liveResultCount, increment = 20) => {
  return liveResultCount >= currentLimit ? currentLimit + increment : currentLimit;
};

export const createTaskChildrenStore = () => {
  const childrenByParent = new Map();
  const listenersByParent = new Map();
  let highestTaskID = 0;

  const notify = (parentID) => {
    listenersByParent.get(parentID)?.forEach((listener) => listener());
  };

  const merge = (tasks = []) => {
    const incomingByParent = new Map();
    tasks.forEach((task) => {
      if(task?.parent_task_id === null || task?.parent_task_id === undefined){
        return;
      }
      highestTaskID = Math.max(highestTaskID, task.id || 0);
      const parentTasks = incomingByParent.get(task.parent_task_id) || [];
      parentTasks.push(task);
      incomingByParent.set(task.parent_task_id, parentTasks);
    });

    const changedParents = [];
    incomingByParent.forEach((incoming, parentID) => {
      const current = childrenByParent.get(parentID) || EMPTY_CHILDREN;
      const merged = mergeTasksByID(current, incoming);
      if(merged !== current){
        childrenByParent.set(parentID, merged);
        changedParents.push(parentID);
      }
    });
    changedParents.forEach(notify);
    return changedParents;
  };

  return {
    getHighestTaskID: () => highestTaskID,
    getSnapshot: (parentID) => childrenByParent.get(parentID) || EMPTY_CHILDREN,
    merge,
    subscribe: (parentID, listener) => {
      const listeners = listenersByParent.get(parentID) || new Set();
      listeners.add(listener);
      listenersByParent.set(parentID, listeners);
      return () => {
        listeners.delete(listener);
        if(listeners.size === 0){
          listenersByParent.delete(parentID);
        }
      };
    },
  };
};
