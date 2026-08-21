let browserScript;
let browserScriptSource;
let activeRequestID;

const serializeError = (error) => ({
    name: (error && error.name) || "Error",
    message: (error && error.message) || String(error),
    stack: error && error.stack,
});

const postLog = (...args) => {
    try {
        self.postMessage({type: "log", requestID: activeRequestID, args});
    } catch (error) {
        self.postMessage({
            type: "log",
            requestID: activeRequestID,
            args: args.map((arg) => String(arg)),
        });
    }
};

console.log = postLog;

self.onmessage = ({data}) => {
    if(!data || data.type !== "render"){
        return;
    }

    const {requestID, script, task, responses} = data;
    activeRequestID = requestID;
    let phase = "compile";

    try {
        if(typeof script === "string" && script !== browserScriptSource){
            browserScript = undefined;
            browserScriptSource = undefined;
            browserScript = Function(`"use strict";return(${script})`)();
            if(typeof browserScript !== "function"){
                throw new TypeError("Browser script must evaluate to a function");
            }
            browserScriptSource = script;
        }
        if(typeof browserScript !== "function"){
            throw new Error("No browser script is loaded");
        }

        phase = "execute";
        const result = browserScript(task, responses);
        if(result && typeof result.then === "function"){
            throw new TypeError("Browser scripts must return their display data synchronously");
        }

        phase = "serialize";
        self.postMessage({type: "result", requestID, result});
    } catch (error) {
        self.postMessage({type: "error", requestID, phase, error: serializeError(error)});
    } finally {
        activeRequestID = undefined;
    }
};
