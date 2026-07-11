export const isWarningEvent = (event) => Boolean(event.warning || event.level === "warning");

export const eventMatchesFilter = (event, {level, search}) => {
  const normalizedSearch = `${search || ""}`.trim().toLowerCase();
  if(normalizedSearch && !`${event.message || ""}`.toLowerCase().includes(normalizedSearch)){
    return false;
  }
  switch(level){
    case "All Levels": return true;
    case "warning (unresolved)": return isWarningEvent(event) && event.resolved === false;
    case "warning (resolved)": return isWarningEvent(event) && event.resolved === true;
    default: return event.level === level && !isWarningEvent(event);
  }
};

export const buildEventFeedRequest = ({page, limit, search, level}) => {
  const normalizedSearch = search ? `%${search}%` : "%_%";
  const offset = (Math.max(1, page) - 1) * limit;
  if(level === "warning (unresolved)" || level === "warning (resolved)"){
    return {warning: true, variables: {
      offset, limit, search: normalizedSearch, resolved: level === "warning (resolved)",
    }};
  }
  return {warning: false, variables: {
    offset, limit, search: normalizedSearch, level: level === "All Levels" ? "%_%" : `%${level}%`,
  }};
};

export const capEventPage = (events, limit) => [...events]
  .sort((left, right) => right.id - left.id)
  .slice(0, limit);

export const createCoalescedScheduler = ({callback, delay = 500, setTimer = setTimeout, clearTimer = clearTimeout}) => {
  let timer = null;
  let dirty = false;
  let stopped = false;
  const schedule = () => {
    if(stopped){return;}
    dirty = true;
    if(timer !== null){return;}
    timer = setTimer(async () => {
      timer = null;
      if(!dirty || stopped){return;}
      dirty = false;
      await callback();
      if(dirty){schedule();}
    }, delay);
  };
  const cancel = () => {
    stopped = true;
    dirty = false;
    if(timer !== null){
      clearTimer(timer);
      timer = null;
    }
  };
  return {cancel, schedule};
};
