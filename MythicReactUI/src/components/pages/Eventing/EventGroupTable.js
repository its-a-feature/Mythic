import React from 'react';
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import {MythicActionButton} from '../../MythicComponents/MythicActionButton';
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
import EditNoteTwoToneIcon from '@mui/icons-material/EditNoteTwoTone';
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {MythicChip, SquareChip} from "../../MythicComponents/MythicChip";
import {CreateEventingStepper, getWizardPayloadFromWorkflow} from "./CreateEventingStepper";

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
const getExportWorkflow = gql(`
query exportWorkflow($eventgroup_id: Int!, $include_steps: Boolean!, $output_format: String!) {
  eventingExportWorkflow(eventgroup_id: $eventgroup_id, include_steps: $include_steps, output_format: $output_format) {
    status
    error
    workflow
  }
}
`)
export function EventGroupTable({selectedEventGroup, me, showInstances, showGraph, height}) {
    const [openEventStepRender, setOpenEventStepRender] = React.useState(false);
    const [openEnvView, setOpenEnvView] = React.useState(false);
    const [openTriggerDataView, setOpenTriggerDataView] = React.useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [openActiveDialog, setOpenActiveDialog] = React.useState(false);
    const [openApprovalDialog, setOpenApprovalDialog] = React.useState(false);
    const [openStepperDialog, setOpenStepperDialog] = React.useState(false);
    const [stepperMode, setStepperMode] = React.useState("edit");
    const [stepperInitialPayload, setStepperInitialPayload] = React.useState(null);
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
    const [getExportedWorkflow] = useLazyQuery(getExportWorkflow, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.eventingExportWorkflow.status === "success"){
                try{
                    const workflow = JSON.parse(data.eventingExportWorkflow.workflow);
                    setStepperInitialPayload(getWizardPayloadFromWorkflow(workflow));
                    setOpenStepperDialog(true);
                }catch(error){
                    snackActions.error("Failed to parse exported workflow");
                    console.log(error);
                }
            } else {
                snackActions.error(data.eventingExportWorkflow.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to export workflow");
        }
    });
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
     const openWorkflowStepper = (mode) => {
         setStepperMode(mode);
         getExportedWorkflow({variables: {
             eventgroup_id: selectedEventGroup.id,
             include_steps: true,
             output_format: "json",
         }});
     }
 return (
     <div className="mythic-eventing-detail flex flex-column gap-4 h-full min-h-0 min-w-0 overflow-auto" style={{height: height || "100%"}}>

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
                     onClone={() => openWorkflowStepper("duplicate")}
                     onDelete={() => setOpenDeleteDialog(true)}
                     onDisable={() => setOpenActiveDialog(true)}
                     onEdit={() => openWorkflowStepper("edit")}
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
         {openStepperDialog &&
             <MythicDialog fullWidth={true} maxWidth="xl" open={openStepperDialog}
                           onClose={() => {
                               setOpenStepperDialog(false);
                           }}
                           innerDialog={<CreateEventingStepper
                               mode={stepperMode}
                               initialPayload={stepperInitialPayload}
                               onClose={() => {
                                   setOpenStepperDialog(false);
                               }}
                               selectedEventGroup={selectedEventGroup}
                               sourceEventGroupFiles={selectedEventGroup?.filemeta || []}
                           />}
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
        <div className="mythic-eventing-workflow-overview flex-none gap-6 min-w-0 overflow-hidden w-full rounded grid bg-surface-raised border-subtle text-primary shadow-1">
            <div className="mythic-eventing-workflow-overview-header grid-col-full items-start flex gap-6 justify-between min-w-0 border-b-subtle">
                <div className="mythic-eventing-workflow-overview-title-block flex flex-fill flex-column gap-2 min-w-0">
                    <div className="mythic-eventing-workflow-overview-title-row items-center flex flex-wrap gap-4 min-w-0">
                        <span className="mythic-eventing-workflow-overview-title text-base font-800 min-w-0 wrap-anywhere text-primary">{selectedEventGroup?.name}</span>
                        <MythicPageHeaderChip
                            icon={selectedEventGroup?.active ? <NotificationsActiveTwoToneIcon /> : <NotificationsOffTwoToneIcon />}
                            label={selectedEventGroup?.active ? "Enabled" : "Disabled"}
                            status={selectedEventGroup?.active ? "enabled" : "disabled"}
                        />
                        {selectedEventGroup?.deleted && <MythicPageHeaderChip label="Deleted" status="error" />}
                    </div>
                    {selectedEventGroup?.description &&
                        <div className="mythic-eventing-workflow-overview-description text-xs font-650 leading-135 min-w-0 wrap-anywhere text-muted">{selectedEventGroup.description}</div>
                    }
                </div>
                <div className="mythic-eventing-workflow-overview-header-actions items-center flex flex-fill flex-wrap gap-3 justify-end max-w-full">
                    {selectedEventGroup?.deleted ? (
                        <MythicActionButton compact tone="success" variant="outlined" size="small" startIcon={<RestoreFromTrashIcon fontSize="small" />} onClick={onRestore}>
                            Restore
                        </MythicActionButton>
                    ) : (
                        <MythicActionButton compact tone="error" variant="outlined" size="small" startIcon={<DeleteIcon fontSize="small" />} onClick={onDelete}>
                            Delete
                        </MythicActionButton>
                    )}
                    {selectedEventGroup?.active ? (
                        <MythicActionButton compact tone="warning" variant="outlined" size="small" startIcon={<NotificationsActiveTwoToneIcon fontSize="small" />} onClick={onDisable}>
                            Disable
                        </MythicActionButton>
                    ) : (
                        <MythicActionButton compact tone="success" variant="outlined" size="small" startIcon={<NotificationsOffTwoToneIcon fontSize="small" />} onClick={onEnable}>
                            Enable
                        </MythicActionButton>
                    )}
                </div>
            </div>
            <div className="mythic-eventing-workflow-overview-section flex flex-column gap-5 mythic-eventing-workflow-overview-primary min-w-0">
                <div className="mythic-eventing-workflow-overview-field flex flex-column gap-3 min-w-0">
                    <span className="mythic-eventing-workflow-overview-label text-2xs font-800 leading-115 text-muted">Created by</span>
                    <span className="mythic-eventing-workflow-overview-value text-sm font-800 leading-125 min-w-0 wrap-anywhere text-primary">{createdBy}</span>
                    <span className="mythic-eventing-workflow-overview-subvalue text-xs font-650 leading-130 min-w-0 wrap-anywhere text-muted">{createdAt}</span>
                </div>
                <div className="mythic-eventing-workflow-overview-field flex flex-column gap-3 min-w-0">
                    <span className="mythic-eventing-workflow-overview-label text-2xs font-800 leading-115 text-muted">Trigger behavior</span>
                    <div className="mythic-eventing-workflow-chip-row items-center flex flex-wrap gap-3 min-w-0">
                        <SquareChip compact label={selectedEventGroup?.trigger || "unknown"} />
                    </div>
                    {selectedEventGroup?.trigger === "cron" &&
                        <span className="mythic-eventing-workflow-overview-subvalue text-xs font-650 leading-130 mythic-eventing-workflow-overview-icon-line items-center inline-flex gap-3 min-w-0 wrap-anywhere text-muted">
                            <CalendarMonthTwoToneIcon fontSize="small" />
                            {toLocalTime(selectedEventGroup?.next_scheduled_run, me?.user?.view_utc_time)}
                        </span>
                    }
                </div>
            </div>

            <div className="mythic-eventing-workflow-overview-section flex flex-column gap-5 min-w-0">
                <div className="mythic-eventing-workflow-overview-field flex flex-column gap-3 min-w-0">
                    <span className="mythic-eventing-workflow-overview-label text-2xs font-800 leading-115 text-muted">Keywords</span>
                    <div className="mythic-eventing-workflow-chip-row items-center flex flex-wrap gap-3 min-w-0">
                        {keywords.length === 0 ? (
                            <MythicChip compact label="No keywords" />
                        ) : (
                            <>
                                {visibleKeywords.map((keyword, index) => (
                                    <MythicChip compact key={`${keyword}-${index}`} label={keyword} />
                                ))}
                                {hiddenKeywordCount > 0 &&
                                    <MythicStyledTooltip title={keywords.join(", ")}>
                                        <MythicChip compact label={`+${hiddenKeywordCount} more`} muted />
                                    </MythicStyledTooltip>
                                }
                            </>
                        )}
                    </div>
                </div>
                <div className="mythic-eventing-workflow-overview-field flex flex-column gap-3 min-w-0">
                    <span className="mythic-eventing-workflow-overview-label text-2xs font-800 leading-115 text-muted">Run context</span>
                    <div className="mythic-eventing-workflow-chip-row items-center flex flex-wrap gap-3 min-w-0">
                        <SquareChip compact label={selectedEventGroup?.run_as || "unknown"} />
                        <MythicActionButton
                            className="mythic-eventing-workflow-approval-button"
                            colorMode="always"
                            tone={isApproved ? "success" : "warning"}
                            size="small"
                            startIcon={isApproved ? <ChecklistRtlTwoToneIcon fontSize="small" /> : <RuleTwoToneIcon fontSize="small" />}
                            onClick={onOpenApproval}
                        >
                            {isApproved ? "Approved" : "Needs approval"}
                        </MythicActionButton>
                    </div>
                </div>
            </div>

            <div className="mythic-eventing-workflow-overview-section flex flex-column gap-5 mythic-eventing-workflow-overview-actions gap-6 min-w-0">
                <div className="mythic-eventing-workflow-action-group flex flex-column gap-3 min-w-0">
                    <span className="mythic-eventing-workflow-overview-label text-2xs font-800 leading-115 text-muted">Attached details</span>
                    <div className="mythic-eventing-workflow-button-row items-center flex flex-wrap gap-3 min-w-0">
                        <MythicActionButton
                            compact
                            tone="info"
                            disabled={!hasTriggerData}
                            size="small"
                            startIcon={<InfoTwoToneIcon fontSize="small" />}
                            onClick={onOpenTriggerData}
                        >
                            Trigger data
                        </MythicActionButton>
                        <MythicActionButton
                            compact
                            tone="info"
                            disabled={!hasEnvironment}
                            size="small"
                            startIcon={<InfoTwoToneIcon fontSize="small" />}
                            onClick={onOpenEnvironment}
                        >
                            Environment
                        </MythicActionButton>
                        <MythicActionButton
                            compact
                            tone="info"
                            size="small"
                            startIcon={
                                <Badge badgeContent={fileCount} color="secondary">
                                    <AttachFileIcon fontSize="small" />
                                </Badge>
                            }
                            onClick={onManageFiles}
                        >
                            Files
                        </MythicActionButton>
                        {consumingContainers.length > 0 &&
                            <MythicActionButton
                                compact
                                tone={consumingContainersErrors > 0 ? "error" : "info"}
                                size="small"
                                startIcon={
                                    <Badge badgeContent={consumingContainersErrors} color="error">
                                        <LayersTwoToneIcon fontSize="small" />
                                    </Badge>
                                }
                                onClick={onOpenContainers}
                            >
                                Containers
                            </MythicActionButton>
                        }
                    </div>
                </div>
                <div className="mythic-eventing-workflow-action-group flex flex-column gap-3 min-w-0">
                    <span className="mythic-eventing-workflow-overview-label text-2xs font-800 leading-115 text-muted">Workflow actions</span>
                    <div className="mythic-eventing-workflow-button-row items-center flex flex-wrap gap-3 min-w-0">
                        {selectedEventGroup?.trigger === "manual" &&
                            <MythicActionButton
                                compact
                                tone="success"
                                size="small"
                                startIcon={<PlayCircleFilledTwoToneIcon fontSize="small" />}
                                onClick={onTriggerManual}
                            >
                                Run
                            </MythicActionButton>
                        }
                        {keywords.length > 0 &&
                            <MythicActionButton
                                compact
                                tone="success"
                                size="small"
                                startIcon={<SpellcheckIcon fontSize="small" />}
                                onClick={onOpenKeywordTrigger}
                            >
                                Keyword run
                            </MythicActionButton>
                        }
                        <MythicStyledTooltip title="Edit workflow metadata, settings, and steps">
                            <MythicActionButton
                                compact
                                tone="info"
                                size="small"
                                startIcon={<EditNoteTwoToneIcon fontSize="small" />}
                                onClick={onEdit}
                            >
                                Edit
                            </MythicActionButton>
                        </MythicStyledTooltip>
                        <MythicStyledTooltip title="Large graph view">
                            <MythicActionButton
                                compact
                                tone="info"
                                size="small"
                                startIcon={<OpenInNewTwoToneIcon fontSize="small" />}
                                onClick={onOpenGraph}
                            >
                                Graph
                            </MythicActionButton>
                        </MythicStyledTooltip>
                        <MythicStyledTooltip title="Create a new workflow using this workflow as the starting point">
                            <MythicActionButton
                                compact
                                tone="success"
                                size="small"
                                startIcon={<ContentCopyTwoToneIcon fontSize="small" />}
                                onClick={onClone}
                            >
                                Duplicate
                            </MythicActionButton>
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
        <div className="mythic-eventing-graph-panel overflow-hidden rounded bg-surface-muted border-subtle">
            {getRenderer()}
        </div>
    )
}
