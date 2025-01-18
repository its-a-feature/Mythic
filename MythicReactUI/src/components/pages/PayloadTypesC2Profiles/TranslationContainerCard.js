import React from 'react';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import Typography from '@mui/material/Typography';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import { faLanguage } from '@fortawesome/free-solid-svg-icons';
import {useTheme} from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import {useMutation, gql} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';
import TableRow from '@mui/material/TableRow';
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {C2ProfileListFilesDialog} from "./C2ProfileListFilesDialog";

const PREFIX = 'TranslationContainerCard';

const classes = {
  root: `${PREFIX}-root`,
  expand: `${PREFIX}-expand`,
  expandOpen: `${PREFIX}-expandOpen`,
  running: `${PREFIX}-running`,
  notrunning: `${PREFIX}-notrunning`
};


const toggleDeleteStatus = gql`
mutation toggleC2ProfileDeleteStatus($translationcontainer_id: Int!, $deleted: Boolean!){
  update_translationcontainer_by_pk(pk_columns: {id: $translationcontainer_id}, _set: {deleted: $deleted}) {
    id
  }
}
`;

export function TranslationContainerRow({service, showDeleted}) {
  const theme = useTheme();
  const [openListFilesDialog, setOpenListFilesDialog] = React.useState(false);
  const [openDelete, setOpenDeleteDialog] = React.useState(false);
  const [updateDeleted] = useMutation(toggleDeleteStatus, {
      onCompleted: data => {
      },
      onError: error => {
          if(service.deleted){
              snackActions.error("Failed to restore translation profile");
          } else {
              snackActions.error("Failed to mark translation profile as deleted");
          }
      }
    });
    const onAcceptDelete = () => {
      updateDeleted({variables: {translationcontainer_id: service.id, deleted: !service.deleted}})
      setOpenDeleteDialog(false);
    }
    if(service.deleted && !showDeleted){
        return null;
    }
  return (

        <TableRow hover>
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
                <FontAwesomeIcon icon={faLanguage} style={{width: "80px", height: "80px"}} />
            </MythicTableCell>
            <MythicTableCell>
                {service.name}
            </MythicTableCell>
            <MythicTableCell>
                Translation
            </MythicTableCell>
            <MythicTableCell>
                <Typography variant="body1" component="p">
                    <b>Author:</b> {service.author}
                </Typography>
                <Typography variant="body1" component="p">
                    <b>Supported Agents:</b> {service.payloadtypes.filter(pt => !pt.deleted).map( (pt) => pt.name).join(", ")}
                </Typography>
                <Typography variant="body2" component="p" style={{whiteSpace: "pre-wrap"}}>
                    <b>Description: </b>{service.description}
                </Typography>
            </MythicTableCell>
            <MythicTableCell>
                <Typography variant="body2" component="p" color={service.container_running ? theme.palette.success.main : theme.palette.error.main} >
                    <b>{service.container_running ? "Online" : "Offline"}</b>
                </Typography>
            </MythicTableCell>
            <MythicTableCell>
                <MythicStyledTooltip title={"Documentation"}>
                    <IconButton
                        color={"secondary"}
                        href={"/docs/c2-profiles/" + service.name.toLowerCase()}
                        target="_blank"
                        size="medium">
                        <MenuBookIcon />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={service.container_running ? "View Files" : "Unable to view files because container is offline"}>
                    <IconButton
                        color={"secondary"}
                        disabled={!service.container_running}
                        onClick={()=>{setOpenListFilesDialog(true);}}
                        size="medium">
                        <AttachFileIcon />
                    </IconButton>
                </MythicStyledTooltip>
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
