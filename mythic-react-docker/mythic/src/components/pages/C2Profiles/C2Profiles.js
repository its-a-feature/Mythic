import React  from 'react';
import { C2ProfilesCard } from './C2ProfilesCard';
import {useSubscription, gql } from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';

 const SUB_C2_Profiles = gql`
 subscription getPayloadTypesSubscription {
    c2profile(where: {deleted: {_eq: false}}, order_by: {name: asc}) {
    author
    id
    container_running
    description
    is_p2p
    last_heartbeat
    name
    running
    payloadtypec2profiles(order_by: {payloadtype: {ptype: asc}}) {
      payloadtype {
        ptype
      }
    }
  }
}
 `;
export function C2Profiles(props){
    const { loading, error, data } = useSubscription(SUB_C2_Profiles);

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
            data.c2profile.map( (pt) => (
                <C2ProfilesCard key={"c2prof" + pt.id} {...pt} />
            ))
        }
        </div>
    );
}
