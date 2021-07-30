import {MythicTabPanel, MythicSearchTabLabel} from '../../../components/MythicComponents/MythicTabPanel';
import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import AttachmentIcon from '@material-ui/icons/Attachment';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import SearchIcon from '@material-ui/icons/Search';
import Tooltip from '@material-ui/core/Tooltip';
import {useTheme} from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import { gql, useLazyQuery } from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import Pagination from '@material-ui/lab/Pagination';
import { Typography } from '@material-ui/core';
import {FileMetaDownloadTable, FileMetaUploadTable} from './FileMetaTable';
import {FileBrowserTable} from './FileBrowserTable';

const fileMetaFragment = gql`
fragment filemetaData on filemeta{
    agent_file_id
    chunk_size
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
    sha1
    timestamp
    total_chunks
    task {
        id
        comment
        command {
            cmd
            id
        }
    }
}
`;
const fileBrowserFragment = gql`
fragment filebrowserData on filebrowserobj{
    comment
    deleted
    full_path_text
    host
    id
    is_file
    modify_time
    permissions
    size
    filemeta {
        id
        agent_file_id
        chunks_received
        complete
        total_chunks
        timestamp
        task {
            id
            comment
        }
    }
}
`;
const fetchLimit = 20;
const filenameFileMetaUploadSearch = gql`
${fileMetaFragment}
query filenameFileMetaUploadQuery($operation_id: Int!, $filename: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, _and: [{_or: [{filename_text: {_ilike: $filename}}, {full_remote_path_text: {_ilike: $filename}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false},task_id: {_is_null: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, _and: [{_or: [{filename_text: {_ilike: $filename}}, {full_remote_path_text: {_ilike: $filename}}]}, {_or: [{task_id: {_is_null: false}}, {is_payload: {_eq: false}}]}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const filenameFileMetaDownloadSearch = gql`
${fileMetaFragment}
query filenameFileMetaDownloadQuery($operation_id: Int!, $filename: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, _or: [{filename_text: {_ilike: $filename}}, {full_remote_path_text: {_ilike: $filename}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, _or: [{filename_text: {_ilike: $filename}}, {full_remote_path_text: {_ilike: $filename}}], operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const filenameFileBrowserSearch = gql`
${fileBrowserFragment}
query filenameFileBrowserQuery($operation_id: Int!, $filename: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filebrowserobj_aggregate(distinct_on: id, where: {full_path_text: {_ilike: $filename}, host: {_ilike: $host}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    filebrowserobj(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, full_path_text: {_ilike: $filename}, operation_id: {_eq: $operation_id}}) {
      ...filebrowserData
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
const commentFileMetaUploadSearch = gql`
${fileMetaFragment}
query commentFileMetaUploadQuery($operation_id: Int!, $comment: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, task: {comment: {_ilike: $comment}}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, task: {comment: {_ilike: $comment}}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: false}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const commentFileMetaDownloadSearch = gql`
${fileMetaFragment}
query hashFileMetaDownloadQuery($operation_id: Int!, $comment: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filemeta_aggregate(distinct_on: id, where: {host: {_ilike: $host}, task: {comment: {_ilike: $comment}}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      aggregate {
        count
      }
    }
    filemeta(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, task: {comment: {_ilike: $comment}}, operation_id: {_eq: $operation_id}, is_download_from_agent: {_eq: true}, is_screenshot: {_eq: false}}) {
      ...filemetaData
    }
  }
`;
const commentFileBrowserSearch = gql`
${fileBrowserFragment}
query filenameFileBrowserQuery($operation_id: Int!, $comment: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    filebrowserobj_aggregate(distinct_on: id, where: {comment: {_ilike: $comment}, host: {_ilike: $host}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    filebrowserobj(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}}) {
      ...filebrowserData
    }
  }
`;


export function SearchTabFilesLabel(props){
    return (
        <MythicSearchTabLabel label={"Files"} iconComponent={<AttachmentIcon />} {...props}/>
    )
}

const SearchTabFilesSearchPanel = (props) => {
    const theme = useTheme();
    const [searchHost, setSearchHost] = React.useState("");
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Filename");
    const searchFieldOptions = ["Filename", "Hash", "Comment"];
    const [searchLocation, setSearchLocation] = React.useState("FileBrowser");
    const searchLocationOptions = ["Uploads", "Downloads", "FileBrowser"];

    const handleSearchFieldChange = (event) => {
        setSearchField(event.target.value);
        props.onChangeSearchField(event.target.value);
    }
    const handleSearchLocationChange = (event) => {
        setSearchLocation(event.target.value);
        props.onChangeSearchLocation(event.target.value);
    }
    const handleSearchValueChange = (name, value, error) => {
        setSearch(value);
    }
    const handleSearchHostValueChange = (name, value, error) => {
        setSearchHost(value);
    }
    const submitSearch = () => {
        switch(searchField){
            case "Filename":
                props.onFilenameSearch({search, searchHost, offset: 0})
                break;
            case "Hash":
                props.onHashSearch({search, searchHost, offset: 0})
                break;
            case "Comment":
                props.onCommentSearch({search, searchHost, offset: 0})
                break;
            default:
                break;
        }
    }
    return (
        <Grid container spacing={2} style={{paddingTop: "10px", paddingLeft: "10px", maxWidth: "100%"}}>
            <Grid item xs={2}>
                <MythicTextField placeholder="Host Name Search..." value={searchHost}
                    onChange={handleSearchHostValueChange} onEnter={submitSearch} name="Host Name Search..." />
            </Grid>
            <Grid item xs={4}>
                <MythicTextField placeholder="Search..." value={search}
                    onChange={handleSearchValueChange} onEnter={submitSearch} name="Search..." InputProps={{
                        endAdornment: 
                        <React.Fragment>
                            <Tooltip title="Search">
                                <IconButton onClick={submitSearch}><SearchIcon style={{color: theme.palette.info.main}}/></IconButton>
                            </Tooltip>
                        </React.Fragment>,
                        style: {padding: 0}
                    }}/>
            </Grid>
            <Grid item xs={3}>
                <FormLabel component="legend">Search File's</FormLabel>
                <FormControl component="fieldset">
                    <RadioGroup row aria-label="file_component" name="searchField" value={searchField} onChange={handleSearchFieldChange}>
                        {searchFieldOptions.map( (opt) => (
                            <FormControlLabel value={opt} key={"searchopt" + opt} control={<Radio />} label={opt} />
                        ))}
                    </RadioGroup>
                </FormControl>
            </Grid>
            <Grid item xs={3}>
            <FormLabel component="legend">Search Location</FormLabel>
                <FormControl component="fieldset">
                    <RadioGroup row aria-label="file_component" name="searchLocation" value={searchLocation} onChange={handleSearchLocationChange}>
                        {searchLocationOptions.map( (opt) => (
                            <FormControlLabel value={opt} key={"searchlocopt" + opt} control={<Radio />} label={opt} />
                        ))}
                    </RadioGroup>
                </FormControl>
            </Grid>
        </Grid>
    )
}
export const SearchTabFilesPanel = (props) =>{
    const [fileMetaData, setFileMetaData] = React.useState([]);
    const [fileBrowserData, setFileBrowserData] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchHost, setSearchHost] = React.useState("");
    const [searchField, setSearchField] = React.useState("Filename");
    const [searchLocation, setSearchLocation] = React.useState("FileBrowser");
    const me = useReactiveVar(meState);
    const onChangeSearchField = (field) => {
        setSearchField(field);
    }
    const onChangeSearchLocation = (field) => {
        setSearchLocation(field);
        setFileMetaData([]);
        setFileBrowserData([]);
    }
    const handleFileMetaSearchResults = (data) => {
        snackActions.dismiss();
        if(data.filemeta_aggregate.aggregate.count === 0){
            snackActions.info("No Results");
        }else{
            snackActions.success("Found Matches");
        }
        setTotalCount(data.filemeta_aggregate.aggregate.count);
        setFileBrowserData([]);
        setFileMetaData(data.filemeta);
    }
    const handleFileBrowserSearchResults = (data) => {
        snackActions.dismiss();
        if(data.filebrowserobj_aggregate.aggregate.count === 0){
            snackActions.info("No Results");
        }else{
            snackActions.success("Found Matches");
        }
        setTotalCount(data.filebrowserobj_aggregate.aggregate.count);
        console.log(data);
        setFileBrowserData(data.filebrowserobj);
        setFileMetaData([]);
    }
    const [getfilenameFileMetaUploadSearch] = useLazyQuery(filenameFileMetaUploadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaSearchResults,
        onError: (data) => {
            snackActions.error("Failed to fetch data for search");
            console.log(data);
        }
    })
    const [getfilenameFileMetaDownloadSearch] = useLazyQuery(filenameFileMetaDownloadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaSearchResults,
        onError: (data) => {
            snackActions.error("Failed to fetch data for search");
            console.log(data);
        }
    })
    const [getfilenameFileBrowserSearch] = useLazyQuery(filenameFileBrowserSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileBrowserSearchResults,
        onError: (data) => {
            snackActions.error("Failed to fetch data for search");
            console.log(data);
        }
    })
    const [gethashFileMetaUploadSearch] = useLazyQuery(hashFileMetaUploadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaSearchResults,
        onError: (data) => {
            snackActions.error("Failed to fetch data for search");
            console.log(data);
        }
    })
    const [gethashFileMetaDownloadSearch] = useLazyQuery(hashFileMetaDownloadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaSearchResults,
        onError: (data) => {
            snackActions.error("Failed to fetch data for search");
            console.log(data);
        }
    })
    const [getcommentFileMetaUploadSearch] = useLazyQuery(commentFileMetaUploadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaSearchResults,
        onError: (data) => {
            snackActions.error("Failed to fetch data for search");
            console.log(data);
        }
    })
    const [getcommentFileMetaDownloadSearch] = useLazyQuery(commentFileMetaDownloadSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileMetaSearchResults,
        onError: (data) => {
            snackActions.error("Failed to fetch data for search");
            console.log(data);
        }
    })
    const [getcommentFileBrowserSearch] = useLazyQuery(commentFileBrowserSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleFileBrowserSearchResults,
        onError: (data) => {
            snackActions.error("Failed to fetch data for search");
            console.log(data);
        }
    })
    const onFilenameSearch = ({search, searchHost, offset}) => {
        snackActions.info("Searching...", {persist:true});
        setSearch(search);
        setSearchHost(searchHost);
        if(searchLocation === "FileBrowser"){
            getfilenameFileBrowserSearch({variables:{
                operation_id: me.user.current_operation_id,
                offset: offset,
                fetchLimit: fetchLimit,
                filename: "%" + search + "%",
                host: "%" + searchHost + "%"
            }})
        }else if(searchLocation === "Uploads"){
            getfilenameFileMetaUploadSearch({variables:{
                operation_id: me.user.current_operation_id,
                offset: offset,
                fetchLimit: fetchLimit,
                filename: "%" + search + "%",
                host: "%" + searchHost + "%"
            }})
        }else{
            getfilenameFileMetaDownloadSearch({variables:{
                operation_id: me.user.current_operation_id,
                offset: offset,
                fetchLimit: fetchLimit,
                filename: "%" + search + "%",
                host: "%" + searchHost + "%"
            }})
        }
    }
    const onHashSearch = ({search, searchHost, offset}) => {
        snackActions.info("Searching...", {persist:true});
        setSearch(search);
        setSearchHost(searchHost);
        if(searchLocation === "FileBrowser"){
            snackActions.dismiss();
            snackActions.warning("FileBrowser doesn't currently track file hashes");
        }else if(searchLocation === "Uploads"){
            gethashFileMetaUploadSearch({variables:{
                operation_id: me.user.current_operation_id,
                offset: offset,
                fetchLimit: fetchLimit,
                hash: "%" + search + "%",
                host: "%" + searchHost + "%"
            }})
        }else{
            gethashFileMetaDownloadSearch({variables:{
                operation_id: me.user.current_operation_id,
                offset: offset,
                fetchLimit: fetchLimit,
                hash: "%" + search + "%",
                host: "%" + searchHost + "%"
            }})
        }
    }
    const onCommentSearch = ({search, searchHost, offset}) => {
        snackActions.info("Searching...", {persist:true});
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        setSearch(new_search);
        setSearchHost(searchHost);
        if(searchLocation === "FileBrowser"){
            getcommentFileBrowserSearch({variables:{
                operation_id: me.user.current_operation_id,
                offset: offset,
                fetchLimit: fetchLimit,
                comment: "%" + new_search + "%",
                host: "%" + searchHost + "%"
            }})
        }else if(searchLocation === "Uploads"){
            getcommentFileMetaUploadSearch({variables:{
                operation_id: me.user.current_operation_id,
                offset: offset,
                fetchLimit: fetchLimit,
                comment: "%" + new_search + "%",
                host: "%" + searchHost + "%"
            }})
        }else{
            getcommentFileMetaDownloadSearch({variables:{
                operation_id: me.user.current_operation_id,
                offset: offset,
                fetchLimit: fetchLimit,
                comment: "%" + new_search + "%",
                host: "%" + searchHost + "%"
            }})
        }
    }
    const onChangePage = (event, value) => {
        if(value === 1){
            switch(searchField){
                case "Filename":
                    onFilenameSearch({search, searchHost, offset: 0});
                    break;
                case "Hash":
                    onHashSearch({search, searchHost, offset: 0});
                    break;
                case "Comments":
                    onCommentSearch({search, offset: 0});
                    break;
                default:
                    break;
            }
            
        }else{
            switch(searchField){
                case "Filename":
                    onFilenameSearch({search, searchHost, offset: (value - 1) * fetchLimit});
                    break;
                case "Hash":
                    onHashSearch({search, offset: (value - 1) * fetchLimit });
                    break;
                case "Comments":
                    onCommentSearch({search, offset: (value - 1) * fetchLimit });
                    break;
                default:
                    break;
            }
            
        }
    }
    return (
        <MythicTabPanel {...props} >
            <SearchTabFilesSearchPanel onChangeSearchField={onChangeSearchField} onFilenameSearch={onFilenameSearch} 
                onHashSearch={onHashSearch} onCommentSearch={onCommentSearch} onChangeSearchLocation={onChangeSearchLocation}/>
            <div style={{overflow: "auto", height: `calc(78vh)`, background: "transparent"}}>
                {fileMetaData.length > 0 ? (
                    searchLocation === "Uploads" ? (<FileMetaUploadTable files={fileMetaData} />) : (<FileMetaDownloadTable files={fileMetaData} />)
                ) : (fileBrowserData.length > 0 ? (<FileBrowserTable files={fileBrowserData} />) : (
                    <div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>No Search Results</div>
                ))}
            </div>
            <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center"}}>
                <Pagination count={Math.ceil(totalCount / fetchLimit)} variant="outlined" color="primary" boundaryCount={2} onChange={onChangePage} />
                <Typography style={{paddingLeft: "10px"}}>Total Results: {totalCount}</Typography>
            </div>
        </MythicTabPanel>
    )
}