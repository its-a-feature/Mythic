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
    <div className="mythic-response-inline-output">
      <pre className="mythic-response-inline-text">
        {props.download?.plaintext || ""}
      </pre>
      
      <MythicStyledTooltip title={props?.download?.hoverText || "Download payload"} >
        <Button
          className="mythic-table-row-action mythic-table-row-action-hover-info mythic-response-inline-action"
          variant={props.download?.variant || "text"}
          component="a"
          target="_blank"
          href={"/api/v1.4/files/download/" + props.download.agent_file_id}
          download
          startIcon={<GetAppIcon />}>
            {props.download?.name || "Download"}
        </Button>
      </MythicStyledTooltip>
    </div>
  );   
}
