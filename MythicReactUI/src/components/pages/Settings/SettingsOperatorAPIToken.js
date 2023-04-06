import React from 'react';
import {Button} from '@mui/material';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import DeleteIcon from '@mui/icons-material/Delete';

export function APITokenRow(props){
    
    return (
            <TableRow key={"apitokenRow" + props.id}>
                <TableCell><Button size="small" onClick={() => {props.onDeleteAPIToken(props.id)}} startIcon={<DeleteIcon/>} color="error" variant="contained">Delete</Button></TableCell>
                <TableCell>{props.token_value}</TableCell>
            </TableRow>
        )
}

