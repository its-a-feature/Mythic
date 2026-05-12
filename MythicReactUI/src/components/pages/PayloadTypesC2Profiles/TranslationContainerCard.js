import React from 'react';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import { faLanguage } from '@fortawesome/free-solid-svg-icons';
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
import {InstalledServiceContainerStatus} from "./InstalledServiceStatus";
import {
    InstalledServiceIdentity,
    InstalledServiceMetadataSummary
} from "./InstalledServiceTableComponents";

const toggleDeleteStatus = gql`
mutation toggleC2ProfileDeleteStatus($translationcontainer_id: Int!, $deleted: Boolean!){
  update_translationcontainer_by_pk(pk_columns: {id: $translationcontainer_id}, _set: {deleted: $deleted}) {
    id
  }
}
`;

export function TranslationContainerRow({service, showDeleted}) {
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
    const supportedAgents = (service.payloadtypes || []).filter(pt => !pt.deleted).map((pt) => pt.name);
  return (
    <>
        <TableRow hover>
            <MythicTableCell>
                {service.deleted ? (
                    <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-success" size="small" onClick={()=>{setOpenDeleteDialog(true);}}><RestoreFromTrashOutlinedIcon fontSize="small" /></IconButton>
                ) : (
                    <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={()=>{setOpenDeleteDialog(true);}}><DeleteIcon fontSize="small" /></IconButton>
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
                <InstalledServiceIdentity
                    name={service.name}
                    typeLabel="Translation"
                    deleted={service.deleted}
                    status={<InstalledServiceContainerStatus isOnline={service.container_running} />}
                />
            </MythicTableCell>
            <MythicTableCell>
                <InstalledServiceMetadataSummary
                    items={[
                        {label: "Author", value: service.author},
                        {label: "Version", value: service.semver, chip: true},
                        {label: "Supported Agents", value: supportedAgents},
                    ]}
                    description={service.description}
                />
            </MythicTableCell>
            <MythicTableCell>
                <div className="mythic-table-row-actions">
                <MythicStyledTooltip title={"Documentation"}>
                    <IconButton
                        className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                        href={"/docs/c2-profiles/" + service.name.toLowerCase()}
                        target="_blank"
                        size="small">
                        <MenuBookIcon fontSize="small" />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={service.container_running ? "View Files" : "Unable to view files because container is offline"}>
                    <IconButton
                        className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                        disabled={!service.container_running}
                        onClick={()=>{setOpenListFilesDialog(true);}}
                        size="small">
                        <AttachFileIcon fontSize="small" />
                    </IconButton>
                </MythicStyledTooltip>
                </div>
            </MythicTableCell>
        </TableRow>
            {openListFilesDialog &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openListFilesDialog}
                              onClose={()=>{setOpenListFilesDialog(false);}}
                              innerDialog={<C2ProfileListFilesDialog container_name={service.name} {...service} onClose={()=>{setOpenListFilesDialog(false);}} />}
                />
            }
        </>

  );
}
