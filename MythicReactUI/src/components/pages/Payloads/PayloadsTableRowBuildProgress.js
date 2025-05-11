import React from 'react';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HideSourceIcon from '@mui/icons-material/HideSource';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableContainer from '@mui/material/TableContainer';

export function PayloadsTableRowBuildProgress(props){
    const [buildProgressData, setBuildProgressData] = React.useState({
        "phase": "primary",
        "total_steps": 0,
        "current_step": 0,
        "current_step_name": "",
        "buffer_step": 0,
        "current_step_percent": 0,
        "buffer_step_percent": 0
    });
    const [openStatusDialog, setOpenStatusDialog] = React.useState(false);
    const [displayData, setDisplayData] = React.useState({});
    React.useEffect( () => {
        let newBuildData = {
            "phase": "primary",
            "total_steps": 0,
            "current_step": 0,
            "current_step_name": "",
            "buffer_step": 0,
            "current_step_percent": 0,
            "buffer_step_percent": 0
        };
        newBuildData.total_steps = props.payload_build_steps.length;
        if(props.payload_build_steps.length === 0){
            newBuildData.phase = props.build_phase;
        }
        // loop through the steps and see which ones don't have an end_time
        let maxUnfinishedStepNum = -1;
        let erroredOut = false;
        for(let i = props.payload_build_steps.length -1; i >= 0; i--){
            if(props.payload_build_steps[i].end_time === null){
                // this one hasn't finished
                // this is the next unfinished step
                maxUnfinishedStepNum = i;
            } else {
                if(!props.payload_build_steps[i].step_success){
                    newBuildData.phase = "error";
                    newBuildData.current_step = i;
                    newBuildData.current_step_name = "Error: " +  props.payload_build_steps[i].step_name;
                    newBuildData.buffer_step = 0;
                    erroredOut = true;
                    // since we start at 0 for the step numbers, we need to increment current_step and buffer_step by one
                    newBuildData.current_step += 1;
                    newBuildData.buffer_step += 1;
                    break;
                }
            }
        }
        if(maxUnfinishedStepNum < 0){
            // all steps are finished and no errors
            newBuildData.phase = props.build_phase;
            newBuildData.current_step_name = "";
            if(newBuildData.total_steps === 0){
                newBuildData.total_steps =1;
                newBuildData.current_step_name = props.build_phase;
            }
            newBuildData.current_step = newBuildData.total_steps;
            newBuildData.buffer_step = newBuildData.total_steps;
        } else if(!erroredOut) {
            // there's at least one unfinished state
            newBuildData.current_step = maxUnfinishedStepNum;
            newBuildData.buffer_step = newBuildData.current_step + 1;
            newBuildData.current_step_name = props.payload_build_steps[newBuildData.current_step].step_name;
        }
        setBuildProgressData(newBuildData);
    }, [props.payload_build_steps])
    const buildStepClick = (step) => {
        setDisplayData({...step, current_step: buildProgressData.current_step});
        setOpenStatusDialog(true);
    }
    const getButton = (step) => {
        if(step.step_skip){
            return <HideSourceIcon style={{cursor: "pointer", filter: "grayscale(1)", opacity: 0.3}} onClick={() => buildStepClick(step)}/>
        }
        if(step.end_time === null){
            // this will either be the current step or a future step
            if(step.start_time === null){
                // this we have no info on it, so it's just waiting
                return <PanoramaFishEyeIcon style={{cursor: "pointer", filter: "grayscale(1)", opacity: 0.3}} onClick={() => buildStepClick(step)} />
            } else {
                if(props.build_phase === "building"){
                    return <TimelapseIcon style={{cursor: "pointer"}} color="info" onClick={() => buildStepClick(step)}/>
                } else {
                    return <HideSourceIcon style={{cursor: "pointer", filter: "grayscale(1)", opacity: 0.3}} color={"info"} onClick={() => buildStepClick(step)}/>
                }
            }
        } else if(step.step_success) {
            return <CheckCircleOutlineIcon style={{cursor: "pointer"}} color="success" onClick={() => buildStepClick(step)}/>
        } else {
            return <HighlightOffIcon style={{cursor: "pointer"}} color="error" onClick={() => buildStepClick(step)}/>
        }
    }
    return (
        <span style={props.build_phase === "success" ? {
            filter: "grayscale(1)",
            opacity: 0.5} : {}}>
            {buildProgressData.total_steps > 0 &&
                    props.payload_build_steps.map( step => (
                        <MythicStyledTooltip title={step.step_name} key={"buildstep" + step.step_number}>
                            {getButton(step)}
                        </MythicStyledTooltip>
                    ))
                }
                {openStatusDialog &&
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openStatusDialog} 
                        onClose={()=>{setOpenStatusDialog(false);}} 
                        innerDialog={<PayloadBuildStepStatusDialog step={displayData} onClose={()=>{setOpenStatusDialog(false);}} />}
                    />
                }
        </span>
    );
}

export function PayloadBuildStepStatusDialog(props) {  
    const [duration, setDuration] = React.useState("");
    React.useEffect( () => {
        if(props.step.end_time !== null){
            let start = new Date(props.step.start_time);
            let end = new Date(props.step.end_time);
            let difference = Math.abs(start - end) / 1000;
            let result = "";
            let days = Math.floor(difference / 86400);
            let hours = Math.floor(difference / 3600) % 24;
            let minutes = Math.floor(difference / 60) % 60;
            let seconds = Math.floor(difference % 60);
            if(days > 0){result += days + " days "}
            if(hours > 0){result += hours + " hours "}
            if(minutes > 0){result += minutes + " min "}
            if(seconds > 0){result += seconds + " s"}
            if(result === ""){
                result = "< 1 s";
            }
            setDuration(result);
        }
    }, [props.step.start_time, props.step.end_time]);
    const getStatusMessage = () => {
        if(props.step.step_skip){
            return "Skipped"
        } else if (props.step.current_step === props.step.step_number) {
            return "Running...";
        } else if(props.step.end_time === null) {
            return "Waiting to run...";
        } else if(props.step.step_success){
            return "Success";
        } else {
            return "Error";
        }
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Step {props.step.step_number + 1} - {props.step.step_name}</DialogTitle>
            <TableContainer className="mythicElement">
                <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{width: "30%"}}>Parameter</TableCell>
                            <TableCell >Value</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody style={{whiteSpace: "pre"}}> 
                        <TableRow hover>
                            <TableCell>Step Start Time</TableCell>
                            <TableCell>{props.step.start_time}</TableCell>
                        </TableRow>
                        <TableRow hover>
                            <TableCell>Step End Time</TableCell>
                            <TableCell>{props.step.end_time}</TableCell>
                        </TableRow>
                        <TableRow hover>
                            <TableCell>Duration</TableCell>
                            <TableCell>{duration}</TableCell>
                        </TableRow>
                        <TableRow hover>
                            <TableCell>Status</TableCell>
                            <TableCell> {getStatusMessage()}
                            </TableCell>
                        </TableRow>
                        <TableRow hover>
                            <TableCell>Step Output</TableCell>
                            <TableCell>{props.step.step_stdout}</TableCell>
                        </TableRow>
                        <TableRow hover>
                            <TableCell>Step Error</TableCell>
                            <TableCell>{props.step.step_stderr}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
       
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

export function PayloadsTableRowBuildProcessPerStep(props){
    const [buildProgressData, setBuildProgressData] = React.useState({
        "phase": "primary",
        "total_steps": 0,
        "current_step": 0,
        "current_step_name": "",
        "buffer_step": 0,
        "current_step_percent": 0,
        "buffer_step_percent": 0
    });
    const [openStatusDialog, setOpenStatusDialog] = React.useState(false);
    const [displayData, setDisplayData] = React.useState({});
    React.useEffect( () => {
        let newBuildData = {
            "phase": "primary",
            "total_steps": 0,
            "current_step": 0,
            "current_step_name": "",
            "buffer_step": 0,
            "current_step_percent": 0,
            "buffer_step_percent": 0
        };
        newBuildData.total_steps = props.payload_build_steps.length;
        if(props.payload_build_steps.length === 0){
            newBuildData.phase = props.build_phase;
        }
        // loop through the steps and see which ones don't have an end_time
        let maxUnfinishedStepNum = -1;
        let erroredOut = false;
        for(let i = props.payload_build_steps.length -1; i >= 0; i--){
            if(props.payload_build_steps[i].end_time === null){
                // this one hasn't finished
                // this is the next unfinished step
                maxUnfinishedStepNum = i;
            } else {
                if(!props.payload_build_steps[i].step_success){
                    newBuildData.phase = "error";
                    newBuildData.current_step = i;
                    newBuildData.current_step_name = "Error: " +  props.payload_build_steps[i].step_name;
                    newBuildData.buffer_step = 0;
                    erroredOut = true;
                    // since we start at 0 for the step numbers, we need to increment current_step and buffer_step by one
                    newBuildData.current_step += 1;
                    newBuildData.buffer_step += 1;
                    break;
                }
            }
        }
        if(maxUnfinishedStepNum < 0){
            // all steps are finished and no errors
            newBuildData.phase = props.build_phase;
            newBuildData.current_step_name = "";
            if(newBuildData.total_steps === 0){
                newBuildData.total_steps =1;
                newBuildData.current_step_name = props.build_phase;
            }
            newBuildData.current_step = newBuildData.total_steps;
            newBuildData.buffer_step = newBuildData.total_steps;
        } else if(!erroredOut) {
            // there's at least one unfinished state
            newBuildData.current_step = maxUnfinishedStepNum;
            newBuildData.buffer_step = newBuildData.current_step + 1;
            newBuildData.current_step_name = props.payload_build_steps[newBuildData.current_step].step_name;
        }
        setBuildProgressData(newBuildData);
    }, [props.payload_build_steps])
    const buildStepClick = (step) => {
        setDisplayData({...step, current_step: buildProgressData.current_step});
        setOpenStatusDialog(true);
    }
    const getButton = (step) => {
        if(step.step_skip){
            return <HideSourceIcon style={{cursor: "pointer"}} color="info" onClick={() => buildStepClick(step)}/>
        }
        if(step.end_time === null){
            // this will either be the current step or a future step
            if(step.start_time === null){
                // this we have no info on it, so it's just waiting
                return <PanoramaFishEyeIcon style={{cursor: "pointer"}} onClick={() => buildStepClick(step)} />
            } else {
                if(props.build_status === "building"){
                    return <TimelapseIcon style={{cursor: "pointer"}} color="info" onClick={() => buildStepClick(step)}/>
                } else {
                    return <HideSourceIcon style={{cursor: "pointer"}} color="info" onClick={() => buildStepClick(step)}/>
                }
            }
        } else if(step.step_success) {
            return <CheckCircleOutlineIcon style={{cursor: "pointer"}} color="success" onClick={() => buildStepClick(step)}/>
        } else {
            return <HighlightOffIcon style={{cursor: "pointer"}} color="error" onClick={() => buildStepClick(step)}/>
        }
    }
    return (
        <React.Fragment>
            {buildProgressData.total_steps > 0 ? (
                <React.Fragment>
                    {props.payload_build_steps.map( step => (
                        step.step_number === props.step_number ? (
                            <React.Fragment key={"buildstep" + step.step_number}>{getButton(step)}</React.Fragment>
                        ) : null
                        
                    ))}
                </React.Fragment>
                ) : null}
            {openStatusDialog &&
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openStatusDialog} 
                        onClose={()=>{setOpenStatusDialog(false);}} 
                        innerDialog={<PayloadBuildStepStatusDialog step={displayData} onClose={()=>{setOpenStatusDialog(false);}} />}
                    />
                }
        </React.Fragment>
    );
}
