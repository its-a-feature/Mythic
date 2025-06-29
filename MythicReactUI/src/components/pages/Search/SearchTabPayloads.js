import {MythicSearchTabLabel, MythicTabPanel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import MythicTextField from '../../MythicComponents/MythicTextField';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import {useTheme} from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import {gql, useLazyQuery} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import Pagination from '@mui/material/Pagination';
import {Button, Typography} from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {payloadFragment} from "../Payloads/Payloads";
import {SearchPayloadsTable} from "./PayloadsTable";
import { Backdrop, CircularProgress } from '@mui/material';
import {faBiohazard} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";

const fetchLimit = 20;
const filenameSearch = gql`
${payloadFragment}
query filenamePayloadSearch($filename: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!, $auto_generated: Boolean!, $c2Name: String!, $payloadtypeName: String!) {
    payload_aggregate(distinct_on: id, where: {deleted: {_eq: $deleted}, auto_generated: {_eq: $auto_generated}, payloadtype: {name: {_ilike: $payloadtypeName}}, c2profileparametersinstances: {c2profile: {name: {_ilike: $c2Name}}}, filemetum: {filename_utf8: {_ilike: $filename}}}) {
      aggregate {
        count
      }
    }
    payload(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {deleted: {_eq: $deleted}, auto_generated: {_eq: $auto_generated}, payloadtype: {name: {_ilike: $payloadtypeName}}, c2profileparametersinstances: {c2profile: {name: {_ilike: $c2Name}}}, filemetum: {filename_utf8: {_ilike: $filename}}}) {
      ...payloadData
    }
}
`;
const descriptionSearch = gql`
${payloadFragment}
query descriptionPayloadSearch($description: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!, $auto_generated: Boolean!, $c2Name: String!, $payloadtypeName: String!) {
    payload_aggregate(distinct_on: id, where: {deleted: {_eq: $deleted}, auto_generated: {_eq: $auto_generated}, payloadtype: {name: {_ilike: $payloadtypeName}}, c2profileparametersinstances: {c2profile: {name: {_ilike: $c2Name}}}, description: {_ilike: $description}}) {
      aggregate {
        count
      }
    }
    payload(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {deleted: {_eq: $deleted}, auto_generated: {_eq: $auto_generated}, payloadtype: {name: {_ilike: $payloadtypeName}}, c2profileparametersinstances: {c2profile: {name: {_ilike: $c2Name}}}, description: {_ilike: $description}}) {
      ...payloadData
    }
}
`;
const uuidSearch = gql`
${payloadFragment}
query descriptionPayloadSearch($uuid: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!, $auto_generated: Boolean!, $c2Name: String!, $payloadtypeName: String!) {
    payload_aggregate(distinct_on: id, where: {deleted: {_eq: $deleted}, auto_generated: {_eq: $auto_generated}, payloadtype: {name: {_ilike: $payloadtypeName}}, c2profileparametersinstances: {c2profile: {name: {_ilike: $c2Name}}}, uuid: {_ilike: $uuid}}) {
      aggregate {
        count
      }
    }
    payload(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {deleted: {_eq: $deleted}, auto_generated: {_eq: $auto_generated}, payloadtype: {name: {_ilike: $payloadtypeName}}, c2profileparametersinstances: {c2profile: {name: {_ilike: $c2Name}}}, uuid: {_ilike: $uuid}}) {
      ...payloadData
    }
}
`;
const buildParameterSearch = gql`
${payloadFragment}
query buildParameterPayloadSearch($search: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!, $auto_generated: Boolean!, $c2Name: String!, $payloadtypeName: String!) {
    payload_aggregate(distinct_on: id, where: {deleted: {_eq: $deleted}, auto_generated: {_eq: $auto_generated}, payloadtype: {name: {_ilike: $payloadtypeName}}, c2profileparametersinstances: {c2profile: {name: {_ilike: $c2Name}}}, buildparameterinstances: {value: {_ilike: $search}}}) {
      aggregate {
        count
      }
    }
    payload(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {deleted: {_eq: $deleted}, auto_generated: {_eq: $auto_generated}, payloadtype: {name: {_ilike: $payloadtypeName}}, c2profileparametersinstances: {c2profile: {name: {_ilike: $c2Name}}}, buildparameterinstances: {value: {_ilike: $search}}}) {
      ...payloadData
    }
}
`;
const c2parametervalueSearch = gql`
${payloadFragment}
query descriptionPayloadSearch($search: String!, $offset: Int!, $fetchLimit: Int!, $deleted: Boolean!, $auto_generated: Boolean!, $c2Name: String!, $payloadtypeName: String!) {
    payload_aggregate(distinct_on: id, where: {deleted: {_eq: $deleted}, auto_generated: {_eq: $auto_generated}, payloadtype: {name: {_ilike: $payloadtypeName}}, c2profileparametersinstances: {c2profile: {name: {_ilike: $c2Name}}, value: {_ilike: $search}}}) {
      aggregate {
        count
      }
    }
    payload(limit: $fetchLimit, distinct_on: id, offset: $offset, order_by: {id: desc}, where: {deleted: {_eq: $deleted}, auto_generated: {_eq: $auto_generated}, payloadtype: {name: {_ilike: $payloadtypeName}}, c2profileparametersinstances: {c2profile: {name: {_ilike: $c2Name}}, value: {_ilike: $search}}}) {
      ...payloadData
    }
}
`;

const getC2ProfilesAndPayloadTypes = gql`
query getC2ProfilesAndPayloadTypes{
    c2profile(where: {deleted: {_eq: false}}) {
        name
    }
    payloadtype(where: {deleted: {_eq: false}}){
        name
    }
}
`;

export function SearchTabPayloadsLabel(props) {
    return (
        <MythicSearchTabLabel label={"Payloads"} iconComponent={
            <FontAwesomeIcon size="lg" style={{marginTop: "4px", marginBottom: "5px"}} icon={faBiohazard} />
        } {...props}/>
    )
}

const SearchTabPayloadsSearchPanel = (props) => {
    const theme = useTheme();
    const [search, setSearch] = React.useState("");
    const searchFieldOptions = ["Filename", "Description", "UUID", "C2 Parameter Value", "Build Parameter"];
    const [searchField, setSearchField] = React.useState(searchFieldOptions[0]);
    const [searchC2, setSearchC2] = React.useState("All C2");
    const [searchC2Options, setSearchC2Options] = React.useState(["All C2"]);
    const [searchPayloadType, setSearchPayloadType] = React.useState("All Payload Types");
    const [searchPayloadTypeOptions, setSearchPayloadTypeOptions] = React.useState(["All Payload Types"]);
    const [showAutogenerated, setShowAutogenerated] = React.useState(false);
    const [showDeleted, setShowDeleted] = React.useState(false);
    const [fetchOptions] = useLazyQuery(getC2ProfilesAndPayloadTypes, {
        onCompleted: (data) => {
            const newC2Names = data.c2profile.map(c => c.name);
            const updatedC2Names = newC2Names.reduce( (prev, cur) => {
                if(prev.includes(cur)){return [...prev]}
                return [...prev, cur];
            }, searchC2Options);
            updatedC2Names.sort();
            setSearchC2Options(updatedC2Names);
            const newPayloadtypeNames = data.payloadtype.map(c => c.name);
            const updatedPtNames = newPayloadtypeNames.reduce( (prev, cur) => {
                if(prev.includes(cur)){return [...prev]}
                return [...prev, cur];
            }, searchPayloadTypeOptions);
            updatedPtNames.sort();
            setSearchPayloadTypeOptions( updatedPtNames);
        }
    })
    const handleToggleShowDeleted = (event) => {
        setShowDeleted(!showDeleted);
        props.onChangeDeletedField(!showDeleted);
    }
    const handleToggleShowAutoGenerated = (event) => {
        setShowAutogenerated(!showAutogenerated);
        props.onChangeAutogeneratedField(!showAutogenerated);
    }
    const handleSearchValueChange = (name, value, error) => {
        switch(name){
            case "Search...":
                setSearch(value);
                break;
        }
    }
    const handleSearchFieldChange = (event) => {
        setSearchField(event.target.value);
        props.onChangeSearchField(event.target.value);
        props.changeSearchParam("searchField", event.target.value);
    }
    const handleC2FieldChange = (event) => {
        setSearchC2(event.target.value);
        props.onChangeSearchC2(event.target.value);
    }
    const handlePayloadTypeFieldChange = (event) => {
        setSearchPayloadType(event.target.value);
        props.onChangeSearchPayloadType(event.target.value);
    }
    const submitSearch = (event, querySearch, querySearchField,) => {
        let adjustedSearchField = querySearchField ? querySearchField : searchField;
        let adjustedSearch = querySearch ? querySearch : search;
        let adjustedSearchC2 = searchC2;
        let adjustedSearchPayloadType = searchPayloadType;
        props.changeSearchParam("search", adjustedSearch);
        props.changeSearchParam("c2", adjustedSearchC2);
        props.changeSearchParam("payloadtype", adjustedSearchPayloadType);
        switch (adjustedSearchField) {
            case "Filename":
                props.onFilenameSearch({
                    search: adjustedSearch,
                    offset: 0,
                    adjustedSearchC2: adjustedSearchC2,
                    adjustedSearchPayloadType: adjustedSearchPayloadType,
                })
                break;
            case "Description":
                props.onDescriptionSearch({
                    search: adjustedSearch,
                    offset: 0,
                    adjustedSearchC2: adjustedSearchC2,
                    adjustedSearchPayloadType: adjustedSearchPayloadType,
                })
                break;
            case "UUID":
                props.onUUIDSearch({
                    search: adjustedSearch,
                    offset: 0,
                    adjustedSearchC2: adjustedSearchC2,
                    adjustedSearchPayloadType: adjustedSearchPayloadType,
                });
                break;
            case "C2 Parameter Value":
                props.onC2ParameterValueSearch({
                    search: adjustedSearch,
                    offset: 0,
                    adjustedSearchC2: adjustedSearchC2,
                    adjustedSearchPayloadType: adjustedSearchPayloadType,
                });
                break;
            case "Build Parameter":
                props.onBuildParameterSearch({
                    search: adjustedSearch,
                    offset: 0,
                    adjustedSearchC2: adjustedSearchC2,
                    adjustedSearchPayloadType: adjustedSearchPayloadType,
                });
                break;
            default:
                break;
        }
    }
    React.useEffect(() => {
        if (props.value === props.index) {
            let queryParams = new URLSearchParams(window.location.search);
            let adjustedSearch = "";
            let adjustedSearchField = searchFieldOptions[0];
            if (queryParams.has("search")) {
                setSearch(queryParams.get("search"));
                adjustedSearch = queryParams.get("search");
            }
            if (queryParams.has("searchField") && searchFieldOptions.includes(queryParams.get("searchField"))) {
                setSearchField(queryParams.get("searchField"));
                props.onChangeSearchField(queryParams.get("searchField"));
                adjustedSearchField = queryParams.get("searchField");
            } else {
                setSearchField(searchFieldOptions[0]);
                props.onChangeSearchField(searchFieldOptions[0]);
                props.changeSearchParam("searchField", searchFieldOptions[0]);
            }
            submitSearch(null, adjustedSearch, adjustedSearchField);
        }
    }, [props.value, props.index]);
    React.useEffect(() => {
        fetchOptions();
    }, []);
    return (
        <Grid container spacing={1} style={{padding: "5px 5px 0 5px", maxWidth: "100%"}}>
            <Grid size={4}>
                <MythicTextField placeholder="Search..." value={search} marginTop={"0px"}
                                 onChange={handleSearchValueChange} onEnter={submitSearch} name="Search..."
                                 InputProps={{
                                     endAdornment:
                                         <React.Fragment>
                                             <Tooltip title="Search">
                                                 <IconButton onClick={submitSearch} size="large"><SearchIcon
                                                     style={{color: theme.palette.info.main}}/></IconButton>
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
                <Select
                    style={{marginBottom: "10px", width: "100%"}}
                    value={searchC2}
                    onChange={handleC2FieldChange}
                >
                    {
                        searchC2Options.map((opt, i) => (
                            <MenuItem key={"searchlocopt" + opt} value={opt}>{opt}</MenuItem>
                        ))
                    }
                </Select>

            </Grid>
            <Grid size={2}>
                <Select
                    style={{marginBottom: "10px", width: "100%"}}
                    value={searchPayloadType}
                    onChange={handlePayloadTypeFieldChange}
                >
                    {
                        searchPayloadTypeOptions.map((opt, i) => (
                            <MenuItem key={"searchlocopt" + opt} value={opt}>{opt}</MenuItem>
                        ))
                    }
                </Select>
            </Grid>
            <Grid size={2}>
                <Button variant={"contained"} color={"primary"} size={"small"} style={{marginRight: "5px"}} onClick={handleToggleShowDeleted}>
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
                <Button variant={"contained"} color={"primary"} size={"small"} onClick={handleToggleShowAutoGenerated}>
                    {showAutogenerated ? (
                        <>
                            <VisibilityIcon style={{marginRight: "5px"}} />
                            {"AutoGen"}
                        </>

                    ) : (
                        <>
                            <VisibilityOffIcon style={{marginRight: "5px"}} />
                            { "AutoGen"}
                        </>

                    )}
                </Button>
            </Grid>
        </Grid>
    );
}

export const SearchTabPayloadsPanel = (props) => {
    const [payloads, setPayloads] = React.useState([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [search, setSearch] = React.useState("");
    const [searchField, setSearchField] = React.useState("Filename");
    const [searchC2, setSearchC2] = React.useState("All C2");
    const [searchPayloadType, setSearchPayloadType] = React.useState("All Payload Types");
    const showDeleted = React.useRef(false);
    const showAutogenerated = React.useRef(false);
    const [openBackdrop, setOpenBackdrop] = React.useState(true);

    const onChangeDeletedField = (newShowDeleted) => {
        showDeleted.current = newShowDeleted;
        snackActions.info("Searching " + (showDeleted ? "deleted" : "not deleted") + " payloads...");
        onChangeSearchField(searchField);
    }
    const onChangeAutogeneratedField = (newShowAutogenerated) => {
        showAutogenerated.current = newShowAutogenerated;
        snackActions.info("Searching " + (showDeleted ? "autogenerated" : "not autogenerated") + " payloads...");
        onChangeSearchField(searchField);
    }
    const onChangeSearchField = (field) => {
        setSearchField(field);
        switch (field) {
            case "Filename":
                onFilenameSearch({search, offset: 0, adjustedSearchC2: searchC2, adjustedSearchPayloadType: searchPayloadType});
                break;
            case "C2 Parameter Value":
                onC2ParameterValueSearch({search, offset: 0, adjustedSearchC2: searchC2, adjustedSearchPayloadType: searchPayloadType});
                break;
            case "Description":
                onDescriptionSearch({search, offset: 0, adjustedSearchC2: searchC2, adjustedSearchPayloadType: searchPayloadType});
                break;
            case "UUID":
                onUUIDSearch({search, offset: 0, adjustedSearchC2: searchC2, adjustedSearchPayloadType: searchPayloadType});
                break;
            case "Build Parameter":
                onBuildParameterValueSearch({search, offset: 0, adjustedSearchC2: searchC2, adjustedSearchPayloadType: searchPayloadType});
                break;
            default:
                break;
        }
    }
    const onChangeSearchC2 = (field) => {
        setSearchC2(field);
        snackActions.info("Updating search to only payloads including " + field + " c2 profiles...");
        let value = 1;
        switch (searchField) {
            case "Filename":
                onFilenameSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: field,
                    adjustedSearchPayloadType: searchPayloadType
                });
                break;
            case "Description":
                onDescriptionSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: field,
                    adjustedSearchPayloadType: searchPayloadType
                });
                break;
            case "C2 Parameter Value":
                onC2ParameterValueSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: field,
                    adjustedSearchPayloadType: searchPayloadType
                });
                break;
            case "UUID":
                onUUIDSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: field,
                    adjustedSearchPayloadType: searchPayloadType
                });
                break;
            default:
                break;
        }
    }
    const onChangeSearchPayloadType = (field) => {
        let value = 1;
        snackActions.info("Updating search to only " + field + " payloads...");
        setSearchPayloadType(field);
        switch (searchField) {
            case "Filename":
                onFilenameSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: searchC2,
                    adjustedSearchPayloadType: field
                });
                break;
            case "Description":
                onDescriptionSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: searchC2,
                    adjustedSearchPayloadType: field
                });
                break;
            case "C2 Parameter Value":
                onC2ParameterValueSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: searchC2,
                    adjustedSearchPayloadType: field
                });
                break;
            case "UUID":
                onUUIDSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: searchC2,
                    adjustedSearchPayloadType: field
                });
                break;
            default:
                break;
        }
    }
    const handleSearchResults = (data) => {
        snackActions.dismiss();
        setTotalCount(data.payload_aggregate.aggregate.count);
        setPayloads(data.payload);
        setOpenBackdrop(false);
    }
    const handleCallbackSearchFailure = (data) => {
        snackActions.dismiss();
        snackActions.error("Failed to fetch data for search");
        console.log(data);
        setOpenBackdrop(false);
    }

    const getFilenameSearch = useMythicLazyQuery(filenameSearch, {
        fetchPolicy: "no-cache"
    })
    const getDescriptionSearch = useMythicLazyQuery(descriptionSearch, {
        fetchPolicy: "no-cache"
    })
    const getUUIDSearch = useMythicLazyQuery(uuidSearch, {
        fetchPolicy: "no-cache"
    })
    const getC2ParameterValueSearch = useMythicLazyQuery(c2parametervalueSearch, {
        fetchPolicy: "no-cache"
    })
    const getBuildParameterValueSearch = useMythicLazyQuery(buildParameterSearch, {
        fetchPolicy: "no-cache"
    })

    const onFilenameSearch = ({search, offset, adjustedSearchC2, adjustedSearchPayloadType}) => {
        //snackActions.info("Searching...", {persist:true});
        setOpenBackdrop(true);
        setSearch(search);
        setSearchC2(adjustedSearchC2);
        setSearchPayloadType(adjustedSearchPayloadType);
        let localSearchC2 = adjustedSearchC2;
        if(localSearchC2 === "All C2"){
            localSearchC2 = "%_%";
        }
        let localSearchPayloadType = adjustedSearchPayloadType;
        if(localSearchPayloadType === "All Payload Types"){
            localSearchPayloadType = "%_%";
        }
        getFilenameSearch({
            variables: {
                offset: offset,
                fetchLimit: fetchLimit,
                filename: "%" + search + "%",
                deleted: showDeleted.current,
                auto_generated: showAutogenerated.current,
                c2Name: localSearchC2,
                payloadtypeName: localSearchPayloadType
            }
        }).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))

    }
    const onDescriptionSearch = ({search, offset, adjustedSearchC2, adjustedSearchPayloadType}) => {
        //snackActions.info("Searching...", {persist:true});
        setOpenBackdrop(true);
        setSearch(search);
        setSearchC2(adjustedSearchC2);
        setSearchPayloadType(adjustedSearchPayloadType);
        let localSearchC2 = adjustedSearchC2;
        if(localSearchC2 === "All C2"){
            localSearchC2 = "%_%";
        }
        let localSearchPayloadType = adjustedSearchPayloadType;
        if(localSearchPayloadType === "All Payload Types"){
            localSearchPayloadType = "%_%";
        }
        getDescriptionSearch({
            variables: {
                offset: offset,
                fetchLimit: fetchLimit,
                description: "%" + search + "%",
                deleted: showDeleted.current,
                auto_generated: showAutogenerated.current,
                c2Name: localSearchC2,
                payloadtypeName: localSearchPayloadType
            }
        }).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onUUIDSearch = ({search, offset, adjustedSearchC2, adjustedSearchPayloadType}) => {
        //snackActions.info("Searching...", {persist:true});
        setOpenBackdrop(true);
        setSearch(search);
        setSearchC2(adjustedSearchC2);
        setSearchPayloadType(adjustedSearchPayloadType);
        let localSearchC2 = adjustedSearchC2;
        if(localSearchC2 === "All C2"){
            localSearchC2 = "%_%";
        }
        let localSearchPayloadType = adjustedSearchPayloadType;
        if(localSearchPayloadType === "All Payload Types"){
            localSearchPayloadType = "%_%";
        }
        getUUIDSearch({
            variables: {
                offset: offset,
                fetchLimit: fetchLimit,
                uuid: "%" + search + "%",
                deleted: showDeleted.current,
                auto_generated: showAutogenerated.current,
                c2Name: localSearchC2,
                payloadtypeName: localSearchPayloadType
            }
        }).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onC2ParameterValueSearch = ({search, offset, adjustedSearchC2, adjustedSearchPayloadType}) => {
        //snackActions.info("Searching...", {persist:true});
        setOpenBackdrop(true);
        setSearch(search);
        setSearchC2(adjustedSearchC2);
        setSearchPayloadType(adjustedSearchPayloadType);
        let localSearchC2 = adjustedSearchC2;
        if(localSearchC2 === "All C2"){
            localSearchC2 = "%_%";
        }
        let localSearchPayloadType = adjustedSearchPayloadType;
        if(localSearchPayloadType === "All Payload Types"){
            localSearchPayloadType = "%_%";
        }
        getC2ParameterValueSearch({
            variables: {
                offset: offset,
                fetchLimit: fetchLimit,
                search: "%" + search + "%",
                deleted: showDeleted.current,
                auto_generated: showAutogenerated.current,
                c2Name: localSearchC2,
                payloadtypeName: localSearchPayloadType
            }
        }).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onBuildParameterValueSearch = ({search, offset, adjustedSearchC2, adjustedSearchPayloadType}) => {
        //snackActions.info("Searching...", {persist:true});
        setOpenBackdrop(true);
        setSearch(search);
        setSearchC2(adjustedSearchC2);
        setSearchPayloadType(adjustedSearchPayloadType);
        let localSearchC2 = adjustedSearchC2;
        if(localSearchC2 === "All C2"){
            localSearchC2 = "%_%";
        }
        let localSearchPayloadType = adjustedSearchPayloadType;
        if(localSearchPayloadType === "All Payload Types"){
            localSearchPayloadType = "%_%";
        }
        getBuildParameterValueSearch({
            variables: {
                offset: offset,
                fetchLimit: fetchLimit,
                search: "%" + search + "%",
                deleted: showDeleted.current,
                auto_generated: showAutogenerated.current,
                c2Name: localSearchC2,
                payloadtypeName: localSearchPayloadType
            }
        }).then(({data}) => handleSearchResults(data)).catch(({data}) => handleCallbackSearchFailure(data))
    }
    const onChangePage = (event, value) => {

        switch (searchField) {
            case "Filename":
                onFilenameSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: searchC2,
                    adjustedSearchPayloadType: searchPayloadType
                });
                break;
            case "Description":
                onDescriptionSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: searchC2,
                    adjustedSearchPayloadType: searchPayloadType
                });
                break;
            case "C2 Parameter Value":
                onC2ParameterValueSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: searchC2,
                    adjustedSearchPayloadType: searchPayloadType
                });
                break;
            case "UUID":
                onUUIDSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: searchC2,
                    adjustedSearchPayloadType: searchPayloadType
                });
                break;
            case "Build Parameter":
                onBuildParameterValueSearch({
                    search: search,
                    offset: (value - 1) * fetchLimit,
                    adjustedSearchC2: searchC2,
                    adjustedSearchPayloadType: searchPayloadType
                });
                break;
            default:
                break;
        }
    }

    return (
        <MythicTabPanel {...props} >
            <SearchTabPayloadsSearchPanel onChangeSearchField={onChangeSearchField}
                                          onFilenameSearch={onFilenameSearch}
                                          onDescriptionSearch={onDescriptionSearch}
                                          onBuildParameterSearch={onBuildParameterValueSearch}
                                          onUUIDSearch={onUUIDSearch} onC2ParameterValueSearch={onC2ParameterValueSearch}
                                          value={props.value} index={props.index} queryParams={props.queryParams}
                                          onChangeDeletedField={onChangeDeletedField}
                                          onChangeAutogeneratedField={onChangeAutogeneratedField}
                                          onChangeSearchC2={onChangeSearchC2} onChangeSearchPayloadType={onChangeSearchPayloadType}
                                          changeSearchParam={props.changeSearchParam}/>
            <div style={{overflowY: "auto", flexGrow: 1, position: "relative"}}>
                    {openBackdrop &&
                        <Backdrop open={openBackdrop} onClick={()=>{setOpenBackdrop(false);}} style={{zIndex: 2000, position: "absolute"}}>
                            <CircularProgress color="inherit" disableShrink  />
                        </Backdrop>
                    }
                    <SearchPayloadsTable showDeleted={showDeleted} me={props.me} payloads={payloads} setPayloads={setPayloads} />
            </div>
            <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center"}}>
                <Pagination count={Math.ceil(totalCount / fetchLimit)} variant="outlined" color="info"
                            boundaryCount={1}
                            siblingCount={1} onChange={onChangePage} showFirstButton={true} showLastButton={true}
                            style={{padding: "20px"}}/>
                <Typography style={{paddingLeft: "10px"}}>Total Results: {totalCount}</Typography>
            </div>
        </MythicTabPanel>
    )
}