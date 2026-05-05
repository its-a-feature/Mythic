import React from 'react';
import {MythicStatusChip} from "../../MythicComponents/MythicStatusChip";

export const formatParameterValue = (value, emptyValue = "Not set") => {
    if (value === undefined || value === null || value === "") {
        return emptyValue;
    }
    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }
    if (Array.isArray(value)) {
        return value.length > 0 ? value.join(", ") : emptyValue;
    }
    if (typeof value === "object") {
        return Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : emptyValue;
    }
    return `${value}`;
};

export function ParameterMetadataItem({label, value, code = false, emptyValue = "Not set"}) {
    return (
        <div className="mythic-metadata-item">
            <span className="mythic-metadata-label">{label}</span>
            <span className={code ? "mythic-metadata-code" : "mythic-metadata-value"}>
                {formatParameterValue(value, emptyValue)}
            </span>
        </div>
    );
}

export function ParameterCodeBlock({children}) {
    return (
        <code className="mythic-code-block">
            {formatParameterValue(children)}
        </code>
    );
}

export function BuildParameterList({parameters}) {
    if (parameters.length === 0) {
        return (
            <div className="mythic-parameter-card">
                <div className="mythic-parameter-title">No build parameters</div>
                <div className="mythic-parameter-description">This service does not define build-time parameters.</div>
            </div>
        );
    }
    return (
        <div className="mythic-parameter-list">
            {parameters.map((param) => (
                <div className="mythic-parameter-card" key={"buildprop" + param.id}>
                    <div className="mythic-parameter-card-header">
                        <div>
                            <div className="mythic-parameter-title">{param.name}</div>
                            <div className="mythic-parameter-description">
                                {param.description || "No description provided."}
                            </div>
                        </div>
                        <div className="mythic-status-stack">
                            <MythicStatusChip label={param.parameter_type} status="neutral" showIcon={false} />
                            {param.required &&
                                <MythicStatusChip label="Required" status="warning" />
                            }
                            {param.randomize &&
                                <MythicStatusChip label="Randomized" status="info" />
                            }
                        </div>
                    </div>
                    <div className="mythic-metadata-grid">
                        <ParameterMetadataItem label="Scripting / Building Name" value={param.name} code />
                        <ParameterMetadataItem label="Default Value" value={param.default_value} code />
                        <ParameterMetadataItem label="Required" value={param.required} />
                        <ParameterMetadataItem label="Verifier Regex" value={param.verifier_regex} code />
                        {(param.choices || "").length > 0 &&
                            <ParameterMetadataItem label="Parameter Options" value={param.choices} code />
                        }
                        {param.randomize &&
                            <ParameterMetadataItem label="Format String" value={param.format_string} code />
                        }
                    </div>
                </div>
            ))}
        </div>
    );
}
