import React, { useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

export function TaskArtifactsTable(props){
   const [artifacts, setArtifacts] = React.useState([]);
   const theme = useTheme();

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
  return (
    <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
            <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Artifact Tasks
            </Typography>
        </Paper>
        
        <Paper elevation={5} style={{position: "relative", backgroundColor: theme.body}}>
        <TableContainer className="mythicElement">
          <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell>Task ID</TableCell>
                        <TableCell>Artifact Type</TableCell>
                        <TableCell>Host</TableCell>
                        <TableCell>Artifact</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                  {artifacts.map( (artifact) => (
                    <TableRow key={"artifact" + artifact.id} hover>
                      <TableCell>{artifact.display_id}</TableCell>
                      <TableCell>{artifact.base_artifact}</TableCell>
                      <TableCell>{artifact.host}</TableCell>
                      <TableCell>{artifact.artifact_text}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </TableContainer>
        </Paper>
    </React.Fragment>
  );
}
