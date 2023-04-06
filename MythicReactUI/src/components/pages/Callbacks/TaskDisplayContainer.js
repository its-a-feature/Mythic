import React, {useEffect} from 'react';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import GetAppIcon from '@mui/icons-material/GetApp';
import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined';
import {ResponseDisplay} from './ResponseDisplay';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {TaskCommentDialog} from './TaskCommentDialog';
import {ViewEditTagsDialog} from '../../MythicComponents/MythicTag';
import {useTheme} from '@mui/material/styles';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import {TaskOpsecDialog} from './TaskOpsecDialog';
import {TaskViewParametersDialog} from './TaskViewParametersDialog';
import {TaskViewStdoutStderrDialog} from './TaskViewStdoutStderrDialog';
import {snackActions} from '../../utilities/Snackbar';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import CodeIcon from '@mui/icons-material/Code';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import {TaskTokenDialog} from './TaskTokenDialog';
import Grid from '@mui/material/Grid';
import ReplayIcon from '@mui/icons-material/Replay';
import {gql, useMutation, useLazyQuery } from '@apollo/client';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faExclamationTriangle} from '@fortawesome/free-solid-svg-icons';
import { faExternalLinkAlt, faExpandArrowsAlt } from '@fortawesome/free-solid-svg-icons';
import SearchIcon from '@mui/icons-material/Search';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import makeStyles from '@mui/styles/makeStyles';
import { Backdrop } from '@mui/material';
import {downloadFileFromMemory} from '../../utilities/Clipboard';

const ReissueTaskMutationGQL = gql`
mutation reissueTaskMutation($task_id: Int!){
  reissue_task(task_id: $task_id){
    status
    error
  }
}
`;
const ReissueTaskHandlerMutationGQL = gql`
mutation reissueTaskHandlerMutation($task_id: Int!){
  reissue_task_handler(task_id: $task_id){
    status
    error
  }
}
`;
const getAllResponsesLazyQuery = gql`
query subResponsesQuery($task_id: Int!) {
  response(where: {task_id: {_eq: $task_id}}, order_by: {id: asc}) {
    id
    response: response_text
  }
}`;

const useStyles = makeStyles((theme) => ({
  root: {
    transform: 'translateZ(0px)',
    flexGrow: 1,
  },
  speedDial: {
    position: 'absolute',
    '&.MuiSpeedDial-directionUp, &.MuiSpeedDial-directionLeft': {
      top: theme.spacing(2),
      right: theme.spacing(2),
    },
    '&.MuiSpeedDial-directionDown, &.MuiSpeedDial-directionRight': {
      bottom: theme.spacing(1),
      left: theme.spacing(2),
    },
    zIndex: 3
  },
  tooltip: {
    backgroundColor: theme.palette.background.contrast,
    color: theme.palette.text.contrast,
    boxShadow: theme.shadows[1],
    fontSize: 13
  },
  arrow: {
    color: theme.palette.background.contrast,
  }
}));

export const TaskDisplayContainer = ({task, me}) => {
    const [viewBrowserScript, setViewBrowserScript] = React.useState(true);
    const [commandID, setCommandID] = React.useState(0);
    const [searchOutput, setSearchOutput] = React.useState(false);
    const [selectAllOutput, setSelectAllOutput] = React.useState(false);
    useEffect( () => {
        setCommandID(task.command === null ? 0 : task.command.id);
    }, [task.command]);
    const toggleViewBrowserScript = React.useCallback( () => {
      setViewBrowserScript(!viewBrowserScript);
    }, [viewBrowserScript]);
    const toggleSelectAllOutput = React.useCallback( () => {
      setSelectAllOutput(!selectAllOutput);
    }, [selectAllOutput]);
    const toggleOpenSearch = React.useCallback( () => {
      setSearchOutput(!searchOutput);
    }, [searchOutput]);
    
    return (
      <React.Fragment>
        <Grid container spacing={0} style={{maxWidth: "100%"}}>
            <SpeedDialDisplay toggleViewBrowserScript={toggleViewBrowserScript} 
              toggleSelectAllOutput={toggleSelectAllOutput} 
              toggleOpenSearch={toggleOpenSearch} 
              taskData={task} 
              me={me}
              viewAllOutput={selectAllOutput}/>
            <Grid item xs={12}>
              <ResponseDisplay 
                task={task} 
                me={me}
                command_id={commandID} 
                viewBrowserScript={viewBrowserScript} 
                searchOutput={searchOutput} 
                selectAllOutput={selectAllOutput}/>
            </Grid>
        </Grid>
      </React.Fragment>
				          
    )
}


// the base64 decode function to handle unicode was pulled from the following stack overflow post
// https://stackoverflow.com/a/30106551
function b64DecodeUnicode(str) {
  // Going backwards: from bytestream, to percent-encoding, to original string.
  //console.log("decoding", str);
  try{
    return decodeURIComponent(window.atob(str));
  }catch(error){
    //console.log("Failed to base64 decode response", error)
    return atob(str);
  }
  
}
const SpeedDialDisplay = ({toggleViewBrowserScript, toggleSelectAllOutput, toggleOpenSearch, taskData, viewAllOutput, me}) => {
  const tooltipPlacement = "top";
  const theme = useTheme();
  const classes = useStyles();
  const [task, setTask] = React.useState(taskData || {});
  const [openSpeedDial, setOpenSpeedDial] = React.useState(false);
  const [openTaskTagDialog, setOpenTaskTagDialog] = React.useState(false);
  const [openCommentDialog, setOpenCommentDialog] = React.useState(false);
  const [openParametersDialog, setOpenParametersDialog] = React.useState(false);
  const [openTokenDialog, setOpenTokenDialog] = React.useState(false);
  const [openStdoutStderrDialog, setOpenStdoutStderrDialog] = React.useState(false);
  const [openOpsecDialog, setOpenOpsecDialog] = React.useState({open: false, view: "pre"});
  const [downloadResponses] = useLazyQuery(getAllResponsesLazyQuery, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
        const output = data.response.reduce( (prev, cur) => {
          return prev + b64DecodeUnicode(cur.response);
        }, b64DecodeUnicode(""));
        downloadFileFromMemory(output, "task_" + task.id + ".txt");
        /*
        const dataBlob = new Blob([output], {type: 'application/octet-stream'});
        const ele = document.getElementById("download_config");
        if(ele !== null){
          ele.href = URL.createObjectURL(dataBlob);
          ele.download = "task_" + task.id + ".txt";
          ele.click();
        }else{
          const element = document.createElement("a");
          element.id = "download_config";
          element.href = URL.createObjectURL(dataBlob);
          element.download = "task_" + task.id + ".txt";
          document.body.appendChild(element);
          element.click();
        }
        */
    },
    onError: (data) => {

    }
  });
  React.useEffect( () => {
    setTask(taskData);
  }, [taskData.id, taskData.token, taskData.original_params, taskData.opsec_pre_blocked, taskData.opsec_pre_bypassed, taskData.opsec_post_blocked, taskData.opsec_post_bypassed])
  const onDownloadResponses = () => {
    downloadResponses({variables: {task_id: task.id}});
    setOpenSpeedDial(false);
  };
  const copyToClipboard = () => {
    let result = copyStringToClipboard(task.original_params);
    if(result){
      snackActions.success("Copied text!");
    }else{
      snackActions.error("Failed to copy text");
    }
    setOpenSpeedDial(false);
  };
  const [reissueTask] = useMutation(ReissueTaskMutationGQL, {
    onCompleted: data => {
      if(data.reissue_task.status === "success"){
        snackActions.success("Successfully re-issued task to Mythic");
      }else{
        snackActions.error("Failed to re-issue task to Mythic: " + data.reissue_task.error);
      }
    },  
    onError: data => {
      console.log(data);
      snackActions.error("Failed to re-issue task: " + data);
    }
  });
  const [reissueTaskHandler] = useMutation(ReissueTaskHandlerMutationGQL, {
    onCompleted: data => {
      if(data.reissue_task_handler.status === "success"){
        snackActions.success("Successfully resubmitted task for handling");
      }else{
        snackActions.warning("Failed to resubmit task for handling: " + data.reissue_task_handler.error);
      }
      
    },
    onError: data => {
      console.log(data);
      snackActions.error("Error resubmitting task for handling: " + data);
    }
  });
  
  const onReissueTask = () => {
    reissueTask({variables: {task_id: task.id}});
  }
  const onReissueTaskHandler = () => {
    reissueTaskHandler({variables: {task_id: task.id}});
  }
  return (
    <React.Fragment>
      <Backdrop open={openSpeedDial} onClick={()=>{setOpenSpeedDial(false);}} style={{zIndex: 2, position: "absolute"}}/>
      {openTaskTagDialog ?
        (<MythicDialog fullWidth={true} maxWidth="md" open={openTaskTagDialog} 
          onClose={()=>{setOpenTaskTagDialog(false);}} 
          innerDialog={<ViewEditTagsDialog me={me} target_object={"task_id"} target_object_id={task.id} onClose={()=>{setOpenTaskTagDialog(false);}} />}
      />) : (null)}
      {openCommentDialog ?
        (<MythicDialog fullWidth={true} maxWidth="md" open={openCommentDialog} 
          onClose={()=>{setOpenCommentDialog(false);}} 
          innerDialog={<TaskCommentDialog task_id={task.id} onClose={()=>{setOpenCommentDialog(false);}} />}
      />) : (null)
      }
      {openParametersDialog ? 
        (<MythicDialog fullWidth={true} maxWidth="md" open={openParametersDialog} 
          onClose={()=>{setOpenParametersDialog(false);}} 
          innerDialog={<TaskViewParametersDialog task_id={task.id} onClose={()=>{setOpenParametersDialog(false);}} />}
      />) : (null)
      }
      {openTokenDialog ? 
        (<MythicDialog fullWidth={true} maxWidth="md" open={openTokenDialog} 
          onClose={()=>{setOpenTokenDialog(false);}} 
          innerDialog={<TaskTokenDialog token_id={task.token === undefined ? 0 : task.token.id} onClose={()=>{setOpenTokenDialog(false);}} />}
      />) : (null)
      }
      {openOpsecDialog.open ?
        (<MythicDialog fullWidth={true} maxWidth="md" open={openOpsecDialog.open} 
          onClose={()=>{setOpenOpsecDialog({...openOpsecDialog, open: false});}} 
          innerDialog={<TaskOpsecDialog task_id={task.id} view={openOpsecDialog.view} onClose={()=>{setOpenOpsecDialog({...openOpsecDialog, open: false});}} />}
      />) : (null)
      }
      
      {openStdoutStderrDialog ? 
        (<MythicDialog fullWidth={true} maxWidth="md" open={openStdoutStderrDialog} 
          onClose={()=>{setOpenStdoutStderrDialog(false);}} 
          innerDialog={<TaskViewStdoutStderrDialog task_id={task.id} onClose={()=>{setOpenStdoutStderrDialog(false);}} />}
      />) : (null)
      }
      <SpeedDial
        ariaLabel="Task Speeddial"
        className={classes.speedDial}
        icon={<SpeedDialIcon />}
        onClick={()=>{setOpenSpeedDial(!openSpeedDial)}}
        FabProps={{ color: "primary", size: "small" }}
        open={openSpeedDial}
        direction="right"
      >
        <SpeedDialAction
          icon={<CodeIcon/>}
          arrow
          TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
          tooltipPlacement={tooltipPlacement}
          tooltipTitle={"Toggle BrowserScript"}
          onClick={() => {toggleViewBrowserScript();setOpenSpeedDial(false);}}
        />
        <SpeedDialAction
          icon={<FontAwesomeIcon icon={faExpandArrowsAlt} size="lg" />}
          arrow
          TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
          tooltipPlacement={tooltipPlacement}
          tooltipTitle={viewAllOutput ? "View Paginated Output" : "View All Output"}
          onClick={() => {toggleSelectAllOutput();setOpenSpeedDial(false);}}
        />
        <SpeedDialAction
          icon={<SearchIcon />}
          arrow
          TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
          tooltipPlacement={tooltipPlacement}
          tooltipTitle={"Search Output"}
          onClick={() => {toggleOpenSearch();setOpenSpeedDial(false);}}
        />
        <SpeedDialAction
          icon={<GetAppIcon/>}
          arrow
          TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
          tooltipPlacement={tooltipPlacement}
          tooltipTitle={"Download output"}
          onClick={onDownloadResponses}
        />
        <SpeedDialAction
          icon={<LocalOfferOutlinedIcon/>}
          arrow
          TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
          tooltipPlacement={tooltipPlacement}
          tooltipTitle={"Edit Tags"}
          onClick={()=>{setOpenTaskTagDialog(true);setOpenSpeedDial(false);}}
        />
        <SpeedDialAction
          icon={<FontAwesomeIcon icon={faExternalLinkAlt} size="lg" />}
          arrow
          TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
          tooltipPlacement={tooltipPlacement}
          tooltipTitle={"Open Task in New Window"}
          onClick={()=> {window.open('/new/task/' + task.id, "_blank")}}
        />
        <SpeedDialAction
          icon={<FileCopyOutlinedIcon/>}
          arrow
          TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
          tooltipPlacement={tooltipPlacement}
          tooltipTitle={"Copy original params to clipboard"}
          onClick={copyToClipboard}
        />
        <SpeedDialAction
          icon={<RateReviewOutlinedIcon/>}
          arrow
          TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
          tooltipPlacement={tooltipPlacement}
          tooltipTitle={"Edit Comment"}
          onClick={()=>{setOpenCommentDialog(true);setOpenSpeedDial(false);}}
        />
        <SpeedDialAction
          icon={<KeyboardIcon/>}
          arrow
          TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
          tooltipPlacement={tooltipPlacement}
          tooltipTitle={"View All Parameters"}
          onClick={()=>{setOpenParametersDialog(true);setOpenSpeedDial(false);}}
        />
        <SpeedDialAction
          icon={<FontAwesomeIcon style={{color: theme.palette.error.main}} icon={faExclamationTriangle} size="lg" />}
          arrow
          TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
          tooltipPlacement={tooltipPlacement}
          tooltipTitle={"View Stdout/Stderr of Task"}
          onClick={()=>{setOpenStdoutStderrDialog(true);setOpenSpeedDial(false);}}
        />
        {task.opsec_pre_blocked === null ? (
          null
        ) : (  task.opsec_pre_bypassed === false ? (
                <SpeedDialAction
                  icon={<LockIcon style={{color: theme.palette.error.main}}/>}
                  arrow
                  TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
                  tooltipPlacement={tooltipPlacement}
                  tooltipTitle={"Submit OPSEC PreCheck Bypass Request"}
                  onClick={()=>{setOpenOpsecDialog({open: true, view: "pre"});setOpenSpeedDial(false);}}
                />
                ): (
                  <SpeedDialAction
                  icon={<LockOpenIcon style={{color: theme.palette.success.main}}/>}
                  arrow
                  TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
                  tooltipPlacement={tooltipPlacement}
                  tooltipTitle={"View OPSEC PreCheck Data"}
                  onClick={()=>{setOpenOpsecDialog({open: true, view: "pre"});setOpenSpeedDial(false);}}
                />
                )             
          ) 
        }
        {task.opsec_post_blocked === null ? (
          null
        ) : (  task.opsec_post_bypassed === false ? (
                <SpeedDialAction
                  icon={<LockIcon style={{color: theme.palette.error.main}}/>}
                  arrow
                  TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
                  tooltipPlacement={tooltipPlacement}
                  tooltipTitle={"Submit OPSEC PostCheck Bypass Request"}
                  onClick={()=>{setOpenOpsecDialog({open: true, view: "post"});setOpenSpeedDial(false);}}
                />
                ): (
                  <SpeedDialAction
                    icon={<LockOpenIcon style={{color: theme.palette.success.main}}/>}
                    arrow
                    TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
                    tooltipPlacement={tooltipPlacement}
                    tooltipTitle={"View OPSEC PostCheck Data"}
                    onClick={()=>{setOpenOpsecDialog({open: true, view: "post"});setOpenSpeedDial(false);}}
                  />
                )             
          ) 
        }
        {task.token === null ? (
          null
        ) : (
            <SpeedDialAction
              icon={<ConfirmationNumberIcon />}
              arrow
              TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
              tooltipPlacement={tooltipPlacement}
              tooltipTitle={"View Token Information"}
              onClick={()=>{setOpenTokenDialog(true);setOpenSpeedDial(false);}}
            />
        )}
        {task.status.toLowerCase().includes("error: container") ? (
          <SpeedDialAction
            icon={<ReplayIcon style={{color: theme.palette.warning.main}}/>}
            arrow
            TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
            tooltipPlacement={tooltipPlacement}
            tooltipTitle={"Resubmit Tasking"}
            onClick={onReissueTask}
          />
        ) : (null)}
        {task.status.toLowerCase().includes("error: task") ? (
          <SpeedDialAction
            icon={<ReplayIcon style={{color: theme.palette.warning.main}}/>}
            arrow
            TooltipClasses={{tooltip: classes.tooltip, arrow: classes.arrow}}
            tooltipPlacement={tooltipPlacement}
            tooltipTitle={"Resubmit Task Handler"}
            onClick={onReissueTaskHandler}
          />
        ):(null)}
        
    </SpeedDial>
    </React.Fragment>
    
  )
}