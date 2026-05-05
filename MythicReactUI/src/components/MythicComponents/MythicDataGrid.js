import React from 'react';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';
import {MythicLoadingState, MythicSearchEmptyState} from "./MythicStateDisplay";

const DefaultNoRowsOverlay = () => (
    <MythicSearchEmptyState
        compact
        description="No rows match the current data or filters."
        minHeight={160}
    />
);

const DefaultLoadingOverlay = () => (
    <MythicLoadingState
        compact
        title="Loading rows"
        description="Fetching the latest table data."
        minHeight={160}
    />
);

export const MythicDataGrid = ({
    containerSx = {},
    sx = {},
    slots = {},
    density = "compact",
    autoPageSize = true,
    pageSizeOptions = [10, 25, 50, 100],
    columnHeaderHeight = 34,
    rowHeight = 34,
    ...props
}) => {
    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
                minHeight: 0,
                overflow: "hidden",
                ...containerSx,
            }}
        >
            <DataGrid
                density={density}
                autoPageSize={autoPageSize}
                pageSizeOptions={pageSizeOptions}
                columnHeaderHeight={columnHeaderHeight}
                rowHeight={rowHeight}
                hideFooterSelectedRowCount
                slots={{
                    noRowsOverlay: DefaultNoRowsOverlay,
                    loadingOverlay: DefaultLoadingOverlay,
                    ...slots,
                }}
                sx={{
                    flexGrow: 1,
                    minHeight: 0,
                    width: "100%",
                    ...sx,
                }}
                {...props}
            />
        </Box>
    );
}
