import React, {useEffect, useLayoutEffect, useRef} from 'react';
import { styled } from '@mui/material/styles';
import {IconButton, Link} from '@mui/material';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {getSkewedNow, toLocalTime, toLocalTimeShort} from '../../utilities/Time';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import Badge from '@mui/material/Badge';
import {useTheme} from '@mui/material/styles';
import {gql, useSubscription } from '@apollo/client';
import {TaskDisplayContainer, TaskDisplayContainerConsole} from './TaskDisplayContainer';
import {TagsDisplay} from '../../MythicComponents/MythicTag';
import {taskingDataFragment} from './CallbackMutations';
import {GetMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import PlayCircleFilledTwoToneIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import CropRotateTwoToneIcon from '@mui/icons-material/CropRotateTwoTone';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {operatorSettingDefaults} from "../../../cache";
import {TaskFromUIButton} from "./TaskFromUIButton";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faSkullCrossbones} from '@fortawesome/free-solid-svg-icons';
// Icons for console-view display
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ComputerIcon from '@mui/icons-material/Computer';
import PublicIcon from '@mui/icons-material/Public';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NumbersIcon from '@mui/icons-material/Numbers';


const PREFIX = 'TaskDisplay';
const ACCORDION_PREFIX = 'TaskDisplayAccordion';
export const classes = {
  root: `${PREFIX}-root`,
  heading: `${PREFIX}-heading`,
  secondaryHeading: `${PREFIX}-secondaryHeading`,
  taskAndTimeDisplay: `${PREFIX}-taskAndTimeDisplay`,
  secondaryHeadingExpanded: `${PREFIX}-secondaryHeadingExpanded`,
  icon: `${PREFIX}-icon`,
  details: `${PREFIX}-details`,
  column: `${PREFIX}-column`
};
export const accordionClasses = {
  root: `${ACCORDION_PREFIX}-root`,
  content: `${ACCORDION_PREFIX}-content`,
  expandIcon: `${ACCORDION_PREFIX}-expandIcon`,
  expanded: `${ACCORDION_PREFIX}-expanded`,
  details: `${ACCORDION_PREFIX}-details`,
  detailsRoot: `${ACCORDION_PREFIX}Details-root`
}

export const StyledPaper = styled(Paper)((
  {
    theme
  }
) => ({
  [`&.${classes.root}`]: {
    marginTop: "3px",
    marginRight: "0px",
    height: "auto",
    width: "99%",
    boxShadow: "unset",
    backgroundColor: theme.palette.background.default + "CC",
  },

  [`& .${classes.heading}`]: {
    fontSize: theme.typography.pxToRem(15),
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: "2",
    WebkitBoxOrient: "vertical",
    cursor: "default",
    wordBreak: "break-all",
    //color: theme.taskPromptTextColor,
  },
  [`& .${classes.secondaryHeading}`]: {
    fontSize: theme.typography.pxToRem(15),
    //color: theme.taskPromptTextColor,
    overflow: "auto",
    display: "block",
    textOverflow: "ellipsis",
    wordBreak: "break-all",
    maxWidth: "100%",
  },
  [`& .${classes.taskAndTimeDisplay}`]: {
    fontSize: theme.typography.pxToRem(12),
    color: theme.taskPromptTextColor,
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
    whiteSpace: "nowrap",
    display: "inline-block",
    cursor: "default",
    wordBreak: "break-all",
  },
  [`& .${classes.secondaryHeadingExpanded}`]: {
    fontSize: theme.typography.pxToRem(15),
    //color: theme.taskPromptTextColor,
    display: "block",
    overflow: "auto",
    maxWidth: "100%",
    wordBreak: "break-all",
  },
  [`& .${classes.icon}`]: {
    verticalAlign: 'middle',
    height: 20,
    width: 20,
  },
  [`& .${classes.details}`]: {
    alignItems: 'center',
    marginRight: 0
  },
  [`& .${classes.column}`]: {
    padding: "0 5px 0 0",
    display: "inline-block",
    margin: 0,
    height: "auto",
  }
}));

const getSubTaskingQuery = gql`
${taskingDataFragment}
subscription getSubTasking($task_id: Int!){
    task_stream(batch_size: 10, cursor: {initial_value: {timestamp: "1970-01-01"}}, where: {parent_task_id: {_eq: $task_id}, is_interactive_task: {_eq: false}}) {
        ...taskData
  }
}
 `;

export const StyledAccordionSummary = styled(AccordionSummary)((
    {
      theme
    }
) => ({
  [`&.${accordionClasses.root}`]: {
    margin: 0,
    padding: 0,
    height: "auto",
    width: "100%",
    whiteSpace: "break-all",
    wordBreak: "break-all",
    userSelect: "text",
    boxShadow: "unset",
    backgroundColor: "unset",
  },
  [`& .${accordionClasses.content}`]: {
    margin: 0,
    height: "100%",
    padding: 0,
  },
  [`& .${accordionClasses.expandIcon}`]: {
    margin: 0,
  },
  [`& .${accordionClasses.expanded}`]: {
    marginRight: 0,
  },
}));


function TaskDisplayPreMemo({task, me, filterOptions, newlyIssuedTasks, collapseAllRequest}){
  return (
      <TaskRow me={me} task={task} newlyIssuedTasks={newlyIssuedTasks} filterOptions={filterOptions}
               indentLevel={0} collapseAllRequest={collapseAllRequest} />
  );
}
export const TaskDisplay = React.memo(TaskDisplayPreMemo);
function TaskDisplayFlatPreMemo({task, me, filterOptions, selectedTask, onSelectTask, showOnSelectTask}){
  return (
      <TaskRowFlat me={me} indentLevel={0} task={task}
                   filterOptions={filterOptions} onSelectTask={onSelectTask}
                   showOnSelectTask={showOnSelectTask} selectedTask={selectedTask}
      />
  )
}
export const TaskDisplayFlat = React.memo(TaskDisplayFlatPreMemo);
function TaskDisplayConsolePreMemo({task, me, filterOptions, newlyIssuedTasks}){
  return (
      <TaskRowConsole me={me} task={task} newlyIssuedTasks={newlyIssuedTasks} filterOptions={filterOptions}
               indentLevel={0} />
  );
}
export const TaskDisplayConsole = React.memo(TaskDisplayConsolePreMemo);
const TaskStatusDisplay = ({task, theme}) => {
  if(task.status.toLowerCase().includes("error")){
    return (<Typography size="small" component="span" style={{color: theme.palette.error.main, display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>{task.status.toLowerCase()}</Typography>)
  }else if(task.status === "cleared"){
    return (<Typography size="small" component="span"  style={{padding: "0", color: theme.palette.warning.main,  display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>cleared</Typography>)
  }else if(task.status === "completed" || task.status === "success"){
    return null//return (<Typography size="small" style={{padding: "0", color: theme.palette.success.main, marginLeft: "5%", display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>completed</Typography>)
  }else if(task.status === "submitted"){
    return (<Typography size="small" component="span"  style={{padding: "0", color: theme.palette.info.main, display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>{task.status.toLowerCase()}</Typography>)
  }else if(task.status.toLowerCase().includes("processing")){
    return (<Typography size="small" component="span"  style={{padding: "0", color: theme.palette.warning.main, display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>{task.status.toLowerCase()}</Typography>)
  }else if(task.opsec_pre_blocked && !task.opsec_pre_bypassed){
    return (<Typography size="small" component="span"  style={{padding: "0", color: theme.palette.warning.main,  display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>OPSEC BLOCKED (PRE)</Typography>)
  }else if(task.opsec_post_blocked && !task.opsec_post_bypassed){
    return (<Typography size="small" component="span"  style={{padding: "0", color: theme.palette.warning.main,  display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>OPSEC BLOCKED (POST)</Typography>)
  }else{
      return (<Typography size="small" component="span"  style={{padding: "0", color: theme.palette.info.main,  display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>{task.status.toLowerCase()}</Typography>)
  }
}
const TaskTagDisplay = ({task}) => {
  return (
    <TagsDisplay tags={task.tags} />
  )
}
const ColoredTaskDisplay = ({task, theme, children, expanded}) => {
  const [themeColor, setThemeColor] = React.useState(theme.palette.info.main);
  useEffect( () => {
    if(task.status.toLowerCase().includes("error")){
      setThemeColor(theme.palette.error.main);
    }else if(task.status.toLowerCase() === "cleared"){
      setThemeColor(theme.palette.warning.main);
    }else if(task.status === "submitted"){
      setThemeColor(theme.palette.info.main);
    }else if(task.opsec_pre_blocked && !task.opsec_pre_bypassed){
      setThemeColor(theme.palette.warning.main);
    }else if(task.opsec_post_blocked && !task.opsec_post_bypassed){
      setThemeColor(theme.palette.warning.main);
    }else if(task.status.toLowerCase().includes("processing")){
      setThemeColor(theme.palette.warning.main);
    }else if(task.status === "completed" || (task.status === "success" && task.completed)){
        setThemeColor(theme.palette.success.main);
    }else{
      setThemeColor(theme.palette.info.main);
    }
  }, [task.status, task.completed])
    return(
      <span style={{display: "flex", margin: 0, borderWidth: 0, padding: 0, minHeight: "48px", alignItems: "center",
        height: "100%", borderLeft: "6px solid " + themeColor, paddingLeft: "5px", width: "100%",
        borderTopLeftRadius: "4px", borderBottomLeftRadius: expanded ? 0 : "4px"}}>
        {children}
      </span>
    )
}
const GetOperatorDisplay = ({initialHideUsernameValue, task}) => {
  if(initialHideUsernameValue){
    return '';
  }
  return task.operator.username;
}
export const ColoredTaskLabel = ({task, theme, me, taskDivID, onClick, displayChildren, toggleDisplayChildren, expanded }) => {
  const [displayComment, setDisplayComment] = React.useState(false);
  const [alertBadges, setAlertBadges] = React.useState(0);
  const initialHideUsernameValue = GetMythicSetting({setting_name: "hideUsernames", default_value: operatorSettingDefaults.hideUsernames});
  const initialShowIPValue = GetMythicSetting({setting_name: "showIP", default_value: operatorSettingDefaults.showIP});
  const ipValue = JSON.parse(task.callback.ip)[0];
  const initialShowHostnameValue = GetMythicSetting({setting_name: "showHostname", default_value: operatorSettingDefaults.showHostname});
  const initialShowCallbackGroupsValue = GetMythicSetting({setting_name: "showCallbackGroups", default_value: operatorSettingDefaults.showCallbackGroups});
  const initialTaskTimestampDisplayField = GetMythicSetting({setting_name: "taskTimestampDisplayField", default_value: operatorSettingDefaults.taskTimestampDisplayField});
  const displayTimestamp = task[initialTaskTimestampDisplayField] ? task[initialTaskTimestampDisplayField] : task.timestamp;
  const [openKillTaskButton, setOpenKillTaskButton] = React.useState({open: false});
  const toggleDisplayComment = (evt) => {
    evt.stopPropagation();
    setDisplayComment(!displayComment);
  }
  const preventPropagation = (e) => {
    e.stopPropagation();
    //e.preventDefault();
  }
  const onLocalClick = (e) => {
    if(onClick){
      onClick(e);
    }
    //preventPropagation(e);
  }
  const onClickKillIcon = (e, open) => {
    if(e){
      e.stopPropagation();
    }
    setOpenKillTaskButton({open: open});
  }
  return (
      <ColoredTaskDisplay task={task} theme={theme} expanded={expanded}  >
        <div id={taskDivID} style={{width: "100%"}}>
          {displayComment && (
              <React.Fragment>
                <Typography className={classes.taskAndTimeDisplay} onClick={preventPropagation}>{task.commentOperator.username}</Typography><br/>
                <Typography className={classes.heading} onClick={preventPropagation}>{task.comment}</Typography>
              </React.Fragment>
          )}
          <div style={{lineHeight: 0}}>
            <Typography className={classes.taskAndTimeDisplay} onClick={preventPropagation}>
              [{toLocalTime(displayTimestamp, me?.user?.view_utc_time || false)}]
              {" / "}
              <span style={{}}>
                  {task.has_intercepted_response &&
                      <>
                        <MythicStyledTooltip
                            title={"This task has responses that have been intercepted and changed due to a workflow container"}>
                          <IconButton style={{padding: 0}} color={"secondary"}>
                            <CropRotateTwoToneIcon fontSize={"small"}/>
                          </IconButton>

                        </MythicStyledTooltip>
                        {"/ "}
                      </>
                  }
                {task?.eventstepinstance !== null &&
                    <>
                      <MythicStyledTooltip title={"Task created via Eventing, click to view entire event flow in separate page"} >
                        <IconButton component={Link} href={'/new/eventing?eventgroup=' +
                            task?.eventstepinstance?.eventgroupinstance?.eventgroup?.id +
                            "&eventgroupinstance=" + task?.eventstepinstance?.eventgroupinstance?.id
                        } target={"_blank"} style={{padding: 0}}
                                    color="inherit" disableFocusRipple={true}
                                    disableRipple={true}>
                          <PlayCircleFilledTwoToneIcon />
                        </IconButton>
                      </MythicStyledTooltip>

                      {"/  "}
                    </>
                }
                  <MythicStyledTooltip title={"View Task in separate page"} >
                    <Link style={{wordBreak: "break-all", color: theme.taskPromptTextColor,}} underline={"always"} target={"_blank"}
                          href={"/new/task/" + task.display_id}>T-{task.display_id}</Link>
                  </MythicStyledTooltip>
                {!task.completed && task.status_timestamp_processing &&
                    <>
                      <MythicStyledTooltip title={"Task the agent to kill this task"} >
                          <FontAwesomeIcon size={"sm"} icon={faSkullCrossbones} onClick={(e) => onClickKillIcon(e, true)}
                                           style={{cursor: "pointer", height: "15px", marginLeft: "5px"}} />
                      </MythicStyledTooltip>
                    </>
                }
              </span>
              {" / "}
              <GetOperatorDisplay initialHideUsernameValue={initialHideUsernameValue} task={task}/>
              {" / "}
              <MythicStyledTooltip title={"View Callback in separate page"}>
                <Link style={{wordBreak: "break-all", color: theme.taskPromptTextColor}} underline="always" target="_blank"
                      href={"/new/callbacks/" + task.callback.display_id}>C-{task.callback.display_id}</Link>
              </MythicStyledTooltip>

              {initialShowHostnameValue ? ` / ${task.callback.host} ` : ''}
              {initialShowIPValue ? `/ ${ipValue} ` : ''}
              {initialShowCallbackGroupsValue ? `/ ${task.callback.mythictree_groups.join(', ')} ` : ''}
              {" / "}
              {task?.command?.payloadtype?.name}
              {" / "}
              <TaskStatusDisplay task={task} theme={theme}/>
              {task.comment.length > 0 ? (
                  <span className={classes.column}>
                    <IconButton size="small" style={{padding: "0"}}
                                onClick={toggleDisplayComment}><ChatOutlinedIcon fontSize={"small"}/></IconButton>
                  </span>
              ) : null}
              {task.comment}
            </Typography>
            <TaskTagDisplay task={task}/>
          </div>
          <div>

            <div className={classes.column} onClick={onLocalClick}>
              <Badge badgeContent={alertBadges} color="warning" anchorOrigin={{vertical: 'top', horizontal: 'left'}}>
                {task.tasks.length > 0 && !displayChildren &&
                    <ExpandMoreIcon onClick={toggleDisplayChildren} />
                }
                {task.tasks.length > 0 && displayChildren &&
                    <ExpandLessIcon onClick={toggleDisplayChildren} />
                }
                <MythicStyledTooltip maxWidth={"calc(80vw)"}
                                     enterDelay={2000}
                    placement={"top"}
                    title={(task?.command?.cmd || task.command_name) + " " + task.display_params} >
                  <Typography className={classes.heading} style={{color: theme.taskPromptCommandTextColor}} onClick={onLocalClick} >
                    {(task?.command?.cmd || task.command_name) + " " + task.display_params}
                  </Typography>
                </MythicStyledTooltip>
              </Badge>
            </div>
          </div>
        </div>
        {openKillTaskButton.open &&
            <TaskFromUIButton ui_feature={"task:job_kill"}
                              callback_id={task.callback?.id}
                              display_id={task.callback?.display_id}
                              parameters={task.agent_task_id}
                              openDialog={false}
                              getConfirmation={true}
                              acceptText={"KILL JOB"}
                              selectCallback={false}
                              onTasked={({tasked}) => onClickKillIcon(null, false)}/>
        }
      </ColoredTaskDisplay>
  )
}
const TaskRow = ({task, filterOptions, me, newlyIssuedTasks, indentLevel, collapseAllRequest}) => {
	const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [taskingData, setTaskingData] = React.useState([]);
    const [shouldDisplay, setShouldDisplay] = React.useState(true);
    const [displayChildren, setDisplayChildren] = React.useState(false);
    const hideBrowserTasking = GetMythicSetting({setting_name: "hideBrowserTasking", default_value: operatorSettingDefaults.hideBrowserTasking});

  useSubscription(getSubTaskingQuery, {
      variables: {task_id: task.id},
      onData:  ({data}) => {
        //console.log(subscriptionData);
        // need to merge in the tasking data
        const newTaskingData = data.data.task_stream.reduce( (prev, cur) => {
          for(let i = 0; i < prev.length; i++){
            if(prev[i].id === cur.id){
              prev[i] = {...cur}
              return prev;
            }
          }
          return [...prev, cur];
        }, [...taskingData]);
        newTaskingData.sort( (a,b) => a.id < b.id ? -1 : 1);
        setTaskingData(newTaskingData);
      }
    });
    useEffect( () => {
      /*props.onSubmit({
      "operatorsList": onlyOperators,
      "commentsFlag": onlyHasComments,
      "commandsList": onlyCommands,
      "everythingButList": everythingBut,
      "parameterString": onlyParameters,
      "hideErrors": hideErrors
    }); */
      if(hideBrowserTasking && task.tasking_location.includes("browser")){
        setShouldDisplay(false);
        return;
      }
      if(task.display_params.includes("help") && task.operator.username !== me.user.username){
        setShouldDisplay(false);
        return;
      }
      if(filterOptions === undefined){
        if(!shouldDisplay){
          setShouldDisplay(true);
        }
        return;
      }
      if(filterOptions["operatorsList"].length > 0){
        if(!filterOptions["operatorsList"].includes(task.operator.username)){
          if(shouldDisplay){
            setShouldDisplay(false);
          }
          return;
        }
      }
      if(filterOptions["commentsFlag"]){
        if(task.comment === ""){
          if(shouldDisplay){
            setShouldDisplay(false);
          }
          return;
        }
      }
      if(filterOptions["commandsList"].length > 0){
        // only show these commands
        if(!filterOptions["commandsList"].includes(task.command_name)){
          if(shouldDisplay){
            setShouldDisplay(false);
          }
          return;
        }
      }
      if(filterOptions["everythingButList"].length > 0){
          if(filterOptions["everythingButList"].includes(task.command_name)){
            if(shouldDisplay){
              setShouldDisplay(false);
            }
            return;
          }
      }
      if(filterOptions["parameterString"] !== ""){
        let regex = new RegExp(filterOptions["parameterString"]);
        if(!regex.test(task.display_params)){
          if(shouldDisplay){
            setShouldDisplay(false);
          }
          return;
        }
      }
      if(filterOptions["hideErrors"]){
        if(task.status.toLowerCase().includes("error")){
          if(shouldDisplay){
            setShouldDisplay(false);
          }
          return;
        }
      }
      if(!shouldDisplay){
        setShouldDisplay(true);
      }
    }, [filterOptions, task.comment, task.command, task.status, task.display_params, task.operator.username]);
    const toggleTaskDropdown = React.useCallback( (event, expanded) => {
      if(window.getSelection().toString() !== ""){
        return;
      }
      setDropdownOpen(!dropdownOpen);
    }, [dropdownOpen]);
    const toggleDisplayChildren = React.useCallback( (event, expanded) => {
      if(window.getSelection().toString() !== ""){
        return;
      }
      setDisplayChildren(!displayChildren);
    }, [displayChildren]);
    useEffect( () => {
      if(collapseAllRequest > 0){
        setDropdownOpen(false);
      }
    }, [collapseAllRequest]);
    /*
    useEffect( () => {
      if(!isFetchingSubtasks && task.tasks.length > 0){
        getSubTasks();
      }
    }, [task.tasks]);
    */
    return (
      shouldDisplay ? (
          <div style={{marginLeft: (indentLevel * 10) + "px"}}>
            <TaskLabel me={me} task={task} newlyIssuedTasks={newlyIssuedTasks} dropdownOpen={dropdownOpen}
                       toggleTaskDropdown={toggleTaskDropdown}
                       toggleDisplayChildren={toggleDisplayChildren} displayChildren={displayChildren}/>
            { displayChildren &&
              taskingData.map( (tsk) => (
                  <TaskRow key={"taskrow: " + tsk.id} me={me} task={tsk}
                           filterOptions={filterOptions} indentLevel={indentLevel+1}/>
              ))
            }
          </div>

      ) : null
    )
}
const TaskRowFlat = ({task, filterOptions, me, onSelectTask, showOnSelectTask, selectedTask, indentLevel}) => {
  const [taskingData, setTaskingData] = React.useState([]);
  const [shouldDisplay, setShouldDisplay] = React.useState(true);
  const [displayChildren, setDisplayChildren] = React.useState(false);
  const hideBrowserTasking = GetMythicSetting({setting_name: "hideBrowserTasking", default_value: operatorSettingDefaults.hideBrowserTasking});

  useSubscription(getSubTaskingQuery, {
    variables: {task_id: task.id},
    onData:  ({data}) => {
      // need to merge in the tasking data
      const newTaskingData = data.data.task_stream.reduce( (prev, cur) => {
        for(let i = 0; i < prev.length; i++){
          if(prev[i].id === cur.id){
            prev[i] = {...cur, selected: cur.id === selectedTask.id}
            return prev;
          }
        }
        return [...prev, {...cur, selected: cur.id === selectedTask.id}];
      }, [...taskingData])
      newTaskingData.sort( (a,b) => a.id < b.id ? -1 : 1);
      setTaskingData(newTaskingData);
    }
  });
  useEffect( () => {
    /*props.onSubmit({
    "operatorsList": onlyOperators,
    "commentsFlag": onlyHasComments,
    "commandsList": onlyCommands,
    "everythingButList": everythingBut,
    "parameterString": onlyParameters
  }); */
    if(hideBrowserTasking && task.tasking_location.includes("browser")){
      setShouldDisplay(false);
      return;
    }
    if(task.display_params.includes("help") && task.operator.username !== me.user.username){
      setShouldDisplay(false);
      return;
    }
    if(filterOptions === undefined){
      if(!shouldDisplay){
        setShouldDisplay(true);
      }
      return;
    }
    if(filterOptions["operatorsList"].length > 0){
      if(!filterOptions["operatorsList"].includes(task.operator.username)){
        if(shouldDisplay){
          setShouldDisplay(false);
        }
        return;
      }
    }
    if(filterOptions["commentsFlag"]){
      if(task.comment === ""){
        if(shouldDisplay){
          setShouldDisplay(false);
        }
        return;
      }
    }
    if(filterOptions["commandsList"].length > 0){
      // only show these commands
      if(!filterOptions["commandsList"].includes(task.command_name)){
        if(shouldDisplay){
          setShouldDisplay(false);
        }
        return;
      }
    }
    if(filterOptions["everythingButList"].length > 0){
      if(filterOptions["everythingButList"].includes(task.command_name)){
        if(shouldDisplay){
          setShouldDisplay(false);
        }
        return;
      }
    }
    if(filterOptions["parameterString"] !== ""){
      let regex = new RegExp(filterOptions["parameterString"]);
      if(!regex.test(task.display_params)){
        if(shouldDisplay){
          setShouldDisplay(false);
        }
        return;
      }
    }
    if(filterOptions["hideErrors"]){
      if(task.status.includes("error")){
        if(shouldDisplay){
          setShouldDisplay(false);
        }
        return;
      }
    }
    if(!shouldDisplay){
      setShouldDisplay(true);
    }
  }, [filterOptions, task.comment, task.command, task.display_params, task.operator.username]);
  useEffect(() => {
    let updated = [...taskingData];
    for(let i = 0; i < updated.length; i++){
      if(updated[i].id === selectedTask.id){
        updated[i].selected = true;
      } else {
        updated[i].selected = false;
        for(let j = 0; j < updated[i].tasks.length; j++){
          if(updated[i].tasks[j].id === selectedTask.id){
            updated[i].tasks[j].selected = true;
          } else {
            updated[i].tasks[j].selected = false;
          }
        }
      }
    }
    setTaskingData(updated)
  }, [selectedTask]);
  const toggleDisplayChildren = React.useCallback( (event, expanded) => {
    if(window.getSelection().toString() !== ""){
      return;
    }
    setDisplayChildren(!displayChildren);
    event.stopPropagation();
    event.preventDefault();
  }, [displayChildren]);
  return (
      shouldDisplay && (
          <div style={{marginLeft: (indentLevel * 10) + "px"}}>
            <TaskLabelFlat me={me} task={task}
                           onSelectTask={() => {onSelectTask(task)}}
                           showOnSelectTask={showOnSelectTask}
                           toggleDisplayChildren={toggleDisplayChildren} displayChildren={displayChildren}
            />
            { displayChildren &&
              taskingData.map( (tsk) => (
                  <TaskRowFlat key={"taskrow: " + tsk.id} indentLevel={indentLevel+1}
                               me={me} task={tsk} onSelectTask={()=>{onSelectTask(tsk)}}
                               filterOptions={filterOptions} showOnSelectTask={true}
                               selectedTask={selectedTask}
                  />
              ))
            }
          </div>
      )
  )
}
const TaskLabel = ({task, dropdownOpen, toggleTaskDropdown, me, newlyIssuedTasks, displayChildren, toggleDisplayChildren}) => {
  const [fromNow, setFromNow] = React.useState(getSkewedNow());
  const theme = useTheme();
  const prevResponseMaxId = useRef(0);
  useEffect( () => {
    //console.log("in use effect", prevResponseCount.current, props.task.responses);
    let currentData = task.response_count;
    if(!dropdownOpen){
      // only automatically open the dropdown if a new response comes in while we're looking
      if((new Date(task.timestamp + "Z")) >= fromNow){
        if(prevResponseMaxId.current === 0 && currentData > 0){
          toggleTaskDropdown();
          prevResponseMaxId.current = currentData;
        }
      } else if(newlyIssuedTasks !== undefined) {
        let newIndex = newlyIssuedTasks.findIndex( (e) => e === task.id);
        if (newIndex > -1) {
          toggleTaskDropdown();
          prevResponseMaxId.current = currentData;
          newlyIssuedTasks.splice(newIndex, 1);
        }
      }
    }else{
      prevResponseMaxId.current = currentData;
    }
  }, [task.response_count, dropdownOpen]);
  const scrollContent = (node, isAppearing) => {
    // only auto-scroll if you issued the task
    if(task.operator.username === (me?.user?.username || "")){
      let el = document.getElementById(`taskingPanel${task.callback_id}`);
      if(el && el.scrollHeight - el.scrollTop - el.clientHeight < 100){
        document.getElementById(`scrolltotask${task.id}`)?.scrollIntoView({
          //behavior: "smooth",
          block: "start",
          inline: "start"
        });
      }
    }
  }

  return (
    <StyledPaper className={classes.root + " no-box-shadow"} elevation={5}  id={`taskHeader-${task.id}`}>
      <Accordion TransitionProps={{ unmountOnExit: true, onEnter: scrollContent }} defaultExpanded={false}
                 onChange={toggleTaskDropdown} expanded={dropdownOpen}
                 style={{backgroundColor: "unset", backgroundImage: "unset"}}
      >
        <StyledAccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls={`panel1c-content-task-${task.id}`}
          id={`panel1c-header-${task.id}`}
          classes={accordionClasses}
        >
          <ColoredTaskLabel theme={theme} task={task} me={me} taskDivID={'scrolltotask' + task.id}
            displayChildren={displayChildren} toggleDisplayChildren={toggleDisplayChildren}
                            expanded={dropdownOpen}
          />
        </StyledAccordionSummary>
        <TaskDisplayContainer key={task.id} me={me} task={task} />
      </Accordion>
  </StyledPaper>
  );
}
export const getLabelText = (task, graphView) => {
  if(graphView){
      if(task.display_params.length > 50){
        return (task?.command?.cmd || task.command_name) + " " + task.display_params.substring(0, 50) + "...";
      }
      return (task?.command?.cmd || task.command_name) + " " + task.display_params.substring(0, 50);
  }
  return (task?.command?.cmd || task.command_name) + " " + task.display_params;
}
export const TaskLabelFlat = ({task, me, showOnSelectTask, onSelectTask, graphView, displayChildren, toggleDisplayChildren}) => {
  const theme = useTheme();

  useLayoutEffect( () => {
    if(task.operator.username === (me?.user?.username || "")){
      scrollContent();
    }
  }, [])

  const scrollContent = (node, isAppearing) => {
    // only auto-scroll if you issued the task
    if(task.operator.username === (me?.user?.username || "")){
      let el = document.getElementById(`taskingPanelSplit${task.callback_id}`);
      if(el && el.scrollHeight - el.scrollTop - el.clientHeight < 100){
        document.getElementById(`scrolltotasksplit${task.id}`)?.scrollIntoView({
          //behavior: "smooth",
          block: "start",
          inline: "start"
        });
      }
    }

  }
  const onClickEntry = (e) => {
    if(showOnSelectTask){
      onSelectTask(e);
    }
  }

  return(
      <StyledPaper className={task.selected ? classes.root + " selectedTask no-box-shadow" : classes.root}
                   elevation={5} style={{marginRight: 0, cursor: "pointer"}} id={`taskHeader-${task.id}`}
                   onClick={onClickEntry}
      >
        <ColoredTaskLabel theme={theme} task={task} me={me} taskDivID={`scrolltotasksplit${task.id}`} onClick={onClickEntry}
                          displayChildren={displayChildren} toggleDisplayChildren={toggleDisplayChildren} expanded={false}
        />
      </StyledPaper>
  )
}


const ColoredTaskDisplayConsole = ({task, theme, children, expanded}) => {
  return(
      <span style={{display: "flex", margin: 0, borderWidth: 0, padding: 0, minHeight: "30px", alignItems: "center",
        height: "100%", paddingLeft: "5px", width: "100%",
        borderTopLeftRadius: "4px", borderBottomLeftRadius: expanded ? 0 : "4px"}}>
        {children}
      </span>
  )
}
const TaskRowConsole = ({task, filterOptions, me, newlyIssuedTasks, indentLevel}) => {
  const [taskingData, setTaskingData] = React.useState([]);
  const [shouldDisplay, setShouldDisplay] = React.useState(true);
  const hideBrowserTasking = GetMythicSetting({setting_name: "hideBrowserTasking", default_value: operatorSettingDefaults.hideBrowserTasking});

  useSubscription(getSubTaskingQuery, {
    variables: {task_id: task.id},
    onData:  ({data}) => {
      //console.log(subscriptionData);
      // need to merge in the tasking data
      const newTaskingData = data.data.task_stream.reduce( (prev, cur) => {
        for(let i = 0; i < prev.length; i++){
          if(prev[i].id === cur.id){
            prev[i] = {...cur}
            return prev;
          }
        }
        return [...prev, cur];
      }, [...taskingData]);
      newTaskingData.sort( (a,b) => a.id < b.id ? -1 : 1);
      setTaskingData(newTaskingData);
    }
  });
  useEffect( () => {
    /*props.onSubmit({
    "operatorsList": onlyOperators,
    "commentsFlag": onlyHasComments,
    "commandsList": onlyCommands,
    "everythingButList": everythingBut,
    "parameterString": onlyParameters,
    "hideErrors": hideErrors
  }); */
    if(hideBrowserTasking && task.tasking_location.includes("browser")){
      setShouldDisplay(false);
      return;
    }
    if(task.display_params.includes("help") && task.operator.username !== me.user.username){
      setShouldDisplay(false);
      return;
    }
    if(filterOptions === undefined){
      if(!shouldDisplay){
        setShouldDisplay(true);
      }
      return;
    }
    if(filterOptions["operatorsList"].length > 0){
      if(!filterOptions["operatorsList"].includes(task.operator.username)){
        if(shouldDisplay){
          setShouldDisplay(false);
        }
        return;
      }
    }
    if(filterOptions["commentsFlag"]){
      if(task.comment === ""){
        if(shouldDisplay){
          setShouldDisplay(false);
        }
        return;
      }
    }
    if(filterOptions["commandsList"].length > 0){
      // only show these commands
      if(!filterOptions["commandsList"].includes(task.command_name)){
        if(shouldDisplay){
          setShouldDisplay(false);
        }
        return;
      }
    }
    if(filterOptions["everythingButList"].length > 0){
      if(filterOptions["everythingButList"].includes(task.command_name)){
        if(shouldDisplay){
          setShouldDisplay(false);
        }
        return;
      }
    }
    if(filterOptions["parameterString"] !== ""){
      let regex = new RegExp(filterOptions["parameterString"]);
      if(!regex.test(task.display_params)){
        if(shouldDisplay){
          setShouldDisplay(false);
        }
        return;
      }
    }
    if(filterOptions["hideErrors"]){
      if(task.status.includes("error")){
        if(shouldDisplay){
          setShouldDisplay(false);
        }
        return;
      }
    }
    if(!shouldDisplay){
      setShouldDisplay(true);
    }
  }, [filterOptions, task.comment, task.command, task.display_params, task.operator.username]);
  // marginLeft: (indentLevel * 10) + "px"
  return (
      shouldDisplay ? (
          <div style={{}}>
            <TaskLabelConsole me={me} task={task} newlyIssuedTasks={newlyIssuedTasks} />
            {
              taskingData.map( (tsk) => (
                  <TaskRowConsole key={"taskrow: " + tsk.id} me={me} task={tsk}
                                  filterOptions={filterOptions} indentLevel={indentLevel+1}/>
              ))
            }
          </div>

      ) : null
  )
}
export const ColoredTaskLabelConsole = ({task, theme, me, taskDivID, onClick, displayChildren, toggleDisplayChildren, expanded }) => {
  const initialHideUsernameValue = GetMythicSetting({setting_name: "hideUsernames", default_value: operatorSettingDefaults.hideUsernames});
  const initialTaskTimestampDisplayField = GetMythicSetting({setting_name: "taskTimestampDisplayField", default_value: operatorSettingDefaults.taskTimestampDisplayField});
  const displayTimestamp = task[initialTaskTimestampDisplayField] ? task[initialTaskTimestampDisplayField] : task.timestamp;
  const initialShowHostnameValue = GetMythicSetting({setting_name: "showHostname", default_value: operatorSettingDefaults.showHostname});
  const initialShowIPValue = GetMythicSetting({setting_name: "showIP", default_value: operatorSettingDefaults.showIP});
  const [openKillTaskButton, setOpenKillTaskButton] = React.useState({open: false});
  const preventPropagation = (e) => {
    e.stopPropagation();
    //e.preventDefault();
  }
  const onClickKillIcon = (e, open) => {
    if(e){
      e.stopPropagation();
    }
    setOpenKillTaskButton({open: open});
  }
  const [themeColor, setThemeColor] = React.useState(theme.palette.info.main);
  useEffect( () => {
    if(task.status.toLowerCase().includes("error")){
      setThemeColor(theme.palette.error.main);
    }else if(task.status.toLowerCase() === "cleared"){
      setThemeColor(theme.palette.warning.main);
    }else if(task.status === "submitted"){
      setThemeColor(theme.palette.info.main);
    }else if(task.opsec_pre_blocked && !task.opsec_pre_bypassed){
      setThemeColor(theme.palette.warning.main);
    }else if(task.opsec_post_blocked && !task.opsec_post_bypassed){
      setThemeColor(theme.palette.warning.main);
    }else if(task.status.toLowerCase().includes("processing")){
      setThemeColor(theme.palette.warning.main);
    }else if(task.status === "completed" || (task.status === "success" && task.completed)){
      setThemeColor(theme.palette.success.main);
    }else{
      setThemeColor(theme.palette.info.main);
    }
  }, [task.status, task.completed])
  return (
	    <ColoredTaskDisplayConsole task={task} theme={theme} expanded={expanded}>
	        <div id={taskDivID} style={{ width: "100%" }}>
	            <Typography sx={{ color: theme.taskPromptTextColor,  display: "flex", alignItems: "center" }} style={{ fontFamily: "monospace" }}>
	                <span style={{ fontFamily: "monospace" }}>┌──[</span>
	                <AccessTimeIcon fontSize="small" style={{ margin: "0 3px 0 0px", verticalAlign: "middle" }} />
	                {toLocalTimeShort(displayTimestamp, me?.user?.view_utc_time || false)}
	                {"]"}
                  {!initialHideUsernameValue &&
                      <>
                        {"-["}
                        <PersonOutlineIcon fontSize="small" style={{ margin: "0 3px 0 0px", verticalAlign: "middle" }} />
                        {task.operator.username}
                        {"]"}
                      </>
                  }
                  {"-["}
	                <NumbersIcon fontSize="small" style={{ margin: "0 3px 0 0px", verticalAlign: "middle" }} />
                    <MythicStyledTooltip title={"View Task in separate page"} >
                      <Link style={{wordBreak: "break-all", color: theme.taskPromptTextColor,}} underline={"always"} target={"_blank"}
                            href={"/new/task/" + task.display_id}>T-{task.display_id}</Link>
                    </MythicStyledTooltip>
                  {!task.completed && task.status_timestamp_processing &&
                      <>
                        <MythicStyledTooltip title={"Task the agent to kill this task"} >
                            <FontAwesomeIcon size={"sm"} icon={faSkullCrossbones} onClick={(e) => onClickKillIcon(e, true)}
                                             style={{cursor: "pointer", height: "15px", marginLeft: "5px"}} />
                        </MythicStyledTooltip>
                      </>
                  }
                  {"]"}
	                {initialShowHostnameValue ? (
	                    <>
	                        {"-["}
	                        <ComputerIcon fontSize="small" style={{ margin: "0 3px 0 0px", verticalAlign: "middle" }} />
	                        {task.callback.host}
                            {"]"}
	                    </>) : null}
	                {initialShowIPValue ? (
	                    <>
	                        {"-["}
	                        <PublicIcon fontSize="small" style={{ margin: "0 3px 0 0px", verticalAlign: "middle" }} />
	                        {JSON.parse(task.callback.ip)[0]}
                            {"]"}
	                    </> ) : null}
	                {(task.opsec_pre_blocked && !task.opsec_pre_bypassed) ? (
	                    <>
	                        {"-["}
	                        <WarningAmberIcon fontSize="small" style={{ margin: "0 3px 0 0px", verticalAlign: "middle", color: theme.palette.warning.main }} />
                            {"OPSEC BLOCKED (PRE)]"}
	                    </>) : null}
	                {(task.opsec_post_blocked && !task.opsec_post_bypassed) ? (
	                    <>
	                        {"-["}
	                        <WarningAmberIcon fontSize="small" style={{ margin: "0 3px 0 0px", verticalAlign: "middle", color: theme.palette.warning.main }} />
                            {"OPSEC BLOCKED (POST)]"}
	                    </>) : null}
	                {")"}
	            </Typography>
              <MythicStyledTooltip title={task.status}>
                <span style={{ fontFamily: "monospace", marginRight: 2, color: theme.taskPromptTextColor }}>└─</span>
                <b style={{ fontFamily: "monospace", color: themeColor, fontWeight: 600 }}>{">_"}</b>{" "}
              </MythicStyledTooltip>
	            <MythicStyledTooltip
	                title={(task?.command?.cmd || task.command_name) + " " + task.display_params}
	                maxWidth="calc(80vw)"
	                enterDelay={2000}
	                placement="top">
	                <Typography
	                    sx={{ fontSize: 15, display: "flex", alignItems: "center", marginLeft: 0}}
	                    style={{ fontFamily: "monospace" }}>
	                    <span style={{ marginLeft: 4, color: theme.taskPromptCommandTextColor }}>
	                        <b>{(task?.command?.cmd || task.command_name)}</b> {task.display_params}
	                    </span>
	                </Typography>
	            </MythicStyledTooltip>
	        </div>
          {openKillTaskButton.open &&
              <TaskFromUIButton ui_feature={"task:job_kill"}
                                callback_id={task.callback?.id}
                                display_id={task.callback?.display_id}
                                parameters={task.agent_task_id}
                                openDialog={false}
                                getConfirmation={true}
                                acceptText={"KILL JOB"}
                                selectCallback={false}
                                onTasked={({tasked}) => onClickKillIcon(null, false)}/>
          }
	    </ColoredTaskDisplayConsole>
	);
}
const TaskLabelConsole = ({task, me}) => {
  const theme = useTheme();
  useLayoutEffect( () => {
    if(task.operator.username === (me?.user?.username || "")){
      scrollContent();
    }
  }, [])
  const scrollContent = (node, isAppearing) => {
    // only auto-scroll if you issued the task
    if(task.operator.username === (me?.user?.username || "")){
      let el = document.getElementById(`taskingPanelConsole${task.callback_id}`);
      if(el && el.scrollHeight - el.scrollTop - el.clientHeight < 100){
        document.getElementById(`scrolltotaskconsole${task.id}`)?.scrollIntoView({
          //behavior: "smooth",
          block: "start",
          inline: "start"
        });
      }
    }

  }

  return (
      <StyledPaper className={classes.root + " no-box-shadow no-border"} elevation={5} style={{marginRight: 0, marginBottom: "5px"}} id={`taskHeader-${task.id}`}>
          <ColoredTaskLabelConsole theme={theme} task={task} me={me} taskDivID={`scrolltotaskconsole${task.id}`} expanded={true}/>
          <TaskDisplayContainerConsole me={me} task={task} />
          <div style={{borderBottom: "0px dashed grey", width: "100%", height: "5px", marginTop: "5px"}}/>
      </StyledPaper>
  );
}
