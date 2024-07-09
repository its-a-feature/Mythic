import React, {} from 'react';
import {EventStepInstanceRenderDialog, GetStatusSymbol} from "./EventStepRender";
import {toLocalTime} from "../../utilities/Time";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import { gql, useMutation } from '@apollo/client';
import CalendarMonthTwoToneIcon from '@mui/icons-material/CalendarMonthTwoTone';
import AccessAlarmTwoToneIcon from '@mui/icons-material/AccessAlarmTwoTone';
import CancelTwoToneIcon from '@mui/icons-material/CancelTwoTone';
import ReplayIcon from '@mui/icons-material/Replay';
import IconButton from '@mui/material/IconButton';
import Moment from 'react-moment';
import moment from 'moment';
import CastConnectedTwoToneIcon from '@mui/icons-material/CastConnectedTwoTone';
import {snackActions} from "../../utilities/Snackbar";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import OpenInNewTwoToneIcon from '@mui/icons-material/OpenInNewTwoTone';
import Typography from '@mui/material/Typography';
import IosShareIcon from '@mui/icons-material/IosShare';
import {copyStringToClipboard} from "../../utilities/Clipboard";
import {useTheme} from '@mui/material/styles';
import {
    MaterialReactTable,
    useMaterialReactTable,
} from 'material-react-table';

const cancelEventGroupInstanceMutation = gql(`
mutation cancelEventGroupInstanceMutation($eventgroupinstance_id: Int!){
    eventingTriggerCancel(eventgroupinstance_id: $eventgroupinstance_id){
        status
        error
    }
}
`);
const retryEventGroupInstanceMutation = gql(`
mutation retryEventGroupInstanceMutation($eventgroupinstance_id: Int!){
    eventingTriggerRetry(eventgroupinstance_id: $eventgroupinstance_id){
        status
        error
    }
}
`);
const runAgainEventGroupInstanceMutation = gql(`
mutation runAgainEventGroupInstanceMutation($eventgroupinstance_id: Int!){
    eventingTriggerRunAgain(eventgroupinstance_id: $eventgroupinstance_id){
        status
        error
    }
}
`);
export const adjustDurationOutput = (e, newTime) => {
    let start = moment(e.created_at);
    let end = moment(e.end_timestamp !== null ? e.end_timestamp : e.updated_at);
    let diffDuration = moment.duration(end.diff(start));
    let output = "";
    if(diffDuration.days() > 0){
        output += diffDuration.days() + "d ";
    }
    if(diffDuration.hours() > 0){
        output += diffDuration.hours() + "h ";
    }
    if(diffDuration.minutes() > 0){
        output += diffDuration.minutes() + "m ";
    }
    if(diffDuration.seconds() > 0){
        output += diffDuration.seconds() + "s ";
    }
    if(output === ""){
        return "1s";
    }
    return output;
}
export const adjustOutput = (e, newTime) => {
    if(newTime === "a few seconds"){
        moment.relativeTimeThreshold('s', 60);
        moment.relativeTimeThreshold('ss', 0);
        return moment(e.created_at + "Z", "YYYY-MM-DDTHH:mm:ss.SSSSSSZ").fromNow(true)
    }
    return newTime;
}
const accessorFn = (row, h) => {
    if(h.type === "timestamp"){
        let d = new Date(row[h.key] || 0);
        if (d.getFullYear() === 1970){
            d = new Date();
            d = d + d.getTimezoneOffset();
        }
        return d;
    }
    if(h.type === "number" || h.type === "size"){
        try{
            return Number(row[h.key] || 0);
        }catch(error){
            return row[h.key] || 0;
        }
    }
    return row[h.key] || "";
};
function EventGroupInstancesTableMaterialReactTablePreMemo({eventgroups, me, setSelectedInstance, selectedInstanceID}){
    const theme = useTheme();
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [openRetryDialog, setOpenRetryDialog] = React.useState(false);
    const [openRunAgainDialog, setOpenRunAgainDialog] = React.useState(false);
    const [openEventStepRender, setOpenEventStepRender] = React.useState(false);
    const selectedLocalInstanceID = React.useRef(0);
    const selectedLocalEventGroup = React.useRef({});
    const foundQueryEvent = React.useRef(false);
    const [CancelEventGroupInstance] = useMutation(cancelEventGroupInstanceMutation, {
        onCompleted: (data) => {
            if(data.eventingTriggerCancel.status === "success"){
                snackActions.info("Successfully sent cancel request");
            } else {
                snackActions.error(data.eventingTriggerCancel.error);
            }
        },
        onError: (data) => {

        }
    })
    const [RetryEventGroupInstance] = useMutation(retryEventGroupInstanceMutation, {
        onCompleted: (data) => {
            if(data.eventingTriggerRetry.status === "success"){
                snackActions.info("Successfully sent retry request");
            } else {
                snackActions.error(data.eventingTriggerRetry.error);
            }
        },
        onError: (data) => {

        }
    });
    const [RunAgainEventGroupInstance] = useMutation(runAgainEventGroupInstanceMutation, {
        onCompleted: (data) => {
            if(data.eventingTriggerRunAgain.status === "success"){
                snackActions.info("Successfully sent run again request");
            } else {
                snackActions.error(data.eventingTriggerRunAgain.error);
            }
        },
        onError: (data) => {

        }
    });
    const onCancelSubmit = () => {
        CancelEventGroupInstance({variables: {eventgroupinstance_id: selectedLocalInstanceID.current}})
    }
    const onRetrySubmit = () => {
        RetryEventGroupInstance({variables: {eventgroupinstance_id: selectedLocalInstanceID.current}});
    }
    const onRunAgainSubmit = () => {
        RunAgainEventGroupInstance({variables: {eventgroupinstance_id: selectedLocalInstanceID.current}});
    }
    const onOpenCancelDialog = ({id}) => {
        selectedLocalInstanceID.current = id;
        setOpenDeleteDialog(true);
    }
    const onOpenRetryDialog = ({id}) => {
        selectedLocalInstanceID.current = id;
        setOpenRetryDialog(true);
    }
    const onOpenRunAgainDialog = ({id}) => {
        selectedLocalInstanceID.current = id;
        setOpenRunAgainDialog(true);
    }
    const openViewInstanceLargeDialog = (e) => {
        selectedLocalInstanceID.current = e.id;
        selectedLocalEventGroup.current = e.eventgroup;
        setOpenEventStepRender(true);
    }
    const onSaveToClipboard = (e) => {
        let path = window.location.origin;
        path += `/new/eventing?eventgroup=${e.eventgroup.id}&eventgroupinstance=${e.id}`;
        copyStringToClipboard(path);
        snackActions.success("copied shareable link to clipboard");
    }
    React.useEffect( () => {
        if( !foundQueryEvent.current ){
            let queryParams = new URLSearchParams(window.location.search);
            const eventgroup = queryParams.has("eventgroupinstance") ? queryParams.get("eventgroupinstance") : "0";
            if(eventgroup !== "0"){
                let matchedGroup = eventgroups.find( e => `${e.id}` === eventgroup);
                if(matchedGroup){
                    setSelectedInstance(matchedGroup.id);
                    foundQueryEvent.current = true;
                }
            }
        }

    }, [eventgroups]);
    const columnFields = [
        {key: "id", type: "number", name: "ID", width: 40, disableCopy: true, enableHiding: false, disableSort: true, disableFilter: true},
        {key: "status", type: 'string', name: "Status", width: 100, disableCopy: true,  disableSort: true, enableHiding: false},
        {key: "event_group", type: 'string', name: "Event Group", fillWidth: true, disableCopy: true, enableHiding: false},
        {key: "trigger", type: 'string', name: "Trigger", fillWidth: true, enableHiding: false},
        {key: "time", type: 'date', name: "Time", width: 180, enableHiding: false},
        {key: "operator", type: 'string', name: "Operator", fillWidth: true, enableHiding: false},
        {key: "cancel", type: 'string', name: "Action", width: 50, disableCopy: true, enableHiding: false, disableSort: true, disableFilter: true},
    ];

    const localCellRender = React.useCallback( ({cell, h}) => {
        let row = cell.row?.original;
        switch(h.name){
            case "ID":
                return (
                    row.id
                )
            case "Status":
                return (
                    <>
                        <GetStatusSymbol data={row} />
                        {
                            selectedInstanceID === 0 ?
                                (
                                    <IconButton onClick={() => {setSelectedInstance(row.id);}} >
                                        <CastConnectedTwoToneIcon  />
                                    </IconButton>

                                ) :
                                (
                                    <IconButton onClick={() => {setSelectedInstance(0);}} >
                                        <CancelTwoToneIcon  />
                                    </IconButton>
                                )
                        }
                        <IconButton onClick={() => {openViewInstanceLargeDialog(row)}}>
                            <OpenInNewTwoToneIcon  />
                        </IconButton>
                        <IconButton onClick={() => onSaveToClipboard(row)}>
                            <IosShareIcon />
                        </IconButton>
                    </>
                )
            case "Event Group":
                return (
                    <Typography >
                        {row.eventgroup.name}
                    </Typography>
                )
            case "Trigger":
                return (
                    row.trigger
                )
            case "Time":
                return (
                    <div>
                        <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                            <CalendarMonthTwoToneIcon style={{marginRight: "10px"}}/>
                            {toLocalTime(row?.created_at, me?.user?.view_utc_time)}
                        </div>
                        <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                            <AccessAlarmTwoToneIcon style={{marginRight: "10px"}}/>
                            {row.end_timestamp === null &&
                                <Moment filter={(newTime) => adjustOutput(row, newTime)} interval={1000}
                                        parse={"YYYY-MM-DDTHH:mm:ss.SSSSSSZ"}
                                        withTitle
                                        titleFormat={"YYYY-MM-DD HH:mm:ss"}
                                        fromNow ago
                                >
                                    {row.created_at + "Z"}
                                </Moment>
                            }
                            {row.end_timestamp !== null &&
                                <Moment filter={(newTime) => adjustDurationOutput(row, newTime)}
                                        parse={"YYYY-MM-DDTHH:mm:ss.SSSSSSZ"}
                                        withTitle
                                        titleFormat={"YYYY-MM-DD HH:mm:ss"}
                                >
                                    {row.created_at + "Z"}
                                </Moment>
                            }
                        </div>
                    </div>
                )
            case "Operator":
                return (
                    row?.operator?.username
                )
            case "Action":
                return (
                    row.end_timestamp === null ? (
                            <MythicStyledTooltip title={"Cancel Eventing"} >
                                <IconButton onClick={() => {onOpenCancelDialog({id: row.id});}} color={"warning"}>
                                    <CancelTwoToneIcon  />
                                </IconButton>
                            </MythicStyledTooltip>
                    ) : row.status === "error" || row.status === "cancelled" ? (
                        <MythicStyledTooltip title={"Retry Failed / Canceled Steps"} >
                            <IconButton onClick={() => {onOpenRetryDialog({id: row.id});}} color={"warning"}>
                                <ReplayIcon  />
                            </IconButton>
                        </MythicStyledTooltip>
                    ) : row.status === "success" ? (
                        <MythicStyledTooltip title={"Run Again"} >
                            <IconButton onClick={() => {onOpenRunAgainDialog({id: row.id});}} color={"success"}>
                                <ReplayIcon  />
                            </IconButton>
                        </MythicStyledTooltip>
                    ) : null
                )
        }
    }, [selectedInstanceID]);
    const columns = React.useMemo(() => columnFields.map(h => {
        return {
            accessorKey: h.key,
            header: h.name,
            size: h.width,
            id: h.key,
            enableClickToCopy: !h.disableCopy,
            filterVariant: h.type === 'number' || h.type === 'size' ? 'range' : 'text',
            enableResizing: true,
            enableHiding: h.enableHiding,
            enableSorting: !h.disableSort,
            enableColumnFilter: !h.disableFilter,
            grow: h.fillWidth,
            accessorFn: (row) => accessorFn(row, h),
            Cell: ({cell}) => localCellRender({cell, h})
        }
    }), [columnFields])
    const materialReactTable = useMaterialReactTable({
        columns,
        data: eventgroups,
        layoutMode: "grid",
        autoResetPageIndex: false,
        enableFacetedValues: true,
        enablePagination: true,
        //enableRowVirtualization: true,
        enableBottomToolbar: false,
        enableStickyHeader: true,
        enableDensityToggle: false,
        enableColumnResizing: true,
        enableRowPinning: false,
        positionPagination: "top",
        columnFilterDisplayMode: 'popover', //filter inputs will show in a popover (like excel)
        rowPinningDisplayMode: 'top-and-bottom',
        //enableColumnOrdering: true,
        //columnResizeMode: 'onEnd',
        initialState: {
            density: 'compact',
        },
        defaultDisplayColumn: { enableResizing: true },
        muiTableContainerProps: { sx: { alignItems: "flex-start" } },
        mrtTheme: (theme) => ({
            baseBackgroundColor: theme.palette.background.default, //change default background color
        }),
        muiSearchTextFieldProps: {
            placeholder: 'Search loaded data',
            size: 'small',
            sx: { minWidth: '300px' },
            variant: 'outlined',
        },
        muiTableHeadCellProps: {
            sx: {
                border: '1px solid rgba(81, 81, 81, .5)',
                fontStyle: 'italic',
                fontWeight: 'bold',
            },
            style: {
                zIndex: 1,
                height: "36px",
            }
        },
        muiTableHeadRowProps: {
            sx: {
                alignItems: "flex-start",
                height: "36px",
            }
        },
        muiTableBodyCellProps: ({ cell, table }) => {
            return {
                sx: {
                    padding: "0 0 0 10px",
                }
            }
        },
        muiTableBodyRowProps: ({ row }) => ({
            sx: {
                height: "40px",
            },
            style: {padding: 0}
        }),
        enableRowActions: false,
        muiTablePaperProps: {
            sx: { display: "flex", flexDirection: "column", width: "100%"}
        },
        muiTopToolbarProps: {
            sx: {
                backgroundColor: theme.materialReactTableHeader,
                display: "flex",
                justifyContent: "flex-start"
            }
        },
        renderEmptyRowsFallback: ({ table }) => (
            <div style={{display: "flex", width: "100%", height: "100%", justifyContent: "center", flexDirection: "column", alignItems: "center"}}>
                <Typography variant={"h4"} >
                    {eventgroups.length === 0 ? "No Workflows" : null}
                </Typography>
            </div>
        ),

    });
    return (
        <div style={{ width: '100%', overflow: "auto", flexGrow: 1, display: "flex"}}>
            <MaterialReactTable table={materialReactTable} />
            {openDeleteDialog &&
                <MythicConfirmDialog onClose={() => {
                    setOpenDeleteDialog(false);
                }} onSubmit={onCancelSubmit} open={openDeleteDialog}
                                     acceptText={"Cancel Workflow"} cancelText={"Keep Running"}
                                     dialogText={"Cancel this workflow and all remaining steps?"}
                />
            }
            {openRetryDialog &&
                <MythicConfirmDialog onClose={() => {
                    setOpenRetryDialog(false);
                }} onSubmit={onRetrySubmit} open={openRetryDialog}
                                     acceptText={"Retry"} cancelText={"Cancel"}
                                     acceptColor={"success"}
                                     dialogText={"Retry all failed / canceled steps?"}
                />
            }
            {openRunAgainDialog &&
                <MythicConfirmDialog onClose={() => {
                    setOpenRunAgainDialog(false);
                }} onSubmit={onRunAgainSubmit} open={openRunAgainDialog}
                                     acceptText={"Run Again"} cancelText={"Cancel"}
                                     acceptColor={"success"}
                                     dialogText={"Run this entire event group again?"}
                />
            }
            {openEventStepRender &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openEventStepRender}
                              onClose={() => {
                                  setOpenEventStepRender(false);
                              }}
                              innerDialog={
                                  <EventStepInstanceRenderDialog onClose={() => { setOpenEventStepRender(false); }}
                                                                 selectedEventGroupInstance={selectedLocalInstanceID.current}
                                                                 selectedEventGroup={selectedLocalEventGroup.current}
                                  />}
                />
            }
        </div>

    )
}
export const EventGroupInstancesTableMaterialReactTable = React.memo(EventGroupInstancesTableMaterialReactTablePreMemo)