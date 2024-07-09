import React from 'react';
import {MitreGridRow} from './MitreGridRow';
import {useTheme} from '@mui/material/styles';
import { Box } from '@mui/material';

export function MitreGridColumn({column, showCountGrouping}){
  const theme = useTheme();
  const [groupCounts, setGroupCounts] = React.useState(0);
  const [techniqueCounts, setTechniqueCounts] = React.useState(0);
  React.useEffect( () => {
    switch(showCountGrouping){
      case "":
        setTechniqueCounts(column?.rows?.length || 0);
        setGroupCounts(0);
        break;
      case "command": 
        setGroupCounts(column.commands);
        const updatedTechniqueCountsForCommands = column.rows.reduce( (prev, cur) => {
          if(cur.commands.length > 0){return prev + 1}
          return prev;
        }, 0);
        setTechniqueCounts(updatedTechniqueCountsForCommands);
        break;
      case "task":
        setGroupCounts(column.tasks);
        const updatedTechniqueCounts = column.rows.reduce( (prev, cur) => {
          if(cur.tasks.length > 0){return prev + 1}
          return prev;
        }, 0);
        setTechniqueCounts(updatedTechniqueCounts);
        break;
    }
  }, [column.commands, column.rows, column.tasks, showCountGrouping])
  return (
    <div style={{display: "flex", flexDirection: "column", paddingRight: "15px",}}>
      <Box width={"100%"} style={{backgroundColor: theme.tableHover}}>
        <h2 style={{margin: 0, textAlign: "center"}}><b>{column.tactic}</b></h2>
        <p style={{textAlign: "center", margin: 0}}>{techniqueCounts} techniques</p>
        { showCountGrouping === "" ? null : (
          <p style={{textAlign: "center", margin: 0}}>{groupCounts} {showCountGrouping}s</p>
        )}
      </Box>
      
      <div style={{display: "flex", flexDirection: "column"}}>
        {column.rows.map( (r, index) => (
          <MitreGridRow row={r} key={"row"+ index} showCountGrouping={showCountGrouping}/>
        ))}
      </div>
      
    </div>
  )
}

