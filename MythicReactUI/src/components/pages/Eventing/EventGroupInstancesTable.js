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
import IosShareIcon from '@mui/icons-material/IosShare';
import {copyStringToClipboard} from "../../utilities/Clipboard";
import {ipCompare} from "../Callbacks/CallbacksTable";
import MythicResizableGrid from "../../MythicComponents/MythicResizableGrid";
import {TableFilterDialog} from "../Callbacks/TableFilterDialog";
import {CallbacksTableStringCell} from "../Callbacks/CallbacksTableRow";

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


function EventGroupInstancesTableMaterialReactTablePreMemo({eventgroups, me, setSelectedInstance, selectedInstanceID}){
    const callbackTableGridRef = React.useRef();
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
    const [sortData, setSortData] = React.useState({"sortKey": null, "sortDirection": null, "sortType": null});
    const [filterOptions, setFilterOptions] = React.useState({});
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
    const columns = [
        {key: "id", type: "number", name: "ID", width: 60,  enableHiding: false, disableSort: true, disableFilter: true},
        {key: "status", type: 'string', name: "Status", width: 150, disableSort: true, enableHiding: false},
        {key: "event_group", type: 'string', name: "Event Group", inMetadata: true, fillWidth: true, disableSort: true,  enableHiding: false},
        {key: "trigger", type: 'string', name: "Trigger", fillWidth: true, disableSort: true, enableHiding: false},
        {key: "time", type: 'date', name: "Time", width: 300, disableSort: true,},
        {key: "operator", type: 'string', name: "Operator", inMetadata: true, fillWidth: true, disableSort: true,},
        {key: "cancel", type: 'string', name: "Action", width: 70, disableSort: true, disableFilter: true},
    ];
    const onClickHeader = (e, columnIndex) => {
        const column = columns[columnIndex];
        if(column.disableSort){
            return;
        }
        if (!column.key) {
            setSortData({"sortKey": null, "sortType":null, "sortDirection": "ASC"});
        }
        if (sortData.sortKey === column.key) {
            if (sortData.sortDirection === 'ASC') {
                setSortData({...sortData, "sortDirection": "DESC"});
            } else {
                setSortData({"sortKey": null, "sortType":null, "sortDirection": "ASC"});
            }
        } else {
            setSortData({"sortKey": column.key, "sortType":column.type, "sortDirection": "ASC"});
        }
    };
    const filterRow = (row) => {
        for(const [key,value] of Object.entries(filterOptions)){
            if(key === "operator"){
                if(!String(row?.operator?.username).toLowerCase().includes(String(value).toLowerCase())){
                    return true;
                }
            }else {
                if(!String(row[key]).toLowerCase().includes(String(value).toLowerCase())){
                    return true;
                }
            }

        }
        return false;
    }
    const sortedData = React.useMemo(() => {
        const tempData = [...eventgroups];

        if (sortData.sortType === 'number' || sortData.sortType === 'size' || sortData.sortType === 'date') {
            tempData.sort((a, b) => (parseInt(a[sortData.sortKey]) > parseInt(b[sortData.sortKey]) ? 1 : -1));
        } else if (sortData.sortType === 'string') {
            tempData.sort((a, b) => (a[sortData.sortKey].toLowerCase() > b[sortData.sortKey].toLowerCase() ? 1 : -1));
        } else if (sortData.sortType === "ip") {
            tempData.sort((a, b) => (ipCompare(a[sortData.sortKey], b[sortData.sortKey])));
        } else if (sortData.sortType === "array") {
            tempData.sort((a, b) => (
                a[sortData.sortKey] > b[sortData.sortKey] ? 1 : -1
            ))
        } else if (sortData.sortType === "timestamp") {
            tempData.sort((a, b) => {
                let aDate = new Date(a[sortData.sortKey]);
                let bDate = new Date(b[sortData.sortKey]);
                if (aDate.getFullYear() === 1970) {
                    if (bDate.getFullYear() === 1970) {
                        return 0;
                    }
                    return 1;
                } else if (bDate.getFullYear() === 1970) {
                    return -1;
                }
                if (aDate > bDate) {
                    return 1
                } else if (bDate > aDate) {
                    return -1
                }
                return 0;
            })
        } else if (sortData.sortType === "agent") {
            tempData.sort((a, b) => (a?.payload?.payloadtype?.name?.toLowerCase() > b?.payload?.payloadtype?.name?.toLowerCase() ? 1 : -1));
        }
        if (sortData.sortDirection === 'DESC') {
            tempData.reverse();
        }
        return tempData.reduce( (prev, row) => {
            if(filterRow(row)){
                return [...prev];
            }
            return [...prev, columns.map( c => {
                switch(c.name){
                    case "ID":
                        return <CallbacksTableStringCell rowData={row} cellData={row.id} />
                    case "Status":
                        return (
                            <div style={{display: "flex", flexDirection:"row", alignItems: "center"}}>
                                <GetStatusSymbol data={row} />
                                {
                                    selectedInstanceID === 0 ?
                                        (
                                            <MythicStyledTooltip title={"View Graph Above"} >
                                                <IconButton onClick={() => {setSelectedInstance(row.id);}} >
                                                    <CastConnectedTwoToneIcon  />
                                                </IconButton>
                                            </MythicStyledTooltip>
                                        ) :
                                        (
                                            <MythicStyledTooltip title={"Stop viewing graph"} >
                                                <IconButton  onClick={() => {setSelectedInstance(0);}} >
                                                    <CancelTwoToneIcon  />
                                                </IconButton>
                                            </MythicStyledTooltip>
                                        )
                                }
                                <MythicStyledTooltip title={"Open Graph in Modal"}>
                                    <IconButton  onClick={() => {openViewInstanceLargeDialog(row)}}>
                                        <OpenInNewTwoToneIcon  />
                                    </IconButton>
                                </MythicStyledTooltip>
                                <MythicStyledTooltip title={"Copy shareable link to workflow"}>
                                    <IconButton  onClick={() => onSaveToClipboard(row)}>
                                        <IosShareIcon />
                                    </IconButton>
                                </MythicStyledTooltip>
                            </div>
                        )
                    case "Event Group":
                        return <CallbacksTableStringCell rowData={row} cellData={row.eventgroup.name} />
                    case "Trigger":
                        return <CallbacksTableStringCell rowData={row} cellData={row.trigger} />
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
                        return <CallbacksTableStringCell rowData={row} cellData={row?.operator?.username} />
                    case "Action":
                        return (
                            <div style={{display: "flex", alignItems: "center"}}>
                                {row.end_timestamp === null ? (
                                <MythicStyledTooltip title={"Cancel Eventing"} >
                                    <IconButton onClick={() => {onOpenCancelDialog({id: row.id});}}
                                                color={"warning"}>
                                        <CancelTwoToneIcon  />
                                    </IconButton>
                                </MythicStyledTooltip>
                                ) : row.status === "error" || row.status === "cancelled" ? (
                                <MythicStyledTooltip title={"Retry Failed / Canceled Steps"} >
                                    <IconButton onClick={() => {onOpenRetryDialog({id: row.id});}}
                                                color={"warning"}>
                                        <ReplayIcon  />
                                    </IconButton>
                                </MythicStyledTooltip>
                                ) : row.status === "success" ? (
                                <MythicStyledTooltip  title={"Run Again"} >
                                    <IconButton onClick={() => {onOpenRunAgainDialog({id: row.id});}}
                                                color={"success"}>
                                        <ReplayIcon  />
                                    </IconButton>
                                </MythicStyledTooltip>
                                ) : null}
                            </div>

                        )
                }
            })]
        }, []);
    }, [sortData, filterOptions, selectedInstanceID, eventgroups]);
    const sortColumn = columns.findIndex((column) => column.key === sortData.sortKey);
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [selectedColumn, setSelectedColumn] = React.useState({});
    const onSubmitFilterOptions = (newFilterOptions) => {
        setFilterOptions(newFilterOptions);
    }
    const contextMenuOptions = [{
        name: 'Filter Column',
        click: ({event, columnIndex}) => {
            event.preventDefault();
            event.stopPropagation();
            if(columns[columnIndex].disableFilterMenu){
                snackActions.warning("Can't filter that column");
                return;
            }
            setSelectedColumn(columns[columnIndex]);
            setOpenContextMenu(true);
        }
    },];
    const onRowDoubleClick = () => {

    }
    const onRowContextClick = ({rowDataStatic}) => {
        return [];
    }
    return (
        <div style={{ width: '100%', overflow: "auto", flexGrow: 1, display: "flex", position: "relative"}}>
            <MythicResizableGrid
                callbackTableGridRef={callbackTableGridRef}
                columns={columns}
                sortIndicatorIndex={sortColumn}
                sortDirection={sortData.sortDirection}
                items={sortedData}
                rowHeight={40}
                headerRowHeight={20}
                onClickHeader={onClickHeader}
                onDoubleClickRow={onRowDoubleClick}
                contextMenuOptions={contextMenuOptions}
                onRowContextMenuClick={onRowContextClick}
            />
            {openContextMenu &&
                <MythicDialog fullWidth={true} maxWidth="xs" open={openContextMenu}
                              onClose={()=>{setOpenContextMenu(false);}}
                              innerDialog={<TableFilterDialog
                                  selectedColumn={selectedColumn}
                                  filterOptions={filterOptions}
                                  onSubmit={onSubmitFilterOptions}
                                  onClose={()=>{setOpenContextMenu(false);}} />}
                />
            }
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