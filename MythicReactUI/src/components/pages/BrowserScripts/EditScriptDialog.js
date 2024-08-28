import React, {useEffect, useRef} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import AceEditor from 'react-ace';
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-searchbox";
import {useTheme} from '@mui/material/styles';
import { gql, useQuery, useLazyQuery } from '@apollo/client';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';
import Split from 'react-split';
import {TaskDisplay} from "../Callbacks/TaskDisplay";
import {taskingDataFragment} from '../Callbacks/CallbackMutations'



const getCommandsAndPayloadTypesQuery = gql`
query getCommandsAndPayloadTypes{
  payloadtype(where: {deleted: {_eq: false}, wrapper: {_eq: false}}, order_by: {name: asc}){
    id
    name
    commands(order_by: {cmd: asc}){
      id
      cmd
    }
  }
}
`;
const getExistingTasksForCommand = gql`
${taskingDataFragment}
query getAvailableTasks($command_id: Int!){
    task(order_by: {display_id: desc}, where: {command_id: {_eq: $command_id}}) {
        ...taskData
  }
}
`;

export function EditScriptDialog(props) {
    const theme = useTheme();
    const [script, setScript] = React.useState("");
    const [selectedPayloadType, setSelectedPayloadType] = React.useState('');
    const [selectedCommand, setSelectedCommand] = React.useState('');
    const [payloadTypeCmdOptions, setPayloadTypeCmdOptions] = React.useState([]);
    const [commandOptions, setCommandOptions] = React.useState([]);
    const inputPTRef = useRef(null); 
    const inputCMDRef = useRef(null);
    const inputTaskRef = useRef(null);
    const [availableTasks, setAvailableTasks] = React.useState([]);
    const [selectedTask, setSelectedTask] = React.useState('');
    useQuery(getCommandsAndPayloadTypesQuery, {
      onCompleted: data => {
        setPayloadTypeCmdOptions(data.payloadtype);
        if(props.payload_type_id !== undefined){
          setSelectedPayloadType(props.payload_type_id);
        }else{
          if(data.payloadtype.length > 0){
            setSelectedPayloadType(data.payloadtype[0].id);
          }
        }
        if(props.command_id !== undefined){
          setSelectedCommand(props.command_id);
          for(let i = 0; i < data.payloadtype.length; i++){
            if(props.payload_type_id === data.payloadtype[i].id){
              setCommandOptions(data.payloadtype[i].commands)
            }
          }
        }else{
          if(data.payloadtype.length > 0){
            if(data.payloadtype[0].commands.length > 0){
              setCommandOptions(data.payloadtype[0].commands);
              setSelectedCommand(data.payloadtype[0].commands[0].id);
            }
          }
        }
      },
      onError: data => {

      }
    });
    const [getAvailableTasks] = useLazyQuery(getExistingTasksForCommand, {
        onCompleted: data => {
            setAvailableTasks(data.task);
            if(data.task.length > 0){
                setSelectedTask(data.task[0]);
            }
        },
        onError: data => {

        }
    });
    const editorRef = useRef(null);
    const outputRef = useRef(null);
    const [logOutput, setLogOutput] = React.useState("console.log messages:\n");
    const logStreamRef = React.useRef("console.log messages:\n");
    useEffect( () => {
        if(selectedCommand !== ""){
            getAvailableTasks({variables: {command_id: selectedCommand}})
        }

    }, [selectedCommand]);
    useEffect( () => {
        if(props.script !== undefined){
          try{
            //setScript(atob(props.script));
            setScript(decodeURIComponent(window.atob(props.script)));
          }catch(error){
            setScript(props.script);
          }
        }        
    }, [props.script]);
    const onChange = (value) => {
        setScript(value);
    }
    const onSubmit = () => {
        //let newScript = window.btoa(encodeURIComponent(script));
        //props.onSubmitEdit({script: newScript, command_id: selectedCommand, payload_type_id: selectedPayloadType});
        props.onSubmitEdit({script: script, command_id: selectedCommand, payload_type_id: selectedPayloadType});
        props.onClose();
    }
    const onTest = () => {
        //let newScript = window.btoa(encodeURIComponent(script));
        //props.onSubmitEdit({script: newScript, command_id: selectedCommand, payload_type_id: selectedPayloadType});
        props.onSubmitEdit({script: script, command_id: selectedCommand, payload_type_id: selectedPayloadType});
        logStreamRef.current = "console.log messages:\n";
        setLogOutput(logStreamRef.current);
    }
    const onRevert = () => {
        props.onRevert();
        props.onClose();
    }
    const onChangeSelectedPayloadType = (event) => {
      setSelectedPayloadType(event.target.value);
      const cmds = payloadTypeCmdOptions.filter( (p) => p.id === event.target.value);
      setCommandOptions(cmds[0].commands);
      setSelectedCommand(cmds[0].commands[0].id);
    }
    const onChangeTask = (event) => {
        setSelectedTask(event.target.value);
    }
    const onChangeSelectedCommand = (event) => {
      setSelectedCommand(event.target.value);
    }
    const onLoad = (editor) => {
        // Your editor options comes here
        editor.on('change', (arg, activeEditor) => {
            editorRef.current = activeEditor;
            editor.removeEventListener('change');
            editorRef.current.resize();
        });
    }
    const onOutputLoad = (editor) => {
        // Your editor options comes here
        editor.on('change', (arg, activeEditor) => {
            outputRef.current = activeEditor;
            editor.removeEventListener('change');
            outputRef.current.resize();
        });
    }
    React.useEffect( () => {

        var logBackup = console.log;
        console.log = function(msg) {
            logStreamRef.current += "\n" + msg;
            logBackup.apply(msg);
            setLogOutput(logStreamRef.current)
        };


    }, []);

    const onDragging = () => {
        if(editorRef.current){
            editorRef.current.resize();
        }
        if(outputRef.current){
            outputRef.current.resize();
        }
    }
  return (
    <React.Fragment>
        <DialogTitle >
          {props.title ? props.title : "Edit " + props.author + "'s BrowserScript Code"}
          </DialogTitle>
        <DialogContent dividers={true} style={{height: `calc(100vh)`, display: "flex", flexDirection: "column", width: "100%"}}>
            <div style={{display: "flex"}}>
                <FormControl style={{width: "50%"}}>
                    <InputLabel ref={inputPTRef}>Payload Type</InputLabel>
                    <Select
                        labelId="demo-dialog-select-label"
                        id="demo-dialog-select"
                        value={selectedPayloadType}
                        onChange={onChangeSelectedPayloadType}
                        input={<Input style={{width: "100%"}}/>}
                    >
                        {payloadTypeCmdOptions.map( (opt) => (
                            <MenuItem value={opt.id} key={"payloadtype" + opt.id}>{opt.name}</MenuItem>
                        ) )}
                    </Select>
                </FormControl>
                <FormControl style={{width: "50%", paddingBottom: "10px"}}>
                    <InputLabel ref={inputCMDRef}>Command</InputLabel>
                    <Select
                        labelId="demo-dialog-select-label"
                        id="demo-dialog-select"
                        value={selectedCommand}
                        onChange={onChangeSelectedCommand}
                        input={<Input style={{width: "100%"}}/>}
                    >
                        {commandOptions.map( (opt) => (
                            <MenuItem value={opt.id} key={"command" + opt.id}>{opt.cmd}</MenuItem>
                        ) )}
                    </Select>
                </FormControl>
            </div>
            <p>
                <b>To test locally</b>: Make your changes in the top left code box. Any <b>console.log</b> entries will appear in the box to the right when executed.
                Click <b>Save for Testing</b> to finalize your changes. Make sure to select an already executed task that matches this command from the bottom.
                You will need to collapse and re-expand the task to pull in your updated changes.
            </p>
            <div style={{display: "flex", width: "100%", flexGrow: 1}}>
                <Split direction="vertical" style={{height: "100%", width: "100%"}} sizes={[30, 70]} onDrag={onDragging} >
                    <Split style={{display: "flex"}} sizes={[70, 30]} onDrag={onDragging} >
                        <div className="bg-gray-light">
                            <AceEditor
                                mode="javascript"
                                theme={theme.palette.mode === 'dark' ? 'monokai' : 'github'}
                                width="100%"
                                onLoad={onLoad}
                                height="100%"
                                value={script}
                                focus={true}
                                onChange={onChange}
                                setOptions={{
                                    useWorker: false
                                }}
                            />
                        </div>
                        <div className="bg-gray-light"   >
                            <AceEditor
                                mode="javascript"
                                theme={theme.palette.mode === 'dark' ? 'monokai' : 'github'}
                                width="100%"
                                onLoad={onOutputLoad}
                                height="100%"
                                value={logOutput}
                                focus={false}
                                onChange={onChange}
                                setOptions={{
                                    useWorker: false
                                }}
                            />
                        </div>
                    </Split>
                    <div className="bg-gray-light" >
                        <FormControl style={{width: "100%"}}>
                            <InputLabel ref={inputTaskRef} style={{paddingTop: "10px"}}>Test Script With Task</InputLabel>
                            <Select
                                labelId="demo-dialog-select-label"
                                id="demo-dialog-select"
                                value={selectedTask}
                                onChange={onChangeTask}
                                input={<Input style={{width: "100%"}}/>}
                            >
                                {availableTasks.map( (opt) => (
                                    <MenuItem value={opt} key={"task" + opt.id}>{opt.command_name + " / " + opt.display_id + " / " + opt.display_params}</MenuItem>
                                ) )}
                            </Select>
                        </FormControl>
                        {selectedTask !== "" &&
                            <TaskDisplay me={props.me} task={selectedTask} command_id={selectedTask.command == null ? 0 : selectedTask.command.id} />
                        }
                    </div>
                </Split>
            </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          {props.new ? (
            <Button onClick={onSubmit} variant="contained" color="success">
              Create
          </Button>
          ) : (
            <React.Fragment>
              <Button onClick={onRevert} variant="contained" color="warning">
                Revert
              </Button>
                <Button onClick={onTest} variant="contained" color="info">
                    Save For Testing
                </Button>
              <Button onClick={onSubmit} variant="contained" color="success">
                Save and Exit
              </Button>
            </React.Fragment>
          )}
          
        </DialogActions>
  </React.Fragment>
  );
}


