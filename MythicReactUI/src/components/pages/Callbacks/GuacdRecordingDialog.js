import React from "react";
import DialogContent from "@mui/material/DialogContent";
import {SessionRecording, StaticHTTPTunnel} from "@glokon/guacamole-common-js";
import {MythicChip} from "../../MythicComponents/MythicChip";
import {MythicDraggableDialogTitle} from "../../MythicComponents/MythicDraggableDialogTitle";
import {MythicDialogButton, MythicDialogFooter} from "../../MythicComponents/MythicDialogLayout";
import {snackActions} from "../../utilities/Snackbar";

const formatRecordingTime = (milliseconds) => {
    const totalSeconds = Math.max(0, Math.floor((milliseconds || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds % 3600 / 60);
    const seconds = totalSeconds % 60;
    return hours > 0 ?
        `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` :
        `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatRecordingDateTime = (startedAt, offset, utc) => {
    const date = new Date(startedAt);
    if(!startedAt || Number.isNaN(date.getTime())){
        return "";
    }
    date.setTime(date.getTime() + (offset || 0));
    const read = (local, universal) => utc ? universal.call(date) : local.call(date);
    const year = read(Date.prototype.getFullYear, Date.prototype.getUTCFullYear);
    const month = String(read(Date.prototype.getMonth, Date.prototype.getUTCMonth) + 1).padStart(2, "0");
    const day = String(read(Date.prototype.getDate, Date.prototype.getUTCDate)).padStart(2, "0");
    const hours = String(read(Date.prototype.getHours, Date.prototype.getUTCHours)).padStart(2, "0");
    const minutes = String(read(Date.prototype.getMinutes, Date.prototype.getUTCMinutes)).padStart(2, "0");
    const seconds = String(read(Date.prototype.getSeconds, Date.prototype.getUTCSeconds)).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${utc ? " UTC" : ""}`;
};

export const GuacdRecordingDialog = ({agentFileID, recordingTimestamp, viewUTC = false, onClose}) => {
    const displayContainerRef = React.useRef(null);
    const recordingRef = React.useRef(null);
    const [loaded, setLoaded] = React.useState(false);
    const [playing, setPlaying] = React.useState(false);
    const [duration, setDuration] = React.useState(0);
    const [position, setPosition] = React.useState(0);
    const [status, setStatus] = React.useState("Loading recording...");

    React.useEffect(() => {
        const container = displayContainerRef.current;
        if(container === null){
            return;
        }
        let cancelled = false;
        let displayElement = null;
        let resizeObserver = null;
        let recording = null;
        try{
            const token = localStorage.getItem("access_token");
            const headers = token ? {Authorization: `Bearer ${token}`} : {};
            const tunnel = new StaticHTTPTunnel(
                "/direct/download/" + encodeURIComponent(agentFileID), false, headers);
            recording = new SessionRecording(tunnel, 100);
            recordingRef.current = recording;
            const display = recording.getDisplay();
            displayElement = display.getElement();
            displayElement.style.position = "relative";
            container.appendChild(displayElement);
            const fitDisplay = () => {
                const width = display.getWidth();
                const height = display.getHeight();
                if(width > 0 && height > 0 && container.clientWidth > 0 && container.clientHeight > 0){
                    display.scale(Math.min(container.clientWidth / width, container.clientHeight / height));
                }
            };
            display.onresize = fitDisplay;
            resizeObserver = new ResizeObserver(fitDisplay);
            resizeObserver.observe(container);
            recording.onprogress = (nextDuration) => {
                if(!cancelled){
                    setDuration(nextDuration);
                }
            };
            recording.onseek = (nextPosition) => {
                if(!cancelled){
                    setPosition(nextPosition);
                }
            };
            recording.onplay = () => !cancelled && setPlaying(true);
            recording.onpause = () => !cancelled && setPlaying(false);
            recording.onerror = (message) => {
                if(!cancelled){
                    const reason = typeof message === "string" ? message : message?.message || "unknown error";
                    setStatus("Unable to play recording");
                    snackActions.error("Failed to load desktop recording: " + reason);
                }
            };
            recording.onload = () => {
                if(cancelled){
                    return;
                }
                setLoaded(true);
                setDuration(recording.getDuration());
                setStatus("");
                fitDisplay();
                recording.play();
            };
            recording.connect();
        }catch(error){
            setStatus("Unable to play recording");
            snackActions.error("Failed to load desktop recording: " + error.message);
        }
        return () => {
            cancelled = true;
            resizeObserver?.disconnect();
            if(recording !== null){
                recording.abort();
            }
            if(recordingRef.current === recording){
                recordingRef.current = null;
            }
            displayElement?.remove();
        };
    }, [agentFileID]);

    const togglePlayback = () => {
        const recording = recordingRef.current;
        if(recording === null || !loaded){
            return;
        }
        if(recording.isPlaying()){
            recording.pause();
        } else {
            if(position >= duration && duration > 0){
                recording.seek(0, () => recording.play());
            } else {
                recording.play();
            }
        }
    };
    const seek = (event) => {
        const nextPosition = Number(event.target.value);
        setPosition(nextPosition);
        recordingRef.current?.seek(nextPosition);
    };

    return (
        <React.Fragment>
            <MythicDraggableDialogTitle>Desktop session recording</MythicDraggableDialogTitle>
            <DialogContent dividers={true} style={{display: "flex", flexDirection: "column", minHeight: 0, padding: 0}}>
                <div data-testid="guacd-recording-display" style={{
                    alignItems: "center",
                    background: "#111",
                    display: "flex",
                    flex: "1 1 auto",
                    justifyContent: "center",
                    minHeight: 0,
                    overflow: "hidden",
                    position: "relative",
                }}>
                    <div ref={displayContainerRef} style={{
                        alignItems: "center", display: "flex", inset: 0, justifyContent: "center",
                        overflow: "hidden", position: "absolute",
                    }}/>
                    {status && <span style={{color: "#ddd", position: "relative", zIndex: 2}}>{status}</span>}
                    {recordingTimestamp && <span data-testid="guacd-recording-timestamp" style={{
                        background: "rgba(0, 0, 0, 0.55)",
                        borderRadius: "3px",
                        color: "#fff",
                        fontFamily: "monospace",
                        fontSize: "14px",
                        fontVariantNumeric: "tabular-nums",
                        padding: "4px 7px",
                        pointerEvents: "none",
                        position: "absolute",
                        right: "12px",
                        textShadow: "0 1px 2px #000",
                        top: "12px",
                        zIndex: 3,
                    }}>
                        {formatRecordingDateTime(recordingTimestamp, position, viewUTC)}
                    </span>}
                </div>
                <div style={{alignItems: "center", display: "flex", flex: "0 0 auto", gap: "12px", padding: "10px 12px"}}>
                    <MythicChip compact label={playing ? "Pause" : "Play"} disabled={!loaded} onClick={togglePlayback}/>
                    <span style={{fontVariantNumeric: "tabular-nums", minWidth: "84px"}}>
                        {formatRecordingTime(position)} / {formatRecordingTime(duration)}
                    </span>
                    <input aria-label="Recording position" type="range" min={0} max={Math.max(duration, 1)}
                           value={Math.min(position, Math.max(duration, 1))} disabled={!loaded}
                           onChange={seek} style={{flex: "1 1 auto"}}/>
                </div>
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={onClose}>Close</MythicDialogButton>
            </MythicDialogFooter>
        </React.Fragment>
    );
};
