import React from 'react';
import { gql, useSubscription, useQuery } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import {EventGroupTable} from "./EventGroupTable";
import {UploadEventFile} from "../../MythicComponents/MythicFileUpload";
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {TestEventGroupFileDialog} from "./CreateEventWorkflowDialog";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Split from 'react-split';
import {CreateEventingStepper} from "./CreateEventingStepper";
import CategoryIcon from '@mui/icons-material/Category';
import {MythicPageBody} from "../../MythicComponents/MythicPageBody";
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {MythicToolbarButton, MythicToolbarToggle} from "../../MythicComponents/MythicTableToolbar";
import {MythicStateChip} from "../../MythicComponents/MythicStateChip";

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
const sidebarFilterOptionsBase = [
    {key: "all", label: "All"},
    {key: "runnable", label: "Runnable"},
    {key: "needs_approval", label: "Needs approval"},
    {key: "disabled", label: "Disabled"},
];
const getEventGroupStatus = (eventGroup) => {
    if(eventGroup.deleted){
        return {key: "deleted", label: "Deleted", rank: 3};
    }
    if(!eventGroup.active){
        return {key: "disabled", label: "Disabled", rank: 2};
    }
    if(!eventGroup.approved_to_run){
        return {key: "needs_approval", label: "Needs approval", rank: 1};
    }
    return {key: "runnable", label: "Runnable", rank: 0};
};
const getEventGroupStateChipState = (statusKey) => {
    switch(statusKey){
        case "runnable":
            return "enabled";
        case "needs_approval":
            return "warning";
        case "disabled":
            return "disabled";
        case "deleted":
            return "error";
        default:
            return "neutral";
    }
}
export function Eventing({me}){
    const [openTestModal, setOpenTestModal] = React.useState(false);
    const [openCreateEventingStepper, setOpenCreateEventingStepper] = React.useState(false);
    const [eventgroups, setEventgroups] = React.useState([]);
    const [showDeleted, setShowDeleted] = React.useState(false);
    const [sidebarSearch, setSidebarSearch] = React.useState("");
    const [sidebarFilter, setSidebarFilter] = React.useState("all");
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
    const onCloseStepper = (e, success) => {
        if(success === true){
            setOpenCreateEventingStepper(false);
        }
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
    const visibleEventGroups = React.useMemo(() => {
        return eventgroups.filter(e => showDeleted || !e.deleted);
    }, [eventgroups, showDeleted]);
    const activeEventGroups = React.useMemo(() => {
        return eventgroups.filter(e => !e.deleted && e.active);
    }, [eventgroups]);
    React.useEffect(() => {
        if(!showDeleted && sidebarFilter === "deleted"){
            setSidebarFilter("all");
        }
    }, [showDeleted, sidebarFilter]);
    const sidebarFilterCounts = React.useMemo(() => {
        return visibleEventGroups.reduce((prev, cur) => {
            const status = getEventGroupStatus(cur);
            return {...prev, [status.key]: (prev[status.key] || 0) + 1};
        }, {runnable: 0, needs_approval: 0, disabled: 0, deleted: 0});
    }, [visibleEventGroups]);
    const sidebarFilterOptions = React.useMemo(() => {
        if(showDeleted){
            return [...sidebarFilterOptionsBase, {key: "deleted", label: "Deleted"}];
        }
        return sidebarFilterOptionsBase;
    }, [showDeleted]);
    const filteredEventGroups = React.useMemo(() => {
        const search = sidebarSearch.trim().toLowerCase();
        return visibleEventGroups.filter((eventGroup) => {
            const status = getEventGroupStatus(eventGroup);
            if(sidebarFilter !== "all" && sidebarFilter !== status.key){
                return false;
            }
            if(search === ""){
                return true;
            }
            const searchText = [
                eventGroup.name,
                eventGroup.description,
                eventGroup.trigger,
                eventGroup.run_as,
                eventGroup.operator?.username,
                ...(Array.isArray(eventGroup.keywords) ? eventGroup.keywords : []),
            ].filter(Boolean).join(" ").toLowerCase();
            return searchText.includes(search);
        }).sort((a, b) => {
            const statusA = getEventGroupStatus(a);
            const statusB = getEventGroupStatus(b);
            if(statusA.rank !== statusB.rank){
                return statusA.rank - statusB.rank;
            }
            return (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0);
        });
    }, [sidebarFilter, sidebarSearch, visibleEventGroups]);
    const selectedEventLabel = selectedEventGroup.id === 0 ? "All runs" : selectedEventGroup.name;
    return (
        <MythicPageBody>
            <MythicPageHeader
                title="Eventing"
                subtitle="Create, review, and manually trigger operation workflows."
                meta={
                    <>
                        <MythicPageHeaderChip label={`${visibleEventGroups.length} shown`} />
                        <MythicPageHeaderChip label={`${activeEventGroups.length} active`} />
                        <MythicPageHeaderChip label={selectedEventLabel} />
                        {showDeleted && <MythicPageHeaderChip label="Deleted visible" />}
                    </>
                }
                actions={
                    <>
                        <MythicToolbarButton className="mythic-table-row-action-hover-info" variant="outlined" component="label" startIcon={<CloudUploadIcon fontSize="small" />}>
                            Upload
                            <input onChange={onFileChange} type="file" multiple hidden/>
                        </MythicToolbarButton>
                        <MythicToolbarButton className="mythic-table-row-action-hover-success" variant="outlined" onClick={()=>setOpenTestModal(true)} startIcon={<AddCircleIcon fontSize="small" />}>
                            Text
                        </MythicToolbarButton>
                        <MythicToolbarButton className="mythic-table-row-action-hover-success" variant="outlined" onClick={()=>setOpenCreateEventingStepper(true)} startIcon={<CategoryIcon fontSize="small" />}>
                            Wizard
                        </MythicToolbarButton>
                        <MythicToolbarToggle
                            className={showDeleted ? "mythic-table-row-action-hover-warning" : "mythic-table-row-action-hover-info"}
                            checked={showDeleted}
                            onClick={() => setShowDeleted(!showDeleted)}
                            label="Deleted"
                            activeIcon={<VisibilityIcon fontSize="small" />}
                            inactiveIcon={<VisibilityOffIcon fontSize="small" />}
                        />
                    </>
                }
            />
            <div className="mythic-eventing-workspace">
                <Split direction="horizontal" className="mythic-eventing-split" sizes={[30, 70]} minSize={[360, 520]} >
                    <div className="mythic-eventing-sidebar">
                        <div style={{width: "100%", height: '100%', display: "flex", flexDirection: "column"}}>
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
                            {openCreateEventingStepper &&
                                <MythicDialog fullWidth={true} maxWidth="xl" open={openCreateEventingStepper}
                                              onClose={() => setOpenCreateEventingStepper(false)}
                                              innerDialog={<CreateEventingStepper onClose={onCloseStepper} />}
                                />
                            }
                            <div className="mythic-eventing-sidebar-toolbar">
                                <div className="mythic-eventing-sidebar-title-row">
                                    <div>
                                        <div className="mythic-eventing-sidebar-title">Registered event groups</div>
                                        <div className="mythic-eventing-sidebar-subtitle">Browse workflows by run state</div>
                                    </div>
                                    <span className="mythic-eventing-sidebar-count">{filteredEventGroups.length}/{visibleEventGroups.length}</span>
                                </div>
                                <TextField
                                    className="mythic-eventing-sidebar-search"
                                    size="small"
                                    fullWidth
                                    placeholder="Search workflows"
                                    value={sidebarSearch}
                                    onChange={(event) => setSidebarSearch(event.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        )
                                    }}
                                />
                                <div className="mythic-eventing-filter-row">
                                    {sidebarFilterOptions.map((filterOption) => {
                                        const filterCount = filterOption.key === "all" ? visibleEventGroups.length : sidebarFilterCounts[filterOption.key];
                                        return (
                                            <button
                                                key={filterOption.key}
                                                type="button"
                                                onClick={() => setSidebarFilter(filterOption.key)}
                                                className={`mythic-eventing-filter-button ${sidebarFilter === filterOption.key ? "mythic-eventing-filter-button-active" : ""}`.trim()}
                                            >
                                                <span>{filterOption.label}</span>
                                                <span className="mythic-eventing-filter-count">{filterCount || 0}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <ListItem onClick={() => setSelectedEventGroup({id: 0})}
                                      className={`mythic-eventing-list-item mythic-eventing-list-item-all ${selectedEventGroup.id === 0 ? "mythic-eventing-list-item-selected" : ""}`.trim()}>
                                <div className="mythic-eventing-status-dot mythic-eventing-status-all" />
                                <div className="mythic-eventing-list-item-content">
                                    <div className="mythic-eventing-list-item-main">
                                        <span className="mythic-eventing-list-item-name">All workflow runs</span>
                                        <MythicStateChip compact label={visibleEventGroups.length} state="info" />
                                    </div>
                                    <div className="mythic-eventing-list-item-meta">Review instances across all event groups</div>
                                </div>
                            </ListItem>
                            <div className="mythic-eventing-list-scroll">
                                <List className="mythic-eventing-list">
                                    {filteredEventGroups.length === 0 ? (
                                        <div className="mythic-eventing-list-empty">No workflows match this view</div>
                                    ) : filteredEventGroups.map( (eventGroup) => {
                                        const status = getEventGroupStatus(eventGroup);
                                        return (
                                            <ListItem key={eventGroup.id + eventGroup.name} onClick={() => setSelectedEventGroup(eventGroup)}
                                                      className={`mythic-eventing-list-item ${selectedEventGroup.id === eventGroup.id ? "mythic-eventing-list-item-selected" : ""} mythic-eventing-list-item-${status.key}`.trim()}>
                                                <div className={`mythic-eventing-status-dot mythic-eventing-status-${status.key}`} />
                                                <div className="mythic-eventing-list-item-content">
                                                    <div className="mythic-eventing-list-item-main">
                                                        <span className={`mythic-eventing-list-item-name ${eventGroup.deleted ? "mythic-eventing-list-item-name-deleted" : ""}`.trim()}>{eventGroup.name}</span>
                                                        <MythicStateChip compact label={status.label} state={getEventGroupStateChipState(status.key)} />
                                                    </div>
                                                    <div className="mythic-eventing-list-item-meta">
                                                        <span>{eventGroup.trigger || "No trigger"}</span>
                                                        <span className="mythic-eventing-runas-chip">{eventGroup.run_as || "unknown"}</span>
                                                    </div>
                                                </div>
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            </div>
                            <Divider />
                        </div>
                    </div>
                    <div className="mythic-eventing-content">
                        <div style={{width: "100%", height: "100%"}}>
                            <EventGroupTable selectedEventGroup={selectedEventGroup} me={me} showInstances={true} showGraph={true} />
                        </div>
                    </div>
                </Split>

            </div>
        </MythicPageBody>
    )
}
