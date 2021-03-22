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


export function PayloadsTable(props){
    useEffect( () => {
        props.subscribeToMoreMessages();
    }, []);
    return (
        <TableContainer component={Paper} className="mythicElement">
            <Typography variant="h3" align="left" id="SettingsTable" component="div" 
            style={{"display": "inline-block", "float": "left", "marginLeft": "10px"}}>
              Payloads
            </Typography>    
            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "2rem"}}> Delete</TableCell>
                        <TableCell style={{width: "11rem"}}>Timestamp</TableCell>
                        <TableCell style={{width: "4rem"}}>Modify</TableCell>
                        <TableCell style={{width: "6rem"}}>Alert on New</TableCell>
                        <TableCell style={{width: "3rem"}}>Download</TableCell>
                        <TableCell>File</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell style={{width: "8rem"}}>C2 Status</TableCell>
                        <TableCell style={{width: "3rem"}}>Details</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {props.payload.map( (op) => (
                    <PayloadsTableRow
                        onDeletePayload={props.onDeletePayload}
                        onAlertChanged={props.onUpdateCallbackAlert}
                        key={"payload" + op.id}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

