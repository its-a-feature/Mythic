import React, {useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Checkbox from '@mui/material/Checkbox';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import ListItemText from '@mui/material/ListItemText';
import makeStyles from '@mui/styles/makeStyles';
import {useQuery, gql } from '@apollo/client';
import MenuItem from '@mui/material/MenuItem';
import {TaskFromUIButton} from './TaskFromUIButton';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';
import { CardContent } from '@mui/material';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';


const callbacksAndFeaturesQuery = gql`
query callbacksAndFeatures($operation_id: Int!, $payloadtype_id: Int!) {
  callback(where: {operation_id: {_eq: $operation_id}, active: {_eq: true}, payload: {payloadtype: { id: {_eq: $payloadtype_id}}}}, order_by: {id: asc}) {
    loadedcommands {
      command {
        cmd
        description
        id
      }
      id
    }
    id
    host
    user
    process_name
    pid
  }
}`;

const useStyles = makeStyles((theme) => ({
  root: {
    margin: 'auto',
  },
  paper: {
    width: 200,
    //height: 500,
  },
  button: {
    margin: theme.spacing(0.5, 0),
  },
  divider: {
    backgroundColor: "rgb(100, 170, 204)",
    border: "2px solid rgba(100, 170, 204)"
  }
}));

function not(a, b) {
  return a.filter((value) => b.indexOf(value) === -1);
}

function intersection(a, b) {
  return a.filter((value) => b.indexOf(value) !== -1);
}

export function CallbacksTabsTaskMultipleDialog({onClose, callback}) {
    const [featureOptions, setFeatureOptions] = React.useState([]);
    const [selectedFeature, setSelectedFeature] = React.useState("");
    const classes = useStyles();
    const [checked, setChecked] = React.useState([]);
    const [left, setLeft] = React.useState([]);
    const [right, setRight] = React.useState([]);
    const leftChecked = intersection(checked, left);
    const rightChecked = intersection(checked, right);
    const inputRef = React.useRef(null); 
    const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
    const taskingData = React.useRef({});
    const leftToTask = React.useRef([]);
    const startTasking = React.useRef(false);
    const finalTaskedParameters = React.useRef(null);
    const [openProgressIndicator, setOpenProgressIndicator] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const totalToTask = React.useRef(1);
    const normalize = (value) => ((value - 0) * 100) / (totalToTask.current - 0);
    useQuery(callbacksAndFeaturesQuery, {variables: {operation_id: callback.operation_id, payloadtype_id: callback.payload.payloadtype.id},
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
        const callbackData = data.callback.map( c => {
          const display = `${c.id} - ${c.user}@${c.host} (${c.pid})`;
          return {...c, display};
        });
        setLeft(callbackData);
      }
    });
    React.useEffect( () =>{
      //based on what's in the `right` variable, we can update the featureOptions to be the intersection of those values
      let allCommands = [];
      if(right.length >= 1){
        allCommands = [...right[0].loadedcommands];
        for(let i = 1; i < right.length; i++){
          let intersection = [];
          for(let j = 0; j < allCommands.length; j++){
            if(right[i].loadedcommands.findIndex( x => x.command.cmd === allCommands[j].command.cmd) >= 0){
              intersection.push(allCommands[j]);
            }
          }
          allCommands = [...intersection];
        }
      }
      allCommands.sort( (a,b) => a.command.cmd < b.command.cmd ? -1 : a.command.cmd > b.command.cmd ? 1 : 0)
      setFeatureOptions(allCommands);
      if(allCommands.length > 0){
        setSelectedFeature(allCommands[0]);
      }else{
        setSelectedFeature('');
      }
    }, [right]);
    const handleToggle = (value) => () => {
      const currentIndex = checked.indexOf(value);
      const newChecked = [...checked];

      if (currentIndex === -1) {
        newChecked.push(value);
      } else {
        newChecked.splice(currentIndex, 1);
      }

      setChecked(newChecked);
    };

    const handleAllRight = () => {
      setRight(right.concat(left));
      setLeft([]);
    };

    const handleCheckedRight = () => {
      setRight(right.concat(leftChecked));
      setLeft(not(left, leftChecked));
      setChecked(not(checked, leftChecked));
    };

    const handleCheckedLeft = () => {
      setLeft(left.concat(rightChecked));
      setRight(not(right, rightChecked));
      setChecked(not(checked, rightChecked));
    };

    const handleAllLeft = () => {
      setLeft(left.concat(right));
      setRight([]);
    };
    const issueNextTasking = () => {
      let callback = leftToTask.current.shift(1);
      
      if(callback){
        if(finalTaskedParameters.current){
          taskingData.current = {cmd: selectedFeature.command.cmd, callback_id: callback.id, openDialog: false, parameters: finalTaskedParameters.current, tasking_location: "modal", dontShowSuccessDialog: true};
        }else{
          taskingData.current = {cmd: selectedFeature.command.cmd, callback_id: callback.id, openDialog: true, parameters: "", tasking_location: "modal", dontShowSuccessDialog: true};
        }
        setOpenTaskingButton(true);
      }else{
        //setOpenProgressIndicator(false);
        //onClose();
        return;
      }
    }
    const submitTasking = () => {
      //console.log("selectedFeature", selectedFeature)
      if(right.length === 0 || selectedFeature === ""){
        onClose();
        return;
      }
      startTasking.current = true;
      leftToTask.current = [...right];
      totalToTask.current = right.length;
      
      //console.log("calling issueNextTasking")
      issueNextTasking();
    }
    const onTasked = ({tasked, variables}) => {
      if(tasked){
        //console.log("setting finalTaskedParameters to", variables);
        finalTaskedParameters.current = variables;
        setProgress(progress + 1);
        setOpenProgressIndicator(true);
        setOpenTaskingButton(false);
      }else{
        onClose()
        return;
      }
      
    }
    React.useEffect( () => {
      if(startTasking.current){
        if(!openTaskingButton){
          issueNextTasking();
        }
      }
    }, [openTaskingButton, startTasking])
    React.useEffect( () => {
      if(!openProgressIndicator){
        setProgress(0);
      }
    }, [openProgressIndicator])
    const customList = (title, items) => (
      <React.Fragment>
          <CardHeader title={title} />
          <Divider classes={{root: classes.divider}}/>
          <CardContent style={{flexGrow: 1, overflowY: "auto", padding: 0}}>
            <List dense component="div" role="list" style={{padding:0, width: "100%"}}>
              {items.map((value) => {
                const labelId = `transfer-list-item-${value.id}-label`;
                return (
                  <ListItem style={{padding:0}} key={value.id} role="listitem" button onClick={handleToggle(value)}>
                    <ListItemIcon>
                      <Checkbox
                        checked={checked.indexOf(value) !== -1}
                        tabIndex={-1}
                        disableRipple
                        inputProps={{ 'aria-labelledby': labelId }}
                      />
                    </ListItemIcon>
                    <ListItemText id={labelId} primary={value.display} />
                  </ListItem>
                );
              })}
              <ListItem />
            </List>
          </CardContent>
      </React.Fragment>
    );
    const handleChange = (event) => {
      setSelectedFeature(event.target.value);
    };
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Task Multiple {callback.payload.payloadtype.name} Callbacks at Once</DialogTitle>
        <DialogContent dividers={true} style={{height: "100%", display: "flex", flexDirection: "column", position: "relative",  maxHeight: "100%"}}>
        <div style={{display: "flex", flexDirection: "row", overflowY: "auto", flexGrow: 1, minHeight: 0}}>
          <div  style={{paddingLeft: 0, flexGrow: 1,  marginLeft: 0, marginRight: "10px", position: "relative",  overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {customList("Callbacks Not Being Tasked", left)}
          </div>
            <div style={{display: "flex", flexDirection: "column", justifyContent: "center"}}>
              <Button
                variant="outlined"
                size="small"
                className={classes.button}
                onClick={handleAllRight}
                disabled={left.length === 0}
                aria-label="move all right"
              >
                &gt;&gt;
              </Button>
              <Button
                variant="outlined"
                size="small"
                className={classes.button}
                onClick={handleCheckedRight}
                disabled={leftChecked.length === 0}
                aria-label="move selected right"
              >
                &gt;
              </Button>
              <Button
                variant="outlined"
                size="small"
                className={classes.button}
                onClick={handleCheckedLeft}
                disabled={rightChecked.length === 0}
                aria-label="move selected left"
              >
                &lt;
              </Button>
              <Button
                variant="outlined"
                size="small"
                className={classes.button}
                onClick={handleAllLeft}
                disabled={right.length === 0}
                aria-label="move all left"
              >
                &lt;&lt;
              </Button>
 
          </div>
          <div  style={{marginLeft: "10px", position: "relative", flexGrow: 1, display: "flex", flexDirection: "column" }}>
            {customList("Callbacks To Task", right)}
          </div>
        </div>
        
        <Grid item xs={12} >
            <pre>
              {"The following capabilities are loaded into all of the selected callbacks. Select one to issue mass tasking."}
            </pre>
            <InputLabel ref={inputRef}>Supported Commands</InputLabel>
            <Select
              labelId="demo-dialog-select-label"
              id="demo-dialog-select"
              value={selectedFeature}
              onChange={handleChange}
              disabled={featureOptions.length === 0}
              variant="filled"
              input={<Input style={{maxWidth: "100%"}}/>}
            >
              {featureOptions.map( (opt) => (
                  <MenuItem value={opt} key={opt.id}><b>{opt.command.cmd}</b> - {opt.command.description}</MenuItem>
              ) )}
            </Select>
          
        </Grid>
        </DialogContent>
        {openTaskingButton && 
            <TaskFromUIButton cmd={taskingData.current?.cmd} 
                callback_id={taskingData?.current?.callback_id || 0} 
                parameters={taskingData.current?.parameters || ""}
                openDialog={taskingData.current?.openDialog || false}
                tasking_location={taskingData.current?.tasking_location || "command_line"}
                dontShowSuccessDialog={taskingData.current?.dontShowSuccessDialog || false}
                onTasked={onTasked}/>
        }  
        {openProgressIndicator &&
          <Dialog
            open={openProgressIndicator}
            onClose={() => {setOpenProgressIndicator(false)}}
            scroll="paper"
            fullWidth={true}
            aria-labelledby="scroll-dialog-title"
            aria-describedby="scroll-dialog-description"
          >
              <DialogContent>
                {progress === totalToTask.current ? (
                  "Complete!"
                ) : (
                  "Issuing tasks..."
                )}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress variant="determinate" value={normalize(progress)} valueBuffer={progress + 1} />
                  </Box>
                    <Typography style={{width: "5rem"}} variant="body2" color="text.secondary">{progress} / {totalToTask.current} </Typography>
                </Box>
              </DialogContent>
          </Dialog>
          
        }
        <DialogActions>
          <Button onClick={onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button onClick={submitTasking} variant="contained" color="warning">
            Task
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

