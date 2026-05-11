import React from 'react';
import {useQuery, gql} from '@apollo/client';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {Backdrop, Button, CircularProgress, IconButton} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import LayersIcon from '@mui/icons-material/Layers';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import LinearProgress from '@mui/material/LinearProgress';
import {snackActions} from "../../utilities/Snackbar";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {MythicTableEmptyState} from "../../MythicComponents/MythicStateDisplay";
import {MythicClientSideTablePagination, useMythicClientPagination} from "../../MythicComponents/MythicTablePagination";


const getCallbackMythicTreeGroups = gql`
query getCallbackMythicTreeGroups($group_name: [String!]!) {
  callback(where: {mythictree_groups: {_contains: $group_name}}, order_by: {id: asc}) {
    id
    display_id
    user
    host
    domain
    active
    ip
    pid
    description
    payload {
        payloadtype {
            name
        }
    }
  }
}
`;
const getAllCallbackMythicTreeGroups = gql`
query getCallbackMythicTreeGroups {
  callback(order_by: {id: asc}) {
    id
    display_id
    user
    host
    domain
    active
    mythictree_groups
    ip
    pid
    description
    payload {
        payloadtype {
            name
        }
    }
  }
}
`;
const normalizeCallbackIP = (callback) => {
    try{
        const parsed = JSON.parse(callback.ip);
        if(Array.isArray(parsed) && parsed.length > 0){
            return {...callback, ip: parsed[0]};
        }
        return {...callback, ip: ""};
    }catch(error){
        return {...callback};
    }
};
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
    if(typeof left === "number" && typeof right === "number"){
        return left - right;
    }
    return String(left).localeCompare(String(right), undefined, {numeric: true, sensitivity: "base"});
};
const callbackGroupColumns = [
    {field: "status", headerName: "", width: "5rem", disableSort: true},
    {field: "display_id", headerName: "Callback", width: "6rem", sortValue: (row) => row.display_id},
    {field: "user", headerName: "User", sortValue: (row) => row.user},
    {field: "host", headerName: "Host", sortValue: (row) => row.host},
    {field: "domain", headerName: "Domain", sortValue: (row) => row.domain},
    {field: "ip", headerName: "IP", sortValue: (row) => row.ip},
    {field: "pid", headerName: "PID", width: "5rem", sortValue: (row) => row.pid},
    {field: "description", headerName: "Description", sortValue: (row) => row.description},
];
const CallbackGroupStatusCell = ({callback}) => {
    const payloadType = callback.payload?.payloadtype?.name || "unknown";
    return (
        <div className="mythic-tree-groups-callback-icons">
            <MythicStyledTooltip title={callback.active ? "Callback is active" : "Callback is not active"}>
                <span className={`mythic-tree-groups-status ${callback.active ? "mythic-tree-groups-statusActive" : "mythic-tree-groups-statusInactive"}`}>
                    {callback.active ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                </span>
            </MythicStyledTooltip>
            <MythicStyledTooltip title={payloadType}>
                <span className="mythic-tree-groups-agent-icon">
                    <MythicAgentSVGIcon payload_type={payloadType} style={{width: "28px", height: "28px"}} />
                </span>
            </MythicStyledTooltip>
        </div>
    );
};
const CallbackGroupCellValue = ({value, className = ""}) => (
    <span className={`mythic-tree-groups-table-value ${className}`.trim()} title={value || ""}>
        {value || "-"}
    </span>
);
const getSafeTableId = (value) => String(value || "tree-group-callbacks").replace(/[^a-zA-Z0-9_-]/g, "-");
const CallbackGroupTable = ({callbacks, emptyMessage, tableId}) => {
    const [orderBy, setOrderBy] = React.useState("display_id");
    const [order, setOrder] = React.useState("asc");
    const safeTableId = getSafeTableId(tableId);
    const sortedCallbacks = React.useMemo(() => {
        const sortColumn = callbackGroupColumns.find((column) => column.field === orderBy);
        if(!sortColumn || sortColumn.disableSort){
            return callbacks;
        }
        const direction = order === "desc" ? -1 : 1;
        return [...callbacks].sort((left, right) => direction * compareValues(sortColumn.sortValue(left), sortColumn.sortValue(right)));
    }, [callbacks, order, orderBy]);
    const pagination = useMythicClientPagination({
        items: sortedCallbacks,
        resetKey: `${safeTableId}:${orderBy}:${order}`,
        rowsPerPage: 25,
    });
    const handleSort = (column) => {
        if(column.disableSort){
            return;
        }
        if(orderBy === column.field){
            setOrder((current) => current === "asc" ? "desc" : "asc");
        }else{
            setOrderBy(column.field);
            setOrder("asc");
        }
    };
    return (
        <>
            <TableContainer
                className="mythicElement mythic-dialog-table-wrap mythic-fixed-row-table-wrap mythic-tree-groups-table-wrap"
                data-testid={`${safeTableId}-scroll-region`}
                id={`${safeTableId}-scroll-region`}
                role="region"
            >
                <Table aria-label="Callback tree group table" data-testid={safeTableId} id={safeTableId} stickyHeader size="small" style={{height: "auto"}}>
                    <TableHead>
                        <TableRow>
                            {callbackGroupColumns.map((column) => (
                                <MythicStyledTableCell key={column.field} sortDirection={orderBy === column.field ? order : false} style={{width: column.width}}>
                                    {column.disableSort ? column.headerName : (
                                        <TableSortLabel
                                            active={orderBy === column.field}
                                            direction={orderBy === column.field ? order : "asc"}
                                            onClick={() => handleSort(column)}
                                        >
                                            {column.headerName}
                                        </TableSortLabel>
                                    )}
                                </MythicStyledTableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedCallbacks.length === 0 ? (
                            <MythicTableEmptyState
                                colSpan={callbackGroupColumns.length}
                                compact
                                description={emptyMessage}
                                minHeight={150}
                                title="No callbacks"
                            />
                        ) : (
                            pagination.pageData.map((callback) => (
                                <TableRow hover key={callback.id || `callback-group-${callback.display_id}-${callback.host}`}>
                                    <MythicStyledTableCell>
                                        <CallbackGroupStatusCell callback={callback} />
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        <CallbackGroupCellValue className="mythic-tree-groups-callback-id" value={`#${callback.display_id}`} />
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        <CallbackGroupCellValue value={callback.user} />
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        <CallbackGroupCellValue value={callback.host} />
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        <CallbackGroupCellValue value={callback.domain} />
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        <CallbackGroupCellValue value={callback.ip} />
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        <CallbackGroupCellValue value={callback.pid === undefined || callback.pid === null ? "" : `${callback.pid}`} />
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell>
                                        <CallbackGroupCellValue className="mythic-tree-groups-description-cell" value={callback.description} />
                                    </MythicStyledTableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <MythicClientSideTablePagination
                id={`${safeTableId}-pagination`}
                pagination={pagination}
            />
        </>
    );
};
export function ViewCallbackMythicTreeGroupsDialog(props){
    const [backdropOpen, setBackdropOpen] = React.useState(true);
    const [groups, setGroups] = React.useState([]);
    const [openViewAllCallbacksDialog, setOpenViewAllCallbacksDialog] = React.useState(false);
    React.useEffect( () => {
        snackActions.info("Loading callbacks...");
    }, []);
    useQuery(getCallbackMythicTreeGroups, {
        fetchPolicy: "no-cache",
        variables: {group_name: [props.group_name]},
        onCompleted: data => {
            const groupData = data.callback.map(normalizeCallbackIP);
            setGroups(groupData);
            setBackdropOpen(false);
        }
        });
    React.useLayoutEffect(() => {
        snackActions.clearAll();
    }, [groups]);
    return (
        <React.Fragment>
          <DialogTitle id="form-dialog-title" className="mythic-tree-groups-title">
              <div className="mythic-dialog-title-row">
                  <div className="mythic-tree-groups-title-copy">
                      <span>Callbacks for {props.group_name}</span>
                      <span>These callbacks contribute aggregated process data for this group.</span>
                  </div>
                  <MythicStyledTooltip title="View all groups" >
                      <IconButton
                          className="mythic-file-browser-iconButton mythic-file-browser-hoverInfo"
                          size="small"
                          onClick={()=>{setOpenViewAllCallbacksDialog(true);}}>
                          <LayersIcon fontSize="small" />
                      </IconButton>
                  </MythicStyledTooltip>
              </div>
          </DialogTitle>
          <DialogContent dividers={true} className="mythic-tree-groups-content">
              <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
                  <CircularProgress color="inherit" />
              </Backdrop>
              <CallbackGroupTable
                  callbacks={groups}
                  emptyMessage={`No callbacks are contributing to ${props.group_name}.`}
                  tableId={`tree-group-${props.group_name}-callbacks`}
              />
          </DialogContent>
          <DialogActions>
            <Button onClick={props.onClose}>
              Close
            </Button>
          </DialogActions>
            {openViewAllCallbacksDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth={"lg"}
                    open={openViewAllCallbacksDialog}
                    onClose={() => {setOpenViewAllCallbacksDialog(false);}}
                    innerDialog={
                        <ViewAllCallbackMythicTreeGroupsDialog onClose={() => {setOpenViewAllCallbacksDialog(false);}} />
                    }
                />
            }
        </React.Fragment>
        )
}

export function ViewAllCallbackMythicTreeGroupsDialog(props){
    const [groups, setGroups] = React.useState([]);
    const {loading} = useQuery(getAllCallbackMythicTreeGroups, {
        fetchPolicy: "no-cache",
        onCompleted: data => {
            let groupDict = {};
            const callbacks = data.callback.map(normalizeCallbackIP);
            for(let i = 0; i < callbacks.length; i++){
                const treeGroups = callbacks[i].mythictree_groups || [];
                if (treeGroups.length > 0){
                    for(let j = 0; j < treeGroups.length; j++){
                        if(treeGroups[j] === "Default"){
                            continue;
                        }
                        if(groupDict[treeGroups[j]] === undefined){
                            groupDict[treeGroups[j]] = [];
                        }
                        groupDict[treeGroups[j]].push(callbacks[i]);
                    }
                }
            }
            const keys = Object.keys(groupDict).sort();
            const groupData = keys.map( k => {
                return {
                    "group": k,
                    "callbacks": groupDict[k]
                }
            })
            setGroups(groupData);
        }
    });
    if (loading) {
        return (
            <LinearProgress style={{marginTop: "10px"}}/>
        )
    }
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title" className="mythic-tree-groups-title">Callback tree groups
            </DialogTitle>
            <DialogContent dividers={true} className="mythic-tree-groups-content">
                <div className="mythic-tree-groups-help">
                    Callbacks with no groups or with only the "Default" group are not shown.
                </div>
                {groups.length === 0 ? (
                    <div className="mythic-tree-groups-empty">
                        No callback tree groups found.
                    </div>
                ) : (
                    groups.map( (g, i) => (
                        <div key={g.group} className="mythic-dialog-section mythic-tree-groups-section">
                            <div className="mythic-dialog-section-header">
                                <div>
                                    <div className="mythic-dialog-section-title">
                                        {g.group}
                                    </div>
                                    <div className="mythic-dialog-section-description">
                                        {g.callbacks.length} callback{g.callbacks.length === 1 ? "" : "s"}
                                    </div>
                                </div>
                            </div>
                            <CallbackGroupTable
                                callbacks={g.callbacks}
                                emptyMessage={`No callbacks are contributing to ${g.group}.`}
                                tableId={`tree-group-${g.group}-callbacks`}
                            />
                        </div>
                    ))
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={props.onClose}>
                    Close
                </Button>
            </DialogActions>
        </React.Fragment>
    )
}
