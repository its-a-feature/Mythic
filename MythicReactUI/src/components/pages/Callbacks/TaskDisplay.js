import React, {useEffect, useLayoutEffect, useRef} from 'react';
import { styled } from '@mui/material/styles';
import {IconButton, Link} from '@mui/material';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { toLocalTime } from '../../utilities/Time';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import Badge from '@mui/material/Badge';
import {useTheme} from '@mui/material/styles';
import {gql, useLazyQuery, useSubscription } from '@apollo/client';
import {TaskDisplayContainer, TaskDisplayContainerConsole} from './TaskDisplayContainer';
import {TagsDisplay} from '../../MythicComponents/MythicTag';
import {taskingDataFragment} from './CallbackMutations';
import {useMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";


const PREFIX = 'TaskDisplay';
const ACCORDION_PREFIX = 'TaskDisplayAccordion';
const classes = {
  root: `${PREFIX}-root`,
  heading: `${PREFIX}-heading`,
  secondaryHeading: `${PREFIX}-secondaryHeading`,
  taskAndTimeDisplay: `${PREFIX}-taskAndTimeDisplay`,
  secondaryHeadingExpanded: `${PREFIX}-secondaryHeadingExpanded`,
  icon: `${PREFIX}-icon`,
  details: `${PREFIX}-details`,
  column: `${PREFIX}-column`
};
const accordionClasses = {
  root: `${ACCORDION_PREFIX}-root`,
  content: `${ACCORDION_PREFIX}-content`,
  expandIcon: `${ACCORDION_PREFIX}-expandIcon`,
  expanded: `${ACCORDION_PREFIX}-expanded`,
}

const StyledPaper = styled(Paper)((
  {
    theme
  }
) => ({
  [`&.${classes.root}`]: {
    marginTop: "3px",
    marginLeft: "3px",
    marginRight: "0px",
    height: "auto",
    width: "99%",
    boxShadow: "unset",
  },

  [`& .${classes.heading}`]: {
    fontSize: theme.typography.pxToRem(15),
    display: "inline",
    cursor: "default",
    wordBreak: "break-all",
  },

  [`& .${classes.secondaryHeading}`]: {
    fontSize: theme.typography.pxToRem(15),
    //color: theme.palette.text.secondary,
    overflow: "auto", 
    display: "block", 
    textOverflow: "ellipsis", 
    wordBreak: "break-all",
    maxWidth: "100%", 
  },

  [`& .${classes.taskAndTimeDisplay}`]: {
    fontSize: theme.typography.pxToRem(12),
    color: theme.palette.text.secondary,
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
    //color: theme.palette.text.secondary,
    display: "block", 
    overflow: "auto",
    maxWidth: "100%", 
    whiteSpace: "break-all",
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
    height: "auto"
  }
}));

/*
export const taskDataFragment = gql`
    fragment taskData on task {
        comment
        callback_id
        commentOperator{
            username
        }
        completed
        id
        display_id
        operator{
            username
        }
        original_params
        display_params
        status
        timestamp
        command {
          cmd
          supported_ui_features
          id
        }
        command_name
        response_count
        opsec_pre_blocked
        opsec_pre_bypassed
        opsec_post_blocked
        opsec_post_bypassed
        tasks {
            id
        }
        tags {
          tagtype {
              name
              color
              id
            }
          id
        }
        token {
            id
        }
    }
`;

 */
// task(where: {parent_task_id: {_eq: $task_id}}, order_by: {id: asc}) {
const getSubTaskingQuery = gql`
${taskingDataFragment}
subscription getSubTasking($task_id: Int!){
    task_stream(batch_size: 10, cursor: {initial_value: {timestamp: "1970-01-01"}}, where: {parent_task_id: {_eq: $task_id}, is_interactive_task: {_eq: false}}) {
        ...taskData
  }
}
 `;

const StyledAccordionSummary = styled(AccordionSummary)((
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
    marginRight: 0
  },
}));

function TaskDisplayPreMemo({task, me, filterOptions, newlyIssuedTasks}){
  return (
      <TaskRow me={me} task={task} newlyIssuedTasks={newlyIssuedTasks} filterOptions={filterOptions}
               indentLevel={0} />
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
    return (<Typography size="small" component="span" style={{padding: "0", color: theme.palette.error.main, marginLeft: "5%", display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>{task.status.toLowerCase()}</Typography>)
  }else if(task.status === "cleared"){
    return (<Typography size="small" component="span"  style={{padding: "0", color: theme.palette.warning.main, marginLeft: "5%", display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>cleared</Typography>)
  }else if(task.status === "completed" || task.status === "success"){
    return null//return (<Typography size="small" style={{padding: "0", color: theme.palette.success.main, marginLeft: "5%", display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>completed</Typography>)
  }else if(task.status === "submitted"){
    return (<Typography size="small" component="span"  style={{padding: "0", color: theme.palette.info.main, marginLeft: "5%", display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>{task.status.toLowerCase()}</Typography>)
  }else if(task.status.toLowerCase().includes("processing")){
    return (<Typography size="small" component="span"  style={{padding: "0", color: theme.palette.warning.main, marginLeft: "5%", display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>{task.status.toLowerCase()}</Typography>)
  }else if(task.opsec_pre_blocked && !task.opsec_pre_bypassed){
    return (<Typography size="small" component="span"  style={{padding: "0", color: theme.palette.warning.main, marginLeft: "5%", display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>OPSEC BLOCKED (PRE)</Typography>)
  }else if(task.opsec_post_blocked && !task.opsec_post_bypassed){
    return (<Typography size="small" component="span"  style={{padding: "0", color: theme.palette.warning.main, marginLeft: "5%", display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>OPSEC BLOCKED (POST)</Typography>)
  }else{
      return (<Typography size="small" component="span"  style={{padding: "0", color: theme.palette.info.main, marginLeft: "5%", display: "inline-block", fontSize: theme.typography.pxToRem(15)}}>{task.status.toLowerCase()}</Typography>)
  }
}
const TaskTagDisplay = ({task}) => {
  return (
    <TagsDisplay tags={task.tags} />
  )
}
const ColoredTaskDisplay = ({task, theme, children}) => {
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
      <span style={{display: "flex", margin: 0, borderWidth: 0, padding: 0, minHeight: "48px", alignItems: "center", height: "100%", borderLeft: "6px solid " + themeColor, paddingLeft: "5px", width: "100%"}}>
        {children}
      </span>
    )
}
const ColoredTaskLabel = ({task, theme, me, taskDivID, onClick }) => {
  const [displayComment, setDisplayComment] = React.useState(false);
  const [alertBadges, setAlertBadges] = React.useState(0);
  const initialHideUsernameValue = useMythicSetting({setting_name: "hideUsernames", default_value: "false"});
  const initialShowIPValue = useMythicSetting({setting_name: "showIP", default_value: "false"});
  const ipValue = JSON.parse(task.callback.ip)[0];
  const initialShowHostnameValue = useMythicSetting({setting_name: "showHostname", default_value: "false"});
  const initialShowCallbackGroupsValue = useMythicSetting({setting_name: "showCallbackGroups", default_value: "false"});
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
    preventPropagation(e);
  }
  return (
      <ColoredTaskDisplay task={task} theme={theme}  >
        <div id={taskDivID} style={{width: "100%"}}>
          {displayComment ? (
              <React.Fragment>
                <Typography className={classes.taskAndTimeDisplay} onClick={preventPropagation}>{task.commentOperator.username}</Typography><br/>
                <Typography className={classes.heading} onClick={preventPropagation}>{task.comment}</Typography>
              </React.Fragment>
          ) : null}
          <div >
            <Typography className={classes.taskAndTimeDisplay} onClick={preventPropagation}>
              [{toLocalTime(task.timestamp, me?.user?.view_utc_time || false)}]
              / {task.display_id} {initialHideUsernameValue ? '' : `/ ${task.operator.username} `}
              / <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/callbacks/" + task.callback.display_id}>{ task.callback.display_id}</Link>
              {initialShowHostnameValue ? ` / ${task.callback.host} ` : ''}
              {initialShowIPValue ? `/ ${ipValue} ` : ''}
              {initialShowCallbackGroupsValue ? `/ ${task.callback.mythictree_groups.join(', ')} ` : ''}
            </Typography>
            <TaskStatusDisplay task={task} theme={theme}/>
            <TaskTagDisplay task={task} />
          </div>
          <div>
            {task.comment !== "" ? (
                <div className={classes.column}>
                  <IconButton size="small" style={{padding: "0"}} color="primary" onClick={toggleDisplayComment}><ChatOutlinedIcon/></IconButton>
                </div>
            ) : null}
            <div className={classes.column} onClick={onLocalClick}>
              <Badge badgeContent={alertBadges} color="warning" anchorOrigin={{vertical: 'top', horizontal: 'left'}}>
                <Typography className={classes.heading} onClick={onLocalClick}>
                  {(task?.command?.cmd || task.command_name) + " " + task.display_params}
                </Typography>
              </Badge>
            </div>
          </div>
        </div>
      </ColoredTaskDisplay>
  )
}
const TaskRow = ({task, filterOptions, me, newlyIssuedTasks, indentLevel}) => {
	const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [taskingData, setTaskingData] = React.useState([]);
    const [shouldDisplay, setShouldDisplay] = React.useState(true);
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
    const toggleTaskDropdown = React.useCallback( (event, expanded) => {
      if(window.getSelection().toString() !== ""){
        return;
      }
      setDropdownOpen(!dropdownOpen);
    }, [dropdownOpen]);
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
                       toggleTaskDropdown={toggleTaskDropdown}/>
            {
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
  return (
      shouldDisplay && (
          <div style={{marginLeft: (indentLevel * 10) + "px"}}>
            <TaskLabelFlat me={me} task={task}
                           onSelectTask={() => {onSelectTask(task)}}
                           showOnSelectTask={showOnSelectTask}

            />
            {
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
const TaskRowConsole = ({task, filterOptions, me, newlyIssuedTasks, indentLevel}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [taskingData, setTaskingData] = React.useState([]);
  const [shouldDisplay, setShouldDisplay] = React.useState(true);
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
  const toggleTaskDropdown = React.useCallback( (event, expanded) => {
    if(window.getSelection().toString() !== ""){
      return;
    }
    setDropdownOpen(!dropdownOpen);
  }, [dropdownOpen]);
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

const TaskLabel = ({task, dropdownOpen, toggleTaskDropdown, me, newlyIssuedTasks}) => {
  const [fromNow, setFromNow] = React.useState(new Date());
  const theme = useTheme();
  const prevResponseMaxId = useRef(0);
  // only scroll down for your own tasks
  useLayoutEffect( () => {
    if(task.operator.username === (me?.user?.username || "")){
      scrollContent();
    }
  }, [])
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
      document.getElementById(`scrolltotask${task.id}`).scrollIntoView({
        //behavior: "smooth",
        block: "start",
        inline: "start"
      })
    }
    
  }

  return (
    <StyledPaper className={classes.root + " no-box-shadow"} elevation={5} style={{marginRight: 0}} id={`taskHeader-${task.id}`}>
      <Accordion TransitionProps={{ unmountOnExit: true, onEntered: scrollContent }} defaultExpanded={false} onChange={toggleTaskDropdown} expanded={dropdownOpen}  >
        <StyledAccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls={`panel1c-content-task-${task.id}`}
          id={`panel1c-header-${task.id}`}
          classes={accordionClasses}
        >  
          <ColoredTaskLabel theme={theme} task={task} me={me} taskDivID={'scrolltotask' + task.id} />
        </StyledAccordionSummary>
        <AccordionDetails style={{cursor: "default"}}>
          <TaskDisplayContainer me={me} task={task} />
        </AccordionDetails>
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
export const TaskLabelFlat = ({task, me, showOnSelectTask, onSelectTask, graphView}) => {
  const theme = useTheme();

  useLayoutEffect( () => {
    if(task.operator.username === (me?.user?.username || "")){
      scrollContent();
    }
  }, [])

  const scrollContent = (node, isAppearing) => {
    // only auto-scroll if you issued the task
    if(task.operator.username === (me?.user?.username || "")){
      document.getElementById(`scrolltotasksplit${task.id}`).scrollIntoView({
        //behavior: "smooth",
        block: "start",
        inline: "start"
      })
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
        <ColoredTaskLabel theme={theme} task={task} me={me} taskDivID={`scrolltotasksplit${task.id}`} onClick={onClickEntry} />
      </StyledPaper>
  )
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
      document.getElementById(`scrolltotaskconsole${task.id}`).scrollIntoView({
        //behavior: "smooth",
        block: "start",
        inline: "start"
      })
    }

  }

  return (
      <StyledPaper className={classes.root + " no-box-shadow"} elevation={5} style={{marginRight: 0}} id={`taskHeader-${task.id}`}>
          <ColoredTaskLabel theme={theme} task={task} me={me} taskDivID={`scrolltotaskconsole${task.id}`} />
          <TaskDisplayContainerConsole me={me} task={task} />
      </StyledPaper>
  );
}