import React from 'react';
import {Link, Typography} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import { gql, useMutation } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCopy} from '@fortawesome/free-solid-svg-icons';
import {TagsDisplay, ViewEditTags} from '../../MythicComponents/MythicTag';
import {MythicChip} from '../../MythicComponents/MythicChip';
import Split from 'react-split';
import {CredentialTableNewCredentialDialog} from './CredentialTableNewCredentialDialog';
import {
    compactMetadataValue,
    CredentialDetail,
    CredentialInspectorSection,
    CredentialMetadataPair,
    getCredentialValidityChips,
    parseCredentialMetadata,
} from './CredentialDisplayComponents';
import {
    CredentialKerberosDisplay,
    credentialKerberosIdentityKeys,
    credentialKerberosMetadataKeys,
} from './CredentialKerberosDisplay';
import {
    CredentialJWTDisplay,
    credentialJWTIdentityKeys,
    credentialJWTMetadataKeys,
} from './CredentialJWTDisplay';
import {MythicActionButton} from "../../MythicComponents/MythicActionButton";

export {compactMetadataValue, getCredentialValidityChips, parseCredentialMetadata} from './CredentialDisplayComponents';

export const credentialSearchDataFragment = gql`
fragment credentialSearchData on credential{
    account
    comment
    credential_text
    id
    realm
    type
    subtype
    metadata
    credential_identity
    custom_display
    task {
        display_id
        id
        callback {
            id
            host
            display_id
            mythictree_groups
        }
    }
    timestamp
    deleted
    operator {
        username
    }
    tags {
        tagtype {
            name
            color
            id
        }
        id
    }
}
`;

export const getCredentialSourceLabel = (credential) => {
    if(credential?.task){
        return `C-${credential.task.callback?.display_id || "?"} / T-${credential.task.display_id || "?"}`;
    }
    return credential?.operator?.username || "manual";
}

const credentialSearchSplitStorageKey = "credentialSearchSplitSizes";
const defaultCredentialSearchSplitSizes = [60, 40];

const getStoredCredentialSearchSplitSizes = () => {
    try {
        const storedValue = localStorage.getItem(credentialSearchSplitStorageKey);
        const parsedValue = JSON.parse(storedValue);
        if(Array.isArray(parsedValue) &&
            parsedValue.length === 2 &&
            parsedValue.every((value) => Number.isFinite(value) && value > 10 && value < 90)){
            return parsedValue;
        }
    } catch(error) {
        console.log("failed to parse credential search split sizes");
    }
    return defaultCredentialSearchSplitSizes;
}

const metadataSystemKeys = new Set([
    "not_before", "expires_at", "renew_until", "parsed_at", "parser",
    "parser_warnings", "validity"
]);

const credentialParserDisplays = {
    kerberos: {
        Display: CredentialKerberosDisplay,
        metadataKeys: credentialKerberosMetadataKeys,
        identityKeys: credentialKerberosIdentityKeys,
    },
    jwt: {
        Display: CredentialJWTDisplay,
        metadataKeys: credentialJWTMetadataKeys,
        identityKeys: credentialJWTIdentityKeys,
    },
};

const getCredentialParserDisplay = (parserName) => {
    return credentialParserDisplays[String(parserName || "").toLowerCase().trim()];
}

export const updateCredentialDeleted = gql`
mutation updateCredentialDeletedMutation($credential_id: Int!, $deleted: Boolean!){
    updateCredential(input: {credential_id: $credential_id, deleted: $deleted}) {
        status
        error
        id
        account
        realm
        credential_text
        comment
        credential_type
        credential_subtype
        metadata
        credential_identity
        custom_display
        deleted
        operator_username
    }
}
`;

export const updateCredentialMutation = gql`
mutation updateCredentialMutation($input: updateCredentialInput!){
    updateCredential(input: $input) {
        status
        error
        id
        account
        realm
        credential_text
        comment
        credential_type
        credential_subtype
        metadata
        credential_identity
        custom_display
        deleted
        operator_username
    }
}
`;

export const normalizeCredentialUpdateOutput = (updatedCredential) => ({
    id: updatedCredential.id,
    account: updatedCredential.account,
    realm: updatedCredential.realm,
    credential_text: updatedCredential.credential_text,
    comment: updatedCredential.comment,
    type: updatedCredential.credential_type,
    subtype: updatedCredential.credential_subtype,
    metadata: updatedCredential.metadata,
    credential_identity: updatedCredential.credential_identity,
    custom_display: updatedCredential.custom_display,
    deleted: updatedCredential.deleted,
    operator: {username: updatedCredential.operator_username},
});

export function CredentialTable(props){
    const [credentials, setCredentials] = React.useState([]);
    const [selectedCredentialID, setSelectedCredentialID] = React.useState(null);
    const [credentialSearchSplitSizes, setCredentialSearchSplitSizes] = React.useState(getStoredCredentialSearchSplitSizes);

    React.useEffect( () => {
        const nextCredentials = [...props.credentials];
        setCredentials(nextCredentials);
        setSelectedCredentialID((currentSelectedID) => {
            if(nextCredentials.length === 0){
                return null;
            }
            if(currentSelectedID !== null && nextCredentials.some((credential) => credential.id === currentSelectedID)){
                return currentSelectedID;
            }
            return nextCredentials[0].id;
        });
    }, [props.credentials]);

    const updateCredentialInState = (id, updates) => {
        setCredentials((currentCredentials) => currentCredentials.map((cred) => {
            if(cred.id === id){
                return {...cred, ...updates};
            }
            return {...cred};
        }));
    }
    const onEditCredential = (updatedCredential) => {
        updateCredentialInState(updatedCredential.id, updatedCredential);
    }
    const onCredentialSearchSplitDragEnd = React.useCallback((sizes) => {
        setCredentialSearchSplitSizes(sizes);
        localStorage.setItem(credentialSearchSplitStorageKey, JSON.stringify(sizes));
    }, []);
    const selectedCredential = credentials.find((credential) => credential.id === selectedCredentialID) || null;

    return (
        <Split
            direction="horizontal"
            className="mythic-credential-search"
            sizes={credentialSearchSplitSizes}
            minSize={[420, 360]}
            gutterSize={8}
            snapOffset={0}
            onDragEnd={onCredentialSearchSplitDragEnd}>
            <div className="mythic-credential-search-results">
                <TableContainer className="mythic-credential-search-table-wrap">
                    <Table stickyHeader size="small" className="mythic-credential-search-table">
                        <TableHead>
                            <TableRow>
                                <TableCell style={{width: "5rem"}}>ID</TableCell>
                                <TableCell>Account / Realm</TableCell>
                                <TableCell style={{maxWidth: "7rem"}}>Type</TableCell>
                                <TableCell style={{maxWidth: "10rem"}}>Validity</TableCell>
                                <TableCell style={{maxWidth: "9rem"}}>Source</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {credentials.map((credential) => (
                                <CredentialSearchRow
                                    key={"cred" + credential.id}
                                    credential={credential}
                                    selected={selectedCredentialID === credential.id}
                                    onSelect={() => {
                                        setSelectedCredentialID(credential.id);
                                        if(props.onSelectCredential){
                                            props.onSelectCredential(credential);
                                        }
                                    }}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
            <CredentialInspector
                credential={selectedCredential}
                me={props.me}
                onEditCredential={onEditCredential}
                readOnly={props.readOnly}
            />
        </Split>
    )
}

export function CredentialSearchRow({credential, selected, onSelect}){
    const validityChips = getCredentialValidityChips(credential.metadata);
    const sourceLabel = getCredentialSourceLabel(credential);
    const accountRealm = `${credential.account || "-"}${credential.realm ? `@${credential.realm}` : ""}`;
    const primaryLabel = credential.custom_display || credential.account || "-";
    const secondaryLabel = credential.custom_display ? accountRealm : (credential.realm || "-");

    return (
        <TableRow
            hover
            selected={selected}
            className={`mythic-credential-search-row ${selected ? "mythic-credential-search-row-selected" : ""}`}
            onClick={onSelect}>
            <TableCell>
                <div className="mythic-credential-search-id-cell">
                    <span className="mythic-credential-search-id">#{credential.id}</span>
                    {credential.deleted &&
                        <MythicChip size="small" color="warning" variant="outlined" label="deleted" className="mythic-credential-search-mini-chip" />
                    }
                </div>
            </TableCell>
            <TableCell>
                <div className="mythic-credential-search-primary-cell">
                    <span title={primaryLabel}>{primaryLabel}</span>
                    <span title={secondaryLabel}>{secondaryLabel}</span>
                </div>
            </TableCell>
            <TableCell>
                <MythicChip size="small" variant="outlined" label={credential.type || "unknown"} className="mythic-credential-search-type-chip" />
                {credential.subtype !== "" &&
                    <MythicChip size="small" variant="outlined" label={credential.subtype} className="mythic-credential-search-type-chip" />
                }
            </TableCell>
            <TableCell>
                <div className="mythic-credential-search-chip-list">
                    {validityChips.length > 0 ? (
                        validityChips.slice(0, 2).map((chip) => (
                            <MythicChip key={chip.label} size="small" color={chip.color} variant="outlined" label={chip.label} className="mythic-credential-search-mini-chip" />
                        ))
                    ) : (
                        <span className="mythic-credential-search-muted">-</span>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <span className="mythic-credential-search-source" title={sourceLabel}>{sourceLabel}</span>
            </TableCell>
        </TableRow>
    )
}

export function CredentialInspector(props){
    const credential = props.credential;
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [editCredentialDialogOpen, setEditCredentialDialogOpen] = React.useState(false);

    const [updateCredential] = useMutation(updateCredentialMutation, {
        onCompleted: (data) => {
            if(data.updateCredential.status === "success"){
                snackActions.success("updated credential");
                if(props.onEditCredential){ props.onEditCredential(normalizeCredentialUpdateOutput(data.updateCredential)); }
            }else{
                snackActions.error(data.updateCredential.error);
            }
        },
        onError: () => {
            snackActions.error("failed to update credential");
        }
    });
    const [updateDeleted] = useMutation(updateCredentialDeleted, {
        onCompleted: (data) => {
            if(data.updateCredential.status === "success"){
                snackActions.success("updated deleted status");
                if(props.onEditCredential){ props.onEditCredential(normalizeCredentialUpdateOutput(data.updateCredential)); }
            }else{
                snackActions.error(data.updateCredential.error);
            }
        },
        onError: () => {
            snackActions.error("failed to update credential");
        }
    });

    React.useEffect(() => {
        setOpenDeleteDialog(false);
        setEditCredentialDialogOpen(false);
    }, [credential?.id]);

    if(credential === null){
        return (
            <aside className="mythic-credential-search-inspector mythic-credential-search-inspector-empty">
                <VpnKeyIcon fontSize="small" />
                <Typography variant="body2">No credential selected</Typography>
            </aside>
        )
    }

    const parsedMetadata = parseCredentialMetadata(credential.metadata);
    const validity = parsedMetadata.validity || {};
    const validityChips = getCredentialValidityChips(credential.metadata);
    const parsedIdentity = parseCredentialMetadata(credential.credential_identity);
    const parserDisplayConfig = getCredentialParserDisplay(parsedMetadata.parser);
    const ParserDisplay = parserDisplayConfig?.Display;
    const parserMetadataKeys = parserDisplayConfig?.metadataKeys || new Set();
    const parserIdentityKeys = parserDisplayConfig?.identityKeys || new Set();
    const warningValues = Array.isArray(parsedMetadata.parser_warnings) ? parsedMetadata.parser_warnings : [];
    const parserMetadataEntries = [];
    if(parsedMetadata.parser){
        parserMetadataEntries.push(["parser", parsedMetadata.parser]);
    }
    const showParserMetadataSection = !ParserDisplay && (parserMetadataEntries.length > 0 || validityChips.length > 0 || warningValues.length > 0);
    const pureMetadataEntries = Object.entries(parsedMetadata)
        .filter(([key, value]) => !metadataSystemKeys.has(key) && !parserMetadataKeys.has(key) && value !== undefined && value !== null);
    const pureMetadata = Object.fromEntries(pureMetadataEntries);
    const pureIdentityEntries = Object.entries(parsedIdentity)
        .filter(([key, value]) => !parserIdentityKeys.has(key) && value !== undefined && value !== null);
    const pureIdentity = Object.fromEntries(pureIdentityEntries);

    const onCopyToClipboard = (data) => {
        let result = copyStringToClipboard(data);
        if(result){
            snackActions.success("Copied text!");
        }else{
            snackActions.error("Failed to copy text");
        }
    }
    const onSubmitUpdatedCredential = ({type, subtype, account, realm, comment, credential: credentialValue, metadata, custom_display}) => {
        updateCredential({variables: {
            input: {
                credential_id: credential.id,
                credential_type: type,
                credential_subtype: subtype,
                account,
                realm,
                comment,
                credential: credentialValue,
                metadata,
                custom_display,
            }
        }})
    }
    const onAcceptDelete = () => {
        updateDeleted({variables: {credential_id: credential.id, deleted: !credential.deleted}})
    }

    return (
        <aside className="mythic-credential-search-inspector">
            {openDeleteDialog &&
                <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDeleteDialog} acceptText={credential.deleted ? "Restore" : "Remove" }/>
            }
            {editCredentialDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="md" open={editCredentialDialogOpen}
                    onClose={()=>{setEditCredentialDialogOpen(false);}}
                    innerDialog={<CredentialTableNewCredentialDialog title="Edit Credential" submitText="Update" initialValues={credential} onSubmit={onSubmitUpdatedCredential} onClose={()=>{setEditCredentialDialogOpen(false);}} />}
                />
            }
            <div className="mythic-credential-search-inspector-header">
                <div className="mythic-credential-search-inspector-title">
                    <VpnKeyIcon fontSize="small" />
                    <span title={`Credential ${credential.id}`}>Credential {credential.id}</span>
                    <MythicChip size="small" variant="outlined" label={"type: " + credential.type} className="mythic-credential-search-mini-chip" />
                    {credential.subtype !== "" &&
                        <MythicChip size="small" variant="outlined" label={"subtype: " + credential.subtype} className="mythic-credential-search-mini-chip" />
                    }
                    {credential.deleted &&
                        <MythicChip size="small" color="warning" variant="outlined" label="deleted" className="mythic-credential-search-mini-chip" />
                    }
                </div>
                {!props.readOnly &&
                <div className="mythic-credential-search-inspector-actions">
                    <MythicActionButton icon={<EditIcon />} label="Edit" onClick={() => setEditCredentialDialogOpen(true)} />
                    {credential.deleted ? (
                        <MythicActionButton appearance="raised" colorMode="always" icon={<RestoreFromTrashIcon />} iconOnly onClick={()=>{setOpenDeleteDialog(true);}} tone="success" tooltip="Restore Credential for use in Tasking" />
                    ) : (
                        <MythicActionButton appearance="raised" icon={<DeleteIcon />} iconOnly onClick={()=>{setOpenDeleteDialog(true);}} tone="error" tooltip="Delete Credential so it can't be used in Tasking" />
                    )}
                </div>
                }
            </div>
            <div className="mythic-credential-search-inspector-body">
                <CredentialInspectorSection title="Credential Fields">
                    <CredentialDetail label="Account" value={credential.account} emphasis />
                    <CredentialDetail
                        label="Tasking ID"
                        value={credential.id}
                        code
                        action={
                            <MythicActionButton appearance="raised" colorMode="always" compact icon={<FontAwesomeIcon icon={faCopy}/>} iconOnly onClick={() => onCopyToClipboard(String(credential.id))} tone="info" tooltip="Copy credential ID for tasking" />
                        }
                    />
                    <CredentialDetail label="Realm" value={credential.realm} emphasis />
                    <CredentialDetail label="Custom Display" value={credential.custom_display} wide />
                </CredentialInspectorSection>
                {ParserDisplay &&
                    <ParserDisplay
                        credential={credential}
                        metadata={parsedMetadata}
                        identity={parsedIdentity}
                        validity={validity}
                        validityChips={validityChips}
                    />
                }
                {showParserMetadataSection &&
                    <CredentialInspectorSection title="Parser Metadata" >
                        {parserMetadataEntries.map(([key, value]) => (
                            <MythicChip key={key} size="small" variant="outlined" label={`${key}: ${value}`} />
                        ))}
                        {validityChips.map((chip) => (
                            <MythicChip key={chip.label} size="small" color={chip.color} variant="outlined" label={chip.label} />
                        ))}
                        {warningValues.length > 0 &&
                            <div className="mythic-credential-search-warning-list">
                                {warningValues.map((warning, index) => (
                                    <MythicChip key={`warning-${index}`} size="small" color="warning" variant="outlined" label={compactMetadataValue(warning)} className="mythic-credential-search-warning-chip" />
                                ))}
                            </div>
                        }
                    </CredentialInspectorSection>
                }
                {pureMetadataEntries.length > 0 &&
                    <CredentialInspectorSection
                        title="Metadata"
                        tone="metadata"
                        actions={
                            <MythicActionButton appearance="raised" colorMode="always" icon={<FontAwesomeIcon icon={faCopy}/>} iconOnly onClick={() => onCopyToClipboard(JSON.stringify(pureMetadata, null, 2))} tone="info" tooltip="Copy metadata JSON" />
                        }>
                        <div className="mythic-credential-search-metadata-grid mythic-credential-search-metadata-grid-metadata">
                            {pureMetadataEntries.map(([key, value]) => (
                                <CredentialMetadataPair key={key} name={key} value={value}  />
                            ))}
                        </div>
                    </CredentialInspectorSection>
                }
                {pureIdentityEntries.length > 0 &&
                    <CredentialInspectorSection
                        title="Parsed Identity"
                        tone="identity"
                        actions={
                            <MythicActionButton appearance="raised" colorMode="always" icon={<FontAwesomeIcon icon={faCopy}/>} iconOnly onClick={() => onCopyToClipboard(JSON.stringify(pureIdentity, null, 2))} tone="info" tooltip="Copy identity JSON" />
                        }>
                        <div className="mythic-credential-search-metadata-grid mythic-credential-search-metadata-grid-identity">
                            {pureIdentityEntries.map(([key, value]) => (
                                <CredentialMetadataPair key={key} name={key} value={value} tone="identity" />
                            ))}
                        </div>
                    </CredentialInspectorSection>
                }

                <CredentialInspectorSection title="Source">
                    {credential.task ? (
                        <>
                            <CredentialDetail
                                label="Task"
                                wide
                                value={
                                    <span>
                                        <Link color="textPrimary" underline="always" target="_blank" href={"/new/callbacks/" + credential.task.callback?.display_id}>C-{credential.task.callback?.display_id || "?"}</Link>
                                        {" / "}
                                        <Link color="textPrimary" underline="always" target="_blank" href={"/new/task/" + credential.task.display_id}>T-{credential.task.display_id || "?"}</Link>
                                    </span>
                                }
                            />
                            <CredentialDetail label="Host" value={credential.task.callback?.host} />
                            <CredentialDetail label="Groups" value={(credential.task.callback?.mythictree_groups || []).join(", ")} wide />
                        </>
                    ) : (
                        <CredentialDetail label="Operator" value={credential.operator?.username} />
                    )}
                </CredentialInspectorSection>
                <CredentialInspectorSection title="Credential">
                    <div className="mythic-credential-search-secret-row">
                        <div className="mythic-credential-search-secret mythic-credential-search-secret-emphasis" title={credential.credential_text || ""}>
                            {credential.credential_text || "-"}
                        </div>
                        <MythicActionButton appearance="raised" colorMode="always" compact icon={<FontAwesomeIcon icon={faCopy}/>} iconOnly onClick={() => onCopyToClipboard(credential.credential_text || "")} tone="info" tooltip="Copy credential value" />
                    </div>
                </CredentialInspectorSection>
                <CredentialInspectorSection title="Comment">
                    <div className="mythic-credential-search-comment">
                        {(credential.comment || "").trim().length > 0 ? credential.comment : "No comment."}
                    </div>
                </CredentialInspectorSection>
                <CredentialInspectorSection title="Tags">
                    <div className="mythic-credential-search-tags">
                        <ViewEditTags
                            target_object={"credential_id"}
                            target_object_id={credential?.id || 0}
                            me={props.me}/>
                        <TagsDisplay tags={credential.tags || []}/>
                    </div>
                </CredentialInspectorSection>
            </div>
        </aside>
    )
}
