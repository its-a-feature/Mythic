import React  from 'react';
import { PayloadTypeCard } from './PayloadTypeCard';
import {useSubscription, gql } from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';

 const SUB_Payload_Types = gql`
 subscription getPayloadTypesSubscription {
  payloadtype(where: {deleted: {_eq: false}}, order_by: {ptype: asc}) {
    author
    container_running
    id
    last_heartbeat
    note
    ptype
    supported_os
    wrapper
    translation_container
  }
}
 `;
export function PayloadTypes(props){
    const { loading, error, data } = useSubscription(SUB_Payload_Types);

    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}}/>;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    return (
        <div style={{maxHeight: "calc(95vh)", maxWidth: "100%"}}>
        {
            data.payloadtype.map( (pt) => (
                <PayloadTypeCard key={pt.id} {...pt} />
            ))
        }
        </div>
    );
}
