import React from 'react';
import {Button} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import {ResponseDisplayScreenshotModal} from './ResponseDisplayScreenshotModal';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";


export const ResponseDisplayScreenshot = (props) =>{
  const [openScreenshot, setOpenScreenshot] = React.useState(false);
  const clickOpenScreenshot = () => {
    setOpenScreenshot(true);
  }
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
      {openScreenshot &&
          <MythicDialog fullWidth={true} maxWidth="xl" open={openScreenshot}
              onClose={()=>{setOpenScreenshot(false);}}
              innerDialog={<ResponseDisplayScreenshotModal images={[props.agent_file_id]} onClose={()=>{setOpenScreenshot(false);}} />}
          />
      }
      <pre className="mythic-response-inline-text">
        {props?.plaintext || ""}
      </pre>
      <MythicStyledTooltip title={props?.hoverText || "View Screenshot (s)"}  >
        <Button
            className="mythic-table-row-action mythic-table-row-action-hover-info mythic-response-inline-action"
            variant={props.variant ? props.variant : "text"}
            onClick={clickOpenScreenshot}
            startIcon={<CameraAltIcon />}
        >
          {props.name || "View screenshot"}
        </Button>
      </MythicStyledTooltip>
    </div>
  );   
}
