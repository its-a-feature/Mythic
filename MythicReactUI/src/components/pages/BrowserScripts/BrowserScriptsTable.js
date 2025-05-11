import React  from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { BrowserScriptsTableRow } from './BrowserScriptsTableRow';
import {useTheme} from '@mui/material/styles';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Button from '@mui/material/Button';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {EditScriptDialog} from './EditScriptDialog';


export function BrowserScriptsTable(props){
    const theme = useTheme();
    const [openNewScriptDialog, setOpenNewScriptDialog] = React.useState(false);
    return (
        <React.Fragment>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main}} variant={"elevation"}>
                <Typography variant="h5" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    Browser Scripts
                </Typography>
                <Button size="small" onClick={() => setOpenNewScriptDialog(true)} style={{float: "right", marginRight: "30px", color: "white"}}
                        startIcon={<AddCircleIcon color={"success"} style={{backgroundColor: "white", borderRadius: "10px"}}/>} >
                    New Script
                </Button>
                {openNewScriptDialog ? (   
                    <MythicDialog fullWidth={true} maxWidth="xl" open={openNewScriptDialog}
                        onClose={()=>{setOpenNewScriptDialog(false);}} 
                        innerDialog={
                            <EditScriptDialog me={props.me} onClose={()=>{setOpenNewScriptDialog(false);}} title="Create New Browser Script" new={true} onSubmitEdit={props.onSubmitNew} />
                        } />    
                    ) : null
                }
            </Paper>
            <TableContainer className="mythicElement" style={{maxHeight: "90%"}}>
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
        </React.Fragment>
        
    )
}

