import React from 'react';
import {CreatePayloadBuildParametersTable} from './CreatePayloadBuildParametersTable';


export function CreatePayloadC2ProfileParametersTable(props){

    const onChange = (paramName, value, error) => {
        props.onChange(props.name, paramName, value, error);
    }
    return (
        <CreatePayloadBuildParametersTable
            buildParameters={props.c2profileparameters}
            os={props.os}
            c2_name={props.c2_name}
            payload_type={props.payload_type}
            instance_name={props.instance_name}
            returnAllDictValues={props.returnAllDictValues}
            onChange={onChange}
        />
    );
}
