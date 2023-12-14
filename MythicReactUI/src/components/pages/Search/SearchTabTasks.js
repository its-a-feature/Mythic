import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {TaskDisplay} from '../Callbacks/TaskDisplay';
import AssignmentIcon from '@mui/icons-material/Assignment';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import {useTheme} from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import { gql, useLazyQuery } from '@apollo/client';
import {taskingDataFragment} from '../Callbacks/CallbackMutations'
import { snackActions } from '../../utilities/Snackbar';
import Pagination from '@mui/material/Pagination';
import { Typography } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

const fetchLimit = 20;
const responseSearch = gql`
${taskingDataFragment}
query responseQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!) {
    task_aggregate(distinct_on: id, order_by: {id: asc}, where: {status: {_ilike: $status}, responses: {response_escape: {_ilike: $search}}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: asc}, where: {status: {_ilike: $status}, responses: {response_escape: {_ilike: $search}}}) {
      ...taskData
    }
  }
`;
const parameterSearch = gql`
${taskingDataFragment}
query parametersQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!) {
    task_aggregate(distinct_on: id, order_by: {id: desc}, where: {status: {_ilike: $status}, original_params: {_ilike: $search}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {status: {_ilike: $status}, original_params: {_ilike: $search}}) {
      ...taskData
    }
  }
`;
const commentSearch = gql`
${taskingDataFragment}
query responseQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!) {
    task_aggregate(distinct_on: id, order_by: {id: desc}, where: {status: {_ilike: $status}, comment: {_ilike: $search}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {status: {_ilike: $status}, comment: {_ilike: $search}}) {
      ...taskData
    }
  }
`;
const commandSearch = gql`
${taskingDataFragment}
query commandQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!) {
    task_aggregate(distinct_on: id, order_by: {id: desc}, where: {status: {_ilike: $status}, command_name: {_ilike: $search}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {status: {_ilike: $status}, command_name: {_ilike: $search}}) {
      ...taskData
    }
  }
`;
const tagSearch = gql`
${taskingDataFragment}
query tagSearchTaskQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!) {
    tag_aggregate(distinct_on: id, order_by: {id: desc}, where: {task_id: {_is_null: false}, task: {status: {_ilike: $status}}, _or: [{data: {_cast: {String: {_ilike: $search}}}}, {tagtype: {name: {_ilike: $search}}}]}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {task_id: {_is_null: false}, task: {status: {_ilike: $status}}, _or: [{data: {_cast: {String: {_ilike: $search}}}}, {tagtype: {name: {_ilike: $search}}}]}) {
      task{
        ...taskData
      }
    }
  }
`;
const callbackIDSearch = gql`
${taskingDataFragment}
query responseQuery($search: Int!, $offset: Int!, $fetchLimit: Int!, $status: String!) {
    task_aggregate(distinct_on: id, order_by: {id: desc}, where: {status: {_ilike: $status}, callback: {display_id: {_eq: $search}}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {status: {_ilike: $status}, callback: {display_id: {_eq: $search}}}) {
      ...taskData
    }
  }
`;
const callbackGroupSearch = gql`
${taskingDataFragment}
query responseQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!) {
    task_aggregate(distinct_on: id, order_by: {id: desc}, where: {status: {_ilike: $status}, callback: {mythictree_groups_string: {_ilike: $search}}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {status: {_ilike: $status}, callback: {mythictree_groups_string: {_ilike: $search}}}) {
      ...taskData
    }
  }
`;

export function SearchTabTasksLabel(props){
    return (
        <MythicSearchTabLabel label={"Tasks"} iconComponent={<AssignmentIcon />} {...props}/>
    )
}

const SearchTabTasksSearchPanel = (props) => {
    const theme = useTheme();
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Command");
    const searchFieldOptions = ["Output","Command", "Parameters", "Comment", "Tag", "Callback ID", "Callback Group"];
    const [filterTaskStatus, setFilterTaskStatus] = React.useState("");
    const handleSearchFieldChange = (event) => {
        setSearchField(event.target.value);
        props.onChangeSearchField(event.target.value);
        props.changeSearchParam("searchField", event.target.value);
    }
    const handleSearchValueChange = (name, value, error) => {
        setSearch(value);
        
    }
    const handleFilterTaskStatusValueChange = (name, value, error) => {
        setFilterTaskStatus(value);
        props.onChangeTaskStatus(value);
    }
    const submitSearch = (event, querySearch, querySearchField, queryTaskStatus) => {
            let adjustedSearchField = querySearchField ? querySearchField : searchField;
            let adjustedSearch = querySearch ? querySearch : search;
            let adjustedTaskStatus = queryTaskStatus ? queryTaskStatus : filterTaskStatus;
            props.changeSearchParam("search", adjustedSearch);
            props.changeSearchParam("taskStatus", adjustedTaskStatus);
            switch(adjustedSearchField){
            case "Output":
                props.onOutputSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus})
                break;
            case "Parameters":
                props.onParameterSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus})
                break;
            case "Comment":
                props.onCommentSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus})
                break;
            case "Command":
                props.onCommandSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus})
                break;
            case "Tag":
                props.onTagSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus});
                break;
            case "Callback ID":
                props.onCallbackIDSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus});
                break;
            case "Callback Group":
                props.onCallbackGroupSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus});
                break;
            default:
                break;
        }
    }
    React.useEffect(() => {
        if(props.value === props.index){
            let queryParams = new URLSearchParams(window.location.search);
            let adjustedSearch = "";
            let adjustedSearchField = "Command";
            let adjustedTaskStatus = "";
            if(queryParams.has("search")){
                setSearch(queryParams.get("search"));
                adjustedSearch = queryParams.get("search");
            }
            if(queryParams.has("searchField") && searchFieldOptions.includes(queryParams.get("searchField"))){
                setSearchField(queryParams.get("searchField"));
                props.onChangeSearchField(queryParams.get("searchField"));
                adjustedSearchField = queryParams.get("searchField");
            }else{
                setSearchField("Command");
                props.onChangeSearchField("Command");
                props.changeSearchParam("searchField", "Command");
            }
            if(queryParams.has("taskStatus")){
                setFilterTaskStatus(queryParams.get("taskStatus"));
                props.onChangeTaskStatus(queryParams.get("taskStatus"));
                adjustedTaskStatus = queryParams.get("taskStatus");
            }
            submitSearch(null, adjustedSearch, adjustedSearchField, adjustedTaskStatus);
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
            <Grid item xs={4}>
                <MythicTextField placeholder="Filter Task Status..." value={filterTaskStatus}
                        onChange={handleFilterTaskStatusValueChange} onEnter={submitSearch} name="Filter Task Status..."/>
            </Grid>
        </Grid>
    );
}
export const SearchTabTasksPanel = (props) =>{
    const [taskingData, setTaskingData] = React.useState({task: []});
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Command");
    const [taskStatus, setTaskStatus] = React.useState("");
    const onChangeSearchField = (field) => {
        setSearchField(field);
        switch(field){
            case "Output":
                onOutputSearch({search, offset: 0, taskStatus});
                break;
            case "Parameters":
                onParameterSearch({search, offset: 0, taskStatus});
                break;
            case "Comment":
                onCommentSearch({search, offset: 0, taskStatus});
                break;
            case "Command":
                onCommandSearch({search, offset: 0, taskStatus});
                break;
            case "Tag":
                onTagSearch({search, offset: 0, taskStatus});
                break;
            case "Callback ID":
                onCallbackIDSearch({search, offset: 0, taskStatus});
                break;
            case "Callback Group":
                onCallbackGroupSearch({search, offset: 0, taskStatus});
                break;
            default:
                break;
        }
    }
    const onChangeTaskStatus = (status) => {
        setTaskStatus(status);
    }
    const handleCallbackSearchSuccess = (data) => {
        snackActions.dismiss();
        if(searchField === "Tag"){
            setTotalCount(data.tag_aggregate.aggregate.count);
            setTaskingData({task: data.tag.map(t => t.task)});
        } else {
            setTotalCount(data.task_aggregate.aggregate.count);
            setTaskingData({task: data.task});
        }

    }
    const handleCallbackSearchFailure = (data) => {
        snackActions.dismiss();
        snackActions.error("Failed to fetch data for search");
        console.log(data);
    }
    const [getOutputSearch] = useLazyQuery(responseSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchSuccess,
        onError: handleCallbackSearchFailure
    })
    const [getParameterSearch] = useLazyQuery(parameterSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchSuccess,
        onError: handleCallbackSearchFailure
    })
    const [getCommentSearch] = useLazyQuery(commentSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchSuccess,
        onError: handleCallbackSearchFailure
    })
    const [getCommandSearch] = useLazyQuery(commandSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchSuccess,
        onError: handleCallbackSearchFailure
    })
    const [getTagSearch] = useLazyQuery(tagSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchSuccess,
        onError: handleCallbackSearchFailure
    })
    const [getCallbackIDSearch] = useLazyQuery(callbackIDSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchSuccess,
        onError: handleCallbackSearchFailure
    })
    const [getCallbackGroupSearch] = useLazyQuery(callbackGroupSearch, {
        fetchPolicy: "no-cache",
        onCompleted: handleCallbackSearchSuccess,
        onError: handleCallbackSearchFailure
    })
    const onOutputSearch = ({search, offset, taskStatus}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        getOutputSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            search: "%" + new_search + "%",
            status: "%" + newTaskStatus + "%"
        }})
    }
    const onParameterSearch = ({search, offset, taskStatus}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        getParameterSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            search: "%" + new_search + "%",
            status: "%" + newTaskStatus + "%"
        }})
    }
    const onCommentSearch = ({search, offset, taskStatus}) => {
        //snackActions.info("Searching...", {persist:true});
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        setSearch(search);
        getCommentSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            search: "%" + new_search + "%",
            status: "%" + newTaskStatus + "%"
        }})
    }
    const onCommandSearch = ({search, offset, taskStatus}) => {
        //snackActions.info("Searching...", {persist:true});
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        setSearch(search);
        getCommandSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            search: "%" + new_search + "%",
            status: "%" + newTaskStatus + "%"
        }})
    }
    const onTagSearch = ({search, offset, taskStatus}) => {
        //snackActions.info("Searching...", {persist:true});
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        setSearch(search);
        getTagSearch({variables:{
                offset: offset,
                fetchLimit: fetchLimit,
                search: "%" + new_search + "%",
                status: "%" + newTaskStatus + "%"
            }})
    }
    const onCallbackIDSearch = ({search, offset, taskStatus}) => {
        //snackActions.info("Searching...", {persist:true});
        try{
            let new_search = parseInt(search);
            if(isNaN(new_search)){
                if(search.length > 0){
                    snackActions.warning("Must supply an integer to search.");
                }
                return
            }
            let newTaskStatus = taskStatus;
            if(newTaskStatus === ""){
                newTaskStatus = "_";
            }
            setSearch(search);
            getCallbackIDSearch({variables:{
                    offset: offset,
                    fetchLimit: fetchLimit,
                    search: new_search,
                    status: "%" + newTaskStatus + "%"
                }})
        }catch(error){
            snackActions.warning("Must supply an integer to search.");
        }
    }
    const onCallbackGroupSearch = ({search, offset, taskStatus}) => {
        //snackActions.info("Searching...", {persist:true});
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        setSearch(search);
        getCallbackGroupSearch({variables:{
                offset: offset,
                fetchLimit: fetchLimit,
                search: "%" + new_search + "%",
                status: "%" + newTaskStatus + "%"
            }})
    }
    const onChangePage = (event, value) => {

        switch(searchField){
            case "Output":
                onOutputSearch({search, offset: (value - 1) * fetchLimit, taskStatus });
                break;
            case "Parameters":
                onParameterSearch({search, offset: (value - 1) * fetchLimit, taskStatus });
                break;
            case "Comment":
                onCommentSearch({search, offset: (value - 1) * fetchLimit, taskStatus });
                break;
            case "Command":
                onCommandSearch({search, offset: (value - 1) * fetchLimit, taskStatus });
                break;
            case "Tag":
                onTagSearch({search, offset: (value-1) *fetchLimit, taskStatus});
                break;
            case "Callback ID":
                onCallbackIDSearch({search, offset: (value-1) *fetchLimit, taskStatus});
                break;
            case "Callback Group":
                onCallbackGroupSearch({search, offset: (value-1) *fetchLimit, taskStatus});
                break;
            default:
                break;
        }
    }
    return (
        <MythicTabPanel {...props} >
            <SearchTabTasksSearchPanel 
                onChangeSearchField={onChangeSearchField} 
                onCommandSearch={onCommandSearch} 
                onOutputSearch={onOutputSearch} value={props.value} index={props.index} onChangeTaskStatus={onChangeTaskStatus}
                onTagSearch={onTagSearch}
                onCallbackIDSearch={onCallbackIDSearch} onCallbackGroupSearch={onCallbackGroupSearch}
                onParameterSearch={onParameterSearch} onCommentSearch={onCommentSearch} changeSearchParam={props.changeSearchParam}/>
            <div style={{overflowY: "auto", flexGrow: 1}}>
                
                {
                    taskingData.task.length > 0 ? (
                        taskingData.task.map( (task) => (
                            <TaskDisplay key={"taskinteractdisplay" + task.id} me={props.me} task={task} command_id={task.command == null ? 0 : task.command.id} />
                        ))
                    ) : (<div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>No Search Results</div>)
                }
            </div>
            <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center"}}>
            <Pagination count={Math.ceil(totalCount / fetchLimit)} variant="outlined" color="primary" boundaryCount={1}
                    siblingCount={1} onChange={onChangePage} showFirstButton={true} showLastButton={true} style={{padding: "20px"}}/>
                <Typography style={{paddingLeft: "10px"}}>Total Results: {totalCount}</Typography>
            </div>
        </MythicTabPanel>
    )
}