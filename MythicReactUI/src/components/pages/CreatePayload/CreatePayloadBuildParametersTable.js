import React from 'react';
import { CreatePayloadParameter } from './CreatePayloadParameter';
import {GetGroupedParameters} from "./Step1SelectOS";


export function CreatePayloadBuildParametersTable(props){
    const buildParameters = GetGroupedParameters({
        buildParameters: props.buildParameters,
        os: props.os,
        c2_name: props.c2_name,
    });
    return (
        <div className="mythic-create-parameter-scroll">
            {buildParameters.map(b => (
                b.parameters.length > 0 &&
                <section className="mythic-create-parameter-group" key={b?.name || 'undefined'}>
                    {b.name !== '' && b.name !== undefined &&
                        <div className="mythic-create-parameter-group-header">{b.name}</div>
                    }
                    <div className="mythic-create-parameter-list">
                        {b.parameters.map( (op) => (
                            <CreatePayloadParameter
                                displayMode="card"
                                selected_os={props.os}
                                key={"buildparamtablerow" + op.id}
                                payload_type={props.payload_type}
                                instance_name={props.instance_name}
                                onChange={props.onChange}
                                {...op}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>

    );
} 
