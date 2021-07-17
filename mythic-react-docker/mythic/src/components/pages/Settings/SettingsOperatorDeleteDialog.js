import React from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';


export function SettingsOperatorDeleteDialog(props) {
    const onAccept = () =>{
        props.onAccept(props.id);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Delete Operator</DialogTitle>
        <DialogContent dividers={true}>
          <DialogContentText>
            This deletes an operator and prevents them from permanently logging in again. If you want a temporary solution, disable the operator instead.
          </DialogContentText>
          <DialogContentText>
            Are you sure you want to delete operator "{props.username}"?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.handleClose} variant="contained" color="primary">
            Cancel
          </Button>
          <Button onClick={onAccept} variant="contained" color="secondary">
            Delete
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

