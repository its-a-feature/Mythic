import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React from 'react';
import { gql, useSubscription} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {ProxySearchTable} from './ProxySearchTable';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faSocks} from '@fortawesome/free-solid-svg-icons';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {MythicTableToolbar, MythicTableToolbarGroup, MythicToolbarToggle} from "../../MythicComponents/MythicTableToolbar";
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

    return (
        <MythicTabPanel {...props} >
            <MythicTableToolbar>
                <MythicTableToolbarGroup grow>
                    <MythicToolbarToggle
                        checked={showDeleted}
                        onClick={() => setShowDeleted(!showDeleted)}
                        label="Stopped"
                        activeIcon={<VisibilityIcon fontSize="small" />}
                        inactiveIcon={<VisibilityOffIcon fontSize="small" />}
                    />
                </MythicTableToolbarGroup>
            </MythicTableToolbar>
            <div style={{overflowY: "auto", height: "100%", display: "flex", flexDirection: "column"}}>
                {callbackData.length > 0 ? (
                    <ProxySearchTable callbacks={callbackData} showDeleted={showDeleted} />) : (
                    <MythicSearchEmptyState
                        compact
                        description="No callback port forwards match the current stopped filter."
                        minHeight={180}
                    />
                )}
            </div>
        </MythicTabPanel>
    )
}
