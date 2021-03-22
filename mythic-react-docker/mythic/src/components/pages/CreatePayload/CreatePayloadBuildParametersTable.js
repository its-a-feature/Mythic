import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { CreatePayloadParameter } from './CreatePayloadParameter';
import Typography from '@material-ui/core/Typography';


export function CreatePayloadBuildParametersTable(props){

    return (
        <TableContainer component={Paper} className="mythicElement">
            <Typography variant="h4" align="left" id="SettingsTable" component="div" 
            style={{"display": "inline-block", "float": "left", "marginLeft": "10px"}}>
              Build Parameters
            </Typography>    
            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell>Build Parameter</TableCell>
                        <TableCell>Value</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                {props.buildParameters.map( (op) => (
                    <CreatePayloadParameter key={"buildparamtablerow" + op.id} onChange={props.onChange} {...op} />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
} 
