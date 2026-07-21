import {mergeRefreshedUser, syncCurrentOperationUser} from "./userState";

describe("mergeRefreshedUser", () => {
  test("maps the legacy refresh operation name to the canonical UI field", () => {
    const merged = mergeRefreshedUser(
      {current_operation: "Old Operation", current_operation_id: 1},
      {current_operation_name: "New Operation", current_operation_id: 2},
    );

    expect(merged.current_operation).toBe("New Operation");
    expect(merged.current_operation_id).toBe(2);
  });

  test("prefers the canonical operation field when both are present", () => {
    const merged = mergeRefreshedUser({}, {
      current_operation: "Canonical Operation",
      current_operation_name: "Legacy Operation",
    });

    expect(merged.current_operation).toBe("Canonical Operation");
  });
});

describe("syncCurrentOperationUser", () => {
  const oldUser = {
    current_operation_id: 1,
    current_operation: "Old Operation",
    current_operation_complete: false,
    current_operation_banner_text: "old banner",
    current_operation_banner_color: "red",
  };

  test("updates the id even when the old websocket cannot see the new operation relationship", () => {
    const result = syncCurrentOperationUser(oldUser, {
      current_operation_id: 2,
      operation: null,
    });

    expect(result.operationIDChanged).toBe(true);
    expect(result.user.current_operation_id).toBe(2);
    expect(result.user.current_operation).toBe("Old Operation");
  });

  test("updates all displayed operation metadata after reconnect", () => {
    const result = syncCurrentOperationUser({...oldUser, current_operation_id: 2}, {
      current_operation_id: 2,
      operation: {
        name: "New Operation",
        complete: true,
        banner_text: "new banner",
        banner_color: "blue",
      },
    });

    expect(result.changed).toBe(true);
    expect(result.operationIDChanged).toBe(false);
    expect(result.user).toMatchObject({
      current_operation_id: 2,
      current_operation: "New Operation",
      current_operation_complete: true,
      current_operation_banner_text: "new banner",
      current_operation_banner_color: "blue",
    });
  });
});
