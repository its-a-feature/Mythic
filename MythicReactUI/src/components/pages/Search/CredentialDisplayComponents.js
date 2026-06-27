import React from 'react';
import {Chip} from '@mui/material';

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
        "mythic-credential-search-section",
        tone ? `mythic-credential-search-section-${tone}` : "",
    ].filter(Boolean).join(" ");
    return (
        <section className={sectionClassName}>
            <div className="mythic-credential-search-section-header">
                <span>{title}</span>
                {actions && <div className="mythic-credential-search-section-actions">{actions}</div>}
            </div>
            <div className="mythic-credential-search-section-body">
                {children}
            </div>
        </section>
    )
}

export function CredentialDetail({label, value, chip, wide=false, code=false, action, emphasis=false, tone=""}){
    const isReactValue = React.isValidElement(value);
    const displayValue = value === undefined || value === null || value === "" ? "-" : value;
    const detailClassName = [
        "mythic-credential-search-detail",
        wide ? "mythic-credential-search-detail-wide" : "",
        emphasis ? "mythic-credential-search-detail-emphasis" : "",
        tone ? `mythic-credential-search-detail-${tone}` : "",
    ].filter(Boolean).join(" ");
    return (
        <div className={detailClassName}>
            <span>{label}</span>
            <div className="mythic-credential-search-detail-value-row">
                <strong className={code ? "mythic-credential-search-code" : ""} title={isReactValue ? undefined : `${displayValue}`}>
                    {displayValue}
                </strong>
                {action && <div className="mythic-credential-search-detail-action">{action}</div>}
            </div>
            {chip &&
                <Chip size="small" color={chip.color} variant="outlined" label={chip.label} className="mythic-credential-search-inline-chip" />
            }
        </div>
    )
}

export function CredentialMetadataPair({name, value, tone=""}){
    const pairClassName = [
        "mythic-credential-search-metadata-pair",
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
        return <Chip size="small" variant="outlined" label={`array[${value.length}]`} className="mythic-credential-search-mini-chip" />
    }
    if(isPlainObject(value)){
        const entries = Object.entries(value);
        return (
            <div className="mythic-credential-search-nested-metadata">
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
