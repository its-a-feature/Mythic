import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {alpha, useTheme} from '@mui/material/styles';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';

const stateIcons = {
    empty: <InboxOutlinedIcon />,
    error: <ErrorOutlineOutlinedIcon />,
    loading: <HourglassEmptyOutlinedIcon />,
    search: <SearchOffOutlinedIcon />,
};

export function MythicStateDisplay({
    action,
    actionLabel,
    compact = false,
    description,
    icon,
    loading = false,
    minHeight,
    onAction,
    severity = "empty",
    sx = {},
    title,
}) {
    const theme = useTheme();
    const defaultIcon = stateIcons[severity] || stateIcons.empty;
    const iconNode = loading ? (
        <CircularProgress size={compact ? 18 : 22} color="inherit" disableShrink />
    ) : React.cloneElement(icon || defaultIcon, {fontSize: compact ? "small" : "medium"});
    const resolvedTitle = title || (loading ? "Loading" : "Nothing to show");
    const resolvedMinHeight = minHeight || (compact ? 112 : 176);
    return (
        <Box sx={{
            alignItems: "center",
            color: theme.palette.text.secondary,
            display: "flex",
            justifyContent: "center",
            minHeight: resolvedMinHeight,
            p: compact ? 1.5 : 2.5,
            width: "100%",
            ...sx,
        }}>
            <Box sx={{
                alignItems: "center",
                display: "flex",
                flexDirection: "column",
                gap: compact ? 0.75 : 1,
                maxWidth: compact ? 360 : 460,
                textAlign: "center",
            }}>
                <Box sx={{
                    alignItems: "center",
                    backgroundColor: theme.palette.mode === "dark" ? alpha(theme.palette.common.white, 0.055) : alpha(theme.palette.common.black, 0.035),
                    border: `1px solid ${theme.palette.mode === "dark" ? alpha(theme.palette.common.white, 0.09) : alpha(theme.palette.common.black, 0.08)}`,
                    borderRadius: "6px",
                    color: severity === "error" ? theme.palette.error.main : theme.palette.text.secondary,
                    display: "inline-flex",
                    height: compact ? 32 : 40,
                    justifyContent: "center",
                    width: compact ? 32 : 40,
                }}>
                    {iconNode}
                </Box>
                <Typography component="div" sx={{
                    color: theme.palette.text.primary,
                    fontSize: compact ? "0.86rem" : "0.95rem",
                    fontWeight: 800,
                    lineHeight: 1.25,
                }}>
                    {resolvedTitle}
                </Typography>
                {description &&
                    <Typography component="div" sx={{
                        color: theme.palette.text.secondary,
                        fontSize: compact ? "0.76rem" : "0.82rem",
                        lineHeight: 1.35,
                    }}>
                        {description}
                    </Typography>
                }
                {action || (actionLabel && onAction) ? (
                    action || (
                        <Button size="small" variant="outlined" onClick={onAction} sx={{mt: 0.5}}>
                            {actionLabel}
                        </Button>
                    )
                ) : null}
            </Box>
        </Box>
    );
}

export function MythicEmptyState(props) {
    return <MythicStateDisplay severity="empty" {...props} />;
}

export function MythicSearchEmptyState(props) {
    return <MythicStateDisplay severity="search" title="No results" {...props} />;
}

export function MythicLoadingState(props) {
    return <MythicStateDisplay severity="loading" loading title="Loading" {...props} />;
}

export function MythicErrorState(props) {
    return <MythicStateDisplay severity="error" title="Something went wrong" {...props} />;
}

export function MythicTableEmptyState({colSpan, ...props}) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} sx={{borderBottom: 0, p: 0}}>
                <MythicEmptyState {...props} />
            </TableCell>
        </TableRow>
    );
}

export function MythicTableSearchEmptyState({colSpan, ...props}) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} sx={{borderBottom: 0, p: 0}}>
                <MythicSearchEmptyState {...props} />
            </TableCell>
        </TableRow>
    );
}

export function MythicTableErrorState({colSpan, ...props}) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} sx={{borderBottom: 0, p: 0}}>
                <MythicErrorState {...props} />
            </TableCell>
        </TableRow>
    );
}

export function MythicTableSkeletonRows({colSpan, columns = 4, rows = 4}) {
    const skeletonColumns = Math.max(1, columns);
    return (
        <>
            {[...Array(rows).keys()].map((rowIndex) => (
                <TableRow key={`mythic-table-skeleton-${rowIndex}`}>
                    <TableCell colSpan={colSpan} sx={{px: 1.25, py: 0.75}}>
                        <Box sx={{
                            display: "grid",
                            gap: 1,
                            gridTemplateColumns: `repeat(${skeletonColumns}, minmax(0, 1fr))`,
                        }}>
                            {[...Array(skeletonColumns).keys()].map((columnIndex) => (
                                <Skeleton
                                    animation="wave"
                                    height={22}
                                    key={`mythic-table-skeleton-${rowIndex}-${columnIndex}`}
                                    sx={{borderRadius: 1}}
                                    variant="rounded"
                                    width={columnIndex === skeletonColumns - 1 ? "72%" : "100%"}
                                />
                            ))}
                        </Box>
                    </TableCell>
                </TableRow>
            ))}
        </>
    );
}

export function MythicTableLoadingState({colSpan, columns, rows = 4, showSkeleton = true, ...props}) {
    return (
        <>
            <TableRow>
                <TableCell colSpan={colSpan} sx={{borderBottom: showSkeleton ? undefined : 0, p: 0}}>
                    <MythicLoadingState {...props} />
                </TableCell>
            </TableRow>
            {showSkeleton &&
                <MythicTableSkeletonRows colSpan={colSpan} columns={columns} rows={rows} />
            }
        </>
    );
}
