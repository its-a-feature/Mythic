import React from 'react';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {MythicTableEmptyState, MythicTableLoadingState} from "../../MythicComponents/MythicStateDisplay";
import {CallbacksTableIPCell, CallbacksTableLastCheckinCell, CallbacksTablePayloadTypeCell} from "./CallbacksTableRow";
import {MythicClientSideTablePagination, useMythicClientPagination} from "../../MythicComponents/MythicTablePagination";

const getPrimaryIP = (row) => {
    try{
        return JSON.parse(row.ip)[0] || "";
    }catch(error){
        return row.ip || "";
    }
}

const compareValues = (left, right) => {
    if(left === right){
        return 0;
    }
    if(left === undefined || left === null){
        return -1;
    }
    if(right === undefined || right === null){
        return 1;
    }
    if(left instanceof Date && right instanceof Date){
        return left.getTime() - right.getTime();
    }
    if(typeof left === "number" && typeof right === "number"){
        return left - right;
    }
    return String(left).localeCompare(String(right), undefined, {numeric: true, sensitivity: "base"});
}

const getColumns = ({includeAgent}) => {
    const columns = [
        {field: "display_id", headerName: "ID", width: "4.5rem", sortValue: (row) => row.display_id},
        {field: "host", headerName: "Host", sortValue: (row) => row.host},
        {field: "user", headerName: "User", sortValue: (row) => row.user},
        {field: "pid", headerName: "PID", width: "4.5rem", sortValue: (row) => row.pid},
        {field: "description", headerName: "Description", sortValue: (row) => row.description},
        {
            field: "ip",
            headerName: "IP",
            width: "8rem",
            sortValue: getPrimaryIP,
            render: (row) => <CallbacksTableIPCell rowData={row} cellData={row.ip} />,
        },
        {
            field: "last_checkin",
            headerName: "Checkin",
            width: "8rem",
            sortValue: (row) => new Date(row.last_checkin),
            render: (row) => <CallbacksTableLastCheckinCell rowData={row} />,
        },
    ];
    if(includeAgent){
        columns.push({
            field: "payload.payloadtype.name",
            headerName: "Agent",
            sortValue: (row) => row.payload?.payloadtype?.name || "",
            render: (row) => <CallbacksTablePayloadTypeCell rowData={row} />,
        });
    }
    columns.push({field: "mythictree_groups_string", headerName: "Groups", sortValue: (row) => row.mythictree_groups_string});
    return columns;
}

export const CallbacksTabsSelectTable = ({
    includeAgent = true,
    initialData,
    loading = false,
    onRowClick,
    selectable = true,
    selectedData,
    sortModel = {field: "display_id", sort: "desc"},
    tableId = "callbacks-select-table",
    tableLabel = "Callback selection",
    rowsPerPage = 25,
}) => {
    const [data, setData] = React.useState([]);
    const [orderBy, setOrderBy] = React.useState(sortModel.field);
    const [order, setOrder] = React.useState(sortModel.sort || "asc");
    const [selectedIds, setSelectedIds] = React.useState(new Set());
    const columns = React.useMemo(() => getColumns({includeAgent}), [includeAgent]);

    React.useEffect(() => {
        setOrderBy(sortModel.field);
        setOrder(sortModel.sort || "asc");
    }, [sortModel.field, sortModel.sort]);

    React.useEffect(() => {
        setData(initialData.map((c) => ({...c})));
        setSelectedIds(new Set());
    }, [initialData]);

    React.useEffect(() => {
        if(selectable && selectedData){
            selectedData.current = data.filter((row) => selectedIds.has(row.id));
        }
    }, [data, selectable, selectedData, selectedIds]);

    const sortedData = React.useMemo(() => {
        const sortColumn = columns.find((column) => column.field === orderBy);
        if(!sortColumn){
            return data;
        }
        const direction = order === "desc" ? -1 : 1;
        return [...data].sort((left, right) => direction * compareValues(sortColumn.sortValue(left), sortColumn.sortValue(right)));
    }, [columns, data, order, orderBy]);

    const selectedCount = selectedIds.size;
    const allSelected = selectable && sortedData.length > 0 && selectedCount === sortedData.length;
    const partiallySelected = selectable && selectedCount > 0 && selectedCount < sortedData.length;
    const pagination = useMythicClientPagination({
        items: sortedData,
        resetKey: `${orderBy}:${order}`,
        rowsPerPage,
    });

    const handleSort = (field) => {
        if(orderBy === field){
            setOrder((current) => current === "asc" ? "desc" : "asc");
        }else{
            setOrderBy(field);
            setOrder("asc");
        }
    }

    const handleSelectAll = (event) => {
        if(event.target.checked){
            setSelectedIds(new Set(sortedData.map((row) => row.id)));
        }else{
            setSelectedIds(new Set());
        }
    }

    const toggleSelectedRow = (row) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if(next.has(row.id)){
                next.delete(row.id);
            }else{
                next.add(row.id);
            }
            return next;
        });
    }

    const handleSelectRow = (event, row) => {
        event.stopPropagation();
        toggleSelectedRow(row);
    }

    const handleRowClick = (row) => {
        if(selectable){
            toggleSelectedRow(row);
        }else if(onRowClick){
            onRowClick(row);
        }
    }

    const handleRowKeyDown = (event, row) => {
        if(!selectable && !onRowClick){
            return;
        }
        if(event.key === "Enter" || event.key === " "){
            event.preventDefault();
            handleRowClick(row);
        }
    }

    return (
        <>
            <TableContainer
                aria-label={`${tableLabel} scroll area`}
                className="mythicElement mythic-dialog-table-wrap mythic-fixed-row-table-wrap mythic-callback-select-table-wrap"
                data-testid={`${tableId}-scroll-region`}
                id={`${tableId}-scroll-region`}
                role="region"
                style={{height: "min(60vh, 42rem)", minHeight: "20rem", overflowY: "auto"}}
            >
                <Table aria-label={tableLabel} data-testid={tableId} id={tableId} stickyHeader size="small" style={{height: "auto"}}>
                    <TableHead>
                        <TableRow>
                            {selectable &&
                                <MythicStyledTableCell padding="checkbox">
                                    <Checkbox
                                        checked={allSelected}
                                        color="primary"
                                        indeterminate={partiallySelected}
                                        inputProps={{"aria-label": `Select all callbacks in ${tableLabel}`}}
                                        onChange={handleSelectAll}
                                        size="small"
                                    />
                                </MythicStyledTableCell>
                            }
                            {columns.map((column) => (
                                <MythicStyledTableCell key={column.field} sortDirection={orderBy === column.field ? order : false} style={{width: column.width}}>
                                    <TableSortLabel
                                        active={orderBy === column.field}
                                        direction={orderBy === column.field ? order : "asc"}
                                        onClick={() => handleSort(column.field)}
                                    >
                                        {column.headerName}
                                    </TableSortLabel>
                                </MythicStyledTableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody id={`${tableId}-body`}>
                        {loading ? (
                            <MythicTableLoadingState
                                colSpan={columns.length + (selectable ? 1 : 0)}
                                columns={columns.length + (selectable ? 1 : 0)}
                                compact
                                rows={4}
                                title="Loading callbacks"
                                description="Fetching callback data."
                                minHeight={100}
                            />
                        ) : sortedData.length === 0 ? (
                            <MythicTableEmptyState
                                colSpan={columns.length + (selectable ? 1 : 0)}
                                compact
                                title="No callbacks"
                                description="No active callbacks match this selection."
                                minHeight={180}
                            />
                        ) : (
                            pagination.pageData.map((row) => {
                                const selected = selectedIds.has(row.id);
                                return (
                                    <TableRow
                                        aria-label={`Callback ${row.display_id} ${row.user || ""}@${row.host || ""}`}
                                        className={selected ? "selectedCallback" : ""}
                                        hover
                                        id={`${tableId}-row-${row.id}`}
                                        key={row.id}
                                        onClick={() => handleRowClick(row)}
                                        onKeyDown={(event) => handleRowKeyDown(event, row)}
                                        tabIndex={selectable || onRowClick ? 0 : undefined}
                                        selected={selected}
                                        style={{cursor: selectable || onRowClick ? "pointer" : undefined}}
                                    >
                                        {selectable &&
                                            <MythicStyledTableCell padding="checkbox">
                                                <Checkbox
                                                    checked={selected}
                                                    color="primary"
                                                    inputProps={{"aria-label": `Select callback ${row.display_id}`}}
                                                    onClick={(event) => handleSelectRow(event, row)}
                                                    size="small"
                                                />
                                            </MythicStyledTableCell>
                                        }
                                        {columns.map((column) => (
                                            <MythicStyledTableCell key={column.field}>
                                                {column.render ? column.render(row) : row[column.field]}
                                            </MythicStyledTableCell>
                                        ))}
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            {!loading &&
                <MythicClientSideTablePagination
                    id={`${tableId}-pagination`}
                    pagination={pagination}
                    selectedCount={selectable ? selectedCount : undefined}
                />
            }
        </>
    )
}
