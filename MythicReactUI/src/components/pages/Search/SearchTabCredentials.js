import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import Pagination from '@mui/material/Pagination';
import { Button, Typography } from '@mui/material';
import {CredentialTable} from './CredentialTable';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {CredentialTableNewCredentialDialog} from './CredentialTableNewCredentialDialog';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";

const credentialFragment = gql`
fragment credentialSearchData on credential{
    account
    comment
    credential_text
    id
    realm
    type
    task {
        display_id
        id
        callback {
            id
            host
            display_id
            mythictree_groups
        }
    }
    timestamp
    deleted
    operator {
        username
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
const fetchLimit = 20;
const accountSearch = gql`
${credentialFragment}
query accountQuery($operation_id: Int!, $account: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    credential_aggregate(distinct_on: id, where: {account: {_ilike: $account}, operation_id: {_eq: $operation_id}, deleted: {_eq: $deleted}}) {
      aggregate {
        count
      }
    }
    credential(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {account: {_ilike: $account}, operation_id: {_eq: $operation_id}, deleted: {_eq: $deleted}}) {
      ...credentialSearchData
    }
  }
`;
const realmSearch = gql`
${credentialFragment}
query realmQuery($operation_id: Int!, $realm: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    credential_aggregate(distinct_on: id, where: {realm: {_ilike: $realm}, operation_id: {_eq: $operation_id}, deleted: {_eq: $deleted}}) {
      aggregate {
        count
      }
    }
    credential(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {realm: {_ilike: $realm}, operation_id: {_eq: $operation_id}, deleted: {_eq: $deleted}}) {
      ...credentialSearchData
    }
  }
`;
const credentialSearch = gql`
${credentialFragment}
query credQuery($operation_id: Int!, $credential: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    credential_aggregate(distinct_on: id, where: {credential_text: {_ilike: $credential}, operation_id: {_eq: $operation_id}, deleted: {_eq: $deleted}}) {
      aggregate {
        count
      }
    }
    credential(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {credential_text: {_ilike: $credential}, operation_id: {_eq: $operation_id}, deleted: {_eq: $deleted}}) {
      ...credentialSearchData
    }
  }
`;
const commentSearch = gql`
${credentialFragment}
query commentQuery($operation_id: Int!, $comment: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!) {
    credential_aggregate(distinct_on: id, where: {comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, deleted: {_eq: $deleted}}) {
      aggregate {
        count
      }
    }
    credential(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {comment: {_ilike: $comment}, operation_id: {_eq: $operation_id}, deleted: {_eq: $deleted}}) {
      ...credentialSearchData
    }
  }
`;
const tagSearch = gql`
${credentialFragment}
query tagQuery($tag: String!, $offset: Int!, $fetchLimit: Int!) {
    tag_aggregate(distinct_on: credential_id, where: {credential_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}]}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: credential_id, offset: $offset, order_by: {credential_id: desc}, where: {credential_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}]}) {
        credential {
            ...credentialSearchData
        }
    }
  }
`;
const createCredentialMutation = gql`
${credentialFragment}
mutation createCredential($comment: String!, $account: String!, $realm: String!, $type: String!, $credential: String!) {
    createCredential(account: $account, credential: $credential, comment: $comment, realm: $realm, credential_type: $type) {
      status
      error
      id
    }
  }
`;

export function SearchTabCredentialsLabel(props){
    return (
        <MythicSearchTabLabel label={"Credentials"} iconComponent={<VpnKeyIcon />} {...props}/>
    )
}

const SearchTabCredentialsSearchPanel = (props) => {
    const [search, setSearch] = React.useState("");
    const [showDeleted, setShowDeleted] = React.useState(false);
    const [searchField, setSearchField] = React.useState("Account");
    const searchFieldOptions = ["Account", "Realm", "Comment", "Credential", "Tag"];
    const [createCredentialDialogOpen, setCreateCredentialDialogOpen] = React.useState(false);
    const handleSearchFieldChange = (event) => {
        setSearchField(event.target.value);
        props.onChangeSearchField(event.target.value);
        props.changeSearchParam("searchField", event.target.value);
    }
    const [createCredential] = useMutation(createCredentialMutation, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.createCredential.status === "success"){
                snackActions.success("Successfully created new credential");
                props.onNewCredential()
            } else {
                snackActions.error(data.createCredential.error);
            }
            
        },
        onError: (data) => {
            snackActions.error("Failed to create credential");
            console.log(data);
        }
    })
    const handleSearchValueChange = (name, value, error) => {
        setSearch(value);
        
    }
    const submitSearch = (event, querySearch, querySearchField) => {
        let adjustedSearchField = querySearchField ? querySearchField : searchField;
        let adjustedSearch = querySearch ? querySearch : search;
        props.changeSearchParam("search", adjustedSearch);
        switch(adjustedSearchField){
            case "Account":
                props.onAccountSearch({search:adjustedSearch, offset: 0})
                break;
            case "Realm":
                props.onRealmSearch({search:adjustedSearch, offset: 0})
                break;
            case "Comment":
                props.onCommentSearch({search:adjustedSearch, offset: 0})
                break;
            case "Credential":
                props.onCredentialSearch({search:adjustedSearch, offset: 0})
                break;
            case "Tag":
                props.onTagSearch({search:adjustedSearch, offset: 0})
                break;
            default:
                break;
        }
    }
    const handleToggleShowDeleted = (event) => {
        setShowDeleted(!showDeleted);
        props.onChangeDeletedField(!showDeleted);
    }
    const onCreateCredential = ({type, account, realm, comment, credential}) => {
        createCredential({variables: {type, account, realm, comment, credential}})
    }
    React.useEffect(() => {
        if(props.value === props.index){
            let queryParams = new URLSearchParams(window.location.search);
            let adjustedSearch = "";
            let adjustedSearchField = "Account";
            if(queryParams.has("search")){
                setSearch(queryParams.get("search"));
                adjustedSearch = queryParams.get("search");
            }
            if(queryParams.has("searchField") && searchFieldOptions.includes(queryParams.get("searchField"))){
                setSearchField(queryParams.get("searchField"));
                props.onChangeSearchField(queryParams.get("searchField"));
                adjustedSearchField = queryParams.get("searchField");
            }else{
                setSearchField("Account");
                props.onChangeSearchField("Account");
                props.changeSearchParam("searchField", "Account");
            }
            submitSearch(null, adjustedSearch, adjustedSearchField);
        }
    }, [props.value, props.index])
    return (
        <Grid container spacing={2} style={{padding: "5px 5px 0 5px", maxWidth: "100%"}}>
            <Grid size={5}>
                <MythicTextField placeholder="Search..." value={search} marginTop={"0px"}
                    onChange={handleSearchValueChange} onEnter={submitSearch} name="Search..." InputProps={{
                        endAdornment: 
                        <React.Fragment>
                            <Tooltip title="Search">
                                <IconButton onClick={submitSearch} size="large"><SearchIcon color="info"/></IconButton>
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
            <Grid size={2}>
                {createCredentialDialogOpen &&
                    <MythicDialog fullWidth={true} maxWidth="md" open={createCredentialDialogOpen} 
                        onClose={()=>{setCreateCredentialDialogOpen(false);}} 
                        innerDialog={<CredentialTableNewCredentialDialog onSubmit={onCreateCredential} onClose={()=>{setCreateCredentialDialogOpen(false);}} />}
                    />
                }
                
                <Button  style={{marginRight: "5px"}}
                         size="small" color="success" onClick={ () => {setCreateCredentialDialogOpen(true);}} variant="contained">
                    <VpnKeyIcon style={{marginRight: "5px"}} />
                    New
                </Button>
                <Button variant={"contained"} color={"primary"} size={"small"} onClick={handleToggleShowDeleted}>
                    {showDeleted ? (
                        <>
                            <VisibilityIcon style={{marginRight: "5px"}} />
                            {"Deleted"}
                        </>

                    ) : (
                        <>
                            <VisibilityOffIcon style={{marginRight: "5px"}} />
                            { "Deleted"}
                        </>

                    )}
                </Button>
            </Grid>
        </Grid>
    );
}


export const SearchTabCredentialsPanel = (props) =>{
    const [credentialaData, setCredentialData] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Account");
    const me = props.me;
    const showDeleted = React.useRef(false);
    const onChangeDeletedField = (newShowDeleted) => {
        showDeleted.current = newShowDeleted;
        onChangeSearchField(searchField);
    }
    const onChangeSearchField = (field) => {
        setSearchField(field);
        switch(field){
            case "Account":
                onAccountSearch({search, offset: 0});
                break;
            case "Realm":
                onRealmSearch({search, offset: 0});
                break;
            case "Credential":
                onCredentialSearch({search, offset: 0});
                break;
            case "Comment":
                onCommentSearch({search, offset: 0});
                break;
            case "Tag":
                onTagSearch({search, offset: 0});
                break;
            default:
                break;
        }
    }
    const handleCredentialSearchResults = (data) => {
        snackActions.dismiss();
        if(searchField === "Tag"){
            setTotalCount(data.tag_aggregate.aggregate.count);
            setCredentialData(data.tag.map(c => c.credential));
        } else {
            setTotalCount(data.credential_aggregate.aggregate.count);
            setCredentialData(data.credential);
        }

    }
    const handleCallbackSearchFailure = (data) => {
        snackActions.dismiss();
        snackActions.error("Failed to fetch data for search");
        console.log(data);
    }
    const getAccountSearch = useMythicLazyQuery(accountSearch, {
        fetchPolicy: "no-cache"
    })
    const getRealmSearch = useMythicLazyQuery(realmSearch, {
        fetchPolicy: "no-cache"
    })
    const getCredentialSearch = useMythicLazyQuery(credentialSearch, {
        fetchPolicy: "no-cache"
    })
    const getCommentSearch = useMythicLazyQuery(commentSearch, {
        fetchPolicy: "no-cache"
    })
    const getTagSearch = useMythicLazyQuery(tagSearch, {
        fetchPolicy: "no-cache"
    })
    const onAccountSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        getAccountSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            account: "%" + search + "%",
            deleted: showDeleted.current
        }}).then(({data}) => handleCredentialSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onRealmSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        getRealmSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            realm: "%" + search + "%",
            deleted: showDeleted.current
        }}).then(({data}) => handleCredentialSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onCredentialSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        getCredentialSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            credential: "%" + search + "%",
            deleted: showDeleted.current
        }}).then(({data}) => handleCredentialSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onCommentSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getCommentSearch({variables:{
            operation_id: me?.user?.current_operation_id || 0,
            offset: offset,
            fetchLimit: fetchLimit,
            comment: "%" + new_search + "%",
            deleted: showDeleted.current
        }}).then(({data}) => handleCredentialSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onTagSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getTagSearch({variables:{
                operation_id: me?.user?.current_operation_id || 0,
                offset: offset,
                fetchLimit: fetchLimit,
                tag:  "%" + new_search + "%",
                deleted: showDeleted.current
            }}).then(({data}) => handleCredentialSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onChangePage = (event, value) => {
        if(value === 1){
            switch(searchField){
                case "Account":
                    onAccountSearch({search, offset: 0});
                    break;
                case "Realm":
                    onRealmSearch({search, offset: 0});
                    break;
                case "Credential":
                    onCredentialSearch({search, offset: 0});
                    break;
                case "Comment":
                    onCommentSearch({search, offset: 0});
                    break;
                case "Tag":
                    onTagSearch({search, offset: 0});
                    break;
                default:
                    break;
            }
            
        }else{
            switch(searchField){
                case "Account":
                    onAccountSearch({search, offset: (value - 1) * fetchLimit});
                    break;
                case "Realm":
                    onRealmSearch({search, offset: (value - 1) * fetchLimit});
                    break;
                case "Credential":
                    onCredentialSearch({search, offset: (value - 1) * fetchLimit});
                    break;
                case "Comment":
                    onCommentSearch({search, offset: (value - 1) * fetchLimit});
                    break;
                case "Tag":
                    onTagSearch({search, offset: (value-1) * fetchLimit});
                    break;
                default:
                    break;
            }
            
        }
    }
    const onNewCredential = () => {
        onChangePage(null, 1);
    }
    return (
        <MythicTabPanel {...props} >
            <SearchTabCredentialsSearchPanel me={me} onChangeSearchField={onChangeSearchField}
                                             onAccountSearch={onAccountSearch} value={props.value} index={props.index}
                                             onRealmSearch={onRealmSearch} onCredentialSearch={onCredentialSearch}
                                             onCommentSearch={onCommentSearch} changeSearchParam={props.changeSearchParam}
                                             onTagSearch={onTagSearch} onNewCredential={onNewCredential}
                                             onChangeDeletedField={onChangeDeletedField}
                />
            <div style={{overflowY: "auto", flexGrow: 1}}>
                {credentialaData.length > 0 ? (
                    <CredentialTable me={me} credentials={credentialaData} />) : (
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