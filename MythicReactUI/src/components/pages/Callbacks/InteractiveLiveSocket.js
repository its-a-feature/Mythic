// One websocket per tab carries a stream for each interactive task on screen, so output shows up as soon as
// mythic_server has it instead of when GraphQL next polls for it. Control messages are JSON; output is binary:
// a 4 byte big-endian stream id, a 1 byte interactive message type, then the data.
const LIVE_PROTOCOL = "mythic.live.v1";
// browsers can't set headers on a websocket, so the token goes as a second subprotocol
const LIVE_TOKEN_PROTOCOL_PREFIX = "bearer.";
// keep the socket a little while after its last stream closes, in case another opens
const IDLE_CLOSE_DELAY_MS = 5000;

let socket = null;
let nextChannel = 1;
let idleTimer = null;
const streams = new Map();

const getLiveSocketAddress = () => {
    return (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host + "/direct/live";
}
const sendLiveMessage = (message) => {
    if(socket === null || socket.readyState !== WebSocket.OPEN){
        return false;
    }
    socket.send(JSON.stringify(message));
    return true;
}
const sendOpen = (channel, stream) => {
    sendLiveMessage({type: "open", channel, kind: "pty", task_id: stream.taskID});
}
const closeStream = (channel, reason) => {
    const stream = streams.get(channel);
    if(stream === undefined){
        return;
    }
    streams.delete(channel);
    stream.onClosed?.(reason);
}
const handleLiveMessage = (event) => {
    if(event.data instanceof ArrayBuffer){
        if(event.data.byteLength < 5){
            return;
        }
        const view = new DataView(event.data);
        const stream = streams.get(view.getUint32(0));
        stream?.onOutput?.(view.getUint8(4), new Uint8Array(event.data, 5));
        return;
    }
    let message;
    try{
        message = JSON.parse(event.data);
    }catch(error){
        return;
    }
    const stream = streams.get(message.channel);
    if(stream === undefined){
        return;
    }
    switch(message.type){
        case "opened":
            stream.canWrite = message.can_write === true;
            stream.onOpened?.({
                responseID: message.response_id || 0,
                canWrite: stream.canWrite,
                size: message.cols > 0 && message.rows > 0 ? {cols: message.cols, rows: message.rows} : null,
            });
            break;
        case "size":
            stream.onSize?.({cols: message.cols, rows: message.rows});
            break;
        case "saved":
            stream.onSaved?.(message.response_id || 0);
            break;
        case "input_error":
            stream.onInputError?.(message.error);
            break;
        case "closed":
            closeStream(message.channel, message.reason);
            break;
        default:
            break;
    }
}
const connect = () => {
    const token = localStorage.getItem("access_token");
    if(!token){
        return false;
    }
    const newSocket = new WebSocket(getLiveSocketAddress(), [LIVE_PROTOCOL, LIVE_TOKEN_PROTOCOL_PREFIX + token]);
    newSocket.binaryType = "arraybuffer";
    newSocket.onopen = () => {
        streams.forEach((stream, channel) => sendOpen(channel, stream));
    };
    newSocket.onmessage = handleLiveMessage;
    newSocket.onclose = () => {
        if(socket !== newSocket){
            return;
        }
        socket = null;
        Array.from(streams.keys()).forEach((channel) => closeStream(channel, "disconnected"));
    };
    socket = newSocket;
    return true;
}
const closeWhenIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if(streams.size === 0 && socket !== null){
            const idleSocket = socket;
            socket = null;
            idleSocket.close();
        }
    }, IDLE_CLOSE_DELAY_MS);
}

// openInteractiveLiveStream watches a task's output. Handlers: onOpened({responseID, canWrite, size}) once output
// from after response responseID will follow, onOutput(messageType, bytes), onSaved(responseID) once the output so
// far is saved as that response (0 if it couldn't be saved), onSize({cols, rows}) when the terminal's size changes
// because of what everyone watching can show, onInputError(error), and onClosed(reason) when the stream ends for
// any reason other than calling close().
export const openInteractiveLiveStream = (taskID, handlers) => {
    const channel = nextChannel++;
    const stream = {taskID, canWrite: false, ...handlers};
    streams.set(channel, stream);
    clearTimeout(idleTimer);
    if(socket === null){
        if(!connect()){
            streams.delete(channel);
            setTimeout(() => stream.onClosed?.("not logged in"), 0);
        }
    } else if(socket.readyState === WebSocket.OPEN){
        sendOpen(channel, stream);
    }
    return {
        // false if the input couldn't be sent this way
        sendInput: ({params, originalParams, interactiveTaskType}) => {
            if(!streams.has(channel) || !stream.canWrite){
                return false;
            }
            return sendLiveMessage({
                type: "input",
                channel,
                params,
                original_params: originalParams,
                interactive_task_type: interactiveTaskType,
            });
        },
        // hand back the window for output that's been written to the terminal
        credit: (bytes) => {
            if(streams.has(channel) && bytes > 0){
                sendLiveMessage({type: "credit", channel, bytes});
            }
        },
        close: () => {
            if(streams.delete(channel)){
                sendLiveMessage({type: "close", channel});
                closeWhenIdle();
            }
        },
    };
}
