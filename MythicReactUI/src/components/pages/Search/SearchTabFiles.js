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
import {FileMetaDownloadTable, FileMetaScreenshotTable, FileMetaUploadTable} from './FileMetaTable';
import {FileBrowserTable} from './FileBrowserTable';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {UploadTaskFile} from '../../MythicComponents/MythicFileUpload';

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
query filenameFileMetaUploadQuery($operation_id: Int!, $filename: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, _and: [{_or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, _and: [{_or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
}
`;
const filenameFileMetaDownloadSearch = gql`
${fileMetaFragment}
query filenameFileMetaDownloadQuery($operation_id: Int!, $filename: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, _or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, _or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const filenameFileBrowserSearch = gql`
${mythictreeFragment}
query filenameFileBrowserQuery($operation_id: Int!, $filename: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    mythictree_aggregate(distinct_on: id, where: {full_path_text: {_ilike: $filename}, host: {_ilike: $host}, operation_id: {_eq: $operation_id}, tree_type: {_eq: "file"}}) {
      aggregate {
        count
      }
    }
    mythictree(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, full_path_text: {_ilike: $filename}, operation_id: {_eq: $operation_id}, tree_type: {_eq: "file"}}) {
      ...mythictreeData
    }
  }
`;
const filenameFileMetaScreenshotSearch = gql`
${fileMetaFragment}
query filenameFileMetaScreenshotQuery($operation_id: Int!, $filename: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, _and: [{_or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true},task_id: {_is_null: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, _and: [{_or: [{filename_utf8: {_ilike: $filename}}, {full_remote_path_utf8: {_ilike: $filename}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true}}) {
      ...filemetaData
    }
  }
`;
const hashFileMetaUploadSearch = gql`
${fileMetaFragment}
query hashFileMetaUploadQuery($operation_id: Int!, $hash: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, _and: [{_or: [{md5: {_ilike: $hash}}, {sha1: {_ilike: $hash}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, _and: [{_or: [{md5: {_ilike: $hash}}, {sha1: {_ilike: $hash}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const hashFileMetaDownloadSearch = gql`
${fileMetaFragment}
query hashFileMetaDownloadQuery($operation_id: Int!, $hash: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, _or: [{md5: {_ilike: $hash}}, {sha1: {_ilike: $hash}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, _or: [{md5: {_ilike: $hash}}, {sha1: {_ilike: $hash}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const hashFileMetaScreenshotSearch = gql`
${fileMetaFragment}
query hashFileMetaScreenshotQuery($operation_id: Int!, $hash: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, _and: [{_or: [{md5: {_ilike: $hash}}, {sha1: {_ilike: $hash}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, _and: [{_or: [{md5: {_ilike: $hash}}, {sha1: {_ilike: $hash}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true}}) {
      ...filemetaData
    }
  }
`;
const commentFileMetaUploadSearch = gql`
${fileMetaFragment}
query commentFileMetaUploadQuery($operation_id: Int!, $comment: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const commentFileMetaDownloadSearch = gql`
${fileMetaFragment}
query hashFileMetaDownloadQuery($operation_id: Int!, $comment: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const commentFileBrowserSearch = gql`
${mythictreeFragment}
query filenameFileBrowserQuery($operation_id: Int!, $comment: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    mythictree_aggregate(distinct_on: id, where: {comment: {_ilike: $comment}, host: {_ilike: $host}, operation_id: {_eq: $operation_id}, tree_type: {_eq: "file"}}) {
      aggregate {
        count
      }
    }
    mythictree(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, tree_type: {_eq: "file"}}) {
      ...mythictreeData
    }
  }
`;
const commentFileMetaScreenshotSearch = gql`
${fileMetaFragment}
query commentFileMetaScreenshotQuery($operation_id: Int!, $comment: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true}}) {
      ...filemetaData
    }
  }
`;
const tagFileMetaUploadSearch = gql`
${fileMetaFragment}
query tagFileMetaUploadQuery($tag: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    tag_aggregate(distinct_on: id, where: {filemeta_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], filemetum: {host: {_ilike: $host}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {filemeta_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], filemetum: {host: {_ilike: $host}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}}) {
      filemetum{
        ...filemetaData
      }
    }
  }
`;
const tagFileMetaDownloadSearch = gql`
${fileMetaFragment}
query tagFileMetaDownloadQuery($tag: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    tag_aggregate(distinct_on: id, where: {filemeta_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], filemetum: {host: {_ilike: $host}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {filemeta_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], filemetum: {host: {_ilike: $host}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}}) {
      filemetum {
        ...filemetaData
      }
      
    }
  }
`;
const tagFileBrowserSearch = gql`
${mythictreeFragment}
query tagFileBrowserQuery($tag: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    tag_aggregate(distinct_on: id, where: {mythictree_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], mythictree: {host: {_ilike: $host}, tree_type: {_eq: "file"}}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {mythictree_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], mythictree: {host: {_ilike: $host}, tree_type: {_eq: "file"}}}) {
      mythictree {
        ...mythictreeData
      }
      
    }
  }
`;
const tagFileMetaScreenshotSearch = gql`
${fileMetaFragment}
query tagFileMetaScreenshotQuery($tag: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    tag_aggregate(distinct_on: id, where: {filemeta_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], filemetum: {host: {_ilike: $host}, is_screenshot: {_eq: true}}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {filemeta_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], filemetum: {host: {_ilike: $host}, is_screenshot: {_eq: true}}}) {
      filemetum{
        ...filemetaData
      }
    }
  }
`;
const uuidFileMetaUploadSearch = gql`
${fileMetaFragment}
query uuidFileMetaUploadQuery($operation_id: Int!, $agent_file_id: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, agent_file_id: {_ilike: $agent_file_id}, _or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host},agent_file_id: {_ilike: $agent_file_id}, _or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
}
`;
const uuidFileMetaDownloadSearch = gql`
${fileMetaFragment}
query uuidFileMetaDownloadQuery($operation_id: Int!, $agent_file_id: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, agent_file_id: {_ilike: $agent_file_id}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, agent_file_id: {_ilike: $agent_file_id}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const uuidFileMetaScreenshotSearch = gql`
${fileMetaFragment}
query uuidFileMetaScreenshotQuery($operation_id: Int!, $agent_file_id: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, agent_file_id: {_ilike: $agent_file_id}, _or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true},task_id: {_is_null: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, agent_file_id: {_ilike: $agent_file_id}, _or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: true}}) {
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
    const searchLocationOptions = ["Uploads", "Downloads", "FileBrowser", "Screenshots"];
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
        let newUUID = await UploadTaskFile(evt.target.files[0], "Manually uploaded");
        if (newUUID !== "") {
            snackActions.success("Successfully uploaded file. It's available in 'uploads'")
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
        <Grid container spacing={1} style={{paddingTop: "10px", paddingLeft: "10px", maxWidth: "100%"}}>
            <Grid item xs={2}>
                <MythicTextField placeholder="Host Name Search..." value={searchHost}
                                 onChange={handleSearchHostValueChange} onEnter={submitSearch}
                                 name="Host Name Search..."/>
            </Grid>
            <Grid item xs={3}>
                <MythicTextField placeholder="Search..." value={search}
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
            <Grid item xs={2}>
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
            <Grid item xs={2}>
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
            <Grid item xs={2}>
                <Button variant="contained" color="primary" component="label">Host File in Mythic <input
                    onChange={onFileChange} type="file" hidden/></Button>
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
    const me = props.me;
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
            setFileMetaUploadData(data?.tag?.map(t => t.filemetum) || []);
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
    const [getfilenameFileMetaUploadSearch] = useLazyQuery(filenameFileMetaUploadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaUploadSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getfilenameFileMetaDownloadSearch] = useLazyQuery(filenameFileMetaDownloadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaDownloadSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getfilenameFileBrowserSearch] = useLazyQuery(filenameFileBrowserSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileBrowserSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getfilenameFileMetaScreenshotSearch] = useLazyQuery(filenameFileMetaScreenshotSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaScreenshotSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [gethashFileMetaUploadSearch] = useLazyQuery(hashFileMetaUploadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaUploadSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [gethashFileMetaDownloadSearch] = useLazyQuery(hashFileMetaDownloadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaDownloadSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [gethashFileMetaScreenshotSearch] = useLazyQuery(hashFileMetaScreenshotSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaScreenshotSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getcommentFileMetaUploadSearch] = useLazyQuery(commentFileMetaUploadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaUploadSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getcommentFileMetaDownloadSearch] = useLazyQuery(commentFileMetaDownloadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaDownloadSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getcommentFileBrowserSearch] = useLazyQuery(commentFileBrowserSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileBrowserSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getcommentFileMetaScreenshotSearch] = useLazyQuery(commentFileMetaScreenshotSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaScreenshotSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [gettagFileMetaUploadSearch] = useLazyQuery(tagFileMetaUploadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaUploadSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [gettagFileMetaDownloadSearch] = useLazyQuery(tagFileMetaDownloadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaDownloadSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [gettagFileBrowserSearch] = useLazyQuery(tagFileBrowserSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileBrowserSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [gettagFileMetaScreenshotSearch] = useLazyQuery(tagFileMetaScreenshotSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaScreenshotSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getUUIDFileMetaUploadSearch] = useLazyQuery(uuidFileMetaUploadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaUploadSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getUUIDFileMetaDownloadSearch] = useLazyQuery(uuidFileMetaDownloadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaDownloadSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getUUIDFileMetaScreenshotSearch] = useLazyQuery(uuidFileMetaScreenshotSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaScreenshotSearchResults,
        onError: handleCallbackSearchFailure
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
                    host: "%" + searchHost + "%"
                }
            })
        } else if (adjustedSearchLocation === "Uploads") {
            getfilenameFileMetaUploadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    filename: "%" + search + "%",
                    host: "%" + searchHost + "%"
                }
            })
        } else if (adjustedSearchLocation === "Downloads") {
            getfilenameFileMetaDownloadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    filename: "%" + search + "%",
                    host: "%" + searchHost + "%"
                }
            })
        } else {
            getfilenameFileMetaScreenshotSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    filename: "%" + search + "%",
                    host: "%" + searchHost + "%"
                }
            })
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
                    host: "%" + searchHost + "%"
                }
            })
        } else if (adjustedSearchLocation === "Downloads") {
            gethashFileMetaDownloadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    hash: "%" + search + "%",
                    host: "%" + searchHost + "%"
                }
            })
        } else {
            gethashFileMetaScreenshotSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    hash: "%" + search + "%",
                    host: "%" + searchHost + "%"
                }
            })
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
                    host: "%" + searchHost + "%"
                }
            })
        } else if (adjustedSearchLocation === "Uploads") {
            getcommentFileMetaUploadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    comment: "%" + new_search + "%",
                    host: "%" + searchHost + "%"
                }
            })
        } else if (adjustedSearchLocation === "Downloads") {
            getcommentFileMetaDownloadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    comment: "%" + new_search + "%",
                    host: "%" + searchHost + "%"
                }
            })
        } else {
            getcommentFileMetaScreenshotSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    comment: "%" + new_search + "%",
                    host: "%" + searchHost + "%"
                }
            })
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
                    host: "%" + searchHost + "%"
                }
            })
        } else if (adjustedSearchLocation === "Uploads") {
            gettagFileMetaUploadSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    tag: "%" + new_search + "%",
                    host: "%" + searchHost + "%"
                }
            })
        } else if (adjustedSearchLocation === "Downloads") {
            gettagFileMetaDownloadSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    tag: "%" + new_search + "%",
                    host: "%" + searchHost + "%"
                }
            })
        } else {
            gettagFileMetaScreenshotSearch({
                variables: {
                    offset: offset,
                    fetchLimit: fetchLimit,
                    tag: "%" + new_search + "%",
                    host: "%" + searchHost + "%"
                }
            })
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
                    host: "%" + searchHost + "%"
                }
            })
        } else if (adjustedSearchLocation === "Downloads") {
            getUUIDFileMetaDownloadSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    agent_file_id: "%" + search + "%",
                    host: "%" + searchHost + "%"
                }
            })
        } else {
            getUUIDFileMetaScreenshotSearch({
                variables: {
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    agent_file_id: "%" + search + "%",
                    host: "%" + searchHost + "%"
                }
            })
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
                                       changeSearchParam={props.changeSearchParam}/>
            <div style={{overflowY: "auto", flexGrow: 1}}>
                {searchLocation === "Uploads" ? (<FileMetaUploadTable me={me} files={fileMetaUploadData}/>) : null}
                {searchLocation === "Downloads" ? (
                    <FileMetaDownloadTable me={me} files={fileMetaDownloadData}/>) : null}
                {searchLocation === "Screenshots" ? (
                    <FileMetaScreenshotTable me={me} files={fileMetaScreenshotData}/>) : null}
                {searchLocation === "FileBrowser" ? (<FileBrowserTable me={me} files={fileBrowserData}/>) : null}
            </div>
            <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center"}}>
                <Pagination count={Math.ceil(totalCount / fetchLimit)} variant="outlined" color="primary"
                            boundaryCount={1}
                            siblingCount={1} onChange={onChangePage} showFirstButton={true} showLastButton={true}
                            style={{padding: "20px"}}/>
                <Typography style={{paddingLeft: "10px"}}>Total Results: {totalCount}</Typography>
            </div>
        </MythicTabPanel>
    )
}