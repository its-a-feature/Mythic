import React, { useEffect } from 'react';
import {Typography, Link} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';


export function ArtifactTable(props){
    const [artifacts, setArtifacts] = React.useState([]);
    useEffect( () => {
        setArtifacts([...props.artifacts]);
    }, [props.artifacts]);

    return (
        <TableContainer component={Paper} className="mythicElement" style={{}}>
            <Table stickyHeader size="small" style={{}}>
                <TableHead>
                    <TableRow>
                        <TableCell >Type</TableCell>
                        <TableCell >Command</TableCell>
                        <TableCell >Task</TableCell>
                        <TableCell >Callback</TableCell>
                        <TableCell >Operator</TableCell>
                        <TableCell >Host</TableCell>
                        <TableCell >Artifact</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {artifacts.map( (op) => (
                    <ArtifactTableRow
                        key={"cred" + op.id}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

function ArtifactTableRow(props){
    return (
        <React.Fragment>
            <TableRow hover>
                <MythicStyledTableCell>
                    <Typography variant="body2" >{props.base_artifact}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <Typography variant="body2" >{props.task.command.cmd}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" 
                        href={"/new/task/" + props.task.id}>
                            {props.task.id}
                    </Link>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" 
                        href={"/new/callbacks/" + props.task.callback_id}>
                            {props.task.callback_id}
                    </Link>
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

