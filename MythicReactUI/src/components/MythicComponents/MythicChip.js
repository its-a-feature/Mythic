import React from 'react';
import Chip from '@mui/material/Chip';
import {useTheme} from "@mui/material/styles";

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
    color = undefined,
    compact = false,
    iconOnly = false,
    muted = false,
    shape,
    size = "small",
    tone = undefined,
    variant = "outlined",
    ...props
}, ref) {
    const resolvedTone = normalizeMythicChipTone(tone || (color ? color : "secondary"));
    const muiVariant = variant ? variant : "outlined";
    const hasCustomColor = Boolean(color) && !supportedTones.has(color);
    const resolvedClassName = [
        "mythic-chip-base",
        "text-xs",
        "font-800",
        "items-center",
        "inline-flex",
        "gap-2",
        "max-w-full",
        "min-w-0",
        "truncate",
        "whitespace-nowrap",
        shape === "square" ? "mythic-square-chip" : "mythic-chip",
        hasCustomColor ? "mythic-chip-custom-color" : `mythic-tone-${resolvedTone}`,
        compact ? "mythic-chip-compact text-2xs" : "",
        muted ? "mythic-chip-muted" : "",
        iconOnly ? "mythic-chip-icon-only justify-center" : "",
        variant === "outlined" ? "mythic-chip-outlined" : "",
        className,
    ].filter(Boolean).join(" ");
    return (
        <Chip
            ref={ref}
            className={resolvedClassName}
            //color={color ? color : undefined}
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
