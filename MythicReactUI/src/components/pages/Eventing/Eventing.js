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
import FactCheckIcon from '@mui/icons-material/FactCheck';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {TestEventGroupFileDialog} from "../Search/PreviewFileMedia";

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
                <div style={{width: "20%", borderRight: "2px solid grey", height: '100%', display: "flex", flexDirection: "column"}}>
                    <div style={{marginBottom: "5px"}}>
                        <Button size={"small"} style={{display: "inline-flex", marginRight: "10px", marginLeft: "10px", marginTop: "5px"}}
                                variant={"contained"} color={"success"} component="label"
                                startIcon={<CloudUploadIcon />}
                        >
                            Upload New
                            <input onChange={onFileChange} type="file" multiple hidden/>
                        </Button>
                        <Button size={"small"} variant={"contained"} color={"info"}
                                startIcon={<FactCheckIcon />}
                                style={{display: "inline-flex", marginRight: "10px", marginLeft: "10px", marginTop: "5px"}}
                                onClick={()=>setOpenTestModal(true)}>
                            Create & Test
                        </Button>
                    </div>

                    {openTestModal &&
                        <MythicDialog fullWidth={true} maxWidth="xl" open={openTestModal}
                                      onClose={(e) => {
                                          setOpenTestModal(false);
                                      }}
                                      innerDialog={<TestEventGroupFileDialog
                                          onClose={(e) => {
                                              setOpenTestModal(false);
                                          }}/>}
                        />
                    }
                    <ListItem button onClick={() => setSelectedEventGroup({id: 0})}
                        style={selectedEventGroup.id === 0 ?
                            {paddingTop: 0, paddingBottom: 0, borderLeft: `5px solid ${theme.palette.info.main}`} :
                            {paddingTop: 0, paddingBottom: 0}}>
                        <ListItemText primary={"View All Instances"} />
                    </ListItem>
                    <div style={{flexGrow: 1, overflowY: "auto", height:"100%"}}>
                        <List style={{border: 0}}
                        subheader={
                            <ListSubheader style={{backgroundColor: theme.palette.secondary.main,
                                color: theme.palette.text.contrast,
                                lineHeight: "30px"}} component="div">
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
                                <ListItem key={e.id + e.name} button onClick={() => setSelectedEventGroup(e)}
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
                <div style={{width: "80%", height: "100%"}}>
                    <EventGroupTable selectedEventGroup={selectedEventGroup} me={me} />
                </div>

            </div>
        </div>
    )
}