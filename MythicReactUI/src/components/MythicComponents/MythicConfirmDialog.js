import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {MythicDialog} from './MythicDialog';
import DialogContentText from '@mui/material/DialogContentText';
import DialogContent from '@mui/material/DialogContent';

export function MythicConfirmDialog(props) {
    const handleSubmit = () => {
        props.onSubmit();
        if(props.dontCloseOnSubmit){
            return;
        }
        props.onClose();
    }

  return (
    <MythicDialog fullWidth={false} maxWidth="sm" open={props.open} onClose={()=>{props.onClose()}} innerDialog={
        <React.Fragment>
            <DialogTitle >{props.title ? (props.title) : ("Are you sure?")}</DialogTitle>
            {props.dialogText === undefined ? null : (
              <DialogContent dividers={true} style={{maxHeight: "calc(70vh)"}}>
                <DialogContentText>
                  {props.dialogText}
                </DialogContentText>
              </DialogContent>
            )}
            <DialogActions>
              <Button onClick={props.onClose} variant="contained" color="primary">
                {props.cancelText ? (props.cancelText) : ("Cancel")}
              </Button>
              <Button onClick={handleSubmit} autoFocus variant="contained" color={props.acceptColor ? (props.acceptColor) : ("error")}>
                {props.acceptText ? (props.acceptText) : ("Remove")}
              </Button>
            </DialogActions>
        </React.Fragment>
  } />
  );
}
