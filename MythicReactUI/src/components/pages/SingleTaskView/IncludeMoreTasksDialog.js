import React, {useState, useRef, useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';

export function IncludeMoreTasksDialog(props) {
    const [taskSelected, setTaskSelected] = useState(0);
    const [taskOptions, setTaskOptions] = useState([]);
    const [beforeCount, setBeforeCount] = useState(10);
    const [afterCount, setAfterCount] = useState(10);
    const [searchTerm, setSearchTerm] = useState("all");
    const [operator, setOperator] = useState("");
    const searchOptions = [
        {"type": "all", "text": "All Callbacks"},
        {"type": "callback", "text": "This Callback"},
        {"type": "operator", "text": "All callbacks but limited by operator"}
    ];
    const inputRef = useRef(null); 
    const onRequestSubmit = () => {
        props.submitFetchTasks({
            taskSelected,
            beforeCount: parseInt(beforeCount),
            afterCount: parseInt(afterCount),
            search: searchTerm === "operator" ? operator : searchTerm
        });
        props.onClose();
    }
    const handleChange = (event) => {
        setSearchTerm(event.target.value);
      };
    const handleTaskChange = (event) => {
        setTaskSelected(event.target.value);
    };
    useEffect( () => {
        setTaskOptions(props.taskOptions);
        if(props.taskOptions.length > 0){
            setTaskSelected(props.taskOptions[0]);
        }
    }, [props.tasks, props.taskOptions])
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Add More Tasks to View</DialogTitle>
        <DialogContent dividers={true}>
        <React.Fragment>
                <FormControl style={{width:"100%"}}>
                  <InputLabel ref={inputRef}>View More Tasks Around Task:</InputLabel>
                  <Select
                    labelId="demo-dialog-select-label"
                    id="demo-dialog-select"
                    value={taskSelected}
                    onChange={handleTaskChange}
                    input={<Input />}
                  >
                    {taskOptions.map( (opt) => (
                        <MenuItem value={opt} key={"selectiontask:" + opt}>{opt}</MenuItem>
                    ) )}
                  </Select>
                </FormControl>
                <br/><br/>
            </React.Fragment>
            <MythicTextField type="number" value={beforeCount} onChange={(name, value, error)=>setBeforeCount(value)} name={"Number of tasks before"} />
            <MythicTextField type="number" value={afterCount} onChange={(name, value, error)=>setAfterCount(value)} name={"Number of tasks after"} />
            <React.Fragment>
                <FormControl style={{width:"100%"}}>
                  <InputLabel ref={inputRef}>Search Type</InputLabel>
                  <Select
                    labelId="demo-dialog-select-label"
                    id="demo-dialog-select"
                    value={searchTerm}
                    onChange={handleChange}
                    input={<Input />}
                  >
                    {searchOptions.map( (opt) => (
                        <MenuItem value={opt.type} key={"selectiontype:" + opt.type}>{opt.text}</MenuItem>
                    ) )}
                  </Select>
                </FormControl>
                <br/><br/>
            </React.Fragment>
            {searchTerm === 'operator' ? (
                <MythicTextField multiline={false} onChange={(name, value, error)=>{setOperator(value)}} value={operator} name={"Operator Username"}/>
            ) : null}
            
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button onClick={onRequestSubmit} variant="contained" color="success">Fetch Tasks</Button>          
        </DialogActions>
  </React.Fragment>
  );
}

