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
        <div className="mythic-metadata-item p-4 min-w-0 rounded bg-surface-muted border-subtle">
            <span className="mythic-metadata-label text-2xs font-800 leading-120 text-muted">{label}</span>
            <span className={code ? "mythic-metadata-code text-xs leading-135 min-w-0 wrap-anywhere text-primary whitespace-pre-wrap font-mono" : "mythic-metadata-value min-w-0 wrap-anywhere text-primary whitespace-pre-wrap"}>
                {formatParameterValue(value, emptyValue)}
            </span>
        </div>
    );
}

export function ParameterCodeBlock({children}) {
    return (
        <code className="mythic-code-block text-xs leading-145 max-w-full min-w-0 overflow-auto w-full rounded bg-neutral-3 border-subtle text-primary font-mono whitespace-pre">
            {formatParameterValue(children)}
        </code>
    );
}

export function BuildParameterList({parameters}) {
    if (parameters.length === 0) {
        return (
            <div className="mythic-parameter-card p-6 min-w-0 rounded bg-surface-raised border-subtle">
                <div className="mythic-parameter-title text-sm font-800 leading-125 min-w-0 wrap-anywhere text-primary">No build parameters</div>
                <div className="mythic-parameter-description text-xs leading-140 wrap-anywhere text-muted whitespace-pre-wrap">This service does not define build-time parameters.</div>
            </div>
        );
    }
    return (
        <div className="mythic-parameter-list gap-5 min-w-0 grid">
            {parameters.map((param) => (
                <div className="mythic-parameter-card p-6 min-w-0 rounded bg-surface-raised border-subtle" key={"buildprop" + param.id}>
                    <div className="mythic-parameter-card-header items-start flex gap-6 justify-between min-w-0">
                        <div>
                            <div className="mythic-parameter-title text-sm font-800 leading-125 min-w-0 wrap-anywhere text-primary">{param.name}</div>
                            <div className="mythic-parameter-description text-xs leading-140 wrap-anywhere text-muted whitespace-pre-wrap">
                                {param.description || "No description provided."}
                            </div>
                        </div>
                        <div className="mythic-status-stack items-center flex flex-wrap gap-3 min-w-0">
                            <MythicStatusChip label={param.parameter_type} status="secondary" showIcon={false} />
                            {param.required &&
                                <MythicStatusChip label="Required" status="warning" />
                            }
                            {param.randomize &&
                                <MythicStatusChip label="Randomized" status="info" />
                            }
                        </div>
                    </div>
                    <div className="mythic-metadata-grid gap-4 min-w-0 grid">
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
