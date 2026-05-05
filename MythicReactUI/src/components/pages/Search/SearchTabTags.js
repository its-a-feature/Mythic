import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { gql, useLazyQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import {TagTable} from "./TagTable";
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import {MythicTablePagination} from "../../MythicComponents/MythicTablePagination";
import {MythicSearchField, MythicTableToolbar, MythicTableToolbarGroup, MythicToolbarSelect} from "../../MythicComponents/MythicTableToolbar";
import {MythicSearchEmptyState} from "../../MythicComponents/MythicStateDisplay";


const tagFragment = gql`
fragment tagData on tag{
    id
    source
    data
    tagtype {
        name
        color
        id
    }
    credential {
        id
        realm
        account
        credential_text
        comment
        type
    }
    filemetum {
        id
        full_remote_path_text
        agent_file_id
        deleted
        filename_text
        host
        is_download_from_agent
        is_screenshot
        md5
        sha1
        comment
    }
    keylog_id
    mythictree {
        tree_type
        full_path_text
        name_text
        id
        metadata
        comment
        host
    }
    response_id
    task {
        display_id
        id
        command_name
        display_params
        comment
        callback {
            display_id
            host
            user
            color
            integrity_level
            description
            id
        }
    }
    taskartifact_id
    callback {
        display_id
        host
        domain
        user
        color
        integrity_level
        description
        ip
        id
    }
    payload {
        uuid
        id
        payloadtype {
            name
        }
        description
        filemetum {
            filename_text
        }
    }
}
`;
const tagTypeSearch = gql`
${tagFragment}
query tagtypeQuery($name: String!, $offset: Int!, $fetchLimit: Int!) {
    tag_aggregate(distinct_on: id, where: {tagtype: {name: {_ilike: $name}}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {tagtype: {name: {_ilike: $name}}}) {
      ...tagData
    }
  }
`;
const sourceSearch = gql`
${tagFragment}
query nameProcessQuery($source: String!, $offset: Int!, $fetchLimit: Int!) {
    tag_aggregate(distinct_on: id, where: {source: {_ilike: $source}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {source: {_ilike: $source}}) {
      ...tagData
    }
  }
`;
const dataSearch = gql`
${tagFragment}
query tagProcessQuery($data: String!, $offset: Int!, $fetchLimit: Int!) {
    tag_aggregate(distinct_on: id, where: {data: {_cast: {String: {_ilike: $data}}}}) {
      aggregate {
        count
      }
    }
    tag(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {data: {_cast: {String: {_ilike: $data}}}}) {
      ...tagData
      
    }
  }
`;
const fetchLimit = 50;


export function SearchTabTagsLabel(props){
    return (
        <MythicSearchTabLabel label={"Tags"} iconComponent={<LocalOfferIcon />} {...props}/>
    )
}

const SearchTabTagsSearchPanel = (props) => {
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("TagType");
    const searchFieldOptions = ["TagType", "Source", "Data"];
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
            case "TagType":
                props.onTagTypeSearch({search:adjustedSearch, offset: 0})
                break;
            case "Source":
                props.onSourceSearch({search:adjustedSearch, offset: 0})
                break;
            case "Data":
                props.onDataSearch({search:adjustedSearch, offset: 0});
                break;
            default:
                break;
        }
    }
    React.useEffect(() => {
        if(props.value === props.index){
            let queryParams = new URLSearchParams(window.location.search);
            let adjustedSearch = "";
            let adjustedSearchField = "TagType";
            if(queryParams.has("search")){
                setSearch(queryParams.get("search"));
                adjustedSearch = queryParams.get("search");
            }
            if(queryParams.has("searchField") && searchFieldOptions.includes(queryParams.get("searchField"))){
                setSearchField(queryParams.get("searchField"));
                props.onChangeSearchField(queryParams.get("searchField"));
                adjustedSearchField = queryParams.get("searchField");
            }else{
                setSearchField("TagType");
                props.onChangeSearchField("TagType");
                props.changeSearchParam("searchField", "TagType");
            }
            submitSearch(null, adjustedSearch, adjustedSearchField);
        }
    }, [props.value, props.index]);
    return (
        <MythicTableToolbar>
            <MythicTableToolbarGroup grow>
                <MythicSearchField value={search} onChange={handleSearchValueChange} onEnter={submitSearch} onSearch={submitSearch} />
            </MythicTableToolbarGroup>
            <MythicTableToolbarGroup>
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
export const SearchTabTagsPanel = (props) =>{
    const [tagData, setTagData] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("TagType");
    const onChangeSearchField = (field) => {
        setSearchField(field);
        setTagData([]);
        switch(field){
            case "TagType":
                onTagTypeSearch({search, offset: 0});
                break;
            case "Source":
                onSourceSearch({search, offset: 0});
                break;
            case "Data":
                onDataSearch({search, offset: 0});
                break;
            default:
                break;
        }
    }
    const handleSearchResults = (data) => {
        snackActions.dismiss();
        setTotalCount(data.tag_aggregate.aggregate.count);
        setTagData(data.tag);
    }
    const handleCallbackSearchFailure = (data) => {
        snackActions.dismiss();
        snackActions.error("Failed to fetch data for search");
        console.log(data);
    }
    const getTagTypeSearch = useMythicLazyQuery(tagTypeSearch, {
        fetchPolicy: "no-cache"
    })
    const getSourceSearch = useMythicLazyQuery(sourceSearch, {
        fetchPolicy: "no-cache",
    })
    const getDataSearch = useMythicLazyQuery(dataSearch, {
        fetchPolicy: "no-cache",
    })
    const onTagTypeSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getTagTypeSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            name: "%" + new_search + "%",
        }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onSourceSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getSourceSearch({variables:{
            offset: offset,
            fetchLimit: fetchLimit,
            source: "%" + new_search + "%",
        }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onDataSearch = ({search, offset}) => {
        //snackActions.info("Searching...", {persist:true});
        setSearch(search);
        let new_search = search;
        if(new_search === ""){
            new_search = "_";
        }
        getDataSearch({variables:{
                offset: offset,
                fetchLimit: fetchLimit,
                data: "%" + new_search + "%",
            }}).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onChangePage = (event, value) => {
        switch(searchField){
        case "TagType":
            onTagTypeSearch({search, offset: (value - 1) * fetchLimit});
            break;
        case "Source":
            onSourceSearch({search, offset: (value - 1) * fetchLimit});
            break;
        case "Data":
            onDataSearch({search, offset: (value - 1) * fetchLimit});
            break;
        default:
            break;
    }

    }
    return (
        <MythicTabPanel {...props} >
            <SearchTabTagsSearchPanel onChangeSearchField={onChangeSearchField}
                                       onTagTypeSearch={onTagTypeSearch} value={props.value} index={props.index}
                                       onSourceSearch={onSourceSearch}
                                       onDataSearch={onDataSearch}
                                       changeSearchParam={props.changeSearchParam}/>
            <div style={{overflowY: "auto", flexGrow: 1}}>
                {tagData.length > 0 ? (
                    <TagTable tags={tagData} />) : (
                    <MythicSearchEmptyState
                        compact
                        description="Adjust the tag type, source, or data query and search again."
                        minHeight={180}
                    />
                )}
            </div>
            <MythicTablePagination totalCount={totalCount} fetchLimit={fetchLimit} onChange={onChangePage} color="info" />
        </MythicTabPanel>
    )
}
