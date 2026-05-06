import React, {useRef, useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function MythicSelectFromListDialog(props) {
    const [options, setOptions] = React.useState([]);
    const [selected, setSelected] = React.useState('');
    const inputRef = useRef(null); 
    const handleChange = (event) => {
        setSelected(event.target.value);
      };
    const handleSubmit = () => {
        props.onSubmit(selected);
        if(props.dontCloseOnSubmit){
          return;
        }
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
                        <MenuItem value={opt} key={opt[props.identifier]}>{opt?.[props.display]}</MenuItem>
                    ) )}
                  </Select>
                </FormControl>
            </React.Fragment>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="success">
            {props.action}
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

export function MythicSelectFromRawListDialog(props) {
  const [options, setOptions] = React.useState([]);
  const actionText = props.action || "Select";
  const handleSubmit = (selected) => {
      props.onSubmit(selected);
      props.onClose();
  }
  const handleKeyDown = (event, selected) => {
      if(event.key === "Enter" || event.key === " "){
          event.preventDefault();
          handleSubmit(selected);
      }
  }
  useEffect( () => {
      //expects options to be an array of dictionaries with a "display" field for what gets presented to the user
      const opts = [...props.options];
      setOptions(opts);
  }, [props.options]);
return (
  <React.Fragment>
      <DialogTitle >{props.title}</DialogTitle>
      <DialogContent dividers={true} className="mythic-raw-select-dialog-content">
          {options.length === 0 ? (
              <Box className="mythic-raw-select-empty">
                  <Typography variant="body2">No options available</Typography>
              </Box>
          ) : (
              <Stack className="mythic-raw-select-list">
                  {options.map( (choice, i) => (
                      <Box
                          key={String(choice) + i}
                          className="mythic-raw-select-row"
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSubmit(choice)}
                          onKeyDown={(event) => handleKeyDown(event, choice)}
                      >
                          <Typography className="mythic-raw-select-value" title={String(choice)}>
                              {String(choice)}
                          </Typography>
                          <Button className="mythic-dialog-button-info mythic-raw-select-action" variant="outlined" size="small" tabIndex={-1}>
                              {actionText}
                          </Button>
                      </Box>
                  ))}
              </Stack>
          )}
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
</React.Fragment>
);
}
