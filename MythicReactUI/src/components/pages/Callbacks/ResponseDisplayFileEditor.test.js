import {
  buildFileEditorRequest,
  FILE_EDITOR_ERROR,
  FILE_EDITOR_REQUEST,
  FILE_EDITOR_RESPONSE,
  getReusableStagedEdit,
  mergeFileEditorHistory,
} from './FileEditorProtocol';
import {
  createFileEditorState,
  FileEditorOperation,
  FileEditorStateAction,
  fileEditorReducer,
} from './FileEditorState';

test('file editor message types use their reserved block', () => {
  expect(FILE_EDITOR_REQUEST).toBe(100);
  expect(FILE_EDITOR_RESPONSE).toBe(101);
  expect(FILE_EDITOR_ERROR).toBe(102);
});

test('force overwrite is only included when explicitly requested', () => {
  const normal = buildFileEditorRequest({
    action: 'save', requestID: 'one', fileID: 'file', expectedSHA1: 'old',
  });
  expect(normal).toEqual({
    action: 'save', request_id: 'one', file_id: 'file', expected_sha1: 'old',
  });
  expect(normal.force_overwrite).toBeUndefined();

  expect(buildFileEditorRequest({
    action: 'save', requestID: 'two', fileID: 'file', expectedSHA1: 'new', forceOverwrite: true,
  })).toEqual({
    action: 'save', request_id: 'two', file_id: 'file', expected_sha1: 'new', force_overwrite: true,
  });
});

test('refresh only uses action and request ID', () => {
  expect(buildFileEditorRequest({action: 'refresh', requestID: 'refresh-one'})).toEqual({
    action: 'refresh', request_id: 'refresh-one',
  });
});

test('file history is ordered and deduplicated by response ID', () => {
  expect(mergeFileEditorHistory(
    [{response_id: 3, file_id: 'three'}],
    [{response_id: 2, file_id: 'two'}, {response_id: 3, file_id: 'three-new'}],
  )).toEqual([
    {response_id: 2, file_id: 'two'},
    {response_id: 3, file_id: 'three-new'},
  ]);
});

test('a persisted agent error survives loading an older snapshot', () => {
  const snapshot = {
    type: FILE_EDITOR_RESPONSE,
    response_id: 10,
    file_id: 'snapshot-file',
  };
  const error = {
    type: FILE_EDITOR_ERROR,
    response_id: 11,
    code: 'write_failed',
    message: 'permission denied',
  };
  let state = fileEditorReducer(createFileEditorState(), {
    type: FileEditorStateAction.RESPONSES_RECEIVED,
    history: [snapshot],
    selectedIndex: 0,
    latestResponse: error,
  });
  state = fileEditorReducer(state, {
    type: FileEditorStateAction.SNAPSHOT_LOAD_STARTED,
    selectedIndex: 0,
  });
  state = fileEditorReducer(state, {
    type: FileEditorStateAction.SNAPSHOT_LOAD_SUCCEEDED,
    content: 'original contents',
    filename: 'test.py',
    remotePath: '/tmp/test.py',
    expectedSHA1: 'old-sha1',
    preserveLocalContent: false,
    responseID: snapshot.response_id,
  });

  expect(state.activity.operation).toBe(FileEditorOperation.IDLE);
  expect(state.activity.agentError).toEqual(error);
  expect(state.document.content).toBe('original contents');
});

test('a newer successful snapshot clears the prior agent error', () => {
  const error = {
    type: FILE_EDITOR_ERROR,
    response_id: 11,
    code: 'write_failed',
    message: 'permission denied',
  };
  const snapshot = {
    type: FILE_EDITOR_RESPONSE,
    response_id: 12,
    file_id: 'new-snapshot',
  };
  let state = fileEditorReducer(createFileEditorState(), {
    type: FileEditorStateAction.RESPONSES_RECEIVED,
    history: [],
    latestResponse: error,
  });
  state = fileEditorReducer(state, {
    type: FileEditorStateAction.RESPONSES_RECEIVED,
    history: [snapshot],
    selectedIndex: 0,
    latestResponse: snapshot,
  });

  expect(state.activity.agentError).toBeNull();
});

test('an upload-backed saved version preserves the known remote path', () => {
  let state = createFileEditorState();
  state = {
    ...state,
    document: {
      ...state.document,
      content: 'before',
      baseContent: 'before',
      filename: 'test.py',
      remotePath: '/tmp/test.py',
      expectedSHA1: 'old-sha1',
    },
  };

  state = fileEditorReducer(state, {
    type: FileEditorStateAction.SNAPSHOT_LOAD_SUCCEEDED,
    content: 'after',
    filename: 'test.py',
    remotePath: '',
    expectedSHA1: 'new-sha1',
    preserveLocalContent: false,
    responseID: 12,
  });

  expect(state.document).toEqual({
    content: 'after',
    baseContent: 'after',
    filename: 'test.py',
    remotePath: '/tmp/test.py',
    expectedSHA1: 'new-sha1',
  });
});

test('a conflict can reuse the staged file identified by the agent', () => {
  expect(getReusableStagedEdit({
    conflict: {code: 'conflict', file_id: 'staged-file'},
    currentContent: 'snapshot contents',
    dirty: false,
  })).toEqual({
    action: 'save',
    fileID: 'staged-file',
  });
});

test('new edits are uploaded instead of reusing a replayed conflict file', () => {
  expect(getReusableStagedEdit({
    conflict: {code: 'conflict', file_id: 'staged-file'},
    currentContent: 'newer local contents',
    dirty: true,
  })).toBeNull();
});

test('staged preview transitions are kept in the editor reducer', () => {
  let state = fileEditorReducer(createFileEditorState(), {
    type: FileEditorStateAction.STAGED_PREVIEW_OPENED,
    fileID: 'staged-file',
    filename: 'test.py',
  });
  expect(state.stagedPreview).toMatchObject({
    open: true,
    loading: true,
    fileID: 'staged-file',
  });

  state = fileEditorReducer(state, {
    type: FileEditorStateAction.STAGED_PREVIEW_LOADED,
    content: 'print("staged")',
    description: 'Exact staged file.',
  });
  expect(state.stagedPreview).toMatchObject({
    open: true,
    loading: false,
    content: 'print("staged")',
    description: 'Exact staged file.',
  });

  state = fileEditorReducer(state, {
    type: FileEditorStateAction.STAGED_PREVIEW_CLOSED,
  });
  expect(state.stagedPreview.open).toBe(false);
});
