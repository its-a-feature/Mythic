import React from 'react';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import {useMutation, gql} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faFolderOpen} from '@fortawesome/free-solid-svg-icons';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';
import TableRow from '@mui/material/TableRow';
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {C2ProfileListFilesDialog} from "./C2ProfileListFilesDialog";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';

const toggleDeleteStatus = gql`
mutation toggleCustomBrowserDeleteStatus($custombrowser_id: Int!, $deleted: Boolean!){
  update_custombrowser_by_pk(pk_columns: {id: $custombrowser_id}, _set: {deleted: $deleted}) {
    id
  }
}
`;

export function CustomBrowserRow({service, showDeleted}) {
  const theme = useTheme();
  const [openListFilesDialog, setOpenListFilesDialog] = React.useState(false);
  const [openDelete, setOpenDeleteDialog] = React.useState(false);
  const [updateDeleted] = useMutation(toggleDeleteStatus, {
      onCompleted: data => {
      },
      onError: error => {
          if(service.deleted){
              snackActions.error("Failed to restore browser");
          } else {
              snackActions.error("Failed to mark browser as deleted");
          }
      }
    });
  const onAcceptDelete = () => {
      updateDeleted({variables: {custombrowser_id: service.id, deleted: !service.deleted}})
      setOpenDeleteDialog(false);
    }
    if(service.deleted && !showDeleted){
        return null;
    }
  return (

        <TableRow >
            <MythicTableCell>
                {service.deleted ? (
                    <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} color="success" variant="contained"><RestoreFromTrashOutlinedIcon/></IconButton>
                ) : (
                    <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} color="error" variant="contained"><DeleteIcon/></IconButton>
                )}
                {openDelete &&
                    <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete}
                                         open={openDelete}
                                         acceptText={service.deleted ? "Restore" : "Remove"}
                                         acceptColor={service.deleted ? "success": "error"} />
                }
            </MythicTableCell>
            <MythicTableCell>
                <FontAwesomeIcon icon={faFolderOpen} style={{width: "60px", height: "60px"}} />
            </MythicTableCell>
            <MythicTableCell>
                {service.name}
                <Typography variant="body2" component="p" color={service.container_running ? theme.palette.success.main : theme.palette.error.main} >
                    <b>{service.container_running ? "Online" : "Offline"}</b>
                </Typography>
            </MythicTableCell>
            <MythicTableCell>
                {service.type}
            </MythicTableCell>
            <MythicTableCell>
                <Typography variant="body1" component="p">
                    <b>Author:</b> {service.author}
                </Typography>
                <Typography variant="body2" component="p" style={{whiteSpace: "pre-wrap"}}>
                    <b>Description: </b>{service.description}
                </Typography>
                <Typography variant="body2" component="p" style={{whiteSpace: "pre-wrap"}}>
                    <b>Version: </b>{service.semver}
                </Typography>
                <Typography variant="body2" component="p" style={{whiteSpace: "pre-wrap"}}>
                    <b>Export Capabilities: </b>{service.export_function === "" ? "False" : "True"}
                </Typography>

            </MythicTableCell>
            <MythicTableCell>
                <MythicStyledTooltip title={service.container_running ? "View Files" : "Unable to view files because container is offline"}>
                    <IconButton
                        disabled={!service.container_running}
                        onClick={()=>{setOpenListFilesDialog(true);}}
                        size="medium">
                        <AttachFileIcon />
                    </IconButton>
                </MythicStyledTooltip>
            </MythicTableCell>
            <MythicTableCell style={{padding: 0}}>
                <Table>
                    <TableHead>
                        <TableRow hover>
                            <MythicTableCell>{"Custom Row Action"}</MythicTableCell>
                            <MythicTableCell>{"Needed UI Feature"}</MythicTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {service.row_actions.map(c => (
                            <TableRow key={c.name} hover>
                                <MythicTableCell>{c.name}</MythicTableCell>
                                <MythicTableCell>{c.ui_feature}</MythicTableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Table>
                    <TableHead>
                        <TableRow hover>
                            <MythicTableCell>{"Display Table Column"}</MythicTableCell>
                            <MythicTableCell>{"Metadata Key"}</MythicTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {service.columns.map(c => (
                            <TableRow key={c.name} hover>
                                <MythicTableCell>{c.name}</MythicTableCell>
                                <MythicTableCell>{c.key}</MythicTableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Table>
                    <TableHead>
                        <TableRow hover>
                            <MythicTableCell>{"Extra Table Task Parameter"}</MythicTableCell>
                            <MythicTableCell>{"Parameter Name"}</MythicTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {service.extra_table_inputs.map(c => (
                            <TableRow key={c.name} hover>
                                <MythicTableCell>
                                    <Typography variant="body2" component="p" style={{whiteSpace: "pre-wrap"}}>
                                        <b>{c.display_name}: </b> {c.description}
                                    </Typography>
                                </MythicTableCell>
                                <MythicTableCell>{c.name}</MythicTableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </MythicTableCell>

            {openListFilesDialog &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openListFilesDialog}
                              onClose={()=>{setOpenListFilesDialog(false);}}
                              innerDialog={<C2ProfileListFilesDialog container_name={service.name} {...service} onClose={()=>{setOpenListFilesDialog(false);}} />}
                />
            }
        </TableRow>

  );
}
