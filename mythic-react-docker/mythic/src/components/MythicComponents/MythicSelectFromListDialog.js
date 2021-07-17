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
import {useTheme} from '@material-ui/core/styles';

export function MythicSelectFromListDialog(props) {
    const [options, setOptions] = React.useState([]);
    const [selected, setSelected] = React.useState('');
    const inputRef = useRef(null); 
    const theme = useTheme();
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
                <FormControl style={{width: "100%"}}>
                  <InputLabel ref={inputRef}>Options</InputLabel>
                  <Select
                    labelId="demo-dialog-select-label"
                    id="demo-dialog-select"
                    value={selected}
                    onChange={handleChange}
                    input={<Input style={{width: "100%"}}/>}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {options.map( (opt) => (
                        <MenuItem value={opt} key={opt[props.identifier]}>{opt[props.display]}</MenuItem>
                    ) )}
                  </Select>
                </FormControl>
            </React.Fragment>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button onClick={handleSubmit} variant="contained" style={{backgroundColor: theme.palette.success.main}}>
            {props.action}
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

