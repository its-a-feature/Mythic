import React, {useEffect} from 'react';
import {gql, useLazyQuery, useSubscription} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import {ResponseDisplayScreenshot} from './ResponseDisplayScreenshot';
import {ResponseDisplayPlaintext} from './ResponseDisplayPlaintext';
import {ResponseDisplayTable} from './ResponseDisplayTable';
import {ResponseDisplayDownload} from './ResponseDisplayDownload';
import {ResponseDisplaySearch} from './ResponseDisplaySearch';
import MythicTextField from '../../MythicComponents/MythicTextField';
import SearchIcon from '@mui/icons-material/Search';
import {useTheme} from '@mui/material/styles';
import {Backdrop, CircularProgress, IconButton, Typography} from '@mui/material';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import Pagination from '@mui/material/Pagination';
import {ResponseDisplayInteractive} from "./ResponseDisplayInteractive";
import {ResponseDisplayMedia} from "./ResponseDisplayMedia";
import {GetMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import {ResponseDisplayGraph} from "./ResponseDisplayGraph";
import {operatorSettingDefaults} from "../../../cache";
import {ResponseDisplayTabs} from "./ResponseDisplayTabs";
import {MythicEmptyState, MythicLoadingState, MythicSearchEmptyState} from "../../MythicComponents/MythicStateDisplay";

const subResponsesStream = gql`
subscription subResponsesStream($task_id: Int!){
  response_stream(
    batch_size: 50,
    cursor: {initial_value: {timestamp: "1970-01-01"}},
    where: {task_id: {_eq: $task_id} }
  ){
    id
    response: response_text
    timestamp
  }
}
`;
const getResponsesLazyQuery = gql`
query subResponsesQuery($task_id: Int!, $fetchLimit: Int, $offset: Int!, $where: response_bool_exp!) {
  response(where: $where, limit: $fetchLimit, offset: $offset, order_by: {id: asc}) {
    id
    response: response_text
    timestamp
    is_error
  }
  response_aggregate(where: $where){
    aggregate{
      count
    }
  }
  latest_response: response(where: {task_id: {_eq: $task_id}}, limit: 1, order_by: {id: desc}) {
    id
  }
}`;
const getAllResponsesLazyQuery = gql`
query subResponsesQuery($task_id: Int!, $where: response_bool_exp!, $fetchLimit: Int) {
  response(where: $where, limit: $fetchLimit, order_by: {id: asc}) {
    id
    response: response_text
    timestamp
    is_error
  }
  response_aggregate(where: $where){
    aggregate{
      count
    }
  }
  latest_response: response(where: {task_id: {_eq: $task_id}}, limit: 1, order_by: {id: desc}) {
    id
  }
}`;
const taskScript = gql`
query getBrowserScriptsQuery($command_id: Int!){
  browserscript(where: {active: {_eq: true}, command_id: {_eq: $command_id}, for_new_ui: {_eq: true}}) {
    script
    id
  }
}

`;
export function b64DecodeUnicode(str) {
  if(str.length === 0){return ""}
  try{
    const text = window.atob(str);
    const length = text.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = text.charCodeAt(i);
    }
    const decoder = new TextDecoder(); // default is utf-8
    return decoder.decode(bytes);
  }catch(error){
    try{
      return decodeURIComponent(window.atob(str));
    }catch(error2){
      try{
        return window.atob(str);
      }catch(error3){
        console.log("Failed to base64 decode response", error, error2)
        return str;
      }
    }
  }
}
const MAX_SELECT_ALL_RESPONSES = 5000;
const DEFAULT_RESPONSE_PAGE_SIZE = operatorSettingDefaults["experiment-responseStreamLimit"] || 200;
const normalizeResponsePageSize = (pageSize) => {
  const parsed = Number(pageSize);
  if(!Number.isFinite(parsed) || parsed <= 0){
    return DEFAULT_RESPONSE_PAGE_SIZE;
  }
  return Math.min(parsed, MAX_SELECT_ALL_RESPONSES);
}
const responseWhereClause = (taskID, search) => {
  if(search === undefined || search === ""){
    return {task_id: {_eq: taskID}};
  }
  return {task_id: {_eq: taskID}, response_escape: {_ilike: "%" + search + "%"}};
}
const decodeResponse = (response) => {
  return {...response, response: b64DecodeUnicode(response.response)};
}
const responsesToOutput = (responses) => {
  return responses.reduce( (prev, cur) => {
    return prev + cur.response;
  }, "");
}
const mergeResponsesById = ({existingResponses, incomingResponses, limit, keepNewest=false}) => {
  const responseMap = new Map();
  existingResponses.forEach( (response) => responseMap.set(response.id, response));
  incomingResponses.forEach( (response) => responseMap.set(response.id, response));
  const mergedResponses = Array.from(responseMap.values()).sort( (a,b) => a.id > b.id ? 1 : -1);
  if(limit === undefined || mergedResponses.length <= limit){
    return mergedResponses;
  }
  return keepNewest ? mergedResponses.slice(-limit) : mergedResponses.slice(0, limit);
}
const getAggregateCount = (data) => {
  return data?.response_aggregate?.aggregate?.count || 0;
}
const getLatestResponseID = (data) => {
  return data?.latest_response?.[0]?.id || 0;
}
export const ResponseDisplay = (props) =>{
  const interactive = props?.task?.command?.supported_ui_features.includes("task_response:interactive") || false;
  return (
      interactive ? (
          <ResponseDisplayInteractive {...props} key={props?.task?.id} />
        ) : (
          <NonInteractiveResponseDisplay {...props} key={props?.task?.id} />
        )
  )
}
const NonInteractiveResponseDisplay = (props) => {
  const theme = useTheme();
  const [rawResponses, setRawResponses] = React.useState([]);
  const rawResponsesRef = React.useRef([]);
  const [search, setSearch] = React.useState("");
  const [totalCount, setTotalCount] = React.useState(0);
  const totalCountRef = React.useRef(0);
  const [openBackdrop, setOpenBackdrop] = React.useState(true);
  const initialResponseStreamLimit = GetMythicSetting({setting_name: "experiment-responseStreamLimit", default_value: operatorSettingDefaults["experiment-responseStreamLimit"]});
  const pageSize = normalizeResponsePageSize(initialResponseStreamLimit);
  const [currentPage, setCurrentPage] = React.useState(1);
  const currentPageRef = React.useRef(1);
  const highestKnownResponseID = React.useRef(0);
  const pageDataLoaded = React.useRef(false);
  const taskResponseCountRef = React.useRef(props.task.response_count || 0);
  const selectAllWarningShown = React.useRef(false);
  const output = React.useMemo(() => responsesToOutput(rawResponses), [rawResponses]);
  React.useEffect( () => {
    rawResponsesRef.current = rawResponses;
  }, [rawResponses]);
  const setTrackedTotalCount = React.useCallback( (newTotalCount) => {
    totalCountRef.current = newTotalCount;
    setTotalCount(newTotalCount);
  }, []);
  const warnSelectAllCapped = React.useCallback( (loadedCount, aggregateCount) => {
    if(aggregateCount > loadedCount && !selectAllWarningShown.current){
      snackActions.warning(`Task output is too large to load all at once. Showing the first ${loadedCount} responses; use pagination or download to view the rest.`);
      selectAllWarningShown.current = true;
    }
  }, []);
  const [fetchMoreResponses] = useLazyQuery(getResponsesLazyQuery, {
    fetchPolicy: "no-cache",
    onCompleted: (data) => {
      const responseArray = data.response.map(decodeResponse);
      rawResponsesRef.current = responseArray;
      setRawResponses(responseArray);
      setTrackedTotalCount(getAggregateCount(data));
      highestKnownResponseID.current = Math.max(highestKnownResponseID.current, getLatestResponseID(data));
      pageDataLoaded.current = true;
      setOpenBackdrop(false);
    },
    onError: (data) => {
      snackActions.error("Failed to fetch more responses: " + data)
    }
  });
  const [fetchAllResponses] = useLazyQuery(getAllResponsesLazyQuery, {
    fetchPolicy: "no-cache",
    onCompleted: (data) => {
      const responseArray = data.response.map(decodeResponse);
      rawResponsesRef.current = responseArray;
      setRawResponses(responseArray);
      const aggregateCount = getAggregateCount(data);
      setTrackedTotalCount(aggregateCount);
      highestKnownResponseID.current = Math.max(highestKnownResponseID.current, getLatestResponseID(data));
      pageDataLoaded.current = true;
      currentPageRef.current = 1;
      setCurrentPage(1);
      warnSelectAllCapped(responseArray.length, aggregateCount);
      setOpenBackdrop(false);
    },
    onError: (data) => {
      snackActions.error("Failed to fetch all responses: " + data)
    }
  });
  const fetchResponsePage = React.useCallback( (requestedPage, showBackdrop=true) => {
    const nextPage = Math.max(1, requestedPage || 1);
    currentPageRef.current = nextPage;
    setCurrentPage(nextPage);
    if(showBackdrop){
      setOpenBackdrop(true);
    }
    fetchMoreResponses({variables: {task_id: props.task.id,
        fetchLimit: pageSize,
        offset: pageSize * (nextPage - 1),
        where: responseWhereClause(props.task.id, search)
      }})
  }, [fetchMoreResponses, pageSize, props.task.id, search]);
  const fetchSelectAllResponses = React.useCallback( () => {
    currentPageRef.current = 1;
    setCurrentPage(1);
    setOpenBackdrop(true);
    fetchAllResponses({variables: {
      task_id: props.task.id,
      where: responseWhereClause(props.task.id, search),
      fetchLimit: MAX_SELECT_ALL_RESPONSES
    }});
  }, [fetchAllResponses, props.task.id, search]);
  React.useEffect( () => {
    setOpenBackdrop(true);
    rawResponsesRef.current = [];
    setRawResponses([]);
    setTrackedTotalCount(0);
    currentPageRef.current = 1;
    setCurrentPage(1);
    highestKnownResponseID.current = 0;
    pageDataLoaded.current = false;
    taskResponseCountRef.current = props.task.response_count || 0;
    selectAllWarningShown.current = false;
  }, [props.task.id]);
  React.useEffect( () => {
    if(props.selectAllOutput){
      fetchSelectAllResponses();
    }else{
      fetchResponsePage(1);
    }
  }, [props.selectAllOutput, props.task.id, search, fetchResponsePage, fetchSelectAllResponses]);
  React.useEffect( () => {
    if(!openBackdrop){
      return;
    }
    const timeoutID = setTimeout(() => {
      setOpenBackdrop(false);
    }, 1000);
    return () => clearTimeout(timeoutID);
  }, [openBackdrop]);
  React.useEffect( () => {
    taskResponseCountRef.current = props.task.response_count || 0;
    if(search !== ""){
      return;
    }
    if(props.task.response_count > totalCountRef.current){
      setTrackedTotalCount(props.task.response_count);
    }
  }, [props.task.response_count, search, setTrackedTotalCount]);
  const subscriptionDataCallback = React.useCallback( ({data}) => {
    const streamedResponses = data?.data?.response_stream || [];
    if(streamedResponses.length === 0 || !pageDataLoaded.current){
      return;
    }
    const previousHighestID = highestKnownResponseID.current;
    const newStreamedResponses = streamedResponses.filter( (response) => response.id > previousHighestID);
    if(newStreamedResponses.length === 0){
      return;
    }
    highestKnownResponseID.current = Math.max(previousHighestID, ...newStreamedResponses.map( (response) => response.id));
    if(search !== ""){
      const lowerCaseSearch = search.toLowerCase();
      const matchingResponseStreamed = newStreamedResponses.some( (response) => {
        return b64DecodeUnicode(response.response).toLowerCase().includes(lowerCaseSearch);
      });
      if(matchingResponseStreamed){
        fetchResponsePage(currentPageRef.current, false);
      }
      return;
    }
    const currentTotalCount = Math.max(totalCountRef.current, taskResponseCountRef.current);
    if(props.selectAllOutput){
      const previousResponses = rawResponsesRef.current;
      if(previousResponses.length >= MAX_SELECT_ALL_RESPONSES){
        warnSelectAllCapped(previousResponses.length, currentTotalCount);
        return;
      }
      const remainingResponseSlots = MAX_SELECT_ALL_RESPONSES - previousResponses.length;
      const decodedResponses = newStreamedResponses.slice(0, remainingResponseSlots).map(decodeResponse);
      const mergedResponses = mergeResponsesById({
        existingResponses: previousResponses,
        incomingResponses: decodedResponses,
        limit: MAX_SELECT_ALL_RESPONSES,
      });
      rawResponsesRef.current = mergedResponses;
      setRawResponses(mergedResponses);
      warnSelectAllCapped(mergedResponses.length, currentTotalCount);
      return;
    }
    const pageStartIndex = (currentPageRef.current - 1) * pageSize;
    const pageEndIndex = currentPageRef.current * pageSize;
    const streamedStartIndex = Math.max(0, currentTotalCount - newStreamedResponses.length);
    const streamedEndIndex = currentTotalCount;
    if(streamedStartIndex >= pageEndIndex || streamedEndIndex <= pageStartIndex){
      return;
    }
    const visibleStreamedResponses = newStreamedResponses.reduce( (responses, response, index) => {
      const responseIndex = streamedStartIndex + index;
      if(responseIndex >= pageStartIndex && responseIndex < pageEndIndex){
        return [...responses, decodeResponse(response)];
      }
      return responses;
    }, []);
    if(visibleStreamedResponses.length === 0){
      return;
    }
    const mergedResponses = mergeResponsesById({
      existingResponses: rawResponsesRef.current,
      incomingResponses: visibleStreamedResponses,
      limit: pageSize,
    });
    rawResponsesRef.current = mergedResponses;
    setRawResponses(mergedResponses);
  }, [fetchResponsePage, pageSize, props.selectAllOutput, search, warnSelectAllCapped]);
  useSubscription(subResponsesStream, {
    variables: {task_id: props.task.id},
    fetchPolicy: "no-cache",
    onData: subscriptionDataCallback
  });
  const onSubmitPageChange = (nextPage) => {
    fetchResponsePage(nextPage);
  }
  const onSubmitSearch = React.useCallback( (newSearch) => {
    selectAllWarningShown.current = false;
    currentPageRef.current = 1;
    setCurrentPage(1);
    setSearch(newSearch || "");
  }, []);

  return (
      <div style={{display: "flex", flexDirection: "column", height: "100%", width: "100%", position: "relative",
          backgroundColor: theme.outputBackgroundColor + (theme.palette.mode === 'dark' ? "D0" : "D0"),
          color: theme.outputTextColor,
      }}>
        <Backdrop open={openBackdrop} onClick={()=>{setOpenBackdrop(false);}} style={{zIndex: 2, position: "absolute"}}>
          <CircularProgress color="inherit" disableShrink  />
        </Backdrop>
        {props.searchOutput &&
            <SearchBar onSubmitSearch={onSubmitSearch} />
        }
        <div style={{overflowY: "auto", flexGrow: 1, width: "100%", height: props.expand ? "100%": undefined, display: "flex", flexDirection: "column"}} ref={props.responseRef}>
          <ResponseDisplayComponent rawResponses={rawResponses} viewBrowserScript={props.viewBrowserScript}
                                    output={output} command_id={props.command_id} displayType={"accordion"}
                                    task={props.task} search={search} expand={props.expand}/>
        </div>
        <PaginationBar selectAllOutput={props.selectAllOutput} totalCount={totalCount} pageSize={pageSize}
                       onSubmitPageChange={onSubmitPageChange} task={props.task} search={search}
                       currentPage={currentPage} />
      </div>
  )
}
export const ResponseDisplayConsole = (props) => {
  const interactive = props?.task?.command?.supported_ui_features.includes("task_response:interactive") || false;
  return (
      interactive ? (
          <ResponseDisplayInteractive {...props} />
      ) : (
          <NonInteractiveResponseDisplayConsole {...props} />
      )
  )
}
export const NonInteractiveResponseDisplayConsole = (props) => {
  const [rawResponses, setRawResponses] = React.useState([]);
  const rawResponsesRef = React.useRef([]);
  const initialResponseStreamLimit = GetMythicSetting({setting_name: "experiment-responseStreamLimit", default_value: operatorSettingDefaults["experiment-responseStreamLimit"]});
  const responseWindowSize = normalizeResponsePageSize(initialResponseStreamLimit);
  const output = React.useMemo(() => responsesToOutput(rawResponses), [rawResponses]);
  const consoleWindowWarningShown = React.useRef(false);
  React.useEffect( () => {
    rawResponsesRef.current = rawResponses;
  }, [rawResponses]);
  React.useEffect( () => {
    rawResponsesRef.current = [];
    setRawResponses([]);
    consoleWindowWarningShown.current = false;
  }, [props.task.id]);
  const subscriptionDataCallback = React.useCallback( ({data}) => {
    const streamedResponses = data?.data?.response_stream || [];
    if(streamedResponses.length === 0){
      return;
    }
    const decodedResponses = streamedResponses.map(decodeResponse);
    const previousResponses = rawResponsesRef.current;
    const mergedResponses = mergeResponsesById({
      existingResponses: previousResponses,
      incomingResponses: decodedResponses,
      limit: responseWindowSize,
      keepNewest: true,
    });
    rawResponsesRef.current = mergedResponses;
    setRawResponses(mergedResponses);
    if(mergedResponses.length === responseWindowSize &&
        previousResponses.length + decodedResponses.length > responseWindowSize &&
        !consoleWindowWarningShown.current){
      consoleWindowWarningShown.current = true;
      snackActions.warning(`Console output is showing the latest ${responseWindowSize} responses. Older output is available through paginated task output or download.`);
    }
  }, [responseWindowSize]);
  useSubscription(subResponsesStream, {
    variables: {task_id: props.task.id},
    fetchPolicy: "no-cache",
    onData: subscriptionDataCallback
  });

  return (
      <React.Fragment>
        <div style={{overflowY: "auto", width: "100%", height: props.expand ? "100%" : undefined}}
             ref={props.responseRef}>
          <ResponseDisplayComponent rawResponses={rawResponses} viewBrowserScript={props.viewBrowserScript}
                                    output={output} command_id={props.command_id} displayType={"console"}
                                    task={props.task} search={""} expand={props.expand}/>
        </div>
        <div id={'scrolltotaskbottom' + props.task.id}></div>
      </React.Fragment>
  )
}

export const PaginationBar = ({selectAllOutput, totalCount, onSubmitPageChange, task, search, pageSize, currentPage}) => {
  const [localTotalCount, setTotalcount] = React.useState(0);
  const onChangePage =  (event, value) => {
    onSubmitPageChange(value);
  };
  React.useEffect( () => {
    setTotalcount(totalCount);
  }, [totalCount, search, selectAllOutput]);
  const pageCount = Math.max(1, Math.ceil(localTotalCount / pageSize));
  // don't bother people with pagination information if they haven't even started paginating
  if(selectAllOutput || pageCount < 2 || pageCount === Infinity || isNaN(pageCount)){
    return (<div id={'scrolltotaskbottom' + task.id}></div>)
  }
  return (
    <div id={'scrolltotaskbottom' + task.id} style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center", paddingBottom: "10px",}} >
        <Pagination count={pageCount} page={currentPage} variant="contained" color="primary" showFirstButton showLastButton
                    boundaryCount={4} onChange={onChangePage} style={{margin: "10px"}} siblingCount={2}
        />
        <Typography style={{paddingLeft: "10px"}}>Total Results: {localTotalCount}</Typography>
    </div>
  )
}

export const SearchBar = ({onSubmitSearch}) => {
  const theme = useTheme();
  const [search, setSearch] = React.useState("");
  const onSubmitLocalSearch = () => {
    onSubmitSearch(search);
  }
  return (
    <div style={{marginTop: "10px"}}>
      <MythicTextField value={search} autoFocus onEnter={onSubmitLocalSearch} onChange={(n,v,e) => setSearch(v)} placeholder="Search All Output of This Task" name="Search..."
        InputProps={{
          endAdornment: 
          <React.Fragment>
              <MythicStyledTooltip title="Search">
                  <IconButton onClick={onSubmitLocalSearch} size="large"><SearchIcon style={{color: theme.palette.info.main}}/></IconButton>
              </MythicStyledTooltip>
          </React.Fragment>,
          style: {padding: 0}
      }}
      ></MythicTextField>
    </div>
  );
}

const ResponseDisplayComponent = ({rawResponses, viewBrowserScript, output, command_id, task, search, expand, displayType}) => {
  const [localViewBrowserScript, setViewBrowserScript] = React.useState(true);
  const [browserScriptData, setBrowserScriptData] = React.useState(undefined);
  const [loadingBrowserScript, setLoadingBrowserScript] = React.useState(true);
  const script = React.useRef(undefined);
  const filterOutput = (scriptData) => {
    if(search === ""){
      return scriptData;
    }
    let copied = {...scriptData};

    if(scriptData["plaintext"] !== undefined){
      if(!scriptData["plaintext"].includes(search)){
        copied["plaintext"] = "";
      }
    }
    if(scriptData["table"] !== undefined){
      if(scriptData["table"].length > 0){
        copied["table"] = scriptData.table.map(t => {
          const filteredRows = t.rows.filter(r => {
            let foundMatch = false;
            for (const entry of Object.values(r)) {
              if (entry["plaintext"] !== undefined) {
                if (String(entry["plaintext"]).toLowerCase().includes(search)) {
                  foundMatch = true;
                }
              }
              if (entry["button"] !== undefined && entry["button"]["value"] !== undefined) {
                if (JSON.stringify(entry["button"]["value"]).includes(search)) {
                  foundMatch = true;
                }
              }
            }
            return foundMatch;
          });
          return {...t, rows: filteredRows};
        });
      }
    }

    return copied;
  }
  useEffect( () => {
    if(loadingBrowserScript){
      return;
    }
    if(script.current === undefined){
      setViewBrowserScript(false);
      setBrowserScriptData({});
      return;
    }
    if(viewBrowserScript){
      try{
        const rawResponseData = rawResponses.map(c => c.response);
        let res = script.current(task, rawResponseData);
        if(Object.keys(res).length === 0){
          setBrowserScriptData({});
          return;
        }
        setViewBrowserScript(viewBrowserScript);
        setBrowserScriptData(filterOutput(res));
      }catch(error){
        if(rawResponses.length > 0){
          setViewBrowserScript(false);
          setBrowserScriptData({});
          console.log(error);
        }
      }
    } else {
      return;
    }
  }, [rawResponses, task, loadingBrowserScript, viewBrowserScript]);
  const [fetchScripts] = useLazyQuery(taskScript, {
    fetchPolicy: "no-cache",
    onCompleted: (data) => {
      if(data.browserscript.length > 0){
        try{
          script.current = Function(`"use strict";return(${data.browserscript[0]["script"]})`)();
          setBrowserScriptData(undefined);
        }catch(error){
          script.current = undefined;
          setBrowserScriptData({});
          console.log(error);
        }
      }else{
        setViewBrowserScript(false);
        setBrowserScriptData({});
      }
      setLoadingBrowserScript(false);
    },
    onError: (data) => {
      console.log("error loading scripts", data);
    }
  });
  useEffect( () => {
    if(command_id !== undefined){
      setLoadingBrowserScript(true);
      setBrowserScriptData(undefined);
      setViewBrowserScript(true);
      fetchScripts({variables: {command_id: command_id}});
    }
  }, [command_id, task.id]);
  const stateSx = {
    backgroundColor: "transparent",
    color: "inherit",
    height: expand ? "100%" : undefined,
  };
  if(loadingBrowserScript){
    return (
      <MythicLoadingState
        compact
        title="Preparing output"
        description="Loading the response renderer for this command."
        sx={stateSx}
      />
    )
  }
  if(rawResponses.length === 0 && output.length === 0){
    return search ? (
      <MythicSearchEmptyState
        compact
        description="No task output matched the current search."
        sx={stateSx}
      />
    ) : (
      <MythicEmptyState
        compact
        title="No output yet"
        description="Task output will appear here as responses arrive."
        sx={stateSx}
      />
    )
  }
  const shouldUseBrowserScript = viewBrowserScript && localViewBrowserScript;
  if(shouldUseBrowserScript && browserScriptData === undefined){
    return (
      <MythicLoadingState
        compact
        title="Rendering output"
        description="Preparing the browser script view."
        sx={stateSx}
      />
    )
  }
  return (
    shouldUseBrowserScript ? (
        <ResponseDisplayBrowserScriptComponent expand={expand} displayType={displayType}
                                               task={task} browserScriptData={browserScriptData}
                                               output={output} allowPlaintextFallback={false}/>
    ) : (
      <ResponseDisplayPlaintext plaintext={output} task={task} expand={expand} displayType={displayType}/>
    )
  )
}

export function ResponseDisplayBrowserScriptComponent({output, browserScriptData, task, expand, displayType, allowPlaintextFallback=true}) {
  return (
      <>
        {Object.keys(browserScriptData).length > 0 ? (
            <>
              {browserScriptData?.screenshot?.map( (scr, index) => (
                  <ResponseDisplayScreenshot key={"screenshot" + index + 'fortask' + task.id} task={task} {...scr}
                                             displayType={displayType} expand={expand} />
              ))
              }
              {browserScriptData?.plaintext !== undefined &&
                  <ResponseDisplayPlaintext plaintext={browserScriptData["plaintext"]} task={task}
                                            expand={expand} displayType={displayType} />
              }
              {browserScriptData?.table?.map( (table, index) => (
                  <ResponseDisplayTable callback_id={task.callback_id} task={task} expand={expand}
                                        table={table} key={"tablefortask" + task.id + "table" + index}
                                        displayType={displayType}
                  />
              ))
              }
              {browserScriptData?.download?.map( (dl, index) => (
                  <ResponseDisplayDownload download={dl} task={task} displayType={displayType}
                                           key={"download" + index + "fortask" + task.id} />
              ))
              }
              {browserScriptData?.search?.map( (s, index) => (
                  <ResponseDisplaySearch search={s} task={task} displayType={displayType}
                                         key={"searchlink" + index + "fortask" + task.id} />
              ))
              }
              {browserScriptData?.media?.map( (s, index) => (
                  <ResponseDisplayMedia key={"searchmedia" + index + "fortask" + task.id}
                                        displayType={displayType}
                                        task={task} media={s} expand={expand} />
              ))}
              {browserScriptData?.graph !== undefined &&
                  <ResponseDisplayGraph graph={browserScriptData.graph} task={task}
                                        expand={expand} displayType={displayType} />
              }
              {browserScriptData.tabs && browserScriptData.tabs.length > 0 &&
                <ResponseDisplayTabs task={task} expand={expand} displayType={displayType} tabs={browserScriptData.tabs} output={output} />
              }
            </>
            ) : (
                allowPlaintextFallback ? (
                    <ResponseDisplayPlaintext plaintext={output} task={task} expand={expand} displayType={displayType}/>
                ) : null
            )
        }
      </>
  )
}
