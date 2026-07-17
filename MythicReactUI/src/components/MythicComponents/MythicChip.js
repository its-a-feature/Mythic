import React from 'react';
import Chip from '@mui/material/Chip';

const supportedTones = new Set([
    "primary",
    "secondary",
    "neutral",
    "info",
    "success",
    "warning",
    "error",
]);

export const normalizeMythicChipTone = (tone) => supportedTones.has(tone) ? tone : "secondary";

const ChipPrimitive = React.forwardRef(function ChipPrimitive({
    className = "",
    color = "default",
    compact = false,
    customColor = false,
    iconOnly = false,
    muted = false,
    shape,
    size = "small",
    tone,
    variant = "soft",
    ...props
}, ref) {
    const resolvedTone = normalizeMythicChipTone(tone || (color !== "default" ? color : "secondary"));
    const muiVariant = variant === "soft" ? "outlined" : variant;
    const shapeClass = shape === "square" ? "mythic-square-chip" : "mythic-chip";

    return (
        <Chip
            ref={ref}
            className={`mythic-chip-base ${shapeClass}${customColor ? " mythic-chip-custom-color" : ` mythic-tone-${resolvedTone}`}${compact ? " mythic-chip-compact" : ""}${muted ? " mythic-chip-muted" : ""}${iconOnly ? " mythic-chip-icon-only" : ""}${variant === "outlined" ? " mythic-chip-outlined" : ""}${className ? ` ${className}` : ""}`}
            color={color}
            size={size}
            variant={muiVariant}
            {...props}
        />
    );
});

export const MythicChip = React.forwardRef(function MythicChip(props, ref) {
    return <ChipPrimitive ref={ref} shape="pill" {...props} />;
});

export const SquareChip = React.forwardRef(function SquareChip(props, ref) {
    return <ChipPrimitive ref={ref} shape="square" {...props} />;
});
