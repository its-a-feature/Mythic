import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {
    addInteractiveLiveOutput,
    addInteractiveScreenForcedExits,
    decodeInteractiveLiveOutput,
    decodeInteractiveResponse,
    formatInteractiveTerminalEntry,
    getInteractiveTerminalAppendIndex,
    joinInteractiveSplitCharacters,
    parseTerminalMouseReport,
    ResponseDisplayInteractive,
} from './ResponseDisplayInteractive';

jest.mock('./CallbackMutations', () => ({
    createTaskingMutation: "createTaskingMutation",
}));
jest.mock('../../utilities/Snackbar', () => ({
    snackActions: {error: jest.fn(), warning: jest.fn()},
}));
jest.mock('../../utilities/MythicConnection', () => {
    global.mockFetchCalls = [];
    return {
        mythicFetch: (...args) => {
            global.mockFetchCalls.push(args);
            return Promise.resolve({ok: true, text: () => Promise.resolve("cast")});
        },
    };
});
jest.mock('asciinema-player', () => {
    global.mockPlayerCalls = [];
    return {
        create: (...args) => {
            global.mockPlayerCalls.push(args);
            return {dispose: () => {}};
        },
    };
}, {virtual: true});
jest.mock('asciinema-player/dist/bundle/asciinema-player.css', () => ({}), {virtual: true});
jest.mock('./ResponseDisplay', () => ({
    b64DecodeUnicode: (value) => Buffer.from(value, "base64").toString("utf8"),
    SearchBar: () => null,
}));
jest.mock('@xterm/xterm/css/xterm.css', () => ({}));
jest.mock('./InteractiveLiveSocket', () => {
    global.mockLiveStreams = [];
    return {
        openInteractiveLiveStream: (taskID, handlers) => {
            const stream = {taskID, handlers, inputs: [], credits: 0, closed: false, canWrite: false};
            global.mockLiveStreams.push(stream);
            return {
                sendInput: (input) => {
                    if(!stream.canWrite || stream.closed){
                        return false;
                    }
                    stream.inputs.push(input);
                    return true;
                },
                credit: (bytes) => {
                    stream.credits += bytes;
                },
                close: () => {
                    stream.closed = true;
                },
            };
        },
    };
});
jest.mock('../../utilities/Time', () => ({
    toLocalTime: (value) => `local:${value}`,
}));
jest.mock('../../../cache', () => {
    const {makeVar} = jest.requireActual('@apollo/client');
    return {meState: makeVar({user: {view_utc_time: false}})};
});
jest.mock('@apollo/client', () => {
    const actual = jest.requireActual('@apollo/client');
    const mockApollo = {lazy: {}, subscriptions: {}, subscriptionData: {}, mutations: []};
    mockApollo.mutate = (args) => mockApollo.mutations.push(args);
    global.mockApollo = mockApollo;
    return {
        ...actual,
        useLazyQuery: (query, options) => {
            const name = query.definitions[0].name.value;
            if(!mockApollo.lazy[name]){
                const entry = {calls: []};
                entry.execute = (args) => entry.calls.push(args);
                mockApollo.lazy[name] = entry;
            }
            mockApollo.lazy[name].options = options;
            return [mockApollo.lazy[name].execute];
        },
        useSubscription: (query, options) => {
            const name = query.definitions[0].name.value;
            mockApollo.subscriptions[name] = options;
            return {data: mockApollo.subscriptionData[name]};
        },
        useMutation: () => [mockApollo.mutate],
    };
});
jest.mock('@xterm/addon-fit', () => ({
    FitAddon: class {
        activate(){}
        dispose(){}
        fit(){}
        proposeDimensions(){ return {cols: 100, rows: 30}; }
    },
}));
jest.mock('@xterm/addon-webgl', () => ({
    WebglAddon: class {
        activate(){}
        dispose(){}
        onContextLoss(){}
    },
}), {virtual: true});
jest.mock('@xterm/addon-unicode11', () => ({
    Unicode11Addon: class {
        activate(terminal){
            const wcwidth = (codepoint) => codepoint < 32 ? 0 : 1;
            terminal.unicode.register({version: "11", wcwidth, charProperties: (codepoint) => wcwidth(codepoint) << 1});
        }
        dispose(){}
    },
}), {virtual: true});
jest.mock('@xterm/xterm', () => {
    const actual = jest.requireActual('@xterm/xterm');
    // jsdom has no canvas, so skip rendering but keep the real parser and buffers
    class MockTerminal extends actual.Terminal {
        constructor(options){
            super(options);
            global.mockTerminal = this;
        }
        open(){}
        get textarea(){ return global.document.createElement("textarea"); }
    }
    return {Terminal: MockTerminal};
});

describe("getInteractiveTerminalAppendIndex", () => {
    test("appends everything when nothing has been written yet", () => {
        expect(getInteractiveTerminalAppendIndex([], ["a", "b"])).toBe(0);
    });

    test("appends only new entries when previous is a prefix", () => {
        expect(getInteractiveTerminalAppendIndex(["a", "b"], ["a", "b", "c", "d"])).toBe(2);
    });

    test("appends nothing when unchanged", () => {
        expect(getInteractiveTerminalAppendIndex(["a", "b"], ["a", "b"])).toBe(2);
    });

    test("appends new entries from a sliding window whose head was dropped", () => {
        expect(getInteractiveTerminalAppendIndex(["a", "b", "c"], ["b", "c", "d", "e"])).toBe(2);
    });

    test("requires a replay when the window jumped past everything written", () => {
        expect(getInteractiveTerminalAppendIndex(["a", "b"], ["x", "y"])).toBe(-1);
    });

    test("requires a replay when moving to an earlier page", () => {
        expect(getInteractiveTerminalAppendIndex(["c", "d"], ["a", "b"])).toBe(-1);
    });

    test("requires a replay when written entries changed", () => {
        expect(getInteractiveTerminalAppendIndex(["a", "b", "c"], ["a", "x", "c", "d"])).toBe(-1);
    });

    test("requires a replay when next is empty", () => {
        expect(getInteractiveTerminalAppendIndex(["a"], [])).toBe(-1);
    });
});

// jsdom has no TextDecoder
global.TextDecoder = global.TextDecoder || require("util").TextDecoder;

describe("joinInteractiveSplitCharacters", () => {
    // "a╱b" is 61 E2 95 B1 62, so these chunks cut the ╱ after its second byte
    const chunks = [[0x61, 0xE2, 0x95], [0xB1, 0x62]];
    const decode = (bytes, id) => decodeInteractiveResponse({id, response: Buffer.from(bytes).toString("base64")});

    test("rebuilds a character split across responses at the start of the response that completes it", () => {
        const entries = joinInteractiveSplitCharacters(chunks.map(decode));
        expect(entries.map((entry) => formatInteractiveTerminalEntry({entry}))).toEqual(["a", "╱b"]);
    });
    test("keeps the text of earlier responses unchanged as later ones arrive", () => {
        expect(joinInteractiveSplitCharacters(chunks.slice(0, 1).map(decode))[0].response).toBe("a");
    });
    test("keeps a response's text unchanged once the response before it leaves the live window", () => {
        const [, joined] = joinInteractiveSplitCharacters(chunks.map(decode));
        const [alone] = joinInteractiveSplitCharacters(chunks.slice(1).map(decode));
        expect(alone.response).toBe(joined.response);
    });
    test("leaves whole characters and entries without bytes unchanged", () => {
        const task = {id: 5, original_params: "ls"};
        const entries = joinInteractiveSplitCharacters([decode([0xE2, 0x95, 0xB1], 1), task]);
        expect(entries[0].response).toBe("╱");
        expect(entries[1]).toBe(task);
    });
});

describe("addInteractiveScreenForcedExits", () => {
    const recording = {id: 2, end_response_id: 20};

    test("returns entries unchanged without finished recordings", () => {
        const entries = [{id: 20, response: "a"}];
        expect(addInteractiveScreenForcedExits(entries, [])).toBe(entries);
        expect(addInteractiveScreenForcedExits(entries, [{id: 3, end_response_id: null}])).toBe(entries);
    });

    test("leaves the alternate screen after a last response with no exit sequence", () => {
        const entries = addInteractiveScreenForcedExits([
            {id: 19, response: "frame"},
            {id: 20, response: "frame", timestamp: "2026-10-15T09:01:17"},
            {id: 3, original_params: "ls"},
        ], [recording]);
        expect(entries.map((entry) => entry.id)).toEqual([19, 20, "screen-exit-20", 3]);
        expect(entries[2].response.startsWith("\x1b[?1049l\x1b[?1000l")).toBe(true);
    });

    test("adds nothing when the app exited the alternate screen itself", () => {
        const entries = [{id: 20, response: "\x1b[H\x1b[?1049l$ "}];
        expect(addInteractiveScreenForcedExits(entries, [recording])).toEqual(entries);
        expect(addInteractiveScreenForcedExits([{id: 20, response: "\x1bc"}], [recording])).toHaveLength(1);
    });

    test("adds nothing once the app's output was collapsed into its recording", () => {
        const entries = [{id: 20, response: "$ top\r\n"}];
        expect(addInteractiveScreenForcedExits(entries, [{...recording, collapsed: true}])).toBe(entries);
    });
});

describe("addInteractiveLiveOutput", () => {
    let sequence = 0;
    const live = (text) => decodeInteractiveLiveOutput({messageType: 1, bytes: Buffer.from(text), liveSequence: sequence++, liveOffset: 0});
    const row = (id, text, interactiveTaskType=1) => decodeInteractiveResponse({
        id, response: Buffer.from(text).toString("base64"), timestamp: `t${id}`, interactive_task_type: interactiveTaskType,
    });

    test("leaves entries alone without a live stream", () => {
        const entries = [row(1, "a")];
        expect(addInteractiveLiveOutput(entries, null)).toBe(entries);
    });
    test("shows live output after the loaded responses until it's saved", () => {
        const pending = [live("b"), live("c")];
        expect(addInteractiveLiveOutput([row(1, "a")], {startResponseID: 1, saved: [], pending}).map((entry) => entry.response))
            .toEqual(["a", "b", "c"]);
    });
    test("shows a saved response as the live output it was made from, whether or not it has loaded", () => {
        const output = [live("b"), live("c")];
        const saved = [{responseID: 2, output, byteLength: 2}];
        const waiting = addInteractiveLiveOutput([row(1, "a")], {startResponseID: 1, saved, pending: []});
        const loaded = addInteractiveLiveOutput([row(1, "a"), row(2, "bc")], {startResponseID: 1, saved, pending: []});
        expect(loaded.map((entry) => entry.liveSequence)).toEqual(waiting.map((entry) => entry.liveSequence));
        expect(loaded.map((entry) => entry.id)).toEqual([1, undefined, 2]);
    });
    test("hides responses saved from live output that hasn't been matched to them yet", () => {
        const entries = [row(1, "a"), row(2, "b"), row(3, "note", null)];
        expect(addInteractiveLiveOutput(entries, {startResponseID: 1, saved: [], pending: [live("b")]}).map((entry) => entry.response))
            .toEqual(["a", "note", "b"]);
    });
    test("drops live output whose response was deleted", () => {
        const saved = [{responseID: 2, output: [live("full-screen")], byteLength: 11}];
        expect(addInteractiveLiveOutput([row(1, "a"), row(3, "b", null)], {startResponseID: 1, saved, pending: []}).map((entry) => entry.response))
            .toEqual(["a", "b"]);
    });
    test("shows the response instead once it no longer matches its live output", () => {
        const saved = [{responseID: 2, output: [live("full-screen")], byteLength: 11}];
        expect(addInteractiveLiveOutput([row(2, "")], {startResponseID: 1, saved, pending: []}).map((entry) => entry.response))
            .toEqual([""]);
    });
});

describe("parseTerminalMouseReport", () => {
    test("labels SGR reports", () => {
        expect(parseTerminalMouseReport("\x1b[<0;12;5M")).toEqual({label: "Click 12,5", motion: false, hover: false});
        expect(parseTerminalMouseReport("\x1b[<2;12;5M")).toEqual({label: "Right click 12,5", motion: false, hover: false});
        expect(parseTerminalMouseReport("\x1b[<0;12;5m")).toEqual({label: "Release 12,5", motion: false, hover: false});
        expect(parseTerminalMouseReport("\x1b[<32;13;5M")).toEqual({label: "Drag 13,5", motion: true, hover: false});
        expect(parseTerminalMouseReport("\x1b[<35;13;5M")).toEqual({label: "Move 13,5", motion: true, hover: true});
        expect(parseTerminalMouseReport("\x1b[<65;1;1M")).toEqual({label: "Wheel down 1,1", motion: false, hover: false});
    });
    test("labels X10 reports", () => {
        expect(parseTerminalMouseReport("\x1b[M ,%")).toEqual({label: "Click 12,5", motion: false, hover: false});
        expect(parseTerminalMouseReport("\x1b[M#,%")).toEqual({label: "Release 12,5", motion: false, hover: false});
        expect(parseTerminalMouseReport("\x1b[MC,%")).toEqual({label: "Move 12,5", motion: true, hover: true});
    });
    test("ignores everything else", () => {
        expect(parseTerminalMouseReport("\x1b[A")).toBe(null);
        expect(parseTerminalMouseReport("a")).toBe(null);
    });
});

describe("ResponseDisplayInteractive", () => {
    let container;
    let root;

    const encode = (value) => Buffer.from(value, "utf8").toString("base64");
    const settle = async () => {
        for(let i = 0; i < 10; i++){
            await act(async () => {
                jest.advanceTimersByTime(100);
            });
        }
    };
    const streamResponse = async (response) => {
        await act(async () => {
            global.mockApollo.subscriptions.subResponsesQuery.onData({data: {data: {response_stream: [response]}}});
        });
        await settle();
    };

    beforeAll(() => {
        global.IS_REACT_ACT_ENVIRONMENT = true;
        global.ResizeObserver = class {
            observe(){}
            disconnect(){}
        };
    });

    afterAll(() => {
        delete global.IS_REACT_ACT_ENVIRONMENT;
        delete global.ResizeObserver;
    });

    beforeEach(() => {
        jest.useFakeTimers();
        global.mockApollo.mutations.length = 0;
        global.mockApollo.subscriptionData = {};
        global.mockLiveStreams.length = 0;
        global.mockApollo.lazy.getInteractiveLatestResponses?.calls.splice(0);
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        jest.useRealTimers();
    });

    // the tasking console always renders with selectAllOutput
    test.each([
        ["task view", false, 100],
        ["console view", true, 5000],
    ])("follows streamed output and detects a full-screen app in the %s", async (name, selectAllOutput, windowSize) => {
        const task = {
            id: 1,
            response_count: 0,
            display_id: 1,
            is_interactive_task: false,
            callback: {display_id: 1},
            command: {cmd: "exec_bof"},
        };
        // createRoot is not a Testing Library render helper and needs act to flush effects.
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            root.render(<ResponseDisplayInteractive task={task} selectAllOutput={selectAllOutput} />);
        });
        await settle();
        expect(global.mockApollo.lazy.getInteractiveLatestResponses.calls.map((call) => call.variables.fetchLimit))
            .toEqual([windowSize]);
        expect(global.mockApollo.mutations.map((m) => [m.variables.interactive_task_type, m.variables.params]))
            .toEqual([[25, "100,30,0,0"]]);
        expect(global.mockApollo.subscriptions.subResponsesQuery.skip).toBe(true);

        await act(async () => {
            global.mockApollo.lazy.getInteractiveLatestResponses.options.onCompleted({
                response: [{id: 10, response: encode("$ "), timestamp: "2026-10-15T09:00:00", is_error: false}],
                response_aggregate: {aggregate: {count: 1}},
            });
        });
        await settle();
        expect(global.mockApollo.subscriptions.subResponsesQuery.skip).toBe(false);
        expect(global.mockApollo.subscriptions.subResponsesQuery.variables.cursor_id).toBe(10);

        await streamResponse({id: 11, response: encode("\x1b[?1049h\x1b[2J\x1b[1;1Htop\x1b[1;5H\nx"), timestamp: "2026-10-15T09:00:01", is_error: false});
        expect(global.mockTerminal.buffer.active.type).toBe("alternate");
        // a bare LF moves down a row in the same column while the app is full-screen
        expect(global.mockTerminal.buffer.active.getLine(1).translateToString(true)).toBe("    x");
        expect(container.textContent).toContain("Full-screen app");
        expect(container.textContent).toContain("Raw key mode");

        await streamResponse({id: 12, response: encode("\x1b[?1049l$ \nok"), timestamp: "2026-10-15T09:00:02", is_error: false});
        expect(global.mockTerminal.buffer.active.type).toBe("normal");
        const normalBuffer = global.mockTerminal.buffer.active;
        expect(normalBuffer.getLine(normalBuffer.baseY + normalBuffer.cursorY).translateToString(true)).toBe("ok");
        expect(container.textContent).not.toContain("Full-screen app");
        expect(container.textContent).toContain("Line mode");
    });

    test("enters the alternate screen when a full-screen app started before the loaded window", async () => {
        const task = {
            id: 1,
            response_count: 0,
            display_id: 1,
            is_interactive_task: false,
            callback: {display_id: 1},
            command: {cmd: "exec_bof"},
        };
        global.mockApollo.subscriptionData.subInteractiveScreenRecordings = {interactive_screen_session: [{
            id: 1, start_response_id: 5, end_response_id: null, start_time: "2026-10-15T09:00:00", end_time: null,
            filemeta: {agent_file_id: "file-1"},
        }]};
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            root.render(<ResponseDisplayInteractive task={task} selectAllOutput={false} />);
        });
        await settle();
        await act(async () => {
            global.mockApollo.lazy.getInteractiveLatestResponses.options.onCompleted({
                response: [{id: 10, response: encode("\x1b[1;1Htop"), timestamp: "2026-10-15T09:00:01", is_error: false}],
                response_aggregate: {aggregate: {count: 200}},
            });
        });
        await settle();
        expect(global.mockTerminal.buffer.active.type).toBe("alternate");
        expect(container.textContent).toContain("Full-screen app");
        expect(global.mockApollo.subscriptions.subResponsesQuery.variables.cursor_id).toBe(10);

        // further frames are appended rather than replaying the whole window
        const resetSpy = jest.spyOn(global.mockTerminal, "reset");
        await streamResponse({id: 11, response: encode("\x1b[2;1Hnext frame"), timestamp: "2026-10-15T09:00:02", is_error: false});
        expect(resetSpy).not.toHaveBeenCalled();
        expect(global.mockTerminal.buffer.active.type).toBe("alternate");
    });

    test("lists recordings in the toolbar and plays one", async () => {
        const task = {
            id: 1,
            response_count: 0,
            display_id: 1,
            is_interactive_task: false,
            callback: {display_id: 1},
            command: {cmd: "exec_bof"},
        };
        global.mockApollo.subscriptionData.subInteractiveScreenRecordings = {interactive_screen_session: [
            {id: 2, start_response_id: 3, end_response_id: 4, start_time: "2026-10-15T09:00:00", end_time: "2026-10-15T09:01:17",
                filemeta: {agent_file_id: "file-1"}},
            {id: 3, start_response_id: 10, end_response_id: null, start_time: "2026-10-15T09:05:00", end_time: null,
                filemeta: {agent_file_id: "file-2"}},
        ]};
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            root.render(<ResponseDisplayInteractive task={task} selectAllOutput={false} />);
        });
        await settle();
        const recordingsChip = Array.from(container.querySelectorAll(".mythic-chip-base"))
            .find((chip) => chip.textContent === "2 recordings");
        expect(recordingsChip).toBeDefined();
        await act(async () => {
            recordingsChip.click();
        });
        const rows = Array.from(document.querySelectorAll("[role=menuitem]")).map((row) => row.textContent);
        expect(rows).toEqual([
            "local:2026-10-15T09:05:00 · recording…▶ PlayDownload",
            "local:2026-10-15T09:00:00 · 1m17s▶ PlayDownload",
        ]);

        const playChip = Array.from(document.querySelectorAll("[role=menuitem]"))[1].querySelector(".mythic-chip-base");
        await act(async () => {
            playChip.click();
        });
        await settle();
        expect(document.body.textContent).toContain("Full-screen app recording");
        expect(global.mockFetchCalls.map((call) => call[0])).toEqual(["/direct/download/file-1"]);
        expect(global.mockPlayerCalls.map((call) => call[0])).toEqual([{data: "cast"}]);
    });

    test("leaves the alternate screen when the full-screen app was killed without restoring it", async () => {
        const task = {
            id: 1,
            response_count: 0,
            display_id: 1,
            is_interactive_task: false,
            callback: {display_id: 1},
            command: {cmd: "exec_bof"},
        };
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            root.render(<ResponseDisplayInteractive task={task} selectAllOutput={false} />);
        });
        await settle();
        await act(async () => {
            global.mockApollo.lazy.getInteractiveLatestResponses.options.onCompleted({
                response: [
                    {id: 11, response: encode("\x1b[1;1Hframe"), timestamp: "2026-10-15T09:00:05", is_error: false},
                    {id: 10, response: encode("\x1b[?1049h\x1b[?1000h\x1b[?1006htop"), timestamp: "2026-10-15T09:00:00", is_error: false},
                ],
                response_aggregate: {aggregate: {count: 2}},
            });
        });
        await settle();
        expect(global.mockTerminal.buffer.active.type).toBe("alternate");
        expect(global.mockTerminal.modes.mouseTrackingMode).toBe("vt200");
        expect(container.textContent).toContain("Full-screen app");

        global.mockApollo.subscriptionData.subInteractiveScreenRecordings = {interactive_screen_session: [{
            id: 3, end_response_id: 11, start_time: "2026-10-15T09:00:00", end_time: "2026-10-15T09:00:05",
            filemeta: {agent_file_id: "file-1"},
        }]};
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            root.render(<ResponseDisplayInteractive task={task} selectAllOutput={false} />);
        });
        await settle();
        expect(global.mockTerminal.buffer.active.type).toBe("normal");
        expect(global.mockTerminal.modes.mouseTrackingMode).toBe("none");
        expect(container.textContent).not.toContain("Full-screen app");
        expect(container.textContent).toContain("Line mode");
    });

    test("keeps later output when the loaded output starts part way through a finished full-screen app", async () => {
        const task = {
            id: 1,
            response_count: 0,
            display_id: 1,
            is_interactive_task: false,
            callback: {display_id: 1},
            command: {cmd: "exec_bof"},
        };
        global.mockApollo.subscriptionData.subInteractiveScreenRecordings = {interactive_screen_session: [{
            id: 4, start_response_id: 5, end_response_id: 11, start_time: "2026-10-15T09:00:00", end_time: "2026-10-15T09:01:07",
            filemeta: {agent_file_id: "file-1"},
        }]};
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            root.render(<ResponseDisplayInteractive task={task} selectAllOutput={false} />);
        });
        await settle();
        await act(async () => {
            global.mockApollo.lazy.getInteractiveLatestResponses.options.onCompleted({
                response: [
                    {id: 12, response: encode("after 1\r\nafter 2\r\nafter 3\r\n$ "), timestamp: "2026-10-15T09:01:08", is_error: false},
                    {id: 11, response: encode("\x1b[?1049l"), timestamp: "2026-10-15T09:01:07", is_error: false},
                    {id: 10, response: encode("\x1b[5;1Hframe 1\x1b[6;1Hframe 2"), timestamp: "2026-10-15T09:01:00", is_error: false},
                ],
                response_aggregate: {aggregate: {count: 200}},
            });
        });
        await settle();
        const buffer = global.mockTerminal.buffer.active;
        expect(buffer.type).toBe("normal");
        const lines = Array.from({length: buffer.length}, (_, i) => buffer.getLine(i).translateToString(true)).filter((line) => line !== "");
        expect(lines).toEqual(["after 1", "after 2", "after 3", "$ "]);
    });

    test("reloads the output once a finished full-screen app is collapsed into its recording", async () => {
        const task = {
            id: 1,
            response_count: 4,
            display_id: 1,
            is_interactive_task: false,
            callback: {display_id: 1},
            command: {cmd: "exec_bof"},
        };
        const recording = {id: 5, start_response_id: 10, end_response_id: 13, start_time: "2026-10-15T09:00:00",
            end_time: "2026-10-15T09:00:09", collapsed: false, filemeta: {agent_file_id: "file-1"}};
        const render = async () => {
            // eslint-disable-next-line testing-library/no-unnecessary-act
            await act(async () => {
                root.render(<ResponseDisplayInteractive task={task} selectAllOutput={false} />);
            });
            await settle();
        };
        global.mockApollo.subscriptionData.subInteractiveScreenRecordings = {interactive_screen_session: [
            {id: 4, start_response_id: 2, end_response_id: 2, start_time: "2026-10-15T08:00:00",
                end_time: "2026-10-15T08:00:09", collapsed: true, filemeta: {agent_file_id: "file-0"}},
            recording,
        ]};
        await render();
        const latestCalls = global.mockApollo.lazy.getInteractiveLatestResponses.calls;
        await act(async () => {
            global.mockApollo.lazy.getInteractiveLatestResponses.options.onCompleted({
                response: [
                    {id: 13, response: encode("\x1b[?1049l$ "), timestamp: "2026-10-15T09:00:09", is_error: false},
                    {id: 12, response: encode("\x1b[2;1Hframe 2"), timestamp: "2026-10-15T09:00:05", is_error: false},
                    {id: 11, response: encode("\x1b[1;1Hframe 1"), timestamp: "2026-10-15T09:00:01", is_error: false},
                    {id: 10, response: encode("$ top\r\n\x1b[?1049h"), timestamp: "2026-10-15T09:00:00", is_error: false},
                ],
                response_aggregate: {aggregate: {count: 4}},
            });
        });
        await settle();
        // recordings that were already collapsed when the view loaded don't reload it
        expect(latestCalls).toHaveLength(1);

        global.mockApollo.subscriptionData.subInteractiveScreenRecordings = {interactive_screen_session: [
            global.mockApollo.subscriptionData.subInteractiveScreenRecordings.interactive_screen_session[0],
            {...recording, end_response_id: 13, collapsed: true},
        ]};
        await render();
        expect(latestCalls).toHaveLength(2);
        expect(latestCalls[1].variables).toEqual({task_id: 1, fetchLimit: 100});
        await act(async () => {
            global.mockApollo.lazy.getInteractiveLatestResponses.options.onCompleted({
                response: [
                    {id: 13, response: encode("$ "), timestamp: "2026-10-15T09:00:09", is_error: false},
                    {id: 10, response: encode("$ top\r\n"), timestamp: "2026-10-15T09:00:00", is_error: false},
                ],
                response_aggregate: {aggregate: {count: 2}},
            });
        });
        await settle();
        const buffer = global.mockTerminal.buffer.active;
        expect(buffer.type).toBe("normal");
        const lines = Array.from({length: buffer.length}, (_, i) => buffer.getLine(i).translateToString(true)).filter((line) => line !== "");
        expect(lines).toEqual(["$ top", "$ "]);
        expect(container.textContent).not.toContain("Full-screen app");
    });

    test("sends input over the live stream, shows its output straight away, and doesn't replay when the response arrives", async () => {
        const task = {
            id: 1,
            response_count: 0,
            display_id: 1,
            is_interactive_task: false,
            callback: {display_id: 1},
            command: {cmd: "pty"},
        };
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            root.render(<ResponseDisplayInteractive task={task} selectAllOutput={false} />);
        });
        const stream = global.mockLiveStreams[global.mockLiveStreams.length - 1];
        expect(stream.taskID).toBe(1);
        stream.canWrite = true;
        await act(async () => {
            stream.handlers.onOpened({responseID: 10, canWrite: true});
        });
        await settle();
        // the terminal's size goes over the live stream rather than through GraphQL
        expect(stream.inputs).toEqual([{params: "100,30,0,0", originalParams: "resize 100x30", interactiveTaskType: 25}]);
        expect(global.mockApollo.mutations).toEqual([]);
        await act(async () => {
            global.mockApollo.lazy.getInteractiveLatestResponses.options.onCompleted({
                response: [{id: 10, response: encode("$ "), timestamp: "2026-10-15T09:00:00", is_error: false}],
                response_aggregate: {aggregate: {count: 1}},
            });
        });
        await settle();

        const reset = jest.spyOn(global.mockTerminal, "reset");
        await act(async () => {
            stream.handlers.onOutput(1, new Uint8Array(Buffer.from("ls\r\nfile\r\n")));
        });
        await settle();
        const buffer = global.mockTerminal.buffer.active;
        const lines = () => Array.from({length: buffer.length}, (_, i) => buffer.getLine(i).translateToString(true)).filter((line) => line !== "");
        expect(lines()).toEqual(["$ ls", "file"]);
        // written output hands its window back to the server
        expect(stream.credits).toBe(10);

        await act(async () => {
            stream.handlers.onSaved(11);
        });
        await streamResponse({id: 11, response: encode("ls\r\nfile\r\n"), timestamp: "2026-10-15T09:00:01", is_error: false, interactive_task_type: 1});
        expect(lines()).toEqual(["$ ls", "file"]);
        expect(reset).not.toHaveBeenCalled();

        // someone else watching has a smaller window, so the terminal is drawn at the size that fits everyone
        await act(async () => {
            stream.handlers.onSize({cols: 80, rows: 20});
        });
        await settle();
        expect([global.mockTerminal.cols, global.mockTerminal.rows]).toEqual([80, 20]);
        // while still saying how much fits here
        expect(stream.inputs).toHaveLength(1);
    });

    test("sends the mouse to an app tracking it, only sending where a drag got to", async () => {
        const task = {
            id: 1,
            response_count: 0,
            display_id: 1,
            is_interactive_task: false,
            callback: {display_id: 1},
            command: {cmd: "pty"},
        };
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            root.render(<ResponseDisplayInteractive task={task} selectAllOutput={false} />);
        });
        const stream = global.mockLiveStreams[global.mockLiveStreams.length - 1];
        stream.canWrite = true;
        await act(async () => {
            stream.handlers.onOpened({responseID: 0, canWrite: true});
        });
        await settle();
        // a full-screen app turns on mouse tracking, which also switches to raw input
        await act(async () => {
            stream.handlers.onOutput(1, new Uint8Array(Buffer.from("\x1b[?1049h\x1b[?1002h\x1b[?1006h")));
        });
        await settle();
        stream.inputs.length = 0;
        await act(async () => {
            ["\x1b[<0;5;3M", "\x1b[<32;6;3M", "\x1b[<32;7;3M", "\x1b[<32;8;3M", "\x1b[<0;8;3m"]
                .forEach((report) => global.mockTerminal.input(report, true));
        });
        await settle();
        expect(stream.inputs).toEqual([
            {params: "\x1b[<0;5;3M", originalParams: "Click 5,3", interactiveTaskType: 0},
            {params: "\x1b[<32;8;3M\x1b[<0;8;3m", originalParams: "Drag 8,3 Release 8,3", interactiveTaskType: 0},
        ]);
        // hovering is sent, but left out of what's saved with the input
        stream.inputs.length = 0;
        await act(async () => {
            global.mockTerminal.input("\x1b[<35;9;3M", true);
        });
        await settle();
        expect(stream.inputs).toEqual([{params: "\x1b[<35;9;3M", originalParams: "", interactiveTaskType: 0}]);
    });

    test("doesn't send the mouse in line mode", async () => {
        const task = {
            id: 1,
            response_count: 0,
            display_id: 1,
            is_interactive_task: false,
            callback: {display_id: 1},
            command: {cmd: "pty"},
        };
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            root.render(<ResponseDisplayInteractive task={task} selectAllOutput={false} />);
        });
        const stream = global.mockLiveStreams[global.mockLiveStreams.length - 1];
        stream.canWrite = true;
        await act(async () => {
            stream.handlers.onOpened({responseID: 0, canWrite: true});
        });
        await settle();
        // mouse tracking without a full-screen app leaves the terminal in line mode
        await act(async () => {
            stream.handlers.onOutput(1, new Uint8Array(Buffer.from("\x1b[?1002h\x1b[?1006h")));
        });
        await settle();
        stream.inputs.length = 0;
        await act(async () => {
            global.mockTerminal.input("\x1b[<0;5;3M", true);
            global.mockTerminal.input("\x1b[<0;5;3m", true);
        });
        await settle();
        expect(stream.inputs).toEqual([]);
    });
});
