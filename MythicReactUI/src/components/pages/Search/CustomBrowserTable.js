import React, { useEffect } from 'react';
import {Button, IconButton, Typography, Link} from '@mui/material';
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

const updateFileComment = gql`
mutation updateCommentMutation($mythictree_id: Int!, $comment: String!){
    update_mythictree_by_pk(pk_columns: {id: $mythictree_id}, _set: {comment: $comment}) {
        comment
        id
    }
}
`;

export function CustomBrowserTable({rows, columns, me}){
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
    return (
        <TableContainer className="mythicElement" style={{height: "100%", overflowY: "auto"}} >
            <Table stickyHeader size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell >Name</TableCell>
                        {columns.map((column, index) => (
                            <TableCell key={index}>{column.name}</TableCell>
                        ))}
                        <TableCell >Comment</TableCell>
                        <TableCell >Tags</TableCell>

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
                    <Button color="info" style={{}} onClick={() => setViewPermissionsDialogOpen(true)}><PlaylistAddCheckIcon /></Button>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}><b>Host: </b> {props.host}</Typography>
                    {props.callback?.mythictree_groups.length > 0 ? (
                        <Typography variant="body2" style={{whiteSpace: "pre"}}>
                            <b>Groups: </b>{props?.callback.mythictree_groups.join(", ")}<br/>
                            <b>Callback: </b>{
                                <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                      href={"/new/callbacks/" + props.callback.display_id}>
                                    C-{props.callback.display_id}
                                </Link>
                            }{", "}
                            <b>Task: </b>{
                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                  href={"/new/task/" + props.task.display_id}>
                                T-{props.task.display_id}
                            </Link>
                        }
                        </Typography>
                    ) : null}
                    <Typography variant="body2" style={{wordBreak: "break-all", textDecoration: props.deleted ? "strike-through" : ""}}>{props.full_path_text}</Typography>

                </MythicStyledTableCell>
                {props.columns.map((column, index) => (
                    <MythicStyledTableCell key={index}>
                        <Typography variant="body2" style={{wordBreak: "break-all", display: "inline-block"}}>{props.metadata[column.key]}</Typography>
                    </MythicStyledTableCell>
                ))}
                <MythicStyledTableCell>
                    <IconButton onClick={() => setEditCommentDialogOpen(true)} size="small" style={{display: "inline-block"}}><EditIcon /></IconButton>
                    <Typography variant="body2" style={{wordBreak: "break-all", display: "inline-block"}}>{props.comment}</Typography>
                    </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <ViewEditTags target_object={"mythictree_id"} target_object_id={props.id} me={me} />
                    <TagsDisplay tags={props.tags} />
                </MythicStyledTableCell>

            </TableRow>
        </React.Fragment>
    )
}

