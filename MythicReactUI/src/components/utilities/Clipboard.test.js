import {downloadFileFromMemory} from "./Clipboard";

describe("downloadFileFromMemory", () => {
  test("clicks a temporary anchor and revokes its object URL", () => {
    jest.useFakeTimers();
    const createObjectURL = jest.fn(() => "blob:test-download");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "createObjectURL", {configurable: true, value: createObjectURL});
    Object.defineProperty(URL, "revokeObjectURL", {configurable: true, value: revokeObjectURL});
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadFileFromMemory("hello", "report.txt", "text/plain");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0][0].type).toBe("text/plain");
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[href="blob:test-download"]')).toBeNull();
    jest.runOnlyPendingTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-download");

    click.mockRestore();
    jest.useRealTimers();
  });
});
