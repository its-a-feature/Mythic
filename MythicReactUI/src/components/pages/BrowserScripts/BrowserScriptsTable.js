import React  from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { BrowserScriptsTableRow } from './BrowserScriptsTableRow';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {EditScriptDialog} from './EditScriptDialog';
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {MythicToolbarButton} from "../../MythicComponents/MythicTableToolbar";
import {MythicTableEmptyState} from "../../MythicComponents/MythicStateDisplay";


export function BrowserScriptsTable(props){
    const [openNewScriptDialog, setOpenNewScriptDialog] = React.useState(false);
    const scriptCountLabel = props.browserscripts.length === 1 ? "1 script" : `${props.browserscripts.length} scripts`;
    const activeCount = props.browserscripts.filter((script) => script.active).length;
    const activeCountLabel = activeCount === 1 ? "1 active" : `${activeCount} active`;
    const modifiedCount = props.browserscripts.filter((script) => script.user_modified).length;
    return (
        <>
            <MythicPageHeader
                title={"Browser Scripts"}
                subtitle={"Manage custom browser script renderers for task output in the current UI."}
                meta={
                    <>
                        <MythicPageHeaderChip label={scriptCountLabel} />
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
            <TableContainer className="mythicElement" style={{height: "100%", flexGrow: 1}}>
            <Table stickyHeader={true} size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "3rem"}}>Edit</TableCell>
                        <TableCell style={{width: "5rem"}}>Active</TableCell>
                        <TableCell style={{width: "5rem"}}>Payload</TableCell>
                        <TableCell style={{width: "20rem"}}>Command</TableCell>
                        <TableCell style={{width: "12rem"}}> Author</TableCell>
                        <TableCell style={{textAlign: "left"}}>User Modified?</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                {props.browserscripts.length === 0 &&
                    <MythicTableEmptyState
                        colSpan={6}
                        compact
                        title="No browser scripts"
                        description="Create or import browser scripts to customize task output rendering."
                    />
                }
                {props.browserscripts.map( (op) => (
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
