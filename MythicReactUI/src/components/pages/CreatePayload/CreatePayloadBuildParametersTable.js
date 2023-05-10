import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { CreatePayloadParameter } from './CreatePayloadParameter';
import Typography from '@mui/material/Typography';


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
                        <TableCell style={{width: "20%"}}>Build Parameter</TableCell>
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
