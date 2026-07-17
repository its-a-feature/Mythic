import React from 'react';
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
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import {MythicChip} from './MythicChip';
import {MythicStyledTooltip} from './MythicStyledTooltip';

const statusConfig = {
    success: {tone: "success", icon: <CheckCircleOutlineIcon />, label: "Success", tooltip: "Completed successfully"},
    error: {tone: "error", icon: <ErrorOutlineIcon />, label: "Error", tooltip: "Errored"},
    warning: {tone: "warning", icon: <WarningAmberIcon />, label: "Warning"},
    info: {tone: "info", icon: <InfoOutlinedIcon />, label: "Info"},
    active: {tone: "success", icon: <RadioButtonCheckedIcon />, label: "Active"},
    inactive: {tone: "error", icon: <RadioButtonUncheckedIcon />, label: "Inactive"},
    disabled: {tone: "warning", icon: <RadioButtonUncheckedIcon />, label: "Disabled"},
    deleted: {tone: "error", icon: <DeleteOutlineIcon />, label: "Deleted"},
    locked: {tone: "warning", icon: <LockOutlinedIcon />, label: "Locked"},
    building: {tone: "warning", icon: <TimelapseIcon />, label: "Building"},
    completed: {tone: "success", icon: <DoneAllIcon />, label: "Completed"},
    blocked: {tone: "error", icon: <BlockIcon />, label: "Blocked"},
    skipped: {tone: "secondary", icon: <HideSourceIcon />, label: "Skipped"},
    running: {tone: "info", icon: <TimelapseIcon />, label: "Running"},
    cancelled: {tone: "warning", icon: <HideSourceIcon />, label: "Cancelled"},
    queued: {tone: "secondary", icon: <PanoramaFishEyeIcon />, label: "Queued", tooltip: "Waiting to run"},
    awaiting_approval: {tone: "warning", icon: <TimelapseIcon />, label: "Awaiting approval"},
    input_needed: {tone: "warning", icon: <InfoOutlinedIcon />, label: "Input needed"},
    configured: {tone: "secondary", icon: <PanoramaFishEyeIcon />, label: "Configured"},
    waiting: {tone: "secondary", icon: <PanoramaFishEyeIcon />, label: "Waiting"},
    runnable: {tone: "success", icon: <RadioButtonCheckedIcon />, label: "Runnable"},
    needs_approval: {tone: "warning", icon: <TimelapseIcon />, label: "Needs approval"},
    stopped: {tone: "warning", icon: <RadioButtonUncheckedIcon />, label: "Stopped"},
    available: {tone: "success", icon: <RadioButtonCheckedIcon />, label: "Available"},
    hidden: {tone: "warning", icon: <HideSourceIcon />, label: "Hidden"},
    updating: {tone: "warning", icon: <TimelapseIcon />, label: "Updating"},
    alerting: {tone: "warning", icon: <NotificationsActiveOutlinedIcon />, label: "Alerting"},
    dead: {tone: "warning", icon: <WarningAmberIcon />, label: "Likely dead"},
    unknown: {tone: "error", icon: <ErrorOutlineIcon />, label: "Unknown"},
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
        return "building";
    }
    return "info";
}

export function MythicStatusIcon({
    className = "",
    status = "secondary",
    tooltip = false,
    tooltipStyle = {},
    tooltipTitle,
    ...props
}) {
    const config = getMythicStatusConfig(status);
    const icon = React.cloneElement(config.icon, {
        ...props,
        className: `mythic-icon-tone mythic-tone-${config.tone}${className ? ` ${className}` : ""}`,
    });

    return tooltip ? (
        <MythicStyledTooltip
            title={tooltipTitle || config.tooltip || config.label}
            tooltipStyle={{display: "inline-flex", ...tooltipStyle}}
        >
            {icon}
        </MythicStyledTooltip>
    ) : icon;
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
        <MythicChip
            className={className}
            label={label || config.label}
            icon={chipIcon}
            size={size}
            tone={config.tone}
            variant={variant}
            sx={sx}
            {...props}
        />
    );
}
