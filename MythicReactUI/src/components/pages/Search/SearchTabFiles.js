import {MythicSearchTabLabel, MythicTabPanel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import AttachmentIcon from '@mui/icons-material/Attachment';
import {gql} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import {
    FileMetaDownloadTable,
    FileMetaEventingWorkflowsTable,
    HostedFileTable,
    FileMetaScreenshotTable,
    FileMetaUploadTable
} from './FileMetaTable';
import {FileBrowserTable} from './FileBrowserTable';
import MenuItem from '@mui/material/MenuItem';
import {UploadTaskFile} from '../../MythicComponents/MythicFileUpload';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BackupIcon from '@mui/icons-material/Backup';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import {MythicTablePagination} from "../../MythicComponents/MythicTablePagination";
import {MythicSearchField, MythicTableToolbar, MythicTableToolbarGroup, MythicToolbarButton, MythicToolbarSelect, MythicToolbarToggle} from "../../MythicComponents/MythicTableToolbar";
import {MythicSearchEmptyState} from "../../MythicComponents/MythicStateDisplay";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {MythicDraggableDialogTitle} from "../../MythicComponents/MythicDraggableDialogTitle";
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";

const fileMetaFragment = gql`
fragment filemetaData on filemeta{
    agent_file_id
    chunk_size
    size
    chunks_received
    complete
    deleted
    filename_text
    full_remote_path_text
    host
    id
    is_download_from_agent
    is_payload
    is_screenshot
    md5
    operator {
        id
        username
    }
    comment
    sha1
    timestamp
    total_chunks
    tags {
        tagtype {
            name
            color
            id
          }
        id
    }
    c2profile_file_hosts {
        id
        c2_profile_id
        host_url
        alert_on_download
        status
        error
        updated_at
        c2profile {
            id
            name
        }
    }
    task {
        id
        display_id
        comment
        callback {
            id
            display_id
            mythictree_groups
        }
        command {
            cmd
            id
        }
    }
    eventgroup {
      name
      id
    }
    copy_of_file {
        agent_file_id
        size
        chunks_received
        complete
        deleted
        filename_text
        full_remote_path_text
        host
        md5
        operator {
            id
            username
        }
        comment
        sha1
        md5
        timestamp
        total_chunks
        task {
            id
            display_id
            comment
            callback {
                id
                display_id
                mythictree_groups
            }
            command {
                cmd
                id
            }
        }
    }
}
`;
const mythictreeFragment = gql`
fragment mythictreeData on mythictree{
    comment
    deleted
    full_path_text
    host
    id
    metadata
    task {
        display_id
        id
    }
    callback {
        id
        display_id
        mythictree_groups
    }
    can_have_children
    tags {
        tagtype {
            name
            color
            id
          }
        id
    }
    filemeta {
        id
        agent_file_id
        chunks_received
        complete
        size
        total_chunks
        timestamp
        task {
            id
            comment
            display_id
            callback {
                id
                display_id
                mythictree_groups
            }
        }
    }
}
`;
const fetchLimit = 20;
const filenameFileMetaUploadSearch = gql`
${fileMetaFragment}
query filenameFileMetaUploadQuery($operation_id: Int!, $filename: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, eventgroup_id: {_is_null: true}, _and: [{_or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, eventgroup_id: {_is_null: true},  _and: [{_or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
}
`;
const filenameFileMetaDownloadSearch = gql`
${fileMetaFragment}
query filenameFileMetaDownloadQuery($operation_id: Int!, $filename: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host},deleted: {_eq: $deleted}, _or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host},deleted: {_eq: $deleted}, _or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const filenameFileBrowserSearch = gql`
${mythictreeFragment}
query filenameFileBrowserQuery($operation_id: Int!, $filename: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    mythictree_aggregate(distinct_on: id, where: {full_path_text: {_ilike: $filename}, host: {_ilike: $host}, deleted: {_eq: $deleted}, operation_id: {_eq: $operation_id}, tree_type: {_eq: "file"}}) {
      aggregate {
        count
      }
    }
    mythictree(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, full_path_text: {_ilike: $filename}, operation_id: {_eq: $operation_id}, tree_type: {_eq: "file"}}) {
      ...mythictreeData
    }
  }
`;
const filenameFileMetaScreenshotSearch = gql`
${fileMetaFragment}
query filenameFileMetaScreenshotQuery($operation_id: Int!, $filename: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, _and: [{_or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true},task_id: {_is_null: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, _and: [{_or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true}}) {
      ...filemetaData
    }
  }
`;
const filenameFileMetaEventingWorkflowSearch = gql`
${fileMetaFragment}
query filenameFileMetaEventingWorkflowQuery($filename: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {deleted: {_eq: $deleted}, _or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}], eventgroup_id: {_is_null: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {deleted: {_eq: $deleted}, _or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}], eventgroup_id: {_is_null: false}}) {
      ...filemetaData
    }
}
`;
const hashFileMetaUploadSearch = gql`
${fileMetaFragment}
query hashFileMetaUploadQuery($operation_id: Int!, $hash: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, eventgroup_id: {_is_null: true},  _and: [{_or: [{md5: {_ilike: $hash}}, {sha1: {_ilike: $hash}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, eventgroup_id: {_is_null: true},  _and: [{_or: [{md5: {_ilike: $hash}}, {sha1: {_ilike: $hash}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const hashFileMetaDownloadSearch = gql`
${fileMetaFragment}
query hashFileMetaDownloadQuery($operation_id: Int!, $hash: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, _or: [{md5: {_ilike: $hash}}, {sha1: {_ilike: $hash}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, _or: [{md5: {_ilike: $hash}}, {sha1: {_ilike: $hash}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const hashFileMetaScreenshotSearch = gql`
${fileMetaFragment}
query hashFileMetaScreenshotQuery($operation_id: Int!, $hash: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, _and: [{_or: [{md5: {_ilike: $hash}}, {sha1: {_ilike: $hash}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, _and: [{_or: [{md5: {_ilike: $hash}}, {sha1: {_ilike: $hash}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true}}) {
      ...filemetaData
    }
  }
`;
const commentFileMetaUploadSearch = gql`
${fileMetaFragment}
query commentFileMetaUploadQuery($operation_id: Int!, $comment: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, eventgroup_id: {_is_null: true},  comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, eventgroup_id: {_is_null: true},  comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const commentFileMetaDownloadSearch = gql`
${fileMetaFragment}
query hashFileMetaDownloadQuery($operation_id: Int!, $comment: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const commentFileBrowserSearch = gql`
${mythictreeFragment}
query filenameFileBrowserQuery($operation_id: Int!, $comment: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    mythictree_aggregate(distinct_on: id, where: {comment: {_ilike: $comment}, host: {_ilike: $host}, deleted: {_eq: $deleted}, operation_id: {_eq: $operation_id}, tree_type: {_eq: "file"}}) {
      aggregate {
        count
      }
    }
    mythictree(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, tree_type: {_eq: "file"}}) {
      ...mythictreeData
    }
  }
`;
const commentFileMetaScreenshotSearch = gql`
${fileMetaFragment}
query commentFileMetaScreenshotQuery($operation_id: Int!, $comment: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true}}) {
      ...filemetaData
    }
  }
`;
const tagFileMetaUploadSearch = gql`
${fileMetaFragment}
query tagFileMetaUploadQuery($tag: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    tag_aggregate(distinct_on: filemeta_id, where: {filemeta_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], filemetum: {host: {_ilike: $host}, deleted: {_eq: $deleted}, eventgroup_id: {_is_null: true},  is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: filemeta_id, offset: $offset, order_by: {filemeta_id: desc}, where: {filemeta_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], filemetum: {host: {_ilike: $host}, deleted: {_eq: $deleted}, eventgroup_id: {_is_null: true},  is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}}) {
      filemetum{
        ...filemetaData
      }
    }
  }
`;
const tagFileMetaDownloadSearch = gql`
${fileMetaFragment}
query tagFileMetaDownloadQuery($tag: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    tag_aggregate(distinct_on: filemeta_id, where: {filemeta_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], filemetum: {host: {_ilike: $host}, deleted: {_eq: $deleted}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: filemeta_id, offset: $offset, order_by: {filemeta_id: desc}, where: {filemeta_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], filemetum: {host: {_ilike: $host}, deleted: {_eq: $deleted}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}}) {
      filemetum {
        ...filemetaData
      }
      
    }
  }
`;
const tagFileBrowserSearch = gql`
${mythictreeFragment}
query tagFileBrowserQuery($tag: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    tag_aggregate(distinct_on: mythictree_id, where: {mythictree_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], mythictree: {host: {_ilike: $host}, deleted: {_eq: $deleted}, tree_type: {_eq: "file"}}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: mythictree_id, offset: $offset, order_by: {mythictree_id: desc}, where: {mythictree_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], mythictree: {host: {_ilike: $host}, deleted: {_eq: $deleted}, tree_type: {_eq: "file"}}}) {
      mythictree {
        ...mythictreeData
      }
      
    }
  }
`;
const tagFileMetaScreenshotSearch = gql`
${fileMetaFragment}
query tagFileMetaScreenshotQuery($tag: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    tag_aggregate(distinct_on: filemeta_id, where: {filemeta_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], filemetum: {host: {_ilike: $host}, deleted: {_eq: $deleted}, is_screenshot: {_eq: true}}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: filemeta_id, offset: $offset, order_by: {filemeta_id: desc}, where: {filemeta_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], filemetum: {host: {_ilike: $host}, deleted: {_eq: $deleted}, is_screenshot: {_eq: true}}}) {
      filemetum{
        ...filemetaData
      }
    }
  }
`;
const uuidFileMetaUploadSearch = gql`
${fileMetaFragment}
query uuidFileMetaUploadQuery($operation_id: Int!, $agent_file_id: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, eventgroup_id: {_is_null: true},  agent_file_id: {_ilike: $agent_file_id}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, eventgroup_id: {_is_null: true},  agent_file_id: {_ilike: $agent_file_id}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
}
`;
const uuidFileMetaDownloadSearch = gql`
${fileMetaFragment}
query uuidFileMetaDownloadQuery($operation_id: Int!, $agent_file_id: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, agent_file_id: {_ilike: $agent_file_id}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, agent_file_id: {_ilike: $agent_file_id}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const uuidFileMetaScreenshotSearch = gql`
${fileMetaFragment}
query uuidFileMetaScreenshotQuery($operation_id: Int!, $agent_file_id: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, agent_file_id: {_ilike: $agent_file_id}, _or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true},task_id: {_is_null: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, agent_file_id: {_ilike: $agent_file_id}, _or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true}}) {
      ...filemetaData
    }
  }
`;
const uuidFileMetaEventingWorkflowSearch = gql`
${fileMetaFragment}
query uuidFileMetaEventingWorkflowQuery($operation_id: Int!, $agent_file_id: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, agent_file_id: {_ilike: $agent_file_id}, is_payload: {_eq: false}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false},task_id: {_is_null: true}, eventgroup_id: {_is_null: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, deleted: {_eq: $deleted}, agent_file_id: {_ilike: $agent_file_id}, is_payload: {_eq: false}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}, eventgroup_id: {_is_null: false}}) {
      ...filemetaData
    }
  }
`;
const hostedFileSearch = gql`
${fileMetaFragment}
query hostedFileQuery($operation_id: Int!, $search: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    c2profile_file_host_aggregate(where: {operation_id: {_eq: $operation_id}, filemetum: {host: {_ilike: $host}, deleted: {_eq: $deleted}}, _or: [{host_url: {_ilike: $search}}, {c2profile: {name: {_ilike: $search}}}, {filemetum: {filename_utf8: {_ilike: $search}}}, {filemetum: {full_remote_path_utf8: {_ilike: $search}}}, {filemetum: {agent_file_id: {_ilike: $search}}}, {filemetum: {md5: {_ilike: $search}}}, {filemetum: {sha1: {_ilike: $search}}}, {filemetum: {comment: {_ilike: $search}}}]}) {
      aggregate {
        count
      }
    }
    c2profile_file_host(limit: $fetchLimit, offset: $offset, order_by: {id: desc}, where: {operation_id: {_eq: $operation_id}, filemetum: {host: {_ilike: $host}, deleted: {_eq: $deleted}}, _or: [{host_url: {_ilike: $search}}, {c2profile: {name: {_ilike: $search}}}, {filemetum: {filename_utf8: {_ilike: $search}}}, {filemetum: {full_remote_path_utf8: {_ilike: $search}}}, {filemetum: {agent_file_id: {_ilike: $search}}}, {filemetum: {md5: {_ilike: $search}}}, {filemetum: {sha1: {_ilike: $search}}}, {filemetum: {comment: {_ilike: $search}}}]}) {
        id
        c2_profile_id
        host_url
        alert_on_download
        status
        error
        updated_at
        c2profile {
            id
            name
        }
        filemetum {
            ...filemetaData
        }
    }
}
`;

export function SearchTabFilesLabel(props) {
    return (
        <MythicSearchTabLabel label={"Files"} iconComponent={<AttachmentIcon/>} {...props}/>
    )
}

const newTextFileSyntaxMap = {
    "json": "json",
    "md": "markdown",
    "markdown": "markdown",
    "py": "python",
    "ps1": "powershell",
    "sh": "sh",
    "bash": "sh",
    "zsh": "sh",
    "js": "javascript",
    "go": "golang",
    "yml": "yaml",
    "yaml": "yaml",
    "toml": "toml",
    "ini": "ini",
    "conf": "apache_conf",
    "html": "html",
    "xml": "html",
};
const getNewTextFileSyntax = (filename) => {
    if(!filename){
        return "html";
    }
    const pieces = filename.split(".");
    const extension = pieces.length > 1 ? pieces[pieces.length - 1].toLowerCase() : filename.toLowerCase();
    return newTextFileSyntaxMap[extension] || "html";
}

const CreateTextFileDialog = ({onClose}) => {
    const [filename, setFilename] = React.useState("new-file.txt");
    const [content, setContent] = React.useState("");
    const [uploading, setUploading] = React.useState(false);
    const initialMode = React.useMemo(() => getNewTextFileSyntax(filename), [filename]);
    const onSave = async (event) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        const trimmedFilename = filename.trim();
        if(trimmedFilename === ""){
            snackActions.warning("Filename is required");
            return;
        }
        setUploading(true);
        try{
            const newFile = new File([content], trimmedFilename, {type: "text/plain;charset=utf-8"});
            const newUUID = await UploadTaskFile(newFile, "Manually created text file");
            if(newUUID){
                snackActions.success("Successfully created text file. It's available in 'uploads'");
                onClose();
            }
        }finally{
            setUploading(false);
        }
    }
    return (
        <React.Fragment>
            <MythicDraggableDialogTitle>
                Create Text File
            </MythicDraggableDialogTitle>
            <DialogContent style={{height: "calc(75vh)", display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "8px"}}>
                <TextField
                    label="Filename"
                    margin="dense"
                    size="small"
                    value={filename}
                    onChange={(event) => setFilename(event.target.value)}
                    onKeyDown={(event) => {
                        if(event.key === "Enter" && (event.metaKey || event.ctrlKey)){
                            onSave(event);
                        }
                    }}
                />
                <div style={{flexGrow: 1, minHeight: 0}}>
                    <ResponseDisplayPlaintext
                        plaintext={content}
                        expand={true}
                        autoFormat={false}
                        toolbarTitle={"Text"}
                        initial_show_options={true}
                        initial_mode={initialMode}
                        credentialMetadata={{
                            filename: filename.trim(),
                            source: "manual_text_file",
                        }}
                        onChangeContent={setContent}
                    />
                </div>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onClose} disabled={uploading}>
                    Close
                </Button>
                <Button variant="contained" color="primary" onClick={onSave} disabled={uploading}>
                    {uploading ? "Saving" : "Save"}
                </Button>
            </DialogActions>
        </React.Fragment>
    )
}

const SearchTabFilesSearchPanel = (props) => {
    const [searchHost, setSearchHost] = React.useState("");
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Filename");
    const searchFieldOptions = ["Filename", "Hash", "Comment", "Tag", "UUID"];
    const [searchLocation, setSearchLocation] = React.useState("Downloads");
    const searchLocationOptions = ["Uploads", "Downloads", "Hosted", "FileBrowser", "Screenshots", "Eventing Workflows"];
    const [showDeleted, setShowDeleted] = React.useState(false);
    const [openCreateTextFileDialog, setOpenCreateTextFileDialog] = React.useState(false);
    const handleToggleShowDeleted = (event) => {
        setShowDeleted(!showDeleted);
        props.onChangeDeletedField(!showDeleted);
    }
    const handleSearchFieldChange = (event) => {
        setSearchField(event.target.value);
        props.onChangeSearchField(event.target.value);
        props.changeSearchParam("searchField", event.target.value);
    }
    const handleSearchLocationChange = (event) => {
        setSearchLocation(event.target.value);
        props.onChangeSearchLocation(event.target.value);
        props.changeSearchParam("location", event.target.value);
    }
    const handleSearchValueChange = (name, value, error) => {
        setSearch(value);
    }
    const handleSearchHostValueChange = (name, value, error) => {
        setSearchHost(value);
    }
    const submitSearch = (event, querySearch, querySearchHost, querySearchField, querySearchLocation) => {
        let adjustedSearchField = querySearchField ? querySearchField : searchField;
        let adjustedSearch = querySearch ? querySearch : search;
        let adjustedSearchHost = querySearchHost ? querySearchHost : searchHost;
        let adjustedSearchLocation = querySearchLocation ? querySearchLocation : searchLocation;
        props.changeSearchParam("host", adjustedSearchHost);
        props.changeSearchParam("search", adjustedSearch);
        switch (adjustedSearchField) {
            case "Filename":
                props.onFilenameSearch({
                    search: adjustedSearch,
                    searchHost: adjustedSearchHost,
                    offset: 0,
                    adjustedSearchLocation
                })
                break;
            case "Hash":
                props.onHashSearch({
                    search: adjustedSearch,
                    searchHost: adjustedSearchHost,
                    offset: 0,
                    adjustedSearchLocation
                })
                break;
            case "Comment":
                props.onCommentSearch({
                    search: adjustedSearch,
                    searchHost: adjustedSearchHost,
                    offset: 0,
                    adjustedSearchLocation
                })
                break;
            case "Tag":
                props.onTagSearch({
                    search: adjustedSearch,
                    searchHost: adjustedSearchHost,
                    offset: 0,
                    adjustedSearchLocation
                });
                break;
            case "UUID":
                props.onUUIDSearch({
                    search: adjustedSearch,
                    searchHost: adjustedSearchHost,
                    offset: 0,
                    adjustedSearchLocation
                });
                break;
            default:
                break;
        }
    }
    const onFileChange = async (evt) => {
        for(let i = 0; i < evt.target.files.length; i++){
            let newUUID = await UploadTaskFile(evt.target.files[i], "Manually uploaded");
            if (newUUID) {
                snackActions.success("Successfully uploaded file. It's available in 'uploads'")
            }
        }
    }
    React.useEffect(() => {
        if (props.value === props.index) {
            let queryParams = new URLSearchParams(window.location.search);
            let adjustedSearch = "";
            let adjustedSearchHost = "";
            let adjustedSearchField = "Filename";
            let adjustedSearchLocation = "Downloads";
            if (queryParams.has("search")) {
                setSearch(queryParams.get("search"));
                adjustedSearch = queryParams.get("search");
            }
            if (queryParams.has("searchField") && searchFieldOptions.includes(queryParams.get("searchField"))) {
                setSearchField(queryParams.get("searchField"));
                props.onChangeSearchField(queryParams.get("searchField"));
                adjustedSearchField = queryParams.get("searchField");
            } else {
                setSearchField("Filename");
                props.onChangeSearchField("Filename");
                props.changeSearchParam("searchField", "Filename");
            }
            if (queryParams.has("location") && searchLocationOptions.includes(queryParams.get("location"))) {
                setSearchLocation(queryParams.get("location"));
                adjustedSearchLocation = queryParams.get("location");
                props.onChangeSearchLocation(queryParams.get("location"));
            }
            if (queryParams.has("host")) {
                setSearchHost(queryParams.get("host"));
                adjustedSearchHost = queryParams.get("host")
            }
            submitSearch(null, adjustedSearch, adjustedSearchHost, adjustedSearchField, adjustedSearchLocation);
        }
    }, [props.value, props.index]);
    return (
        <MythicTableToolbar variant="search">
            {openCreateTextFileDialog &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openCreateTextFileDialog}
                              onClose={()=>{setOpenCreateTextFileDialog(false);}}
                              innerDialog={<CreateTextFileDialog onClose={()=>{setOpenCreateTextFileDialog(false);}} />}
                />
            }
            <MythicTableToolbarGroup label="Host" style={{minWidth: "13rem"}}>
                <MythicSearchField placeholder="Host Name Search..." name="Host" value={searchHost}
                                   onChange={handleSearchHostValueChange} onEnter={submitSearch}/>
            </MythicTableToolbarGroup>
            <MythicTableToolbarGroup grow label="Search">
                <MythicSearchField value={search} onChange={handleSearchValueChange} onEnter={submitSearch} onSearch={submitSearch} />
            </MythicTableToolbarGroup>
            <MythicTableToolbarGroup label="In">
                <MythicToolbarSelect
                    value={searchField}
                    onChange={handleSearchFieldChange}
                >
                    {
                        searchFieldOptions.map((opt, i) => (
                            <MenuItem key={"searchopt" + opt} value={opt}>{opt}</MenuItem>
                        ))
                    }
                </MythicToolbarSelect>
            </MythicTableToolbarGroup>
            <MythicTableToolbarGroup label="Location">
                <MythicToolbarSelect
                    value={searchLocation}
                    onChange={handleSearchLocationChange}
                >
                    {
                        searchLocationOptions.map((opt, i) => (
                            <MenuItem key={"searchlocopt" + opt} value={opt}>{opt}</MenuItem>
                        ))
                    }
                </MythicToolbarSelect>
            </MythicTableToolbarGroup>
            <MythicTableToolbarGroup label="Actions">
                <MythicToolbarButton className="mythic-action-tone-hover mythic-tone-info" variant="outlined" component="label" startIcon={<BackupIcon />}>
                    Files
                    <input onChange={onFileChange} type="file" multiple hidden/>
                </MythicToolbarButton>
                <MythicToolbarButton className="mythic-action-tone-hover mythic-tone-info" variant="outlined" startIcon={<NoteAddIcon />} onClick={()=>{setOpenCreateTextFileDialog(true);}}>
                    Text
                </MythicToolbarButton>
                <MythicToolbarToggle
                    checked={showDeleted}
                    onClick={handleToggleShowDeleted}
                    label="Deleted"
                    activeIcon={<VisibilityIcon fontSize="small" />}
                    inactiveIcon={<VisibilityOffIcon fontSize="small" />}
                />
            </MythicTableToolbarGroup>
        </MythicTableToolbar>
    );
}

export const SearchTabFilesPanel = (props) => {
    const [fileMetaUploadData, setFileMetaUploadData] = React.useState([]);
    const [fileMetaDownloadData, setFileMetaDownloadData] = React.useState([]);
    const [fileMetaScreenshotData, setFileMetaScreenshotData] = React.useState([]);
    const [hostedFileData, setHostedFileData] = React.useState([]);
    const [fileBrowserData, setFileBrowserData] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchHost, setSearchHost] = React.useState("");
    const [searchField, setSearchField] = React.useState("Filename");
    const searchFieldRef = React.useRef("Filename");
    const [searchLocation, setSearchLocation] = React.useState("Downloads");
    const showDeleted = React.useRef(false);
    const me = props.me;
    const onChangeDeletedField = (newShowDeleted) => {
        showDeleted.current = newShowDeleted;
        onChangeSearchField(searchField);
    }
    const onChangeSearchField = (field) => {
        setSearchField(field);
        searchFieldRef.current = field;
        switch (field) {
            case "Filename":
                onFilenameSearch({search, searchHost, offset: 0, adjustedSearchLocation: searchLocation});
                break;
            case "Hash":
                onHashSearch({search, searchHost, offset: 0, adjustedSearchLocation: searchLocation});
                break;
            case "Comment":
                onCommentSearch({search, searchHost, offset: 0, adjustedSearchLocation: searchLocation});
                break;
            case "Tag":
                onTagSearch({search, searchHost, offset: 0, adjustedSearchLocation: searchLocation});
                break;
            case "UUID":
                onUUIDSearch({search, searchHost, offset: 0, adjustedSearchLocation: searchLocation});
                break;
            default:
                break;
        }
    }
    const onChangeSearchLocation = (field) => {
        setSearchLocation(field);
        switch (searchFieldRef.current) {
            case "Filename":
                onFilenameSearch({search, searchHost, offset: 0, adjustedSearchLocation: field});
                break;
            case "Hash":
                onHashSearch({search, searchHost, offset: 0, adjustedSearchLocation: field});
                break;
            case "Comment":
                onCommentSearch({search, searchHost, offset: 0, adjustedSearchLocation: field});
                break;
            case "Tag":
                onTagSearch({search, searchHost, offset: 0, adjustedSearchLocation: field});
                break;
            case "UUID":
                onUUIDSearch({search, searchHost, offset: 0, adjustedSearchLocation: field});
                break;
            default:
                break;
        }
    }
    const handleFileMetaDownloadSearchResults = (data) => {
        snackActions.dismiss();
        if (searchFieldRef.current === "Tag") {
            setTotalCount(data?.tag_aggregate?.aggregate?.count || 0);
            setFileMetaDownloadData(data?.tag?.map(t => t.filemetum) || []);
        } else {
            setTotalCount(data.filemeta_aggregate.aggregate.count);
            setFileMetaDownloadData(data.filemeta);
        }

        setFileBrowserData([]);
        setFileMetaUploadData([]);
        setFileMetaScreenshotData([]);
        setHostedFileData([]);
    }
    const handleFileMetaUploadSearchResults = (data) => {
        snackActions.dismiss();
        if (searchFieldRef.current === "Tag") {
            setTotalCount(data?.tag_aggregate?.aggregate?.count || 0);
            const tagData = data?.tag?.map(t => t.filemetum) || [];
            setFileMetaUploadData( tagData);
        } else {
            setFileMetaUploadData(data.filemeta);
            setTotalCount(data.filemeta_aggregate.aggregate.count);
        }

        setFileBrowserData([]);
        setFileMetaDownloadData([]);
        setFileMetaScreenshotData([]);
        setHostedFileData([]);

    }
    const handleFileMetaScreenshotSearchResults = (data) => {
        snackActions.dismiss();
        if (searchFieldRef.current === "Tag") {
            setTotalCount(data?.tag_aggregate?.aggregate?.count || 0);
            setFileMetaScreenshotData(data?.tag?.map(t => t.filemetum) || []);
        } else {
            setTotalCount(data.filemeta_aggregate.aggregate.count);
            setFileMetaScreenshotData(data.filemeta);
        }

        setFileBrowserData([]);
        setFileMetaDownloadData([]);
        setFileMetaUploadData([]);
        setHostedFileData([]);
    }
    const handleFileBrowserSearchResults = (data) => {
        snackActions.dismiss();
        if (searchFieldRef.current === "Tag") {
            setTotalCount(data?.tag_aggregate?.aggregate?.count || 0);
            setFileBrowserData(data?.tag?.map(t => t.mythictree) || []);
        } else {
            setTotalCount(data.mythictree_aggregate.aggregate.count);
            setFileBrowserData(data.mythictree);
        }

        setFileMetaUploadData([]);
        setFileMetaDownloadData([]);
        setFileMetaScreenshotData([]);
        setHostedFileData([]);
    }
    const handleHostedFileSearchResults = (data) => {
        snackActions.dismiss();
        setTotalCount(data.c2profile_file_host_aggregate.aggregate.count);
        setHostedFileData(data.c2profile_file_host);
        setFileBrowserData([]);
        setFileMetaUploadData([]);
        setFileMetaDownloadData([]);
        setFileMetaScreenshotData([]);
    }
    const handleCallbackSearchFailure = (data) => {
        snackActions.dismiss();
        snackActions.error("Failed to fetch data for search");
        console.log(data);
    }
    const getfilenameFileMetaUploadSearch = useMythicLazyQuery(filenameFileMetaUploadSearch, {
        fetchPolicy: "no-cache"
    })
    const getfilenameFileMetaDownloadSearch = useMythicLazyQuery(filenameFileMetaDownloadSearch, {
        fetchPolicy: "no-cache"
    })
    const getfilenameFileBrowserSearch = useMythicLazyQuery(filenameFileBrowserSearch, {
        fetchPolicy: "no-cache"
    })
    const getfilenameFileMetaScreenshotSearch = useMythicLazyQuery(filenameFileMetaScreenshotSearch, {
        fetchPolicy: "no-cache"
    })
    const getfilenameFileMetaEventingWorkflowSearch = useMythicLazyQuery(filenameFileMetaEventingWorkflowSearch, {
        fetchPolicy: "no-cache"
    })
    const gethashFileMetaUploadSearch = useMythicLazyQuery(hashFileMetaUploadSearch, {
        fetchPolicy: "no-cache"
    })
    const gethashFileMetaDownloadSearch = useMythicLazyQuery(hashFileMetaDownloadSearch, {
        fetchPolicy: "no-cache"
    })
    const gethashFileMetaScreenshotSearch = useMythicLazyQuery(hashFileMetaScreenshotSearch, {
        fetchPolicy: "no-cache"
    })
    const getcommentFileMetaUploadSearch = useMythicLazyQuery(commentFileMetaUploadSearch, {
        fetchPolicy: "no-cache",
    })
    const getcommentFileMetaDownloadSearch = useMythicLazyQuery(commentFileMetaDownloadSearch, {
        fetchPolicy: "no-cache"
    })
    const getcommentFileBrowserSearch = useMythicLazyQuery(commentFileBrowserSearch, {
        fetchPolicy: "no-cache"
    })
    const getcommentFileMetaScreenshotSearch = useMythicLazyQuery(commentFileMetaScreenshotSearch, {
        fetchPolicy: "no-cache"
    })
    const gettagFileMetaUploadSearch = useMythicLazyQuery(tagFileMetaUploadSearch, {
        fetchPolicy: "no-cache"
    })
    const gettagFileMetaDownloadSearch = useMythicLazyQuery(tagFileMetaDownloadSearch, {
        fetchPolicy: "no-cache"
    })
    const gettagFileBrowserSearch = useMythicLazyQuery(tagFileBrowserSearch, {
        fetchPolicy: "no-cache"
    })
    const gettagFileMetaScreenshotSearch = useMythicLazyQuery(tagFileMetaScreenshotSearch, {
        fetchPolicy: "no-cache"
    })
    const getUUIDFileMetaUploadSearch = useMythicLazyQuery(uuidFileMetaUploadSearch, {
        fetchPolicy: "no-cache"
    })
    const getUUIDFileMetaDownloadSearch = useMythicLazyQuery(uuidFileMetaDownloadSearch, {
        fetchPolicy: "no-cache"
    })
    const getUUIDFileMetaScreenshotSearch = useMythicLazyQuery(uuidFileMetaScreenshotSearch, {
        fetchPolicy: "no-cache"
    })
    const getUUIDFileMetaEventingWorkflowSearch = useMythicLazyQuery(uuidFileMetaEventingWorkflowSearch, {
        fetchPolicy: "no-cache"
    })
    const getHostedFileSearch = useMythicLazyQuery(hostedFileSearch, {
        fetchPolicy: "no-cache"
    })
    const onHostedSearch = ({search, searchHost, offset}) => {
        setSearch(search);
        setSearchHost(searchHost);
        getHostedFileSearch({
            variables: {
                operation_id: me?.user?.current_operation_id || 0,
                offset: offset,
                fetchLimit: fetchLimit,
                search: "%" + search + "%",
                host: "%" + searchHost + "%",
                deleted: showDeleted.current
            }
        }).then(({data}) => handleHostedFileSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
    }
    const onFilenameSearch = ({search, searchHost, offset, adjustedSearchLocation}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        setSearchHost(searchHost);
        if (adjustedSearchLocation === "Hosted") {
            onHostedSearch({search, searchHost, offset});
        } else if (adjustedSearchLocation === "FileBrowser") {
            getfilenameFileBrowserSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    filename: "%" + search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileBrowserSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Uploads") {
            getfilenameFileMetaUploadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    filename: "%" + search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Downloads") {
            getfilenameFileMetaDownloadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    filename: "%" + search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaDownloadSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Eventing Workflows"){
            getfilenameFileMetaEventingWorkflowSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    filename: "%" + search + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else {
            getfilenameFileMetaScreenshotSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    filename: "%" + search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaScreenshotSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        }
    }
    const onHashSearch = ({search, searchHost, offset, adjustedSearchLocation}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        setSearchHost(searchHost);
        if (adjustedSearchLocation === "Hosted") {
            onHostedSearch({search, searchHost, offset});
        } else if (adjustedSearchLocation === "FileBrowser") {
            snackActions.dismiss();
            snackActions.warning("FileBrowser doesn't currently track file hashes");
            setTotalCount(0);
            setFileBrowserData([]);
            setFileMetaUploadData([]);
            setFileMetaScreenshotData([]);
            setFileMetaDownloadData([]);
            setHostedFileData([]);
        } else if (adjustedSearchLocation === "Uploads") {
            gethashFileMetaUploadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    hash: "%" + search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Downloads") {
            gethashFileMetaDownloadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    hash: "%" + search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaDownloadSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else {
            gethashFileMetaScreenshotSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    hash: "%" + search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaScreenshotSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        }
    }
    const onCommentSearch = ({search, searchHost, offset, adjustedSearchLocation}) => {
        //snackActions.info("Searching...", {persist:true});
        let new_search = search;
        if (search === "") {
            new_search = "_";
        }
        setSearch(new_search);
        setSearchHost(searchHost);
        if (adjustedSearchLocation === "Hosted") {
            onHostedSearch({search: new_search, searchHost, offset});
        } else if (adjustedSearchLocation === "FileBrowser") {
            getcommentFileBrowserSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    comment: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileBrowserSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Uploads") {
            getcommentFileMetaUploadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    comment: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Downloads") {
            getcommentFileMetaDownloadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    comment: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaDownloadSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else {
            getcommentFileMetaScreenshotSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    comment: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaScreenshotSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        }
    }
    const onTagSearch = ({search, searchHost, offset, adjustedSearchLocation}) => {
        //snackActions.info("Searching...", {persist:true});
        let new_search = search;
        if (search === "") {
            new_search = "_";
        }
        setSearch(new_search);
        setSearchHost(searchHost);
        if (adjustedSearchLocation === "Hosted") {
            onHostedSearch({search: new_search, searchHost, offset});
        } else if (adjustedSearchLocation === "FileBrowser") {
            gettagFileBrowserSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    tag: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileBrowserSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Uploads") {
            gettagFileMetaUploadSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    tag: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Downloads") {
            gettagFileMetaDownloadSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    tag: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaDownloadSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else {
            gettagFileMetaScreenshotSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    tag: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaScreenshotSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        }
    }
    const onUUIDSearch = ({search, searchHost, offset, adjustedSearchLocation}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        setSearchHost(searchHost);
        if (adjustedSearchLocation === "Hosted") {
            onHostedSearch({search, searchHost, offset});
        } else if (adjustedSearchLocation === "FileBrowser") {
            snackActions.dismiss();
            snackActions.warning("FileBrowser doesn't currently track file UUIDs");
            setTotalCount(0);
            setFileBrowserData([]);
            setFileMetaUploadData([]);
            setFileMetaScreenshotData([]);
            setFileMetaDownloadData([]);
            setHostedFileData([]);
        } else if (adjustedSearchLocation === "Uploads") {
            getUUIDFileMetaUploadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    agent_file_id: "%" + search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Downloads") {
            getUUIDFileMetaDownloadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    agent_file_id: "%" + search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaDownloadSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Eventing Workflows") {
            getUUIDFileMetaEventingWorkflowSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    agent_file_id: "%" + search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        } else {
            getUUIDFileMetaScreenshotSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    agent_file_id: "%" + search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaScreenshotSearchResults(data)).catch((data) => handleCallbackSearchFailure(data))
        }
    }
    const onChangePage = (event, value) => {

        switch (searchField) {
            case "Filename":
                onFilenameSearch({
                    search: search,
                    searchHost: searchHost,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchLocation: searchLocation
                });
                break;
            case "Hash":
                onHashSearch({
                    search: search,
                    searchHost: searchHost,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchLocation: searchLocation
                });
                break;
            case "Comment":
                onCommentSearch({
                    search: search,
                    searchHost: searchHost,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchLocation: searchLocation
                });
                break;
            case "Tag":
                onTagSearch({
                    search: search,
                    searchHost: searchHost,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchLocation: searchLocation
                });
                break;
            case "UUID":
                onUUIDSearch({
                    search: search,
                    searchHost: searchHost,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchLocation: searchLocation
                });
                break;
            default:
                break;
        }
    }
    const currentResultCount = searchLocation === "Uploads" ? fileMetaUploadData.length :
        searchLocation === "Downloads" ? fileMetaDownloadData.length :
        searchLocation === "Hosted" ? hostedFileData.length :
        searchLocation === "Screenshots" ? fileMetaScreenshotData.length :
        searchLocation === "FileBrowser" ? fileBrowserData.length :
        fileMetaUploadData.length;
    return (
        <MythicTabPanel {...props} >
            <SearchTabFilesSearchPanel onChangeSearchField={onChangeSearchField} onFilenameSearch={onFilenameSearch}
                                       value={props.value} index={props.index} queryParams={props.queryParams}
                                       onHashSearch={onHashSearch} onCommentSearch={onCommentSearch}
                                       onTagSearch={onTagSearch} onUUIDSearch={onUUIDSearch}
                                       onChangeSearchLocation={onChangeSearchLocation}
                                       onChangeDeletedField={onChangeDeletedField}
                                       changeSearchParam={props.changeSearchParam}/>
            <div style={{overflowY: "auto", flexGrow: 1}}>
                {currentResultCount > 0 ? (
                    <>
                        {searchLocation === "Uploads" && <FileMetaUploadTable me={me} files={fileMetaUploadData}/>}
                        {searchLocation === "Downloads" && <FileMetaDownloadTable me={me} files={fileMetaDownloadData}/>}
                        {searchLocation === "Hosted" && <HostedFileTable me={me} hostedFiles={hostedFileData}/>}
                        {searchLocation === "Screenshots" && <FileMetaScreenshotTable me={me} files={fileMetaScreenshotData}/>}
                        {searchLocation === "FileBrowser" && <FileBrowserTable me={me} files={fileBrowserData} />}
                        {searchLocation === "Eventing Workflows" && <FileMetaEventingWorkflowsTable me={me} files={fileMetaUploadData} />}
                    </>
                ) : (
                    <MythicSearchEmptyState
                        compact
                        description="Adjust the filename, host, location, deleted filter, or search field and search again."
                        minHeight={180}
                    />
                )}
            </div>
            <MythicTablePagination totalCount={totalCount} fetchLimit={fetchLimit} onChange={onChangePage} color="info" />
        </MythicTabPanel>
    )
}
