import React, {useCallback} from 'react';
import { gql, useMutation } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import {useTheme} from '@mui/material/styles';
import Typography from '@mui/material/Typography';
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
import PermMediaTwoToneIcon from '@mui/icons-material/PermMediaTwoTone';
import {PreviewFileMediaDialog} from "../Search/PreviewFileMedia";
import {b64DecodeUnicode} from "../Callbacks/ResponseDisplay";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
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
import AttachmentIcon from '@mui/icons-material/Attachment';
import Badge from '@mui/material/Badge';
import {EventFileManageDialog} from "./EventFileManageDialog";
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import {EventTriggerKeywordDialog} from "./EventTriggerKeywordDialog";
import LayersTwoToneIcon from '@mui/icons-material/LayersTwoTone';
import {EventGroupConsumingContainersDialog} from "./EventGroupConsumingContainersDialog";
import CalendarMonthTwoToneIcon from '@mui/icons-material/CalendarMonthTwoTone';
import {EventGroupTableEditDialog} from "./EventEditEventGroupDialog";
import EditIcon from '@mui/icons-material/Edit';

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
export function EventGroupTable({selectedEventGroup, me}) {
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
     <div style={{marginLeft: "5px", display: "flex", overflowY: "auto", flexDirection: "column", height: "100%"}}>

         {selectedEventGroup.id === 0 &&
             <Typography variant={"h4"}><strong>All Eventing Runs</strong></Typography>
         }
         {selectedEventGroup.id !== 0 &&
             <div>
                 {selectedEventGroup.deleted ? (
                     <div style={{float: "right", cursor: "pointer", paddingTop: "5px"}}>
                         <MythicStyledTooltip title={"Restore event group workflow"}>
                             <Button color={"secondary"} size="small" onClick={onAcceptDelete} >
                                 <RestoreFromTrashIcon color="success"/>
                                 Restore
                             </Button>
                         </MythicStyledTooltip>
                     </div>
                 ) : (
                     <div style={{float: "right", cursor: "pointer", paddingTop: "5px"}}>
                         <MythicStyledTooltip
                             title={"Mark event group as deleted so no new triggers for it will work and it will be removed from view"}>
                             <Button color={"secondary"} size="small" onClick={() => {
                                 setOpenDeleteDialog(true);
                             }} >
                                 <DeleteIcon color="error"/> Delete
                             </Button>
                         </MythicStyledTooltip>

                         {openDeleteDialog &&
                             <MythicConfirmDialog onClose={() => {
                                 setOpenDeleteDialog(false);
                             }} onSubmit={onAcceptDelete} open={openDeleteDialog}/>
                         }
                     </div>
                 )}
                 <Typography variant={"h4"} style={{
                     display: "inline-block",
                     marginRight: "10px"
                 }}><strong>{selectedEventGroup?.name}</strong></Typography>
                 {selectedEventGroup.active ?
                     (
                         <>
                             <MythicStyledTooltip title={"Disable Event Group"}>
                                 <Button color={"secondary"} onClick={() => {
                                     setOpenActiveDialog(true);
                                 }}>
                                     <NotificationsActiveTwoToneIcon size={"small"} color={"success"}/>
                                     Enabled
                                 </Button>
                             </MythicStyledTooltip>
                             {openActiveDialog &&
                                 <MythicConfirmDialog onClose={() => {
                                     setOpenActiveDialog(false);
                                 }} onSubmit={onAcceptActive} open={openActiveDialog}
                                                      acceptText={"Disable"}
                                 />
                             }
                         </>

                     ) :
                     (
                         <MythicStyledTooltip title={"Enable Event Group"}>
                             <Button color={"secondary"} onClick={onAcceptActive}>
                                 <NotificationsOffTwoToneIcon size={"small"} color={"warning"}/>
                                 Disabled
                             </Button>
                         </MythicStyledTooltip>
                     )
                 }
                 <br/><Typography variant={"h8"}>{selectedEventGroup?.description}</Typography>
                 <Table>
                     <TableHead>
                         <TableRow>
                             <TableCell>Created</TableCell>
                             <TableCell style={{width: "10rem"}}>Trigger</TableCell>
                             <TableCell>Keywords</TableCell>
                             <TableCell style={{width: "4rem"}}>Context</TableCell>
                             <TableCell style={{width: "3rem"}}>Env</TableCell>
                             <TableCell style={{width: "10rem"}}>Run As</TableCell>
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
                                     }} size={"small"} variant={"outlined"} color={"info"} style={{}}>
                                         <InfoTwoToneIcon/>
                                     </IconButton>
                                 }
                             </MythicTableCell>
                             <MythicTableCell>
                                 {selectedEventGroup.environment &&
                                     <IconButton onClick={() => {
                                         setOpenEnvView(true);
                                     }} size={"small"} variant={"outlined"} color={"info"} style={{}}>
                                         <InfoTwoToneIcon/>
                                     </IconButton>
                                 }
                             </MythicTableCell>
                             <MythicTableCell>
                                 <div style={{display: "flex", alignItems: "center"}}>
                                     {selectedEventGroup.approved_to_run ?
                                         (
                                             <MythicStyledTooltip title={"all user approvals received"}>
                                                 <IconButton onClick={() => setOpenApprovalDialog(true)}>
                                                     <ChecklistRtlTwoToneIcon color={"success"} />
                                                 </IconButton>

                                             </MythicStyledTooltip>

                                         ) : (
                                             <MythicStyledTooltip title={"missing user approvals"}>
                                                 <IconButton onClick={() => setOpenApprovalDialog(true)}>
                                                     <RuleTwoToneIcon  color={"error"} />
                                                 </IconButton>

                                             </MythicStyledTooltip>

                                         )
                                     }
                                     {selectedEventGroup.run_as}
                                 </div>

                             </MythicTableCell>
                             <MythicTableCell>
                                 <MythicStyledTooltip title={"Edit Workflow Metadata (not steps)"}>
                                     <IconButton onClick={() => {setOpenEditDialog(true)}}>
                                         <EditIcon color={"info"}/>
                                     </IconButton>
                                 </MythicStyledTooltip>
                                 {selectedEventGroup.trigger === "manual" &&
                                     <MythicStyledTooltip title={"Trigger manually now"}>
                                         <IconButton onClick={onTriggerManual}>
                                             <PlayCircleFilledTwoToneIcon color={"success"}/>
                                         </IconButton>
                                     </MythicStyledTooltip>
                                 }
                                 <MythicStyledTooltip title={"Large Graph View"}>
                                     <IconButton onClick={() => {
                                         setOpenEventStepRender(true);
                                     }} size={"small"} variant={"outlined"} color={"secondary"} style={{}}>
                                         <OpenInNewTwoToneIcon color={"info"} style={{cursor: "pointer", marginRight: "5px"}}/>
                                     </IconButton>
                                 </MythicStyledTooltip>
                                 <MythicStyledTooltip title={"View Original File"}>
                                     <IconButton onClick={() => {
                                         setOpenFileView(true);
                                     }} size={"small"} color={"secondary"} style={{}}>
                                         <PermMediaTwoToneIcon color={"info"} style={{cursor: "pointer", marginRight: "5px"}}/>

                                     </IconButton>
                                 </MythicStyledTooltip>
                                 <MythicStyledTooltip title={"Manage Associated Files"}>
                                     <IconButton onClick={() => {
                                         setOpenFileManageView(true);
                                     }} size={"small"} variant={"outlined"} color={"secondary"} style={{}}>
                                         <Badge badgeContent={selectedEventGroup.filemeta.length}  color="secondary">
                                             <AttachmentIcon color={"info"} style={{cursor: "pointer", marginRight: "5px"}}/>
                                         </Badge>
                                     </IconButton>
                                 </MythicStyledTooltip>
                                 {selectedEventGroup.keywords.length > 0 &&
                                     <MythicStyledTooltip title={"Manually execute via keyword"}>
                                         <IconButton onClick={() => {
                                             setOpenTriggerKeyword(true);
                                         }} size={"small"} variant={"outlined"} color={"secondary"} style={{}}>
                                             <SpellcheckIcon color={"success"} style={{cursor: "pointer", marginRight: "5px"}}/>
                                         </IconButton>
                                     </MythicStyledTooltip>
                                 }
                                 {selectedEventGroup.eventgroupconsumingcontainers.length > 0 &&
                                        <MythicStyledTooltip title={"View details about associated eventing containers"} >
                                            <Badge badgeContent={consumingContainersErrors} color={"error"}>
                                                <IconButton onClick={() => {
                                                    setOpenConsumingContainerDialog(true);
                                                }} size={"small"} variant={"outlined"} color={"secondary"}>
                                                    <LayersTwoToneIcon color={consumingContainersErrors > 0 ? "error": "info"} style={{marginRight: "-3px"}} />
                                                </IconButton>
                                            </Badge>
                                        </MythicStyledTooltip>
                                 }

                             </MythicTableCell>
                         </TableRow>
                     </TableBody>
                 </Table>

             </div>
         }
         <RenderSteps selectedInstanceID={selectedInstanceID} selectedEventGroup={selectedEventGroup} />
         <EventGroupInstances setSelectedInstance={setSelectedInstanceID}
                              selectedInstanceID={selectedInstanceID}
                              foundQueryInstanceRef={foundQueryInstanceRef}
                              selectedEventGroup={selectedEventGroup} me={me}/>
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
             <MythicDialog fullWidth={true} maxWidth="xl" open={openFileView}
                           onClose={(e) => {
                               setOpenFileView(false);
                           }}
                           innerDialog={<PreviewFileMediaDialog
                               agent_file_id={selectedEventGroup.filemetum.agent_file_id}
                               filename={b64DecodeUnicode(selectedEventGroup.filemetum.filename_text)}
                               onClose={(e) => {
                                   setOpenFileView(false);
                               }}/>}
             />
         }
         {openEnvView && <MythicDialog fullWidth={true} maxWidth="md" open={openEnvView}
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
         {openTriggerDataView && <MythicDialog fullWidth={true} maxWidth="md" open={openTriggerDataView}
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
             <MythicDialog fullWidth={true} maxWidth="md" open={openFileManageView}
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
             <MythicDialog fullWidth={true} maxWidth="md" open={openConsumingContainerDialog}
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
    const theme = useTheme();
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
        <div style={{
            height: "200px",
            minHeight: "200px",
            maxHeight: "200px",
            border: `1px solid ${theme.palette.secondary.main}`,
            borderRadius: "5px"
        }}>
            {getRenderer()}
        </div>
    )
}