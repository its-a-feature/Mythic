import React from 'react';
import Chip from '@mui/material/Chip';
import {alpha, useTheme} from '@mui/material/styles';
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
    success: {palette: "success", icon: <CheckCircleOutlineIcon />, label: "Success"},
    error: {palette: "error", icon: <ErrorOutlineIcon />, label: "Error"},
    warning: {palette: "warning", icon: <WarningAmberIcon />, label: "Warning"},
    info: {palette: "info", icon: <InfoOutlinedIcon />, label: "Info"},
    active: {palette: "success", icon: <RadioButtonCheckedIcon />, label: "Active"},
    inactive: {palette: "error", icon: <RadioButtonUncheckedIcon />, label: "Inactive"},
    deleted: {palette: "error", icon: <DeleteOutlineIcon />, label: "Deleted"},
    locked: {palette: "warning", icon: <LockOutlinedIcon />, label: "Locked"},
    building: {palette: "info", icon: <TimelapseIcon />, label: "Building"},
    completed: {palette: "success", icon: <DoneAllIcon />, label: "Completed"},
    blocked: {palette: "error", icon: <BlockIcon />, label: "Blocked"},
    skipped: {palette: "secondary", icon: <HideSourceIcon />, label: "Skipped"},
    neutral: {palette: "secondary", icon: <InfoOutlinedIcon />, label: "Status"},
};

export function getMythicStatusConfig(status) {
    return statusConfig[status] || statusConfig.neutral;
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

export function MythicStatusChip({
    label,
    status = "neutral",
    icon,
    showIcon = true,
    size = "small",
    variant = "soft",
    sx = {},
    ...props
}) {
    const theme = useTheme();
    const config = getMythicStatusConfig(status);
    const paletteColor = theme.palette[config.palette]?.main || theme.palette.text.secondary;
    const textColor = theme.palette.mode === "dark" ? theme.palette.text.primary : paletteColor;
    const backgroundColor = variant === "outlined" ? "transparent" : alpha(paletteColor, theme.palette.mode === "dark" ? 0.18 : 0.11);
    const borderColor = alpha(paletteColor, theme.palette.mode === "dark" ? 0.55 : 0.35);
    const chipIcon = showIcon ? (icon || config.icon) : undefined;

    return (
        <Chip
            label={label || config.label}
            icon={chipIcon}
            size={size}
            variant="outlined"
            sx={{
                backgroundColor,
                borderColor,
                borderRadius: "5px",
                color: textColor,
                fontSize: "0.72rem",
                fontWeight: 700,
                height: size === "small" ? 24 : 28,
                letterSpacing: 0,
                maxWidth: "100%",
                textDecoration: "none",
                textTransform: "none",
                "& .MuiChip-label": {
                    overflow: "hidden",
                    px: chipIcon ? 0.75 : 1,
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                },
                "& .MuiChip-icon": {
                    color: paletteColor,
                    fontSize: size === "small" ? "0.95rem" : "1.05rem",
                    marginLeft: "6px",
                    marginRight: "-2px",
                },
                "&.MuiChip-clickable:hover": {
                    backgroundColor: alpha(paletteColor, theme.palette.mode === "dark" ? 0.28 : 0.18),
                    borderColor: paletteColor,
                },
                ...sx,
            }}
            {...props}
        />
    );
}
