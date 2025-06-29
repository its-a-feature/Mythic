import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import {useTheme} from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import { gql, useLazyQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import Pagination from '@mui/material/Pagination';
import { Typography } from '@mui/material';
import {KeylogsTable} from './KeylogsTable';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";


const keylogFragment = gql`
fragment keylogData on keylog{
    keystrokes_text
    task {
        id
        display_id
        callback {
            host
            id
            display_id
            mythictree_groups
        }
    }
    user
    window
    timestamp
    id
}
`;
const fetchLimit = 100;
const keylogSearch = gql`
${keylogFragment}
query keylogQuery($operation_id: Int!, $keylog: String!, $offset: Int!, $fetchLimit: Int!) {
    keylog_aggregate(distinct_on: id, where: {keystrokes_text: {_ilike: $keylog}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    keylog(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {keystrokes_text: {_ilike: $keylog}, operation_id: {_eq: $operation_id}}) {
      ...keylogData
    }
  }
`;
const userUniqueSearch = gql`
${keylogFragment}
query userQuery($operation_id: Int!, $user: String!, $offset: Int!, $fetchLimit: Int!) {
    keylog_aggregate(distinct_on: user, where: {user: {_ilike: $user}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    keylog(limit: $fetchLimit, distinct_on: user, offset: $offset, order_by: {user: desc}, where: {user: {_ilike: $user}, operation_id: {_eq: $operation_id}}) {
      ...keylogData
    }
  }
`;
const userSearch = gql`
${keylogFragment}
query userQuery($operation_id: Int!, $user: String!, $offset: Int!, $fetchLimit: Int!) {
    keylog_aggregate(distinct_on: id, where: {user: {_ilike: $user}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    keylog(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {user: {_ilike: $user}, operation_id: {_eq: $operation_id}}) {
      ...keylogData
    }
  }
`;
const programSearch = gql`
${keylogFragment}
query programQuery($operation_id: Int!, $program: String!, $offset: Int!, $fetchLimit: Int!) {
    keylog_aggregate(distinct_on: id, where: {window: {_ilike: $program}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    keylog(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {window: {_ilike: $program}, operation_id: {_eq: $operation_id}}) {
      ...keylogData
    }
  }
`;
const programUniqueSearch = gql`
${keylogFragment}
query programQuery($operation_id: Int!, $program: String!, $offset: Int!, $fetchLimit: Int!) {
    keylog_aggregate(distinct_on: window, where: {window: {_ilike: $program}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    keylog(limit: $fetchLimit, distinct_on: window, offset: $offset, order_by: {window: desc}, where: {window: {_ilike: $program}, operation_id: {_eq: $operation_id}}) {
      ...keylogData
    }
  }
`;
const hostSearch = gql`
${keylogFragment}
query hostQuery($operation_id: Int!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    keylog_aggregate(distinct_on: id, where: {task: {callback: {host: {_ilike: $host}}}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    keylog(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {task: {callback: {host: {_ilike: $host}}}, operation_id: {_eq: $operation_id}}) {
      ...keylogData
    }
  }
`;

export function SearchTabKeylogsLabel(props){
    return (
        <MythicSearchTabLabel label={"Keylogs"} iconComponent={<KeyboardIcon />} {...props}/>
    )
}

const SearchTabKeylogsSearchPanel = (props) => {
    const theme = useTheme();
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Keystroke");
    const searchFieldOptions = ["Keystroke", "User", "Program", "Host"];
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
            case "Keystroke":
                props.onKeylogSearch({search:adjustedSearch, offset: 0})
                break;
            case "User":
                props.onUserSearch({search:adjustedSearch, offset: 0})
                break;
            case "Program":
                props.onProgramSearch({search:adjustedSearch, offset: 0})
                break;
            case "Host":
                props.onHostSearch({search:adjustedSearch, offset: 0})
                break;
            default:
                break;
        }
    }
    React.useEffect(() => {
        if(props.value === props.index){
            let queryParams = new URLSearchParams(window.location.search);
            let adjustedSearch = "";
            let adjustedSearchField = "Keystroke";
            if(queryParams.has("search")){
                setSearch(queryParams.get("search"));
                adjustedSearch = queryParams.get("search");
            }
            if(queryParams.has("searchField") && searchFieldOptions.includes(queryParams.get("searchField"))){
                setSearchField(queryParams.get("searchField"));
                props.onChangeSearchField(queryParams.get("searchField"));
                adjustedSearchField = queryParams.get("searchField");
            }else{
                setSearchField("Keystroke");
                props.onChangeSearchField("Keystroke");
                props.changeSearchParam("searchField", "Keystroke");
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
            <Grid size={2}>
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
export const SearchTabKeylogsPanel = (props) =>{
    const [keylogData, setKeylogData] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Keystroke");
    const me = props.me;

    const onChangeSearchField = (field) => {
        setSearchField(field);
        setKeylogData([]);
        switch(field){
            case "Keystroke":
                onKeylogSearch({search, offset: 0});
                break;
            case "User":
                onUserSearch({search, offset: 0});
                break;
            case "Program":
                onProgramSearch({search, offset: 0});
                break;
            case "Host":
                onHostSearch({search, offset: 0});
                break;
            default:
                break;
        }
    }
    const handleKeylogSearchResults = (data) => {
        snackActions.dismiss();
        setTotalCount(data.keylog_aggregate.aggregate.count);
        setKeylogData(data.keylog);
    }
    const handleCallbackSearchFailure = (data) => {
        snackActions.dismiss();
        snackActions.error("Failed to fetch data for search");
        console.log(data);
    }
    const handleKeylogUserUniqueSearch = (data) => {
        snackActions.dismiss();
        if(data.keylog_aggregate.aggregate.count === 0){
            snackActions.info("No Results");
        }else{
            snackActions.success("Showing One Entry for Each Unique User");
        }
        setTotalCount(data.keylog_aggregate.aggregate.count);
        setKeylogData(data.keylog);
    }
    const handleKeylogProgramUniqueSearch = (data) => {
        snackActions.dismiss();
        if(data.keylog_aggregate.aggregate.count === 0){
            snackActions.info("No Results");
        }else{
            snackActions.success("Showing One Entry for Each Unique Program");
        }
        setTotalCount(data.keylog_aggregate.aggregate.count);
        setKeylogData(data.keylog);
    }
    const getKeylogSearch = useMythicLazyQuery(keylogSearch, {
        fetchPolicy: "no-cache"
    })
    const getUserSearch = useMythicLazyQuery(userSearch, {
        fetchPolicy: "no-cache"
    })
    const getUserUniqueSearch = useMythicLazyQuery(userUniqueSearch, {
        fetchPolicy: "no-cache",
    })
    const getProgramSearch = useMythicLazyQuery(programSearch, {
        fetchPolicy: "no-cache"
    })
    const getProgramUniqueSearch = useMythicLazyQuery(programUniqueSearch, {
        fetchPolicy: "no-cache"
    })
    const getHostSearch = useMythicLazyQuery(hostSearch, {
        fetchPolicy: "no-cache"
    })
    const onKeylogSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getKeylogSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            keylog: "%" + new_search + "%",
        }}).then(({data}) => handleKeylogSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onUserSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        if(search === ""){
            getUserUniqueSearch({variables:{
                operation_id: me?.user?.current_operation_id || 0,
                offset: offset,
                fetchLimit: fetchLimit,
                user: "%_%",
            }}).then(({data}) => handleKeylogUserUniqueSearch(data)).catch(({data}) => handleCallbackSearchFailure(data))
        }else{
            getUserSearch({variables:{
                operation_id: me?.user?.current_operation_id || 0,
                offset: offset,
                fetchLimit: fetchLimit,
                user: "%" + search + "%",
            }}).then(({data}) => handleKeylogSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
        }
        
    }
    const onProgramSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        if(search === ""){
            getProgramUniqueSearch({variables:{
                operation_id: me?.user?.current_operation_id || 0,
                offset: offset,
                fetchLimit: fetchLimit,
                program: "%_%",
            }}).then(({data}) => handleKeylogProgramUniqueSearch(data)).catch(({data}) => handleCallbackSearchFailure(data))
        }else{
            getProgramSearch({variables:{
                operation_id: me?.user?.current_operation_id || 0,
                offset: offset,
                fetchLimit: fetchLimit,
                program: "%" + search + "%",
            }}).then(({data}) => handleKeylogSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
        }
        
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
        }}).then(({data}) => handleKeylogSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onChangePage = (event, value) => {
        switch(searchField){
        case "Keystroke":
            onKeylogSearch({search, offset: (value - 1) * fetchLimit});
            break;
        case "User":
            onUserSearch({search, offset: (value - 1) * fetchLimit});
            break;
        case "Program":
            onProgramSearch({search, offset: (value - 1) * fetchLimit});
            break;
        case "Host":
            onHostSearch({search, offset: (value - 1) * fetchLimit});
            break;
        default:
            break;
    }

    }
    return (
        <MythicTabPanel {...props} >
            <SearchTabKeylogsSearchPanel onChangeSearchField={onChangeSearchField} onKeylogSearch={onKeylogSearch} value={props.value} index={props.index}
                onUserSearch={onUserSearch} onProgramSearch={onProgramSearch} onHostSearch={onHostSearch} changeSearchParam={props.changeSearchParam}/>
            <div style={{overflowY: "auto", flexGrow: 1}}>
                {keylogData.length > 0 ? (
                    <KeylogsTable keylogs={keylogData} />) : (
                    <div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>No Search Results</div>
                )}
            </div>
            <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center"}}>
            <Pagination count={Math.ceil(totalCount / fetchLimit)} variant="outlined" color="info" boundaryCount={1}
                    siblingCount={1} onChange={onChangePage} showFirstButton={true} showLastButton={true} style={{padding: "20px"}}/>
                <Typography style={{paddingLeft: "10px"}}>Total Results: {totalCount}</Typography>
            </div>
        </MythicTabPanel>
    )
}