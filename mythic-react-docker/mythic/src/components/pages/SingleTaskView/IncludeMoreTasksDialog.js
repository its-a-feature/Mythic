import React, {useState, useRef, useEffect} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import Input from '@material-ui/core/Input';

export function IncludeMoreTasksDialog(props) {
    const [taskSelected, setTaskSelected] = useState(0);
    const [taskOptions, setTaskOptions] = useState([]);
    const [beforeCount, setBeforeCount] = useState(10);
    const [afterCount, setAfterCount] = useState(10);
    const [searchTerm, setSearchTerm] = useState("all");
    const [operator, setOperator] = useState("");
    const searchOptions = [
        {"type": "all", "text": "All Callbacks"},
        {"type": "callback", "text": "This Callack"},
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
            ) : (null)}
            
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button onClick={onRequestSubmit} variant="contained" color="secondary">Fetch Tasks</Button>          
        </DialogActions>
  </React.Fragment>
  );
}

