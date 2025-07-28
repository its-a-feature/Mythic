import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material/styles';
import PublicIcon from '@mui/icons-material/Public';
import {IconButton} from '@mui/material';
import {gql, useMutation} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';
import {MythicConfirmDialog} from "../../MythicComponents/MythicConfirmDialog";
import PermIdentityTwoToneIcon from '@mui/icons-material/PermIdentityTwoTone';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import AttachFileIcon from '@mui/icons-material/AttachFile';
import {ConsumingServicesGetIDPMetadataDialog} from "./ConsumingServicesGetIDPMetadataDialog";
import {C2ProfileListFilesDialog} from "../PayloadTypesC2Profiles/C2ProfileListFilesDialog";
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';

const testWebhookMutation = gql`
mutation testWebhookWorks($service_type: String!){
    consumingServicesTestWebhook(service_type: $service_type){
        status
        error
    }
}
`;
const testLogMutation = gql`
mutation testWebhookWorks($service_type: String!){
    consumingServicesTestLog(service_type: $service_type){
        status
        error
    }
}
`;
const toggleDeleteStatus = gql`
mutation toggleConsumingContainerDeleteStatus($id: Int!, $deleted: Boolean!){
  update_consuming_container_by_pk(pk_columns: {id: $id}, _set: {deleted: $deleted}) {
    id
  }
}
`;
const webhook_events = ["new_alert","new_callback","new_custom","new_feedback", "new_startup"];
const logging_events = ["new_artifact","new_callback", "new_credential","new_file", "new_keylog",  "new_payload", "new_response", "new_task"];

export const ConsumingServicesTableRow = ({service, showDeleted}) => {
    const theme = useTheme();
    const openListFilesInformation = React.useRef("");
    const [testWebhook] = useMutation(testWebhookMutation, {
        onCompleted: data => {
            if (data.consumingServicesTestWebhook.status === "success") {
                snackActions.success("Successfully sent test message to service");
            } else {
                console.log(data.consumingServicesTestWebhook.error)
                snackActions.error("No webhook listening")
            }

        },
        onError: error => {

        }
    });
    const issueTestWebhook = (service_type) => {
        testWebhook({variables: {service_type: service_type}});
    }
    const [testLog] = useMutation(testLogMutation, {
        onCompleted: data => {
            if (data.consumingServicesTestLog.status === "success") {
                snackActions.success("Successfully sent test message to service");
            } else {
                snackActions.error("No logger listening")
                console.log(data.consumingServicesTestLog.error)
            }

        },
        onError: error => {

        }
    });
    const issueTestLog = (service_type) => {
        testLog({variables: {service_type: service_type}});
    }
    const [openIDPMetadata, setOpenIDPMetadata] = React.useState(false);
    const IDPMetadataRef = React.useRef({"container": "", "idp": ""});
    const [openListFilesDialog, setOpenListFilesDialog] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const deletingContainer = React.useRef({});
    const getIDPMetadata = (container, idp) => {
        IDPMetadataRef.current = {"container": container, "idp": idp};
        setOpenIDPMetadata(true);
    }
    const [updateDeleted] = useMutation(toggleDeleteStatus, {
        onCompleted: data => {
            snackActions.success("Successfully updated");
        },
        onError: error => {
            console.log(error);
            snackActions.error("Failed to update: " + error.message);
        }
    });
    const onAcceptDelete = () => {
        updateDeleted({variables: {id: deletingContainer.current.id, deleted: !deletingContainer.current.deleted}})
        setOpenDeleteDialog(false);
    }
    const adjustingDelete = (service) => {
        deletingContainer.current = service;
        setOpenDeleteDialog(true);
    }
    const [localData, setLocalData] = React.useState({...service, subscriptions: []});
    const onOpenListFilesDialog = (container) => {
        openListFilesInformation.current = container;
        setOpenListFilesDialog(true);
    }
    React.useEffect(() => {
        switch(service.type){
            case "webhook":
            case "logging":
                setLocalData({...service});
                break;
            case "eventing":
                try{
                    const newSubs = service.subscriptions.map( s => {
                        try{
                            return JSON.parse(s);
                        }catch(error){
                            console.log(error);
                            return {name: "", description: s};
                        }
                    });
                    setLocalData({...service, subscriptions: newSubs});
                }catch(error){

                }
                break;
            case "auth":
                try{
                    const newSubs = service.subscriptions.map( s => {
                        try{
                            return JSON.parse(s);
                        }catch(error){
                            console.log(error);
                            return {name: s, type: ""};
                        }
                    });
                    setLocalData({...service, subscriptions: newSubs});
                }catch(error){

                }
                break;
            default:
        }
    }, [service]);
    const getTableRow = (w) => {
        switch(service.type){
            case "webhook":
                return (
                    (showDeleted || !w.deleted) &&
                    <TableRow key={w.id} hover>
                        <MythicTableCell>
                            {w.deleted ? (
                                <IconButton onClick={() => {
                                    adjustingDelete(w);
                                }} color="success" size="medium">
                                    <RestoreFromTrashOutlinedIcon/>
                                </IconButton>
                            ) : (
                                <IconButton onClick={() => {
                                    adjustingDelete(w);
                                }} color="error" size="medium">
                                    <DeleteIcon/>
                                </IconButton>
                            )}
                        </MythicTableCell>
                        <MythicTableCell>
                            <Typography variant={"h5"}>
                                {w.name}
                            </Typography>
                            <Typography variant={"body"}>
                                <b>Type: </b>{w.type}
                            </Typography>
                            <Typography variant={"body2"}>
                                <b>Description: </b>{w.description}
                            </Typography>

                            {w.container_running &&
                                <Typography variant="body2" component="p"
                                            style={{color: theme.palette.success.main}}>
                                    <b>{"Online"}</b>
                                </Typography>
                            }
                            {!w.container_running &&
                                <Typography variant="body2" component="p"
                                            style={{color: theme.palette.error.main}}>
                                    <b>{"Offline"}</b>
                                </Typography>
                            }
                        </MythicTableCell>
                        <MythicTableCell>
                            <MythicStyledTooltip title={w.container_running ? "View Files" : "Unable to view files since container is offline"}>
                                <IconButton
                                    color={"secondary"}
                                    disabled={!w.container_running}
                                    onClick={()=>{onOpenListFilesDialog(w.name);}}
                                    size="medium">
                                    <AttachFileIcon />
                                </IconButton>
                            </MythicStyledTooltip>
                        </MythicTableCell>
                        <MythicTableCell>
                            {webhook_events.map(s => (
                                <MythicStyledTooltip title={"test webhook " + s} key={w.id + "webhook_" + s}>
                                    <IconButton
                                        disabled={!w.subscriptions.includes(s) || !w.container_running}
                                        onClick={() => {
                                            issueTestWebhook(s)
                                        }}
                                        size="medium">
                                        <PublicIcon/>
                                    </IconButton>
                                </MythicStyledTooltip>
                            ))}
                        </MythicTableCell>
                    </TableRow>
                )
            case "logging":
                return (
                    (showDeleted || !w.deleted) &&
                    <TableRow key={w.id} hover>
                        <MythicTableCell>
                            {w.deleted ? (
                                <IconButton onClick={() => {
                                    adjustingDelete(w);
                                }} color="success" size="medium">
                                    <RestoreFromTrashOutlinedIcon/>
                                </IconButton>
                            ) : (
                                <IconButton onClick={() => {
                                    adjustingDelete(w);
                                }} color="error" size="medium">
                                    <DeleteIcon/>
                                </IconButton>
                            )}
                        </MythicTableCell>
                        <MythicTableCell>
                            <Typography variant={"h5"}>
                                {w.name}
                            </Typography>
                            <Typography variant={"body"}>
                                <b>Type: </b>{w.type}
                            </Typography>
                            <Typography variant={"body2"}>
                                <b>Description: </b>{w.description}
                            </Typography>
                            {w.container_running &&
                                <Typography variant="body2" component="p"
                                            style={{color: theme.palette.success.main}}>
                                    <b>{"Online"}</b>
                                </Typography>
                            }
                            {!w.container_running &&
                                <Typography variant="body2" component="p"
                                            style={{color: theme.palette.error.main}}>
                                    <b>{"Offline"}</b>
                                </Typography>
                            }
                        </MythicTableCell>
                        <MythicTableCell>
                            <MythicStyledTooltip title={w.container_running ? "View Files" : "Unable to view files since container is offline"}>
                                <IconButton
                                    color={"secondary"}
                                    disabled={!w.container_running}
                                    onClick={()=>{onOpenListFilesDialog(w.name);}}
                                    size="medium">
                                    <AttachFileIcon />
                                </IconButton>
                            </MythicStyledTooltip>
                        </MythicTableCell>
                        <MythicTableCell>
                            {logging_events.map(s => (
                                <MythicStyledTooltip title={"test logging " + s} key={w.id + "logging_" + s}>
                                    <IconButton
                                        disabled={!w.subscriptions.includes(s) || !w.container_running}
                                        onClick={() => {
                                            issueTestLog(s)
                                        }}
                                        size="medium">
                                        <SyncAltIcon/>
                                    </IconButton>
                                </MythicStyledTooltip>
                            ))}
                        </MythicTableCell>
                    </TableRow>
                )
            case "eventing":
                return (
                    (showDeleted || !w.deleted) &&
                    <TableRow key={w.id} hover>
                        <MythicTableCell>
                            {w.deleted ? (
                                <IconButton onClick={() => {
                                    adjustingDelete(w);
                                }} color="success" size="medium">
                                    <RestoreFromTrashOutlinedIcon/>
                                </IconButton>
                            ) : (
                                <IconButton onClick={() => {
                                    adjustingDelete(w);
                                }} color="error" size="medium">
                                    <DeleteIcon/>
                                </IconButton>
                            )}
                        </MythicTableCell>
                        <MythicTableCell>
                            <Typography variant={"h5"}>
                                {w.name}
                            </Typography>
                            <Typography variant={"body"}>
                                <b>Type: </b>{w.type}
                            </Typography>
                            <Typography variant={"body2"}>
                                <b>Description: </b>{w.description}
                            </Typography>
                            {w.container_running &&
                                <Typography variant="body2" component="p"
                                            style={{color: theme.palette.success.main}}>
                                    <b>{"Online"}</b>
                                </Typography>
                            }
                            {!w.container_running &&
                                <Typography variant="body2" component="p"
                                            style={{color: theme.palette.error.main}}>
                                    <b>{"Offline"}</b>
                                </Typography>
                            }
                        </MythicTableCell>
                        <MythicTableCell>
                            <MythicStyledTooltip title={w.container_running ? "View Files" : "Unable to view files since container is offline"}>
                                <IconButton
                                    color={"secondary"}
                                    disabled={!w.container_running}
                                    onClick={()=>{onOpenListFilesDialog(w.name);}}
                                    size="medium">
                                    <AttachFileIcon />
                                </IconButton>
                            </MythicStyledTooltip>
                        </MythicTableCell>
                        <MythicTableCell>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Function</TableCell>
                                        <TableCell>Description</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {w.subscriptions.map(s => (
                                        <TableRow key={s.name} hover>
                                            <MythicTableCell><b>{s.name}</b></MythicTableCell>
                                            <MythicTableCell>{s.description}</MythicTableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                        </MythicTableCell>
                    </TableRow>
                )
            case "auth":
                return (
                    (showDeleted || !w.deleted) &&
                    <TableRow key={w.id} hover>
                        <MythicTableCell>
                            {w.deleted ? (
                                <IconButton onClick={() => {
                                    adjustingDelete(w);
                                }} color="success" size="medium">
                                    <RestoreFromTrashOutlinedIcon/>
                                </IconButton>
                            ) : (
                                <IconButton onClick={() => {
                                    adjustingDelete(w);
                                }} color="error" size="medium">
                                    <DeleteIcon/>
                                </IconButton>
                            )}
                        </MythicTableCell>
                        <MythicTableCell>
                            <Typography variant={"h5"}>
                                {w.name}
                            </Typography>
                            <Typography variant={"body"}>
                                <b>Type: </b>{w.type}
                            </Typography>
                            <Typography variant={"body2"}>
                                <b>Description: </b>{w.description}
                            </Typography>
                            {w.container_running &&
                                <Typography variant="body2" component="p"
                                            style={{color: theme.palette.success.main}}>
                                    <b>{"Online"}</b>
                                </Typography>
                            }
                            {!w.container_running &&
                                <Typography variant="body2" component="p"
                                            style={{color: theme.palette.error.main}}>
                                    <b>{"Offline"}</b>
                                </Typography>
                            }
                        </MythicTableCell>
                        <MythicTableCell>
                            <MythicStyledTooltip title={w.container_running ? "View Files" : "Unable to view files since container is offline"}>
                                <IconButton
                                    color={"secondary"}
                                    disabled={!w.container_running}
                                    onClick={()=>{onOpenListFilesDialog(w.name);}}
                                    size="medium">
                                    <AttachFileIcon />
                                </IconButton>
                            </MythicStyledTooltip>
                        </MythicTableCell>
                        <MythicTableCell>
                            {w.subscriptions.map(s => (
                                <Typography key={s.name + s.type + w.name} style={{display: "block"}}>
                                    <MythicStyledTooltip title={"Fetch Container Metadata"} >
                                        <IconButton onClick={() => getIDPMetadata(w.name, s.name)} >
                                            <PermIdentityTwoToneIcon />
                                        </IconButton>
                                    </MythicStyledTooltip>
                                    {s.name}
                                </Typography>
                            ))}
                        </MythicTableCell>
                    </TableRow>
                )
        }
    }
    return (
        <>
            {getTableRow(localData)}
            {openDelete &&
                <MythicConfirmDialog onClose={() => { setOpenDeleteDialog(false); }}
                                     onSubmit={onAcceptDelete}
                                     open={openDelete}
                                     acceptText={deletingContainer.current.deleted ? "Restore" : "Remove"}
                                     acceptColor={deletingContainer.current.deleted ? "success" : "error"}/>
            }
            {openListFilesDialog &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openListFilesDialog}
                              onClose={()=>{setOpenListFilesDialog(false);}}
                              innerDialog={<C2ProfileListFilesDialog container_name={openListFilesInformation.current}
                                                                     onClose={()=>{setOpenListFilesDialog(false);}} />}
                />
            }
            {openIDPMetadata &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openIDPMetadata}
                              onClose={()=>{setOpenIDPMetadata(false);}}
                              innerDialog={<ConsumingServicesGetIDPMetadataDialog
                                  container={IDPMetadataRef.current.container}
                                  idp={IDPMetadataRef.current.idp}
                                  onClose={()=>{setOpenIDPMetadata(false);}} />}
                />
            }
        </>

    )
}

