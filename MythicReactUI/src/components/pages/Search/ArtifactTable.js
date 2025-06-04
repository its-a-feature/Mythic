import React, { useEffect } from 'react';
import {Typography, Link, IconButton} from '@mui/material';
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
            <Table stickyHeader size="small" style={{}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "4rem"}}>Cleanup</TableCell>
                        <TableCell >Type</TableCell>
                        <TableCell >Command</TableCell>
                        <TableCell style={{width: "12rem"}}>Task</TableCell>
                        <TableCell >Operator</TableCell>
                        <TableCell >Host</TableCell>
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
                    {props.needs_cleanup && !props.resolved &&
                        <MythicStyledTooltip title={"Artifact needs to be cleaned up"}>
                            <IconButton onClick={MarkResolved}>
                                <CleanHandsTwoToneIcon color={"warning"} />
                            </IconButton>
                        </MythicStyledTooltip>
                    }
                    {props.needs_cleanup && props.resolved &&
                        <MythicStyledTooltip title={"Successfully cleaned up artifact"}>
                            <IconButton onClick={MarkUnresolved} >
                                <CleanHandsTwoToneIcon color={"success"} />
                            </IconButton>
                        </MythicStyledTooltip>
                    }
                    {!props.needs_cleanup &&
                        <MythicStyledTooltip title={"Mark artifact as needs cleanup"} >
                            <IconButton onClick={MarkNeedsCleanup}>
                                <AddAlertTwoToneIcon color={"success"} />
                            </IconButton>
                        </MythicStyledTooltip>
                    }
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Typography variant="body2" >{props.base_artifact}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <Typography variant="body2" >{props?.task?.command?.cmd}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell style={{wordBreak: "break-all"}}>
                    {props.task &&
                    <>
                        <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                              href={"/new/callbacks/" + props.task.callback.display_id}>
                            C-{props.task.callback.display_id}
                        </Link>{" / "}
                        <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                              href={"/new/task/" + props.task.display_id}>
                            T-{props.task.display_id}
                        </Link>
                        {props.task?.callback?.mythictree_groups.length > 0 ? (
                            <Typography variant="body2" style={{whiteSpace: "pre"}}>
                                <b>Groups: </b>{"\n" + props?.task?.callback.mythictree_groups.join("\n")}
                            </Typography>
                        ) : null}
                    </>
                    }

                </MythicStyledTableCell>
                <MythicStyledTableCell>
                <Typography variant="body2" style={{ display: "inline-block"}}>{props?.task?.operator?.username || null}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <Typography variant="body2" style={{ display: "inline-block"}}>{props.host}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                <Typography variant="body2" style={{wordBreak: "break-all", display: "inline-block"}}>{props.artifact_text}</Typography>
                </MythicStyledTableCell>
              
            </TableRow>
        </React.Fragment>
    )
}

