import React, {useState} from 'react';
import {MythicActionButton} from '../../MythicComponents/MythicActionButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';


export function TableFilterDialog({filterOptions, onSubmit, onClose, selectedColumn}) {
    const [description, setDescription] = useState("");
    
    const onCommitSubmit = () => {
        onSubmit({...filterOptions, [selectedColumn.key]: description});
        onClose();
    }
    const onChange = (name, value, error) => {
        setDescription(value);
    }
    React.useEffect( () => {
        if(filterOptions[selectedColumn.key]){
          setDescription(filterOptions[selectedColumn.key]);
        }
    }, [selectedColumn]);
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Filter "{selectedColumn.name}" Entries</DialogTitle>
        <DialogContent style={{paddingBottom: 0}} dividers={true}>
            Show only rows that include the following case insensitive text:
            <MythicTextField autoFocus onChange={onChange} value={description} onEnter={onCommitSubmit}/>
        </DialogContent>
        <DialogActions>
          <MythicActionButton colorMode="always" variant="contained" onClick={onClose} tone="primary">
            Close
          </MythicActionButton>
          <MythicActionButton colorMode="always" variant="contained" onClick={onCommitSubmit} tone="success">
            Filter
          </MythicActionButton>
        </DialogActions>
  </React.Fragment>
  );
}
