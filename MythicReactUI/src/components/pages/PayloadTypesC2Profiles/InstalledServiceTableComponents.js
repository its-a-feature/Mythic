import React from 'react';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import TableRow from '@mui/material/TableRow';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import {MythicStatusChip} from "../../MythicComponents/MythicStatusChip";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";

const normalizeValueList = (value) => {
    if(Array.isArray(value)){
        return value.filter((entry) => entry !== undefined && entry !== null && `${entry}`.length > 0);
    }
    if(value === undefined || value === null || value === ""){return []}
    return [`${value}`];
};

const hasValue = (value) => normalizeValueList(value).length > 0;

export const getInstalledServiceListTitle = (value) => normalizeValueList(value).join(", ");

export function InstalledServiceIdentity({name, typeLabel, status, deleted}) {
    return (
        <div className="mythic-installed-service-identity">
            <div className="mythic-installed-service-name-row">
                <span className="mythic-installed-service-name">{name}</span>
                {typeLabel &&
                    <MythicStatusChip label={typeLabel} status={deleted ? "deleted" : "neutral"} showIcon={deleted} />
                }
            </div>
            {status}
        </div>
    );
}

export function InstalledServiceListValue({value, limit = 4}) {
    const values = normalizeValueList(value);
    if(values.length === 0){
        return <span className="mythic-installed-service-empty-value">Not set</span>;
    }
    const visibleValues = values.slice(0, limit);
    const hiddenCount = values.length - visibleValues.length;
    return (
        <span className="mythic-installed-service-chip-list" title={getInstalledServiceListTitle(values)}>
            {visibleValues.map((entry, index) => (
                <span className="mythic-installed-service-chip" key={`${entry}-${index}`}>{entry}</span>
            ))}
            {hiddenCount > 0 &&
                <span className="mythic-installed-service-chip mythic-installed-service-chip-more">+{hiddenCount}</span>
            }
        </span>
    );
}

export function InstalledServiceMetadataSummary({items = [], description}) {
    const visibleItems = items.filter((item) => hasValue(item.value) || item.render);
    const renderValue = (item) => {
        if(item.render){
            return (
                <span className="mythic-installed-service-metadata-custom-value">
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
            <span className={item.code ? "mythic-installed-service-metadata-code" : "mythic-installed-service-metadata-value"} title={`${item.value}`}>
                {`${item.value}`}
            </span>
        );
    };
    return (
        <div className="mythic-installed-service-metadata-summary">
            {visibleItems.length > 0 &&
                <div className="mythic-installed-service-metadata-grid">
                    {visibleItems.map((item) => (
                        <div className="mythic-installed-service-metadata-item" key={item.label}>
                            <span className="mythic-installed-service-metadata-label">{item.label}</span>
                            {renderValue(item)}
                        </div>
                    ))}
                </div>
            }
            {description &&
                <div className="mythic-installed-service-description" title={description}>
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
            <IconButton
                aria-label={open ? `hide ${label}` : `show ${label}`}
                aria-expanded={open}
                className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                onClick={onClick}
                size="small"
            >
                {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
        </MythicStyledTooltip>
    );
}

export function InstalledServiceDetailRow({open, colSpan, children}) {
    return (
        <TableRow className="mythic-installed-service-detail-row">
            <MythicTableCell className="mythic-installed-service-detail-cell" colSpan={colSpan}>
                <Collapse in={open} timeout="auto" unmountOnExit>
                    <div className="mythic-installed-service-detail-panel">
                        {children}
                    </div>
                </Collapse>
            </MythicTableCell>
        </TableRow>
    );
}

export function InstalledServiceDetailSection({title, count, children}) {
    return (
        <div className="mythic-installed-service-detail-section">
            <div className="mythic-installed-service-detail-section-header">
                <span>{title}</span>
                {count !== undefined &&
                    <MythicStatusChip label={`${count}`} status={count > 0 ? "info" : "neutral"} showIcon={false} />
                }
            </div>
            <div className="mythic-installed-service-detail-section-body">
                {children}
            </div>
        </div>
    );
}

export function InstalledServiceDetailList({items = []}) {
    const visibleItems = items.filter((item) => hasValue(item.value));
    if(visibleItems.length === 0){
        return <div className="mythic-installed-service-empty-value">No additional details.</div>;
    }
    return (
        <div className="mythic-installed-service-detail-list">
            {visibleItems.map((item) => (
                <div className="mythic-installed-service-detail-list-item" key={item.label}>
                    <span className="mythic-installed-service-detail-label">{item.label}</span>
                    {Array.isArray(item.value) ?
                        <InstalledServiceListValue value={item.value} limit={item.limit || 12} /> :
                        <span className={item.code ? "mythic-installed-service-metadata-code" : "mythic-installed-service-detail-value"}>{`${item.value}`}</span>
                    }
                </div>
            ))}
        </div>
    );
}

export function InstalledServiceDefinitionList({items = [], emptyText = "No entries."}) {
    if(items.length === 0){
        return <div className="mythic-installed-service-empty-value">{emptyText}</div>;
    }
    return (
        <div className="mythic-installed-service-definition-list">
            {items.map((item, index) => (
                <div className="mythic-installed-service-definition-row" key={`${item.title || item.label || "item"}-${index}`}>
                    <div className="mythic-installed-service-definition-main">
                        <span className="mythic-installed-service-definition-title">{item.title || item.label}</span>
                        {item.subtitle &&
                            <span className="mythic-installed-service-definition-subtitle">{item.subtitle}</span>
                        }
                        {item.description &&
                            <span className="mythic-installed-service-definition-description">{item.description}</span>
                        }
                    </div>
                    {item.action &&
                        <div className="mythic-installed-service-definition-action">{item.action}</div>
                    }
                </div>
            ))}
        </div>
    );
}
