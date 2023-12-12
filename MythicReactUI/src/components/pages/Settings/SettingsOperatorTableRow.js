import React from 'react';
import {Button} from '@mui/material';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import { APITokenRow } from './SettingsOperatorAPIToken';
import { SettingsOperatorDialog } from './SettingsOperatorDialog';
import { SettingsOperatorDeleteDialog } from './SettingsOperatorDeleteDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { toLocalTime } from '../../utilities/Time';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {SettingsOperatorUIConfigDialog} from './SettingsOperatorUIConfigDialog';
import SettingsIcon from '@mui/icons-material/Settings';
import { snackActions } from '../../utilities/Snackbar';

export function SettingsOperatorTableRow(props){
    const [open, setOpen] = React.useState(false);
    const [openUpdate, setOpenUpdateDialog] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const [openUIConfig, setOpenUIConfig] = React.useState(false);
    const me = props.me;
    const isMe = ( me?.user?.user_id || 0 ) === props.id;
    const onViewUTCChanged = (evt) => {
        const {id} = props;
        props.onViewUTCChanged(id, !props[evt.target.name]);
    }
    const onAdminChanged = (evt) => {
        const {id} = props;
        props.onAdminChanged(id, !props[evt.target.name]);
    }
    const onActiveChanged = (evt) => {
        const {id} = props;
        props.onActiveChanged(id, !props[evt.target.name]);
    }
    const onAccept = (id, username, passwordOld, passwordNew) => {
        if(username !== props.username){
          props.onUsernameChanged(id, username);
        }
        if(passwordNew.length > 0){
          props.onPasswordChanged({user_id: id, old_password: passwordOld, new_password: passwordNew});
          
        } else if (passwordOld.length > 0) {
          snackActions.warning("Old password set but not new password");
          return;
        }
        setOpenUpdateDialog(false);
    }
    const onAcceptDelete = (id) => {
        props.onDeleteOperator(id);
        setOpenDeleteDialog(false);
    }
    const onAcceptUIChange = ({fontSize, fontFamily, topColor, hideUsernames}) => {
      localStorage.setItem(`${me?.user?.user_id || 0}-hideUsernames`, hideUsernames);
      localStorage.setItem(`${me?.user?.user_id || 0}-fontSize`, fontSize);
      localStorage.setItem(`${me?.user?.user_id || 0}-fontFamily`, fontFamily);
      localStorage.setItem(`${me?.user?.user_id || 0}-topColor`, topColor);
      window.location.reload();
    }
    return (
        <React.Fragment>
            <TableRow key={props.id}>
                <MythicStyledTableCell>
                    <Button size="small" onClick={()=>{setOpenDeleteDialog(true);}}
                              disabled={!(isMe || props.userIsAdmin)} color="error"
                              variant="contained"><DeleteIcon/></Button>
                  {openDelete && 
                      <MythicDialog open={openDelete} 
                      onClose={()=>{setOpenDeleteDialog(false);}} 
                      innerDialog={<SettingsOperatorDeleteDialog onClose={()=>{setOpenDeleteDialog(false);}}  onAccept={onAcceptDelete} {...props} />}
                  />
                  }
                  
                </MythicStyledTableCell>
                <MythicStyledTableCell>{props.username}</MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Button size="small"
                            disabled={!(isMe || props.userIsAdmin)}
                           onClick={()=>{setOpenUpdateDialog(true);}}
                           color="info" variant="contained"><SettingsIcon /></Button>
                  {openUpdate &&
                    <MythicDialog open={openUpdate} 
                     onClose={()=>{setOpenUpdateDialog(false);}} 
                    innerDialog={<SettingsOperatorDialog onAccept={onAccept} handleClose={()=>{setOpenUpdateDialog(false);}} title="Update Operator Username/Password"  {...props}/>}
                />
                  }
                    
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Switch
                        checked={props.view_utc_time}
                        disabled={!isMe}
                        onChange={onViewUTCChanged}
                        color="primary"
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="view_utc_time"
                      />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                  {isMe && 
                  <>
                    <IconButton size="small" onClick={()=>{setOpenUIConfig(true);}} color="info" variant='contained'><SettingsIcon /></IconButton>
                    {openUIConfig &&
                      <MythicDialog open={openUIConfig} onClose={()=>{setOpenUIConfig(false)}} maxWidth={"md"} fullWidth
                      innerDialog={<SettingsOperatorUIConfigDialog onAccept={onAcceptUIChange} onClose={()=>{setOpenUIConfig(false);}} {...props} />} 
                      />
                    }
                  </>
                  }
                  
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Switch
                        checked={props.active}
                        disabled={!props.userIsAdmin}
                        onChange={onActiveChanged}
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="active"
                      />
                </MythicStyledTableCell>
                <MythicStyledTableCell>{toLocalTime(props.last_login, me?.user?.view_utc_time )}</MythicStyledTableCell>
                <MythicStyledTableCell>{toLocalTime(props.creation_time, me?.user?.view_utc_time )}</MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Switch
                        checked={props.admin}
                        disabled={!props.userIsAdmin}
                        onChange={onAdminChanged}
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="admin"
                      />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                  {props.id === me.user.id && 
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                      {open ? <KeyboardArrowUpIcon className="mythicElement"/> : <KeyboardArrowDownIcon className="mythicElement"/>}
                    </IconButton>
                  }
                    
                </MythicStyledTableCell>
            </TableRow>
            <TableRow>
              {props.id === me.user.id &&
                <MythicStyledTableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                  <Collapse in={open} timeout="auto" unmountOnExit>
                    <Box margin={1}>
                      <Typography variant="h6" gutterBottom component="div" style={{display: "inline-block"}}>
                        API Tokens
                      </Typography>
                      <Button size="small" onClick={props.onCreateAPIToken} style={{float: "right"}} startIcon={<AddCircleOutlineOutlinedIcon/>} color="success" variant="contained">New</Button>
                      <Table size="small" aria-label="tokens" style={{"tableLayout": "fixed", "overflowWrap": "break-word"}}>
                        <TableHead>
                          <TableRow>
                            <TableCell style={{width: "10rem"}}>Delete</TableCell>
                            <TableCell>Token</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {
                            props.apitokens.map((token) => (<APITokenRow {...token} key={"token" + token.id} onDeleteAPIToken={props.onDeleteAPIToken} />))
                          }
                        </TableBody>
                      </Table>
                    </Box>
                  </Collapse>
                </MythicStyledTableCell>
              }
            
          </TableRow>
        </React.Fragment>
        )
}

