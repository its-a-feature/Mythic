import React from 'react';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';

export const MythicDataGrid = ({containerSx = {}, sx = {}, density = "compact", autoPageSize = true, pageSizeOptions = [10, 25, 50, 100], ...props}) => {
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
                hideFooterSelectedRowCount
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
