import React from 'react';
import {useLazyQuery} from '@apollo/client';
import {Box, Button, DialogActions, DialogContent, DialogTitle, Typography} from '@mui/material';
import {MythicDialog} from '../../MythicComponents/MythicDialog';
import {
    CredentialReferenceFieldDialog,
    CredentialReferencePickerDialog,
    CredentialReferenceToken,
    credentialReferenceByIdsQuery,
    formatCredentialReference,
    getCredentialTaskReferenceCaretContext,
    getCredentialTaskReferenceReviewLabel,
    getCredentialTaskReferenceReviewValue,
    getUnavailableCredentialReferences,
    isCredentialReference,
    parseCredentialReferences,
    parseExactCredentialReference,
    uniqueCredentialReferenceIDs,
} from './taskingReferencesCredential';
import {
    LinkReferencePickerDialog,
    LinkReferenceToken,
    buildLinkReferenceDisplayContext,
    emptyLinkReferenceDisplayContext,
    getLinkTaskReferenceReviewLabel,
    getLinkTaskReferenceReviewValue,
    getLinkReferenceLookupVariables,
    hasLinkReferenceLookupVariables,
    isLinkReference,
    linkReferenceDisplayQuery,
    linkReferenceLookupVariablesKey,
    parseLinkReferences,
} from './taskingReferencesLink';

export {
    CredentialReferenceFieldDialog,
    CredentialReferencePickerDialog,
    LinkReferencePickerDialog,
    formatCredentialReference,
    parseExactCredentialReference,
};

const taskReferenceProviders = [
    {
        keyword: "cred",
        parseReferences: parseCredentialReferences,
        isReference: isCredentialReference,
        getReviewLabel: getCredentialTaskReferenceReviewLabel,
        getReviewValue: (reference, context) => getCredentialTaskReferenceReviewValue(reference, context.credentialsByID[Number(reference.selector)]),
        renderToken: (reference, context) => <CredentialReferenceToken reference={reference} credential={context.credentialsByID[Number(reference.selector)]} />,
    },
    {
        keyword: "link",
        parseReferences: parseLinkReferences,
        isReference: isLinkReference,
        getReviewLabel: getLinkTaskReferenceReviewLabel,
        getReviewValue: getLinkTaskReferenceReviewValue,
        renderToken: (reference, context) => <LinkReferenceToken reference={reference} linkReferences={context.linkReferences} />,
    },
];

const taskReferenceProviderForReference = (reference) => {
    return taskReferenceProviders.find((provider) => provider.isReference(reference));
}

export const parseTaskReferences = (value) => {
    const text = String(value || "");
    return taskReferenceProviders
        .flatMap((provider) => provider.parseReferences(text))
        .sort((a, b) => a.index - b.index || b.raw.length - a.raw.length);
}

export const getTaskReferenceCaretContext = (text, cursorPosition) => {
    return getCredentialTaskReferenceCaretContext(text, cursorPosition);
}

export const replaceTextRange = (text, start, end, replacement) => {
    return `${String(text || "").slice(0, start)}${replacement}${String(text || "").slice(end)}`;
}

const taskReferenceVariablesKey = "selected_task_references";

const splitTaskReferenceVariables = (variables) => {
    const {[taskReferenceVariablesKey]: selectedTaskReferences, ...taskVariables} = variables || {};
    return {
        taskVariables,
        selectedTaskReferences: Array.isArray(selectedTaskReferences) ? selectedTaskReferences : [],
    };
}

const selectedTaskReferencesCoverAll = (references, selectedTaskReferences) => {
    if(references.length === 0){
        return false;
    }
    const selectedCounts = selectedTaskReferences.reduce((previous, reference) => {
        previous[reference] = (previous[reference] || 0) + 1;
        return previous;
    }, {});
    for(const reference of references){
        const count = selectedCounts[reference.raw] || 0;
        if(count <= 0){
            return false;
        }
        selectedCounts[reference.raw] = count - 1;
    }
    return true;
}

const emptyTaskReferenceContext = () => ({
    credentialsByID: {},
    linkReferences: emptyLinkReferenceDisplayContext(),
});

const useTaskReferenceLookupContext = (references, options={}) => {
    const credentialFetchPolicy = options.credentialFetchPolicy || "cache-first";
    const credentialIDs = React.useMemo(() => uniqueCredentialReferenceIDs(references), [references]);
    const credentialIDKey = credentialIDs.join(",");
    const [getCredentials, credentialQuery] = useLazyQuery(credentialReferenceByIdsQuery, {fetchPolicy: credentialFetchPolicy});
    const linkReferenceVariables = React.useMemo(() => getLinkReferenceLookupVariables(references), [references]);
    const linkLookupKey = React.useMemo(() => linkReferenceLookupVariablesKey(linkReferenceVariables), [linkReferenceVariables]);
    const [getLinkReferences, linkReferenceQuery] = useLazyQuery(linkReferenceDisplayQuery, {fetchPolicy: "cache-first"});

    // Provider-specific lookups stay batched here so token rendering can remain generic and Apollo can cache by variables.
    React.useEffect(() => {
        if(credentialIDs.length > 0){
            getCredentials({variables: {ids: credentialIDs}});
        }
    }, [credentialIDKey, credentialIDs, getCredentials]);

    React.useEffect(() => {
        if(hasLinkReferenceLookupVariables(linkReferenceVariables)){
            getLinkReferences({variables: linkReferenceVariables});
        }
    }, [getLinkReferences, linkReferenceVariables, linkLookupKey]);

    const credentialsByID = React.useMemo(() => {
        return (credentialQuery.data?.credential || []).reduce((previous, credential) => {
            previous[credential.id] = credential;
            return previous;
        }, {});
    }, [credentialQuery.data]);

    const linkReferences = React.useMemo(() => {
        return buildLinkReferenceDisplayContext(linkReferenceQuery.data);
    }, [linkReferenceQuery.data]);

    return {
        context: {credentialsByID, linkReferences},
        credentialsLoading: credentialQuery.loading || (credentialIDs.length > 0 && !credentialQuery.called),
    };
}

export function useTaskReferenceSubmitter(createTask) {
    const [pendingVariables, setPendingVariables] = React.useState(null);
    const [pendingReferences, setPendingReferences] = React.useState([]);
    const pendingReviewCancel = React.useRef(null);
    const pendingSelectedTaskReferences = React.useRef([]);
    const {
        context: taskReferenceContext,
        credentialsLoading,
    } = useTaskReferenceLookupContext(pendingReferences, {credentialFetchPolicy: "no-cache"});
    const submitTask = React.useCallback((options) => {
        const {onTaskReferenceReviewCancel, ...taskOptions} = options || {};
        const variables = options?.variables || {};
        const {taskVariables, selectedTaskReferences} = splitTaskReferenceVariables(variables);
        const references = parseTaskReferences(taskVariables.params || "");
        if(taskVariables.resolve_task_references === false || references.length === 0){
            createTask({...taskOptions, variables: taskVariables});
            return;
        }
        if(taskVariables.resolve_task_references === true || selectedTaskReferencesCoverAll(references, selectedTaskReferences)){
            createTask({...taskOptions, variables: {...taskVariables, resolve_task_references: true}});
            return;
        }
        pendingReviewCancel.current = onTaskReferenceReviewCancel || null;
        pendingSelectedTaskReferences.current = selectedTaskReferences;
        setPendingVariables(taskVariables);
        setPendingReferences(references);
    }, [createTask]);
    const closeDialog = React.useCallback(() => {
        setPendingVariables(null);
        setPendingReferences([]);
        pendingReviewCancel.current = null;
        pendingSelectedTaskReferences.current = [];
    }, []);
    const cancelSubmit = React.useCallback(() => {
        const pendingCancel = pendingReviewCancel.current;
        const variables = pendingSelectedTaskReferences.current.length > 0 ?
            {...(pendingVariables || {}), [taskReferenceVariablesKey]: pendingSelectedTaskReferences.current} :
            pendingVariables;
        closeDialog();
        if(pendingCancel && variables){
            pendingCancel(variables);
        }
    }, [closeDialog, pendingVariables]);
    const confirmSubmit = React.useCallback((resolveReferences) => {
        if(!pendingVariables){
            return;
        }
        createTask({variables: {...pendingVariables, resolve_task_references: resolveReferences}});
        closeDialog();
    }, [closeDialog, createTask, pendingVariables]);
    const dialog = pendingVariables ? (
        <MythicDialog fullWidth={true} maxWidth="md" open={pendingVariables !== null}
                      onClose={cancelSubmit}
                      innerDialog={<TaskReferenceConfirmationDialog
                          variables={pendingVariables}
                          references={pendingReferences}
                          taskReferenceContext={taskReferenceContext}
                          loadingCredentials={credentialsLoading}
                          onClose={cancelSubmit}
                          onSubmit={confirmSubmit}
                      />}
        />
    ) : null;
    return {submitTask, dialog};
}

export function TaskReferenceDisplay({text}) {
    const references = React.useMemo(() => parseTaskReferences(text), [text]);
    const {context: taskReferenceContext} = useTaskReferenceLookupContext(references);

    if(references.length === 0){
        return <>{text}</>;
    }

    return <span className="mythic-reference-display">{renderTaskReferenceText(text, references, taskReferenceContext)}</span>;
}

function TaskReferenceInlinePreview({text, taskReferenceContext}) {
    const previewReferences = parseTaskReferences(text);
    if(previewReferences.length === 0){
        return <>{text}</>;
    }
    return <>{renderTaskReferenceText(text, previewReferences, taskReferenceContext || emptyTaskReferenceContext())}</>;
}

const renderTaskReferenceText = (text, references, context) => {
    const parts = [];
    let lastIndex = 0;
    references.forEach((reference, index) => {
        if(reference.index > lastIndex){
            parts.push(<span key={`text-${index}`}>{String(text || "").slice(lastIndex, reference.index)}</span>);
        }
        parts.push(<TaskReferenceToken key={`reference-${index}`} reference={reference} context={context} />);
        lastIndex = reference.index + reference.raw.length;
    });
    if(lastIndex < String(text || "").length){
        parts.push(<span key="text-tail">{String(text || "").slice(lastIndex)}</span>);
    }
    return parts;
}

const formatTaskReferencePreviewParams = (params) => {
    try{
        return JSON.stringify(JSON.parse(params), null, 2);
    }catch(error){
        return params || "";
    }
}

const getTaskReferenceReviewLabel = (reference) => {
    const provider = taskReferenceProviderForReference(reference);
    return provider ? provider.getReviewLabel(reference) : reference.keyword;
}

const getTaskReferenceReviewValue = (reference, context) => {
    const provider = taskReferenceProviderForReference(reference);
    return provider ? provider.getReviewValue(reference, context) : "Unsupported reference";
}

function TaskReferenceConfirmationDialog({variables, references, taskReferenceContext, loadingCredentials, onClose, onSubmit}) {
    const referenceContext = taskReferenceContext || emptyTaskReferenceContext();
    const previewParams = formatTaskReferencePreviewParams(variables?.params || "");
    const unavailableReferences = getUnavailableCredentialReferences(references, referenceContext.credentialsByID);
    const resolveDisabled = loadingCredentials || unavailableReferences.length > 0;
    const showUnavailableMessage = !loadingCredentials && unavailableReferences.length > 0;
    return (
        <>
            <DialogTitle>Review Task References</DialogTitle>
            <DialogContent dividers>
                <Box className="mythic-tasking-reference-review-context">
                    <Typography component="div" className="mythic-tasking-reference-review-command">
                        {variables?.command || "Task"} parameters
                    </Typography>
                    <Box component="pre" className="mythic-tasking-reference-review-preview">
                        <TaskReferenceInlinePreview text={previewParams} taskReferenceContext={referenceContext} />
                    </Box>
                </Box>
                <Box className="mythic-tasking-reference-review-list">
                    {references.map((reference, index) => {
                        const resolvedValue = loadingCredentials && isCredentialReference(reference) && !referenceContext.credentialsByID[Number(reference.selector)] ?
                            "Loading" :
                            getTaskReferenceReviewValue(reference, referenceContext);
                        return (
                            <Box key={`${reference.raw}-${index}`} className="mythic-tasking-reference-review-row">
                                <Box className="mythic-tasking-reference-review-row-header">
                                    <TaskReferenceToken reference={reference} context={referenceContext} />
                                    <Box className="mythic-tasking-reference-review-row-meta">
                                        <Typography component="span" className="mythic-tasking-reference-review-label">
                                            {getTaskReferenceReviewLabel(reference)}
                                        </Typography>
                                        <Typography component="span" className="mythic-tasking-reference-review-raw">
                                            {reference.raw}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Typography component="span" className="mythic-tasking-reference-review-value" title={resolvedValue}>
                                    {resolvedValue}
                                </Typography>
                            </Box>
                        )
                    })}
                </Box>
                {showUnavailableMessage &&
                    <Typography component="div" color="error" className="mythic-tasking-reference-review-raw">
                        One or more credential references are unavailable or deleted.
                    </Typography>
                }
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="outlined" onClick={() => onSubmit(false)}>Send Literal</Button>
                <Button variant="contained" color="success" disabled={resolveDisabled} onClick={() => onSubmit(true)}>Resolve References</Button>
            </DialogActions>
        </>
    )
}

export function TaskReferenceToken({reference, context}) {
    const provider = taskReferenceProviderForReference(reference);
    if(provider){
        return provider.renderToken(reference, context || {credentialsByID: {}});
    }
    return <span className="mythic-reference-token mythic-reference-token-warning">{reference.raw}</span>;
}
