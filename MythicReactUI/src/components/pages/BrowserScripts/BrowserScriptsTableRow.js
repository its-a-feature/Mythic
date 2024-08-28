import React from 'react';
import { Switch} from '@mui/material';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {EditScriptDialog} from './EditScriptDialog';
import SettingsIcon from '@mui/icons-material/Settings';
import IconButton from '@mui/material/IconButton';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";

export function BrowserScriptsTableRow(props){
    const [openEdit, setOpenEdit] = React.useState(false);
    const onSubmitEdit = ({script, command_id, payload_type_id}) => {
        props.onSubmitEdit({browserscript_id: props.id, script, command_id, payload_type_id});
    }
    const onRevert = () => {
        props.onRevert({browserscript_id: props.id, script: props.container_version});
    }
    const onToggleActive = () => {
        props.onToggleActive({browserscript_id: props.id, active: !props.active});
    }
    return (
        <React.Fragment>
            <TableRow key={"payload" + props.id} hover>
                <TableCell >
                    <IconButton size="small" onClick={()=>{setOpenEdit(true);}} color="info" variant="contained"><SettingsIcon color="info" /></IconButton>
                </TableCell>
                <TableCell >
                    <Switch
                        checked={props.active}
                        onChange={onToggleActive}
                        color="info"
                        inputProps={{ 'aria-label': 'checkbox', "track": "white" }}
                        name="Active"
                      />
                </TableCell>
                <TableCell>
                    <MythicStyledTooltip title={props.payloadtype.name}>
                        <MythicAgentSVGIcon payload_type={props.payloadtype.name} style={{width: "35px", height: "35px"}} />
                    </MythicStyledTooltip>
                </TableCell>
                <TableCell>{props.command.cmd}</TableCell>
                <TableCell>{props.author}</TableCell>
                <TableCell>{props.user_modified ? "User Modified" : "" } </TableCell>

                {openEdit &&
                    <MythicDialog fullWidth={true} maxWidth="xl" open={openEdit} 
                        onClose={()=>{setOpenEdit(false);}} 
                        innerDialog={
                            <EditScriptDialog me={props.me} onClose={()=>{setOpenEdit(false);}} payload_type_id={props.payloadtype.id} command_id={props.command.id}
                                script={props.script} onSubmitEdit={onSubmitEdit} onRevert={onRevert} author={props.author}/>
                        } />
                    }
            </TableRow>
        </React.Fragment>
        )
}

