import React from 'react';
import {Button} from '@mui/material';
import {ResponseDisplayScreenshotModal} from './ResponseDisplayScreenshotModal';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import Tooltip from '@mui/material/Tooltip';
import makeStyles from '@mui/styles/makeStyles';

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

export const ResponseDisplayScreenshot = (props) =>{
  const [openScreenshot, setOpenScreenshot] = React.useState(false);
  const classes = useStyles();
  const now = (new Date()).toUTCString();
  const clickOpenScreenshot = () => {
    setOpenScreenshot(true);
  }

  return (
    <React.Fragment>
      {openScreenshot &&
      <MythicDialog fullWidth={true} maxWidth="xl" open={openScreenshot} 
          onClose={()=>{setOpenScreenshot(false);}} 
          innerDialog={<ResponseDisplayScreenshotModal images={props.agent_file_id} onClose={()=>{setOpenScreenshot(false);}} />}
      />
      }
      <pre style={{display: "inline-block"}}>
        {props?.plaintext || ""}
      </pre>
      <Tooltip title={props?.hoverText || "View Screenshot"}  arrow classes={{tooltip: classes.tooltip, arrow: classes.arrow}}>
        <Button color="primary" variant={props.variant ? props.variant : "contained"} onClick={clickOpenScreenshot} style={{marginBottom: "10px"}}>{props.name}</Button>
      </Tooltip>
    </React.Fragment>
  )   
}