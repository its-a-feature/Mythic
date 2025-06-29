import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import {useTheme} from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import { gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import Pagination from '@mui/material/Pagination';
import { Typography, Button } from '@mui/material';
import {ArtifactTable} from './ArtifactTable';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {ArtifactTableNewArtifactDialog} from "./ArtifactTableNewArtifactDialog";

const artifactFragment = gql`
fragment artifactData on taskartifact{
    id
    artifact_text
    host
    id
    timestamp
    base_artifact
    needs_cleanup
    resolved
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
query artifactQuery($artifact: String!, $offset: Int!, $fetchLimit: Int!, $needs_cleanup_a: Boolean!, $needs_cleanup_b: Boolean!, $resolved_a: Boolean!, $resolved_b: Boolean!) {
    taskartifact_aggregate(distinct_on: id, where: {artifact_text: {_ilike: $artifact}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}) {
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {artifact_text: {_ilike: $artifact}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}) {
      ...artifactData
    }
}
`;
const hostSearch = gql`
${artifactFragment}
query hostQuery($host: String!, $offset: Int!, $fetchLimit: Int!, $needs_cleanup_a: Boolean!, $needs_cleanup_b: Boolean!, $resolved_a: Boolean!, $resolved_b: Boolean!) {
    taskartifact_aggregate(distinct_on: id, where: {host: {_ilike: $host}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}) {
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host},_and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}) {
      ...artifactData
    }
}
`;
const commandSearch = gql`
${artifactFragment}
query commandQuery($command: String!, $offset: Int!, $fetchLimit: Int!, $needs_cleanup_a: Boolean!, $needs_cleanup_b: Boolean!, $resolved_a: Boolean!, $resolved_b: Boolean!) {
    taskartifact_aggregate(distinct_on: id, where: {task: {command: {cmd: {_ilike: $command}}}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}){
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {task: {command: {cmd: {_ilike: $command}}}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}) {
      ...artifactData
    }
}
`;
const operatorSearch = gql`
${artifactFragment}
query operatorQuery($username: String!, $offset: Int!, $fetchLimit: Int!, $needs_cleanup_a: Boolean!, $needs_cleanup_b: Boolean!, $resolved_a: Boolean!, $resolved_b: Boolean!) {
    taskartifact_aggregate(distinct_on: id, where: {task: {operator: {username: {_ilike: $username}}}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}){
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {task: {operator: {username: {_ilike: $username}}}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}) {
      ...artifactData
    }
}
`;
const typeSearch = gql`
${artifactFragment}
query typeQuery( $type: String!, $offset: Int!, $fetchLimit: Int!, $needs_cleanup_a: Boolean!, $needs_cleanup_b: Boolean!, $resolved_a: Boolean!, $resolved_b: Boolean!) {
    taskartifact_aggregate(distinct_on: id, where: {base_artifact: {_ilike: $type}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}){
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {base_artifact: {_ilike: $type}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}) {
      ...artifactData
    }
}
`;
const taskSearch = gql`
${artifactFragment}
query taskQuery($task_id: Int!, $offset: Int!, $fetchLimit: Int!, $needs_cleanup_a: Boolean!, $needs_cleanup_b: Boolean!, $resolved_a: Boolean!, $resolved_b: Boolean!) {
    taskartifact_aggregate(distinct_on: id, where: {task: { display_id: {_eq: $task_id}}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}){
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {task: {display_id: {_eq: $task_id}}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}) {
      ...artifactData
    }
}
`;
const callbackSearch = gql`
${artifactFragment}
query taskQuery($callback_id: Int!, $offset: Int!, $fetchLimit: Int!, $needs_cleanup_a: Boolean!, $needs_cleanup_b: Boolean!, $resolved_a: Boolean!, $resolved_b: Boolean!) {
    taskartifact_aggregate(distinct_on: id, where: {task: {callback: { display_id: {_eq: $callback_id}}}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}){
      aggregate {
        count
      }
    }
    taskartifact(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {task: {callback: { display_id: {_eq: $callback_id}}}, _and: [ {_or: [{resolved: {_eq: $resolved_a}}, {resolved: {_eq: $resolved_b}}]}, {_or: [{needs_cleanup: {_eq: $needs_cleanup_a}}, {needs_cleanup: {_eq: $needs_cleanup_b}}]} ]}) {
      ...artifactData
    }
}
`;
const createArtifactMutation = gql`
mutation createNewArtifact($task_id: Int, $base_artifact: String!, $artifact: String!, $needs_cleanup: Boolean, $resolved: Boolean, $host: String){
    createArtifact(task_id: $task_id, base_artifact: $base_artifact, artifact: $artifact, needs_cleanup: $needs_cleanup, resolved: $resolved, host: $host){
        id
        status
        error
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
    const CleanupOptions = ["All Artifacts", "Needs Cleanup", "Already Cleaned"];
    const [cleanupField, setCleanupField] = React.useState("All Artifacts");
    const [createArtifactDialogOpen, setCreateArtifactDialogOpen] = React.useState(false);
    const [createArtifact] = useMutation(createArtifactMutation, {
        onCompleted: (data) => {
            if(data.createArtifact.status === "success"){
                snackActions.info("Successfully created artifact");
            } else {
                snackActions.error(data.createArtifact.error);
            }
        },
        onError: (error) => {

        }
    });
    const handleSearchFieldChange = (event) => {
        setSearchField(event.target.value);
        props.onChangeSearchField(event.target.value);
        props.changeSearchParam("searchField", event.target.value);
    }
    const handleSearchValueChange = (name, value, error) => {
        setSearch(value);
    }
    const handleCleanupChange = (event) => {
        setCleanupField(event.target.value);
        props.onChangeCleanupField(event.target.value);
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
    const onCreateArtifact = ({base_artifact, artifact, needs_cleanup, resolved, host}) => {
        createArtifact({variables: {base_artifact, artifact, needs_cleanup, resolved, host}})
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
        <Grid container spacing={2} style={{padding: "5px 5px 0 5px", maxWidth: "100%"}}>
            <Grid size={6}>
                <MythicTextField placeholder="Search..." value={search} marginTop={"0px"}
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
            <Grid size={5}>
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
                <Select
                    style={{marginBottom: "10px", width: "15rem"}}
                    value={cleanupField}
                    onChange={handleCleanupChange}
                >
                    {
                        CleanupOptions.map((opt, i) => (
                            <MenuItem key={"cleanup" + opt} value={opt}>{opt}</MenuItem>
                        ))
                    }
                </Select>
            </Grid>
            <Grid size={1}>
                {createArtifactDialogOpen &&
                    <MythicDialog fullWidth={true} maxWidth="md" open={createArtifactDialogOpen}
                                  onClose={()=>{setCreateArtifactDialogOpen(false);}}
                                  innerDialog={<ArtifactTableNewArtifactDialog onSubmit={onCreateArtifact} onClose={()=>{setCreateArtifactDialogOpen(false);}} />}
                    />
                }

                <Button  style={{marginRight: "5px"}}
                         size="small" color="success" onClick={ () => {setCreateArtifactDialogOpen(true);}} variant="contained">
                    <FingerprintIcon style={{marginRight: "5px"}} />
                    New
                </Button>
            </Grid>
        </Grid>
    );
}
export const SearchTabArtifactsPanel = (props) =>{
    const [artifactData, setArtifactData] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Artifact");
    const cleanupField = React.useRef("All Artifacts");
    const me = props.me;
    const onChangeCleanupField = (field) => {
        cleanupField.current = field;
        onChangeSearchField(searchField);
    }
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
    const getArtifactSearch = useMythicLazyQuery(artifactSearch, {
        fetchPolicy: "no-cache"
    })
    const getCommandSearch = useMythicLazyQuery(commandSearch, {
        fetchPolicy: "no-cache"
    })
    const getTypeSearch = useMythicLazyQuery(typeSearch, {
        fetchPolicy: "no-cache"
    })
    const getHostSearch = useMythicLazyQuery(hostSearch, {
        fetchPolicy: "no-cache"
    })
    const getTaskSearch = useMythicLazyQuery(taskSearch, {
        fetchPolicy: "no-cache"
    })
    const getCallbackSearch = useMythicLazyQuery(callbackSearch, {
        fetchPolicy: "no-cache"
    })
    const getOperatorSearch = useMythicLazyQuery(operatorSearch, {
        fetchPolicy: "no-cache"
    });
    const getCleanupSearchOptions = () => {
        switch(cleanupField.current){
            case "All Artifacts":
                return {needs_cleanup_a: true, needs_cleanup_b: false, resolved_a: true, resolved_b: false};
            case "Needs Cleanup":
                return {needs_cleanup_a: true, needs_cleanup_b: true, resolved_a: false, resolved_b: false};
            case "Already Cleaned":
                return {needs_cleanup_a: true, needs_cleanup_b: true, resolved_a: true, resolved_b: true};
        }
    }
    const onArtifactSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        let cleanupOptions = getCleanupSearchOptions();
        getArtifactSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            artifact: "%" + new_search + "%",
            ...cleanupOptions,
        }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onCommandSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        let cleanupOptions = getCleanupSearchOptions();
        getCommandSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            command: "%" + new_search + "%",
                ...cleanupOptions,
        }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onHostSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        let cleanupOptions = getCleanupSearchOptions();
        getHostSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            host: "%" + new_search + "%",
                ...cleanupOptions
        }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onTypeSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        let cleanupOptions = getCleanupSearchOptions();
        getTypeSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            type: "%" + new_search + "%",
                ...cleanupOptions
        }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onTaskSearch = ({search, offset}) => {
        if(search === ""){
            snackActions.warning("Must specify a task number");
            return;
        }
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let cleanupOptions = getCleanupSearchOptions();
        getTaskSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            task_id: parseInt(search),
                ...cleanupOptions
        }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onCallbackSearch = ({search, offset}) => {
        if(search === ""){
            snackActions.warning("Must specify a callback number");
            return;
        }
        //snackActions.info("Searching...", {persist:true});
        let cleanupOptions = getCleanupSearchOptions();
        setSearch(search);
        getCallbackSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            callback_id: search,
                ...cleanupOptions
        }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onOperatorSearch = ({search, offset}) => {
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        let cleanupOptions = getCleanupSearchOptions();
        getOperatorSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            username: "%" + new_search + "%",
                ...cleanupOptions
        }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
                                               onChangeCleanupField={onChangeCleanupField}
                    changeSearchParam={props.changeSearchParam}/>
         
            <div style={{overflowY: "auto", flexGrow: 1}}>
                {artifactData.length > 0 ? (
                    <ArtifactTable artifacts={artifactData} />) : (
                    <div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>No Search Results</div>
                )}
            </div>

            <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center", paddingTop: "5px", paddingBottom: "10px"}}>
                <Pagination count={Math.ceil(totalCount / fetchLimit)} variant="outlined" color="info" boundaryCount={1}
                    siblingCount={1} onChange={onChangePage} showFirstButton={true} showLastButton={true} style={{padding: "20px"}}/>
                <Typography style={{paddingLeft: "10px"}}>Total Results: {totalCount}</Typography>
            </div>
                
        </MythicTabPanel>
    )
}