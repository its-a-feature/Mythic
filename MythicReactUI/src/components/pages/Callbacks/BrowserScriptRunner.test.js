import {BrowserScriptRunner} from "./BrowserScriptRunner";

class MockWorker {
    constructor() {
        this.messages = [];
        this.terminated = false;
    }

    postMessage = (message) => {
        this.messages.push(message);
    };

    terminate = () => {
        this.terminated = true;
    };

    respond = (data) => {
        this.onmessage?.({data});
    };
}

const createRunner = (options = {}) => {
    const workers = [];
    const workerFactory = jest.fn(() => {
        const worker = new MockWorker();
        workers.push(worker);
        return worker;
    });
    return {
        runner: new BrowserScriptRunner({workerFactory, ...options}),
        workerFactory,
        workers,
    };
};

const makeRequest = (overrides = {}) => ({
    script: "function(task, responses) { return {plaintext: responses.join('')}; }",
    task: {id: 1},
    responses: ["one"],
    onResult: jest.fn(),
    onError: jest.fn(),
    ...overrides,
});

describe("BrowserScriptRunner", () => {
    test("creates its worker lazily and reuses the compiled script", () => {
        const {runner, workerFactory, workers} = createRunner();
        expect(workerFactory).not.toHaveBeenCalled();

        const first = makeRequest();
        const firstID = runner.run(first);
        expect(workerFactory).toHaveBeenCalledTimes(1);
        expect(workers[0].messages[0]).toMatchObject({
            type: "render",
            requestID: firstID,
            script: first.script,
        });
        workers[0].respond({type: "result", requestID: firstID, result: {plaintext: "one"}});

        const second = makeRequest({responses: ["two"]});
        const secondID = runner.run(second);
        expect(workerFactory).toHaveBeenCalledTimes(1);
        expect(workers[0].messages[1]).toEqual({
            type: "render",
            requestID: secondID,
            task: second.task,
            responses: second.responses,
        });
        workers[0].respond({type: "result", requestID: secondID, result: {plaintext: "two"}});

        expect(first.onResult).toHaveBeenCalledWith({plaintext: "one"});
        expect(second.onResult).toHaveBeenCalledWith({plaintext: "two"});
        runner.dispose();
    });

    test("coalesces updates while a render is running", () => {
        const {runner, workers} = createRunner();
        const first = makeRequest({responses: ["one"]});
        const second = makeRequest({responses: ["two"]});
        const latest = makeRequest({responses: ["three"]});
        const firstID = runner.run(first);
        runner.run(second);
        const latestID = runner.run(latest);

        expect(workers[0].messages).toHaveLength(1);
        workers[0].respond({type: "result", requestID: firstID, result: {plaintext: "one"}});

        expect(first.onResult).not.toHaveBeenCalled();
        expect(second.onResult).not.toHaveBeenCalled();
        expect(workers[0].messages).toHaveLength(2);
        expect(workers[0].messages[1]).toMatchObject({
            requestID: latestID,
            responses: ["three"],
        });

        workers[0].respond({type: "result", requestID: latestID, result: {plaintext: "three"}});
        expect(latest.onResult).toHaveBeenCalledWith({plaintext: "three"});
        runner.dispose();
    });

    test("restarts a timed-out worker and reports the current failure", () => {
        jest.useFakeTimers();
        const {runner, workers} = createRunner({timeoutMS: 25});
        const request = makeRequest();
        runner.run(request);

        jest.advanceTimersByTime(25);

        expect(workers[0].terminated).toBe(true);
        expect(request.onError).toHaveBeenCalledWith(expect.objectContaining({
            message: "Browser script exceeded the 25ms time limit",
        }));

        const next = makeRequest({responses: ["after timeout"]});
        runner.run(next);
        expect(workers).toHaveLength(2);
        expect(workers[1].messages[0].script).toBe(next.script);
        runner.dispose();
        jest.useRealTimers();
    });

    test("returns worker errors and reloads scripts after compile failures", () => {
        const {runner, workers} = createRunner();
        const request = makeRequest();
        const requestID = runner.run(request);
        workers[0].respond({
            type: "error",
            requestID,
            phase: "compile",
            error: {name: "SyntaxError", message: "Unexpected token"},
        });

        expect(request.onError).toHaveBeenCalledWith(expect.objectContaining({
            name: "SyntaxError",
            message: "Unexpected token",
            phase: "compile",
        }));

        const retry = makeRequest();
        runner.run(retry);
        expect(workers[0].messages[1].script).toBe(retry.script);
        runner.dispose();
    });
});
