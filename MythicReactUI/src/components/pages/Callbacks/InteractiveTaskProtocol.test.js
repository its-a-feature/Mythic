import {getInteractiveTaskProtocol} from "./InteractiveTaskProtocol";

const taskWithFeatures = (...supported_ui_features) => ({command: {supported_ui_features}});

describe("getInteractiveTaskProtocol", () => {
    test.each([
        [["task_response:interactive"], "terminal"],
        [["task_response:interactive:terminal"], "terminal"],
        [["task_response:interactive:rdp"], "rdp"],
        [["unrelated", "task_response:interactive:vnc"], "vnc"],
        [["task_response:interactive", "task_response:interactive:rdp"], "rdp"],
    ])("resolves %p as %s", (features, expected) => {
        expect(getInteractiveTaskProtocol(taskWithFeatures(...features))).toBe(expected);
    });

    test.each([
        [[]],
        [["task_response:interactive:unknown"]],
        [["task_response:interactive:rdp", "task_response:interactive:vnc"]],
    ])("rejects non-interactive or inconsistent metadata %p", (features) => {
        expect(getInteractiveTaskProtocol(taskWithFeatures(...features))).toBeNull();
    });
});
