import React, {act} from "react";
import {createRoot} from "react-dom/client";
import {GuacdRecordingDialog} from "./GuacdRecordingDialog";

jest.mock("../../MythicComponents/MythicChip", () => ({
    MythicChip: ({label, compact, ...props}) => <button {...props}>{label}</button>,
}));
jest.mock("../../MythicComponents/MythicDraggableDialogTitle", () => ({
    MythicDraggableDialogTitle: ({children}) => <h1>{children}</h1>,
}));
jest.mock("../../MythicComponents/MythicDialogLayout", () => ({
    MythicDialogButton: ({children, ...props}) => <button {...props}>{children}</button>,
    MythicDialogFooter: ({children}) => <footer>{children}</footer>,
}));
jest.mock("../../utilities/Snackbar", () => ({
    snackActions: {error: jest.fn()},
}));
jest.mock("@glokon/guacamole-common-js", () => {
    class StaticHTTPTunnel {
        constructor(url, crossDomain, headers){
            this.url = url;
            this.crossDomain = crossDomain;
            this.headers = headers;
            global.mockGuacdRecordingTunnel = this;
        }
    }
    class SessionRecording {
        constructor(tunnel){
            this.tunnel = tunnel;
            this.duration = 5000;
            this.position = 0;
            this.playing = false;
            this.displayElement = global.document.createElement("div");
            this.display = {
                getElement: () => this.displayElement,
                getWidth: () => 1920,
                getHeight: () => 1080,
                scale: jest.fn(),
                onresize: null,
            };
            this.abort = jest.fn();
            this.pause = jest.fn(() => {
                this.playing = false;
                this.onpause?.();
            });
            this.play = jest.fn(() => {
                this.playing = true;
                this.onplay?.();
            });
            this.seek = jest.fn((position, callback) => {
                this.position = position;
                this.onseek?.(position);
                callback?.();
            });
            this.connect = jest.fn(() => Promise.resolve().then(() => {
                this.onprogress?.(this.duration);
                this.onload?.();
            }));
            global.mockGuacdRecording = this;
        }
        getDisplay(){ return this.display; }
        getDuration(){ return this.duration; }
        getPosition(){ return this.position; }
        isPlaying(){ return this.playing; }
    }
    return {SessionRecording, StaticHTTPTunnel};
});

describe("GuacdRecordingDialog", () => {
    let container;
    let root;
    let resizeCallback;

    beforeEach(() => {
        global.IS_REACT_ACT_ENVIRONMENT = true;
        localStorage.setItem("access_token", "test-token");
        global.ResizeObserver = class {
            constructor(callback){
                resizeCallback = callback;
            }
            observe(){}
            disconnect(){}
        };
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        localStorage.clear();
    });

    test("plays, seeks, resizes, and cleans up the task recording", async () => {
        await act(async () => {
            root.render(<GuacdRecordingDialog agentFileID="file/one"
                                               recordingTimestamp="2026-11-07T08:30:00Z" onClose={() => {}}/>);
        });
        await act(async () => Promise.resolve());

        expect(global.mockGuacdRecordingTunnel).toMatchObject({
            url: "/direct/download/file%2Fone",
            crossDomain: false,
            headers: {Authorization: "Bearer test-token"},
        });
        expect(global.mockGuacdRecording.connect).toHaveBeenCalledTimes(1);
        expect(global.mockGuacdRecording.play).toHaveBeenCalledTimes(1);
        expect(container.textContent).toContain("0:00 / 0:05");
        expect(container.querySelector('[data-testid="guacd-recording-timestamp"]')?.textContent)
            .toBe("2026-11-07 08:30:00");

        const displayHost = global.mockGuacdRecording.displayElement.parentElement;
        Object.defineProperty(displayHost, "clientWidth", {configurable: true, value: 960});
        Object.defineProperty(displayHost, "clientHeight", {configurable: true, value: 540});
        await act(async () => resizeCallback());
        expect(global.mockGuacdRecording.display.scale).toHaveBeenLastCalledWith(0.5);

        const slider = container.querySelector('input[aria-label="Recording position"]');
        await act(async () => {
            const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
            valueSetter.call(slider, "2500");
            slider.dispatchEvent(new Event("change", {bubbles: true}));
        });
        expect(global.mockGuacdRecording.seek).toHaveBeenCalledWith(2500);
        expect(container.querySelector('[data-testid="guacd-recording-timestamp"]')?.textContent)
            .toBe("2026-11-07 08:30:02");

        const pause = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Pause");
        await act(async () => pause.click());
        expect(global.mockGuacdRecording.pause).toHaveBeenCalledTimes(1);

        const recording = global.mockGuacdRecording;
        const displayElement = recording.displayElement;
        await act(async () => root.unmount());
        expect(recording.abort).toHaveBeenCalledTimes(1);
        expect(displayElement.isConnected).toBe(false);
        root = createRoot(container);
    });
});
