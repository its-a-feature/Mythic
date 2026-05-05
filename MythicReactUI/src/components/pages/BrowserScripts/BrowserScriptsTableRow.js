import React from 'react';
import Box from '@mui/material/Box';
import { Switch } from '@mui/material';
import TableRow from '@mui/material/TableRow';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {EditScriptDialog} from './EditScriptDialog';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {MythicStateChip} from "../../MythicComponents/MythicStateChip";

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
            <TableRow className={props.active ? "" : "mythic-browser-script-row-disabled"} key={"payload" + props.id} hover>
                <MythicStyledTableCell>
                    <Box className="mythic-browser-script-script-cell">
                        <MythicStyledTooltip title={props.payloadtype.name}>
                            <Box className="mythic-browser-script-payload-icon">
                                <MythicAgentSVGIcon payload_type={props.payloadtype.name} style={{width: "32px", height: "32px"}} />
                            </Box>
                        </MythicStyledTooltip>
                        <Box className="mythic-browser-script-script-copy">
                            <Box className="mythic-browser-script-command-name">{props.command.cmd}</Box>
                            <Box className="mythic-browser-script-payload-name">{props.payloadtype.name}</Box>
                        </Box>
                    </Box>
                </MythicStyledTableCell>
                <MythicStyledTableCell>{props.author}</MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Box className="mythic-browser-script-active-cell">
                        <Switch
                            checked={props.active}
                            onChange={onToggleActive}
                            color="success"
                            inputProps={{ 'aria-label': 'Toggle browser script active state', "track": "white" }}
                            name="Active"
                            size="small"
                          />
                        <MythicStateChip label={props.active ? "Active" : "Disabled"} state={props.active ? "active" : "disabled"} />
                    </Box>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <MythicStateChip label={props.user_modified ? "User modified" : "Container default"} state={props.user_modified ? "warning" : "neutral"} />
                </MythicStyledTableCell>
                <MythicStyledTableCell style={{textAlign: "center"}}>
                    <Box className="mythic-table-row-actions mythic-table-row-actions-nowrap mythic-browser-script-actions">
                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small" onClick={()=>{setOpenEdit(true);}}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </MythicStyledTableCell>
                <MythicStyledTableCell className="mythic-browser-script-spacer-cell" />

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
