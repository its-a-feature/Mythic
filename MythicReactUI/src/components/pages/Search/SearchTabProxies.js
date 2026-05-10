import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import { gql, useSubscription} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {ProxySearchTable} from './ProxySearchTable';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faSocks} from '@fortawesome/free-solid-svg-icons';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {MythicSearchField, MythicTableToolbar, MythicTableToolbarGroup, MythicToolbarToggle} from "../../MythicComponents/MythicTableToolbar";
import {MythicSearchEmptyState} from "../../MythicComponents/MythicStateDisplay";

const callbackPortsSub = gql`
subscription portsSub{
    callbackport_stream(cursor: {initial_value: {updated_at: "1970-01-01"}, ordering: ASC}, batch_size: 100, where: {}) {
        callback {
            user
            host
            description
            domain
            id
            display_id
            integrity_level
            ip
            process_name
            active
            init_callback
            last_checkin
        }
        updated_at
        local_port
        remote_port
        remote_ip
        port_type
        bytes_received
        bytes_sent
        username
        password
        task {
            display_id
        }
        id
        deleted
    }
}
`;

export function SearchTabSocksLabel(props){
    return (
        <MythicSearchTabLabel label={"Proxies"} iconComponent={
            <FontAwesomeIcon icon={faSocks} size="lg" style={{marginTop: "4px", marginBottom: "5px"}}/>} {...props}/>
    )
}

export const SearchTabSocksPanel = (props) =>{
    const [callbackData, setCallbackData] = React.useState([]);
    const [showDeleted, setShowDeleted] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const handleSearchValueChange = (name, value, error) => {
        setSearch(value);
    }
    const submitSearch = () => {
        props.changeSearchParam("search", search);
    }
    const handleToggleShowDeleted = () => {
        const nextShowDeleted = !showDeleted;
        setShowDeleted(nextShowDeleted);
        props.changeSearchParam("showStopped", nextShowDeleted ? "true" : "false");
    }
    React.useEffect(() => {
        if(props.value === props.index){
            const queryParams = new URLSearchParams(window.location.search);
            if(queryParams.has("search")){
                setSearch(queryParams.get("search"));
            }
            if(queryParams.has("showStopped")){
                setShowDeleted(queryParams.get("showStopped") === "true");
            }
        }
    }, [props.value, props.index]);
    useSubscription(callbackPortsSub, {
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            //console.log("got data", subscriptionData.data.payload_stream)
            const updated = data.data.callbackport_stream.reduce( (prev, cur) => {
                const index = prev.findIndex( (p) => p.id === cur.id );
                if(index > -1){
                    prev[index] = {...cur};
                    return [...prev];
                }else{
                    return [cur, ...prev];
                }
            }, [...callbackData])
            updated.sort( (a,b) => a.id > b.id ? -1 : 1);
            setCallbackData(updated);
        },
        onCompleted: (data) => {
            console.log("completed")
        },
        onError: (data) => {
            snackActions.warning("Failed to get callback ports");
            console.log(data);
        }
    });
    const filteredCallbacks = React.useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        if(normalizedSearch === ""){
            return callbackData;
        }
        return callbackData.filter((proxy) => {
            const searchableText = [
                proxy.callback?.user,
                proxy.callback?.host,
                proxy.callback?.description,
                proxy.callback?.domain,
                proxy.callback?.display_id ? `C-${proxy.callback.display_id}` : "",
                proxy.task?.display_id ? `T-${proxy.task.display_id}` : "",
                proxy.local_port,
                proxy.remote_ip,
                proxy.remote_port,
                proxy.port_type,
                proxy.username,
            ].join(" ").toLowerCase();
            return searchableText.includes(normalizedSearch);
        });
    }, [callbackData, search]);
    const visibleCallbacks = React.useMemo(() => {
        return filteredCallbacks.filter((proxy) => showDeleted || !proxy.deleted);
    }, [filteredCallbacks, showDeleted]);

    return (
        <MythicTabPanel {...props} >
            <MythicTableToolbar variant="search">
                <MythicTableToolbarGroup grow label="Search">
                    <MythicSearchField
                        value={search}
                        onChange={handleSearchValueChange}
                        onEnter={submitSearch}
                        onSearch={submitSearch}
                        placeholder="Search proxies..."
                    />
                </MythicTableToolbarGroup>
                <MythicTableToolbarGroup label="Filters">
                    <MythicToolbarToggle
                        checked={showDeleted}
                        onClick={handleToggleShowDeleted}
                        label="Stopped"
                        activeIcon={<VisibilityIcon fontSize="small" />}
                        inactiveIcon={<VisibilityOffIcon fontSize="small" />}
                    />
                </MythicTableToolbarGroup>
            </MythicTableToolbar>
            <div style={{overflowY: "auto", height: "100%", display: "flex", flexDirection: "column"}}>
                {visibleCallbacks.length > 0 ? (
                    <ProxySearchTable callbacks={filteredCallbacks} showDeleted={showDeleted} />) : (
                    <MythicSearchEmptyState
                        compact
                        description={search.trim() === "" ?
                            "No callback port forwards match the current stopped filter." :
                            "No callback port forwards match the current search and stopped filter."}
                        minHeight={180}
                    />
                )}
            </div>
        </MythicTabPanel>
    )
}
