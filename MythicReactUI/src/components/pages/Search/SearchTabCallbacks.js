import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import {useTheme} from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import { gql, useLazyQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import Pagination from '@mui/material/Pagination';
import { Typography } from '@mui/material';
import {CallbackSearchTable} from './CallbackSearchTable';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";

const callbackFragment = gql`
fragment callbackSearchData on callback{
    user
    host
    color
    description
    domain
    id
    display_id
    ip
    active
    dead
    last_checkin
    payload {
        payloadtype {
            name
            agent_type
        }
    }
}
`;
const fetchLimit = 50;
const userSearch = gql`
${callbackFragment}
query userQuery($operation_id: Int!, $user: String!, $offset: Int!, $fetchLimit: Int!) {
    callback_aggregate(distinct_on: id, order_by: {id: desc}, where: {operation_id: {_eq: $operation_id}, user: {_ilike: $user}}) {
      aggregate {
        count
      }
    }
    callback(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {operation_id: {_eq: $operation_id}, user: {_ilike: $user}}) {
      ...callbackSearchData
    }
}
`;
const hostSearch = gql`
${callbackFragment}
query hostQuery($operation_id: Int!, $host: String!, $offset: Int!, $fetchLimit: Int!) {
    callback_aggregate(distinct_on: id, order_by: {id: desc}, where: {host: {_ilike: $host}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    callback(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, operation_id: {_eq: $operation_id}}) {
      ...callbackSearchData
    }
}
`;
const domainSearch = gql`
${callbackFragment}
query domainQuery($operation_id: Int!, $domain: String!, $offset: Int!, $fetchLimit: Int!) {
    callback_aggregate(distinct_on: id, order_by: {id: desc}, where: {domain: {_ilike: $domain}, operation_id: {_eq: $operation_id}}){
      aggregate {
        count
      }
    }
    callback(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {domain: {_ilike: $domain}, operation_id: {_eq: $operation_id}}) {
      ...callbackSearchData
    }
}
`;
const descriptionSearch = gql`
${callbackFragment}
query domainQuery($operation_id: Int!, $description: String!, $offset: Int!, $fetchLimit: Int!) {
    callback_aggregate(distinct_on: id, order_by: {id: desc}, where: {description: {_ilike: $description}, operation_id: {_eq: $operation_id}}){
      aggregate {
        count
      }
    }
    callback(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {description: {_ilike: $description}, operation_id: {_eq: $operation_id}}) {
      ...callbackSearchData
    }
}
`;
const ipSearch = gql`
${callbackFragment}
query domainQuery($operation_id: Int!, $ip: String!, $offset: Int!, $fetchLimit: Int!) {
    callback_aggregate(distinct_on: id, order_by: {id: desc}, where: {_or: [{ip: {_ilike: $ip}}, {external_ip: {_ilike: $ip}}], operation_id: {_eq: $operation_id}}){
      aggregate {
        count
      }
    }
    callback(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {_or: [{ip: {_ilike: $ip}}, {external_ip: {_ilike: $ip}}], operation_id: {_eq: $operation_id}}) {
      ...callbackSearchData
    }
}
`;
const groupSearch = gql`
${callbackFragment}
query groupQuery($group: String!, $offset: Int!, $fetchLimit: Int!) {
    callback_aggregate(distinct_on: id, order_by: {id: desc}, where: {mythictree_groups_string: {_ilike: $group}}){
      aggregate {
        count
      }
    }
    callback(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {mythictree_groups_string: {_ilike: $group}}) {
      ...callbackSearchData
    }
}
`;
const payloadtypeSearch = gql`
${callbackFragment}
query hostQuery($operation_id: Int!, $payloadtype: String!, $offset: Int!, $fetchLimit: Int!) {
    callback_aggregate(distinct_on: id, order_by: {id: desc}, where: {payload: {payloadtype: {name: {_ilike: $payloadtype}}}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    callback(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {payload: {payloadtype: {name: {_ilike: $payloadtype}}}, operation_id: {_eq: $operation_id}}) {
      ...callbackSearchData
    }
}
`;
const callbackDisplayIDSearch = gql`
${callbackFragment}
query hostQuery($operation_id: Int!, $callbackDisplayID: Int!, $offset: Int!, $fetchLimit: Int!) {
    callback_aggregate(distinct_on: id, order_by: {id: desc}, where: {display_id: {_eq: $callbackDisplayID}, operation_id: {_eq: $operation_id}}) {
      aggregate {
        count
      }
    }
    callback(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {display_id: {_eq: $callbackDisplayID}, operation_id: {_eq: $operation_id}}) {
      ...callbackSearchData
    }
}
`;

export function SearchTabCallbacksLabel(props){
    return (
        <MythicSearchTabLabel label={"Callbacks"} iconComponent={<PhoneCallbackIcon />} {...props}/>
    )
}

const SearchTabCallbacksSearchPanel = (props) => {
    const theme = useTheme();
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Host");
    const searchFieldOptions = ["User", "Domain", "Host", "Description", "IP", "Group", "PayloadType", "CallbackDisplayID"];
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
            case "User":
                props.onUserSearch({search:adjustedSearch, offset: 0});
                break;
            case "Domain":
                props.onDomainSearch({search:adjustedSearch, offset: 0});
                break;
            case "Host":
                props.onHostSearch({search:adjustedSearch, offset: 0});
                break;
            case "Description":
                props.onDescriptionSearch({search:adjustedSearch, offset: 0});
                break;
            case "IP":
                props.onIPSearch({search:adjustedSearch, offset: 0});
                break;
            case "Group":
                props.onGroupSearch({search:adjustedSearch, offset: 0});
                break;
            case "PayloadType":
                props.onPayloadTypeSearch({search:adjustedSearch, offset:0});
                break;
            case "CallbackDisplayID":
                props.onCallbackDisplayIDSearch({search:adjustedSearch, offset:0});
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
            //console.log(queryParams.get("searchField"));
            if(queryParams.has("searchField") && searchFieldOptions.includes(queryParams.get("searchField"))){
                setSearchField(queryParams.get("searchField"));
                props.onChangeSearchField(queryParams.get("searchField"));
                adjustedSearchField = queryParams.get("searchField");
            }else{
                setSearchField("Host");
                props.onChangeSearchField("Host");
                props.changeSearchParam("searchField", "Host");
            }
            submitSearch(null, adjustedSearch,  adjustedSearchField);
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
            <Grid size={6}>
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
export const SearchTabCallbacksPanel = (props) =>{
    const [callbackData, setCallbackData] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Host");
    const me = props.me;

    const onChangeSearchField = (field) => {
        setSearchField(field);
        switch(field){
            case "User":
                onUserSearch({search, offset: 0});
                break;
            case "Domain":
                onDomainSearch({search, offset: 0});
                break;
            case "Description":
                onDescriptionSearch({search, offset: 0});
                break;
            case "Host":
                onHostSearch({search, offset: 0});
                break;
            case "IP":
                onIPSearch({search, offset: 0});
                break;
            case "Group":
                onGroupSearch({search, offset: 0});
                break;
            case "PayloadType":
                onPayloadTypeSearch({search, offset: 0});
                break;
            default:
                break;
        }
    }
    const handleCallbackSearchResults = (data) => {
        snackActions.dismiss();
        setTotalCount(data.callback_aggregate.aggregate.count);
        setCallbackData(data.callback);
    }
    const handleCallbackSearchFailure = (data) => {
        snackActions.dismiss();
        snackActions.error("Failed to fetch data for search");
        console.log(data);
    }
    const getUserSearch = useMythicLazyQuery(userSearch, {
        fetchPolicy: "no-cache",
    })
    const getDomainSearch = useMythicLazyQuery(domainSearch, {
        fetchPolicy: "no-cache"
    })
    const getDescriptionSearch = useMythicLazyQuery(descriptionSearch, {
        fetchPolicy: "no-cache",
    })
    const getHostSearch = useMythicLazyQuery(hostSearch, {
        fetchPolicy: "no-cache"
    })
    const getIPSearch = useMythicLazyQuery(ipSearch, {
        fetchPolicy: "no-cache"
    })
    const getGroupSearch = useMythicLazyQuery(groupSearch, {
        fetchPolicy: "no-cache",
    })
    const getPayloadTypeSearch = useMythicLazyQuery(payloadtypeSearch, {
        fetchPolicy: "no-cache"
    })
    const getCallbackDisplayIDSearch = useMythicLazyQuery(callbackDisplayIDSearch, {
        fetchPolicy: "no-cache"
    })
    const onUserSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getUserSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            user: "%" + new_search + "%",
        }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onDomainSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getDomainSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            domain: "%" + new_search + "%",
        }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
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
        }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onDescriptionSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getDescriptionSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            description: "%" + new_search + "%",
        }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onIPSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getIPSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            ip: "%" + new_search + "%",
        }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onGroupSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getGroupSearch({variables:{
                offset: offset,
                fetchLimit: fetchLimit,
                group: "%" + new_search + "%",
            }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onPayloadTypeSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getPayloadTypeSearch({variables:{
                operation_id: me?.user?.current_operation_id || 0,
                offset: offset,
                fetchLimit: fetchLimit,
                payloadtype: "%" + new_search + "%",
            }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onCallbackDisplayIDSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        if(search === ""){
            snackActions.warning("Must supply an ID to search for");
            return;
        }
        try{
            let new_search = parseInt(search);
            getCallbackDisplayIDSearch({variables:{
                    operation_id: me?.user?.current_operation_id || 0,
                    offset: offset,
                    fetchLimit: fetchLimit,
                    callbackDisplayID: new_search,
                }}).then(({data}) => handleCallbackSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
        }catch(error){
            snackActions.warning("ID must be an integer");
        }
    }
    const onChangePage = (event, value) => {
        switch(searchField){
            case "User":
                onUserSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "Domain":
                onDomainSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "Description":
                onDescriptionSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "Host":
                onHostSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "IP":
                onIPSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "Group":
                onGroupSearch({search, offset: (value - 1) * fetchLimit});
                break;
            case "PayloadType":
                onPayloadTypeSearch({search, offset: (value -1) * fetchLimit});
                break;
            case "CallbackDisplayID":
                onCallbackDisplayIDSearch({search, offset: (value-1) * fetchLimit});
                break;
            default:
                break;
        }
    }
    return (
        <MythicTabPanel {...props} >
                <SearchTabCallbacksSearchPanel onChangeSearchField={onChangeSearchField}
                                               onUserSearch={onUserSearch}
                                               onIPSearch={onIPSearch} value={props.value} index={props.index}
                                               onDomainSearch={onDomainSearch}
                                               onGroupSearch={onGroupSearch}
                                               onPayloadTypeSearch={onPayloadTypeSearch}
                                               onCallbackDisplayIDSearch={onCallbackDisplayIDSearch}
                                               onHostSearch={onHostSearch} onDescriptionSearch={onDescriptionSearch} changeSearchParam={props.changeSearchParam}/>
                <div style={{overflowY: "auto", flexGrow: 1}}>
                    {callbackData.length > 0 ? (
                        <CallbackSearchTable callbacks={callbackData} />) : (
                        <div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>No Search Results</div>
                    )}
                </div>
                <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center", paddingTop: "5px", paddingBottom: "5px"}}>
                    <Pagination count={Math.ceil(totalCount / fetchLimit)} variant="outlined" color="info" boundaryCount={1}
                            siblingCount={1} onChange={onChangePage} showFirstButton={true} showLastButton={true} style={{padding: "20px"}}/>
                        <Typography style={{paddingLeft: "10px"}}>Total Results: {totalCount}</Typography>
                </div>
        </MythicTabPanel>
    )
}