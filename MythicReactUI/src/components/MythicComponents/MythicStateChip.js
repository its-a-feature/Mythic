import React from 'react';
import Box from '@mui/material/Box';

export function MythicStateChip({children, className = "", compact = false, label, state = "neutral", ...props}) {
    const chipLabel = label ?? children;
    return (
        <Box
            component="span"
            className={`mythic-state-chip mythic-state-chip-${state}${compact ? " mythic-state-chip-compact" : ""}${className ? ` ${className}` : ""}`}
            {...props}
        >
            {chipLabel}
        </Box>
    );
}
