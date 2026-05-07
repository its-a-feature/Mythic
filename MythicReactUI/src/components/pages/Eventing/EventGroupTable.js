import React from 'react';
import { gql, useMutation } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import Button from '@mui/material/Button';
import {toLocalTime} from "../../utilities/Time";
import NotificationsActiveTwoToneIcon from '@mui/icons-material/NotificationsActiveTwoTone';
import NotificationsOffTwoToneIcon from '@mui/icons-material/NotificationsOffTwoTone';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import InfoTwoToneIcon from '@mui/icons-material/InfoTwoTone';
import {MythicDialog, MythicViewJSONAsTableDialog} from '../../MythicComponents/MythicDialog';
import {
    EventStepInstanceRenderFlowWithProvider,
    EventStepRenderDialog,
    EventStepRenderFlowWithProvider
} from "./EventStepRender";
import OpenInNewTwoToneIcon from '@mui/icons-material/OpenInNewTwoTone';
import ContentCopyTwoToneIcon from '@mui/icons-material/ContentCopyTwoTone';
import {EventGroupInstances} from "./EventGroupInstances";
import DeleteIcon from '@mui/icons-material/Delete';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import PlayCircleFilledTwoToneIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import RuleTwoToneIcon from '@mui/icons-material/RuleTwoTone';
import ChecklistRtlTwoToneIcon from '@mui/icons-material/ChecklistRtlTwoTone';
import {EventGroupTableRunAsDialog} from "./EventApprovalDialog";
import AttachFileIcon from '@mui/icons-material/AttachFile';
import Badge from '@mui/material/Badge';
import {EventFileManageDialog} from "./EventFileManageDialog";
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import {EventTriggerKeywordDialog} from "./EventTriggerKeywordDialog";
import LayersTwoToneIcon from '@mui/icons-material/LayersTwoTone';
import {EventGroupConsumingContainersDialog} from "./EventGroupConsumingContainersDialog";
import CalendarMonthTwoToneIcon from '@mui/icons-material/CalendarMonthTwoTone';
import {EventGroupTableEditDialog} from "./EventEditEventGroupDialog";
import EditNoteTwoToneIcon from '@mui/icons-material/EditNoteTwoTone';
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {MythicStateChip} from "../../MythicComponents/MythicStateChip";

const updateDeleteStatusMutation = gql(`
mutation updateDeleteStatusMutation($eventgroup_id: Int!, $deleted: Boolean!) {
  eventingTriggerUpdate(eventgroup_id: $eventgroup_id, deleted: $deleted) {
    deleted
  }
}
`)
const updateActiveStatusMutation = gql(`
mutation updateActiveStatusMutation($eventgroup_id: Int!, $active: Boolean!) {
  eventingTriggerUpdate(eventgroup_id: $eventgroup_id, active: $active) {
    active
  }
}
`)
const eventingTriggerManualMutation = gql(`
mutation eventingManualTrigger($eventgroup_id: Int!){
    eventingTriggerManual(eventgroup_id: $eventgroup_id){
        status
        error
    }
}
`)
export function EventGroupTable({selectedEventGroup, me, showInstances, showGraph, height}) {
    const [openEventStepRender, setOpenEventStepRender] = React.useState(false);
    const [openEnvView, setOpenEnvView] = React.useState(false);
    const [openTriggerDataView, setOpenTriggerDataView] = React.useState(false);
    const [openFileView, setOpenFileView] = React.useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [openActiveDialog, setOpenActiveDialog] = React.useState(false);
    const [openApprovalDialog, setOpenApprovalDialog] = React.useState(false);
    const [openEditDialog, setOpenEditDialog] = React.useState(false);
    const [updateDeleteMutation] = useMutation(updateDeleteStatusMutation, {
     onCompleted: (data) => {
     },
     onError: (data) => {
        console.log(data);
     }
 })
    const [updateActiveMutation] = useMutation(updateActiveStatusMutation, {
        onCompleted: (data) => {
        },
        onError: (data) => {
            console.log(data);
        }
    })
    const [triggerManually] = useMutation(eventingTriggerManualMutation, {
        onCompleted: (data) => {
            if(data.eventingTriggerManual.status === "success"){
                snackActions.info("Successfully sent trigger message");
            } else {
                snackActions.error(data.eventingTriggerManual.error);
            }
        },
        onError: (data) => {

        }
    })
    const [selectedInstanceID, setSelectedInstanceID] = React.useState(0);
    const [openFileManageView, setOpenFileManageView] = React.useState(false);
    const [openTriggerKeyword, setOpenTriggerKeyword] = React.useState(false);
    const [consumingContainersErrors, setConsumingContainersErrors] = React.useState(0);
    const [openConsumingContainerDialog, setOpenConsumingContainerDialog] = React.useState(false);
    const foundQueryInstanceRef = React.useRef(0);
    React.useEffect( () => {
        if(selectedEventGroup?.id > 0){
            let consumingContainersErrors = 0;
            selectedEventGroup?.eventgroupconsumingcontainers?.forEach( c => {
                if(c?.consuming_container === null){
                    consumingContainersErrors += 1;
                }else {
                    if(!c?.consuming_container?.container_running){
                        consumingContainersErrors += 1;
                    }
                    if(!c?.all_functions_available){
                        consumingContainersErrors += 1;
                    }
                }
            });
            setConsumingContainersErrors(consumingContainersErrors);
        } else {
            setConsumingContainersErrors(0);
            setOpenConsumingContainerDialog(false);
        }
        if(foundQueryInstanceRef.current === 0 || foundQueryInstanceRef.current !== selectedEventGroup.id){
            setSelectedInstanceID(0);
        }
    }, [selectedEventGroup])
     const onAcceptActive = () => {
         updateActiveMutation({variables: {eventgroup_id: selectedEventGroup.id, active: !selectedEventGroup.active}});
     }
     const onAcceptDelete = () => {
        updateDeleteMutation({variables: {eventgroup_id: selectedEventGroup.id, deleted: !selectedEventGroup.deleted}});
     }
     const onTriggerManual = () => {
         triggerManually({variables: {eventgroup_id: selectedEventGroup.id}});
     }
 return (
     <div className="mythic-eventing-detail" style={{height: height || "100%"}}>

         {selectedEventGroup.id === 0 &&
             <MythicPageHeader
                 dense
                 title="All Eventing Runs"
                 subtitle="Review recent workflow executions across all registered event groups."
             />
         }
         {selectedEventGroup.id !== 0 &&
             <>
                 {openDeleteDialog &&
                     <MythicConfirmDialog onClose={() => {
                         setOpenDeleteDialog(false);
                     }} onSubmit={onAcceptDelete} open={openDeleteDialog}/>
                 }
                 {openActiveDialog &&
                     <MythicConfirmDialog onClose={() => {
                         setOpenActiveDialog(false);
                     }} onSubmit={onAcceptActive} open={openActiveDialog}
                                          acceptText={"Disable"}
                     />
                 }
                 <EventGroupWorkflowOverview
                     consumingContainersErrors={consumingContainersErrors}
                     me={me}
                     onClone={() => setOpenFileView(true)}
                     onDelete={() => setOpenDeleteDialog(true)}
                     onDisable={() => setOpenActiveDialog(true)}
                     onEdit={() => setOpenEditDialog(true)}
                     onEnable={onAcceptActive}
                     onManageFiles={() => setOpenFileManageView(true)}
                     onOpenApproval={() => setOpenApprovalDialog(true)}
                     onOpenContainers={() => setOpenConsumingContainerDialog(true)}
                     onOpenEnvironment={() => setOpenEnvView(true)}
                     onOpenGraph={() => setOpenEventStepRender(true)}
                     onOpenKeywordTrigger={() => setOpenTriggerKeyword(true)}
                     onOpenTriggerData={() => setOpenTriggerDataView(true)}
                     onRestore={onAcceptDelete}
                     onTriggerManual={onTriggerManual}
                     selectedEventGroup={selectedEventGroup}
                 />
             </>
         }
         {showGraph && <RenderSteps selectedInstanceID={selectedInstanceID} selectedEventGroup={selectedEventGroup} />}
         {showInstances && <EventGroupInstances setSelectedInstance={setSelectedInstanceID}
                              selectedInstanceID={selectedInstanceID}
                              foundQueryInstanceRef={foundQueryInstanceRef}
                              selectedEventGroup={selectedEventGroup} me={me}/>}
         {openEventStepRender &&
             <MythicDialog fullWidth={true} maxWidth="xl" open={openEventStepRender}
                           onClose={() => {
                               setOpenEventStepRender(false);
                           }}
                           innerDialog={<EventStepRenderDialog onClose={() => {
                               setOpenEventStepRender(false);
                           }} selectedEventGroup={selectedEventGroup}/>}
             />
         }
         {openApprovalDialog &&
             <MythicDialog fullWidth={true} maxWidth="md" open={openApprovalDialog}
                           onClose={() => {
                               setOpenApprovalDialog(false);
                           }}
                           innerDialog={<EventGroupTableRunAsDialog onClose={() => {
                               setOpenApprovalDialog(false);
                           }} eventgroupapprovals={selectedEventGroup.eventgroupapprovals}
                           me={me} selectedEventGroup={selectedEventGroup} />}
             />
         }
         {openFileView &&
             <MythicDialog fullWidth={true} maxWidth="lg" open={openFileView}
                           onClose={() => {
                               setOpenFileView(false);
                           }}
                           innerDialog={<EventGroupTableEditDialog onClose={() => {
                               setOpenFileView(false);
                           }} me={me} selectedEventGroup={selectedEventGroup} includeSteps={true} />}
             />
         }
         {openEnvView && <MythicDialog fullWidth={true} maxWidth="lg" open={openEnvView}
                                       onClose={() => {
                                           setOpenEnvView(false);
                                       }}
                                       innerDialog={<MythicViewJSONAsTableDialog
                                           title="View Global Environment Settings" leftColumn="Env Key"
                                           rightColumn="Env Value" value={selectedEventGroup.environment}
                                           onClose={() => {
                                               setOpenEnvView(false);
                                           }}/>}
         />
         }
         {openTriggerDataView && <MythicDialog fullWidth={true} maxWidth="lg" open={openTriggerDataView}
                                       onClose={() => {
                                           setOpenTriggerDataView(false);
                                       }}
                                       innerDialog={<MythicViewJSONAsTableDialog
                                           title="View Trigger context"
                                           leftColumn="Context Key" rightColumn="Context Value"
                                           value={selectedEventGroup.trigger_data}
                                           onClose={() => {
                                               setOpenTriggerDataView(false);
                                           }}/>}
         />
         }
         {openFileManageView &&
             <MythicDialog fullWidth={true} maxWidth="lg" open={openFileManageView}
                           onClose={() => {
                               setOpenFileManageView(false);
                           }}
                           innerDialog={<EventFileManageDialog onClose={() => {
                               setOpenFileManageView(false);
                           }} me={me} selectedEventGroup={selectedEventGroup} />}
             />
         }
         {openTriggerKeyword &&
             <MythicDialog fullWidth={true} maxWidth="lg" open={openTriggerKeyword}
                           onClose={() => {
                               setOpenTriggerKeyword(false);
                           }}
                           innerDialog={<EventTriggerKeywordDialog onClose={() => {
                               setOpenTriggerKeyword(false);
                           }} me={me} selectedEventGroup={selectedEventGroup} />}
             />
         }
         {openConsumingContainerDialog &&
             <MythicDialog fullWidth={true} maxWidth="lg" open={openConsumingContainerDialog}
                           onClose={() => {
                               setOpenConsumingContainerDialog(false);
                           }}
                           innerDialog={<EventGroupConsumingContainersDialog onClose={() => {
                               setOpenConsumingContainerDialog(false);
                           }} selectedEventGroup={selectedEventGroup} />}
             />
         }
         {openEditDialog &&
             <MythicDialog fullWidth={true} maxWidth="lg" open={openEditDialog}
                           onClose={() => {
                               setOpenEditDialog(false);
                           }}
                           innerDialog={<EventGroupTableEditDialog onClose={() => {
                               setOpenEditDialog(false);
                           }} me={me} selectedEventGroup={selectedEventGroup} />}
             />
         }
     </div>
 )
}

function EventGroupWorkflowOverview({
    consumingContainersErrors,
    me,
    onClone,
    onDelete,
    onDisable,
    onEdit,
    onEnable,
    onManageFiles,
    onOpenApproval,
    onOpenContainers,
    onOpenEnvironment,
    onOpenGraph,
    onOpenKeywordTrigger,
    onOpenTriggerData,
    onRestore,
    onTriggerManual,
    selectedEventGroup,
}) {
    const keywords = selectedEventGroup?.keywords || [];
    const visibleKeywords = keywords.slice(0, 6);
    const hiddenKeywordCount = Math.max(keywords.length - visibleKeywords.length, 0);
    const fileCount = selectedEventGroup?.filemeta?.length || 0;
    const consumingContainers = selectedEventGroup?.eventgroupconsumingcontainers || [];
    const hasTriggerData = hasWorkflowDetailValue(selectedEventGroup?.trigger_data);
    const hasEnvironment = hasWorkflowDetailValue(selectedEventGroup?.environment);
    const isApproved = Boolean(selectedEventGroup?.approved_to_run);
    const createdBy = selectedEventGroup?.operator?.username || "unknown";
    const createdAt = toLocalTime(selectedEventGroup?.created_at, me?.user?.view_utc_time);

    return (
        <div className="mythic-eventing-workflow-overview">
            <div className="mythic-eventing-workflow-overview-header">
                <div className="mythic-eventing-workflow-overview-title-block">
                    <div className="mythic-eventing-workflow-overview-title-row">
                        <span className="mythic-eventing-workflow-overview-title">{selectedEventGroup?.name}</span>
                        <MythicPageHeaderChip
                            icon={selectedEventGroup?.active ? <NotificationsActiveTwoToneIcon /> : <NotificationsOffTwoToneIcon />}
                            label={selectedEventGroup?.active ? "Enabled" : "Disabled"}
                            status={selectedEventGroup?.active ? "enabled" : "disabled"}
                        />
                        {selectedEventGroup?.deleted && <MythicPageHeaderChip label="Deleted" status="error" />}
                    </div>
                    {selectedEventGroup?.description &&
                        <div className="mythic-eventing-workflow-overview-description">{selectedEventGroup.description}</div>
                    }
                </div>
                <div className="mythic-eventing-workflow-overview-header-actions">
                    {selectedEventGroup?.deleted ? (
                        <Button className="mythic-table-row-action mythic-table-row-action-hover-success" variant="outlined" size="small" startIcon={<RestoreFromTrashIcon fontSize="small" />} onClick={onRestore}>
                            Restore
                        </Button>
                    ) : (
                        <Button className="mythic-table-row-action mythic-table-row-action-hover-danger" variant="outlined" size="small" startIcon={<DeleteIcon fontSize="small" />} onClick={onDelete}>
                            Delete
                        </Button>
                    )}
                    {selectedEventGroup?.active ? (
                        <Button className="mythic-table-row-action mythic-table-row-action-hover-warning" variant="outlined" size="small" startIcon={<NotificationsActiveTwoToneIcon fontSize="small" />} onClick={onDisable}>
                            Disable
                        </Button>
                    ) : (
                        <Button className="mythic-table-row-action mythic-table-row-action-hover-success" variant="outlined" size="small" startIcon={<NotificationsOffTwoToneIcon fontSize="small" />} onClick={onEnable}>
                            Enable
                        </Button>
                    )}
                </div>
            </div>
            <div className="mythic-eventing-workflow-overview-section mythic-eventing-workflow-overview-primary">
                <div className="mythic-eventing-workflow-overview-field">
                    <span className="mythic-eventing-workflow-overview-label">Created by</span>
                    <span className="mythic-eventing-workflow-overview-value">{createdBy}</span>
                    <span className="mythic-eventing-workflow-overview-subvalue">{createdAt}</span>
                </div>
                <div className="mythic-eventing-workflow-overview-field">
                    <span className="mythic-eventing-workflow-overview-label">Trigger behavior</span>
                    <div className="mythic-eventing-workflow-chip-row">
                        <MythicStateChip compact label={selectedEventGroup?.trigger || "unknown"} state="info" />
                    </div>
                    {selectedEventGroup?.trigger === "cron" &&
                        <span className="mythic-eventing-workflow-overview-subvalue mythic-eventing-workflow-overview-icon-line">
                            <CalendarMonthTwoToneIcon fontSize="small" />
                            {toLocalTime(selectedEventGroup?.next_scheduled_run, me?.user?.view_utc_time)}
                        </span>
                    }
                </div>
            </div>

            <div className="mythic-eventing-workflow-overview-section">
                <div className="mythic-eventing-workflow-overview-field">
                    <span className="mythic-eventing-workflow-overview-label">Keywords</span>
                    <div className="mythic-eventing-workflow-chip-row">
                        {keywords.length === 0 ? (
                            <MythicStateChip compact label="No keywords" state="neutral" />
                        ) : (
                            <>
                                {visibleKeywords.map((keyword, index) => (
                                    <span className="mythic-eventing-workflow-keyword-chip" key={`${keyword}-${index}`}>{keyword}</span>
                                ))}
                                {hiddenKeywordCount > 0 &&
                                    <MythicStyledTooltip title={keywords.join(", ")}>
                                        <span className="mythic-eventing-workflow-keyword-chip mythic-eventing-workflow-keyword-more">+{hiddenKeywordCount} more</span>
                                    </MythicStyledTooltip>
                                }
                            </>
                        )}
                    </div>
                </div>
                <div className="mythic-eventing-workflow-overview-field">
                    <span className="mythic-eventing-workflow-overview-label">Run context</span>
                    <div className="mythic-eventing-workflow-chip-row">
                        <MythicStateChip compact label={selectedEventGroup?.run_as || "unknown"} state="neutral" />
                        <Button
                            className={`mythic-eventing-workflow-approval-button mythic-eventing-workflow-approval-${isApproved ? "approved" : "needs-approval"}`.trim()}
                            size="small"
                            startIcon={isApproved ? <ChecklistRtlTwoToneIcon fontSize="small" /> : <RuleTwoToneIcon fontSize="small" />}
                            onClick={onOpenApproval}
                        >
                            {isApproved ? "Approved" : "Needs approval"}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mythic-eventing-workflow-overview-section mythic-eventing-workflow-overview-actions">
                <div className="mythic-eventing-workflow-action-group">
                    <span className="mythic-eventing-workflow-overview-label">Attached details</span>
                    <div className="mythic-eventing-workflow-button-row">
                        <Button
                            className="mythic-table-row-action mythic-table-row-action-hover-info"
                            disabled={!hasTriggerData}
                            size="small"
                            startIcon={<InfoTwoToneIcon fontSize="small" />}
                            onClick={onOpenTriggerData}
                        >
                            Trigger data
                        </Button>
                        <Button
                            className="mythic-table-row-action mythic-table-row-action-hover-info"
                            disabled={!hasEnvironment}
                            size="small"
                            startIcon={<InfoTwoToneIcon fontSize="small" />}
                            onClick={onOpenEnvironment}
                        >
                            Environment
                        </Button>
                        <Button
                            className="mythic-table-row-action mythic-table-row-action-hover-info"
                            size="small"
                            startIcon={
                                <Badge badgeContent={fileCount} color="secondary">
                                    <AttachFileIcon fontSize="small" />
                                </Badge>
                            }
                            onClick={onManageFiles}
                        >
                            Files
                        </Button>
                        {consumingContainers.length > 0 &&
                            <Button
                                className={`mythic-table-row-action ${consumingContainersErrors > 0 ? "mythic-table-row-action-hover-danger" : "mythic-table-row-action-hover-info"}`.trim()}
                                size="small"
                                startIcon={
                                    <Badge badgeContent={consumingContainersErrors} color="error">
                                        <LayersTwoToneIcon fontSize="small" />
                                    </Badge>
                                }
                                onClick={onOpenContainers}
                            >
                                Containers
                            </Button>
                        }
                    </div>
                </div>
                <div className="mythic-eventing-workflow-action-group">
                    <span className="mythic-eventing-workflow-overview-label">Workflow actions</span>
                    <div className="mythic-eventing-workflow-button-row">
                        {selectedEventGroup?.trigger === "manual" &&
                            <Button
                                className="mythic-table-row-action mythic-table-row-action-hover-success"
                                size="small"
                                startIcon={<PlayCircleFilledTwoToneIcon fontSize="small" />}
                                onClick={onTriggerManual}
                            >
                                Run now
                            </Button>
                        }
                        {keywords.length > 0 &&
                            <Button
                                className="mythic-table-row-action mythic-table-row-action-hover-success"
                                size="small"
                                startIcon={<SpellcheckIcon fontSize="small" />}
                                onClick={onOpenKeywordTrigger}
                            >
                                Keyword run
                            </Button>
                        }
                        <MythicStyledTooltip title="Edit workflow metadata and settings, not steps">
                            <Button
                                className="mythic-table-row-action mythic-table-row-action-hover-info"
                                size="small"
                                startIcon={<EditNoteTwoToneIcon fontSize="small" />}
                                onClick={onEdit}
                            >
                                Edit details
                            </Button>
                        </MythicStyledTooltip>
                        <MythicStyledTooltip title="Large graph view">
                            <Button
                                className="mythic-table-row-action mythic-table-row-action-hover-info"
                                size="small"
                                startIcon={<OpenInNewTwoToneIcon fontSize="small" />}
                                onClick={onOpenGraph}
                            >
                                Open graph
                            </Button>
                        </MythicStyledTooltip>
                        <MythicStyledTooltip title="Create a new workflow using this workflow as the starting point">
                            <Button
                                className="mythic-table-row-action mythic-table-row-action-hover-success"
                                size="small"
                                startIcon={<ContentCopyTwoToneIcon fontSize="small" />}
                                onClick={onClone}
                            >
                                Duplicate workflow
                            </Button>
                        </MythicStyledTooltip>
                    </div>
                </div>
            </div>
        </div>
    );
}

function hasWorkflowDetailValue(value) {
    if(value === null || value === undefined){
        return false;
    }
    if(typeof value === "string"){
        return value.trim().length > 0;
    }
    if(Array.isArray(value)){
        return value.length > 0;
    }
    if(typeof value === "object"){
        return Object.keys(value).length > 0;
    }
    return Boolean(value);
}

function RenderSteps({selectedEventGroup, selectedInstanceID}){
    const getRenderer = () => {
        if(selectedInstanceID > 0){
            return <EventStepInstanceRenderFlowWithProvider selectedEventGroupInstance={selectedInstanceID} />
        }
        if(selectedEventGroup.id > 0){
            return <EventStepRenderFlowWithProvider selectedEventGroup={selectedEventGroup} />
        }
        return null
    }

    return (
        <div className="mythic-eventing-graph-panel">
            {getRenderer()}
        </div>
    )
}
