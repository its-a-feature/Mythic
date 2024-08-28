import React, { useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCopy} from '@fortawesome/free-solid-svg-icons';
import {IconButton} from '@mui/material';
import {snackActions} from '../../utilities/Snackbar';

export function TaskCredentialsTable(props){
   const [credentials, setCredentials] = React.useState([]);
   const theme = useTheme();

   useEffect( () => {
    const condensed = props.tasks.reduce( (prev, tsk) => {
        const creds = tsk.credentials.map( c => {return {...c, display_id: tsk.display_id}});
      return [...prev, ...creds];
    }, []);
    setCredentials(condensed);
   }, [props.tasks]);
   if(credentials.length === 0){
     return null
   }
  return (
    <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
            <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Credentials
            </Typography>
        </Paper>
        
        <Paper elevation={5} style={{position: "relative", backgroundColor: theme.body}} >
        <TableContainer className="mythicElement">
          <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "4rem"}}>Task</TableCell>
                        <TableCell style={{width: "8rem"}}>Type</TableCell>
                        <TableCell>Realm</TableCell>
                        <TableCell>Account</TableCell>
                        <TableCell>Credentials</TableCell>
                        <TableCell>Comment</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                  {credentials.map( (cred) => (
                    <CredentialTableRow cred={cred} key={"cred" + cred.id} />
                  ))}
                </TableBody>
            </Table>
          </TableContainer>
        </Paper>
    </React.Fragment>
  );
}

const CredentialTableRow = ({cred}) => {
  const maxDisplayLength = 200;
  const displayCred = cred.credential_text.length > maxDisplayLength ? cred.credential_text.slice(0, maxDisplayLength) + "..." : cred.credential_text;
  const onCopyToClipboard = (data) => {
    let result = copyStringToClipboard(data);
    if(result){
      snackActions.success("Copied text!");
    }else{
      snackActions.error("Failed to copy text");
    }
}
  return (
    <TableRow key={"cred" + cred.id} hover>
      <TableCell >{cred.display_id}</TableCell>
      <TableCell>{cred.type}</TableCell>
      <TableCell style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>{cred.realm}</TableCell>
      <TableCell style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>{cred.account}</TableCell>
      <TableCell>
        {cred.credential_text.length > 64 ? 
          (
              <React.Fragment>
                  <MythicStyledTooltip title={"Copy to clipboard"}>
                      <IconButton onClick={() => onCopyToClipboard(cred.credential_text)} size="small">
                          <FontAwesomeIcon icon={faCopy} />
                      </IconButton>
                  </MythicStyledTooltip>
                  <Typography variant="body2" style={{wordBreak: "break-all", maxWidth: "40rem"}}>{displayCred}</Typography>
              </React.Fragment>
          )
          :
          (
              <React.Fragment>
                  <Typography variant="body2" style={{wordBreak: "break-all", maxWidth: "40rem"}}>{displayCred}</Typography>
              </React.Fragment>   
          )}
        </TableCell>
      <TableCell style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>{cred.comment}</TableCell>
    </TableRow>
  )
}
