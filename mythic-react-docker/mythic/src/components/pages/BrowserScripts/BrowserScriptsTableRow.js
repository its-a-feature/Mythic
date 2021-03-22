import React, {useRef} from 'react';
import {Button, Switch} from '@material-ui/core';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { toLocalTime } from '../../utilities/Time';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import {muiTheme} from '../../../themes/Themes';
import {EditScriptDialog} from './EditScriptDialog';

export function BrowserScriptsTableRow(props){
    const [openEdit, setOpenEdit] = React.useState(false);
    const onSubmitEdit = (script) => {
        props.onSubmitEdit({browserscript_id: props.id, script: script});
    }
    const onRevert = () => {
        props.onRevert({browserscript_id: props.id, script: props.container_version});
    }
    const onSubmitApplyToOperation = () => {
    
    }
    const onToggleActive = () => {
        props.onToggleActive({browserscript_id: props.id, active: !props.active});
    }
    return (
        <React.Fragment>
            <TableRow key={"payload" + props.id}>
                <TableCell>
                    <Switch
                        checked={props.active}
                        onChange={onToggleActive}
                        color="primary"
                        inputProps={{ 'aria-label': 'checkbox', "track": "white" }}
                        name="Active"
                      />
                </TableCell>
                <TableCell>{props.payloadtype.ptype}</TableCell>
                <TableCell>{props.command === null ? "Support Script: " + props.name : props.command.cmd}</TableCell>
                <TableCell>{props.user_modified ? "User Modified" : "" } </TableCell>
                <TableCell><Button size="small" variant="contained" onClick={ () => {setOpenEdit(true);} } style={{color: muiTheme.palette.info.main}}> Edit </Button></TableCell>
                <TableCell><Button size="small" variant="contained" style={{color: muiTheme.palette.info.main}}>Apply</Button></TableCell>   
                <MythicDialog fullWidth={true} maxWidth="md" open={openEdit} 
                    onClose={()=>{setOpenEdit(false);}} 
                    innerDialog={
                        <EditScriptDialog onClose={()=>{setOpenEdit(false);}} script={props.script} onSubmitEdit={onSubmitEdit} onRevert={onRevert}/>
                    } />    
            </TableRow>
        </React.Fragment>
        )
}

