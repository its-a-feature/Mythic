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
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import MythicTableCell from "../../MythicComponents/MythicTableCell";
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
import EditIcon from '@mui/icons-material/Edit';
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";

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
                 <MythicPageHeader
                     dense
                     title={selectedEventGroup?.name}
                     subtitle={selectedEventGroup?.description}
                     meta={
                         <>
                             <MythicPageHeaderChip
                                 icon={selectedEventGroup.active ? <NotificationsActiveTwoToneIcon /> : <NotificationsOffTwoToneIcon />}
                                 label={selectedEventGroup.active ? "Enabled" : "Disabled"}
                                 status={selectedEventGroup.active ? "success" : undefined}
                                 className={selectedEventGroup.active ? "" : "mythic-eventing-header-chip-disabled"}
                             />
                             <MythicPageHeaderChip label={selectedEventGroup.trigger} />
                             <MythicPageHeaderChip label={selectedEventGroup.run_as || "unknown"} />
                             <MythicPageHeaderChip
                                 label={selectedEventGroup.approved_to_run ? "Approved" : "Needs approval"}
                                 status={selectedEventGroup.approved_to_run ? "success" : "warning"}
                             />
                             {selectedEventGroup.deleted && <MythicPageHeaderChip label="Deleted" status="error" />}
                         </>
                     }
                     actions={
                         <>
                             {selectedEventGroup.deleted ? (
                                 <Button className="mythic-table-row-action-hover-success" variant="outlined" size="small" startIcon={<RestoreFromTrashIcon fontSize="small" />} onClick={onAcceptDelete}>
                                     Restore
                                 </Button>
                             ) : (
                                 <Button className="mythic-table-row-action-hover-danger" variant="outlined" size="small" startIcon={<DeleteIcon fontSize="small" />} onClick={() => setOpenDeleteDialog(true)}>
                                     Delete
                                 </Button>
                             )}
                             {selectedEventGroup.active ? (
                                 <Button className="mythic-table-row-action-hover-warning" variant="outlined" size="small" startIcon={<NotificationsActiveTwoToneIcon fontSize="small" />} onClick={() => setOpenActiveDialog(true)}>
                                     Disable
                                 </Button>
                             ) : (
                                 <Button className="mythic-table-row-action-hover-success" variant="outlined" size="small" startIcon={<NotificationsOffTwoToneIcon fontSize="small" />} onClick={onAcceptActive}>
                                     Enable
                                 </Button>
                             )}
                         </>
                     }
                 />
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
                 <TableContainer className="mythicElement">
                 <Table>
                     <TableHead>
                         <TableRow>
                             <TableCell>Created</TableCell>
                             <TableCell style={{width: "10rem"}}>Trigger</TableCell>
                             <TableCell>Keywords</TableCell>
                             <TableCell style={{width: "4rem"}}>Context</TableCell>
                             <TableCell style={{width: "3rem"}}>Env</TableCell>
                             <TableCell style={{width: "10rem"}}>Run as</TableCell>
                             <TableCell style={{width: "15rem"}}>Actions</TableCell>
                         </TableRow>
                     </TableHead>
                     <TableBody>
                         <TableRow>
                             <MythicTableCell>{selectedEventGroup?.operator?.username} @ {toLocalTime(selectedEventGroup?.created_at, me?.user?.view_utc_time)}</MythicTableCell>
                             <MythicTableCell>{selectedEventGroup.trigger}
                                 {selectedEventGroup.trigger === "cron" &&
                                     <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                                         <CalendarMonthTwoToneIcon style={{marginRight: "10px"}}/>
                                         {toLocalTime(selectedEventGroup.next_scheduled_run, me?.user?.view_utc_time)}
                                     </div>
                                 }
                             </MythicTableCell>
                             <MythicTableCell
                                 style={{breakWord: "break-all"}}>{selectedEventGroup.keywords.length > 0 && (
                                 <>{""}{selectedEventGroup.keywords?.join(", ")}</>
                             )}
                             </MythicTableCell>
                             <MythicTableCell >
                                 {selectedEventGroup.trigger_data &&
                                     <IconButton onClick={() => {
                                         setOpenTriggerDataView(true);
                                     }} className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small">
                                         <InfoTwoToneIcon fontSize="small" />
                                     </IconButton>
                                 }
                             </MythicTableCell>
                             <MythicTableCell>
                                 {selectedEventGroup.environment &&
                                     <IconButton onClick={() => {
                                         setOpenEnvView(true);
                                     }} className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small">
                                         <InfoTwoToneIcon fontSize="small" />
                                     </IconButton>
                                 }
                             </MythicTableCell>
                             <MythicTableCell>
                                 <div style={{display: "flex", alignItems: "center"}}>
                                     {selectedEventGroup.approved_to_run ?
                                         (
                                             <MythicStyledTooltip title={"all user approvals received"}>
                                                 <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-success" size="small" onClick={() => setOpenApprovalDialog(true)}>
                                                     <ChecklistRtlTwoToneIcon fontSize="small" />
                                                 </IconButton>

                                             </MythicStyledTooltip>

                                         ) : (
                                             <MythicStyledTooltip title={"missing user approvals"}>
                                                 <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-danger" size="small" onClick={() => setOpenApprovalDialog(true)}>
                                                     <RuleTwoToneIcon fontSize="small" />
                                                 </IconButton>

                                             </MythicStyledTooltip>

                                         )
                                     }
                                     {selectedEventGroup.run_as}
                                 </div>

                             </MythicTableCell>
                             <MythicTableCell>
                                 <div className="mythic-table-row-actions mythic-table-row-actions-nowrap">
                                 <MythicStyledTooltip title={"Edit Workflow Metadata (not steps)"}>
                                     <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small" onClick={() => {setOpenEditDialog(true)}}>
                                         <EditIcon fontSize="small" />
                                     </IconButton>
                                 </MythicStyledTooltip>
                                 {selectedEventGroup.trigger === "manual" &&
                                     <MythicStyledTooltip title={"Trigger manually now"}>
                                         <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" size="small" onClick={onTriggerManual}>
                                             <PlayCircleFilledTwoToneIcon fontSize="small" />
                                         </IconButton>
                                     </MythicStyledTooltip>
                                 }
                                 <MythicStyledTooltip title={"Large Graph View"}>
                                     <IconButton onClick={() => {
                                         setOpenEventStepRender(true);
                                     }} className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small">
                                         <OpenInNewTwoToneIcon fontSize="small" />
                                     </IconButton>
                                 </MythicStyledTooltip>
                                 <MythicStyledTooltip title={"Create New Workflow From This One"}>
                                     <IconButton onClick={() => {
                                         setOpenFileView(true);
                                     }} className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" size="small">
                                         <AddCircleIcon fontSize="small" />
                                     </IconButton>
                                 </MythicStyledTooltip>
                                 <MythicStyledTooltip title={"Manage Associated Files"}>
                                     <IconButton onClick={() => {
                                         setOpenFileManageView(true);
                                     }} className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small">
                                         <Badge badgeContent={selectedEventGroup.filemeta.length}  color="secondary">
                                             <AttachFileIcon fontSize="small" />
                                         </Badge>
                                     </IconButton>
                                 </MythicStyledTooltip>
                                 {selectedEventGroup.keywords.length > 0 &&
                                     <MythicStyledTooltip title={"Manually execute via keyword"}>
                                         <IconButton onClick={() => {
                                             setOpenTriggerKeyword(true);
                                         }} className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" size="small">
                                             <SpellcheckIcon fontSize="small" />
                                         </IconButton>
                                     </MythicStyledTooltip>
                                 }
                                 {selectedEventGroup.eventgroupconsumingcontainers.length > 0 &&
                                        <MythicStyledTooltip title={"View details about associated eventing containers"} >
                                            <Badge badgeContent={consumingContainersErrors} color={"error"}>
                                                <IconButton onClick={() => {
                                                    setOpenConsumingContainerDialog(true);
                                                }} className={`mythic-table-row-icon-action ${consumingContainersErrors > 0 ? "mythic-table-row-icon-action-danger" : "mythic-table-row-icon-action-hover-info"}`} size="small">
                                                    <LayersTwoToneIcon fontSize="small" />
                                                </IconButton>
                                            </Badge>
                                        </MythicStyledTooltip>
                                 }
                                 </div>

                             </MythicTableCell>
                         </TableRow>
                     </TableBody>
                 </Table>
                 </TableContainer>
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
