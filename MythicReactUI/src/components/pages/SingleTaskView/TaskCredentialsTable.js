import React, { useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import {IconButton} from '@mui/material';
import {snackActions} from '../../utilities/Snackbar';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {MythicPageHeaderChip, MythicSectionHeader} from "../../MythicComponents/MythicPageHeader";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {MythicStatusChip} from "../../MythicComponents/MythicStatusChip";

export function TaskCredentialsTable(props){
   const [credentials, setCredentials] = React.useState([]);

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
   const credentialCountLabel = credentials.length === 1 ? "1 credential" : `${credentials.length} credentials`;
  return (
    <div className="mythic-single-task-metadata-section">
        <MythicSectionHeader
            dense
            title="Credentials"
            subtitle="Credentials captured by the selected task set."
            actions={<MythicPageHeaderChip label={credentialCountLabel} />}
        />
        <TableContainer className="mythicElement mythic-single-task-table-wrap">
          <Table className="mythic-single-task-table" size="small">
                <TableHead>
                    <TableRow>
                        <MythicStyledTableCell style={{width: "4.5rem"}}>Task</MythicStyledTableCell>
                        <MythicStyledTableCell style={{width: "9rem"}}>Type</MythicStyledTableCell>
                        <MythicStyledTableCell>Realm</MythicStyledTableCell>
                        <MythicStyledTableCell>Account</MythicStyledTableCell>
                        <MythicStyledTableCell>Credentials</MythicStyledTableCell>
                        <MythicStyledTableCell>Comment</MythicStyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                  {credentials.map( (cred) => (
                    <CredentialTableRow cred={cred} key={"cred" + cred.id} />
                  ))}
                </TableBody>
            </Table>
          </TableContainer>
    </div>
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
      <MythicStyledTableCell>{cred.display_id}</MythicStyledTableCell>
      <MythicStyledTableCell>
        <MythicStatusChip label={cred.type} status="neutral" showIcon={false} />
      </MythicStyledTableCell>
      <MythicStyledTableCell className="mythic-single-task-cell-break">{cred.realm}</MythicStyledTableCell>
      <MythicStyledTableCell className="mythic-single-task-cell-break">{cred.account}</MythicStyledTableCell>
      <MythicStyledTableCell>
        {cred.credential_text.length > 64 ? 
          (
              <div className="mythic-single-task-credential-cell">
                  <MythicStyledTooltip title={"Copy to clipboard"}>
                      <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" onClick={() => onCopyToClipboard(cred.credential_text)} size="small">
                          <ContentCopyIcon fontSize="small" />
                      </IconButton>
                  </MythicStyledTooltip>
                  <Typography className="mythic-single-task-credential-text" variant="body2">{displayCred}</Typography>
              </div>
          )
          :
          (
              <React.Fragment>
                  <Typography className="mythic-single-task-credential-text" variant="body2">{displayCred}</Typography>
              </React.Fragment>   
          )}
        </MythicStyledTableCell>
      <MythicStyledTableCell className="mythic-single-task-cell-break">{cred.comment}</MythicStyledTableCell>
    </TableRow>
  )
}
