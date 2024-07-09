import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import {useMutation, useQuery, gql} from '@apollo/client';
import {snackActions} from "../../utilities/Snackbar";
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";

const GetInviteLinks = gql`
query getOutstandingInviteLinks {
  getInviteLinks {
    status
    error
    links
  }
}
`;
const DeleteInviteLink = gql`
mutation deleteInviteLink($code: String!) {
    deleteInviteLink(code: $code){
        status
        error
    }
}
`;

export function InviteLinksDialog(props) {
    const [inviteLinks, setInviteLinks] = React.useState([]);
    useQuery(GetInviteLinks, {fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.getInviteLinks.status === "error"){
                snackActions.error(data.getInviteLinks.error);
                return
            }
            setInviteLinks(data.getInviteLinks.links);
        }
    });
    const [deleteInviteLink] = useMutation(DeleteInviteLink, {
        onCompleted: (result) => {
            if(result.deleteInviteLink.status === "success"){
                snackActions.success("Successfully deleted");
                const newLinks = inviteLinks.filter( l => l.code !== deletingCode.current);
                setInviteLinks(newLinks);
            } else {
                snackActions.error(result.deleteInviteLink.error);
            }
        },
        onError: (err) => {
            console.log(err);
            snackActions.error("Unable to update global without Admin permissions");
            props.onClose();
        }
    });
    const deletingCode = React.useRef("");
    const onDeleteInvite = (code) => {
        deletingCode.current = code;
        deleteInviteLink({variables: {code}});
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Manage Outstanding Invite Links</DialogTitle>
          <TableContainer  className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableHead>
                  <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Operator</TableCell>
                      <TableCell>Creation TIme</TableCell>
                      <TableCell>Link</TableCell>
                  </TableRow>
              </TableHead>
              <TableBody>
                  {inviteLinks.map( l => (
                      <TableRow hover key={l.code}>
                          <TableCell>
                              <MythicStyledTooltip title={"Delete the invite link so it can't be used'"}>
                                  <IconButton size="small" disableFocusRipple={true}
                                              disableRipple={true} onClick={()=>{onDeleteInvite(l.code);}} color="error" variant="contained">
                                      <DeleteIcon/></IconButton>
                              </MythicStyledTooltip>
                              {l.code}
                          </TableCell>
                          <TableCell>{l.operator}</TableCell>
                          <TableCell>{l.created_at}</TableCell>
                          <TableCell>{l.link}</TableCell>
                      </TableRow>
                  ))}
              </TableBody>
            </Table>
        </TableContainer>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Cancel
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

