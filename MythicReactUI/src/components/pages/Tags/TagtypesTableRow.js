import React from 'react';
import {Box, Button} from '@mui/material';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {Typography} from '@mui/material';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import {useTheme} from '@mui/material/styles';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import { createTheme } from '@mui/material/styles';
import {NewTagtypesDialog} from './NewTagtypesDialog';
import Chip from '@mui/material/Chip';


export function TagtypesTableRow(props){
    const theme = useTheme();
    const [openUpdate, setOpenUpdateDialog] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const [lightColor, setLightColor] = React.useState(theme.palette.text.primary)
    const [darkColor, setDarkColor] = React.useState(theme.palette.text.primary);
    
    const onAcceptDelete = () => {
        props.onDeleteTagtype(props.id);
        setOpenDeleteDialog(false);
    }
    React.useEffect( () => {
      let lightTheme = createTheme({palette: {mode: "light",}});
      let darkTheme = createTheme({palette: {mode: "dark",}});
      setLightColor(lightTheme.palette.text.primary);
      setDarkColor(darkTheme.palette.text.primary);
    }, [])
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
                  <Button variant='contained' color="primary" onClick={() => setOpenUpdateDialog(true)}>Modify</Button>
                  {openUpdate && 
                    <MythicDialog fullWidth={true} maxWidth="sm" open={openUpdate} 
                      onClose={()=>{setOpenUpdateDialog(false);}} 
                      innerDialog={<NewTagtypesDialog onClose={()=>{setOpenUpdateDialog(false);}} onSubmit={props.onUpdateTagtype} currentTag={props}/>}
                  />}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                  <Chip label={props.name} size="small" style={{backgroundColor:props.color}} />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                  {props.description}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                  {props.tags_aggregate.aggregate.count}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                  
                  <Box sx={{width: "100%", height: 25, backgroundColor: props.color}} >
                    <Typography style={{textAlign: "center", color: lightColor}} >
                      {"Sample Text Light Theme - "}{props.color}
                    </Typography>
                  </Box>
                  <Box sx={{width: "100%", height: 25, backgroundColor: props.color}} >
                    <Typography style={{textAlign: "center", color: darkColor}}>
                      {"Sample Text Dark Theme - "}{props.color}
                    </Typography>
                  </Box>
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}

