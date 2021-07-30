import {MythicTabPanel, MythicSearchTabLabel} from '../../../components/MythicComponents/MythicTabPanel';
import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {TaskDisplay} from '../Callbacks/TaskDisplay';
import AssignmentIcon from '@material-ui/icons/Assignment';
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
import {taskingDataFragment} from '../Callbacks/CallbacksTabsTasking'
import { snackActions } from '../../utilities/Snackbar';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import Pagination from '@material-ui/lab/Pagination';
import { Typography } from '@material-ui/core';

const fetchLimit = 20;
const responseSearch = gql`
${taskingDataFragment}
query responseQuery($operation_id: Int!, $search: String!, $offset: Int!, $fetchLimit: Int!) {
    task_aggregate(distinct_on: id, order_by: {id: asc}, where: {parent_task_id: {_is_null: true}, responses: {response_text: {_ilike: $search}}, callback: {operation_id: {_eq: $operation_id}}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: asc}, where: {parent_task_id: {_is_null: true}, responses: {response_text: {_ilike: $search}}, callback: {operation_id: {_eq: $operation_id}}}) {
      ...taskData
    }
  }
`;
const parameterSearch = gql`
${taskingDataFragment}
query parametersQuery($operation_id: Int!, $search: String!, $offset: Int!, $fetchLimit: Int!) {
    task_aggregate(distinct_on: id, order_by: {id: asc}, where: {parent_task_id: {_is_null: true}, original_params: {_ilike: $search}, callback: {operation_id: {_eq: $operation_id}}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: asc}, where: {parent_task_id: {_is_null: true}, original_params: {_ilike: $search}, callback: {operation_id: {_eq: $operation_id}}}) {
      ...taskData
    }
  }
`;
const commentSearch = gql`
${taskingDataFragment}
query responseQuery($operation_id: Int!, $search: String!, $offset: Int!, $fetchLimit: Int!) {
    task_aggregate(distinct_on: id, order_by: {id: asc}, where: {parent_task_id: {_is_null: true}, comment: {_ilike: $search}, callback: {operation_id: {_eq: $operation_id}}}) {
      aggregate {
        count(columns: id)
      }
    }
    task(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: asc}, where: {parent_task_id: {_is_null: true}, comment: {_ilike: $search}, callback: {operation_id: {_eq: $operation_id}}}) {
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
    const [searchField, setSearchField] = React.useState("Output");
    const searchFieldOptions = ["Output", "Parameters", "Comments"];

    const handleSearchFieldChange = (event) => {
        setSearchField(event.target.value);
        props.onChangeSearchField(event.target.value);
    }
    const handleSearchValueChange = (name, value, error) => {
        setSearch(value);
    }
    const submitSearch = () => {
        switch(searchField){
            case "Output":
                props.onOutputSearch({search, offset: 0})
                break;
            case "Parameters":
                props.onParameterSearch({search, offset: 0})
                break;
            case "Comments":
                props.onCommentSearch({search, offset: 0})
                break;
            default:
                break;
        }
    }
    return (
        <Grid container spacing={2} style={{paddingTop: "10px", paddingLeft: "10px", maxWidth: "100%"}}>
            <Grid item xs={6}>
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
            <Grid item xs={4}>
                <FormLabel component="legend">Search Task's</FormLabel>
                <FormControl component="fieldset">
                    <RadioGroup row aria-label="task_component" name="searchField" value={searchField} onChange={handleSearchFieldChange}>
                        {searchFieldOptions.map( (opt) => (
                            <FormControlLabel value={opt} key={"searchopt" + opt} control={<Radio />} label={opt} />
                        ))}
                    </RadioGroup>
                </FormControl>
            </Grid>
        </Grid>
    )
}
export const SearchTabTasksPanel = (props) =>{
    const [taskingData, setTaskingData] = React.useState({task: []});
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Output");
    const me = useReactiveVar(meState);
    const onChangeSearchField = (field) => {
        setSearchField(field);
    }
    const [getOutputSearch] = useLazyQuery(responseSearch, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            console.log(data);
            snackActions.dismiss();
            snackActions.success("Found Matches");
            if(data.task_aggregate.aggregate.count === 0){
                snackActions.info("No Results");
            }
            setTotalCount(data.task_aggregate.aggregate.count);
            setTaskingData({task: data.task});
        },
        onError: (data) => {
            snackActions.error("Failed to fetch data for search");
            console.log(data);
        }
    })
    const [getParameterSearch] = useLazyQuery(parameterSearch, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            console.log(data);
            snackActions.dismiss();
            snackActions.success("Found Matches");
            if(data.task_aggregate.aggregate.count === 0){
                snackActions.info("No Results");
            }
            setTotalCount(data.task_aggregate.aggregate.count);
            setTaskingData({task: data.task});
        },
        onError: (data) => {
            snackActions.error("Failed to fetch data for search");
            console.log(data);
        }
    })
    const [getCommentSearch] = useLazyQuery(commentSearch, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            snackActions.dismiss();
            snackActions.success("Found Matches");
            if(data.task_aggregate.aggregate.count === 0){
                snackActions.info("No Results");
            }
            setTotalCount(data.task_aggregate.aggregate.count);
            setTaskingData({task: data.task});
        },
        onError: (data) => {
            snackActions.error("Failed to fetch data for search");
            console.log(data);
        }
    })
    const onOutputSearch = ({search, offset}) => {
        snackActions.info("Searching...", {persist:true});
        setSearch(search);
        getOutputSearch({variables:{
            operation_id: me.user.current_operation_id,
            offset: offset,
            fetchLimit: fetchLimit,
            search: "%" + search + "%"
        }})
    }
    const onParameterSearch = ({search, offset}) => {
        snackActions.info("Searching...", {persist:true});
        setSearch(search);
        getParameterSearch({variables:{
            operation_id: me.user.current_operation_id,
            offset: offset,
            fetchLimit: fetchLimit,
            search: "%" + search + "%"
        }})
    }
    const onCommentSearch = ({search, offset}) => {
        snackActions.info("Searching...", {persist:true});
        setSearch(search);
        getCommentSearch({variables:{
            operation_id: me.user.current_operation_id,
            offset: offset,
            fetchLimit: fetchLimit,
            search: "%" + search + "%"
        }})
    }
    const onChangePage = (event, value) => {
        if(value === 1){
            switch(searchField){
                case "Output":
                    onOutputSearch({search, offset: 0});
                    break;
                case "Parameters":
                    onParameterSearch({search, offset: 0});
                    break;
                case "Comments":
                    onCommentSearch({search, offset: 0});
                    break;
                default:
                    break;
            }
            
        }else{
            switch(searchField){
                case "Output":
                    onOutputSearch({search, offset: (value - 1) * fetchLimit });
                    break;
                case "Parameters":
                    onParameterSearch({search, offset: (value - 1) * fetchLimit });
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
            <SearchTabTasksSearchPanel onChangeSearchField={onChangeSearchField} onOutputSearch={onOutputSearch} 
                onParameterSearch={onParameterSearch} onCommentSearch={onCommentSearch} />
            <div style={{overflow: "auto", height: `calc(78vh)`, background: "transparent"}}>
                
                {
                    taskingData.task.length > 0 ? (
                        taskingData.task.map( (task) => (
                            <TaskDisplay key={"taskinteractdisplay" + task.id} task={task} command_id={task.command == null ? 0 : task.command.id} />
                        ))
                    ) : (<div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>No Search Results</div>)
                }
            </div>
            <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center"}}>
                <Pagination count={Math.ceil(totalCount / fetchLimit)} variant="outlined" color="primary" boundaryCount={2} onChange={onChangePage} />
                <Typography style={{paddingLeft: "10px"}}>Total Results: {totalCount}</Typography>
            </div>
        </MythicTabPanel>
    )
}