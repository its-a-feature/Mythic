import React from 'react';
import {Button} from '@mui/material';
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
    <>
      {openScreenshot &&
          <MythicDialog fullWidth={true} maxWidth="xl" open={openScreenshot}
              onClose={()=>{setOpenScreenshot(false);}}
              innerDialog={<ResponseDisplayScreenshotModal images={[props.agent_file_id]} onClose={()=>{setOpenScreenshot(false);}} />}
          />
      }
      <pre style={{display: "inline-block"}}>
        {props?.plaintext || ""}
      </pre>
      <MythicStyledTooltip title={props?.hoverText || "View Screenshot (s)"}  >
        <Button color="primary" variant={props.variant ? props.variant : "contained"} onClick={clickOpenScreenshot} style={{marginBottom: "10px"}}>{props.name}</Button>
      </MythicStyledTooltip>
    </>
  );   
}