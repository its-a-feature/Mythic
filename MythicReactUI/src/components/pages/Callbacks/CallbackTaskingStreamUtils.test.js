import {createTaskChildrenStore, mergeTasksByID, nextLiveTaskLimit} from "./CallbackTaskingStreamUtils";

describe("callback task stream utilities", () => {
  test("merges tasks by id while preserving unchanged row identity", () => {
    const first = {id: 1, status: "complete", tasks: [], tags: [], command: {id: 1}, operator: {username: "a"}};
    const second = {id: 2, status: "running", tasks: [], tags: [], command: {id: 2}, operator: {username: "a"}};
    const merged = mergeTasksByID([first, second], [
      {...first},
      {...second, status: "complete"},
      {id: 3, status: "submitted", tasks: [], tags: [], command: {id: 3}, operator: {username: "a"}},
    ]);

    expect(merged.map((task) => task.id)).toEqual([1, 2, 3]);
    expect(merged[0]).toBe(first);
    expect(merged[1]).not.toBe(second);
  });

  test("grows the live limit only when the live result window is saturated", () => {
    expect(nextLiveTaskLimit(20, 19)).toBe(20);
    expect(nextLiveTaskLimit(20, 20)).toBe(40);
    expect(nextLiveTaskLimit(40, 40)).toBe(60);
  });

  test("groups children, deduplicates replay, and notifies only changed parents", () => {
    const store = createTaskChildrenStore();
    const parentOneListener = jest.fn();
    const parentTwoListener = jest.fn();
    store.subscribe(10, parentOneListener);
    store.subscribe(20, parentTwoListener);

    const child = {id: 2, parent_task_id: 10, status: "running", tasks: [], tags: []};
    store.merge([child, {id: 3, parent_task_id: 20, status: "complete", tasks: [], tags: []}]);
    expect(store.getSnapshot(10)).toEqual([child]);
    expect(parentOneListener).toHaveBeenCalledTimes(1);
    expect(parentTwoListener).toHaveBeenCalledTimes(1);

    store.merge([{...child}]);
    expect(parentOneListener).toHaveBeenCalledTimes(1);

    store.merge([{...child, status: "complete"}]);
    expect(parentOneListener).toHaveBeenCalledTimes(2);
    expect(parentTwoListener).toHaveBeenCalledTimes(1);
    expect(store.getHighestTaskID()).toBe(3);
  });
});
