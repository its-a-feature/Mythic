import React, {useEffect} from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material/styles';
import {C2ProfilesCard} from './C2ProfilesCard';
import {useSubscription, gql } from '@apollo/client';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { Backdrop, IconButton } from '@mui/material';
import {CircularProgress} from '@mui/material';

const SUB_C2_Profiles = gql`
subscription getPayloadTypesSubscription {
   c2profile(order_by: {name: asc}) {
   author
   id
   container_running
   description
   is_p2p
   name
   running
   deleted
   payloadtypec2profiles(order_by: {payloadtype: {name: asc}}) {
     payloadtype {
       name
       deleted
       id
     }
   }
 }
}
`;

export function C2ProfileContainerDisplay(props) {
  const { loading, data } = useSubscription(SUB_C2_Profiles, {fetchPolicy: "network-only"});
  const [c2profile, setC2profile] = React.useState([]);
  const [showDeleted, setShowDeleted] = React.useState(false);
  const theme = useTheme();
  useEffect( () => {
    if(data === undefined){
      setC2profile([]);
      return;
    }
    setC2profile(data.c2profile);
  }, [data])
  return (
        <div style={{ flexDirection: "column", alignItems: "stretch", paddingLeft: "10px"}}>
          {loading &&
                <div style={{position: "relative",  width: "100%", height: "100%"}}>
                <Backdrop open={loading} style={{zIndex: 1, marginTop: "10%", position: "absolute",}} >
                    <CircularProgress color="info"  />
                </Backdrop>
                </div>
            }
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
              <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                  C2 Profiles
              </Typography>
              {showDeleted ? (
                <MythicStyledTooltip title={"Hide Deleted C2 Profiles"} style={{float: "right"}}>
                    <IconButton size="small" style={{float: "right", marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)}><VisibilityIcon /></IconButton>
                </MythicStyledTooltip>
                
              ) : (
                <MythicStyledTooltip title={"Show Deleted C2 Profiles"} style={{float: "right"}}>
                  <IconButton size="small" style={{float: "right",  marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)} ><VisibilityOffIcon /></IconButton>
                </MythicStyledTooltip>
              )}
            </Paper> 
            {
                c2profile.map( (pt) => (
                  showDeleted || !pt.deleted ? (
                    <C2ProfilesCard key={"c2prof" + pt.id} me={props.me} {...pt} />
                    ) : (null)
                ))
            }
        </div>
    
    
  );
}
