import React from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { CreatePayloadParameter } from './CreatePayloadParameter';
import {GetGroupedParameters} from "./Step1SelectOS";


export function CreatePayloadBuildParametersTable(props){
    const [collapsedGroups, setCollapsedGroups] = React.useState(new Set());
    const toggleGroup = (name) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if(next.has(name)){ next.delete(name); }
            else { next.add(name); }
            return next;
        });
    };
    const buildParameters = GetGroupedParameters({
        buildParameters: props.buildParameters,
        os: props.os,
        c2_name: props.c2_name,
    });
    return (
        <div className="mythic-create-parameter-scroll">
            {buildParameters.map(b => {
                if(b.parameters.length === 0) return null;
                const hasHeader = b.name !== '' && b.name !== undefined;
                const collapsed = hasHeader && collapsedGroups.has(b.name);
                return (
                    <section className="mythic-create-parameter-group" key={b?.name || 'undefined'}>
                        {hasHeader &&
                            <div
                                className="mythic-create-parameter-group-header"
                                role="button"
                                tabIndex={0}
                                aria-expanded={!collapsed}
                                aria-label={collapsed ? `Expand ${b.name}` : `Collapse ${b.name}`}
                                onClick={() => toggleGroup(b.name)}
                                onKeyDown={(e) => {
                                    if(e.key === "Enter" || e.key === " "){
                                        e.preventDefault();
                                        toggleGroup(b.name);
                                    }
                                }}
                                style={{alignItems: "center", cursor: "pointer", display: "flex", justifyContent: "space-between", userSelect: "none"}}
                            >
                                <span>{b.name}</span>
                                {collapsed ? <ChevronRightIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </div>
                        }
                        {!collapsed &&
                            <div className="mythic-create-parameter-list">
                                {b.parameters.map( (op) => (
                                    <CreatePayloadParameter
                                        displayMode="card"
                                        selected_os={props.os}
                                        key={"buildparamtablerow" + op.id}
                                        payload_type={props.payload_type}
                                        c2_profile_name={props.c2_name}
                                        instance_name={props.instance_name}
                                        onChange={props.onChange}
                                        {...op}
                                    />
                                ))}
                            </div>
                        }
                    </section>
                );
            })}
        </div>

    );
}
