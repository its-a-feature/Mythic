import React from 'react';
import {MythicActionButton} from '../../MythicComponents/MythicActionButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {ResponseDisplayTable} from './ResponseDisplayTable';


export function ResponseDisplayTableDialogTable({table, callback_id, title, onClose, task}) {
      
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{title}</DialogTitle>
        <DialogContent dividers={true}>
            <ResponseDisplayTable table={table} callback_id={callback_id} task={task} />
        </DialogContent>
        <DialogActions>
          <MythicActionButton colorMode="always" variant="contained" onClick={onClose} tone="primary">
            Close
          </MythicActionButton>
        </DialogActions>
  </React.Fragment>
  );
}
