import React, {useEffect} from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { toLocalTime } from '../../utilities/Time';
import {useTheme} from '@mui/material/styles';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {MythicModifyStringDialog} from '../../MythicComponents/MythicDialog';
import { meState } from '../../../cache';
import {useReactiveVar, useMutation} from '@apollo/client';
import {
    CallbacksTableC2Cell,
    CallbacksTableLastCheckinCell,
    CallbacksTableSleepCell
} from "../Callbacks/CallbacksTableRow";
import {updateSleepInfoCallbackMutation} from "../Callbacks/CallbackMutations";
import {snackActions} from "../../utilities/Snackbar";
import {TagsDisplay, ViewEditTags} from "../../MythicComponents/MythicTag";

export function ExpandedCallbackSideDetails(props){
    const theme = useTheme();
    return (
        <div style={{ width: "100%", height: "100%", overflowY: "scroll" }}>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main, marginBottom: "5px"}}
                   variant={"elevation"}>
                <Typography variant="h5" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    Callback {props.callback.display_id}
                </Typography>
            </Paper>
            <ExpandedCallbackSideDetailsTable {...props.callback} />
        </div>
    )
}


export function ExpandedCallbackSideDetailsTable(props){
    const me = useReactiveVar(meState);
    const [openEditDescriptionDialog, setOpenEditDescriptionDialog] = React.useState(false);
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
    return (
        <Table size="small" style={{tableLayout: "fixed"}}>
            <TableHead>
                <TableRow>
                    <TableCell style={{width: "12rem"}}></TableCell>
                    <TableCell></TableCell>
                </TableRow>
            </TableHead>
            <TableBody style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
                <TableRow hover>
                    <TableCell>Elevation Level</TableCell>
                    <TableCell>{props.integrity_level}
                        {props.integrity_level === 4 ? (" ( SYSTEM Integrity )") : ""}
                        {props.integrity_level === 3 ? (" ( High Integrity )") : ""}
                        {props.integrity_level === 2 ? (" ( Medium Integrity ) ") : ""}
                        {props.integrity_level === 1 ? (" ( Low Integrity )") : ""}
                        {props.integrity_level === 0 ? (" ( UNKNOWN Integrity )") : ""}
                    </TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>Callback Lock Status</TableCell>
                    <TableCell>
                        {props.locked ? (
                            <React.Fragment>
                                <LockIcon style={{paddingRight: "5px", display: "inline-block", paddingTop: "6px"}}/>
                                <Typography style={{display: "inline-block"}}>
                                    {'Locked (by ' + props.locked_operator.username + ')'}
                                </Typography>
                            </React.Fragment>
                        ) : (
                            <React.Fragment>
                                <LockOpenIcon style={{paddingRight: "5px", display: "inline-block", paddingTop: "6px"}}/>

                                <Typography style={{display: "inline-block"}}>
                                    {'Unlocked'}
                                </Typography>
                            </React.Fragment>
                        )}
                    </TableCell>
                </TableRow>
                <TableRow hover >
                    <TableCell>IP Address</TableCell>
                    <TableCell>{JSON.parse(props.ip).map(c => c + "\n")}</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>External IP</TableCell>
                    <TableCell>{props.external_ip}</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>Host</TableCell>
                    <TableCell>{props.host}</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>User</TableCell>
                    <TableCell>{props.user}</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>Domain</TableCell>
                    <TableCell>{props.domain}</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>OS / Architecture</TableCell>
                    <TableCell >{props.os}({props.architecture})</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>Process ID</TableCell>
                    <TableCell>{props.pid}</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>Last Checkin</TableCell>
                    <TableCell>
                        <CallbacksTableLastCheckinCell rowData={props} cellData={props.last_checkin} />
                    </TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>First Checkin</TableCell>
                    <TableCell>{toLocalTime(props.init_callback, me?.user?.view_utc_time || false)}</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>Description</TableCell>
                    <TableCell>{props.description}</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>Sleep Info</TableCell>
                    <TableCell>
                        <CallbacksTableSleepCell rowData={props} cellData={props.sleep_info} updateSleepInfo={updateSleepInfo} />
                    </TableCell>

                </TableRow>
                <TableRow hover>
                    <TableCell>Agent Type</TableCell>
                    <TableCell>{props.payload.payloadtype.name}</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>Egress Route</TableCell>
                    <TableCell>
                        <CallbacksTableC2Cell rowData={props} />
                    </TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>Process Name</TableCell>
                    <TableCell>{props.process_name}</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>Current Working Directory</TableCell>
                    <TableCell>{props.cwd}</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>Impersonation Context</TableCell>
                    <TableCell>{props.impersonation_context}</TableCell>
                </TableRow>
                <MythicDialog fullWidth={true} open={openEditDescriptionDialog}
                              onClose={() => {setOpenEditDescriptionDialog(false);}}
                    innerDialog={
                        <MythicModifyStringDialog title={"Edit Callback's Description"}
                                                  onClose={() => {setOpenEditDescriptionDialog(false);}}
                                                  value={props.description}
                                                  onSubmit={() => {}} />
                    }
                    />
                <TableRow hover>
                    <TableCell>Extra Info</TableCell>
                    <TableCell>{props.extra_info}</TableCell>
                </TableRow>
                <TableRow hover>
                    <TableCell>Groups</TableCell>
                    <TableCell>{props.mythictree_groups.join(", ")}</TableCell>
                </TableRow>
                {props.enc_key_base64 !== undefined ? (
                    <TableRow hover>
                        <TableCell>Encryption Keys</TableCell>
                        <TableCell>
                            {props.crypto_type}
                            {props.enc_key_base64 === null ? null : (
                                <React.Fragment>
                                <br/><b>Encryption Key: </b> {props.enc_key_base64}
                                </React.Fragment>
                                )
                            }
                            {props.dec_key_base64 === null ? null : (
                                <React.Fragment>
                                <br/><b>Decryption Key: </b> {props.dec_key_base64}
                                </React.Fragment>
                            )
                            }
                        </TableCell>
                    </TableRow>
                ) : null}
                <TableRow>
                    <TableCell>Callback ID / Display ID</TableCell>
                    <TableCell>{props.id} / {props.display_id}</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Agent Callback ID</TableCell>
                    <TableCell>{props.agent_callback_id}</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Tags</TableCell>
                    <TableCell>
                        <ViewEditTags target_object={"callback_id"} target_object_id={props.id} />
                        <TagsDisplay tags={props.tags} />
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    )
}
