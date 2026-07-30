export const FILE_EDITOR_REQUEST = 100;
export const FILE_EDITOR_RESPONSE = 101;
export const FILE_EDITOR_ERROR = 102;
export const MAX_FILE_EDITOR_SIZE = 2000000;

const decodeResponse = (encoded) => {
  const binary = window.atob(encoded || '');
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const parseFileEditorMessage = (response) => {
  if(response?.interactive_task_type !== FILE_EDITOR_RESPONSE &&
      response?.interactive_task_type !== FILE_EDITOR_ERROR){
    return null;
  }
  try {
    return {
      type: response.interactive_task_type,
      ...JSON.parse(decodeResponse(response.response)),
    };
  } catch (_error) {
    return null;
  }
};

export const buildFileEditorRequest = ({action, requestID, fileID, expectedSHA1, forceOverwrite=false}) => {
  const request = {
    action,
    request_id: requestID,
  };
  if(fileID){
    request.file_id = fileID;
  }
  if(expectedSHA1){
    request.expected_sha1 = expectedSHA1;
  }
  if(forceOverwrite){
    request.force_overwrite = true;
  }
  return request;
};

export const mergeFileEditorHistory = (existing, incoming) => {
  const snapshots = new Map((existing || []).map(snapshot => [snapshot.response_id, snapshot]));
  (incoming || []).forEach(snapshot => snapshots.set(snapshot.response_id, snapshot));
  return Array.from(snapshots.values()).sort((left, right) => left.response_id - right.response_id);
};

export const getReusableStagedEdit = ({conflict, currentContent, dirty}) => {
  const staged = conflict?.staged || (conflict?.file_id ? {
    action: 'save',
    fileID: conflict.file_id,
  } : null);
  if(!staged?.fileID){
    return null;
  }
  if(staged.content !== undefined){
    return staged.content === currentContent ? staged : null;
  }
  return dirty ? null : staged;
};
