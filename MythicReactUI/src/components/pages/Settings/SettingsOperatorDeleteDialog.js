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
        <DialogTitle id="form-dialog-title">{props.deleted ? "Restore" : "Delete"} Operator</DialogTitle>
        <DialogContent dividers={true}>
          <DialogContentText>
              {props.deleted ?
                  "This restores an operator and allows them to log in again."
              :
              "This deletes an operator and hides them from this view by default. If you want a temporary solution, mark the operator as inactive."}
          </DialogContentText>
          <DialogContentText>
            Are you sure you want to {props.deleted ? "restore" : "delete" } operator "{props.username}"?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Cancel
          </Button>
          <Button onClick={onAccept} variant="contained" color={props.deleted ? "success": "error"}>
              {props.deleted ? "Restore": "Delete" }
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

