import React, { useEffect }  from 'react';
import { PayloadTypeCard } from './PayloadTypeCard';
import {useSubscription, gql } from '@apollo/client';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material/styles';
import { Backdrop, IconButton } from '@mui/material';
import {CircularProgress} from '@mui/material';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';

 const SUB_Payload_Types = gql`
 subscription getPayloadTypesSubscription {
  payloadtype(order_by: {name: asc}) {
    author
    container_running
    id
    note
    name
    deleted
    supported_os
    wrapper
    translationcontainer {
        id
        name
        container_running
    }
    wrap_these_payload_types {
        id
        wrapped {
          name
        }
    }
  }
}
 `;


export function PayloadTypeContainerDisplay(props){
    const theme = useTheme();
    const { loading,  data } = useSubscription(SUB_Payload_Types);
    const [payloadTypes, setPayloadTypes] = React.useState([]);
    const [showDeleted, setShowDeleted] = React.useState(false);
    useEffect( () => {
      if(data === undefined){
        setPayloadTypes([]);
        return;
      }
      setPayloadTypes(data.payloadtype);
    }, [data])
    return (
          <div style={{flexDirection: "column", alignItems: "stretch"}}>
            {loading &&
                <div style={{position: "relative",  width: "100%", height: "100%"}}>
                <Backdrop open={loading} style={{zIndex: 1, marginTop: "10%", position: "absolute",}} >
                    <CircularProgress color="info"  />
                </Backdrop>
                </div>
            }
            
              <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                  <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                      Payload Types
                  </Typography>
                  {showDeleted ? (
                    <MythicStyledTooltip title={"Hide Deleted Payload Types"} style={{float: "right"}}>
                        <IconButton size="small" style={{float: "right", marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)}><VisibilityIcon /></IconButton>
                    </MythicStyledTooltip>
                    
                  ) : (
                    <MythicStyledTooltip title={"Show Deleted Payload Types"} style={{float: "right"}}>
                      <IconButton size="small" style={{float: "right",  marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)} ><VisibilityOffIcon /></IconButton>
                    </MythicStyledTooltip>
                  )}
                </Paper> 
              {
                  payloadTypes.map( (pt) => (
                    showDeleted || !pt.deleted ? (
                      <PayloadTypeCard key={"payloadtype" + pt.id} me={props.me} {...pt} />
                    ) : (null)
                      
                  ))
              }
              
          </div>
    );
}