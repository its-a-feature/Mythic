import {MythicTabPanel, MythicSearchTabLabel} from '../../MythicComponents/MythicTabPanel';
import React, { useEffect } from 'react';
import { gql, useLazyQuery, useQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import Pagination from '@mui/material/Pagination';
import { Typography } from '@mui/material';
import {SocksSearchTable} from './SocksSearchTable';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faSocks} from '@fortawesome/free-solid-svg-icons';

const userSearch = gql`
query portsQuery($operation_id: Int!) {
    callbackport(distinct_on: id, order_by: {id: desc}, where: {operation_id: {_eq: $operation_id}}) {
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
        port
        port_type
        task_id
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
    const me = props.me;
    useQuery(userSearch, {
        variables: {operation_id: me?.user?.current_operation_id || 0},
        fetchPolicy: "network-only",
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.callbackport.length === 0){
                snackActions.info("No proxies Running");
            }
            setCallbackData(data.callbackport);
        },
        onError: (data) => {
            snackActions.error("Failed to fetch data for proxies");
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