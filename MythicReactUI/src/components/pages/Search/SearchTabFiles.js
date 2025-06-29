import {MythicSearchTabLabel, MythicTabPanel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import AttachmentIcon from '@mui/icons-material/Attachment';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import {useTheme} from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import {gql, useLazyQuery} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import Pagination from '@mui/material/Pagination';
import {Button, Typography} from '@mui/material';
import {
    FileMetaDownloadTable,
    FileMetaEventingWorkflowsTable,
    FileMetaScreenshotTable,
    FileMetaUploadTable
} from './FileMetaTable';
import {FileBrowserTable} from './FileBrowserTable';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {UploadTaskFile} from '../../MythicComponents/MythicFileUpload';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BackupIcon from '@mui/icons-material/Backup';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";

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

export function SearchTabFilesLabel(props) {
    return (
        <MythicSearchTabLabel label={"Files"} iconComponent={<AttachmentIcon/>} {...props}/>
    )
}

const SearchTabFilesSearchPanel = (props) => {
    const theme = useTheme();
    const [searchHost, setSearchHost] = React.useState("");
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Filename");
    const searchFieldOptions = ["Filename", "Hash", "Comment", "Tag", "UUID"];
    const [searchLocation, setSearchLocation] = React.useState("Downloads");
    const searchLocationOptions = ["Uploads", "Downloads", "FileBrowser", "Screenshots", "Eventing Workflows"];
    const [showDeleted, setShowDeleted] = React.useState(false);
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
            if (newUUID !== "") {
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
        <Grid container spacing={1} style={{padding: "5px 5px 0 5px", maxWidth: "100%"}}>
            <Grid size={2}>
                <MythicTextField placeholder="Host Name Search..." value={searchHost} marginTop={"0px"}
                                 onChange={handleSearchHostValueChange} onEnter={submitSearch}
                                 name="Host Name Search..."/>
            </Grid>
            <Grid size={3}>
                <MythicTextField placeholder="Search..." value={search} marginTop={"0px"}
                                 onChange={handleSearchValueChange} onEnter={submitSearch} name="Search..."
                                 InputProps={{
                                     endAdornment:
                                         <React.Fragment>
                                             <Tooltip title="Search">
                                                 <IconButton onClick={submitSearch} size="large"><SearchIcon
                                                     style={{color: theme.palette.info.main}}/></IconButton>
                                             </Tooltip>
                                         </React.Fragment>,
                                     style: {padding: 0}
                                 }}/>
            </Grid>
            <Grid size={2}>
                <Select
                    style={{marginBottom: "10px", width: "100%"}}
                    value={searchField}
                    onChange={handleSearchFieldChange}
                >
                    {
                        searchFieldOptions.map((opt, i) => (
                            <MenuItem key={"searchopt" + opt} value={opt}>{opt}</MenuItem>
                        ))
                    }
                </Select>
            </Grid>
            <Grid size={2}>
                <Select
                    style={{marginBottom: "10px", width: "100%"}}
                    value={searchLocation}
                    onChange={handleSearchLocationChange}
                >
                    {
                        searchLocationOptions.map((opt, i) => (
                            <MenuItem key={"searchlocopt" + opt} value={opt}>{opt}</MenuItem>
                        ))
                    }
                </Select>
            </Grid>
            <Grid size={2}>
                <Button variant="contained" color="primary" component="label" size={"small"} style={{marginRight: "5px"}} >
                    <BackupIcon style={{marginRight: "5px"}} /> Files
                    <input onChange={onFileChange} type="file" multiple hidden/>
                </Button>
                <Button variant={"contained"} color={"primary"} size={"small"} onClick={handleToggleShowDeleted}>
                    {showDeleted ? (
                        <>
                            <VisibilityIcon style={{marginRight: "5px"}} />
                            {"Deleted"}
                        </>

                    ) : (
                        <>
                            <VisibilityOffIcon style={{marginRight: "5px"}} />
                            { "Deleted"}
                        </>

                    )}
                </Button>
            </Grid>
        </Grid>
    );
}

export const SearchTabFilesPanel = (props) => {
    const [fileMetaUploadData, setFileMetaUploadData] = React.useState([]);
    const [fileMetaDownloadData, setFileMetaDownloadData] = React.useState([]);
    const [fileMetaScreenshotData, setFileMetaScreenshotData] = React.useState([]);
    const [fileBrowserData, setFileBrowserData] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchHost, setSearchHost] = React.useState("");
    const [searchField, setSearchField] = React.useState("Filename");
    const [searchLocation, setSearchLocation] = React.useState("Downloads");
    const showDeleted = React.useRef(false);
    const me = props.me;
    const onChangeDeletedField = (newShowDeleted) => {
        showDeleted.current = newShowDeleted;
        onChangeSearchField(searchField);
    }
    const onChangeSearchField = (field) => {
        setSearchField(field);
        switch (field) {
            case "Filename":
                onFilenameSearch({search, searchHost, offset: 0, adjustedSearchLocation: searchLocation});
                break;
            case "Hash":
                onHashSearch({search, searchHost, offset: 0, adjustedSearchLocation: searchLocation});
                break;
            case "Comments":
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
        switch (searchField) {
            case "Filename":
                onFilenameSearch({search, searchHost, offset: 0, adjustedSearchLocation: field});
                break;
            case "Hash":
                onHashSearch({search, searchHost, offset: 0, adjustedSearchLocation: field});
                break;
            case "Comments":
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
        if (searchField === "Tag") {
            setTotalCount(data?.tag_aggregate?.aggregate?.count || 0);
            setFileMetaDownloadData(data?.tag?.map(t => t.filemetum) || []);
        } else {
            setTotalCount(data.filemeta_aggregate.aggregate.count);
            setFileMetaDownloadData(data.filemeta);
        }

        setFileBrowserData([]);
        setFileMetaUploadData([]);
        setFileMetaScreenshotData([]);

    }
    const handleFileMetaUploadSearchResults = (data) => {
        snackActions.dismiss();
        if (searchField === "Tag") {
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

    }
    const handleFileMetaScreenshotSearchResults = (data) => {
        snackActions.dismiss();
        if (searchField === "Tag") {
            setTotalCount(data?.tag_aggregate?.aggregate?.count || 0);
            setFileMetaScreenshotData(data?.tag?.map(t => t.filemetum) || []);
        } else {
            setTotalCount(data.filemeta_aggregate.aggregate.count);
            setFileMetaScreenshotData(data.filemeta);
        }

        setFileBrowserData([]);
        setFileMetaDownloadData([]);
        setFileMetaUploadData([]);
    }
    const handleFileBrowserSearchResults = (data) => {
        snackActions.dismiss();
        if (searchField === "Tag") {
            setTotalCount(data?.tag_aggregate?.aggregate?.count || 0);
            setFileBrowserData(data?.tag?.map(t => t.mythictree) || []);
        } else {
            setTotalCount(data.mythictree_aggregate.aggregate.count);
            setFileBrowserData(data.mythictree);
        }

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
    const onFilenameSearch = ({search, searchHost, offset, adjustedSearchLocation}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        setSearchHost(searchHost);
        if (adjustedSearchLocation === "FileBrowser") {
            getfilenameFileBrowserSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    filename: "%" + search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileBrowserSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
            }).then(({data}) => handleFileMetaDownloadSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Eventing Workflows"){
            getfilenameFileMetaEventingWorkflowSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    filename: "%" + search + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
            }).then(({data}) => handleFileMetaScreenshotSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
        }
    }
    const onHashSearch = ({search, searchHost, offset, adjustedSearchLocation}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        setSearchHost(searchHost);
        if (adjustedSearchLocation === "FileBrowser") {
            snackActions.dismiss();
            snackActions.warning("FileBrowser doesn't currently track file hashes");
            setTotalCount(0);
            setFileBrowserData([]);
            setFileMetaUploadData([]);
            setFileMetaScreenshotData([]);
            setFileMetaDownloadData([]);
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
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
            }).then(({data}) => handleFileMetaDownloadSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
            }).then(({data}) => handleFileMetaScreenshotSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
        if (adjustedSearchLocation === "FileBrowser") {
            getcommentFileBrowserSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    comment: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileBrowserSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
            }).then(({data}) => handleFileMetaDownloadSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
            }).then(({data}) => handleFileMetaScreenshotSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
        if (adjustedSearchLocation === "FileBrowser") {
            gettagFileBrowserSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    tag: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileBrowserSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Uploads") {
            gettagFileMetaUploadSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    tag: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
        } else if (adjustedSearchLocation === "Downloads") {
            gettagFileMetaDownloadSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    tag: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaDownloadSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
        } else {
            gettagFileMetaScreenshotSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    tag: "%" + new_search + "%",
                    host: "%" + searchHost + "%",
                    deleted: showDeleted.current
                }
            }).then(({data}) => handleFileMetaScreenshotSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
        }
    }
    const onUUIDSearch = ({search, searchHost, offset, adjustedSearchLocation}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        setSearchHost(searchHost);
        if (adjustedSearchLocation === "FileBrowser") {
            snackActions.dismiss();
            snackActions.warning("FileBrowser doesn't currently track file UUIDs");
            setTotalCount(0);
            setFileBrowserData([]);
            setFileMetaUploadData([]);
            setFileMetaScreenshotData([]);
            setFileMetaDownloadData([]);
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
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
            }).then(({data}) => handleFileMetaDownloadSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
            }).then(({data}) => handleFileMetaUploadSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
            }).then(({data}) => handleFileMetaScreenshotSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
            case "Comments":
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
                {searchLocation === "Uploads" && <FileMetaUploadTable me={me} files={fileMetaUploadData}/>}
                {searchLocation === "Downloads" && <FileMetaDownloadTable me={me} files={fileMetaDownloadData}/>}
                {searchLocation === "Screenshots" && <FileMetaScreenshotTable me={me} files={fileMetaScreenshotData}/>}
                {searchLocation === "FileBrowser" && <FileBrowserTable me={me} files={fileBrowserData} />}
                {searchLocation === "Eventing Workflows" && <FileMetaEventingWorkflowsTable me={me} files={fileMetaUploadData} />}
            </div>
            <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center"}}>
                <Pagination count={Math.ceil(totalCount / fetchLimit)} variant="outlined" color="info"
                            boundaryCount={1}
                            siblingCount={1} onChange={onChangePage} showFirstButton={true} showLastButton={true}
                            style={{padding: "20px"}}/>
                <Typography style={{paddingLeft: "10px"}}>Total Results: {totalCount}</Typography>
            </div>
        </MythicTabPanel>
    )
}