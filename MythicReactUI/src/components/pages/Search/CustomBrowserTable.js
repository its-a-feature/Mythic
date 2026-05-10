import React, { useEffect } from 'react';
import {IconButton, Link} from '@mui/material';
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
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';

const singleLineCellStyle = {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
};

const formatMetadataValue = (value) => {
    if(value === null || value === undefined){
        return "";
    }
    if(typeof value === "object"){
        return JSON.stringify(value);
    }
    return String(value);
};

const updateFileComment = gql`
mutation updateCommentMutation($mythictree_id: Int!, $comment: String!){
    update_mythictree_by_pk(pk_columns: {id: $mythictree_id}, _set: {comment: $comment}) {
        comment
        id
    }
}
`;

export function CustomBrowserTable({rows, columns=[], me}){
    const [entries, setEntries] = React.useState([]);
    useEffect( () => {
        setEntries([...rows]);
    }, [rows]);
    const onEditComment = ({id, comment}) => {
        const updates = entries.map( (file) => {
            if(file.id === id){
                return {...file, comment}
            }else{
                return {...file}
            }
        });
        setEntries(updates);
    }
    const metadataColumnWidth = columns.length > 0 ? "12rem" : undefined;
    const tableMinWidth = `${48 + (columns.length * 12)}rem`;
    return (
        <TableContainer className="mythicElement" style={{height: "100%", overflow: "auto"}} >
            <Table stickyHeader size="small" style={{tableLayout: "fixed", minWidth: tableMinWidth}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "24rem"}}>Entry</TableCell>
                        {columns.map((column, index) => (
                            <TableCell key={index} style={{width: metadataColumnWidth}}>{column.name}</TableCell>
                        ))}
                        <TableCell style={{width: "16rem"}}>Comment</TableCell>
                        <TableCell style={{width: "8rem"}}>Tags</TableCell>

                    </TableRow>
                </TableHead>
                <TableBody>
                {entries.map( (op) => (
                    <CustomBrowserTableRow
                        key={"browser" + op.id}
                        me={me}
                        onEditComment={onEditComment}
                        columns={columns}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}
function CustomBrowserTableRow(props){
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
                    innerDialog={<MythicViewJSONAsTableDialog title="View Metadata" leftColumn="Name" rightColumn="Value" value={props.metadata} onClose={()=>{setViewPermissionsDialogOpen(false);}} />}
                    />
                }
                {editCommentDialogOpen && <MythicDialog fullWidth={true} maxWidth="md" open={editCommentDialogOpen}
                    onClose={()=>{setEditCommentDialogOpen(false);}} 
                    innerDialog={<MythicModifyStringDialog title="Edit Browser Comment" onSubmit={onSubmitUpdatedComment} value={props.comment} onClose={()=>{setEditCommentDialogOpen(false);}} />}
                />
                }
                <MythicStyledTableCell>
                    <div className="mythic-search-result-stack mythic-search-result-stack-spacious">
                        <div className="mythic-search-result-action-row">
                            <MythicStyledTooltip title="View metadata">
                                <IconButton
                                    className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                                    size="small"
                                    onClick={() => setViewPermissionsDialogOpen(true)}
                                >
                                    <PlaylistAddCheckIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                            <span
                                className="mythic-search-result-primary"
                                style={{...singleLineCellStyle, textDecoration: props.deleted ? "line-through" : ""}}
                                title={props.name_text || props.full_path_text}
                            >
                                {props.name_text || props.full_path_text}
                            </span>
                        </div>
                        <div className="mythic-search-result-inline">
                            <span className="mythic-search-result-label">Host</span>
                            <span className="mythic-search-result-value" style={singleLineCellStyle} title={props.host}>{props.host}</span>
                        </div>
                        {props.full_path_text && props.full_path_text !== props.name_text ? (
                            <div className="mythic-search-result-code mythic-search-result-code-compact" title={props.full_path_text}>
                                {props.full_path_text}
                            </div>
                        ) : null}
                        {props.callback ? (
                            <div className="mythic-search-result-link-row">
                                <span className="mythic-search-result-label">Callback</span>
                                <Link color="textPrimary" underline="always" target="_blank"
                                      href={"/new/callbacks/" + props.callback.display_id}>
                                    C-{props.callback.display_id}
                                </Link>
                                {props.task ? (
                                    <React.Fragment>
                                        <span className="mythic-search-result-secondary">/</span>
                                        <span className="mythic-search-result-label">Task</span>
                                        <Link color="textPrimary" underline="always" target="_blank"
                                              href={"/new/task/" + props.task.display_id}>
                                            T-{props.task.display_id}
                                        </Link>
                                    </React.Fragment>
                                ) : null}
                            </div>
                        ) : null}
                        {props.callback?.mythictree_groups?.length > 0 ? (
                            <div className="mythic-search-result-secondary">
                                Groups: {props.callback.mythictree_groups.join(", ")}
                            </div>
                        ) : null}
                    </div>

                </MythicStyledTableCell>
                {props.columns.map((column, index) => (
                    <MythicStyledTableCell key={index}>
                        <div
                            className="mythic-search-result-value"
                            style={singleLineCellStyle}
                            title={formatMetadataValue(props.metadata?.[column.key])}
                        >
                            {formatMetadataValue(props.metadata?.[column.key]) || <span className="mythic-search-result-secondary">None</span>}
                        </div>
                    </MythicStyledTableCell>
                ))}
                <MythicStyledTableCell>
                    <div className="mythic-search-result-action-row">
                        <MythicStyledTooltip title="Edit comment">
                            <IconButton
                                className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                                onClick={() => setEditCommentDialogOpen(true)}
                                size="small"
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </MythicStyledTooltip>
                        <span className="mythic-search-result-secondary" style={singleLineCellStyle} title={props.comment}>
                            {props.comment || "No comment"}
                        </span>
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-custom-browser-tags-cell">
                        <ViewEditTags target_object={"mythictree_id"} target_object_id={props.id} me={me} />
                        <div className="mythic-custom-browser-tags-list">
                            <TagsDisplay tags={props.tags} />
                        </div>
                    </div>
                </MythicStyledTableCell>

            </TableRow>
        </React.Fragment>
    )
}
