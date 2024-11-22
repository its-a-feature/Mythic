import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React, { useEffect } from 'react';
import { gql, useSubscription} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {ProxySearchTable} from './ProxySearchTable';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faSocks} from '@fortawesome/free-solid-svg-icons';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {IconButton} from '@mui/material';

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
        <MythicSearchTabLabel label={"PROXIES"} iconComponent={
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
            <div>
                {showDeleted ? (
                    <MythicStyledTooltip title={"Hide Stopped Proxies"} tooltipStyle={{float: "right"}}>
                        <IconButton size="small" style={{float: "right", marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)}><VisibilityIcon /></IconButton>
                    </MythicStyledTooltip>

                ) : (
                    <MythicStyledTooltip title={"Show Stopped Proxies"} tooltipStyle={{float: "right"}}>
                        <IconButton size="small" style={{float: "right",  marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)} ><VisibilityOffIcon /></IconButton>
                    </MythicStyledTooltip>
                )}
            </div>
            <div style={{overflowY: "auto", height: "100%", display: "flex", flexDirection: "column"}}>
                {callbackData.length > 0 ? (
                    <ProxySearchTable callbacks={callbackData} showDeleted={showDeleted} />) : (
                    <div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>No Search Results</div>
                )}
            </div>
        </MythicTabPanel>
    )
}