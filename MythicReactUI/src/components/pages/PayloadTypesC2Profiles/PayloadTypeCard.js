import React from 'react';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {PayloadTypeBuildDialog} from './PayloadTypeBuildDialog';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import IconButton from '@mui/material/IconButton';
import TuneIcon from '@mui/icons-material/Tune';
import TableRow from '@mui/material/TableRow';
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import {gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import TerminalIcon from '@mui/icons-material/Terminal';
import {PayloadTypeCommandDialog} from "./PayloadTypeCommandsDialog";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import {C2ProfileListFilesDialog} from "./C2ProfileListFilesDialog";
import AttachFileIcon from '@mui/icons-material/AttachFile';
import {InstalledServiceContainerStatus} from "./InstalledServiceStatus";
import {
    InstalledServiceIdentity,
    InstalledServiceMetadataSummary
} from "./InstalledServiceTableComponents";

const toggleDeleteStatus = gql`
mutation togglePayloadTypeDeleteStatus($payloadtype_id: Int!, $deleted: Boolean!){
  update_payloadtype_by_pk(pk_columns: {id: $payloadtype_id}, _set: {deleted: $deleted}) {
    id
  }
}
`;

export function PayloadTypeRow({service, showDeleted}){
    const [openBuildingDialog, setOpenBuildingDialog] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const [updateDeleted] = useMutation(toggleDeleteStatus, {
        onCompleted: data => {
        },
        onError: error => {
            if(service.deleted){
                snackActions.error("Failed to restore payload type");
            } else {
                snackActions.error("Failed to mark payloadtype as deleted");
            }

        }
    });
    const [openCommandsDialog, setOpenCommandsDialog] = React.useState(false);
    const [openListFilesDialog, setOpenListFilesDialog] = React.useState(false);
    const typeLabel = service.wrapper ? "Wrapper" : service.agent_type === "agent" ? "Agent" : service.agent_type === "service" ? "3rd Party Service" : "Command Augmentation";
    const wrappedPayloadNames = React.useMemo(() => (service.wrap_these_payload_types || []).map((cur) => cur.wrapped.name), [service.wrap_these_payload_types]);
    const supportedOS = React.useMemo(() => service.supported_os || [], [service.supported_os]);
    const onAcceptDelete = () => {
        updateDeleted({variables: {payloadtype_id: service.id, deleted: !service.deleted}})
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
                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-success" size="small" onClick={()=>{setOpenDeleteDialog(true);}} >
                            <RestoreFromTrashOutlinedIcon fontSize="small" />
                        </IconButton>
                    ) : (
                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={()=>{setOpenDeleteDialog(true);}} >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    )}
                </MythicTableCell>
                <MythicTableCell>
                    <MythicAgentSVGIcon payload_type={service.name} style={{width: "80px", padding: "5px", objectFit: "unset"}} />
                </MythicTableCell>
                <MythicTableCell>
                    <InstalledServiceIdentity
                        name={service.name}
                        typeLabel={typeLabel}
                        deleted={service.deleted}
                        status={<InstalledServiceContainerStatus isOnline={service.container_running} />}
                    />
                </MythicTableCell>
                <MythicTableCell>
                    <InstalledServiceMetadataSummary
                        items={[
                            {label: "Author", value: service.author},
                            {label: "Version", value: service.semver, chip: true},
                            {label: "Supported OS", value: supportedOS},
                            {label: "Wraps", value: wrappedPayloadNames},
                        ]}
                        description={service.note}
                    />
                </MythicTableCell>
                <MythicTableCell>
                    <div className="mythic-table-row-actions">
                    <MythicStyledTooltip title={"Documentation"}>
                        <IconButton
                            className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                            href={service.wrapper ? "/docs/wrappers/" + service.name : "/docs/agents/" + service.name}
                            target="_blank"
                            size="small">
                            <MenuBookIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={"Build Parameters"}>
                        <IconButton
                            className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                            onClick={()=>{setOpenBuildingDialog(true);}}
                            size="small">
                            <TuneIcon fontSize="small" />
                        </IconButton>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={"Commands"}>
                        <IconButton
                            className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                            onClick={()=>{setOpenCommandsDialog(true)}}
                            size="small">
                            <TerminalIcon fontSize="small" />
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
            {openDelete &&
                <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete}
                                     open={openDelete}
                                     acceptText={service.deleted ? "Restore" : "Remove"}
                                     acceptColor={service.deleted ? "success": "error"} />
            }
            {openBuildingDialog &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openBuildingDialog}
                              onClose={()=>{setOpenBuildingDialog(false);}}
                              innerDialog={<PayloadTypeBuildDialog {...service} onClose={()=>{setOpenBuildingDialog(false);}}
                                                                   payload_name={service.name} />}
                />}
            {openCommandsDialog &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openCommandsDialog}
                              onClose={()=>{setOpenCommandsDialog(false);}}
                              innerDialog={<PayloadTypeCommandDialog service={service} onClose={()=>{setOpenCommandsDialog(false);}}
                                                                   payload_name={service.name} />}
                />}
            {openListFilesDialog &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openListFilesDialog}
                              onClose={()=>{setOpenListFilesDialog(false);}}
                              innerDialog={<C2ProfileListFilesDialog container_name={service.name} {...service} onClose={()=>{setOpenListFilesDialog(false);}} />}
                />
            }
        </>

    );
}
