import React, {useState} from 'react';
import Button from '@mui/material/Button';
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
        <DialogTitle id="form-dialog-title">Filter {selectedColumn.name} Entries</DialogTitle>
        <DialogContent dividers={true}>
            <MythicTextField autoFocus onChange={onChange} value={description} onEnter={onCommitSubmit}/>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose} color="primary">
            Close
          </Button>
          <Button variant="contained" onClick={onCommitSubmit} color="success">
            Filter
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

