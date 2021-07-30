import React from 'react';
import {Button} from '@material-ui/core';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { OperationTableRow } from './OperationTableRow';
import Typography from '@material-ui/core/Typography';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {useTheme} from '@material-ui/core/styles';


export function OperationTable(props){
    const theme = useTheme();
    const [openNew, setOpenNewDialog] = React.useState(false);
    return (
        <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main, marginBottom: "5px", marginTop: "10px", marginRight: "5px"}} variant={"elevation"}>
            <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Operations Management
            </Typography>
        </Paper>
        <TableContainer component={Paper} className="mythicElement">   
            <Button size="small" onClick={()=>{setOpenNewDialog(true);}} style={{float: "right"}} startIcon={<AddCircleOutlineOutlinedIcon/>} color="primary" variant="contained">New Operation</Button>
            <MythicDialog open={openNew} 
                onClose={()=>{setOpenNewDialog(false);}} 
                innerDialog={null}
            />
            <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "8rem"}}>Configure</TableCell>
                        <TableCell style={{width: "8rem"}}>Operators</TableCell>
                        <TableCell style={{width: "10rem"}}>Assign Blocklists</TableCell>
                        <TableCell>Operation Name</TableCell>
                        <TableCell>Operation Admin</TableCell>
                        <TableCell style={{width: "10rem"}}>Analysis</TableCell>
                        <TableCell style={{width: "12rem"}}>Operation Status</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {props.operation.map( (op) => (
                    <OperationTableRow
                        key={"operation" + op.id}
                        {...op} operator={props.operator}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    </React.Fragment>
    )
}

