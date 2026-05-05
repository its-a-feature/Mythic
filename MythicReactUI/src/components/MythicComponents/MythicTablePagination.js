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
    id,
    color = "primary",
    label = "Total Results",
    summary,
    className = "",
    containerStyle = {},
    paginationStyle = {},
    ...paginationProps
}) => {
    const pageCount = count ?? Math.ceil((totalCount || 0) / (fetchLimit || 1));
    const controlledPage = page === undefined ? {} : {page};

    return (
        <Box className={`mythic-table-footer ${className}`.trim()} id={id} style={containerStyle}>
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
            {summary !== undefined && summary !== null ? (
                <Typography className="mythic-table-total">{summary}</Typography>
            ) : totalCount !== undefined && (
                <Typography className="mythic-table-total">{label}: {totalCount}</Typography>
            )}
        </Box>
    );
};

export const useMythicClientPagination = ({
    items = [],
    resetKey = "",
    rowsPerPage = 25,
}) => {
    const safeItems = React.useMemo(() => {
        return Array.isArray(items) ? items : [];
    }, [items]);
    const [page, setPage] = React.useState(1);
    const totalCount = safeItems.length;
    const pageCount = Math.max(1, Math.ceil(totalCount / rowsPerPage));
    const safePage = Math.min(page, pageCount);
    const pageStart = (safePage - 1) * rowsPerPage;
    const pageData = React.useMemo(() => {
        return safeItems.slice(pageStart, pageStart + rowsPerPage);
    }, [pageStart, rowsPerPage, safeItems]);
    const pageEnd = totalCount === 0 ? 0 : Math.min(pageStart + rowsPerPage, totalCount);
    const pageStartDisplay = totalCount === 0 ? 0 : pageStart + 1;

    React.useEffect(() => {
        setPage(1);
    }, [resetKey, rowsPerPage, totalCount]);

    React.useEffect(() => {
        if(page > pageCount){
            setPage(pageCount);
        }
    }, [page, pageCount]);

    const onChangePage = React.useCallback((event, nextPage) => {
        setPage(nextPage);
    }, []);

    return {
        onChangePage,
        page: safePage,
        pageCount,
        pageData,
        pageEnd,
        pageStart,
        pageStartDisplay,
        rangeLabel: `${pageStartDisplay}-${pageEnd} of ${totalCount}`,
        rowsPerPage,
        showPagination: totalCount > rowsPerPage,
        totalCount,
    };
};

export const MythicClientSideTablePagination = ({
    id,
    pagination,
    selectedCount,
    selectedLabel = "selected",
    ...paginationProps
}) => {
    if(!pagination?.showPagination){
        return null;
    }
    const summary = selectedCount === undefined || selectedCount === null ?
        pagination.rangeLabel :
        `${pagination.rangeLabel}, ${selectedCount} ${selectedLabel}`;
    return (
        <MythicTablePagination
            count={pagination.pageCount}
            id={id}
            onChange={pagination.onChangePage}
            page={pagination.page}
            summary={summary}
            {...paginationProps}
        />
    );
};
