import React from 'react';
import {Button} from '@material-ui/core';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Switch from '@material-ui/core/Switch';
import Box from '@material-ui/core/Box';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableHead from '@material-ui/core/TableHead';
import Typography from '@material-ui/core/Typography';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import DeleteIcon from '@material-ui/icons/Delete';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { APITokenRow } from './SettingsOperatorAPIToken';
import { SettingsOperatorDialog } from './SettingsOperatorDialog';
import { SettingsOperatorDeleteDialog } from './SettingsOperatorDeleteDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { toLocalTime } from '../../utilities/Time';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';

export function SettingsOperator(props){
    const [open, setOpen] = React.useState(false);
    const [openUpdate, setOpenUpdateDialog] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const me = useReactiveVar(meState);
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
    const apitokenOnChanged = (id, name) => {
        
    }
    const onAccept = (id, username, passwordOld, passwordNew) => {
        console.log("settingsoperator onAccept", id, username, passwordOld, passwordNew);
    }
    const onAcceptDelete = (id) => {
        props.onDeleteOperator(id);
        setOpenDeleteDialog(false);
    }
    return (
        <React.Fragment>
            <TableRow key={props.id}>
                <TableCell><Button size="small" onClick={()=>{setOpenDeleteDialog(true);}} startIcon={<DeleteIcon/>} color="secondary" variant="contained">Delete</Button>
                    <MythicDialog open={openDelete} 
                        onClose={()=>{setOpenDeleteDialog(false);}} 
                        innerDialog={<SettingsOperatorDeleteDialog onAccept={onAcceptDelete} {...props} />}
                     />
                </TableCell>
                <TableCell>{props.username}</TableCell>
                <TableCell><Button size="small" onClick={()=>{setOpenUpdateDialog(true);}} color="primary" variant="contained">Update</Button>
                    <MythicDialog open={openUpdate} 
                        onClose={()=>{setOpenUpdateDialog(false);}} 
                        innerDialog={<SettingsOperatorDialog onAccept={onAccept} handleClose={()=>{setOpenUpdateDialog(false);}} title="Update Operator"  {...props}/>}
                     />
                </TableCell>
                <TableCell>
                    <Switch
                        checked={props.view_utc_time}
                        onChange={onViewUTCChanged}
                        color="primary"
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="view_utc_time"
                      />
                </TableCell>
                <TableCell>
                    <Switch
                        checked={props.active}
                        onChange={onActiveChanged}
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="active"
                      />
                </TableCell>
                <TableCell>{toLocalTime(props.last_login, me.user.view_utc_time)}</TableCell>
                <TableCell>{toLocalTime(props.creation_time, me.user.view_utc_time)}</TableCell>
                <TableCell>
                    <Switch
                        checked={props.admin}
                        onChange={onAdminChanged}
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="admin"
                      />
                </TableCell>
                <TableCell>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon className="mythicElement"/> : <KeyboardArrowDownIcon className="mythicElement"/>}
                      </IconButton>
                </TableCell>
            </TableRow>
            <TableRow>
            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
              <Collapse in={open} timeout="auto" unmountOnExit>
                <Box margin={1}>
                  <Typography variant="h6" gutterBottom component="div" style={{display: "inline-block"}}>
                    API Tokens
                  </Typography>
                  <Button size="small" style={{float: "right"}} startIcon={<AddCircleOutlineOutlinedIcon/>} color="primary" variant="contained">New</Button>
                  <Table size="small" aria-label="tokens" style={{"tableLayout": "fixed", "overflowWrap": "break-word"}}>
                    <TableHead>
                      <TableRow>
                        <TableCell style={{width: "7rem"}}>Delete</TableCell>
                        <TableCell style={{width: "6rem"}}>Active</TableCell>
                        <TableCell style={{width: "5rem"}}>Type</TableCell>
                        <TableCell>Token</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {
                        props.apitokens.map((token) => (<APITokenRow {...token} onChanged={apitokenOnChanged} key={"token" + token.id} />))
                      }
                    </TableBody>
                  </Table>
                </Box>
              </Collapse>
            </TableCell>
          </TableRow>
        </React.Fragment>
        )
}

