import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { CreatePayloadParameter } from './CreatePayloadParameter';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";


export function CreatePayloadC2ProfileParametersTable(props){

    const onChange = (paramName, value, error) => {
        props.onChange(props.name, paramName, value, error);
    }
    return (
            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "auto"}}>
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "20%"}}>Parameter</MythicStyledTableCell>
                        <MythicStyledTableCell>Value</MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {props.c2profileparameters.map( (op) => (
                        <CreatePayloadParameter key={"c2paramtablerow" + op.id} returnAllDictValues={props.returnAllDictValues} onChange={onChange} {...op} />
                    ))}
                </TableBody>
            </Table>
    );
} 
