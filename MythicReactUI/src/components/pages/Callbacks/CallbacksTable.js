import React, { useEffect, useMemo, useContext} from 'react';
import {MythicTransferListDialog} from '../../MythicComponents/MythicTransferList';
import {MythicDialog, MythicModifyStringDialog} from '../../MythicComponents/MythicDialog';
import {
    exportCallbackConfigQuery,
    hideCallbackMutation, lockCallbackMutation, unlockCallbackMutation,
    updateDescriptionCallbackMutation,
    updateSleepInfoCallbackMutation
} from './CallbackMutations';
import {snackActions} from '../../utilities/Snackbar';
import {useMutation, useLazyQuery } from '@apollo/client';
import {
  CallbacksTableIDCell,
  CallbacksTableStringCell,
  CallbacksTableLastCheckinCell,
  CallbacksTablePayloadTypeCell,
  CallbacksTableC2Cell,
  CallbacksTableOSCell,
  CallbacksTableSleepCell,
  CallbacksTableIPCell
} from './CallbacksTableRow';
import MythicResizableGrid from '../../MythicComponents/MythicResizableGrid';
import {TableFilterDialog} from './TableFilterDialog';
import {CallbacksTabsHideMultipleDialog} from "./CallbacksTabsHideMultipleDialog";
import {CallbacksTabsTaskMultipleDialog} from "./CallbacksTabsTaskMultipleDialog";
import ip6 from 'ip6';
import {CallbacksContext, OnOpenTabContext, OnOpenTabsContext} from "./CallbacksTop";
import {
    MaterialReactTable,
    useMaterialReactTable,
} from 'material-react-table';
import {useTheme} from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import {SetMythicSetting, useMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import {DetailedCallbackTable} from "./DetailedCallbackTable";
import {ModifyCallbackMythicTreeGroupsDialog} from "./ModifyCallbackMythicTreeGroupsDialog";
import Paper from '@mui/material/Paper';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
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

function CallbacksTablePreMemo(props){
    const callbacks = useContext(CallbacksContext);
    const onOpenTab = useContext(OnOpenTabContext);
    const onOpenTabs = useContext(OnOpenTabsContext);
    const theme = useTheme();
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
    const [updateDescriptionMutation] = useMutation(updateDescriptionCallbackMutation, {
        update: (cache, {data}) => {
            if(data.updateCallback.status === "success"){
                snackActions.success("Updated Callback");
            }else{
                snackActions.warning(data.updateCallback.error);
            }

        },
        onError: data => {
            console.log(data);
            snackActions.warning(data);
        }
    });
    const updateDescriptionRef = React.useRef({payload_description: "", callback_display_id: 0, description: ""});
    const updateDescription = ({payload_description, callback_display_id, description}) => {
        updateDescriptionRef.current = {
            payload_description: payload_description,
            callback_display_id: callback_display_id,
            description: description
        };
        setOpenEditDescriptionDialog(true);
    }
    const editDescriptionSubmit = (description) => {
        setOpenEditDescriptionDialog(false);
        if(description === ""){
            updateDescriptionSubmit({
                description: updateDescriptionRef.current.payload_description,
                callback_display_id: updateDescriptionRef.current.callback_display_id
            });
        } else {
            updateDescriptionSubmit({
                description: description,
                callback_display_id: updateDescriptionRef.current.callback_display_id
            });
        }
    }
    const updateDescriptionSubmit = React.useCallback( ({callback_display_id, description}) => {
        updateDescriptionMutation({variables: {callback_display_id: callback_display_id, description}})
    }, []);
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
    const [openAdjustColumnsDialog, setOpenAdjustColumnsDialog] = React.useState(false);
    const [openHideMultipleDialog, setOpenHideMultipleDialog] = React.useState(false);
    const [openTaskMultipleDialog, setOpenTaskMultipleDialog] = React.useState({open: false, data: {}});
    const [filterOptions, setFilterOptions] = React.useState({});
    const [selectedColumn, setSelectedColumn] = React.useState({});
    const [columnVisibility, setColumnVisibility] = React.useState({
        "visible": ["Interact", "Host", "Domain", "User", "Description", "Last Checkin", "Agent",  "IP", "PID"],
        "hidden": ["Arch", "Sleep", "Process Name", "External IP", "C2",  "OS", "Groups"]
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
                snackActions.success("Hiding callback");
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
    const [exportConfig] = useLazyQuery(exportCallbackConfigQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.exportCallbackConfig.status === "success"){
                const dataBlob = new Blob([data.exportCallbackConfig.config], {type: 'text/plain'});
                const ele = document.getElementById("download_config");
                if(ele !== null){
                    ele.href = URL.createObjectURL(dataBlob);
                    ele.download = data.exportCallbackConfig.agent_callback_id + ".json";
                    ele.click();
                }else{
                    const element = document.createElement("a");
                    element.id = "download_config";
                    element.href = URL.createObjectURL(dataBlob);
                    element.download = data.exportCallbackConfig.agent_callback_id + ".json";
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
    })
    const taskingData = React.useRef({"parameters": "", "ui_feature": "callback_table:exit"});
    const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
    const onRowContextClick = ({rowDataStatic}) => {
        // based on row, return updated options array?
        return  [
            {
                name: "Callback: " + rowDataStatic.display_id, icon: null, click: ({event}) => {},
                type: "item", disabled: true
            },
            {
                name: "Interact", icon: <KeyboardIcon style={{paddingRight: "5px"}}/>, click: ({event}) => {
                    event.stopPropagation();
                    const tabType = "interact";
                    onOpenTab({
                        tabType: tabType,
                        tabID: rowDataStatic.id + tabType,
                        callbackID: rowDataStatic.id,
                        displayID: rowDataStatic.display_id});
                }, type: "item"
            },
            {
                name: "Edit Description", icon: <EditIcon style={{paddingRight: "5px"}} />, click:({event}) => {
                    event.stopPropagation();
                    updateDescription({payload_description: rowDataStatic.payload.description,
                        callback_display_id: rowDataStatic.display_id,
                        description: rowDataStatic.description,
                    });
                }, type: "item"
            },
            {
                name: 'Hide Callback', icon: <VisibilityOffIcon color={"warning"} style={{paddingRight: "5px"}}/>, click: ({event}) => {
                    event.stopPropagation();
                    hideCallback({variables: {callback_display_id: rowDataStatic.display_id}});
                }, type: "item"
            },
            {
                name: "Exit Callback", icon: <FontAwesomeIcon icon={faSkullCrossbones} style={{color: theme.errorOnMain, cursor: "pointer", marginRight: "10px"}} />,
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
            {
                name: rowDataStatic.locked ? 'Unlock (Locked by ' + rowDataStatic.locked_operator.username + ')' : 'Lock Callback', icon: rowDataStatic.locked ? (<LockIcon color={"error"} style={{paddingRight: "5px"}}/>) : (<LockOpenIcon color={"success"} style={{paddingRight: "5px"}} />),
                click: ({event}) => {
                    event.stopPropagation();
                    if(rowDataStatic.locked){
                        unlockCallback({variables: {callback_display_id: rowDataStatic.display_id}})
                    }else{
                        lockCallback({variables: {callback_display_id: rowDataStatic.display_id}})
                    }
                }, type: "item"
            },
            {
                name: "Browsers", icon: null, click: () => {}, type: "menu",
                menuItems: [
                    {
                        name: 'File Browser', icon: <FontAwesomeIcon icon={faFolderOpen} style={{color: theme.folderColor, cursor: "pointer", marginRight: "10px"}} />,
                        click: ({event}) => {
                            event.stopPropagation();
                            const tabType = "fileBrowser";
                            onOpenTab({
                                tabType: tabType,
                                tabID: rowDataStatic.id + tabType,
                                callbackID: rowDataStatic.id,
                                displayID: rowDataStatic.display_id});
                        }
                    },
                    {
                        name: 'Process Browser', icon: <AccountTreeIcon style={{paddingRight: "5px"}}/>,
                        click: ({event}) => {
                            event.stopPropagation();
                            const tabType = "processBrowser";
                            onOpenTab({
                                tabType: tabType,
                                tabID: rowDataStatic.id + tabType,
                                callbackID: rowDataStatic.id,
                                displayID: rowDataStatic.display_id});
                        }
                    },
                ]
            },
            {
                name: "Bulk Actions", icon: null, click: (event) => { }, type: "menu",
                menuItems: [
                    {
                        name: "Hide Multiple", icon: <VisibilityOffIcon color={"warning"} style={{paddingRight: "5px"}}/>,
                        click: ({event}) => {
                            setOpenHideMultipleDialog(true);
                        }
                    },
                    {
                        name: "Task Multiple", icon: <FontAwesomeIcon icon={faList} style={{cursor: "pointer", marginRight: "10px"}} />,
                        click: ({event}) => {
                            setOpenTaskMultipleDialog({open: true, data: rowDataStatic});
                        }
                    },
                ]
            },
            {
                name: "Tasking Views", icon: null, click: () => {}, type: "menu",
                menuItems: [

                    {
                        name: 'Split Tasking', icon: <VerticalSplitIcon style={{paddingRight: "5px"}}/>, click: ({event}) => {
                            event.stopPropagation();
                            const tabType = "interactSplit";
                            onOpenTab({
                                tabType: tabType,
                                tabID: rowDataStatic.id + tabType,
                                callbackID: rowDataStatic.id,
                                displayID: rowDataStatic.display_id});
                        }
                    },
                    {
                        name: "Console View", icon: <TerminalIcon style={{paddingRight: "5px"}}/>, click: ({event}) => {
                            event.stopPropagation();
                            const tabType = "interactConsole";
                            onOpenTab({
                                tabType: tabType,
                                tabID: rowDataStatic.id + tabType,
                                callbackID: rowDataStatic.id,
                                displayID: rowDataStatic.display_id});
                        }
                    },
                    {
                        name: "Expand Callback", icon: <OpenInNewIcon style={{paddingRight: "5px"}} />, click: ({event}) => {
                            event.stopPropagation();
                            window.open("/new/callbacks/" + rowDataStatic.display_id, "_blank").focus();
                        }
                    },
                ]
            },
            {
                name: "Metadata", icon: null, click: () => {}, type: "menu",
                menuItems: [
                    {
                        name: "Export Callback", icon: <ImportExportIcon style={{paddingRight: "5px"}} />, click: ({event}) => {
                            event.stopPropagation();
                            exportConfig({variables: {agent_callback_id: rowDataStatic.agent_callback_id}});
                        }
                    },
                    {
                        name: "View Metadata", icon: <InfoIcon color={"info"} style={{paddingRight: "5px"}} />, click: ({event}) => {
                            event.stopPropagation();
                            metaDialog(rowDataStatic.id);
                        }
                    },
                    {
                        name: "Modify Groupings", icon: <WidgetsIcon color={"info"} style={{paddingRight: "5px"}} />, click: ({event}) => {
                            event.stopPropagation();
                            editMythicTreeGroupsDialog(rowDataStatic.id);
                        }
                    }
                ]
            },
            {
                name: "Other Callbacks", icon: null, click: () => {}, type: "menu",
                menuItems: [
                    {
                        name: "Interact", icon: <KeyboardIcon style={{paddingRight: "5px"}}/>, click: ({event}) => {
                            setOpenMultipleTabsDialog({open: true, tabType: "interact"});
                        }
                    },
                    {
                        name: "Split Tasking", icon: <VerticalSplitIcon style={{paddingRight: "5px"}}/>, click: ({event}) => {
                            setOpenMultipleTabsDialog({open: true, tabType: "interactSplit"});
                        }
                    },
                    {
                        name: "Console View", icon: <TerminalIcon style={{paddingRight: "5px"}}/>, click: ({event}) => {
                            setOpenMultipleTabsDialog({open: true, tabType: "interactConsole"});
                        }
                    },
                    {
                        name: "File Browser", icon: <FontAwesomeIcon icon={faFolderOpen} style={{color: theme.folderColor, cursor: "pointer", marginRight: "10px"}} />, click: ({event}) => {
                            setOpenMultipleTabsDialog({open: true, tabType: "fileBrowser"});
                        }
                    },
                    {
                        name: "Process Browser", icon:  <AccountTreeIcon style={{paddingRight: "5px"}}/>, click: ({event}) => {
                            setOpenMultipleTabsDialog({open: true, tabType: "processBrowser"});
                        }
                    }
                ]
            }
        ];
    }
    const callbackDropdown = ({rowDataStatic, event}) => {
        callbackDropdownRef.current.options = onRowContextClick({rowDataStatic});
        callbackDropdownRef.current.callback = rowDataStatic;
        callbackDropdownRef.current.dropdownAnchorRef = event.currentTarget;
        setOpenCallbackDropdown(true);
    }
    const onSubmitAdjustColumns = ({left, right}) => {
      setColumnVisibility({visible: right, hidden: left});
      localStorage.setItem("callbacks_table_columns", JSON.stringify(right));
    }
    React.useEffect( () => {
      // on startup, want to see if `callbacks_table_columns` exists in storage and load it if possible
      try {
        const storageItem = localStorage.getItem("callbacks_table_columns");
        if(storageItem !== null){
          let loadedColumnNames = JSON.parse(storageItem);
          let allColumns = [...columnVisibility["visible"].map(c => c), ...columnVisibility["hidden"].map(c => c)];
          let newHidden = [];
          allColumns.forEach((v,i,a) => {
            if(!loadedColumnNames.includes(v)){
              newHidden.push(v);
            }
          })
          setColumnVisibility({visible: loadedColumnNames, hidden: newHidden});
        }
      }catch(error){
        console.log("Failed to load callbacks_table_columns", error);
      }
      try {
        const storageItemOptions = localStorage.getItem("callbacks_table_filter_options");
        if(storageItemOptions !== null){
            let filters = JSON.parse(storageItemOptions);
            setFilterOptions(filters);
        }
      }catch(error){
        console.log("Failed to load callbacks_table_columns", error);
    }
    }, [])
    const columns = useMemo( 
      () => 
        [
          {key: "id", type: 'number', name: "Interact", width: 120, disableDoubleClick: true},
          {key: "mythictree_groups", type: 'array', name: "Groups"},
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
        ].reduce( (prev, cur) => {
          if(columnVisibility.visible.includes(cur.name) || cur.name === "Interact"){
            if(filterOptions[cur.key] && String(filterOptions[cur.key]).length > 0){
                return [...prev, {...cur, filtered: true}];
            }else{
                return [...prev, {...cur}];
            }
          }else{
              return [...prev];
          }
        }, [])
      , [filterOptions, columnVisibility]
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
    const onRowDoubleClick = React.useCallback( () => {

    }, []);
    const contextMenuOptions = [
        {
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
        },
        {
            name: "Show/Hide Columns",
            click: ({event, columnIndex}) => {
                event.preventDefault();
                event.stopPropagation();
                if(columns[columnIndex].disableFilterMenu){
                    snackActions.warning("Can't filter that column");
                    return;
                }
                setOpenAdjustColumnsDialog(true);
            }
        }
    ];
    useEffect( () => {
      let localSettings = localStorage.getItem("callbacks_table_columns");
      if(localSettings !== null){
      }
    }, [columns]);
    const updateSleepInfo = React.useCallback( ({callback_display_id, sleep_info}) => {
      updateSleep({variables: {callback_display_id: callback_display_id, sleep_info}})
    }, [])
    const filterRow = (row) => {
      for(const [key,value] of Object.entries(filterOptions)){
          if(key === "agent"){
            if(!String(row.payload.payloadtype.name).toLowerCase().includes(String(value).toLowerCase())){
              return true;
            }
          }else{
            if(!String(row[key]).toLowerCase().includes(String(value).toLowerCase())){
              return true;
            }
          }
          
      }
      return false;
    }
    const sortedData = React.useMemo(() => {
      const tempData = [...callbacks];

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
                                rowData={{...row, selected: row.id === clickedCallbackID}}
                                key={`callback${row.id}_${c.name}`}
                                callbackDropdown={callbackDropdown}
                            />;
                        case "Groups":
                            return <CallbacksTableStringCell
                                key={`callback${row.id}_${c.name}`}
                                cellData={row.mythictree_groups.join(", ")}
                                rowData={{...row, selected: row.id === clickedCallbackID}}
                            />;
                        case "IP":
                            return <CallbacksTableIPCell
                                key={`callback${row.id}_${c.name}`}
                                cellData={row.ip}
                                rowData={{...row, selected: row.id === clickedCallbackID}}
                                callback_id={row.id} />;
                        case "External IP":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.external_ip}
                                                             rowData={{...row, selected: row.id === clickedCallbackID}} />;
                        case "Host":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.host}
                                                             rowData={{...row, selected: row.id === clickedCallbackID}} />;
                        case "User":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.user}
                                                             rowData={{...row, selected: row.id === clickedCallbackID}} />;
                        case "Domain":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.domain}
                                                             rowData={{...row, selected: row.id === clickedCallbackID}} />;
                        case "OS":
                            return <CallbacksTableOSCell key={`callback${row.id}_${c.name}`}
                                                         rowData={{...row, selected: row.id === clickedCallbackID}}
                                                         cellData={row.os} />;
                        case "Arch":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`}
                                                             rowData={{...row, selected: row.id === clickedCallbackID}}
                                                             cellData={row.architecture} />;
                        case "PID":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.pid}
                                                             rowData={{...row, selected: row.id === clickedCallbackID}} />;
                        case "Last Checkin":
                            return <CallbacksTableLastCheckinCell key={`callback${row.id}_${c.name}`}
                                                                  rowData={{...row, selected: row.id === clickedCallbackID}}
                                                                  cellData={row.last_checkin} />;
                        case "Description":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.description}
                                                             rowData={{...row, selected: row.id === clickedCallbackID}} />;
                        case "Sleep":
                            return <CallbacksTableSleepCell key={`callback${row.id}_${c.name}`}
                                                            rowData={{...row, selected: row.id === clickedCallbackID}}
                                                            cellData={row.sleep_info} updateSleepInfo={updateSleepInfo} />;
                        case "Agent":
                            return <CallbacksTablePayloadTypeCell key={`callback${row.id}_${c.name}`}
                                                                  rowData={{...row, selected: row.id === clickedCallbackID}}
                                                                  cellData={row.payload.payloadtype.name}/>;
                        case "C2":
                            return <CallbacksTableC2Cell key={`callback${row.id}_c2`}
                                                         rowData={{...row, selected: row.id === clickedCallbackID}} />
                        case "Process Name":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`}
                                                             cellData={row.process_short_name}
                                                             rowData={{...row, selected: row.id === clickedCallbackID}} />;
                    }
                })];
            }
        }, [])
    }, [callbacks, sortData, filterOptions, columnVisibility, clickedCallbackID]);
    const onSubmitFilterOptions = (newFilterOptions) => {
      setFilterOptions(newFilterOptions);
      try{
          let options = JSON.stringify(newFilterOptions);
          localStorage.setItem("callbacks_table_filter_options", options);
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
                displayID: tabsToOpen[i].display_id});
        }
        onOpenTabs({tabs: newTabs});
        setOpenMultipleTabsDialog({open: false, tabType: "interact"});
    }
    if(props.loading){
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
    return (
        <div style={{width: '100%', height: '100%', position: "relative",}}>
            <MythicResizableGrid
                callbackTableGridRef={props.callbackTableGridRef}
                columns={columns}
                sortIndicatorIndex={sortColumn}
                sortDirection={sortData.sortDirection}
                items={sortedData}
                rowHeight={20}
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
            {openEditDescriptionDialog &&
                <MythicDialog
                    fullWidth={true}
                    open={openEditDescriptionDialog}
                    onClose={() => {setOpenEditDescriptionDialog(false);}}
                    innerDialog={
                        <MythicModifyStringDialog title={`Edit Callback ${updateDescriptionRef.current.callback_display_id} Description`}
                                                  onClose={() => {setOpenEditDescriptionDialog(false);}}
                                                  value={updateDescriptionRef.current.description}
                                                  onSubmit={editDescriptionSubmit}
                        />
                    }
                />
            }
            {openMetaDialog &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openMetaDialog}
                              onClose={()=>{setOpenMetaDialog(false);}}
                              innerDialog={<DetailedCallbackTable onClose={()=>{setOpenMetaDialog(false);}} callback_id={openMetaDialogRef.current} />}
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
                        menu={
                            callbackDropdownRef.current.options.map((option, index) => (
                                option.type === 'item' ? (
                                    <DropdownMenuItem
                                        key={option.name}
                                        disabled={option.disabled}
                                        onClick={(event) => handleMenuItemClick(event, option.click)}
                                    >
                                        {option.icon}{option.name}
                                    </DropdownMenuItem>
                                ) : option.type === 'menu' ? (
                                    <DropdownNestedMenuItem
                                        label={option.name}
                                        disabled={option.disabled}
                                        menu={
                                            option.menuItems.map((menuOption, indx) => (
                                                <DropdownMenuItem
                                                    key={menuOption.name}
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

            {openAdjustColumnsDialog &&
              <MythicDialog fullWidth={true} maxWidth="md" open={openAdjustColumnsDialog} 
                onClose={()=>{setOpenAdjustColumnsDialog(false);}} 
                innerDialog={
                  <MythicTransferListDialog onClose={()=>{setOpenAdjustColumnsDialog(false);}} 
                    onSubmit={onSubmitAdjustColumns} right={columnVisibility.visible} rightTitle="Show these columns"
                    leftTitle={"Hidden Columns"} left={columnVisibility.hidden} dialogTitle={"Edit which columns are shown"}/>}
              />
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
        </div>             
    )
}
export const CallbacksTable = React.memo(CallbacksTablePreMemo);
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
    if(h.name === "Groups"){
        return row.mythictree_groups.join(", ");
    }
    if(h.name === "IP"){
        try{
            return JSON.parse(row[h.key])[0];
        }catch(error){
            return row[h.key];
        }
    }
    if(h.name === "Agent"){
        return row.payload.payloadtype.name;
    }
    return row[h.key] || "";
};
function CallbacksTableMaterialReactTablePreMemo(props){
    const callbacks = useContext(CallbacksContext);
    const theme = useTheme();
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
    const [openHideMultipleDialog, setOpenHideMultipleDialog] = React.useState(false);
    const [openTaskMultipleDialog, setOpenTaskMultipleDialog] = React.useState({open: false, data: {}});
    const [openEditDescriptionDialog, setOpenEditDescriptionDialog] = React.useState(false);
    const [updateDescriptionMutation] = useMutation(updateDescriptionCallbackMutation, {
        update: (cache, {data}) => {
            if(data.updateCallback.status === "success"){
                snackActions.success("Updated Callback");
            }else{
                snackActions.warning(data.updateCallback.error);
            }

        },
        onError: data => {
            console.log(data);
            snackActions.warning(data);
        }
    });
    const updateDescriptionRef = React.useRef({payload_description: "", callback_display_id: 0, description: ""});
    const updateDescription = ({payload_description, callback_display_id, description}) => {
        updateDescriptionRef.current = {
            payload_description: payload_description,
            callback_display_id: callback_display_id,
            description: description
        };
        setOpenEditDescriptionDialog(true);
    }
    const editDescriptionSubmit = (description) => {
        setOpenEditDescriptionDialog(false);
        if(description === ""){
            updateDescriptionSubmit({
                description: updateDescriptionRef.current.payload_description,
                callback_display_id: updateDescriptionRef.current.callback_display_id
            });
        } else {
            updateDescriptionSubmit({
                description: description,
                callback_display_id: updateDescriptionRef.current.callback_display_id
            });
        }
    }
    const updateDescriptionSubmit = React.useCallback( ({callback_display_id, description}) => {
        updateDescriptionMutation({variables: {callback_display_id: callback_display_id, description}})
    }, []);
    const [openCallbackDropdown, setOpenCallbackDropdown] = React.useState(false);
    const callbackDropdownRef = React.useRef({options: [], callback: {}});

    const callbackDropdown = ({options, callback, dropdownAnchorRef}) => {
        callbackDropdownRef.current.options = options;
        callbackDropdownRef.current.callback = callback;
        callbackDropdownRef.current.dropdownAnchorRef = dropdownAnchorRef;
        setOpenCallbackDropdown(true);
    }
    const handleMenuItemClick = (event, index) => {
        callbackDropdownRef.current.options[index].click(event);
        setOpenCallbackDropdown(false);
    };
    const handleClose = (event) => {
        if (callbackDropdownRef.current.dropdownAnchorRef && callbackDropdownRef.current.dropdownAnchorRef.contains(event.target)) {
            return;
        }
        setOpenCallbackDropdown(false);
    };
    const [updateSleep] = useMutation(updateSleepInfoCallbackMutation, {
        update: (cache, {data}) => {
            snackActions.success("Updated Callback");

        },
        onError: data => {
            console.log(data);
            snackActions.warning(data);
        }
    });
    const updateSleepInfo = React.useCallback( ({callback_display_id, sleep_info}) => {
        updateSleep({variables: {callback_display_id: callback_display_id, sleep_info}})
    }, [])
    const columnFields = [
        {key: "id", type: 'number', name: "Interact", width: 150, disableCopy: true, enableHiding: false},
        {key: "mythictree_groups", type: 'array', name: "Groups", enableHiding: true},
        {key: "ip", type: 'ip', name: "IP", width: 150, enableHiding: true},
        {key: "external_ip",type: 'string', name: "External IP", width: 150, enableHiding: true},
        {key: "host", type: 'string', name: "Host", fillWidth: true, enableHiding: true},
        {key: "user", type: 'string', name: "User", fillWidth: true, enableHiding: true},
        {key: "domain", type: 'string', name: "Domain", fillWidth: true, enableHiding: true},
        {key: "os", type: 'string', name: "OS", width: 75, disableCopy: true, enableHiding: true},
        {key: "architecture", type: 'string', name: "Arch", width: 75, enableHiding: true},
        {key: "pid", type: 'number', name: "PID", width: 75, enableHiding: true},
        {key: "last_checkin", type: 'timestamp', name: "Last Checkin", width: 150, disableFilterMenu: true, disableCopy: true, enableHiding: true},
        {key: "description", type: 'string', name: "Description", width: 400, enableHiding: true},
        {key: "sleep", type: 'string', name: "Sleep", width: 75, disableSort: true, disableCopy: true, enableHiding: true},
        {key: "agent", type: 'string', name: "Agent", width: 100, disableSort: true, disableCopy: true, enableHiding: true},
        {key: "c2", type: 'string', name: "C2", width: 75, disableSort: true, disableFilterMenu: true, disableCopy: true, enableHiding: true},
        {key: "process_short_name", type: 'string', name: "Process Name", fillWidth: true, enableHiding: true},
    ];
    const initialColumnVisibility = useMythicSetting({setting_name: "callbacks_table_columns",
        output: "json",
        default_value: {
            id: true,
            host: true,
            domain:true,
            user:true,
            description:true,
            last_checkin: true,
            agent: true,
            ip: true,
            pid: true,
            architecture: false,
            sleep: false,
            process_short_name: false,
            external_ip: false,
            c2: true,
            os: false,
            mythictree_groups: false
        }});
    const initialColumnFilters = useMythicSetting({setting_name: "callbacks_table_filters",
        output: "json-array",
        default_value: []});
    const [columnVisibility, setColumnVisibility] = React.useState(initialColumnVisibility);
    const [columnFilters, setColumnFilters] = React.useState(initialColumnFilters);
    React.useEffect(  () => {
        SetMythicSetting({setting_name: "callbacks_table_columns",
            value: columnVisibility, output:"json"});
        SetMythicSetting({setting_name: "callbacks_table_filters",
            value: columnFilters, output: "json-array"});
    }, [columnVisibility, columnFilters]);
    const localCellRender = React.useCallback( ({cell, h}) => {
        let row = cell.row?.original;
        switch(h.name){
            case "Interact":
                return <CallbacksTableIDCell
                    rowData={row}
                    updateDescription={updateDescription}
                    editMythicTreeGroupsDialog={editMythicTreeGroupsDialog}
                    metaDialog={metaDialog}
                    callbackDropdown={callbackDropdown}
                    setOpenHideMultipleDialog={setOpenHideMultipleDialog}
                    setOpenTaskMultipleDialog={setOpenTaskMultipleDialog}
                />;
            case "Groups":
                return <CallbacksTableStringCell cellData={row.mythictree_groups.join(", ")} />;
            case "IP":
                return <CallbacksTableIPCell  cellData={row.ip} rowData={row} callback_id={row.id} />;
            case "External IP":
                return <CallbacksTableStringCell  cellData={row.external_ip} rowData={row} />;
            case "Host":
                return <CallbacksTableStringCell cellData={row.host} rowData={row} />;
            case "User":
                return <CallbacksTableStringCell  cellData={row.user} rowData={row} />;
            case "Domain":
                return <CallbacksTableStringCell  cellData={row.domain} rowData={row} />;
            case "OS":
                return <CallbacksTableOSCell rowData={row} cellData={row.os} />;
            case "Arch":
                return <CallbacksTableStringCell  rowData={row} cellData={row.architecture} />;
            case "PID":
                return <CallbacksTableStringCell  cellData={row.pid} rowData={row} />;
            case "Last Checkin":
                return <CallbacksTableLastCheckinCell  rowData={row} cellData={row.last_checkin} />;
            case "Description":
                return <CallbacksTableStringCell  cellData={row.description} rowData={row} />;
            case "Sleep":
                return <CallbacksTableSleepCell rowData={row} cellData={row.sleep_info} updateSleepInfo={updateSleepInfo} />;
            case "Agent":
                return <CallbacksTablePayloadTypeCell  rowData={row} cellData={row.payload.payloadtype.name}/>;
            case "C2":
                return <CallbacksTableC2Cell  rowData={row} />
            case "Process Name":
                return <CallbacksTableStringCell  cellData={row.process_short_name} rowData={row} />;
        }
    }, []);
    const columns = React.useMemo( () => columnFields.map( h => {
        return {
            accessorKey: h.key,
            header: h.key,
            size: h.width,
            id: h.key,
            enableClickToCopy: !h.disableCopy,
            filterVariant: h.type === 'number' || h.type === 'size' ? 'range' : 'text',
            enableResizing: true,
            enableHiding: h.enableHiding,
            enableSorting: !h.disableSort,
            enableColumnFilter: true,
            grow: h.fillWidth,
            accessorFn: (row) => accessorFn(row, h),
            Cell: ({cell}) => localCellRender({cell, h})
        }
    }), [columnFields])
    const materialReactTable = useMaterialReactTable({
        columns,
        data: callbacks,
        memoMode: "cell",
        layoutMode: "grid",
        autoResetPageIndex: false,
        enableFacetedValues: true,
        enablePagination: true,
        //enableRowVirtualization: true,
        //rowVirtualizerOptions: {overscan: 10},
        enableBottomToolbar: false,
        enableStickyHeader: true,
        enableDensityToggle: false,
        enableColumnResizing: true,
        enableRowPinning: true,
        positionPagination: "top",
        columnFilterDisplayMode: 'popover', //filter inputs will show in a popover (like excel)
        rowPinningDisplayMode: 'top-and-bottom',
        //enableColumnOrdering: true,
        //columnResizeMode: 'onEnd',
        initialState: {
            density: 'compact',
            columnVisibility,
            columnFilters
        },
        state: {columnVisibility, columnFilters},
        onColumnVisibilityChange: setColumnVisibility,
        onColumnFiltersChange: setColumnFilters,
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
                    {callbacks.length === 0 ? "No Data" : null}
                </Typography>
            </div>
        ),

    });
    return (
        <div style={{ width: '100%', height: '100%', position: "relative", display: "flex" }}>
            <MaterialReactTable table={materialReactTable} />
            {openEditDescriptionDialog &&
                <MythicDialog
                    fullWidth={true}
                    open={openEditDescriptionDialog}
                    onClose={() => {setOpenEditDescriptionDialog(false);}}
                    innerDialog={
                        <MythicModifyStringDialog title={`Edit Callback ${updateDescriptionRef.current.callback_display_id} Description`}
                                                  onClose={() => {setOpenEditDescriptionDialog(false);}}
                                                  value={updateDescriptionRef.current.description}
                                                  onSubmit={editDescriptionSubmit}
                        />
                    }
                />
            }
            {openMetaDialog &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openMetaDialog}
                              onClose={()=>{setOpenMetaDialog(false);}}
                              innerDialog={<DetailedCallbackTable onClose={()=>{setOpenMetaDialog(false);}} callback_id={openMetaDialogRef.current} />}
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
            <Popper open={openCallbackDropdown} anchorEl={callbackDropdownRef.current.dropdownAnchorRef} role={undefined} transition style={{zIndex: 200}}>
                {({ TransitionProps, placement }) => (
                    <Grow
                        {...TransitionProps}
                        style={{
                            transformOrigin: placement === 'bottom' ? 'top left' : 'top center',
                        }}
                    >
                        <Paper className={"dropdownMenuColored"} elevation={5}>
                            <ClickAwayListener onClickAway={handleClose} mouseEvent={"onMouseDown"}>
                                <MenuList id="split-button-menu">
                                    <MenuItem disabled={true}>
                                        Callback: {callbackDropdownRef.current.callback.display_id}
                                    </MenuItem>

                                    {callbackDropdownRef.current.options.map((option, index) => (
                                        <MenuItem
                                            key={option.name}
                                            onClick={(event) => handleMenuItemClick(event, index)}
                                        >
                                            {option.icon}{option.name}
                                        </MenuItem>
                                    ))}
                                </MenuList>
                            </ClickAwayListener>
                        </Paper>
                    </Grow>
                )}
            </Popper>
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
        </div>

    )
}
export const CallbacksTableMaterialReactTable = React.memo(CallbacksTableMaterialReactTablePreMemo)