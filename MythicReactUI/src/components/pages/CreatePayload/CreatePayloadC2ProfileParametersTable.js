import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { CreatePayloadParameter } from './CreatePayloadParameter';


export function CreatePayloadC2ProfileParametersTable(props){

    const onChange = (paramName, value, error) => {
        props.onChange(props.name, paramName, value, error);
    }
    return (
    <TableContainer component={Paper} className="mythicElement">
  
            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "auto"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "20%"}}>Parameter</TableCell>
                        <TableCell>Value</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {props.c2profileparameters.map( (op) => (
                        <CreatePayloadParameter key={"c2paramtablerow" + op.id} returnAllDictValues={props.returnAllDictValues} onChange={onChange} {...op} />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
} 
