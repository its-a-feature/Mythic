import React, {} from 'react';
import {EventingStatusChip, EventStepInstanceRenderDialog} from "./EventStepRender";
import {toLocalTime} from "../../utilities/Time";
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import { gql, useMutation } from '@apollo/client';
import CalendarMonthTwoToneIcon from '@mui/icons-material/CalendarMonthTwoTone';
import AccessAlarmTwoToneIcon from '@mui/icons-material/AccessAlarmTwoTone';
import CancelTwoToneIcon from '@mui/icons-material/CancelTwoTone';
import ReplayIcon from '@mui/icons-material/Replay';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import IconButton from '@mui/material/IconButton';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Moment from 'react-moment';
import moment from 'moment';
import {snackActions} from "../../utilities/Snackbar";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import OpenInNewTwoToneIcon from '@mui/icons-material/OpenInNewTwoTone';
import IosShareIcon from '@mui/icons-material/IosShare';
import {copyStringToClipboard} from "../../utilities/Clipboard";
import {ipCompare} from "../Callbacks/CallbacksTable";
import MythicResizableGrid from "../../MythicComponents/MythicResizableGrid";
import {CallbacksTableStringCell} from "../Callbacks/CallbacksTableRow";
import {GetComputedFontSize} from "../../MythicComponents/MythicSavedUserSetting";
import {
    GridColumnFilterDialog,
    getUpdatedGridFilterOptions,
    gridValuePassesFilter,
    isGridColumnFilterActive
} from "../../MythicComponents/MythicResizableGrid/GridColumnFilterDialog";
import {Dropdown, DropdownMenuItem} from "../../MythicComponents/MythicNestedMenus";

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

const EventingGridCell = ({children, className = "", rowData}) => (
    <div className={`mythic-eventing-instance-cell ${className}`.trim()} data-selected={rowData?.selected ? "true" : undefined}>
        {children}
    </div>
);
const eventingInstanceMenuIconStyle = {fontSize: "1rem", marginRight: "8px"};
const EventingInstanceIdCell = ({onOpenMenu, rowData}) => (
    <EventingGridCell className="mythic-eventing-instance-id-cell" rowData={rowData}>
        <span className="mythic-eventing-instance-id">{rowData.id}</span>
        <IconButton
            aria-haspopup="menu"
            className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info mythic-eventing-instance-id-menu-button"
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onOpenMenu({event, rowData});
            }}
            size="small"
        >
            <ArrowDropDownIcon fontSize="small" />
        </IconButton>
    </EventingGridCell>
);

function EventGroupInstancesTableMaterialReactTablePreMemo({eventgroups, me, setSelectedInstance, selectedInstanceID}){
    const callbackTableGridRef = React.useRef();
    const eventingRowHeight = Math.max(GetComputedFontSize() + 22, 42);
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [openRetryDialog, setOpenRetryDialog] = React.useState(false);
    const [openRunAgainDialog, setOpenRunAgainDialog] = React.useState(false);
    const [openEventStepRender, setOpenEventStepRender] = React.useState(false);
    const [openInstanceDropdown, setOpenInstanceDropdown] = React.useState(false);
    const instanceDropdownRef = React.useRef({options: [], anchor: null});
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
    const getInstanceMenuOptions = (row) => {
        if(!row?.id){
            return [];
        }
        const controlOptions = [];
        if(row.end_timestamp === null){
            controlOptions.push({
                name: "Cancel workflow",
                type: "item",
                icon: <CancelTwoToneIcon style={eventingInstanceMenuIconStyle} />,
                className: "mythic-menu-item-hover-warning",
                click: ({event}) => {
                    event?.preventDefault();
                    event?.stopPropagation();
                    onOpenCancelDialog({id: row.id});
                },
            });
        }else if(row.status === "error" || row.status === "cancelled"){
            controlOptions.push({
                name: "Retry failed / cancelled steps",
                type: "item",
                icon: <ReplayIcon style={eventingInstanceMenuIconStyle} />,
                className: "mythic-menu-item-hover-warning",
                click: ({event}) => {
                    event?.preventDefault();
                    event?.stopPropagation();
                    onOpenRetryDialog({id: row.id});
                },
            });
        }else if(row.status === "success"){
            controlOptions.push({
                name: "Run again",
                type: "item",
                icon: <ReplayIcon style={eventingInstanceMenuIconStyle} />,
                className: "mythic-menu-item-hover-success",
                click: ({event}) => {
                    event?.preventDefault();
                    event?.stopPropagation();
                    onOpenRunAgainDialog({id: row.id});
                },
            });
        }
        return [
            {
                name: "Open graph in modal",
                type: "item",
                icon: <OpenInNewTwoToneIcon style={eventingInstanceMenuIconStyle} />,
                className: "mythic-menu-item-hover-info",
                click: ({event}) => {
                    event?.preventDefault();
                    event?.stopPropagation();
                    openViewInstanceLargeDialog(row);
                },
            },
            {
                name: "Copy shareable link",
                type: "item",
                icon: <IosShareIcon style={eventingInstanceMenuIconStyle} />,
                className: "mythic-menu-item-hover-info",
                click: ({event}) => {
                    event?.preventDefault();
                    event?.stopPropagation();
                    onSaveToClipboard(row);
                },
            },
            ...controlOptions,
        ];
    }
    const openInstanceMenu = ({event, rowData}) => {
        instanceDropdownRef.current = {
            anchor: event?.currentTarget || event?.target,
            options: getInstanceMenuOptions(rowData),
        };
        setOpenInstanceDropdown(true);
    }
    const closeInstanceMenu = () => {
        setOpenInstanceDropdown(false);
    }
    const handleInstanceMenuItemClick = (event, clickOption) => {
        event.preventDefault();
        event.stopPropagation();
        clickOption({event});
        setOpenInstanceDropdown(false);
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
    const columns = React.useMemo(
        () =>
            [
                {key: "id", type: "number", name: "ID", width: 92,  enableHiding: false, disableSort: false, disableFilter: true},
                {key: "status", type: 'string', name: "Status", width: 140, disableSort: false, enableHiding: false},
                {key: "eventgroup", type: 'string', name: "Event Group", inMetadata: true, fillWidth: true, disableSort: false,  enableHiding: false},
                {key: "trigger", type: 'string', name: "Trigger", fillWidth: true, disableSort: false, enableHiding: false},
                {key: "time", type: 'date', name: "Time", width: 300, disableSort: true,},
                {key: "operator", type: 'string', name: "Operator", inMetadata: true, fillWidth: true, disableSort: true,},
            ]?.reduce( (prev, cur) => {
                if(isGridColumnFilterActive(filterOptions[cur.key])){
                    return [...prev, {...cur, filtered: true}];
                }else{
                    return [...prev, {...cur}];
                }
            }, []) || []
        , [filterOptions]
    );
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
                if(!gridValuePassesFilter(row?.operator?.username, value)){
                    return true;
                }
            }else if(key === "eventgroup"){
                if(!gridValuePassesFilter(row?.eventgroup?.name, value)){
                    return true;
                }
            }else if(key === "time"){
                const timeFilterValue = `${row?.created_at || ""} ${row?.created_at ? toLocalTime(row.created_at, me?.user?.view_utc_time) : ""} ${row?.end_timestamp || ""}`;
                if(!gridValuePassesFilter(timeFilterValue, value)){
                    return true;
                }
            }else {
                if(!gridValuePassesFilter(row[key], value)){
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
            if(sortData.sortKey === "eventgroup"){
                tempData.sort((a, b) => (a[sortData.sortKey].name.toLowerCase() > b[sortData.sortKey].name.toLowerCase() ? 1 : -1));
            } else {
                tempData.sort((a, b) => (a[sortData.sortKey].toLowerCase() > b[sortData.sortKey].toLowerCase() ? 1 : -1));
            }
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
            const selectedRow = {...row, selected: row.id === selectedInstanceID};
            return [...prev, columns.map( c => {
                switch(c.name){
                    case "ID":
                        return <EventingInstanceIdCell rowData={selectedRow} onOpenMenu={openInstanceMenu} />
                    case "Status":
                        return (
                            <EventingGridCell className="mythic-eventing-instance-status-cell" rowData={selectedRow}>
                                <EventingStatusChip data={row} />
                            </EventingGridCell>
                        )
                    case "Event Group":
                        return <CallbacksTableStringCell rowData={selectedRow} cellData={row.eventgroup.name} />
                    case "Trigger":
                        return <CallbacksTableStringCell rowData={selectedRow} cellData={row.trigger} />
                    case "Time":
                        return (
                            <EventingGridCell className="mythic-eventing-instances-time-cell" rowData={selectedRow}>
                                <div className="mythic-eventing-instances-time-line">
                                    <CalendarMonthTwoToneIcon fontSize="small" />
                                    {toLocalTime(row?.created_at, me?.user?.view_utc_time)}
                                </div>
                                <div className="mythic-eventing-instances-time-line mythic-eventing-instances-time-secondary">
                                    <AccessAlarmTwoToneIcon fontSize="small" />
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
                            </EventingGridCell>
                        )
                    case "Operator":
                        return <CallbacksTableStringCell rowData={selectedRow} cellData={row?.operator?.username} />
                }
            })]
        }, []);
    }, [sortData, filterOptions, selectedInstanceID, eventgroups, columns]);
    const sortColumn = columns.findIndex((column) => column.key === sortData.sortKey);
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [selectedColumn, setSelectedColumn] = React.useState({});
    const onSubmitFilterOptions = (value) => {
        setFilterOptions(getUpdatedGridFilterOptions(filterOptions, selectedColumn.key, value));
    }
    const contextMenuOptions = [{
        name: 'Filter Column', type: "item", icon: null,
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
    const onRowClick = ({event, rowDataStatic}) => {
        if(event.target?.closest?.("button") || event.target?.closest?.("a")){
            return;
        }
        if(rowDataStatic?.id === selectedInstanceID){
            setSelectedInstance(0);
            return;
        }
        if(rowDataStatic?.id){
            setSelectedInstance(rowDataStatic.id);
        }
    }
    const onRowContextClick = ({rowDataStatic}) => {
        return getInstanceMenuOptions(rowDataStatic);
    }
    return (
        <div className="mythic-eventing-instances-grid">
            <MythicResizableGrid
                name={"eventing_instances_table"}
                callbackTableGridRef={callbackTableGridRef}
                columns={columns}
                sortIndicatorIndex={sortColumn}
                sortDirection={sortData.sortDirection}
                items={sortedData}
                rowHeight={eventingRowHeight}
                onClickHeader={onClickHeader}
                onDoubleClickRow={onRowDoubleClick}
                onRowClick={onRowClick}
                contextMenuOptions={contextMenuOptions}
                onRowContextMenuClick={onRowContextClick}
            />
            {openContextMenu &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={openContextMenu}
                              onClose={()=>{setOpenContextMenu(false);}}
                              innerDialog={
                                  <GridColumnFilterDialog
                                      onSubmit={onSubmitFilterOptions}
                                      filterValue={filterOptions[selectedColumn.key]}
                                      selectedColumn={selectedColumn}
                                      onClose={() => {
                                          setOpenContextMenu(false);
                                      }}
                                  />
                              }
                />
            }
            {openInstanceDropdown &&
                <ClickAwayListener onClickAway={closeInstanceMenu} mouseEvent={"onMouseDown"}>
                    <Dropdown
                        isOpen={instanceDropdownRef.current.anchor}
                        onOpen={setOpenInstanceDropdown}
                        externallyOpen={openInstanceDropdown}
                        minWidth={250}
                        menu={
                            instanceDropdownRef.current.options.map((option, index) => (
                                <DropdownMenuItem
                                    key={"eventing-instance-action-" + index}
                                    className={option.className}
                                    disabled={option.disabled}
                                    onClick={(event) => handleInstanceMenuItemClick(event, option.click)}
                                >
                                    {option.icon}{option.name}
                                </DropdownMenuItem>
                            ))
                        }
                    />
                </ClickAwayListener>
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
