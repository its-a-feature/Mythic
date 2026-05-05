import React from 'react';
import {CreatePayloadParameter} from '../CreatePayload/CreatePayloadParameter';


export function CreatePayloadBuildParametersTable(props){

    return (
        <div className="mythic-create-parameter-list">
            {props.buildParameters.map( (op) => (
                <CreatePayloadParameter displayMode="card" key={"buildparamtablerow" + op.id} onChange={props.onChange} {...op} />
            ))}
        </div>
    );
} 
