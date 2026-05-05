import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {createTaskingMutation, taskingDataFragment} from './CallbackMutations';
import {snackActions} from "../../utilities/Snackbar";
import { gql, useLazyQuery, useMutation, useSubscription } from '@apollo/client';
import {b64DecodeUnicode} from "./ResponseDisplay";
import {SearchBar} from './ResponseDisplay';
import Pagination from '@mui/material/Pagination';
import {Typography, CircularProgress, Select, IconButton, Backdrop} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Input from '@mui/material/Input';
import MenuItem from '@mui/material/MenuItem';
import Anser from "anser";
import PaletteIcon from '@mui/icons-material/Palette';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import './ResponseDisplayInteractiveANSI.css';
import {Terminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import WrapTextIcon from '@mui/icons-material/WrapText';
import {useTheme} from '@mui/material/styles';
import HeightIcon from '@mui/icons-material/Height';
import {MythicEmptyState} from "../../MythicComponents/MythicStateDisplay";

const getInteractiveTaskingQuery = gql`
${taskingDataFragment}
subscription getTasking($parent_task_id: Int!){
    task_stream(where: {parent_task_id: {_eq: $parent_task_id}, is_interactive_task: {_eq: true}}, batch_size: 50, cursor: {initial_value: {timestamp: "1970-01-01"}}) {
        ...taskData
    }
}
 `;
const subResponsesQuery = gql`
subscription subResponsesQuery($task_id: Int!) {
  response_stream(where: {task_id: {_eq: $task_id}}, batch_size: 50, cursor: {initial_value: {id: 0}}) {
    id
    response: response_text
    timestamp
    is_error
  }
}`;
const getInteractiveResponsesPageQuery = gql`
query getInteractiveResponsesPage($task_id: Int!, $fetchLimit: Int!, $offset: Int!, $where: response_bool_exp!) {
  response(where: $where, limit: $fetchLimit, offset: $offset, order_by: {id: asc}) {
    id
    response: response_text
    timestamp
    is_error
  }
  response_aggregate(where: $where) {
    aggregate {
      count
    }
  }
  latest_response: response(where: {task_id: {_eq: $task_id}}, limit: 1, order_by: {id: desc}) {
    id
  }
}`;
const MAX_INTERACTIVE_SELECT_ALL_RESPONSES = 5000;
const MAX_INTERACTIVE_TASK_WINDOW = 1000;
const getInteractiveResponseWhereClause = (taskID, search) => {
    if(search === undefined || search === ""){
        return {task_id: {_eq: taskID}};
    }
    return {task_id: {_eq: taskID}, response_escape: {_ilike: "%" + search + "%"}};
}
const decodeInteractiveResponse = (response) => {
    return {...response, response: b64DecodeUnicode(response.response)}
}
const getInteractiveAggregateCount = (data) => {
    return data?.response_aggregate?.aggregate?.count || 0;
}
const getInteractiveLatestResponseID = (data) => {
    return data?.latest_response?.[0]?.id || 0;
}
const getInteractiveEntryTime = (entry) => {
    return new Date(entry?.status_timestamp_preprocessing || entry?.timestamp || 0).getTime();
}
const sortInteractiveEntries = (entries) => {
    return [...entries].sort( (a,b) => {
        const aDate = getInteractiveEntryTime(a);
        const bDate = getInteractiveEntryTime(b);
        if(aDate < bDate){
            return -1;
        }
        if(bDate < aDate){
            return 1;
        }
        return (a.id || 0) < (b.id || 0) ? -1 : 1;
    });
}
const mergeInteractiveTaskData = ({existingTasks, incomingTasks, limit}) => {
    const taskMap = new Map();
    existingTasks.forEach( (task) => taskMap.set(task.id, task));
    incomingTasks.forEach( (task) => taskMap.set(task.id, task));
    const mergedTasks = sortInteractiveEntries(Array.from(taskMap.values()));
    if(mergedTasks.length <= limit){
        return mergedTasks;
    }
    return mergedTasks.slice(-limit);
}
const getVisibleInteractiveTasks = ({taskData, search}) => {
    return search === "" ? taskData : taskData.filter( (task) => {
        return (task.display_params || task.original_params || "").toLowerCase().includes(search.toLowerCase());
    });
}
const getTaskingStatus = (task) => {
    if(task.status === "completed" || task.status === "success"){
        return <CheckCircleOutlineIcon color={"success"} fontSize={"1rem"} style={{marginRight: "2px"}} />
    } else if(task.status === "submitted"){
        return  <CircularProgress size={"1rem"} />
    } else {
        console.log(task.status);
        return null
    }
}
const getClassnames = (entry) => {
    let classnames = [];
    if(entry.decoration && entry.decoration === "reverse"){
        if(entry.fg){
            classnames.push(entry.fg + "-background");
        }
        if(entry.bg){
            classnames.push(entry.bg);
        }
    } else {
        if(entry.fg){
            classnames.push(entry.fg);
        }
        if(entry.bg){
            classnames.push(entry.bg + "-background");
        }
    }

    if(entry.decoration){
        classnames.push("ansi-" + entry.decoration);
    }
    for(let i = 0; i < entry.decorations.length; i++){
        classnames.push("ansi-" + entry.decorations[i])
    }
    if(entry.bg_truecolor || entry.fg_truecolor){
        console.log(entry);
    }
    //console.log(entry);
    return classnames.join(" ");
}
const handleTerminalCodes = (response) => {
    let output = response.replaceAll("[?2004h", "");
    output = output.replaceAll("[?2004l", "");
    let indexOfTitleSeq = output.indexOf("]0");
    if(indexOfTitleSeq >= 0){
        let endIndexOfTitleSeq = output.indexOf("]");
        if(endIndexOfTitleSeq >= 0 && endIndexOfTitleSeq > indexOfTitleSeq){
            output = output.substring(0, indexOfTitleSeq + 2) + output.substring(endIndexOfTitleSeq);
        }
    }
    let indexOfClearLeft = output.indexOf("[J");
    if(indexOfClearLeft >= 0){
        let indexOfLastNewLine = 0;
        for(let i = indexOfClearLeft; i >= 0; i--){
            if(output[i] === "\n"){
                indexOfLastNewLine = i;
                break;
            }
        }
        output = output.substring(0, indexOfLastNewLine+1) + output.substring(indexOfClearLeft + 2);
    }

    return output;
}
export const GetOutputFormatAll = ({data, useASNIColor, messagesEndRef, showTaskStatus, wrapText, autoScroll=false}) => {
    const [dataElement, setDataElement] = React.useState(null);
    React.useEffect( () => {
        const elements = data.map( d => {
            if(d.response !== undefined) {
                // we're looking at response output
                if(d.is_error){
                    return (<pre id={"response" + d.timestamp + d.id} style={{display: "inline",backgroundColor: "#311717", color: "white", margin: "0 0 0 0",
                        wordBreak: wrapText ? "break-all" : "",
                        whiteSpace: wrapText ? "pre-wrap" : ""}} key={d.timestamp + d.id}>
                    {d.response}
                </pre>)
                } else {
                    if(useASNIColor){
                        let removedTerminalCodes = handleTerminalCodes(d.response);
                        let ansiJSON = Anser.ansiToJson(removedTerminalCodes, { use_classes: true });
                        //console.log(ansiJSON)
                        return (
                            ansiJSON.map( (a, i) => (
                                <pre id={"response" + d.timestamp + d.id} style={{display: "inline", margin: "0 0 0 0",
                                    wordBreak: wrapText ? "break-all" : "",
                                    whiteSpace: wrapText ? "pre-wrap" : "",
                                }} className={getClassnames(a)} key={d.id + d.timestamp + i}>{a.content}</pre>
                            ))
                    )
                    } else {
                        return (<pre id={"response" + d.timestamp + d.id} style={{display: "inline", margin: "0 0 0 0",
                            wordBreak: wrapText ? "break-all" : "",
                            whiteSpace: wrapText ? "pre-wrap" : "",
                        }} key={d.timestamp + d.id}>{d.response}</pre>)
                    }

                }
            } else {
                // we're looking at tasking
                return(
                    <pre id={"task" + d.timestamp + d.id} key={d.timestamp + d.id} style={{display: "inline",margin: "0 0 0 0",
                        wordBreak: wrapText ? "break-all" : "", whiteSpace: "pre-wrap"}}>
                    {showTaskStatus && getTaskingStatus(d)}
                        {d.original_params}
                </pre>
                )
            }
        })
        setDataElement(elements);
    }, [data, useASNIColor, showTaskStatus, wrapText]);
    React.useLayoutEffect( () => {
        if(autoScroll){
            messagesEndRef?.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
        }
    }, [autoScroll, dataElement, messagesEndRef]);
    return (
        dataElement
    )

}

const INTERACTIVE_TERMINAL_SCROLLBACK = 5000;
const INTERACTIVE_TERMINAL_MAX_UNWRAPPED_COLS = 300;
const ANSI_STYLE_CODE_REGEX = /\x1b\[[0-?]*[ -/]*m/g;
const TERMINAL_CONTROL_CODE_REGEX = /\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b\[[0-?]*[ -/]*[@-~]|\x1b[ -/]*[@-~]/g;
const stripAnsiStyleCodes = (value) => {
    return value.replace(ANSI_STYLE_CODE_REGEX, "");
}
const getTerminalText = (value) => {
    return value === undefined || value === null ? "" : String(value);
}
const getInteractiveTerminalTheme = (theme) => {
    return {
        background: theme.outputBackgroundColor,
        foreground: theme.outputTextColor,
        cursor: theme.palette.info.main,
        selectionBackground: theme.palette.info.main + "55",
    }
}
const getInteractiveTerminalEntrySignature = (entry) => {
    if(entry.response !== undefined){
        return `response:${entry.id}:${entry.timestamp}:${entry.is_error}:${entry.response.length}`;
    }
    return `task:${entry.id}:${entry.status}:${entry.original_params}:${entry.display_params}`;
}
const getInteractiveTerminalMeasurementText = (value) => {
    return getTerminalText(value).replace(TERMINAL_CONTROL_CODE_REGEX, "");
}
const getInteractiveTerminalEntryMeasurementText = (entry) => {
    if(entry.response !== undefined){
        return getInteractiveTerminalMeasurementText(entry.response);
    }
    return getInteractiveTerminalMeasurementText(entry.original_params || entry.display_params);
}
const getLongestInteractiveTerminalLineLength = (entries) => {
    return entries.reduce( (longestLineLength, entry) => {
        return getInteractiveTerminalEntryMeasurementText(entry).split(/\r\n|\n|\r/).reduce( (longestEntryLineLength, line) => {
            return Math.max(longestEntryLineLength, Array.from(line.replaceAll("\t", "    ")).length);
        }, longestLineLength);
    }, 0);
}
const getInteractiveTerminalTaskStatus = ({task, useASNIColor}) => {
    if(task.status === "completed" || task.status === "success"){
        return useASNIColor ? "\x1b[32m[completed]\x1b[0m " : "[completed] ";
    }
    if(task.status === "submitted"){
        return useASNIColor ? "\x1b[33m[submitted]\x1b[0m " : "[submitted] ";
    }
    if(task.status === "error"){
        return useASNIColor ? "\x1b[31m[error]\x1b[0m " : "[error] ";
    }
    return task.status ? `[${task.status}] ` : "";
}
const formatInteractiveTerminalEntry = ({entry, useASNIColor, showTaskStatus}) => {
    if(entry.response !== undefined){
        const response = useASNIColor ? getTerminalText(entry.response) : stripAnsiStyleCodes(getTerminalText(entry.response));
        if(entry.is_error && useASNIColor){
            return `\x1b[37;41m${response}\x1b[0m`;
        }
        return response;
    }
    const status = showTaskStatus ? getInteractiveTerminalTaskStatus({task: entry, useASNIColor}) : "";
    const prompt = useASNIColor ? "\x1b[36m> \x1b[0m" : "> ";
    return `\r\n${status}${prompt}${getTerminalText(entry.original_params || entry.display_params)}\r\n`;
}
const InteractiveTerminalDisplay = ({data, useASNIColor, showTaskStatus, wrapText, autoScroll, theme}) => {
    const terminalScrollContainerRef = React.useRef(null);
    const terminalElementRef = React.useRef(null);
    const terminalRef = React.useRef(null);
    const fitAddonRef = React.useRef(null);
    const resizeObserverRef = React.useRef(null);
    const fitAnimationFrameRef = React.useRef(null);
    const replayStateRef = React.useRef({settingsKey: "", signatures: []});
    const autoScrollRef = React.useRef(autoScroll);
    const wrapTextRef = React.useRef(wrapText);
    const unwrappedColumnCountRef = React.useRef(0);
    const [terminalReady, setTerminalReady] = React.useState(false);
    const longestLineLength = React.useMemo( () => {
        return getLongestInteractiveTerminalLineLength(data);
    }, [data]);
    const fitTerminal = React.useCallback( () => {
        const terminal = terminalRef.current;
        const fitAddon = fitAddonRef.current;
        const terminalElement = terminalElementRef.current;
        const scrollContainer = terminalScrollContainerRef.current;
        if(!terminal || !fitAddon || !terminalElement || !scrollContainer){
            return;
        }
        try{
            terminalElement.style.width = "100%";
            const proposedDimensions = fitAddon.proposeDimensions();
            if(!proposedDimensions){
                return;
            }
            const rows = Math.max(1, proposedDimensions.rows);
            if(wrapTextRef.current){
                fitAddon.fit();
                scrollContainer.scrollLeft = 0;
            } else {
                const visibleCols = Math.max(1, proposedDimensions.cols);
                const cols = Math.max(visibleCols, unwrappedColumnCountRef.current);
                terminalElement.style.width = `${Math.ceil((cols / visibleCols) * scrollContainer.clientWidth)}px`;
                terminal.resize(cols, rows);
            }
        }catch(error){
            console.error(error);
        }
    }, []);
    const scheduleFitTerminal = React.useCallback( () => {
        if(fitAnimationFrameRef.current !== null){
            return;
        }
        fitAnimationFrameRef.current = window.requestAnimationFrame(() => {
            fitAnimationFrameRef.current = null;
            fitTerminal();
        });
    }, [fitTerminal]);
    React.useEffect( () => {
        autoScrollRef.current = autoScroll;
        if(autoScroll){
            terminalRef.current?.scrollToBottom();
        }
    }, [autoScroll]);
    React.useEffect( () => {
        wrapTextRef.current = wrapText;
        scheduleFitTerminal();
    }, [wrapText, scheduleFitTerminal]);
    React.useEffect( () => {
        if(wrapText){
            unwrappedColumnCountRef.current = 0;
        } else {
            unwrappedColumnCountRef.current = Math.min(Math.max(longestLineLength + 2, 1), INTERACTIVE_TERMINAL_MAX_UNWRAPPED_COLS);
        }
        scheduleFitTerminal();
    }, [longestLineLength, scheduleFitTerminal, wrapText]);
    React.useEffect( () => {
        if(!terminalElementRef.current){
            return;
        }
        const terminal = new Terminal({
            allowTransparency: true,
            convertEol: true,
            cursorBlink: true,
            disableStdin: true,
            fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 13,
            scrollback: INTERACTIVE_TERMINAL_SCROLLBACK,
            theme: getInteractiveTerminalTheme(theme),
        });
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(terminalElementRef.current);
        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;
        resizeObserverRef.current = new ResizeObserver(() => scheduleFitTerminal());
        if(terminalScrollContainerRef.current){
            resizeObserverRef.current.observe(terminalScrollContainerRef.current);
        }
        fitAnimationFrameRef.current = window.requestAnimationFrame(() => {
            fitAnimationFrameRef.current = null;
            fitTerminal();
            setTerminalReady(true);
        });
        return () => {
            if(fitAnimationFrameRef.current !== null){
                window.cancelAnimationFrame(fitAnimationFrameRef.current);
                fitAnimationFrameRef.current = null;
            }
            resizeObserverRef.current?.disconnect();
            resizeObserverRef.current = null;
            fitAddonRef.current = null;
            terminalRef.current = null;
            terminal.dispose();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    React.useEffect( () => {
        if(terminalRef.current){
            terminalRef.current.options.theme = getInteractiveTerminalTheme(theme);
        }
    }, [theme]);
    React.useEffect( () => {
        if(!terminalReady || !terminalRef.current){
            return;
        }
        const terminal = terminalRef.current;
        scheduleFitTerminal();
        const nextSignatures = data.map(getInteractiveTerminalEntrySignature);
        const settingsKey = `${useASNIColor}:${showTaskStatus}:${wrapText}`;
        const previousReplayState = replayStateRef.current;
        const canAppend = previousReplayState.settingsKey === settingsKey &&
            nextSignatures.length >= previousReplayState.signatures.length &&
            previousReplayState.signatures.every((signature, index) => signature === nextSignatures[index]);
        const previousViewportY = terminal.buffer.active.viewportY;
        const entriesToWrite = canAppend ? data.slice(previousReplayState.signatures.length) : data;
        if(!canAppend){
            terminal.reset();
        }
        const terminalOutput = entriesToWrite.map( (entry) => formatInteractiveTerminalEntry({
            entry,
            useASNIColor,
            showTaskStatus,
        })).join("");
        replayStateRef.current = {
            settingsKey,
            signatures: nextSignatures,
        };
        const afterWrite = () => {
            if(autoScrollRef.current){
                terminal.scrollToBottom();
            } else {
                terminal.scrollToLine(previousViewportY);
            }
        };
        if(terminalOutput.length > 0){
            terminal.write(terminalOutput, afterWrite);
        } else {
            afterWrite();
        }
    }, [data, scheduleFitTerminal, showTaskStatus, terminalReady, useASNIColor, wrapText]);
    return (
        <div
            ref={terminalScrollContainerRef}
            className={"MythicInteractiveTerminal"}
            style={{
                height: "100%",
                minHeight: "50px",
                overflowX: wrapText ? "hidden" : "auto",
                overflowY: "hidden",
                width: "100%",
            }}>
            <div ref={terminalElementRef} style={{height: "100%", width: "100%"}} />
        </div>
    )
}

const InteractiveMessageTypes = [
    {"name": "None", "value": -1, "text": "None"},
    {"name": "Tab", "value": 13, "text": "^I"},
    {"name": "Backspace", "value": 12, "text": "^H"},
    {"name": "Exit", "value": 3, "text": "exit"},
    {"name": "Escape", "value": 4, "text": "^["},
    {"name": "Ctrl+A", "value": 5, "text": "^A"},
    {"name": "Ctrl+B", "value": 6, "text": "^B"},
    {"name": "Ctrl+C", "value": 7, "text": "^C"},
    {"name": "Ctrl+D", "value": 8, "text": "^D"},
    {"name": "Ctrl+E", "value": 9, "text": "^E"},
    {"name": "Ctrl+F", "value": 10, "text": "^F"},
    {"name": "Ctrl+G", "value": 11, "text": "^G"},
    {"name": "Ctrl+K", "value": 14, "text": "^K"},
    {"name": "Ctrl+L", "value": 15, "text": "^L"},
    {"name": "Ctrl+N", "value": 16, "text": "^N"},
    {"name": "Ctrl+P", "value": 17, "text": "^P"},
    {"name": "Ctrl+Q", "value": 18, "text": "^Q"},
    {"name": "Ctrl+R", "value": 19, "text": "^R"},
    {"name": "Ctrl+S", "value": 20, "text": "^S"},
    {"name": "Ctrl+U", "value": 21, "text": "^U"},
    {"name": "Ctrl+W", "value": 22, "text": "^W"},
    {"name": "Ctrl+Y", "value": 23, "text": "^Y"},
    {"name": "Ctrl+Z", "value": 24, "text": "^Z"},
]
const EnterOptions = [
    {"value": "", "name": "None"},
    {"value": "\n", "name": "LF"},
    {"value": "\r", "name": "CR"},
    {"value": "\r\n", "name": "CRLF"}
];
export const ResponseDisplayInteractive = (props) =>{
    const theme = useTheme();
    const [backdropOpen, setBackdropOpen] = React.useState(false);
    const pageSize = React.useRef(100);
    const highestFetched = React.useRef(0);
    const [taskData, setTaskData] = React.useState([]);
    const taskDataRef = React.useRef([]);
    const [rawResponses, setRawResponses] = React.useState([]);
    const rawResponsesRef = React.useRef([]);
    const [search, setSearch] = React.useState("");
    const [totalCount, setTotalCount] = React.useState(0);
    const totalCountRef = React.useRef(0);
    const [currentPage, setCurrentPage] = React.useState(1);
    const currentPageRef = React.useRef(1);
    const taskResponseCountRef = React.useRef(props.task.response_count || 0);
    const selectAllWarningShown = React.useRef(false);
    const [useASNIColor, setUseANSIColor] = React.useState(true);
    const [showTaskStatus, setShowTaskStatus] = React.useState(true);
    const [wrapText, setWrapText] = React.useState(true);
    const [autoScroll, setAutoScroll] = React.useState(true);
    const setTrackedTotalCount = React.useCallback( (newTotalCount) => {
        totalCountRef.current = newTotalCount;
        setTotalCount(newTotalCount);
    }, []);
    const warnSelectAllCapped = React.useCallback( (loadedCount, aggregateCount) => {
        if(aggregateCount > loadedCount && !selectAllWarningShown.current){
            snackActions.warning(`Interactive output is too large to load all at once. Showing the first ${loadedCount} responses; use pagination to view the rest.`);
            selectAllWarningShown.current = true;
        }
    }, []);
    const visibleOutput = React.useMemo( () => {
        const visibleTasks = getVisibleInteractiveTasks({taskData, search});
        return sortInteractiveEntries([...rawResponses, ...visibleTasks]);
    }, [taskData, rawResponses, search]);
    React.useEffect( () => {
        rawResponsesRef.current = rawResponses;
    }, [rawResponses]);
    React.useEffect( () => {
        taskDataRef.current = taskData;
    }, [taskData]);
    const [fetchResponsePageQuery] = useLazyQuery(getInteractiveResponsesPageQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            const responseArray = data.response.map(decodeInteractiveResponse);
            rawResponsesRef.current = responseArray;
            setRawResponses(responseArray);
            const aggregateCount = getInteractiveAggregateCount(data);
            setTrackedTotalCount(aggregateCount);
            highestFetched.current = Math.max(highestFetched.current, getInteractiveLatestResponseID(data));
            if(props.selectAllOutput){
                warnSelectAllCapped(responseArray.length, aggregateCount);
            }
            setBackdropOpen(false);
        },
        onError: data => {
            console.error(data);
            snackActions.error("Failed to fetch interactive responses: " + data.message);
            setBackdropOpen(false);
        }
    });
    const fetchResponsePage = React.useCallback( (requestedPage=1, showBackdrop=true) => {
        const nextPage = props.selectAllOutput ? 1 : Math.max(1, requestedPage || 1);
        currentPageRef.current = nextPage;
        setCurrentPage(nextPage);
        if(showBackdrop){
            setBackdropOpen(true);
        }
        fetchResponsePageQuery({variables: {
            task_id: props.task.id,
            fetchLimit: props.selectAllOutput ? MAX_INTERACTIVE_SELECT_ALL_RESPONSES : pageSize.current,
            offset: props.selectAllOutput ? 0 : pageSize.current * (nextPage - 1),
            where: getInteractiveResponseWhereClause(props.task.id, search),
        }});
    }, [fetchResponsePageQuery, props.selectAllOutput, props.task.id, search]);
    React.useEffect( () => {
        rawResponsesRef.current = [];
        taskDataRef.current = [];
        setRawResponses([]);
        setTaskData([]);
        highestFetched.current = 0;
        currentPageRef.current = 1;
        setCurrentPage(1);
        setTrackedTotalCount(0);
        taskResponseCountRef.current = props.task.response_count || 0;
        selectAllWarningShown.current = false;
    }, [props.task.id, setTrackedTotalCount]);
    React.useEffect( () => {
        selectAllWarningShown.current = false;
        fetchResponsePage(1);
    }, [fetchResponsePage]);
    const {loading: loadingTasks} = useSubscription(getInteractiveTaskingQuery, {
      variables: {parent_task_id: props.task.id},
      onError: data => {
          console.error(data)
      },
      fetchPolicy: "no-cache",
      onData: ({data}) => {
          const newTaskData = mergeInteractiveTaskData({
              existingTasks: taskDataRef.current,
              incomingTasks: data?.data?.task_stream || [],
              limit: MAX_INTERACTIVE_TASK_WINDOW,
          });
          taskDataRef.current = newTaskData;
          setTaskData(newTaskData);
          if(backdropOpen){
              setBackdropOpen(false);
          }

      }
    })
    const subscriptionDataCallback = React.useCallback( ({data}) => {
        const streamedResponses = data?.data?.response_stream || [];
        if(streamedResponses.length === 0){
            return;
        }
        const newResponses = streamedResponses.filter(r => r.id > highestFetched.current);
        if(newResponses.length === 0){
            return;
        }
        highestFetched.current = Math.max(highestFetched.current, ...newResponses.map(r => r.id));
        if(search !== ""){
            const lowerCaseSearch = search.toLowerCase();
            const matchingResponseStreamed = newResponses.some( (response) => {
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
            if(previousResponses.length >= MAX_INTERACTIVE_SELECT_ALL_RESPONSES){
                warnSelectAllCapped(previousResponses.length, currentTotalCount);
                return;
            }
            const remainingSlots = MAX_INTERACTIVE_SELECT_ALL_RESPONSES - previousResponses.length;
            const decodedResponses = newResponses.slice(0, remainingSlots).map(decodeInteractiveResponse);
            const mergedResponses = [...previousResponses, ...decodedResponses].sort( (a,b) => a.id > b.id ? 1 : -1);
            rawResponsesRef.current = mergedResponses;
            setRawResponses(mergedResponses);
            warnSelectAllCapped(mergedResponses.length, currentTotalCount);
            return;
        }
        const pageStartIndex = (currentPageRef.current - 1) * pageSize.current;
        const pageEndIndex = currentPageRef.current * pageSize.current;
        const streamedStartIndex = Math.max(0, currentTotalCount - newResponses.length);
        const streamedEndIndex = currentTotalCount;
        if(streamedStartIndex >= pageEndIndex || streamedEndIndex <= pageStartIndex){
            return;
        }
        const visibleStreamedResponses = newResponses.reduce( (responses, response, index) => {
            const responseIndex = streamedStartIndex + index;
            if(responseIndex >= pageStartIndex && responseIndex < pageEndIndex){
                return [...responses, decodeInteractiveResponse(response)];
            }
            return responses;
        }, []);
        if(visibleStreamedResponses.length > 0){
            const responseMap = new Map();
            rawResponsesRef.current.forEach( (response) => responseMap.set(response.id, response));
            visibleStreamedResponses.forEach( (response) => responseMap.set(response.id, response));
            const mergedResponses = Array.from(responseMap.values()).sort( (a,b) => a.id > b.id ? 1 : -1).slice(0, pageSize.current);
            rawResponsesRef.current = mergedResponses;
            setRawResponses(mergedResponses);
        }
        if(backdropOpen){
            setBackdropOpen(false);
        }
    }, [backdropOpen, fetchResponsePage, props.selectAllOutput, search, warnSelectAllCapped]);
    useSubscription(subResponsesQuery, {
        variables: {task_id: props.task.id},
        fetchPolicy: "no-cache",
        onData: subscriptionDataCallback
    });
    const onSubmitPageChange = (currentPage) => {
        fetchResponsePage(currentPage);
    }
    const onSubmitSearch = React.useCallback( (newSearch) => {
        currentPageRef.current = 1;
        setCurrentPage(1);
        setSearch(newSearch || "");
    }, []);
    React.useEffect( () => {
        taskResponseCountRef.current = props.task.response_count || 0;
        if(search === ""){
            setTrackedTotalCount(props.task.response_count || 0);
        }
    }, [props.task.response_count, search, setTrackedTotalCount]);
    const toggleANSIColor = () => {
        setUseANSIColor(!useASNIColor);
    }
    const toggleShowTaskStatus = () => {
        setShowTaskStatus(!showTaskStatus);
    }
    const toggleWrapText = () => {
        setWrapText(!wrapText);
    }
    const toggleAutoScroll = () => {
        setAutoScroll(current => !current);
    }
    React.useEffect( () => {
        if(loadingTasks){
            setBackdropOpen(true);
        }else{
            setBackdropOpen(false);
        }
    }, [loadingTasks]);
    React.useEffect(() => {
        if(!backdropOpen){
            return;
        }
        const timeoutID = setTimeout(() => {
            setBackdropOpen(false);
        }, 2000);
        return () => clearTimeout(timeoutID);
    }, [backdropOpen]);
    const panelHeight = props.expand ? "100%" : "clamp(260px, 36vh, 500px)";
    const outputMinHeight = props.expand ? 0 : "160px";
  return (

      <div style={{
          display: "flex", overflowY: "auto",
          position: "relative",
          height: panelHeight,
          minHeight: props.expand ? 0 : "260px",
          maxHeight: props.expand ? "100%" : "500px",
          flexDirection: "column",
          width: "100%",
          backgroundColor: theme.outputBackgroundColor + (theme.palette.mode === 'dark' ? "B0" : "E0"),
          color: theme.outputTextColor,
      }}>
          <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute",}} invisible={false}>
              <div style={{
                  borderRadius: "4px",
                  border: "1px solid black",
                  padding: "5px",
                  backgroundColor: "rgba(37,37,37,0.92)", color: "white",
                  alignItems: "center",
                  display: "flex", flexDirection: "column"}}>
                  <CircularProgress color="inherit" />
                  <Typography variant={"h5"}>
                      Fetching Interactive Task Data....
                  </Typography>
              </div>
          </Backdrop>
          {props.searchOutput &&
              <SearchBar onSubmitSearch={onSubmitSearch}/>
          }
          <div style={{overflow: "hidden", width: "100%", marginBottom: "5px", height: props.expand ? "100%": undefined,
              flexGrow: 1, flexShrink: 1, minHeight: outputMinHeight}} ref={props.responseRef}
               id={`ptytask${props.task.id}`}>
              {visibleOutput.length === 0 && !backdropOpen ? (
                  <MythicEmptyState
                      compact
                      title="No interactive output yet"
                      description="Interactive tasking and responses will appear here as they arrive."
                      sx={{backgroundColor: "transparent", color: "inherit", height: "100%"}}
                  />
              ) : (
                  <InteractiveTerminalDisplay data={visibleOutput}
                                              useASNIColor={useASNIColor}
                                              showTaskStatus={showTaskStatus}
                                              wrapText={wrapText}
                                              autoScroll={autoScroll}
                                              theme={theme}/>
              )}
          </div>
          {!props.task?.is_interactive_task &&
              <div style={{width: "100%", display: "inline-flex", alignItems: "flex-end"}}>
                  <InteractiveTaskingBar task={props.task} taskData={taskData}
                                         useASNIColor={useASNIColor} toggleANSIColor={toggleANSIColor}
                                         showTaskStatus={showTaskStatus} toggleShowTaskStatus={toggleShowTaskStatus}
                                         wrapText={wrapText} toggleWrapText={toggleWrapText}
                                         autoScroll={autoScroll} toggleAutoScroll={toggleAutoScroll}
                  />
              </div>
          }

          <InteractivePaginationBar totalCount={totalCount} currentPage={currentPage}
                                    onSubmitPageChange={onSubmitPageChange} expand={props.expand}
                                    pageSize={pageSize.current} selectAllOutput={props.selectAllOutput}/>
      </div>
  )

}
const InteractiveTaskingBar = ({
                                   task, taskData, useASNIColor, toggleANSIColor,
                                   showTaskStatus, toggleShowTaskStatus, wrapText, toggleWrapText,
                                   autoScroll, toggleAutoScroll
                               }) => {
    const [inputText, setInputText] = React.useState("");
    const theme = useTheme();
    const [createTask] = useMutation(createTaskingMutation, {
        update: (cache, {data}) => {
            if(data.createTask.status === "error"){
                snackActions.error(data.createTask.error);
            }else{
            }
        },
        onError: data => {
            console.error(data);
        }
    });
    const [taskOptionsIndex, setTaskOptionsIndex] = React.useState(-1);
    const [taskOptions, setTaskOptions] = React.useState([]);
    const [selectedEnterOption, setSelectedEnterOption] = React.useState(1);
    const [selectedControlOption, setSelectedControlOption] = React.useState(0);
    React.useEffect( () => {
        const newTaskOptions = taskData.filter( t => t.display_params.length > 1 && (t.interactive_task_type === 0 || t.interactive_task_type === 8));
        newTaskOptions.sort( (a,b) => a.id > b.id ? -1 : 1);
        setTaskOptions(newTaskOptions);
    }, [taskData]);
    const onInputChange = (name, value, error, event) => {
        if(event !== null && event !== undefined){
            if(event.key === "ArrowUp"){
                event.preventDefault();
                event.stopPropagation();
                if(taskOptions.length === 0){
                    snackActions.warning("No previous tasks")
                    return;
                }
                let newIndex = (taskOptionsIndex + 1);
                if(newIndex > taskOptions.length -1){
                    newIndex = taskOptions.length -1;
                }
                setTaskOptionsIndex(newIndex);
                setInputText(taskOptions[newIndex].display_params.trim());
            }else if(event.key === "ArrowDown"){
                event.preventDefault();
                event.stopPropagation();
                if(taskData.length === 0){
                    snackActions.warning("No next tasks")
                    return;
                }
                let newIndex = (taskOptionsIndex -1);
                if(newIndex < 0){
                    setTaskOptionsIndex(-1);
                    setInputText("");
                } else {
                    setTaskOptionsIndex(newIndex);
                    setInputText(taskOptions[newIndex].display_params.trim());
                }

            }else{
                setInputText(value);
            }
        } else {
            setInputText(value);
        }


    }
    const submitTask = (event) => {
        event.stopPropagation();
        event.preventDefault();
        if(event.shiftKey){
            setInputText(inputText + EnterOptions[selectedEnterOption].value);
            return;
        }
        if(event.metaKey || event.ctrlKey){
            setInputText(inputText + EnterOptions[selectedEnterOption].value);
            return;
        }
        if(InteractiveMessageTypes[selectedControlOption].value > 0){
            let ctrlSequence = InteractiveMessageTypes[selectedControlOption].text;
            let enterOption = EnterOptions[selectedEnterOption].value;
            let originalParams = inputText + ctrlSequence + enterOption;
            // if we're looking at a tab, never send enter along with it
            if (InteractiveMessageTypes[selectedControlOption].value === 8){
                originalParams = inputText + ctrlSequence;
                enterOption = "";
            // if we're looking at escape, never send enter along with it
            } else if(InteractiveMessageTypes[selectedControlOption].value === 4){
                originalParams = ctrlSequence + inputText;
                enterOption = "";
            }
            createTask({variables: {
                    callback_display_id: task.callback.display_id,
                    command: task.command.cmd,
                    params: inputText + enterOption,
                    tasking_location: "command_line",
                    original_params: originalParams,
                    parameter_group_name: "default",
                    parent_task_id: task.id,
                    is_interactive_task: true,
                    interactive_task_type: InteractiveMessageTypes[selectedControlOption].value,
                }})
        }else {
            // no control option selected, just send data along as input
            createTask({variables: {
                    callback_display_id: task.callback.display_id,
                    command: task.command.cmd,
                    params: inputText + EnterOptions[selectedEnterOption].value,
                    tasking_location: "command_line",
                    original_params: inputText + EnterOptions[selectedEnterOption].value,
                    parameter_group_name: "default",
                    parent_task_id: task.id,
                    is_interactive_task: true,
                    interactive_task_type: 0,
                }})
        }
        setInputText("");
        setSelectedControlOption(0);
        setTaskOptionsIndex(-1);
    }
    const onChangeSelect = (event) => {
        event.stopPropagation();
        event.preventDefault();
        setSelectedControlOption(event.target.value);
    }
    const onChangeSelectEnterOption = (event) => {
        event.stopPropagation();
        event.preventDefault();
        setSelectedEnterOption(event.target.value);
    }
    return (
        <div style={{
            display: "flex",
            alignItems: "flex-end",
            //backgroundColor: theme.outputBackgroundColor + (theme.palette.mode === 'dark' ? "F0" : "50"),
            color: theme.outputTextColor,
            paddingTop: "5px",
            border: "1px solid grey",
            borderRadius: "4px",
            width: "100%"}}>
            <FormControl style={{width: "10rem", marginTop: "2px", color: theme.outputTextColor}} >
                <InputLabel id="control-label" style={{color: theme.outputTextColor}}>Controls</InputLabel>
                <Select
                    labelId="control-label"
                    id="control-select"
                    value={selectedControlOption}
                    onChange={onChangeSelect}
                    sx={{
                        // Target the icon element directly within the Select
                        '.MuiSelect-icon': {
                            color: theme.outputTextColor, // Set your desired color
                        },
                    }}
                    input={<Input style={{margin: 0, color: theme.outputTextColor}} />}
                >
                    {InteractiveMessageTypes.map( (opt,index) => (
                        <MenuItem value={index} key={opt.name}>{opt.name}</MenuItem>
                    ) )}
                </Select>
            </FormControl>

            <MythicTextField autoFocus={true} maxRows={5} multiline={true} onChange={onInputChange} onEnter={submitTask}
                             value={inputText} variant={"standard"} placeholder={">_ type here..."} inline={true}
                             debounceDelay={50}
                             marginBottom={"0px"} InputProps={{style: { width: "100%", color: theme.outputTextColor}}}/>
            <FormControl style={{width: "7rem", color: theme.outputTextColor}} >
                <Select
                    labelId="linefeed-label"
                    id="linefeed-control"
                    value={selectedEnterOption}
                    autoWidth
                    sx={{
                        // Target the icon element directly within the Select
                        '.MuiSelect-icon': {
                            color: theme.outputTextColor, // Set your desired color
                        },
                    }}
                    onChange={onChangeSelectEnterOption}
                    input={<Input style={{color: theme.outputTextColor}} />}
                    IconComponent={KeyboardReturnIcon}
                >
                    {EnterOptions.map( (opt,index) => (
                        <MenuItem value={index} key={opt.name}>{opt.name}</MenuItem>
                    ) )}
                </Select>
            </FormControl>
            <MythicStyledTooltip title={useASNIColor ?  "Disable ANSI Color" : "Enable ANSI Color"} >
                <IconButton onClick={toggleANSIColor} style={{paddingLeft: 0, paddingRight: 0,}} disableRipple={true} disableFocusRipple={true}>
                    <PaletteIcon color={useASNIColor ? "success" : "secondary"}
                                 style={{cursor: "pointer"}}
                    />
                </IconButton>
            </MythicStyledTooltip>
            <MythicStyledTooltip title={showTaskStatus ?  "Hide Task Status" : "Show Task Status"} >
                <IconButton onClick={toggleShowTaskStatus} style={{paddingLeft: 0, paddingRight: 0}} disableRipple={true} disableFocusRipple={true}>
                    <CheckCircleOutlineIcon color={showTaskStatus ? "success" : "secondary"}
                                            style={{cursor: "pointer",}}
                    />
                </IconButton>
            </MythicStyledTooltip>
            <MythicStyledTooltip title={wrapText ?  "Unwrap Text" : "Wrap Text"} >
                <IconButton onClick={toggleWrapText} style={{paddingLeft: 0, paddingRight: 0}} disableRipple={true} disableFocusRipple={true}>
                    <WrapTextIcon color={wrapText ? "success" : "secondary"}
                                  style={{cursor: "pointer"}}
                    />
                </IconButton>
            </MythicStyledTooltip>
            <MythicStyledTooltip title={autoScroll ?  "Stop Auto Scroll" : "Auto Scroll"} >
                <IconButton onClick={toggleAutoScroll} style={{paddingLeft: 0, paddingRight: 0}} disableRipple={true} disableFocusRipple={true}>
                    <HeightIcon color={autoScroll ? "success" : "secondary"}
                                  style={{cursor: "pointer"}}
                    />
                </IconButton>
            </MythicStyledTooltip>
        </div>
    )
}
const InteractivePaginationBar = ({totalCount, currentPage, onSubmitPageChange, pageSize, selectAllOutput}) => {
    const onChangePage =  (event, value) => {
        onSubmitPageChange(value);
    };
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
    if(pageCount < 2 || selectAllOutput){
        return null;
    }
    return (
        <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center"}} >
            <Pagination count={pageCount} page={currentPage} variant="contained" color="primary"
                        boundaryCount={2} onChange={onChangePage} style={{margin: "10px"}}
                        showFirstButton showLastButton siblingCount={2}
            />
            <Typography style={{paddingLeft: "10px"}}>Total Responses: {totalCount}</Typography>
        </div>
    )
}
