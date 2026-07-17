import React from 'react';
import {MythicChip} from '../../MythicComponents/MythicChip';
import {
    compactMetadataValue,
    CredentialInspectorSection,
    getNestedMetadataObject,
    isPlainObject,
} from './CredentialDisplayComponents';

export const credentialJWTMetadataKeys = new Set(["jwt"]);
export const credentialJWTIdentityKeys = new Set(["jwt"]);

const jwtSummaryFields = ["credential_format", "token_type", "algorithm", "issuer", "subject", "audience", "expires_at"];
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

const normalizeJWTString = (credentialText) => {
    const tokenString = String(credentialText || "").trim().replace(/^["'`]+|["'`]+$/g, "");
    const fields = tokenString.split(/\s+/);
    if(fields.length === 2 && fields[0].toLowerCase() === "bearer"){
        return fields[1];
    }
    return tokenString;
}

const decodeJWT = (credentialText) => {
    const parts = normalizeJWTString(credentialText).split(".");
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

const prettyJWTJSON = (value) => {
    try{
        return JSON.stringify(value || {}, null, 2);
    }catch(error){
        return "{}";
    }
}

function JWTJSONBlock({title, value}){
    return (
        <div className="mythic-credential-search-jwt-json-block">
            <span>{title}</span>
            <pre>{prettyJWTJSON(value)}</pre>
        </div>
    )
}

export function CredentialJWTDisplay({credential, metadata, identity, validityChips=[]}){
    const decoded = decodeJWT(credential?.credential_text);
    const jwtIdentity = getNestedMetadataObject(identity, "jwt");
    const header = firstPlainObject(jwtIdentity.header, jwtIdentity.headers, decoded.header);
    const claims = firstPlainObject(jwtIdentity.claims, jwtIdentity.payload, jwtIdentity.body, decoded.claims);
    const warningValues = Array.isArray(metadata.parser_warnings) ? metadata.parser_warnings : [];
    const summaryEntries = jwtSummaryEntries(metadata, claims, header);
    const showSummary = summaryEntries.length > 0 || validityChips.length > 0 || warningValues.length > 0;
    const hasJWTIdentity = Object.keys(header).length > 0 || Object.keys(claims).length > 0;

    return (
        <>
            {showSummary &&
                <CredentialInspectorSection title="JWT Metadata">
                    <div className="mythic-credential-search-chip-list mythic-credential-search-section-chips">
                        {summaryEntries.map(([key, value]) => (
                            <MythicChip key={key} size="small" variant="outlined" label={`${key}: ${compactMetadataValue(value)}`} className="mythic-credential-search-mini-chip" />
                        ))}
                        {validityChips.map((chip) => (
                            <MythicChip key={chip.label} size="small" color={chip.color} variant="outlined" label={chip.label} className="mythic-credential-search-mini-chip" />
                        ))}
                    </div>
                    {warningValues.length > 0 &&
                        <div className="mythic-credential-search-warning-list">
                            {warningValues.map((warning, index) => (
                                <MythicChip key={`warning-${index}`} size="small" color="warning" variant="outlined" label={compactMetadataValue(warning)} className="mythic-credential-search-warning-chip" />
                            ))}
                        </div>
                    }
                </CredentialInspectorSection>
            }
            {hasJWTIdentity &&
                <CredentialInspectorSection title="JWT Identity">
                    <JWTJSONBlock title="Header" value={header} />
                    <JWTJSONBlock title="Claims" value={claims} />
                </CredentialInspectorSection>
            }
        </>
    )
}
