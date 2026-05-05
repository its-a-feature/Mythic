import React, { useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {MythicPageHeaderChip, MythicSectionHeader} from "../../MythicComponents/MythicPageHeader";

export function TaskArtifactsTable(props){
   const [artifacts, setArtifacts] = React.useState([]);

   useEffect( () => {
    const condensed = props.tasks.reduce( (prev, tsk) => {
        const arts = tsk.taskartifacts.map(c => {return {...c, display_id: tsk.display_id}});
      return [...prev, ...arts];
    }, []);
    condensed.sort((a,b) => (a.task_id > b.task_id) ? 1 : ((b.task_id > a.task_id) ? -1 : 0));
    setArtifacts(condensed);
   }, [props.tasks]);
   if(artifacts.length === 0){
     return null
   }
   const artifactCountLabel = artifacts.length === 1 ? "1 artifact" : `${artifacts.length} artifacts`;
  return (
    <div className="mythic-single-task-metadata-section">
        <MythicSectionHeader
            dense
            title="Artifact Tasks"
            subtitle="Artifacts created while these tasks executed."
            actions={<MythicPageHeaderChip label={artifactCountLabel} />}
        />
        <TableContainer className="mythicElement mythic-single-task-table-wrap">
          <Table className="mythic-single-task-table" size="small">
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "6rem"}}>Task ID</MythicStyledTableCell>
                        <MythicStyledTableCell style={{width: "12rem"}}>Artifact Type</MythicStyledTableCell>
                        <MythicStyledTableCell style={{width: "12rem"}}>Host</MythicStyledTableCell>
                        <MythicStyledTableCell>Artifact</MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                  {artifacts.map( (artifact) => (
                    <TableRow key={"artifact" + artifact.id} hover>
                      <MythicStyledTableCell>{artifact.display_id}</MythicStyledTableCell>
                      <MythicStyledTableCell>{artifact.base_artifact}</MythicStyledTableCell>
                      <MythicStyledTableCell className="mythic-single-task-cell-break">{artifact.host}</MythicStyledTableCell>
                      <MythicStyledTableCell className="mythic-single-task-cell-break">{artifact.artifact_text}</MythicStyledTableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </TableContainer>
    </div>
  );
}
