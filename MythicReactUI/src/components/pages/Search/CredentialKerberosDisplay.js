import React from 'react';
import {MythicChip} from '../../MythicComponents/MythicChip';
import {
    compactMetadataValue,
    CredentialInspectorSection,
    getNestedMetadataObject,
} from './CredentialDisplayComponents';

export const credentialKerberosMetadataKeys = new Set(["kerberos"]);
export const credentialKerberosIdentityKeys = new Set(["kerberos"]);

const ticketLifecycleChip = (field, validity) => {
    if(field === "start_time" && validity.not_yet_valid){
        return {label: "not yet valid", color: "warning"};
    }
    if(field === "end_time" && validity.expired){
        return {label: "expired", color: "error"};
    }
    if(field === "renew_until" && validity.renew_expired){
        return {label: "renew expired", color: "warning"};
    }
    return null;
}

const hasValue = (value) => value !== undefined && value !== null && value !== "";

const ticketLifecycleFields = [
    {label: "Auth", key: "auth_time"},
    {label: "Start", key: "start_time"},
    {label: "End", key: "end_time"},
    {label: "Renew", key: "renew_until"},
];

const ticketCryptoFields = [
    {label: "Key Type", key: "key_type"},
    {label: "Flags", key: "flags"},
];

const kerberosSummaryEntries = (metadata) => {
    const kerberosMetadata = getNestedMetadataObject(metadata, "kerberos");
    const entries = [];
    if(metadata.parser){
        entries.push(["parser", metadata.parser]);
    }
    Object.entries(kerberosMetadata).forEach(([key, value]) => {
        if(value !== undefined && value !== null){
            entries.push([key, value]);
        }
    });
    return entries;
}

function KerberosPrincipal({label, principal, realm, service=false}){
    if(!hasValue(principal) && !hasValue(realm)){
        return null;
    }
    return (
        <div className={`mythic-credential-search-kerberos-principal gap-2 rounded grid bg-neutral-1 border-subtle${service ? " mythic-credential-search-kerberos-principal-service" : ""} min-w-0`}>
            <span>{label}</span>
            {hasValue(principal) &&
                <strong>{principal}</strong>
            }
            {hasValue(realm) &&
                <MythicChip compact variant="outlined" label={realm} className="max-w-full" />
            }
        </div>
    )
}

function KerberosLifecycle({ticket, validity, highlightLifecycle}){
    const visibleFields = ticketLifecycleFields.filter((field) => hasValue(ticket[field.key]));
    if(visibleFields.length === 0){
        return null;
    }
    return (
        <div className="mythic-credential-search-kerberos-lifecycle gap-3 min-w-0 grid border-t-subtle">
            {visibleFields.map((field) => {
                const chip = highlightLifecycle ? ticketLifecycleChip(field.key, validity) : null;
                return (
                    <div key={field.key} className="mythic-credential-search-kerberos-lifecycle-item gap-1 min-w-0 grid">
                        <span>{field.label}</span>
                        <strong title={ticket[field.key]}>{ticket[field.key]}</strong>
                        {chip &&
                            <MythicChip compact color={chip.color} variant="outlined" label={chip.label} className="max-w-full" />
                        }
                    </div>
                )
            })}
        </div>
    )
}

function KerberosCryptoDetails({ticket}){
    const visibleCryptoFields = ticketCryptoFields.filter((field) => hasValue(ticket[field.key]));
    const hasKey = hasValue(ticket.key);
    if(visibleCryptoFields.length === 0 && !hasKey){
        return null;
    }
    return (
        <div className="mythic-credential-search-kerberos-technical items-center flex flex-wrap gap-3 min-w-0 border-t-subtle">
            {visibleCryptoFields.map((field) => (
                <div key={field.key} className="mythic-credential-search-kerberos-technical-item items-center gap-2 min-w-0 rounded bg-neutral-1 border-subtle">
                    <span>{field.label}</span>
                    <strong title={ticket[field.key]}>{ticket[field.key]}</strong>
                </div>
            ))}
            {hasKey &&
                <div className="mythic-credential-search-kerberos-key items-center gap-2 min-w-0 rounded bg-neutral-1 border-subtle">
                    <span>Key</span>
                    <strong title={ticket.key}>{ticket.key}</strong>
                </div>
            }
        </div>
    )
}

function KerberosTicket({ticket, index, validity}){
    const hasClient = hasValue(ticket.client_principal) || hasValue(ticket.client_realm);
    const hasService = hasValue(ticket.service_principal) || hasValue(ticket.service_realm);
    const ticketTitle = ticket.service_principal || ticket.service_realm || ticket.client_principal || `Ticket ${index + 1}`;
    return (
        <div className="mythic-credential-search-kerberos-ticket grid-col-full gap-4 min-w-0 rounded grid border mythic-tone-primary border-tone-2">
            <div className="mythic-credential-search-kerberos-ticket-header items-start flex gap-4 justify-between min-w-0">
                <div>
                    <span>Ticket {index + 1}</span>
                    <strong title={ticketTitle}>{ticketTitle}</strong>
                </div>
            </div>
            {(hasClient || hasService) &&
                <div className={`mythic-credential-search-kerberos-route items-stretch gap-3 grid${!hasClient || !hasService ? " mythic-credential-search-kerberos-route-single" : ""} min-w-0`}>
                    {hasClient &&
                        <KerberosPrincipal label="Client" principal={ticket.client_principal} realm={ticket.client_realm} />
                    }
                    {hasClient && hasService &&
                        <div className="mythic-credential-search-kerberos-route-join text-2xs font-850 text-muted">to</div>
                    }
                    {hasService &&
                        <KerberosPrincipal label="Service" principal={ticket.service_principal} realm={ticket.service_realm} service />
                    }
                </div>
            }
            <KerberosLifecycle ticket={ticket} validity={validity} highlightLifecycle={index === 0} />
            <KerberosCryptoDetails ticket={ticket} />
        </div>
    )
}

export function CredentialKerberosDisplay({metadata, identity, validity={}, validityChips=[]}){
    const kerberosIdentity = getNestedMetadataObject(identity, "kerberos");
    const tickets = Array.isArray(kerberosIdentity?.tickets) ? kerberosIdentity.tickets : [];
    const warningValues = Array.isArray(metadata.parser_warnings) ? metadata.parser_warnings : [];
    const summaryEntries = kerberosSummaryEntries(metadata);
    const showSummary = summaryEntries.length > 0 || validityChips.length > 0 || warningValues.length > 0;

    return (
        <>
            {showSummary &&
                <CredentialInspectorSection title="Kerberos Metadata" >
                    <div className="mythic-credential-search-chip-list items-center flex gap-2 flex-wrap mythic-credential-search-section-chips grid-col-full min-w-0">
                        {summaryEntries.map(([key, value]) => (
                            <MythicChip compact key={key} variant="outlined" label={`${key}: ${compactMetadataValue(value)}`} className="max-w-full" />
                        ))}
                        {validityChips.map((chip) => (
                            <MythicChip compact key={chip.label} color={chip.color} variant="outlined" label={chip.label} className="max-w-full" />
                        ))}
                    </div>
                    {warningValues.length > 0 &&
                        <div className="mythic-credential-search-warning-list grid-col-full flex flex-wrap gap-2 min-w-0">
                            {warningValues.map((warning, index) => (
                                <MythicChip compact key={`warning-${index}`} color="warning" variant="outlined" label={compactMetadataValue(warning)} className="max-w-full" />
                            ))}
                        </div>
                    }
                </CredentialInspectorSection>
            }
            {tickets.length > 0 &&
                <CredentialInspectorSection title={`Kerberos Tickets (${tickets.length})`}>
                    {tickets.map((ticket, index) => (
                        <KerberosTicket key={`kerberos-ticket-${index}`} ticket={ticket} index={index} validity={validity} />
                    ))}
                </CredentialInspectorSection>
            }
        </>
    )
}
