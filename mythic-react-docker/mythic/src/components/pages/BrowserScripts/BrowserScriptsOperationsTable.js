import React, {useEffect} from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { BrowserScriptsOperationsTableRow } from './BrowserScriptsOperationsTableRow';


export function BrowserScriptsOperationsTable(props){
    useEffect( () => {
        props.subscribeToMoreMessages();
    }, []);
    return (
        <TableContainer component={Paper} className="mythicElement" style={{maxHeight: "calc(30vh)"}}>
            <Typography variant="h4" align="left" id="browserscriptstable" component="div" 
            style={{"display": "inline-block", "float": "left", "marginLeft": "10px"}}>
              Operation Browser Scripts
            </Typography>    
            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "10em"}}>Payload</TableCell>
                        <TableCell style={{}}>Command</TableCell>
                        <TableCell style={{width: "5em"}}>User Modified?</TableCell>
                        <TableCell style={{}}>Operator</TableCell>
                        <TableCell style={{width: "5em"}}>View Script</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                {props.browserscriptoperation.map( (op) => (
                    <BrowserScriptsOperationsTableRow
                        key={"opscriptrow" + op.browserscript.id}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

