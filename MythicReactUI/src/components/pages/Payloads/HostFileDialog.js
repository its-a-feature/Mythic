import React, {useState} from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import MythicTextField from "../../MythicComponents/MythicTextField";
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {alpha, useTheme} from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import ReplayIcon from '@mui/icons-material/Replay';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicStatusChip} from "../../MythicComponents/MythicStatusChip";
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicDialogGrid,
    MythicDialogSection,
    MythicFormField,
    MythicFormSwitchRow
} from "../../MythicComponents/MythicDialogLayout";

const hostFileMutation = gql`
mutation hostFileMutation($c2_id: Int!, $file_uuid: String!, $host_url: String!, $alert_on_download: Boolean) {
  c2HostFile(c2_id: $c2_id, file_uuid: $file_uuid, host_url: $host_url, alert_on_download: $alert_on_download) {
      status
      error
      id
      filemeta_id
      c2_profile_id
      host_url
      hosting_status
      affected_count
  }
}
`;
const updateHostedFileMutation = gql`
mutation updateHostedFileMutation($c2profile_file_host_id: Int!, $host_url: String, $alert_on_download: Boolean, $stop: Boolean, $remove: Boolean) {
  c2UpdateHostedFile(c2profile_file_host_id: $c2profile_file_host_id, host_url: $host_url, alert_on_download: $alert_on_download, stop: $stop, remove: $remove) {
      status
      error
      id
      filemeta_id
      c2_profile_id
      host_url
      hosting_status
      affected_count
  }
}
`;
const getC2ProfilesQuery = gql`
query getC2Profiles {
    c2profile(where: {deleted: {_eq: false}, container_running: {_eq: true}, is_p2p: {_eq: false}}, order_by: {name: asc}){
        id
        name
    }
}
`;
const getHostedFilesQuery = gql`
query getHostedFiles($file_uuid: String!) {
    c2profile_file_host(where: {filemetum: {agent_file_id: {_eq: $file_uuid}}}, order_by: {updated_at: desc}) {
        id
        c2_profile_id
        host_url
        alert_on_download
        status
        error
        updated_at
        c2profile {
            id
            name
        }
    }
}
`;

const hostedStatusChipStatus = (status) => {
    if(status === "active"){
        return "active";
    } else if(status === "updating"){
        return "building";
    } else if(status === "stopped"){
        return "inactive";
    }
    return "error";
}

const HostedFileActionButton = ({title, disabled, onClick, hoverClass, children}) => (
    <MythicStyledTooltip title={title}>
        <span>
            <IconButton
                aria-label={title}
                className={`mythic-table-row-icon-action ${hoverClass}`}
                disabled={disabled}
                onClick={onClick}
                size="small"
            >
                {children}
            </IconButton>
        </span>
    </MythicStyledTooltip>
);

export function HostedFileLocationsTable({
    hostedFiles,
    renderFile,
    onEdit,
    onRetry,
    onStop,
    onRemove,
    emptyText = "No hosted locations",
    className = "mythicElement",
    sx = {},
}) {
    const theme = useTheme();
    const rows = hostedFiles || [];
    const hasActions = Boolean(onEdit || onRetry || onStop || onRemove);
    const hasFileColumn = Boolean(renderFile);
    if(rows.length === 0){
        return <Typography variant="body2" color="text.secondary">{emptyText}</Typography>;
    }
    return (
        <TableContainer
            className={className}
            sx={{
                border: `1px solid ${theme.borderColor || alpha(theme.palette.divider, 0.8)}`,
                borderRadius: "8px",
                overflowX: "auto",
                ...sx,
            }}
        >
            <Table size="small" sx={{tableLayout: "fixed", width: "100%"}}>
                <TableHead>
                    <TableRow sx={{
                        backgroundColor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.07 : 0.04),
                        "& .MuiTableCell-root": {
                            borderBottom: `1px solid ${theme.borderColor || theme.palette.divider}`,
                            color: "text.secondary",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            letterSpacing: 0,
                            py: 0.75,
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                        },
                    }}>
                        <TableCell sx={{width: hasFileColumn ? "15%" : "20%"}}>C2 Profile</TableCell>
                        <TableCell sx={{width: hasFileColumn ? "21%" : "30%"}}>Path</TableCell>
                        {hasFileColumn && <TableCell sx={{width: "25%"}}>File</TableCell>}
                        <TableCell sx={{width: 96}}>Alert</TableCell>
                        <TableCell sx={{width: 118}}>Status</TableCell>
                        <TableCell>Error</TableCell>
                        {hasActions && <TableCell align="right" sx={{width: 160}}>Actions</TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((hostedFile) => (
                        <TableRow
                            key={hostedFile.id}
                            sx={{
                                "& .MuiTableCell-root": {
                                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
                                    py: 0.8,
                                    verticalAlign: "middle",
                                },
                                "&:last-of-type .MuiTableCell-root": {
                                    borderBottom: 0,
                                },
                                "&:hover": {
                                    backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.10 : 0.045),
                                },
                            }}
                        >
                            <TableCell>
                                <Typography variant="body2" sx={{fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                                    {hostedFile.c2profile?.name || "Unknown"}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        backgroundColor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.08 : 0.05),
                                        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                                        borderRadius: "5px",
                                        color: "text.primary",
                                        display: "inline-block",
                                        fontFamily: "monospace",
                                        maxWidth: "100%",
                                        overflowWrap: "anywhere",
                                        px: 0.75,
                                        py: 0.35,
                                    }}
                                >
                                    {hostedFile.host_url}
                                </Typography>
                            </TableCell>
                            {hasFileColumn && <TableCell>{renderFile(hostedFile)}</TableCell>}
                            <TableCell>
                                <MythicStatusChip
                                    label={hostedFile.alert_on_download ? "On" : "Off"}
                                    status={hostedFile.alert_on_download ? "warning" : "neutral"}
                                    icon={hostedFile.alert_on_download ? <NotificationsActiveOutlinedIcon /> : <NotificationsOffOutlinedIcon />}
                                />
                            </TableCell>
                            <TableCell>
                                <MythicStatusChip
                                    label={hostedFile.status || "unknown"}
                                    status={hostedStatusChipStatus(hostedFile.status)}
                                />
                            </TableCell>
                            <TableCell>
                                {hostedFile.error ? (
                                    <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{minWidth: 0}}>
                                        <ErrorOutlineIcon color="error" sx={{fontSize: 16, flex: "0 0 auto", mt: "2px"}} />
                                        <Typography variant="body2" color="error.main" sx={{overflowWrap: "anywhere"}}>
                                            {hostedFile.error}
                                        </Typography>
                                    </Stack>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">None</Typography>
                                )}
                            </TableCell>
                            {hasActions &&
                                <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        {onEdit &&
                                            <HostedFileActionButton title="Edit hosted file" hoverClass="mythic-table-row-icon-action-hover-info" onClick={() => onEdit(hostedFile)}>
                                                <EditIcon fontSize="small" />
                                            </HostedFileActionButton>
                                        }
                                        {onRetry &&
                                            <HostedFileActionButton title="Retry hosting" hoverClass="mythic-table-row-icon-action-hover-success" disabled={hostedFile.status === "active" || hostedFile.status === "updating"} onClick={() => onRetry(hostedFile)}>
                                                <ReplayIcon fontSize="small" />
                                            </HostedFileActionButton>
                                        }
                                        {onStop &&
                                            <HostedFileActionButton title="Stop hosting" hoverClass="mythic-table-row-icon-action-hover-warning" disabled={hostedFile.status === "stopped" || hostedFile.status === "updating"} onClick={() => onStop(hostedFile)}>
                                                <StopCircleOutlinedIcon fontSize="small" />
                                            </HostedFileActionButton>
                                        }
                                        {onRemove &&
                                            <HostedFileActionButton title="Remove hosted file row" hoverClass="mythic-table-row-icon-action-hover-danger" disabled={hostedFile.status === "updating"} onClick={() => onRemove(hostedFile)}>
                                                <DeleteOutlineIcon fontSize="small" />
                                            </HostedFileActionButton>
                                        }
                                    </Stack>
                                </TableCell>
                            }
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export function HostFileDialog(props) {
    const [message, setMessage] = useState("");
    const [availableC2Profiles, setAvailableC2Profiles] = React.useState([]);
    const [selectedC2Profile, setSelectedC2Profile] = React.useState({id: 0});
    const [alertOnDownload, setAlertOnDownload] = React.useState(false);
    const [editingHostedFile, setEditingHostedFile] = React.useState(props.hostedFile || null);
    const pendingUpdateAction = React.useRef({action: ""});
    const isEditMode = Boolean(editingHostedFile?.id);
    const [hostFile] = useMutation(hostFileMutation, {
        onCompleted: (data) => {
            if(data.c2HostFile.status === "success"){
                snackActions.success("Updated hosted file state");
                refetchHostedFiles();
                if(props.onUpdated){
                    props.onUpdated(data.c2HostFile, {action: "host"});
                }
            } else {
                snackActions.error(data.c2HostFile.error);
            }
        },
        onError: (error) => {
            snackActions.error(error.message);
            console.log(error.message);
        }
    })
    const [updateHostedFile] = useMutation(updateHostedFileMutation, {
        onCompleted: (data) => {
            if(data.c2UpdateHostedFile.status === "success"){
                snackActions.success("Updated hosted file state");
                refetchHostedFiles();
                if(props.onUpdated){
                    props.onUpdated(data.c2UpdateHostedFile, pendingUpdateAction.current);
                }
            } else {
                snackActions.error(data.c2UpdateHostedFile.error);
            }
        },
        onError: (error) => {
            snackActions.error(error.message);
            console.log(error.message);
        }
    })
    const {data: hostedFilesData, refetch: refetchHostedFiles} = useQuery(getHostedFilesQuery, {
        variables: {file_uuid: props.file_uuid},
        fetchPolicy: "network-only"
    });
    useQuery(getC2ProfilesQuery, {
        onCompleted: data => {
          setAvailableC2Profiles(data.c2profile);
          if(!isEditMode && data.c2profile.length > 0){
              setSelectedC2Profile(data.c2profile[0]);
          }
        },
        fetchPolicy: "network-only"
    });
    React.useEffect(() => {
        setEditingHostedFile(props.hostedFile || null);
    }, [props.hostedFile]);
    React.useEffect(() => {
        if(editingHostedFile?.id){
            setMessage(editingHostedFile.host_url || "");
            setAlertOnDownload(Boolean(editingHostedFile.alert_on_download));
            setSelectedC2Profile(editingHostedFile.c2profile || {
                id: editingHostedFile.c2_profile_id,
                name: editingHostedFile.c2profile?.name || ""
            });
        }
    }, [editingHostedFile]);
    const selectableC2Profiles = React.useMemo(() => {
        if(!editingHostedFile?.c2_profile_id){
            return availableC2Profiles;
        }
        if(availableC2Profiles.some((profile) => profile.id === editingHostedFile.c2_profile_id)){
            return availableC2Profiles;
        }
        return [...availableC2Profiles, {
            id: editingHostedFile.c2_profile_id,
            name: editingHostedFile.c2profile?.name || `C2 ${editingHostedFile.c2_profile_id}`
        }];
    }, [availableC2Profiles, editingHostedFile]);
    const onChangeHostURL = (name, value, error) => {
        setMessage(value);
    }
    const handleChange = (event) => {
        const selected = selectableC2Profiles.find((profile) => profile.id === event.target.value);
        setSelectedC2Profile(selected || {id: 0});
    };
    const onChangeAlert = (event) => {
        setAlertOnDownload(event.target.checked);
    }
    const submit = () => {
        if(message.length === 0){
            snackActions.warning("Must supply a hosting path");
        } else if(message[0] !== "/"){
            snackActions.warning("Hosting URL must start with a /");
        } else if(selectedC2Profile.id === 0){
            snackActions.warning("Must select a running, egress C2 Profile to host");
        } else if(isEditMode){
            pendingUpdateAction.current = {action: "edit", id: editingHostedFile.id, alert_on_download: alertOnDownload};
            updateHostedFile({variables: {
                c2profile_file_host_id: editingHostedFile.id,
                host_url: message,
                alert_on_download: alertOnDownload
            }});
        } else {
            hostFile({variables: {c2_id: selectedC2Profile.id,
                    file_uuid: props.file_uuid,
                    host_url: message,
                    alert_on_download: alertOnDownload
                }});
        }
    }
    const editHosting = (hostedFile) => {
        setEditingHostedFile(hostedFile);
    }
    const retryHosting = (hostedFile) => {
        pendingUpdateAction.current = {action: "retry", id: hostedFile.id};
        updateHostedFile({variables: {
            c2profile_file_host_id: hostedFile.id
        }});
    }
    const stopHosting = (hostedFile) => {
        pendingUpdateAction.current = {action: "stop", id: hostedFile.id};
        updateHostedFile({variables: {
            c2profile_file_host_id: hostedFile.id,
            stop: true
        }});
    }
    const removeHosting = (hostedFile) => {
        pendingUpdateAction.current = {action: "remove", id: hostedFile.id};
        updateHostedFile({variables: {
            c2profile_file_host_id: hostedFile.id,
            remove: true
        }});
    }
    const hostedFiles = hostedFilesData?.c2profile_file_host || [];

  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{isEditMode ? "Edit Hosted File" : "Host File via C2 Profile"}</DialogTitle>
        <DialogContent dividers={true}>
          <MythicDialogBody>
            <MythicDialogSection title="File">
                <Box className="mythic-dialog-preview" sx={{backgroundColor: "background.paper"}}>
                    <Typography sx={{wordBreak: "break-all"}}>
                        {props.file_name}
                    </Typography>
                </Box>
            </MythicDialogSection>
            <MythicDialogSection title="Hosting">
                <MythicDialogGrid>
                    <MythicFormField label="C2 Profile" description="Select a running egress profile to serve this file." required>
                        <FormControl fullWidth size="small">
                            <InputLabel id="host-file-c2-profile-label">C2 Profile</InputLabel>
                            <Select
                                labelId="host-file-c2-profile-label"
                                id="host-file-c2-profile"
                                value={selectedC2Profile.id || ""}
                                label="C2 Profile"
                                onChange={handleChange}
                                disabled={isEditMode}
                            >
                                {selectableC2Profiles.map( (opt) => (
                                    <MenuItem value={opt.id} key={opt.id}>{opt.name}</MenuItem>
                                ) )}
                            </Select>
                        </FormControl>
                    </MythicFormField>
                    <MythicFormField label="Hosting URL Path" description="Path must start with /" required>
                        <MythicTextField
                            value={message}
                            onEnter={submit}
                            onChange={onChangeHostURL}
                            requiredValue={true}
                            name="Hosting URL Path"
                            showLabel={false}
                            marginTop="0px"
                            marginBottom="0px"
                        />
                    </MythicFormField>
                </MythicDialogGrid>
            </MythicDialogSection>
            <MythicDialogSection title="Download Alerts">
                <MythicFormSwitchRow
                    label="Download Alert"
                    description="Send an alert when the hosted file is downloaded."
                    control={<Switch color={"success"} onChange={onChangeAlert} checked={alertOnDownload} />}
                />
            </MythicDialogSection>
            <MythicDialogSection title="Hosted Locations">
                <HostedFileLocationsTable
                    hostedFiles={hostedFiles}
                    onEdit={editHosting}
                    onRetry={retryHosting}
                    onStop={stopHosting}
                    onRemove={removeHosting}
                    className=""
                />
            </MythicDialogSection>
          </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
          <MythicDialogButton intent="primary" onClick={submit}>
            {isEditMode ? "Update" : "Submit"}
          </MythicDialogButton>
        </MythicDialogFooter>
  </React.Fragment>
  );
}
