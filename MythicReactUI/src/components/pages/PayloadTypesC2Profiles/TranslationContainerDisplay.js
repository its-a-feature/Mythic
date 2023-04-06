import React, { useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material/styles';
import {TranslationContainerCard} from './TranslationContainerCard';
import {useSubscription, gql } from '@apollo/client';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { Backdrop, IconButton } from '@mui/material';
import {CircularProgress} from '@mui/material';

const SUB_Translation_Containers = gql`
subscription getTranslationContainersSubscription {
 translationcontainer(order_by: {name: asc}) {
   name
   id
   container_running
   deleted
   description
   author
   payloadtypes(order_by: {name: asc}) {
       name
       deleted
       id
   }
 }
}
`;
export function TranslationContainerDisplay(props) {
  const [translationContainers, setTranslationContainers] = React.useState([]);
  const [translationContainersWithPayloads, setTranslationContainersWithPayloads] = React.useState([]);
  const {  loading, data } = useSubscription(SUB_Translation_Containers);
  const theme = useTheme();
  const [showDeleted, setShowDeleted] = React.useState(false);
  useEffect( () => {
    if(data === undefined){
      setTranslationContainers([]);
      return;
    }
    const unassigned = data.translationcontainer.filter( (tr) => tr.payloadtypes.length === 0);
    const assigned = data.translationcontainer.filter( (tr) => tr.payloadtypes.length > 0);
    setTranslationContainers(unassigned);
    setTranslationContainersWithPayloads(assigned); 
  }, [data]);
  return (
    <div style={{width: "100%", display: "inline-flex", flexDirection: "column", alignItems: "stretch", }}>
      {loading &&
                <div style={{position: "relative",  width: "100%", height: "100%"}}>
                <Backdrop open={loading} style={{zIndex: 1, marginTop: "10%", position: "absolute",}} >
                    <CircularProgress color="info"  />
                </Backdrop>
                </div>
            }
      {
        translationContainersWithPayloads.length > 0 ? (
          <React.Fragment>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
              <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                  Translation Containers
              </Typography>
              {showDeleted ? (
                <MythicStyledTooltip title={"Hide Deleted Translators"} style={{float: "right"}}>
                    <IconButton size="small" style={{float: "right", marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)}><VisibilityIcon /></IconButton>
                </MythicStyledTooltip>
                
              ) : (
                <MythicStyledTooltip title={"Show Deleted Translators"} style={{float: "right"}}>
                  <IconButton size="small" style={{float: "right",  marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)} ><VisibilityOffIcon /></IconButton>
                </MythicStyledTooltip>
              )}
            </Paper> 
            {translationContainersWithPayloads.map( (tr) => (
              showDeleted || !tr.deleted ? (
                <TranslationContainerCard key={"translation_container" + tr.id} {...tr} />
              ) : (null)
                ))}
          </React.Fragment>
        ) : (null)
      }
      {
        translationContainers.length > 0 ? (
          <React.Fragment>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
              <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                  Translation Containers Not Assigned to Payload Types
              </Typography>
              {showDeleted ? (
                <MythicStyledTooltip title={"Hide Deleted Translators"} style={{float: "right"}}>
                    <IconButton size="small" style={{float: "right", marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)}><VisibilityIcon /></IconButton>
                </MythicStyledTooltip>
                
              ) : (
                <MythicStyledTooltip title={"Show Deleted Translators"} style={{float: "right"}}>
                  <IconButton size="small" style={{float: "right",  marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)} ><VisibilityOffIcon /></IconButton>
                </MythicStyledTooltip>
              )}
            </Paper> 
            {translationContainers.map( (tr) => (
               showDeleted || !tr.deleted ? (
                <TranslationContainerCard key={"translation_container" + tr.id} {...tr} />
               ) : (null)
                ))}
          </React.Fragment>
        ) : (null)
      }
    </div>
    
    
  );
}
