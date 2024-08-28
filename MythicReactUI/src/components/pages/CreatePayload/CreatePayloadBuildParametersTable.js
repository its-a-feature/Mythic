import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { CreatePayloadParameter } from './CreatePayloadParameter';


export function CreatePayloadBuildParametersTable(props){

    return (
        <TableContainer className="mythicElement">
            <Table stickyHeader={true} size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "30%"}}>Build Parameter</TableCell>
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
