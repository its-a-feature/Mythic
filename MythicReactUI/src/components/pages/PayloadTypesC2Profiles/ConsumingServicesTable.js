import React from 'react';
import TableRow from '@mui/material/TableRow';
import PublicIcon from '@mui/icons-material/Public';
import {IconButton} from '@mui/material';
import {gql, useMutation} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';
import {MythicConfirmDialog} from "../../MythicComponents/MythicConfirmDialog";
import PermIdentityTwoToneIcon from '@mui/icons-material/PermIdentityTwoTone';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import AttachFileIcon from '@mui/icons-material/AttachFile';
import {ConsumingServicesGetIDPMetadataDialog} from "./ConsumingServicesGetIDPMetadataDialog";
import {C2ProfileListFilesDialog} from "./C2ProfileListFilesDialog";
import {InstalledServiceContainerStatus} from "./InstalledServiceStatus";
import {
    InstalledServiceDefinitionList,
    InstalledServiceDetailRow,
    InstalledServiceDetailSection,
    InstalledServiceDetailToggle,
    InstalledServiceIdentity,
    InstalledServiceMetadataSummary
} from "./InstalledServiceTableComponents";

const testWebhookMutation = gql`
mutation testWebhookWorks($service_type: String!){
    consumingServicesTestWebhook(service_type: $service_type){
        status
        error
    }
}
`;
const testLogMutation = gql`
mutation testWebhookWorks($service_type: String!){
    consumingServicesTestLog(service_type: $service_type){
        status
        error
    }
}
`;
const toggleDeleteStatus = gql`
mutation toggleConsumingContainerDeleteStatus($id: Int!, $deleted: Boolean!){
  update_consuming_container_by_pk(pk_columns: {id: $id}, _set: {deleted: $deleted}) {
    id
  }
}
`;
const webhook_events = ["new_alert","new_callback","new_custom","new_feedback", "new_startup"];
const logging_events = ["new_artifact","new_callback", "new_credential","new_file", "new_keylog",  "new_payload", "new_response", "new_task"];

export const ConsumingServicesTableRow = ({service, showDeleted}) => {
    const openListFilesInformation = React.useRef("");
    const [testWebhook] = useMutation(testWebhookMutation, {
        onCompleted: data => {
            if (data.consumingServicesTestWebhook.status === "success") {
                snackActions.success("Successfully sent test message to service");
            } else {
                console.log(data.consumingServicesTestWebhook.error)
                snackActions.error("No webhook listening")
            }

        },
        onError: error => {

        }
    });
    const issueTestWebhook = (service_type) => {
        testWebhook({variables: {service_type: service_type}});
    }
    const [testLog] = useMutation(testLogMutation, {
        onCompleted: data => {
            if (data.consumingServicesTestLog.status === "success") {
                snackActions.success("Successfully sent test message to service");
            } else {
                snackActions.error("No logger listening")
                console.log(data.consumingServicesTestLog.error)
            }

        },
        onError: error => {

        }
    });
    const issueTestLog = (service_type) => {
        testLog({variables: {service_type: service_type}});
    }
    const [openIDPMetadata, setOpenIDPMetadata] = React.useState(false);
    const [openDetails, setOpenDetails] = React.useState(false);
    const IDPMetadataRef = React.useRef({"container": "", "idp": ""});
    const [openListFilesDialog, setOpenListFilesDialog] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const deletingContainer = React.useRef({});
    const getIDPMetadata = (container, idp) => {
        IDPMetadataRef.current = {"container": container, "idp": idp};
        setOpenIDPMetadata(true);
    }
    const [updateDeleted] = useMutation(toggleDeleteStatus, {
        onCompleted: data => {
            snackActions.success("Successfully updated");
        },
        onError: error => {
            console.log(error);
            snackActions.error("Failed to update: " + error.message);
        }
    });
    const onAcceptDelete = () => {
        updateDeleted({variables: {id: deletingContainer.current.id, deleted: !deletingContainer.current.deleted}})
        setOpenDeleteDialog(false);
    }
    const adjustingDelete = (service) => {
        deletingContainer.current = service;
        setOpenDeleteDialog(true);
    }
    const [localData, setLocalData] = React.useState({...service, subscriptions: []});
    const onOpenListFilesDialog = (container) => {
        openListFilesInformation.current = container;
        setOpenListFilesDialog(true);
    }
    React.useEffect(() => {
        switch(service.type){
            case "webhook":
            case "logging":
                setLocalData({...service});
                break;
            case "eventing":
                try{
                    const newSubs = service.subscriptions.map( s => {
                        try{
                            return JSON.parse(s);
                        }catch(error){
                            console.log(error);
                            return {name: "", description: s};
                        }
                    });
                    setLocalData({...service, subscriptions: newSubs});
                }catch(error){

                }
                break;
            case "auth":
                try{
                    const newSubs = service.subscriptions.map( s => {
                        try{
                            return JSON.parse(s);
                        }catch(error){
                            console.log(error);
                            return {name: s, type: ""};
                        }
                    });
                    setLocalData({...service, subscriptions: newSubs});
                }catch(error){

                }
                break;
            default:
        }
    }, [service]);
    const renderDeleteButton = (w) => (
        <MythicStyledTooltip title={w.deleted ? "Restore service" : "Remove service"}>
            <IconButton
                className={`mythic-table-row-icon-action ${w.deleted ? "mythic-table-row-icon-action-success" : "mythic-table-row-icon-action-hover-danger"}`}
                onClick={() => adjustingDelete(w)}
                size="small"
            >
                {w.deleted ? <RestoreFromTrashOutlinedIcon fontSize="small" /> : <DeleteIcon fontSize="small" />}
            </IconButton>
        </MythicStyledTooltip>
    );
    const renderFileButton = (w) => (
        <MythicStyledTooltip title={w.container_running ? "View Files" : "Unable to view files since container is offline"}>
            <IconButton
                className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                disabled={!w.container_running}
                onClick={()=>{onOpenListFilesDialog(w.name);}}
                size="small"
            >
                <AttachFileIcon fontSize="small" />
            </IconButton>
        </MythicStyledTooltip>
    );
    const renderSubscriptionTestButtons = (w, events, icon, onClick, prefix) => (
        events.map(s => (
            <MythicStyledTooltip title={`${prefix} ${s}`} key={`${w.id}-${prefix}-${s}`}>
                <IconButton
                    className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                    disabled={!getSubscriptionNames(w).includes(s) || !w.container_running}
                    onClick={() => onClick(s)}
                    size="small">
                    {icon}
                </IconButton>
            </MythicStyledTooltip>
        ))
    );
    const getSubscriptionNames = (w) => {
        if(!Array.isArray(w.subscriptions)){return []}
        return w.subscriptions.map((subscription) => subscription?.name || subscription).filter(Boolean);
    };
    const renderIdentityProviderMetadata = (w) => {
        const subscriptions = Array.isArray(w.subscriptions) ? w.subscriptions : [];
        if(subscriptions.length === 0){
            return <span className="mythic-installed-service-empty-value">Not set</span>;
        }
        return (
            <span className="mythic-installed-service-action-chip-list">
                {subscriptions.map((subscription) => {
                    const providerName = subscription?.name || subscription;
                    return (
                        <MythicStyledTooltip title={w.container_running ? "Fetch container metadata" : "Container is offline"} key={`${w.name}-${providerName}`}>
                            <button
                                className="mythic-installed-service-action-chip"
                                disabled={!w.container_running}
                                onClick={() => getIDPMetadata(w.name, providerName)}
                                type="button"
                            >
                                <span>{providerName}</span>
                                <PermIdentityTwoToneIcon fontSize="small" />
                            </button>
                        </MythicStyledTooltip>
                    );
                })}
            </span>
        );
    };
    const renderBaseRow = ({w, typeLabel, metadataItems, actions, hasDetails = false}) => (
        (showDeleted || !w.deleted) &&
        <TableRow key={w.id} hover>
            <MythicTableCell>
                {renderDeleteButton(w)}
            </MythicTableCell>
            <MythicTableCell>
                <InstalledServiceIdentity
                    name={w.name}
                    typeLabel={typeLabel}
                    deleted={w.deleted}
                    status={<InstalledServiceContainerStatus isOnline={w.container_running} />}
                />
            </MythicTableCell>
            <MythicTableCell>
                <InstalledServiceMetadataSummary
                    items={metadataItems}
                    description={w.description}
                />
            </MythicTableCell>
            <MythicTableCell>
                <div className="mythic-table-row-actions mythic-service-actions">
                    {renderFileButton(w)}
                    {actions}
                    {hasDetails &&
                        <InstalledServiceDetailToggle open={openDetails} onClick={() => setOpenDetails((current) => !current)} />
                    }
                </div>
            </MythicTableCell>
        </TableRow>
    );
    const getTableRow = (w) => {
        switch(service.type){
            case "webhook":
                return renderBaseRow({
                    w,
                    typeLabel: "Webhook",
                    metadataItems: [
                        {label: "Type", value: w.type},
                        {label: "Version", value: w.semver, chip: true},
                        {label: "Subscriptions", value: getSubscriptionNames(w)},
                    ],
                    actions: renderSubscriptionTestButtons(w, webhook_events, <PublicIcon fontSize="small" />, issueTestWebhook, "test webhook"),
                });
            case "logging":
                return renderBaseRow({
                    w,
                    typeLabel: "Logger",
                    metadataItems: [
                        {label: "Type", value: w.type},
                        {label: "Version", value: w.semver, chip: true},
                        {label: "Subscriptions", value: getSubscriptionNames(w)},
                    ],
                    actions: renderSubscriptionTestButtons(w, logging_events, <SyncAltIcon fontSize="small" />, issueTestLog, "test logging"),
                });
            case "eventing":
                return renderBaseRow({
                    w,
                    typeLabel: "Eventing",
                    metadataItems: [
                        {label: "Type", value: w.type},
                        {label: "Version", value: w.semver, chip: true},
                        {label: "Functions", value: getSubscriptionNames(w)},
                    ],
                    hasDetails: true,
                });
            case "auth":
                return renderBaseRow({
                    w,
                    typeLabel: "Auth",
                    metadataItems: [
                        {label: "Type", value: w.type},
                        {label: "Version", value: w.semver, chip: true},
                        {label: "Identity Providers", value: getSubscriptionNames(w), render: renderIdentityProviderMetadata(w)},
                    ],
                });
            default:
                return null;
        }
    }
    const getDetailContent = (w) => {
        switch(service.type){
            case "eventing":
                return (
                    <InstalledServiceDetailSection title="Eventing functions" count={(w.subscriptions || []).length}>
                        <InstalledServiceDefinitionList
                            items={(w.subscriptions || []).map((subscription) => ({
                                title: subscription.name,
                                description: subscription.description,
                            }))}
                            emptyText="No eventing functions registered."
                        />
                    </InstalledServiceDetailSection>
                );
            case "auth":
                return null;
            default:
                return null;
        }
    };
    if(localData.deleted && !showDeleted){
        return null;
    }
    const detailContent = getDetailContent(localData);
    return (
        <>
            {getTableRow(localData)}
            {detailContent &&
                <InstalledServiceDetailRow open={openDetails} colSpan={4}>
                    {detailContent}
                </InstalledServiceDetailRow>
            }
            {openDelete &&
                <MythicConfirmDialog onClose={() => { setOpenDeleteDialog(false); }}
                                     onSubmit={onAcceptDelete}
                                     open={openDelete}
                                     acceptText={deletingContainer.current.deleted ? "Restore" : "Remove"}
                                     acceptColor={deletingContainer.current.deleted ? "success" : "error"}/>
            }
            {openListFilesDialog &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openListFilesDialog}
                              onClose={()=>{setOpenListFilesDialog(false);}}
                              innerDialog={<C2ProfileListFilesDialog container_name={openListFilesInformation.current}
                                                                     onClose={()=>{setOpenListFilesDialog(false);}} />}
                />
            }
            {openIDPMetadata &&
                <MythicDialog fullWidth={true} maxWidth="lg" open={openIDPMetadata}
                              onClose={()=>{setOpenIDPMetadata(false);}}
                              innerDialog={<ConsumingServicesGetIDPMetadataDialog
                                  container={IDPMetadataRef.current.container}
                                  idp={IDPMetadataRef.current.idp}
                                  onClose={()=>{setOpenIDPMetadata(false);}} />}
                />
            }
        </>

    )
}
