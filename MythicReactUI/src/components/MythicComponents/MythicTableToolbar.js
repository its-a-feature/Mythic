import React from 'react';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import ToggleButton from '@mui/material/ToggleButton';
import SearchIcon from '@mui/icons-material/Search';
import MythicTextField from './MythicTextField';
import {MythicActionButton} from './MythicActionButton';

export const MythicTableToolbar = ({children, className = "", style = {}, variant}) => {
    return (
        <Box className={`mythic-table-toolbar flex flex-none flex-wrap gap-4 w-full rounded bg-surface-muted border-subtle${variant ? ` mythic-table-toolbar-${variant}` : ""} ${className}`.trim()} style={style}>
            {children}
        </Box>
    );
};

export const MythicTableToolbarGroup = ({children, grow = false, label, className = "", style = {}}) => {
    return (
        <Box className={`mythic-table-toolbar-group items-center flex flex-wrap gap-3 ${grow ? "mythic-table-toolbar-group-grow" : ""} ${className} max-w-full`.trim()} style={style}>
            {label &&
                <span className="mythic-table-toolbar-group-label text-2xs font-800 leading-100 text-muted">{label}</span>
            }
            {children}
        </Box>
    );
};

export const MythicToolbarSelect = ({children, className = "", style = {}, ...props}) => {
    return (
        <Select
            className={`mythic-toolbar-select ${className} w-full`.trim()}
            size="small"
            style={style}
            {...props}
        >
            {children}
        </Select>
    );
};

export const MythicToolbarMenuItem = MenuItem;

export const MythicSearchField = ({
    value,
    onChange,
    onEnter,
    onSearch,
    disabled = false,
    placeholder = "Search...",
    name = "Search",
    showLabel = false,
    autoFocus,
    inputProps = {},
    endAdornment = null,
}) => {
    return (
        <MythicTextField
            disabled={disabled}
            placeholder={placeholder}
            value={value}
            marginTop="0px"
            marginBottom="0px"
            showLabel={showLabel}
            onChange={onChange}
            onEnter={onEnter || onSearch}
            name={name}
            autoFocus={autoFocus}
            InputProps={{
                endAdornment: onSearch ? (
                    <React.Fragment>
                        {endAdornment}
                        <MythicActionButton disabled={disabled} icon={<SearchIcon />} iconOnly onClick={onSearch} tone="primary" tooltip="Search" />
                    </React.Fragment>
                ) : endAdornment,
                style: {padding: 0},
                ...inputProps,
            }}
        />
    );
};

export const MythicToolbarButton = ({children, tone, ...props}) => {
    return (
        <MythicActionButton tone={tone} {...props}>
            {children}
        </MythicActionButton>
    );
};

export const MythicToolbarToggle = ({
    checked,
    onClick,
    label,
    activeLabel,
    inactiveLabel,
    activeIcon,
    inactiveIcon,
    value = "toggle",
    className = "",
    ...props
}) => {
    return (
        <ToggleButton
            className={`mythic-toolbar-toggle border-subtle text-muted gap-3 rounded whitespace-nowrap ${className}`.trim()}
            value={value}
            selected={checked}
            onClick={onClick}
            size="small"
            {...props}
        >
            {checked ? activeIcon : inactiveIcon}
            <span>{checked ? (activeLabel || label) : (inactiveLabel || label)}</span>
        </ToggleButton>
    );
};
