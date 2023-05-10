import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {ResponseDisplayTable} from './ResponseDisplayTable';


export function ResponseDisplayTableDialogTable({table, callback_id, title, onClose}) {
      
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{title}</DialogTitle>
        <DialogContent dividers={true}>
            <ResponseDisplayTable table={table} callback_id={callback_id} />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

