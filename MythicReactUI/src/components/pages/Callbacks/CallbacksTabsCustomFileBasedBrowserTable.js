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
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ListIcon from '@mui/icons-material/List';
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import 'react-virtualized/styles.css';
import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import MythicResizableGrid from '../../MythicComponents/MythicResizableGrid';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import {faFilter} from '@fortawesome/free-solid-svg-icons';
import {MythicTransferListDialog} from '../../MythicComponents/MythicTransferList';
import {TagsDisplay, ViewEditTags} from '../../MythicComponents/MythicTag';
import { toLocalTime } from '../../utilities/Time';
import RefreshIcon from '@mui/icons-material/Refresh';
import {RenderSingleTask} from "../SingleTaskView/SingleTaskView";
import {
    GetComputedFontSize,
    GetMythicSetting,
    useSetMythicSetting
} from "../../MythicComponents/MythicSavedUserSetting";
import {getIconColor, getIconName} from "./ResponseDisplayTable";
import {CallbacksTableColumnsReorderDialog} from "./CallbacksTableColumnsReorderDialog";

const updateFileComment = gql`
    mutation updateCommentMutation($mythictree_id: Int!, $comment: String!) {
        update_mythictree_by_pk(pk_columns: { id: $mythictree_id }, _set: { comment: $comment }) {
            comment
            id
        }
    }
`;

export const CallbacksTabsCustomFileBasedBrowserTable = (props) => {
    const theme = useTheme();
    const [updateSetting] = useSetMythicSetting();
    const [allData, setAllData] = React.useState([]);
    const [openReorderDialog, setOpenReorderDialog] = React.useState(false);
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [filterOptions, setFilterOptions] = React.useState({});
    const [selectedColumn, setSelectedColumn] = React.useState({});
    const [fileCommentDialogOpen, setFileCommentDialogOpen] = React.useState(false);
    const [viewPermissionsDialogOpen, setViewPermissionsDialogOpen] = React.useState(false);
    const permissionDataRef = React.useRef({metadata: {}, name: ""});
    const commentDataRef = React.useRef({id: 0, comment: ""});
    const [loading, setLoading] = React.useState(true);
    const [sortData, setSortData] = React.useState({"sortKey": null, "sortDirection": null, "sortType": null})
    const [columnVisibility, setColumnVisibility] = React.useState({
        "visible": [...props.treeConfig.table.visible],
        "hidden": [...props.treeConfig.table.hidden]
    });
    const indicatePartialListingRef = React.useRef(props.treeConfig.indicate_partial_listing);
    const [selectedRows, setSelectedRows] = React.useState([]);
    const [updateComment] = useMutation(updateFileComment, {
        onCompleted: (data) => {
            snackActions.success('updated comment');
        },
    });
    const onSubmitUpdatedComment = (comment) => {
        updateComment({ variables: { mythictree_id: commentDataRef.current.id, comment: comment } });
    };
    const [initialDefaultColumns, setInitialDefaultColumns] = React.useState([
        { name: 'name', type: 'name', key: 'name_text', fillWidth: true, visible: true },
        ...props.treeConfig.table.columns,
        { name: 'tags', type: 'tags', key: 'tags', disableSort: true, disableFilterMenu: true, width: 220 },
        { name: 'comment', type: 'comment', key: 'comment', width: 200 },
    ]);
    const [columnOrder, setColumnOrder] = React.useState(initialDefaultColumns);
    const columns = React.useMemo(
        () =>
            columnOrder.reduce( (prev, cur) => {
                if(columnVisibility.visible.includes(cur.name)){
                    if(filterOptions[cur.key] && String(filterOptions[cur.key]).length > 0){
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
        setFilterOptions({...filterOptions, [selectedColumn.key]: value });
        try{
            updateSetting({setting_name: `${props.treeConfig.name}_browser_filter_options`, value: {...filterOptions, [selectedColumn.key]: value }});
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
            if(["name_text", "comment"].includes(key)){
                if(!String(props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row][key]).toLowerCase().includes(value)){
                    return true;
                }
            } else {
                if(!String(props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row].metadata[key]).toLowerCase().includes(value)){
                    return true;
                }
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
                        switch(c.type) {
                            case "name":
                                return <FileBrowserTableRowNameCell
                                    treeRootData={props.treeRootData[props.selectedFolderData.group]}
                                    selectedFolderData={props.selectedFolderData}
                                    cellData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row].name_text}
                                    rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]}/>;
                            case "tags":
                                return <FileBrowserTagsCell
                                    rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]}
                                    treeRootData={props.treeRootData[props.selectedFolderData.group]}
                                    cellData={row}
                                    selectedFolderData={props.selectedFolderData}
                                    me={props.me}/>
                            case "comment":
                                return <FileBrowserTableRowStringCell
                                    cellData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row].comment}
                                    rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]}/>
                            case "date":
                                return <TableRowDateCell
                                    cellData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]?.metadata?.[c.key] || null}
                                    rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]}
                                    view_utc_time={props.me?.user?.view_utc_time}/>
                            case "size":
                                return <TableRowSizeCell
                                    cellData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]?.metadata?.[c.key] || 0}
                                    rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]}/>
                            case "string":
                                return <FileBrowserTableRowStringCell
                                    cellData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]?.metadata?.[c.key] || ""}
                                    rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]}/>
                            default:
                                return <FileBrowserTableRowStringCell
                                    cellData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]?.metadata?.[c.key] || ""}
                                    rowData={props.treeRootData[props.selectedFolderData.group][props.selectedFolderData.host][row]}/>
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
                        if(copyStringToClipboard(JSON.stringify(element?.metadata, null, 2))){
                            snackActions.success("Copied to clipboard");
                        }
                    },
                },
            ]
        },
        {
            name: 'View Metadata', type: "item",
            icon: <VisibilityIcon style={{ paddingRight: '5px' }} />,
            click: ({event}) => {
                event.stopPropagation();
                permissionDataRef.current.metadata = element?.metadata;
                permissionDataRef.current.name = element.name_text;
                setViewPermissionsDialogOpen(true);
            },
        },
        {
            name: 'Edit Comment', type: "item",
            icon: <EditIcon style={{ paddingRight: '5px' }} />,
            click: ({event}) => {
                event.stopPropagation();
                commentDataRef.current.id = element.id;
                commentDataRef.current.comment = element.comment;
                setFileCommentDialogOpen(true);
            },
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
        let removeCommand = await props.getLoadedCommandForUIFeature(callback_id, props.baseUIFeature + ":remove");
        let removeDisplay = "Remove (Unsupported)";
        if(removeCommand !== undefined){
            removeDisplay = `Remove (${removeCommand.command.cmd})`;
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
                name: listDisplay, type: "item",
                disabled: listCommand === undefined,
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
                name: removeDisplay, type: "item",
                disabled: removeCommand === undefined,
                icon: <DeleteIcon color="error" style={{ paddingRight: '5px' }} />,
                click: ({event}) => {
                    event.stopPropagation();
                    props.onTaskRowAction({
                        path: element.parent_path_text,
                        full_path: element.full_path_text,
                        host: element.host,
                        filename: element.name_text,
                        uifeature: props.baseUIFeature + ':remove',
                        getConfirmation: true,
                        callback_id, callback_display_id
                    });
                },
            },
        ];
    }
    async function optionsC (callback_id, callback_display_id, element, action_name, ui_feature, icon, color, openDialog, getConfirmation) {
        let command = await props.getLoadedCommandForUIFeature(callback_id, ui_feature);
        let commandDisplay = `${action_name} (Unsupported)`;
        if(command !== undefined){
            commandDisplay = `${action_name} (${command.command.cmd})`;
        }
        return  {
                name: commandDisplay, type: "item",
                disabled: command === undefined,
                icon: <FontAwesomeIcon icon={getIconName(icon)} style={{marginRight: "5px", color: getIconColor(theme, color  || "")}}/>,
                click: ({event}) => {
                    event.stopPropagation();
                    props.onTaskRowAction({
                        path: element.parent_path_text,
                        full_path: element.full_path_text,
                        host: element.host,
                        filename: element.name_text,
                        uifeature: ui_feature, openDialog, getConfirmation,
                        callback_id, callback_display_id
                    });
                },
            }
    }
    async function onRowContextClick({rowDataStatic}) {
        // based on row, return updated options array?
        if(selectedRows.length > 1){
            let downloadCommand = await props.getLoadedCommandForUIFeature(rowDataStatic.callback.id, rowDataStatic.can_have_children ?  props.baseUIFeature + ":download_folder" : props.baseUIFeature + ":download");
            let listCommand = await props.getLoadedCommandForUIFeature(rowDataStatic.callback.id, props.baseUIFeature + ":list");
            let removeCommand = await props.getLoadedCommandForUIFeature(rowDataStatic.callback.id, props.baseUIFeature + ":remove");
            return [
                {
                    name: `Download All Selected`, type: "item",
                    disabled: downloadCommand === undefined,
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
                    disabled: removeCommand === undefined,
                    icon: <DeleteIcon color="error" style={{ paddingRight: '5px' }} />,
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
                    disabled: listCommand === undefined,
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
        if(props.treeConfig.row_actions.length > 0){
            let extraOptions = [];
            for(let i = 0; i < props.treeConfig.row_actions.length; i++){
                let r = props.treeConfig.row_actions[i];
                if((r.supports_file && !rowDataStatic.can_have_children) || (r.supports_folder && rowDataStatic.can_have_children) ){
                    extraOptions.push(await optionsC(rowDataStatic.callback.id, rowDataStatic.callback.display_id,
                        rowDataStatic, r.name, r.ui_feature, r.icon, r.color, r.openDialog, r.getConfirmation));
                }
            }
            if(extraOptions.length > 0){
                options.push({
                    name: `Custom Actions`, icon: null, click: () => {}, type: "menu",
                    menuItems: extraOptions
                })
            }
        }
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
    React.useEffect( () => {
        // on startup, want to see if `callbacks_table_columns` exists in storage and load it if possible
        try {
            const storageItem = GetMythicSetting({setting_name: `${props.treeConfig.name}_browser_table_columns`, default_value: [...props.treeConfig.table.visible]});
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
            const storageItemOptions = GetMythicSetting({setting_name: `${props.treeConfig.name}_browser_filter_options`, default_value: {}});
            if(storageItemOptions !== null){
                setFilterOptions(storageItemOptions);
            }
        }catch(error){
            console.log("Failed to load custom browser_table_filter_options", error);
        }
        try {
            const storageColumnOrder = GetMythicSetting({setting_name: `${props.treeConfig.name}_browser_column_order`, default_value: columns.map(c => c.name)});
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
                if(newOrder.length === columns.length){
                    setColumnOrder(newOrder);
                }
            }
        }catch(error){
            console.log("Failed to load custom browser_table_filter_options", error);
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
        updateSetting({setting_name: `${props.treeConfig.name}_browser_column_order`, value: newOrder.map(c => c.name)});
        setColumnOrder(newOrder);
        setColumnVisibility({visible: newVisible, hidden: newHidden});
        updateSetting({setting_name: `${props.treeConfig.name}_browser_table_columns`, value: newVisible});
        setOpenReorderDialog(false);
    }
    const onResetColumnReorder = () => {
        onSubmitColumnReorder(initialDefaultColumns);
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
                <>
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
                                    value={commentDataRef.current?.value}
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
                                    title={'View Metadata for ' + permissionDataRef.current?.name}
                                    leftColumn='Attribute'
                                    rightColumn='Value'
                                    value={permissionDataRef.current?.metadata}
                                    onClose={() => {
                                        setViewPermissionsDialogOpen(false);
                                    }}
                                />
                            }
                        />
                    )}
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
                </>
            }
            {displayFormat === "normal" && props?.selectedFolderData?.success === null && indicatePartialListingRef.current &&
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
            {displayFormat === "fetchLocal" && indicatePartialListingRef.current &&
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
            {displayFormat === "fetchRemote" && indicatePartialListingRef.current &&
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
                <MythicDialog fullWidth={true} maxWidth="md" open={openContextMenu}
                              onClose={() => {
                                  setOpenContextMenu(false);
                              }}
                              innerDialog={
                              <MythicModifyStringDialog
                                  title='Filter Column'
                                  onSubmit={onSubmitFilterOptions}
                                  value={filterOptions[selectedColumn.key]}
                                  onClose={() => {
                                      setOpenContextMenu(false);
                                  }}
                                />
                                }
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
                                : theme.emptyFolderColor,
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
const FileBrowserTableRowStringCell = ({ cellData, rowData }) => {
    //console.log(rowData, cellData)
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