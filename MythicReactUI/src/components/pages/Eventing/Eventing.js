import React, {useCallback} from 'react';
import { gql, useSubscription, useQuery } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import {useTheme} from '@mui/material/styles';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import {EventGroupTable} from "./EventGroupTable";
import {UploadEventFile} from "../../MythicComponents/MythicFileUpload";
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import { IconButton } from '@mui/material';
import NotificationsOffTwoToneIcon from '@mui/icons-material/NotificationsOffTwoTone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {TestEventGroupFileDialog} from "./CreateEventWorkflowDialog";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Split from 'react-split';
import Paper from '@mui/material/Paper';

const get_eventgroups = gql`
query GetEventGroups {
  eventgroup(limit: 50, order_by: {id: desc}) {
    id
    operator {
        username
    }
    filemetum {
        agent_file_id
        id
        filename_text
    }
    filemeta(where: {deleted: {_eq: false}}) {
        agent_file_id
        id
        filename_text
        deleted
    }
    name
    description
    trigger
    trigger_data
    next_scheduled_run
    keywords
    environment
    active
    deleted
    created_at
    run_as
    approved_to_run
    eventgroupapprovals(order_by: {id: asc}) {
      id
      operator {
        id
        username
      }
      approved
      created_at
      updated_at
    }
    eventgroupconsumingcontainers {
        id
        consuming_container_name
        all_functions_available
        function_names
        consuming_container {
            container_running
            subscriptions
        }
    }
  }
}
`;
const sub_eventgroups = gql`
subscription GetEventGroups {
  eventgroup_stream(cursor: {initial_value: {updated_at: "1970-01-01"}, ordering: ASC}, batch_size: 50, where: {}) {
    id
    operator {
        username
    }
    filemetum {
        agent_file_id
        id
        filename_text
    }
    filemeta(where: {deleted: {_eq: false}}) {
        agent_file_id
        id
        filename_text
        deleted
    }
    name
    description
    trigger
    trigger_data
    next_scheduled_run
    keywords
    environment
    active
    deleted
    created_at
    run_as
    approved_to_run
    eventgroupapprovals(order_by: {id: asc}) {
      id
      operator {
        id
        username
      }
      approved
      created_at
      updated_at
    }
    eventgroupconsumingcontainers {
        id
        consuming_container_name
        all_functions_available
        function_names
        consuming_container {
            container_running
            subscriptions
        }
    }
  }
}
 `;
export const initialWorkflow = `name: "New Eventing Workflow"
description: "automatically do something based on a new callback"
trigger: callback_new
trigger_data:
  payload_types:
    - apollo
keywords:
  - apollo_callback
environment:
steps:
  - name: "run command 1"
    inputs:
      CALLBACK_ID: env.display_id
    action: task_create
    action_data:
      callback_display_id: CALLBACK_ID
      params: string params here
      command_name: shell
  - name: "run command 2"
    description: "do something specific for the second command"
    inputs:
      CALLBACK_ID: env.display_id
    action: task_create
    action_data:
      callback_display_id: CALLBACK_ID
      params_dictionary:
        filename: a named parameter here
        code: another named parameter 
      command_name: command_with_named_params
    depends_on:
      - run command 1
    outputs:
      SCRIPT_TASK_ID: id
`;
export function Eventing({me}){
    const theme = useTheme();
    const [openTestModal, setOpenTestModal] = React.useState(false);
    const [eventgroups, setEventgroups] = React.useState([]);
    const [showDeleted, setShowDeleted] = React.useState(false);
    const [selectedEventGroup, setSelectedEventGroup] = React.useState({id: 0});
    const foundQueryEvent = React.useRef(false);
    useQuery(get_eventgroups, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            setEventgroups( function(prevState) {
                const newEvents = data.eventgroup.reduce( (prev, cur) => {
                    let indx = prev.findIndex( ({id}) => id === cur.id);
                    if(indx > -1){
                        let updatingPrev = [...prev];
                        updatingPrev[indx] = cur;
                        return [...updatingPrev];
                    }
                    return [...prev, cur];
                }, [...prevState]);
                newEvents.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
                if(selectedEventGroup.id > 0){
                    const updatedSelectedEventGroup = newEvents.filter(e => e.id === selectedEventGroup.id);
                    if(updatedSelectedEventGroup.length > 0){
                        setSelectedEventGroup(updatedSelectedEventGroup[0]);
                    }
                }
                return newEvents;
            })
        },
        onError: (error) => {
            console.log(error);
        }
    })
    useSubscription(sub_eventgroups, {
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            setEventgroups( function(prevState) {
                const newEvents = data.data.eventgroup_stream.reduce( (prev, cur) => {
                    let indx = prev.findIndex( ({id}) => id === cur.id);
                    if(indx > -1){
                        let updatingPrev = [...prev];
                        updatingPrev[indx] = cur;
                        return [...updatingPrev];
                    }
                    return [...prev, cur];
                }, [...prevState]);
                newEvents.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
                if(selectedEventGroup.id > 0){
                    const updatedSelectedEventGroup = newEvents.filter(e => e.id === selectedEventGroup.id);
                    if(updatedSelectedEventGroup.length > 0){
                        setSelectedEventGroup(updatedSelectedEventGroup[0]);
                    }
                }
                return newEvents;
            })
        }
    });
    const onFileChange = async (evt) => {
        for(let i = 0; i < evt.target.files.length; i++){
            let uploadStatus = await UploadEventFile(evt.target.files[i], "New Eventing Workflow");
            if(!uploadStatus){
                snackActions.error("Failed to upload file");
                continue
            }
            if(uploadStatus.status === "error"){
                snackActions.error(uploadStatus.error);
            }
        }
        evt.target.value = null;
    }
    React.useEffect( () => {
        if( !foundQueryEvent.current ){
            let queryParams = new URLSearchParams(window.location.search);
            const eventgroup = queryParams.has("eventgroup") ? queryParams.get("eventgroup") : "0";
            if(eventgroup !== "0"){
                let matchedGroup = eventgroups.find( e => `${e.id}` === eventgroup);
                if(matchedGroup){
                    setSelectedEventGroup(matchedGroup);
                    foundQueryEvent.current = true;
                }
            }
        }

    }, [eventgroups]);
    return (
        <div style={{display: "flex", flexDirection: "column", height: "100%",  overflowY: "auto"}}>
            <div style={{display: "flex", flexDirection: "row", height: "100%"}}>
                <Split direction="horizontal" style={{width: "100%", height: "100%", display: "flex", overflow: "hidden"}} sizes={[20, 80]} >
                    <div className="bg-gray-base" style={{display: "inline-flex"}}>
                        <div style={{width: "100%", height: '100%', display: "flex", flexDirection: "column"}}>
                            <Paper style={{marginBottom: "5px"}}>
                                <MythicStyledTooltip title={"Upload complete workflow files"} >
                                    <Button size={"small"} style={{display: "inline-flex", marginRight: "10px", marginLeft: "10px", marginTop: "5px"}}
                                            color={"info"} component="label" startIcon={<CloudUploadIcon  />}
                                    >

                                        Upload
                                        <input onChange={onFileChange} type="file" multiple hidden/>
                                    </Button>
                                </MythicStyledTooltip>
                                <MythicStyledTooltip title={"Create Workflow with Text Editor"} >
                                    <Button size={"small"}  color={"success"}
                                            style={{display: "inline-flex", marginRight: "10px", marginLeft: "10px", marginTop: "5px"}}
                                            onClick={()=>setOpenTestModal(true)}
                                            startIcon={<AddCircleIcon  />}
                                    >
                                        Create New
                                    </Button>
                                </MythicStyledTooltip>
                            </Paper>

                            {openTestModal &&
                                <MythicDialog fullWidth={true} maxWidth="xl" open={openTestModal}
                                              onClose={(e) => {
                                                  setOpenTestModal(false);
                                              }}
                                              innerDialog={<TestEventGroupFileDialog
                                                  initialWorkflow={initialWorkflow}
                                                  onClose={(e) => {
                                                      setOpenTestModal(false);
                                                  }}/>}
                                />
                            }
                            <ListItem onClick={() => setSelectedEventGroup({id: 0})}
                                style={selectedEventGroup.id === 0 ?
                                    {paddingTop: 0, paddingBottom: 0, borderLeft: `5px solid ${theme.palette.info.main}`} :
                                    {paddingTop: 0, paddingBottom: 0}}>
                                <ListItemText primary={"View All Instances"} />
                            </ListItem>
                            <div style={{flexGrow: 1, overflowY: "auto", height:"100%"}}>
                                <List style={{border: 0, backgroundColor: "unset"}}
                                subheader={
                                    <ListSubheader style={{lineHeight: "30px"}} component="div">
                                        Registered Event Groups
                                        {showDeleted ? (
                                            <MythicStyledTooltip title={"Hide Deleted Services"} tooltipStyle={{float: "right"}}>
                                                <IconButton size="small" style={{float: "right", }} variant="contained" onClick={() => setShowDeleted(!showDeleted)}><VisibilityIcon /></IconButton>
                                            </MythicStyledTooltip>

                                        ) : (
                                            <MythicStyledTooltip title={"Show Deleted Services"} tooltipStyle={{float: "right"}}>
                                                <IconButton size="small" style={{float: "right", }} variant="contained" onClick={() => setShowDeleted(!showDeleted)} ><VisibilityOffIcon /></IconButton>
                                            </MythicStyledTooltip>
                                        )}
                                    </ListSubheader>
                                }>
                                    {eventgroups.map( (e, i) => (
                                        (showDeleted || !e.deleted) &&
                                        <ListItem key={e.id + e.name} onClick={() => setSelectedEventGroup(e)}
                                                  style={selectedEventGroup.id === e.id ?
                                                      {paddingTop: 0, paddingBottom: 0, borderLeft: `5px solid ${theme.palette.info.main}`} :
                                                      {paddingTop: 0, paddingBottom: 0}}>
                                            {!e.active &&
                                                <NotificationsOffTwoToneIcon color={"warning"} />
                                            }
                                            <ListItemText primary={e.name} style={{
                                                textDecoration: e.deleted ? "line-through" : ""
                                            }} />
                                        </ListItem>
                                    ))}
                                </List>
                            </div>
                            <Divider />
                        </div>
                    </div>
                    <div className="bg-gray-light" style={{display: "inline-flex"}}>
                        <div style={{width: "100%", height: "100%"}}>
                            <EventGroupTable selectedEventGroup={selectedEventGroup} me={me} />
                        </div>
                    </div>
                </Split>

            </div>
        </div>
    )
}