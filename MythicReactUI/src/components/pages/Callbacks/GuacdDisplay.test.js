import React, {act} from "react";
import {createRoot} from "react-dom/client";
import {TextDecoder as NodeTextDecoder} from "util";
import {GuacdDisplay} from "./GuacdDisplay";

jest.mock("./InteractiveLiveSocket", () => ({
    openGuacdLiveStream: (_taskID, handlers) => {
        global.mockGuacdLiveHandlers = handlers;
        handlers.onOpened({canWrite: global.mockGuacdWritable});
        return {
            sendInstruction: jest.fn(),
            close: jest.fn(),
        };
    },
}));

jest.mock("@glokon/guacamole-common-js", () => {
    const displayElement = global.document.createElement("div");
    const display = {
        getElement: () => displayElement,
        getWidth: () => global.mockGuacdDisplayWidth,
        getHeight: () => global.mockGuacdDisplayHeight,
        scale: jest.fn(),
        onresize: null,
    };

    class Tunnel {
        static State = {CONNECTING: 1, OPEN: 2, CLOSED: 3};
        setState() {}
    }

    class Parser {
        static toInstruction(elements) { return elements.join(","); }
        receive() {}
    }

    class Client {
        constructor(tunnel) {
            this.tunnel = tunnel;
            this.sendMouseState = jest.fn();
            this.sendSize = jest.fn();
            this.sendKeyEvent = jest.fn();
            this.sendAck = jest.fn();
            this.createClipboardStream = jest.fn(() => ({index: 71}));
            global.mockGuacdClient = this;
        }
        getDisplay() { return display; }
        connect() { this.tunnel.connect(); }
        disconnect() { this.tunnel.disconnect(); }
    }

    class Mouse {
        constructor() { global.mockGuacdMouse = this; }
    }

    class Keyboard {
        constructor() {
            this.pressed = {};
            this.reset = jest.fn();
            global.mockGuacdKeyboard = this;
        }
    }

    class StringReader {
        constructor(stream) {
            stream.reader = this;
            global.mockGuacdStringReader = this;
        }
    }

    class StringWriter {
        constructor(stream) {
            this.stream = stream;
            this.sendText = jest.fn();
            this.sendEnd = jest.fn();
            global.mockGuacdStringWriter = this;
        }
    }

    return {
        Client,
        Keyboard,
        Mouse,
        Parser,
        Status: class Status {
            static Code = {SUCCESS: 0, UNSUPPORTED: 256, SERVER_ERROR: 512, CLIENT_OVERRUN: 781};
        },
        StringReader,
        StringWriter,
        Tunnel,
    };
});

describe("GuacdDisplay", () => {
    let host;
    let root;
    let previousTextDecoder;
    let previousClipboardDescriptor;

    beforeEach(() => {
        jest.useFakeTimers();
        global.IS_REACT_ACT_ENVIRONMENT = true;
        global.mockGuacdWritable = true;
        global.mockGuacdDisplayWidth = 1920;
        global.mockGuacdDisplayHeight = 1080;
        previousTextDecoder = global.TextDecoder;
        global.TextDecoder = NodeTextDecoder;
        previousClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
        global.ResizeObserver = class ResizeObserver {
            constructor(callback) {
                this.callback = callback;
                global.mockGuacdResizeObserver = this;
            }
            observe() {}
            disconnect() {}
        };
        host = document.createElement("div");
        document.body.appendChild(host);
        root = createRoot(host);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        host.remove();
        global.TextDecoder = previousTextDecoder;
        delete global.IS_REACT_ACT_ENVIRONMENT;
        delete global.ResizeObserver;
        delete global.mockGuacdClient;
        delete global.mockGuacdMouse;
        delete global.mockGuacdKeyboard;
        delete global.mockGuacdStringReader;
        delete global.mockGuacdStringWriter;
        delete global.mockGuacdLiveHandlers;
        delete global.mockGuacdResizeObserver;
        delete global.mockGuacdWritable;
        delete global.mockGuacdDisplayWidth;
        delete global.mockGuacdDisplayHeight;
        if(previousClipboardDescriptor){
            Object.defineProperty(navigator, "clipboard", previousClipboardDescriptor);
        } else {
            delete navigator.clipboard;
        }
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test("maps local scaled mouse coordinates back to the remote display", async () => {
        await act(async () => root.render(<GuacdDisplay taskID="task-one" />));

        const state = {x: 320, y: 180, left: false};
        global.mockGuacdMouse.onmousemove(state);

        expect(global.mockGuacdClient.sendMouseState).toHaveBeenCalledWith(state, true);
    });

    test("synchronizes the browser clipboard before forwarding Control-V", async () => {
        await act(async () => root.render(<GuacdDisplay taskID="task-one" />));
        await act(async () => global.mockGuacdLiveHandlers.onOutput(new Uint8Array()));

        global.mockGuacdKeyboard.pressed[0xFFE3] = true;
        expect(global.mockGuacdKeyboard.onkeydown(0x76)).toBe(true);
        expect(global.mockGuacdClient.sendKeyEvent).not.toHaveBeenCalledWith(1, 0x76);

        const container = host.querySelector('[tabindex="0"]');
        const paste = new Event("paste", {bubbles: true, cancelable: true});
        Object.defineProperty(paste, "clipboardData", {
            value: {getData: (mimetype) => mimetype === "text/plain" ? "local clipboard" : ""},
        });
        await act(async () => container.dispatchEvent(paste));

        expect(global.mockGuacdClient.createClipboardStream).toHaveBeenCalledWith("text/plain");
        expect(global.mockGuacdStringWriter.sendText).toHaveBeenCalledWith("local clipboard");
        expect(global.mockGuacdStringWriter.sendEnd).toHaveBeenCalled();
        expect(global.mockGuacdClient.sendKeyEvent.mock.calls.slice(-2)).toEqual([[1, 0x76], [0, 0x76]]);

        const callCount = global.mockGuacdClient.sendKeyEvent.mock.calls.length;
        global.mockGuacdKeyboard.onkeyup(0x76);
        expect(global.mockGuacdClient.sendKeyEvent).toHaveBeenCalledTimes(callCount);
    });

    test("copies the next remote clipboard update after Control-C", async () => {
        const writeText = jest.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", {configurable: true, value: {writeText}});
        await act(async () => root.render(<GuacdDisplay taskID="task-one" />));

        global.mockGuacdKeyboard.pressed[0xFFE3] = true;
        global.mockGuacdKeyboard.onkeydown(0x63);
        const stream = {index: 19};
        global.mockGuacdClient.onclipboard(stream, "text/plain");
        await act(async () => {
            stream.reader.ontext("remote ");
            stream.reader.ontext("clipboard");
            stream.reader.onend();
            await Promise.resolve();
        });

        expect(global.mockGuacdClient.sendKeyEvent).toHaveBeenCalledWith(1, 0x63);
        expect(global.mockGuacdClient.sendAck).toHaveBeenCalledWith(19, "OK", 0);
        expect(writeText).toHaveBeenCalledWith("remote clipboard");
        expect(host.textContent).not.toContain("Copy remote clipboard");
    });

    test("offers click-to-copy only when automatic clipboard access is blocked", async () => {
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {writeText: jest.fn().mockRejectedValue(new Error("blocked"))},
        });
        await act(async () => root.render(<GuacdDisplay taskID="task-one" />));

        global.mockGuacdKeyboard.pressed[0xFFE3] = true;
        global.mockGuacdKeyboard.onkeydown(0x63);
        const stream = {index: 20};
        global.mockGuacdClient.onclipboard(stream, "text/plain");
        await act(async () => {
            stream.reader.ontext("needs click");
            stream.reader.onend();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(host.textContent).toContain("Copy remote clipboard");
    });

    test("keeps a near-matching framebuffer at a crisp one-to-one scale", async () => {
        await act(async () => root.render(<GuacdDisplay taskID="task-one" />));

        const container = host.querySelector('[tabindex="0"]');
        Object.defineProperty(container, "clientWidth", {configurable: true, value: 1912});
        Object.defineProperty(container, "clientHeight", {configurable: true, value: 1075});
        await act(async () => global.mockGuacdResizeObserver.callback());
        expect(global.mockGuacdClient.getDisplay().scale).toHaveBeenLastCalledWith(1);

        Object.defineProperty(container, "clientWidth", {configurable: true, value: 960});
        Object.defineProperty(container, "clientHeight", {configurable: true, value: 540});
        await act(async () => global.mockGuacdResizeObserver.callback());
        expect(global.mockGuacdClient.getDisplay().scale).toHaveBeenLastCalledWith(0.5);
    });

    test("fills the browser viewport without reserving Escape", async () => {
        await act(async () => root.render(<GuacdDisplay taskID="task-one" />));

        const fullScreen = Array.from(host.querySelectorAll("button"))
            .find((button) => button.textContent === "Full screen");
        await act(async () => fullScreen.click());

        const viewport = host.querySelector('[data-testid="guacd-viewport"]');
        const controls = host.querySelector('[data-testid="guacd-viewport-controls"]');
        expect(viewport.style.position).toBe("fixed");
        expect(viewport.style.inset).toBe("0");
        expect(document.body.style.overflow).toBe("hidden");
        expect(controls.style.transform).toBe("translateX(0)");

        await act(async () => controls.dispatchEvent(new MouseEvent("mouseout", {
            bubbles: true, relatedTarget: document.body,
        })));
        expect(controls.style.transform).toBe("translateX(-140px)");

        const escape = new KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true});
        window.dispatchEvent(escape);
        expect(escape.defaultPrevented).toBe(false);
        expect(viewport.style.position).toBe("fixed");

        const exit = Array.from(host.querySelectorAll("button"))
            .find((button) => button.textContent === "Exit full screen");
        await act(async () => exit.click());
        expect(viewport.style.position).toBe("relative");
        expect(document.body.style.overflow).toBe("");
    });

    test("toggles viewport mode with Control-Shift-F", async () => {
        await act(async () => root.render(<GuacdDisplay taskID="task-one" />));
        const viewport = host.querySelector('[data-testid="guacd-viewport"]');

        await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", {
            key: "F", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true,
        })));
        expect(viewport.style.position).toBe("fixed");

        await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", {
            key: "f", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true,
        })));
        expect(viewport.style.position).toBe("relative");
    });

    test("resizes the remote desktop to match the writable display pane", async () => {
        await act(async () => root.render(<GuacdDisplay taskID="task-one" />));

        const container = host.querySelector('[tabindex="0"]');
        let width = 1280;
        let height = 720;
        Object.defineProperty(container, "clientWidth", {configurable: true, get: () => width});
        Object.defineProperty(container, "clientHeight", {configurable: true, get: () => height});

        await act(async () => {
            global.mockGuacdLiveHandlers.onOutput(new Uint8Array());
            jest.advanceTimersByTime(100);
            // Normal desktop output must not postpone the initial resize.
            global.mockGuacdLiveHandlers.onOutput(new Uint8Array());
            jest.advanceTimersByTime(50);
        });
        expect(global.mockGuacdClient.sendSize).toHaveBeenLastCalledWith(1280, 720);

        width = 1600;
        height = 900;
        await act(async () => {
            global.mockGuacdResizeObserver.callback();
            jest.advanceTimersByTime(150);
        });
        expect(global.mockGuacdClient.sendSize).toHaveBeenLastCalledWith(1600, 900);
        expect(global.mockGuacdClient.sendSize).toHaveBeenCalledTimes(2);
    });

    test("retries the initial size until the remote framebuffer applies it", async () => {
        await act(async () => root.render(<GuacdDisplay taskID="task-one" />));

        const container = host.querySelector('[tabindex="0"]');
        Object.defineProperty(container, "clientWidth", {configurable: true, value: 1280});
        Object.defineProperty(container, "clientHeight", {configurable: true, value: 720});

        await act(async () => {
            global.mockGuacdLiveHandlers.onOutput(new Uint8Array());
            jest.advanceTimersByTime(150);
            jest.advanceTimersByTime(500);
        });
        expect(global.mockGuacdClient.sendSize).toHaveBeenNthCalledWith(1, 1280, 720);
        expect(global.mockGuacdClient.sendSize).toHaveBeenNthCalledWith(2, 1280, 720);

        global.mockGuacdDisplayWidth = 1280;
        global.mockGuacdDisplayHeight = 720;
        await act(async () => {
            global.mockGuacdClient.getDisplay().onresize();
            jest.advanceTimersByTime(12000);
        });
        expect(global.mockGuacdClient.sendSize).toHaveBeenCalledTimes(2);
    });

    test("does not let a view-only Guacamole user resize the shared desktop", async () => {
        global.mockGuacdWritable = false;
        await act(async () => root.render(<GuacdDisplay taskID="task-one" />));

        const container = host.querySelector('[tabindex="0"]');
        Object.defineProperty(container, "clientWidth", {configurable: true, value: 1280});
        Object.defineProperty(container, "clientHeight", {configurable: true, value: 720});
        await act(async () => {
            global.mockGuacdLiveHandlers.onOutput(new Uint8Array());
            global.mockGuacdResizeObserver.callback();
            jest.advanceTimersByTime(150);
        });

        expect(global.mockGuacdClient.sendSize).not.toHaveBeenCalled();
    });
});
