import React from 'react';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import {ReportingTable} from './ReportingTable';


export function Reporting() {
  const theme = useTheme();
  return (
  <div style={{height: "100%", display: "flex", flexDirection: "column"}}>
    <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main}} variant={"elevation"}>
      <Typography variant="h5" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
          Mythic Report Generation
      </Typography>
    </Paper> 
    <ReportingTable />
  </div>
  );
}
