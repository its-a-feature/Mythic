import React, { useEffect } from 'react';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import { useContext} from 'react';
import {ThemeContext} from 'styled-components';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

export function TaskArtifactsTable(props){
   const [artifacts, setArtifacts] = React.useState([]);
   const theme = useContext(ThemeContext);

   useEffect( () => {
    const condensed = props.tasks.reduce( (prev, tsk) => {
      return [...prev, ...tsk.taskartifacts];
    }, []);
    setArtifacts(condensed);
   }, [props.tasks]);

  return (
    <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader, marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
            <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                Artifact Tasks
            </Typography>
        </Paper>
        
        <Paper elevation={5} style={{position: "relative", backgroundColor: theme.body}} variant={"elevation"}>
        <TableContainer component={Paper} className="mythicElement">
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
                    <TableRow key={"artifact" + artifact.id}>
                      <TableCell>{artifact.task_id}</TableCell>
                      <TableCell>{artifact.artifact.name}</TableCell>
                      <TableCell>{artifact.host}</TableCell>
                      <TableCell>{artifact.artifact_instance_text}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </TableContainer>
        </Paper>
    </React.Fragment>
  );
}
