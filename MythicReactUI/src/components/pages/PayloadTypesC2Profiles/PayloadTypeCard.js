import React, { useEffect } from 'react';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material/styles';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {PayloadTypeBuildDialog} from './PayloadTypeBuildDialog';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import IconButton from '@mui/material/IconButton';
import BuildIcon from '@mui/icons-material/Build';
import TableRow from '@mui/material/TableRow';
import MythicTableCell from "../../MythicComponents/MythicTableCell";

import {gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";

const toggleDeleteStatus = gql`
mutation togglePayloadTypeDeleteStatus($payloadtype_id: Int!, $deleted: Boolean!){
  update_payloadtype_by_pk(pk_columns: {id: $payloadtype_id}, _set: {deleted: $deleted}) {
    id
  }
}
`;

export function PayloadTypeRow({service, showDeleted}){
    const theme = useTheme();
    const [wrappedPayloads, setWrappedPayloads] = React.useState("");
    const [openBuildingDialog, setOpenBuildingDialog] = React.useState(false);
    const [supportedOS, setSupportedOS] = React.useState("");
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
    })
    const onAcceptDelete = () => {
        updateDeleted({variables: {payloadtype_id: service.id, deleted: !service.deleted}})
        setOpenDeleteDialog(false);
    }
    useEffect( () => {
        if( service.wrap_these_payload_types.length > 0){
            const wrapped = service.wrap_these_payload_types.map( (cur) => {
                return cur.wrapped.name;
            });
            setWrappedPayloads(wrapped.join(", "));
        }
        else{
            setWrappedPayloads("");
        }
        setSupportedOS(service.supported_os.join(", "));
    }, [service.wrap_these_payload_types, service.supported_os]);
    if(service.deleted && !showDeleted){
        return null;
    }
    return (
        <>
            <TableRow hover>
                <MythicTableCell>
                    {service.deleted ? (
                        <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} color="success" >
                            <RestoreFromTrashOutlinedIcon/>
                        </IconButton>
                    ) : (
                        <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} color="error" >
                            <DeleteIcon/>
                        </IconButton>
                    )}
                </MythicTableCell>
                <MythicTableCell>
                    <img src={"/static/" + service.name + ".svg"} style={{width: "80px", padding: "10px", objectFit: "unset"}} />
                </MythicTableCell>
                <MythicTableCell>
                    {service.name}
                </MythicTableCell>
                <MythicTableCell>
                    {service.wrapper ? "Wrapper" : service.agent_type === "agent" ? "Agent" : "3rd Party Service"}
                </MythicTableCell>
                <MythicTableCell>
                    <Typography variant="body1" component="p">
                        <b>Author:</b> {service.author}
                    </Typography>
                    <Typography variant="body1" component="p">
                        <b>Supported Operating Systems:</b> {supportedOS}
                    </Typography>
                    {service.wrap_these_payload_types.length === 0 ? null : (
                        <Typography variant="body1" component="p">
                            <b>Wrapped Payload Types:</b> {wrappedPayloads}
                        </Typography>
                    )}
                    <Typography variant="body2" component="p">
                        <b>Description:</b><br/>{service.note}
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
                            color="secondary"
                            href={service.wrapper ? "/docs/wrappers/" + service.name : "/docs/agents/" + service.name}
                            target="_blank"
                            size="large">
                            <MenuBookIcon />
                        </IconButton>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={"Build Parameters"}>
                        <IconButton
                            onClick={()=>{setOpenBuildingDialog(true);}}
                            color="secondary"
                            size="large">
                            <BuildIcon />
                        </IconButton>
                    </MythicStyledTooltip>
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
        </>

    );
}