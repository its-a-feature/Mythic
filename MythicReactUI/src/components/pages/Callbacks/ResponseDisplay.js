import React, {useEffect} from 'react';
import {gql, useLazyQuery, useReactiveVar, useSubscription} from '@apollo/client';
import {meState} from '../../../cache';
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

const subResponsesQuery = gql`
subscription subResponsesQuery($task_id: Int!, $fetchLimit: Int!) {
  response(where: {task_id: {_eq: $task_id}}, limit: $fetchLimit, order_by: {id: asc}) {
    id
    response: response_text
    timestamp
    is_error
  }
}`;
const subResponsesStream = gql`
subscription subResponsesStream($task_id: Int!){
  response_stream(
    batch_size: 20,
    cursor: {initial_value: {id: 0}},
    where: {task_id: {_eq: $task_id} }
  ){
    id
    response: response_text
    timestamp
  }
}
`;
const getResponsesLazyQuery = gql`
query subResponsesQuery($task_id: Int!, $fetchLimit: Int!, $offset: Int!, $search: String!) {
  response(where: {task_id: {_eq: $task_id}, response_escape: {_ilike: $search}}, limit: $fetchLimit, offset: $offset, order_by: {id: asc}) {
    id
    response: response_text
    timestamp
    is_error
  }
  response_aggregate(where: {task_id: {_eq: $task_id}, response_escape: {_ilike: $search}}){
    aggregate{
      count
    }
  }
}`;
const getAllResponsesLazyQuery = gql`
query subResponsesQuery($task_id: Int!, $search: String!) {
  response(where: {task_id: {_eq: $task_id}, response_escape: {_ilike: $search}}, order_by: {id: asc}) {
    id
    response: response_text
    timestamp
    is_error
  }
  response_aggregate(where: {task_id: {_eq: $task_id}, response_escape: {_ilike: $search}}){
    aggregate{
      count
    }
  }
}`;
const taskScript = gql`
query getBrowserScriptsQuery($command_id: Int!, $operator_id: Int!){
  browserscript(where: {active: {_eq: true}, command_id: {_eq: $command_id}, for_new_ui: {_eq: true}, operator_id: {_eq: $operator_id}}) {
    script
    id
  }
}

`;
const fetchLimit = 10;
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
    return decodeURIComponent(decoder.decode(bytes));
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
export const ResponseDisplay = (props) =>{
  const interactive = props?.task?.command?.supported_ui_features.includes("task_response:interactive") || false;
  return (
      interactive ? (
          <ResponseDisplayInteractive {...props} />
        ) : (
          <NonInteractiveResponseDisplay {...props} />
        )
  )
}
const NonInteractiveResponseDisplay = (props) => {
  const [output, setOutput] = React.useState("");
  const [rawResponses, setRawResponses] = React.useState([]);
  const highestFetched = React.useRef(0);
  const taskID = React.useRef(props.task.id);
  const [search, setSearch] = React.useState("");
  const [totalCount, setTotalCount] = React.useState(0);
  const oldSelectAllOutput = React.useRef(props.selectAllOutput);
  const [openBackdrop, setOpenBackdrop] = React.useState(true);
  const [fetchMoreResponses] = useLazyQuery(getResponsesLazyQuery, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      const responses = data.response.reduce( (prev, cur) => {
        return prev + b64DecodeUnicode(cur.response);
      }, b64DecodeUnicode(""));
      const maxID = data.response.reduce( (prev, cur) => {
        if(cur.id > prev){
          return cur.id;
        }
        return prev;
      }, highestFetched.current);
      highestFetched.current = maxID;
      setOutput(responses);
      const responseArray = data.response.map( r =>{ return {...r, response: b64DecodeUnicode(r.response)}});
      setRawResponses(responseArray);
      if(!props.selectAllOutput){
        setTotalCount(data.response_aggregate.aggregate.count);
      }
      setOpenBackdrop(false);
    },
    onError: (data) => {
      snackActions.error("Failed to fetch more responses: " + data)
    }
  });
  const [fetchAllResponses] = useLazyQuery(getAllResponsesLazyQuery, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      const responses = data.response.reduce( (prev, cur) => {
        return prev + b64DecodeUnicode(cur.response);
      }, b64DecodeUnicode(""));
      const maxID = data.response.reduce( (prev, cur) => {
        if(cur.id > prev){
          return cur.id;
        }
        return prev;
      }, highestFetched.current);
      highestFetched.current = maxID;
      setOutput(responses);
      const responseArray = data.response.map( r =>{ return {...r, response: b64DecodeUnicode(r.response)}});
      setRawResponses(responseArray);
      setTotalCount(1);
      setOpenBackdrop(false);
    },
    onError: (data) => {

    }
  });
  React.useEffect( () => {
    if(props.selectAllOutput !== oldSelectAllOutput.current){
      if(props.selectAllOutput){
        setOpenBackdrop(true);
        if(search === ""){
          fetchAllResponses({variables: {task_id: props.task.id, search: "%%"}})
        }else{
          fetchAllResponses({variables: {task_id: props.task.id, search: "%" + search + "%"}})
        }
      }
    }
  }, [props.selectAllOutput, oldSelectAllOutput]);
  React.useEffect( () => {
    setOpenBackdrop(true);
  }, [props.task.id]);
  const subscriptionDataCallback = React.useCallback( ({data}) => {
    //console.log("fetchLimit", fetchLimit, "totalCount", totalCount);
    if(props.task.id !== taskID.current){
      taskID.current = props.task.id;
      const responses = data.data.response.reduce( (prev, cur) => {
        return prev + b64DecodeUnicode(cur.response);
      }, b64DecodeUnicode(""));
      highestFetched.current = data.data.response.reduce((prev, cur) => {
        if (cur.id > prev) {
          return cur.id;
        }
        return prev;
      }, highestFetched.current);
      setOutput(responses);
      const responseArray = data.data.response.map( r =>{ return {...r, response: b64DecodeUnicode(r.response)}});
      setRawResponses(responseArray);
      setTotalCount(0);
      setOpenBackdrop(false);
    } else {
      if(totalCount >= fetchLimit){
        // we won't display it
        console.log("got more than we can see currently", totalCount);
        setOpenBackdrop(false);
        return;
      }
      // we still have some room to view more, but only room for fetchLimit - totalFetched.current

      const newResponses = data.data.response.filter( r => r.id > highestFetched.current);
      const newerResponses = newResponses.map( (r) => { return {...r, response: b64DecodeUnicode(r.response)}});
      //const newerResponses = data.data.response.map( (r) => { return {...r, response: b64DecodeUnicode(r.response)}});
      newerResponses.sort( (a,b) => a.id > b.id ? 1 : -1);
      let outputResponses = output;
      //let outputResponses = "";
      let rawResponseArray = [...rawResponses];
      let highestFetchedId = highestFetched.current;
      let totalFetchedSoFar = totalCount;
      for(let i = 0; i < newerResponses.length; i++){
        if(totalFetchedSoFar < fetchLimit){
          outputResponses += newerResponses[i]["response"];
          rawResponseArray.push(newerResponses[i]);
          highestFetchedId = newerResponses[i]["id"];
          totalFetchedSoFar += 1;
        }else{
          break;
        }
      }
      //console.log("updated output", outputResponses)
      setOutput(outputResponses);
      setRawResponses(rawResponseArray);
      setOpenBackdrop(false);
      highestFetched.current = highestFetchedId;
    }


  }, [output, highestFetched.current, rawResponses, totalCount, openBackdrop, props.task.id]);
  useSubscription(subResponsesQuery, {
    variables: {task_id: props.task.id, fetchLimit: fetchLimit},
    fetchPolicy: "network_only",
    onData: subscriptionDataCallback
  });
  const onSubmitPageChange = (currentPage) => {
    if(!props.selectAllOutput){
      setOpenBackdrop(true);
      if(search === undefined || search === ""){
        fetchMoreResponses({variables: {task_id: props.task.id,
            fetchLimit: fetchLimit,
            offset: fetchLimit * (currentPage - 1),
            search: "%_%"
          }})
      }else{
        fetchMoreResponses({variables: {task_id: props.task.id,
            fetchLimit: fetchLimit,
            offset: fetchLimit * (currentPage - 1),
            search: "%" +  search + "%"
          }})
      }
    }

  }
  const onSubmitSearch = React.useCallback( (newSearch) => {
    setSearch(newSearch);
    setOpenBackdrop(true);
    if(newSearch === undefined || newSearch === ""){
      if(props.selectAllOutput){
        fetchAllResponses({variables: {task_id: props.task.id, search: "%%"}})
      }else{
        fetchMoreResponses({variables: {task_id: props.task.id,
            fetchLimit: fetchLimit,
            offset: 0,
            search: "%_%"
          }})
      }

    }else{
      if(props.selectAllOutput){
        fetchAllResponses({variables: {task_id: props.task.id, search: "%" + newSearch + "%"}})
      }else{
        fetchMoreResponses({variables: {task_id: props.task.id,
            fetchLimit: fetchLimit,
            offset: 0,
            search: "%" + newSearch + "%"
          }})
      }

    }
  }, []);

  return (
      <React.Fragment>
        <Backdrop open={openBackdrop} onClick={()=>{setOpenBackdrop(false);}} style={{zIndex: 2, position: "absolute"}}>
          <CircularProgress color="inherit" disableShrink  />
        </Backdrop>
        {props.searchOutput &&
            <SearchBar onSubmitSearch={onSubmitSearch} />
        }
        <div style={{overflowY: "auto", width: "100%", height: props.expand ? "100%": undefined}} ref={props.responseRef}>
          <ResponseDisplayComponent rawResponses={rawResponses} viewBrowserScript={props.viewBrowserScript}
                                    output={output} command_id={props.command_id}
                                    task={props.task} search={search} expand={props.expand}/>
        </div>
        <PaginationBar selectAllOutput={props.selectAllOutput} totalCount={totalCount} pageSize={fetchLimit}
                       onSubmitPageChange={onSubmitPageChange} task={props.task} search={search} />
      </React.Fragment>
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
  const [output, setOutput] = React.useState("");
  const [rawResponses, setRawResponses] = React.useState([]);
  const taskID = React.useRef(props.task.id);
  const subscriptionDataCallback = React.useCallback( ({data}) => {
    //console.log("fetchLimit", fetchLimit, "totalCount", totalCount);
    if(props.task.id !== taskID.current){
      taskID.current = props.task.id;
      const responses = data.data.response_stream.reduce( (prev, cur) => {
        return prev + b64DecodeUnicode(cur.response);
      }, b64DecodeUnicode(""));
      setOutput(responses);
      const responseArray = data.data.response_stream.map( r =>{ return {...r, response: b64DecodeUnicode(r.response)}});
      setRawResponses(responseArray);
    } else {
      const newerResponses = data.data.response_stream.map( (r) => { return {...r, response: b64DecodeUnicode(r.response)}});
      newerResponses.sort( (a,b) => a.id > b.id ? 1 : -1);
      let outputResponses = output;
      let rawResponseArray = [...rawResponses];
      for(let i = 0; i < newerResponses.length; i++){
          outputResponses += newerResponses[i]["response"];
          rawResponseArray.push(newerResponses[i]);
      }
      //console.log("updated output", outputResponses)
      setOutput(outputResponses);
      setRawResponses(rawResponseArray);
    }


  }, [output, rawResponses, props.task.id]);
  useSubscription(subResponsesStream, {
    variables: {task_id: props.task.id},
    fetchPolicy: "network_only",
    onData: subscriptionDataCallback
  });
  const onSubmitSearch = React.useCallback( (newSearch) => {
    snackActions.warning("Search not supported for console view");
  }, []);

  return (
      <React.Fragment>
        {props.searchOutput &&
            <SearchBar onSubmitSearch={onSubmitSearch} />
        }
        <div style={{overflowY: "auto", width: "100%", height: props.expand ? "100%": undefined}} ref={props.responseRef}>
          <ResponseDisplayComponent rawResponses={rawResponses} viewBrowserScript={props.viewBrowserScript}
                                    output={output} command_id={props.command_id}
                                    task={props.task} search={""} expand={props.expand}/>
        </div>
      </React.Fragment>
  )
}

export const PaginationBar = ({selectAllOutput, totalCount, onSubmitPageChange, task, search, pageSize}) => {
  const [localTotalCount, setTotalcount] = React.useState(0);
  const [maxCount, setMaxCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const onChangePage =  (event, value) => {
    setCurrentPage(value);
    onSubmitPageChange(value);
  };
  React.useEffect( () => {
    if(maxCount !== task.response_count){
      setMaxCount(task.response_count);
    }
  }, [task.response_count]);
  React.useEffect( () => {
    if(selectAllOutput){
      setTotalcount(1);
      setCurrentPage(1);
    }else if(totalCount === 0) {
      setTotalcount(maxCount);
    }else{
      setTotalcount(totalCount);
    }
  }, [totalCount, maxCount, search, selectAllOutput]);
  const pageCount = Math.max(1, Math.ceil(localTotalCount / pageSize));
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
      <MythicTextField value={search} autoFocus onEnter={onSubmitLocalSearch} onChange={(n,v,e) => setSearch(v)} placeholder="Search Output of This Task" name="Search..."
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

const ResponseDisplayComponent = ({rawResponses, viewBrowserScript, output, command_id, task, search, expand}) => {
  const [localViewBrowserScript, setViewBrowserScript] = React.useState(true);
  const [browserScriptData, setBrowserScriptData] = React.useState({});
  const script = React.useRef();
  const me = useReactiveVar(meState);
  useEffect( () => {
    if(script.current !== undefined){
      try{
        const rawResponseData = rawResponses.map(c => c.response);
        let res = script.current(task, rawResponseData);
        setBrowserScriptData(filterOutput(res));
      }catch(error){
        setViewBrowserScript(false);
        setBrowserScriptData({});
        console.log(error);
      }
      
    }
  }, [rawResponses, task]);
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
        const tableUpdates = scriptData.table.map( t => {
          const filteredRows = t.rows.filter( r => {
            let foundMatch = false;
            for (const entry of Object.values(r)) {
              if(entry["plaintext"] !== undefined){
                if(String(entry["plaintext"]).includes(search)){foundMatch = true;}
              }
              if(entry["button"] !== undefined && entry["button"]["value"] !== undefined){
                if(JSON.stringify(entry["button"]["value"]).includes(search)){foundMatch = true;}
              }
            }
            return foundMatch;
          });
          return {...t, rows: filteredRows};
        });
        copied["table"] = tableUpdates;
      }
    }
    return copied;
  }
  useEffect( () => {
    if(script.current === undefined){
      setViewBrowserScript(false);
    }else{
      setViewBrowserScript(viewBrowserScript);
      if(viewBrowserScript && script.current !== undefined){
        try{
          const rawResponseData = rawResponses.map(c => c.response);
          let res = script.current(task, rawResponseData);
          setBrowserScriptData(filterOutput(res));
        }catch(error){
          setViewBrowserScript(false);
        }
          
      }
    }
  }, [viewBrowserScript, rawResponses]);
  const [fetchScripts] = useLazyQuery(taskScript, {
    fetchPolicy: "no-cache",
    onCompleted: (data) => {
      if(data.browserscript.length > 0){
        try{
          //let unb64script = b64DecodeUnicode(data.browserscript[0]["script"]);
          //script.current = Function('"use strict";return(' + unb64script + ')')();
          script.current = Function(`"use strict";return(${data.browserscript[0]["script"]})`)();
          setViewBrowserScript(true);
          //console.log(rawResponses);
          const rawResponseData = rawResponses.map(c => c.response);
          let res = script.current(task, rawResponseData);
          setBrowserScriptData(filterOutput(res));
        }catch(error){
          //snackActions.error(error.toString());
          console.log(error);
          setViewBrowserScript(false);
          setBrowserScriptData({});
        }
      }else{
        setViewBrowserScript(false);
        setBrowserScriptData({});
      }
    },
    onError: (data) => {
      console.log(data);
    }
  });
  useEffect( () => {
    if(command_id !== undefined){
      fetchScripts({variables: {command_id: command_id, operator_id: me.user.user_id, operation_id: me.user.current_operation_id}});
    }
  }, [command_id, task.id]);
  return (
    localViewBrowserScript && browserScriptData ? (
      <React.Fragment>
          {browserScriptData?.screenshot?.map( (scr, index) => (
              <ResponseDisplayScreenshot key={"screenshot" + index + 'fortask' + task.id} {...scr} />
            )) || null
          }
          {browserScriptData?.plaintext &&
            <ResponseDisplayPlaintext plaintext={browserScriptData["plaintext"]} expand={expand} />
          }
          {browserScriptData?.table?.map( (table, index) => (
              <ResponseDisplayTable callback_id={task.callback_id} expand={expand} table={table} key={"tablefortask" + task.id + "table" + index} />
            )) || null
          }
          {browserScriptData?.download?.map( (dl, index) => (
              <ResponseDisplayDownload download={dl} key={"download" + index + "fortask" + task.id} />
            )) || null
          }
          {browserScriptData?.search?.map( (s, index) => (
              <ResponseDisplaySearch search={s} key={"searchlink" + index + "fortask" + task.id} />
          )) || null
          }
      </React.Fragment>
    ) : (
      <ResponseDisplayPlaintext plaintext={output} expand={expand}/>
    )
  )
}