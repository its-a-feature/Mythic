import fs from "fs";
import path from "path";
import vm from "vm";

const workerSource = fs.readFileSync(
    path.resolve(__dirname, "../../../../public/browser-script-worker.js"),
    "utf8",
);

const createWorkerContext = () => {
    const messages = [];
    const context = {
        console: {log: jest.fn()},
        self: {
            postMessage: (message) => messages.push(message),
        },
    };
    vm.runInNewContext(workerSource, context);
    return {messages, worker: context.self};
};

test("browser scripts run without page globals or local storage", () => {
    const {messages, worker} = createWorkerContext();
    worker.onmessage({
        data: {
            type: "render",
            requestID: 1,
            script: `function() {
                return {
                    plaintext: [typeof window, typeof document, typeof localStorage].join(","),
                };
            }`,
            task: {id: 1},
            responses: [],
        },
    });

    expect(messages).toEqual([{
        type: "result",
        requestID: 1,
        result: {plaintext: "undefined,undefined,undefined"},
    }]);
});

test("the worker reuses its loaded function for later responses", () => {
    const {messages, worker} = createWorkerContext();
    worker.onmessage({
        data: {
            type: "render",
            requestID: 1,
            script: "function(task, responses) { return {plaintext: task.id + responses.join('')}; }",
            task: {id: 7},
            responses: ["first"],
        },
    });
    worker.onmessage({
        data: {
            type: "render",
            requestID: 2,
            task: {id: 8},
            responses: ["second"],
        },
    });

    expect(messages[1]).toEqual({
        type: "result",
        requestID: 2,
        result: {plaintext: "8second"},
    });
});
