import React from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import {normalizeMythicChipTone} from './MythicChip';
import {MythicStyledTooltip} from './MythicStyledTooltip';

export const MythicActionButton = React.forwardRef(function MythicActionButton({
    active = false,
    appearance, // can be plain or raised
    autoWidth = false,
    children,
    colorMode = "hover", // can be always or hover
    compact = false,
    icon,
    iconOnly = false,
    label,
    muted = false,
    rotated = false,
    selected = false,
    shape, // can be square or round
    size = "small",
    startIcon,
    tone = "neutral",
    tooltip,
    tooltipStyle = {},
    variant = "outlined",
    ...props
}, ref) {
    const resolvedTone = normalizeMythicChipTone(tone);
    const resolvedAppearance = appearance || (iconOnly ? "plain" : "raised");
    const resolvedShape = shape || (resolvedAppearance === "raised" ? "square" : "round");
    const resolvedColorMode = colorMode === "always" ? "always" : "hover";
    const shapeClass = iconOnly ? "mythic-action-button-icon" : "mythic-action-button-label";
    const resolvedClassName = [
        "mythic-action-button",
        `mythic-action-button-${resolvedAppearance}`,
        shapeClass,
        `mythic-action-button-shape-${resolvedShape}`,
        `mythic-action-button-color-${resolvedColorMode}`,
        `mythic-tone-${resolvedTone}`,
        active || selected ? "mythic-action-button-active" : "",
        autoWidth ? "mythic-action-button-auto-width" : "",
        compact ? "mythic-action-button-compact" : "",
        muted ? "mythic-action-button-muted" : "",
        rotated ? "mythic-action-button-rotated" : "",
    ].filter(Boolean).join(" ");
    const ariaLabel = props["aria-label"] || tooltip || (typeof label === "string" ? label : undefined);
    const content = label ?? children;
    const button = iconOnly ? (
        <IconButton
            ref={ref}
            aria-label={ariaLabel}
            size={size}
            {...props}
            className={resolvedClassName}
            color="inherit"
        >
            {icon || children}
        </IconButton>
    ) : (
        <Button
            ref={ref}
            aria-label={ariaLabel}
            size={size}
            startIcon={icon || startIcon}
            variant={variant}
            {...props}
            className={resolvedClassName}
            color="inherit"
        >
            {content}
        </Button>
    );

    return tooltip ? (
        <MythicStyledTooltip title={tooltip} tooltipStyle={{display: "inline-flex", ...tooltipStyle}}>
            {button}
        </MythicStyledTooltip>
    ) : button;
});
