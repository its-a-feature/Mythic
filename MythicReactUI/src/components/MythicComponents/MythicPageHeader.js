import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {alpha, useTheme} from '@mui/material/styles';

export const MythicPageHeader = ({
    actions,
    children,
    className = "",
    dense = false,
    icon,
    meta,
    style = {},
    subtitle,
    sx = {},
    title,
    headerVariant = "h6",
}) => {
    const theme = useTheme();
    const headerTextColor = theme.pageHeaderText?.main || theme.palette.text.primary;
    const supportingTextColor = alpha(headerTextColor, 0.78);
    const hasActionContent = actions || children;
    const actionSurface = alpha(headerTextColor, 0.1);
    const actionSurfaceHover = alpha(headerTextColor, 0.16);
    const actionSurfaceActive = alpha(headerTextColor, 0.23);
    const actionBorder = alpha(headerTextColor, 0.24);
    const actionBorderHover = alpha(headerTextColor, 0.42);
    const getIntentHoverStyles = (paletteName) => {
        const paletteColor = theme.palette[paletteName]?.main || headerTextColor;
        return {
            backgroundColor: `${alpha(paletteColor, theme.palette.mode === "dark" ? 0.28 : 0.16)} !important`,
            borderColor: `${alpha(paletteColor, theme.palette.mode === "dark" ? 0.78 : 0.55)} !important`,
            color: `${paletteColor} !important`,
        };
    };
    return (
        <Paper
            className={`mythic-page-header${className ? ` ${className}` : ""}`}
            elevation={0}
            style={style}
            sx={{
                alignItems: {xs: "stretch", md: "center"},
                backgroundColor: theme.pageHeader.main,
                border: `1px solid ${alpha(headerTextColor, 0.18)}`,
                borderRadius: `${theme.shape.borderRadius}px`,
                boxShadow: `inset 0 1px 0 ${alpha(headerTextColor, 0.12)}`,
                color: headerTextColor,
                display: "flex",
                flex: "0 0 auto",
                flexDirection: {xs: "column", md: "row"},
                flexWrap: {xs: "nowrap", md: "wrap"},
                gap: dense ? 0.75 : 1,
                height: "auto",
                justifyContent: "space-between",
                maxHeight: "none",
                minHeight: dense ? 44 : 58,
                minWidth: 0,
                overflow: "visible",
                p: dense ? "0.5rem 0.75rem" : "0.7rem 0.85rem",
                width: "100%",
                "& .MuiButton-root, & .MuiToggleButton-root": {
                    alignItems: "center",
                    backgroundColor: `${actionSurface} !important`,
                    border: `1px solid ${actionBorder} !important`,
                    borderRadius: `${theme.shape.borderRadius}px`,
                    boxShadow: "none !important",
                    color: `${headerTextColor} !important`,
                    fontSize: "0.76rem",
                    fontWeight: 750,
                    gap: 0.35,
                    justifyContent: "center",
                    letterSpacing: 0,
                    lineHeight: 1.2,
                    minHeight: 32,
                    minWidth: {xs: "auto", sm: "7rem"},
                    px: 1.05,
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    "&:hover": {
                        backgroundColor: `${actionSurfaceHover} !important`,
                        borderColor: `${actionBorderHover} !important`,
                        boxShadow: `inset 0 1px 0 ${alpha(headerTextColor, 0.12)}`,
                    },
                },
                "& .MuiButton-root.Mui-focusVisible, & .MuiToggleButton-root.Mui-focusVisible": {
                    outline: `2px solid ${alpha(headerTextColor, 0.38)}`,
                    outlineOffset: 2,
                },
                "& .MuiButton-root.Mui-disabled, & .MuiToggleButton-root.Mui-disabled": {
                    backgroundColor: `${alpha(headerTextColor, 0.04)} !important`,
                    borderColor: `${alpha(headerTextColor, 0.1)} !important`,
                    color: `${alpha(headerTextColor, 0.38)} !important`,
                },
                "& .MuiToggleButton-root.Mui-selected": {
                    backgroundColor: `${actionSurfaceActive} !important`,
                    borderColor: `${alpha(headerTextColor, 0.48)} !important`,
                    color: `${headerTextColor} !important`,
                    boxShadow: `inset 0 1px 0 ${alpha(headerTextColor, 0.16)}`,
                    "&:hover": {
                        backgroundColor: `${alpha(headerTextColor, 0.28)} !important`,
                    },
                },
                "& .MuiButton-startIcon, & .MuiButton-endIcon": {
                    color: "inherit",
                    marginLeft: 0,
                    marginRight: 0,
                },
                "& .MuiButton-startIcon": {
                    paddingRight: "0.25rem",
                },
                "& .MuiButton-endIcon": {
                    paddingLeft: "0.25rem",
                },
                "& .MuiIconButton-root": {
                    backgroundColor: `${actionSurface} !important`,
                    border: `1px solid ${actionBorder} !important`,
                    borderRadius: `${theme.shape.borderRadius}px`,
                    color: `${headerTextColor} !important`,
                    height: 32,
                    width: 32,
                    "&:hover": {
                        backgroundColor: `${actionSurfaceHover} !important`,
                        borderColor: `${actionBorderHover} !important`,
                    },
                    "&.Mui-disabled": {
                        backgroundColor: `${alpha(headerTextColor, 0.04)} !important`,
                        borderColor: `${alpha(headerTextColor, 0.1)} !important`,
                        color: `${alpha(headerTextColor, 0.38)} !important`,
                    },
                },
                "& .MuiButton-root.mythic-table-row-action-hover-info:hover, & .MuiToggleButton-root.mythic-table-row-action-hover-info:hover, & .MuiIconButton-root.mythic-table-row-icon-action-hover-info:hover": getIntentHoverStyles("info"),
                "& .MuiButton-root.mythic-table-row-action-hover-success:hover, & .MuiToggleButton-root.mythic-table-row-action-hover-success:hover, & .MuiIconButton-root.mythic-table-row-icon-action-hover-success:hover": getIntentHoverStyles("success"),
                "& .MuiButton-root.mythic-table-row-action-hover-warning:hover, & .MuiToggleButton-root.mythic-table-row-action-hover-warning:hover, & .MuiIconButton-root.mythic-table-row-icon-action-hover-warning:hover": getIntentHoverStyles("warning"),
                "& .MuiButton-root.mythic-table-row-action-hover-danger:hover, & .MuiToggleButton-root.mythic-table-row-action-hover-danger:hover, & .MuiIconButton-root.mythic-table-row-icon-action-hover-danger:hover": getIntentHoverStyles("error"),
                ...sx,
            }}
        >
            <Stack direction="row" sx={{gap: 1, minWidth: 0, flex: "1 1 24rem"}}>
                {icon &&
                    <Box sx={{
                        alignItems: "center",
                        backgroundColor: alpha(headerTextColor, 0.1),
                        border: `1px solid ${alpha(headerTextColor, 0.16)}`,
                        borderRadius: `${theme.shape.borderRadius}px`,
                        display: "inline-flex",
                        flex: "0 0 auto",
                        height: dense ? 32 : 36,
                        justifyContent: "center",
                        mt: subtitle || meta ? 0.15 : 0,
                        width: dense ? 32 : 36,
                    }}>
                        {icon}
                    </Box>
                }
                <Box sx={{display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0}}>
                    <Typography
                        variant={headerVariant}
                        sx={{
                            color: headerTextColor,
                            fontWeight: 750,
                            letterSpacing: 0,
                            lineHeight: 1.18,
                            minWidth: 0,
                        }}
                    >
                        {title}
                    </Typography>
                    {subtitle &&
                        <Typography
                            component="div"
                            sx={{
                                color: supportingTextColor,
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                lineHeight: 1.35,
                                maxWidth: "64rem",
                            }}
                        >
                            {subtitle}
                        </Typography>
                    }
                    {meta &&
                        <Box sx={{alignItems: "center", display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25}}>
                            {meta}
                        </Box>
                    }
                </Box>
            </Stack>
            {hasActionContent &&
                <Stack direction="row" sx={{
                    alignContent: "center",
                    alignItems: "center",
                    color: headerTextColor,
                    flex: "0 1 auto",
                    flexWrap: "wrap",
                    gap: 0.45,
                    justifyContent: {xs: "flex-start", md: "flex-end"},
                    maxWidth: "100%",
                    minWidth: 0,
                }}>
                    {actions}
                    {children}
                </Stack>
            }
        </Paper>
    );
}

export const MythicPageHeaderChip = ({status, sx = {}, ...props}) => {
    const theme = useTheme();
    const headerTextColor = theme.pageHeaderText?.main || theme.palette.text.primary;
    const normalizedStatus = status === "active" || status === "enabled" ? "success" :
        status === "inactive" || status === "disabled" ? "warning" :
        status === "neutral" ? "neutral" : status;
    const statusColor = normalizedStatus && normalizedStatus !== "neutral" ? theme.palette[normalizedStatus]?.main : null;
    const chipColor = statusColor || alpha(headerTextColor, 0.88);
    const neutralBackground = theme.palette.mode === "dark" ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.035);
    const neutralBorder = theme.table?.borderSoft || alpha(headerTextColor, 0.2);
    return (
        <Chip
            size="small"
            variant="outlined"
            {...props}
            sx={{
                backgroundColor: statusColor ? alpha(statusColor, theme.palette.mode === "dark" ? 0.22 : 0.13) : (normalizedStatus === "neutral" ? neutralBackground : alpha(headerTextColor, 0.08)),
                borderColor: statusColor ? alpha(statusColor, theme.palette.mode === "dark" ? 0.55 : 0.38) : (normalizedStatus === "neutral" ? neutralBorder : alpha(headerTextColor, 0.2)),
                color: chipColor,
                fontSize: "0.72rem",
                fontWeight: 750,
                height: 22,
                letterSpacing: 0,
                "& .MuiChip-icon": {
                    color: statusColor ? chipColor : alpha(headerTextColor, 0.82),
                },
                ...sx,
            }}
        />
    );
};

export const MythicSectionHeader = ({
    actions,
    dense = false,
    subtitle,
    sx = {},
    title,
}) => {
    const theme = useTheme();
    const headerTextColor = theme.pageHeaderText?.main || theme.palette.text.primary;
    const sectionAccentColor = theme.palette.primary.main;
    const sectionOverlayStart = alpha(sectionAccentColor, theme.palette.mode === "dark" ? 0.28 : 0.18);
    const sectionOverlayMiddle = alpha(sectionAccentColor, theme.palette.mode === "dark" ? 0.12 : 0.08);
    const sectionOverlayEnd = alpha(headerTextColor, theme.palette.mode === "dark" ? 0.055 : 0.04);
    return (
        <MythicPageHeader
            actions={actions}
            className="mythic-section-header"
            dense={dense}
            subtitle={subtitle}
            title={title}
            sx={{
                backgroundImage: `linear-gradient(90deg, ${sectionOverlayStart} 0%, ${sectionOverlayMiddle} 48%, ${sectionOverlayEnd} 100%)`,
                borderColor: alpha(sectionAccentColor, theme.palette.mode === "dark" ? 0.55 : 0.38),
                boxShadow: `inset 0 1px 0 ${alpha(headerTextColor, 0.22)}, 0 2px 6px ${alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.28 : 0.12)}`,
                mb: 0.5,
                mt: dense ? 1 : 1.25,
                overflow: "hidden",
                pl: dense ? 1.45 : 1.6,
                position: "relative",
                "&::before": {
                    backgroundColor: sectionAccentColor,
                    bottom: 0,
                    boxShadow: `0 0 0 1px ${alpha(headerTextColor, 0.2)}`,
                    content: '""',
                    left: 0,
                    position: "absolute",
                    top: 0,
                    width: 6,
                },
                ...sx,
            }}
        />
    );
};
