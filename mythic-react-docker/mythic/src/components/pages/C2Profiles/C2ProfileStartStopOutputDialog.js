import React from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';


export function C2ProfileStartStopOutputDialog(props) {
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.payload_name}'s Current Stdout/Stderr</DialogTitle>
        <DialogContent dividers={true}>
          <DialogContentText>
            This is the current Stdout/Stderr for the profile. This goes away once you close this dialog.
          </DialogContentText>
            <MythicTextField multiline={true} value={props.output} onChange={() => {return}} />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

