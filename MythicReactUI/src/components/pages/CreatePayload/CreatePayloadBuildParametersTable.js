import React from 'react';
import Collapse from '@mui/material/Collapse';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {CreatePayloadParameter} from './CreatePayloadParameter';
import {GetGroupedParameters} from "./Step1SelectOS";

const CreatePayloadBuildParameterGroup = ({group, children}) => {
    const [collapsed, setCollapsed] = React.useState(false);
    const hasHeader = group.name !== '' && group.name !== undefined;
    const toggleCollapsed = () => setCollapsed((current) => !current);

    return (
        <section className="mythic-create-parameter-group mythic-column-stack">
            {hasHeader &&
                <div
                    aria-expanded={!collapsed}
                    className="mythic-create-parameter-group-header mythic-create-parameter-group-header-collapsible"
                    onClick={toggleCollapsed}
                    onKeyDown={(event) => {
                        if(event.key === "Enter" || event.key === " "){
                            event.preventDefault();
                            toggleCollapsed();
                        }
                    }}
                    role="button"
                    tabIndex={0}
                >
                    {collapsed ?
                        <ChevronRightIcon className="mythic-create-parameter-group-header-icon" fontSize="small" /> :
                        <ExpandMoreIcon className="mythic-create-parameter-group-header-icon" fontSize="small" />
                    }
                    <span className="mythic-create-parameter-group-header-title">{group.name}</span>
                </div>
            }
            {hasHeader ? (
                <Collapse in={!collapsed} timeout="auto">
                    <div className="mythic-column-stack">
                        {children}
                    </div>
                </Collapse>
            ) : (
                <div className="mythic-column-stack">
                    {children}
                </div>
            )}
        </section>
    );
};

export function CreatePayloadBuildParametersTable(props){
    const buildParameters = GetGroupedParameters({
        buildParameters: props.buildParameters,
        os: props.os,
        c2_name: props.c2_name,
    });
    const getOtherParameters = () => {
        return buildParameters.reduce((prev, cur) => {
            const nestedParameters = cur.parameters.reduce((prev2, cur2) => {
                return {...prev2, [cur2.name]: cur2.value}
            }, {});
            return {...prev, ...nestedParameters};
        }, {});
    }
    return (
        <div className="mythic-create-parameter-scroll">
            {buildParameters.map(b => (
                b.parameters.length > 0 &&
                <CreatePayloadBuildParameterGroup group={b} key={b?.name || 'undefined'}>
                    {b.parameters.map( (op) => (
                        <CreatePayloadParameter
                            displayMode="card"
                            selected_os={props.os}
                            key={"buildparamtablerow" + op.id}
                            payload_type={props.payload_type}
                            c2_profile_name={props.c2_name}
                            instance_name={props.instance_name}
                            returnAllDictValues={props.returnAllDictValues}
                            onChange={props.onChange}
                            getOtherParameters={getOtherParameters}
                            {...op}
                        />
                    ))}
                </CreatePayloadBuildParameterGroup>
            ))}
        </div>

    );
}
