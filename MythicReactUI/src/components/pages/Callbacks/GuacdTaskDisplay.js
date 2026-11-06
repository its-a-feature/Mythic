import React from "react";
import {gql, useReactiveVar, useSubscription} from "@apollo/client";
import {Typography} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {meState} from "../../../cache";
import {MythicChip} from "../../MythicComponents/MythicChip";
import {MythicDialog} from "../../MythicComponents/MythicDialogBase";
import {handleAuthLink} from "../../utilities/FileDownloadWithAuth";
import {GuacdDisplay} from "./GuacdDisplay";
import {GuacdRecordingDialog} from "./GuacdRecordingDialog";

const subGuacdTaskRecordingQuery = gql`
subscription subGuacdTaskRecording($task_id: Int!) {
  filemeta(limit: 1, order_by: {id: desc}, where: {
    task_id: {_eq: $task_id},
    deleted: {_eq: false},
    filename_utf8: {_ilike: "%.guac"},
    comment: {_ilike: "Guacamole % recording from task %"}
  }) {
    agent_file_id
    complete
    filename_utf8
    timestamp
  }
}`;

const DEFAULT_OUTPUT_HEIGHT = 120;
const MIN_OUTPUT_HEIGHT = 96;
const MIN_DISPLAY_HEIGHT = 240;
const SPLIT_HANDLE_HEIGHT = 8;
const KEYBOARD_RESIZE_STEP = 16;

export const getGuacdRecordingStartedAt = (filename, fallbackTimestamp) => {
    const match = filename?.match(/_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.guac$/i);
    if(match === null || match === undefined){
        return fallbackTimestamp;
    }
    const [, year, month, day, hours, minutes, seconds] = match;
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
};

export const GuacdTaskDisplay = ({task, expand, responseCount, children}) => {
    const theme = useTheme();
    const me = useReactiveVar(meState);
    const splitRef = React.useRef(null);
    const resizeCleanupRef = React.useRef(null);
    const [outputHeight, setOutputHeight] = React.useState(DEFAULT_OUTPUT_HEIGHT);
    const [playingRecordingFileID, setPlayingRecordingFileID] = React.useState(null);
    const {data: recordingData} = useSubscription(subGuacdTaskRecordingQuery, {
        variables: {task_id: task.id},
    });
    const recording = recordingData?.filemeta?.[0] || null;

    const getOutputMaxHeight = React.useCallback(() => {
        const splitHeight = splitRef.current?.getBoundingClientRect().height || 0;
        if(splitHeight <= 0){
            return DEFAULT_OUTPUT_HEIGHT * 4;
        }
        return Math.max(MIN_OUTPUT_HEIGHT,
            Math.floor(splitHeight - MIN_DISPLAY_HEIGHT - SPLIT_HANDLE_HEIGHT));
    }, []);
    const clampOutputHeight = React.useCallback((height) => {
        return Math.min(getOutputMaxHeight(), Math.max(MIN_OUTPUT_HEIGHT, Math.round(height)));
    }, [getOutputMaxHeight]);
    const startOutputResize = React.useCallback((event) => {
        if(event.button !== undefined && event.button !== 0){
            return;
        }
        event.preventDefault();
        resizeCleanupRef.current?.();
        const startY = event.clientY;
        const startHeight = outputHeight;
        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;
        const onPointerMove = (moveEvent) => {
            setOutputHeight(clampOutputHeight(startHeight + startY - moveEvent.clientY));
        };
        const stopResize = () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", stopResize);
            window.removeEventListener("pointercancel", stopResize);
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            if(resizeCleanupRef.current === stopResize){
                resizeCleanupRef.current = null;
            }
        };
        resizeCleanupRef.current = stopResize;
        document.body.style.cursor = "row-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", stopResize);
        window.addEventListener("pointercancel", stopResize);
    }, [clampOutputHeight, outputHeight]);
    const resizeOutputWithKeyboard = React.useCallback((event) => {
        let nextHeight;
        switch(event.key){
            case "ArrowUp":
                nextHeight = outputHeight + KEYBOARD_RESIZE_STEP;
                break;
            case "ArrowDown":
                nextHeight = outputHeight - KEYBOARD_RESIZE_STEP;
                break;
            case "Home":
                nextHeight = MIN_OUTPUT_HEIGHT;
                break;
            case "End":
                nextHeight = getOutputMaxHeight();
                break;
            default:
                return;
        }
        event.preventDefault();
        setOutputHeight(clampOutputHeight(nextHeight));
    }, [clampOutputHeight, getOutputMaxHeight, outputHeight]);
    React.useEffect(() => () => resizeCleanupRef.current?.(), []);

    return (
        <div data-testid="guacd-task-split" ref={splitRef} style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: expand ? "100%" : "clamp(480px, 70vh, 820px)",
            minHeight: expand ? 0 : "480px",
            overflow: "hidden",
            backgroundColor: theme.outputBackgroundColor,
            color: theme.outputTextColor,
        }}>
            {playingRecordingFileID !== null &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={true} resizable={true}
                              onClose={() => setPlayingRecordingFileID(null)}
                              innerDialog={<GuacdRecordingDialog agentFileID={playingRecordingFileID}
                                                                 recordingTimestamp={getGuacdRecordingStartedAt(
                                                                     recording?.filename_utf8,
                                                                     recording?.timestamp)}
                                                                 viewUTC={me?.user?.view_utc_time}
                                                                 onClose={() => setPlayingRecordingFileID(null)}/>}/>
            }
            <div style={{flex: "1 1 0", minHeight: expand ? "220px" : "280px", overflow: "hidden"}}>
                <GuacdDisplay taskID={task.id} expand={true}/>
            </div>
            <div data-testid="guacd-output-resize-handle"
                 role="separator"
                 aria-label="Resize task output height"
                 aria-orientation="horizontal"
                 aria-valuemin={MIN_OUTPUT_HEIGHT}
                 aria-valuemax={getOutputMaxHeight()}
                 aria-valuenow={outputHeight}
                 tabIndex={0}
                 title="Drag to resize task output; double-click to reset"
                 onPointerDown={startOutputResize}
                 onKeyDown={resizeOutputWithKeyboard}
                 onDoubleClick={() => setOutputHeight(clampOutputHeight(DEFAULT_OUTPUT_HEIGHT))}
                 style={{
                     alignItems: "center",
                     cursor: "row-resize",
                     display: "flex",
                     flex: `0 0 ${SPLIT_HANDLE_HEIGHT}px`,
                     justifyContent: "center",
                     touchAction: "none",
                     borderTop: `1px solid ${theme.palette.divider}`,
                     borderBottom: `1px solid ${theme.palette.divider}`,
                     backgroundColor: theme.outputBackgroundColor,
                 }}>
                <div aria-hidden="true" style={{
                    width: "44px",
                    height: "2px",
                    borderRadius: "2px",
                    backgroundColor: theme.palette.divider,
                }}/>
            </div>
            <div style={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 0,
                flexShrink: 1,
                flexBasis: `${outputHeight}px`,
                minHeight: `${MIN_OUTPUT_HEIGHT}px`,
                overflow: "hidden",
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 8px",
                    backgroundColor: theme.outputBackgroundColor + (theme.palette.mode === "dark" ? "E8" : "F4"),
                }}>
                    <Typography variant="caption" style={{fontWeight: 600}}>Task output</Typography>
                    <Typography variant="caption" color="textSecondary">
                        {responseCount} {responseCount === 1 ? "response" : "responses"}
                    </Typography>
                    {recording &&
                        <div style={{alignItems: "center", display: "flex", gap: "6px"}}>
                            <MythicChip compact
                                        label={recording.complete ? "Play recording" : "Play recording so far"}
                                        onClick={() => setPlayingRecordingFileID(recording.agent_file_id)}/>
                            <MythicChip compact label="Download recording"
                                        onClick={(event) => handleAuthLink(event,
                                            "/direct/download/" + recording.agent_file_id)}/>
                        </div>
                    }
                </div>
                {children}
            </div>
        </div>
    );
};
