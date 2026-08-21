const DEFAULT_TIMEOUT_MS = 10000;

const createWorker = () => {
    const publicURL = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
    return new Worker(`${publicURL}/browser-script-worker.js`);
};

const toError = (errorData, phase) => {
    const error = new Error(errorData?.message || "Browser script failed");
    error.name = errorData?.name || "Error";
    error.stack = errorData?.stack || error.stack;
    error.phase = phase;
    return error;
};

export class BrowserScriptRunner {
    constructor({workerFactory=createWorker, timeoutMS=DEFAULT_TIMEOUT_MS} = {}) {
        this.workerFactory = workerFactory;
        this.timeoutMS = timeoutMS;
        this.nextRequestID = 1;
        this.latestRequestID = 0;
        this.activeRequest = undefined;
        this.queuedRequest = undefined;
        this.workerScript = undefined;
        this.disposed = false;
    }

    startWorker = () => {
        this.worker = this.workerFactory();
        this.worker.onmessage = this.handleMessage;
        this.worker.onerror = this.handleWorkerError;
    };

    restartWorker = () => {
        if(this.worker){
            this.worker.onmessage = null;
            this.worker.onerror = null;
            this.worker.terminate();
            this.worker = undefined;
        }
        this.workerScript = undefined;
    };

    run = ({script, task, responses, onResult, onError}) => {
        if(this.disposed){
            return undefined;
        }

        const request = {
            id: this.nextRequestID++,
            script,
            task,
            responses,
            onResult,
            onError,
        };
        this.latestRequestID = request.id;
        this.queuedRequest = request;
        if(!this.activeRequest){
            this.runQueuedRequest();
        }
        return request.id;
    };

    cancel = (requestID) => {
        if(this.queuedRequest?.id === requestID){
            this.queuedRequest = undefined;
        }
        if(this.activeRequest?.id === requestID){
            this.activeRequest.cancelled = true;
        }
        if(this.latestRequestID === requestID){
            this.latestRequestID = 0;
        }
    };

    runQueuedRequest = () => {
        if(this.disposed || this.activeRequest || !this.queuedRequest){
            return;
        }

        const request = this.queuedRequest;
        this.queuedRequest = undefined;
        this.activeRequest = request;
        const message = {
            type: "render",
            requestID: request.id,
            task: request.task,
            responses: request.responses,
        };
        if(request.script !== this.workerScript){
            message.script = request.script;
            this.workerScript = request.script;
        }

        request.timeout = setTimeout(() => {
            this.finishActiveRequest({
                error: new Error(`Browser script exceeded the ${this.timeoutMS}ms time limit`),
                restartWorker: true,
            });
        }, this.timeoutMS);

        try {
            if(!this.worker){
                this.startWorker();
            }
            this.worker.postMessage(message);
        } catch (error) {
            this.finishActiveRequest({error, restartWorker: true});
        }
    };

    handleMessage = ({data}) => {
        const request = this.activeRequest;
        if(!request || data?.requestID !== request.id){
            return;
        }
        if(data.type === "log"){
            if(!request.cancelled && request.id === this.latestRequestID && !this.queuedRequest){
                console.log(...(Array.isArray(data.args) ? data.args : [data.args]));
            }
            return;
        }
        if(data.type === "error"){
            if(data.phase === "compile"){
                this.workerScript = undefined;
            }
            this.finishActiveRequest({error: toError(data.error, data.phase)});
            return;
        }
        if(data.type === "result"){
            this.finishActiveRequest({result: data.result});
        }
    };

    handleWorkerError = (event) => {
        event?.preventDefault?.();
        if(!this.activeRequest){
            this.restartWorker();
            return;
        }
        this.finishActiveRequest({
            error: new Error(event?.message || "Browser script worker failed"),
            restartWorker: true,
        });
    };

    finishActiveRequest = ({result, error, restartWorker=false}) => {
        const request = this.activeRequest;
        if(!request){
            return;
        }

        clearTimeout(request.timeout);
        this.activeRequest = undefined;
        const isCurrent = !request.cancelled && request.id === this.latestRequestID && !this.queuedRequest;

        if(restartWorker){
            this.restartWorker();
        }
        if(isCurrent){
            if(error){
                request.onError?.(error);
            }else{
                request.onResult?.(result);
            }
        }
        this.runQueuedRequest();
    };

    dispose = () => {
        this.disposed = true;
        if(this.activeRequest){
            clearTimeout(this.activeRequest.timeout);
        }
        this.activeRequest = undefined;
        this.queuedRequest = undefined;
        this.restartWorker();
    };
}
