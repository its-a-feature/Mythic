import React, {useEffect} from 'react';
import {Button, Switch} from '@material-ui/core';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {muiTheme} from '../../../themes/Themes';
import {EditScriptDialog} from './EditScriptDialog';

export function BrowserScriptsTableRow(props){
    const [openEdit, setOpenEdit] = React.useState(false);
    const [isApplied, setIsApplied] = React.useState(false);
    const onSubmitEdit = (script) => {
        props.onSubmitEdit({browserscript_id: props.id, script: script});
    }
    const onRevert = () => {
        props.onRevert({browserscript_id: props.id, script: props.container_version});
    }
    const onSubmitApplyToOperation = () => {
        props.onSubmitApplyToOperation({browserscript_id: props.id});
    }
    const onSubmitRemoveFromOperation = () => {
        props.onSubmitRemoveFromOperation({browserscript_id: props.id});
    }
    useEffect( () => {
        let found = false;
        props.browserscriptoperations.forEach( (op) => {
            if(op.operation_id === props.operation_id){
                found = true;
            }
        } );
        setIsApplied(found);
    }, [props.browserscriptoperations, props.operation_id]);
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
                <TableCell>
                    {isApplied ?
                        (<Button size="small" variant="contained" onClick={onSubmitRemoveFromOperation} style={{color: muiTheme.palette.warning.main}}>Remove</Button>)
                    :
                        (<Button size="small" variant="contained" onClick={onSubmitApplyToOperation} style={{color: muiTheme.palette.info.main}}>Apply</Button>)
                    }
                </TableCell>
                {openEdit ? (   
                    <MythicDialog fullWidth={true} maxWidth="md" open={openEdit} 
                        onClose={()=>{setOpenEdit(false);}} 
                        innerDialog={
                            <EditScriptDialog onClose={()=>{setOpenEdit(false);}} script={props.script} onSubmitEdit={onSubmitEdit} onRevert={onRevert}/>
                        } />    
                    ) : (null)
                }
            </TableRow>
        </React.Fragment>
        )
}

