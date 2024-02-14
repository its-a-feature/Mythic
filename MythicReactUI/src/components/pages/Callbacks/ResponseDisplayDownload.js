import React from 'react';
import GetAppIcon from '@mui/icons-material/GetApp';
import { Button } from '@mui/material';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";


export const ResponseDisplayDownload = (props) =>{
    const scrollContent = (node, isAppearing) => {
        // only auto-scroll if you issued the task
        document.getElementById(`scrolltotaskbottom${props.task.id}`)?.scrollIntoView({
            //behavior: "smooth",
            block: "end",
            inline: "nearest"
        })
    }
    React.useLayoutEffect( () => {
        scrollContent()
    }, []);
  return (
    <>
      <pre style={{display: "inline-block"}}>
        {props.download?.plaintext || ""}
      </pre>
      
      <MythicStyledTooltip title={props?.download?.hoverText || "Download payload"} >
        <Button variant={props.download?.variant || "contained"} component="a" target="_blank" color="primary" href={"/api/v1.4/files/download/" + props.download.agent_file_id} download
          startIcon={<GetAppIcon />}>
            {props.download?.name || ""}
        </Button>
      </MythicStyledTooltip><br/>
    </>
  );   
}