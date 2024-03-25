import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import {useTheme} from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import { gql, useLazyQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import Pagination from '@mui/material/Pagination';
import { Typography } from '@mui/material';
import {ArtifactTable} from './ArtifactTable';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

const artifactFragment = gql`
fragment artifactData on taskartifact{
    id
    artifact_text
    host
    id
    timestamp
    base_artifact
    task {
        id
        display_id
        callback{
            display_id
            mythictree_groups
        }
        command {
            cmd
            id
        }
        operator {
            username
            id
        }
    }
}
`;
const fetchLimit = 100;
const artifactSearch = gql`
${artifactFragment}
query artifactQuery($operation_id: Int!, $artifact: String!, $offset: Int!, $fetchLimit: Int!) {
    taskartifact_aggregate(distinct_on: id, where: {operation_id: {_eq: $operation_id}, artifact_text: {_ilike: $artifact}}) {
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {operation_id: {_eq: $operation_id}, artifact_text: {_ilike: $artifact}}) {
      ...artifactData
    }
}
`;
const hostSearch = gql`
${artifactFragment}
query hostQuery($operation_id: Int!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    taskartifact_aggregate(distinct_on: id, where: {host: {_ilike: $host}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, operation_id: {_eq: $operation_id}}) {
      ...artifactData
    }
}
`;
const commandSearch = gql`
${artifactFragment}
query commandQuery($operation_id: Int!, $command: String!, $offset: Int!, $fetchLimit: Int!) {
    taskartifact_aggregate(distinct_on: id, where: {task: {command: {cmd: {_ilike: $command}}}, operation_id: {_eq: $operation_id}}){
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {task: {command: {cmd: {_ilike: $command}}}, operation_id: {_eq: $operation_id}}) {
      ...artifactData
    }
}
`;
const operatorSearch = gql`
${artifactFragment}
query operatorQuery($operation_id: Int!, $username: String!, $offset: Int!, $fetchLimit: Int!) {
    taskartifact_aggregate(distinct_on: id, where: {task: {operator: {username: {_ilike: $username}}}, operation_id: {_eq: $operation_id}}){
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {task: {operator: {username: {_ilike: $username}}}, operation_id: {_eq: $operation_id}}) {
      ...artifactData
    }
}
`;
const typeSearch = gql`
${artifactFragment}
query typeQuery($operation_id: Int!, $type: String!, $offset: Int!, $fetchLimit: Int!) {
    taskartifact_aggregate(distinct_on: id, where: {base_artifact: {_ilike: $type}, operation_id: {_eq: $operation_id}}){
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {base_artifact: {_ilike: $type}, operation_id: {_eq: $operation_id}}) {
      ...artifactData
    }
}
`;
const taskSearch = gql`
${artifactFragment}
query taskQuery($operation_id: Int!, $task_id: Int!, $offset: Int!, $fetchLimit: Int!) {
    taskartifact_aggregate(distinct_on: id, where: {task_id: {_eq: $task_id}, operation_id: {_eq: $operation_id}}){
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {task_id: {_eq: $task_id}, operation_id: {_eq: $operation_id}}) {
      ...artifactData
    }
}
`;
const callbackSearch = gql`
${artifactFragment}
query taskQuery($operation_id: Int!, $callback_id: Int!, $offset: Int!, $fetchLimit: Int!) {
    taskartifact_aggregate(distinct_on: id, where: {task: {callback: { display_id: {_eq: $callback_id}}}, operation_id: {_eq: $operation_id}}){
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {task: {callback: { display_id: {_eq: $callback_id}}}, operation_id: {_eq: $operation_id}}) {
      ...artifactData
    }
}
`;

export function SearchTabArtifactsLabel(props){
    return (
        <MythicSearchTabLabel label={"Artifacts"} iconComponent={<FingerprintIcon />} {...props}/>
    )
}

const SearchTabArtifactsSearchPanel = (props) => {
    const theme = useTheme();
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Artifact");
    const searchFieldOptions = ["Artifact", "Command", "Host", "Type", "Task", "Callback", "Operator"];
    const handleSearchFieldChange = (event) => {
        setSearchField(event.target.value);
        props.onChangeSearchField(event.target.value);
        props.changeSearchParam("searchField", event.target.value);
    }
    const handleSearchValueChange = (name, value, error) => {
        setSearch(value);
    }
    const submitSearch = (event, querySearch, querySearchField) => {
        let adjustedSearchField = querySearchField ? querySearchField : searchField;
        let adjustedSearch = querySearch ? querySearch : search;
        props.changeSearchParam("search", adjustedSearch);
        switch(adjustedSearchField){
            case "Artifact":
                props.onArtifactSearch({search:adjustedSearch, offset: 0})
                break;
            case "Command":
                props.onCommandSearch({search:adjustedSearch, offset: 0})
                break;
            case "Host":
                props.onHostSearch({search:adjustedSearch, offset: 0})
                break;
            case "Type":
                props.onTypeSearch({search:adjustedSearch, offset: 0})
                break;
            case "Task":
                props.onTaskSearch({search:adjustedSearch, offset: 0})
                break;
            case "Callback":
                props.onCallbackSearch({search:adjustedSearch, offset: 0})
                break;
            case "Operator":
                props.onOperatorSearch({search:adjustedSearch, offset: 0})
            default:
                break;
        }
    }
    React.useEffect(() => {
        if(props.value === props.index){
            let queryParams = new URLSearchParams(window.location.search);
            let adjustedSearch = "";
            let adjustedSearchField = "Artifact";
            if(queryParams.has("search")){
                setSearch(queryParams.get("search"));
                adjustedSearch = queryParams.get("search");
            }
            if(queryParams.has("searchField") && searchFieldOptions.includes(queryParams.get("searchField"))){
                setSearchField(queryParams.get("searchField"));
                props.onChangeSearchField(queryParams.get("searchField"));
                adjustedSearchField = queryParams.get("searchField");
            }else{
                setSearchField("Artifact");
                props.onChangeSearchField("Artifact");
                props.changeSearchParam("searchField", "Artifact");
            }
            submitSearch(null, adjustedSearch, adjustedSearchField);
        }
    }, [props.value, props.index])
    return (
        <Grid container spacing={2} style={{paddingTop: "10px", paddingLeft: "10px", maxWidth: "100%"}}>
            <Grid item xs={6}>
                <MythicTextField placeholder="Search..." value={search}
                    onChange={handleSearchValueChange} onEnter={submitSearch} name="Search..." InputProps={{
                        endAdornment: 
                        <React.Fragment>
                            <Tooltip title="Search">
                                <IconButton onClick={submitSearch} size="large"><SearchIcon style={{color: theme.palette.info.main}}/></IconButton>
                            </Tooltip>
                        </React.Fragment>,
                        style: {padding: 0}
                    }}/>
            </Grid>
            <Grid item xs={6}>
                <Select
                    style={{marginBottom: "10px", width: "15rem"}}
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
        </Grid>
    );
}
export const SearchTabArtifactsPanel = (props) =>{
    const [artifactData, setArtifactData] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Artifact");
    const me = props.me;

    const onChangeSearchField = (field) => {
        setSearchField(field);
        switch(field){
            case "Artifact":
                onArtifactSearch({search, offset: 0});
                break;
            case "Command":
                onCommandSearch({search, offset: 0});
                break;
            case "Type":
                onTypeSearch({search, offset: 0});
                break;
            case "Host":
                onHostSearch({search, offset: 0});
                break;
            case "Task":
                onTaskSearch({search, offset: 0});
                break;
            case "Callback":
                onCallbackSearch({search, offset: 0});
                break;
            case "Operator":
                onOperatorSearch({search, offset: 0});
            default:
                break;
        }
    }
    const handleCallbackSearchResults = (data) => {
        snackActions.dismiss();
        setTotalCount(data.taskartifact_aggregate.aggregate.count);
        setArtifactData(data.taskartifact);
    }
    const handleCallbackSearchFailure = (data) => {
        snackActions.dismiss();
        snackActions.error("Failed to fetch data for search");
        console.log(data);
    }
    const [getArtifactSearch] = useLazyQuery(artifactSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getCommandSearch] = useLazyQuery(commandSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getTypeSearch] = useLazyQuery(typeSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getHostSearch] = useLazyQuery(hostSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getTaskSearch] = useLazyQuery(taskSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getCallbackSearch] = useLazyQuery(callbackSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchResults,
        onError: handleCallbackSearchFailure
    })
    const [getOperatorSearch] = useLazyQuery(operatorSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchResults,
        onError: handleCallbackSearchFailure
    })
    const onArtifactSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getArtifactSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            artifact: "%" + new_search + "%",
        }})
    }
    const onCommandSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getCommandSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            command: "%" + new_search + "%",
        }})
    }
    const onHostSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getHostSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            host: "%" + new_search + "%",
        }})
    }
    const onTypeSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getTypeSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            type: "%" + new_search + "%",
        }})
    }
    const onTaskSearch = ({search, offset}) => {
        if(search === ""){
            snackActions.warning("Must specify a task number");
            return;
        }
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        getTaskSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            task_id: parseInt(search),
        }})
    }
    const onCallbackSearch = ({search, offset}) => {
        if(search === ""){
            snackActions.warning("Must specify a callback number");
            return;
        }
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        getCallbackSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            callback_id: search,
        }})
    }
    const onOperatorSearch = ({search, offset}) => {
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getOperatorSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            username: "%" + new_search + "%",
        }})
    }
    const onChangePage = (event, value) => {
        switch(searchField){
            case "Artifact":
                onArtifactSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "Command":
                onCommandSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "Type":
                onTypeSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "Host":
                onHostSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "Task":
                onTaskSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "Callback":
                onCallbackSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "Operator":
                onOperatorSearch({search, offset: (value - 1) * fetchLimit});
                break;
            default:
                break;
        }
    }
    return (
        <MythicTabPanel {...props} >
                <SearchTabArtifactsSearchPanel onChangeSearchField={onChangeSearchField} onArtifactSearch={onArtifactSearch} 
                    onTaskSearch={onTaskSearch} value={props.value} index={props.index}
                    onCommandSearch={onCommandSearch} onHostSearch={onHostSearch} onOperatorSearch={onOperatorSearch}
                    onTypeSearch={onTypeSearch} onCallbackSearch={onCallbackSearch} 
                    changeSearchParam={props.changeSearchParam}/>
         
            <div style={{overflowY: "auto", flexGrow: 1}}>
                {artifactData.length > 0 ? (
                    <ArtifactTable artifacts={artifactData} />) : (
                    <div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>No Search Results</div>
                )}
            </div>

            <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center", paddingTop: "5px", paddingBottom: "10px"}}>
                <Pagination count={Math.ceil(totalCount / fetchLimit)} variant="outlined" color="primary" boundaryCount={1}
                    siblingCount={1} onChange={onChangePage} showFirstButton={true} showLastButton={true} style={{padding: "20px"}}/>
                <Typography style={{paddingLeft: "10px"}}>Total Results: {totalCount}</Typography>
            </div>
                
        </MythicTabPanel>
    )
}