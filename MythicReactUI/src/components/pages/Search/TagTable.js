import React, { useEffect } from 'react';
import {Link, IconButton} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {TagsDisplay} from '../../MythicComponents/MythicTag';
import {MythicDialog, MythicViewJSONAsTableDialog} from "../../MythicComponents/MythicDialog";
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import {deleteTagMutation} from '../../MythicComponents/MythicTag';
import {useMutation} from '@apollo/client';
import {snackActions} from "../../utilities/Snackbar";
import {b64DecodeUnicode} from '../Callbacks/ResponseDisplay';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {HostFileDialog} from "../Payloads/HostFileDialog";
import PublicIcon from '@mui/icons-material/Public';
import {DetailedPayloadTable} from "../Payloads/DetailedPayloadTable";
import InfoIconOutline from '@mui/icons-material/InfoOutlined';
import {getReadableTextColor, isValidHexColor} from "../../MythicComponents/MythicColorInput";

const singleLineCellStyle = {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
};

const formatTagData = (data) => {
    if(data === null || data === undefined){
        return "";
    }
    if(typeof data === "string"){
        return data;
    }
    return JSON.stringify(data, null, 2);
};

const safeDecode = (value) => {
    if(!value){
        return "";
    }
    return b64DecodeUnicode(value);
};

export function TagTable(props){
    const [tags, setTags] = React.useState([]);
    useEffect( () => {
        setTags([...props.tags]);
    }, [props.tags]);
    const onDelete = (tagID) => {
        const newTags = tags.filter(t => t.id !== tagID);
        setTags(newTags);
    }
    return (
        <TableContainer className="mythicElement" style={{height: "100%", overflowY: "auto"}} >
            <Table stickyHeader size="small" style={{tableLayout: "fixed"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "4rem"}}>Delete</TableCell>
                        <TableCell style={{width: "14rem"}}>Tag Type</TableCell>
                        <TableCell style={{width: "10rem"}}>Source</TableCell>
                        <TableCell>Tagged Element Information</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>

                {tags.map( (op) => (
                    <TagTableRow
                        key={"tag" + op.id}
                        onDelete={onDelete}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

function TagTableRow(props){
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [deleteTag] = useMutation(deleteTagMutation, {
        onCompleted: () => {
            snackActions.success("Successfully deleted tag");
            props.onDelete(props.id);
        },
        onError: () => {
            snackActions.error("Failed to delete tag");
        }
    })
    const onAcceptDelete = () => {
        deleteTag({variables: {tag_id: props.id}})
    }
    return (
        <React.Fragment>
            <TableRow hover>
                <MythicStyledTableCell>
                    <MythicStyledTooltip title="Remove tag">
                        <IconButton
                            className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger"
                            size="small"
                            onClick={()=>{setOpenDeleteDialog(true);}}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-tag-search-tag-cell"><TagsDisplay expand={true} tags={[props]} /></div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-value" style={singleLineCellStyle} title={props.source}>
                        {props.source}
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell><TagTableRowElement {...props} /></MythicStyledTableCell>
            </TableRow>
            {openDeleteDialog &&
                <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}}
                                     onSubmit={onAcceptDelete} open={openDeleteDialog}
                                     acceptText={ "Remove" }/>
            }
        </React.Fragment>
    )
}

const TagElementPanel = ({type, summary, actions, children}) => (
    <div className="mythic-tag-search-element-card">
        <div className="mythic-tag-search-element-header">
            <div className="mythic-search-result-action-row">
                <span className="mythic-tag-search-element-type">{type}</span>
                {summary}
            </div>
            {actions ? <div className="mythic-search-result-action-row">{actions}</div> : null}
        </div>
        <div className="mythic-tag-search-details-grid">
            {children}
        </div>
    </div>
);

const TagDetailItem = ({label, children, wide=false, code=false, title}) => (
    <div className={wide ? "mythic-tag-search-detail mythic-tag-search-detail-wide" : "mythic-tag-search-detail"}>
        <div className="mythic-search-result-label">{label}</div>
        {code ? (
            <pre className="mythic-search-result-code mythic-tag-search-code">{children}</pre>
        ) : (
            <div className="mythic-search-result-value" title={title}>
                {children || <span className="mythic-search-result-secondary">None</span>}
            </div>
        )}
    </div>
);

const CallbackSummary = ({callback, includeDescription=false}) => {
    if(!callback){
        return null;
    }
    const safeColor = isValidHexColor(callback.color) ? callback.color : "";
    const callbackStyle = safeColor ? {
        backgroundColor: safeColor,
        borderColor: safeColor,
        color: getReadableTextColor(safeColor),
    } : {};
    return (
        <span className="mythic-tag-search-callback-summary" style={callbackStyle}>
            {callback.user}{callback.integrity_level > 2 ? "*" : ""}@{callback.host}
            {includeDescription && callback.description ? ` - ${callback.description}` : ""}
        </span>
    );
};

function TagTableRowElement(props){
    const [viewPermissionsDialogOpen, setViewPermissionsDialogOpen] = React.useState(false);
    const [openDetailedView, setOpenDetailedView] = React.useState(false);
    const [openHostDialog, setOpenHostDialog] = React.useState(false);
    const getElement = () => {
        if(props.task) {
            return (
                <TagElementPanel
                    type="Task"
                    summary={
                        <div className="mythic-search-result-link-row">
                            <Link href={"/new/task/" + props.task.display_id} color="textPrimary" target={"_blank"}>
                                T-{props.task.display_id}
                            </Link>
                            <span className="mythic-search-result-secondary">/</span>
                            <Link href={"/new/callbacks/" + props.task.callback.display_id} color="textPrimary" target={"_blank"}>
                                C-{props.task.callback.display_id}
                            </Link>
                        </div>
                    }
                >
                    <TagDetailItem label="Callback" wide>
                        <CallbackSummary callback={props.task.callback} includeDescription />
                    </TagDetailItem>
                    <TagDetailItem label="Command" wide>
                        <span className="mythic-search-result-code mythic-tag-search-inline-code">
                            {props.task.command_name} {props.task.display_params}
                        </span>
                    </TagDetailItem>
                    <TagDetailItem label="Comment" wide>{props.task.comment}</TagDetailItem>
                    <TagDetailItem label="Tag Data" wide code>{formatTagData(props.data)}</TagDetailItem>
                </TagElementPanel>
            )
        } else if(props.credential) {
            return (
                <TagElementPanel type="Credential">
                    <TagDetailItem label="Account">{props.credential.account}</TagDetailItem>
                    <TagDetailItem label="Realm">{props.credential.realm}</TagDetailItem>
                    <TagDetailItem label="Type">{props.credential.type}</TagDetailItem>
                    <TagDetailItem label="Comment" wide>{props.credential.comment}</TagDetailItem>
                    <TagDetailItem label="Credential" wide code>{props.credential.credential_text}</TagDetailItem>
                    <TagDetailItem label="Tag Data" wide code>{formatTagData(props.data)}</TagDetailItem>
                </TagElementPanel>
            )
        } else if(props.mythictree) {
            const treeType = props.mythictree.tree_type === "file" ? "File Browser" : "Process Browser";
            return (
                <React.Fragment>
                    <TagElementPanel
                        type={treeType}
                        actions={
                            <MythicStyledTooltip title="View metadata">
                                <IconButton
                                    className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                                    size="small"
                                    onClick={() => setViewPermissionsDialogOpen(true)}
                                >
                                    <PlaylistAddCheckIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                    >
                        <TagDetailItem label="Name">{props.mythictree.name_text}</TagDetailItem>
                        <TagDetailItem label={props.mythictree.tree_type === "file" ? "Path" : "PID"}>
                            {props.mythictree.full_path_text}
                        </TagDetailItem>
                        <TagDetailItem label="Host">{props.mythictree.host}</TagDetailItem>
                        <TagDetailItem label="Comment" wide>{props.mythictree.comment}</TagDetailItem>
                        <TagDetailItem label="Tag Data" wide code>{formatTagData(props.data)}</TagDetailItem>
                    </TagElementPanel>
                    {viewPermissionsDialogOpen &&
                        <MythicDialog fullWidth={true} maxWidth="md" open={viewPermissionsDialogOpen}
                                      onClose={()=>{setViewPermissionsDialogOpen(false);}}
                                      innerDialog={<MythicViewJSONAsTableDialog title="View Permissions Data"
                                                                                leftColumn="Permission" rightColumn="Value"
                                                                                value={props.mythictree.metadata}
                                                                                onClose={()=>{setViewPermissionsDialogOpen(false);}} />}
                        />
                    }
                </React.Fragment>
            )
        } else if(props.filemetum) {
            const fileKind = props.filemetum.is_screenshot ? "Screenshot" : props.filemetum.is_download_from_agent ? "File Download" : "File Upload";
            const filename = safeDecode(props.filemetum.filename_text);
            const remotePath = safeDecode(props.filemetum.full_remote_path_text);
            return (
                <React.Fragment>
                    <TagElementPanel
                        type={fileKind}
                        actions={
                            <MythicStyledTooltip title={"Host Payload Through C2"} >
                                <IconButton
                                    className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                                    size="small"
                                    onClick={()=>{setOpenHostDialog(true);}}
                                >
                                    <PublicIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                    >
                        <TagDetailItem label="Filename" wide>
                            <Link color="textPrimary" download underline="always" target="_blank" href={"/direct/download/" + props.filemetum.agent_file_id}>
                                {filename}
                            </Link>
                        </TagDetailItem>
                        <TagDetailItem label="Hash" wide>
                            <div className="mythic-search-result-stack">
                                <span>MD5: {props.filemetum.md5}</span>
                                <span>SHA1: {props.filemetum.sha1}</span>
                            </div>
                        </TagDetailItem>
                        <TagDetailItem label="Comment" wide>{props.filemetum.comment}</TagDetailItem>
                        <TagDetailItem label="Full Remote Path" wide code>
                            {`${props.filemetum.host || ""}${remotePath ? "\n" + remotePath : ""}`}
                        </TagDetailItem>
                        <TagDetailItem label="Tag Data" wide code>{formatTagData(props.data)}</TagDetailItem>
                    </TagElementPanel>
                    {openHostDialog &&
                        <MythicDialog fullWidth={true} maxWidth="md" open={openHostDialog}
                                      onClose={()=>{setOpenHostDialog(false);}}
                                      innerDialog={<HostFileDialog file_uuid={props.filemetum.agent_file_id}
                                                                   file_name={props.filemetum.full_remote_path_text === "" ? filename : remotePath}
                                                                   onClose={()=>{setOpenHostDialog(false);}} />}
                        />
                    }
                </React.Fragment>
            )
        }else if(props.keylog_id) {
            return (
                <TagElementPanel type="Keylog">
                    <TagDetailItem label="Keylog ID">{props.keylog_id}</TagDetailItem>
                    <TagDetailItem label="Tag Data" wide code>{formatTagData(props.data)}</TagDetailItem>
                </TagElementPanel>
            )
        }else if(props.payload){
            return (
                <TagElementPanel
                    type="Payload"
                    summary={props.payload.payloadtype?.name ? <span className="mythic-search-result-secondary">{props.payload.payloadtype.name}</span> : null}
                    actions={
                        <MythicStyledTooltip title="View payload details">
                            <IconButton
                                className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                                onClick={()=>setOpenDetailedView(true)}
                                size="small"
                            >
                                <InfoIconOutline fontSize="small" />
                            </IconButton>
                        </MythicStyledTooltip>
                    }
                >
                    <TagDetailItem label="Filename" wide>{safeDecode(props.payload.filemetum?.filename_text)}</TagDetailItem>
                    <TagDetailItem label="UUID" wide code>{props.payload.uuid}</TagDetailItem>
                    <TagDetailItem label="Description" wide>{props.payload.description}</TagDetailItem>
                    <TagDetailItem label="Tag Data" wide code>{formatTagData(props.data)}</TagDetailItem>
                    {openDetailedView &&
                        <MythicDialog fullWidth={true} maxWidth="lg" open={openDetailedView}
                                      onClose={()=>{setOpenDetailedView(false);}}
                                      innerDialog={<DetailedPayloadTable {...props.payload} payload_id={props.payload.id} onClose={()=>{setOpenDetailedView(false);}} />}
                        />}
                </TagElementPanel>
            )
        }else if(props.taskartifact_id) {
            return (
                <TagElementPanel type="Artifact">
                    <TagDetailItem label="Artifact ID">{props.taskartifact_id}</TagDetailItem>
                    <TagDetailItem label="Tag Data" wide code>{formatTagData(props.data)}</TagDetailItem>
                </TagElementPanel>
            )
        }else if(props.callback){
            return (
                <TagElementPanel
                    type="Callback"
                    summary={
                        <Link href={"/new/callbacks/" + props.callback.display_id} color="textPrimary" target={"_blank"}>
                            C-{props.callback.display_id}
                        </Link>
                    }
                >
                    <TagDetailItem label="Callback" wide>
                        <CallbackSummary callback={props.callback} />
                    </TagDetailItem>
                    <TagDetailItem label="Description" wide>{props.callback.description}</TagDetailItem>
                    <TagDetailItem label="IP">{props.callback.ip}</TagDetailItem>
                    <TagDetailItem label="Tag Data" wide code>{formatTagData(props.data)}</TagDetailItem>
                </TagElementPanel>
            )
        } else {
            console.log("unknown id for tag", props)
            return null;
        }
    }
    return getElement()
}
