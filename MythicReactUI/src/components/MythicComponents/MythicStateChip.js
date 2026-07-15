import React from 'react';
import Box from '@mui/material/Box';

export function MythicStateChip({children, className = "", compact = false, label, state = "secondary", ...props}) {
    const chipLabel = label ?? children;
    const tone = state === "active" || state === "enabled" ? "success" :
        state === "inactive" || state === "disabled" ? "warning" :
            state === "neutral" ? "secondary" : state;
    return (
        <Box
            component="span"
            className={`mythic-status-chip mythic-tone-${tone}${compact ? " mythic-status-chip-compact" : ""}${className ? ` ${className}` : ""}`}
            {...props}
        >
            {chipLabel}
        </Box>
    );
}
