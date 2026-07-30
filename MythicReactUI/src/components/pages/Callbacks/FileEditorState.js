import {FILE_EDITOR_ERROR, FILE_EDITOR_RESPONSE} from './FileEditorProtocol';

export const FileEditorOperation = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  SAVING: 'saving',
  REFRESHING: 'refreshing',
  CLOSING: 'closing',
});

export const FileEditorStateAction = Object.freeze({
  CONTENT_CHANGED: 'content_changed',
  OPERATION_STARTED: 'operation_started',
  OPERATION_FINISHED: 'operation_finished',
  RECOVERY_TIMEOUT: 'recovery_timeout',
  RESPONSES_RECEIVED: 'responses_received',
  SNAPSHOT_LOAD_STARTED: 'snapshot_load_started',
  SNAPSHOT_LOAD_SUCCEEDED: 'snapshot_load_succeeded',
  SNAPSHOT_LOAD_FAILED: 'snapshot_load_failed',
  STAGED_PREVIEW_OPENED: 'staged_preview_opened',
  STAGED_PREVIEW_LOADED: 'staged_preview_loaded',
  STAGED_PREVIEW_FAILED: 'staged_preview_failed',
  STAGED_PREVIEW_CLOSED: 'staged_preview_closed',
  SUBSCRIPTION_FAILED: 'subscription_failed',
});

export const createFileEditorState = () => ({
  document: {
    content: '',
    baseContent: '',
    filename: '',
    remotePath: '',
    expectedSHA1: '',
  },
  activity: {
    operation: FileEditorOperation.LOADING,
    blockingError: '',
    agentError: null,
    showSnapshotRecovery: false,
  },
  history: {
    items: [],
    selectedIndex: -1,
  },
  stagedPreview: {
    open: false,
    loading: false,
    content: '',
    description: '',
    error: '',
    fileID: '',
    filename: '',
  },
});

const errorWasSupersededBy = (error, responseID) => {
  if(!error || !responseID || !error.response_id){
    return false;
  }
  return responseID > error.response_id;
};

export const fileEditorReducer = (state, action) => {
  switch(action.type){
    case FileEditorStateAction.CONTENT_CHANGED:
      return {
        ...state,
        document: {...state.document, content: action.content},
      };
    case FileEditorStateAction.OPERATION_STARTED:
      return {
        ...state,
        activity: {
          ...state.activity,
          operation: action.operation,
          blockingError: '',
          showSnapshotRecovery: false,
        },
      };
    case FileEditorStateAction.OPERATION_FINISHED:
      return {
        ...state,
        activity: {...state.activity, operation: FileEditorOperation.IDLE},
      };
    case FileEditorStateAction.RECOVERY_TIMEOUT:
      if(state.activity.operation !== FileEditorOperation.LOADING || state.document.content !== ''){
        return state;
      }
      return {
        ...state,
        activity: {...state.activity, showSnapshotRecovery: true},
      };
    case FileEditorStateAction.RESPONSES_RECEIVED: {
      const latestResponse = action.latestResponse;
      let agentError = state.activity.agentError;
      let operation = state.activity.operation;
      if(latestResponse?.type === FILE_EDITOR_ERROR){
        agentError = latestResponse;
        operation = FileEditorOperation.IDLE;
      } else if(latestResponse?.type === FILE_EDITOR_RESPONSE &&
                errorWasSupersededBy(agentError, latestResponse.response_id)){
        agentError = null;
      }
      return {
        ...state,
        activity: {
          ...state.activity,
          operation,
          agentError,
          showSnapshotRecovery: false,
        },
        history: {
          items: action.history,
          selectedIndex: action.selectedIndex === undefined ?
            state.history.selectedIndex : action.selectedIndex,
        },
        stagedPreview: latestResponse ? {
          ...state.stagedPreview,
          open: false,
        } : state.stagedPreview,
      };
    }
    case FileEditorStateAction.SNAPSHOT_LOAD_STARTED:
      return {
        ...state,
        activity: {
          ...state.activity,
          operation: FileEditorOperation.LOADING,
          blockingError: '',
          showSnapshotRecovery: false,
        },
        history: action.selectedIndex === undefined ? state.history : {
          ...state.history,
          selectedIndex: action.selectedIndex,
        },
      };
    case FileEditorStateAction.SNAPSHOT_LOAD_SUCCEEDED:
      return {
        ...state,
        document: {
          content: action.preserveLocalContent ? state.document.content : action.content,
          baseContent: action.content,
          filename: action.filename,
          remotePath: action.remotePath || state.document.remotePath,
          expectedSHA1: action.expectedSHA1,
        },
        activity: {
          ...state.activity,
          operation: FileEditorOperation.IDLE,
          blockingError: '',
          agentError: errorWasSupersededBy(state.activity.agentError, action.responseID) ?
            null : state.activity.agentError,
          showSnapshotRecovery: false,
        },
      };
    case FileEditorStateAction.SNAPSHOT_LOAD_FAILED:
      return {
        ...state,
        activity: {
          ...state.activity,
          operation: FileEditorOperation.IDLE,
          blockingError: action.error,
          showSnapshotRecovery: false,
        },
      };
    case FileEditorStateAction.STAGED_PREVIEW_OPENED:
      return {
        ...state,
        stagedPreview: {
          open: true,
          loading: true,
          content: '',
          description: '',
          error: '',
          fileID: action.fileID || '',
          filename: action.filename || '',
        },
      };
    case FileEditorStateAction.STAGED_PREVIEW_LOADED:
      return {
        ...state,
        stagedPreview: {
          ...state.stagedPreview,
          loading: false,
          content: action.content,
          description: action.description,
          error: '',
          fileID: action.fileID || state.stagedPreview.fileID,
          filename: action.filename || state.stagedPreview.filename,
        },
      };
    case FileEditorStateAction.STAGED_PREVIEW_FAILED:
      return {
        ...state,
        stagedPreview: {
          ...state.stagedPreview,
          loading: false,
          content: '',
          error: action.error,
        },
      };
    case FileEditorStateAction.STAGED_PREVIEW_CLOSED:
      return {
        ...state,
        stagedPreview: {
          ...state.stagedPreview,
          open: false,
        },
      };
    case FileEditorStateAction.SUBSCRIPTION_FAILED:
      return {
        ...state,
        activity: {
          ...state.activity,
          operation: FileEditorOperation.IDLE,
          blockingError: action.error,
          showSnapshotRecovery: false,
        },
      };
    default:
      return state;
  }
};
