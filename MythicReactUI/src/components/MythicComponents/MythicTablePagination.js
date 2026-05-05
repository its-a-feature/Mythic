import React from 'react';
import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';

export const MythicTablePagination = ({
    count,
    totalCount,
    fetchLimit,
    onChange,
    page,
    color = "primary",
    label = "Total Results",
    className = "",
    containerStyle = {},
    paginationStyle = {},
    ...paginationProps
}) => {
    const pageCount = count ?? Math.ceil((totalCount || 0) / (fetchLimit || 1));
    const controlledPage = page === undefined ? {} : {page};

    return (
        <Box className={`mythic-table-footer ${className}`.trim()} style={containerStyle}>
            <Pagination
                count={pageCount}
                variant="outlined"
                color={color}
                boundaryCount={1}
                siblingCount={1}
                onChange={onChange}
                showFirstButton={true}
                showLastButton={true}
                style={paginationStyle}
                {...controlledPage}
                {...paginationProps}
            />
            {totalCount !== undefined && (
                <Typography className="mythic-table-total">{label}: {totalCount}</Typography>
            )}
        </Box>
    );
};
