import React from 'react';
import GetAppIcon from '@mui/icons-material/GetApp';
import Tooltip from '@mui/material/Tooltip';
import makeStyles from '@mui/styles/makeStyles';
import { Button } from '@mui/material';

const useStyles = makeStyles((theme) => ({
  tooltip: {
    backgroundColor: theme.palette.background.contrast,
    color: theme.palette.text.contrast,
    boxShadow: theme.shadows[1],
    fontSize: 13
  },
  arrow: {
    color: theme.palette.background.contrast,
  }
}));

export const ResponseDisplayDownload = (props) =>{
  const classes = useStyles();
  return (
    <React.Fragment>
      <pre style={{display: "inline-block"}}>
        {props.download?.plaintext || ""}
      </pre>
      
      <Tooltip title={props?.dowload?.hoverText || "Download payload"}  arrow classes={{tooltip: classes.tooltip, arrow: classes.arrow}}>
        <Button variant={props.download?.variant || "contained"} component="a" target="_blank" color="primary" href={"/api/v1.4/files/download/" + props.download.agent_file_id} download
          startIcon={<GetAppIcon />}>
            {props.download?.name || ""}
        </Button>
      </Tooltip><br/>
    </React.Fragment>
  )   
}