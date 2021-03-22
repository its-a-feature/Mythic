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
import GetAppIcon from '@material-ui/icons/GetApp';
import CircularProgress from '@material-ui/core/CircularProgress';
import ErrorIcon from '@material-ui/icons/Error';
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
import Typography from '@material-ui/core/Typography';
import CancelIcon from '@material-ui/icons/Cancel';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import {muiTheme} from '../../../themes/Themes';
import {PayloadsTableRowC2Status} from './PayloadsTableRowC2Status';

export function PayloadsTableRow(props){
    const [open, setOpen] = React.useState(false);
    const [openUpdate, setOpenUpdateDialog] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const [openDescription, setOpenDescriptionDialog] = React.useState(false);
    const [openFilename, setOpenFilenameDialog] = React.useState(false);
    const [openBuildMessage, setOpenBuildMessageDialog] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const dropdownAnchorRef = useRef(null);
    const me = useReactiveVar(meState);
    
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
                     {name: 'View Build Message', click: () => {
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
                <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} color="secondary" variant="contained"><DeleteIcon/></IconButton>
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
                          <MenuList id="split-button-menu" anchorEl={dropdownAnchorRef} >
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
                <MythicDialog fullWidth={true} maxWidth="md" open={openDescription} 
                    onClose={()=>{setOpenDescriptionDialog(false);}} 
                    innerDialog={<PayloadDescriptionDialog payload_id={props.id} onClose={()=>{setOpenDescriptionDialog(false);}} />}
                />
                <MythicDialog fullWidth={true} maxWidth="md" open={openFilename} 
                    onClose={()=>{setOpenFilenameDialog(false);}} 
                    innerDialog={<PayloadFilenameDialog payload_id={props.id} onClose={()=>{setOpenFilenameDialog(false);}} />}
                />
                <MythicDialog fullWidth={true} maxWidth="md" open={openBuildMessage} 
                    onClose={()=>{setOpenBuildMessageDialog(false);}} 
                    innerDialog={<PayloadBuildMessageDialog payload_id={props.id} onClose={()=>{setOpenBuildMessageDialog(false);}} />}
                />
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
                    {props.build_phase === "success" ?
                        ( <IconButton variant="contained" target="_blank" color="primary" href={window.location.origin + "/direct/download/" + props.filemetum.agent_file_id} download><GetAppIcon style={{color: muiTheme.palette.success.main}} /></IconButton>
                        )
                        : 
                        (props.build_phase === "building" ? 
                        (<IconButton variant="contained"><CircularProgress size={20} thickness={4} style={{color: muiTheme.palette.info.main}}/></IconButton>) : 
                        (<IconButton variant="contained"><ErrorIcon style={{color: muiTheme.palette.error.main}} /></IconButton>) 
                        )
                    }
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
            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
              <Collapse in={open}>
                <Box margin={1}>
                  <DetailedPayloadTable {...props} payload_id={props.id} />
                </Box>
              </Collapse>
            </TableCell>
          </TableRow>
        </React.Fragment>
        )
}

