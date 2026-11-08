import React from "react";
import {Client, Keyboard, Mouse, Parser, Status, StringReader, StringWriter, Tunnel} from "@glokon/guacamole-common-js";
import {openGuacdLiveStream} from "./InteractiveLiveSocket";
import {copyStringToClipboard} from "../../utilities/Clipboard";

const desktopResizeDebounceMilliseconds = 150;
const desktopOneToOneScaleTolerance = 0.02;
const clipboardCopyTimeoutMilliseconds = 5000;
const clipboardPasteFallbackMilliseconds = 500;
const maxClipboardCharacters = 1024 * 1024;
const controlKeysyms = new Set([0xFFE3, 0xFFE4]);
const copyKeysyms = new Set([0x43, 0x63]);
const pasteKeysyms = new Set([0x56, 0x76]);
// Guacd can accept the browser's first size instruction before FreeRDP has
// finished activating the Display Update channel. Retry that initial request
// until the framebuffer confirms it, without requiring the operator to resize
// the browser manually.
const desktopResizeRetryMilliseconds = [500, 1000, 2000, 4000, 8000, 12000];

const createMythicTunnel = (taskID, onWritable, onReady, onClosed) => {
    const tunnel = new Tunnel();
    const parser = new Parser();
    const decoder = new TextDecoder();
    let liveStream = null;

    parser.oninstruction = (opcode, parameters) => tunnel.oninstruction?.(opcode, parameters);
    tunnel.connect = () => {
        tunnel.setState(Tunnel.State.CONNECTING);
        liveStream = openGuacdLiveStream(taskID, {
            onOpened: ({canWrite}) => {
                onWritable(canWrite);
                tunnel.setState(Tunnel.State.OPEN);
            },
            onOutput: (bytes) => {
                onReady();
                parser.receive(decoder.decode(bytes, {stream: true}));
            },
            onInputError: (error) => tunnel.onerror?.(new Status(Status.Code.SERVER_ERROR, error)),
            onClosed: (reason) => {
                tunnel.setState(Tunnel.State.CLOSED);
                onClosed(reason || "Guacamole session closed");
            },
        });
    };
    tunnel.sendMessage = (...elements) => {
        // The Guacamole runtime accepts the complete element array here (its
        // published type definition incorrectly describes this as rest args).
        liveStream?.sendInstruction(Parser.toInstruction(elements));
    };
    tunnel.disconnect = () => {
        liveStream?.close();
        liveStream = null;
        tunnel.setState(Tunnel.State.CLOSED);
    };
    return tunnel;
};
export const GuacdDisplay = ({taskID, expand = false}) => {
    const containerRef = React.useRef(null);
    const [status, setStatus] = React.useState("Connecting...");
    const [viewportFullScreen, setViewportFullScreen] = React.useState(false);
    const [viewportControlsOpen, setViewportControlsOpen] = React.useState(false);
    const [clipboardFallbackText, setClipboardFallbackText] = React.useState(null);

    const toggleViewportFullScreen = React.useCallback(() => {
        setViewportControlsOpen(true);
        setViewportFullScreen((current) => !current);
    }, []);

    React.useEffect(() => {
        const onKeyDown = (event) => {
            if(event.ctrlKey && event.shiftKey && !event.altKey && event.key.toLowerCase() === "f"){
                event.preventDefault();
                event.stopPropagation();
                toggleViewportFullScreen();
            }
        };
        window.addEventListener("keydown", onKeyDown, true);
        return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [toggleViewportFullScreen]);

    React.useEffect(() => {
        if(!viewportFullScreen){
            return;
        }
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        containerRef.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [viewportFullScreen]);

    React.useEffect(() => {
        const container = containerRef.current;
        if(container === null){
            return;
        }
        let writable = false;
        let ready = false;
        let client = null;
        let display = null;
        let resizeTimer = null;
        let resizeRetryTimer = null;
        let lastSentSize = null;
        let requestedSize = null;
        let resizeAttempt = 0;
        let disposed = false;
        let pendingCopyUntil = 0;
        let pendingPaste = null;
        let pasteFallbackTimer = null;
        let lastPasteCompletionAt = 0;
        const suppressedKeyups = new Set();

        const controlIsPressed = (keyboard) => Array.from(controlKeysyms)
            .some((keysym) => keyboard.pressed?.[keysym]);

        const sendClipboardText = (text) => {
            if(!ready || !writable || client === null || typeof text !== "string"){
                return false;
            }
            if(text.length > maxClipboardCharacters){
                setStatus("Clipboard text is too large to transfer");
                return false;
            }
            const writer = new StringWriter(client.createClipboardStream("text/plain"));
            writer.sendText(text);
            writer.sendEnd();
            return true;
        };

        const sendPasteKeystroke = (keysym, controlAlreadyPressed) => {
            if(!writable || client === null){
                return;
            }
            if(!controlAlreadyPressed){
                client.sendKeyEvent(1, 0xFFE3);
            }
            client.sendKeyEvent(1, keysym);
            client.sendKeyEvent(0, keysym);
            if(!controlAlreadyPressed){
                client.sendKeyEvent(0, 0xFFE3);
            }
        };

        const completePaste = (text) => {
            if(pasteFallbackTimer !== null){
                clearTimeout(pasteFallbackTimer);
                pasteFallbackTimer = null;
            }
            const request = pendingPaste;
            pendingPaste = null;
            lastPasteCompletionAt = Date.now();
            if(typeof text === "string"){
                sendClipboardText(text);
            }
            // If this paste was initiated by a physical Control+V, Control is
            // already down in the RDP session. Context-menu/browser-generated
            // paste events need a complete synthetic shortcut instead.
            sendPasteKeystroke(request?.keysym ?? 0x76, request !== null);
        };

        const copyRemoteClipboard = (text) => {
            if(disposed){
                return;
            }
            const clipboard = navigator?.clipboard;
            if(clipboard?.writeText){
                Promise.resolve(clipboard.writeText(text)).then(() => {
                    if(!disposed){
                        setClipboardFallbackText(null);
                    }
                }).catch(() => {
                    if(!disposed){
                        setClipboardFallbackText(text);
                    }
                });
                return;
            }
            setClipboardFallbackText(text);
        };

        const clearDesktopResizeRetry = () => {
            if(resizeRetryTimer !== null){
                clearTimeout(resizeRetryTimer);
                resizeRetryTimer = null;
            }
        };

        const desktopSizeHasApplied = () => {
            if(display === null || requestedSize === null){
                return false;
            }
            return display.getWidth() === requestedSize.width && display.getHeight() === requestedSize.height;
        };

        const sendDesktopSize = (force = false) => {
            resizeTimer = null;
            if(!ready || !writable || client === null || display === null){
                return;
            }
            const width = Math.floor(container.clientWidth);
            const height = Math.floor(container.clientHeight);
            if(width <= 0 || height <= 0){
                return;
            }
            const size = `${width}x${height}`;
            if(requestedSize === null || requestedSize.key !== size){
                requestedSize = {key: size, width, height};
                resizeAttempt = 0;
                clearDesktopResizeRetry();
            }
            if(desktopSizeHasApplied()){
                clearDesktopResizeRetry();
                return;
            }
            if(!force && size === lastSentSize){
                return;
            }
            client.sendSize(width, height);
            lastSentSize = size;
            clearDesktopResizeRetry();
            if(resizeAttempt < desktopResizeRetryMilliseconds.length){
                const retryDelay = desktopResizeRetryMilliseconds[resizeAttempt++];
                resizeRetryTimer = setTimeout(() => {
                    resizeRetryTimer = null;
                    sendDesktopSize(true);
                }, retryDelay);
            }
        };
        const scheduleDesktopResize = () => {
            if(resizeTimer !== null){
                clearTimeout(resizeTimer);
            }
            resizeTimer = setTimeout(sendDesktopSize, desktopResizeDebounceMilliseconds);
        };
        const tunnel = createMythicTunnel(taskID,
            (canWrite) => {
                writable = canWrite;
                setStatus(canWrite ? "Waiting for agent stream..." : "Waiting for agent stream - view only...");
            },
            () => {
                if(!ready){
                    ready = true;
                    setStatus(writable ? "Live" : "Live - view only");
                    scheduleDesktopResize();
                }
            },
            (reason) => setStatus(reason));
        client = new Client(tunnel);
        display = client.getDisplay();
        const displayElement = display.getElement();
        displayElement.style.position = "relative";
        container.appendChild(displayElement);

        const fitDisplay = () => {
            const width = display.getWidth();
            const height = display.getHeight();
            if(width > 0 && height > 0 && container.clientWidth > 0 && container.clientHeight > 0){
                const fittedScale = Math.min(container.clientWidth / width, container.clientHeight / height);
                // RDP servers commonly round Display Update dimensions by a
                // handful of pixels. Scaling that near-match fractionally
                // softens the entire canvas, particularly text. Prefer a
                // crisp 1:1 image and tolerate the negligible border/crop.
                const scale = Math.abs(fittedScale - 1) <= desktopOneToOneScaleTolerance ? 1 : fittedScale;
                display.scale(scale);
            }
        };
        display.onresize = () => {
            fitDisplay();
            if(desktopSizeHasApplied()){
                clearDesktopResizeRetry();
            }
        };
        const resizeObserver = new ResizeObserver(() => {
            fitDisplay();
            scheduleDesktopResize();
        });
        resizeObserver.observe(container);

        const mouse = new Mouse(displayElement);
        mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (state) => {
            if(writable){
                // Mouse reports coordinates in local (scaled) display units.
                // Translate them back into the remote framebuffer's units.
                client.sendMouseState(state, true);
                container.focus();
            }
        };
        const keyboard = new Keyboard(container);
        keyboard.onkeydown = (keysym) => {
            if(!writable){
                return false;
            }
            if(controlIsPressed(keyboard) && pasteKeysyms.has(keysym)){
                // Allow the browser's native paste event, but withhold V from
                // RDP until the local clipboard has been sent through guacd.
                suppressedKeyups.add(keysym);
                pendingPaste = {keysym};
                pasteFallbackTimer = setTimeout(() => completePaste(null), clipboardPasteFallbackMilliseconds);
                try {
                    if(navigator?.clipboard?.readText){
                        Promise.resolve(navigator.clipboard.readText())
                            .then((text) => pendingPaste !== null && completePaste(text))
                            .catch(() => {});
                    }
                } catch {
                    // The native paste event remains available as a fallback.
                }
                return true;
            }
            if(controlIsPressed(keyboard) && copyKeysyms.has(keysym)){
                pendingCopyUntil = Date.now() + clipboardCopyTimeoutMilliseconds;
            }
            client.sendKeyEvent(1, keysym);
            return false;
        };
        keyboard.onkeyup = (keysym) => {
            if(suppressedKeyups.delete(keysym)){
                return false;
            }
            if(writable){
                client.sendKeyEvent(0, keysym);
            }
            return false;
        };
        const onPaste = (event) => {
            if(!writable){
                return;
            }
            const text = event.clipboardData?.getData("text/plain");
            if(typeof text !== "string"){
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            // readText() and the native paste event may both provide the same
            // clipboard contents. Whichever arrives first owns this paste.
            if(pendingPaste === null && Date.now() - lastPasteCompletionAt < clipboardPasteFallbackMilliseconds){
                return;
            }
            completePaste(text);
        };
        container.addEventListener("paste", onPaste, true);
        client.onclipboard = (stream, mimetype) => {
            if(typeof mimetype !== "string" || !mimetype.toLowerCase().startsWith("text/")){
                client.sendAck(stream.index, "Only text clipboard data is supported", Status.Code.UNSUPPORTED);
                return;
            }
            let clipboardText = "";
            let oversized = false;
            const reader = new StringReader(stream);
            reader.ontext = (text) => {
                if(!oversized && clipboardText.length + text.length <= maxClipboardCharacters){
                    clipboardText += text;
                } else {
                    oversized = true;
                }
                client.sendAck(stream.index, oversized ? "Clipboard data is too large" : "OK",
                    oversized ? Status.Code.CLIENT_OVERRUN : Status.Code.SUCCESS);
            };
            reader.onend = () => {
                if(oversized){
                    setStatus("Remote clipboard text is too large to copy");
                    return;
                }
                // Browser clipboard writes are attempted only after the user
                // has explicitly pressed Control+C in the remote session.
                if(Date.now() <= pendingCopyUntil){
                    pendingCopyUntil = 0;
                    copyRemoteClipboard(clipboardText);
                }
            };
        };
        client.onerror = (error) => setStatus(error?.message || "Guacamole session error");
        client.connect();

        return () => {
            disposed = true;
            if(pasteFallbackTimer !== null){
                clearTimeout(pasteFallbackTimer);
            }
            if(resizeTimer !== null){
                clearTimeout(resizeTimer);
            }
            clearDesktopResizeRetry();
            container.removeEventListener("paste", onPaste, true);
            keyboard.reset();
            resizeObserver.disconnect();
            display.onresize = null;
            client.disconnect();
            displayElement.remove();
        };
    }, [taskID]);

    return (
        <div data-testid="guacd-viewport" className="flex flex-column w-full min-h-0" style={{
            background: "#111",
            height: viewportFullScreen ? "100vh" : (expand ? "100%" : "clamp(320px, 52vh, 720px)"),
            inset: viewportFullScreen ? 0 : undefined,
            position: viewportFullScreen ? "fixed" : "relative",
            zIndex: viewportFullScreen ? 1600 : undefined,
        }}>
            {!viewportFullScreen && <div className="text-output-muted text-xs p-2 flex items-center gap-2" aria-live="polite">
                <span className="flex-fill">{status}</span>
                <button type="button" onClick={toggleViewportFullScreen}
                        title="Fill browser viewport (Ctrl+Shift+F)"
                        style={{
                            background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.2)",
                            borderRadius: "3px", color: "inherit", cursor: "pointer", padding: "3px 8px",
                        }}>
                    Full screen
                </button>
            </div>}
            <div ref={containerRef} tabIndex={0} className="flex-fill min-h-0 overflow-hidden outline-none"
                 style={{position: "relative", display: "flex", alignItems: "center", justifyContent: "center"}} />
            {clipboardFallbackText !== null && <button type="button"
                                                        onClick={() => {
                                                            if(copyStringToClipboard(clipboardFallbackText)){
                                                                setClipboardFallbackText(null);
                                                            }
                                                            containerRef.current?.focus();
                                                        }}
                                                        title="Browser clipboard access was blocked; click to copy the remote clipboard"
                                                        style={{
                                                            background: "rgba(20, 20, 20, 0.88)",
                                                            border: "1px solid rgba(255, 255, 255, 0.35)",
                                                            borderRadius: "4px", color: "#fff", cursor: "pointer",
                                                            padding: "6px 10px", position: "absolute", right: "10px",
                                                            top: viewportFullScreen ? "10px" : "42px", zIndex: 5,
                                                        }}>
                Copy remote clipboard
            </button>}
            {viewportFullScreen && <div data-testid="guacd-viewport-controls"
                                        onMouseEnter={() => setViewportControlsOpen(true)}
                                        onMouseLeave={() => setViewportControlsOpen(false)}
                                        onFocusCapture={() => setViewportControlsOpen(true)}
                                        style={{
                                            alignItems: "stretch",
                                            background: "rgba(20, 20, 20, 0.82)",
                                            border: "1px solid rgba(255, 255, 255, 0.22)",
                                            borderLeft: 0,
                                            borderRadius: "0 4px 4px 0",
                                            display: "flex",
                                            left: 0,
                                            position: "absolute",
                                            top: "10px",
                                            transform: viewportControlsOpen ? "translateX(0)" : "translateX(-140px)",
                                            transition: "transform 160ms ease-out",
                                            width: "168px",
                                            zIndex: 4,
                                        }}>
                <button type="button" onClick={toggleViewportFullScreen}
                        title="Exit full screen (Ctrl+Shift+F)"
                        style={{
                            background: "transparent", border: 0, color: "#fff", cursor: "pointer",
                            flex: "0 0 140px", padding: "8px 10px", textAlign: "left",
                        }}>
                    Exit full screen
                </button>
                <span aria-hidden="true" style={{
                    alignItems: "center", color: "#fff", display: "flex", flex: "0 0 28px",
                    justifyContent: "center", pointerEvents: "none",
                }}>{viewportControlsOpen ? "\u2039" : "\u203A"}</span>
            </div>}
        </div>
    );
};
