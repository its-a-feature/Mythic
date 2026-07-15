import React from 'react';
import Chip from '@mui/material/Chip';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import BlockIcon from '@mui/icons-material/Block';
import HideSourceIcon from '@mui/icons-material/HideSource';

const statusConfig = {
    success: {tone: "success", icon: <CheckCircleOutlineIcon />, label: "Success"},
    error: {tone: "error", icon: <ErrorOutlineIcon />, label: "Error"},
    warning: {tone: "warning", icon: <WarningAmberIcon />, label: "Warning"},
    info: {tone: "info", icon: <InfoOutlinedIcon />, label: "Info"},
    active: {tone: "success", icon: <RadioButtonCheckedIcon />, label: "Active"},
    inactive: {tone: "error", icon: <RadioButtonUncheckedIcon />, label: "Inactive"},
    deleted: {tone: "error", icon: <DeleteOutlineIcon />, label: "Deleted"},
    locked: {tone: "warning", icon: <LockOutlinedIcon />, label: "Locked"},
    building: {tone: "info", icon: <TimelapseIcon />, label: "Building"},
    completed: {tone: "success", icon: <DoneAllIcon />, label: "Completed"},
    blocked: {tone: "error", icon: <BlockIcon />, label: "Blocked"},
    skipped: {tone: "secondary", icon: <HideSourceIcon />, label: "Skipped"},
    secondary: {tone: "secondary", icon: <InfoOutlinedIcon />, label: "Status"},
};

export function getMythicStatusConfig(status) {
    return statusConfig[status] || statusConfig.secondary;
}

export function getMythicStatusFromTaskStatus(status) {
    const normalized = `${status || ""}`.toLowerCase();
    if(normalized.includes("error") || normalized.includes("failed")){
        return "error";
    }
    if(normalized.includes("warning")){
        return "warning";
    }
    if(normalized.includes("success") || normalized.includes("completed")){
        return "success";
    }
    if(normalized.includes("processing") || normalized.includes("building")){
        return "warning";
    }
    return "info";
}

export function MythicStatusChip({
    label,
    status = "secondary",
    className = "",
    icon,
    showIcon = true,
    size = "small",
    variant = "soft",
    sx = {},
    ...props
}) {
    const config = getMythicStatusConfig(status);
    const chipIcon = showIcon ? (icon || config.icon) : undefined;

    return (
        <Chip
            className={`mythic-status-chip mythic-tone-${config.tone}${variant === "outlined" ? " mythic-status-chip-outlined" : ""}${className ? ` ${className}` : ""}`}
            label={label || config.label}
            icon={chipIcon}
            size={size}
            variant="outlined"
            sx={sx}
            {...props}
        />
    );
}
