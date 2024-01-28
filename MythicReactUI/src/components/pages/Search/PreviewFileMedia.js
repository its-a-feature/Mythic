import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {useTheme} from '@mui/material/styles';
import {DisplayMedia} from "../Callbacks/ResponseDisplayMedia";


export function PreviewFileMediaDialog({agent_file_id, filename, onClose}) {
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{filename} as Media</DialogTitle>
        <DialogContent style={{height: "calc(90vh)", margin: 0, padding: 0}}>
          <DisplayMedia agent_file_id={agent_file_id} filename={filename} expand={true} />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

