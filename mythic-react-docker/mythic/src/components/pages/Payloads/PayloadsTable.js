import React, {useEffect} from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { PayloadsTableRow } from './PayloadsTableRow';
import {useTheme} from '@material-ui/core/styles';


export function PayloadsTable({subscribeToMoreMessages, payload, onDeletePayload, onUpdateCallbackAlert}){
    const theme = useTheme();
    useEffect( () => {
        subscribeToMoreMessages();
    }, [subscribeToMoreMessages]);
    return (
        <React.Fragment>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    Payloads
                </Typography>
              </Paper>  
        <TableContainer component={Paper} className="mythicElement">
            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "3rem"}}> Delete</TableCell>
                        <TableCell style={{width: "15rem"}}>Timestamp</TableCell>
                        <TableCell style={{width: "6rem"}}>Modify</TableCell>
                        <TableCell style={{width: "7rem"}}>Alertable</TableCell>
                        <TableCell style={{width: "6rem"}}>Download</TableCell>
                        <TableCell>File</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell >C2 Status</TableCell>
                        <TableCell style={{width: "6rem"}}>Details</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {payload.map( (op) => (
                    <PayloadsTableRow
                        onDeletePayload={onDeletePayload}
                        onAlertChanged={onUpdateCallbackAlert}
                        key={"payload" + op.id}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
        </React.Fragment>
    )
}

