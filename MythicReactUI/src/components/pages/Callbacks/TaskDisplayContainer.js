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
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import {downloadFileFromMemory} from '../../utilities/Clipboard';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import html2canvas from 'html2canvas';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import CodeOffIcon from '@mui/icons-material/CodeOff';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {b64DecodeUnicode} from './ResponseDisplay';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import {EventTriggerContextSelectDialog} from "../Eventing/EventTriggerContextSelect";
import PlayCircleFilledTwoToneIcon from '@mui/icons-material/PlayCircleFilledTwoTone';

const ReissueTaskMutationGQL = gql`
mutation reissueTaskMutation($task_id: Int!){
  reissueTask(task_id: $task_id){
    status
    error
  }
}
`;
const ReissueTaskHandlerMutationGQL = gql`
mutation reissueTaskHandlerMutation($task_id: Int!){
  reissueTaskHandler(task_id: $task_id){
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

const responseActionClass = (tone = "info") => {
  return `mythic-response-action-button mythic-response-action-hover-${tone}`;
};
const responseMenuItemClass = (tone = "info") => {
  return `mythic-response-action-menu-item mythic-response-action-hover-${tone}`;
};

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
            <Grid size={12}>
              <TaskActionsToolbarGeneric toggleViewBrowserScript={toggleViewBrowserScript}
              toggleSelectAllOutput={toggleSelectAllOutput} 
              toggleOpenSearch={toggleOpenSearch} 
              taskData={task} 
              me={me}
              responseRef={responseRef}
              viewBrowserScript={viewBrowserScript}
              viewAllOutput={selectAllOutput}/>
            </Grid>
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
        <div style={{height: "100%", minWidth: 0, overflow: "hidden", position: "relative", display: "flex", width: "100%"}}>
          <div style={{display: "flex", flex: "1 1 auto", height: "100%", minWidth: 0, overflow: "hidden"}}>
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
          </div>
          <div style={{flex: "0 0 30px", height: "100%", minWidth: "30px", overflow: "hidden", zIndex: 2}}>
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
            if(data.reissueTask.status === "success"){
                snackActions.success("Successfully re-issued task to Mythic");
            }else{
                snackActions.error("Failed to re-issue task to Mythic: " + data.reissueTask.error);
            }
        },
        onError: data => {
            console.log(data);
            snackActions.error("Failed to re-issue task: " + data);
        }
    });
    const [reissueTaskHandler] = useMutation(ReissueTaskHandlerMutationGQL, {
        onCompleted: data => {
            if(data.reissueTaskHandler.status === "success"){
                snackActions.success("Successfully resubmitted task for handling");
            }else{
                snackActions.warning("Failed to resubmit task for handling: " + data.reissueTaskHandler.error);
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
            {openTaskTagDialog && <MythicDialog fullWidth={true} maxWidth="lg" open={openTaskTagDialog}
                               onClose={()=>{setOpenTaskTagDialog(false);}}
                               innerDialog={<ViewEditTagsDialog me={me} target_object={"task_id"} target_object_id={task.id} onClose={()=>{setOpenTaskTagDialog(false);}} />}
                />
            }
            {openCommentDialog && <MythicDialog fullWidth={true} maxWidth="md" open={openCommentDialog}
                               onClose={()=>{setOpenCommentDialog(false);}}
                               innerDialog={<TaskCommentDialog task_id={task.id} onClose={()=>{setOpenCommentDialog(false);}} />}
                />
            }
            {openParametersDialog && <MythicDialog fullWidth={true} maxWidth="lg" open={openParametersDialog}
                               onClose={()=>{setOpenParametersDialog(false);}}
                               innerDialog={<TaskViewParametersDialog task_id={task.id} onClose={()=>{setOpenParametersDialog(false);}} />}
                />
            }
            {openTokenDialog && <MythicDialog fullWidth={true} maxWidth="md" open={openTokenDialog}
                               onClose={()=>{setOpenTokenDialog(false);}}
                               innerDialog={<TaskTokenDialog token_id={task.token === undefined ? 0 : task.token.id} onClose={()=>{setOpenTokenDialog(false);}} />}
                />
            }
            {openOpsecDialog.open && <MythicDialog fullWidth={true} maxWidth="lg" open={openOpsecDialog.open}
                               onClose={()=>{setOpenOpsecDialog({...openOpsecDialog, open: false});}}
                               innerDialog={<TaskOpsecDialog task_id={task.id} view={openOpsecDialog.view} onClose={()=>{setOpenOpsecDialog({...openOpsecDialog, open: false});}} />}
                />
            }

            {openStdoutStderrDialog && <MythicDialog fullWidth={true} maxWidth="lg" open={openStdoutStderrDialog}
                               onClose={()=>{setOpenStdoutStderrDialog(false);}}
                               innerDialog={<TaskViewStdoutStderrDialog task_id={task.id} onClose={()=>{setOpenStdoutStderrDialog(false);}} />}
                />
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
            <Paper className="mythic-response-side-actions" elevation={5} style={{width: "30px", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden",
                backgroundColor: "transparent", height: "100%"}}>
                <MythicStyledTooltip title={"Toggle BrowserScript"} >
                    <IconButton className={responseActionClass(viewBrowserScript ? "danger" : "success")} onClick={toggleViewBrowserScript} size="small">
                        {viewBrowserScript ? <CodeOffIcon fontSize="small" /> : <CodeIcon fontSize="small" />}
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={viewAllOutput ? "View Paginated Output" : "View All Output"}>
                    <IconButton className={responseActionClass(viewAllOutput ? "danger" : "success")} onClick={toggleSelectAllOutput} size="small">
                        {viewAllOutput ? <CloseFullscreenIcon fontSize="small" /> : <FontAwesomeIcon icon={faExpandArrowsAlt} size="sm" />}
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Search Output"}>
                    <IconButton className={responseActionClass("info")} onClick={toggleOpenSearch} size="small">
                        <SearchIcon fontSize="small" />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Download output"}>
                    <IconButton className={responseActionClass("success")} onClick={onDownloadResponses} size="small">
                        <GetAppIcon fontSize="small" />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Download screenshot of output"}>
                    <IconButton className={responseActionClass("success")} onClick={onDownloadImageClickPng} size="small">
                        <InsertPhotoIcon fontSize="small" />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Edit Tags"}>
                    <IconButton className={responseActionClass("info")} onClick={()=>{setOpenTaskTagDialog(true)}} size="small">
                        <LocalOfferOutlinedIcon fontSize="small" />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Open Task in New Window"}>
                    <IconButton className={responseActionClass("info")} onClick={()=> {window.open('/new/task/' + task.display_id, "_blank")}} size="small">
                        <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Copy original params to clipboard"}>
                    <IconButton className={responseActionClass("info")} onClick={copyToClipboard} size="small">
                        <FileCopyOutlinedIcon fontSize="small" />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Edit Comment"}>
                    <IconButton className={responseActionClass("info")} onClick={()=>{setOpenCommentDialog(true)}} size="small">
                        <RateReviewOutlinedIcon fontSize="small" />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"View All Parameters And Timestamps"}>
                    <IconButton className={responseActionClass("info")} onClick={()=>{setOpenParametersDialog(true);}} size="small">
                        <KeyboardIcon fontSize="small" />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"View Stdout/Stderr of Task"}>
                    <IconButton className={responseActionClass("danger")} onClick={()=>{setOpenStdoutStderrDialog(true);}} size="small">
                        <FontAwesomeIcon icon={faExclamationTriangle} size="sm" />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Trigger Eventing Based on Task"}>
                    <IconButton className={responseActionClass("info")} onClick={()=>{onTriggerEventing();}} size="small">
                        <PlayCircleFilledTwoToneIcon fontSize="small" />
                    </IconButton>
                </MythicStyledTooltip>
                {task.opsec_pre_blocked === null ? null : (  task.opsec_pre_bypassed === false ? (
                        <MythicStyledTooltip title={"Submit OPSEC PreCheck Bypass Request"}>
                            <IconButton className={responseActionClass("danger")} onClick={()=>{setOpenOpsecDialog({open: true, view: "pre"})}} size="small">
                                <LockIcon fontSize="small" />
                            </IconButton>
                        </MythicStyledTooltip>
                    ): (
                    <MythicStyledTooltip title={"View OPSEC PreCheck Data"}>
                        <IconButton className={responseActionClass("success")} onClick={()=>{setOpenOpsecDialog({open: true, view: "pre"})}} size="small">
                            <LockOpenIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                    )
                )
                }
                {task.opsec_post_blocked === null ? null : (  task.opsec_post_bypassed === false ? (
                        <MythicStyledTooltip title={"Submit OPSEC PostCheck Bypass Request"}>
                            <IconButton className={responseActionClass("danger")} onClick={()=>{setOpenOpsecDialog({open: true, view: "post"})}} size="small">
                                <LockIcon fontSize="small" />
                            </IconButton>
                        </MythicStyledTooltip>
                    ): (
                    <MythicStyledTooltip title={"View OPSEC PostCheck Data"}>
                        <IconButton className={responseActionClass("success")} onClick={()=>{setOpenOpsecDialog({open: true, view: "post"})}} size="small">
                            <LockOpenIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                    )
                )
                }
                {task.token === null ? null : (
                    <MythicStyledTooltip title={"View Token Information"}>
                        <IconButton className={responseActionClass("info")} onClick={()=>{setOpenTokenDialog(true)}} size="small">
                            <ConfirmationNumberIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                )}
                {task.status.toLowerCase().includes("error: container") &&
                    <MythicStyledTooltip title={"Resubmit Tasking"}>
                        <IconButton className={responseActionClass("warning")} onClick={onReissueTask} size="small">
                            <ReplayIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                }
                {task.status.toLowerCase().includes("error: task") &&
                    <MythicStyledTooltip title={"Resubmit Task Handler"}>
                        <IconButton className={responseActionClass("warning")} onClick={onReissueTaskHandler} size="small">
                            <ReplayIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                }
            </Paper>
        </div>
    )
}
const TaskActionsToolbarGeneric = ({toggleViewBrowserScript, toggleSelectAllOutput,
                                   toggleOpenSearch, taskData, viewAllOutput, me,
                                   responseRef, viewBrowserScript}) => {
  const theme = useTheme();
  const [task, setTask] = React.useState(taskData || {});
  const eventingDataRef = React.useRef({name: "", value: 0});
  const [openEventingDialog, setOpenEventingDialog] = React.useState(false);
  const [actionsMenuAnchor, setActionsMenuAnchor] = React.useState(null);
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
  const openActionsMenu = (event) => {
    setActionsMenuAnchor(event.currentTarget);
  };
  const closeActionsMenu = () => {
    setActionsMenuAnchor(null);
  };
  const onDownloadResponses = () => {
    downloadResponses({variables: {task_id: task.id}});
    closeActionsMenu();
  };
  const copyToClipboard = () => {
    let command = task?.command?.cmd || task.command_name;
    let result = copyStringToClipboard(command + " " + task.original_params);
    if(result){
      snackActions.success("Copied text!");
    }else{
      snackActions.error("Failed to copy text");
    }
    closeActionsMenu();
  };
  const [reissueTask] = useMutation(ReissueTaskMutationGQL, {
    onCompleted: data => {
      if(data.reissueTask.status === "success"){
        snackActions.success("Successfully re-issued task to Mythic");
      }else{
        snackActions.error("Failed to re-issue task to Mythic: " + data.reissueTask.error);
      }
    },
    onError: data => {
      console.log(data);
      snackActions.error("Failed to re-issue task: " + data);
    }
  });
  const [reissueTaskHandler] = useMutation(ReissueTaskHandlerMutationGQL, {
    onCompleted: data => {
      if(data.reissueTaskHandler.status === "success"){
        snackActions.success("Successfully resubmitted task for handling");
      }else{
        snackActions.warning("Failed to resubmit task for handling: " + data.reissueTaskHandler.error);
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
    closeActionsMenu();
  };
  const onReissueTask = () => {
    reissueTask({variables: {task_id: task.id}});
    closeActionsMenu();
  }
  const onReissueTaskHandler = () => {
    reissueTaskHandler({variables: {task_id: task.id}});
    closeActionsMenu();
  }
  const onTriggerEventing = () => {
      eventingDataRef.current = {
          name: "task_id",
          value: task.id
      };
      setOpenEventingDialog(true);
      closeActionsMenu();
  }
  return (
      <React.Fragment>
        {openTaskTagDialog && <MythicDialog fullWidth={true} maxWidth="lg" open={openTaskTagDialog}
                           onClose={()=>{setOpenTaskTagDialog(false);}}
                           innerDialog={<ViewEditTagsDialog me={me} target_object={"task_id"} target_object_id={task.id} onClose={()=>{setOpenTaskTagDialog(false);}} />}
            />
        }
        {openCommentDialog && <MythicDialog fullWidth={true} maxWidth="md" open={openCommentDialog}
                           onClose={()=>{setOpenCommentDialog(false);}}
                           innerDialog={<TaskCommentDialog task_id={task.id} onClose={()=>{setOpenCommentDialog(false);}} />}
            />
        }
        {openParametersDialog && <MythicDialog fullWidth={true} maxWidth="lg" open={openParametersDialog}
                           onClose={()=>{setOpenParametersDialog(false);}}
                           innerDialog={<TaskViewParametersDialog task_id={task.id} onClose={()=>{setOpenParametersDialog(false);}} />}
            />
        }
        {openTokenDialog && <MythicDialog fullWidth={true} maxWidth="md" open={openTokenDialog}
                           onClose={()=>{setOpenTokenDialog(false);}}
                           innerDialog={<TaskTokenDialog token_id={task.token === undefined ? 0 : task.token.id} onClose={()=>{setOpenTokenDialog(false);}} />}
            />
        }
        {openOpsecDialog.open && <MythicDialog fullWidth={true} maxWidth="lg" open={openOpsecDialog.open}
                           onClose={()=>{setOpenOpsecDialog({...openOpsecDialog, open: false});}}
                           innerDialog={<TaskOpsecDialog task_id={task.id} view={openOpsecDialog.view} onClose={()=>{setOpenOpsecDialog({...openOpsecDialog, open: false});}} />}
            />
        }

        {openStdoutStderrDialog && <MythicDialog fullWidth={true} maxWidth="lg" open={openStdoutStderrDialog}
                           onClose={()=>{setOpenStdoutStderrDialog(false);}}
                           innerDialog={<TaskViewStdoutStderrDialog task_id={task.id} onClose={()=>{setOpenStdoutStderrDialog(false);}} />}
            />
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
        <Paper className="mythic-response-actions-toolbar" elevation={0} sx={{
          alignItems: "center",
          backgroundColor: theme.surfaces?.muted || theme.palette.background.default,
          borderLeft: 0,
          borderRight: 0,
          borderTop: 0,
          borderRadius: 0,
          display: "flex",
          gap: 0.5,
          minHeight: 36,
          overflowX: "auto",
          px: 1,
          py: 0.5,
        }}>
          <MythicStyledTooltip title={"Toggle BrowserScript"}>
            <IconButton className={responseActionClass(viewBrowserScript ? "danger" : "success")} size="small" onClick={toggleViewBrowserScript}>
              {viewBrowserScript ? <CodeOffIcon fontSize="small" /> : <CodeIcon fontSize="small" />}
            </IconButton>
          </MythicStyledTooltip>
          <MythicStyledTooltip title={viewAllOutput ? "View Paginated Output" : "View All Output"}>
            <IconButton className={responseActionClass(viewAllOutput ? "danger" : "success")} size="small" onClick={toggleSelectAllOutput}>
              {viewAllOutput ? <CloseFullscreenIcon fontSize="small" /> : <FontAwesomeIcon icon={faExpandArrowsAlt} size="sm" />}
            </IconButton>
          </MythicStyledTooltip>
          <MythicStyledTooltip title={"Search Output"}>
            <IconButton className={responseActionClass("info")} size="small" onClick={toggleOpenSearch}>
              <SearchIcon fontSize="small" />
            </IconButton>
          </MythicStyledTooltip>
          <MythicStyledTooltip title={"Download output"}>
            <IconButton className={responseActionClass("success")} size="small" onClick={onDownloadResponses}>
              <GetAppIcon fontSize="small" />
            </IconButton>
          </MythicStyledTooltip>
          <MythicStyledTooltip title={"Download screenshot of output"}>
            <IconButton className={responseActionClass("success")} size="small" onClick={onDownloadImageClickPng}>
              <InsertPhotoIcon fontSize="small" />
            </IconButton>
          </MythicStyledTooltip>
          <MythicStyledTooltip title={"More response actions"}>
            <IconButton className={responseActionClass("info")} size="small" onClick={openActionsMenu}>
              <MoreHorizIcon fontSize="small" />
            </IconButton>
          </MythicStyledTooltip>
          <Menu anchorEl={actionsMenuAnchor}
                open={Boolean(actionsMenuAnchor)}
                onClose={closeActionsMenu}
                anchorOrigin={{vertical: "bottom", horizontal: "right"}}
                transformOrigin={{vertical: "top", horizontal: "right"}}
                MenuListProps={{className: "mythic-response-action-menu"}}>
            <MenuItem className={responseMenuItemClass("info")} onClick={()=>{setOpenTaskTagDialog(true);closeActionsMenu();}}>
              <ListItemIcon><LocalOfferOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Edit Tags</ListItemText>
            </MenuItem>
            <MenuItem className={responseMenuItemClass("info")} onClick={()=> {window.open('/new/task/' + task.display_id, "_blank");closeActionsMenu();}}>
              <ListItemIcon><FontAwesomeIcon icon={faExternalLinkAlt} size="sm" /></ListItemIcon>
              <ListItemText>Open Task in New Window</ListItemText>
            </MenuItem>
            <MenuItem className={responseMenuItemClass("info")} onClick={copyToClipboard}>
              <ListItemIcon><FileCopyOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Copy original params</ListItemText>
            </MenuItem>
            <MenuItem className={responseMenuItemClass("info")} onClick={()=>{setOpenCommentDialog(true);closeActionsMenu();}}>
              <ListItemIcon><RateReviewOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Edit Comment</ListItemText>
            </MenuItem>
            <MenuItem className={responseMenuItemClass("info")} onClick={()=>{setOpenParametersDialog(true);closeActionsMenu();}}>
              <ListItemIcon><KeyboardIcon fontSize="small" /></ListItemIcon>
              <ListItemText>View Parameters And Timestamps</ListItemText>
            </MenuItem>
            <MenuItem className={responseMenuItemClass("danger")} onClick={()=>{setOpenStdoutStderrDialog(true);closeActionsMenu();}}>
              <ListItemIcon><FontAwesomeIcon icon={faExclamationTriangle} size="sm" /></ListItemIcon>
              <ListItemText>View Stdout/Stderr</ListItemText>
            </MenuItem>
            <MenuItem className={responseMenuItemClass("info")} onClick={onTriggerEventing}>
              <ListItemIcon><PlayCircleFilledTwoToneIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Trigger Eventing Based on Task</ListItemText>
            </MenuItem>
            {(task.opsec_pre_blocked !== null || task.opsec_post_blocked !== null || task.token !== null ||
              task.status.toLowerCase().includes("error: container") || task.status.toLowerCase().includes("error: task")) &&
              <Divider />
            }
            {task.opsec_pre_blocked !== null && (
              <MenuItem className={responseMenuItemClass(task.opsec_pre_bypassed === false ? "danger" : "success")} onClick={()=>{setOpenOpsecDialog({open: true, view: "pre"});closeActionsMenu();}}>
                <ListItemIcon>
                  {task.opsec_pre_bypassed === false ?
                    <LockIcon fontSize="small" /> :
                    <LockOpenIcon fontSize="small" />
                  }
                </ListItemIcon>
                <ListItemText>{task.opsec_pre_bypassed === false ? "Submit OPSEC PreCheck Bypass Request" : "View OPSEC PreCheck Data"}</ListItemText>
              </MenuItem>
            )}
            {task.opsec_post_blocked !== null && (
              <MenuItem className={responseMenuItemClass(task.opsec_post_bypassed === false ? "danger" : "success")} onClick={()=>{setOpenOpsecDialog({open: true, view: "post"});closeActionsMenu();}}>
                <ListItemIcon>
                  {task.opsec_post_bypassed === false ?
                    <LockIcon fontSize="small" /> :
                    <LockOpenIcon fontSize="small" />
                  }
                </ListItemIcon>
                <ListItemText>{task.opsec_post_bypassed === false ? "Submit OPSEC PostCheck Bypass Request" : "View OPSEC PostCheck Data"}</ListItemText>
              </MenuItem>
            )}
            {task.token !== null && (
              <MenuItem className={responseMenuItemClass("info")} onClick={()=>{setOpenTokenDialog(true);closeActionsMenu();}}>
                <ListItemIcon><ConfirmationNumberIcon fontSize="small" /></ListItemIcon>
                <ListItemText>View Token Information</ListItemText>
              </MenuItem>
            )}
            {task.status.toLowerCase().includes("error: container") && (
              <MenuItem className={responseMenuItemClass("warning")} onClick={onReissueTask}>
                <ListItemIcon><ReplayIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Resubmit Tasking</ListItemText>
              </MenuItem>
            )}
            {task.status.toLowerCase().includes("error: task") && (
              <MenuItem className={responseMenuItemClass("warning")} onClick={onReissueTaskHandler}>
                <ListItemIcon><ReplayIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Resubmit Task Handler</ListItemText>
              </MenuItem>
            )}
          </Menu>
        </Paper>
      </React.Fragment>

  )
}
