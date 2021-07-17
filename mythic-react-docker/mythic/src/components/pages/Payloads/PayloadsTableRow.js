import React, {useRef} from 'react';
import {Button} from '@material-ui/core';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Switch from '@material-ui/core/Switch';
import Box from '@material-ui/core/Box';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import DeleteIcon from '@material-ui/icons/Delete';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { toLocalTime } from '../../utilities/Time';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import {DetailedPayloadTable} from './DetailedPayloadTable';
import Grow from '@material-ui/core/Grow';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Paper from '@material-ui/core/Paper';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import {PayloadDescriptionDialog} from './PayloadDescriptionDialog';
import {PayloadFilenameDialog} from './PayloadFilenameDialog';
import {PayloadBuildMessageDialog} from './PayloadBuildMessageDialog';
import {PayloadsTableRowC2Status} from './PayloadsTableRowC2Status';
import {PayloadsTableRowBuildStatus} from './PayloadsTableRowBuildStatus';
import {useTheme} from '@material-ui/core/styles';

export function PayloadsTableRow(props){
    const [open, setOpen] = React.useState(false);
    const [viewError, setViewError] = React.useState(true);
    const [openUpdate, setOpenUpdateDialog] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const [openDescription, setOpenDescriptionDialog] = React.useState(false);
    const [openFilename, setOpenFilenameDialog] = React.useState(false);
    const [openBuildMessage, setOpenBuildMessageDialog] = React.useState(false);
    const dropdownAnchorRef = useRef(null);
    const me = useReactiveVar(meState);
    const theme = useTheme();
    
    const onAlertChanged = (evt) => {
        const {id} = props;
        props.onAlertChanged(id, !props[evt.target.name]);
    }
    const onAcceptDelete = () => {
        props.onDeletePayload(props.id);
        setOpenDeleteDialog(false);
    }
    const handleMenuItemClick = (event, index) => {
        options[index].click();
        setOpenUpdateDialog(false);
    };
    const options = [{name: 'Rename File', click: () => {
                        setOpenFilenameDialog(true);
                     }},
                     {name: 'Edit Description', click: () => {
                        setOpenDescriptionDialog(true);
                     }},
                     {name: 'View Build Message/Stdout', click: () => {
                        setViewError(false);
                        setOpenBuildMessageDialog(true);
                     }},
                     {name: 'View Build Errors', click: () => {
                        setViewError(true);
                        setOpenBuildMessageDialog(true);
                     }}
                     ];
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }
        setOpenUpdateDialog(false);
      };
    return (
        <React.Fragment>
            <TableRow key={"payload" + props.uuid}>
                <TableCell>
                <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} style={{color: theme.palette.error.main}} variant="contained"><DeleteIcon/></IconButton>
                <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDelete}/>
                </TableCell>
                <TableCell>{toLocalTime(props.creation_time, me.user.view_utc_time)}</TableCell>
                <TableCell><Button ref={dropdownAnchorRef} size="small" onClick={()=>{setOpenUpdateDialog(true);}} color="primary" variant="contained">Actions</Button>
                <Popper open={openUpdate} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal style={{zIndex: 4}}>
                  {({ TransitionProps, placement }) => (
                    <Grow
                      {...TransitionProps}
                      style={{
                        transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                      }}
                    >
                      <Paper>
                        <ClickAwayListener onClickAway={handleClose}>
                          <MenuList id="split-button-menu"  >
                            {options.map((option, index) => (
                              <MenuItem
                                key={option.name + props.uuid}
                                onClick={(event) => handleMenuItemClick(event, index)}
                              >
                                {option.name}
                              </MenuItem>
                            ))}
                          </MenuList>
                        </ClickAwayListener>
                      </Paper>
                    </Grow>
                  )}
                </Popper>
                {openDescription ? (
                    <MythicDialog fullWidth={true} maxWidth="md" open={openDescription} 
                        onClose={()=>{setOpenDescriptionDialog(false);}} 
                        innerDialog={<PayloadDescriptionDialog payload_id={props.id} onClose={()=>{setOpenDescriptionDialog(false);}} />}
                    />
                ): (null) }
                {openFilename ? (
                    <MythicDialog fullWidth={true} maxWidth="md" open={openFilename} 
                        onClose={()=>{setOpenFilenameDialog(false);}} 
                        innerDialog={<PayloadFilenameDialog payload_id={props.id} onClose={()=>{setOpenFilenameDialog(false);}} />}
                    />
                ): (null) }
                {openBuildMessage ? (
                    <MythicDialog fullWidth={true} maxWidth="md" open={openBuildMessage} 
                        onClose={()=>{setOpenBuildMessageDialog(false);}} 
                        innerDialog={<PayloadBuildMessageDialog payload_id={props.id} viewError={viewError} onClose={()=>{setOpenBuildMessageDialog(false);}} />}
                    />
                ): (null) }
                </TableCell>
                <TableCell>
                    <Switch
                        checked={props.callback_alert}
                        onChange={onAlertChanged}
                        color="primary"
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="callback_alert"
                      />
                </TableCell>
                <TableCell>
                    <PayloadsTableRowBuildStatus {...props} />
                </TableCell>
                <TableCell>{props.filemetum.filename_text}</TableCell>
                <TableCell>{props.tag}</TableCell>
                <TableCell>
                    <PayloadsTableRowC2Status payloadc2profiles={props.payloadc2profiles} uuid={props.uuid} />
                </TableCell>
                <TableCell>
                    <IconButton size="small" aria-label="expand row" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon className="mythicElement"/> : <KeyboardArrowDownIcon className="mythicElement"/>}
                      </IconButton>
                </TableCell>
            </TableRow>
            <TableRow>
            {open ? (
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                  <Collapse in={open}>
                    <Box margin={1}>
                      <DetailedPayloadTable {...props} payload_id={props.id} />
                    </Box>
                  </Collapse>
                </TableCell>
            ) : (null) }
          </TableRow>
        </React.Fragment>
        )
}

