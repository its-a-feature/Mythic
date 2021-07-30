import React, { useEffect } from 'react';
import {Button, IconButton, Typography} from '@material-ui/core';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { MythicDialog, MythicModifyStringDialog, MythicViewJSONAsTableDialog } from '../../MythicComponents/MythicDialog';
import {DownloadHistoryDialog} from '../Callbacks/DownloadHistoryDialog';
import HistoryIcon from '@material-ui/icons/History';
import PlaylistAddCheckIcon from '@material-ui/icons/PlaylistAddCheck';
import Tooltip from '@material-ui/core/Tooltip';
import { gql, useMutation } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import EditIcon from '@material-ui/icons/Edit';

const updateFileComment = gql`
mutation updateCommentMutation($filebrowserobj_id: Int!, $comment: String!){
    update_filebrowserobj_by_pk(pk_columns: {id: $filebrowserobj_id}, _set: {comment: $comment}) {
        comment
        id
    }
}
`;

export function FileBrowserTable(props){
    const [files, setFiles] = React.useState([]);
    useEffect( () => {
        setFiles([...props.files]);
    }, [props.files]);
    const onEditComment = ({id, comment}) => {
        const updates = files.map( (file) => {
            if(file.id === id){
                return {...file, comment}
            }else{
                return {...file}
            }
        });
        setFiles(updates);
    }
    return (
        <TableContainer component={Paper} className="mythicElement" style={{height: "calc(78vh)"}}>
            <Table stickyHeader size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell >Host / Path</TableCell>
                        <TableCell >Modify Time</TableCell>
                        <TableCell >Comment</TableCell>
                        <TableCell style={{width: "7rem"}}>Permissions</TableCell>
                        <TableCell style={{width: "7rem"}}>Downloads</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {files.map( (op) => (
                    <FileBrowserTableRow
                        key={"file" + op.id}
                        onEditComment={onEditComment}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

function FileBrowserTableRow(props){
    const [viewPermissionsDialogOpen, setViewPermissionsDialogOpen] = React.useState(false);
    const [fileHistoryDialogOpen, setFileHistoryDialogOpen] = React.useState(false);
    const [editCommentDialogOpen, setEditCommentDialogOpen] = React.useState(false);
    const [updateComment] = useMutation(updateFileComment, {
        onCompleted: (data) => {
            snackActions.success("updated comment");
            props.onEditComment(data.update_filebrowserobj_by_pk)
        }
    });
    const onSubmitUpdatedComment = (comment) => {
        updateComment({variables: {filebrowserobj_id: props.id, comment: comment}})
    }
    return (
        <React.Fragment>
            <TableRow hover>
                <MythicDialog fullWidth={true} maxWidth="md" open={viewPermissionsDialogOpen} 
                    onClose={()=>{setViewPermissionsDialogOpen(false);}} 
                    innerDialog={<MythicViewJSONAsTableDialog title="View Permissions Data" leftColumn="Permission" rightColumn="Value" value={props.permissions} onClose={()=>{setViewPermissionsDialogOpen(false);}} />}
                    />
                <MythicDialog fullWidth={true} maxWidth="md" open={fileHistoryDialogOpen} 
                    onClose={()=>{setFileHistoryDialogOpen(false);}} 
                    innerDialog={<DownloadHistoryDialog title="Download History" value={props.filemeta} onClose={()=>{setFileHistoryDialogOpen(false);}} />}
                />
                <MythicDialog fullWidth={true} maxWidth="md" open={editCommentDialogOpen} 
                    onClose={()=>{setEditCommentDialogOpen(false);}} 
                    innerDialog={<MythicModifyStringDialog title="Edit File Browser Comment" onSubmit={onSubmitUpdatedComment} value={props.comment} onClose={()=>{setEditCommentDialogOpen(false);}} />}
                />
                <TableCell>
                <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.host}</Typography>
                <Typography variant="body2" style={{wordBreak: "break-all", textDecoration: props.deleted ? "strike-through" : ""}}>{props.full_path_text}</Typography>
                </TableCell>
                <TableCell >
                    <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.modify_time}</Typography>
                </TableCell>
                <TableCell><IconButton onClick={() => setEditCommentDialogOpen(true)} size="small" style={{display: "inline-block"}}><EditIcon /></IconButton><Typography variant="body2" style={{wordBreak: "break-all", display: "inline-block"}}>{props.comment}</Typography></TableCell>
                <TableCell>
                    <Button color="primary" variant="outlined" onClick={() => setViewPermissionsDialogOpen(true)}><PlaylistAddCheckIcon /></Button>
                </TableCell>
                <TableCell>
                    {props.filemeta.length > 0 ? (
                        <Tooltip title="View Download History and Download Files">
                            <Button color="primary" variant="contained" onClick={() => setFileHistoryDialogOpen(true)}><HistoryIcon /></Button>
                        </Tooltip>
                    ): (null)}
                </TableCell>
            </TableRow>
        </React.Fragment>
    )
}

