import React from 'react';
import { ConsumingServicesTable } from './ConsumingServicesTable';

export function ConsumingServices({me}){

    return (
      <div style={{display: "flex", flexGrow: 1, flexDirection: "column"}}>
        <ConsumingServicesTable 
            me={me}
            />
        </div>
    );
} 
