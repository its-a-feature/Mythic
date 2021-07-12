import React from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
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
