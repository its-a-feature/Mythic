import React, {act} from "react";
import {createRoot} from "react-dom/client";
import {GuacdTaskDisplay, getGuacdRecordingStartedAt} from "./GuacdTaskDisplay";

jest.mock("./GuacdDisplay", () => ({
    GuacdDisplay: ({taskID}) => <div data-testid="guacd-display" data-task-id={taskID}/>,
}));
jest.mock("./GuacdRecordingDialog", () => ({
    GuacdRecordingDialog: ({agentFileID, recordingTimestamp}) =>
        <div data-testid="guacd-recording-player" data-file-id={agentFileID}
             data-recording-timestamp={recordingTimestamp}/>,
}));
jest.mock("../../../cache", () => {
    const {makeVar} = jest.requireActual("@apollo/client");
    return {meState: makeVar({user: {view_utc_time: false}})};
});
jest.mock("@apollo/client", () => {
    const actual = jest.requireActual("@apollo/client");
    global.mockGuacdRecording = null;
    return {
        ...actual,
        useSubscription: () => ({data: global.mockGuacdRecording}),
    };
});

describe("getGuacdRecordingStartedAt", () => {
    test("uses the immutable start time encoded in a generated filename", () => {
        expect(getGuacdRecordingStartedAt(
            "task_19_rdp_20261107_083000.guac",
            "2026-11-07T09:45:00Z",
        )).toBe("2026-11-07T08:30:00Z");
    });

    test("falls back for recordings without a generated timestamp", () => {
        expect(getGuacdRecordingStartedAt("recording.guac", "2026-11-07T09:45:00Z"))
            .toBe("2026-11-07T09:45:00Z");
    });
});

describe("GuacdTaskDisplay", () => {
    let container;
    let root;

    beforeAll(() => {
        global.IS_REACT_ACT_ENVIRONMENT = true;
    });

    afterAll(() => {
        delete global.IS_REACT_ACT_ENVIRONMENT;
    });

    beforeEach(() => {
        global.mockGuacdRecording = null;
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    const renderDisplay = async () => {
        await act(async () => {
            root.render(
                <GuacdTaskDisplay task={{id: 19}} responseCount={2}>
                    <div data-testid="task-output">output</div>
                </GuacdTaskDisplay>,
            );
        });
    };

    test("renders the desktop and task output", async () => {
        await renderDisplay();
        expect(container.querySelector('[data-testid="guacd-display"]')?.getAttribute("data-task-id")).toBe("19");
        expect(container.querySelector('[data-testid="task-output"]')).not.toBeNull();
        expect(container.textContent).toContain("2 responses");
    });

    test("resizes task output by dragging its separator", async () => {
        await renderDisplay();
        const split = container.querySelector('[data-testid="guacd-task-split"]');
        const handle = container.querySelector('[data-testid="guacd-output-resize-handle"]');
        const output = container.querySelector('[data-testid="task-output"]')?.parentElement;
        split.getBoundingClientRect = () => ({height: 600});

        await act(async () => {
            handle.dispatchEvent(new MouseEvent("pointerdown", {bubbles: true, button: 0, clientY: 300}));
            window.dispatchEvent(new MouseEvent("pointermove", {clientY: 240}));
        });
        expect(output?.style.flexBasis).toBe("180px");

        window.dispatchEvent(new MouseEvent("pointerup"));
        expect(document.body.style.cursor).toBe("");
        expect(document.body.style.userSelect).toBe("");
    });

    test("offers direct playback for the task's recording", async () => {
        global.mockGuacdRecording = {filemeta: [{
            agent_file_id: "guac-recording-file",
            complete: false,
            filename_utf8: "task_19_rdp_20261107_081500.guac",
            // File metadata timestamps are updated when the recording closes.
            timestamp: "2026-11-07T08:30:00Z",
        }]};
        await renderDisplay();

        const play = Array.from(container.querySelectorAll(".mythic-chip-base"))
            .find((chip) => chip.textContent === "Play recording so far");
        expect(play).toBeDefined();
        await act(async () => play.click());

        expect(document.body.querySelector('[data-testid="guacd-recording-player"]')
            ?.getAttribute("data-file-id")).toBe("guac-recording-file");
        expect(document.body.querySelector('[data-testid="guacd-recording-player"]')
            ?.getAttribute("data-recording-timestamp")).toBe("2026-11-07T08:15:00Z");
        expect(document.body.querySelector('[data-resizable="true"]')).not.toBeNull();
    });
});
