import React from 'react';
import {createTaskingMutation} from './CallbackMutations';
import {snackActions} from "../../utilities/Snackbar";
import { gql, useLazyQuery, useMutation, useReactiveVar, useSubscription } from '@apollo/client';
import {b64DecodeUnicode} from "./ResponseDisplay";
import {SearchBar} from './ResponseDisplay';
import Pagination from '@mui/material/Pagination';
import {Typography, CircularProgress, Backdrop, Menu} from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import PaletteIcon from '@mui/icons-material/Palette';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {Terminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import {WebglAddon} from '@xterm/addon-webgl';
import {Unicode11Addon} from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';
import WrapTextIcon from '@mui/icons-material/WrapText';
import {useTheme} from '@mui/material/styles';
import HeightIcon from '@mui/icons-material/Height';
import {MythicChip} from "../../MythicComponents/MythicChip";
import {MythicDialog} from "../../MythicComponents/MythicDialogBase";
import {MythicDraggableDialogTitle} from "../../MythicComponents/MythicDraggableDialogTitle";
import {MythicDialogButton, MythicDialogFooter} from "../../MythicComponents/MythicDialogLayout";
import DialogContent from '@mui/material/DialogContent';
import {handleAuthLink} from "../../utilities/FileDownloadWithAuth";
import {mythicFetch} from "../../utilities/MythicConnection";
import {toLocalTime} from "../../utilities/Time";
import {meState} from "../../../cache";
import {openInteractiveLiveStream} from "./InteractiveLiveSocket";

const subResponsesQuery = gql`
subscription subResponsesQuery($task_id: Int!, $cursor_id: Int!) {
  response_stream(where: {task_id: {_eq: $task_id}}, batch_size: 50, cursor: {initial_value: {id: $cursor_id}}) {
    id
    response: response_text
    timestamp
    is_error
    interactive_task_type
  }
}`;
const subScreenRecordingsQuery = gql`
subscription subInteractiveScreenRecordings($task_id: Int!) {
  interactive_screen_session(where: {task_id: {_eq: $task_id}}, order_by: {id: asc}) {
    id
    start_response_id
    end_response_id
    start_time
    end_time
    collapsed
    filemeta {
      agent_file_id
    }
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
const getInteractiveLatestResponsesQuery = gql`
query getInteractiveLatestResponses($task_id: Int!, $fetchLimit: Int!) {
  response(where: {task_id: {_eq: $task_id}}, limit: $fetchLimit, order_by: {id: desc}) {
    id
    response: response_text
    timestamp
    is_error
    interactive_task_type
  }
  response_aggregate(where: {task_id: {_eq: $task_id}}) {
    aggregate {
      count
    }
  }
}`;
const MAX_INTERACTIVE_SELECT_ALL_RESPONSES = 5000;
const INTERACTIVE_LIVE_WINDOW_SIZE = 100;
const getInteractiveResponseWhereClause = (taskID, search) => {
    if(search === undefined || search === ""){
        return {task_id: {_eq: taskID}};
    }
    return {task_id: {_eq: taskID}, response_escape: {_ilike: "%" + search + "%"}};
}
// eslint-disable-next-line no-control-regex
const SCREEN_EXIT_REGEX = /\x1b\[\?(?:1049|1047|47)l|\x1bc/;
// what a killed full-screen app leaves behind: alternate screen, mouse tracking, bracketed paste and hidden cursor
const SCREEN_FORCED_EXIT = "\x1b[?1049l\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?2004l\x1b[?25h";
const formatInteractiveScreenDuration = (startTime, endTime) => {
    const seconds = Math.max(0, Math.round((new Date(endTime) - new Date(startTime)) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return `${hours > 0 ? `${hours}h` : ""}${hours > 0 || minutes > 0 ? `${minutes}m` : ""}${seconds % 60}s`;
}
// leave the alternate screen after a full-screen app that was killed before it could
// collapsed recordings had their full-screen output removed from the responses, so there's nothing to leave
export const addInteractiveScreenForcedExits = (entries, recordings) => {
    const endResponseIDs = new Set(recordings.filter((recording) => recording.end_response_id && !recording.collapsed).map((recording) => recording.end_response_id));
    if(endResponseIDs.size === 0){
        return entries;
    }
    return entries.flatMap((entry) => {
        if(entry.response === undefined || !endResponseIDs.has(entry.id) || SCREEN_EXIT_REGEX.test(entry.response)){
            return [entry];
        }
        return [entry, {id: `screen-exit-${entry.id}`, timestamp: entry.timestamp, is_error: false, response: SCREEN_FORCED_EXIT}];
    });
}
// the bytes of a character cut off by the start or end of an agent's output chunk
const getInteractiveSplitCharacterBounds = (bytes) => {
    let start = 0;
    while(start < bytes.length && start < 3 && (bytes[start] & 0xC0) === 0x80){
        start++;
    }
    let end = bytes.length;
    for(let i = bytes.length - 1; i >= start && i >= bytes.length - 3; i--){
        if((bytes[i] & 0xC0) !== 0x80){
            const length = bytes[i] >= 0xF0 ? 4 : bytes[i] >= 0xE0 ? 3 : bytes[i] >= 0xC0 ? 2 : 1;
            if(bytes.length - i < length){
                end = i;
            }
            break;
        }
    }
    return {start, end};
}
const decodeInteractiveBytes = (bytes) => {
    const {start, end} = getInteractiveSplitCharacterBounds(bytes);
    return {
        response: new TextDecoder().decode(bytes.subarray(start, end)),
        utf8Head: bytes.slice(0, start),
        utf8Tail: bytes.slice(end),
        byteLength: bytes.length,
    };
}
export const decodeInteractiveResponse = (response) => {
    let bytes;
    try{
        bytes = Uint8Array.from(window.atob(response.response), (character) => character.charCodeAt(0));
    }catch(error){
        return {...response, response: b64DecodeUnicode(response.response)};
    }
    return {...response, ...decodeInteractiveBytes(bytes)};
}
// InteractiveTask.Error and InteractiveTask.FileEditorError
const INTERACTIVE_ERROR_MESSAGE_TYPES = [2, 102];
export const decodeInteractiveLiveOutput = ({messageType, bytes, liveSequence, liveOffset}) => {
    return {...decodeInteractiveBytes(bytes), is_error: INTERACTIVE_ERROR_MESSAGE_TYPES.includes(messageType), liveSequence, liveOffset};
}
// output from the live stream is shown as it arrived, both before its response comes from the database and after,
// so the terminal only has to append when the response turns up rather than replay everything
export const addInteractiveLiveOutput = (entries, live) => {
    if(live === null){
        return entries;
    }
    const savedByID = new Map(live.saved.map((saved) => [saved.responseID, saved]));
    const shown = entries.flatMap((entry) => {
        const saved = savedByID.get(entry.id);
        if(saved === undefined){
            // live output saved since the stream opened is already on screen, waiting to be matched to its response
            const fromLiveOutput = entry.interactive_task_type !== undefined && entry.interactive_task_type !== null &&
                entry.id > live.startResponseID;
            return fromLiveOutput ? [] : [entry];
        }
        // the response changed after it was saved, like a full-screen app's output being collapsed
        if(saved.byteLength !== entry.byteLength){
            return [entry];
        }
        return saved.output.map((output, index) => ({
            ...output,
            id: index === saved.output.length - 1 ? entry.id : undefined,
            timestamp: entry.timestamp,
        }));
    });
    // responses arrive in order, so a saved one older than the newest loaded was since deleted
    const newestID = entries.reduce((newest, entry) => typeof entry.id === "number" ? Math.max(newest, entry.id) : newest, 0);
    const waiting = live.saved.filter((saved) => saved.responseID > newestID).flatMap((saved) => saved.output);
    return [...shown, ...waiting, ...live.pending];
}
// rebuild a character split across two responses at the start of the later one, kept apart from its text so
// the entry still matches what was written once the earlier response leaves the live window
export const joinInteractiveSplitCharacters = (entries) => {
    let previousTail = new Uint8Array(0);
    return entries.map((entry) => {
        if(entry.utf8Head === undefined){
            return entry;
        }
        const tail = previousTail;
        previousTail = entry.utf8Tail;
        if(tail.length === 0 && entry.utf8Head.length === 0){
            return entry;
        }
        const character = new Uint8Array(tail.length + entry.utf8Head.length);
        character.set(tail);
        character.set(entry.utf8Head, tail.length);
        return {...entry, characterPrefix: new TextDecoder().decode(character)};
    });
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
export const INTERACTIVE_TERMINAL_SCROLLBACK = 5000;
export const INTERACTIVE_TERMINAL_MAX_UNWRAPPED_COLS = 300;
// eslint-disable-next-line no-control-regex
export const ANSI_STYLE_CODE_REGEX = /\x1b\[[0-?]*[ -/]*m/g;
// eslint-disable-next-line no-control-regex
export const TERMINAL_CONTROL_CODE_REGEX = /\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b\[[0-?]*[ -/]*[@-~]|\x1b[ -/]*[@-~]/g;
// eslint-disable-next-line no-control-regex
export const TERMINAL_QUERY_CODE_REGEX = /\x1bc|\x1b\[(?:\?|>)?[0-9;]*[cn]|\x1b\](?:4|10|11|12);[^\x07]*(?:\x07|\x1b\\)/g;
export const stripAnsiStyleCodes = (value) => {
    return value.replace(ANSI_STYLE_CODE_REGEX, "");
}
export const getTerminalText = (value) => {
    return value === undefined || value === null ? "" : String(value);
}
export const sanitizeTerminalOutput = (value) => {
    return getTerminalText(value).replace(TERMINAL_QUERY_CODE_REGEX, "");
}
export const getInteractiveTerminalTheme = (theme) => {
    return {
        background: theme.outputBackgroundColor,
        foreground: theme.outputTextColor,
        cursor: theme.palette.info.main,
        selectionBackground: theme.palette.info.main + "55",
    }
}
export const getInteractiveTerminalAppendIndex = (previousSignatures, nextSignatures) => {
    if(previousSignatures.length === 0){
        return 0;
    }
    const lastIndex = nextSignatures.lastIndexOf(previousSignatures[previousSignatures.length - 1]);
    if(lastIndex < 0){
        return -1;
    }
    const overlapLength = lastIndex + 1;
    if(overlapLength > previousSignatures.length){
        return -1;
    }
    const previousOffset = previousSignatures.length - overlapLength;
    for(let i = 0; i < overlapLength; i++){
        if(previousSignatures[previousOffset + i] !== nextSignatures[i]){
            return -1;
        }
    }
    return overlapLength;
}
const getInteractiveTerminalEntrySignature = (entry) => {
    if(entry.liveSequence !== undefined){
        return `live:${entry.liveSequence}`;
    }
    if(entry.response !== undefined){
        return `response:${entry.id}:${entry.timestamp}:${entry.is_error}:${entry.response.length}`;
    }
    return `task:${entry.id}:${entry.status}:${entry.original_params}:${entry.display_params}`;
}
export const getInteractiveTerminalMeasurementText = (value) => {
    return sanitizeTerminalOutput(value).replace(TERMINAL_CONTROL_CODE_REGEX, "");
}
export const getLongestTerminalTextLineLength = (value) => {
    return getInteractiveTerminalMeasurementText(value).split(/\r\n|\n|\r/).reduce( (longestLineLength, line) => {
        return Math.max(longestLineLength, Array.from(line.replaceAll("\t", "    ")).length);
    }, 0);
}
const getInteractiveTerminalEntryText = (entry) => {
    if(entry.response !== undefined){
        return entry.response;
    }
    return entry.original_params || entry.display_params;
}
const getLongestInteractiveTerminalLineLength = (entries) => {
    return entries.reduce( (longestLineLength, entry) => {
        return Math.max(longestLineLength, getLongestTerminalTextLineLength(getInteractiveTerminalEntryText(entry)));
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
export const formatInteractiveTerminalEntry = ({entry, useASNIColor, showTaskStatus}) => {
    if(entry.response !== undefined){
        const terminalResponse = sanitizeTerminalOutput((entry.characterPrefix || "") + entry.response);
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
export const formatInteractiveTerminalEntries = ({entries, useASNIColor=true, showTaskStatus=false}) => {
    return entries.map((entry) => formatInteractiveTerminalEntry({
        entry,
        useASNIColor,
        showTaskStatus,
    })).join("");
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
    onTerminalMouse,
    onTerminalResize,
    onScreenModeChange,
    startsInAlternateScreen,
    onLiveOutputWritten,
    sharedSize,
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
    const onTerminalMouseRef = React.useRef(onTerminalMouse);
    onTerminalMouseRef.current = onTerminalMouse;
    const onTerminalResizeRef = React.useRef(onTerminalResize);
    const onScreenModeChangeRef = React.useRef(onScreenModeChange);
    const onLiveOutputWrittenRef = React.useRef(onLiveOutputWritten);
    onLiveOutputWrittenRef.current = onLiveOutputWritten;
    // the size everyone watching the task can show, which the terminal is drawn at instead of filling its space
    const sharedSizeRef = React.useRef(sharedSize);
    sharedSizeRef.current = sharedSize;
    const unwrappedColumnCountRef = React.useRef(0);
    const [terminalReady, setTerminalReady] = React.useState(false);
    const longestLineLength = React.useMemo( () => {
        return wrapText ? 0 : getLongestInteractiveTerminalLineLength(data);
    }, [data, wrapText]);
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
            const visibleRows = Math.max(1, proposedDimensions.rows);
            const visibleCols = Math.max(1, proposedDimensions.cols);
            const sharedSize = sharedSizeRef.current;
            const rows = sharedSize ? sharedSize.rows : visibleRows;
            if(wrapTextRef.current || terminal.buffer.active.type === "alternate"){
                if(sharedSize){
                    terminal.resize(sharedSize.cols, sharedSize.rows);
                } else {
                    fitAddon.fit();
                }
                scrollContainer.scrollLeft = 0;
            } else {
                const cols = Math.max(sharedSize ? sharedSize.cols : visibleCols, unwrappedColumnCountRef.current);
                terminalElement.style.width = `${Math.ceil((cols / visibleCols) * scrollContainer.clientWidth)}px`;
                terminal.resize(cols, rows);
            }
            onTerminalResizeRef.current?.(visibleCols, visibleRows);
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
        scheduleFitTerminal();
    }, [sharedSize, scheduleFitTerminal]);
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
        onTerminalResizeRef.current = onTerminalResize;
    }, [onTerminalResize]);
    React.useEffect( () => {
        onScreenModeChangeRef.current = onScreenModeChange;
    }, [onScreenModeChange]);
    React.useEffect( () => {
        if(wrapText){
            unwrappedColumnCountRef.current = 0;
        } else {
            unwrappedColumnCountRef.current = Math.min(Math.max(longestLineLength + 2, 1), INTERACTIVE_TERMINAL_MAX_UNWRAPPED_COLS);
        }
        scheduleFitTerminal();
    }, [longestLineLength, scheduleFitTerminal, wrapText]);
    React.useEffect( () => {
        const terminalElement = terminalElementRef.current;
        if(!terminalElement){
            return;
        }
        const terminal = new Terminal({
            allowProposedApi: true,
            allowTransparency: true,
            convertEol: true,
            cursorBlink: true,
            disableStdin: !canSendInputRef.current,
            fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 13,
            // apps tracking the mouse get the clicks, so Option-click still selects on macOS as Shift does elsewhere
            macOptionClickForcesSelection: true,
            scrollback: INTERACTIVE_TERMINAL_SCROLLBACK,
            theme: getInteractiveTerminalTheme(theme),
        });
        const keyDisposable = terminal.onKey(({key}) => {
            writeLocalTerminalAction(onTerminalInputRef.current?.(key));
        });
        // apps that turn on mouse tracking get clicks, drags and the wheel as escape sequences. Keys come from onKey.
        const mouseDataDisposable = terminal.onData((data) => {
            if(parseTerminalMouseReport(data)){
                onTerminalMouseRef.current?.(data);
            }
        });
        // X10 reports are bytes rather than text, which can only be sent while they're ASCII (up to column 95)
        const mouseBinaryDisposable = terminal.onBinary((data) => {
            // eslint-disable-next-line no-control-regex
            if(parseTerminalMouseReport(data) && /^[\x00-\x7f]*$/.test(data)){
                onTerminalMouseRef.current?.(data);
            }
        });
        // alternate screen buffer (ESC[?1049h etc) means a full-screen app is running
        const bufferChangeDisposable = terminal.buffer.onBufferChange((buffer) => {
            // full-screen apps use a bare LF to move down a row in the same column, so only convert it for line output
            terminal.options.convertEol = buffer.type !== "alternate";
            onScreenModeChangeRef.current?.(buffer.type === "alternate");
            scheduleFitTerminal();
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
        // apps lay out emoji such as U+2615 as two cells, xterm.js defaults to Unicode 6 widths
        terminal.loadAddon(new Unicode11Addon());
        terminal.unicode.activeVersion = "11";
        terminal.open(terminalElement);
        // the DOM renderer lets fallback-font glyphs (braille, blocks) shift the rest of a row out of line
        try{
            const webglAddon = new WebglAddon();
            webglAddon.onContextLoss(() => webglAddon.dispose());
            terminal.loadAddon(webglAddon);
        }catch(error){
            console.warn("WebGL unavailable, using the DOM renderer", error);
        }
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
        terminal.textarea.addEventListener("paste", handleTerminalPaste);
        return () => {
            if(fitAnimationFrameRef.current !== null){
                window.cancelAnimationFrame(fitAnimationFrameRef.current);
                fitAnimationFrameRef.current = null;
            }
            resizeObserverRef.current?.disconnect();
            resizeObserverRef.current = null;
            fitAddonRef.current = null;
            terminalRef.current = null;
            terminalElement.removeEventListener("paste", handleTerminalPaste);
            keyDisposable.dispose();
            mouseDataDisposable.dispose();
            mouseBinaryDisposable.dispose();
            bufferChangeDisposable.dispose();
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
        const hasPendingLineInput = canSendInputRef.current &&
            inputModeRef.current === "line" &&
            lineInputBufferRef.current.length > 0;
        // only replay on input mode change to clear local echo, otherwise a full-screen app is wiped
        const inputModeNeedsReset = previousReplayState.inputMode !== inputMode && localEchoVisibleRef.current;
        const appendFromIndex = getInteractiveTerminalAppendIndex(previousReplayState.signatures, nextSignatures);
        // the output starts part way through a full-screen app, so replay it on the alternate screen,
        // unless that app is running live and the terminal is already there
        const alternateScreenNeedsReplay = startsInAlternateScreen &&
            !previousReplayState.startsInAlternateScreen &&
            terminal.buffer.active.type === "normal";
        const canAppend = !hasPendingLineInput &&
            !inputModeNeedsReset &&
            !alternateScreenNeedsReplay &&
            previousReplayState.settingsKey === settingsKey &&
            appendFromIndex >= 0;
        const previousViewportY = terminal.buffer.active.viewportY;
        const entriesToWrite = canAppend ? data.slice(appendFromIndex) : data;
        if(!canAppend){
            terminal.reset();
        }
        const terminalOutput = (!canAppend && startsInAlternateScreen ? "\x1b[?1049h" : "") + formatInteractiveTerminalEntries({
            entries: entriesToWrite,
            useASNIColor,
            showTaskStatus,
        });
        replayStateRef.current = {
            settingsKey,
            inputMode,
            startsInAlternateScreen,
            signatures: nextSignatures,
        };
        const liveOffset = entriesToWrite.reduce((offset, entry) => Math.max(offset, entry.liveOffset || 0), 0);
        const afterWrite = () => {
            if(liveOffset > 0){
                onLiveOutputWrittenRef.current?.(liveOffset);
            }
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
    }, [data, inputMode, scheduleFitTerminal, showTaskStatus, startsInAlternateScreen, terminalReady, useASNIColor, wrapText]);
    return (
        <div className={`mythic-interactive-terminal-shell flex-fill relative${canSendInput ? " mythic-interactive-terminal-shell-input" : ""} min-h-0 overflow-hidden w-full`}>
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
                <div className="mythic-interactive-terminal-empty-hint text-xs absolute" onMouseDown={() => terminalRef.current?.focus()}>
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
const RAW_PRINTABLE_BATCH_DELAY_MS = 50;
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
// SGR mouse reports are ESC[<button;col;row ending in M, or m for a release. X10 ones are ESC[M and three bytes.
// eslint-disable-next-line no-control-regex
const TERMINAL_MOUSE_SGR_REGEX = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/;
// eslint-disable-next-line no-control-regex
const TERMINAL_MOUSE_X10_REGEX = /^\x1b\[M([\s\S])([\s\S])([\s\S])$/;
const TERMINAL_MOUSE_BUTTONS = ["Click", "Middle click", "Right click"];
const TERMINAL_MOUSE_WHEEL = ["Wheel up", "Wheel down", "Wheel left", "Wheel right"];
// parseTerminalMouseReport returns a label for a mouse report, whether it's only the pointer moving, and whether it's
// moving with no button held, which apps tracking every movement use to highlight what's under the pointer
export const parseTerminalMouseReport = (data) => {
    let button, col, row, released;
    const sgrMatch = TERMINAL_MOUSE_SGR_REGEX.exec(data);
    const x10Match = sgrMatch ? null : TERMINAL_MOUSE_X10_REGEX.exec(data);
    if(sgrMatch){
        [button, col, row] = [Number(sgrMatch[1]), Number(sgrMatch[2]), Number(sgrMatch[3])];
        released = sgrMatch[4] === "m";
    } else if(x10Match){
        [button, col, row] = [x10Match[1], x10Match[2], x10Match[3]].map((value) => value.charCodeAt(0) - 32);
        // X10 has no release, just a press of button 3
        released = (button & 3) === 3 && (button & 96) === 0;
    } else {
        return null;
    }
    const motion = (button & 32) !== 0 && (button & 64) === 0;
    let label;
    if(button & 64){
        label = TERMINAL_MOUSE_WHEEL[button & 3];
    } else if(motion){
        label = (button & 3) === 3 ? "Move" : "Drag";
    } else if(released){
        label = "Release";
    } else {
        label = TERMINAL_MOUSE_BUTTONS[button & 3];
    }
    return {label: `${label} ${col},${row}`, motion, hover: motion && (button & 3) === 3};
};
const isPrintableTerminalText = (value) => {
    // eslint-disable-next-line no-control-regex
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
    const mouseInputRef = React.useRef({data: "", labels: [], motionStart: -1});
    const mouseInputTimerRef = React.useRef(null);
    const lastResizeRef = React.useRef({cols: 0, rows: 0});
    const resizeTimerRef = React.useRef(null);
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
    const [followLive, setFollowLive] = React.useState(true);
    const isLive = followLive && search === "";
    const isLiveRef = React.useRef(isLive);
    isLiveRef.current = isLive;
    const liveWindowSize = props.selectAllOutput ? MAX_INTERACTIVE_SELECT_ALL_RESPONSES : INTERACTIVE_LIVE_WINDOW_SIZE;
    const liveWindowSizeRef = React.useRef(liveWindowSize);
    liveWindowSizeRef.current = liveWindowSize;
    const [screenAlternate, setScreenAlternate] = React.useState(false);
    const tuiActive = screenAlternate && isLive;
    const inputModeBeforeTuiRef = React.useRef(null);
    const [streamCursorID, setStreamCursorID] = React.useState(null);
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
    const {data: screenRecordingsData} = useSubscription(subScreenRecordingsQuery, {
        variables: {task_id: props.task.id},
    });
    const screenRecordings = React.useMemo( () => {
        return screenRecordingsData?.interactive_screen_session || [];
    }, [screenRecordingsData]);
    const [playingRecordingFileID, setPlayingRecordingFileID] = React.useState(null);
    const collapsedRecordingIDsRef = React.useRef(null);
    const [liveOutput, setLiveOutput] = React.useState(null);
    const liveConnectionRef = React.useRef(null);
    const [liveRetry, setLiveRetry] = React.useState(0);
    const [liveSize, setLiveSize] = React.useState(null);
    // how much of the terminal fits on screen here, whether or not it's been sent
    const fitSizeRef = React.useRef(null);
    const liveFailuresRef = React.useRef(0);
    const visibleOutput = React.useMemo( () => {
        const entries = addInteractiveLiveOutput(sortInteractiveEntries(rawResponses), liveOutput);
        return addInteractiveScreenForcedExits(joinInteractiveSplitCharacters(entries), screenRecordings);
    }, [liveOutput, rawResponses, screenRecordings]);
    const startsInAlternateScreen = React.useMemo( () => {
        const firstResponse = rawResponses.find((entry) => entry.response !== undefined);
        if(search !== "" || firstResponse === undefined){
            return false;
        }
        return screenRecordings.some((recording) => !recording.collapsed && recording.start_response_id < firstResponse.id &&
            (!recording.end_response_id || recording.end_response_id >= firstResponse.id));
    }, [rawResponses, screenRecordings, search]);
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
            if(mouseInputTimerRef.current !== null){
                clearTimeout(mouseInputTimerRef.current);
                mouseInputTimerRef.current = null;
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
            setStreamCursorID((current) => current === null ? highestFetched.current : current);
            if(props.selectAllOutput){
                warnSelectAllCapped(nextResponses.length, aggregateCount);
            }
            setBackdropOpen(false);
        },
        onError: data => {
            console.error(data);
            snackActions.error("Failed to fetch interactive responses: " + data.message);
            setStreamCursorID((current) => current === null ? 0 : current);
            setBackdropOpen(false);
        }
    });
    const [fetchLatestResponsesQuery] = useLazyQuery(getInteractiveLatestResponsesQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            const responseMap = new Map();
            data.response.forEach((response) => responseMap.set(response.id, decodeInteractiveResponse(response)));
            rawResponsesRef.current.forEach((response) => responseMap.set(response.id, response));
            const nextResponses = Array.from(responseMap.values())
                .sort((a,b) => a.id > b.id ? 1 : -1)
                .slice(-liveWindowSizeRef.current);
            rawResponsesRef.current = nextResponses;
            setRawResponses(nextResponses);
            if(nextResponses.length > 0){
                setPendingInputEvents([]);
            }
            const latestResponseID = nextResponses.length > 0 ? nextResponses[nextResponses.length - 1].id : 0;
            highestFetched.current = Math.max(highestFetched.current, latestResponseID);
            setStreamCursorID((current) => current === null ? highestFetched.current : current);
            setTrackedTotalCount(Math.max(getInteractiveAggregateCount(data), totalCountRef.current));
            setBackdropOpen(false);
        },
        onError: data => {
            console.error(data);
            snackActions.error("Failed to fetch interactive responses: " + data.message);
            setStreamCursorID((current) => current === null ? 0 : current);
            setBackdropOpen(false);
        }
    });
    const fetchLatestResponses = React.useCallback( () => {
        setBackdropOpen(true);
        fetchLatestResponsesQuery({variables: {
            task_id: props.task.id,
            fetchLimit: liveWindowSize,
        }});
    }, [fetchLatestResponsesQuery, liveWindowSize, props.task.id]);
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
        setFollowLive(true);
        setStreamCursorID(null);
        collapsedRecordingIDsRef.current = null;
    }, [props.task.id, setTrackedTotalCount]);
    React.useEffect( () => {
        selectAllWarningShown.current = false;
        if(isLive){
            rawResponsesRef.current = [];
            setRawResponses([]);
            fetchLatestResponses();
        } else if(search !== ""){
            fetchResponsePage(1);
        }
    }, [fetchResponsePage, fetchLatestResponses, isLive]); // eslint-disable-line react-hooks/exhaustive-deps
    React.useEffect( () => {
        setFollowLive(true);
    }, [props.selectAllOutput]);
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
        if(isLiveRef.current){
            const mergedResponses = [...rawResponsesRef.current, ...newResponses.map(decodeInteractiveResponse)]
                .sort((a,b) => a.id > b.id ? 1 : -1)
                .slice(-liveWindowSizeRef.current);
            rawResponsesRef.current = mergedResponses;
            setRawResponses(mergedResponses);
            return;
        }
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
    React.useEffect( () => {
        if(screenRecordingsData === undefined){
            return;
        }
        const collapsedIDs = screenRecordings.filter((recording) => recording.collapsed).map((recording) => recording.id);
        const previousCollapsedIDs = collapsedRecordingIDsRef.current;
        collapsedRecordingIDsRef.current = new Set(collapsedIDs);
        if(previousCollapsedIDs === null || collapsedIDs.every((id) => previousCollapsedIDs.has(id))){
            return;
        }
        // a finished full-screen app's output was moved into its recording, so reload what's shown
        rawResponsesRef.current = [];
        taskResponseCountRef.current = 0;
        setTrackedTotalCount(0);
        if(isLiveRef.current){
            fetchLatestResponsesQuery({variables: {
                task_id: props.task.id,
                fetchLimit: liveWindowSizeRef.current,
            }});
        } else {
            fetchResponsePage(currentPageRef.current, false);
        }
    }, [screenRecordings]); // eslint-disable-line react-hooks/exhaustive-deps
    useSubscription(subResponsesQuery, {
        variables: {task_id: props.task.id, cursor_id: streamCursorID || 0},
        skip: streamCursorID === null,
        fetchPolicy: "no-cache",
        onData: subscriptionDataCallback
    });
    const onSubmitPageChange = (currentPage) => {
        if(isLiveRef.current){
            rawResponsesRef.current = [];
            setFollowLive(false);
        }
        fetchResponsePage(currentPage);
    }
    const onSubmitSearch = React.useCallback( (newSearch) => {
        currentPageRef.current = 1;
        setCurrentPage(1);
        setFollowLive(true);
        setSearch(newSearch || "");
    }, []);
    React.useEffect( () => {
        const nextResponseCount = props.task.response_count || 0;
        const previousKnownResponseCount = Math.max(totalCountRef.current, taskResponseCountRef.current);
        taskResponseCountRef.current = Math.max(taskResponseCountRef.current, nextResponseCount);
        if(search === ""){
            setTrackedTotalCount(nextResponseCount);
        }
        if(isLiveRef.current || search !== "" || nextResponseCount <= previousKnownResponseCount){
            return;
        }
        const pageStartIndex = (currentPageRef.current - 1) * pageSize.current;
        const pageEndIndex = currentPageRef.current * pageSize.current;
        const currentPageCouldContainNewResponses = previousKnownResponseCount < pageEndIndex &&
            nextResponseCount > pageStartIndex;
        if(props.selectAllOutput || rawResponsesRef.current.length === 0 || currentPageCouldContainNewResponses){
            fetchResponsePage(currentPageRef.current, false);
        }
    }, [fetchResponsePage, props.selectAllOutput, props.task.response_count, search, setTrackedTotalCount]);
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
    const watchLiveOutput = isLive && canSendTerminalInput && !props.task.completed;
    React.useEffect( () => {
        if(!watchLiveOutput){
            return;
        }
        let retryTimer = null;
        let saved = [];
        let pending = [];
        const live = {stream: null, canWrite: false, receivedBytes: 0, creditedBytes: 0, sequence: 0, startResponseID: 0};
        const showLiveOutput = () => {
            setLiveOutput({startResponseID: live.startResponseID, saved, pending});
        };
        live.stream = openInteractiveLiveStream(props.task.id, {
            onOpened: ({responseID, canWrite, size}) => {
                liveFailuresRef.current = 0;
                live.startResponseID = responseID;
                live.canWrite = canWrite;
                liveConnectionRef.current = live;
                setLiveSize(size);
                // the server forgets a viewer's size when its stream closes, so a new stream sends it again
                const fitSize = fitSizeRef.current;
                if(canWrite && fitSize !== null){
                    clearTimeout(resizeTimerRef.current);
                    resizeTimerRef.current = null;
                    lastResizeRef.current = fitSize;
                    live.stream.sendInput({
                        params: `${fitSize.cols},${fitSize.rows},0,0`,
                        originalParams: `resize ${fitSize.cols}x${fitSize.rows}`,
                        interactiveTaskType: 25, // InteractiveTask.WindowChange
                    });
                }
                showLiveOutput();
            },
            onSize: (size) => {
                setLiveSize(size);
            },
            onOutput: (messageType, bytes) => {
                live.receivedBytes += bytes.length;
                pending = [...pending, decodeInteractiveLiveOutput({
                    messageType,
                    bytes,
                    liveSequence: live.sequence++,
                    liveOffset: live.receivedBytes,
                })];
                setPendingInputEvents((current) => current.length === 0 ? current : []);
                showLiveOutput();
            },
            onSaved: (responseID) => {
                // forget output whose response has left the live window
                const oldestResponseID = rawResponsesRef.current[0]?.id || 0;
                saved = saved.filter((response) => response.responseID >= oldestResponseID);
                if(responseID > 0){
                    saved = [...saved, {
                        responseID,
                        output: pending,
                        byteLength: pending.reduce((length, output) => length + output.byteLength, 0),
                    }];
                }
                pending = [];
                showLiveOutput();
            },
            onInputError: (error) => {
                snackActions.error("Failed to send interactive input: " + error);
            },
            onClosed: () => {
                liveConnectionRef.current = null;
                setLiveOutput(null);
                setLiveSize(null);
                // GraphQL keeps the output coming in the meantime
                const retryDelay = Math.min(30000, 1000 * 2 ** liveFailuresRef.current);
                liveFailuresRef.current += 1;
                retryTimer = setTimeout(() => setLiveRetry((current) => current + 1), retryDelay);
            },
        });
        return () => {
            clearTimeout(retryTimer);
            live.stream.close();
            if(liveConnectionRef.current === live){
                liveConnectionRef.current = null;
            }
            setLiveOutput(null);
            setLiveSize(null);
        };
    }, [liveRetry, props.task.id, watchLiveOutput]);
    const creditLiveOutput = React.useCallback( (liveOffset) => {
        const live = liveConnectionRef.current;
        if(live !== null && liveOffset > live.creditedBytes){
            live.stream.credit(liveOffset - live.creditedBytes);
            live.creditedBytes = liveOffset;
        }
    }, []);
    const sendInteractiveInput = React.useCallback( ({
        params,
        originalParams,
        interactiveTaskType=0,
        pendingLabel,
        showPending=true,
    }) => {
        if(!canSendTerminalInput){
            return;
        }
        if(interactiveTaskType === 0 && (params === undefined || params === null || params === "")){
            return;
        }
        if(showPending){
            addPendingInputEvent(pendingLabel || getTerminalInputLabel(originalParams !== undefined ? originalParams : params));
        }
        if(liveConnectionRef.current?.stream.sendInput({
            params: params || "",
            originalParams: originalParams !== undefined ? originalParams : params,
            interactiveTaskType,
        })){
            return;
        }
        createTask({variables: {
                callback_display_id: props.task.callback.display_id,
                command: props.task.command.cmd,
                params: params || "",
                tasking_location: "command_line",
                original_params: originalParams !== undefined ? originalParams : params,
                parameter_group_name: "default",
                parent_task_display_id: props.task.display_id,
                is_interactive_task: true,
                interactive_task_type: interactiveTaskType,
                resolve_task_references: false,
            }});
    }, [addPendingInputEvent, canSendTerminalInput, createTask, props.task.callback.display_id, props.task.command.cmd, props.task.display_id]);
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
    const flushMouseInput = React.useCallback( () => {
        if(mouseInputTimerRef.current !== null){
            clearTimeout(mouseInputTimerRef.current);
            mouseInputTimerRef.current = null;
        }
        const {data, labels} = mouseInputRef.current;
        // hovering doesn't do anything, so it isn't saved with the input
        const actions = labels.filter((report) => !report.hover).map((report) => report.label);
        mouseInputRef.current = {data: "", labels: [], motionStart: -1};
        if(data.length > 0){
            sendInteractiveInput({
                params: data,
                originalParams: actions.join(" "),
                interactiveTaskType: 0,
                showPending: false,
            });
        }
    }, [sendInteractiveInput]);
    const flushRawTextInput = React.useCallback( () => {
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
    // typing and the mouse are batched separately, so whichever is waiting goes before anything else is sent
    const flushRawPrintableInput = React.useCallback( () => {
        flushMouseInput();
        flushRawTextInput();
    }, [flushMouseInput, flushRawTextInput]);
    const sendTerminalResize = React.useCallback( (cols, rows) => {
        if(!canSendTerminalInput){
            return;
        }
        fitSizeRef.current = {cols, rows};
        if(lastResizeRef.current.cols === cols && lastResizeRef.current.rows === rows){
            return;
        }
        lastResizeRef.current = {cols, rows};
        if(resizeTimerRef.current !== null){
            clearTimeout(resizeTimerRef.current);
        }
        resizeTimerRef.current = setTimeout(() => {
            resizeTimerRef.current = null;
            const payload = `${cols},${rows},0,0`;
            sendInteractiveInput({
                params: payload,
                originalParams: `resize ${cols}x${rows}`,
                interactiveTaskType: 25, // InteractiveTask.WindowChange
                pendingLabel: `Resize ${cols}x${rows}`,
            });
        }, 150);
    }, [canSendTerminalInput, sendInteractiveInput]);
    React.useEffect( () => {
        return () => {
            if(resizeTimerRef.current !== null){
                clearTimeout(resizeTimerRef.current);
                resizeTimerRef.current = null;
            }
        };
    }, []);
    // the first key goes straight away, then keys typed while it's on its way are sent together
    const queueRawPrintableInput = React.useCallback( (terminalData) => {
        flushMouseInput();
        rawPrintableInputBufferRef.current += terminalData;
        if(rawPrintableInputTimerRef.current !== null){
            return;
        }
        const sendBatch = () => {
            if(rawPrintableInputBufferRef.current.length === 0){
                rawPrintableInputTimerRef.current = null;
                return;
            }
            flushRawPrintableInput();
            rawPrintableInputTimerRef.current = setTimeout(sendBatch, RAW_PRINTABLE_BATCH_DELAY_MS);
        };
        sendBatch();
    }, [flushMouseInput, flushRawPrintableInput]);
    // mouse reports are sent like keys, the first straight away and the rest in batches, and moving the pointer
    // only sends where it got to by the time a batch goes
    const handleTerminalMouse = React.useCallback( (terminalData) => {
        if(!canSendTerminalInput || inputMode !== "raw"){
            return;
        }
        const report = parseTerminalMouseReport(terminalData);
        if(!report){
            return;
        }
        flushRawTextInput();
        const mouseInput = mouseInputRef.current;
        if(report.motion && mouseInput.motionStart >= 0){
            mouseInput.data = mouseInput.data.slice(0, mouseInput.motionStart);
            mouseInput.labels = mouseInput.labels.slice(0, -1);
        }
        mouseInput.motionStart = report.motion ? mouseInput.data.length : -1;
        mouseInput.data += terminalData;
        mouseInput.labels = [...mouseInput.labels, report];
        if(mouseInputTimerRef.current !== null){
            return;
        }
        const sendBatch = () => {
            if(mouseInputRef.current.data.length === 0){
                mouseInputTimerRef.current = null;
                return;
            }
            flushMouseInput();
            mouseInputTimerRef.current = setTimeout(sendBatch, RAW_PRINTABLE_BATCH_DELAY_MS);
        };
        sendBatch();
    }, [canSendTerminalInput, flushMouseInput, flushRawTextInput, inputMode]);
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
    React.useEffect( () => {
        if(!canSendTerminalInput){
            return;
        }
        if(tuiActive && inputMode !== "raw" && inputModeBeforeTuiRef.current === null){
            inputModeBeforeTuiRef.current = inputMode;
            onChangeInputMode("raw");
        } else if(!tuiActive && inputModeBeforeTuiRef.current !== null){
            const previousInputMode = inputModeBeforeTuiRef.current;
            inputModeBeforeTuiRef.current = null;
            if(inputMode === "raw"){
                onChangeInputMode(previousInputMode);
            }
        }
    }, [tuiActive]); // eslint-disable-line react-hooks/exhaustive-deps
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
          {playingRecordingFileID !== null &&
              <MythicDialog fullWidth={true} maxWidth="lg" open={true}
                            onClose={() => setPlayingRecordingFileID(null)}
                            innerDialog={<InteractiveScreenRecordingDialog agentFileID={playingRecordingFileID}
                                                                           onClose={() => setPlayingRecordingFileID(null)} />}
              />
          }
          <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute",}} invisible={false}>
              <div style={{
                  borderRadius: "4px",
                  border: `1px solid ${theme.palette.divider}`,
                  padding: "5px",
                  backgroundColor: theme.palette.background.contrast, color: theme.palette.text.contrast,
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
          <div className="mythic-interactive-terminal-frame border-output flex flex-fill flex-column min-h-0 overflow-hidden w-full rounded" ref={props.responseRef} id={`ptytask${props.task.id}`}>
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
                      tuiActive={tuiActive}
                      screenRecordings={screenRecordings}
                      onPlayScreenRecording={setPlayingRecordingFileID}
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
                                              onTerminalKeyEvent={handleTerminalKeyEvent}
                                              onTerminalMouse={handleTerminalMouse}
                                              onTerminalResize={sendTerminalResize}
                                              onScreenModeChange={setScreenAlternate}
                                              startsInAlternateScreen={startsInAlternateScreen}
                                              onLiveOutputWritten={creditLiveOutput}
                                              sharedSize={liveSize}/>
              </div>
          </div>

          <InteractivePaginationBar totalCount={totalCount} currentPage={currentPage}
                                    onSubmitPageChange={onSubmitPageChange} expand={props.expand}
                                    pageSize={pageSize.current} selectAllOutput={props.selectAllOutput}
                                    isLive={isLive} canJumpToLive={!followLive && search === ""}
                                    onJumpToLive={() => setFollowLive(true)} tuiActive={tuiActive}/>
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
    tuiActive,
    screenRecordings,
    onPlayScreenRecording,
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
        <div className="mythic-interactive-terminal-toolbar bg-output-toolbar text-output items-stretch flex flex-none flex-column gap-2 min-w-0">
            <div className="mythic-interactive-terminal-toolbar-row items-center flex gap-4 min-w-0 w-full">
                <MythicChip
                    label={inputMode === "raw" ? "Raw key mode" : "Line mode"}
                    onClick={toggleInputMode}
                    style={{color: theme.outputTextColor}}
                />
                <MythicChip
                    label={`Enter: ${selectedEnter.name}`}
                    onClick={openEnterMenu}
                    style={{color: theme.outputTextColor}}
                />
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
                {tuiActive &&
                    <MythicStyledTooltip title="A full-screen terminal app is running. Showing live output only; pagination returns when it exits.">
                        <MythicChip compact label="Full-screen app" tone="info" />
                    </MythicStyledTooltip>
                }
                {pendingInputEvents.length > 0 &&
                    <div className="mythic-interactive-terminal-pending text-output-muted items-center flex gap-2 min-w-0 overflow-hidden whitespace-nowrap">
                        <span>Awaiting output</span>
                        {pendingInputEvents.map((event) => (
                            <MythicChip compact key={event.id} label={event.label} tone="info" />
                        ))}
                    </div>
                }
                <div className="mythic-interactive-terminal-toolbar-spacer flex-fill min-w-0" />
                <InteractiveScreenRecordingsMenu recordings={screenRecordings} onPlay={onPlayScreenRecording} />
                <div className="mythic-interactive-terminal-toggle-group bg-output-control border-output items-center inline-flex flex-none overflow-hidden rounded" role="group" aria-label="Terminal display options">
                    <MythicStyledTooltip title={tuiActive ? "Unavailable while a full-screen app is running" : useASNIColor ?  "Disable ANSI Color" : "Enable ANSI Color"} >
                        <button
                            aria-pressed={useASNIColor}
                            disabled={tuiActive}
                            className={`mythic-interactive-terminal-toggle-button bg-transparent border-none text-output-muted items-center inline-flex flex-none justify-center cursor-pointer${useASNIColor ? "" : " mythic-action-tone mythic-tone-warning"}`}
                            onClick={toggleANSIColor}
                            type="button">
                            <PaletteIcon fontSize="small" />
                        </button>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={tuiActive ? "Unavailable while a full-screen app is running" : wrapText ?  "Unwrap Text" : "Wrap Text"} >
                        <button
                            aria-pressed={wrapText}
                            disabled={tuiActive}
                            className={`mythic-interactive-terminal-toggle-button bg-transparent border-none text-output-muted items-center inline-flex flex-none justify-center cursor-pointer${wrapText ? "" : " mythic-action-tone mythic-tone-warning"}`}
                            onClick={toggleWrapText}
                            type="button">
                            <WrapTextIcon fontSize="small" />
                        </button>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={autoScroll ?  "Stop Auto Scroll" : "Auto Scroll"} >
                        <button
                            aria-pressed={autoScroll}
                            className={`mythic-interactive-terminal-toggle-button bg-transparent border-none text-output-muted items-center inline-flex flex-none justify-center cursor-pointer${autoScroll ? "" : " mythic-action-tone mythic-tone-warning"}`}
                            onClick={toggleAutoScroll}
                            type="button">
                            <HeightIcon fontSize="small" />
                        </button>
                    </MythicStyledTooltip>
                </div>
            </div>
            {inputMode === "raw" &&
                <div className="mythic-interactive-terminal-raw-warning text-xs font-700 leading-135 rounded mythic-tone-warning bg-tone-1 border border-tone-2">
                    Raw key mode sends every keypress as its own task. Wait for the agent to echo before typing ahead.
                </div>
            }
        </div>
    )
}
const InteractiveScreenRecordingsMenu = ({recordings, onPlay}) => {
    const me = useReactiveVar(meState);
    const [anchorEl, setAnchorEl] = React.useState(null);
    if(recordings.length === 0){
        return null;
    }
    const playRecording = (fileID) => {
        setAnchorEl(null);
        onPlay(fileID);
    };
    return (
        <>
            <MythicStyledTooltip title="Full-screen apps recorded in this session">
                <MythicChip compact label={`${recordings.length} recording${recordings.length === 1 ? "" : "s"}`}
                            onClick={(event) => setAnchorEl(event.currentTarget)} />
            </MythicStyledTooltip>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                {[...recordings].reverse().map((recording) => {
                    const fileID = recording.filemeta?.agent_file_id;
                    return (
                        <MenuItem key={recording.id} disableRipple className="items-center flex gap-4">
                            <span className="flex-fill">
                                {toLocalTime(recording.start_time, me?.user?.view_utc_time)}
                                {" · "}
                                {recording.end_time ? formatInteractiveScreenDuration(recording.start_time, recording.end_time) : "recording…"}
                            </span>
                            <MythicChip compact label="▶ Play" disabled={!fileID} onClick={() => playRecording(fileID)} />
                            <MythicChip compact label="Download" disabled={!fileID}
                                        onClick={(event) => handleAuthLink(event, "/direct/download/" + fileID)} />
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}
const InteractiveScreenRecordingDialog = ({agentFileID, onClose}) => {
    const playerElementRef = React.useRef(null);
    React.useEffect( () => {
        let player = null;
        let cancelled = false;
        Promise.all([
            import('asciinema-player'),
            import('asciinema-player/dist/bundle/asciinema-player.css'),
            mythicFetch("/direct/download/" + agentFileID, {
                headers: {'Authorization': `Bearer ${localStorage.getItem('access_token')}`},
            }).then((response) => {
                if(!response.ok){
                    throw new Error(`status ${response.status}`);
                }
                return response.text();
            }),
        ]).then(([AsciinemaPlayer, , recording]) => {
            if(!cancelled && playerElementRef.current){
                player = AsciinemaPlayer.create({data: recording}, playerElementRef.current, {autoPlay: true, fit: "width"});
            }
        }).catch((error) => {
            snackActions.error("Failed to load recording: " + error.message);
        });
        return () => {
            cancelled = true;
            player?.dispose();
        };
    }, [agentFileID]);
    return (
        <React.Fragment>
            <MythicDraggableDialogTitle>Full-screen app recording</MythicDraggableDialogTitle>
            <DialogContent dividers={true}>
                <div ref={playerElementRef} />
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={onClose}>Close</MythicDialogButton>
            </MythicDialogFooter>
        </React.Fragment>
    );
}
const InteractivePaginationBar = ({totalCount, currentPage, onSubmitPageChange, pageSize, selectAllOutput,
                                      isLive, canJumpToLive, onJumpToLive, tuiActive}) => {
    const onChangePage =  (event, value) => {
        onSubmitPageChange(value);
    };
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
    if(tuiActive || selectAllOutput || (pageCount < 2 && !canJumpToLive)){
        return null;
    }
    return (
        <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center"}} >
            <Pagination count={pageCount} page={isLive ? 0 : currentPage} variant="contained" color="primary"
                        boundaryCount={2} onChange={onChangePage} style={{margin: "10px"}}
                        showFirstButton showLastButton siblingCount={2}
            />
            {canJumpToLive ?
                <MythicChip label="Jump to live" onClick={onJumpToLive} tone="info" /> :
                isLive && <MythicChip compact label="Live" tone="success" />
            }
            <Typography style={{paddingLeft: "10px"}}>Total Responses: {totalCount}</Typography>
        </div>
    )
}
