import React from 'react';
import {createTaskingMutation} from './CallbackMutations';
import {snackActions} from "../../utilities/Snackbar";
import { gql, useLazyQuery, useMutation, useSubscription } from '@apollo/client';
import {b64DecodeUnicode} from "./ResponseDisplay";
import {SearchBar} from './ResponseDisplay';
import Pagination from '@mui/material/Pagination';
import {Typography, CircularProgress, Backdrop, Menu} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MenuItem from '@mui/material/MenuItem';
import Anser from "anser";
import PaletteIcon from '@mui/icons-material/Palette';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import './ResponseDisplayInteractiveANSI.css';
import {Terminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import WrapTextIcon from '@mui/icons-material/WrapText';
import {useTheme} from '@mui/material/styles';
import HeightIcon from '@mui/icons-material/Height';

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
const TERMINAL_QUERY_CODE_REGEX = /\x1bc|\x1b\[(?:\?|>)?[0-9;]*[cn]|\x1b\](?:4|10|11|12);[^\x07]*(?:\x07|\x1b\\)/g;
const stripAnsiStyleCodes = (value) => {
    return value.replace(ANSI_STYLE_CODE_REGEX, "");
}
const getTerminalText = (value) => {
    return value === undefined || value === null ? "" : String(value);
}
const sanitizeTerminalOutput = (value) => {
    return getTerminalText(value).replace(TERMINAL_QUERY_CODE_REGEX, "");
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
    return sanitizeTerminalOutput(value).replace(TERMINAL_CONTROL_CODE_REGEX, "");
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
        const terminalResponse = sanitizeTerminalOutput(entry.response);
        const response = useASNIColor ? terminalResponse : stripAnsiStyleCodes(terminalResponse);
        if(entry.is_error && useASNIColor){
            return `\x1b[37;41m${response}\x1b[0m`;
        }
        return response;
    }
    const status = showTaskStatus ? getInteractiveTerminalTaskStatus({task: entry, useASNIColor}) : "";
    const prompt = useASNIColor ? "\x1b[36m> \x1b[0m" : "> ";
    return `\r\n${status}${prompt}${getTerminalText(entry.original_params || entry.display_params)}\r\n`;
}
const InteractiveTerminalDisplay = ({
    data,
    useASNIColor,
    showTaskStatus,
    wrapText,
    autoScroll,
    theme,
    canSendInput,
    inputMode,
    lineInputBuffer,
    onTerminalInput,
    onTerminalKeyEvent,
}) => {
    const terminalScrollContainerRef = React.useRef(null);
    const terminalElementRef = React.useRef(null);
    const terminalRef = React.useRef(null);
    const fitAddonRef = React.useRef(null);
    const resizeObserverRef = React.useRef(null);
    const fitAnimationFrameRef = React.useRef(null);
    const replayStateRef = React.useRef({settingsKey: "", signatures: []});
    const autoScrollRef = React.useRef(autoScroll);
    const wrapTextRef = React.useRef(wrapText);
    const canSendInputRef = React.useRef(canSendInput);
    const inputModeRef = React.useRef(inputMode);
    const lineInputBufferRef = React.useRef(lineInputBuffer);
    const localEchoVisibleRef = React.useRef(false);
    const onTerminalInputRef = React.useRef(onTerminalInput);
    const onTerminalKeyEventRef = React.useRef(onTerminalKeyEvent);
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
    const writeLocalTerminalAction = React.useCallback( (action) => {
        const terminal = terminalRef.current;
        if(!terminal || !action){
            return;
        }
        if(action.erase){
            for(let i = 0; i < action.erase; i++){
                terminal.write("\b \b");
            }
        }
        if(action.write){
            terminal.write(action.write);
        }
        if(action.erase || action.write){
            localEchoVisibleRef.current = true;
            if(autoScrollRef.current){
                terminal.scrollToBottom();
            }
        }
    }, []);
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
        canSendInputRef.current = canSendInput;
        if(terminalRef.current){
            terminalRef.current.options.disableStdin = !canSendInput;
            if(canSendInput){
                terminalRef.current.focus();
            }
        }
    }, [canSendInput]);
    React.useEffect( () => {
        inputModeRef.current = inputMode;
    }, [inputMode]);
    React.useEffect( () => {
        lineInputBufferRef.current = lineInputBuffer;
    }, [lineInputBuffer]);
    React.useEffect( () => {
        onTerminalInputRef.current = onTerminalInput;
    }, [onTerminalInput]);
    React.useEffect( () => {
        onTerminalKeyEventRef.current = onTerminalKeyEvent;
    }, [onTerminalKeyEvent]);
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
            disableStdin: !canSendInputRef.current,
            fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 13,
            scrollback: INTERACTIVE_TERMINAL_SCROLLBACK,
            theme: getInteractiveTerminalTheme(theme),
        });
        const keyDisposable = terminal.onKey(({key}) => {
            writeLocalTerminalAction(onTerminalInputRef.current?.(key));
        });
        const handleTerminalPaste = (event) => {
            if(!canSendInputRef.current){
                return;
            }
            const pastedText = event.clipboardData?.getData("text") || "";
            if(pastedText === ""){
                return;
            }
            event.preventDefault();
            writeLocalTerminalAction(onTerminalInputRef.current?.(pastedText));
        };
        terminalElementRef.current.addEventListener("paste", handleTerminalPaste);
        terminal.attachCustomKeyEventHandler((event) => {
            if(!onTerminalKeyEventRef.current){
                return true;
            }
            const result = onTerminalKeyEventRef.current(event);
            if(typeof result === "boolean"){
                return result;
            }
            writeLocalTerminalAction(result);
            return result?.handled ? false : true;
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
            if(canSendInputRef.current){
                terminal.focus();
            }
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
            terminalElementRef.current?.removeEventListener("paste", handleTerminalPaste);
            keyDisposable.dispose();
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
        const settingsKey = `${useASNIColor}:${showTaskStatus}:${wrapText}:${inputMode}`;
        const previousReplayState = replayStateRef.current;
        const hasPendingLineInput = canSendInputRef.current &&
            inputModeRef.current === "line" &&
            lineInputBufferRef.current.length > 0;
        const canAppend = !hasPendingLineInput &&
            previousReplayState.settingsKey === settingsKey &&
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
            const pendingLineInput = lineInputBufferRef.current;
            if(canSendInputRef.current && inputModeRef.current === "line" && pendingLineInput.length > 0){
                terminal.write(pendingLineInput.replaceAll("\n", "\r\n"), () => {
                    localEchoVisibleRef.current = true;
                    if(autoScrollRef.current){
                        terminal.scrollToBottom();
                    } else {
                        terminal.scrollToLine(previousViewportY);
                    }
                });
                return;
            }
            localEchoVisibleRef.current = false;
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
    }, [data, inputMode, scheduleFitTerminal, showTaskStatus, terminalReady, useASNIColor, wrapText]);
    return (
        <div className={`mythic-interactive-terminal-shell${canSendInput ? " mythic-interactive-terminal-shell-input" : ""}`}>
            <div
                ref={terminalScrollContainerRef}
                className={"MythicInteractiveTerminal"}
                onClick={() => terminalRef.current?.focus()}
                style={{
                    height: "100%",
                    minHeight: "50px",
                    overflowX: wrapText ? "hidden" : "auto",
                    overflowY: "hidden",
                    width: "100%",
                }}>
                <div ref={terminalElementRef} style={{height: "100%", width: "100%"}} />
            </div>
            {data.length === 0 &&
                <div className="mythic-interactive-terminal-empty-hint" onMouseDown={() => terminalRef.current?.focus()}>
                    No interactive output yet
                </div>
            }
        </div>
    )
}

const EnterOptions = [
    {"value": "", "name": "None"},
    {"value": "\n", "name": "LF"},
    {"value": "\r", "name": "CR"},
    {"value": "\r\n", "name": "CRLF"}
];
const RAW_PRINTABLE_BATCH_DELAY_MS = 150;
const PENDING_INPUT_EVENT_TTL_MS = 6000;
const MAX_PENDING_INPUT_EVENTS = 10;
const CONTROL_INPUTS_BY_DATA = {
    "\t": {"name": "Tab", "value": 13, "text": "^I", "label": "Tab"},
    "\b": {"name": "Backspace", "value": 12, "text": "^H", "label": "Backspace"},
    "\x7f": {"name": "Backspace", "value": 12, "text": "^H", "label": "Backspace"},
    "\x1b": {"name": "Escape", "value": 4, "text": "^[", "label": "Esc"},
    "\x01": {"name": "Ctrl+A", "value": 5, "text": "^A", "label": "Ctrl+A"},
    "\x02": {"name": "Ctrl+B", "value": 6, "text": "^B", "label": "Ctrl+B"},
    "\x03": {"name": "Ctrl+C", "value": 7, "text": "^C", "label": "Ctrl+C"},
    "\x04": {"name": "Ctrl+D", "value": 8, "text": "^D", "label": "Ctrl+D"},
    "\x05": {"name": "Ctrl+E", "value": 9, "text": "^E", "label": "Ctrl+E"},
    "\x06": {"name": "Ctrl+F", "value": 10, "text": "^F", "label": "Ctrl+F"},
    "\x07": {"name": "Ctrl+G", "value": 11, "text": "^G", "label": "Ctrl+G"},
    "\x0b": {"name": "Ctrl+K", "value": 14, "text": "^K", "label": "Ctrl+K"},
    "\x0c": {"name": "Ctrl+L", "value": 15, "text": "^L", "label": "Ctrl+L"},
    "\x0e": {"name": "Ctrl+N", "value": 16, "text": "^N", "label": "Ctrl+N"},
    "\x10": {"name": "Ctrl+P", "value": 17, "text": "^P", "label": "Ctrl+P"},
    "\x11": {"name": "Ctrl+Q", "value": 18, "text": "^Q", "label": "Ctrl+Q"},
    "\x12": {"name": "Ctrl+R", "value": 19, "text": "^R", "label": "Ctrl+R"},
    "\x13": {"name": "Ctrl+S", "value": 20, "text": "^S", "label": "Ctrl+S"},
    "\x15": {"name": "Ctrl+U", "value": 21, "text": "^U", "label": "Ctrl+U"},
    "\x17": {"name": "Ctrl+W", "value": 22, "text": "^W", "label": "Ctrl+W"},
    "\x19": {"name": "Ctrl+Y", "value": 23, "text": "^Y", "label": "Ctrl+Y"},
    "\x1a": {"name": "Ctrl+Z", "value": 24, "text": "^Z", "label": "Ctrl+Z"},
};
const TERMINAL_ESCAPE_SEQUENCE_LABELS = {
    "\x1b[A": "Up",
    "\x1b[B": "Down",
    "\x1b[C": "Right",
    "\x1b[D": "Left",
    "\x1b[H": "Home",
    "\x1b[F": "End",
    "\x1b[3~": "Delete",
    "\x1b[5~": "Page Up",
    "\x1b[6~": "Page Down",
};
const TERMINAL_KEY_EVENT_INPUTS = {
    ArrowUp: "\x1b[A",
    ArrowDown: "\x1b[B",
    ArrowRight: "\x1b[C",
    ArrowLeft: "\x1b[D",
    Home: "\x1b[H",
    End: "\x1b[F",
    Delete: "\x1b[3~",
    PageUp: "\x1b[5~",
    PageDown: "\x1b[6~",
};
const isPrintableTerminalText = (value) => {
    return value !== "" && !/[\x00-\x1f\x7f]/.test(value) && !value.startsWith("\x1b");
};
const getTerminalInputLabel = (value) => {
    if(value === ""){
        return "None";
    }
    if(TERMINAL_ESCAPE_SEQUENCE_LABELS[value]){
        return TERMINAL_ESCAPE_SEQUENCE_LABELS[value];
    }
    if(CONTROL_INPUTS_BY_DATA[value]){
        return CONTROL_INPUTS_BY_DATA[value].label;
    }
    if(value.startsWith("\x1b")){
        return "Esc sequence";
    }
    if(value === "\n"){
        return "LF";
    }
    if(value === "\r"){
        return "CR";
    }
    if(value === "\r\n"){
        return "CRLF";
    }
    const displayValue = value.replaceAll("\n", "\\n").replaceAll("\r", "\\r").replaceAll("\t", "\\t");
    if(displayValue.length > 18){
        return displayValue.slice(0, 18) + "...";
    }
    return displayValue === " " ? "Space" : displayValue;
};
const normalizeLineBufferInput = (value) => {
    return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
};
export const ResponseDisplayInteractive = (props) =>{
    const theme = useTheme();
    const [backdropOpen, setBackdropOpen] = React.useState(false);
    const pageSize = React.useRef(100);
    const highestFetched = React.useRef(0);
    const [rawResponses, setRawResponses] = React.useState([]);
    const rawResponsesRef = React.useRef([]);
    const rawPrintableInputBufferRef = React.useRef("");
    const rawPrintableInputTimerRef = React.useRef(null);
    const lineInputBufferRef = React.useRef("");
    const [search, setSearch] = React.useState("");
    const [totalCount, setTotalCount] = React.useState(0);
    const totalCountRef = React.useRef(0);
    const [currentPage, setCurrentPage] = React.useState(1);
    const currentPageRef = React.useRef(1);
    const taskResponseCountRef = React.useRef(props.task.response_count || 0);
    const selectAllWarningShown = React.useRef(false);
    const [useASNIColor, setUseANSIColor] = React.useState(true);
    const [wrapText, setWrapText] = React.useState(true);
    const [autoScroll, setAutoScroll] = React.useState(true);
    const [inputMode, setInputMode] = React.useState("line");
    const [lineInputBuffer, setLineInputBuffer] = React.useState("");
    const [selectedEnterOption, setSelectedEnterOption] = React.useState(1);
    const [pendingInputEvents, setPendingInputEvents] = React.useState([]);
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
        return sortInteractiveEntries(rawResponses);
    }, [rawResponses]);
    React.useEffect( () => {
        rawResponsesRef.current = rawResponses;
    }, [rawResponses]);
    React.useEffect( () => {
        lineInputBufferRef.current = lineInputBuffer;
    }, [lineInputBuffer]);
    React.useEffect( () => {
        if(pendingInputEvents.length === 0){
            return;
        }
        const timeoutID = setTimeout(() => {
            const cutoff = Date.now() - PENDING_INPUT_EVENT_TTL_MS;
            setPendingInputEvents((current) => current.filter((event) => event.timestamp >= cutoff));
        }, 1000);
        return () => clearTimeout(timeoutID);
    }, [pendingInputEvents]);
    React.useEffect( () => {
        return () => {
            if(rawPrintableInputTimerRef.current !== null){
                clearTimeout(rawPrintableInputTimerRef.current);
                rawPrintableInputTimerRef.current = null;
            }
        };
    }, []);
    const setTrackedLineInputBuffer = React.useCallback( (value) => {
        const nextValue = typeof value === "function" ? value(lineInputBufferRef.current) : value;
        lineInputBufferRef.current = nextValue;
        setLineInputBuffer(nextValue);
    }, []);
    const addPendingInputEvent = React.useCallback( (label) => {
        setPendingInputEvents((current) => {
            const nextEvents = [...current, {
                id: `${Date.now()}-${Math.random()}`,
                label,
                timestamp: Date.now(),
            }];
            return nextEvents.slice(-MAX_PENDING_INPUT_EVENTS);
        });
    }, []);
    const [createTask] = useMutation(createTaskingMutation, {
        update: (cache, {data}) => {
            if(data.createTask.status === "error"){
                snackActions.error(data.createTask.error);
            }
        },
        onError: data => {
            console.error(data);
            snackActions.error("Failed to send interactive input: " + data.message);
        }
    });
    const [fetchResponsePageQuery] = useLazyQuery(getInteractiveResponsesPageQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            const responseArray = data.response.map(decodeInteractiveResponse);
            const shouldPreserveStreamedResponses = search === "" && (props.selectAllOutput || currentPageRef.current === 1);
            const nextResponses = shouldPreserveStreamedResponses ? (() => {
                const responseMap = new Map();
                rawResponsesRef.current.forEach((response) => responseMap.set(response.id, response));
                responseArray.forEach((response) => responseMap.set(response.id, response));
                return Array.from(responseMap.values()).sort((a,b) => a.id > b.id ? 1 : -1).slice(0, props.selectAllOutput ? MAX_INTERACTIVE_SELECT_ALL_RESPONSES : pageSize.current);
            })() : responseArray;
            rawResponsesRef.current = nextResponses;
            setRawResponses(nextResponses);
            if(nextResponses.length > 0){
                setPendingInputEvents([]);
            }
            const aggregateCount = Math.max(getInteractiveAggregateCount(data), shouldPreserveStreamedResponses ? nextResponses.length : 0);
            setTrackedTotalCount(aggregateCount);
            const latestResponseID = getInteractiveLatestResponseID(data);
            highestFetched.current = Math.max(highestFetched.current, aggregateCount > 0 ? latestResponseID : 0);
            if(props.selectAllOutput){
                warnSelectAllCapped(nextResponses.length, aggregateCount);
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
        setRawResponses([]);
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
    const subscriptionDataCallback = React.useCallback( ({data}) => {
        const streamedResponses = data?.data?.response_stream || [];
        if(streamedResponses.length === 0){
            return;
        }
        const newResponses = streamedResponses.filter(r => r.id > highestFetched.current);
        if(newResponses.length === 0){
            return;
        }
        setPendingInputEvents([]);
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
        const previousTotalCount = Math.max(totalCountRef.current, taskResponseCountRef.current);
        const nextTotalCount = previousTotalCount + newResponses.length;
        taskResponseCountRef.current = Math.max(taskResponseCountRef.current, nextTotalCount);
        setTrackedTotalCount(nextTotalCount);
        if(props.selectAllOutput){
            const previousResponses = rawResponsesRef.current;
            if(previousResponses.length >= MAX_INTERACTIVE_SELECT_ALL_RESPONSES){
                warnSelectAllCapped(previousResponses.length, nextTotalCount);
                return;
            }
            const remainingSlots = MAX_INTERACTIVE_SELECT_ALL_RESPONSES - previousResponses.length;
            const decodedResponses = newResponses.slice(0, remainingSlots).map(decodeInteractiveResponse);
            const mergedResponses = [...previousResponses, ...decodedResponses].sort( (a,b) => a.id > b.id ? 1 : -1);
            rawResponsesRef.current = mergedResponses;
            setRawResponses(mergedResponses);
            warnSelectAllCapped(mergedResponses.length, nextTotalCount);
            return;
        }
        const pageStartIndex = (currentPageRef.current - 1) * pageSize.current;
        const pageEndIndex = currentPageRef.current * pageSize.current;
        const streamedStartIndex = previousTotalCount;
        const streamedEndIndex = nextTotalCount;
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
    }, [backdropOpen, fetchResponsePage, props.selectAllOutput, search, setTrackedTotalCount, warnSelectAllCapped]);
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
    const toggleWrapText = () => {
        setWrapText(!wrapText);
    }
    const toggleAutoScroll = () => {
        setAutoScroll(current => !current);
    }
    const canSendTerminalInput = !props.task?.is_interactive_task;
    const sendInteractiveInput = React.useCallback( ({
        params,
        originalParams,
        interactiveTaskType=0,
        pendingLabel,
    }) => {
        if(!canSendTerminalInput){
            return;
        }
        if(interactiveTaskType === 0 && (params === undefined || params === null || params === "")){
            return;
        }
        createTask({variables: {
                callback_display_id: props.task.callback.display_id,
                command: props.task.command.cmd,
                params: params || "",
                tasking_location: "command_line",
                original_params: originalParams !== undefined ? originalParams : params,
                parameter_group_name: "default",
                parent_task_id: props.task.id,
                is_interactive_task: true,
                interactive_task_type: interactiveTaskType,
            }});
        addPendingInputEvent(pendingLabel || getTerminalInputLabel(originalParams !== undefined ? originalParams : params));
    }, [addPendingInputEvent, canSendTerminalInput, createTask, props.task.callback.display_id, props.task.command.cmd, props.task.id]);
    const sendTerminalData = React.useCallback( (terminalData) => {
        const controlInput = CONTROL_INPUTS_BY_DATA[terminalData];
        if(controlInput){
            sendInteractiveInput({
                params: "",
                originalParams: controlInput.text,
                interactiveTaskType: controlInput.value,
                pendingLabel: controlInput.label,
            });
            return;
        }
        sendInteractiveInput({
            params: terminalData,
            originalParams: getTerminalInputLabel(terminalData),
            interactiveTaskType: 0,
            pendingLabel: getTerminalInputLabel(terminalData),
        });
    }, [sendInteractiveInput]);
    const flushRawPrintableInput = React.useCallback( () => {
        if(rawPrintableInputTimerRef.current !== null){
            clearTimeout(rawPrintableInputTimerRef.current);
            rawPrintableInputTimerRef.current = null;
        }
        const bufferedInput = rawPrintableInputBufferRef.current;
        rawPrintableInputBufferRef.current = "";
        if(bufferedInput.length > 0){
            sendInteractiveInput({
                params: bufferedInput,
                originalParams: bufferedInput,
                interactiveTaskType: 0,
                pendingLabel: getTerminalInputLabel(bufferedInput),
            });
        }
    }, [sendInteractiveInput]);
    const queueRawPrintableInput = React.useCallback( (terminalData) => {
        rawPrintableInputBufferRef.current += terminalData;
        if(rawPrintableInputTimerRef.current !== null){
            clearTimeout(rawPrintableInputTimerRef.current);
        }
        rawPrintableInputTimerRef.current = setTimeout(() => {
            flushRawPrintableInput();
        }, RAW_PRINTABLE_BATCH_DELAY_MS);
    }, [flushRawPrintableInput]);
    const submitLineInput = React.useCallback( () => {
        const enterValue = EnterOptions[selectedEnterOption]?.value || "";
        const lineValue = lineInputBufferRef.current + enterValue;
        if(lineValue.length === 0){
            return;
        }
        sendInteractiveInput({
            params: lineValue,
            originalParams: lineValue,
            interactiveTaskType: 0,
            pendingLabel: getTerminalInputLabel(lineValue),
        });
        setTrackedLineInputBuffer("");
    }, [selectedEnterOption, sendInteractiveInput, setTrackedLineInputBuffer]);
    const handleTerminalData = React.useCallback( (terminalData) => {
        if(!canSendTerminalInput){
            return null;
        }
        if(inputMode === "raw"){
            if(terminalData === "\r" || terminalData === "\n"){
                flushRawPrintableInput();
                const enterValue = EnterOptions[selectedEnterOption]?.value || "";
                sendInteractiveInput({
                    params: enterValue,
                    originalParams: enterValue,
                    interactiveTaskType: 0,
                    pendingLabel: `Enter ${EnterOptions[selectedEnterOption]?.name || "None"}`,
                });
                return null;
            }
            if(isPrintableTerminalText(terminalData)){
                queueRawPrintableInput(terminalData);
                return null;
            }
            flushRawPrintableInput();
            sendTerminalData(terminalData);
            return null;
        }
        if(terminalData === "\r" || terminalData === "\n"){
            submitLineInput();
            return {write: "\r\n"};
        }
        if(terminalData === "\x7f" || terminalData === "\b"){
            const currentBuffer = lineInputBufferRef.current;
            if(currentBuffer.length === 0){
                return null;
            }
            setTrackedLineInputBuffer((current) => Array.from(current).slice(0, -1).join(""));
            return {erase: 1};
        }
        if(terminalData === "\t"){
            setTrackedLineInputBuffer((current) => current + "\t");
            return {write: "\t"};
        }
        if(CONTROL_INPUTS_BY_DATA[terminalData] || terminalData.startsWith("\x1b")){
            sendTerminalData(terminalData);
            return null;
        }
        const normalizedInput = normalizeLineBufferInput(terminalData);
        setTrackedLineInputBuffer((current) => current + normalizedInput);
        return {write: normalizedInput.replaceAll("\n", "\r\n")};
    }, [
        canSendTerminalInput,
        flushRawPrintableInput,
        inputMode,
        queueRawPrintableInput,
        selectedEnterOption,
        sendInteractiveInput,
        sendTerminalData,
        setTrackedLineInputBuffer,
        submitLineInput,
    ]);
    const handleTerminalKeyEvent = React.useCallback( (event) => {
        if(!canSendTerminalInput){
            return true;
        }
        if(inputMode === "raw" && event.type === "keydown" && TERMINAL_KEY_EVENT_INPUTS[event.key]){
            event.preventDefault();
            flushRawPrintableInput();
            sendTerminalData(TERMINAL_KEY_EVENT_INPUTS[event.key]);
            return {handled: true};
        }
        if(inputMode === "line" && event.type === "keydown" && event.key === "Tab"){
            event.preventDefault();
            setTrackedLineInputBuffer((current) => current + "\t");
            return {handled: true, write: "\t"};
        }
        if(inputMode === "line" && event.type === "keydown" && event.key === "Enter" && event.shiftKey){
            event.preventDefault();
            setTrackedLineInputBuffer((current) => current + "\n");
            return {handled: true, write: "\r\n"};
        }
        return true;
    }, [canSendTerminalInput, flushRawPrintableInput, inputMode, sendTerminalData, setTrackedLineInputBuffer]);
    const onChangeInputMode = (value) => {
        flushRawPrintableInput();
        if(value === "raw"){
            setTrackedLineInputBuffer("");
        }
        setInputMode(value);
    };
    const onChangeSelectEnterOption = (value) => {
        setSelectedEnterOption(value);
    };
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
                      Fetching Interactive Responses....
                  </Typography>
              </div>
          </Backdrop>
          {props.searchOutput &&
              <SearchBar onSubmitSearch={onSubmitSearch}/>
          }
          <div className="mythic-interactive-terminal-frame" ref={props.responseRef} id={`ptytask${props.task.id}`}>
              {canSendTerminalInput &&
                  <InteractiveTerminalToolbar
                      theme={theme}
                      inputMode={inputMode}
                      onChangeInputMode={onChangeInputMode}
                      selectedEnterOption={selectedEnterOption}
                      onChangeSelectEnterOption={onChangeSelectEnterOption}
                      pendingInputEvents={pendingInputEvents}
                      useASNIColor={useASNIColor}
                      toggleANSIColor={toggleANSIColor}
                      wrapText={wrapText}
                      toggleWrapText={toggleWrapText}
                      autoScroll={autoScroll}
                      toggleAutoScroll={toggleAutoScroll}
                  />
              }
              <div style={{overflow: "hidden", width: "100%", marginBottom: "5px", height: props.expand ? "100%": undefined,
                  display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, minHeight: outputMinHeight}}>
                  <InteractiveTerminalDisplay data={visibleOutput}
                                              useASNIColor={useASNIColor}
                                              showTaskStatus={false}
                                              wrapText={wrapText}
                                              autoScroll={autoScroll}
                                              theme={theme}
                                              canSendInput={canSendTerminalInput}
                                              inputMode={inputMode}
                                              lineInputBuffer={lineInputBuffer}
                                              onTerminalInput={handleTerminalData}
                                              onTerminalKeyEvent={handleTerminalKeyEvent}/>
              </div>
          </div>

          <InteractivePaginationBar totalCount={totalCount} currentPage={currentPage}
                                    onSubmitPageChange={onSubmitPageChange} expand={props.expand}
                                    pageSize={pageSize.current} selectAllOutput={props.selectAllOutput}/>
      </div>
  )

}
const InteractiveTerminalToolbar = ({
    theme,
    inputMode,
    onChangeInputMode,
    selectedEnterOption,
    onChangeSelectEnterOption,
    pendingInputEvents,
    useASNIColor,
    toggleANSIColor,
    wrapText,
    toggleWrapText,
    autoScroll,
    toggleAutoScroll,
}) => {
    const [enterAnchorEl, setEnterAnchorEl] = React.useState(null);
    const selectedEnter = EnterOptions[selectedEnterOption] || EnterOptions[0];
    const openEnterMenu = (event) => {
        setEnterAnchorEl(event.currentTarget);
    };
    const closeEnterMenu = () => {
        setEnterAnchorEl(null);
    };
    const toggleInputMode = () => {
        onChangeInputMode(inputMode === "raw" ? "line" : "raw");
    };
    const selectEnterOption = (index) => {
        onChangeSelectEnterOption(index);
        closeEnterMenu();
    };
    return (
        <div className="mythic-interactive-terminal-toolbar">
            <div className="mythic-interactive-terminal-toolbar-row">
                <button
                    type="button"
                    className="mythic-interactive-terminal-config-chip"
                    onClick={toggleInputMode}
                    style={{color: theme.outputTextColor}}>
                    {inputMode === "raw" ? "Raw key mode" : "Line mode"}
                </button>
                <button
                    type="button"
                    className="mythic-interactive-terminal-config-chip mythic-interactive-terminal-enter-chip"
                    onClick={openEnterMenu}
                    style={{color: theme.outputTextColor}}>
                    Enter: {selectedEnter.name}
                </button>
                <Menu
                    anchorEl={enterAnchorEl}
                    open={Boolean(enterAnchorEl)}
                    onClose={closeEnterMenu}>
                    {EnterOptions.map((option, index) => (
                        <MenuItem
                            key={option.name}
                            selected={index === selectedEnterOption}
                            onClick={() => selectEnterOption(index)}>
                            {option.name}
                        </MenuItem>
                    ))}
                </Menu>
                {pendingInputEvents.length > 0 &&
                    <div className="mythic-interactive-terminal-pending">
                        <span>Awaiting output</span>
                        {pendingInputEvents.map((event) => (
                            <span className="mythic-interactive-terminal-pending-chip" key={event.id}>{event.label}</span>
                        ))}
                    </div>
                }
                <div className="mythic-interactive-terminal-toolbar-spacer" />
                <div className="mythic-interactive-terminal-toggle-group" role="group" aria-label="Terminal display options">
                    <MythicStyledTooltip title={useASNIColor ?  "Disable ANSI Color" : "Enable ANSI Color"} >
                        <button
                            aria-pressed={useASNIColor}
                            className={`mythic-interactive-terminal-toggle-button${useASNIColor ? "" : " is-off"}`}
                            onClick={toggleANSIColor}
                            type="button">
                            <PaletteIcon fontSize="small" />
                        </button>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={wrapText ?  "Unwrap Text" : "Wrap Text"} >
                        <button
                            aria-pressed={wrapText}
                            className={`mythic-interactive-terminal-toggle-button${wrapText ? "" : " is-off"}`}
                            onClick={toggleWrapText}
                            type="button">
                            <WrapTextIcon fontSize="small" />
                        </button>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={autoScroll ?  "Stop Auto Scroll" : "Auto Scroll"} >
                        <button
                            aria-pressed={autoScroll}
                            className={`mythic-interactive-terminal-toggle-button${autoScroll ? "" : " is-off"}`}
                            onClick={toggleAutoScroll}
                            type="button">
                            <HeightIcon fontSize="small" />
                        </button>
                    </MythicStyledTooltip>
                </div>
            </div>
            {inputMode === "raw" &&
                <div className="mythic-interactive-terminal-raw-warning">
                    Raw key mode sends every keypress as its own task. Wait for the agent to echo before typing ahead.
                </div>
            }
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
