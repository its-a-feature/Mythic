import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import {useTheme} from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import { gql, useLazyQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import Pagination from '@mui/material/Pagination';
import { Typography } from '@mui/material';
import {TokenTable} from './TokenTable';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";

const tokenFragment = gql`
fragment tokenData on token{
    id
    user
    groups
    token_id
    task {
        id
    }
    host
    deleted
    description
    callbacktokens(where: {deleted: {_eq: false}}) {
        callback_id
        id
    }
}
`;
const fetchLimit = 20;
const userGroupSearch = gql`
${tokenFragment}
query usergroupQuery($operation_id: Int!, $name: String!, $offset: Int!, $fetchLimit: Int!) {
    token_aggregate(distinct_on: id, where: {operation_id: {_eq: $operation_id}, _or: [{groups: {_ilike: $name}}, {user: {_ilike: $name}}]}) {
      aggregate {
        count
      }
    }
    token(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {operation_id: {_eq: $operation_id}, _or: [{groups: {_ilike: $name}}, {user: {_ilike: $name}}]}) {
      ...tokenData
    }
}
`;
const SIDSearch = gql`
${tokenFragment}
query sidQuery($operation_id: Int!, $sid: String!, $offset: Int!, $fetchLimit: Int!) {
    token_aggregate(distinct_on: id, where: {operation_id: {_eq: $operation_id}, _or: [{app_container_sid: {_ilike: $sid}}, {logon_sid: {_ilike: $sid}}, {default_dacl: {_ilike: sid}}]}) {
      aggregate {
        count
      }
    }
    token(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {operation_id: {_eq: $operation_id}, _or: [{app_container_sid: {_ilike: $sid}}, {logon_sid: {_ilike: $sid}}, {default_dacl: {_ilike: sid}}]}) {
      ...tokenData
    }
}
`;
const hostSearch = gql`
${tokenFragment}
query hostQuery($operation_id: Int!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    token_aggregate(distinct_on: id, where: {host: {_ilike: $host}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    token(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, operation_id: {_eq: $operation_id}}) {
      ...tokenData
    }
}
`;
export function SearchTabTokensLabel(props){
    return (
        <MythicSearchTabLabel label={"Tokens"} iconComponent={<ConfirmationNumberIcon />} {...props}/>
    )
}

const SearchTabTokensSearchPanel = (props) => {
    const theme = useTheme();
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Host");
    const searchFieldOptions = ["User/Group", "SID", "Host"];
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
            case "User/Group":
                props.onUserGroupSearch({search:adjustedSearch, offset: 0})
                break;
            case "SID":
                props.onSIDSearch({search:adjustedSearch, offset: 0})
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
            let adjustedSearchField = "Host";
            if(queryParams.has("search")){
                setSearch(queryParams.get("search"));
                adjustedSearch = queryParams.get("search");
            }
            if(queryParams.has("searchField") && searchFieldOptions.includes(queryParams.get("searchField"))){
                setSearchField(queryParams.get("searchField"));
                props.onChangeSearchField(queryParams.get("searchField"));
                adjustedSearchField = queryParams.get("searchField");
            }else{
                setSearchField("Host");
                props.onChangeSearchField("Host");
                props.changeSearchParam("searchField", "Host");
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
export const SearchTabTokensPanel = (props) =>{
    const [tokenData, setTokenData] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Host");
    const me = props.me;

    const onChangeSearchField = (field) => {
        setSearchField(field);
        setTokenData([]);
        switch(field){
            case "User/Group":
                onUserGroupSearch({search, offset: 0});
                break;
            case "SID":
                onSIDSearch({search, offset: 0});
                break;
            case "Host":
                onHostSearch({search, offset: 0});
                break;
            default:
                break;
        }
    }
    const handleSearchResults = (data) => {
        snackActions.dismiss();
        setTotalCount(data.token_aggregate.aggregate.count);
        setTokenData(data.token);
    }
    const handleCallbackSearchFailure = (data) => {
        snackActions.dismiss();
        snackActions.error("Failed to fetch data for search");
        console.log(data);
    }
    const getUserGroupSearch = useMythicLazyQuery(userGroupSearch, {
        fetchPolicy: "network-only"
    })
    const getSIDSearch = useMythicLazyQuery(SIDSearch, {
        fetchPolicy: "no-cache"
    })
    const getHostSearch = useMythicLazyQuery(hostSearch, {
        fetchPolicy: "no-cache"
    })
    const onUserGroupSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getUserGroupSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            name: "%" + new_search + "%",
        }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
        }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onSIDSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getSIDSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            sid: "%" + new_search + "%",
        }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onChangePage = (event, value) => {
        switch(searchField){
            case "User/Group":
                onUserGroupSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "SID":
                onSIDSearch({search, offset: (value - 1) * fetchLimit});
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
            <SearchTabTokensSearchPanel onChangeSearchField={onChangeSearchField} onUserGroupSearch={onUserGroupSearch} value={props.value} index={props.index}
                onHostSearch={onHostSearch} onSIDSearch={onSIDSearch} changeSearchParam={props.changeSearchParam} />
            <div style={{overflowY: "auto", flexGrow: 1}}>
                {tokenData.length > 0 ? (
                    <TokenTable tokens={tokenData} />) : (
                    <div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>No Search Results</div>
                )}
            </div>
            <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center",  paddingTop: "5px", paddingBottom: "10px"}}>
            <Pagination count={Math.ceil(totalCount / fetchLimit)} variant="outlined" color="info" boundaryCount={1}
                    siblingCount={1} onChange={onChangePage} showFirstButton={true} showLastButton={true} style={{padding: "20px"}}/>
                <Typography style={{paddingLeft: "10px"}}>Total Results: {totalCount}</Typography>
            </div>
        </MythicTabPanel>
    )
}