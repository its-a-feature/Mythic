import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {
    FileCopySwitcher,
    FileLocationSection,
    FileMetaInspector,
    getAvailableSelectedFileID,
    getFileStatus,
} from './FileMetaInspector';

jest.mock('@apollo/client', () => {
    const actual = jest.requireActual('@apollo/client');
    return {
        ...actual,
        useMutation: () => [jest.fn()],
    };
});
jest.mock('../../utilities/Time', () => ({
    toLocalTime: (value) => `local:${value}`,
}));
jest.mock('../../MythicComponents/MythicTag', () => ({
    TagsDisplay: () => <span>Tag display</span>,
    ViewEditTags: () => <button type="button">Edit tags</button>,
}));
jest.mock('../../MythicComponents/MythicDialog', () => ({
    MythicDialog: () => null,
    MythicModifyStringDialog: () => null,
}));
jest.mock('../../MythicComponents/MythicActionButton', () => ({
    MythicActionButton: ({onClick, tooltip}) => <button type="button" onClick={onClick}>{tooltip}</button>,
}));
jest.mock('../../MythicComponents/MythicChip', () => ({
    MythicChip: ({label}) => <span>{label}</span>,
}));
jest.mock('../Payloads/HostFileDialog', () => ({
    HostFileDialog: () => null,
    HostedFileLocationsTable: () => <div>Hosted locations</div>,
}));
jest.mock('../../utilities/FileDownloadWithAuth', () => ({
    FileDownloadLinkWithAuth: ({children, href}) => <a href={href}>{children}</a>,
}));
jest.mock('../Callbacks/ResponseDisplayTable', () => ({
    getStringSize: ({cellData}) => `${cellData.plaintext} bytes`,
}));

const baseFile = (overrides = {}) => ({
    id: 1,
    agent_file_id: "selected-uuid",
    filename_text: "selected.txt",
    full_remote_path_text: "/tmp/selected.txt",
    host: "SELECTED-HOST",
    size: 12,
    chunks_received: 1,
    total_chunks: 1,
    complete: true,
    deleted: false,
    comment: "selected file comment",
    transfer_type: "chunk",
    ...overrides,
});

const copiedFile = (overrides = {}) => baseFile({
    task: {
        display_id: 8,
        callback: {display_id: 7, mythictree_groups: ["selected-group"]},
        command: {cmd: "selected-command"},
    },
    copy_of_file: baseFile({
        id: 2,
        agent_file_id: "original-uuid",
        filename_text: "original.txt",
        full_remote_path_text: "/original/original.txt",
        host: "ORIGINAL-HOST",
        md5: "original-md5",
        sha1: "original-sha1",
        timestamp: "2026-07-27T12:00:00",
        operator: {username: "original-operator"},
        comment: "original file comment",
        task: {
            display_id: 22,
            comment: "original task comment",
            callback: {display_id: 11, mythictree_groups: ["original-group"]},
            command: {cmd: "original-command"},
        },
    }),
    ...overrides,
});

const clickRecord = (container, label) => {
    const button = [...container.querySelectorAll(".mythic-file-copy-node")]
        .find((node) => node.textContent.includes(label));
    act(() => {
        button.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    });
};

describe("file search selection", () => {
    test("selects the first file when there is no current selection", () => {
        expect(getAvailableSelectedFileID([{id: 3}, {id: 4}], null)).toBe(3);
    });

    test("preserves an available selection and falls back after deletion", () => {
        expect(getAvailableSelectedFileID([{id: 3}, {id: 4}], 4)).toBe(4);
        expect(getAvailableSelectedFileID([{id: 3}], 4)).toBe(3);
        expect(getAvailableSelectedFileID([], 4)).toBeNull();
    });
});

describe("file status", () => {
    test("distinguishes complete, incomplete, and deleted files", () => {
        expect(getFileStatus(baseFile())).toEqual({label: "Complete", tone: "success"});
        expect(getFileStatus(baseFile({complete: false, chunks_received: 2, total_chunks: 5}))).toEqual({
            label: "40 %",
            tone: "warning",
        });
        expect(getFileStatus(baseFile({deleted: true}))).toEqual({label: "Deleted", tone: "error"});
    });
});

describe("file inspector content", () => {
    test.each([
        ["upload", ["Source file", "Destination host", "Destination path"]],
        ["download", ["Remote path", "Host"]],
        ["screenshot", ["Filename", "Host"]],
        ["eventing", ["Source file", "Workflow"]],
    ])("renders explicit %s location fields", (kind, labels) => {
        const view = renderToStaticMarkup(
            <FileLocationSection
                kind={kind}
                file={baseFile({eventgroup: {id: 7, name: "Daily workflow"}})}
            />
        );
        labels.forEach((label) => expect(view).toContain(label));
    });

    test("renders the directional copy relationship without inline original metadata", () => {
        const view = renderToStaticMarkup(
            <FileCopySwitcher file={copiedFile()} activeRecord="selected" onChange={() => {}} />
        );

        expect(view).toContain("This file");
        expect(view).toContain("copy of");
        expect(view).toContain("Tracked original");
        expect(view.indexOf("This file")).toBeLessThan(view.indexOf("copy of"));
        expect(view.indexOf("copy of")).toBeLessThan(view.indexOf("Tracked original"));
        expect(view).toContain("original.txt");
        expect(view).not.toContain("original-uuid");
    });

    test("omits the relationship switcher when there is no tracked original", () => {
        expect(renderToStaticMarkup(
            <FileCopySwitcher file={baseFile()} activeRecord="selected" onChange={() => {}} />
        )).toBe("");
    });
});

describe("copy relationship inspector", () => {
    let container;
    let root;

    beforeAll(() => {
        global.IS_REACT_ACT_ENVIRONMENT = true;
    });

    afterAll(() => {
        delete global.IS_REACT_ACT_ENVIRONMENT;
    });

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    const renderInspector = (file) => {
        // createRoot is not a Testing Library render helper and needs act to flush effects.
        // eslint-disable-next-line testing-library/no-unnecessary-act
        act(() => {
            root.render(
                <FileMetaInspector
                    file={file}
                    kind="download"
                    me={{user: {view_utc_time: false}}}
                    onEditComment={() => {}}
                />
            );
        });
    };

    test("defaults to the selected file and switches to an isolated original view", () => {
        renderInspector(copiedFile());
        const recordButtons = [...container.querySelectorAll(".mythic-file-copy-node")];

        expect(recordButtons[0].getAttribute("aria-pressed")).toBe("true");
        expect(recordButtons[1].getAttribute("aria-pressed")).toBe("false");
        expect(container.textContent).toContain("selected-command");
        expect(container.textContent).toContain("Edit file comment");
        expect(container.textContent).toContain("Tags");
        expect(container.textContent).toContain("C2 Hosting");
        expect(container.textContent).not.toContain("original-uuid");

        clickRecord(container, "Tracked original");

        expect(recordButtons[0].getAttribute("aria-pressed")).toBe("false");
        expect(recordButtons[1].getAttribute("aria-pressed")).toBe("true");
        expect(container.textContent).toContain("original-uuid");
        expect(container.textContent).toContain("original-command");
        expect(container.textContent).toContain("original-group");
        expect(container.textContent).toContain("original file comment");
        expect(container.textContent).not.toContain("selected-command");
        expect(container.textContent).not.toContain("Edit file comment");
        expect(container.textContent).not.toContain("Tags");
        expect(container.textContent).not.toContain("C2 Hosting");
        expect(container.querySelector('a[href="/direct/download/original-uuid"]')).not.toBeNull();

        clickRecord(container, "This file");

        expect(container.textContent).toContain("selected-command");
        expect(container.textContent).toContain("Edit file comment");
        expect(container.textContent).toContain("Tags");
        expect(container.textContent).toContain("C2 Hosting");
        expect(container.textContent).not.toContain("original-uuid");
    });

    test.each([
        ["incomplete", {complete: false, deleted: false, chunks_received: 2, total_chunks: 5}],
        ["deleted", {complete: true, deleted: true}],
    ])("does not link a %s tracked original for download", (_label, originalState) => {
        const file = copiedFile({
            copy_of_file: {
                ...copiedFile().copy_of_file,
                ...originalState,
            },
        });
        renderInspector(file);
        clickRecord(container, "Tracked original");

        expect(container.querySelector('a[href="/direct/download/original-uuid"]')).toBeNull();
    });

    test("renders an original without a task", () => {
        const file = copiedFile({
            copy_of_file: {
                ...copiedFile().copy_of_file,
                task: null,
            },
        });
        renderInspector(file);
        clickRecord(container, "Tracked original");

        expect(container.textContent).toContain("original-uuid");
        expect(container.textContent).toContain("Source Context");
    });

    test("resets to the selected record when the row or copy relationship changes", () => {
        renderInspector(copiedFile());
        clickRecord(container, "Tracked original");
        expect(container.textContent).toContain("original-uuid");

        renderInspector(copiedFile({
            id: 3,
            agent_file_id: "next-selected-uuid",
            filename_text: "next-selected.txt",
            task: {command: {cmd: "next-selected-command"}},
        }));

        expect(container.textContent).toContain("next-selected-command");
        expect(container.textContent).not.toContain("original-uuid");

        renderInspector(baseFile({
            id: 3,
            agent_file_id: "next-selected-uuid",
            filename_text: "next-selected.txt",
            task: {command: {cmd: "next-selected-command"}},
        }));

        expect(container.querySelector(".mythic-file-copy-switcher")).toBeNull();
        expect(container.textContent).toContain("next-selected-command");
    });
});
