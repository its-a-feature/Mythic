import {createTokenRefreshCoordinator, shouldInvalidateSessionAfterRefreshFailure} from "./tokenRefresh";

const validData = {
  access_token: "new-access-token",
  refresh_token: "new-refresh-token",
  user: {current_utc_time: "2026-07-10T12:00:00Z"},
};

const createCoordinator = (fetchImpl) => {
  const onSuccess = jest.fn();
  const onTerminalFailure = jest.fn();
  const refresh = createTokenRefreshCoordinator({
    fetchImpl,
    getTokens: () => ({accessToken: "old-access-token", refreshToken: "refresh-token"}),
    onSuccess,
    onTerminalFailure,
    isValidResponse: (data) => Boolean(data?.access_token && data?.user),
  });
  return {onSuccess, onTerminalFailure, refresh};
};

describe("createTokenRefreshCoordinator", () => {
  test("shares one request between concurrent refresh callers", async () => {
    let resolveFetch;
    const fetchImpl = jest.fn(() => new Promise((resolve) => {resolveFetch = resolve;}));
    const {refresh, onSuccess} = createCoordinator(fetchImpl);

    const first = refresh();
    const second = refresh();
    expect(first).toBe(second);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    resolveFetch({ok: true, status: 200, json: async () => validData});
    await expect(first).resolves.toBe(true);
    expect(onSuccess).toHaveBeenCalledWith(validData);
  });

  test("treats forbidden and malformed success responses as terminal", async () => {
    const forbidden = createCoordinator(jest.fn(async () => ({ok: false, status: 403})));
    await expect(forbidden.refresh()).resolves.toBe(false);
    expect(forbidden.onTerminalFailure).toHaveBeenCalledTimes(1);

    const malformed = createCoordinator(jest.fn(async () => ({ok: true, status: 200, json: async () => ({})})));
    await expect(malformed.refresh()).resolves.toBe(false);
    expect(malformed.onTerminalFailure).toHaveBeenCalledTimes(1);
  });

  test("treats invalid JSON as terminal", async () => {
    const coordinator = createCoordinator(jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {throw new Error("bad json");},
    })));

    await expect(coordinator.refresh()).resolves.toBe(false);
    expect(coordinator.onTerminalFailure).toHaveBeenCalledTimes(1);
  });

  test("releases the lock after transient HTTP and network failures", async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({ok: false, status: 500})
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ok: true, status: 200, json: async () => validData});
    const coordinator = createCoordinator(fetchImpl);

    await expect(coordinator.refresh()).resolves.toBe(false);
    await expect(coordinator.refresh()).resolves.toBe(false);
    await expect(coordinator.refresh()).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(coordinator.onTerminalFailure).not.toHaveBeenCalled();
  });

  test("preserves a valid session after a transient failure but invalidates an expired one", () => {
    expect(shouldInvalidateSessionAfterRefreshFailure(true)).toBe(false);
    expect(shouldInvalidateSessionAfterRefreshFailure(false)).toBe(true);
  });
});
