import React from 'react';
import { ConsumingServicesTable } from './ConsumingServicesTable';
import {useSubscription, gql } from '@apollo/client';
const sub_consuming_services = gql`
subscription ConsumingContainer{
    consuming_container_stream(batch_size: 10, cursor: {initial_value: {updated_at: "1970-01-01"}}) {
        id
        name
        description
        type
        container_running
        deleted
        subscriptions
    }
}
 `;
export function ConsumingServices({me}){
    const [services, setServices] = React.useState([]);
    useSubscription(sub_consuming_services, {
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            const updated = data.data.consuming_container_stream.reduce( (prev, cur) => {
                let existingIndex = prev.findIndex( (element, i, array) => element.id === cur.id);
                if(existingIndex > -1){
                    prev[existingIndex] = {...prev[existingIndex], ...cur};
                    return [...prev];
                }
                return [...prev, cur];
            }, services);
            setServices(updated);
        },
        onError: ({data}) => {
            console.log(data)
        },
    });
    return (
      <div style={{display: "flex", flexDirection: "column", height: "100%"}}>
        <ConsumingServicesTable 
            me={me}
            services={services}
            />
        </div>
    );
} 
