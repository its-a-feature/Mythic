import React, { useEffect } from 'react';
import { useMutation, useLazyQuery, gql } from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {
    MythicDialog,
    MythicModifyStringDialog,
    MythicViewJSONAsTableDialog,
} from '../../MythicComponents/MythicDialog';
import {faFolder} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorIcon from '@mui/icons-material/Error';
import { useTheme } from '@mui/material/styles';
import { IconButton } from '@mui/material';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import EditIcon from '@mui/icons-material/Edit';
import { DownloadHistoryDialog } from './DownloadHistoryDialog';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ListIcon from '@mui/icons-material/List';
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import 'react-virtualized/styles.css';
import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import MythicResizableGrid from '../../MythicComponents/MythicResizableGrid';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import {TagsDisplay, ViewEditTags} from '../../MythicComponents/MythicTag';
import SettingsIcon from '@mui/icons-material/Settings';
import { toLocalTime } from '../../utilities/Time';
import {b64DecodeUnicode} from "./ResponseDisplay";
import {faPhotoVideo} from '@fortawesome/free-solid-svg-icons';
import {PreviewFileMediaDialog} from "../../MythicComponents/PreviewFileMedia";
import RefreshIcon from '@mui/icons-material/Refresh';
import {Dropdown, DropdownMenuItem, DropdownNestedMenuItem} from "../../MythicComponents/MythicNestedMenus";
import {RenderSingleTask} from "../SingleTaskView/SingleTaskView";
import {
    GetComputedFontSize,
    GetMythicSetting,
    useSetMythicSetting
} from "../../MythicComponents/MythicSavedUserSetting";
import {CallbacksTableColumnsReorderDialog} from "./CallbacksTableColumnsReorderDialog";
import {
    GridColumnFilterDialog,
    getUpdatedGridFilterOptions,
    gridValuePassesFilter,
    isGridColumnFilterActive
} from "../../MythicComponents/MythicResizableGrid/GridColumnFilterDialog";

const getFileDownloadHistory = gql`
    query getFileDownloadHistory($full_path_text: String!, $host: String!, $group: [String!]) {
        mythictree(where: {tree_type: {_eq: "file"}, full_path_text: {_eq: $full_path_text}, host: {_eq: $host}, callback: {mythictree_groups: {_contains: $group}}}) {
            filemeta {
                id
                comment
                agent_file_id
                chunks_received
                complete
                total_chunks
                timestamp
                filename_text
                host
                deleted
                full_remote_path_text
                task {
                    id
                    display_id
                    comment
                    callback {
                        display_id
                        id
                    }
                }
            }
        }
    }
`;
const updateFileComment = gql`
    mutation updateCommentMutation($mythictree_id: Int!, $comment: String!) {
        update_mythictree_by_pk(pk_columns: { id: $mythictree_id }, _set: { comment: $comment }) {
            comment
            id
        }
    }
`;

const defaultVisibleColumns = ["Info", "Name", "Size", "Last Modify"];
const columnDefaults = [
    { name: 'Info', width: 65, disableDoubleClick: true, disableSort: true, disableFilterMenu: true, key: "info", visible: true },
    { name: 'Name', type: 'string', key: 'name_text', fillWidth: true, visible: true },
    { name: "Size", type: "size", key: "size", inMetadata: true, width: 100, visible: true},
    { name: "Last Modify", type: "date", key: "modify_time", inMetadata: true, width: 250, visible: true},
    { name: 'Tags', type: 'tags', disableSort: true, disableFilterMenu: true, width: 220, key: "tags", visible: false },
    { name: 'Comment', type: 'string', key: 'comment', width: 200, visible: false },
];
export const CallbacksTabsFileBrowserTable = (props) => {
    const [updateSetting] = useSetMythicSetting();
    const [loading, setLoading] = React.useState(true);
    const [allData, setAllData] = React.useState([]);
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [filterOptions, setFilterOptions] = React.useState({});
    const [selectedColumn, setSelectedColumn] = React.useState({});
    const [sortData, setSortData] = React.useState({"sortKey": null, "sortDirection": null, "sortType": null})
    const [columnVisibility, setColumnVisibility] = React.useState({
        "visible": defaultVisibleColumns,
        "hidden": ["Tags", "Comment"]
    });
    const [openReorderDialog, setOpenReorderDialog] = React.useState(false);
    const [columnOrder, setColumnOrder] = React.useState(columnDefaults);
    const [selectedRows, setSelectedRows] = React.useState([]);
    const columns = React.useMemo(
        () =>
            columnOrder.reduce( (prev, cur) => {
                if(columnVisibility.visible.includes(cur.name)){
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
    const sortedData = React.useMemo(() => {
        if (sortData.sortKey === null || sortData.sortType === null) {
            return allData;
        }
        const tempData = [...allData];
        if (sortData.sortType === 'number' || sortData.sortType === 'size' || sortData.sortType === 'date') {
            tempData.sort((a, b) => {
                if(sortData.inMetadata){
                    try {
                        if(props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a]?.metadata[sortData.sortKey] ===
                            props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b]?.metadata[sortData.sortKey]){
                            return 0;
                        }
                        if (props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a]?.metadata[sortData.sortKey] === null ||
                            props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a]?.metadata[sortData.sortKey] === undefined) {
                            return -1;
                        }
                        if (props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b]?.metadata[sortData.sortKey] === null ||
                            props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b]?.metadata[sortData.sortKey] === undefined) {
                            return 1;
                        }
                        return parseInt(props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a]?.metadata[sortData.sortKey]) >
                        parseInt(props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b]?.metadata[sortData.sortKey]) ? 1 : -1;
                    }catch(error) {
                        console.log("failed to parse data for sorting", error);
                        return props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a]?.metadata[sortData.sortKey] >
                        props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b]?.metadata[sortData.sortKey] ? 1 : -1
                    }
                } else {
                    try {
                        if(props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a][sortData.sortKey] ===
                            props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b][sortData.sortKey]){
                            return 0;
                        }
                        if (props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a][sortData.sortKey] === null ||
                            props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a][sortData.sortKey] === undefined) {
                            return -1;
                        }
                        if (props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b][sortData.sortKey] === null ||
                            props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b][sortData.sortKey] === undefined) {
                            return 1;
                        }
                        return parseInt(props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a][sortData.sortKey]) > parseInt(props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b][sortData.sortKey]) ? 1 : -1;
                    } catch (error) {
                        console.log("failed to parse data for sorting", error);
                        return props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a][sortData.sortKey] > props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b][sortData.sortKey] ? 1 : -1;
                    }
                }

            })
        } else if (sortData.sortType === 'string') {
            tempData.sort((a, b) => {
                try{
                    if(props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a][sortData.sortKey] ===
                        props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b][sortData.sortKey]){
                        return 0;
                    }
                    if (props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a][sortData.sortKey] === null ||
                        props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a][sortData.sortKey] === undefined) {
                        return -1;
                    }
                    if (props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b][sortData.sortKey] === null ||
                        props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b][sortData.sortKey] === undefined) {
                        return 1;
                    }
                    return props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a][sortData.sortKey].localeCompare(props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b][sortData.sortKey]);
                }catch(error){
                    console.log("failed to parse data for sorting", error);
                    return props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][a][sortData.sortKey] > props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][b][sortData.sortKey] ? 1 : -1
                }

            });
        }
        if (sortData.sortDirection === 'DESC') {
            tempData.reverse();
        }
        return tempData;
    }, [allData, sortData]);
    const onSubmitFilterOptions = (value) => {
        const nextFilterOptions = getUpdatedGridFilterOptions(filterOptions, selectedColumn.key, value);
        setFilterOptions(nextFilterOptions);
        try{
            updateSetting({setting_name: `file_browser_filter_options`, value: nextFilterOptions});
        }catch(error){
            console.log("failed to save filter options");
        }
    }
    const filterRow = (row) => {
        if(props.treeRootData[props.selectedFolderData.group] === undefined ||
            props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host] === undefined ||
            props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row] === undefined) {
            return true;
        }
        if(!props.showDeletedFiles && props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]?.deleted){
            return true;
        }
        for(const [key,value] of Object.entries(filterOptions)){
            if(!gridValuePassesFilter(props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row][key], value)){
                return true;
            }
        }
        return false;
    }
    const gridData = React.useMemo(
        () =>
            // row is just the name
            sortedData.reduce((prev, row) => {
                if(filterRow(row)){
                    return [...prev];
                }else{
                    return [...prev, columns.map( c => {
                        switch(c.name){
                            case "Info":
                                return  <FileBrowserTableRowActionCell 
                                            treeRootData={props.treeRootData[props.selectedFolderData.group]}
                                            selectedFolderData={props.selectedFolderData} 
                                            rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]}
                                            cellData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]?.name_text}
                                            me={props.me}
                                            tabInfo={props.tabInfo}
                                            onTaskRowAction={props.onTaskRowAction} />;
                            case "Name":
                                return <FileBrowserTableRowNameCell 
                                            treeRootData={props.treeRootData[props.selectedFolderData.group]}
                                            selectedFolderData={props.selectedFolderData} 
                                            cellData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]?.name_text}
                                            rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]} />;
                            case "Size":
                                return <TableRowSizeCell cellData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]?.metadata?.size}
                                                         rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row] }/>
                            case "Tags":
                                return <FileBrowserTagsCell 
                                            rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]}
                                            treeRootData={props.treeRootData[props.selectedFolderData.group]}
                                            cellData={row}
                                            selectedFolderData={props.selectedFolderData} 
                                            me={props.me} />
                            case "Last Modify":
                                return <TableRowDateCell cellData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]?.metadata?.modify_time}
                                                         rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]}
                                                         view_utc_time={props.me?.user?.view_utc_time} />
                            case "Comment":
                                return <FileBrowserTableRowStringCell cellData={row.comment} rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]} />
                        }
                    })];
                }
                
        }, []),
        [sortedData, props.onTaskRowAction, filterOptions, columnVisibility, props.showDeletedFiles]
    );
    const getDisplayFormat = () => {
        if(sortedData.length === 0 && props?.selectedFolderData?.success === false){
            return "showTask";
        }else if(sortedData.length > 0 || props?.selectedFolderData?.success){
            return "normal";
        } else if(sortedData.length === 0 && props?.selectedFolderData?.has_children && props?.selectedFolderData?.success === null){
            return "fetchLocal";
        }else if(sortedData.length === 0 && !props?.selectedFolderData?.has_children && props?.selectedFolderData?.success === null) {
            return "fetchRemote";
        }else if(sortedData.length === 0){
            return "fetchRemote";
        } else {
            return "normal";
        }
    }
    const displayFormat = getDisplayFormat();
    useEffect(() => {
        // when the folder changes, we need to aggregate all of the entries
        //console.log(props.selectedFolderData, props.treeAdjMatrix, props.treeRootData)
        let desiredPath = props.selectedFolderData.full_path_text;
        if(props.selectedFolderData.id === props.selectedFolderData.host){
            desiredPath = "";
        }
        let newAllData = Object.keys(props.treeAdjMatrix[props.selectedFolderData.group]?.[props.selectedFolderData.host]?.[desiredPath] || {});
        setAllData(newAllData);
        //console.log("just set all data")
    }, [props.selectedFolderData, props.treeAdjMatrix]);
    const onRowDoubleClick = (e, rowIndex, rowData) => {
        if (!rowData.can_have_children) {
            return;
        }
        snackActions.info('Fetching contents from database...');
        props.onRowDoubleClick({...rowData, group: props.selectedFolderData.group});
        setSortData({"sortKey": null, "sortType":null, "sortDirection": "ASC"});
    };
    const onClickHeader = (e, columnIndex) => {
        const column = columns[columnIndex];
        if(column.disableSort){
            return;
        }
        if (!column.key) {
            setSortData({"sortKey": null, "sortType":null, "sortDirection": "ASC", "inMetadata": false});
        }
        if (sortData.sortKey === column.key) {
            if (sortData.sortDirection === 'ASC') {
                setSortData({...sortData, "sortDirection": "DESC"});
            } else {
                setSortData({"sortKey": null, "sortType":null, "sortDirection": "ASC", "inMetadata": false});
            }
        } else {
            setSortData({"sortKey": column.key, "inMetadata": column.inMetadata, "sortType":column.type, "sortDirection": "ASC"});
        }
    };
    const contextMenuOptions = [
        {
            name: 'Filter Column', type: "item", icon: null,
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
            }
        },
        {
            name: "Reorder Columns and Adjust Visibility",type: "item", icon: null,
            click: ({event, columnIndex}) => {
                if(event){
                    event.stopPropagation();
                    event.preventDefault();
                }
                setOpenReorderDialog(true);
            }
        }
    ];
    React.useEffect( () => {
        try {
            const storageItem = GetMythicSetting({setting_name: `file_browser_table_columns`, default_value: defaultVisibleColumns});
            if(storageItem !== null){
                let allColumns = [...columnVisibility["visible"].map(c => c), ...columnVisibility["hidden"].map(c => c)];
                let newHidden = [];
                allColumns.forEach((v,i,a) => {
                    if(!storageItem.includes(v)){
                        newHidden.push(v);
                    }
                });
                if(storageItem.length !== 0){
                    setColumnVisibility({visible: storageItem, hidden: newHidden});
                }
            }
        }catch(error){
            console.log("Failed to load custom browser_table_columns", error);
        }
        try {
            const storageItemOptions = GetMythicSetting({setting_name: `file_browser_filter_options`, default_value: {}});
            if(storageItemOptions !== null){
                setFilterOptions(storageItemOptions);
            }
        }catch(error){
            console.log("Failed to load custom browser_table_filter_options", error);
        }
        try {
            const storageColumnOrder = GetMythicSetting({setting_name: `file_browser_column_order`, default_value: columns.map(c => c.name)});
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
                setColumnOrder(newOrder);
            }
        }catch(error){
            console.log("Failed to load file_browser_table_filter_options", error);
        }
        setLoading(false);
    }, []);
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
        if(newVisible.length === 0){
            snackActions.error("Can't update to show no fields");
            return;
        }
        console.log("newOrder", newOrder)
        updateSetting({setting_name: `file_browser_column_order`, value: newOrder.map(c => c.name)});
        setColumnOrder(newOrder);
        setColumnVisibility({visible: newVisible, hidden: newHidden});
        updateSetting({setting_name: `file_browser_table_columns`, value: newVisible});
        setOpenReorderDialog(false);
    }
    const onResetColumnReorder = () => {
        onSubmitColumnReorder(columnDefaults);
    }
    const sortColumn = columns.findIndex((column) => column.key === sortData.sortKey);
    const onRowClick = ({event, rowDataStatic}) => {
        if(event.ctrlKey || event.metaKey){
            if(props.treeRootData?.[props.selectedFolderData.group]?.[rowDataStatic.host]?.[rowDataStatic.full_path_text]){
                props.treeRootData[props.selectedFolderData.group][rowDataStatic.host][rowDataStatic.full_path_text].selected = true;
            }

            setSelectedRows([...selectedRows, rowDataStatic]);
        } else {
            if(props.treeRootData?.[props.selectedFolderData.group]?.[rowDataStatic.host]?.[rowDataStatic.full_path_text]){
                props.treeRootData[props.selectedFolderData.group][rowDataStatic.host][rowDataStatic.full_path_text].selected = true;
            }
            for(let i = 0; i < selectedRows.length; i++){
                if(props.treeRootData?.[props.selectedFolderData.group]?.[selectedRows[i].host]?.[selectedRows[i].full_path_text]){
                    props.treeRootData[props.selectedFolderData.group][selectedRows[i].host][selectedRows[i].full_path_text].selected = false;
                }
            }
            setSelectedRows([rowDataStatic]);
        }
    }
    const optionsA = (element) => [
        {
            name: element?.name_text, icon: null, click: ({event}) => {},
            type: "item", disabled: true
        },
        {
            name: "Copy to Clipboard", icon: null, click: () => {}, type: "menu",
            menuItems: [
                {
                    name: 'Name', type: "item",
                    icon: <FileCopyOutlinedIcon style={{ paddingRight: '5px' }} />,
                    click: ({event}) => {
                        event.stopPropagation();
                        if(copyStringToClipboard(element.name_text)){
                            snackActions.success("Copied to clipboard");
                        }
                    },
                },
                {
                    name: 'Full Path', type: "item",
                    icon: <FileCopyOutlinedIcon style={{ paddingRight: '5px' }} />,
                    click: ({event}) => {
                        event.stopPropagation();
                        if(copyStringToClipboard(element.full_path_text)){
                            snackActions.success("Copied to clipboard");
                        }
                    },
                },
                {
                    name: 'Metadata', type: "item",
                    icon: <FileCopyOutlinedIcon style={{ paddingRight: '5px' }} />,
                    click: ({event}) => {
                        event.stopPropagation();
                        if(copyStringToClipboard(JSON.stringify(element?.metadata?.permissions, null, 2))){
                            snackActions.success("Copied to clipboard");
                        }
                    },
                },
            ]
        },
    ]
    async function optionsB (callback_id, callback_display_id, element) {
        let downloadCommand = await props.getLoadedCommandForUIFeature(callback_id, element.can_have_children ?  props.baseUIFeature + ":download_folder" : props.baseUIFeature + ":download");
        let downloadDisplay = "Download (Unsupported)";
        if(element.can_have_children){
            downloadDisplay = "Download Folder (Unsupported)";
        }
        if(downloadCommand !== undefined){
            downloadDisplay = `Download (${downloadCommand.command.cmd})`;
            if(element.can_have_children){
                downloadDisplay = `Download Folder (${downloadCommand.command.cmd})`;
            }
        }
        let listCommand = await props.getLoadedCommandForUIFeature(callback_id, props.baseUIFeature + ":list");
        let listDisplay = "List (Unsupported)";
        if(listCommand !== undefined){
            listDisplay = `List (${listCommand.command.cmd})`;
        }
        let removeCommand = await props.getLoadedCommandForUIFeature(callback_id, element.can_have_children ?  props.baseUIFeature + ":remove_folder" : props.baseUIFeature + ":remove");
        let removeDisplay = "Remove (Unsupported)";
        if( element.can_have_children) {
            removeDisplay = "Remove Folder (Unsupported)"
        }
        if(removeCommand !== undefined){
            removeDisplay = `Remove (${removeCommand.command.cmd})`;
            if(element.can_have_children){
                removeDisplay = `Remove Folder (${removeCommand.command.cmd})`;
            }
        }
        return [
            {
                name: downloadDisplay, type: "item",
                disabled: downloadCommand === undefined,
                icon: <GetAppIcon color="success" style={{ paddingRight: '5px' }} />,
                click: ({event}) => {
                    event.stopPropagation();
                    props.onTaskRowAction({
                        path: element.parent_path_text,
                        full_path: element.full_path_text,
                        host: element.host,
                        filename: element.name_text,
                        uifeature: element.can_have_children ? props.baseUIFeature + ':download_folder' : props.baseUIFeature + ':download',
                        callback_id, callback_display_id
                    });
                },
            },
            {
                name: listDisplay, type: "item", disabled: listCommand === undefined,
                icon: <ListIcon color="warning" style={{ paddingRight: '5px'}} />,
                click: ({event}) => {
                    event.stopPropagation();
                    props.onTaskRowAction({
                        path: element.parent_path_text,
                        full_path: element.full_path_text,
                        host: element.host,
                        filename: element.name_text,
                        uifeature: props.baseUIFeature + ':list',
                        callback_id, callback_display_id
                    });
                },
            },
            {
                name: removeDisplay, type: "item", disabled: removeCommand === undefined,
                danger: true,
                icon: <DeleteIcon style={{ paddingRight: '5px' }} />,
                click: ({event}) => {
                    event.stopPropagation();
                    props.onTaskRowAction({
                        path: element.parent_path_text,
                        full_path: element.full_path_text,
                        host: element.host,
                        filename: element.name_text,
                        uifeature: element.can_have_children ? props.baseUIFeature + ':remove_folder' : props.baseUIFeature + ':remove',
                        getConfirmation: true,
                        callback_id, callback_display_id
                    });
                },
            },
        ];
    }

    async function onRowContextClick({rowDataStatic}) {
        // based on row, return updated options array?
        if(selectedRows.length > 1){
            return [
                {
                    name: `Download All Selected`, type: "item",
                    icon: <GetAppIcon color="success" style={{ paddingRight: '5px' }} />,
                    click: ({event}) => {
                        event.stopPropagation();
                        let newTasks = [];
                        for(let i = 0; i < selectedRows.length; i++){
                            newTasks.push({
                                path: selectedRows[i].parent_path_text,
                                full_path: selectedRows[i].full_path_text,
                                host: selectedRows[i].host,
                                filename: selectedRows[i].name_text,
                                uifeature: selectedRows[i].can_have_children ? props.baseUIFeature + ':download_folder': props.baseUIFeature + ':download',
                                callback_id: props.tabInfo.callbackID,
                                callback_display_id: props.tabInfo.displayID
                            });
                        }
                        props.onTaskRowActions(newTasks);
                    },
                },
                {
                    name: `Remove All Selected`, type: "item",
                    danger: true,
                    icon: <DeleteIcon style={{ paddingRight: '5px' }} />,
                    click: ({event}) => {
                        event.stopPropagation();
                        let newTasks = [];
                        for(let i = 0; i < selectedRows.length; i++){
                            newTasks.push({
                                path: selectedRows[i].parent_path_text,
                                full_path: selectedRows[i].full_path_text,
                                host: selectedRows[i].host,
                                filename: selectedRows[i].name_text,
                                uifeature: props.baseUIFeature + ':remove',
                                getConfirmation: true,
                                callback_id: props.tabInfo.callbackID,
                                callback_display_id: props.tabInfo.displayID
                            });
                        }
                        props.onTaskRowActions(newTasks);
                    },
                },
                {
                    name: `List All Selected`, type: "item",
                    icon: <ListIcon color="warning" style={{ paddingRight: '5px' }} />,
                    click: ({event}) => {
                        event.stopPropagation();
                        let newTasks = [];
                        for(let i = 0; i < selectedRows.length; i++){
                            newTasks.push({
                                path: selectedRows[i].parent_path_text,
                                full_path: selectedRows[i].full_path_text,
                                host: selectedRows[i].host,
                                filename: selectedRows[i].name_text,
                                uifeature: props.baseUIFeature + ':list',
                                callback_id: props.tabInfo.callbackID,
                                callback_display_id: props.tabInfo.displayID
                            });
                        }
                        props.onTaskRowActions(newTasks);
                    },
                },
            ]
        }
        let options = [...optionsA(rowDataStatic)];
        options.push(...(await optionsB(props.tabInfo.callbackID, props.tabInfo.displayID, rowDataStatic)));
        if(rowDataStatic.callback.display_id !== props.tabInfo.displayID){
            options.push({
                name: `Original Callback: ${rowDataStatic.callback.display_id}`, icon: null, click: () => {}, type: "menu",
                menuItems: [
                    ...(await optionsB(rowDataStatic.callback.id, rowDataStatic.callback.display_id, rowDataStatic))
                ]
            })
        }
        return options;
    }
    if(loading){
        return (
            <div style={{width: '100%', height: '100%', position: "relative",}}>
                <div style={{overflowY: "hidden", flexGrow: 1}}>
                    <div style={{
                        position: "absolute",
                        left: "35%",
                        top: "40%"
                    }}>
                        {"Loading Saved Browser Customizations..."}
                    </div>
                </div>
            </div>
        )
    }
    return (
        <div style={{width: '100%', height: '100%', overflow: "hidden", position: "relative"}}>
            {displayFormat === "normal" &&
                <MythicResizableGrid
                    columns={columns}
                    sortIndicatorIndex={sortColumn}
                    sortDirection={sortData.sortDirection}
                    items={gridData}
                    rowHeight={GetComputedFontSize() + 7}
                    onClickHeader={onClickHeader}
                    onDoubleClickRow={onRowDoubleClick}
                    contextMenuOptions={contextMenuOptions}
                    onRowContextMenuClick={onRowContextClick}
                    onRowClick={onRowClick}
                />
            }
            {displayFormat === "normal" && props?.selectedFolderData?.success === null &&
                <div style={{overflowY: "hidden", flexGrow: 1}}>
                    <div style={{
                        position: "absolute",
                        left: "35%",
                        top: "40%",
                        borderRadius: "4px",
                        border: "1px solid black",
                        padding: "5px",
                        backgroundColor: "rgba(37,37,37,0.92)", color: "white",
                    }}>
                        {"Only PARTIAL data has been collected for this path.  "}<br/>
                        {"Task this callback to list the contents"}
                        <IconButton style={{margin: 0, padding: 0, marginRight: "10px"}}
                                    onClick={props.onListFilesButtonFromTableWithNoEntries}>
                            <RefreshIcon color={"info"} fontSize={"large"}
                                         style={{display: "inline-block",}}/>
                        </IconButton>
                    </div>
                </div>
            }
            {displayFormat === "fetchLocal" &&
                <div style={{overflowY: "hidden", flexGrow: 1}}>
                    <div style={{
                        position: "absolute",
                        left: "35%",
                        top: "40%",
                        borderRadius: "4px",
                        border: "1px solid black",
                        padding: "5px",
                        backgroundColor: "rgba(37,37,37,0.92)", color: "white",
                    }}>
                        {"Some data exists for this path, but isn't loaded into the UI.  "}
                        <br/>
                        {"Click the folder icon to fetch data from the database."}
                    </div>
                </div>
            }
            {displayFormat === "fetchRemote" &&
                <div style={{overflowY: "hidden", flexGrow: 1}}>
                    <div style={{
                        position: "absolute",
                        left: "35%",
                        top: "40%",
                        borderRadius: "4px",
                        border: "1px solid black",
                        padding: "5px",
                        backgroundColor: "rgba(37,37,37,0.92)", color: "white",
                    }}>
                        {"No data has been collected for this path.  "}
                        <div style={{display: "flex", alignItems: "center"}}>
                            {"Task this callback to list the contents"}
                            <IconButton style={{margin: 0, padding: 0, marginRight: "10px"}} onClick={props.onListFilesButtonFromTableWithNoEntries} >
                                <RefreshIcon color={"info"} fontSize={"large"}
                                             style={{ display: "inline-block",}} />
                            </IconButton>
                        </div>
                    </div>
                </div>
            }
            {displayFormat === "showTask" && props.selectedFolderData?.task_id > 0 &&
                <RenderSingleTask task_id={props.selectedFolderData?.task_id} />
            }
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
            {openReorderDialog &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={openReorderDialog}
                              onClose={()=>{setOpenReorderDialog(false);}}
                              innerDialog={
                                  <CallbacksTableColumnsReorderDialog
                                      onClose={()=>{setOpenReorderDialog(false);}}
                                      visible={columnVisibility.visible}
                                      hidden={columnVisibility.hidden}
                                      onReset={onResetColumnReorder}
                                      onSubmit={onSubmitColumnReorder}
                                      initialItems={columnOrder}
                                  />}
                />
            }
        </div>
    );
};
const FileBrowserTableRowNameCell = ({cellData,  rowData, treeRootData, selectedFolderData }) => {
    const theme = useTheme();

    return (
        <div style={{ alignItems: 'center', display: 'flex', maxHeight: "100%", textDecoration: treeRootData[selectedFolderData.host][rowData.full_path_text]?.deleted ? 'line-through' : '' }}>
            {!treeRootData[selectedFolderData.host][rowData.full_path_text]?.can_have_children ? (
                <DescriptionIcon size={"small"} style={{
                    marginRight: '5px' }} />
            ) : (
                <FontAwesomeIcon 
                    icon={faFolder}
                    size={"1x"}
                    style={{
                        marginRight: '8px',
                        marginLeft: "4px",
                        color:
                        treeRootData[selectedFolderData.host][rowData.full_path_text]?.success || treeRootData[selectedFolderData.host][rowData.full_path_text]?.has_children
                                ? theme.folderColor
                                : 'grey',
                    }}
                />
            )}
            <pre 
                style={{
                    color:
                    treeRootData[selectedFolderData.host][rowData.full_path_text]?.success !== null
                            ? theme.palette.text.primary
                            : theme.palette.text.secondary,
                }}>
                {cellData}
            </pre>
            {treeRootData[selectedFolderData.host][rowData.full_path_text]?.success === true ? (
                <MythicStyledTooltip title='Successfully listed contents of folder' tooltipStyle={{display: "inline-flex", marginLeft: "5px"}}>
                    <CheckCircleOutlineIcon color="success" fontSize='small' />
                </MythicStyledTooltip>
            ) : treeRootData[selectedFolderData.host][rowData.full_path_text]?.success === false ? (
                <MythicStyledTooltip title='Failed to list contents of folder' tooltipStyle={{display: "inline-flex", marginLeft: "5px"}}>
                    <ErrorIcon fontSize='small' color="error" />
                </MythicStyledTooltip>
            ) : null}
        </div>
    );
};
const FileBrowserTagsCell = ({rowData, cellData, treeRootData, selectedFolderData, me}) => {
    return (
        <>
            <ViewEditTags target_object={"mythictree_id"} target_object_id={treeRootData[selectedFolderData.host][cellData]?.id} me={me} />
            <TagsDisplay tags={treeRootData[selectedFolderData.host][cellData]?.tags} />
        </>
    )
}
const FileBrowserTableRowStringCell = ({ cellData }) => {
    return (
        <>
        {cellData}
        </>
    )
};
export const TableRowDateCell = ({ cellData, rowData, view_utc_time }) => {
    
    try{
        let cellDataInt = parseInt(cellData)
        if(cellData === "" || cellData === undefined || cellDataInt <= 0){
            return "";
        }
        let view_utc = true;
        if(view_utc_time !== undefined){
            view_utc = view_utc_time
        }
        // handle Unix epoch timestamps
        if (view_utc) {
            let init_date = new Date(cellDataInt);
            return init_date.toDateString() + " " + init_date.toTimeString().substring(0, 8) + " UTC";
        } else {
            let timezoneDate = new Date(cellDataInt);
            timezoneDate.setTime(timezoneDate.getTime() - (timezoneDate.getTimezoneOffset() *60*1000));
            return timezoneDate.toLocaleDateString() + " " + timezoneDate.toLocaleString([], {hour12: true, hour: "2-digit", minute: "2-digit"});
        }
        //const dateData = new Date(cellDataInt).toISOString();
        //return toLocalTime(dateData.slice(0, 10) + " " + dateData.slice(11,-1), view_utc_time);
    }catch(error){
        try{
            let cellDataInt = parseInt(cellData)
            // handle windows FILETIME values
            const dateData = new Date( ((cellDataInt / 10000000) - 11644473600) * 1000).toISOString();
            return toLocalTime(dateData.slice(0, 10) + " " + dateData.slice(11,-1), view_utc_time);
        }catch(error2){
            console.log("error with timestamp: ", cellData);
            return String(cellData);
        }
        
    }
    
};
export const TableRowSizeCell = ({ cellData, rowData }) => {
    const getStringSize = () => {
        try {
            // process for getting human readable string from bytes: https://stackoverflow.com/a/18650828
            let bytes = parseInt(cellData);
            if (cellData === '' || cellData === undefined) return '';
            if (bytes === 0) return '0 B';
            const decimals = 2;
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        } catch (error) {
            return cellData;
        }
    };
    return getStringSize(cellData);
};
const FileBrowserTableRowActionCell = ({ rowData, cellData, onTaskRowAction, treeRootData, selectedFolderData, me, tabInfo, getLoadedCommandForUIFeature }) => {
    const dropdownAnchorRef = React.useRef(null);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [fileCommentDialogOpen, setFileCommentDialogOpen] = React.useState(false);
    const [viewPermissionsDialogOpen, setViewPermissionsDialogOpen] = React.useState(false);
    const [fileHistoryDialogOpen, setFileHistoryDialogOpen] = React.useState(false);
    const [permissionData, setPermissionData] = React.useState('');
    const [downloadHistory, setDownloadHistory] = React.useState([]);
    const [openPreviewMediaDialog, setOpenPreviewMediaDialog] = React.useState(false);
    const [getHistory] = useLazyQuery(getFileDownloadHistory, {
        onCompleted: (data) => {
            if (data.mythictree.length === 0) {
                snackActions.warning('No download history recorded');
            } else {
                let files = [];
                for(let i = 0; i < data.mythictree.length; i++){
                    files.push(...data.mythictree[i].filemeta);
                }
                if(files.length === 0){
                    snackActions.warning('No download history recorded');
                    return;
                }
                files = files.map(f => {
                    return {...f, filename_text: b64DecodeUnicode(f.filename_text),
                        full_remote_path_text: b64DecodeUnicode(f.full_remote_path_text)}
                });
                files.sort((a, b) => a.id < b.id ? 1 : -1)
                setDownloadHistory(files);
                setFileHistoryDialogOpen(true);
            }
        },
        fetchPolicy: 'network-only',
    });
    const [updateComment] = useMutation(updateFileComment, {
        onCompleted: (data) => {
            snackActions.success('updated comment');
        },
    });
    const onSubmitUpdatedComment = (comment) => {
        updateComment({ variables: { mythictree_id: treeRootData[selectedFolderData.host][cellData].id, comment: comment } });
    };
    const handleMenuItemClick = (event, click) => {
        click({event});
        setDropdownOpen(false);
    };
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
            return;
        }
        setDropdownOpen(false);
    };
    const optionsA = [
        {
            name: treeRootData[selectedFolderData.host][rowData.full_path_text]?.name_text, icon: null, click: ({event}) => {},
            type: "item", disabled: true
        },
        {
            name: 'View Permissions', type: "item",
            icon: <VisibilityIcon style={{ paddingRight: '5px' }} />,
            click: ({event}) => {
                event.stopPropagation();
                setPermissionData(treeRootData[selectedFolderData.host][rowData.full_path_text].metadata);
                setViewPermissionsDialogOpen(true);
            },
        },
        {
            name: 'Download History', type: "item",
            icon: <HistoryIcon style={{ paddingRight: '5px' }} />,
            click: ({event}) => {
                event.stopPropagation();
                getHistory({ variables: {
                    full_path_text: treeRootData[selectedFolderData.host][rowData.full_path_text].full_path_text,
                    host: selectedFolderData.host,
                    group: [selectedFolderData.group],
                } });
            },
        },
        {
            name: 'Edit Comment', type: "item",
            icon: <EditIcon style={{ paddingRight: '5px' }} />,
            click: ({event}) => {
                event.stopPropagation();
                setFileCommentDialogOpen(true);
            },
        },
    ];

    const handleDropdownToggle = (evt) => {
        evt.stopPropagation();
        setDropdownOpen((prevOpen) => !prevOpen);
    };
    const openFilePreview = (event) => {
        event.stopPropagation();
        event.preventDefault();
        setOpenPreviewMediaDialog(true);
    }
    return (
        <React.Fragment>
            <IconButton
                style={{height: "100%" }}
                size='small'
                aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                aria-expanded={dropdownOpen ? 'true' : undefined}
                aria-haspopup='menu'
                onClick={handleDropdownToggle}
                color='info'
                variant='contained'
                ref={dropdownAnchorRef}>
                <SettingsIcon />
            </IconButton>
            {treeRootData[selectedFolderData.host][rowData.full_path_text]?.filemeta.length > 0 ?
                <MythicStyledTooltip title={treeRootData[selectedFolderData.host][rowData.full_path_text]?.filemeta[0]?.complete ?
                    "Preview Media" : "Preview Partial Media"}>
                    <FontAwesomeIcon icon={faPhotoVideo} size={"1x"} style={{
                        position: "relative", cursor: "pointer", display: "inline-block"}}
                                     onClick={openFilePreview}/>
                </MythicStyledTooltip>

                : null}
            {openPreviewMediaDialog &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewMediaDialog}
                              onClose={(e)=>{setOpenPreviewMediaDialog(false);}}
                              innerDialog={<PreviewFileMediaDialog
                                  agent_file_id={treeRootData[selectedFolderData.host][rowData.full_path_text]?.filemeta[0]?.agent_file_id}
                                  filename={b64DecodeUnicode(treeRootData[selectedFolderData.host][rowData.full_path_text]?.filemeta[0]?.filename_text)}
                                  onClose={(e)=>{setOpenPreviewMediaDialog(false);}} />}
                />
            }
            {dropdownOpen &&
                <ClickAwayListener onClickAway={handleClose} mouseEvent={"onMouseDown"}>
                    <Dropdown
                        isOpen={dropdownAnchorRef.current}
                        onOpen={setDropdownOpen}
                        externallyOpen={dropdownOpen}
                        menu={[
                            ...optionsA.map((option, index) => (
                                option.type === 'item' ? (
                                    <DropdownMenuItem
                                        key={option.name}
                                        disabled={option.disabled}
                                        className={option.danger ? "mythic-menu-item-hover-danger" : undefined}
                                        onClick={(event) => handleMenuItemClick(event, option.click)}
                                    >
                                        {option.icon} {option.name}
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
                                                    className={menuOption.danger ? "mythic-menu-item-hover-danger" : undefined}
                                                    onClick={(event) => handleMenuItemClick(event, menuOption.click)}
                                                >
                                                    {menuOption.icon}{menuOption.name}
                                                </DropdownMenuItem>
                                            ))
                                        }
                                    />
                                ) : null))
                        ]}/>
                </ClickAwayListener>
            }

            {fileCommentDialogOpen && (
                <MythicDialog
                    fullWidth={true}
                    maxWidth='md'
                    open={fileCommentDialogOpen}
                    onClose={() => {
                        setFileCommentDialogOpen(false);
                    }}
                    innerDialog={
                        <MythicModifyStringDialog
                            title='Edit Comment'
                            onSubmit={onSubmitUpdatedComment}
                            value={rowData.comment}
                            onClose={() => {
                                setFileCommentDialogOpen(false);
                            }}
                        />
                    }
                />
            )}
            {viewPermissionsDialogOpen && (
                <MythicDialog
                    fullWidth={true}
                    maxWidth='lg'
                    open={viewPermissionsDialogOpen}
                    onClose={() => {
                        setViewPermissionsDialogOpen(false);
                    }}
                    innerDialog={
                        <MythicViewJSONAsTableDialog
                            title={'View Metadata for ' + rowData.name_text}
                            leftColumn='Attribute'
                            rightColumn='Value'
                            me={me}
                            value={permissionData}
                            onClose={() => {
                                setViewPermissionsDialogOpen(false);
                            }}
                        />
                    }
                />
            )}
            {fileHistoryDialogOpen && (
                <MythicDialog
                    fullWidth={true}
                    maxWidth='xl'
                    open={fileHistoryDialogOpen}
                    onClose={() => {
                        setFileHistoryDialogOpen(false);
                    }}
                    innerDialog={
                        <DownloadHistoryDialog
                            title='Download History'
                            value={downloadHistory}
                            onClose={() => {
                                setFileHistoryDialogOpen(false);
                            }}
                        />
                    }
                />
            )}
        </React.Fragment>
    );
};
