import React, {useEffect} from 'react';
import {Button} from '@material-ui/core';
import TableCell from '@material-ui/core/TableCell';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { MythicDisplayTextDialog} from '../../MythicComponents/MythicDisplayTextDialog';
import {EnhancedTableRow} from '../../MythicComponents/MythicTable';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import KeyboardIcon from '@material-ui/icons/Keyboard';
import LockIcon from '@material-ui/icons/Lock';
import {getTimeDifference, useInterval } from '../../utilities/Time';
import WifiIcon from '@material-ui/icons/Wifi';
import InsertLinkTwoToneIcon from '@material-ui/icons/InsertLinkTwoTone';
import {C2PathDialog} from './C2PathDialog';
import {muiTheme} from "../../../themes/Themes";
import { useSnackbar } from 'notistack';
import Paper from '@material-ui/core/Paper';
import Grow from '@material-ui/core/Grow';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';
import {hideCallbackMutation} from './CallbackMutations';
import {useMutation } from '@apollo/client';
import SnoozeIcon from '@material-ui/icons/Snooze';


export function CallbacksTableRow(props){
    const dropdownAnchorRef = React.useRef(null);
    const { enqueueSnackbar } = useSnackbar();
    const [displayTime, setDisplayTime] = React.useState("");
    const [activeEgress, setActiveEgress] = React.useState(muiTheme.palette.success.main);
    const [activeEgressBool, setActiveEgressBool] = React.useState(true);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [openC2Dialog, setOpenC2Dialog] = React.useState(false);
    const [openSleepDialog, setOpenSleepDialog] = React.useState(false);
    const [callbackgraphedges, setCallbackgraphedges] = React.useState([]);
    const [callbackgraphedgesAll, setCallbackgraphedgesAll] = React.useState([]);
    const handleDropdownToggle = (evt) => {
            evt.stopPropagation();
            setDropdownOpen((prevOpen) => !prevOpen);
      };
      const handleDropdownClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }
        setDropdownOpen(false);
      };
    const updateTime = (curTime) => {
        setDisplayTime(getTimeDifference(curTime));
    };
    useInterval( () => {
        updateTime(props.last_checkin);
    });
    const onOpenTab = (tabType) => {
        if(!activeEgressBool){
            enqueueSnackbar("Agent has no egress route! Re-link before tasking", {variant: "warning"});
        }
        props.onOpenTab({tabType, tabID: props.id + tabType, callbackID: props.id});
    }
    const hasOwnEgressRoute = () =>{
    // just check if our own callback has an egress connection or only p2p connections
        return callbackgraphedgesAll.filter( (edge) => {
            if(!edge.c2profile.is_p2p && edge.source.id === props.id && edge.destination.id === props.id){
                return true;
            }
            return false;
        }).length > 0;
    }
    const getEdges = (activeOnly) => {
        //update our aggregate of callbackgraphedges for both src and dst that involve us
        let myEdges = props.callbackgraphedges.filter( (edge) =>{
            if(edge.source.id === props.id || edge.destination.id === props.id){
                if(activeOnly){
                    if(edge.end_timestamp === null){
                        return true;
                    }
                    else{return false}
                }
                return true;
            }
            return false;
        });
        let foundMore = true;
        while(foundMore){
            //look at all of the edges in myEdges and see if there are any edges that share a source/destination in props.callbackgraphedges that are _not_ in myEdges so far
            const newEdges = props.callbackgraphedges.reduce( (prev, edge) => {
                //looking to see if we should add 'edge' to our list of relevant edges
                if(prev.includes(edge)){return [...prev]}
                //look through all of the previous edges we know about and see if there's a matching source/destination id with the new edge
                const matching = prev.filter( (e) => {
                    if(e.source.id === edge.source.id || e.source.id === edge.destination.id || e.destination.id === edge.source.id ){
                        if(activeOnly){
                            if(edge.end_timestamp === null) { return true}
                            else{return false}
                        }
                        return true;
                    }
                    return false;
                });
                if(matching.length > 0){
                    return [...prev, edge];
                }else{
                    return [...prev];
                }
            }, [...myEdges]);
            foundMore = newEdges.length > myEdges;
            myEdges = [...newEdges];
        }
        return myEdges;
    }
    useEffect( () => {
        const myActiveEdges = getEdges(true);
        const myEdges = getEdges(false);
        setCallbackgraphedges(myActiveEdges);
        setCallbackgraphedgesAll(myEdges);
    }, [props.callbackgraphedges]);
    
    useEffect( () => {
        //determine if there are any active routes left at all
        const activeRoutes = callbackgraphedges.filter( (edge) => {
            if(!edge.c2profile.is_p2p  && edge.end_timestamp === null){
                return edge;
            }
        });
        if(activeRoutes.length === 0){
            setActiveEgress(muiTheme.palette.error.main);
            setActiveEgressBool(false);
        }else{
            setActiveEgress(muiTheme.palette.success.main);
            setActiveEgressBool(true);
        }
    }, [callbackgraphedges]);
    const handleMenuItemClick = (event, index) => {
        options[index].click(event);
        setDropdownOpen(false);
    };
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }

        setDropdownOpen(false);
      };
      const [hideCallback] = useMutation(hideCallbackMutation, {
        update: (cache, {data}) => {
            if(data.updateCallback.status === "success"){
                enqueueSnackbar("Hiding Callback.", {variant: "success", autoHideDuration: 2000});
            }else{
                enqueueSnackbar(data.updateCallback.error, {variant: "warning"});
            }
            
        },
        onError: data => {
            console.log(data);
        }
    });
    const options = [{name: 'Hide Callback', icon: <VisibilityOffIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
                        evt.stopPropagation();
                        hideCallback({variables: {callback_id: props.id}});
                     }},
                 ];
    return (
    <React.Fragment>
        <EnhancedTableRow id={props.id} handleClick={props.handleClick} isItemSelected={props.isItemSelected(props.id)}> 
            <TableCell>
                <ButtonGroup variant="contained" color={props.integrity_level > 2 ? "secondary" : "primary"} ref={dropdownAnchorRef} aria-label="split button">
                <Button size="small" onClick={(evt) => {evt.stopPropagation();onOpenTab("interact")}}>
                 { props.locked ? (<LockIcon />):(<KeyboardIcon />) } {props.id}
                 </Button>
                 <Button
                    style={{padding:0}} 
                    size="small"
                    aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                    aria-expanded={dropdownOpen ? 'true' : undefined}
                    aria-haspopup="menu"
                    onClick={handleDropdownToggle}
                  >
                    <ArrowDropDownIcon />
                  </Button>
                </ButtonGroup>
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
                                {option.icon}{option.name}
                              </MenuItem>
                            ))}
                          </MenuList>
                        </ClickAwayListener>
                      </Paper>
                    </Grow>
                  )}
                </Popper>
            </TableCell>
            <TableCell>{props.ip}</TableCell>
            <TableCell>{props.host}</TableCell>
            <TableCell>{props.user}</TableCell>
            <TableCell>{props.domain}</TableCell>
            <TableCell>{props.os}({props.architecture})</TableCell>
            <TableCell>{props.pid}</TableCell>
            <TableCell>{displayTime}</TableCell>
            <TableCell>{props.description}</TableCell>
            <TableCell><SnoozeIcon onClick={(evt)=>{evt.stopPropagation();setOpenSleepDialog(true);}} style={{color: props.sleep_info === "" ? muiTheme.palette.warning.main : muiTheme.palette.info.main}}/></TableCell>
            <TableCell>{props.payload.payloadtype.ptype}</TableCell>
            <TableCell>{hasOwnEgressRoute() ? 
                <WifiIcon onClick={(evt)=>{evt.stopPropagation();setOpenC2Dialog(true);}} style={{color: activeEgress}}/> : 
                <InsertLinkTwoToneIcon onClick={(evt)=>{evt.stopPropagation();setOpenC2Dialog(true);}} style={{color: activeEgress}} />
                }
            </TableCell>
        </EnhancedTableRow>
        <MythicDialog fullWidth={true} maxWidth="lg" open={openC2Dialog}
                    onClose={()=>{setOpenC2Dialog(false);}} 
                    innerDialog={<C2PathDialog onClose={()=>{setOpenC2Dialog(false);}} {...props} callbackgraphedges={activeEgressBool ? callbackgraphedges : callbackgraphedgesAll} />}
                />
        <MythicDisplayTextDialog onClose={()=>{setOpenSleepDialog(false);}} title={"Sleep Information"} maxWidth={"md"} fullWidth={true} value={props.sleep_info} open={openSleepDialog}/>
    </React.Fragment>
    )
}

