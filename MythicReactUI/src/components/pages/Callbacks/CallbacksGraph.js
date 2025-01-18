import React, {useEffect, useState, useMemo, useContext} from 'react';
import {DrawC2PathElementsFlowWithProvider} from './C2PathDialog';
import {Button} from '@mui/material';
import ButtonGroup from '@mui/material/ButtonGroup';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import MenuItem from '@mui/material/MenuItem';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import {useMutation } from '@apollo/client';
import {hideCallbackMutation, removeEdgeMutation, addEdgeMutation} from './CallbackMutations';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {MythicSelectFromListDialog} from '../../MythicComponents/MythicSelectFromListDialog';
import {ManuallyAddEdgeDialog} from './ManuallyAddEdgeDialog';
import {gql, useLazyQuery } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import {TaskParametersDialog} from './TaskParametersDialog';
import {createTaskingMutation} from './CallbackMutations';
import {useTheme} from '@mui/material/styles';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import {CallbackGraphEdgesContext, CallbacksContext, OnOpenTabContext} from './CallbacksTop';
import {Dropdown, DropdownMenuItem} from "../../MythicComponents/MythicNestedMenus";
import {GetMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import {operatorSettingDefaults} from "../../../cache";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 1;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function getStyles(name, selectedOptions, theme) {
    return {
      fontWeight:
      selectedOptions.indexOf(name) === -1
          ? theme.typography.fontWeightRegular
          : theme.typography.fontWeightMedium,
    };
  }

export const loadedLinkCommandsQuery = gql`
query loadedLinkCommandsQuery ($callback_id: Int!){
  loadedcommands(where: {callback_id: {_eq: $callback_id}, command: {supported_ui_features: {_contains: "graph_view:link"}, deleted: {_eq: false}}}) {
    command {
        id
        cmd
        help_cmd
        description
        needs_admin
    }
  }
}
`;

const GraphViewOptions = ({viewConfig, setViewConfig}) => {
    const theme = useTheme();
    const dropdownAnchorRef = React.useRef(null);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [showConfiguration, setShowConfiguration] = React.useState(false);
    const labelComponentOptions = ["display_id", "user", "host", "ip", "domain", "os", "process_name"];
    const [selectedComponentOptions, setSelectedComponentOptions] = React.useState(["display_id", "user"]);
    const [selectedGroupBy, setSelectedGroupBy] = React.useState("None");
    const groupByOptions = ["host", "user", "ip", "domain", "os", "process_name", "None"];
    const handleChange = (event) => {
        const {
            target: { value },
        } = event;
        setSelectedComponentOptions(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value,
        );
    };
    const handleGroupByChange = (event) => {
        setSelectedGroupBy(event.target.value);
    }
    useEffect( () => {
        setViewConfig({...viewConfig, label_components: selectedComponentOptions})
    }, [selectedComponentOptions])
    useEffect( () => {
        setViewConfig({...viewConfig, group_by: selectedGroupBy});
    }, [selectedGroupBy])
    const handleDropdownToggle = (evt) => {
        evt.stopPropagation();
        setDropdownOpen((prevOpen) => !prevOpen);
    };
    const handleMenuItemClick = (event, click) => {
        click();
        setDropdownOpen(false);
    };
    const options = [
        {name: showConfiguration ? "Hide Grouping Options": "Show Grouping Options", click: () => {
                setShowConfiguration(!showConfiguration);
            }},
        {name: viewConfig["include_disconnected"] ? 'Show Only Active Edges' : "Show All Edges", click: () => {
                const view = {...viewConfig, include_disconnected: !viewConfig["include_disconnected"]};
                setViewConfig(view);
            }},
        {name: viewConfig["show_all_nodes"] ? 'Hide inactive callbacks' : 'Show All Callbacks', click: () => {
                const view = {...viewConfig, show_all_nodes: !viewConfig["show_all_nodes"]};
                setViewConfig(view);
            }},
        {name: viewConfig["rankDir"] === "LR" ? 'Change Layout to Top-Bottom' : "Change Layout to Left-Right", click: () => {
                if(viewConfig["rankDir"] === "LR"){
                    const view = {...viewConfig, rankDir: "TB"};
                    setViewConfig(view);
                }else{
                    const view = {...viewConfig, rankDir: "LR"};
                    setViewConfig(view);
                }
            }},
        {name: viewConfig["packet_flow_view"] ? "View Connection Directions" : "View Egress Routes" , click: () => {
                const view = {...viewConfig, packet_flow_view: !viewConfig["packet_flow_view"]};
                setViewConfig(view);
            }},
        ];
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
            return;
        }
        setDropdownOpen(false);
    };
    return (
        <div >
            <ButtonGroup variant="contained" ref={dropdownAnchorRef} aria-label="split button" style={{marginTop: "0px", marginLeft: "25px"}} color="primary">
                <Button size="small" color="primary" aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                        aria-expanded={dropdownOpen ? 'true' : undefined}
                        aria-haspopup="menu"
                        onClick={handleDropdownToggle}>
                    Configure Graph View <ArrowDropDownIcon />
                </Button>
            </ButtonGroup>
            {showConfiguration &&
                <FormControl sx={{ width: 200,  backgroundColor: theme.palette.background.paper}} >
                    <InputLabel id="demo-chip-label">Group Callbacks By</InputLabel>
                    <Select
                        labelId="demo-chip-label"
                        id="demo-chip"
                        value={selectedGroupBy}
                        onChange={handleGroupByChange}
                        input={<OutlinedInput id="select-chip" label="Group Callbacks By" />}
                    >
                        {groupByOptions.map((name) => (
                            <MenuItem
                                key={name}
                                value={name}
                            >
                                {name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            }
            {showConfiguration &&
                <FormControl sx={{minWidth: 300, backgroundColor: theme.palette.background.paper}}>
                    <InputLabel id="demo-multiple-chip-label">Display Properties per Callback</InputLabel>
                    <Select
                        labelId="demo-multiple-chip-label"
                        id="demo-multiple-chip"
                        multiple
                        value={selectedComponentOptions}
                        onChange={handleChange}
                        input={<OutlinedInput id="select-multiple-chip" label="Display Properties per Callback" />}
                        MenuProps={MenuProps}
                    >
                        {labelComponentOptions.map((name) => (
                            <MenuItem
                                key={name}
                                value={name}
                                style={getStyles(name, selectedComponentOptions, theme)}
                            >
                                {name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            }

            <ClickAwayListener onClickAway={handleClose}>
                <Dropdown
                    isOpen={dropdownAnchorRef.current}
                    onOpen={setDropdownOpen}
                    externallyOpen={dropdownOpen}
                    menu={
                        options.map((option, index) => (
                                <DropdownMenuItem
                                    key={option.name}
                                    disabled={option.disabled}
                                    onClick={(event) => handleMenuItemClick(event, option.click)}
                                >
                                    {option.name}
                                </DropdownMenuItem>
                            ))
                    }
                />
            </ClickAwayListener>
        </div>
    )
}
export function CallbacksGraph({onOpenTab}){
    const callbacks = useContext(CallbacksContext);
    const callbackgraphedges = useContext(CallbackGraphEdgesContext);
    //used for creating a task to do a link command
    const [loadingSettings, setLoadingSettings] = React.useState(true);
    const [filterOptions, setFilterOptions] = React.useState({});
    const [linkCommands, setLinkCommands] = React.useState([]);
    const [openParametersDialog, setOpenParametersDialog] = React.useState(false);
    const [openSelectLinkCommandDialog, setOpenSelectLinkCommandDialog] = React.useState(false);
    const [selectedLinkCommand, setSelectedLinkCommand] = useState();
    const [selectedCallback, setSelectedCallback] = useState();
    const [manuallyRemoveEdgeDialogOpen, setManuallyRemoveEdgeDialogOpen] = useState(false);
    const [manuallyAddEdgeDialogOpen, setManuallyAddEdgeDialogOpen] = useState(false);
    const [edgeOptions, setEdgeOptions] = useState([]); // used for manuallyRemoveEdgeDialog
    const [addEdgeSource, setAddEdgeSource] = useState(null); // used for manuallyAddEdgeDialog
    const [getLinkCommands] = useLazyQuery(loadedLinkCommandsQuery, {fetchPolicy: "network-only",
        onCompleted: data => {
            const updatedCommands = data.loadedcommands.map( c => {return {command: {...c.command, parsedParameters: {}}}})
            if(updatedCommands.length === 1){
                //no need for a popup, there's only one possible command
                setSelectedLinkCommand(updatedCommands[0].command);
                setOpenParametersDialog(true);
            }else if(updatedCommands.length === 0){
                //no possible command can be used, do a notification
                snackActions.warning("No commands loaded support the ui feature 'graph_view:link'");
            }else{
                const cmds = updatedCommands.map( (cmd) => { return {...cmd, display: cmd.command.cmd} } );
                setLinkCommands(cmds);
                setSelectedLinkCommand(cmds[0].command);
                setOpenSelectLinkCommandDialog(true);
            }
        }});
    const onSubmitSelectedLinkCommand = (cmd) => {
        setSelectedLinkCommand(cmd.command);
        //console.log(cmd);
        setOpenParametersDialog(true);
    }
    const [createTask] = useMutation(createTaskingMutation, {
        update: (cache, {data}) => {
            if(data.createTask.status === "error"){
                snackActions.error(data.createTask.error);
            }else{
                snackActions.success("task created");
            }
            
        }
    });
    const submitParametersDialog = (cmd, parameters, files) => {
        setOpenParametersDialog(false);
        createTask({variables: {callback_id: selectedCallback.id, command: cmd, params: parameters, files}});
    }
    const [viewConfig, setViewConfig] = React.useState({
        rankDir: "TB",
        label_components: ["display_id", "user"],
        packet_flow_view: true,
        include_disconnected: true,
        show_all_nodes: false,
        group_by: "None"
    });
    const [hideCallback] = useMutation(hideCallbackMutation, {
        update: (cache, {data}) => {
            //console.log(data);
        },
        onError: (error) => {
            console.log(error)
            snackActions.error(error.message);
            //setContextMenuOpen(false);
        },
        onCompleted: (data) => {
            if(data.updateCallback.status === "success"){
                snackActions.success("Successfully hid callback")
            }else{
                snackActions.error(data.updateCallback.error)
            }

            //setContextMenuOpen(false);
        }
    });
    const [manuallyRemoveEdge] = useMutation(removeEdgeMutation, {
        update: (cache, {data}) => {
            //console.log(data);
            snackActions.success("Successfully removed edge, updating graph...");
        },
        onError: (err) => {
            snackActions.error(err.message);
        }
    });
    const [manuallyAddEdge] = useMutation(addEdgeMutation, {
        update: (cache, {data}) => {
            //console.log(data);
            snackActions.success("Successfully added edge, updating graph...");
        },
        onError: (err) => {
            snackActions.error(err.message);
        }
    });
    const onSubmitManuallyRemoveEdge = (edge) => {
        if(edge === ""){
            snackActions.warning("No edge selected");
            return;
        }
        manuallyRemoveEdge({variables: {edge_id: edge.id}});
    }
    const onSubmitManuallyAddEdge = (source_id, profile, destination) => {
        if(profile === "" || destination === ""){
            snackActions.warning("Profile or Destination Callback not provided");
            return;
        }
        manuallyAddEdge({variables: {source_id: source_id, c2profile: profile.name, destination_id: destination.display_id}});
    }
    const contextMenu = useMemo(() => {return [
	        {
		        title: 'Hide Callback',
		        onClick: function(node) {
		            hideCallback({variables: {callback_display_id: node.display_id}});
		        }
	        },
	        {
		        title: 'Interact',
                onClick: function(node){
		            onOpenTab({tabType: "interact", tabID: node.callback_id + "interact", callbackID: node.callback_id});
	            }
            },
            {
	            title: "Manually Remove Edge",
                onClick: function(node){
	                const opts = callbackgraphedges.reduce( (prev, e) => {
                        if(e.source.id === node.id || e.destination.id === node.id){
                            if(e.end_timestamp === null){
                                if(e.source.id === e.destination.id){
                                    return [...prev, {...e, "display": e.source.display_id + " --> " + e.c2profile.name + " --> Mythic"}];
                                } else {
                                    return [...prev, {...e, "display": e.source.display_id + " --> " + e.c2profile.name + " --> " + e.destination.display_id}];
                                }

                            }else{
                                return [...prev];
                            }
                        } else {
                            return [...prev];
                        }
	                }, []);
	                setEdgeOptions(opts);
	                setManuallyRemoveEdgeDialogOpen(true);
                }
            },
            {
                title: "Manually Add Edge",
                onClick: function(node){
                    setAddEdgeSource(node);
                    setManuallyAddEdgeDialogOpen(true);
                }
	        },
	        {
	            title: "Task Callback for Edge",
                onClick: function(node){
	                setLinkCommands([]);
                    setSelectedLinkCommand(null);
                    setSelectedCallback(null);
	                getLinkCommands({variables: {callback_id: node.id} });
	                setSelectedCallback(node);
                }
            },
        ]}, [getLinkCommands, hideCallback, viewConfig, onOpenTab]);
    React.useEffect( () => {
        try {
            const storageItemOptions = GetMythicSetting({setting_name: "callbacks_table_filter_options", default_value: operatorSettingDefaults.callbacks_table_filters});
            if(storageItemOptions !== null){
                setFilterOptions(storageItemOptions);
            }
        }catch(error){
            console.log("Failed to load callbacks_table_filter_options", error);
        }
        setLoadingSettings(false);
    }, []);
    if(loadingSettings){
        return (<div style={{width: '100%', height: '100%', position: "relative",}}>
            <div style={{overflowY: "hidden", flexGrow: 1}}>
                <div style={{
                    position: "absolute",
                    left: "35%",
                    top: "40%"
                }}>
                    {"Loading Callbacks and Connections..."}
                </div>
            </div>
        </div>)
    }
    return (
        <div style={{maxWidth: "100%", "overflow": "hidden", height: "100%"}}>

            {manuallyRemoveEdgeDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={manuallyRemoveEdgeDialogOpen}
                              onClose={() => {
                                  setManuallyRemoveEdgeDialogOpen(false);
                              }}
                              innerDialog={<MythicSelectFromListDialog onClose={() => {
                                  setManuallyRemoveEdgeDialogOpen(false);}} identifier="id" display="display"
                                        onSubmit={onSubmitManuallyRemoveEdge} options={edgeOptions} title={"Manually Remove Edge"} action={"remove"} />}
                />
            }
            {manuallyAddEdgeDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={manuallyAddEdgeDialogOpen}
                    onClose={()=>{setManuallyAddEdgeDialogOpen(false);}} 
                    innerDialog={<ManuallyAddEdgeDialog onClose={()=>{setManuallyAddEdgeDialogOpen(false);}}
                                        onSubmit={onSubmitManuallyAddEdge} source={addEdgeSource} />}
                />
            }
            {openParametersDialog &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openParametersDialog} 
                    onClose={()=>{setOpenParametersDialog(false);}} 
                    innerDialog={<TaskParametersDialog command={selectedLinkCommand} callback={selectedCallback} onSubmit={submitParametersDialog} onClose={()=>{setOpenParametersDialog(false);}} />}
                />
            }
            {openSelectLinkCommandDialog &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={openSelectLinkCommandDialog}
                    onClose={()=>{setOpenSelectLinkCommandDialog(false);}} 
                    innerDialog={<MythicSelectFromListDialog onClose={()=>{setOpenSelectLinkCommandDialog(false);}}
                                        onSubmit={onSubmitSelectedLinkCommand} options={linkCommands} title={"Select Link Command"} 
                                        action={"select"} display={"display"} identifier={"display"}/>}
                />
            }
            <DrawC2PathElementsFlowWithProvider providedNodes={callbacks} edges={callbackgraphedges} view_config={viewConfig}
                                                    filterOptions={filterOptions}
                                                    panel={<GraphViewOptions setViewConfig={setViewConfig} viewConfig={viewConfig} />} contextMenu={contextMenu}/>
        </div>
    );
}

