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
        <Box className={`mythic-table-toolbar ${variant ? `mythic-table-toolbar-${variant}` : ""} ${className}`.trim()} style={style}>
            {children}
        </Box>
    );
};

export const MythicTableToolbarGroup = ({children, grow = false, label, className = "", style = {}}) => {
    return (
        <Box className={`mythic-table-toolbar-group ${grow ? "mythic-table-toolbar-group-grow" : ""} ${className}`.trim()} style={style}>
            {label &&
                <span className="mythic-table-toolbar-group-label">{label}</span>
            }
            {children}
        </Box>
    );
};

export const MythicToolbarSelect = ({children, className = "", style = {}, ...props}) => {
    return (
        <Select
            className={`mythic-toolbar-select ${className}`.trim()}
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
                        <MythicActionButton appearance="raised" compact disabled={disabled} icon={<SearchIcon />} iconOnly onClick={onSearch} tone="primary" tooltip="Search" />
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
            className={`mythic-toolbar-toggle ${className}`.trim()}
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
