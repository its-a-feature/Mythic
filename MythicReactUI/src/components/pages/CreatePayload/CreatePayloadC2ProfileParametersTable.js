import React from 'react';
import { CreatePayloadParameter } from './CreatePayloadParameter';


export function CreatePayloadC2ProfileParametersTable(props){

    const onChange = (paramName, value, error) => {
        props.onChange(props.name, paramName, value, error);
    }
    return (
        <div className="mythic-create-parameter-list">
            {props.c2profileparameters.map( (op) => (
                <CreatePayloadParameter
                    displayMode="card"
                    key={"c2paramtablerow" + op.id}
                    returnAllDictValues={props.returnAllDictValues}
                    onChange={onChange}
                    {...op}
                />
            ))}
        </div>
    );
} 
