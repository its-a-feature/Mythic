import React, {useEffect} from 'react';
import {Button, Link, Typography} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import {snackActions} from '../../utilities/Snackbar';
import {MythicSnackDownload} from '../../MythicComponents/MythicSnackDownload';
import {useTheme} from '@mui/material/styles';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import { toLocalTime } from '../../utilities/Time';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import ArchiveIcon from '@mui/icons-material/Archive';
import { gql, useMutation } from '@apollo/client';
import { ResponseDisplayScreenshotModal } from '../Callbacks/ResponseDisplayScreenshotModal';
import { MythicDialog, MythicModifyStringDialog } from '../../MythicComponents/MythicDialog';
import EditIcon from '@mui/icons-material/Edit';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import {PreviewFileStringDialog} from './PreviewFileStringDialog';
import {PreviewFileHexDialog} from './PreviewFileHexDialog';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {TagsDisplay, ViewEditTags} from '../../MythicComponents/MythicTag';
import {b64DecodeUnicode} from '../Callbacks/ResponseDisplay';
import Checkbox from '@mui/material/Checkbox';
import txtFile from '../../../assets/file_txt.png';
import hexFile from '../../../assets/file_bin.png';
import {HostFileDialog} from "../Payloads/HostFileDialog";
import PublicIcon from '@mui/icons-material/Public';
import {getStringSize} from '../Callbacks/ResponseDisplayTable';
import {PreviewFileMediaDialog} from "./PreviewFileMedia";
import {faPhotoVideo} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

const downloadBulkQuery = gql`
mutation downloadBulkMutation($files: [String!]!){
    download_bulk(files: $files){
        status
        error
        file_id
    }
}
`;
const updateFileDeleted = gql`
mutation updateFileMutation($file_id: Int!){
    deleteFile(file_id: $file_id) {
        status
        error
        file_ids
    }
}
`;
const updateFileComment = gql`
mutation updateCommentMutation($file_id: Int!, $comment: String!){
    update_filemeta_by_pk(pk_columns: {id: $file_id}, _set: {comment: $comment}) {
        comment
        id
    }
}
`;
export const previewFileQuery = gql`
mutation previewFile($file_id: String!){
    previewFile(file_id: $file_id){
        status
        error
        contents
    }
}
`;
const SnackMessage = (props) => {
    return (
        <React.Fragment>                    
            <Typography variant="subtitle2" >
                    Zip Created! This is available at any time via the "Uploads" page.
            </Typography>
            <Link color="textPrimary" href={"/direct/download/" + props.file_id} >
                Download here
            </Link>
                
        </React.Fragment>

    );
};
export function FileMetaDownloadTable(props){
    const [selected, setSelected] = React.useState({});
    const [files, setFiles] = React.useState([]);
    const [checkAll, setCheckAll] = React.useState(false);
    const [disabled, setDisabled] = React.useState(true);
    const onToggleSelection = (id, checked) => {
        setSelected({...selected, [id]: checked});
    }
    const onToggleCheckAll = () => {
        if(checkAll){
            // it's currently checked and clicked again, untoggle it all
            setCheckAll(false);
            setSelected({});
        } else {
            setCheckAll(true);
            const newSelected = files.reduce( (prev, cur) => {
                if(!cur.deleted){
                    return {...prev, [cur.id]: true};
                } else {
                    return {...prev}
                }

            }, {});
            setSelected(newSelected);
        }
    }
    useEffect( () => {
        const initialSelected = props.files.reduce( (prev, file) => {
            return {...prev, [file.id]: false}
        }, {});
        const initialFiles = props.files.reduce( (prev, file) => {
            return [...prev, {...file, filename_text: b64DecodeUnicode(file.filename_text), full_remote_path_text: b64DecodeUnicode(file.full_remote_path_text)}]
        }, []);
        setSelected(initialSelected);
        setFiles(initialFiles);
    }, [props.files]);
    const [downloadBulk] = useMutation(downloadBulkQuery, {
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.download_bulk.status === "success"){
                snackActions.success(<SnackMessage
                    file_id={data.download_bulk.file_id} 
                    />, {toastId: data.download_bulk.file_id, autoClose: false, closeOnClick: false});
                //snackActions.success("", {persist: true, content: key => <MythicSnackDownload id={key} title="Download Zip File" innerText="Filenames are random UUIDs, so a JSON file is included with a mapping of UUID to real filename" downloadLink={window.location.origin + "/api/v1.4/files/download/" + data.download_bulk.file_id} />});
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
        for(const [key, value] of Object.entries(selected)){
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
    const onDelete = ({file_ids}) => {
        const updated = files.map( (file) => {
            if(file_ids.includes(file.id)){
                return {...file, deleted: true};
            }else{
                return {...file}
            }
        });
        setFiles(updated);
    }
    const onEditComment = ({id, comment}) => {
        const updated = files.map( (file) => {
            if(file.id === id){
                return {...file, comment: comment};
            }else{
                return {...file}
            }
        });
        setFiles(updated);
    }
    useEffect( () => {
        for(const [key, value] of Object.entries(selected)){
            if(value){
                setDisabled(false);
                return
            }
        }
        setDisabled(true);
    }, [selected]);
    return (
        <TableContainer component={Paper} className="mythicElement" style={{display: "flex", flexDirection: "column", height: "100%"}} >
            <Button size="small" onClick={onDownloadBulk} style={{float: "right"}}
                    color="primary" variant="contained"
                    disabled={disabled}
            >
                <ArchiveIcon/>Zip & Download Selected
            </Button>
            <div style={{height: "100%", overflowY: "auto"}}>
                <Table stickyHeader size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "3rem"}}>
                            <Checkbox checked={checkAll} onChange={onToggleCheckAll}
                                      inputProps={{ 'aria-label': 'controlled' }} />
                        </TableCell>
                        <TableCell style={{width: "9rem"}}>Actions</TableCell>
                        <TableCell >File</TableCell>
                        <TableCell style={{width: "15rem"}}>Comment</TableCell>
                        <TableCell style={{width: "7rem"}}>Size</TableCell>
                        <TableCell style={{width: "15rem"}}>Tags</TableCell>
                        <TableCell style={{width: "5rem"}}>More</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {files.map( (op) => (
                    <FileMetaDownloadTableRow
                        me={props.me}
                        key={"file" + op.id}
                        onToggleSelection={onToggleSelection}
                        onEditComment={onEditComment}
                        selected={selected}
                        onDelete={onDelete}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
            </div>
        </TableContainer>
    )
}

function FileMetaDownloadTableRow(props){
    const [openDelete, setOpenDelete] = React.useState(false);
    const [openDetails, setOpenDetails] = React.useState(false);
    const [editCommentDialogOpen, setEditCommentDialogOpen] = React.useState(false);
    const [openPreviewStringsDialog, setOpenPreviewStringsDialog] = React.useState(false);
    const [openPreviewHexDialog, setOpenPreviewHexDialog] = React.useState(false);
    const [openPreviewMediaDialog, setOpenPreviewMediaDialog] = React.useState(false);
    const [fileContents, setFileContents] = React.useState('');
    const [openHostDialog, setOpenHostDialog] = React.useState(false);
    const me = props.me;
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
    const [previewFileString] = useMutation(previewFileQuery, {
        onCompleted: (data) => {
            if(data.previewFile.status === "success"){
                setFileContents(data.previewFile.contents);
                setOpenPreviewStringsDialog(true);
            }else{
                snackActions.error(data.previewFile.error)
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error(data);
        }
    });
    const [previewFileHex] = useMutation(previewFileQuery, {
        onCompleted: (data) => {
            if(data.previewFile.status === "success"){
                setFileContents(data.previewFile.contents);
                setOpenPreviewHexDialog(true);
            }else{
                snackActions.error(data.previewFile.error)
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error(data);
        }
    });
    const onAcceptDelete = () => {
        deleteFile({variables: {file_id: props.id}})
    }
    const onSelectChanged = (event) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        props.onToggleSelection(props.id, event.target.checked);
    }
    const [updateComment] = useMutation(updateFileComment, {
        onCompleted: (data) => {
            snackActions.success("updated comment");
            props.onEditComment(data.update_filemeta_by_pk)
        }
    });
    const onSubmitUpdatedComment = (comment) => {
        updateComment({variables: {file_id: props.id, comment: comment}})
    }
    const onPreviewStrings = (event) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        previewFileString({variables: {file_id: props.agent_file_id}})
    }
    const onPreviewHex = (event) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        previewFileHex({variables: {file_id: props.agent_file_id}})
    }
    const onPreviewMedia = (event) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        setOpenPreviewMediaDialog(true);
    }
    const expandRow = (event) => {
        if(event.target.localName === "td" || event.target.localName === "p"){
            setOpenDetails(!openDetails);
        }
    }
    const expandRowButton = (event) => {
        setOpenDetails(!openDetails);
    }
    const onOpenCloseComment = (event, open) => {
        if(event){
            event.stopPropagation();
        }

        setEditCommentDialogOpen(open);
    }
    return (
        <React.Fragment>
            <TableRow hover onClick={expandRow}>
                <MythicConfirmDialog onClose={() => {setOpenDelete(false);}} onSubmit={onAcceptDelete} open={openDelete}/>
                <MythicStyledTableCell>
                    {props.deleted ? null : (
                        <MythicStyledTooltip title="Toggle to download multiple files at once">
                            <Checkbox checked={props.selected[props.id] === undefined ? false : props.selected[props.id]}
                                      onChange={onSelectChanged}
                                      inputProps={{ 'aria-label': 'controlled' }} />
                        </MythicStyledTooltip>
                    )}
                    
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {props.deleted ? null : (
                        <>
                            <DeleteIcon color={"error"} fontSize={"large"} style={{height: "35px", cursor: "pointer"}}
                                        onClick={()=>{setOpenDelete(true);}}/>
                            <MythicStyledTooltip title={"Preview HEX XXD"}>
                                <img src={hexFile} alt={"preview hex"} style={{height: "35px", cursor: "pointer"}}
                                     onClick={onPreviewHex}/>
                            </MythicStyledTooltip>
                            <MythicStyledTooltip title={"Preview Strings"}>
                                <img src={txtFile} alt={"preview strings"} style={{height: "35px", cursor: "pointer"}}
                                     onClick={onPreviewStrings} />
                            </MythicStyledTooltip>
                            <MythicStyledTooltip title={"Preview Media"}>
                                <FontAwesomeIcon icon={faPhotoVideo} style={{height: "25px", bottom: "5px", position: "relative", cursor: "pointer", display: "inline-block"}}
                                            onClick={onPreviewMedia} />
                            </MythicStyledTooltip>
                            {openPreviewMediaDialog &&
                                <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewMediaDialog}
                                              onClose={(e)=>{setOpenPreviewMediaDialog(false);}}
                                              innerDialog={<PreviewFileMediaDialog
                                                  agent_file_id={props.agent_file_id}
                                                  filename={props.filename_text}
                                                  onClose={(e)=>{setOpenPreviewMediaDialog(false);}} />}
                                />
                            }
                        </>
                    )}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}><b>Host: </b>{props.host}</Typography>
                    {props.task?.callback?.mythictree_groups.length > 0 ? (
                        <Typography variant="body2" style={{wordBreak: "break-all"}}>
                            <b>Groups: </b>{props?.task?.callback.mythictree_groups.join(", ")}
                        </Typography>
                        ) : null}
                    {props.deleted ? (
                        <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.full_remote_path_text === "" ? props.filename_text : props.full_remote_path_text}</Typography>
                        ) : (
                        <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" + props.agent_file_id}>{props.full_remote_path_text === "" ? props.filename_text : props.full_remote_path_text}</Link>
                        )
                    }
                    {props.complete ? null : (
                            <Typography color="secondary" style={{wordBreak: "break-all"}} >{props.chunks_received} / {props.total_chunks} Chunks Received</Typography>
                        )
                    }
                </MythicStyledTableCell>
                <MythicStyledTableCell>{props.comment}<IconButton onClick={(e) => onOpenCloseComment(e, true)} size="small" style={{display: "inline-block"}}><EditIcon /></IconButton>
                    {editCommentDialogOpen &&
                        <MythicDialog fullWidth={true} maxWidth="md" open={editCommentDialogOpen}
                                      onClose={(e)=>{onOpenCloseComment(e, false);}}
                                      innerDialog={<MythicModifyStringDialog title="Edit File Comment" onSubmit={onSubmitUpdatedComment} value={props.comment} onClose={(e)=>{onOpenCloseComment(e, false);}} />}
                        />
                    }

                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {getStringSize({cellData: {"plaintext": props.size}})}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <ViewEditTags target_object={"filemeta_id"} target_object_id={props.id} me={me} />
                    <TagsDisplay tags={props.tags} />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <IconButton size="small" aria-label="expand row" onClick={expandRowButton}>
                            {openDetails ? <KeyboardArrowUpIcon className="mythicElement"/> : <KeyboardArrowDownIcon className="mythicElement"/>}
                        </IconButton>
                </MythicStyledTableCell>
            </TableRow>
                {openDetails ? (
                    <TableRow>
                        <MythicStyledTableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                            <Collapse in={openDetails}>
                                <Box margin={1}>
                                <TableContainer component={Paper} className="mythicElement" elevation={3}>   
                                    <Table  size="small" style={{tableLayout:"fixed", "width": "100%", "overflow": "scroll"}}>
                                        <TableHead>
                                            <TableRow>
                                                <MythicStyledTableCell style={{width: "25rem"}}>Identifiers</MythicStyledTableCell>
                                                <MythicStyledTableCell >Operator</MythicStyledTableCell>
                                                <MythicStyledTableCell style={{width: "6rem"}}>Task</MythicStyledTableCell>
                                                <MythicStyledTableCell>Time</MythicStyledTableCell>
                                                <MythicStyledTableCell>Command</MythicStyledTableCell>
                                                <MythicStyledTableCell>Host File</MythicStyledTableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow>
                                                <MythicStyledTableCell >
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}>MD5:  {props.md5}</Typography>
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}>SHA1: {props.sha1}</Typography>
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}>UUID: {props.agent_file_id}</Typography>
                                                </MythicStyledTableCell>
                                                <MythicStyledTableCell ><Typography variant="body2" style={{wordBreak: "break-all"}}>{props.operator.username}</Typography></MythicStyledTableCell>
                                                <MythicStyledTableCell>
                                                    {props.task === null ? null : (
                                                        <>
                                                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/task/" + props.task.display_id}>{props.task.display_id}</Link>&nbsp;(
                                                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/callbacks/" + props.task.callback.display_id}>{props.task.callback.display_id}</Link>)
                                                            <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.task.comment}</Typography>
                                                        </>
                                                        
                                                    )}
                                                    
                                                </MythicStyledTableCell>
                                                <MythicStyledTableCell >
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}>{toLocalTime(props.timestamp, me.user.view_utc_time)}</Typography>
                                                </MythicStyledTableCell>
                                                <MythicStyledTableCell>
                                                    {props.task === null ? null : (
                                                        <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.task.command.cmd}</Typography>
                                                    )}
                                                    
                                                </MythicStyledTableCell>
                                                <MythicStyledTableCell>
                                                    <MythicStyledTooltip title={"Host Payload Through C2"} >
                                                        <PublicIcon color={"info"} style={{marginLeft: "20px", cursor: "pointer"}} onClick={()=>{setOpenHostDialog(true);}}  />
                                                    </MythicStyledTooltip>
                                                    {openHostDialog &&
                                                        <MythicDialog fullWidth={true} maxWidth="md" open={openHostDialog}
                                                                      onClose={()=>{setOpenHostDialog(false);}}
                                                                      innerDialog={<HostFileDialog file_uuid={props.agent_file_id}
                                                                                                   file_name={props.full_remote_path_text === "" ? props.filename_text : props.full_remote_path_text}
                                                                                                   onClose={()=>{setOpenHostDialog(false);}} />}
                                                        />
                                                    }
                                                </MythicStyledTableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                </Box>
                            </Collapse>
                        </MythicStyledTableCell>
                    </TableRow>
            ) : null }
            {openPreviewStringsDialog &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewStringsDialog}
                              onClose={()=>{setOpenPreviewStringsDialog(false);}}
                              innerDialog={<PreviewFileStringDialog onClose={()=>{setOpenPreviewStringsDialog(false);}}
                                                                    filename={props.filename_text} contents={fileContents}
                              />}
                />
            }
            {openPreviewHexDialog &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewHexDialog}
                              onClose={()=>{setOpenPreviewHexDialog(false);}}
                              innerDialog={<PreviewFileHexDialog onClose={()=>{setOpenPreviewHexDialog(false);}}
                                                                 filename={props.filename_text} contents={fileContents}
                              />}
                />
            }
        </React.Fragment>
    )
}

export function FileMetaUploadTable(props){
    const [selected, setSelected] = React.useState({});
    const [files, setFiles] = React.useState([]);
    const [checkAll, setCheckAll] = React.useState(false);
    const [disabled, setDisabled] = React.useState(true);
    const onToggleSelection = (id, checked) => {
        setSelected({...selected, [id]: checked});
    }
    const onToggleCheckAll = () => {
        if(checkAll){
            // it's currently checked and clicked again, untoggle it all
            setCheckAll(false);
            setSelected({});
        } else {
            setCheckAll(true);
            const newSelected = files.reduce( (prev, cur) => {
                if(!cur.deleted){
                    return {...prev, [cur.id]: true};
                } else {
                    return {...prev}
                }

            }, {});
            setSelected(newSelected);
        }
    }
    useEffect( () => {
        const initialSelected = props.files.reduce( (prev, file) => {
            return {...prev, [file.id]: false}
        }, {});
        const initialFiles = props.files.reduce( (prev, file) => {
            return [...prev, {...file, filename_text: b64DecodeUnicode(file.filename_text), full_remote_path_text: b64DecodeUnicode(file.full_remote_path_text)}]
        }, []);
        setSelected(initialSelected);
        setFiles(initialFiles);
    }, [props.files]);
    const [downloadBulk] = useMutation(downloadBulkQuery, {
        onCompleted: (data) => {
            snackActions.dismiss();
            if(data.download_bulk.status === "success"){
                snackActions.success(<MythicSnackDownload title="Download Zip File" file_id={data.download_bulk.file_id} />, {toastId: data.download_bulk.file_id, autoClose: false, closeOnClick: false});
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
        for(const [key, value] of Object.entries(selected)){
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
    const onDelete = ({file_ids}) => {
        const updated = files.map( (file) => {
            if(file_ids.includes(file.id)){
                return {...file, deleted: true};
            }else{
                return {...file}
            }
        });
        setFiles(updated);
    }
    const onEditComment = ({id, comment}) => {
        const updated = files.map( (file) => {
            if(file.id === id){
                return {...file, comment: comment};
            }else{
                return {...file}
            }
        });
        setFiles(updated);
    }
    useEffect( () => {
        for(const [key, value] of Object.entries(selected)){
            if(value){
                setDisabled(false);
                return
            }
        }
        setDisabled(true);
    }, [selected]);
    return (
        <TableContainer component={Paper} className="mythicElement" style={{display: "flex", flexDirection: "column", height: "100%"}} >
            <Button size="small" onClick={onDownloadBulk} style={{float: "right"}}
                    color="primary" variant="contained"
                    disabled={disabled}
            >
                <ArchiveIcon/>Zip & Download Selected
            </Button>
            <div style={{height: "100%", overflowY: "auto"}}>
                <Table stickyHeader size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{width: "3rem"}}>
                                <Checkbox checked={checkAll} onChange={onToggleCheckAll}
                                          inputProps={{ 'aria-label': 'controlled' }} />
                            </TableCell>
                            <TableCell style={{width: "9rem"}}>Actions</TableCell>
                            <TableCell style={{width: "20rem"}}>Source</TableCell>
                            <TableCell style={{width: "20rem"}}>Destination</TableCell>
                            <TableCell style={{width: "15rem"}}>Comment</TableCell>
                            <TableCell style={{width: "7rem"}}>Size</TableCell>
                            <TableCell style={{width: "15rem"}}>Tags</TableCell>
                            <TableCell style={{width: "5rem"}}>More</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>

                        {files.map( (op) => (
                            <FileMetaUploadTableRow
                                me={props.me}
                                key={"file" + op.id}
                                onToggleSelection={onToggleSelection}
                                onEditComment={onEditComment}
                                selected={selected}
                                onDelete={onDelete}
                                {...op}
                            />
                        ))}
                    </TableBody>
                </Table>
            </div>
        </TableContainer>
    )
}

function FileMetaUploadTableRow(props){
    const [openDelete, setOpenDelete] = React.useState(false);
    const [openDetails, setOpenDetails] = React.useState(false);
    const [editCommentDialogOpen, setEditCommentDialogOpen] = React.useState(false);
    const [openPreviewStringsDialog, setOpenPreviewStringsDialog] = React.useState(false);
    const [openPreviewMediaDialog, setOpenPreviewMediaDialog] = React.useState(false);
    const [openPreviewHexDialog, setOpenPreviewHexDialog] = React.useState(false);
    const [fileContents, setFileContents] = React.useState('');
    const [openHostDialog, setOpenHostDialog] = React.useState(false);
    const me = props.me;
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
        props.onToggleSelection(props.id, event.target.checked);
    }
    const [updateComment] = useMutation(updateFileComment, {
        onCompleted: (data) => {
            snackActions.success("updated comment");
            props.onEditComment(data.update_filemeta_by_pk)
        }
    });
    const onSubmitUpdatedComment = (comment) => {
        updateComment({variables: {file_id: props.id, comment: comment}})
    }
    const [previewFileString] = useMutation(previewFileQuery, {
        onCompleted: (data) => {
            if(data.previewFile.status === "success"){
                setFileContents(data.previewFile.contents);
                setOpenPreviewStringsDialog(true);
            }else{
                snackActions.error(data.previewFile.error)
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error(data);
        }
    });
    const [previewFileHex] = useMutation(previewFileQuery, {
        onCompleted: (data) => {
            if(data.previewFile.status === "success"){
                setFileContents(data.previewFile.contents);
                setOpenPreviewHexDialog(true);
            }else{
                snackActions.error(data.previewFile.error)
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error(data);
        }
    });
    const onPreviewStrings = (event) => {
        if(event){
            event.stopPropagation();
        }
        previewFileString({variables: {file_id: props.agent_file_id}})
    }
    const onPreviewHex = (event) => {
        if(event){
            event.stopPropagation();
        }
        previewFileHex({variables: {file_id: props.agent_file_id}})
    }
    const onPreviewMedia = (event) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        setOpenPreviewMediaDialog(true);
    }
    const expandRow = (event) => {
        if(event.target.nodeName === 'INPUT'){
            return
        }
        if(event.target.localName === "td" || event.target.localName === "p"){
            setOpenDetails(!openDetails);
        }
    }
    const onOpenCloseComment = (event, open) => {
        if(event){
            event.stopPropagation();
        }
        setEditCommentDialogOpen(open);
    }
    const expandRowButton = (event) => {
        setOpenDetails(!openDetails);
    }
    return (
        <React.Fragment>
            <TableRow hover onClick={expandRow}>
                {openDelete && <MythicConfirmDialog onClose={() => {setOpenDelete(false);}} onSubmit={onAcceptDelete} open={openDelete}/>}
                <MythicStyledTableCell>
                    {props.deleted ? null : (
                        <MythicStyledTooltip title="Toggle to download multiple files at once">
                            <Checkbox checked={props.selected[props.id] === undefined ? false : props.selected[props.id]}
                                      onChange={onSelectChanged}
                                      inputProps={{ 'aria-label': 'controlled' }} />
                        </MythicStyledTooltip>
                    )}
                    
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {props.deleted ? null : (
                        <>
                            <DeleteIcon color={"error"} fontSize={"large"} style={{height: "35px", cursor: "pointer"}}
                                        onClick={()=>{setOpenDelete(true);}}/>
                            <MythicStyledTooltip title={"Preview HEX XXD"}>
                                <img src={hexFile} alt={"preview hex"} style={{height: "35px", cursor: "pointer"}}
                                     onClick={onPreviewHex}/>
                            </MythicStyledTooltip>
                            <MythicStyledTooltip title={"Preview Strings"}>
                                <img src={txtFile} alt={"preview strings"} style={{height: "35px", cursor: "pointer"}}
                                     onClick={onPreviewStrings} />
                            </MythicStyledTooltip>
                            <MythicStyledTooltip title={"Preview Media"}>
                                <FontAwesomeIcon icon={faPhotoVideo} style={{height: "25px", bottom: "5px", position: "relative", cursor: "pointer", display: "inline-block"}}
                                                 onClick={onPreviewMedia} />
                            </MythicStyledTooltip>
                            {openPreviewMediaDialog &&
                                <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewMediaDialog}
                                              onClose={(e)=>{setOpenPreviewMediaDialog(false);}}
                                              innerDialog={<PreviewFileMediaDialog
                                                  agent_file_id={props.agent_file_id}
                                                  filename={props.filename_text}
                                                  onClose={(e)=>{setOpenPreviewMediaDialog(false);}} />}
                                />
                            }
                        </>
                    )}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" + props.agent_file_id}>{props.filename_text}</Link>
                </MythicStyledTableCell>
                <MythicStyledTableCell  style={{wordBreak: "break-all"}}>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}>
                        {props.host !== "" ? (
                            <><b>Host: </b>{props.host}</>
                        ) : null}
                    </Typography>
                    {props.task?.callback?.mythictree_groups.length > 0 ? (
                        <Typography variant="body2" style={{wordBreak: "break-all"}}>
                            <b>Groups: </b>{props?.task?.callback.mythictree_groups.join(", ")}
                        </Typography>
                    ) : null}
                    {props.deleted ? (<Typography variant="body2" style={{wordBreak: "break-all"}}>{props.full_remote_path_text}</Typography>) : (
                        props.complete ? (
                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" +  props.agent_file_id}>{props.full_remote_path_text}</Link>
                        ) : (
                            <React.Fragment>
                                <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.full_remote_path_text}</Typography> <Typography color="secondary" style={{wordBreak: "break-all"}} >{props.chunks_received} / {props.total_chunks} Chunks Received</Typography>
                            </React.Fragment>
                        )
                    )}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {props.comment}<IconButton onClick={(e) => onOpenCloseComment(e, true)} size="small" style={{display: "inline-block"}}><EditIcon /></IconButton>
                    <MythicDialog fullWidth={true} maxWidth="md" open={editCommentDialogOpen} 
                        onClose={(e)=>{onOpenCloseComment(e, false)}}
                        innerDialog={<MythicModifyStringDialog title="Edit File Comment" onSubmit={onSubmitUpdatedComment} value={props.comment} onClose={(e)=>{onOpenCloseComment(e, false)}} />}
                    />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {getStringSize({cellData: {"plaintext": props.size}})}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <ViewEditTags target_object={"filemeta_id"} target_object_id={props.id} me={me} />
                    <TagsDisplay tags={props.tags} />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <IconButton size="small" aria-label="expand row" onClick={expandRowButton}>
                            {openDetails ? <KeyboardArrowUpIcon className="mythicElement"/> : <KeyboardArrowDownIcon className="mythicElement"/>}
                        </IconButton>
                </MythicStyledTableCell>
            </TableRow>
                {openDetails ? (
                    <TableRow>
                        <MythicStyledTableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                            <Collapse in={openDetails}>
                                <Box margin={1}>
                                <TableContainer component={Paper} className="mythicElement" elevation={3}>   
                                    <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell style={{width: "25rem"}}>Identifiers</TableCell>
                                                <TableCell >Operator</TableCell>
                                                <TableCell style={{width: "6rem"}}>Task</TableCell>
                                                <TableCell>Timestamp</TableCell>
                                                <TableCell>Command</TableCell>
                                                <TableCell>Host File</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow>
                                                <MythicStyledTableCell>
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}>MD5: {props.md5}</Typography>
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}>SHA1: {props.sha1}</Typography>
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}>UUID: {props.agent_file_id}</Typography>
                                                </MythicStyledTableCell>
                                                <MythicStyledTableCell><Typography variant="body2" style={{wordBreak: "break-all"}}>{props.operator.username}</Typography></MythicStyledTableCell>
                                                <MythicStyledTableCell>
                                                    {props.task === null ? null : (
                                                        <>
                                                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/task/" + props.task.display_id}>{props.task.display_id}</Link>&nbsp;(
                                                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/callbacks/" + props.task.callback.display_id}>{props.task.callback.display_id}</Link>)
                                                            <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.task.comment}</Typography>
                                                        </>
                                                    )}
                                                    
                                                </MythicStyledTableCell>
                                                <MythicStyledTableCell>
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}>{toLocalTime(props.timestamp, me.user.view_utc_time)}</Typography>
      
                                                    </MythicStyledTableCell>
                                                <MythicStyledTableCell>
                                                    {props.task === null ? null : (
                                                        <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.task.command.cmd}</Typography>
                                                    )}
                                                </MythicStyledTableCell>
                                                <MythicStyledTableCell>
                                                    <MythicStyledTooltip title={"Host Payload Through C2"} >
                                                        <PublicIcon color={"info"} style={{marginLeft: "20px", cursor: "pointer"}} onClick={()=>{setOpenHostDialog(true);}}  />
                                                    </MythicStyledTooltip>
                                                    {openHostDialog &&
                                                        <MythicDialog fullWidth={true} maxWidth="md" open={openHostDialog}
                                                                      onClose={()=>{setOpenHostDialog(false);}}
                                                                      innerDialog={<HostFileDialog file_uuid={props.agent_file_id}
                                                                                                   file_name={props.full_remote_path_text === "" ? props.filename_text : props.full_remote_path_text}
                                                                                                   onClose={()=>{setOpenHostDialog(false);}} />}
                                                        />
                                                    }
                                                </MythicStyledTableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                </Box>
                            </Collapse>
                        </MythicStyledTableCell>
                    </TableRow>
            ) : null }
            {openPreviewStringsDialog &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewStringsDialog}
                              onClose={()=>{setOpenPreviewStringsDialog(false);}}
                              innerDialog={<PreviewFileStringDialog onClose={()=>{setOpenPreviewStringsDialog(false);}}
                                                                    filename={props.filename_text} contents={fileContents}
                              />}
                />
            }
            {openPreviewHexDialog &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewHexDialog}
                              onClose={()=>{setOpenPreviewHexDialog(false);}}
                              innerDialog={<PreviewFileHexDialog onClose={()=>{setOpenPreviewHexDialog(false);}}
                                                                 filename={props.filename_text} contents={fileContents}
                              />}
                />
            }
        </React.Fragment>
    )
}

export function FileMetaScreenshotTable(props){
    const [files, setFiles] = React.useState([]);
    useEffect( () => {
        const initialFiles = props.files.reduce( (prev, file) => {
            return [...prev, {...file, filename_text: b64DecodeUnicode(file.filename_text), full_remote_path_text: b64DecodeUnicode(file.full_remote_path_text)}]
        }, []);
        setFiles(initialFiles);
    }, [props.files]);
    const onEditComment = ({id, comment}) => {
        const updated = files.map( (file) => {
            if(file.id === id){
                return {...file, comment: comment};
            }else{
                return {...file}
            }
        });
        setFiles(updated);
    }
    const onDelete = ({file_ids}) => {
        const updated = files.map( (file) => {
            if(file_ids.includes(file.id)){
                return {...file, deleted: true};
            }else{
                return {...file}
            }
        });
        setFiles(updated);
    }
    const imageRefs = files.map( f => f.agent_file_id);

    return (
        <TableContainer component={Paper} className="mythicElement">   
            <Table stickyHeader size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "5rem"}}>Delete</TableCell>
                        <TableCell style={{width: "300px"}}>Thumbnail</TableCell>
                        <TableCell >Filename</TableCell>
                        <TableCell >Time</TableCell>
                        <TableCell >Host</TableCell>
                        <TableCell >Comment</TableCell>
                        <TableCell >Size</TableCell>
                        <TableCell>Tags</TableCell>
                        <TableCell >More</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {files.map( (op, index) => (
                    <FileMetaScreenshotTableRow
                        key={"file" + op.id}
                        onEditComment={onEditComment}
                        {...op}
                        index={index}
                        imageRefs={imageRefs}
                        onDelete={onDelete}
                        me={props.me}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}
function FileMetaScreenshotTableRow(props){
    const [openDelete, setOpenDelete] = React.useState(false);
    const [openDetails, setOpenDetails] = React.useState(false);
    const me = props.me;
    const now = (new Date()).toISOString();
    const theme = useTheme();
    const [openScreenshot, setOpenScreenshot] = React.useState(false);
    const [editCommentDialogOpen, setEditCommentDialogOpen] = React.useState(false);
    const [updateComment] = useMutation(updateFileComment, {
        onCompleted: (data) => {
            snackActions.success("updated comment");
            props.onEditComment(data.update_filemeta_by_pk)
        }
    });
    const onSubmitUpdatedComment = (comment) => {
        updateComment({variables: {file_id: props.id, comment: comment}})
    }
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
    const expandRowButton = (event) => {
        if(event.target.localName === "td" || event.target.localName === "p"){
            setOpenDetails(!openDetails);
        }
        event.stopPropagation();
    }
    return (
        <React.Fragment>
            <TableRow hover onClick={expandRowButton}>
                {openDelete && <MythicConfirmDialog onClose={() => {setOpenDelete(false);}} onSubmit={onAcceptDelete} open={openDelete}/>}
                <MythicStyledTableCell>
                    {props.deleted ? null : (
                        <IconButton size="small" onClick={()=>{setOpenDelete(true);}} style={{color: theme.palette.error.main}} variant="contained"><DeleteIcon/></IconButton>
                    )}
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <img onClick={() => setOpenScreenshot(true)} src={"/api/v1.4/files/screencaptures/" + props.agent_file_id + "?" + now} style={{width: "270px", cursor: "pointer"}} />
                    {openScreenshot && 
                        <MythicDialog fullWidth={true} maxWidth="xl" open={openScreenshot} 
                            onClose={()=>{setOpenScreenshot(false);}} 
                            innerDialog={<ResponseDisplayScreenshotModal images={props.imageRefs} startIndex={props.index} onClose={()=>{setOpenScreenshot(false);}} />} />
                    }       
                    {props.chunks_received < props.total_chunks ? (<Typography color="secondary" style={{wordBreak: "break-all"}} >{props.chunks_received} / {props.total_chunks} Chunks Received</Typography>) : (null)}
                </MythicStyledTableCell>
                <MythicStyledTableCell><Typography variant="body2" style={{wordBreak: "break-all"}}>{props.filename_text}</Typography></MythicStyledTableCell>
                <MythicStyledTableCell><Typography variant="body2" style={{wordBreak: "break-all"}}>{toLocalTime(props.timestamp, me.user.view_utc_time)}</Typography></MythicStyledTableCell>
                <MythicStyledTableCell><Typography variant="body2" style={{wordBreak: "break-all"}}>{props.host}</Typography></MythicStyledTableCell>
                <MythicStyledTableCell>
                    {props.comment}<IconButton onClick={() => setEditCommentDialogOpen(true)} size="small" style={{display: "inline-block"}}><EditIcon /></IconButton>
                    <MythicDialog fullWidth={true} maxWidth="md" open={editCommentDialogOpen} 
                        onClose={()=>{setEditCommentDialogOpen(false);}} 
                        innerDialog={<MythicModifyStringDialog title="Edit File Comment" onSubmit={onSubmitUpdatedComment} value={props.comment} onClose={()=>{setEditCommentDialogOpen(false);}} />}
                    />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {getStringSize({cellData: {"plaintext": props.size}})}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <ViewEditTags target_object={"filemeta_id"} target_object_id={props.id} me={me} />
                    <TagsDisplay tags={props.tags} />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <IconButton size="small" aria-label="expand row" onClick={() => setOpenDetails(!openDetails)}>
                            {openDetails ? <KeyboardArrowUpIcon className="mythicElement"/> : <KeyboardArrowDownIcon className="mythicElement"/>}
                        </IconButton>
                </MythicStyledTableCell>
            </TableRow>
                {openDetails ? (
                    <TableRow>
                        <MythicStyledTableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                            <Collapse in={openDetails}>
                                <Box margin={1}>
                                <TableContainer component={Paper} className="mythicElement">   
                                    <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "99%", "overflow": "scroll"}}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell style={{width: "25rem"}}>Identifiers</TableCell>
                                                <TableCell >Operator</TableCell>
                                                <TableCell style={{width: "6rem"}}>Task</TableCell>
                                                <TableCell>Task Comment</TableCell>
                                                <TableCell>Command</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow>
                                                <MythicStyledTableCell>
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}>MD5:  {props.md5}</Typography>
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}>SHA1: {props.sha1}</Typography>
                                                    <Typography variant="body2" style={{wordBreak: "break-all"}}>UUID: {props.agent_file_id}</Typography>
                                                </MythicStyledTableCell>
                                                <MythicStyledTableCell><Typography variant="body2" style={{wordBreak: "break-all"}}>{props.operator.username}</Typography></MythicStyledTableCell>
                                                <MythicStyledTableCell>
                                                    {props.task === null ? null : (
                                                        <>
                                                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/task/" + props.task.display_id}>{props.task.display_id}</Link>&nbsp;(
                                                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/callbacks/" + props.task.callback.display_id}>{props.task.callback.display_id}</Link>)
                                                        </>
                                                    )}
                                                    
                                                </MythicStyledTableCell>
                                                <MythicStyledTableCell>{props.task !== null ? (<Typography variant="body2" style={{wordBreak: "break-all"}}>{props.task.comment}</Typography>) : (null)}</MythicStyledTableCell>
                                                <MythicStyledTableCell>
                                                    {props.task === null ? null : (
                                                        <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.task.command.cmd}</Typography>
                                                    )}
                                                </MythicStyledTableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                </Box>
                            </Collapse>
                        </MythicStyledTableCell>
                    </TableRow>
            ) : null }
        </React.Fragment>
    )
}