import React, {useRef, useEffect, useState} from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import {drawC2PathElements, getNodeEdges} from './C2PathDialog';
import {Button} from '@material-ui/core';
import {muiTheme} from '../../../themes/Themes';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import Paper from '@material-ui/core/Paper';
import Grow from '@material-ui/core/Grow';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import {useMutation } from '@apollo/client';
import {saveSvgAsPng} from 'save-svg-as-png';
import {hideCallbackMutation, removeEdgeMutation, addEdgeMutation} from './CallbackMutations';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {MythicSelectFromListDialog} from '../../MythicComponents/MythicSelectFromListDialog';
import {ManuallyAddEdgeDialog} from './ManuallyAddEdgeDialog';
import {gql, useLazyQuery } from '@apollo/client';
import { useSnackbar } from 'notistack';
import {TaskParametersDialog} from './TaskParametersDialog';
import {createTaskingMutation} from './CallbacksTabsTasking';

export const loadedLinkCommandsQuery = gql`
query loadedLinkCommandsQuery ($callback_id: Int!){
  loadedcommands(where: {callback_id: {_eq: $callback_id}, command: {is_link: {_eq: true}, deleted: {_eq: false}}}) {
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

export function CallbacksGraph(props){
    const dagreRef = useRef(null);    
    const { enqueueSnackbar } = useSnackbar();
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
    const [pickLinkTaskDialogOpen, setPickLinkTaskDialogOpen] = useState(false);
    const [edgeOptions, setEdgeOptions] = useState([]); // used for manuallyRemoveEdgeDialog
    const [addEdgeSource, setAddEdgeSource] = useState(null); // used for manuallyAddEdgeDialog
    const [getLinkCommands, {loading, error}] = useLazyQuery(loadedLinkCommandsQuery, {fetchPolicy: "network-only",
        onCompleted: data => {
            console.log(data);
            
            if(data.loadedcommands.length === 1){
                //no need for a popup, there's only one possible command
                setSelectedLinkCommand(data.loadedcommands[0].command);
                setOpenParametersDialog(true);
            }else if(data.loadedcommands.length === 0){
                //no possible command can be used, do a notification
                enqueueSnackbar("No commands loaded that are 'link' commands", {variant: "warning"});
            }else{
                const cmds = data.loadedcommands.map( (cmd) => { return {...cmd, display: cmd.command.cmd} } );
                setLinkCommands(cmds);
                setSelectedLinkCommand(cmds[0].command);
                setOpenSelectLinkCommandDialog(true);
            }
        }});
    const onSubmitSelectedLinkCommand = (cmd) => {
        setSelectedLinkCommand(cmd.command);
        console.log(cmd);
        setOpenParametersDialog(true);
    }
    const [createTask] = useMutation(createTaskingMutation, {
        update: (cache, {data}) => {
            if(data.createTask.status === "error"){
                enqueueSnackbar(data.createTask.error, {variant: "error"});
            }else{
                enqueueSnackbar("task created", {variant: "success"});
            }
            
        }
    });
    const submitParametersDialog = (cmd, parameters, files) => {
        setOpenParametersDialog(false);
        createTask({variables: {callback_id: selectedCallback.id, command: cmd, params: parameters, files}});
    }
    const [viewConfig, setViewConfig] = React.useState({
        rankDir: "LR",
        label_components: ["id", "user"],
        packet_flow_view: true,
        include_disconnected: true,
        show_all_nodes: false
    });
    const [hideCallback] = useMutation(hideCallbackMutation, {
        update: (cache, {data}) => {
            console.log(data);
        }
    });
    const [manuallyRemoveEdge] = useMutation(removeEdgeMutation, {
        update: (cache, {data}) => {
            console.log(data);
        }
    });
    const [manuallyAddEdge] = useMutation(addEdgeMutation, {
        update: (cache, {data}) => {
            console.log(data);
        }
    });
    const onSubmitManuallyRemoveEdge = (edge) => {
        if(edge === ""){return}
        manuallyRemoveEdge({variables: {edge_id: edge.edge_id, end_timestamp: (new Date()).toISOString()}});
    }
    const onSubmitManuallyAddEdge = (source_id, profile, destination) => {
        if(profile === "" || destination === ""){return}
        manuallyAddEdge({variables: {source_id: source_id, profile_id: profile.id, destination_id: destination.id}});
        console.log("want to submit: ", source_id, profile, destination);
    }
    const node_events = {
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
		            props.onOpenTab({tabType: "interact", tabID: elm.node.id + "interact", callbackID: elm.node.id});
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
    }
    const handleDropdownToggle = (evt) => {
        evt.stopPropagation();
        setDropdownOpen((prevOpen) => !prevOpen);
      };
    const handleMenuItemClick = (event, index) => {
        options[index].click();
        setDropdownOpen(false);
    };
    const options = [{name: 'Toggle Disconnected', click: () => {
                        const view = {...viewConfig, include_disconnected: !viewConfig["include_disconnected"]};
                        drawC2PathElements([...props.callbackgraphedges], dagreRef, true, view, node_events);
                        setViewConfig(view);
                     }}, 
                     {name: 'Toggle All Nodes', click: () => {
                        const view = {...viewConfig, show_all_nodes: !viewConfig["show_all_nodes"]};
                        drawC2PathElements([...props.callbackgraphedges], dagreRef, true, view, node_events);
                        setViewConfig(view);
                     }},
                     {name: 'Autosize', click: () => {
                        drawC2PathElements([...props.callbackgraphedges], dagreRef, true, viewConfig, node_events);
                     }}, 
                     {name: 'Change Layout', click: () => {
                        if(viewConfig["rankDir"] === "LR"){
                            const view = {...viewConfig, rankDir: "BT"};
                            drawC2PathElements([...props.callbackgraphedges], dagreRef, true, view, node_events);
                            setViewConfig(view);
                        }else{
                            const view = {...viewConfig, rankDir: "LR"};
                            drawC2PathElements([...props.callbackgraphedges], dagreRef, true, view, node_events);
                            setViewConfig(view);
                        }
                     }},
                     {name: "Change View", click: () => {
                        const view = {...viewConfig, packet_flow_view: !viewConfig["packet_flow_view"]};
                        drawC2PathElements([...props.callbackgraphedges], dagreRef, true, view, node_events);
                        setViewConfig(view);
                     }},
                     {name: "Download Graph", click: () => {
                        saveSvgAsPng(document.getElementById("callbacksgraph"), "diagram.png");
                     }}];
    const getConfigString = () => {
        let config = "";
        config += viewConfig["include_disconnected"] ? "Showing Disconnected Edges, " : "Showing Active Edges, ";
        config += viewConfig["show_all_nodes"] ? "Showing all nodes, " : "Showing Active Nodes, ";
        config += "Layout: " + viewConfig["rankDir"] + ", ";
        config += viewConfig["packet_flow_view"] ? "Showing Egress Routes" : "Showing Connections";
        return config;
    }
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }
        setDropdownOpen(false);
      };
    useEffect( () => {
        const allEdges = [...props.callbackgraphedges];
        drawC2PathElements(allEdges, dagreRef, reZoom, viewConfig, node_events);
        setReZoom(false);
    }, [props.callbackgraphedges])
    return (
        <React.Fragment>
            <ButtonGroup variant="contained" ref={dropdownAnchorRef} aria-label="split button" style={{marginTop: "10px", backgroundColor: muiTheme.palette.info.main}}>
                <Button size="small" onClick={(evt) => {evt.stopPropagation();}} style={{backgroundColor: muiTheme.palette.info.main}}>Actions</Button>
                 <Button
                    style={{backgroundColor: muiTheme.palette.info.main}} 
                    size="small"
                    aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                    aria-expanded={dropdownOpen ? 'true' : undefined}
                    aria-haspopup="menu"
                    onClick={handleDropdownToggle}
                  >
                    <ArrowDropDownIcon style={{backgroundColor: muiTheme.palette.info.main}}/>
                  </Button>
            </ButtonGroup>
            {getConfigString()}
            <Popper open={dropdownOpen} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal>
              {({ TransitionProps, placement }) => (
                <Grow
                  {...TransitionProps}
                  style={{
                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                  }}
                >
                  <Paper>
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
            <MythicDialog fullWidth={true} maxWidth="sm" open={manuallyRemoveEdgeDialogOpen}
                    onClose={()=>{setManuallyRemoveEdgeDialogOpen(false);}} 
                    innerDialog={<MythicSelectFromListDialog onClose={()=>{setManuallyRemoveEdgeDialogOpen(false);}}
                                        onSubmit={onSubmitManuallyRemoveEdge} options={edgeOptions} title={"Manually Remove Edge"} action={"remove"} />}
                />
            <MythicDialog fullWidth={true} maxWidth="sm" open={manuallyAddEdgeDialogOpen}
                    onClose={()=>{setManuallyAddEdgeDialogOpen(false);}} 
                    innerDialog={<ManuallyAddEdgeDialog onClose={()=>{setManuallyAddEdgeDialogOpen(false);}}
                                        onSubmit={onSubmitManuallyAddEdge} source={addEdgeSource} />}
                />
            <MythicDialog fullWidth={true} maxWidth="md" open={openParametersDialog} 
                    onClose={()=>{setOpenParametersDialog(false);}} 
                    innerDialog={<TaskParametersDialog command={selectedLinkCommand} callback={selectedCallback} onSubmit={submitParametersDialog} onClose={()=>{setOpenParametersDialog(false);}} />}
                />
            <MythicDialog fullWidth={true} maxWidth="sm" open={openSelectLinkCommandDialog}
                    onClose={()=>{setOpenSelectLinkCommandDialog(false);}} 
                    innerDialog={<MythicSelectFromListDialog onClose={()=>{setOpenSelectLinkCommandDialog(false);}}
                                        onSubmit={onSubmitSelectedLinkCommand} options={linkCommands} title={"Select Link Command"} action={"select"} />}
                />
            <div style={{"maxWidth": "100%", "overflow": "auto", height: "calc(" + props.topHeight + "vh)"}}>
                <svg id="callbacksgraph" ref={dagreRef} width="100%" height="98%"></svg> 
            </div>
        </React.Fragment>
    );
}

