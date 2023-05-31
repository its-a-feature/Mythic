import React from 'react';
import { ConsumingServicesTable } from './ConsumingServicesTable';
import { useQuery, gql } from '@apollo/client';
import {snackActions} from "../../utilities/Snackbar";

const consumingServicesCountQuery = gql`
query consumingServicesList{
    consumingServicesList{
        webhooks
        loggers
    }
}
`;
export function ConsumingServices({me}){
    const [servicesList, setServicesList] = React.useState({});
    useQuery(consumingServicesCountQuery, {
        onCompleted: (data) => {
            setServicesList(data.consumingServicesList);
            snackActions.success("Successfully fetched service counts");
            //console.log(data);
        },
        onError: (data) => {
            snackActions.error("Failed to load consuming services data")
        }
    })
    return (
      <div style={{display: "flex", flexGrow: 1, flexDirection: "column"}}>
        <ConsumingServicesTable 
            me={me}
            servicesList={servicesList}
            />
        </div>
    );
} 
