import React, {useRef, useEffect, useState, useMemo} from 'react';
import {drawC2PathElements, getNodeEdges} from './C2PathDialog';
import {Button} from '@mui/material';
import ButtonGroup from '@mui/material/ButtonGroup';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Paper from '@mui/material/Paper';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import {useMutation } from '@apollo/client';
import {saveSvgAsPng} from 'save-svg-as-png';
import {hideCallbackMutation, removeEdgeMutation, addEdgeMutation} from './CallbackMutations';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {MythicSelectFromListDialog} from '../../MythicComponents/MythicSelectFromListDialog';
import {ManuallyAddEdgeDialog} from './ManuallyAddEdgeDialog';
import {gql, useLazyQuery } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import {TaskParametersDialog} from './TaskParametersDialog';
import {createTaskingMutation} from './CallbacksTabsTasking';
import {useTheme} from '@mui/material/styles';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
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
  loadedcommands(where: {callback_id: {_eq: $callback_id}, command: {supported_ui_features: {_ilike: "graph_view:link"}, deleted: {_eq: false}}}) {
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

export function CallbacksGraph({onOpenTab, callbackgraphedges}){
    const theme = useTheme();
    const dagreRef = useRef(null);    
    const dropdownAnchorRef = React.useRef(null);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [reZoom, setReZoom] = useState(true);
    //used for creating a task to do a link command
    const [linkCommands, setLinkCommands] = React.useState([]);
    const [openParametersDialog, setOpenParametersDialog] = React.useState(false);
    const [openSelectLinkCommandDialog, setOpenSelectLinkCommandDialog] = React.useState(false);
    const [selectedLinkCommand, setSelectedLinkCommand] = useState();
    const [selectedCallback, setSelectedCallback] = useState();
    const [manuallyRemoveEdgeDialogOpen, setManuallyRemoveEdgeDialogOpen] = useState(false);
    const [manuallyAddEdgeDialogOpen, setManuallyAddEdgeDialogOpen] = useState(false);
    const [edgeOptions, setEdgeOptions] = useState([]); // used for manuallyRemoveEdgeDialog
    const [addEdgeSource, setAddEdgeSource] = useState(null); // used for manuallyAddEdgeDialog
    const labelComponentOptions = ["id", "user", "host", "ip", "domain", "os", "process_name"];
    const [selectedComponentOptions, setSelectedComponentOptions] = React.useState(["id", "user"]);
    const [selectedGroupBy, setSelectedGroupBy] = React.useState("host");
    const groupByOptions = ["host", "user", "ip", "domain", "os", "process_name", "extra_info"];
    const [getLinkCommands] = useLazyQuery(loadedLinkCommandsQuery, {fetchPolicy: "network-only",
        onCompleted: data => {            
            if(data.loadedcommands.length === 1){
                //no need for a popup, there's only one possible command
                setSelectedLinkCommand(data.loadedcommands[0].command);
                setOpenParametersDialog(true);
            }else if(data.loadedcommands.length === 0){
                //no possible command can be used, do a notification
                snackActions.warning("No commands loaded that are 'link' commands");
            }else{
                const cmds = data.loadedcommands.map( (cmd) => { return {...cmd, display: cmd.command.cmd} } );
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
        rankDir: "BT",
        label_components: selectedComponentOptions,
        packet_flow_view: true,
        include_disconnected: true,
        show_all_nodes: false,
        group_by: selectedGroupBy
    });
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
    const [hideCallback] = useMutation(hideCallbackMutation, {
        update: (cache, {data}) => {
            //console.log(data);
        }
    });
    const [manuallyRemoveEdge] = useMutation(removeEdgeMutation, {
        update: (cache, {data}) => {
            //console.log(data);
        }
    });
    const [manuallyAddEdge] = useMutation(addEdgeMutation, {
        update: (cache, {data}) => {
            //console.log(data);
        }
    });
    const onSubmitManuallyRemoveEdge = (edge) => {
        if(edge === ""){
            snackActions.warning("No edge selected");
            return;
        }
        manuallyRemoveEdge({variables: {edge_id: edge.edge_id}});
    }
    const onSubmitManuallyAddEdge = (source_id, profile, destination) => {
        if(profile === "" || destination === ""){
            snackActions.warning("Profile or Destination Callback not provided");
            return;
        }
        manuallyAddEdge({variables: {source_id: source_id, c2profile: profile.name, destination_id: destination.id}});
    }
    const node_events = useMemo(() => {return {
        "mouseover": (parent, node, d) => {return},
        "mouseout": (parent, node, d) => {return},
        "click": (parent, node, d) => {return},
        "contextmenu":  [
	        {
		        title: 'Hide Callback',
		        action: function(g, elm) {
		            hideCallback({variables: {callback_id: elm.node.id}});
		        }
	        },
	        {
		        title: 'Interact',
		        action: function(g, elm){
		            onOpenTab({tabType: "interact", tabID: elm.node.id + "interact", callbackID: elm.node.id});
	            }
            },
            {
	            title: "Manually Remove Edge",
	            action: function(g, elm){
	                const edges = getNodeEdges(g, elm.node.id);
	                const opts = edges.reduce( (prev, e) => {
	                    const fulledg = g.edge(e.v, e.w, e.name);
	                    if(fulledg.end_timestamp === null){
	                        if(fulledg.direction === 1){
	                            if(viewConfig["packet_flow_view"]){
	                                return [...prev, {...fulledg, "display": e.w + " --> " + e.name + " --> " + e.v}];
	                            }else{
	                                return [...prev, {...fulledg, "display": e.v + " --> " + e.name + " --> " + e.w}];
	                            }
	                        }else{
	                            return [...prev, {...fulledg, "display": e.w + " --> " + e.name + " --> " + e.v}];
	                        }
	                        
	                    }else{
	                        return [...prev];
	                    }
	                }, []);
	                setEdgeOptions(opts);
	                setManuallyRemoveEdgeDialogOpen(true);
                }
            },
            {
                title: "Manually Add Edge",
                action: function(g, elm){
                    setAddEdgeSource(elm.node);
                    setManuallyAddEdgeDialogOpen(true);
                }
	        },
	        {
	            title: "Task Callback for Edge",
	            action: function(g, elm){
	                setLinkCommands([]);
                    setSelectedLinkCommand(null);
                    setSelectedCallback(null);
	                getLinkCommands({variables: {callback_id: elm.node.id} });
	                setSelectedCallback(elm.node);
	                
                }
            },
        ]       
    }}, [getLinkCommands, hideCallback, viewConfig, onOpenTab]);
    const handleDropdownToggle = (evt) => {
        evt.stopPropagation();
        setDropdownOpen((prevOpen) => !prevOpen);
      };
    const handleMenuItemClick = (event, index) => {
        options[index].click();
        setDropdownOpen(false);
    };
    const options = [{name: viewConfig["include_disconnected"] ? 'Show Only Active Edges' : "Show All Edges", click: () => {
                        const view = {...viewConfig, include_disconnected: !viewConfig["include_disconnected"]};
                        drawC2PathElements([...callbackgraphedges], dagreRef, true, view, node_events, theme);
                        setViewConfig(view);
                     }}, 
                     {name: viewConfig["show_all_nodes"] ? 'Hide inactive callbacks' : 'Show All Callbacks', click: () => {
                        const view = {...viewConfig, show_all_nodes: !viewConfig["show_all_nodes"]};
                        drawC2PathElements([...callbackgraphedges], dagreRef, true, view, node_events, theme);
                        setViewConfig(view);
                     }},
                     {name: 'Autosize', click: () => {
                        drawC2PathElements([...callbackgraphedges], dagreRef, true, viewConfig, node_events, theme);
                     }}, 
                     {name: viewConfig["rankDir"] === "LR" ? 'Change Layout to Top-Bottom' : "Change Layout to Left-Right", click: () => {
                        if(viewConfig["rankDir"] === "LR"){
                            const view = {...viewConfig, rankDir: "BT"};
                            drawC2PathElements([...callbackgraphedges], dagreRef, true, view, node_events, theme);
                            setViewConfig(view);
                        }else{
                            const view = {...viewConfig, rankDir: "LR"};
                            drawC2PathElements([...callbackgraphedges], dagreRef, true, view, node_events, theme);
                            setViewConfig(view);
                        }
                     }},
                     {name: viewConfig["packet_flow_view"] ? "View Connection Directions" : "View Egress Routes" , click: () => {
                        const view = {...viewConfig, packet_flow_view: !viewConfig["packet_flow_view"]};
                        drawC2PathElements([...callbackgraphedges], dagreRef, true, view, node_events, theme);
                        setViewConfig(view);
                     }},
                     {name: "Download Graph", click: () => {
                        saveSvgAsPng(document.getElementById("callbacksgraph"), "diagram.png");
                     }}];
    const getConfigString = () => {
        let config = "";
        config += viewConfig["include_disconnected"] ? "Showing All Edges, " : "Showing Only Active Edges, ";
        config += viewConfig["show_all_nodes"] ? "Showing All Callbacks, " : "Showing Active Callbacks, ";
        config += "Layout: " + viewConfig["rankDir"] + ", ";
        config += viewConfig["packet_flow_view"] ? "Showing Egress Routes" : "Showing Connections Paths";
        return config;
    }
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }
        setDropdownOpen(false);
      };
    useEffect( () => {
        const allEdges = [...callbackgraphedges];
        drawC2PathElements(allEdges, dagreRef, true, viewConfig, node_events, theme);
        setReZoom(false);
    }, [callbackgraphedges, reZoom, viewConfig, theme]) // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <div style={{maxWidth: "100%", "overflow": "auto", height: "100%"}}> 
            <div style={{display: "flex"}} >
                <ButtonGroup variant="contained" ref={dropdownAnchorRef} aria-label="split button" style={{marginTop: "10px"}} color="primary">
                    <Button size="small" color="primary" aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                        aria-expanded={dropdownOpen ? 'true' : undefined}
                        aria-haspopup="menu"
                        onClick={handleDropdownToggle}>
                            Actions <ArrowDropDownIcon />
                    </Button>
                </ButtonGroup>
                <FormControl sx={{ width: 200,  marginTop: "10px" }}>
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
                <FormControl sx={{minWidth: 300, marginTop: "10px"}}>
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
                
            </div>
            
            <Popper open={dropdownOpen} anchorEl={dropdownAnchorRef.current} role={undefined} transition style={{zIndex: 200}}>
              {({ TransitionProps, placement }) => (
                <Grow
                  {...TransitionProps}
                  style={{
                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                  }}
                >
                  <Paper style={{backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light, color: "white"}}>
                    <ClickAwayListener onClickAway={handleClose}>
                      <MenuList id="split-button-menu">
                        {options.map((option, index) => (
                          <MenuItem
                            key={option.name}
                            onClick={(event) => handleMenuItemClick(event, index)}
                          >
                            {option.name}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </ClickAwayListener>
                  </Paper>
                </Grow>
              )}
            </Popper>
            {manuallyRemoveEdgeDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={manuallyRemoveEdgeDialogOpen}
                    onClose={()=>{setManuallyRemoveEdgeDialogOpen(false);}} 
                    innerDialog={<MythicSelectFromListDialog onClose={()=>{setManuallyRemoveEdgeDialogOpen(false);}} identifier="edge_id" display="display"
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
            
            
                <svg id="callbacksgraph" ref={dagreRef} width="100%" height="100%"></svg> 
            </div>
    );
}

