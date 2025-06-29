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
import { gql, useQuery } from '@apollo/client';
import {taskingDataFragment} from '../Callbacks/CallbackMutations'
import { snackActions } from '../../utilities/Snackbar';
import Pagination from '@mui/material/Pagination';
import { Typography } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {TaskDisplayInteractiveSearch} from "./SearchTabInteractiveTasks";
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import SmartToyTwoToneIcon from '@mui/icons-material/SmartToyTwoTone';

const fetchLimit = 50;
const responseSearch = gql`
${taskingDataFragment}
query responseQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!, $host: String!, $filterOperator: String!) {
    task_aggregate(distinct_on: id, order_by: {id: asc}, where: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, responses: {response_escape: {_ilike: $search}}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: asc}, where: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, responses: {response_escape: {_ilike: $search}}}) {
      ...taskData
    }
  }
`;
const parameterSearch = gql`
${taskingDataFragment}
query parametersQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!, $host: String!, $filterOperator: String!) {
    task_aggregate(distinct_on: id, order_by: {id: desc}, where: {status: {_ilike: $status},operator: {username: {_like: $filterOperator}},  callback: {host: {_ilike: $host}}, original_params: {_ilike: $search}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {status: {_ilike: $status},operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, original_params: {_ilike: $search}}) {
      ...taskData
    }
  }
`;
const commentSearch = gql`
${taskingDataFragment}
query responseQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!, $host: String!, $filterOperator: String!) {
    task_aggregate(distinct_on: id, order_by: {id: desc}, where: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, comment: {_ilike: $search}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, comment: {_ilike: $search}}) {
      ...taskData
    }
  }
`;
const commandSearch = gql`
${taskingDataFragment}
query commandQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!, $host: String!, $filterOperator: String!) {
    task_aggregate(distinct_on: id, order_by: {id: desc}, where: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, command_name: {_ilike: $search}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, command_name: {_ilike: $search}}) {
      ...taskData
    }
  }
`;
const commandAndParameterSearch = gql`
${taskingDataFragment}
query parametersQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!, $host: String!, $filterOperator: String!) {
    task_aggregate(distinct_on: id, order_by: {id: desc}, where: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, _or: [{original_params: {_ilike: $search}}, {command: {cmd: {_ilike: $search}}}, {command_name: {_ilike: $search}}]}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, _or: [{original_params: {_ilike: $search}}, {command: {cmd: {_ilike: $search}}}, {command_name: {_ilike: $search}}]}) {
      ...taskData
    }
  }
`;
const tagSearch = gql`
${taskingDataFragment}
query tagSearchTaskQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!, $host: String!, $filterOperator: String!) {
    tag_aggregate(distinct_on: task_id, order_by: {task_id: desc}, where: {task_id: {_is_null: false}, task: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}}, _or: [{data: {_cast: {String: {_ilike: $search}}}}, {tagtype: {name: {_ilike: $search}}}]}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: task_id, offset: $offset, order_by: {task_id: desc}, where: {task_id: {_is_null: false}, task: {status: {_ilike: $status},operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}}, _or: [{data: {_cast: {String: {_ilike: $search}}}}, {tagtype: {name: {_ilike: $search}}}]}) {
      task{
        ...taskData
      }
    }
  }
`;
const callbackIDSearch = gql`
${taskingDataFragment}
query responseQuery($search: Int!, $offset: Int!, $fetchLimit: Int!, $status: String!, $host: String!, $filterOperator: String!) {
    task_aggregate(distinct_on: id, order_by: {id: desc}, where: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, callback: {display_id: {_eq: $search}}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, callback: {display_id: {_eq: $search}}}) {
      ...taskData
    }
  }
`;
const callbackGroupSearch = gql`
${taskingDataFragment}
query responseQuery($search: String!, $offset: Int!, $fetchLimit: Int!, $status: String!, $host: String!, $filterOperator: String!) {
    task_aggregate(distinct_on: id, order_by: {id: desc}, where: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, callback: {mythictree_groups_string: {_ilike: $search}}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {status: {_ilike: $status}, operator: {username: {_like: $filterOperator}}, callback: {host: {_ilike: $host}}, callback: {mythictree_groups_string: {_ilike: $search}}}) {
      ...taskData
    }
  }
`;

const getOperators = gql`
    query getOperators {
        operator(order_by: {username: asc}) {
            id
            username
            account_type
            deleted
            active
        }
    }
`;

export function SearchTabTasksLabel(props){
    return (
        <MythicSearchTabLabel label={"Tasks"} iconComponent={<AssignmentIcon />} {...props}/>
    )
}

const AllOperator = {id: 0, username: "All Operators", account_type: "", active: true, deleted: false}
const SearchTabTasksSearchPanel = (props) => {
    const theme = useTheme();
    const [search, setSearch] = React.useState("");
    const [host, setHost] = React.useState("");
    const [searchField, setSearchField] = React.useState("Command and Parameters");
    const searchFieldOptions = ["Output", "Command and Parameters", "Command", "Parameters", "Comment", "Tag", "Callback ID", "Callback Group"];
    const [filterTaskStatus, setFilterTaskStatus] = React.useState("");
    const [filterOperator, setFilterOperator] = React.useState(AllOperator.username);
    const [operatorOptions, setOperatorOptions] = React.useState([AllOperator]);
    useQuery(getOperators, {
        onCompleted: (data) => {
            setOperatorOptions([AllOperator, ...data.operator])
        },
        onError: (data) => {

        }
    })
    const handleSearchFieldChange = (event) => {
        setSearchField(event.target.value);
        props.onChangeSearchField(event.target.value);
        props.changeSearchParam("searchField", event.target.value);
    }
    const handleOperatorFilterChange = (event) => {
        setFilterOperator(event.target.value);
        props.onChangeFilterOperator(event.target.value);
    }
    const handleSearchValueChange = (name, value, error) => {
        setSearch(value);
    }
    const handleHostValueChange = (name, value, error) => {
        setHost(value);
        props.onChangeHost(value);
    }
    const handleFilterTaskStatusValueChange = (name, value, error) => {
        setFilterTaskStatus(value);
        props.onChangeTaskStatus(value);
    }
    const submitSearch = (event, querySearch, querySearchField, queryTaskStatus, queryHost, queryFilterOperator) => {
            let adjustedSearchField = querySearchField ? querySearchField : searchField;
            let adjustedSearch = querySearch ? querySearch : search;
            let adjustedTaskStatus = queryTaskStatus ? queryTaskStatus : filterTaskStatus;
            let adjustedHost = queryHost ? queryHost : host;
            let adjustedFilterOperator = queryFilterOperator ? queryFilterOperator : filterOperator;
            props.changeSearchParam("search", adjustedSearch);
            props.changeSearchParam("taskStatus", adjustedTaskStatus);
            props.changeSearchParam("host", adjustedHost);
            props.changeSearchParam("filterOperator", adjustedFilterOperator);
            switch(adjustedSearchField){
            case "Output":
                props.onOutputSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus, host: adjustedHost, filterOperator: adjustedFilterOperator})
                break;
            case "Parameters":
                props.onParameterSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus, host: adjustedHost, filterOperator: adjustedFilterOperator})
                break;
            case "Comment":
                props.onCommentSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus, host: adjustedHost, filterOperator: adjustedFilterOperator})
                break;
            case "Command":
                props.onCommandSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus, host: adjustedHost, filterOperator: adjustedFilterOperator})
                break;
            case "Command and Parameters":
                props.onCommandAndParametersSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus, host: adjustedHost, filterOperator: adjustedFilterOperator})
                break;
            case "Tag":
                props.onTagSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus, host: adjustedHost, filterOperator: adjustedFilterOperator});
                break;
            case "Callback ID":
                props.onCallbackIDSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus, host: adjustedHost, filterOperator: adjustedFilterOperator});
                break;
            case "Callback Group":
                props.onCallbackGroupSearch({search:adjustedSearch, offset: 0, taskStatus: adjustedTaskStatus, host: adjustedHost, filterOperator: adjustedFilterOperator});
                break;
            default:
                break;
        }
    }
    React.useEffect(() => {
        if(props.value === props.index){
            let queryParams = new URLSearchParams(window.location.search);
            let adjustedSearch = "";
            let adjustedSearchField = "Command and Parameters";
            let adjustedTaskStatus = "";
            let adjustedHost = "";
            let adjustedFilterOperator = "";
            if(queryParams.has("search")){
                setSearch(queryParams.get("search"));
                adjustedSearch = queryParams.get("search");
            }
            if(queryParams.has("searchField") && searchFieldOptions.includes(queryParams.get("searchField"))){
                setSearchField(queryParams.get("searchField"));
                props.onChangeSearchField(queryParams.get("searchField"));
                adjustedSearchField = queryParams.get("searchField");
            }else{
                setSearchField("Command and Parameters");
                props.onChangeSearchField("Command and Parameters");
                props.changeSearchParam("searchField", "Command and Parameters");
            }
            if(queryParams.has("taskStatus")){
                setFilterTaskStatus(queryParams.get("taskStatus"));
                props.onChangeTaskStatus(queryParams.get("taskStatus"));
                adjustedTaskStatus = queryParams.get("taskStatus");
            }
            if(queryParams.has("host")){
                setHost(queryParams.get("host"));
                props.onChangeHost(queryParams.get("host"));
                adjustedHost = queryParams.get("host");
            }
            if(queryParams.has("filterOperator")){
                setFilterOperator(queryParams.get("filterOperator"));
                props.onChangeFilterOperator(queryParams.get("filterOperator"));
                adjustedFilterOperator = queryParams.get("filterOperator");
            }
            submitSearch(null, adjustedSearch, adjustedSearchField, adjustedTaskStatus, adjustedHost, adjustedFilterOperator);
        }
    }, [props.value, props.index]);
    return (
        <Grid container spacing={1} style={{padding: "5px 5px 0px 5px", maxWidth: "100%"}}>
            <Grid size={2}>
                <MythicTextField disabled={props.alreadySearching} placeholder="Host..." value={host}
                                 marginTop={"0px"}
                                 onChange={handleHostValueChange} onEnter={submitSearch} name="Search by Host..." InputProps={{
                    style: {padding: 0}
                }}/>
            </Grid>
            <Grid size={4}>
                <MythicTextField disabled={props.alreadySearching} placeholder="Search..." value={search}
                                 marginTop={"0px"}
                    onChange={handleSearchValueChange} onEnter={submitSearch} name="Search..." InputProps={{
                        endAdornment: 
                        <React.Fragment>
                            <Tooltip title="Search">
                                <IconButton disabled={props.alreadySearching} onClick={submitSearch} size="large"><SearchIcon style={{color: theme.palette.info.main}}/></IconButton>
                            </Tooltip>
                        </React.Fragment>,
                        style: {padding: 0}
                    }}/>
            </Grid>
            <Grid size={2}>
                <Select
                    style={{marginBottom: "10px", width: "100%"}}
                    value={searchField}
                    disabled={props.alreadySearching}
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
                <MythicTextField disabled={props.alreadySearching} placeholder="Filter Task Status..." value={filterTaskStatus}
                                 marginTop={"0px"}
                        onChange={handleFilterTaskStatusValueChange} onEnter={submitSearch} name="Filter Task Status..."/>
            </Grid>
            <Grid size={2}>
                <Select
                    style={{marginBottom: "10px", width: "100%"}}
                    value={filterOperator}
                    disabled={props.alreadySearching}
                    onChange={handleOperatorFilterChange}
                >
                    {
                        operatorOptions.map((opt, i) => (
                            <MenuItem key={"searchopt" + opt.id} value={opt.username}>
                                <Typography style={{textDecoration: opt.deleted ? 'line-through': ''}}>
                                    {opt.username}
                                </Typography>
                                {opt.account_type === 'bot' && (
                                    <>
                                        {" ( "} <SmartToyTwoToneIcon /> {" )"}
                                    </>
                                )}
                                {!opt.active &&
                                    " ( inactive ) "
                                }
                            </MenuItem>
                        ))
                    }
                </Select>
            </Grid>
        </Grid>
    );
}
export const SearchTabTasksPanel = (props) =>{
    const [taskingData, setTaskingData] = React.useState({task: []});
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Command and Parameters");
    const [taskStatus, setTaskStatus] = React.useState("");
    const [alreadySearching, setAlreadySearching] = React.useState(false);
    const [host, setHost] = React.useState("");
    const [filterOperator, setFilterOperator] = React.useState("All Operators")
    const onChangeFilterOperator = (operator) => {
        setFilterOperator(operator);
        switch(searchField){
            case "Output":
                onOutputSearch({search, offset: 0, taskStatus, host, filterOperator:operator});
                break;
            case "Parameters":
                onParameterSearch({search, offset: 0, taskStatus, host, filterOperator:operator});
                break;
            case "Comment":
                onCommentSearch({search, offset: 0, taskStatus, host, filterOperator:operator});
                break;
            case "Command":
                onCommandSearch({search, offset: 0, taskStatus, host, filterOperator:operator});
                break;
            case "Command and Parameters":
                onCommandAndParametersSearch({search, offset: 0, taskStatus, host, filterOperator:operator});
                break;
            case "Tag":
                onTagSearch({search, offset: 0, taskStatus, host, filterOperator:operator});
                break;
            case "Callback ID":
                onCallbackIDSearch({search, offset: 0, taskStatus, host, filterOperator:operator});
                break;
            case "Callback Group":
                onCallbackGroupSearch({search, offset: 0, taskStatus, host, filterOperator:operator});
                break;
            default:
                break;
        }
    }
    const onChangeSearchField = (field) => {
        setSearchField(field);
        switch(field){
            case "Output":
                onOutputSearch({search, offset: 0, taskStatus, host, filterOperator});
                break;
            case "Parameters":
                onParameterSearch({search, offset: 0, taskStatus, host, filterOperator});
                break;
            case "Comment":
                onCommentSearch({search, offset: 0, taskStatus, host, filterOperator});
                break;
            case "Command":
                onCommandSearch({search, offset: 0, taskStatus, host, filterOperator});
                break;
            case "Command and Parameters":
                onCommandAndParametersSearch({search, offset: 0, taskStatus, host, filterOperator});
                break;
            case "Tag":
                onTagSearch({search, offset: 0, taskStatus, host, filterOperator});
                break;
            case "Callback ID":
                onCallbackIDSearch({search, offset: 0, taskStatus, host, filterOperator});
                break;
            case "Callback Group":
                onCallbackGroupSearch({search, offset: 0, taskStatus, host, filterOperator});
                break;
            default:
                break;
        }
    }
    const onChangeTaskStatus = (status) => {
        setTaskStatus(status);
    }
    const onChangeHost = (host) => {
        setHost(host);
    }
    const handleCallbackSearchSuccess = (data) => {
        snackActions.dismiss();
        setAlreadySearching(false);
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
        setAlreadySearching(false);
        snackActions.error("Failed to fetch data for search");
        console.log(data);
    }
    const getOutputSearch = useMythicLazyQuery(responseSearch, {
        fetchPolicy: "no-cache"
    })
    const getParameterSearch = useMythicLazyQuery(parameterSearch, {
        fetchPolicy: "no-cache"
    })
    const getCommentSearch = useMythicLazyQuery(commentSearch, {
        fetchPolicy: "no-cache"
    })
    const getCommandSearch = useMythicLazyQuery(commandSearch, {
        fetchPolicy: "no-cache"
    })
    const getCommandAndParametersSearch = useMythicLazyQuery(commandAndParameterSearch, {
        fetchPolicy: "no-cache"
    })
    const getTagSearch = useMythicLazyQuery(tagSearch, {
        fetchPolicy: "no-cache"
    })
    const getCallbackIDSearch = useMythicLazyQuery(callbackIDSearch, {
        fetchPolicy: "no-cache"
    })
    const getCallbackGroupSearch = useMythicLazyQuery(callbackGroupSearch, {
        fetchPolicy: "no-cache"
    })
    const onOutputSearch = ({search, offset, taskStatus, host, filterOperator}) => {
        if(alreadySearching){
            snackActions.info("Still searching, please wait for it to finish");
            return;
        } else {
            setAlreadySearching(true);
        }
        snackActions.info("Searching...", {autoClose:false});
        setSearch(search);
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        let newHost = host;
        if(newHost === ""){
            newHost = "_";
        }
        let newFilterOperator = filterOperator;
        if(newFilterOperator === "All Operators"){
            newFilterOperator = "%_%";
        }
        getOutputSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            search: "%" + new_search + "%",
            status: "%" + newTaskStatus + "%",
            host: "%" + newHost + "%",
                filterOperator: newFilterOperator
        }}).then(({data}) => handleCallbackSearchSuccess(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onParameterSearch = ({search, offset, taskStatus, host, filterOperator}) => {
        //snackActions.info("Searching...", {persist:true});
        if(alreadySearching){
            snackActions.info("Still searching, please wait for it to finish");
            return;
        } else {
            setAlreadySearching(true);
        }
        setSearch(search);
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        let newHost = host;
        if(newHost === ""){
            newHost = "_";
        }
        let newFilterOperator = filterOperator;
        if(newFilterOperator === "All Operators"){
            newFilterOperator = "%_%";
        }
        getParameterSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            search: "%" + new_search + "%",
            status: "%" + newTaskStatus + "%",
                host: "%" + newHost + "%",
                filterOperator: newFilterOperator,
        }}).then(({data}) => handleCallbackSearchSuccess(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onCommentSearch = ({search, offset, taskStatus, host, filterOperator}) => {
        //snackActions.info("Searching...", {persist:true});
        if(alreadySearching){
            snackActions.info("Still searching, please wait for it to finish");
            return;
        } else {
            setAlreadySearching(true);
        }
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        let newHost = host;
        if(newHost === ""){
            newHost = "_";
        }
        let newFilterOperator = filterOperator;
        if(newFilterOperator === "All Operators"){
            newFilterOperator = "%_%";
        }
        setSearch(search);
        getCommentSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            search: "%" + new_search + "%",
            status: "%" + newTaskStatus + "%",
                host: "%" + newHost + "%",
                filterOperator: newFilterOperator,
        }}).then(({data}) => handleCallbackSearchSuccess(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onCommandSearch = ({search, offset, taskStatus, host, filterOperator}) => {
        //snackActions.info("Searching...", {persist:true});
        if(alreadySearching){
            snackActions.info("Still searching, please wait for it to finish");
            return;
        } else {
            setAlreadySearching(true);
        }
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        let newHost = host;
        if(newHost === ""){
            newHost = "_";
        }
        let newFilterOperator = filterOperator;
        if(newFilterOperator === "All Operators"){
            newFilterOperator = "%_%";
        }
        setSearch(search);
        getCommandSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            search: "%" + new_search + "%",
            status: "%" + newTaskStatus + "%",
                host: "%" + newHost + "%",
                filterOperator: newFilterOperator,
        }}).then(({data}) => handleCallbackSearchSuccess(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onCommandAndParametersSearch = ({search, offset, taskStatus, host, filterOperator}) => {
        snackActions.info("Searching...", {persist:true});
        if(alreadySearching){
            snackActions.info("Still searching, please wait for it to finish");
            return;
        } else {
            setAlreadySearching(true);
        }
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        let newHost = host;
        if(newHost === ""){
            newHost = "_";
        }
        let newFilterOperator = filterOperator;
        if(newFilterOperator === "All Operators"){
            newFilterOperator = "%_%";
        }
        setSearch(search);
        getCommandAndParametersSearch({variables:{
                offset: offset,
                fetchLimit: fetchLimit,
                search: "%" + new_search + "%",
                status: "%" + newTaskStatus + "%",
                host: "%" + newHost + "%",
                filterOperator: newFilterOperator,
            }}).then(({data}) => handleCallbackSearchSuccess(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onTagSearch = ({search, offset, taskStatus, host, filterOperator}) => {
        //snackActions.info("Searching...", {persist:true});
        if(alreadySearching){
            snackActions.info("Still searching, please wait for it to finish");
            return;
        } else {
            setAlreadySearching(true);
        }
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        let newHost = host;
        if(newHost === ""){
            newHost = "_";
        }
        let newFilterOperator = filterOperator;
        if(newFilterOperator === "All Operators"){
            newFilterOperator = "%_%";
        }
        setSearch(search);
        getTagSearch({variables:{
                offset: offset,
                fetchLimit: fetchLimit,
                search: "%" + new_search + "%",
                status: "%" + newTaskStatus + "%",
                host: "%" + newHost + "%",
                filterOperator: newFilterOperator,
            }}).then(({data}) => handleCallbackSearchSuccess(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onCallbackIDSearch = ({search, offset, taskStatus, host, filterOperator}) => {
        //snackActions.info("Searching...", {persist:true});
        if(alreadySearching){
            snackActions.info("Still searching, please wait for it to finish");
            return;
        } else {
            setAlreadySearching(true);
        }
        try{
            let new_search = parseInt(search);
            if(isNaN(new_search)){
                if(search.length > 0){
                    snackActions.warning("Must supply an integer to search.");
                }
                setAlreadySearching(false);
                return
            }
            let newTaskStatus = taskStatus;
            if(newTaskStatus === ""){
                newTaskStatus = "_";
            }
            let newHost = host;
            if(newHost === ""){
                newHost = "_";
            }
            let newFilterOperator = filterOperator;
            if(newFilterOperator === "All Operators"){
                newFilterOperator = "%_%";
            }
            setSearch(search);
            getCallbackIDSearch({variables:{
                    offset: offset,
                    fetchLimit: fetchLimit,
                    search: new_search,
                    status: "%" + newTaskStatus + "%",
                    host: "%" + newHost + "%",
                    filterOperator: newFilterOperator,
                }}).then(({data}) => handleCallbackSearchSuccess(data)).catch(({data}) => handleCallbackSearchFailure(data))
        }catch(error){
            snackActions.warning("Must supply an integer to search.");
            setAlreadySearching(false);
        }
    }
    const onCallbackGroupSearch = ({search, offset, taskStatus, host, filterOperator}) => {
        //snackActions.info("Searching...", {persist:true});
        if(alreadySearching){
            snackActions.info("Still searching, please wait for it to finish");
            return;
        } else {
            setAlreadySearching(true);
        }
        let new_search = search;
        if(search === ""){
            new_search = "_";
        }
        let newTaskStatus = taskStatus;
        if(newTaskStatus === ""){
            newTaskStatus = "_";
        }
        let newHost = host;
        if(newHost === ""){
            newHost = "_";
        }
        let newFilterOperator = filterOperator;
        if(newFilterOperator === "All Operators"){
            newFilterOperator = "%_%";
        }
        setSearch(search);
        getCallbackGroupSearch({variables:{
                offset: offset,
                fetchLimit: fetchLimit,
                search: "%" + new_search + "%",
                status: "%" + newTaskStatus + "%",
                host: "%" + newHost + "%",
                filterOperator: newFilterOperator,
            }}).then(({data}) => handleCallbackSearchSuccess(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onChangePage = (event, value) => {

        switch(searchField){
            case "Output":
                onOutputSearch({search, offset: (value - 1) * fetchLimit, taskStatus, host, filterOperator });
                break;
            case "Parameters":
                onParameterSearch({search, offset: (value - 1) * fetchLimit, taskStatus, host, filterOperator });
                break;
            case "Comment":
                onCommentSearch({search, offset: (value - 1) * fetchLimit, taskStatus, host, filterOperator });
                break;
            case "Command":
                onCommandSearch({search, offset: (value - 1) * fetchLimit, taskStatus, host, filterOperator });
                break;
            case "Command and Parameters":
                onCommandAndParametersSearch({search, offset: (value - 1) * fetchLimit, taskStatus, host, filterOperator});
                break;
            case "Tag":
                onTagSearch({search, offset: (value-1) *fetchLimit, taskStatus, host, filterOperator});
                break;
            case "Callback ID":
                onCallbackIDSearch({search, offset: (value-1) *fetchLimit, taskStatus, host, filterOperator});
                break;
            case "Callback Group":
                onCallbackGroupSearch({search, offset: (value-1) *fetchLimit, taskStatus, host, filterOperator});
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
                onTagSearch={onTagSearch} onChangeHost={onChangeHost}
                alreadySearching={alreadySearching}
                onCallbackIDSearch={onCallbackIDSearch} onCallbackGroupSearch={onCallbackGroupSearch}
                onCommandAndParametersSearch={onCommandAndParametersSearch}
                onChangeFilterOperator={onChangeFilterOperator}
                onParameterSearch={onParameterSearch} onCommentSearch={onCommentSearch} changeSearchParam={props.changeSearchParam}/>
            <div style={{overflowY: "auto", flexGrow: 1}}>
                
                {
                    taskingData.task.length > 0 ? (
                        taskingData.task.map( (task) => (
                            task.is_interactive_task ? (
                                <TaskDisplayInteractiveSearch key={"taskinteractdisplay" + task.id} me={props.me} task={task} responsesSurrounding={5} />
                                ) : (
                                    <TaskDisplay key={"taskinteractdisplay" + task.id} me={props.me} task={task} command_id={task.command == null ? 0 : task.command.id} />
                            )


                        ))
                    ) : (<div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>No Search Results</div>)
                }
            </div>
            <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center"}}>
            <Pagination count={Math.ceil(totalCount / fetchLimit)} variant="outlined" color="info" boundaryCount={1}
                    siblingCount={1} onChange={onChangePage} showFirstButton={true} showLastButton={true} style={{padding: "20px"}}/>
                <Typography style={{paddingLeft: "10px"}}>Total Results: {totalCount}</Typography>
            </div>
        </MythicTabPanel>
    )
}