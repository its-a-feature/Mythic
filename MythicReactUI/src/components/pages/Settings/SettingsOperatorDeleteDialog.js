import React from 'react';
import {MythicActionButton} from '../../MythicComponents/MythicActionButton';
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
              "This deletes an operator and hides them from this view by default. If you want a temporary solution, mark the operator as disabled."}
          </DialogContentText>
          <DialogContentText>
            Are you sure you want to {props.deleted ? "restore" : "delete" } operator "{props.username}"?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <MythicActionButton colorMode="always" onClick={props.onClose} tone="primary" variant="contained">
            Cancel
          </MythicActionButton>
          <MythicActionButton colorMode="always" onClick={onAccept} tone={props.deleted ? "success": "error"} variant="contained">
              {props.deleted ? "Restore": "Delete" }
          </MythicActionButton>
        </DialogActions>
  </React.Fragment>
  );
}
