import React from 'react';
import AttachFileIcon from '@mui/icons-material/AttachFile';
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
import {InstalledServiceContainerStatus} from "./InstalledServiceStatus";
import {
    InstalledServiceDefinitionList,
    InstalledServiceDetailRow,
    InstalledServiceDetailSection,
    InstalledServiceDetailToggle,
    InstalledServiceIdentity,
    InstalledServiceListValue
} from "./InstalledServiceTableComponents";

const toggleDeleteStatus = gql`
mutation toggleCustomBrowserDeleteStatus($custombrowser_id: Int!, $deleted: Boolean!){
  update_custombrowser_by_pk(pk_columns: {id: $custombrowser_id}, _set: {deleted: $deleted}) {
    id
  }
}
`;

export function CustomBrowserRow({service, showDeleted}) {
  const [openListFilesDialog, setOpenListFilesDialog] = React.useState(false);
  const [openDelete, setOpenDeleteDialog] = React.useState(false);
  const [openDetails, setOpenDetails] = React.useState(false);
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
                <FontAwesomeIcon icon={faFolderOpen} style={{width: "60px", height: "60px"}} />
            </MythicTableCell>
            <MythicTableCell>
                <InstalledServiceIdentity
                    name={service.name}
                    typeLabel={service.type}
                    deleted={service.deleted}
                    status={<InstalledServiceContainerStatus isOnline={service.container_running} />}
                />
            </MythicTableCell>
            <MythicTableCell>
                <div className="mythic-installed-service-browser-metadata">
                    {service.author &&
                        <div className="mythic-installed-service-browser-author" title={service.author}>
                            {service.author}
                        </div>
                    }
                    <div className="mythic-installed-service-browser-metrics">
                        {service.semver &&
                            <span className="mythic-installed-service-browser-metric">
                                <span>Version</span>
                                <InstalledServiceListValue value={[service.semver]} limit={1} />
                            </span>
                        }
                        <span className="mythic-installed-service-browser-metric">
                            <span>Export</span>
                            <strong>{service.export_function === "" ? "False" : "True"}</strong>
                        </span>
                        <span className="mythic-installed-service-browser-metric">
                            <span>Row actions</span>
                            <strong>{(service.row_actions || []).length}</strong>
                        </span>
                        <span className="mythic-installed-service-browser-metric">
                            <span>Columns</span>
                            <strong>{(service.columns || []).length}</strong>
                        </span>
                        <span className="mythic-installed-service-browser-metric">
                            <span>Inputs</span>
                            <strong>{(service.extra_table_inputs || []).length}</strong>
                        </span>
                    </div>
                    {service.description &&
                        <div className="mythic-installed-service-description" title={service.description}>
                            <span>Description</span>
                            <p>{service.description}</p>
                        </div>
                    }
                </div>
            </MythicTableCell>
            <MythicTableCell>
                <div className="mythic-table-row-actions">
                    <MythicStyledTooltip title={service.container_running ? "View Files" : "Unable to view files because container is offline"}>
                        <IconButton
                            className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                            disabled={!service.container_running}
                            onClick={()=>{setOpenListFilesDialog(true);}}
                            size="small">
                            <AttachFileIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                    <InstalledServiceDetailToggle open={openDetails} onClick={() => setOpenDetails((current) => !current)} />
                </div>
            </MythicTableCell>
        </TableRow>
        <InstalledServiceDetailRow open={openDetails} colSpan={5}>
            <InstalledServiceDetailSection title="Custom row actions" count={(service.row_actions || []).length}>
                <InstalledServiceDefinitionList
                    items={(service.row_actions || []).map((action) => ({
                        title: action.name,
                        subtitle: action.ui_feature,
                    }))}
                    emptyText="No custom row actions."
                />
            </InstalledServiceDetailSection>
            <InstalledServiceDetailSection title="Display columns" count={(service.columns || []).length}>
                <InstalledServiceDefinitionList
                    items={(service.columns || []).map((column) => ({
                        title: column.name,
                        subtitle: column.key,
                    }))}
                    emptyText="No display columns."
                />
            </InstalledServiceDetailSection>
            <InstalledServiceDetailSection title="Extra task inputs" count={(service.extra_table_inputs || []).length}>
                <InstalledServiceDefinitionList
                    items={(service.extra_table_inputs || []).map((input) => ({
                        title: input.display_name,
                        subtitle: input.name,
                        description: input.description,
                    }))}
                    emptyText="No extra task inputs."
                />
            </InstalledServiceDetailSection>
        </InstalledServiceDetailRow>
            {openListFilesDialog &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openListFilesDialog}
                              onClose={()=>{setOpenListFilesDialog(false);}}
                              innerDialog={<C2ProfileListFilesDialog container_name={service.name} {...service} onClose={()=>{setOpenListFilesDialog(false);}} />}
                />
            }
        </>

  );
}
