import React  from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { BrowserScriptsTableRow } from './BrowserScriptsTableRow';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {EditScriptDialog} from './EditScriptDialog';
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {
    MythicSearchField,
    MythicTableToolbar,
    MythicTableToolbarGroup,
    MythicToolbarButton,
    MythicToolbarMenuItem,
    MythicToolbarSelect
} from "../../MythicComponents/MythicTableToolbar";
import {MythicTableEmptyState} from "../../MythicComponents/MythicStateDisplay";
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";


export function BrowserScriptsTable(props){
    const [openNewScriptDialog, setOpenNewScriptDialog] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("all");
    const normalizedSearch = search.trim().toLowerCase();
    const visibleScripts = React.useMemo(() => {
        return props.browserscripts.filter((script) => {
            const matchesStatus = statusFilter === "all" ||
                (statusFilter === "active" && script.active) ||
                (statusFilter === "disabled" && !script.active) ||
                (statusFilter === "modified" && script.user_modified) ||
                (statusFilter === "default" && !script.user_modified);
            if(!matchesStatus){
                return false;
            }
            if(normalizedSearch === ""){
                return true;
            }
            return [
                script.payloadtype?.name,
                script.command?.cmd,
                script.author,
            ].some((value) => (value || "").toLowerCase().includes(normalizedSearch));
        });
    }, [normalizedSearch, props.browserscripts, statusFilter]);
    const scriptCountLabel = props.browserscripts.length === 1 ? "1 script" : `${props.browserscripts.length} scripts`;
    const visibleCountLabel = visibleScripts.length === 1 ? "1 shown" : `${visibleScripts.length} shown`;
    const activeCount = props.browserscripts.filter((script) => script.active).length;
    const activeCountLabel = activeCount === 1 ? "1 active" : `${activeCount} active`;
    const modifiedCount = props.browserscripts.filter((script) => script.user_modified).length;
    const hasFilter = normalizedSearch !== "" || statusFilter !== "all";
    const onChangeSearch = (name, value) => {
        setSearch(value);
    }
    return (
        <>
            <MythicPageHeader
                title={"Browser Scripts"}
                subtitle={"Manage custom browser script renderers for task output in the current UI."}
                meta={
                    <>
                        <MythicPageHeaderChip label={scriptCountLabel} />
                        {hasFilter && <MythicPageHeaderChip label={visibleCountLabel} />}
                        <MythicPageHeaderChip label={activeCountLabel} />
                        {modifiedCount > 0 && <MythicPageHeaderChip label={`${modifiedCount} modified`} />}
                    </>
                }
                actions={
                    <MythicToolbarButton variant="contained" color="primary" onClick={() => setOpenNewScriptDialog(true)} startIcon={<AddCircleIcon />}>
                        Script
                    </MythicToolbarButton>
                }
            />
            {openNewScriptDialog &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openNewScriptDialog}
                    onClose={()=>{setOpenNewScriptDialog(false);}}
                    innerDialog={
                        <EditScriptDialog me={props.me} onClose={()=>{setOpenNewScriptDialog(false);}} title="Create New Browser Script" new={true} onSubmitEdit={props.onSubmitNew} />
                    } />
            }
            <MythicTableToolbar variant="search">
                <MythicTableToolbarGroup grow>
                    <MythicSearchField
                        name="Search browser scripts"
                        placeholder="Search payload, command, or author..."
                        value={search}
                        onChange={onChangeSearch}
                    />
                </MythicTableToolbarGroup>
                <MythicTableToolbarGroup>
                    <MythicToolbarSelect
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                    >
                        <MythicToolbarMenuItem value="all">All scripts</MythicToolbarMenuItem>
                        <MythicToolbarMenuItem value="active">Active</MythicToolbarMenuItem>
                        <MythicToolbarMenuItem value="disabled">Disabled</MythicToolbarMenuItem>
                        <MythicToolbarMenuItem value="modified">User modified</MythicToolbarMenuItem>
                        <MythicToolbarMenuItem value="default">Container default</MythicToolbarMenuItem>
                    </MythicToolbarSelect>
                </MythicTableToolbarGroup>
            </MythicTableToolbar>
            <TableContainer className="mythicElement" style={{flexGrow: 1, minHeight: 0, overflow: "auto"}}>
            <Table className="mythic-browser-scripts-table" stickyHeader={true} size="small">
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "24rem"}}>Script</MythicStyledTableCell>
                        <MythicStyledTableCell style={{width: "10rem"}}>Author</MythicStyledTableCell>
                        <MythicStyledTableCell style={{width: "9.5rem"}}>Active</MythicStyledTableCell>
                        <MythicStyledTableCell style={{width: "12rem"}}>Source</MythicStyledTableCell>
                        <MythicStyledTableCell style={{width: "4rem", textAlign: "center"}}>Actions</MythicStyledTableCell>
                        <MythicStyledTableCell className="mythic-browser-script-spacer-cell" />
                    </TableRow>
                </TableHead>
                <TableBody>
                {visibleScripts.length === 0 &&
                    <MythicTableEmptyState
                        colSpan={6}
                        compact
                        title={props.browserscripts.length === 0 ? "No browser scripts" : "No browser scripts match"}
                        description={props.browserscripts.length === 0 ? "Create or import browser scripts to customize task output rendering." : "Try changing the search text or status filter."}
                    />
                }
                {visibleScripts.map( (op) => (
                    <BrowserScriptsTableRow
                        me={props.me}
                        operation_id={props.operation_id} onToggleActive={props.onToggleActive}
                        onSubmitEdit={props.onSubmitEdit} onRevert={props.onRevert}
                        key={"script" + op.id}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
            </TableContainer>
        </>
        
    )
}
