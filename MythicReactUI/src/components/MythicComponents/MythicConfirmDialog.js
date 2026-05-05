import React from 'react';
import DialogTitle from '@mui/material/DialogTitle';
import {MythicDialog} from './MythicDialog';
import DialogContentText from '@mui/material/DialogContentText';
import DialogContent from '@mui/material/DialogContent';
import {MythicDialogButton, MythicDialogFooter} from "./MythicDialogLayout";

export function MythicConfirmDialog(props) {
    const handleSubmit = () => {
        props.onSubmit();
        if(props.dontCloseOnSubmit){
            return;
        }
        props.onClose();
    }
    const acceptIntent = props.acceptColor === "success" ? "primary" :
        props.acceptColor === "warning" ? "warning" :
        props.acceptColor === "info" ? "info" :
        "destructive";

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
            <MythicDialogFooter>
              <MythicDialogButton onClick={props.onClose}>
                {props.cancelText ? (props.cancelText) : ("Cancel")}
              </MythicDialogButton>
              <MythicDialogButton onClick={handleSubmit} autoFocus intent={acceptIntent}>
                {props.acceptText ? (props.acceptText) : ("Remove")}
              </MythicDialogButton>
            </MythicDialogFooter>
        </React.Fragment>
  } />
  );
}
