import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { CreatePayloadParameter } from './CreatePayloadParameter';


export function CreatePayloadC2ProfileParametersTable(props){

    const onChange = (paramName, value, error) => {
        props.onChange(props.name, paramName, value, error);
    }
    return (
    <TableContainer component={Paper} className="mythicElement">
  
            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "20%"}}>Parameter</TableCell>
                        <TableCell>Value</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {props.c2profileparameters.map( (op) => (
                        <CreatePayloadParameter key={"c2paramtablerow" + op.id} onChange={onChange} {...op} />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
} 
