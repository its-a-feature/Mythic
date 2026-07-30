import React, {useEffect} from 'react';
import {Link, Typography} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {snackActions} from '../../utilities/Snackbar';
import {MythicSnackDownload} from '../../MythicComponents/MythicSnackDownload';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import {toLocalTime} from '../../utilities/Time';
import DeleteIcon from '@mui/icons-material/Delete';
import ArchiveIcon from '@mui/icons-material/Archive';
import { gql, useMutation } from '@apollo/client';
import { ResponseDisplayScreenshotModal } from '../Callbacks/ResponseDisplayScreenshotModal';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {b64DecodeUnicode} from '../Callbacks/ResponseDisplay';
import Checkbox from '@mui/material/Checkbox';
import {HostFileDialog, HostedFileLocationsTable} from "../Payloads/HostFileDialog";
import {getStringSize} from '../Callbacks/ResponseDisplayTable';
import {PreviewFileMediaDialog} from "../../MythicComponents/PreviewFileMedia";
import {faPhotoVideo} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {ImageWithAuth} from "../../utilities/ImageWithAuth";
import {FileDownloadLinkWithAuth} from "../../utilities/FileDownloadWithAuth";
import {MythicActionButton} from "../../MythicComponents/MythicActionButton";
import {MythicChip} from "../../MythicComponents/MythicChip";
import {
    FileMetaSplitView,
    getFileStatus,
    useFileSelection,
} from "./FileMetaInspector";
import {useNavigate} from "react-router-dom";

export const downloadBulkQuery = gql`
mutation downloadBulkMutation($files: [String!]!){
    downloadBulk(files: $files){
        status
        error
        file_id
    }
}
`;
export const updateFileDeleted = gql`
mutation updateFileMutation($file_id: Int, $file_ids: [Int!]){
    deleteFile(file_id: $file_id, file_ids: $file_ids) {
        status
        error
        file_ids
    }
}
`;
export const previewFileQuery = gql`
mutation previewFile($file_id: String!){
    previewFile(file_id: $file_id){
        status
        error
        contents
        size
        host
        filename
        full_remote_path
    }
}
`;
const updateHostedFileMutation = gql`
mutation updateHostedFileMutation($c2profile_file_host_id: Int!, $host_url: String, $alert_on_download: Boolean, $stop: Boolean, $remove: Boolean) {
  c2UpdateHostedFile(c2profile_file_host_id: $c2profile_file_host_id, host_url: $host_url, alert_on_download: $alert_on_download, stop: $stop, remove: $remove) {
      status
      error
      id
      filemeta_id
      c2_profile_id
      host_url
      hosting_status
      affected_count
  }
}
`;
export const SnackMessage = (props) => {
    return (
        <React.Fragment>                    
            <Typography variant="subtitle2" >
                    Zip Created! This is available at any time via the "Uploads" page.
            </Typography>
            <FileDownloadLinkWithAuth color="textPrimary" href={"/direct/download/" + props.file_id} >
                Download here
            </FileDownloadLinkWithAuth>
                
        </React.Fragment>

    );
};
export const normalizeFileMeta = (file) => ({
    ...file,
    filename_text: b64DecodeUnicode(file.filename_text),
    full_remote_path_text: b64DecodeUnicode(file.full_remote_path_text),
    copy_of_file: file.copy_of_file ? {
        ...file.copy_of_file,
        filename_text: b64DecodeUnicode(file.copy_of_file.filename_text),
        full_remote_path_text: b64DecodeUnicode(file.copy_of_file.full_remote_path_text),
    } : null,
});

const FileStatusSummary = ({file}) => {
    const status = getFileStatus(file);
    return (
        <div className="mythic-file-search-status">
            {status.label !== "Complete" &&
                <MythicChip size="small" tone={status.tone} variant="outlined" label={status.label} />
            }
            {file.copy_of_file &&
                <MythicChip size="small" tone="info" variant="outlined" label="Tracked copy" />
            }
            <MythicChip size="small" tone="secondary" variant="outlined" label={getStringSize({cellData: {plaintext: file.size}})} />
        </div>
    );
};

const stopRowClick = (event) => {
    event.stopPropagation();
};

export function HostedFileTable(props){
    const [hostedFiles, setHostedFiles] = React.useState([]);
    const [editingHostedFile, setEditingHostedFile] = React.useState(null);
    const pendingAction = React.useRef({id: 0, action: ""});
    React.useEffect(() => {
        setHostedFiles(props.hostedFiles || []);
    }, [props.hostedFiles]);
    const [updateHostedFile] = useMutation(updateHostedFileMutation, {
        onCompleted: (data) => {
            if(data.c2UpdateHostedFile.status === "success"){
                snackActions.success("Updated hosted file state");
                if(pendingAction.current.action === "remove"){
                    setHostedFiles((prev) => prev.filter((hostedFile) => hostedFile.id !== pendingAction.current.id));
                } else {
                    setHostedFiles((prev) => prev.map((hostedFile) => hostedFile.id === pendingAction.current.id ? {
                        ...hostedFile,
                        status: data.c2UpdateHostedFile.hosting_status || hostedFile.status,
                        error: "",
                        host_url: data.c2UpdateHostedFile.host_url || hostedFile.host_url
                    } : hostedFile));
                }
            } else {
                snackActions.error(data.c2UpdateHostedFile.error);
            }
        },
        onError: (data) => {
            snackActions.error(data.message);
        }
    });
    const retryHosting = (hostedFile) => {
        pendingAction.current = {id: hostedFile.id, action: "retry"};
        updateHostedFile({variables: {
            c2profile_file_host_id: hostedFile.id
        }});
    }
    const stopHosting = (hostedFile) => {
        pendingAction.current = {id: hostedFile.id, action: "stop"};
        updateHostedFile({variables: {
            c2profile_file_host_id: hostedFile.id,
            stop: true
        }});
    }
    const removeHosting = (hostedFile) => {
        pendingAction.current = {id: hostedFile.id, action: "remove"};
        updateHostedFile({variables: {
            c2profile_file_host_id: hostedFile.id,
            remove: true
        }});
    }
    const onHostedFileUpdated = (updatedHostedFile, action) => {
        if(updatedHostedFile.status !== "success"){
            return;
        }
        if(action?.action === "remove"){
            setHostedFiles((prev) => prev.filter((hostedFile) => hostedFile.id !== updatedHostedFile.id));
        } else {
            setHostedFiles((prev) => prev.map((hostedFile) => hostedFile.id === updatedHostedFile.id ? {
                ...hostedFile,
                host_url: updatedHostedFile.host_url || hostedFile.host_url,
                alert_on_download: action?.alert_on_download ?? hostedFile.alert_on_download,
                status: updatedHostedFile.hosting_status || hostedFile.status,
                error: ""
            } : hostedFile));
        }
        setEditingHostedFile(null);
    }
    return (
        <React.Fragment>
            {editingHostedFile &&
                <MythicDialog fullWidth={true} maxWidth="md" open={Boolean(editingHostedFile)}
                              onClose={() => setEditingHostedFile(null)}
                              innerDialog={<HostFileDialog
                                  file_uuid={editingHostedFile.filemetum?.agent_file_id}
                                  file_name={editingHostedFile.filemetum?.full_remote_path_text ? b64DecodeUnicode(editingHostedFile.filemetum.full_remote_path_text) : b64DecodeUnicode(editingHostedFile.filemetum?.filename_text || "")}
                                  hostedFile={editingHostedFile}
                                  onUpdated={onHostedFileUpdated}
                                  onClose={() => setEditingHostedFile(null)}
                              />} />
            }
            <HostedFileLocationsTable
                hostedFiles={hostedFiles}
                renderFile={(hostedFile) => (
                    <FileDownloadLinkWithAuth style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" + hostedFile.filemetum?.agent_file_id}>
                        {hostedFile.filemetum?.full_remote_path_text ? b64DecodeUnicode(hostedFile.filemetum.full_remote_path_text) : b64DecodeUnicode(hostedFile.filemetum?.filename_text || "")}
                    </FileDownloadLinkWithAuth>
                )}
                onEdit={(hostedFile) => setEditingHostedFile(hostedFile)}
                onRetry={retryHosting}
                onStop={stopHosting}
                onRemove={removeHosting}
            />
        </React.Fragment>
    );
}
export function FileMetaDownloadTable(props){
    const [bulkSelected, setBulkSelected] = React.useState({});
    const [files, setFiles] = React.useState([]);
    const [checkAll, setCheckAll] = React.useState(false);
    const {selectedFileID, setSelectedFileID, selectedFile} = useFileSelection(files);
    const bulkActionsDisabled = !Object.values(bulkSelected).some(Boolean);
    const onToggleSelection = (id, checked) => {
        setBulkSelected((currentSelected) => ({...currentSelected, [id]: checked}));
    }
    const onToggleCheckAll = () => {
        if(checkAll){
            setCheckAll(false);
            setBulkSelected({});
        } else {
            setCheckAll(true);
            const newSelected = files?.reduce( (prev, cur) => {
                if(!cur.deleted){
                    return {...prev, [cur.id]: true};
                }
                return {...prev};
            }, {}) || {};
            setBulkSelected(newSelected);
        }
    }
    useEffect( () => {
        const initialSelected = props.files?.reduce( (prev, file) => {
            return {...prev, [file.id]: false}
        }, {}) || {};
        setCheckAll(false);
        setBulkSelected(initialSelected);
        setFiles(props.files?.map(normalizeFileMeta) || []);
    }, [props.files]);
    const [downloadBulk] = useMutation(downloadBulkQuery, {
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.downloadBulk.status === "success"){
                snackActions.success(<SnackMessage
                    file_id={data.downloadBulk.file_id}
                    />, {toastId: data.downloadBulk.file_id, autoClose: false, closeOnClick: false});
            }else{
                snackActions.error(data.downloadBulk.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to zip up files");
        }
    })
    const onDownloadBulk = () => {
        snackActions.info("Zipping up files...");
        let fileIds = [];
        for(const [key, value] of Object.entries(bulkSelected)){
            if(value){
                for(let j = 0; j < props.files.length; j++){
                    if(props.files[j].id === parseInt(key)){
                        fileIds.push(props.files[j].agent_file_id);
                    }
                }
            }
        }
        downloadBulk({variables:{files: fileIds}})
    }
    const [deleteBulk] = useMutation(updateFileDeleted, {
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.deleteFile.status === "success"){
                onDelete(data.deleteFile);
            }else {
                snackActions.error(data.deleteFile.error);
            }

        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to delete files");
        }
    })
    const onDeleteBulk = () => {
        let fileIds = [];
        for(const [key, value] of Object.entries(bulkSelected)){
            if(value){
                for(let j = 0; j < props.files.length; j++){
                    if(props.files[j].id === parseInt(key)){
                        fileIds.push(props.files[j].id);
                    }
                }
            }
        }
        deleteBulk({variables:{file_ids: fileIds}})
    }
    const onDelete = ({file_ids}) => {
        if(!file_ids){
            return;
        }
        const updated = files.filter((file) => !file_ids.includes(file.id));
        let currentSelected = {...bulkSelected};
        file_ids.forEach(f => {
            currentSelected[f] = false;
        });
        setCheckAll(false);
        setBulkSelected(currentSelected);
        setFiles(updated);
    }
    const onEditComment = ({id, comment}) => {
        setFiles((currentFiles) => currentFiles.map((file) =>
            file.id === id ? {...file, comment} : file
        ));
    }
    return (
        <FileMetaSplitView
            file={selectedFile}
            kind="download"
            me={props.me}
            onEditComment={onEditComment}>
            <div className="mythic-file-search-table-layout">
                <span className="mythic-table-bulk-actions">
                    <MythicActionButton disabled={bulkActionsDisabled} icon={<ArchiveIcon />} label="Zip & Download Selected" onClick={onDownloadBulk} tone="info" />
                    <MythicActionButton disabled={bulkActionsDisabled} icon={<DeleteIcon />} label="Delete Selected" onClick={onDeleteBulk} tone="error" />
                </span>
                <TableContainer className="mythic-file-search-table-wrap">
                    <Table stickyHeader size="small" className="mythic-file-search-table">
                        <TableHead>
                            <TableRow>
                                <TableCell style={{width: "3rem"}}>
                                    <Checkbox
                                        checked={checkAll}
                                        onChange={onToggleCheckAll}
                                        sx={{pl: "3px"}}
                                        inputProps={{'aria-label': 'Select all files'}}
                                    />
                                </TableCell>
                                <TableCell style={{minWidth: "4rem"}}>File</TableCell>
                                <TableCell style={{width: "9rem"}}>Status</TableCell>
                                <TableCell style={{width: "5rem"}}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {files.map((file) => (
                                <FileMetaDownloadTableRow
                                    key={"file" + file.id}
                                    onToggleSelection={onToggleSelection}
                                    bulkSelected={bulkSelected}
                                    onDelete={onDelete}
                                    selected={selectedFileID === file.id}
                                    onSelect={() => setSelectedFileID(file.id)}
                                    {...file}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </FileMetaSplitView>
    )
}
function FileMetaDownloadTableRow(props){
    const [openDelete, setOpenDelete] = React.useState(false);
    const [openPreviewMediaDialog, setOpenPreviewMediaDialog] = React.useState(false);
    const [deleteFile] = useMutation(updateFileDeleted, {
        onCompleted: (data) => {
            snackActions.dismiss();
            props.onDelete(data.deleteFile);
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to delete file");
        }
    });
    const onAcceptDelete = () => {
        deleteFile({variables: {file_id: props.id}})
    }
    const onSelectChanged = (event) => {
        event.stopPropagation();
        props.onToggleSelection(props.id, event.target.checked);
    }
    const onPreviewMedia = (event) => {
        event.stopPropagation();
        setOpenPreviewMediaDialog(true);
    }
    return (
        <React.Fragment>
            {openDelete &&
                <MythicConfirmDialog onClose={() => setOpenDelete(false)} onSubmit={onAcceptDelete} open={openDelete}/>
            }
            {openPreviewMediaDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="xl"
                    open={openPreviewMediaDialog}
                    onClose={() => setOpenPreviewMediaDialog(false)}
                    innerDialog={
                        <PreviewFileMediaDialog
                            agent_file_id={props.agent_file_id}
                            filename={props.filename_text}
                            onClose={() => setOpenPreviewMediaDialog(false)}
                        />
                    }
                />
            }
            <TableRow
                hover
                selected={props.selected}
                className={`mythic-file-search-row${props.selected ? " mythic-file-search-row-selected" : ""}`}
                onClick={props.onSelect}>
                <MythicStyledTableCell>
                    {props.deleted ? null : (
                        <MythicStyledTooltip title="Toggle to download multiple files at once">
                            <Checkbox checked={props.bulkSelected[props.id] || false}
                                      onChange={onSelectChanged}
                                      inputProps={{'aria-label': 'Select file'}} />
                        </MythicStyledTooltip>
                    )}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {props.deleted ? (
                        <span>{props.filename_text}</span>
                    ) : (
                        <FileDownloadLinkWithAuth color="textPrimary"
                                                  underline="always" href={"/direct/download/" + props.agent_file_id}
                        >
                            <b>{ props.filename_text }</b>
                        </FileDownloadLinkWithAuth>
                    )}
                    <span className="mythic-file-search-secondary">
                        {props.host}: {props.full_remote_path_text}
                    </span>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <FileStatusSummary file={props} />
                </MythicStyledTableCell>
                <MythicStyledTableCell onClick={stopRowClick}>
                    {props.deleted || props.size === 0 ? null : (
                        <div className="mythic-compact-actions mythic-compact-actions-nowrap">
                            <MythicActionButton appearance="raised" icon={<DeleteIcon />} iconOnly onClick={() => setOpenDelete(true)} tone="error" tooltip="Delete file" />
                            <MythicActionButton appearance="raised" icon={<FontAwesomeIcon icon={faPhotoVideo} />} iconOnly onClick={onPreviewMedia} tone="info" tooltip="Preview Media" />
                        </div>
                    )}
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}

export function FileMetaUploadTable(props){
    const [bulkSelected, setBulkSelected] = React.useState({});
    const [files, setFiles] = React.useState([]);
    const [checkAll, setCheckAll] = React.useState(false);
    const {selectedFileID, setSelectedFileID, selectedFile} = useFileSelection(files);
    const bulkActionsDisabled = !Object.values(bulkSelected).some(Boolean);
    const onToggleSelection = (id, checked) => {
        setBulkSelected((currentSelected) => ({...currentSelected, [id]: checked}));
    }
    const onToggleCheckAll = () => {
        if(checkAll){
            setCheckAll(false);
            setBulkSelected({});
        } else {
            setCheckAll(true);
            const newSelected = files?.reduce( (prev, cur) => {
                if(!cur.deleted){
                    return {...prev, [cur.id]: true};
                }
                return {...prev};
            }, {}) || {};
            setBulkSelected(newSelected);
        }
    }
    useEffect( () => {
        const initialSelected = props.files?.reduce( (prev, file) => {
            return {...prev, [file.id]: false}
        }, {})  || {};
        setCheckAll(false);
        setBulkSelected(initialSelected);
        setFiles(props.files?.map(normalizeFileMeta) || []);
    }, [props.files]);
    const [downloadBulk] = useMutation(downloadBulkQuery, {
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.downloadBulk.status === "success"){
                snackActions.success(<MythicSnackDownload title="Download Zip File" file_id={data.downloadBulk.file_id} />, {toastId: data.downloadBulk.file_id, autoClose: false, closeOnClick: false});
            }else{
                snackActions.error(data.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to zip up files");
        }
    })
    const onDownloadBulk = () => {
        snackActions.info("Zipping up files...");
        let fileIds = [];
        for(const [key, value] of Object.entries(bulkSelected)){
            if(value){
                for(let j = 0; j < props.files.length; j++){
                    if(props.files[j].id === parseInt(key)){
                        fileIds.push(props.files[j].agent_file_id);
                    }
                }
            }
        }
        downloadBulk({variables:{files: fileIds}})
    }
    const [deleteBulk] = useMutation(updateFileDeleted, {
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.deleteFile.status === "success"){
                onDelete(data.deleteFile);
            }else {
                snackActions.error(data.deleteFile.error);
            }

        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to delete files");
        }
    })
    const onDeleteBulk = () => {
        let fileIds = [];
        for(const [key, value] of Object.entries(bulkSelected)){
            if(value){
                for(let j = 0; j < props.files.length; j++){
                    if(props.files[j].id === parseInt(key)){
                        fileIds.push(props.files[j].id);
                    }
                }
            }
        }
        deleteBulk({variables:{file_ids: fileIds}})
    }
    const onDelete = ({file_ids}) => {
        if(!file_ids){return}
        const updated = files.filter((file) => !file_ids.includes(file.id));
        let currentSelected = {...bulkSelected};
        file_ids.forEach(f => {
            currentSelected[f] = false;
        });
        setCheckAll(false);
        setBulkSelected(currentSelected);
        setFiles(updated);
    }
    const onEditComment = ({id, comment}) => {
        setFiles((currentFiles) => currentFiles.map((file) =>
            file.id === id ? {...file, comment} : file
        ));
    }
    return (
        <FileMetaSplitView
            file={selectedFile}
            kind="upload"
            me={props.me}
            onEditComment={onEditComment}>
            <div className="mythic-file-search-table-layout">
                <span className="mythic-table-bulk-actions">
                    <MythicActionButton disabled={bulkActionsDisabled} icon={<ArchiveIcon />} label="Zip & Download Selected" onClick={onDownloadBulk} tone="info" />
                    <MythicActionButton disabled={bulkActionsDisabled} icon={<DeleteIcon />} label="Delete Selected" onClick={onDeleteBulk} tone="error" />
                </span>
                <TableContainer className="mythic-file-search-table-wrap">
                    <Table stickyHeader size="small" className="mythic-file-search-table">
                        <TableHead>
                            <TableRow>
                                <TableCell style={{width: "3rem"}}>
                                    <Checkbox
                                        checked={checkAll}
                                        onChange={onToggleCheckAll}
                                        sx={{pl: "3px"}}
                                        inputProps={{'aria-label': 'Select all files'}}
                                    />
                                </TableCell>
                                <TableCell>File Transfer</TableCell>
                                <TableCell style={{width: "9rem"}}>Status</TableCell>
                                <TableCell style={{width: "5rem"}}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {files.map((file) => (
                                <FileMetaUploadTableRow
                                    key={"file" + file.id}
                                    onToggleSelection={onToggleSelection}
                                    bulkSelected={bulkSelected}
                                    onDelete={onDelete}
                                    selected={selectedFileID === file.id}
                                    onSelect={() => setSelectedFileID(file.id)}
                                    {...file}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </FileMetaSplitView>
    )
}
function FileMetaUploadTableRow(props){
    const [openDelete, setOpenDelete] = React.useState(false);
    const [openPreviewMediaDialog, setOpenPreviewMediaDialog] = React.useState(false);
    const [deleteFile] = useMutation(updateFileDeleted, {
        onCompleted: (data) => {
            snackActions.dismiss();
            props.onDelete(data.deleteFile);
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to delete file");
        }
    })
    const onAcceptDelete = () => {
        deleteFile({variables: {file_id: props.id}})
    }
    const onSelectChanged = (event) => {
        event.stopPropagation();
        props.onToggleSelection(props.id, event.target.checked);
    }
    const onPreviewMedia = (event) => {
        event.stopPropagation();
        setOpenPreviewMediaDialog(true);
    }
    return (
        <React.Fragment>
            {openDelete &&
                <MythicConfirmDialog onClose={() => setOpenDelete(false)} onSubmit={onAcceptDelete} open={openDelete}/>
            }
            {openPreviewMediaDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="xl"
                    open={openPreviewMediaDialog}
                    onClose={() => setOpenPreviewMediaDialog(false)}
                    innerDialog={
                        <PreviewFileMediaDialog
                            agent_file_id={props.agent_file_id}
                            filename={props.filename_text}
                            editable={true}
                            onClose={() => setOpenPreviewMediaDialog(false)}
                        />
                    }
                />
            }
            <TableRow
                hover
                selected={props.selected}
                className={`mythic-file-search-row${props.selected ? " mythic-file-search-row-selected" : ""}`}
                onClick={props.onSelect}>
                <MythicStyledTableCell>
                    {props.deleted ? null : (
                        <MythicStyledTooltip title="Toggle to download multiple files at once">
                            <Checkbox checked={props.bulkSelected[props.id] || false}
                                      onChange={onSelectChanged}
                                      inputProps={{'aria-label': 'Select file'}} />
                        </MythicStyledTooltip>
                    )}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <FileDownloadLinkWithAuth color="textPrimary" underline="always" href={"/direct/download/" + props.agent_file_id}>
                        <b>{props.filename_text}</b>
                    </FileDownloadLinkWithAuth>
                    <span className="mythic-file-search-secondary">
                        {(props.host || "No host") + " \u2192 " + (props.full_remote_path_text || "Agent Memory")}
                    </span>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <FileStatusSummary file={props} />
                </MythicStyledTableCell>
                <MythicStyledTableCell onClick={stopRowClick}>
                    {props.deleted ? null : (
                        <div className="mythic-compact-actions mythic-compact-actions-nowrap">
                            <MythicActionButton appearance="raised" icon={<DeleteIcon />} iconOnly onClick={() => setOpenDelete(true)} tone="error" tooltip="Delete file" />
                            <MythicActionButton appearance="raised" icon={<FontAwesomeIcon icon={faPhotoVideo} />} iconOnly onClick={onPreviewMedia} tone="info" tooltip="Preview Media" />
                        </div>
                    )}
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}

export function FileMetaScreenshotTable(props){
    const [files, setFiles] = React.useState([]);
    const {selectedFileID, setSelectedFileID, selectedFile} = useFileSelection(files);
    useEffect( () => {
        setFiles(props.files?.map(normalizeFileMeta) || []);
    }, [props.files]);
    const onEditComment = ({id, comment}) => {
        setFiles((currentFiles) => currentFiles.map((file) =>
            file.id === id ? {...file, comment} : file
        ));
    }
    const onDelete = ({file_ids}) => {
        const updated = files.filter((file) => !file_ids.includes(file.id));
        setFiles(updated);
    }
    const imageRefs = files.map( f => f.agent_file_id);

    return (
        <FileMetaSplitView
            file={selectedFile}
            kind="screenshot"
            me={props.me}
            onEditComment={onEditComment}>
            <div className="mythic-file-search-table-layout">
                <TableContainer className="mythic-file-search-table-wrap">
                    <Table stickyHeader size="small" className="mythic-file-search-table">
                        <TableHead>
                            <TableRow>
                                <TableCell >Thumbnail</TableCell>
                                <TableCell style={{width: "15rem"}}>File</TableCell>
                                <TableCell style={{width: "9rem"}}>Status</TableCell>
                                <TableCell style={{width: "5rem"}}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {files.map((file, index) => (
                                <FileMetaScreenshotTableRow
                                    key={"file" + file.id}
                                    {...file}
                                    index={index}
                                    imageRefs={imageRefs}
                                    onDelete={onDelete}
                                    selected={selectedFileID === file.id}
                                    onSelect={() => setSelectedFileID(file.id)}
                                    me={props.me}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </FileMetaSplitView>
    )
}
function FileMetaScreenshotTableRow(props){
    const [openDelete, setOpenDelete] = React.useState(false);
    const me = props.me;
    const [openScreenshot, setOpenScreenshot] = React.useState(false);
    const [deleteFile] = useMutation(updateFileDeleted, {
        onCompleted: (data) => {
            snackActions.dismiss();
            props.onDelete(data.deleteFile);
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to delete file");
        }
    })
    const onAcceptDelete = () => {
        deleteFile({variables: {file_id: props.id}})
    }
    const openScreenshotDialog = (event) => {
        event.stopPropagation();
        setOpenScreenshot(true);
    }
    return (
        <React.Fragment>
            {openDelete &&
                <MythicConfirmDialog onClose={() => setOpenDelete(false)} onSubmit={onAcceptDelete} open={openDelete}/>
            }
            {openScreenshot &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="xl"
                    open={openScreenshot}
                    onClose={() => setOpenScreenshot(false)}
                    innerDialog={
                        <ResponseDisplayScreenshotModal
                            images={props.imageRefs}
                            startIndex={props.index}
                            onClose={() => setOpenScreenshot(false)}
                        />
                    }
                />
            }
            <TableRow
                hover
                selected={props.selected}
                className={`mythic-file-search-row${props.selected ? " mythic-file-search-row-selected" : ""}`}
                onClick={props.onSelect}>
                <MythicStyledTableCell>
                    <ImageWithAuth
                        src={"/screencaptures/" + props.agent_file_id}
                        onClick={openScreenshotDialog}
                        style={{width: "400px", maxWidth: "100%", cursor: "pointer"}}
                    />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-file-search-primary">
                        <span>{props.filename_text}</span>
                        <span className="mythic-file-search-secondary">{props.host || "No host"}</span>
                        <span className="mythic-file-search-secondary">
                            {props.timestamp ? toLocalTime(props.timestamp, me.user.view_utc_time) : "No timestamp"}
                        </span>
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <FileStatusSummary file={props} />
                </MythicStyledTableCell>
                <MythicStyledTableCell onClick={stopRowClick}>
                    {props.deleted ? null : (
                        <MythicActionButton appearance="raised" icon={<DeleteIcon />} iconOnly onClick={() => setOpenDelete(true)} tone="error" tooltip="Delete screenshot" />
                    )}
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}

export function FileMetaEventingWorkflowsTable(props){
    const [bulkSelected, setBulkSelected] = React.useState({});
    const [files, setFiles] = React.useState([]);
    const [checkAll, setCheckAll] = React.useState(false);
    const {selectedFileID, setSelectedFileID, selectedFile} = useFileSelection(files);
    const bulkActionsDisabled = !Object.values(bulkSelected).some(Boolean);
    const onToggleSelection = (id, checked) => {
        setBulkSelected((currentSelected) => ({...currentSelected, [id]: checked}));
    }
    const onToggleCheckAll = () => {
        if(checkAll){
            setCheckAll(false);
            setBulkSelected({});
        } else {
            setCheckAll(true);
            const newSelected = files?.reduce( (prev, cur) => {
                if(!cur.deleted){
                    return {...prev, [cur.id]: true};
                }
                return {...prev};
            }, {}) || {};
            setBulkSelected(newSelected);
        }
    }
    useEffect( () => {
        const initialSelected = props.files?.reduce( (prev, file) => {
            return {...prev, [file.id]: false}
        }, {}) || {};
        setCheckAll(false);
        setBulkSelected(initialSelected);
        setFiles(props.files?.map(normalizeFileMeta) || []);
    }, [props.files]);
    const [downloadBulk] = useMutation(downloadBulkQuery, {
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.downloadBulk.status === "success"){
                snackActions.success(<MythicSnackDownload title="Download Zip File" file_id={data.downloadBulk.file_id} />, {toastId: data.downloadBulk.file_id, autoClose: false, closeOnClick: false});
            }else{
                snackActions.error(data.downloadBulk.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to zip up files");
        }
    })
    const onDownloadBulk = () => {
        snackActions.info("Zipping up files...");
        let fileIds = [];
        for(const [key, value] of Object.entries(bulkSelected)){
            if(value){
                for(let j = 0; j < props.files.length; j++){
                    if(props.files[j].id === parseInt(key)){
                        fileIds.push(props.files[j].agent_file_id);
                    }
                }
            }
        }
        downloadBulk({variables:{files: fileIds}})
    }
    const [deleteBulk] = useMutation(updateFileDeleted, {
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.deleteFile.status === "success"){
                onDelete(data.deleteFile);
            }else {
                snackActions.error(data.deleteFile.error);
            }

        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to delete files");
        }
    })
    const onDeleteBulk = () => {
        let fileIds = [];
        for(const [key, value] of Object.entries(bulkSelected)){
            if(value){
                for(let j = 0; j < props.files.length; j++){
                    if(props.files[j].id === parseInt(key)){
                        fileIds.push(props.files[j].id);
                    }
                }
            }
        }
        deleteBulk({variables:{file_ids: fileIds}})
    }
    const onDelete = ({file_ids}) => {
        if(!file_ids){return}
        const updated = files.filter((file) => !file_ids.includes(file.id));
        let currentSelected = {...bulkSelected};
        file_ids.forEach(f => {
            currentSelected[f] = false;
        });
        setCheckAll(false);
        setBulkSelected(currentSelected);
        setFiles(updated);
    }
    const onEditComment = ({id, comment}) => {
        setFiles((currentFiles) => currentFiles.map((file) =>
            file.id === id ? {...file, comment} : file
        ));
    }
    return (
        <FileMetaSplitView
            file={selectedFile}
            kind="eventing"
            me={props.me}
            onEditComment={onEditComment}>
            <div className="mythic-file-search-table-layout">
                <span className="mythic-table-bulk-actions">
                    <MythicActionButton active disabled={bulkActionsDisabled} icon={<ArchiveIcon />} label="Zip & Download Selected" onClick={onDownloadBulk} tone="info" />
                    <MythicActionButton disabled={bulkActionsDisabled} icon={<DeleteIcon />} label="Delete Selected" onClick={onDeleteBulk} tone="error" />
                </span>
                <TableContainer className="mythic-file-search-table-wrap">
                    <Table stickyHeader size="small" className="mythic-file-search-table">
                        <TableHead>
                            <TableRow>
                                <TableCell style={{width: "3rem"}}>
                                    <Checkbox
                                        checked={checkAll}
                                        onChange={onToggleCheckAll}
                                        sx={{pl: "3px"}}
                                        inputProps={{'aria-label': 'Select all files'}}
                                    />
                                </TableCell>
                                <TableCell>File</TableCell>
                                <TableCell style={{width: "12rem"}}>Workflow</TableCell>
                                <TableCell style={{width: "9rem"}}>Status</TableCell>
                                <TableCell style={{width: "5rem"}}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {files.map((file) => (
                                <FileMetaEventingWorkflowsTableRow
                                    key={"file" + file.id}
                                    onToggleSelection={onToggleSelection}
                                    bulkSelected={bulkSelected}
                                    onDelete={onDelete}
                                    selected={selectedFileID === file.id}
                                    onSelect={() => setSelectedFileID(file.id)}
                                    {...file}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </FileMetaSplitView>
    )
}
function FileMetaEventingWorkflowsTableRow(props){
    const navigate = useNavigate();
    const [openDelete, setOpenDelete] = React.useState(false);
    const [openPreviewMediaDialog, setOpenPreviewMediaDialog] = React.useState(false);
    const [deleteFile] = useMutation(updateFileDeleted, {
        onCompleted: (data) => {
            snackActions.dismiss();
            props.onDelete(data.deleteFile);
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to delete file");
        }
    })
    const onAcceptDelete = () => {
        deleteFile({variables: {file_id: props.id}})
    }
    const onSelectChanged = (event) => {
        event.stopPropagation();
        props.onToggleSelection(props.id, event.target.checked);
    }
    const onPreviewMedia = (event) => {
        event.stopPropagation();
        setOpenPreviewMediaDialog(true);
    }
    return (
        <React.Fragment>
            {openDelete &&
                <MythicConfirmDialog onClose={() => setOpenDelete(false)} onSubmit={onAcceptDelete} open={openDelete}/>
            }
            {openPreviewMediaDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="xl"
                    open={openPreviewMediaDialog}
                    onClose={() => setOpenPreviewMediaDialog(false)}
                    innerDialog={
                        <PreviewFileMediaDialog
                            agent_file_id={props.agent_file_id}
                            filename={props.filename_text}
                            onClose={() => setOpenPreviewMediaDialog(false)}
                        />
                    }
                />
            }
            <TableRow
                hover
                selected={props.selected}
                className={`mythic-file-search-row${props.selected ? " mythic-file-search-row-selected" : ""}`}
                onClick={props.onSelect}>
                <MythicStyledTableCell>
                    {props.deleted ? null : (
                        <MythicStyledTooltip title="Toggle to download multiple files at once">
                            <Checkbox checked={props.bulkSelected[props.id] || false}
                                      onChange={onSelectChanged}
                                      inputProps={{'aria-label': 'Select file'}} />
                        </MythicStyledTooltip>
                    )}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <FileDownloadLinkWithAuth color="textPrimary" underline="always" href={"/direct/download/" + props.agent_file_id}>
                        <b>{props.filename_text}</b>
                    </FileDownloadLinkWithAuth>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {props.eventgroup?.id ? (
                        <Link color="textPrimary" onClick={() => navigate("/new/eventing?eventgroup=" + props.eventgroup.id)}
                              underline="always" style={{cursor: "pointer"}}>
                            {props.eventgroup.name}
                        </Link>
                    ) : "-"}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <FileStatusSummary file={props} />
                </MythicStyledTableCell>
                <MythicStyledTableCell onClick={stopRowClick}>
                    {props.deleted ? null : (
                        <div className="mythic-compact-actions mythic-compact-actions-nowrap">
                            <MythicActionButton appearance="raised" icon={<DeleteIcon />} iconOnly onClick={() => setOpenDelete(true)} tone="error" tooltip="Delete file" />
                            <MythicActionButton appearance="raised" icon={<FontAwesomeIcon icon={faPhotoVideo} />} iconOnly onClick={onPreviewMedia} tone="info" tooltip="Preview Media" />
                        </div>
                    )}
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}
