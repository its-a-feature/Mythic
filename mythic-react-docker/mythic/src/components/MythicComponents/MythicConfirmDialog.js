import React from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogTitle from '@material-ui/core/DialogTitle';
import {muiTheme} from '../../themes/Themes.js';
import {MythicDialog} from './MythicDialog';

export function MythicConfirmDialog(props) {
    const handleSubmit = () => {
        props.onSubmit();
        props.onClose();
    }
  return (
    <MythicDialog fullWidth={false} maxWidth="sm" open={props.open} onClose={()=>{props.onClose()}} innerDialog={
        <React.Fragment>
            <DialogTitle >{props.title ? (props.title) : ("Are you sure?")}</DialogTitle>
            <DialogActions>
              <Button onClick={props.onClose} variant="contained" color="primary">
                {props.cancelText ? (props.cancelText) : ("Close")}
              </Button>
              <Button onClick={handleSubmit} variant="contained" style={{backgroundColor: muiTheme.palette.warning.main}}>
                {props.acceptText ? (props.acceptText) : ("Remove")}
              </Button>
            </DialogActions>
        </React.Fragment>
  } />
  );
}
