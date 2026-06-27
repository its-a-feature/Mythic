import React from 'react';
import {Chip} from '@mui/material';
import {
    compactMetadataValue,
    CredentialDetail,
    CredentialInspectorSection,
    CredentialMetadataPair,
    getNestedMetadataObject,
    isPlainObject,
} from './CredentialDisplayComponents';

export const credentialJWTMetadataKeys = new Set(["jwt"]);
export const credentialJWTIdentityKeys = new Set(["jwt"]);

const jwtSummaryFields = ["credential_format", "token_type", "algorithm", "issuer", "subject", "audience", "expires_at"];
const jwtHeaderFields = [
    {label: "Algorithm", key: "alg"},
    {label: "Type", key: "typ"},
    {label: "Key ID", key: "kid", code: true},
    {label: "Content Type", key: "cty"},
];
const jwtClaimFields = [
    {label: "Subject", key: "sub", code: true},
    {label: "Issuer", key: "iss", wide: true, code: true},
    {label: "Audience", key: "aud", wide: true, code: true},
    {label: "JWT ID", key: "jti", code: true},
    {label: "Issued At", key: "iat", time: true},
    {label: "Not Before", key: "nbf", time: true},
    {label: "Expires", key: "exp", time: true},
    {label: "Scope", key: "scope", wide: true, code: true},
    {label: "Scopes", key: "scopes", wide: true, code: true},
];

const base64UrlDecode = (value) => {
    try{
        const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
        const decoded = window.atob(padded);
        try{
            return decodeURIComponent(decoded.split("").map((character) => {
                return "%" + ("00" + character.charCodeAt(0).toString(16)).slice(-2);
            }).join(""));
        }catch(error){
            return decoded;
        }
    }catch(error){
        return "";
    }
}

const decodeJWT = (credentialText) => {
    const parts = String(credentialText || "").trim().split(".");
    if(parts.length < 2){
        return {};
    }
    const decodePart = (part) => {
        const decoded = base64UrlDecode(part);
        if(decoded === ""){
            return {};
        }
        try{
            const parsed = JSON.parse(decoded);
            return isPlainObject(parsed) ? parsed : {};
        }catch(error){
            return {};
        }
    }
    return {
        header: decodePart(parts[0]),
        claims: decodePart(parts[1]),
        signature: parts[2] || "",
    };
}

const firstPlainObject = (...values) => {
    return values.find((value) => isPlainObject(value)) || {};
}

const firstValue = (...values) => {
    return values.find((value) => value !== undefined && value !== null && value !== "");
}

const formatJWTTime = (value) => {
    if(value === undefined || value === null || value === ""){
        return "";
    }
    if(typeof value === "number" && Number.isFinite(value)){
        return new Date(value * 1000).toISOString();
    }
    if(typeof value === "string" && /^\d+$/.test(value)){
        return new Date(Number(value) * 1000).toISOString();
    }
    return value;
}

const claimValue = (claims, key, asTime=false) => {
    const value = claims[key];
    const formattedValue = asTime ? formatJWTTime(value) : value;
    if(Array.isArray(formattedValue)){
        return formattedValue.join(", ");
    }
    return formattedValue;
}

const jwtSummaryEntries = (metadata, claims, header) => {
    const jwtMetadata = getNestedMetadataObject(metadata, "jwt");
    const entries = [];
    if(metadata.parser){
        entries.push(["parser", metadata.parser]);
    }
    jwtSummaryFields.forEach((key) => {
        const value = firstValue(jwtMetadata[key], key === "algorithm" ? header.alg : undefined, key === "issuer" ? claims.iss : undefined, key === "subject" ? claims.sub : undefined, key === "audience" ? claims.aud : undefined, key === "expires_at" ? formatJWTTime(claims.exp) : undefined);
        if(value !== undefined && value !== null && value !== ""){
            entries.push([key, value]);
        }
    });
    Object.entries(jwtMetadata).forEach(([key, value]) => {
        if(!jwtSummaryFields.includes(key) && value !== undefined && value !== null){
            entries.push([key, value]);
        }
    });
    return entries;
}

const remainingEntries = (source, displayedKeys) => {
    return Object.entries(source)
        .filter(([key, value]) => !displayedKeys.has(key) && value !== undefined && value !== null && value !== "");
}

const hasJWTFieldValue = (value) => {
    return value !== undefined && value !== null && value !== "";
}

export function CredentialJWTDisplay({credential, metadata, identity, validityChips=[]}){
    const decoded = decodeJWT(credential?.credential_text);
    const jwtIdentity = getNestedMetadataObject(identity, "jwt");
    const header = firstPlainObject(jwtIdentity.header, jwtIdentity.headers, decoded.header);
    const claims = firstPlainObject(jwtIdentity.claims, jwtIdentity.payload, jwtIdentity.body, decoded.claims);
    const signature = firstValue(jwtIdentity.signature, decoded.signature);
    const warningValues = Array.isArray(metadata.parser_warnings) ? metadata.parser_warnings : [];
    const summaryEntries = jwtSummaryEntries(metadata, claims, header);
    const showSummary = summaryEntries.length > 0 || validityChips.length > 0 || warningValues.length > 0;
    const displayedHeaderKeys = new Set(jwtHeaderFields.map((field) => field.key));
    const displayedClaimKeys = new Set(jwtClaimFields.map((field) => field.key));
    const remainingHeaderEntries = remainingEntries(header, displayedHeaderKeys);
    const remainingClaimEntries = remainingEntries(claims, displayedClaimKeys);

    return (
        <>
            {showSummary &&
                <CredentialInspectorSection title="JWT Metadata" tone="metadata">
                    <div className="mythic-credential-search-chip-list mythic-credential-search-section-chips">
                        {summaryEntries.map(([key, value]) => (
                            <Chip key={key} size="small" variant="outlined" label={`${key}: ${compactMetadataValue(value)}`} className="mythic-credential-search-mini-chip mythic-credential-search-metadata-chip" />
                        ))}
                        {validityChips.map((chip) => (
                            <Chip key={chip.label} size="small" color={chip.color} variant="outlined" label={chip.label} className="mythic-credential-search-mini-chip mythic-credential-search-metadata-chip" />
                        ))}
                    </div>
                    {warningValues.length > 0 &&
                        <div className="mythic-credential-search-warning-list">
                            {warningValues.map((warning, index) => (
                                <Chip key={`warning-${index}`} size="small" color="warning" variant="outlined" label={compactMetadataValue(warning)} className="mythic-credential-search-warning-chip" />
                            ))}
                        </div>
                    }
                </CredentialInspectorSection>
            }
            {(Object.keys(header).length > 0 || Object.keys(claims).length > 0 || signature) &&
                <CredentialInspectorSection title="JWT Identity" tone="identity">
                    {jwtHeaderFields.filter((field) => hasJWTFieldValue(header[field.key])).map((field) => (
                        <CredentialDetail key={`header-${field.key}`} label={field.label} value={header[field.key]} code={field.code} tone="identity" />
                    ))}
                    {jwtClaimFields.filter((field) => hasJWTFieldValue(claimValue(claims, field.key, field.time))).map((field) => (
                        <CredentialDetail key={`claim-${field.key}`} label={field.label} value={claimValue(claims, field.key, field.time)} wide={field.wide} code={field.code} tone="identity" />
                    ))}
                    {signature &&
                        <CredentialDetail label="Signature" value={signature} wide code tone="identity" />
                    }
                    {remainingHeaderEntries.length > 0 &&
                        <div className="mythic-credential-search-metadata-grid mythic-credential-search-metadata-grid-identity">
                            {remainingHeaderEntries.map(([key, value]) => (
                                <CredentialMetadataPair key={`header-${key}`} name={`header.${key}`} value={value} tone="identity" />
                            ))}
                        </div>
                    }
                    {remainingClaimEntries.length > 0 &&
                        <div className="mythic-credential-search-metadata-grid mythic-credential-search-metadata-grid-identity">
                            {remainingClaimEntries.map(([key, value]) => (
                                <CredentialMetadataPair key={`claim-${key}`} name={`claim.${key}`} value={value} tone="identity" />
                            ))}
                        </div>
                    }
                </CredentialInspectorSection>
            }
        </>
    )
}
