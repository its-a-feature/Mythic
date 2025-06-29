import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import {useTheme} from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import { gql, useLazyQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import Pagination from '@mui/material/Pagination';
import { Typography } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {ProcessTable} from "./ProcessTable";
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";


const mythictreeFragment = gql`
fragment mythictreeProcessSearchData on mythictree{
    comment
    deleted
    full_path_text
    host
    id
    name_text
    metadata
    task {
        display_id
    }
    callback {
        mythictree_groups
        id
        display_id
    }
    tags {
        tagtype {
            name
            color
            id
          }
        id
    }
}
`;
const pidSearch = gql`
${mythictreeFragment}
query nameProcessQuery($pid: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    mythictree_aggregate(distinct_on: id, where: {full_path_text: {_ilike: $pid}, host: {_ilike: $host}, tree_type: {_eq: "process"}}) {
      aggregate {
        count
      }
    }
    mythictree(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, full_path_text: {_ilike: $pid}, tree_type: {_eq: "process"}}) {
      ...mythictreeProcessSearchData
    }
  }
`;
const nameSearch = gql`
${mythictreeFragment}
query nameProcessQuery($name: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    mythictree_aggregate(distinct_on: id, where: {name_text: {_ilike: $name}, host: {_ilike: $host}, tree_type: {_eq: "process"}}) {
      aggregate {
        count
      }
    }
    mythictree(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, name_text: {_ilike: $name}, tree_type: {_eq: "process"}}) {
      ...mythictreeProcessSearchData
    }
  }
`;
const tagSearch = gql`
${mythictreeFragment}
query tagProcessQuery($tag: String!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    tag_aggregate(distinct_on: mythictree_id, where: {mythictree_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], mythictree: {host: {_ilike: $host}, tree_type: {_eq: "process"}}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: mythictree_id, offset: $offset, order_by: {mythictree_id: desc}, where: {mythictree_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], mythictree: {host: {_ilike: $host}, tree_type: {_eq: "process"}}}) {
      mythictree {
        ...mythictreeProcessSearchData
      }
      
    }
  }
`;
const fetchLimit = 100;


export function SearchTabProcessesLabel(props){
    return (
        <MythicSearchTabLabel label={"Processes"} iconComponent={<AccountTreeIcon />} {...props}/>
    )
}

const SearchTabProcessesSearchPanel = (props) => {
    const theme = useTheme();
    const [search, setSearch] = React.useState("");
    const [searchHost, setSearchHost] = React.useState("");
    const [searchField, setSearchField] = React.useState("Name");
    const searchFieldOptions = ["Name", "PID", "Tag"];
    const handleSearchFieldChange = (event) => {
        setSearchField(event.target.value);
        props.onChangeSearchField(event.target.value);
        props.changeSearchParam("searchField", event.target.value);
    }
    const handleSearchHostValueChange = (name, value, error) => {
        setSearchHost(value);
    }
    const handleSearchValueChange = (name, value, error) => {
        setSearch(value);
        
    }
    const submitSearch = (event, querySearch, querySearchHost, querySearchField) => {
        let adjustedSearchField = querySearchField ? querySearchField : searchField;
        let adjustedSearch = querySearch ? querySearch : search;
        let adjustedSearchHost = querySearchHost ? querySearchHost : searchHost;
        props.changeSearchParam("host", adjustedSearchHost);
        props.changeSearchParam("search", adjustedSearch);
        switch(adjustedSearchField){
            case "Name":
                props.onNameSearch({search:adjustedSearch, searchHost:adjustedSearchHost, offset: 0})
                break;
            case "PID":
                props.onPidSearch({search:adjustedSearch, searchHost:adjustedSearchHost, offset: 0})
                break;
            case "Tag":
                props.onTagSearch({search:adjustedSearch, searchHost:adjustedSearchHost, offset: 0});
                break;
            default:
                break;
        }
    }
    React.useEffect(() => {
        if(props.value === props.index){
            let queryParams = new URLSearchParams(window.location.search);
            let adjustedSearch = "";
            let adjustedSearchHost = "";
            let adjustedSearchField = "Name";
            if(queryParams.has("search")){
                setSearch(queryParams.get("search"));
                adjustedSearch = queryParams.get("search");
            }
            if(queryParams.has("searchField") && searchFieldOptions.includes(queryParams.get("searchField"))){
                setSearchField(queryParams.get("searchField"));
                props.onChangeSearchField(queryParams.get("searchField"));
                adjustedSearchField = queryParams.get("searchField");
            }else{
                setSearchField("Name");
                props.onChangeSearchField("Name");
                props.changeSearchParam("searchField", "Name");
            }
            if(queryParams.has("host")){
                setSearchHost(queryParams.get("host"));
                adjustedSearchHost = queryParams.get("host")
            }
            submitSearch(null, adjustedSearch, adjustedSearchHost, adjustedSearchField);
        }
    }, [props.value, props.index]);
    return (
        <Grid container spacing={1} style={{padding: "5px 5px 0 5px", maxWidth: "100%"}}>
            <Grid size={2}>
                <MythicTextField placeholder="Host Name Search..." value={searchHost} marginTop={"0px"}
                                 onChange={handleSearchHostValueChange} onEnter={submitSearch} name="Host Name Search..." />
            </Grid>
            <Grid size={3}>
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
        </Grid>
    );
}
export const SearchTabProcessPanel = (props) =>{
    const [processData, setProcessData] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Name");
    const [searchHost, setSearchHost] = React.useState("");
    const onChangeSearchField = (field) => {
        setSearchField(field);
        setProcessData([]);
        switch(field){
            case "Name":
                onNameSearch({search, searchHost, offset: 0});
                break;
            case "PID":
                onPidSearch({search, searchHost, offset: 0});
                break;
            case "Tag":
                onTagSearch({search, searchHost, offset: 0});
                break;
            default:
                break;
        }
    }
    const handleSearchResults = (data) => {
        snackActions.dismiss();
        if(searchField === "Tag"){
            setTotalCount(data.tag_aggregate.aggregate.count);
            setProcessData(data?.tag?.map(t => t.mythictree) || []);
        } else {
            setTotalCount(data.mythictree_aggregate.aggregate.count);
            setProcessData(data.mythictree);
        }

    }
    const handleCallbackSearchFailure = (data) => {
        snackActions.dismiss();
        snackActions.error("Failed to fetch data for search");
        console.log(data);
    }
    const getNameSearch = useMythicLazyQuery(nameSearch, {
        fetchPolicy: "no-cache"
    })
    const getPidSearch = useMythicLazyQuery(pidSearch, {
        fetchPolicy: "no-cache",
    })
    const getTagSearch = useMythicLazyQuery(tagSearch, {
        fetchPolicy: "no-cache"
    })
    const onNameSearch = ({search, searchHost, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        setSearchHost(searchHost);
        getNameSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            name: "%" + new_search + "%",
            host: "%" + searchHost + "%",
        }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onPidSearch = ({search, searchHost, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        setSearchHost(searchHost);
        getPidSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            pid: "%" + new_search + "%",
            host: "%" + searchHost + "%",
        }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onTagSearch = ({search, searchHost, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        setSearchHost(searchHost);
        getTagSearch({variables:{
                offset: offset,
                fetchLimit: fetchLimit,
                tag: "%" + new_search + "%",
                host: "%" + searchHost + "%",
            }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onChangePage = (event, value) => {
        switch(searchField){
        case "Name":
            onNameSearch({search, searchHost:searchHost, offset: (value - 1) * fetchLimit});
            break;
        case "PID":
            onPidSearch({search, searchHost:searchHost, offset: (value - 1) * fetchLimit});
            break;
        case "Tag":
            onTagSearch({search, searchHost:searchHost, offset: (value - 1) * fetchLimit});
            break;
        default:
            break;
    }

    }
    return (
        <MythicTabPanel {...props} >
            <SearchTabProcessesSearchPanel onChangeSearchField={onChangeSearchField}
                                           onNameSearch={onNameSearch} value={props.value} index={props.index}
                                           onPidSearch={onPidSearch}
                                           onTagSearch={onTagSearch}
                                           changeSearchParam={props.changeSearchParam}/>
            <div style={{overflowY: "auto", flexGrow: 1}}>
                {processData.length > 0 ? (
                    <ProcessTable processes={processData} />) : (
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