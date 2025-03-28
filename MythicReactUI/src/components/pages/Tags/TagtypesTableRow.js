import React from 'react';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {NewTagtypesDialog} from './NewTagtypesDialog';
import Chip from '@mui/material/Chip';
import SettingsIcon from '@mui/icons-material/Settings';


export function TagtypesTableRow(props){
    const [openUpdate, setOpenUpdateDialog] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);

    const onAcceptDelete = () => {
        props.onDeleteTagtype(props.id);
        setOpenDeleteDialog(false);
    }

    return (
      
        <React.Fragment>
            <TableRow key={"payload" + props.id} hover>
                <MythicStyledTableCell>

                  <MythicStyledTooltip title={"Delete the tag type and all associated tags"}>
                    <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} color="error" variant="contained"><DeleteIcon/></IconButton>
                  </MythicStyledTooltip>
                  
                  {openDelete && 
                    <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDelete}/>
                  }
                  
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <IconButton size="small" onClick={()=>{setOpenUpdateDialog(true);}} variant="contained"><SettingsIcon color="info" /></IconButton>
                  {openUpdate && 
                    <MythicDialog fullWidth={true} maxWidth="md" open={openUpdate}
                      onClose={()=>{setOpenUpdateDialog(false);}} 
                      innerDialog={<NewTagtypesDialog onClose={()=>{setOpenUpdateDialog(false);}} onSubmit={props.onUpdateTagtype} currentTag={props}/>}
                  />}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {props.tags_aggregate.aggregate.count}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                  <Chip label={props.name} size="small" style={{backgroundColor:props.color}} />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                  {props.description}
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}

