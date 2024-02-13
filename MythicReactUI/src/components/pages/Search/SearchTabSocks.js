import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React, { useEffect } from 'react';
import { gql, useLazyQuery, useQuery, useSubscription} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {SocksSearchTable} from './SocksSearchTable';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faSocks} from '@fortawesome/free-solid-svg-icons';

const callbackPortsSub = gql`
subscription portsSub{
    callbackport(distinct_on: id, order_by: {id: desc}) {
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
        local_port
        remote_port
        remote_ip
        port_type
        bytes_received
        bytes_sent
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
            <FontAwesomeIcon icon={faSocks} size="lg" style={{marginTop: "5px"}}/>} {...props}/>
    )
}

export const SearchTabSocksPanel = (props) =>{
    const [callbackData, setCallbackData] = React.useState([]);
    useSubscription(callbackPortsSub, {
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            //console.log("got data", subscriptionData.data.payload_stream)
            const updated = data.data.callbackport.reduce( (prev, cur) => {
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
            <div style={{overflowY: "auto", flexGrow: 1}}>
                {callbackData.length > 0 ? (
                    <SocksSearchTable callbacks={callbackData} />) : (
                    <div style={{display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", left: "50%", top: "50%"}}>No Search Results</div>
                )}
            </div>
        </MythicTabPanel>
    )
}