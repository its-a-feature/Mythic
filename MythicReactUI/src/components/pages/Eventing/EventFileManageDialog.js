import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {useMutation, gql} from '@apollo/client';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';

import {snackActions} from "../../utilities/Snackbar";
import {UploadEventGroupFile} from "../../MythicComponents/MythicFileUpload";
import {b64DecodeUnicode} from "../Callbacks/ResponseDisplay";
import { updateFileDeleted} from "../Search/FileMetaTable";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {PreviewFileMediaDialog} from "../../MythicComponents/PreviewFileMedia";
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {faPhotoVideo} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import DeleteIcon from '@mui/icons-material/Delete';
import {IconButton, Link, Typography} from '@mui/material';
import {MythicConfirmDialog} from "../../MythicComponents/MythicConfirmDialog";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {MythicTableEmptyState} from "../../MythicComponents/MythicStateDisplay";

export function EventFileManageDialog({onClose, selectedEventGroup}) {

    const onFileChange = async (evt) => {
        for(let i = 0; i < evt.target.files.length; i++){
            let uploadStatus = await UploadEventGroupFile(evt.target.files[i], selectedEventGroup.id);
            if(uploadStatus.status === "error"){
                snackActions.error(uploadStatus.error);
            }
        }
    }
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">
                <div className="mythic-dialog-title-row">
                    <span>Add or Remove Files associated with this workflow</span>
                    <Button
                        className="mythic-table-row-action mythic-table-row-action-hover-success"
                        component="label"
                        size="small"
                        startIcon={<CloudUploadIcon fontSize="small" />}
                        variant="contained"
                    >
                        New Files
                        <input onChange={onFileChange} type="file" multiple hidden/>
                    </Button>
                </div>
            </DialogTitle>

            <DialogContent dividers={true} style={{maxHeight: "calc(70vh)"}}>
                <DialogContentText>
                    These files can be accessed via `workflow.filename` in a step's inputs.
                </DialogContentText>
                <TableContainer className="mythicElement">
                <Table>
                    <TableBody>
                        {selectedEventGroup.filemeta.length === 0 ? (
                            <MythicTableEmptyState
                                colSpan={1}
                                compact
                                title="No workflow files"
                                description="Uploaded files for this workflow will appear here."
                            />
                        ) : (
                            selectedEventGroup.filemeta.map( e => (
                                <EventFileManageDialogTableRow key={e.id} eventFile={e} />
                            ))
                        )}
                    </TableBody>
                </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions>
                <Button className="mythic-table-row-action" onClick={onClose} variant="contained">
                    Close
                </Button>
            </DialogActions>
        </React.Fragment>
    );
}

function EventFileManageDialogTableRow({eventFile}) {
    const [openDelete, setOpenDelete] = React.useState(false);
    const [openPreviewMediaDialog, setOpenPreviewMediaDialog] = React.useState(false);
    const [deleteFile] = useMutation(updateFileDeleted, {
        onCompleted: (data) => {
            snackActions.dismiss();
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to delete file");
        }
    });
    const onAcceptDelete = () => {
        deleteFile({variables: {file_id: eventFile.id}})
    }
    const onPreviewMedia = (event) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        setOpenPreviewMediaDialog(true);
    }
    return (
        <TableRow >
            <MythicStyledTableCell style={{display: "flex", alignItems: "baseline"}}>
                {eventFile.deleted ? null : (
                    <>
                        {openDelete &&
                            <MythicConfirmDialog onClose={() => {setOpenDelete(false);}} onSubmit={onAcceptDelete} open={openDelete}/>
                        }
                        <MythicStyledTooltip title={"Delete file"}>
                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={()=>{setOpenDelete(true);}}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </MythicStyledTooltip>
                        <MythicStyledTooltip title={"Preview Media"}>
                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small" onClick={onPreviewMedia}>
                                <FontAwesomeIcon icon={faPhotoVideo} />
                            </IconButton>
                        </MythicStyledTooltip>
                        {openPreviewMediaDialog &&
                            <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewMediaDialog}
                                          onClose={(e)=>{setOpenPreviewMediaDialog(false);}}
                                          innerDialog={<PreviewFileMediaDialog
                                              agent_file_id={eventFile.agent_file_id}
                                              filename={b64DecodeUnicode(eventFile.filename_text)}
                                              onClose={(e)=>{setOpenPreviewMediaDialog(false);}} />}
                            />
                        }
                    </>
                )}
            </MythicStyledTableCell>
            <MythicStyledTableCell style={{}}>
                {eventFile.deleted ? (
                    <Typography variant="body2" style={{wordBreak: "break-all"}}>{b64DecodeUnicode(eventFile.filename_text)}</Typography>
                ) : (
                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" + eventFile.agent_file_id}>{b64DecodeUnicode(eventFile.filename_text)}</Link>
                )
                }
            </MythicStyledTableCell>
        </TableRow>
    )
}
