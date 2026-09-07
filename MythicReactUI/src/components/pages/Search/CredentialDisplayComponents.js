import React from 'react';
import {MythicChip} from '../../MythicComponents/MythicChip';

export const parseCredentialMetadata = (metadata) => {
    if(metadata === undefined || metadata === null){
        return {};
    }
    if(typeof metadata === "string"){
        try{
            const parsed = JSON.parse(metadata);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        }catch(error){
            return {};
        }
    }
    return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
}

export const compactMetadataValue = (value) => {
    if(value === undefined || value === null){
        return "";
    }
    if(typeof value === "object"){
        return JSON.stringify(value);
    }
    return `${value}`;
}

export const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

export const getNestedMetadataObject = (metadata, key) => {
    const value = metadata?.[key];
    return isPlainObject(value) ? value : {};
}

export const getCredentialValidityChips = (metadata) => {
    const parsedMetadata = parseCredentialMetadata(metadata);
    const validity = parsedMetadata.validity || {};
    const chips = [];
    if(validity.not_yet_valid){
        chips.push({label: "not yet valid", color: "warning"});
    }
    if(validity.expired){
        chips.push({label: "expired", color: "error"});
    }
    if(validity.renew_expired){
        chips.push({label: "renew expired", color: "warning"});
    }
    if(chips.length === 0 && validity.has_lifecycle && validity.valid){
        chips.push({label: "valid", color: "success"});
    }
    return chips;
}

export function CredentialInspectorSection({title, actions, children, tone=""}){
    const sectionClassName = [
        "mythic-credential-search-section min-w-0",
        tone ? `mythic-credential-search-section-${tone}` : "",
    ].filter(Boolean).join(" ");
    return (
        <section className={sectionClassName}>
            <div className="mythic-credential-search-section-header text-xs font-850 items-center flex gap-4 justify-between min-w-0 text-muted">
                <span>{title}</span>
                {actions && <div className="mythic-credential-search-section-actions items-center flex">{actions}</div>}
            </div>
            <div className="mythic-credential-search-section-body gap-3 min-w-0 grid grid-cols-2">
                {children}
            </div>
        </section>
    )
}

export function CredentialDetail({label, value, chip, wide=false, code=false, action, emphasis=false, tone=""}){
    const isReactValue = React.isValidElement(value);
    const displayValue = value === undefined || value === null || value === "" ? "-" : value;
    const detailClassName = [
        "mythic-credential-search-detail min-w-0 rounded border-subtle",
        wide ? "mythic-credential-search-detail-wide grid-col-full" : "",
        emphasis ? "mythic-credential-search-detail-emphasis border-primary-2" : "",
        tone ? `mythic-credential-search-detail-${tone}` : "",
    ].filter(Boolean).join(" ");
    return (
        <div className={detailClassName}>
            <span>{label}</span>
            <div className="mythic-credential-search-detail-value-row items-center gap-3 min-w-0 grid">
                <strong className={code ? "mythic-credential-search-code font-mono" : ""} title={isReactValue ? undefined : `${displayValue}`}>
                    {displayValue}
                </strong>
                {action && <div className="mythic-credential-search-detail-action items-center flex flex-none">{action}</div>}
            </div>
            {chip &&
                <MythicChip compact color={chip.color} variant="outlined" label={chip.label} className="max-w-full" />
            }
        </div>
    )
}

export function CredentialMetadataPair({name, value, tone=""}){
    const pairClassName = [
        "mythic-credential-search-metadata-pair min-w-0 rounded border-subtle",
        tone ? `mythic-credential-search-metadata-pair-${tone}` : "",
    ].filter(Boolean).join(" ");
    return (
        <div className={pairClassName}>
            <span title={name}>{name}</span>
            <strong title={compactMetadataValue(value)}>
                <MetadataValue value={value} />
            </strong>
        </div>
    )
}

export function MetadataValue({value}){
    if(Array.isArray(value)){
        return <MythicChip compact variant="outlined" label={`array[${value.length}]`} className="max-w-full" />
    }
    if(isPlainObject(value)){
        const entries = Object.entries(value);
        return (
            <div className="mythic-credential-search-nested-metadata gap-1 min-w-0 grid font-mono whitespace-normal">
                {entries.map(([key, nestedValue]) => (
                    <div key={key}>
                        <span>{key}</span>
                        <strong>{compactMetadataValue(nestedValue)}</strong>
                    </div>
                ))}
            </div>
        )
    }
    return <span>{compactMetadataValue(value)}</span>
}
