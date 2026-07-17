import React, { useEffect } from 'react';
import {Link} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { MythicDialog, MythicModifyStringDialog, MythicViewJSONAsTableDialog } from '../../MythicComponents/MythicDialog';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import { gql, useMutation } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import EditIcon from '@mui/icons-material/Edit';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {TagsDisplay, ViewEditTags} from '../../MythicComponents/MythicTag';
import {MythicStatusChip} from "../../MythicComponents/MythicStatusChip";
import {MythicActionButton} from "../../MythicComponents/MythicActionButton";

const singleLineCellStyle = {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
};

const updateFileComment = gql`
mutation updateCommentMutation($mythictree_id: Int!, $comment: String!){
    update_mythictree_by_pk(pk_columns: {id: $mythictree_id}, _set: {comment: $comment}) {
        comment
        id
    }
}
`;

export function ProcessTable(props){
    const [files, setFiles] = React.useState([]);
    useEffect( () => {
        setFiles([...props.processes]);
    }, [props.processes]);
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
        <TableContainer className="mythicElement" style={{height: "100%", overflowY: "auto"}} >
            <Table stickyHeader size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "5rem"}}>Metadata</TableCell>
                        <TableCell style={{width: "6rem"}}> PID </TableCell>
                        <TableCell >Info</TableCell>
                        <TableCell >Name</TableCell>
                        <TableCell style={{width: "15rem"}}>Comment</TableCell>
                        <TableCell style={{width: "10rem"}}>Tags</TableCell>

                    </TableRow>
                </TableHead>
                <TableBody>
                
                {files.map( (op) => (
                    <ProcessTableRow
                        key={"process" + op.id}
                        me={props.me}
                        onEditComment={onEditComment}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}
function ProcessTableRow(props){
    const me = props.me;
    const [viewPermissionsDialogOpen, setViewPermissionsDialogOpen] = React.useState(false);
    const [editCommentDialogOpen, setEditCommentDialogOpen] = React.useState(false);
    const [updateComment] = useMutation(updateFileComment, {
        onCompleted: (data) => {
            snackActions.success("updated comment");
            props.onEditComment(data.update_mythictree_by_pk)
        }
    });
    const onSubmitUpdatedComment = (comment) => {
        updateComment({variables: {mythictree_id: props.id, comment: comment}})
    }
    return (
        <React.Fragment>
            <TableRow hover>
                {viewPermissionsDialogOpen && <MythicDialog fullWidth={true} maxWidth="md" open={viewPermissionsDialogOpen}
                    onClose={()=>{setViewPermissionsDialogOpen(false);}} 
                    innerDialog={<MythicViewJSONAsTableDialog title="View Permissions Data" leftColumn="Permission" rightColumn="Value" value={props.metadata} onClose={()=>{setViewPermissionsDialogOpen(false);}} />}
                    />
                }
                {editCommentDialogOpen && <MythicDialog fullWidth={true} maxWidth="md" open={editCommentDialogOpen}
                    onClose={()=>{setEditCommentDialogOpen(false);}} 
                    innerDialog={<MythicModifyStringDialog title="Edit File Browser Comment" onSubmit={onSubmitUpdatedComment} value={props.comment} onClose={()=>{setEditCommentDialogOpen(false);}} />}
                />
                }
                <MythicStyledTableCell>
                    <MythicActionButton appearance="raised" icon={<PlaylistAddCheckIcon />} iconOnly onClick={() => setViewPermissionsDialogOpen(true)} tone="info" tooltip="View permissions data" />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div
                        className="mythic-search-result-value"
                        style={{...singleLineCellStyle, textDecoration: props.deleted ? "line-through" : ""}}
                        title={props.full_path_text}
                    >
                        {props.full_path_text}
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-stack">
                        <div className="mythic-search-result-inline">
                            <span className="mythic-search-result-label">Host</span>
                            <span className="mythic-search-result-value">{props.host}</span>
                        </div>
                        {props.callback ? (
                            <div className="mythic-search-result-link-row">
                                <span className="mythic-search-result-label">Callback</span>
                                <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                      href={"/new/callbacks/" + props.callback.display_id}>
                                    C-{props.callback.display_id}
                                </Link>
                                {props.task ? (
                                    <>
                                        <span className="mythic-search-result-secondary">/</span>
                                        <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                              href={"/new/task/" + props.task.display_id}>
                                            T-{props.task.display_id}
                                        </Link>
                                    </>
                                ) : null}
                            </div>
                        ) : null}
                        {props.callback?.mythictree_groups.length > 0 ? (
                            <div className="mythic-search-result-secondary">
                                Groups: {props?.callback.mythictree_groups.join(", ")}
                            </div>
                        ) : null}
                    </div>
                </MythicStyledTableCell>

                <MythicStyledTableCell>
                    <div className="mythic-search-result-stack">
                        <div className="mythic-search-result-value" style={singleLineCellStyle} title={props.name_text}>
                            {props.name_text}
                        </div>
                        {props.deleted &&
                            <MythicStatusChip compact status="deleted" />
                        }
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-action-row">
                        <MythicActionButton appearance="raised" icon={<EditIcon />} iconOnly onClick={() => setEditCommentDialogOpen(true)} tone="info" tooltip="Edit comment" />
                        <span className="mythic-search-result-secondary">{props.comment || "No comment"}</span>
                    </div>
                    </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <ViewEditTags target_object={"mythictree_id"} target_object_id={props.id} me={me} />
                    <TagsDisplay tags={props.tags} />
                </MythicStyledTableCell>

            </TableRow>
        </React.Fragment>
    )
}
