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

export function TaskMITREATTACKTable(props){
   const [attacks, setAttacks] = React.useState([]);
   const theme = useTheme();

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
    condensed.sort((a,b) => (a.attack.t_num > b.attack.t_num) ? 1 : ((b.attack.t_num > a.attack.t_num) ? -1 : 0));
    setAttacks(condensed);
    
   }, [props.tasks]);
   if(attacks.length === 0){
     return null
   }
  return (
    <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
            <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                MITRE ATT&amp;CK Mappings
            </Typography>
        </Paper>
        
        <Paper elevation={5} style={{position: "relative", backgroundColor: theme.body}} >
        <TableContainer className="mythicElement">
          <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell>Technique ID</TableCell>
                        <TableCell>Technique</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                  {attacks.map( (attack) => (
                    <TableRow key={'attack' + attack.attack.id} hover>
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
