import {MythicActionButton} from "../../MythicComponents/MythicActionButton";
import React from 'react';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import {MythicStatusChip} from "../../MythicComponents/MythicStatusChip";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicChip} from "../../MythicComponents/MythicChip";

const normalizeValueList = (value) => {
    if(Array.isArray(value)){
        return value.filter((entry) => entry !== undefined && entry !== null && `${entry}`.length > 0);
    }
    if(value === undefined || value === null || value === ""){return []}
    return [`${value}`];
};

const hasValue = (value) => normalizeValueList(value).length > 0;

export const getInstalledServiceListTitle = (value) => normalizeValueList(value).join(", ");

export function InstalledServiceIdentity({name, typeLabel, status}) {
    return (
        <div className="mythic-installed-service-identity items-start flex flex-column gap-3 min-w-0">
            <div className="mythic-installed-service-name-row items-center flex flex-wrap gap-3 min-w-0">
                <span className="mythic-installed-service-name font-850 leading-125 wrap-anywhere text-primary">{name}</span>
                {typeLabel &&
                    <MythicStatusChip label={typeLabel} status={"secondary"} showIcon={false} />
                }
            </div>
            {status}
        </div>
    );
}

export function InstalledServiceListValue({value, limit = 4}) {
    const values = normalizeValueList(value);
    if(values.length === 0){
        return <span className="mythic-installed-service-empty-value text-muted text-xs font-650">Not set</span>;
    }
    return (
        <span className=" items-center flex gap-2 flex-wrap min-w-0" title={getInstalledServiceListTitle(values)}>
            {values.map((entry, index) => (
                <MythicChip compact key={`${entry}-${index}`} label={entry} />
            ))}
        </span>
    );
}

export function InstalledServiceMetadataSummary({items = [], description}) {
    const visibleItems = items.filter((item) => hasValue(item.value) || item.render);
    const renderValue = (item) => {
        if(item.render){
            return (
                <span className="mythic-installed-service-metadata-custom-value min-w-0">
                    {item.render}
                </span>
            );
        }
        if(item.chip){
            return <InstalledServiceListValue value={[item.value]} limit={1} />;
        }
        if(Array.isArray(item.value)){
            return <InstalledServiceListValue value={item.value} limit={item.limit} />;
        }
        return (
            <span className={item.code ? "mythic-installed-service-metadata-code max-w-full rounded bg-neutral-1 border-subtle text-primary font-mono whitespace-nowrap" : "mythic-installed-service-metadata-value text-xs leading-125 min-w-0 w-full whitespace-nowrap"} title={`${item.value}`}>
                {`${item.value}`}
            </span>
        );
    };
    return (
        <div className="mythic-column-stack flex flex-column gap-4 min-w-0">
            {visibleItems.length > 0 &&
                <div className="mythic-installed-service-metadata-grid min-w-0 grid">
                    {visibleItems.map((item) => (
                        <div className="mythic-installed-service-metadata-item" key={item.label}>
                            <span className="mythic-installed-service-metadata-label text-2xs font-750 leading-120 truncate text-muted whitespace-nowrap">{item.label}</span>
                            {renderValue(item)}
                        </div>
                    ))}
                </div>
            }
            {description &&
                <div className="mythic-installed-service-description min-w-0 text-muted" title={description}>
                    <span>Description</span>
                    <p>{description}</p>
                </div>
            }
        </div>
    );
}

export function InstalledServiceDetailToggle({open, onClick, label = "details"}) {
    return (
        <MythicStyledTooltip title={open ? `Hide ${label}` : `Show ${label}`}>
            <MythicActionButton iconOnly
                aria-label={open ? `hide ${label}` : `show ${label}`}
                aria-expanded={open}
                appearance="raised" colorMode="hover" tone="info"
                onClick={onClick}
                size="small"
            >
                {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </MythicActionButton>
        </MythicStyledTooltip>
    );
}

export function InstalledServiceDetailRow({open, colSpan, children}) {
    return (
        <TableRow className="mythic-installed-service-detail-row">
            <MythicTableCell className="mythic-installed-service-detail-cell" colSpan={colSpan}>
                <Collapse in={open} timeout="auto" unmountOnExit>
                    <div className="mythic-installed-service-detail-panel gap-6 grid bg-neutral-1 border-t-subtle">
                        {children}
                    </div>
                </Collapse>
            </MythicTableCell>
        </TableRow>
    );
}

export function InstalledServiceDetailSection({title, count, children}) {
    return (
        <div className="mythic-installed-service-detail-section bg-surface border-subtle min-w-0 overflow-hidden rounded">
            <div className="mythic-installed-service-detail-section-header bg-header text-header text-xs font-850 items-center flex justify-between border-b-subtle">
                <span>{title}</span>
                {count !== undefined &&
                    <MythicStatusChip label={`${count}`} status={count > 0 ? "info" : "secondary"} showIcon={false} />
                }
            </div>
            <div className="mythic-installed-service-detail-section-body p-5">
                {children}
            </div>
        </div>
    );
}

export function InstalledServiceDetailList({items = []}) {
    const visibleItems = items.filter((item) => hasValue(item.value));
    if(visibleItems.length === 0){
        return <div className="mythic-installed-service-empty-value text-muted text-xs font-650">No additional details.</div>;
    }
    return (
        <div className="mythic-installed-service-detail-list grid">
            {visibleItems.map((item) => (
                <div className="mythic-installed-service-detail-list-item flex flex-column gap-2 min-w-0" key={item.label}>
                    <span className="mythic-installed-service-detail-label">{item.label}</span>
                    {Array.isArray(item.value) ?
                        <InstalledServiceListValue value={item.value} limit={item.limit || 12} /> :
                        <span className={item.code ? "mythic-installed-service-metadata-code max-w-full truncate rounded bg-neutral-1 border-subtle text-primary font-mono whitespace-nowrap" : "mythic-installed-service-detail-value text-xs leading-125 min-w-0 truncate w-full whitespace-nowrap"}>{`${item.value}`}</span>
                    }
                </div>
            ))}
        </div>
    );
}

export function InstalledServiceDefinitionList({items = [], emptyText = "No entries."}) {
    if(items.length === 0){
        return <div className="mythic-installed-service-empty-value text-muted text-xs font-650">{emptyText}</div>;
    }
    return (
        <div className="mythic-installed-service-definition-list flex flex-column gap-4">
            {items.map((item, index) => (
                <div className="mythic-installed-service-definition-row py-4 px-5 items-center flex gap-6 justify-between min-w-0 rounded bg-neutral-1 border-subtle" key={`${item.title || item.label || "item"}-${index}`}>
                    <div className="mythic-installed-service-definition-main flex flex-column gap-1 min-w-0">
                        <span className="mythic-installed-service-definition-title text-sm font-800 leading-125 wrap-anywhere text-primary">{item.title || item.label}</span>
                        {item.subtitle &&
                            <span className="mythic-installed-service-definition-subtitle text-muted text-xs font-650 leading-135 wrap-anywhere">{item.subtitle}</span>
                        }
                        {item.description &&
                            <span className="mythic-installed-service-definition-description text-muted text-xs font-650 leading-135 wrap-anywhere">{item.description}</span>
                        }
                    </div>
                    {item.action &&
                        <div className="mythic-installed-service-definition-action items-center flex flex-none">{item.action}</div>
                    }
                </div>
            ))}
        </div>
    );
}
