import React, {useEffect} from 'react';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import GetAppIcon from '@mui/icons-material/GetApp';
import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined';
import {ResponseDisplay, ResponseDisplayConsole} from './ResponseDisplay';
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
import SpeedDialAction from '@mui/material/SpeedDialAction';
import { Backdrop } from '@mui/material';
import {downloadFileFromMemory} from '../../utilities/Clipboard';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import html2canvas from 'html2canvas';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import CodeOffIcon from '@mui/icons-material/CodeOff';
import SettingsTwoToneIcon from '@mui/icons-material/SettingsTwoTone';
import {b64DecodeUnicode} from './ResponseDisplay';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import {EventTriggerContextSelectDialog} from "../Eventing/EventTriggerContextSelect";
import PlayCircleFilledTwoToneIcon from '@mui/icons-material/PlayCircleFilledTwoTone';

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

export const TaskDisplayContainer = ({task, me}) => {
    const [viewBrowserScript, setViewBrowserScript] = React.useState(true);
    const [commandID, setCommandID] = React.useState(0);
    const [searchOutput, setSearchOutput] = React.useState(false);
    const [selectAllOutput, setSelectAllOutput] = React.useState(false);
    const responseRef = React.useRef(null);
    useEffect( () => {
        setCommandID(task.command === null ? 0 : task.command.id);
    }, [task.command?.id]);
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
      <>
        <Grid container spacing={0} style={{width: "100%"}}>
            <SpeedDialDisplayGeneric toggleViewBrowserScript={toggleViewBrowserScript}
              toggleSelectAllOutput={toggleSelectAllOutput} 
              toggleOpenSearch={toggleOpenSearch} 
              taskData={task} 
              me={me}
              responseRef={responseRef}
              viewBrowserScript={viewBrowserScript}
              style={{position: "relative", zIndex: 2, display: "flex", flexDirection: "row-reverse", width: '100%',
                bottom: "25px", right: "4px", height: 0}}
              fabStyle={{   }}
              viewAllOutput={selectAllOutput}/>
            <Grid size={12}>
              <ResponseDisplay
                task={task} 
                me={me}
                command_id={commandID} 
                viewBrowserScript={viewBrowserScript} 
                searchOutput={searchOutput}
                responseRef={responseRef}
                selectAllOutput={selectAllOutput}/>
            </Grid>
        </Grid>
      </>
    );
}
export const TaskDisplayContainerFlat = ({task, me}) => {
  const [viewBrowserScript, setViewBrowserScript] = React.useState(true);
  const [commandID, setCommandID] = React.useState(0);
  const [searchOutput, setSearchOutput] = React.useState(false);
  const [selectAllOutput, setSelectAllOutput] = React.useState(false);
  const responseRef = React.useRef(null);
  useEffect( () => {
    setCommandID(task.command === null ? 0 : task.command.id);
    setSearchOutput(false);
    setSelectAllOutput(false);
    setViewBrowserScript(true);
  }, [task.command?.id, task.id]);
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
        <div style={{ height: "100%", position: "relative", display: "flex",  overflowY: "auto", justifyContent: "flex-end" }}>
            <ResponseDisplay
                key={task.id}
                task={task}
                me={me}
                command_id={commandID}
                viewBrowserScript={viewBrowserScript}
                searchOutput={searchOutput}
                selectAllOutput={selectAllOutput}
                expand={true}
                responseRef={responseRef}
            />
          <SideDisplayGeneric toggleViewBrowserScript={toggleViewBrowserScript}
                                toggleSelectAllOutput={toggleSelectAllOutput}
                                toggleOpenSearch={toggleOpenSearch}
                                taskData={task}
                                viewBrowserScript={viewBrowserScript}
                                me={me} responseRef={responseRef}
                                style={{position: "absolute", bottom: "15px", zIndex: 2}}
                                fabStyle={{  }}
                                viewAllOutput={selectAllOutput}/>
        </div>

  )
}
export const TaskDisplayContainerConsole = ({task, me}) => {
  const [viewBrowserScript, setViewBrowserScript] = React.useState(true);
  const [commandID, setCommandID] = React.useState(task?.command?.id || 0);
  const [searchOutput, setSearchOutput] = React.useState(false);
  const responseRef = React.useRef(null);
  useEffect( () => {
    setCommandID(task.command === null ? 0 : task.command.id);
  }, [task.command?.id]);

  return (
      <>
            <ResponseDisplayConsole
                task={task}
                me={me}
                command_id={commandID}
                viewBrowserScript={viewBrowserScript}
                searchOutput={searchOutput}
                responseRef={responseRef}
                selectAllOutput={true}/>
      </>
  );
}

const SideDisplayGeneric = ({toggleViewBrowserScript, toggleSelectAllOutput,
                                     toggleOpenSearch, taskData, viewAllOutput, me,
                                     responseRef, viewBrowserScript}) => {
    const theme = useTheme();
    const [task, setTask] = React.useState(taskData || {});
    const eventingDataRef = React.useRef({name: "", value: 0});
    const [openEventingDialog, setOpenEventingDialog] = React.useState(false);
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
        },
        onError: (data) => {

        }
    });
    React.useEffect( () => {
        setTask(taskData);
    }, [taskData.id, taskData.token, taskData.original_params, taskData.opsec_pre_blocked, taskData.opsec_pre_bypassed, taskData.opsec_post_blocked, taskData.opsec_post_bypassed])
    const onDownloadResponses = () => {
        downloadResponses({variables: {task_id: task.id}});
    };
    const copyToClipboard = () => {
        let command = task?.command?.cmd || task.command_name;
        let result = copyStringToClipboard(command + " " + task.original_params);
        if(result){
            snackActions.success("Copied text!");
        }else{
            snackActions.error("Failed to copy text");
        }
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
    const onDownloadImageClickPng = () => {
        // we calculate a transform for the nodes so that all nodes are visible
        // we then overwrite the transform of the `.react-flow__viewport` element
        // with the style option of the html-to-image library
        snackActions.info("Saving image to png...");
        (async () => {
            const canvas = await html2canvas(responseRef.current);
            const image = canvas.toDataURL("image/png", 1.0);
            const fakeLink = window.document.createElement("a");
            fakeLink.style = "display:none;";
            fakeLink.download = "task_output.png";

            fakeLink.href = image;

            document.body.appendChild(fakeLink);
            fakeLink.click();
            document.body.removeChild(fakeLink);

            fakeLink.remove();

        })();
    };
    const onReissueTask = () => {
        reissueTask({variables: {task_id: task.id}});
    }
    const onReissueTaskHandler = () => {
        reissueTaskHandler({variables: {task_id: task.id}});
    }
    const onTriggerEventing = () => {
        eventingDataRef.current = {
            name: "task_id",
            value: task.id
        };
        setOpenEventingDialog(true);
    }
    return (
        <div style={{height: "100%"}}>
            {openTaskTagDialog ?
                (<MythicDialog fullWidth={true} maxWidth="lg" open={openTaskTagDialog}
                               onClose={()=>{setOpenTaskTagDialog(false);}}
                               innerDialog={<ViewEditTagsDialog me={me} target_object={"task_id"} target_object_id={task.id} onClose={()=>{setOpenTaskTagDialog(false);}} />}
                />) : null}
            {openCommentDialog ?
                (<MythicDialog fullWidth={true} maxWidth="lg" open={openCommentDialog}
                               onClose={()=>{setOpenCommentDialog(false);}}
                               innerDialog={<TaskCommentDialog task_id={task.id} onClose={()=>{setOpenCommentDialog(false);}} />}
                />) : null
            }
            {openParametersDialog ?
                (<MythicDialog fullWidth={true} maxWidth="lg" open={openParametersDialog}
                               onClose={()=>{setOpenParametersDialog(false);}}
                               innerDialog={<TaskViewParametersDialog task_id={task.id} onClose={()=>{setOpenParametersDialog(false);}} />}
                />) : null
            }
            {openTokenDialog ?
                (<MythicDialog fullWidth={true} maxWidth="md" open={openTokenDialog}
                               onClose={()=>{setOpenTokenDialog(false);}}
                               innerDialog={<TaskTokenDialog token_id={task.token === undefined ? 0 : task.token.id} onClose={()=>{setOpenTokenDialog(false);}} />}
                />) : null
            }
            {openOpsecDialog.open ?
                (<MythicDialog fullWidth={true} maxWidth="md" open={openOpsecDialog.open}
                               onClose={()=>{setOpenOpsecDialog({...openOpsecDialog, open: false});}}
                               innerDialog={<TaskOpsecDialog task_id={task.id} view={openOpsecDialog.view} onClose={()=>{setOpenOpsecDialog({...openOpsecDialog, open: false});}} />}
                />) : null
            }

            {openStdoutStderrDialog ?
                (<MythicDialog fullWidth={true} maxWidth="lg" open={openStdoutStderrDialog}
                               onClose={()=>{setOpenStdoutStderrDialog(false);}}
                               innerDialog={<TaskViewStdoutStderrDialog task_id={task.id} onClose={()=>{setOpenStdoutStderrDialog(false);}} />}
                />) : null
            }
            {openEventingDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="xl"
                    open={openEventingDialog}
                    onClose={() => {setOpenEventingDialog(false);}}
                    innerDialog={
                        <EventTriggerContextSelectDialog onClose={() => {setOpenEventingDialog(false);}}
                                                         triggerContext={eventingDataRef.current}
                        />
                    }
                />
            }
            <Paper elevation={5} style={{width: "30px", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden",
                backgroundColor: "transparent", height: "100%"}}>
                <MythicStyledTooltip title={"Toggle BrowserScript"} >
                    <IconButton onClick={toggleViewBrowserScript} style={{paddingBottom: "3px"}}>
                        {viewBrowserScript ? <CodeOffIcon color={"error"} /> : <CodeIcon color={"success"}/>}
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={viewAllOutput ? "View Paginated Output" : "View All Output"}>
                    <IconButton onClick={toggleSelectAllOutput} style={{paddingBottom: "3px"}}>
                        {viewAllOutput ? <CloseFullscreenIcon color={"error"} /> : <FontAwesomeIcon style={{color: theme.palette.success.main}} icon={faExpandArrowsAlt} size="sm" />}
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Search Output"}>
                    <IconButton onClick={toggleOpenSearch} style={{paddingBottom: "3px"}}>
                        <SearchIcon color={"info"} />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Download output"}>
                    <IconButton onClick={onDownloadResponses} style={{paddingBottom: "3px"}}>
                        <GetAppIcon color={"success"}/>
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Download screenshot of output"}>
                    <IconButton onClick={onDownloadImageClickPng} style={{paddingBottom: "3px"}}>
                        <InsertPhotoIcon/>
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Edit Tags"}>
                    <IconButton onClick={()=>{setOpenTaskTagDialog(true)}} style={{paddingBottom: "3px"}}>
                        <LocalOfferOutlinedIcon/>
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Open Task in New Window"}>
                    <IconButton onClick={()=> {window.open('/new/task/' + task.display_id, "_blank")}} style={{paddingBottom: "3px"}}>
                        <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Copy original params to clipboard"}>
                    <IconButton onClick={copyToClipboard} style={{paddingBottom: "3px"}}>
                        <FileCopyOutlinedIcon/>
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Edit Comment"}>
                    <IconButton onClick={()=>{setOpenCommentDialog(true)}} style={{paddingBottom: "3px"}}>
                        <RateReviewOutlinedIcon/>
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"View All Parameters And Timestamps"}>
                    <IconButton onClick={()=>{setOpenParametersDialog(true);}} style={{paddingBottom: "3px"}}>
                        <KeyboardIcon/>
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"View Stdout/Stderr of Task"}>
                    <IconButton onClick={()=>{setOpenStdoutStderrDialog(true);}} style={{paddingBottom: "3px"}}>
                        <FontAwesomeIcon style={{color: theme.palette.error.main}} icon={faExclamationTriangle} size="sm" />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Trigger Eventing Based on Task"}>
                    <IconButton onClick={()=>{onTriggerEventing();}} style={{paddingBottom: "3px"}}>
                        <PlayCircleFilledTwoToneIcon />
                    </IconButton>
                </MythicStyledTooltip>
                {task.opsec_pre_blocked === null ? null : (  task.opsec_pre_bypassed === false ? (
                        <MythicStyledTooltip title={"Submit OPSEC PreCheck Bypass Request"}>
                            <IconButton onClick={()=>{setOpenOpsecDialog({open: true, view: "pre"})}} style={{paddingBottom: "3px"}}>
                                <LockIcon style={{color: theme.palette.error.main}}/>
                            </IconButton>
                        </MythicStyledTooltip>
                    ): (
                    <MythicStyledTooltip title={"View OPSEC PreCheck Data"}>
                        <IconButton onClick={()=>{setOpenOpsecDialog({open: true, view: "pre"})}} style={{paddingBottom: "3px"}}>
                            <LockOpenIcon style={{color: theme.palette.success.main}}/>
                        </IconButton>
                    </MythicStyledTooltip>
                    )
                )
                }
                {task.opsec_post_blocked === null ? null : (  task.opsec_post_bypassed === false ? (
                        <MythicStyledTooltip title={"Submit OPSEC PostCheck Bypass Request"}>
                            <IconButton onClick={()=>{setOpenOpsecDialog({open: true, view: "post"})}} style={{paddingBottom: "3px"}}>
                                <LockIcon style={{color: theme.palette.error.main}}/>
                            </IconButton>
                        </MythicStyledTooltip>
                    ): (
                    <MythicStyledTooltip title={"View OPSEC PostCheck Data"}>
                        <IconButton onClick={()=>{setOpenOpsecDialog({open: true, view: "post"})}} style={{paddingBottom: "3px"}}>
                            <LockOpenIcon style={{color: theme.palette.success.main}}/>
                        </IconButton>
                    </MythicStyledTooltip>
                    )
                )
                }
                {task.token === null ? null : (
                    <MythicStyledTooltip title={"View Token Information"}>
                        <IconButton onClick={()=>{setOpenTokenDialog(true)}} style={{paddingBottom: "3px"}}>
                            <ConfirmationNumberIcon />
                        </IconButton>
                    </MythicStyledTooltip>
                )}
                {task.status.toLowerCase().includes("error: container") &&
                    <MythicStyledTooltip title={"Resubmit Tasking"}>
                        <IconButton onClick={onReissueTask} style={{paddingBottom: "3px"}}>
                            <ReplayIcon style={{color: theme.palette.warning.main}}/>
                        </IconButton>
                    </MythicStyledTooltip>
                }
                {task.status.toLowerCase().includes("error: task") &&
                    <MythicStyledTooltip title={"Resubmit Task Handler"}>
                        <IconButton onClick={onReissueTaskHandler} style={{paddingBottom: "3px"}}>
                            <ReplayIcon style={{color: theme.palette.warning.main}}/>
                        </IconButton>
                    </MythicStyledTooltip>
                }
            </Paper>
        </div>
    )
}
const SpeedDialDisplayGeneric = ({toggleViewBrowserScript, toggleSelectAllOutput,
                                   toggleOpenSearch, taskData, viewAllOutput, me,
                                   responseRef, style, fabStyle, viewBrowserScript}) => {
  const theme = useTheme();
  const [task, setTask] = React.useState(taskData || {});
  const eventingDataRef = React.useRef({name: "", value: 0});
  const [openEventingDialog, setOpenEventingDialog] = React.useState(false);
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
    let command = task?.command?.cmd || task.command_name;
    let result = copyStringToClipboard(command + " " + task.original_params);
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
  const onDownloadImageClickPng = () => {
    // we calculate a transform for the nodes so that all nodes are visible
    // we then overwrite the transform of the `.react-flow__viewport` element
    // with the style option of the html-to-image library
    snackActions.info("Saving image to png...");
    (async () => {
      const canvas = await html2canvas(responseRef.current);
      const image = canvas.toDataURL("image/png", 1.0);
      const fakeLink = window.document.createElement("a");
      fakeLink.style = "display:none;";
      fakeLink.download = "task_output.png";

      fakeLink.href = image;

      document.body.appendChild(fakeLink);
      fakeLink.click();
      document.body.removeChild(fakeLink);

      fakeLink.remove();

    })();
  };
  const onReissueTask = () => {
    reissueTask({variables: {task_id: task.id}});
  }
  const onReissueTaskHandler = () => {
    reissueTaskHandler({variables: {task_id: task.id}});
  }
  const onTriggerEventing = () => {
      eventingDataRef.current = {
          name: "task_id",
          value: task.id
      };
      setOpenEventingDialog(true);
  }
  return (
      <React.Fragment>
        <Backdrop open={openSpeedDial} onClick={()=>{setOpenSpeedDial(false);}} style={{zIndex: 2, position: "absolute"}}/>
        {openTaskTagDialog ?
            (<MythicDialog fullWidth={true} maxWidth="lg" open={openTaskTagDialog}
                           onClose={()=>{setOpenTaskTagDialog(false);}}
                           innerDialog={<ViewEditTagsDialog me={me} target_object={"task_id"} target_object_id={task.id} onClose={()=>{setOpenTaskTagDialog(false);}} />}
            />) : null}
        {openCommentDialog ?
            (<MythicDialog fullWidth={true} maxWidth="lg" open={openCommentDialog}
                           onClose={()=>{setOpenCommentDialog(false);}}
                           innerDialog={<TaskCommentDialog task_id={task.id} onClose={()=>{setOpenCommentDialog(false);}} />}
            />) : null
        }
        {openParametersDialog ?
            (<MythicDialog fullWidth={true} maxWidth="lg" open={openParametersDialog}
                           onClose={()=>{setOpenParametersDialog(false);}}
                           innerDialog={<TaskViewParametersDialog task_id={task.id} onClose={()=>{setOpenParametersDialog(false);}} />}
            />) : null
        }
        {openTokenDialog ?
            (<MythicDialog fullWidth={true} maxWidth="md" open={openTokenDialog}
                           onClose={()=>{setOpenTokenDialog(false);}}
                           innerDialog={<TaskTokenDialog token_id={task.token === undefined ? 0 : task.token.id} onClose={()=>{setOpenTokenDialog(false);}} />}
            />) : null
        }
        {openOpsecDialog.open ?
            (<MythicDialog fullWidth={true} maxWidth="md" open={openOpsecDialog.open}
                           onClose={()=>{setOpenOpsecDialog({...openOpsecDialog, open: false});}}
                           innerDialog={<TaskOpsecDialog task_id={task.id} view={openOpsecDialog.view} onClose={()=>{setOpenOpsecDialog({...openOpsecDialog, open: false});}} />}
            />) : null
        }

        {openStdoutStderrDialog ?
            (<MythicDialog fullWidth={true} maxWidth="lg" open={openStdoutStderrDialog}
                           onClose={()=>{setOpenStdoutStderrDialog(false);}}
                           innerDialog={<TaskViewStdoutStderrDialog task_id={task.id} onClose={()=>{setOpenStdoutStderrDialog(false);}} />}
            />) : null
        }
      {openEventingDialog &&
          <MythicDialog
              fullWidth={true}
              maxWidth="xl"
              open={openEventingDialog}
              onClose={() => {setOpenEventingDialog(false);}}
              innerDialog={
                  <EventTriggerContextSelectDialog onClose={() => {setOpenEventingDialog(false);}}
                                                   triggerContext={eventingDataRef.current}
                  />
              }
          />
      }
        <SpeedDial
            ariaLabel="Task Speeddial"
            icon={<SettingsTwoToneIcon fontSize={"large"} />}
            style={{...style}}
            onClick={()=>{setOpenSpeedDial(!openSpeedDial)}}
            FabProps={{...fabStyle, color: "secondary",  size: "small", sx: {minHeight: "30px", height: "30px", width: "30px"}}}
            open={openSpeedDial}
            direction="right"
        >
          <SpeedDialAction
              icon={viewBrowserScript ? <CodeOffIcon color={"error"} /> : <CodeIcon color={"success"}/>}
              arrow
              tooltipPlacement={"top"}
              tooltipTitle={"Toggle BrowserScript"}
              onClick={() => {toggleViewBrowserScript();setOpenSpeedDial(false);}}
          />
          <SpeedDialAction
              icon={viewAllOutput ? <CloseFullscreenIcon color={"error"} /> : <FontAwesomeIcon style={{color: theme.palette.success.main}} icon={faExpandArrowsAlt} size="lg" />}
              arrow
              tooltipPlacement={"top"}
              tooltipTitle={viewAllOutput ? "View Paginated Output" : "View All Output"}
              onClick={() => {toggleSelectAllOutput();setOpenSpeedDial(false);}}
          />
          <SpeedDialAction
              icon={<SearchIcon color={"info"} />}
              arrow
              tooltipPlacement={"top"}
              tooltipTitle={"Search Output"}
              onClick={() => {toggleOpenSearch();setOpenSpeedDial(false);}}
          />
          <SpeedDialAction
              icon={<GetAppIcon color={"success"}/>}
              arrow
              tooltipPlacement={"top"}
              tooltipTitle={"Download output"}
              onClick={onDownloadResponses}
          />
          <SpeedDialAction
              icon={<InsertPhotoIcon/>}
              arrow
              tooltipPlacement={"top"}
              tooltipTitle={"Download screenshot of output"}
              onClick={onDownloadImageClickPng}
          />
          <SpeedDialAction
              icon={<LocalOfferOutlinedIcon/>}
              arrow
              tooltipPlacement={"top"}
              tooltipTitle={"Edit Tags"}
              onClick={()=>{setOpenTaskTagDialog(true);setOpenSpeedDial(false);}}
          />
          <SpeedDialAction
              icon={<FontAwesomeIcon icon={faExternalLinkAlt} size="lg" />}
              arrow
              tooltipPlacement={"top"}
              tooltipTitle={"Open Task in New Window"}
              onClick={()=> {window.open('/new/task/' + task.display_id, "_blank")}}
          />
          <SpeedDialAction
              icon={<FileCopyOutlinedIcon/>}
              arrow
              tooltipPlacement={"top"}
              tooltipTitle={"Copy original params to clipboard"}
              onClick={copyToClipboard}
          />
          <SpeedDialAction
              icon={<RateReviewOutlinedIcon/>}
              arrow
              tooltipPlacement={"top"}
              tooltipTitle={"Edit Comment"}
              onClick={()=>{setOpenCommentDialog(true);setOpenSpeedDial(false);}}
          />
          <SpeedDialAction
              icon={<KeyboardIcon/>}
              arrow
              tooltipPlacement={"top"}
              tooltipTitle={"View All Parameters And Timestamps"}
              onClick={()=>{setOpenParametersDialog(true);setOpenSpeedDial(false);}}
          />
          <SpeedDialAction
              icon={<FontAwesomeIcon style={{color: theme.palette.error.main}} icon={faExclamationTriangle} size="lg" />}
              arrow
              tooltipPlacement={"top"}
              tooltipTitle={"View Stdout/Stderr of Task"}
              onClick={()=>{setOpenStdoutStderrDialog(true);setOpenSpeedDial(false);}}
          />
        <SpeedDialAction
            icon={<PlayCircleFilledTwoToneIcon />}
            arrow
            tooltipPlacement={"top"}
            tooltipTitle={"Trigger Eventing Based on Task"}
            onClick={()=>{onTriggerEventing();setOpenSpeedDial(false);}}
            />
          {task.opsec_pre_blocked === null ? null : (  task.opsec_pre_bypassed === false ? (
                  <SpeedDialAction
                      icon={<LockIcon style={{color: theme.palette.error.main}}/>}
                      arrow
                      tooltipPlacement={"top"}
                      tooltipTitle={"Submit OPSEC PreCheck Bypass Request"}
                      onClick={()=>{setOpenOpsecDialog({open: true, view: "pre"});setOpenSpeedDial(false);}}
                  />
              ): (
                  <SpeedDialAction
                      icon={<LockOpenIcon style={{color: theme.palette.success.main}}/>}
                      arrow
                      tooltipPlacement={"top"}
                      tooltipTitle={"View OPSEC PreCheck Data"}
                      onClick={()=>{setOpenOpsecDialog({open: true, view: "pre"});setOpenSpeedDial(false);}}
                  />
              )
          )
          }
          {task.opsec_post_blocked === null ? null : (  task.opsec_post_bypassed === false ? (
                  <SpeedDialAction
                      icon={<LockIcon style={{color: theme.palette.error.main}}/>}
                      arrow
                      tooltipPlacement={"top"}
                      tooltipTitle={"Submit OPSEC PostCheck Bypass Request"}
                      onClick={()=>{setOpenOpsecDialog({open: true, view: "post"});setOpenSpeedDial(false);}}
                  />
              ): (
                  <SpeedDialAction
                      icon={<LockOpenIcon style={{color: theme.palette.success.main}}/>}
                      arrow
                      tooltipPlacement={"top"}
                      tooltipTitle={"View OPSEC PostCheck Data"}
                      onClick={()=>{setOpenOpsecDialog({open: true, view: "post"});setOpenSpeedDial(false);}}
                  />
              )
          )
          }
          {task.token === null ? null : (
              <SpeedDialAction
                  icon={<ConfirmationNumberIcon />}
                  arrow
                  tooltipPlacement={"top"}
                  tooltipTitle={"View Token Information"}
                  onClick={()=>{setOpenTokenDialog(true);setOpenSpeedDial(false);}}
              />
          )}
          {task.status.toLowerCase().includes("error: container") ? (
              <SpeedDialAction
                  icon={<ReplayIcon style={{color: theme.palette.warning.main}}/>}
                  arrow
                  tooltipPlacement={"top"}
                  tooltipTitle={"Resubmit Tasking"}
                  onClick={onReissueTask}
              />
          ) : null}
          {task.status.toLowerCase().includes("error: task") ? (
              <SpeedDialAction
                  icon={<ReplayIcon style={{color: theme.palette.warning.main}}/>}
                  arrow
                  tooltipPlacement={"top"}
                  tooltipTitle={"Resubmit Task Handler"}
                  onClick={onReissueTaskHandler}
              />
          ):null}
        </SpeedDial>
      </React.Fragment>

  )
}