import React from 'react';
import {Link, Typography} from '@mui/material';
import Split from 'react-split';
import {gql, useMutation} from '@apollo/client';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import PublicIcon from '@mui/icons-material/Public';
import {snackActions} from '../../utilities/Snackbar';
import {toLocalTime} from '../../utilities/Time';
import {MythicDialog, MythicModifyStringDialog} from '../../MythicComponents/MythicDialog';
import {MythicActionButton} from '../../MythicComponents/MythicActionButton';
import {MythicChip} from '../../MythicComponents/MythicChip';
import {TagsDisplay, ViewEditTags} from '../../MythicComponents/MythicTag';
import {FileDownloadLinkWithAuth} from '../../utilities/FileDownloadWithAuth';
import {HostFileDialog, HostedFileLocationsTable} from '../Payloads/HostFileDialog';
import {getStringSize} from '../Callbacks/ResponseDisplayTable';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCopy} from "@fortawesome/free-solid-svg-icons";
import {copyStringToClipboard} from "../../utilities/Clipboard";

const updateFileComment = gql`
mutation updateCommentMutation($file_id: Int!, $comment: String!){
    update_filemeta_by_pk(pk_columns: {id: $file_id}, _set: {comment: $comment}) {
        comment
        id
    }
}
`;

export const getAvailableSelectedFileID = (files, selectedFileID) => {
    if(files.some((file) => file.id === selectedFileID)){
        return selectedFileID;
    }
    return files[0]?.id ?? null;
};

export const useFileSelection = (files) => {
    const [selectedFileID, setSelectedFileID] = React.useState(null);

    React.useEffect(() => {
        setSelectedFileID((currentID) => getAvailableSelectedFileID(files, currentID));
    }, [files]);

    return {
        selectedFileID,
        setSelectedFileID,
        selectedFile: files.find((file) => file.id === selectedFileID) || null,
    };
};

export const getFileStatus = (file) => {
    if(file?.deleted){
        return {label: "Deleted", tone: "error"};
    }
    if(file?.complete){
        return {label: "Complete", tone: "success"};
    }
    if(file?.transfer_type === "chunk"){
        if(file?.total_chunks <= 0){
            return {
                tone: "warning",
                label: "?? %"
            }
        }
        return {
            label: `${ parseInt(((file?.chunks_received || 0) / (file.total_chunks)) * 100)} %`,
            tone: "warning",
        };
    }
    if(file?.total_size <= 0){
        return {
            tone: "warning",
            label: "?? %"
        }
    }
    return {
        label: `${  parseInt(((file?.size_received || 0) / (file.total_size)) * 100)} %`,
        tone: "warning",
    };

};

const getKindLabel = (kind) => {
    switch(kind){
        case "upload":
            return "Upload";
        case "download":
            return "Download";
        case "screenshot":
            return "Screenshot";
        case "eventing":
            return "Eventing Workflow";
        default:
            return "File";
    }
};

const getFileName = (file) => file?.filename_text || file?.full_remote_path_text || "Unnamed file";
const getFilePath = (file) => file?.full_remote_path_text || file?.filename_text || "-";
const getGroups = (file) => file?.task?.callback?.mythictree_groups || [];

const StoredFileLink = ({file, children}) => {
    if(file?.deleted || !file?.complete){
        return <span>{children}</span>;
    }
    return (
        <FileDownloadLinkWithAuth
            color="textPrimary"
            underline="always"
            href={"/direct/download/" + file.agent_file_id}>
            {children}
        </FileDownloadLinkWithAuth>
    );
};

const FileDetailSection = ({title, actions, children}) => (
    <section className="mythic-file-inspector-section">
        <div className="mythic-file-inspector-section-header">
            <span>{title}</span>
            {actions && <div className="mythic-file-inspector-section-actions">{actions}</div>}
        </div>
        <div className="mythic-file-inspector-section-body">
            {children}
        </div>
    </section>
);

const FileDetail = ({label, value, children, wide = false, code = false, copy = false}) => {
    const displayValue = value === undefined || value === null || value === "" ? "-" : value;
    const onCopyToClipboard = (data) => {
        let result = copyStringToClipboard(data);
        if(result){
        }else{
            snackActions.error("Failed to copy text");
        }
    }
    return (
        <div className={`mythic-file-inspector-detail${wide ? " mythic-file-inspector-detail-wide" : ""}`}>
            <span>{label}</span>
            <strong className={code ? "mythic-file-inspector-code" : ""}>
                {children || displayValue}
                {copy &&
                    <span style={{float:"right"}}>
                        <MythicActionButton appearance="raised"
                                            colorMode="hover"
                                            compact
                                            icon={<FontAwesomeIcon icon={faCopy}/>}
                                            iconOnly
                                            onClick={() => onCopyToClipboard(String(displayValue))}
                                            tone="info"
                                            tooltip="Copy" />
                    </span>

                }
            </strong>
        </div>
    );
};

const TaskLinks = ({task}) => {
    if(!task){
        return <span>-</span>;
    }
    return (
        <span>
            {task.callback &&
                <>
                    <Link color="textPrimary" underline="always" target="_blank" href={"/new/callbacks/" + task.callback.display_id}>
                        C-{task.callback.display_id}
                    </Link>
                    {" / "}
                </>
            }
            <Link color="textPrimary" underline="always" target="_blank" href={"/new/task/" + task.display_id}>
                T-{task.display_id}
            </Link>
        </span>
    );
};

export const FileCopySwitcher = ({file, activeRecord, onChange}) => {
    const original = file?.copy_of_file;
    if(!original){
        return null;
    }

    return (
        <div className="mythic-file-copy-switcher" role="group" aria-label="Copy relationship">
            <button
                type="button"
                className={`mythic-file-copy-node${activeRecord === "selected" ? " mythic-file-copy-node-active" : ""}`}
                aria-pressed={activeRecord === "selected"}
                onClick={() => onChange("selected")}>
                <span>This file</span>
                <strong>{getFileName(file)}</strong>
            </button>
            <div className="mythic-file-copy-relation">
                <ArrowForwardIcon aria-hidden="true" />
                <span>copy of</span>
                <ArrowForwardIcon aria-hidden="true" />
            </div>
            <button
                type="button"
                className={`mythic-file-copy-node${activeRecord === "original" ? " mythic-file-copy-node-active" : ""}`}
                aria-pressed={activeRecord === "original"}
                onClick={() => onChange("original")}>
                <span>Tracked original</span>
                <strong>{getFileName(original)}</strong>
            </button>
        </div>
    );
};

const FileStatusSection = ({file, me, showStatus = false}) => {
    const status = getFileStatus(file);
    const chunkText = file.transfer_type === "chunk" ? (
        `${file.chunks_received} / ${file.total_chunks}`
    ): (
        `${getStringSize({cellData: {plaintext: file.size_received}})} / ${getStringSize({cellData: {plaintext: file.total_size}})}`
    );

    return (
        <FileDetailSection title="File Status">
            {showStatus && status.label !== "Complete" && <FileDetail label="Status" value={status.label} />}
            <FileDetail label="Size" value={getStringSize({cellData: {plaintext: file.size}})} />
            <FileDetail label="Chunks" value={chunkText} />
            <FileDetail
                label="Timestamp"
                value={file.timestamp ? toLocalTime(file.timestamp, me?.user?.view_utc_time) : "-"}
            />
        </FileDetailSection>
    );
};

const FileIdentifiersSection = ({file, copyValues = false}) => (
    <FileDetailSection title="Identifiers">
        <FileDetail label="UUID" value={file.agent_file_id} code copy={copyValues} />
        <FileDetail label="MD5" value={file.md5} code copy={copyValues} />
        <FileDetail label="SHA1" value={file.sha1} code copy={copyValues} />
    </FileDetailSection>
);

const FileSourceContextSection = ({file}) => {
    const groups = getGroups(file);

    return (
        <FileDetailSection title="Source Context">
            <FileDetail label="Operator" value={file.operator?.username} />
            <FileDetail label="Task"><TaskLinks task={file.task} /></FileDetail>
            <FileDetail label="Command" value={file.task?.command?.cmd} />
            <FileDetail label="Groups" value={groups.length > 0 ? groups.join(", ") : "-"} />
            <FileDetail label="Task comment" value={file.task?.comment} wide />
        </FileDetailSection>
    );
};

const TrackedOriginalDetails = ({file, me}) => (
    <>
        <FileStatusSection file={file} me={me} showStatus />
        <FileDetailSection title="Location">
            <FileDetail label="Tracked file" wide>
                <StoredFileLink file={file}>{getFilePath(file)}</StoredFileLink>
            </FileDetail>
            <FileDetail label="Host" value={file.host} copy />
        </FileDetailSection>
        <FileIdentifiersSection file={file} copyValues />
        <FileSourceContextSection file={file} />
        <FileDetailSection title="Comment">
            <div className="mythic-file-inspector-comment">
                {(file.comment || "").trim().length > 0 ? file.comment : "No comment."}
            </div>
        </FileDetailSection>
    </>
);

export const FileLocationSection = ({file, kind}) => {
    if(kind === "upload"){
        return (
            <FileDetailSection title="Location">
                <FileDetail label="Source file">
                    <StoredFileLink file={file}>{getFileName(file)}</StoredFileLink>
                </FileDetail>
                <FileDetail label="Destination host" value={file.host} />
                <FileDetail label="Destination path" value={getFilePath(file)} wide copy/>
            </FileDetailSection>
        );
    }
    if(kind === "eventing"){
        return (
            <FileDetailSection title="Location">
                <FileDetail label="Source file" wide>
                    <StoredFileLink file={file}>{getFileName(file)}</StoredFileLink>
                </FileDetail>
                <FileDetail label="Workflow" wide>
                    {file.eventgroup?.id ? (
                        <Link color="textPrimary" underline="always" href={"/new/eventing?eventgroup=" + file.eventgroup.id}>
                            {file.eventgroup.name}
                        </Link>
                    ) : "-"}
                </FileDetail>
            </FileDetailSection>
        );
    }
    return (
        <FileDetailSection title="Location">
            <FileDetail label={kind === "screenshot" ? "Filename" : "Remote path"} wide>
                {kind === "screenshot" ? getFileName(file) : (
                    <StoredFileLink file={file}>{getFilePath(file)}</StoredFileLink>
                )}
            </FileDetail>
            <FileDetail label="Host" value={file.host} />
        </FileDetailSection>
    );
};

export function FileMetaInspector({file, kind, me, onEditComment}) {
    const [editCommentDialogOpen, setEditCommentDialogOpen] = React.useState(false);
    const [openHostDialog, setOpenHostDialog] = React.useState(false);
    const [activeRecord, setActiveRecord] = React.useState("selected");
    const hasOriginal = Boolean(file?.copy_of_file);

    const [updateComment] = useMutation(updateFileComment, {
        onCompleted: (data) => {
            snackActions.success("updated comment");
            onEditComment(data.update_filemeta_by_pk);
        },
        onError: () => {
            snackActions.error("failed to update comment");
        },
    });

    React.useEffect(() => {
        setEditCommentDialogOpen(false);
        setOpenHostDialog(false);
        setActiveRecord("selected");
    }, [file?.id, hasOriginal]);

    if(!file){
        return (
            <aside className="mythic-file-inspector mythic-file-inspector-empty">
                <InsertDriveFileOutlinedIcon fontSize="small" />
                <Typography variant="body2">No file selected</Typography>
            </aside>
        );
    }

    const viewingOriginal = activeRecord === "original" && hasOriginal;
    const inspectedFile = viewingOriginal ? file.copy_of_file : file;
    const status = getFileStatus(inspectedFile);

    return (
        <aside className="mythic-file-inspector">
            {editCommentDialogOpen &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="md"
                    open={editCommentDialogOpen}
                    onClose={() => setEditCommentDialogOpen(false)}
                    innerDialog={
                        <MythicModifyStringDialog
                            title="Edit File Comment"
                            onSubmit={(comment) => updateComment({variables: {file_id: file.id, comment}})}
                            value={file.comment}
                            onClose={() => setEditCommentDialogOpen(false)}
                        />
                    }
                />
            }
            {openHostDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="md"
                    open={openHostDialog}
                    onClose={() => setOpenHostDialog(false)}
                    innerDialog={
                        <HostFileDialog
                            file_uuid={file.agent_file_id}
                            file_name={getFilePath(file)}
                            onClose={() => setOpenHostDialog(false)}
                        />
                    }
                />
            }
            <div className="mythic-file-inspector-header">
                <div className="mythic-file-inspector-title">
                    <InsertDriveFileOutlinedIcon fontSize="small" />
                    <span>{getFileName(inspectedFile)}</span>
                    <MythicChip
                        size="small"
                        variant="outlined"
                        label={viewingOriginal ? "Tracked original" : getKindLabel(kind)}
                    />
                    {status.label !== "Complete" &&
                        <MythicChip size="small" tone={status.tone} variant="outlined" label={status.label} />
                    }
                    {!viewingOriginal && hasOriginal &&
                        <MythicChip size="small" tone="info" variant="outlined" label="Tracked copy" />
                    }
                </div>
            </div>
            <FileCopySwitcher file={file} activeRecord={activeRecord} onChange={setActiveRecord} />
            <div className="mythic-file-inspector-body">
                {viewingOriginal ? (
                    <TrackedOriginalDetails file={inspectedFile} me={me} />
                ) : (
                    <>
                        <FileStatusSection file={file} me={me} />
                        <FileLocationSection file={file} kind={kind} />
                        <FileIdentifiersSection file={file} />
                        <FileSourceContextSection file={file} />

                        <FileDetailSection
                            title="Comment"
                            actions={
                                <MythicActionButton
                                    appearance="raised"
                                    icon={<EditIcon />}
                                    iconOnly
                                    onClick={() => setEditCommentDialogOpen(true)}
                                    tone="info"
                                    tooltip="Edit file comment"
                                />
                            }>
                            <div className="mythic-file-inspector-comment">
                                {(file.comment || "").trim().length > 0 ? file.comment : "No comment."}
                            </div>
                        </FileDetailSection>

                        <FileDetailSection title="Tags">
                            <div className="mythic-file-inspector-tags">
                                <ViewEditTags target_object="filemeta_id" target_object_id={file.id} me={me} />
                                <TagsDisplay tags={file.tags || []} />
                            </div>
                        </FileDetailSection>

                        <FileDetailSection
                            title="C2 Hosting"
                            actions={
                                <MythicActionButton
                                    appearance="raised"
                                    icon={<PublicIcon />}
                                    iconOnly
                                    onClick={() => setOpenHostDialog(true)}
                                    tone="info"
                                    tooltip="Host file through C2"
                                />
                            }>
                            <div className="mythic-file-inspector-hosting">
                                <HostedFileLocationsTable hostedFiles={file.c2profile_file_hosts || []} />
                            </div>
                        </FileDetailSection>
                    </>
                )}
            </div>
        </aside>
    );
}

export function FileMetaSplitView({children, file, kind, me, onEditComment}) {
    return (
        <Split direction="horizontal" sizes={[60, 40]} gutterSize={8} className="mythic-file-search">
            <div className="mythic-file-search-results">
                {children}
            </div>
            <FileMetaInspector file={file} kind={kind} me={me} onEditComment={onEditComment} />
        </Split>
    );
}
