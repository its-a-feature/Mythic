import React, { useEffect } from 'react';
import {Link, IconButton} from '@mui/material';
import { gql, useMutation} from '@apollo/client';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import CleanHandsTwoToneIcon from '@mui/icons-material/CleanHandsTwoTone';
import AddAlertTwoToneIcon from '@mui/icons-material/AddAlertTwoTone';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicStateChip} from "../../MythicComponents/MythicStateChip";

const singleLineCellStyle = {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
};

const updateNeedsCleanupMutation = gql`
mutation updateNeedsCleanupStatus($taskartifact_id: Int!, $needs_cleanup: Boolean!){
    update_taskartifact_by_pk(pk_columns: {id: $taskartifact_id}, _set: {needs_cleanup: $needs_cleanup}){
        needs_cleanup
        id
    }
}
`;
const updateResolvedMutation = gql`
mutation updateResolvedStatus($taskartifact_id: Int!, $resolved: Boolean!){
    update_taskartifact_by_pk(pk_columns: {id: $taskartifact_id}, _set: {resolved: $resolved}){
        resolved
        id
    }
}
`;

export function ArtifactTable(props){
    const [artifacts, setArtifacts] = React.useState([]);
    const [updateNeedsCleanup] = useMutation(updateNeedsCleanupMutation, {
        onCompleted: (data) => {
            const updatedArtifacts = artifacts.map(a => {
                if(a.id === data.update_taskartifact_by_pk.id){
                    return {...a, needs_cleanup: data.update_taskartifact_by_pk.needs_cleanup};
                }
                return {...a};
            });
            setArtifacts(updatedArtifacts);
        },
        onError: (error) => {

        }
    });
    const [updateResolved] = useMutation(updateResolvedMutation, {
        onCompleted: (data) => {
            const updatedArtifacts = artifacts.map(a => {
                if(a.id === data.update_taskartifact_by_pk.id){
                    return {...a, resolved: data.update_taskartifact_by_pk.resolved};
                }
                return {...a};
            });
            setArtifacts(updatedArtifacts);
        },
        onError: (error) => {

        }
    });
    useEffect( () => {
        setArtifacts([...props.artifacts]);
    }, [props.artifacts]);
    const MarkNeedsCleanup = ({id, needs_cleanup}) => {
        updateNeedsCleanup({variables: {taskartifact_id: id, needs_cleanup}});
    }
    const ToggleResolution = ({id, resolved}) => {
        updateResolved({variables: {taskartifact_id: id, resolved}})
    }
    return (
        <TableContainer className="mythicElement"  style={{height: "100%", overflowY: "auto"}}>
            <Table stickyHeader size="small" style={{tableLayout: "fixed"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "7rem"}}>Cleanup</TableCell>
                        <TableCell style={{width: "9rem"}}>Type</TableCell>
                        <TableCell style={{width: "9rem"}}>Command</TableCell>
                        <TableCell style={{width: "11rem"}}>Task</TableCell>
                        <TableCell style={{width: "12rem"}}>Host</TableCell>
                        <TableCell >Artifact</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {artifacts.map( (op) => (
                    <ArtifactTableRow
                        key={"cred" + op.id}
                        MarkNeedsCleanup={MarkNeedsCleanup}
                        ToggleResolution={ToggleResolution}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

function ArtifactTableRow(props){
    const cleanupState = !props.needs_cleanup ? "neutral" : props.resolved ? "active" : "warning";
    const cleanupLabel = !props.needs_cleanup ? "None" : props.resolved ? "Done" : "Needed";
    const cleanupTooltip = !props.needs_cleanup ? "No cleanup needed" : props.resolved ? "Cleanup resolved" : "Artifact needs cleanup";
    const MarkNeedsCleanup = () => {
        props.MarkNeedsCleanup({id: props.id, needs_cleanup: true});
    }
    const MarkResolved = () => {
        props.ToggleResolution({id: props.id, resolved: true});
    }
    const MarkUnresolved = () => {
        props.ToggleResolution({id: props.id, resolved: false});
    }
    return (
        <React.Fragment>
            <TableRow hover>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-action-row">
                        {props.needs_cleanup && !props.resolved &&
                            <MythicStyledTooltip title={"Mark artifact as cleaned up"}>
                                <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" onClick={MarkResolved} size="small">
                                    <CleanHandsTwoToneIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                        {props.needs_cleanup && props.resolved &&
                            <MythicStyledTooltip title={"Mark artifact as unresolved"}>
                                <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-warning" onClick={MarkUnresolved} size="small">
                                    <CleanHandsTwoToneIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                        {!props.needs_cleanup &&
                            <MythicStyledTooltip title={"Mark artifact as needs cleanup"} >
                                <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-warning" onClick={MarkNeedsCleanup} size="small">
                                    <AddAlertTwoToneIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                        <MythicStyledTooltip title={cleanupTooltip}>
                            <span>
                                <MythicStateChip compact label={cleanupLabel} state={cleanupState} />
                            </span>
                        </MythicStyledTooltip>
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-value" style={singleLineCellStyle} title={props.base_artifact}>
                        {props.base_artifact}
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <div className="mythic-search-result-value" style={singleLineCellStyle} title={props?.task?.command?.cmd}>
                        {props?.task?.command?.cmd}
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell style={{wordBreak: "break-all"}}>
                    {props.task &&
                    <div className="mythic-search-result-stack">
                        <div className="mythic-search-result-link-row">
                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                  href={"/new/callbacks/" + props.task.callback.display_id}>
                                C-{props.task.callback.display_id}
                            </Link>
                            <span className="mythic-search-result-secondary">/</span>
                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                  href={"/new/task/" + props.task.display_id}>
                                T-{props.task.display_id}
                            </Link>
                        </div>
                        {props.task?.callback?.mythictree_groups.length > 0 ? (
                            <div className="mythic-search-result-secondary">
                                Groups: {props?.task?.callback.mythictree_groups.join(", ")}
                            </div>
                        ) : null}
                    </div>
                    }

                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <div className="mythic-search-result-value" style={singleLineCellStyle} title={props.host}>
                        {props.host}
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-code">{props.artifact_text}</div>
                </MythicStyledTableCell>
              
            </TableRow>
        </React.Fragment>
    )
}
