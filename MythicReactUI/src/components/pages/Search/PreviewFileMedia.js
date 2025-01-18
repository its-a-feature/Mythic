import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {ResponseDisplayMedia} from "../Callbacks/ResponseDisplayMedia";

export function PreviewFileMediaDialog({agent_file_id, filename, onClose}) {
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">
            Previewing <b>{filename}</b>
        </DialogTitle>
        <DialogContent style={{height: "calc(95vh)", margin: 0, padding: 0}}>
          <ResponseDisplayMedia media={{agent_file_id, filename}} expand={true} />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}
