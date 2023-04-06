import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {MythicDialog} from './MythicDialog';
import MythicTextField from './MythicTextField';

export function MythicDisplayTextDialog(props) {
  return (
    <MythicDialog fullWidth={props.fullWidth === null ? false : props.fullWidth} maxWidth={props.maxWidth === null ? "sm" : props.maxWidth} open={props.open} onClose={()=>{props.onClose()}} innerDialog={
        <React.Fragment>
            <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
            <DialogContent dividers={true}>
                <MythicTextField multiline={true} value={props.value} onChange={()=>{}} />
            </DialogContent>
            <DialogActions>
              <Button onClick={props.onClose} variant="contained" color="primary">
                Close
              </Button>
            </DialogActions>
        </React.Fragment>
  } />
  );
}
