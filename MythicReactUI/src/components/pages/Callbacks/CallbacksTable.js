import React, { useEffect, useMemo, useContext} from 'react';
import {MythicDialog} from '../../MythicComponents/MythicDialog';
import {
    exportCallbackConfigQuery,
    hideCallbackMutation, lockCallbackMutation, unlockCallbackMutation, updateCallbackTriggerMutation,
    updateDescriptionCallbackMutation,
    updateSleepInfoCallbackMutation
} from './CallbackMutations';
import {snackActions} from '../../utilities/Snackbar';
import {useMutation, useLazyQuery, gql } from '@apollo/client';
import {
    CallbacksTableIDCell,
    CallbacksTableStringCell,
    CallbacksTableLastCheckinCell,
    CallbacksTablePayloadTypeCell,
    CallbacksTableC2Cell,
    CallbacksTableOSCell,
    CallbacksTableSleepCell,
    CallbacksTableIPCell, CallbacksTableTagsCell
} from './CallbacksTableRow';
import MythicResizableGrid from '../../MythicComponents/MythicResizableGrid';
import {CallbacksTabsHideMultipleDialog, CallbacksTabsSelectMultipleDialog} from "./CallbacksTabsHideMultipleDialog";
import {CallbacksTabsTaskMultipleDialog} from "./CallbacksTabsTaskMultipleDialog";
import ip6 from 'ip6';
import {CallbacksContext, OnOpenTabContext, OnOpenTabsContext} from "./CallbacksTop";
import {GetMythicSetting, useSetMythicSetting, GetComputedFontSize} from "../../MythicComponents/MythicSavedUserSetting";
import {DetailedCallbackTable} from "./DetailedCallbackTable";
import {ModifyCallbackMythicTreeGroupsDialog} from "./ModifyCallbackMythicTreeGroupsDialog";
import ClickAwayListener from '@mui/material/ClickAwayListener';
import {getCallbackIdFromClickedTab} from './Callbacks';
import {Dropdown, DropdownNestedMenuItem, DropdownMenuItem} from "../../MythicComponents/MythicNestedMenus";
import WidgetsIcon from '@mui/icons-material/Widgets';
import TerminalIcon from '@mui/icons-material/Terminal';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import EditIcon from '@mui/icons-material/Edit';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import InfoIcon from '@mui/icons-material/Info';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faSkullCrossbones, faFolderOpen, faList} from '@fortawesome/free-solid-svg-icons';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import {TaskFromUIButton} from "./TaskFromUIButton";
import {CallbacksTabsOpenMultipleDialog} from "./CallbacksTabsOpenMultipleDialog";
import {operatorSettingDefaults} from "../../../cache";
import {CallbacksTableEditDescriptionColorDialog} from "./CallbacksTableEditDescriptionColorDialog";
import NotificationsActiveTwoToneIcon from '@mui/icons-material/NotificationsActiveTwoTone';
import NotificationsOffTwoToneIcon from '@mui/icons-material/NotificationsOffTwoTone';
import {CallbacksTableEditTriggerOnCheckinDialog} from "./CallbacksTableEditTriggerOnCheckinDialog";
import {CallbacksTableColumnsReorderDialog} from "./CallbacksTableColumnsReorderDialog";
import PlayCircleFilledTwoToneIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import {EventTriggerContextSelectDialog} from "../Eventing/EventTriggerContextSelect";
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import {faFilter} from '@fortawesome/free-solid-svg-icons';
import {getReadableTextColor, isValidHexColor} from "../../MythicComponents/MythicColorInput";
import {
    GridColumnFilterDialog,
    getUpdatedGridFilterOptions,
    gridValuePassesFilter,
    isGridColumnFilterActive
} from "../../MythicComponents/MythicResizableGrid/GridColumnFilterDialog";
import {MythicConfirmDialog} from "../../MythicComponents/MythicConfirmDialog";

export const getCustomBrowsersQuery = gql(`
query getCustomBrowsersQuery{
    custombrowser(where: {deleted: {_eq: false}}, order_by: {name: asc}){
        id
        name
        type
        separator
        columns
        default_visible_columns
        indicate_partial_listing
        show_current_path
        extra_table_inputs
        row_actions
        export_function
    }
}
`);
export const ipCompare = (a, b) => {
    let aJSON = JSON.parse(a);
    if(aJSON.length === 0){return 0}
    let bJSON = JSON.parse(b);
    if(bJSON.length === 0){return 0}
    let aPieces = aJSON[0].split("/");
    if(aPieces.length === 0){return 0}
    let bPieces = bJSON[0].split("/");
    if(bPieces.length === 0){return 0}
    // now we're only looking at the address and not the cidr notation if it exists
    let aIsIPv4 = aPieces[0].includes(".");
    let aIsIPv6 = aPieces[0].includes(":");
    let bIsIPv4 = bPieces[0].includes(".");
    let bIsIPv6 = bPieces[0].includes(":");
    if(aIsIPv4 && bIsIPv4){
        // we have two ipv4 addresses
        let aNums = aPieces[0].split(".").map( c => Number(c))
        let bNums = bPieces[0].split(".").map( c => Number(c))
        for(let i = 0; i < aNums.length; i++){
            if(aNums[i] < bNums[i]){return -1}
            else if(aNums[i] > bNums[i]){return 1}
        }
        return 0;
    } else if(aIsIPv4 && bIsIPv6) {
        return -1; // always sorting IPv4 before IPv6
    } else if(aIsIPv6 && bIsIPv4) {
        return 1; // always sorting IPv4 before IPv6
    } else if(aIsIPv6 && bIsIPv6) {
        // we have two ipv6 addresses
        let aNums = ip6.normalize(aPieces[0]).split(":").map( c => Number(c))
        let bNums = ip6.normalize(bPieces[0]).split(":").map( c => Number(c))
        for(let i = 0; i < aNums.length; i++){
            if(aNums[i] < bNums[i]){return -1}
            else if(aNums[i] > bNums[i]){return 1}
        }
        return 0;
    }
}
const callbackTableInitialColumns = [
    {key: "id", type: 'number', name: "Interact", width: 175, disableDoubleClick: true},
    {key: "mythictree_groups", type: 'array', name: "Groups", width: 150},
    {key: "ip", type: 'ip', name: "IP", width: 150},
    {key: "external_ip",type: 'string', name: "External IP", width: 150},
    {key: "host", type: 'string', name: "Host", fillWidth: true},
    {key: "user", type: 'string', name: "User", fillWidth: true},
    {key: "domain", type: 'string', name: "Domain", fillWidth: true},
    {key: "os", type: 'string', name: "OS", width: 45, disableDoubleClick: true, disableSort: true},
    {key: "architecture", type: 'string', name: "Arch", width: 75},
    {key: "pid", type: 'number', name: "PID", width: 75},
    {key: "last_checkin", type: 'timestamp', name: "Last Checkin", width: 150, disableFilterMenu: true, disableDoubleClick: true},
    {key: "description", type: 'string', name: "Description", width: 400},
    {key: "sleep", type: 'string', name: "Sleep", width: 60, disableFilterMenu: true, disableSort: true, disableDoubleClick: true},
    {key: "agent", type: 'agent', name: "Agent", width: 150},
    {key: "c2", type: 'string', name: "C2", width: 45, disableSort: true, disableFilterMenu: true, disableDoubleClick: true},
    {key: "process_short_name", type: 'string', name: "Process Name", fillWidth: true},
    {key: "tags", type: 'tags', name: "Tags", fillWidth: false, disableDoubleClick: true, width: 150}
];
const getCallbackRowStyle = (row) => {
    if(!isValidHexColor(row.color)){
        return {};
    }
    return {
        backgroundColor: row.color,
        color: getReadableTextColor(row.color),
    };
}
function CallbacksTablePreMemo(props){
    const callbacks = useContext(CallbacksContext);
    const onOpenTab = useContext(OnOpenTabContext);
    const onOpenTabs = useContext(OnOpenTabsContext);
    const interactType = GetMythicSetting({setting_name: "interactType", default_value: "interact", output: "string"});
    const [loadingSettings, setLoadingSettings] = React.useState(true);
    const [columnOrder, setColumnOrder] = React.useState(callbackTableInitialColumns);
    const [openReorderDialog, setOpenReorderDialog] = React.useState(false);
    const [openMultipleTabsDialog, setOpenMultipleTabsDialog] = React.useState({open: false, tabType: "interact"});
    const [openMetaDialog, setOpenMetaDialog] = React.useState(false);
    const openMetaDialogRef = React.useRef(0);
    const metaDialog = (callback_id) => {
        openMetaDialogRef.current = callback_id;
        setOpenMetaDialog(true);
    }
    const [openEditMythicTreeGroupsDialog, setOpenEditMythicTreeGroupsDialog] = React.useState(false);
    const mythicTreeGroupsDialogRef = React.useRef(0);
    const editMythicTreeGroupsDialog = (callback_id) => {
        mythicTreeGroupsDialogRef.current = callback_id;
        setOpenEditMythicTreeGroupsDialog(true);
    }
    const [openEditDescriptionDialog, setOpenEditDescriptionDialog] = React.useState(false);
    const [callbackLocalUpdates, setCallbackLocalUpdates] = React.useState({});
    const [updateDescriptionMutation] = useMutation(updateDescriptionCallbackMutation, {
        update: (cache, {data}) => {
            if(data.updateCallback.status === "success"){
                //snackActions.success("Updated Callback");
            }else{
                snackActions.warning(data.updateCallback.error);
            }

        },
        onError: data => {
            console.log(data);
            snackActions.warning(data);
        }
    });
    const updateDescriptionRef = React.useRef({payload_description: "", callback_display_id: 0, description: "", color: ""});
    const applyCallbackLocalUpdate = React.useCallback(({callback_display_id, description, color}) => {
        setCallbackLocalUpdates((currentUpdates) => ({
            ...currentUpdates,
            [String(callback_display_id)]: {description, color},
        }));
        const callbackIndex = callbacks.findIndex((callback) => callback.display_id === callback_display_id);
        if(callbackIndex !== -1){
            callbacks[callbackIndex] = {...callbacks[callbackIndex], description, color};
        }
    }, [callbacks]);
    const updateDescription = ({payload_description, callback_display_id, description, color}) => {
        updateDescriptionRef.current = {
            payload_description: payload_description,
            callback_display_id: callback_display_id,
            description: description,
            color: color,
        };
        setOpenEditDescriptionDialog(true);
    }
    const editDescriptionSubmit = (description, color) => {
        setOpenEditDescriptionDialog(false);
        if(description === ""){
            updateDescriptionSubmit({
                description: updateDescriptionRef.current.payload_description,
                color: color,
                callback_display_id: updateDescriptionRef.current.callback_display_id
            });
        } else {
            updateDescriptionSubmit({
                description: description,
                color: color,
                callback_display_id: updateDescriptionRef.current.callback_display_id
            });
        }
    }
    const updateDescriptionSubmit = React.useCallback( ({callback_display_id, description, color}) => {
        const previousCallback = callbacks.find((callback) => callback.display_id === callback_display_id);
        applyCallbackLocalUpdate({callback_display_id, description, color});
        updateDescriptionMutation({variables: {callback_display_id: callback_display_id, description, color}}).then(({data}) => {
            if(data?.updateCallback?.status !== "success" && previousCallback){
                applyCallbackLocalUpdate({
                    callback_display_id,
                    description: previousCallback.description,
                    color: previousCallback.color,
                });
            }
        }).catch(() => {
            if(previousCallback){
                applyCallbackLocalUpdate({
                    callback_display_id,
                    description: previousCallback.description,
                    color: previousCallback.color,
                });
            }
        });
    }, [applyCallbackLocalUpdate, callbacks, updateDescriptionMutation]);
    const [openCallbackDropdown, setOpenCallbackDropdown] = React.useState(false);
    const callbackDropdownRef = React.useRef({options: [], callback: {}});
    const [clickedCallbackID, setClickedCallbackId] = React.useState(0);
    React.useEffect( () => {
        setClickedCallbackId(getCallbackIdFromClickedTab(props.clickedTabId));
    }, [props.clickedTabId])
    const handleMenuItemClick = (event, clickOption) => {
        clickOption({event});
        setOpenCallbackDropdown(false);
    };
    const handleClose = (event) => {
        //setOpenCallbackDropdown(false);
        if (callbackDropdownRef.current.dropdownAnchorRef && callbackDropdownRef.current.dropdownAnchorRef.contains(event.target)) {
            return;
        }
        setOpenCallbackDropdown(false);
    };
    const [sortData, setSortData] = React.useState({"sortKey": null, "sortDirection": null, "sortType": null});
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [openHideMultipleDialog, setOpenHideMultipleDialog] = React.useState(false);
    const [openTriggerDialog, setOpenTriggerDialog] = React.useState({open: false, trigger_on_checkin_after_time: 0, display_id: 0});
    const [openUnlockDialog, setOpenUnlockDialog] = React.useState({open: false, display_id: 0, lockOwner: ""});
    const [openTaskMultipleDialog, setOpenTaskMultipleDialog] = React.useState({open: false, data: {}});
    const [filterOptions, setFilterOptions] = React.useState({});
    const [selectedColumn, setSelectedColumn] = React.useState({});
    const [columnVisibility, setColumnVisibility] = React.useState(() => {
        let defaults = {"visible": ["Interact", "Host", "Domain", "User", "Description", "Last Checkin", "Agent",  "IP", "PID"],
            "hidden": ["Arch", "Sleep", "Process Name", "External IP", "C2",  "OS", "Groups", "Tags"]}
        try {
            const storageItem = GetMythicSetting({setting_name: "callbacks_table_columns", default_value: operatorSettingDefaults.callbacks_table_columns});

            if(storageItem !== null){
                let allColumns = [...defaults["visible"].map(c => c), ...defaults["hidden"].map(c => c)];
                let newHidden = [];
                allColumns.forEach((v,i,a) => {
                    if(!storageItem.includes(v)){
                        newHidden.push(v);
                    }
                })
                return {visible: storageItem, hidden: newHidden};
            }
        }catch(error){
            console.log("Failed to load callbacks_table_columns", error);
        }
        return defaults;
    });
    const [updateSleep] = useMutation(updateSleepInfoCallbackMutation, {
      update: (cache, {data}) => {
        snackActions.success("Updated Callback");
        
      },
      onError: data => {
          console.log(data);
          snackActions.warning(data);
      }
    });
    const [hideCallback] = useMutation(hideCallbackMutation, {
        update: (cache, {data}) => {
            if(data.updateCallback.status === "success"){
                //snackActions.success("Hiding callback");
            }else{
                snackActions.warning(data.updateCallback.error);
            }

        },
        onError: data => {
            console.log(data);
        }
    });
    const [lockCallback] = useMutation(lockCallbackMutation, {
        update: (cache, {data}) => {
            if(data.updateCallback.status === "success"){
                snackActions.success("Locked callback");
            }else{
                snackActions.warning(data.updateCallback.error);
            }

        },
        onError: data => {
            console.log(data);
            snackActions.warning(data);
        }
    });
    const [unlockCallback] = useMutation(unlockCallbackMutation, {
        update: (cache, {data}) => {
            if(data.updateCallback.status === "success"){
                snackActions.success("Unlocked callback");
            }else{
                snackActions.warning(data.updateCallback.error);
            }

        },
        onError: data => {
            console.log(data);
            snackActions.warning(data);
        }
    });
    const [updateTrigger] = useMutation(updateCallbackTriggerMutation, {
        update: (cache, {data}) => {
            if(data.updateCallback.status === "success"){
                snackActions.success("Updated Trigger Threshold");
            }else{
                snackActions.warning(data.updateCallback.error);
            }

        },
        onError: data => {
            console.log(data);
            snackActions.warning(data);
        }
    })
    const [exportConfig] = useLazyQuery(exportCallbackConfigQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.exportCallbackConfig.status === "success"){
                const dataBlob = new Blob([data.exportCallbackConfig.config], {type: 'text/plain'});
                const ele = document.getElementById("download_config");
                if(ele !== null){
                    ele.href = URL.createObjectURL(dataBlob);
                    ele.download = "exported_callback.json";
                    ele.click();
                }else{
                    const element = document.createElement("a");
                    element.id = "download_config";
                    element.href = URL.createObjectURL(dataBlob);
                    element.download = "exported_callback.json";
                    document.body.appendChild(element);
                    element.click();
                }
            }else{
                snackActions.error("Failed to export configuration: " + data.exportCallbackConfig.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to export configuration: " + data.message)
        }
    });
    const getCustomBrowsers = useMythicLazyQuery(getCustomBrowsersQuery, {fetchPolicy: "no-cache"});
    const taskingData = React.useRef({"parameters": "", "ui_feature": "callback_table:exit"});
    const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
    const eventingDataRef = React.useRef({});
    const [openEventingDialog, setOpenEventingDialog] = React.useState(false);
    const [openEventingMultipleDialog, setOpenEventingMultipleDialog] = React.useState(false);
    const [updateSetting] = useSetMythicSetting();
    const onUpdateTrigger = (newTriggerValue) => {
        updateTrigger({variables: {callback_display_id: openTriggerDialog.display_id, trigger_on_checkin_after_time: newTriggerValue}})
        setOpenTriggerDialog({...openTriggerDialog, open: false});
    }
    const onOpenTriggerDialog = React.useCallback((callback) => {
        setOpenTriggerDialog({
            open: true,
            trigger_on_checkin_after_time: callback.trigger_on_checkin_after_time,
            display_id: callback.display_id,
        });
    }, []);
    const onOpenUnlockDialog = React.useCallback((callback) => {
        setOpenUnlockDialog({
            open: true,
            display_id: callback.display_id,
            lockOwner: callback.locked_operator?.username || "unknown operator",
        });
    }, []);
    const onCloseUnlockDialog = React.useCallback(() => {
        setOpenUnlockDialog({open: false, display_id: 0, lockOwner: ""});
    }, []);
    const onSubmitUnlockDialog = React.useCallback(() => {
        if(openUnlockDialog.display_id > 0){
            unlockCallback({variables: {callback_display_id: openUnlockDialog.display_id}});
        }
    }, [openUnlockDialog.display_id, unlockCallback]);
    async function getCustomBrowsersForContextMenu(){
        return await getCustomBrowsers({}).then(result => {return result.data?.custombrowser});
    }
    const callbackMenuIcon = (icon, intent = "neutral") => (
        <span className={`mythic-callback-action-menu-icon mythic-callback-action-menu-icon-${intent}`}>
            {icon}
        </span>
    );
    const callbackMenuLabel = (primary, secondary) => (
        <span className="mythic-callback-action-menu-label">
            <span className="mythic-callback-action-menu-label-primary">{primary}</span>
            {secondary &&
                <span className="mythic-callback-action-menu-label-secondary">{secondary}</span>
            }
        </span>
    );
    const callbackMenuSection = (label) => ({
        name: <span className="mythic-callback-action-menu-section-label">{label}</span>,
        icon: null,
        click: ({event}) => {},
        type: "item",
        disabled: true,
        className: "mythic-callback-action-menu-section"
    });
    async function onRowContextClick({rowDataStatic}) {
        // based on row, return updated options array?
        let defaultInteractIcon = <KeyboardIcon fontSize="small"/>;
        if(interactType === "interactSplit"){
            defaultInteractIcon = <VerticalSplitIcon fontSize="small"/>;
        } else if(interactType === "interactConsole"){
            defaultInteractIcon = <TerminalIcon fontSize="small"/>;
        }
        let customBrowsers = await getCustomBrowsersForContextMenu();
        customBrowsers = customBrowsers.map(b => {
            return {
                name: b.name,
                icon: callbackMenuIcon(b.type === 'file' ? <FontAwesomeIcon icon={faFolderOpen} /> : <AccountTreeIcon fontSize="small" />),
                className: "mythic-callback-action-menu-item",
                click: ({event}) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const tabType = b.type === 'file' ? 'customFileBasedBrowser' : 'customProcessBasedBrowser';
                    onOpenTab({
                        tabType: tabType,
                        tabID: rowDataStatic.id + tabType + b.name,
                        callbackID: rowDataStatic.id,
                        color: rowDataStatic.color,
                        displayID: rowDataStatic.display_id,
                        customBrowser: b
                    });
                }
            }
        })
        return  [
            {
                name: callbackMenuLabel("Callback " + rowDataStatic.display_id, rowDataStatic.user + "@" + rowDataStatic.host),
                icon: null, click: ({event}) => {},
                type: "item",
                disabled: true,
                className: "mythic-callback-action-menu-header"
            },
            callbackMenuSection("Tasking"),
            {
                name: "Interact", icon: callbackMenuIcon(defaultInteractIcon, "primary"), className: "mythic-callback-action-menu-item", click: ({event}) => {
                    event.stopPropagation();
                    const tabType = interactType;
                    onOpenTab({
                        tabType: tabType,
                        tabID: rowDataStatic.id + tabType,
                        callbackID: rowDataStatic.id,
                        color: rowDataStatic.color,
                        displayID: rowDataStatic.display_id});
                }, type: "item"
            },
            {
                name: "Tasking Views", icon: callbackMenuIcon(<VerticalSplitIcon fontSize="small" />), click: () => {}, type: "menu", className: "mythic-callback-action-menu-item",
                menuItems: [
                    {
                        name: 'Default Tasking', icon: callbackMenuIcon(<KeyboardIcon fontSize="small"/>), className: "mythic-callback-action-menu-item", click: ({event}) => {
                            event.stopPropagation();
                            const tabType = "interact";
                            onOpenTab({
                                tabType: tabType,
                                tabID: rowDataStatic.id + tabType,
                                callbackID: rowDataStatic.id,
                                color: rowDataStatic.color,
                                displayID: rowDataStatic.display_id});
                        }
                    },
                    {
                        name: 'Split Tasking', icon: callbackMenuIcon(<VerticalSplitIcon fontSize="small"/>), className: "mythic-callback-action-menu-item", click: ({event}) => {
                            event.stopPropagation();
                            const tabType = "interactSplit";
                            onOpenTab({
                                tabType: tabType,
                                tabID: rowDataStatic.id + tabType,
                                callbackID: rowDataStatic.id,
                                color: rowDataStatic.color,
                                displayID: rowDataStatic.display_id});
                        }
                    },
                    {
                        name: "Console View", icon: callbackMenuIcon(<TerminalIcon fontSize="small"/>), className: "mythic-callback-action-menu-item", click: ({event}) => {
                            event.stopPropagation();
                            const tabType = "interactConsole";
                            onOpenTab({
                                tabType: tabType,
                                tabID: rowDataStatic.id + tabType,
                                callbackID: rowDataStatic.id,
                                color: rowDataStatic.color,
                                displayID: rowDataStatic.display_id});
                        }
                    },
                    {
                        name: "Expand Callback", icon: callbackMenuIcon(<OpenInNewIcon fontSize="small" />), className: "mythic-callback-action-menu-item", click: ({event}) => {
                            event.stopPropagation();
                            window.open("/new/callbacks/" + rowDataStatic.display_id, "_blank").focus();
                        }
                    },
                ]
            },
            callbackMenuSection("Callback State"),
            {
                name: "Edit Description and Color", icon: callbackMenuIcon(<EditIcon fontSize="small" />), className: "mythic-callback-action-menu-item", click:({event}) => {
                    event.stopPropagation();
                    updateDescription({payload_description: rowDataStatic.payload.description,
                        callback_display_id: rowDataStatic.display_id,
                        description: rowDataStatic.description,
                        color: rowDataStatic.color
                    });
                }, type: "item"
            },
            {
                name: rowDataStatic.locked ? 'Unlock (Locked by ' + (rowDataStatic.locked_operator?.username || "unknown operator") + ')' : 'Lock Callback',
                icon: callbackMenuIcon(rowDataStatic.locked ? <LockIcon fontSize="small"/> : <LockOpenIcon fontSize="small" />, rowDataStatic.locked ? "warning" : "neutral"),
                className: "mythic-callback-action-menu-item",
                click: ({event}) => {
                    event.stopPropagation();
                    if(rowDataStatic.locked){
                        onOpenUnlockDialog(rowDataStatic);
                    }else{
                        lockCallback({variables: {callback_display_id: rowDataStatic.display_id}})
                    }
                }, type: "item"
            },
            {
                name: rowDataStatic.trigger_on_checkin_after_time > 0 ? "Adjust Alert Trigger" : "Add New Alert Trigger",
                type: "item",
                icon: callbackMenuIcon(rowDataStatic.trigger_on_checkin_after_time > 0 ? <NotificationsOffTwoToneIcon fontSize="small" /> : <NotificationsActiveTwoToneIcon fontSize="small"/>, rowDataStatic.trigger_on_checkin_after_time > 0 ? "warning" : "neutral"),
                className: "mythic-callback-action-menu-item",
                click: ({event}) => {
                    event.stopPropagation();
                    onOpenTriggerDialog(rowDataStatic);
                }
            },
            {
                name: 'Hide Callback', icon: callbackMenuIcon(<VisibilityOffIcon fontSize="small"/>, "warning"), className: "mythic-callback-action-menu-item", click: ({event}) => {
                    event.stopPropagation();
                    hideCallback({variables: {callback_display_id: rowDataStatic.display_id}});
                }, type: "item"
            },
            {
                name: "Exit Callback", icon: callbackMenuIcon(<FontAwesomeIcon icon={faSkullCrossbones} />, "error"), className: "mythic-callback-action-menu-item",
                click: ({event}) => {
                    taskingData.current = {
                        "parameters": "",
                        "ui_feature": "callback_table:exit",
                        "getConfirmation": true,
                        id: rowDataStatic.id,
                        display_id: rowDataStatic.display_id,
                        acceptText: "exit"
                    };
                    setOpenTaskingButton(true);
                }, type: "item"
            },
            callbackMenuSection("Workflows and Browsers"),
            {
                name: "Eventing", icon: callbackMenuIcon(<PlayCircleFilledTwoToneIcon fontSize="small" />), click: (event) => {}, type: "menu", className: "mythic-callback-action-menu-item",
                menuItems: [
                    {
                        name: "Start Eventing Workflow", icon: callbackMenuIcon(<PlayCircleFilledTwoToneIcon fontSize="small" />), className: "mythic-callback-action-menu-item",
                        click: ({event}) => {
                            eventingDataRef.current = {
                                name: "callback_id",
                                value: rowDataStatic.id
                            };
                            setOpenEventingDialog(true);
                        }
                    }
                ]
            },
            {
                name: "Browsers", icon: callbackMenuIcon(<AccountTreeIcon fontSize="small" />), click: () => {}, type: "menu", className: "mythic-callback-action-menu-item",
                menuItems: [
                    {
                        name: 'File Browser', icon: callbackMenuIcon(<FontAwesomeIcon icon={faFolderOpen} />), className: "mythic-callback-action-menu-item",
                        click: ({event}) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const tabType = "fileBrowser";
                            onOpenTab({
                                tabType: tabType,
                                tabID: rowDataStatic.id + tabType,
                                callbackID: rowDataStatic.id,
                                color: rowDataStatic.color,
                                displayID: rowDataStatic.display_id});
                        }
                    },
                    {
                        name: 'Process Browser', icon: callbackMenuIcon(<AccountTreeIcon fontSize="small"/>), className: "mythic-callback-action-menu-item",
                        click: ({event}) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const tabType = "processBrowser";
                            onOpenTab({
                                tabType: tabType,
                                tabID: rowDataStatic.id + tabType,
                                callbackID: rowDataStatic.id,
                                color: rowDataStatic.color,
                                displayID: rowDataStatic.display_id});
                        }
                    },
                    {
                        name: <span className="mythic-callback-action-menu-section-label">Custom Agent Browsers</span>,
                        icon: null, click: ({event}) => {},
                        type: "item",
                        disabled: true,
                        className: "mythic-callback-action-menu-section"
                    },
                    ...customBrowsers
                ]
            },
            {
                name: "Other Callbacks", icon: callbackMenuIcon(<OpenInNewIcon fontSize="small" />), click: () => {}, type: "menu", className: "mythic-callback-action-menu-item",
                menuItems: [
                    {
                        name: "Interact", icon: callbackMenuIcon(<KeyboardIcon fontSize="small"/>), className: "mythic-callback-action-menu-item", click: ({event}) => {
                            setOpenMultipleTabsDialog({open: true, tabType: "interact"});
                        }
                    },
                    {
                        name: "Split Tasking", icon: callbackMenuIcon(<VerticalSplitIcon fontSize="small"/>), className: "mythic-callback-action-menu-item", click: ({event}) => {
                            setOpenMultipleTabsDialog({open: true, tabType: "interactSplit"});
                        }
                    },
                    {
                        name: "Console View", icon: callbackMenuIcon(<TerminalIcon fontSize="small"/>), className: "mythic-callback-action-menu-item", click: ({event}) => {
                            setOpenMultipleTabsDialog({open: true, tabType: "interactConsole"});
                        }
                    },
                    {
                        name: "File Browser", icon: callbackMenuIcon(<FontAwesomeIcon icon={faFolderOpen} />), className: "mythic-callback-action-menu-item", click: ({event}) => {
                            setOpenMultipleTabsDialog({open: true, tabType: "fileBrowser"});
                        }
                    },
                    {
                        name: "Process Browser", icon:  callbackMenuIcon(<AccountTreeIcon fontSize="small"/>), className: "mythic-callback-action-menu-item", click: ({event}) => {
                            setOpenMultipleTabsDialog({open: true, tabType: "processBrowser"});
                        }
                    }
                ]
            },
            callbackMenuSection("Metadata"),
            {
                name: "Metadata", icon: callbackMenuIcon(<InfoIcon fontSize="small" />), click: () => {}, type: "menu", className: "mythic-callback-action-menu-item",
                menuItems: [
                    {
                        name: "Export Callback", icon: callbackMenuIcon(<ImportExportIcon fontSize="small" />), className: "mythic-callback-action-menu-item", click: ({event}) => {
                            event.stopPropagation();
                            exportConfig({variables: {agent_callback_id: rowDataStatic.agent_callback_id}});
                        }
                    },
                    {
                        name: "View Metadata", icon: callbackMenuIcon(<InfoIcon fontSize="small" />), className: "mythic-callback-action-menu-item", click: ({event}) => {
                            event.stopPropagation();
                            metaDialog(rowDataStatic.id);
                        }
                    },
                    {
                        name: "Modify Groupings", icon: callbackMenuIcon(<WidgetsIcon fontSize="small" />), className: "mythic-callback-action-menu-item", click: ({event}) => {
                            event.stopPropagation();
                            editMythicTreeGroupsDialog(rowDataStatic.id);
                        }
                    }
                ]
            },
            {
                name: "Bulk Actions", icon: callbackMenuIcon(<FontAwesomeIcon icon={faList} />), click: (event) => { }, type: "menu", className: "mythic-callback-action-menu-item",
                menuItems: [
                    {
                        name: "Hide Multiple", icon: callbackMenuIcon(<VisibilityOffIcon fontSize="small"/>, "warning"), className: "mythic-callback-action-menu-item",
                        click: ({event}) => {
                            setOpenHideMultipleDialog(true);
                        }
                    },
                    {
                        name: "Task Multiple", icon: callbackMenuIcon(<FontAwesomeIcon icon={faList} />), className: "mythic-callback-action-menu-item",
                        click: ({event}) => {
                            setOpenTaskMultipleDialog({open: true, data: rowDataStatic});
                        }
                    },
                    {
                        name: "Start Multiple Eventing Workflows", icon: callbackMenuIcon(<PlayCircleFilledTwoToneIcon fontSize="small"/>), className: "mythic-callback-action-menu-item",
                        click: ({event}) => {
                            setOpenEventingMultipleDialog(true);
                        }
                    }
                ]
            }
        ];
    }
    async function callbackDropdown({rowDataStatic, event}) {
        callbackDropdownRef.current.options = await onRowContextClick({rowDataStatic});
        callbackDropdownRef.current.callback = rowDataStatic;
        callbackDropdownRef.current.dropdownAnchorRef = event?.currentTarget || event.target;
        setOpenCallbackDropdown(true);
    }
    React.useEffect( () => {
      // on startup, want to see if `callbacks_table_columns` exists in storage and load it if possible
      try {
        const storageItem = GetMythicSetting({setting_name: "callbacks_table_columns", default_value: operatorSettingDefaults.callbacks_table_columns});
        if(storageItem !== null){
          let allColumns = [...columnVisibility["visible"].map(c => c), ...columnVisibility["hidden"].map(c => c)];
          let newHidden = [];
          allColumns.forEach((v,i,a) => {
            if(!storageItem.includes(v)){
              newHidden.push(v);
            }
          })
          setColumnVisibility({visible: storageItem, hidden: newHidden});
        }
      }catch(error){
        console.log("Failed to load callbacks_table_columns", error);
      }
      try {
        const storageItemOptions = GetMythicSetting({setting_name: "callbacks_table_filter_options", default_value: operatorSettingDefaults.callbacks_table_filters});
        if(storageItemOptions !== null){
            setFilterOptions(storageItemOptions);
        }
      }catch(error){
        console.log("Failed to load callbacks_table_filter_options", error);
      }
        try {
            const storageColumnOrder = GetMythicSetting({setting_name: "callbacks_table_column_order", default_value: callbackTableInitialColumns.map(c => c.name)});
            if(storageColumnOrder !== null){
                let newOrder = [];
                for(let i = 0; i < storageColumnOrder.length; i++){
                    for(let j = 0; j < columnOrder.length; j++){
                        if(columnOrder[j].name === storageColumnOrder[i]){
                            newOrder.push(columnOrder[j]);
                            break;
                        }
                    }
                }
                if(newOrder.length === callbackTableInitialColumns.length){
                    setColumnOrder(newOrder);
                }
            }
        }catch(error){
            console.log("Failed to load callbacks_table_filter_options", error);
        }
        setLoadingSettings(false);
    }, [])
    const columns = useMemo( 
      () =>
          columnOrder.reduce( (prev, cur) => {
          if(columnVisibility.visible.includes(cur.name) || cur.name === "Interact"){
            if(isGridColumnFilterActive(filterOptions[cur.key])){
                return [...prev, {...cur, filtered: true}];
            }else{
                return [...prev, {...cur}];
            }
          }else{
              return [...prev];
          }
        }, [])
      , [filterOptions, columnVisibility, columnOrder]
    );
    const onClickHeader = (e, columnIndex) => {
      const column = columns[columnIndex];
      if(column.disableSort){
          return;
      }
      if (!column.key) {
          setSortData({sortKey: null, sortType:null, sortDirection: "ASC"});
      }
      if (sortData.sortKey === column.key) {
          if (sortData.sortDirection === 'ASC') {
              setSortData({...sortData, sortDirection: "DESC"});
          } else {
              setSortData({sortKey: null, sortType:null, sortDirection: "ASC"});
          }
      } else {
          setSortData({sortKey: column.key, sortType:column.type, sortDirection: "ASC"});
      }
    };
    const onRowDoubleClick = React.useCallback( (event, rowID, rowDataStatic) => {
        const tabType = interactType;
        onOpenTab({
            tabType: tabType,
            tabID: rowDataStatic.id + tabType,
            callbackID: rowDataStatic.id,
            color: rowDataStatic.color,
            displayID: rowDataStatic.display_id});
    }, []);
    const contextMenuOptions = [
        {
            name: 'Filter Column', type: "item",
            icon: <FontAwesomeIcon icon={faFilter} style={{paddingRight: "5px"}} />,
            click: ({event, columnIndex}) => {
                if(event){
                    event.stopPropagation();
                    event.preventDefault();
                }
                if(columns[columnIndex].disableFilterMenu){
                    snackActions.warning("Can't filter that column");
                    return;
                }
                setSelectedColumn(columns[columnIndex]);
                setOpenContextMenu(true);
            },
        },
        {
            name: "Reorder Columns and Adjust Visibility", type: "item", icon: null,
            click: ({event, columnIndex}) => {
                if(event){
                    event.stopPropagation();
                    event.preventDefault();
                }
                setOpenReorderDialog(true);
            }
        }
    ];
    const updateSleepInfo = React.useCallback( ({callback_display_id, sleep_info}) => {
      updateSleep({variables: {callback_display_id: callback_display_id, sleep_info}})
    }, [])
    const filterRow = (row) => {
      for(const [key,value] of Object.entries(filterOptions)){
          if(key === "agent") {
              if (!gridValuePassesFilter(row.payload.payloadtype.name, value)) {
                  return true;
              }
          }else if(key === "id"){
              if (!gridValuePassesFilter(row.display_id, value)) {
                  return true;
              }
          }else{
            if(!gridValuePassesFilter(row[key], value)){
              return true;
            }
          }
      }
      return false;
    }
    const sortedData = React.useMemo(() => {
      const tempData = callbacks.map((callback) => {
          const localUpdate = callbackLocalUpdates[String(callback.display_id)];
          return localUpdate ? {...callback, ...localUpdate} : callback;
      });

      if (sortData.sortType === 'number' || sortData.sortType === 'size' || sortData.sortType === 'date') {
          tempData.sort((a, b) => (parseInt(a[sortData.sortKey]) > parseInt(b[sortData.sortKey]) ? 1 : -1));
      } else if (sortData.sortType === 'string') {
          tempData.sort((a, b) => (a[sortData.sortKey].toLowerCase() > b[sortData.sortKey].toLowerCase() ? 1 : -1));
      } else if(sortData.sortType === "ip") {
          tempData.sort((a, b) => (ipCompare(a[sortData.sortKey], b[sortData.sortKey])));
      } else if(sortData.sortType === "array"){
          tempData.sort( (a, b) => (
              a[sortData.sortKey] > b[sortData.sortKey] ? 1 : -1
          ))
      } else if(sortData.sortType === "timestamp") {
          tempData.sort((a, b) => {
              let aDate = new Date(a[sortData.sortKey]);
              let bDate = new Date(b[sortData.sortKey]);
              if(aDate.getFullYear() === 1970){
                  if(bDate.getFullYear() === 1970){
                      return 0;
                  }
                  return 1;
              } else if (bDate.getFullYear() === 1970){
                  return -1;
              }
              if(aDate > bDate){return 1}
              else if(bDate > aDate){return -1}
              return 0;
          })
      } else if(sortData.sortType === "agent"){
          tempData.sort((a, b) => (a?.payload?.payloadtype?.name?.toLowerCase() > b?.payload?.payloadtype?.name?.toLowerCase() ? 1 : -1));
      }
      if (sortData.sortDirection === 'DESC') {
          tempData.reverse();
      }
      return  tempData.reduce((prev, row) => {
            if(filterRow(row)){
                return [...prev];
            }else{
                return [...prev, columns.map( c => {
                    switch(c.name){
                        case "Interact":
                            return <CallbacksTableIDCell
                                rowData={{...row,
                                    selected: row.id === clickedCallbackID,
                                    rowStyle: getCallbackRowStyle(row),
                                }}
                                key={`callback${row.id}_${c.name}`}
                                callbackDropdown={callbackDropdown}
                                onOpenTriggerDialog={onOpenTriggerDialog}
                                onOpenUnlockDialog={onOpenUnlockDialog}
                            />;
                        case "Groups":
                            return <CallbacksTableStringCell
                                key={`callback${row.id}_${c.name}`}
                                cellData={row.mythictree_groups.join(", ")}
                                rowData={{...row,
                                    selected: row.id === clickedCallbackID,
                                    rowStyle: getCallbackRowStyle(row),
                                }}
                            />;
                        case "IP":
                            return <CallbacksTableIPCell
                                key={`callback${row.id}_${c.name}`}
                                cellData={row.ip}
                                rowData={{...row,
                                    selected: row.id === clickedCallbackID,
                                    rowStyle: getCallbackRowStyle(row),
                                }}
                                callback_id={row.id} />;
                        case "External IP":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.external_ip}
                                                             rowData={{...row,
                                                                 selected: row.id === clickedCallbackID,
                                                                 rowStyle: getCallbackRowStyle(row),
                                                             }} />;
                        case "Host":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.host}
                                                             rowData={{...row,
                                                                 selected: row.id === clickedCallbackID,
                                                                 rowStyle: getCallbackRowStyle(row),
                                                             }} />;
                        case "User":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.user + (row.impersonation_context === "" ? "" : ` [${row.impersonation_context}]`)}
                                                             rowData={{...row,
                                                                 selected: row.id === clickedCallbackID,
                                                                 rowStyle: getCallbackRowStyle(row),
                                                             }} />;
                        case "Domain":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.domain}
                                                             rowData={{...row,
                                                                 selected: row.id === clickedCallbackID,
                                                                 rowStyle: getCallbackRowStyle(row),
                                                             }} />;
                        case "OS":
                            return <CallbacksTableOSCell key={`callback${row.id}_${c.name}`}
                                                         rowData={{...row,
                                                             selected: row.id === clickedCallbackID,
                                                             rowStyle: getCallbackRowStyle(row),
                                                         }}
                                                         cellData={row.os} />;
                        case "Arch":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`}
                                                             rowData={{...row,
                                                                 selected: row.id === clickedCallbackID,
                                                                 rowStyle: getCallbackRowStyle(row),
                                                             }}
                                                             cellData={row.architecture} />;
                        case "PID":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.pid}
                                                             rowData={{...row,
                                                                 selected: row.id === clickedCallbackID,
                                                                 rowStyle: getCallbackRowStyle(row),
                                                             }} />;
                        case "Last Checkin":
                            return <CallbacksTableLastCheckinCell key={`callback${row.id}_${c.name}`} me={props.me}
                                                                  rowData={{...row,
                                                                      selected: row.id === clickedCallbackID,
                                                                      rowStyle: getCallbackRowStyle(row),
                                                                  }}
                                                                  cellData={row.last_checkin} />;
                        case "Description":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.description}
                                                             rowData={{...row,
                                                                 selected: row.id === clickedCallbackID,
                                                                 rowStyle: getCallbackRowStyle(row),
                                                             }} />;
                        case "Sleep":
                            return <CallbacksTableSleepCell key={`callback${row.id}_${c.name}`}
                                                            rowData={{...row,
                                                                selected: row.id === clickedCallbackID,
                                                                rowStyle: getCallbackRowStyle(row),
                                                            }}
                                                            cellData={row.sleep_info} updateSleepInfo={updateSleepInfo} />;
                        case "Agent":
                            return <CallbacksTablePayloadTypeCell key={`callback${row.id}_${c.name}`}
                                                                  rowData={{...row,
                                                                      selected: row.id === clickedCallbackID,
                                                                      rowStyle: getCallbackRowStyle(row),
                                                                  }}
                                                                  cellData={row.payload.payloadtype.name}/>;
                        case "C2":
                            return <CallbacksTableC2Cell key={`callback${row.id}_c2`}
                                                         rowData={{...row,
                                                             selected: row.id === clickedCallbackID,
                                                             rowStyle: getCallbackRowStyle(row),
                                                         }} />
                        case "Process Name":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`}
                                                             cellData={row.process_short_name}
                                                             rowData={{...row,
                                                                 selected: row.id === clickedCallbackID,
                                                                 rowStyle: getCallbackRowStyle(row),
                                                             }} />;
                        case "Tags":
                            return <CallbacksTableTagsCell key={`callback${row.id}_${c.name}`}
                                                             cellData={row.tags}
                                                             rowData={{...row,
                                                                 selected: row.id === clickedCallbackID,
                                                                 rowStyle: getCallbackRowStyle(row),
                                                             }} />;
                    }
                })];
            }
        }, [])
    }, [callbacks, callbackLocalUpdates, sortData, filterOptions, columnVisibility, clickedCallbackID, onOpenTriggerDialog, onOpenUnlockDialog]);
    const onSubmitFilterOptions = (value) => {
        const nextFilterOptions = getUpdatedGridFilterOptions(filterOptions, selectedColumn.key, value);
        setFilterOptions(nextFilterOptions);
      try{
          updateSetting({setting_name: "callbacks_table_filter_options", value: nextFilterOptions});
      }catch(error){
          console.log("failed to save filter options");
      }
    }
    const sortColumn = columns.findIndex((column) => column.key === sortData.sortKey);
    const onOpenTabsCallback = (tabsToOpen) => {
        let newTabs = [];
        for(let i = 0; i < tabsToOpen.length; i++){
            newTabs.push({
                tabType: openMultipleTabsDialog.tabType,
                tabID: tabsToOpen[i].id + openMultipleTabsDialog.tabType,
                callbackID: tabsToOpen[i].id,
                color: tabsToOpen[i].color,
                displayID: tabsToOpen[i].display_id});
        }
        onOpenTabs({tabs: newTabs});
        setOpenMultipleTabsDialog({open: false, tabType: "interact"});
    }
    if(props.loading || loadingSettings){
      return (
          <div style={{width: '100%', height: '100%', position: "relative",}}>
              <div style={{overflowY: "hidden", flexGrow: 1}}>
                  <div style={{
                      position: "absolute",
                      left: "35%",
                      top: "40%"
                  }}>
                      {"Loading Callbacks and Connections..."}
                  </div>
              </div>
          </div>
      )
    }
    const onSubmitColumnReorder = (newOrder) => {
        let newVisible = [];
        let newHidden = [];
        for(let i = 0; i < newOrder.length; i++){
            if(newOrder[i].visible){
                newVisible.push(newOrder[i].name);
            } else {
                newHidden.push(newOrder[i].name);
            }
        }
        updateSetting({setting_name: "callbacks_table_column_order", value: newOrder.map(c => c.name)});
        setColumnOrder(newOrder);
        setColumnVisibility({visible: newVisible, hidden: newHidden});
        updateSetting({setting_name: "callbacks_table_columns", value: newVisible});
        setOpenReorderDialog(false);
    }
    const onResetColumnReorder = () => {
        onSubmitColumnReorder(callbackTableInitialColumns);
    }
    const onSubmitSelectMultiple = (callbacks) => {
        eventingDataRef.current = {
            trigger_context_type: "callback_id",
            trigger_context_ids: callbacks.map(c => c.id)
        };
        setOpenEventingDialog(true);
    }
    return (
        <div style={{width: '100%', height: '100%', position: "relative",}}>
            <MythicResizableGrid
                name={"callbacks_table"}
                callbackTableGridRef={props.callbackTableGridRef}
                columns={columns}
                sortIndicatorIndex={sortColumn}
                sortDirection={sortData.sortDirection}
                items={sortedData}
                rowHeight={GetComputedFontSize() + 15}
                onClickHeader={onClickHeader}
                onDoubleClickRow={onRowDoubleClick}
                contextMenuOptions={contextMenuOptions}
                onRowContextMenuClick={onRowContextClick}
          />
          {openContextMenu &&
              <MythicDialog fullWidth={true} maxWidth="sm" open={openContextMenu}
                  onClose={()=>{setOpenContextMenu(false);}} 
                  innerDialog={<GridColumnFilterDialog
                      onSubmit={onSubmitFilterOptions}
                      filterValue={filterOptions[selectedColumn.key]}
                      selectedColumn={selectedColumn}
                      onClose={() => {
                          setOpenContextMenu(false);
                      }}
                  />}
              />
          }
            {openEditDescriptionDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth={"md"}
                    open={openEditDescriptionDialog}
                    onClose={() => {setOpenEditDescriptionDialog(false);}}
                    innerDialog={
                        <CallbacksTableEditDescriptionColorDialog title={`Edit Callback ${updateDescriptionRef.current.callback_display_id} Description and Color`}
                                                  onClose={() => {setOpenEditDescriptionDialog(false);}}
                                                  description={updateDescriptionRef.current.description}
                                                  color={updateDescriptionRef.current.color}
                                                  onSubmit={editDescriptionSubmit}
                        />
                    }
                />
            }
            {openMetaDialog &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openMetaDialog}
                              onClose={()=>{setOpenMetaDialog(false);}}
                              innerDialog={
                    <DetailedCallbackTable onClose={()=>{setOpenMetaDialog(false);}}
                                           callback_id={openMetaDialogRef.current} />
                }
                />
            }
            {openEditMythicTreeGroupsDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth={"lg"}
                    open={openEditMythicTreeGroupsDialog}
                    onClose={() => {setOpenEditMythicTreeGroupsDialog(false);}}
                    innerDialog={
                        <ModifyCallbackMythicTreeGroupsDialog callback_id={mythicTreeGroupsDialogRef.current}
                                                              onClose={() => {setOpenEditMythicTreeGroupsDialog(false);}} />
                    }
                />
            }
            {openTaskingButton &&
                <TaskFromUIButton ui_feature={taskingData.current?.ui_feature || " "}
                                  callback_id={taskingData.current?.id}
                                  display_id={taskingData.current?.display_id}
                                  parameters={taskingData.current?.parameters || ""}
                                  openDialog={taskingData.current?.openDialog || false}
                                  getConfirmation={taskingData.current?.getConfirmation || false}
                                  acceptText={taskingData.current?.acceptText || "YES"}
                                  selectCallback={taskingData.current?.selectCallback || false}
                                  onTasked={() => setOpenTaskingButton(false)}/>
            }
            {openCallbackDropdown &&
                <ClickAwayListener onClickAway={handleClose} mouseEvent={"onMouseDown"}>
                    <Dropdown
                        isOpen={callbackDropdownRef.current.dropdownAnchorRef}
                        onOpen={setOpenCallbackDropdown}
                        externallyOpen={openCallbackDropdown}
                        minWidth={285}
                        menu={
                            callbackDropdownRef.current.options.map((option, index) => (
                                option.type === 'item' ? (
                                    <DropdownMenuItem
                                        key={"callback-action-" + index}
                                        className={option.className}
                                        disabled={option.disabled}
                                        onClick={(event) => handleMenuItemClick(event, option.click)}
                                    >
                                        {option.icon}{option.name}
                                    </DropdownMenuItem>
                                ) : option.type === 'menu' ? (
                                    <DropdownNestedMenuItem
                                        key={"callback-action-" + index}
                                        className={option.className}
                                        label={<span className="mythic-callback-action-menu-nested-label">{option.icon}{option.name}</span>}
                                        disabled={option.disabled}
                                        menu={
                                            option.menuItems.map((menuOption, indx) => (
                                                <DropdownMenuItem
                                                    key={"callback-action-" + index + "-" + indx}
                                                    className={menuOption.className}
                                                    disabled={menuOption.disabled}
                                                    onClick={(event) => handleMenuItemClick(event, menuOption.click)}
                                                >
                                                    {menuOption.icon}{menuOption.name}
                                                </DropdownMenuItem>
                                            ))
                                        }
                                    />
                                ) : null
                            ))
                        }
                    />
                </ClickAwayListener>
            }
            {openHideMultipleDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="xl"
                    open={openHideMultipleDialog}
                    onClose={() => {setOpenHideMultipleDialog(false);}}
                    innerDialog={
                        <CallbacksTabsHideMultipleDialog onClose={() => {setOpenHideMultipleDialog(false);}} />
                    }
                />
            }
            {openTriggerDialog.open &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="md"
                    open={openTriggerDialog.open}
                    onClose={() => {setOpenTriggerDialog({...openTriggerDialog, open: false});}}
                    innerDialog={
                        <CallbacksTableEditTriggerOnCheckinDialog
                            onSubmit={onUpdateTrigger}
                            trigger_on_checkin_after_time={openTriggerDialog.trigger_on_checkin_after_time}
                            onClose={() => {setOpenTriggerDialog({...openTriggerDialog, open: false});}} />
                    }
                />
            }
            {openUnlockDialog.open &&
                <MythicConfirmDialog
                    open={openUnlockDialog.open}
                    title={"Unlock Callback?"}
                    dialogText={`Unlock callback ${openUnlockDialog.display_id} currently locked by ${openUnlockDialog.lockOwner}?`}
                    acceptText={"Unlock"}
                    acceptColor={"warning"}
                    onClose={onCloseUnlockDialog}
                    onSubmit={onSubmitUnlockDialog}
                />
            }
            {openReorderDialog &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={openReorderDialog}
                              onClose={()=>{setOpenReorderDialog(false);}}
                              innerDialog={
                                  <CallbacksTableColumnsReorderDialog
                                      onClose={()=>{setOpenReorderDialog(false);}}
                                      visible={columnVisibility.visible}
                                      hidden={columnVisibility.hidden}
                                      onReset={onResetColumnReorder}
                                      onSubmit={onSubmitColumnReorder} initialItems={columnOrder}
                                  />}
                />
            }
            {openMultipleTabsDialog.open &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="xl"
                    open={openMultipleTabsDialog.open}
                    onClose={() => {setOpenMultipleTabsDialog({open: false, tabType: "interact"})}}
                    innerDialog={
                        <CallbacksTabsOpenMultipleDialog
                            tabType={openMultipleTabsDialog.tabType}
                            onOpenTabs={onOpenTabsCallback}
                            onClose={() => {setOpenMultipleTabsDialog({open: false, tabType: "interact"})}}
                        />
                    }
                />
            }
            {openTaskMultipleDialog.open &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="xl"
                    open={openTaskMultipleDialog.open}
                    onClose={() => {setOpenTaskMultipleDialog({open: false, data: {}});}}
                    innerDialog={
                        <CallbacksTabsTaskMultipleDialog callback={openTaskMultipleDialog.data}
                                                         onClose={() => {setOpenTaskMultipleDialog({open: false, data: {}});}}
                                                         me={props.me}/>
                    }
                />
            }
            {openEventingDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="xl"
                    open={openEventingDialog}
                    onClose={() => {setOpenEventingDialog(false);}}
                    innerDialog={
                        <EventTriggerContextSelectDialog onClose={() => {setOpenEventingDialog(false);}}
                                                         triggerContext={eventingDataRef.current}
                        />
                    }
                />
            }
            {openEventingMultipleDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="xl"
                    open={openEventingMultipleDialog}
                    onClose={() => {setOpenEventingMultipleDialog(false);}}
                    innerDialog={
                        <CallbacksTabsSelectMultipleDialog onClose={() => {setOpenEventingMultipleDialog(false);}}
                        onSubmit={onSubmitSelectMultiple}/>
                    }
                />
            }
        </div>             
    )
}
export const CallbacksTable = React.memo(CallbacksTablePreMemo);
