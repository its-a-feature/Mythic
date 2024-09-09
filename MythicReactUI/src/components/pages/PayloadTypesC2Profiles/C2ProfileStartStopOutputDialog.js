import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";


export function C2ProfileStartStopOutputDialog(props) {
  return (
    <>
        <DialogTitle id="form-dialog-title">{props.container_name}'s Current Stdout/Stderr</DialogTitle>
            <DialogContentText>
                This is the current Stdout/Stderr for the profile. This goes away once you close this dialog.
            </DialogContentText>
            <div style={{height: "calc(80vh)", overflowY: "auto"}}>
                <ResponseDisplayPlaintext
                    initial_mode={"json"}
                    render_colors={true}
                    wrap_text={false}
                    plaintext={props.output}
                    expand={true}/>
            </div>
        <DialogActions>
            <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </>
  );
}

