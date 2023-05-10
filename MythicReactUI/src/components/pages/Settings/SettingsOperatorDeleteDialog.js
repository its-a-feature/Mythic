import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';


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
          <Button onClick={props.onClose} variant="contained" color="primary">
            Cancel
          </Button>
          <Button onClick={onAccept} variant="contained" color="secondary">
            Delete
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

