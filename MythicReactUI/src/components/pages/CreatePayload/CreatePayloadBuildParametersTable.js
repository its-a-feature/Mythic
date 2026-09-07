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
        <section className="mythic-create-parameter-group mythic-column-stack flex flex-column gap-4 min-w-0">
            {hasHeader &&
                <div
                    aria-expanded={!collapsed}
                    className="mythic-create-parameter-group-header text-header text-sm font-800 leading-125 items-center flex gap-2 mythic-create-parameter-group-header-collapsible min-w-0 rounded cursor-pointer border-subtle"
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
                        <ChevronRightIcon className="mythic-create-parameter-group-header-icon flex-none" fontSize="small" /> :
                        <ExpandMoreIcon className="mythic-create-parameter-group-header-icon flex-none" fontSize="small" />
                    }
                    <span className="mythic-create-parameter-group-header-title min-w-0 wrap-anywhere">{group.name}</span>
                </div>
            }
            {hasHeader ? (
                <Collapse in={!collapsed} timeout="auto">
                    <div className="mythic-column-stack flex flex-column gap-4 min-w-0">
                        {children}
                    </div>
                </Collapse>
            ) : (
                <div className="mythic-column-stack flex flex-column gap-4 min-w-0">
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
        <div className="mythic-create-parameter-scroll flex flex-column gap-6 h-full min-h-0 overflow-auto w-full">
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
