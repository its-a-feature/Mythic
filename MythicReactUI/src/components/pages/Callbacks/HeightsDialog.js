import React, {useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';


export function HeightsDialog(props) {
  const [heights, setHeights] = React.useState({"top": "0%", "bottom": "0%"});
  useEffect( () => {
    setHeights(props.heights);
  }, [props.heights]);
  const onSubmit = () => {
    props.onSubmit(heights);
    props.onClose();
  }
  const onChange = (name, value, error) => {
    const newHeights = {...heights};
    newHeights[name] = value;
    setHeights(newHeights);
  }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Adjust sizes of Top/Bottom sections</DialogTitle>
        <DialogContent dividers={true}>
            <React.Fragment>
                <MythicTextField autoFocus value={heights.top} onChange={onChange} name="top"/>
                <MythicTextField value={heights.bottom} onChange={onChange} name="bottom"/>
            </React.Fragment>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" >
            Close
          </Button>
          <Button onClick={onSubmit} color="primary" variant="contained" >
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

