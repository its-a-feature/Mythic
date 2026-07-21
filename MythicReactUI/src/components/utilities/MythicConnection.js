import {makeVar} from '@apollo/client';

const initialConnectionState = {
    httpError: false,
    websocketError: false,
};

export const mythicConnectionState = makeVar(initialConnectionState);
export const websocketConnectionGeneration = makeVar(0);
export const currentOperationSyncGeneration = makeVar(0);

const connectionKey = (source) => source === "websocket" ? "websocketError" : "httpError";

const setConnectionError = (source, hasError) => {
    const key = connectionKey(source);
    const currentState = mythicConnectionState();
    if(currentState[key] === hasError){
        return;
    }
    mythicConnectionState({...currentState, [key]: hasError});
};

export const reportMythicConnectionError = (source = "http") => setConnectionError(source, true);

export const reportMythicConnectionSuccess = (source = "http") => setConnectionError(source, false);

export const reportMythicWebsocketConnected = () => {
    reportMythicConnectionSuccess("websocket");
    websocketConnectionGeneration(websocketConnectionGeneration() + 1);
};

export const requestCurrentOperationSync = () => {
    currentOperationSyncGeneration(currentOperationSyncGeneration() + 1);
};

export const reconnectGraphQLWebsocket = (client) => {
    client.terminate();
};

export const hasMythicConnectionError = (state = mythicConnectionState()) =>
    state.httpError || state.websocketError;

export const isSameOriginMythicRequest = (input, currentLocation = window.location) => {
    const requestUrl = typeof input === "string" || input instanceof URL ? input.toString() : input?.url;
    if(!requestUrl || !currentLocation?.href || !currentLocation?.origin){
        return false;
    }
    try{
        return new URL(requestUrl, currentLocation.href).origin === currentLocation.origin;
    }catch(error){
        return false;
    }
};

export const mythicFetch = async (input, init) => {
    const trackConnection = isSameOriginMythicRequest(input);
    try{
        const response = await fetch(input, init);
        if(trackConnection){
            reportMythicConnectionSuccess("http");
        }
        return response;
    }catch(error){
        if(trackConnection && error?.name !== "AbortError"){
            reportMythicConnectionError("http");
        }
        throw error;
    }
};
