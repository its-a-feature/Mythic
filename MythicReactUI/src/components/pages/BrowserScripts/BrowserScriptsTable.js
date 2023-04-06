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
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import Button from '@mui/material/Button';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {EditScriptDialog} from './EditScriptDialog';


export function BrowserScriptsTable(props){
    const theme = useTheme();
    const [openNewScriptDialog, setOpenNewScriptDialog] = React.useState(false);
    return (
        <React.Fragment>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main, marginBottom: "5px", marginTop: "10px", marginRight: "5px"}} variant={"elevation"}>
                <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    Browser Scripts
                </Typography>
                <Button size="small" onClick={() => setOpenNewScriptDialog(true)} style={{float: "right", marginTop: "10px", marginRight: "30px"}} startIcon={<AddCircleOutlineOutlinedIcon/>} color="primary" variant="contained">New Script</Button>
                {openNewScriptDialog ? (   
                    <MythicDialog fullWidth={true} maxWidth="md" open={openNewScriptDialog} 
                        onClose={()=>{setOpenNewScriptDialog(false);}} 
                        innerDialog={
                            <EditScriptDialog onClose={()=>{setOpenNewScriptDialog(false);}} title="Create New Browser Script" new={true} onSubmitEdit={props.onSubmitNew} />
                        } />    
                    ) : (null)
                }
            </Paper>
            <TableContainer component={Paper} className="mythicElement" style={{maxHeight: "calc(50vh)"}}>  
            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "5rem"}}>Delete</TableCell>
                        <TableCell style={{width: "5rem"}}>Active</TableCell>
                        <TableCell >Payload</TableCell>
                        <TableCell >Command</TableCell>
                        <TableCell> Author</TableCell>
                        <TableCell style={{width: "15em"}}>User Modified?</TableCell>
                        <TableCell style={{width: "8em"}}> Edit</TableCell>
                        <TableCell style={{width: "15rem"}}>Apply to Operation</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                {props.browserscripts.map( (op) => (
                    <BrowserScriptsTableRow onSubmitApplyToOperation={props.onSubmitApplyToOperation} 
                    onSubmitRemoveFromOperation={props.onSubmitRemoveFromOperation} 
                    operation_id={props.operation_id} onToggleActive={props.onToggleActive} 
                    onSubmitEdit={props.onSubmitEdit} onRevert={props.onRevert} 
                    onToggleOperation={props.onToggleOperation}
                    onDelete={props.onDelete}
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

