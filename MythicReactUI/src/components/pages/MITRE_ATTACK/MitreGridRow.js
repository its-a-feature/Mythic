import React from 'react';
import Button from '@mui/material/Button';
import { Box } from '@mui/material';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { MitreMapDisplayDialog } from './MitreMapDisplayDialog';

export function MitreGridRow({row, showCountGrouping}){
  const [buttonColor, setButtonColor] = React.useState({});
  const [openDisplay, setOpenDisplay] = React.useState(false);
  React.useEffect( () => {
    switch(showCountGrouping){
      case "":
        setButtonColor({});
        break;
      case "command":
        if(row.commands.length > 0){
          setButtonColor({color: "white", backgroundColor: "rgb(188, 58, 36)"});
        }else{
          setButtonColor({});
        }
        break;
      case "task":
        if(row.tasks.length > 0){
          setButtonColor({color: "white", backgroundColor: "rgb(188, 58, 36)"});
        }else{
          setButtonColor({});
        }
    }
  }, [row.commands, row.tasks, showCountGrouping])
  return (
    <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
      {row?.t_num?.includes(".") ? 
      (
        <Box width={"50px"} height={"1px"} style={{border: "1px dashed grey"}} />
      ) :  null}
      <Button style={{
          width: "100%",
          justifyContent: "flex-start",
          ...buttonColor
        }}
        color={"secondary"}
        variant="outlined"
        onClick={() => setOpenDisplay(true)}
        >
          {row.name}
      </Button>
      {openDisplay ? (
          <MythicDialog fullWidth={true} maxWidth="md" open={openDisplay} 
              onClose={()=>{setOpenDisplay(false);}} 
              innerDialog={<MitreMapDisplayDialog entry={row} showCountGrouping={showCountGrouping} onClose={()=>{setOpenDisplay(false);}} />}
          />
        ) : null }
    </div>
    
  )
}

