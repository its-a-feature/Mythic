import {getProgressivelyVisibleRows, mergeRowsByID} from "./ChatStreamUtils";

const sortByID = (left, right) => left.id - right.id;

describe("mergeRowsByID", () => {
    test("merges by id, rejects older updates, and bounds retained rows", () => {
        const current = [
            {id: 1, updated_at: "2026-01-01T00:00:01Z", status: "complete"},
            {id: 2, updated_at: "2026-01-01T00:00:02Z", status: "pending"},
        ];
        const incoming = [
            {id: 2, updated_at: "2026-01-01T00:00:01Z", status: "stale"},
            {id: 3, updated_at: "2026-01-01T00:00:03Z", status: "streaming"},
        ];

        expect(mergeRowsByID(current, incoming, sortByID, 2)).toEqual([
            current[1],
            incoming[1],
        ]);
    });

    test("keeps a streamed row when a same-timestamp snapshot arrives later", () => {
        const streamed = [{id: 7, updated_at: "2026-01-01T00:00:07Z", status: "complete", message: "new"}];
        const snapshot = [{id: 7, updated_at: "2026-01-01T00:00:07Z", status: "streaming", message: "old"}];

        expect(mergeRowsByID(streamed, snapshot, sortByID, 250, true)[0]).toBe(streamed[0]);
    });

    test("does not shorten same-timestamp AI streaming content", () => {
        const current = [{
            id: 9,
            updated_at: "2026-01-01T00:00:09Z",
            author_type: "ai",
            status: "streaming",
            message: "longer streamed content",
        }];
        const replay = [{
            id: 9,
            updated_at: "2026-01-01T00:00:09Z",
            author_type: "ai",
            status: "streaming",
            message: "shorter",
        }];

        expect(mergeRowsByID(current, replay, sortByID, 250)[0].message).toBe("longer streamed content");
    });

    test("preserves row identity for reconnect replays with no visible changes", () => {
        const current = [{
            id: 11,
            updated_at: "2026-01-01T00:00:11Z",
            status: "complete",
            metadata: {source: "tool"},
        }];
        const replay = [{...current[0], metadata: {source: "tool"}}];

        expect(mergeRowsByID(current, replay, sortByID, 250)).toBe(current);
    });
});

describe("getProgressivelyVisibleRows", () => {
    test("shows the newest batch while preserving actionable older rows", () => {
        const rows = [1, 2, 3, 4, 5].map((id) => ({id, pending: id === 1}));

        expect(getProgressivelyVisibleRows(rows, 2, (row) => row.pending).map((row) => row.id)).toEqual([1, 4, 5]);
    });
});
