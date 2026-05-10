import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import FolderIcon from '@mui/icons-material/Folder';
import { gql, useQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import {CustomBrowserTable} from "./CustomBrowserTable";
import {MythicTablePagination} from "../../MythicComponents/MythicTablePagination";
import {MythicSearchField, MythicTableToolbar, MythicTableToolbarGroup, MythicToolbarSelect} from "../../MythicComponents/MythicTableToolbar";
import {MythicSearchEmptyState} from "../../MythicComponents/MythicStateDisplay";


const mythictreeFragment = gql`
fragment mythictreeSearchData on mythictree{
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
const nameSearch = gql`
${mythictreeFragment}
query nameCustomBrowserQuery($name: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $tree_type: String!) {
    mythictree_aggregate(distinct_on: id, where: {full_path_text: {_ilike: $name}, host: {_ilike: $host}, tree_type: {_eq: $tree_type}}) {
      aggregate {
        count
      }
    }
    mythictree(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, full_path_text: {_ilike: $name}, tree_type: {_eq: $tree_type}}) {
      ...mythictreeSearchData
    }
  }
`;
const metadataSearch = gql`
${mythictreeFragment}
query metadataCustomBrowserQuery($search: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $tree_type: String!) {
    mythictree_aggregate(distinct_on: id, where: {metadata: {_cast: {String: {_ilike: $search}}}, host: {_ilike: $host}, tree_type: {_eq: $tree_type}}) {
      aggregate {
        count
      }
    }
    mythictree(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, metadata: {_cast: {String: {_ilike: $search}}}, tree_type: {_eq: $tree_type}}) {
      ...mythictreeSearchData
    }
  }
`;
const commentSearch = gql`
${mythictreeFragment}
query nameCustomBrowserQuery($comment: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $tree_type: String!) {
    mythictree_aggregate(distinct_on: id, where: {comment: {_ilike: $comment}, host: {_ilike: $host}, tree_type: {_eq: $tree_type}}) {
      aggregate {
        count
      }
    }
    mythictree(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {host: {_ilike: $host}, comment: {_ilike: $comment}, tree_type: {_eq: $tree_type}}) {
      ...mythictreeSearchData
    }
  }
`;
const tagSearch = gql`
${mythictreeFragment}
query tagCustomBrowserQuery($tag: String!, $host: String!, $offset: Int!, $fetchLimit: Int!, $tree_type: String!) {
    tag_aggregate(distinct_on: mythictree_id, where: {mythictree_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], mythictree: {host: {_ilike: $host}, tree_type: {_eq: $tree_type}}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: mythictree_id, offset: $offset, order_by: {mythictree_id: desc}, where: {mythictree_id: {_is_null: false}, _or: [{data: {_cast: {String: {_ilike: $tag}}}}, {tagtype: {name: {_ilike: $tag}}}], mythictree: {host: {_ilike: $host}, tree_type: {_eq: $tree_type}}}) {
      mythictree {
        ...mythictreeSearchData
      }
      
    }
  }
`;
const customBrowsers = gql`
query getCustomBrowsers {
    custombrowser(where: {deleted: {_eq: false}}, order_by: {name: asc}){
        name
        columns
    }
}
`;
const fetchLimit = 100;

export function SearchTabCustomBrowserLabel(props){
    return (
        <MythicSearchTabLabel label={"Browsers"} iconComponent={<FolderIcon />} {...props}/>
    )
}
const SearchTabCustomBrowserSearchPanel = (props) => {
    const [browserOptions, setBrowserOptions] = React.useState([]);
    const [selectedBrowser, setSelectedBrowser] = React.useState("");
    const [search, setSearch] = React.useState("");
    const [searchHost, setSearchHost] = React.useState("");
    const [searchField, setSearchField] = React.useState("Name");
    const [searchFieldOptions, setSearchFieldOptions] = React.useState(["Name", "Tags", "Comment", "Metadata"]);
    const handleBrowserChange = (event) => {
        setSelectedBrowser(event.target.value);
        for(let i = 0; i < browserOptions.length; i++) {
            if(browserOptions[i].name === event.target.value){
                props.onChangeBrowserField(browserOptions[i]);
                return;
            }
        }

    }
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
            case "Comment":
                props.onCommentSearch({search:adjustedSearch, searchHost:adjustedSearchHost, offset: 0})
                break;
            case "Tag":
            case "Tags":
                props.onTagSearch({search:adjustedSearch, searchHost:adjustedSearchHost, offset: 0});
                break;
            case "Metadata":
                props.onOtherSearch({search:adjustedSearch, searchHost:adjustedSearchHost, offset: 0});
                break;
            default:
                break;
        }
    }
    useQuery(customBrowsers, {fetchPolicy: "no-cache",
        onCompleted: (data) => {
            setBrowserOptions(data.custombrowser);
            if(data.custombrowser.length > 0){
                setSelectedBrowser(data.custombrowser[0].name);
                props.onChangeBrowserField(data.custombrowser[0]);
            }
        }
    })
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
            if(queryParams.has("searchField") && (searchFieldOptions.includes(queryParams.get("searchField")) || queryParams.get("searchField") === "Tag")){
                const nextSearchField = queryParams.get("searchField") === "Tag" ? "Tags" : queryParams.get("searchField");
                setSearchField(nextSearchField);
                props.onChangeSearchField(nextSearchField);
                adjustedSearchField = nextSearchField;
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
        <MythicTableToolbar variant="search">
            <MythicTableToolbarGroup label="Browser">
                <MythicToolbarSelect
                    value={selectedBrowser}
                    onChange={handleBrowserChange}
                >
                    {
                        browserOptions.map((opt, i) => (
                            <MenuItem key={"searchopt" + opt.name} value={opt.name}>{opt.name}</MenuItem>
                        ))
                    }
                </MythicToolbarSelect>
            </MythicTableToolbarGroup>
            <MythicTableToolbarGroup label="Host" style={{minWidth: "13rem"}}>
                <MythicSearchField placeholder="Host Name Search..." name="Host" value={searchHost}
                                   onChange={handleSearchHostValueChange} onEnter={submitSearch}/>
            </MythicTableToolbarGroup>
            <MythicTableToolbarGroup grow label="Search">
                <MythicSearchField value={search} onChange={handleSearchValueChange} onEnter={submitSearch} onSearch={submitSearch} />
            </MythicTableToolbarGroup>
            <MythicTableToolbarGroup label="In">
                <MythicToolbarSelect
                    value={searchField}
                    onChange={handleSearchFieldChange}
                >
                    {
                        searchFieldOptions.map((opt, i) => (
                            <MenuItem key={"searchopt" + opt} value={opt}>{opt}</MenuItem>
                        ))
                    }
                </MythicToolbarSelect>
            </MythicTableToolbarGroup>
        </MythicTableToolbar>
    );
}
export const SearchTabCustomBrowserPanel = (props) =>{
    const [processData, setProcessData] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [selectedBrowser, setSelectedBrowser] = React.useState({name: "", columns: []});
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Name");
    const [searchHost, setSearchHost] = React.useState("");
    const onChangeBrowserField = (field) => {
        setSelectedBrowser(field);
        setProcessData([]);
    }
    const onChangeSearchField = (field) => {
        setSearchField(field);
        setProcessData([]);
        switch(field){
            case "Name":
                onNameSearch({search, searchHost, offset: 0});
                break;
            case "Comment":
                onCommentSearch({search, searchHost, offset: 0});
                break;
            case "Tag":
            case "Tags":
                onTagSearch({search, searchHost, offset: 0});
                break;
            case "Metadata":
                onOtherSearch({search, searchHost, offset: 0});
                break;
            default:
                break;
        }
    }
    const handleSearchResults = (data) => {
        snackActions.dismiss();
        if(searchField === "Tag" || searchField === "Tags"){
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
    const getCommentSearch = useMythicLazyQuery(commentSearch, {
        fetchPolicy: "no-cache",
    })
    const getTagSearch = useMythicLazyQuery(tagSearch, {
        fetchPolicy: "no-cache"
    })
    const getOtherSearch = useMythicLazyQuery(metadataSearch, {fetchPolicy: "no-cache"})
    const onNameSearch = ({search, searchHost, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        if(selectedBrowser.name === ""){return}
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
            tree_type: selectedBrowser.name
        }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onCommentSearch = ({search, searchHost, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        if(selectedBrowser.name === ""){return}
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        setSearchHost(searchHost);
        getCommentSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            comment: "%" + new_search + "%",
            host: "%" + searchHost + "%",
            tree_type: selectedBrowser.name
        }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onTagSearch = ({search, searchHost, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        if(selectedBrowser.name === ""){return}
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
                tree_type: selectedBrowser.name
            }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onOtherSearch = ({search, searchHost, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        if(selectedBrowser.name === ""){return}
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        setSearchHost(searchHost);
        getOtherSearch({variables:{
                offset: offset,
                fetchLimit: fetchLimit,
                search: "%" + new_search + "%",
                host: "%" + searchHost + "%",
                tree_type: selectedBrowser.name
            }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onChangePage = (event, value) => {
        switch(searchField){
            case "Name":
                onNameSearch({search, searchHost:searchHost, offset: (value - 1) * fetchLimit});
                break;
            case "Comment":
                onCommentSearch({search, searchHost:searchHost, offset: (value - 1) * fetchLimit});
                break;
            case "Tag":
            case "Tags":
                onTagSearch({search, searchHost:searchHost, offset: (value - 1) * fetchLimit});
                break;
            case "Metadata":
                onOtherSearch({search, searchHost:searchHost, offset: (value - 1) * fetchLimit});
                break;
            default:
                break;
        }
    }
    React.useEffect( () => {
        if(selectedBrowser.name === ""){return}
        onChangePage(null, 1);
    }, [selectedBrowser]);
    return (
        <MythicTabPanel {...props} >
            <SearchTabCustomBrowserSearchPanel onChangeSearchField={onChangeSearchField}
                                           onNameSearch={onNameSearch} value={props.value} index={props.index}
                                           onCommentSearch={onCommentSearch}
                                           onTagSearch={onTagSearch}
                                           onOtherSearch={onOtherSearch}
                                           onChangeBrowserField={onChangeBrowserField}
                                           changeSearchParam={props.changeSearchParam}/>
            <div style={{overflowY: "auto", flexGrow: 1}}>
                {processData.length > 0 ? (
                    <CustomBrowserTable rows={processData} columns={selectedBrowser.columns} me={props.me} />) : (
                    <MythicSearchEmptyState
                        compact
                        description="Adjust the custom browser query or selected browser field and search again."
                        minHeight={180}
                    />
                )}
            </div>
            <MythicTablePagination totalCount={totalCount} fetchLimit={fetchLimit} onChange={onChangePage} color="info" />
        </MythicTabPanel>
    )
}
