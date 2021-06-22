import React, {useRef, useEffect} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import Input from '@material-ui/core/Input';
import {muiTheme} from '../../themes/Themes.js';

export function MythicSelectFromListDialog(props) {
    const [options, setOptions] = React.useState([]);
    const [selected, setSelected] = React.useState(null);
    const inputRef = useRef(null); 
    const handleChange = (event) => {
        setSelected(event.target.value);
      };
    const handleSubmit = () => {
        props.onSubmit(selected);
        props.onClose();
    }
    useEffect( () => {
        //expects options to be an array of dictionaries with a "display" field for what gets presented to the user
        const opts = [...props.options];
        setOptions(opts);
        if(opts.length > 0){
            setSelected(opts[0]);
        }else{
            setSelected("");
        }
    }, [props.options]);
  return (
    <React.Fragment>
        <DialogTitle >{props.title}</DialogTitle>
        <DialogContent dividers={true}>
            <React.Fragment>
                <FormControl>
                  <InputLabel ref={inputRef}>Edge</InputLabel>
                  <Select
                    labelId="demo-dialog-select-label"
                    id="demo-dialog-select"
                    value={selected}
                    onChange={handleChange}
                    input={<Input />}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {options.map( (opt) => (
                        <MenuItem value={opt} key={opt.display}>{opt.display}</MenuItem>
                    ) )}
                  </Select>
                </FormControl>
            </React.Fragment>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} color="primary">
            Close
          </Button>
          <Button onClick={handleSubmit} style={{color: muiTheme.palette.warning.main}}>
            {props.action}
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

