import React from 'react';
import {Button} from '@material-ui/core';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Switch from '@material-ui/core/Switch';
import DeleteIcon from '@material-ui/icons/Delete';

export function APITokenRow(props){
    const onChanged = (evt) => {
        const {name} = evt.target;
        const {id} = props;
        props.onChanged({id, name});
    }
    return (
            <TableRow key={"apitokenRow" + props.id}>
                <TableCell><Button startIcon={<DeleteIcon/>} color="secondary" variant="contained">Delete</Button></TableCell>
                <TableCell>
                    <Switch
                        checked={props.active}
                        onChange={onChanged}
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="active"
                      />
                </TableCell>
                <TableCell>{props.token_type}</TableCell>
                <TableCell>{props.token_value}</TableCell>
            </TableRow>
        )
}

