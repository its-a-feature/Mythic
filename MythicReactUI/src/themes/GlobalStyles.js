import React from "react";
import {alpha} from "@mui/material/styles";

export const COLOR_LEVELS = {
    dark: [0.18, 0.36, 0.58],
    light: [0.10, 0.24, 0.42],
};

// Only theme-dependent values belong here. The static stylesheet is imported once.
export const ThemeVariables = ({theme}) => {
    const colorLevels = COLOR_LEVELS[theme.palette.mode];
    return (
        <style data-mythic-theme-variables>{`
:root {
    --mythic-color-primary-base: ${theme.palette.primary.main};
    --mythic-color-primary-level-1: ${alpha(theme.palette.primary.main, colorLevels[0])};
    --mythic-color-primary-level-2: ${alpha(theme.palette.primary.main, colorLevels[1])};
    --mythic-color-primary-level-3: ${alpha(theme.palette.primary.main, colorLevels[2])};
    --mythic-color-secondary-base: ${theme.palette.secondary.main};
    --mythic-color-secondary-level-1: ${alpha(theme.palette.secondary.main, colorLevels[0])};
    --mythic-color-secondary-level-2: ${alpha(theme.palette.secondary.main, colorLevels[1])};
    --mythic-color-secondary-level-3: ${alpha(theme.palette.secondary.main, colorLevels[2])};
    --mythic-color-info-base: ${theme.palette.info.main};
    --mythic-color-info-level-1: ${alpha(theme.palette.info.main, colorLevels[0])};
    --mythic-color-info-level-2: ${alpha(theme.palette.info.main, colorLevels[1])};
    --mythic-color-info-level-3: ${alpha(theme.palette.info.main, colorLevels[2])};
    --mythic-color-success-base: ${theme.palette.success.main};
    --mythic-color-success-level-1: ${alpha(theme.palette.success.main, colorLevels[0])};
    --mythic-color-success-level-2: ${alpha(theme.palette.success.main, colorLevels[1])};
    --mythic-color-success-level-3: ${alpha(theme.palette.success.main, colorLevels[2])};
    --mythic-color-warning-base: ${theme.palette.warning.main};
    --mythic-color-warning-level-1: ${alpha(theme.palette.warning.main, colorLevels[0])};
    --mythic-color-warning-level-2: ${alpha(theme.palette.warning.main, colorLevels[1])};
    --mythic-color-warning-level-3: ${alpha(theme.palette.warning.main, colorLevels[2])};
    --mythic-color-error-base: ${theme.palette.error.main};
    --mythic-color-error-level-1: ${alpha(theme.palette.error.main, colorLevels[0])};
    --mythic-color-error-level-2: ${alpha(theme.palette.error.main, colorLevels[1])};
    --mythic-color-error-level-3: ${alpha(theme.palette.error.main, colorLevels[2])};
    --mythic-color-on-primary: ${theme.palette.primary.contrastText};
    --mythic-color-on-info: ${theme.palette.info.contrastText};

    --mythic-color-background-base: ${theme.palette.background.default};
    --mythic-color-surface-base: ${theme.palette.background.paper};
    --mythic-color-surface-muted: ${theme.surfaces?.muted || theme.palette.background.paper};
    --mythic-color-surface-raised: ${theme.surfaces?.raised || theme.palette.background.paper};
    --mythic-color-surface-hover: ${theme.surfaces?.hover || theme.palette.action.hover};
    --mythic-color-surface-selected: ${theme.surfaces?.selected || theme.palette.action.selected};
    --mythic-color-surface-translucent: ${alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.86 : 0.92)};
    --mythic-color-overlay: ${alpha(theme.palette.background.default, theme.palette.mode === "dark" ? 0.72 : 0.58)};
    --mythic-color-neutral-level-1: ${alpha(theme.surfaces?.muted || theme.palette.background.paper, theme.palette.mode === "dark" ? 0.55 : 0.42)};
    --mythic-color-neutral-level-2: ${alpha(theme.surfaces?.raised || theme.palette.background.paper, theme.palette.mode === "dark" ? 0.70 : 0.58)};
    --mythic-color-neutral-level-3: ${alpha(theme.surfaces?.hover || theme.palette.action.hover, theme.palette.mode === "dark" ? 0.82 : 0.70)};
    --mythic-color-text-base: ${theme.palette.text.primary};
    --mythic-color-text-muted: ${theme.palette.text.secondary};
    --mythic-color-text-disabled: ${theme.palette.text.disabled};
    --mythic-color-border-base: ${theme.table?.border || theme.borderColor};
    --mythic-color-border-subtle: ${theme.table?.borderSoft || theme.borderColor};
    --mythic-color-action-disabled: ${theme.palette.action.disabled};
    --mythic-color-action-disabled-bg: ${theme.palette.action.disabledBackground};

    --mythic-color-table-header: ${theme.table?.header || theme.tableHeader};
    --mythic-color-table-stripe: ${theme.table?.rowStripe || theme.palette.action.hover};
    --mythic-color-table-selected-hierarchy: ${theme.table?.selectedHierarchy || theme.selectedCallbackHierarchyColor};

    --mythic-color-page-header-base: ${theme.pageHeader?.main || theme.palette.background.paper};
    --mythic-color-page-header-text-base: ${theme.pageHeaderText?.main || theme.palette.text.primary};
    --mythic-color-page-header-text-level-1: ${alpha(theme.pageHeaderText?.main || theme.palette.text.primary, 0.18)};
    --mythic-color-page-header-text-level-2: ${alpha(theme.pageHeaderText?.main || theme.palette.text.primary, 0.42)};
    --mythic-color-page-header-text-level-3: ${alpha(theme.pageHeaderText?.main || theme.palette.text.primary, 0.78)};
    --mythic-color-section-accent-base: ${theme.sectionHeader?.accent || theme.palette.primary.main};
    --mythic-color-section-accent-level-1: ${alpha(theme.sectionHeader?.accent || theme.palette.primary.main, theme.palette.mode === "dark" ? 0.34 : 0.20)};
    --mythic-color-section-accent-level-2: ${alpha(theme.sectionHeader?.accent || theme.palette.primary.main, theme.palette.mode === "dark" ? 0.55 : 0.38)};
    --mythic-gradient-section: ${theme.gradients?.sectionHeader};
    --mythic-gradient-accent: ${theme.gradients?.subtleAccent};
    --mythic-gradient-accent-horizontal: ${theme.gradients?.subtleAccentHorizontal};

    --mythic-color-nav-background: ${theme.navigation.background};
    --mythic-color-nav-base: ${theme.navigation.backgroundColor};
    --mythic-color-nav-hover: ${theme.navigation.hover};
    --mythic-color-nav-icon: ${theme.navigation.icon};
    --mythic-color-nav-text: ${theme.navigation.text};
    --mythic-color-nav-muted: ${theme.navigation.muted};

    --mythic-color-output-background: ${theme.outputBackgroundColor};
    --mythic-color-output-text-base: ${theme.outputTextColor || theme.palette.text.primary};
    --mythic-color-output-text-level-1: ${alpha(theme.outputTextColor || theme.palette.text.primary, 0.58)};
    --mythic-color-output-text-level-2: ${alpha(theme.outputTextColor || theme.palette.text.primary, 0.72)};
    --mythic-color-output-text-level-3: ${alpha(theme.outputTextColor || theme.palette.text.primary, 0.82)};
    --mythic-color-output-control-bg: ${alpha(theme.outputTextColor || theme.palette.text.primary, theme.palette.mode === "dark" ? 0.10 : 0.07)};
    --mythic-color-output-control-border: ${alpha(theme.outputTextColor || theme.palette.text.primary, theme.palette.mode === "dark" ? 0.20 : 0.16)};
    --mythic-color-output-toolbar: ${alpha(theme.outputBackgroundColor || theme.palette.background.paper, theme.palette.mode === "dark" ? 0.86 : 0.72)};
    --mythic-color-output-editor: ${alpha(theme.outputBackgroundColor || theme.palette.background.paper, 0.125)};

    --mythic-color-graph-group: ${theme.palette.graphGroupRGBA};
    --mythic-font-family-base: ${theme.typography.fontFamily};
    --mythic-font-family-mono: ${theme.typography.fontFamilyMonospace || theme.typography.fontFamilyMono || "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"};
    --mythic-radius-base: ${theme.shape.borderRadius}px;
    --mythic-shadow-level-1: ${theme.palette.mode === "dark" ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "0 1px 2px rgba(15,23,42,0.06)"};
    --mythic-shadow-level-2: ${theme.palette.mode === "dark" ? "0 8px 18px rgba(0,0,0,0.22)" : "0 8px 18px rgba(15,23,42,0.10)"};
    --mythic-shadow-level-3: ${theme.palette.mode === "dark" ? "0 18px 48px rgba(0,0,0,0.40)" : "0 18px 48px rgba(15,23,42,0.14)"};
    --mythic-shadow-focus: ${theme.palette.mode === "dark" ? "drop-shadow(0 0 6px rgba(255,255,255,0.18))" : "drop-shadow(0 2px 6px rgba(15,23,42,0.18))"};
}
`}</style>
    );
};
