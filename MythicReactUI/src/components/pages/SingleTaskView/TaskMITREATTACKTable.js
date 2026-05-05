import React, { useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {MythicPageHeaderChip, MythicSectionHeader} from "../../MythicComponents/MythicPageHeader";

export function TaskMITREATTACKTable(props){
   const [attacks, setAttacks] = React.useState([]);

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
   const attackCountLabel = attacks.length === 1 ? "1 technique" : `${attacks.length} techniques`;
  return (
    <div className="mythic-single-task-metadata-section">
        <MythicSectionHeader
            dense
            title="MITRE ATT&CK Mappings"
            subtitle="Unique techniques mapped from the selected tasks."
            actions={<MythicPageHeaderChip label={attackCountLabel} />}
        />
        <TableContainer className="mythicElement mythic-single-task-table-wrap">
          <Table className="mythic-single-task-table mythic-single-task-mitre-table" size="small">
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "10rem"}}>Technique ID</MythicStyledTableCell>
                        <MythicStyledTableCell>Technique</MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                  {attacks.map( (attack) => (
                    <TableRow key={'attack' + attack.attack.id} hover>
                      <MythicStyledTableCell>{attack.attack.t_num}</MythicStyledTableCell>
                      <MythicStyledTableCell className="mythic-single-task-cell-break">{attack.attack.name}</MythicStyledTableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </TableContainer>
    </div>
  );
}
