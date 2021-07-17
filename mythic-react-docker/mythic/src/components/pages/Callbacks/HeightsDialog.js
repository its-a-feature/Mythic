import React, {useEffect} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';


export function HeightsDialog(props) {
  const [heights, setHeights] = React.useState({"top": 0, "bottom": 0});
  useEffect( () => {
    setHeights(props.heights);
  }, [props.heights]);
  const onSubmit = () => {
    props.onSubmit(heights);
    props.onClose();
  }
  const onChange = (name, value, error) => {
    const newHeights = {...heights};
    newHeights[name] = parseInt(value);
    setHeights(newHeights);
  }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Adjust sizes of Top/Bottom sections</DialogTitle>
        <DialogContent dividers={true}>
            <React.Fragment>
                <MythicTextField value={heights.top} onChange={onChange} name="top" type="number"/>
                <MythicTextField value={heights.bottom} onChange={onChange} name="bottom" type="number"/>
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

