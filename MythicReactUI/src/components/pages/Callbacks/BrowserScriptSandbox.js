// The frame owns only a worker and a private message port. It never evaluates
// service code in its window. The opaque origin denies application storage;
// the blob worker inherits this CSP, which denies all network destinations.
export const sandboxDocument = `<!doctype html>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; worker-src blob:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<script>
addEventListener('message', function initialize(event) {
    if (event.source !== parent || !event.ports[0]) return;
    removeEventListener('message', initialize);
    const port = event.ports[0];
    try {
        const url = URL.createObjectURL(new Blob([event.data], {type: 'text/javascript'}));
        const worker = new Worker(url);
        URL.revokeObjectURL(url);
        worker.onmessage = event => port.postMessage(event.data);
        worker.onerror = event => {
            event.preventDefault();
            port.postMessage({type: 'sandbox-error', message: event.message});
        };
        port.onmessage = event => worker.postMessage(event.data);
        port.start();
    } catch (error) {
        port.postMessage({type: 'sandbox-error', message: error.message});
    }
});
</script>`;

let workerSource;
const loadWorkerSource = () => {
    if (!workerSource) {
        workerSource = fetch("/new/browser-script-worker.js").then(response => {
            if (!response.ok) throw new Error("Failed to load browser script worker");
            return response.text();
        }).catch(error => {
            workerSource = undefined;
            throw error;
        });
    }
    return workerSource;
};

// Worker-compatible adapter preserves the runner's queue, cancellation and
// timeout behavior. Removing the frame also terminates its worker.
export const createSandboxedWorker = () => {
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.hidden = true;
    frame.title = "Browser script sandbox";
    const channel = new MessageChannel();
    let disposed = false;
    const adapter = {
        onmessage: null,
        onerror: null,
        postMessage: message => channel.port1.postMessage(message),
        terminate: () => {
            disposed = true;
            frame.remove();
            channel.port1.close();
            channel.port2.close();
        },
    };
    channel.port1.onmessage = event => {
        if (disposed) return;
        if (event.data?.type === "sandbox-error") {
            adapter.onerror?.({message: event.data.message});
        } else {
            adapter.onmessage?.(event);
        }
    };
    const loaded = new Promise(resolve => { frame.onload = resolve; });
    frame.srcdoc = sandboxDocument;
    document.body.appendChild(frame);
    Promise.all([loaded, loadWorkerSource()]).then(([, source]) => {
        if (!disposed) frame.contentWindow.postMessage(source, "*", [channel.port2]);
    }).catch(error => {
        if (!disposed) adapter.onerror?.(error);
    });
    return adapter;
};
