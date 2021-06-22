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

export function TaskMITREATTACKTable(props){
   const [attacks, setAttacks] = React.useState([]);
   const theme = useContext(ThemeContext);

   useEffect( () => {
    const condensed = props.tasks.reduce( (prev, tsk) => {
      
      const newAdds = tsk.attacktasks.reduce( (old, attck) => {
        if(prev.find(element => element.attack.t_num === attck.attack.t_num)){
          return [...old];
        }else{
          return [...old, attck];
        }
      }, []);
      return [...prev, ...newAdds];
    }, []);
    setAttacks(condensed);
   }, [props.tasks]);

  return (
    <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader, marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
            <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                MITRE ATT&amp;CK Mappings
            </Typography>
        </Paper>
        
        <Paper elevation={5} style={{position: "relative", backgroundColor: theme.body}} variant={"elevation"}>
        <TableContainer component={Paper} className="mythicElement">
          <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell>Technique ID</TableCell>
                        <TableCell>Technique</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                  {attacks.map( (attack) => (
                    <TableRow key={'attack' + attack.attack.id}>
                      <TableCell>{attack.attack.t_num}</TableCell>
                      <TableCell>{attack.attack.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </TableContainer>
        </Paper>
    </React.Fragment>
  );
}
