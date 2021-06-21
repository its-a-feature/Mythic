import React, {useEffect, useRef} from 'react';
import {Button, IconButton} from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { toLocalTime } from '../../utilities/Time';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import { makeStyles, fade, withStyles } from '@material-ui/core/styles';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionActions from '@material-ui/core/AccordionActions';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import GetAppIcon from '@material-ui/icons/GetApp';
import LinkIcon from '@material-ui/icons/Link';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';
import ChatOutlinedIcon from '@material-ui/icons/ChatOutlined';
import Badge from '@material-ui/core/Badge';
import {ResponseDisplay} from './ResponseDisplay';
import RateReviewOutlinedIcon from '@material-ui/icons/RateReviewOutlined';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {TaskCommentDialog} from './TaskCommentDialog';
import {muiTheme} from '../../../themes/Themes.js';
import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import {TaskOpsecDialog} from './TaskOpsecDialog';
import Tooltip from '@material-ui/core/Tooltip';
import InputIcon from '@material-ui/icons/Input';
import {TaskViewParametersDialog} from './TaskViewParametersDialog';
import TreeView from '@material-ui/lab/TreeView';
import TreeItem from '@material-ui/lab/TreeItem';
import SvgIcon from '@material-ui/core/SvgIcon';
import {gql, useLazyQuery } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';

const getSubTaskingQuery = gql`
query getSubTasking($task_id: Int!){
    task(where: {parent_task_id: {_eq: $task_id}}, order_by: {id: asc}) {
        comment
        commentOperator{
            username
        }
        completed
        id
        operator{
            username
        }
        original_params
        display_params
        status
        timestamp
        command {
          cmd
          id
        }
        responses(order_by: {id: desc}) {
          id
        }
        opsec_pre_blocked
        opsec_pre_bypassed
        opsec_post_blocked
        opsec_post_bypassed
        tasks {
            id
        }
  }
}
 `;

const useStyles = makeStyles((theme) => ({
  root: {
    width: '99%',
    marginTop: "3px",
    marginBottom: "2px",
    marginLeft: "3px",
    marginRight: "0px",
    height: "auto"
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    whiteSpace: "pre-line"
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(15),
    color: theme.palette.text.secondary,
    overflow: "hidden", 
    display: "block", 
    textOverflow: "ellipsis", 
    maxWidth: "calc(90vw)", 
    whiteSpace: "nowrap"
  },
  secondaryHeadingExpanded: {
    fontSize: theme.typography.pxToRem(15),
    color: theme.palette.text.secondary,
    display: "block", 
    overflow: "auto",
    maxWidth: "calc(90vw)", 
    whiteSpace: "break-word"
  },
  icon: {
    verticalAlign: 'middle',
    height: 20,
    width: 20,
  },
  details: {
    alignItems: 'center',
  },
  column: {
    padding: "0 5px 0 0",
    display: "inline-block",
    margin: 0,
    height: "auto"
  },
}));
const accordionUseStyles = makeStyles((theme) => ({
  root: {
    margin: 0,
    padding: 0,
    height: "auto"
  },
  content: {
    margin: 0,
    height: "100%",
    padding: 0,
  },
  expandIcon: {
    margin: 0,
  }
}));
function MinusSquare(props) {
  return (
    <SvgIcon fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 11.023h-11.826q-.375 0-.669.281t-.294.682v0q0 .401.294 .682t.669.281h11.826q.375 0 .669-.281t.294-.682v0q0-.401-.294-.682t-.669-.281z" />
    </SvgIcon>
  );
}
function PlusSquare(props) {
  return (
    <SvgIcon fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 12.977h-4.923v4.896q0 .401-.281.682t-.682.281v0q-.375 0-.669-.281t-.294-.682v-4.896h-4.923q-.401 0-.682-.294t-.281-.669v0q0-.401.281-.682t.682-.281h4.923v-4.896q0-.401.294-.682t.669-.281v0q.401 0 .682.281t.281.682v4.896h4.923q.401 0 .682.281t.281.682v0q0 .375-.281.669t-.682.294z" />
    </SvgIcon>
  );
}

const StyledTreeItem = withStyles((theme) => ({
  iconContainer: {
    '& .close': {
      opacity: 0.3,
    },
  },
  group: {
    marginLeft: 7,
    paddingLeft: 18,
    borderLeft: `1px dashed ${fade(theme.palette.text.primary, 0.4)}`,
  },
}))((props) => <TreeItem {...props}  />); //

export const TaskDisplay = (props) =>{
    
    const classes = useStyles();
    const [nodesSelected, setNodesSelected] = React.useState([]);

    const toggleTaskTree = (task_id, selected) => {
    	if(selected){
    		// we want to add our treenode to the list if it's not there already
    		if(nodesSelected.includes("treenode:" + task_id)){
    			return;
    		}
    		setNodesSelected([...nodesSelected, "treenode:" + task_id]);
    	}else{
    		// we want to remove our treenode from the list if it's there
    		const newSelection = nodesSelected.reduce( (prev, cur) => {
				if(cur === "treenode:" + task_id){
					return [...prev];
				}
				return [...prev, cur];
    		}, [])
    		setNodesSelected(newSelection);
    	}
    	
    }
    const toggleTaskNodes = (event, value) => {
    	console.log("onNodeToggle", event, value);
    }

  return (
  	<TreeView className={classes.root}
  		onNodeToggle={toggleTaskNodes}
  		expanded={nodesSelected}
	>
		<TaskRow {...props} nodesSelected={nodesSelected} toggleSelection={toggleTaskTree} />
    </TreeView>
  );
}

const TaskRow = (props) => {
	const me = useReactiveVar(meState);
    const [enableBrowserscripts, setEnableBrowserscripts] = React.useState(true);
    const [lastSeenResponse, setLastSeenResponse] = React.useState(0);
    const [displayComment, setDisplayComment] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [alertBadges, setAlertBadges] = React.useState(0);
    const [openCommentDialog, setOpenCommentDialog] = React.useState(false);
    const [openParametersDialog, setOpenParametersDialog] = React.useState(false);
    const [openOpsecDialog, setOpenOpsecDialog] = React.useState(false);
    const [commandID, setCommandID] = React.useState(0);
    const [task, setTask] = React.useState({});
    const classes = useStyles();
    const [taskingData, setTaskingData] = React.useState({task: []});
    const [isFetchingSubtasks, setIsFetchingSubtasks] = React.useState(false);
    const [getSubTasking, { loading: taskingLoading, startPolling, stopPolling }] = useLazyQuery(getSubTaskingQuery, {
        onError: data => {
            console.error(data)
        },
        fetchPolicy: "network-only",
        notifyOnNetworkStatusChange: true,
        onCompleted: (data) => {
        	if(props.nodesSelected.includes("treenode:" + props.task.id)){
        		startPolling(2000);
        	}else{
        		stopPolling();
        		setIsFetchingSubtasks(false);
        		return;
        	}
        	setTaskingData(data);
        }
    });
    const getSubTasks = (event) => {
    	if(!isFetchingSubtasks){
        	props.toggleSelection(props.task.id, true);
        	setIsFetchingSubtasks(true);
    		getSubTasking({variables: {task_id: props.task.id} });
    		return;
		}
		//// we're already fetching subtasks, but just clicked the minus sign, so stop
		props.toggleSelection(props.task.id, false);
		
    }
    const accordionClasses = accordionUseStyles();
        const toggleBrowserscripts = () => {
        setEnableBrowserscripts(!enableBrowserscripts);
    }
    const getTaskStatus = () => {
        if(props.task.status.includes("error")){
             return (<Button size="small" style={{padding: "0", color: muiTheme.palette.error.main}}>{props.task.status}</Button>)
        }else if(props.task.completed){
             return (<Button size="small" style={{padding: "0", color: muiTheme.palette.success.main}}>Completed</Button>)
        }else if(props.task.status === "submitted" || props.task.status === "processing"){
             return (<Button size="small" style={{padding: "0", color: muiTheme.palette.info.main}}>{props.task.status}</Button>)
        }else if(props.task.opsec_pre_blocked && !props.task.opsec_pre_bypassed){
            return (<Button size="small" style={{padding: "0", color: muiTheme.palette.warning.main}}>OPSEC Blocked (PRE)</Button>)
        }else if(props.task.opsec_post_blocked && !props.task.opsec_post_bypassed){
            return (<Button size="small" style={{padding: "0", color: muiTheme.palette.warning.main}}>OPSEC Blocked (POST)</Button>)
        }else{
             return (<Button size="small" style={{padding: "0", color: muiTheme.palette.info.main}}>{props.task.status}</Button>)
        }
    }
    const getTaskStatusColor = () => {
        if(props.task.status.includes("error")){
             return muiTheme.palette.error.main;
        }else if(props.task.completed){
             return muiTheme.palette.success.main;
        }else if(props.task.status === "submitted" || props.task.status === "processing"){
             return muiTheme.palette.info.main;
        }else if(props.task.opsec_pre_blocked && !props.task.opsec_pre_bypassed){
            return muiTheme.palette.warning.main;
        }else if(props.task.opsec_post_blocked && !props.task.opsec_post_bypassed){
            return muiTheme.palette.warning.main;
        }else{
             return muiTheme.palette.info.main;
        }
    }
    const prevResponses = useRef(props.task.responses);
    useEffect( () => {
        //console.log("in use effect", prevResponses.current, props.task.responses);
        if(!dropdownOpen){
            if(props.task.responses.length > prevResponses.current.length){
                if(props.task.responses[props.task.responses.length -1].id > lastSeenResponse){
                    setAlertBadges(props.task.responses.length - prevResponses.current.length);
                    setLastSeenResponse(props.task.responses[props.task.responses.length -1].id);
                }
            }
        }else{
            setAlertBadges(0);
            
        }
    }, [props.task.responses, dropdownOpen, lastSeenResponse]);
    const toggleTaskDropdown = (event, newExpanded) => {
        if(newExpanded){
            setAlertBadges(0);
        }
        setDropdownOpen(newExpanded);
    }
    const copyToClipboard = () => {
        let result = copyStringToClipboard(props.task.original_params);
        if(result){
          snackActions.success("Copied text!");
        }else{
          snackActions.error("Failed to copy text");
        }
    }
    const toggleDisplayComment = (evt) => {
        evt.stopPropagation();
        setDisplayComment(!displayComment);
    }
    useEffect( () => {
        setTask(props.task);
        setCommandID(props.command_id);
    }, [props.task, props.command_id]);
    return (
    	<StyledTreeItem nodeId={"treenode:" + props.task.id} 
    		onLabelClick={(evt)=>{evt.preventDefault()}} 
    		onIconClick={getSubTasks}
    		icon={
    			props.nodesSelected.includes("treenode:" + props.task.id) ? (<MinusSquare />) : (props.task.tasks.length > 0 ? (<PlusSquare />) : (null) )
    		}
    		label={
    			<Paper className={classes.root} elevation={5}>
	      			<Accordion TransitionProps={{ unmountOnExit: true }} onChange={toggleTaskDropdown} >
				        <AccordionSummary
				          expandIcon={<ExpandMoreIcon />}
				          aria-controls="panel1c-content"
				          id="panel1c-header"
				          style={{paddingLeft: 0}}
				          classes={{content: accordionClasses.content, expandIcon: accordionClasses.expandIcon, root: accordionClasses.root}}
				        >  
				          <span style={{display: "flex", margin: 0, borderWidth: 0, padding: 0, minHeight: "48px", alignItems: "center", height: "100%", borderLeft: "6px solid " + getTaskStatusColor(), paddingLeft: "5px"}}>
				              <div>
				                {displayComment ? (
				                    <React.Fragment>
				                        <Typography className={classes.secondaryHeading}>{props.task.commentOperator.username}</Typography>
				                        <Typography className={classes.heading}>{props.task.comment}</Typography>
				                    </React.Fragment>
				                  ) : (null)}
				                  
				                  <div>
				                    <div className={classes.column}>
				                        <Badge badgeContent={alertBadges} color="secondary" anchorOrigin={{vertical: 'top', horizontal: 'left'}}>
				                            {getTaskStatus()}
				                        </Badge>
				                      </div>
				                      {props.task.comment !== "" ? (
				                        <div className={classes.column}>
				                            <IconButton size="small" style={{padding: "0", color: muiTheme.palette.info.main}} onClick={toggleDisplayComment}><ChatOutlinedIcon/></IconButton>
				                          </div>
				                      ) : (null)}
				                      <div className={classes.column}>
				                        <Typography className={classes.heading}>{props.task.command === null ? (props.task.original_params) : (props.task.command.cmd)}</Typography>
				                      </div><br/>
				                      <div className={classes.column} >
				                        <Typography className={dropdownOpen ? classes.secondaryHeadingExpanded : classes.secondaryHeading}>{props.task.command === null ? (null) : (props.task.display_params)}</Typography>
				                      </div>
				                </div>
				            </div>
				            
				          </span>
	         
	        			</AccordionSummary>
	        
	        			<AccordionActions style={{ padding: "0px", width: "100%"}}>
	          <div className={classes.column} >
	            <Typography className={classes.secondaryHeading}>Task: {props.task.id}, {props.task.operator.username}, {toLocalTime(props.task.timestamp, me.user.view_utc_time)}</Typography>
	          </div>
	          <div className={classes.column}>
	              <Tooltip title="Download output"><IconButton size="small" style={{color: muiTheme.palette.info.main}}><GetAppIcon/></IconButton></Tooltip>
	              <Tooltip title="Link Task"><IconButton size="small" style={{color: muiTheme.palette.info.main}} href={'/new/task/' + props.task.id} target="_blank" onClick={()=> {window.open('/new/task/' + props.task.id, "_blank")}}><LinkIcon /></IconButton></Tooltip>
	              <Tooltip title="Copy original params to clipboard"><IconButton size="small" style={{color: muiTheme.palette.info.main}} onClick={copyToClipboard}><FileCopyOutlinedIcon/></IconButton></Tooltip>
	              <Tooltip title="Edit Comment"><IconButton size="small" style={{color: muiTheme.palette.info.main}} onClick={()=>{setOpenCommentDialog(true);}}><RateReviewOutlinedIcon/></IconButton></Tooltip>
	              <MythicDialog fullWidth={true} maxWidth="md" open={openCommentDialog} 
	                    onClose={()=>{setOpenCommentDialog(false);}} 
	                    innerDialog={<TaskCommentDialog task_id={props.task.id} onClose={()=>{setOpenCommentDialog(false);}} />}
	                />
	              <Tooltip title="View All Parameters"><IconButton size="small" style={{color: muiTheme.palette.info.main}} onClick={()=>{setOpenParametersDialog(true);}}><InputIcon/></IconButton></Tooltip>
	              {props.task.opsec_pre_blocked === null ? (
	                <Tooltip title="No OPSEC PreCheck data"><IconButton size="small" style={{color: muiTheme.palette.disabled.main}}><LockOpenIcon/></IconButton></Tooltip>
	              ) : (  props.task.opsec_pre_bypassed === false ? (
	                        <Tooltip title="Submit OPSEC PreCheck Bypass Request"><IconButton size="small" style={{color: muiTheme.palette.error.main}} onClick={()=>{setOpenOpsecDialog(true);}}><LockIcon/></IconButton></Tooltip>
	                    ) : (
	                        <Tooltip title="View OPSEC PreCheck Data"><IconButton size="small" style={{color: muiTheme.palette.success.main}} onClick={()=>{setOpenOpsecDialog(true);}}><LockOpenIcon/></IconButton></Tooltip>
	                    )             
	                ) 
	              }
	              {props.task.opsec_post_blocked === null ? (
	                <Tooltip title="No OPSEC PostCheck data"><IconButton size="small" style={{color: muiTheme.palette.disabled.main}}><LockOpenIcon/></IconButton></Tooltip>
	              ) : (  props.task.opsec_post_bypassed === false ? (
	                        <Tooltip title="Submit OPSEC PostCheck Bypass Request"><IconButton size="small" style={{color: muiTheme.palette.error.main}} onClick={()=>{setOpenOpsecDialog(true);}}><LockIcon/></IconButton></Tooltip>
	                    ) : (
	                        <Tooltip title="View OPSEC PostCheck Data"><IconButton size="small" style={{color: muiTheme.palette.success.main}} onClick={()=>{setOpenOpsecDialog(true);}}><LockOpenIcon/></IconButton></Tooltip>
	                    )             
	                ) 
	              }
	              <MythicDialog fullWidth={true} maxWidth="md" open={openOpsecDialog} 
	                    onClose={()=>{setOpenOpsecDialog(false);}} 
	                    innerDialog={<TaskOpsecDialog task_id={props.task.id} onClose={()=>{setOpenOpsecDialog(false);}} />}
	                />
	              <MythicDialog fullWidth={true} maxWidth="md" open={openParametersDialog} 
	                    onClose={()=>{setOpenParametersDialog(false);}} 
	                    innerDialog={<TaskViewParametersDialog task_id={props.task.id} onClose={()=>{setOpenParametersDialog(false);}} />}
	                />
	          </div>
				        </AccordionActions>
				        <AccordionDetails className={classes.details}>
				          <ResponseDisplay task={task} command_id={commandID} enable_browserscripts={enableBrowserscripts}/>
				        </AccordionDetails>
	      			</Accordion>
	    		</Paper>
	    	}>
	    	{
	    		taskingData.task.map( (tsk) => (
    				<TaskRow key={"taskrow: " + tsk.id} task={tsk} nodesSelected={props.nodesSelected} toggleSelection={props.toggleSelection}/>
    			))
	    	}
		</StyledTreeItem>
		
    )
}