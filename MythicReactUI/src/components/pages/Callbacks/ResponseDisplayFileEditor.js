import React from 'react';
import {gql, useLazyQuery, useMutation, useSubscription} from '@apollo/client';
import {Alert, Button, CircularProgress} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningOutlinedIcon from '@mui/icons-material/WarningOutlined';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {v4 as uuidv4} from 'uuid';
import {createTaskingMutation} from './CallbackMutations';
import {ResponseDisplayPlaintext} from './ResponseDisplayPlaintext';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import {MythicDialog} from '../../MythicComponents/MythicDialog';
import {UploadTaskFile} from '../../MythicComponents/MythicFileUpload';
import {mythicFetch} from '../../utilities/MythicConnection';
import {snackActions} from '../../utilities/Snackbar';
import {
  buildFileEditorRequest,
  FILE_EDITOR_REQUEST,
  FILE_EDITOR_RESPONSE,
  getReusableStagedEdit,
  MAX_FILE_EDITOR_SIZE,
  mergeFileEditorHistory,
  parseFileEditorMessage,
} from './FileEditorProtocol';
import {
  createFileEditorState,
  FileEditorOperation,
  FileEditorStateAction,
  fileEditorReducer,
} from './FileEditorState';
import {FileEditorStagedPreview} from './FileEditorStagedPreview';
import {b64DecodeUnicode} from "./ResponseDisplay";
import {getTextSyntaxForFilename} from "./ResponseDisplayMedia";

const fileEditorResponses = gql`
subscription fileEditorResponses($task_id: Int!) {
  response_stream(
    batch_size: 50,
    cursor: {initial_value: {id: 0}},
    where: {task_id: {_eq: $task_id}, interactive_task_type: {_in: [101, 102]}}
  ) {
    id
    response: response_text
    interactive_task_type
    timestamp
  }
}
`;

const fileEditorFile = gql`
query fileEditorFile($file_id: String!) {
  filemeta(where: {agent_file_id: {_eq: $file_id}}, limit: 1) {
    agent_file_id
    complete
    deleted
    filename_text
    full_remote_path_text
    sha1
    size
  }
}
`;

export const ResponseDisplayFileEditor = (props) => {
  const [editorState, dispatch] = React.useReducer(fileEditorReducer, undefined, createFileEditorState);
  const {
    document: {content, baseContent, filename, remotePath, expectedSHA1},
    activity: {operation, blockingError, agentError, showSnapshotRecovery},
    history: {items: history, selectedIndex: historyIndex},
    stagedPreview,
  } = editorState;
  const contentRef = React.useRef('');
  const historyRef = React.useRef([]);
  const highestResponseID = React.useRef(0);
  const snapshotLoadSequence = React.useRef(0);
  const stagedPreviewLoadSequence = React.useRef(0);
  const pendingRequests = React.useRef(new Map());
  const loading = operation === FileEditorOperation.LOADING;
  const saving = operation === FileEditorOperation.SAVING ||
    operation === FileEditorOperation.REFRESHING;
  const closing = operation === FileEditorOperation.CLOSING;
  const dirty = content !== baseContent;
  const taskReadOnly = Boolean(props.task?.completed);
  const viewingHistorical = historyIndex >= 0 && historyIndex < history.length - 1;
  const editorReadOnly = taskReadOnly || viewingHistorical;

  React.useEffect(() => {
    if(!loading || content !== ''){
      return undefined;
    }
    const timeoutID = window.setTimeout(() => dispatch({
      type: FileEditorStateAction.RECOVERY_TIMEOUT,
    }), 5000);
    return () => window.clearTimeout(timeoutID);
  }, [content, loading, props.task.id]);

  const [getFile] = useLazyQuery(fileEditorFile, {fetchPolicy: 'no-cache'});
  const [createTask] = useMutation(createTaskingMutation);

  const fetchEditorTextFile = React.useCallback(async (fileID, label) => {
    const {data} = await getFile({variables: {file_id: fileID}});
    const metadata = data?.filemeta?.[0];
    if(!metadata){
      throw new Error(`The ${label} is no longer available in Mythic.`);
    }
    if(!metadata.complete){
      throw new Error(`The ${label} has not finished uploading.`);
    }
    if(metadata.deleted){
      throw new Error(`The ${label} was deleted.`);
    }
    if(Number(metadata.size) > MAX_FILE_EDITOR_SIZE){
      throw new Error('Files larger than 2 MB cannot be edited.');
    }
    const response = await mythicFetch('/direct/view/' + fileID, {
      headers: {Authorization: `Bearer ${localStorage.getItem('access_token')}`},
    });
    if(response.status !== 200){
      throw new Error(`Failed to fetch the ${label} from Mythic.`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if(bytes.byteLength > MAX_FILE_EDITOR_SIZE){
      throw new Error('Files larger than 2 MB cannot be edited.');
    }
    let fileContent;
    try {
      fileContent = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    } catch (_error) {
      throw new Error('Only UTF-8 text files can be edited.');
    }
    return {content: fileContent, metadata};
  }, [getFile]);

  const loadSnapshot = React.useCallback(async (message, selectedIndex) => {
    const loadSequence = ++snapshotLoadSequence.current;
    if(!message?.file_id){
      dispatch({
        type: FileEditorStateAction.SNAPSHOT_LOAD_FAILED,
        error: 'The agent did not provide a file ID for the editor snapshot.',
      });
      return;
    }
    dispatch({
      type: FileEditorStateAction.SNAPSHOT_LOAD_STARTED,
      selectedIndex,
    });
    try {
      const {content: snapshot, metadata} = await fetchEditorTextFile(
        message.file_id,
        'editor snapshot',
      );
      if(loadSequence !== snapshotLoadSequence.current){
        return;
      }
      const pending = message.request_id ? pendingRequests.current.get(message.request_id) : null;
      const preserveNewerEdits = pending?.action === 'save' && pending.content !== undefined &&
        contentRef.current !== pending.content;
      if(!preserveNewerEdits){
        contentRef.current = snapshot;
      }
      dispatch({
        type: FileEditorStateAction.SNAPSHOT_LOAD_SUCCEEDED,
        content: snapshot,
        filename: b64DecodeUnicode(metadata.filename_text) || message.file_id,
        remotePath: b64DecodeUnicode(metadata.full_remote_path_text),
        expectedSHA1: metadata.sha1 || '',
        preserveLocalContent: preserveNewerEdits,
        responseID: message.response_id,
      });
      if(pending){
        pendingRequests.current.delete(message.request_id);
        if(pending.action === 'save'){
          snackActions.success(preserveNewerEdits ?
            'Saved; newer local edits are still unsaved.' : 'Saved file on the agent.');
        }
      }
    } catch (error) {
      if(loadSequence === snapshotLoadSequence.current){
        dispatch({
          type: FileEditorStateAction.SNAPSHOT_LOAD_FAILED,
          error: error.message || String(error),
        });
      }
    }
  }, [fetchEditorTextFile]);

  const handleMessages = React.useCallback((responses) => {
    const newResponses = [...(responses || [])]
      .sort((left, right) => left.id - right.id)
      .filter(response => response.id > highestResponseID.current);
    if(newResponses.length === 0){
      return;
    }
    const snapshots = [];
    const parsedResponses = [];
    newResponses.forEach((response) => {
      highestResponseID.current = response.id;
      const message = parseFileEditorMessage(response);
      if(!message){
        return;
      }
      const parsedResponse = {...message, response_id: response.id, timestamp: response.timestamp};
      parsedResponses.push(parsedResponse);
      if(message.type === FILE_EDITOR_RESPONSE){
        snapshots.push(parsedResponse);
        return;
      }
      const pending = message.request_id ? pendingRequests.current.get(message.request_id) : null;
      if(message.code === 'conflict'){
        parsedResponse.staged = pending || (message.file_id ? {
          action: 'save',
          fileID: message.file_id,
        } : null);
      }
      if(message.request_id){
        pendingRequests.current.delete(message.request_id);
      }
      const errorMessage = message.message || 'The agent could not update the file.';
      if(pending){
        snackActions.error(errorMessage);
      }
    });
    let nextHistory = historyRef.current;
    let selectedIndex;
    if(snapshots.length > 0){
      nextHistory = mergeFileEditorHistory(historyRef.current, snapshots);
      historyRef.current = nextHistory;
      selectedIndex = nextHistory.length - 1;
    }
    dispatch({
      type: FileEditorStateAction.RESPONSES_RECEIVED,
      history: nextHistory,
      selectedIndex,
      latestResponse: parsedResponses[parsedResponses.length - 1],
    });
    if(snapshots.length > 0){
      loadSnapshot(nextHistory[selectedIndex], selectedIndex);
    }
  }, [loadSnapshot]);

  useSubscription(fileEditorResponses, {
    variables: {task_id: props.task.id},
    fetchPolicy: 'no-cache',
    onData: ({data}) => handleMessages(data?.data?.response_stream || []),
    onError: (error) => {
      dispatch({
        type: FileEditorStateAction.SUBSCRIPTION_FAILED,
        error: 'Failed to subscribe to editor updates: ' + error.message,
      });
    },
  });

  const sendRequest = React.useCallback(async ({action, fileID, stagedContent, forceOverwrite=false}) => {
    const requestID = uuidv4();
    const request = buildFileEditorRequest({
      action,
      requestID,
      fileID,
      expectedSHA1: action === 'save' ?
        (forceOverwrite ? (agentError?.current_sha1 || expectedSHA1) : expectedSHA1) : undefined,
      forceOverwrite,
    });
    if(action === 'save' || action === 'refresh'){
      pendingRequests.current.set(requestID, {action, content: stagedContent, fileID});
    }
    const {data} = await createTask({variables: {
      callback_display_id: props.task.callback.display_id,
      command: props.task.command.cmd,
      params: JSON.stringify(request),
      files: fileID ? [fileID] : undefined,
      tasking_location: 'command_line',
      original_params: JSON.stringify(request),
      parameter_group_name: 'default',
      parent_task_display_id: props.task.display_id,
      is_interactive_task: true,
      interactive_task_type: FILE_EDITOR_REQUEST,
      resolve_task_references: false,
    }});
    if(data?.createTask?.status === 'error'){
      pendingRequests.current.delete(requestID);
      throw new Error(data.createTask.error || 'Failed to send the editor request.');
    }
  }, [agentError?.current_sha1, createTask, expectedSHA1, props.task]);

  const stageAndSave = React.useCallback(async ({forceOverwrite=false} = {}) => {
    if(editorReadOnly || saving){
      return;
    }
    dispatch({
      type: FileEditorStateAction.OPERATION_STARTED,
      operation: FileEditorOperation.SAVING,
    });
    try {
      let staged = forceOverwrite ? getReusableStagedEdit({
        conflict: agentError,
        currentContent: contentRef.current,
        dirty,
      }) : null;
      if(!staged){
        if(new TextEncoder().encode(contentRef.current).byteLength > MAX_FILE_EDITOR_SIZE){
          throw new Error('Files larger than 2 MB cannot be edited.');
        }
        const stagedFile = new File(
          [contentRef.current],
          filename || 'edited-file.txt',
          {type: 'text/plain;charset=utf-8'},
        );
        const fileID = await UploadTaskFile(
          stagedFile,
          `File edit staged for ${remotePath || filename || 'remote file'} from task ${props.task.display_id}`,
        );
        if(!fileID){
          throw new Error('Failed to stage the edited file in Mythic.');
        }
        staged = {action: 'save', content: contentRef.current, fileID};
      }
      await sendRequest({
        action: 'save',
        fileID: staged.fileID,
        stagedContent: staged.content,
        forceOverwrite,
      });
    } catch (error) {
      dispatch({type: FileEditorStateAction.OPERATION_FINISHED});
      snackActions.error(error.message || String(error));
    }
  }, [agentError, dirty, editorReadOnly, filename, props.task.display_id, remotePath, saving, sendRequest]);

  const closeStagedPreview = React.useCallback(() => {
    stagedPreviewLoadSequence.current += 1;
    dispatch({type: FileEditorStateAction.STAGED_PREVIEW_CLOSED});
  }, []);

  const openStagedPreview = React.useCallback(async () => {
    const loadSequence = ++stagedPreviewLoadSequence.current;
    const reusableStagedEdit = getReusableStagedEdit({
      conflict: agentError,
      currentContent: contentRef.current,
      dirty,
    });
    const stagedFileID = reusableStagedEdit?.fileID || '';
    dispatch({
      type: FileEditorStateAction.STAGED_PREVIEW_OPENED,
      fileID: stagedFileID,
      filename,
    });
    if(!reusableStagedEdit){
      dispatch({
        type: FileEditorStateAction.STAGED_PREVIEW_LOADED,
        content: contentRef.current,
        description: 'These are the current editor contents. They will be uploaded as a new staged file before the force overwrite.',
        filename,
      });
      return;
    }
    if(!stagedFileID && reusableStagedEdit.content !== undefined){
      dispatch({
        type: FileEditorStateAction.STAGED_PREVIEW_LOADED,
        content: reusableStagedEdit.content,
        description: 'These are the contents captured when this edit was staged.',
        filename,
      });
      return;
    }
    try {
      const {content: stagedContent, metadata} = await fetchEditorTextFile(
        stagedFileID,
        'staged edit',
      );
      if(loadSequence !== stagedPreviewLoadSequence.current){
        return;
      }
      dispatch({
        type: FileEditorStateAction.STAGED_PREVIEW_LOADED,
        content: stagedContent,
        description: 'This is the exact staged file stored in Mythic. Save anyway will send these contents to the agent.',
        fileID: stagedFileID,
        filename: b64DecodeUnicode(metadata.filename_text) || filename,
      });
    } catch (error) {
      if(loadSequence === stagedPreviewLoadSequence.current){
        dispatch({
          type: FileEditorStateAction.STAGED_PREVIEW_FAILED,
          error: error.message || String(error),
        });
      }
    }
  }, [agentError, dirty, fetchEditorTextFile, filename]);

  const forceOverwriteFromPreview = React.useCallback(() => {
    closeStagedPreview();
    stageAndSave({forceOverwrite: true});
  }, [closeStagedPreview, stageAndSave]);

  const refresh = React.useCallback(async () => {
    if(taskReadOnly || saving){
      return;
    }
    dispatch({
      type: FileEditorStateAction.OPERATION_STARTED,
      operation: FileEditorOperation.REFRESHING,
    });
    try {
      await sendRequest({action: 'refresh'});
    } catch (error) {
      dispatch({type: FileEditorStateAction.OPERATION_FINISHED});
      snackActions.error(error.message || String(error));
    }
  }, [saving, sendRequest, taskReadOnly]);

  const selectHistory = React.useCallback((nextIndex) => {
    if(dirty || loading || saving || nextIndex < 0 || nextIndex >= historyRef.current.length){
      return;
    }
    loadSnapshot(historyRef.current[nextIndex], nextIndex);
  }, [dirty, loadSnapshot, loading, saving]);

  const finishEditor = React.useCallback(async () => {
    if(taskReadOnly || dirty || loading || saving || closing){
      return;
    }
    dispatch({
      type: FileEditorStateAction.OPERATION_STARTED,
      operation: FileEditorOperation.CLOSING,
    });
    try {
      await sendRequest({action: 'close'});
    } catch (error) {
      dispatch({type: FileEditorStateAction.OPERATION_FINISHED});
      snackActions.error(error.message || String(error));
    }
  }, [closing, dirty, loading, saving, sendRequest, taskReadOnly]);

  React.useEffect(() => {
    if(props.task?.completed && closing){
      dispatch({type: FileEditorStateAction.OPERATION_FINISHED});
    }
  }, [closing, props.task?.completed]);

  const saveDisabledReason = taskReadOnly ? 'The task is complete; this editor is read-only.' :
    viewingHistorical ? 'Historical versions are read-only. Return to the latest version to edit.' :
    loading ? 'Waiting for the file snapshot.' :
    blockingError ? blockingError :
    saving ? 'Waiting for the agent.' :
    !dirty ? 'There are no unsaved changes.' : '';
  const historyNavigationDisabled = dirty || loading || saving;
  const doneDisabledReason = taskReadOnly ? 'The file editor task is already complete.' :
    dirty ? 'Save or discard your changes before finishing.' :
    loading ? 'Wait for the current snapshot to load.' :
    saving ? 'Wait for the current operation to finish.' :
    closing ? 'Finishing the file editor task.' : '';
  const toolbarActions = [
    <MythicStyledTooltip title={saveDisabledReason || 'Save changes on the agent'} key="save">
      <span>
        <button aria-label="Save file" className="mythic-response-render-action-button mythic-action-tone mythic-tone-success"
                disabled={Boolean(saveDisabledReason)} onClick={() => stageAndSave()} type="button">
          <SaveIcon fontSize="small" />
        </button>
      </span>
    </MythicStyledTooltip>,
    <MythicStyledTooltip title="Reload the current file from the agent" key="refresh">
      <span>
        <button aria-label="Refresh file" className="mythic-response-render-action-button"
                disabled={taskReadOnly || saving} onClick={refresh} type="button">
          <RefreshIcon fontSize="small" />
        </button>
      </span>
    </MythicStyledTooltip>,
    <MythicStyledTooltip title={dirty ? 'Save or discard changes before viewing history' : 'Previous file version'} key="history-previous">
      <span>
        <button aria-label="Previous file version" className="mythic-response-render-action-button"
                disabled={historyNavigationDisabled || historyIndex <= 0}
                onClick={() => selectHistory(historyIndex - 1)} type="button">
          <NavigateBeforeIcon fontSize="small" />
        </button>
      </span>
    </MythicStyledTooltip>,
    <MythicStyledTooltip title={dirty ? 'Save or discard changes before viewing history' : 'Next file version'} key="history-next">
      <span>
        <button aria-label="Next file version" className="mythic-response-render-action-button"
                disabled={historyNavigationDisabled || historyIndex < 0 || historyIndex >= history.length - 1}
                onClick={() => selectHistory(historyIndex + 1)} type="button">
          <NavigateNextIcon fontSize="small" />
        </button>
      </span>
    </MythicStyledTooltip>,
    <MythicStyledTooltip title={doneDisabledReason || 'Finish the file editor task'} key="done">
      <span>
        <button aria-label="Finish file editor" className="mythic-response-render-action-button mythic-action-tone mythic-tone-info"
                disabled={Boolean(doneDisabledReason)} onClick={finishEditor} type="button">
          <DoneAllIcon fontSize="small" />
        </button>
      </span>
    </MythicStyledTooltip>,
  ];

  const selectedHistoryTimestamp = historyIndex >= 0 ? history[historyIndex]?.timestamp : null;
  const historyNotice = history.length > 0 ?
    `Version ${historyIndex + 1} of ${history.length}${selectedHistoryTimestamp ? ` · ${new Date(selectedHistoryTimestamp).toLocaleString()}` : ''}` : '';
  const canForceOverwrite = Boolean(agentError?.staged?.fileID || agentError?.file_id || dirty);

  return (
    <div style={{display: 'flex', flex: '1 1 auto', flexDirection: 'column', height: '100%', minHeight: 0,
                 minWidth: 0, width: '100%'}} ref={props.responseRef}>
      {stagedPreview.open &&
        <MythicDialog
          maxWidth="lg"
          open={stagedPreview.open}
          onClose={closeStagedPreview}
          innerDialog={
            <FileEditorStagedPreview
              preview={stagedPreview}
              saving={saving}
              taskReadOnly={taskReadOnly}
              onClose={closeStagedPreview}
              onForceOverwrite={forceOverwriteFromPreview}
            />
          }
        />
      }
      {agentError?.code === 'conflict' &&
        <Alert severity="warning" icon={<WarningOutlinedIcon />} action={
          <>
            <Button color="inherit" disabled={taskReadOnly || saving} size="small" onClick={refresh}>Refresh</Button>
            {canForceOverwrite &&
              <Button color="inherit" disabled={taskReadOnly || saving} size="small"
                      startIcon={<VisibilityOutlinedIcon />} onClick={openStagedPreview}>Review staged edit</Button>
            }
            {canForceOverwrite &&
              <Button color="inherit" disabled={taskReadOnly || saving} size="small"
                      onClick={() => stageAndSave({forceOverwrite: true})}>Save anyway</Button>
            }
          </>
        }>
          {agentError.message || 'The file changed on disk after this editor snapshot was loaded.'}
        </Alert>
      }
      {agentError && agentError.code !== 'conflict' &&
        <Alert severity="error">{agentError.message || 'The agent could not update the file.'}</Alert>
      }
      {blockingError && <Alert severity="error">{blockingError}</Alert>}
      {taskReadOnly && <Alert severity="info">This task is complete. File history remains available in read-only mode.</Alert>}
      {loading && content === '' ?
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, flexGrow: 1}}>
          <CircularProgress size={28} />
          <span>Waiting for the agent's file snapshot…</span>
          {showSnapshotRecovery &&
            <Button disabled={taskReadOnly || saving} onClick={refresh} startIcon={<RefreshIcon />} variant="outlined">
              Request fresh snapshot
            </Button>
          }
        </div> :
        <ResponseDisplayPlaintext
          plaintext={content}
          task={props.task}
          expand={props.expand}
          initial_mode={getTextSyntaxForFilename(filename || remotePath)}
          autoFormat={false}
          readOnly={editorReadOnly || loading}
          toolbarTitle={remotePath || filename || 'File editor'}
          initial_show_options={true}
          toolbarActions={toolbarActions}
          toolbarNotice={
            <span style={{marginLeft: 6}}>
              {dirty ? 'Unsaved · ' : ''}{viewingHistorical ? 'Historical · ' : ''}{historyNotice}
            </span>
          }
          enableCredentialCreation={false}
          onChangeContent={(nextContent) => {
            contentRef.current = nextContent;
            dispatch({type: FileEditorStateAction.CONTENT_CHANGED, content: nextContent});
          }}
        />
      }
    </div>
  );
};
