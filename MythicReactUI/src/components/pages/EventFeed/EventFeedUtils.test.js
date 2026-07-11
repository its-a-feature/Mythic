import {buildEventFeedRequest, capEventPage, createCoalescedScheduler, eventMatchesFilter} from "./EventFeedUtils";

describe("Event Feed utilities", () => {
  test("builds exact page variables for normal and warning filters", () => {
    expect(buildEventFeedRequest({page: 3, limit: 100, search: "agent", level: "info"})).toEqual({
      warning: false, variables: {offset: 200, limit: 100, search: "%agent%", level: "%info%"},
    });
    expect(buildEventFeedRequest({page: 2, limit: 100, search: "", level: "warning (resolved)"})).toEqual({
      warning: true, variables: {offset: 100, limit: 100, search: "%_%", resolved: true},
    });
  });
  test("matches warning state and case-insensitive search", () => {
    const event = {id: 1, level: "warning", warning: true, resolved: false, message: "Agent unavailable"};
    expect(eventMatchesFilter(event, {level: "warning (unresolved)", search: "AGENT"})).toBe(true);
    expect(eventMatchesFilter(event, {level: "warning (resolved)", search: "agent"})).toBe(false);
  });
  test("sorts and caps retained rows", () => {
    const page = capEventPage(Array.from({length: 120}, (_, index) => ({id: index + 1})), 100);
    expect(page).toHaveLength(100);
    expect(page[0].id).toBe(120);
    expect(page[99].id).toBe(21);
  });
  test("coalesces repeated activity", async () => {
    jest.useFakeTimers();
    const callback = jest.fn(async () => {});
    const scheduler = createCoalescedScheduler({callback});
    scheduler.schedule();
    scheduler.schedule();
    jest.advanceTimersByTime(500);
    await Promise.resolve();
    expect(callback).toHaveBeenCalledTimes(1);
    scheduler.cancel();
    jest.useRealTimers();
  });
});
