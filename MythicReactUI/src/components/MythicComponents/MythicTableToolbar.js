import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import ToggleButton from '@mui/material/ToggleButton';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import MythicTextField from './MythicTextField';

export const MythicTableToolbar = ({children, className = "", style = {}}) => {
    return (
        <Box className={`mythic-table-toolbar ${className}`.trim()} style={style}>
            {children}
        </Box>
    );
};

export const MythicTableToolbarGroup = ({children, grow = false, className = "", style = {}}) => {
    return (
        <Box className={`mythic-table-toolbar-group ${grow ? "mythic-table-toolbar-group-grow" : ""} ${className}`.trim()} style={style}>
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
                        <Tooltip title="Search">
                            <span>
                                <IconButton
                                    className="mythic-toolbar-icon-button"
                                    disabled={disabled}
                                    onClick={onSearch}
                                    size="small"
                                >
                                    <SearchIcon color="info" fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </React.Fragment>
                ) : endAdornment,
                style: {padding: 0},
                ...inputProps,
            }}
        />
    );
};

export const MythicToolbarButton = ({children, className = "", ...props}) => {
    return (
        <Button className={`mythic-toolbar-button ${className}`.trim()} size="small" {...props}>
            {children}
        </Button>
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
