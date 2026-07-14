import {
    hasMythicConnectionError,
    isSameOriginMythicRequest,
    mythicConnectionState,
    mythicFetch,
    reportMythicConnectionError,
    reportMythicConnectionSuccess,
} from "./MythicConnection";

const emptyConnectionState = {httpError: false, websocketError: false};

describe("Mythic connection tracking", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        mythicConnectionState(emptyConnectionState);
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    test("tracks HTTP and websocket failures independently", () => {
        reportMythicConnectionError("http");
        reportMythicConnectionError("websocket");
        expect(hasMythicConnectionError()).toBe(true);

        reportMythicConnectionSuccess("http");
        expect(mythicConnectionState()).toEqual({httpError: false, websocketError: true});

        reportMythicConnectionSuccess("websocket");
        expect(hasMythicConnectionError()).toBe(false);
    });

    test("recognizes relative and same-origin requests", () => {
        expect(isSameOriginMythicRequest("/graphql/")).toBe(true);
        expect(isSameOriginMythicRequest(`${window.location.origin}/health`)).toBe(true);
        expect(isSameOriginMythicRequest("https://example.com/health")).toBe(false);
    });

    test("marks a same-origin fetch failure and clears it after a response", async () => {
        global.fetch = jest.fn()
            .mockRejectedValueOnce(new TypeError("Failed to fetch"))
            .mockResolvedValueOnce({ok: true});

        await expect(mythicFetch("/health")).rejects.toThrow("Failed to fetch");
        expect(mythicConnectionState().httpError).toBe(true);

        await expect(mythicFetch("/health")).resolves.toEqual({ok: true});
        expect(mythicConnectionState().httpError).toBe(false);
    });

    test("does not treat a third-party request failure as a Mythic outage", async () => {
        global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

        await expect(mythicFetch("https://example.com/data")).rejects.toThrow("Failed to fetch");
        expect(hasMythicConnectionError()).toBe(false);
    });

    test("does not treat a cancelled request as a Mythic outage", async () => {
        const abortError = new Error("The operation was aborted");
        abortError.name = "AbortError";
        global.fetch = jest.fn().mockRejectedValue(abortError);

        await expect(mythicFetch("/graphql/")).rejects.toThrow("The operation was aborted");
        expect(hasMythicConnectionError()).toBe(false);
    });
});
