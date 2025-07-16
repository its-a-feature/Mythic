import React, {useRef} from 'react';
import {Button} from '@mui/material';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {DetailedPayloadComparisonTable, DetailedPayloadTable} from './DetailedPayloadTable';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import {PayloadDescriptionDialog} from './PayloadDescriptionDialog';
import {PayloadFilenameDialog} from './PayloadFilenameDialog';
import {PayloadBuildMessageDialog} from './PayloadBuildMessageDialog';
import {PayloadsTableRowC2Status} from './PayloadsTableRowC2Status';
import {PayloadsTableRowBuildStatus} from './PayloadsTableRowBuildStatus';
import {PayloadConfigCheckDialog} from './PayloadConfigCheckDialog';
import {PayloadRedirectRulesDialog} from './PayloadRedirectRulesDialog';
import InfoIconOutline from '@mui/icons-material/InfoOutlined';
import {useMutation, gql, useLazyQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {PayloadsTableRowBuildProgress} from './PayloadsTableRowBuildProgress';
import {b64DecodeUnicode} from '../Callbacks/ResponseDisplay';
import {CreateNewCallbackDialog} from './CreateNewCallbackDialog';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MessageIcon from '@mui/icons-material/Message';
import ErrorIcon from '@mui/icons-material/Error';
import CachedIcon from '@mui/icons-material/Cached';
import VerifiedIcon from '@mui/icons-material/Verified';
import AddIcCallIcon from '@mui/icons-material/AddIcCall';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import BiotechIcon from '@mui/icons-material/Biotech';
import {PayloadGetIOCDialog} from "./PayloadGetIOCDialog";
import {PayloadGetSampleMessageDialog} from "./PayloadGetSampleMessageDialog";
import IosShareIcon from '@mui/icons-material/IosShare';
import {TagsDisplay, ViewEditTags} from "../../MythicComponents/MythicTag";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import SmartToyTwoToneIcon from '@mui/icons-material/SmartToyTwoTone';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import BlockIcon from '@mui/icons-material/Block';
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined';
import {EditPayloadConfigDialog} from "./EditPayloadConfigDialog";
import DifferenceIcon from '@mui/icons-material/Difference';

const rebuildPayloadMutation = gql`
mutation triggerRebuildMutation($uuid: String!) {
  rebuild_payload(uuid: $uuid) {
      status
      error
      uuid
  }
}
`;

export const exportPayloadConfigQuery = gql`
query exportPayloadConfigQuery($uuid: String!) {
  exportPayloadConfig(uuid: $uuid) {
      status
      error 
      config 
  }
}
`;

export function PayloadsTableRow(props){
    const [viewError, setViewError] = React.useState(true);
    const [openUpdate, setOpenUpdateDialog] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const [openDescription, setOpenDescriptionDialog] = React.useState(false);
    const [openFilename, setOpenFilenameDialog] = React.useState(false);
    const [openBuildMessage, setOpenBuildMessageDialog] = React.useState(false);
    const [openDetailedView, setOpenDetailedView] = React.useState(false);
    const [openConfigCheckDialog, setOpenConfigCheckDialog] = React.useState(false);
    const [openRedirectRulesDialog, setOpenRedirectRulesDialog] = React.useState(false);
    const [openCreateNewCallbackDialog, setOpenCreateNewCallbackDialog] = React.useState(false);
    const [openGenerateIOCDialog, setOpenGenerateIOCDialog] = React.useState(false);
    const [openGenerateSampleMessageDialog, setOpenGenerateSampleMessageDialog] = React.useState(false);
    const [openEditPayloadConfigDialog, setOpenEditPayloadConfigDialog] = React.useState(false);
    const [openComparePayloadsDialog, setOpenComparePayloadsDialog] = React.useState(false);
    const dropdownAnchorRef = useRef(null);
    const [triggerRebuild] = useMutation(rebuildPayloadMutation, {
      onCompleted: (data) => {
        if(data.rebuild_payload.status === "success"){
          snackActions.success("Successfully triggered rebuild");
        } else {
          snackActions.error("Failed to build:\n" + data.rebuild_payload.error);
        }
        
      },
      onError: (data) => {
        snackActions.error("Failed to trigger rebuild: " + data);
      }
    });
    
    const [exportConfig] = useLazyQuery(exportPayloadConfigQuery, {
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
        //console.log(data)
        if(data.exportPayloadConfig.status === "success"){
          const dataBlob = new Blob([data.exportPayloadConfig.config], {type: 'text/plain'});
          const ele = document.getElementById("download_config");
          if(ele !== null){
            ele.href = URL.createObjectURL(dataBlob);
            ele.download = b64DecodeUnicode(props.filemetum.filename_text) + ".json";
            ele.click();
          }else{
            const element = document.createElement("a");
            element.id = "download_config";
            element.href = URL.createObjectURL(dataBlob);
            element.download = b64DecodeUnicode(props.filemetum.filename_text) + ".json";
            document.body.appendChild(element);
            element.click();
          }
        }else{
          snackActions.error("Failed to export configuration: " + data.exportPayloadConfig.error);
        }
      },
      onError: (data) => {
        console.log(data);
        snackActions.error("Failed to export configuration: " + data.message)
      }
    })
    const onAlertChanged = () => {
        const {uuid: payload_uuid, callback_alert} = props;
        props.onAlertChanged(payload_uuid, !callback_alert);
    }
    const onAcceptDelete = () => {
        if(props.deleted){
            props.onRestorePayload(props.uuid);
            setOpenDeleteDialog(false);
        }else{
            props.onDeletePayload(props.uuid);
            setOpenDeleteDialog(false);
        }
    }
    const onCallbacksAllowedChanged = () =>[
        props.onCallbacksAllowedChanged(props.uuid, !props.callback_allowed)
    ]
    const handleMenuItemClick = (event, index) => {
        options[index].click();
        setOpenUpdateDialog(false);
    };
    const options = [
                    {name: <><DriveFileRenameOutlineIcon style={{marginRight: "10px"}}/> {"Rename File"}</> , click: () => {
                        setOpenFilenameDialog(true);
                     }},
                     {name: <><DescriptionIcon color={"info"} style={{marginRight: "10px"}} />{'Edit Description'}</>, click: () => {
                        setOpenDescriptionDialog(true);
                     }},
                    {name: <><InfoIconOutline color={"info"} style={{marginRight: "10px"}} /> View Payload Configuration</>, click: () => {
                            setOpenDetailedView(true);
                        }},
                    {name: <><DifferenceIcon color={"info"} style={{marginRight: "10px"}} /> Compare Payload Configuration</>, click: () => {
                            setOpenComparePayloadsDialog(true);
                        }},
                     {name: props.callback_alert ?
                             <><VisibilityIcon color={"success"} style={{marginRight: "10px"}}  />{'Alerting to New Callbacks'}</> :
                             <><VisibilityOffIcon color={"error"} style={{marginRight: "10px"}}  />{"Not Alerting to New Callbacks"}</>,
                         click: () => {
                        onAlertChanged();
                      }},
                    {name: props.callback_allowed ?
                            <><VisibilityIcon color={"success"} style={{marginRight: "10px"}}  />{'Allowing New Callbacks from this Payload'}</> :
                            <><VisibilityOffIcon color={"error"} style={{marginRight: "10px"}}  />{"Preventing New Callbacks from this Payload"}</>,
                        click: () => {
                            onCallbacksAllowedChanged();
                        }},
                     {name: <><MessageIcon style={{marginRight: "10px"}}  />{'View Build Message/Stdout'} </> , click: () => {
                         setViewError(false);
                        setOpenBuildMessageDialog(true);
                    }},
                    {name: <><ErrorIcon color={"error"} style={{marginRight: "10px"}}  />{'View Build Errors'}</>, click: () => {
                       setViewError(true);
                       setOpenBuildMessageDialog(true);
                    }},
                    {name: <><CachedIcon color={"success"} style={{marginRight: "10px"}} />{'Trigger New Build'}</>, click: () => {
                      triggerRebuild({variables: {uuid: props.uuid}});
                    }},
                    {name: <><CachedIcon color={"success"} style={{marginRight: "10px"}} />{'Trigger New Build With Edits'}</>, click: () => {
                            setOpenEditPayloadConfigDialog(true);
                    }},
                    {name: <><IosShareIcon color={"info"} style={{marginRight: "10px"}} />{'Export Payload Config'}</>, click: () => {
                      exportConfig({variables: {uuid: props.uuid}});
                    }},
                    {name: <><PhoneMissedIcon style={{marginRight: "10px"}} />{'Generate Redirect Rules'}</>, click: () => {
                      setOpenRedirectRulesDialog(true);
                    }},
                    {name: <><VerifiedIcon style={{marginRight: "10px"}} />{'Check Agent C2 Configuration'}</>, click: () => {
                        setOpenConfigCheckDialog(true);
                    }},
                    {name: <><FingerprintIcon style={{marginRight: "10px"}} />{'Generate IOCs'}</>, click: () => {
                        setOpenGenerateIOCDialog(true);
                    }},
                    {name: <><BiotechIcon style={{marginRight: "10px"}} />{'Generate Sample Message'}</>, click: () => {
                        setOpenGenerateSampleMessageDialog(true);
                    }},
                    {name: <><AddIcCallIcon color={"success"} style={{marginRight: "10px"}} />{'Generate Fake Callback'}</>, click: () => {
                      setOpenCreateNewCallbackDialog(true);
                    }},
                    {name:<>
                            {props.deleted ? (
                                <>
                                    <RestoreFromTrashIcon color={"success"} style={{marginRight: "10px"}} />
                                    Restore Payload
                                </>

                            ) : (
                                <React.Fragment>
                                    <DeleteIcon color={"error"} style={{marginRight: "10px"}}/>
                                    Delete the payload from disk
                                </React.Fragment>
                            )}</>, click: () => {
                            setOpenDeleteDialog(true);
                        }}
                     ]
    ;
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }
        setOpenUpdateDialog(false);
      };
    
    const shouldDisplay = React.useMemo(() => {
      if(!props.deleted){
        return true;
      }else if(props.deleted && props.showDeleted){
        return true
      }else {
        return false; // we're either deleted or auto generated and we aren't showing those
      }
    }, [props.deleted, props.showDeleted]);
    return (
      shouldDisplay ? (
        <React.Fragment>
            <TableRow key={"payload" + props.uuid} hover>
                <MythicStyledTableCell>
                    <Button ref={dropdownAnchorRef} size="small" onClick={()=>{setOpenUpdateDialog(true);}} >
                        Actions <ArrowDropDownIcon />
                    </Button>
                {openUpdate &&
                    <Popper open={openUpdate} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal style={{zIndex: 4}}>
              {({ TransitionProps, placement }) => (
                <Grow
                  {...TransitionProps}
                  style={{
                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                  }}
                >
                  <Paper className={"dropdownMenuColored"}>
                    <ClickAwayListener onClickAway={handleClose} mouseEvent={"onMouseDown"}>
                      <MenuList id="split-button-menu"  >
                        {options.map((option, index) => (
                          <MenuItem
                            key={index + props.uuid}
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
                }
                {openDescription &&
                    <MythicDialog fullWidth={true} maxWidth="md" open={openDescription} 
                        onClose={()=>{setOpenDescriptionDialog(false);}} 
                        innerDialog={<PayloadDescriptionDialog payload_uuid={props.uuid} payload_id={props.id} onClose={()=>{setOpenDescriptionDialog(false);}} />}
                    />
                }
                {openFilename &&
                    <MythicDialog fullWidth={true} maxWidth="md" open={openFilename} 
                        onClose={()=>{setOpenFilenameDialog(false);}} 
                        innerDialog={<PayloadFilenameDialog payload_id={props.id} onClose={()=>{setOpenFilenameDialog(false);}} />}
                    />
                }
                {openBuildMessage &&
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openBuildMessage} 
                        onClose={()=>{setOpenBuildMessageDialog(false);}} 
                        innerDialog={<PayloadBuildMessageDialog payload_id={props.id} viewError={viewError} onClose={()=>{setOpenBuildMessageDialog(false);}} />}
                    />
                }
                {openConfigCheckDialog &&
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openConfigCheckDialog} 
                        onClose={()=>{setOpenConfigCheckDialog(false);}} 
                        innerDialog={<PayloadConfigCheckDialog uuid={props.uuid} onClose={()=>{setOpenConfigCheckDialog(false);}} />}
                    />
                }
                {openRedirectRulesDialog &&
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openRedirectRulesDialog} 
                        onClose={()=>{setOpenRedirectRulesDialog(false);}} 
                        innerDialog={<PayloadRedirectRulesDialog uuid={props.uuid} onClose={()=>{setOpenRedirectRulesDialog(false);}} />}
                    />
                }
                {openGenerateIOCDialog &&
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openGenerateIOCDialog}
                                  onClose={()=>{setOpenGenerateIOCDialog(false);}}
                                  innerDialog={<PayloadGetIOCDialog uuid={props.uuid} onClose={()=>{setOpenGenerateIOCDialog(false);}} />}
                    />
                }
                {openGenerateSampleMessageDialog &&
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openGenerateSampleMessageDialog}
                                  onClose={()=>{setOpenGenerateSampleMessageDialog(false);}}
                                  innerDialog={<PayloadGetSampleMessageDialog uuid={props.uuid} onClose={()=>{setOpenGenerateSampleMessageDialog(false);}} />}
                    />
                }
                
                {openCreateNewCallbackDialog &&
                  <MythicDialog fullWidth={true} maxWidth="lg" open={openCreateNewCallbackDialog} 
                      onClose={()=>{setOpenCreateNewCallbackDialog(false);}} 
                      innerDialog={<CreateNewCallbackDialog uuid={props.uuid} filename={b64DecodeUnicode(props.filemetum.filename_text)} onClose={()=>{setOpenCreateNewCallbackDialog(false);}} />}
                  />
                }
                {openComparePayloadsDialog &&
                    <MythicDialog fullWidth={true} maxWidth="xl" open={openComparePayloadsDialog}
                                  onClose={()=>{setOpenComparePayloadsDialog(false);}}
                                  innerDialog={<DetailedPayloadComparisonTable {...props} payload_id={props.id} onClose={()=>{setOpenComparePayloadsDialog(false);}} />}
                    />
                }
                {openDelete &&
                    <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}}
                                         onSubmit={onAcceptDelete} open={openDelete}
                    dialogText={!props.deleted? "Delete the payload from disk and mark as deleted. No new callbacks can be generated from this payload" :
                    "Mark payload as not deleted so you can get callbacks, but does not recreate the payload on disk"}
                    acceptText={props.deleted? "Restore" : "Remove"}
                    acceptColor={props.deleted? "success": "error"}/>
                }
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <MythicStyledTooltip title={props.payloadtype.name} tooltipStyle={{display: "inline-block"}}>
                        <MythicAgentSVGIcon payload_type={props.payloadtype.name} style={{width: "35px", height: "35px"}} />
                    </MythicStyledTooltip>
                    {!props.callback_allowed &&
                        <MythicStyledTooltip title={"No new Callbacks allowed from this payload"}
                                             tooltipStyle={{display: 'inline-block', position: "relative",
                                                 top: "3px", left: "-10px", height: 0, width: 0
                        }}>
                            <BlockIcon fontSize={"small"} color={"error"} style={{backgroundColor: "white", borderRadius: "10px"}} />
                        </MythicStyledTooltip>
                    }
                    {!props.callback_alert &&
                        <MythicStyledTooltip title={"No Callback Alerts"}
                                             tooltipStyle={{display: 'inline-block', position: "relative",
                                                 top: "3px", left: "-45px", height: 0, width: 0
                                             }}>
                            <NotificationsOffOutlinedIcon fontSize={"small"} color={"error"} style={{backgroundColor: "white", borderRadius: "10px"}} />
                        </MythicStyledTooltip>
                    }
                </MythicStyledTableCell>
                <MythicStyledTableCell style={{wordBreak: "break-all"}}>
                    {props.auto_generated && props.task &&
                        <MythicStyledTooltip title={"This payload was auto generated by a task"} >
                            <IconButton href={"/new/task/" + props?.task?.display_id} target={"_blank"} >
                                <SmartToyTwoToneIcon />
                            </IconButton>
                        </MythicStyledTooltip>
                    }
                    {b64DecodeUnicode(props.filemetum.filename_text)}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                        <PayloadsTableRowBuildStatus {...props} />
                        <PayloadsTableRowBuildProgress {...props} />
                </MythicStyledTableCell>
                <MythicStyledTableCell style={{wordBreak: "break-all"}}>{props.description}</MythicStyledTableCell>
                <MythicStyledTableCell>
                    <PayloadsTableRowC2Status payloadc2profiles={props.payloadc2profiles} uuid={props.uuid} />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <ViewEditTags target_object={"payload_id"} target_object_id={props.id} me={props.me} />
                    <TagsDisplay tags={props.filemetum.tags} />
                    <TagsDisplay tags={props.tags} />
                </MythicStyledTableCell>
            </TableRow>
            {openDetailedView &&
              <MythicDialog fullWidth={true} maxWidth="lg" open={openDetailedView}
                  onClose={()=>{setOpenDetailedView(false);}} 
                  innerDialog={<DetailedPayloadTable {...props} payload_id={props.id} onClose={()=>{setOpenDetailedView(false);}} />}
              />}
            {openEditPayloadConfigDialog &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openEditPayloadConfigDialog}
                              onClose={()=>{setOpenEditPayloadConfigDialog(false);}}
                              innerDialog={<EditPayloadConfigDialog uuid={props.uuid} onClose={()=>{setOpenEditPayloadConfigDialog(false);}} />}
                />
            }
        </React.Fragment>
      ) : null
    )
}

