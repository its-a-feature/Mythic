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
import {snackActions} from '../../utilities/Snackbar';
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
import AccountTreeIcon from '@material-ui/icons/AccountTree';
import {useTheme} from '@material-ui/core/styles';

export function CallbacksTableRow(props){
    const dropdownAnchorRef = React.useRef(null);
    const theme = useTheme();
    const [displayTime, setDisplayTime] = React.useState("");
    const [activeEgress, setActiveEgress] = React.useState(theme.palette.success.main);
    const [activeEgressBool, setActiveEgressBool] = React.useState(true);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [openC2Dialog, setOpenC2Dialog] = React.useState(false);
    const [openSleepDialog, setOpenSleepDialog] = React.useState(false);
    const [callbackgraphedges, setCallbackgraphedges] = React.useState([]);
    const [callbackgraphedgesAll, setCallbackgraphedgesAll] = React.useState([]);
    const [shownColumns, setShownColumns] = React.useState([]);
    const handleDropdownToggle = (evt) => {
            evt.stopPropagation();
            setDropdownOpen((prevOpen) => !prevOpen);
      };
      useEffect( () => {
        if(props.shownColumns === undefined){
            setShownColumns([]);
        }else{
            setShownColumns(props.shownColumns);
        }
      }, [props.shownColumns]);
    const updateTime = (curTime) => {
        setDisplayTime(getTimeDifference(curTime));
    };
    useInterval( () => {
        updateTime(props.last_checkin);
    });
    const onOpenTab = (tabType) => {
        if(!activeEgressBool){
            snackActions.warning("Agent has no egress route! Re-link before tasking");
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
    
    useEffect( () => {
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
        const myActiveEdges = getEdges(true);
        const myEdges = getEdges(false);
        setCallbackgraphedges(myActiveEdges);
        setCallbackgraphedgesAll(myEdges);
    }, [props.callbackgraphedges, props.id]);
    
    useEffect( () => {
        //determine if there are any active routes left at all
        const activeRoutes = callbackgraphedges.filter( (edge) => {
            if(!edge.c2profile.is_p2p  && edge.end_timestamp === null){
                return true;
            }
            return false
        });
        if(activeRoutes.length === 0){
            setActiveEgress(theme.palette.error.main);
            setActiveEgressBool(false);
        }else{
            setActiveEgress(theme.palette.success.main);
            setActiveEgressBool(true);
        }
    }, [callbackgraphedges, theme.palette.success.main, theme.palette.error.main]);
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
                snackActions.success("Hiding callback");
            }else{
                snackActions.warning(data.updateCallback.error);
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
                     {name: 'File Browser', icon: <AccountTreeIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
                        evt.stopPropagation();
                        onOpenTab("fileBrowser");
                     }},
                     {name: 'Process Browser', icon: <AccountTreeIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
                        evt.stopPropagation();
                        onOpenTab("processBrowser");
                     }},
                 ];
    return (
    <React.Fragment>
        <EnhancedTableRow id={props.id} handleClick={props.handleClick} isItemSelected={props.isItemSelected(props.id)}> 
            {shownColumns.includes("id") ? (
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
                <Popper open={dropdownOpen} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal style={{zIndex: 4}}>
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
            ) : (null)}
            {shownColumns.includes("ip") ? (
                <TableCell>{props.ip}</TableCell>
            ) : (null)}
            {shownColumns.includes("host") ? (
                <TableCell>{props.host}</TableCell>
            ) : (null)}
            {shownColumns.includes("user") ? (
                <TableCell>{props.user}</TableCell>
            ) : (null)}
            {shownColumns.includes("domain") ? (
                <TableCell>{props.domain}</TableCell>
            ) : (null)}
            {shownColumns.includes("os") ? (
                <TableCell>{props.os}({props.architecture})</TableCell>
            ) : (null)}
            {shownColumns.includes("pid") ? (
                <TableCell>{props.pid}</TableCell>
            ) : (null)}
            {shownColumns.includes("last_checkin") ? (
            <TableCell>{displayTime}</TableCell>
            ) : (null)} 
            {shownColumns.includes("description") ? (
            <TableCell>{props.description}</TableCell>
            ) : (null)}
            {shownColumns.includes("sleep") ? (
            <TableCell><SnoozeIcon onClick={(evt)=>{evt.stopPropagation();setOpenSleepDialog(true);}} style={{color: props.sleep_info === "" ? theme.palette.warning.main : theme.palette.info.main}}/></TableCell>
            ) : (null)}
            {shownColumns.includes("type") ? (
            <TableCell>{props.payload.payloadtype.ptype}</TableCell>
            ) : (null)}
            {shownColumns.includes("c2") ? (
            <TableCell>{hasOwnEgressRoute() ? 
                <WifiIcon onClick={(evt)=>{evt.stopPropagation();setOpenC2Dialog(true);}} style={{color: activeEgress}}/> : 
                <InsertLinkTwoToneIcon onClick={(evt)=>{evt.stopPropagation();setOpenC2Dialog(true);}} style={{color: activeEgress}} />
                }
            </TableCell>
            ) : (null)}
            {shownColumns.includes("process_name") ? (
            <TableCell>{props.process_name}</TableCell>
            ) : (null)}
        </EnhancedTableRow>
        <MythicDialog fullWidth={true} maxWidth="lg" open={openC2Dialog}
                    onClose={()=>{setOpenC2Dialog(false);}} 
                    innerDialog={<C2PathDialog onClose={()=>{setOpenC2Dialog(false);}} {...props} callbackgraphedges={activeEgressBool ? callbackgraphedges : callbackgraphedgesAll} />}
                />
        <MythicDisplayTextDialog onClose={()=>{setOpenSleepDialog(false);}} title={"Sleep Information"} maxWidth={"md"} fullWidth={true} value={props.sleep_info} open={openSleepDialog}/>
    </React.Fragment>
    )
}

