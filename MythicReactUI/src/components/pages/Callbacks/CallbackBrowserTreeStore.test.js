jest.mock("../../utilities/Time", () => ({getSkewedNow: () => "2026-01-01T00:00:00Z"}));

import {createCallbackBrowserTreeStore} from "./CallbackBrowserTreeStore";

const callback = {id: 7, display_id: 7, mythictree_groups: ["Default"]};
const row = (overrides = {}) => ({
    id: 1,
    task_id: 1,
    timestamp: "2026-01-01T00:00:00Z",
    deleted: false,
    success: true,
    comment: "first",
    tags: [{id: 1, tagtype: {id: 1, name: "a", color: "red"}}],
    filemeta: [],
    host: "HOST",
    can_have_children: true,
    has_children: true,
    full_path_text: "/",
    name_text: "/",
    parent_path_text: "",
    tree_type: "file",
    metadata: {size: 1, permissions: ["r"]},
    callback,
    ...overrides,
});

describe("callback browser tree store", () => {
    test("merges a streamed file update with the existing precedence", () => {
        const store = createCallbackBrowserTreeStore();
        store.mergeRows("file", "file", [row()], {hydrated: true});
        store.mergeRows("file", "file", [row({
            id: 2,
            task_id: 2,
            timestamp: "2026-01-01T00:00:01Z",
            deleted: true,
            success: false,
            comment: "new",
            tags: [{id: 2, tagtype: {id: 2, name: "b", color: "blue"}}],
            metadata: {size: 2, access_time: 3, modify_time: 4, permissions: ["w"]},
        })], {notify: true});
        const node = store.getEntry("file").data.Default.HOST["/"];
        expect(node.deleted).toBe(true);
        expect(node.comment).toBe("new");
        expect(node.tags.map((tag) => tag.id)).toEqual([1, 2]);
        expect(node.metadata).toMatchObject({size: 2, access_time: 3, modify_time: 4, permissions: ["r", "w"]});
    });

    test("ignores exact replay and emits no duplicate notification", () => {
        const store = createCallbackBrowserTreeStore();
        const listener = jest.fn();
        store.subscribeToChanges("file", listener);
        const streamedRow = row();
        store.mergeRows("file", "file", [streamedRow], {notify: true});
        store.mergeRows("file", "file", [streamedRow], {notify: true});
        expect(listener).toHaveBeenCalledTimes(1);
        expect(store.getEntry("file").data.Default.HOST["/"].tags).toHaveLength(1);
    });

    test("deduplicates tags, callbacks, and file metadata while preserving newer values", () => {
        const store = createCallbackBrowserTreeStore();
        store.mergeRows("process", "process", [row({tree_type: "process", comment: "a"})]);
        store.mergeRows("process", "process", [row({
            id: 2,
            timestamp: "2026-01-01T00:00:01Z",
            tree_type: "process",
            comment: "b",
        })]);
        const process = store.getEntry("process").data.Default.HOST["/"];
        expect(process.callbacks).toHaveLength(1);
        expect(process.tags).toHaveLength(1);
        expect(process.comment).toBe("ab");

        store.mergeRows("file", "file", [row({filemeta: [{id: 3, filename_text: ""}]})]);
        store.mergeRows("file", "file", [row({
            id: 3,
            timestamp: "2026-01-01T00:00:02Z",
            filemeta: [{id: 3, filename_text: ""}],
        })]);
        expect(store.getEntry("file").data.Default.HOST["/"].filemeta).toHaveLength(1);
    });

    test("does not decode an already-normalized filename again on later updates", () => {
        const store = createCallbackBrowserTreeStore();
        store.mergeRows("file", "file", [row({filemeta: [{id: 3, filename_text: "dGVzdA=="}]})]);
        store.mergeRows("file", "file", [row({
            id: 2,
            task_id: 2,
            timestamp: "2026-01-01T00:00:01Z",
            filemeta: [],
        })]);
        expect(store.getEntry("file").data.Default.HOST["/"].filemeta[0].filename_text).toBe("test");
    });

    test("updates only the affected adjacency branches", () => {
        const store = createCallbackBrowserTreeStore();
        store.mergeRows("file", "file", [
            row(),
            row({id: 2, host: "OTHER", full_path_text: "C:\\", timestamp: "2026-01-01T00:00:01Z"}),
        ]);
        const before = store.getEntry("file").matrix;
        const untouchedHost = before.Default.OTHER;
        store.mergeRows("file", "file", [row({
            id: 3,
            full_path_text: "/tmp",
            parent_path_text: "/",
            timestamp: "2026-01-01T00:00:02Z",
        })]);
        const after = store.getEntry("file").matrix;
        expect(after).not.toBe(before);
        expect(after.Default.OTHER).toBe(untouchedHost);
        expect(after.Default.HOST["/"]["/tmp"]).toBe(1);
    });

    test("moves an existing node between parent buckets without rebuilding unrelated hosts", () => {
        const store = createCallbackBrowserTreeStore();
        store.mergeRows("custom", "custom", [row({
            tree_type: "custom",
            full_path_text: "/child",
            parent_path_text: "/old",
        })]);
        store.mergeRows("custom", "custom", [row({
            tree_type: "custom",
            task_id: 2,
            timestamp: "2026-01-01T00:00:01Z",
            full_path_text: "/child",
            parent_path_text: "/new",
        })]);
        const matrix = store.getEntry("custom").matrix.Default.HOST;
        expect(matrix["/old"]["/child"]).toBeUndefined();
        expect(matrix["/new"]["/child"]).toBe(1);
    });

    test("historical hydration does not emit a background notification", () => {
        const store = createCallbackBrowserTreeStore();
        const listener = jest.fn();
        store.subscribeToChanges("custom", listener);
        store.mergeRows("custom", "custom", [row({tree_type: "custom"})], {hydrated: true});
        expect(listener).not.toHaveBeenCalled();
        expect(store.getEntry("custom").hydrated).toBe(true);
    });
});
