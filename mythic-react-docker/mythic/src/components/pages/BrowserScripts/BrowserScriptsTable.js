import React, {useEffect} from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { BrowserScriptsTableRow } from './BrowserScriptsTableRow';


export function BrowserScriptsTable(props){
    useEffect( () => {
        if(props !== undefined){
            props.subscribeToMoreMessages();
        }
    }, [props]);
    return (
        <TableContainer component={Paper} className="mythicElement" style={{maxHeight: "calc(50vh)"}}>
            <Typography variant="h4" align="left" id="browserscriptstable" component="div" 
            style={{"display": "inline-block", "float": "left", "marginLeft": "10px"}}>
              Browser Scripts
            </Typography>    
            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "2rem"}}>Active</TableCell>
                        <TableCell style={{width: "10em"}}>Payload</TableCell>
                        <TableCell style={{}}>Command</TableCell>
                        <TableCell style={{width: "5em"}}>User Modified?</TableCell>
                        <TableCell style={{width: "3em"}}> Edit</TableCell>
                        <TableCell style={{width: "6em"}}>Apply to Operation</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                {props.browserscript.map( (op) => (
                    <BrowserScriptsTableRow onSubmitApplyToOperation={props.onSubmitApplyToOperation} onSubmitRemoveFromOperation={props.onSubmitRemoveFromOperation} operation_id={props.operation_id} onToggleActive={props.onToggleActive} onSubmitEdit={props.onSubmitEdit} onRevert={props.onRevert} onToggleOperation={props.onToggleOperation}
                        key={"script" + op.id}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

