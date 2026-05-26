import React from 'react';
import {gql, useLazyQuery, useMutation, useQuery, useSubscription} from '@apollo/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {alpha, useTheme} from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import CampaignTwoToneIcon from '@mui/icons-material/CampaignTwoTone';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ForumTwoToneIcon from '@mui/icons-material/ForumTwoTone';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import SmartToyTwoToneIcon from '@mui/icons-material/SmartToyTwoTone';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {MythicPageBody} from "../../MythicComponents/MythicPageBody";
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicConfirmDialog} from "../../MythicComponents/MythicConfirmDialog";
import {MeContext} from "../../App";
import {snackActions} from "../../utilities/Snackbar";
import {getSkewedNow} from "../../utilities/Time";
import {EventStepUserInteractionDialog} from "../Eventing/EventStepRender";

const CHAT_MESSAGE_LIMIT = 250;
const CHAT_REQUEST_LIMIT = 50;

const CHAT_CHANNEL_FIELDS = gql`
fragment ChatChannelFields on chat_channel {
    id
    name
    slug
    description
    channel_type
    archived
    locked
    locked_by
    last_message_id
    chat_container_id
    chat_model
    ai_metadata
    updated_at
    chat_container {
      id
      name
      container_running
      deleted
    }
    locked_operator {
      username
    }
}
`;

const CHAT_CONTAINER_FIELDS = gql`
fragment ChatContainerFields on consuming_container {
    id
    name
    description
    container_running
    deleted
    subscriptions
    updated_at
}
`;

const CHAT_MESSAGE_FIELDS = gql`
fragment ChatMessageFields on chat_message {
    id
    channel_id
    operator_id
    author_type
    sender_display_name
    message
    metadata
    edited
    deleted
    status
    created_at
    updated_at
    operator {
      username
    }
    chat_container {
      name
    }
}
`;

const CHAT_REQUEST_FIELDS = gql`
fragment ChatRequestFields on chat_request {
    id
    channel_id
    request_message_id
    response_message_id
    status
    error
    created_by
    updated_at
}
`;

const CHAT_CHANNELS_QUERY = gql`
${CHAT_CHANNEL_FIELDS}
query ChatChannels {
  chat_channel(order_by: [{archived: asc}, {channel_type: asc}, {name: asc}]) {
    ...ChatChannelFields
  }
}
`;

const CHAT_CHANNELS_STREAM_SUBSCRIPTION = gql`
${CHAT_CHANNEL_FIELDS}
subscription ChatChannelsStream($now: timestamp!) {
  chat_channel_stream(batch_size: 50, cursor: {initial_value: {updated_at: $now}, ordering: ASC}) {
    ...ChatChannelFields
  }
}
`;

const CHAT_READ_STATE_QUERY = gql`
query ChatReadState {
  chat_read_state {
    channel_id
    last_read_message_id
    updated_at
  }
}
`;

const CHAT_READ_STATE_STREAM_SUBSCRIPTION = gql`
subscription ChatReadStateStream($now: timestamp!) {
  chat_read_state_stream(batch_size: 50, cursor: {initial_value: {updated_at: $now}, ordering: ASC}) {
    channel_id
    last_read_message_id
    updated_at
  }
}
`;

const CHAT_CONTAINERS_QUERY = gql`
${CHAT_CONTAINER_FIELDS}
query ChatContainers {
  consuming_container(where: {type: {_eq: "chat"}}, order_by: {name: asc}) {
    ...ChatContainerFields
  }
}
`;

const CHAT_CONTAINERS_STREAM_SUBSCRIPTION = gql`
${CHAT_CONTAINER_FIELDS}
subscription ChatContainersStream($now: timestamptz!) {
  consuming_container_stream(batch_size: 50, cursor: {initial_value: {updated_at: $now}, ordering: ASC}, where: {type: {_eq: "chat"}}) {
    ...ChatContainerFields
  }
}
`;

const CHAT_CURRENT_OPERATOR_QUERY = gql`
query ChatCurrentOperator($operator_id: Int!, $operation_id: Int!) {
  operator_by_pk(id: $operator_id) {
    id
    admin
    username
  }
  operatoroperation(where: {operator_id: {_eq: $operator_id}, operation_id: {_eq: $operation_id}}, limit: 1) {
    id
    view_mode
  }
}
`;

const CHAT_MESSAGES_QUERY = gql`
${CHAT_MESSAGE_FIELDS}
query ChatMessages($channel_id: Int!, $limit: Int!) {
  chat_message(where: {channel_id: {_eq: $channel_id}}, order_by: {id: desc}, limit: $limit) {
    ...ChatMessageFields
  }
}
`;

const CHAT_MESSAGES_STREAM_SUBSCRIPTION = gql`
${CHAT_MESSAGE_FIELDS}
subscription ChatMessagesStream($channel_id: Int!, $now: timestamp!) {
  chat_message_stream(batch_size: 50, cursor: {initial_value: {updated_at: $now}, ordering: ASC}, where: {channel_id: {_eq: $channel_id}}) {
    ...ChatMessageFields
  }
}
`;

const CHAT_REQUESTS_QUERY = gql`
${CHAT_REQUEST_FIELDS}
query ChatRequests($channel_id: Int!, $limit: Int!) {
  chat_request(where: {channel_id: {_eq: $channel_id}}, order_by: {id: desc}, limit: $limit) {
    ...ChatRequestFields
  }
}
`;

const CHAT_REQUESTS_STREAM_SUBSCRIPTION = gql`
${CHAT_REQUEST_FIELDS}
subscription ChatRequestsStream($channel_id: Int!, $now: timestamp!) {
  chat_request_stream(batch_size: 25, cursor: {initial_value: {updated_at: $now}, ordering: ASC}, where: {channel_id: {_eq: $channel_id}}) {
    ...ChatRequestFields
  }
}
`;

const CREATE_CHANNEL = gql`
mutation CreateChatChannel($name: String!, $description: String, $channel_type: String, $chat_container_id: Int, $chat_model: String, $locked: Boolean, $ai_metadata: jsonb) {
  chatCreateChannel(name: $name, description: $description, channel_type: $channel_type, chat_container_id: $chat_container_id, chat_model: $chat_model, locked: $locked, ai_metadata: $ai_metadata) {
    status
    error
    id
    channel_id
  }
}
`;

const UPDATE_CHANNEL = gql`
mutation UpdateChatChannel($channel_id: Int!, $name: String, $description: String, $archived: Boolean, $locked: Boolean, $chat_model: String, $ai_metadata: jsonb) {
  chatUpdateChannel(channel_id: $channel_id, name: $name, description: $description, archived: $archived, locked: $locked, chat_model: $chat_model, ai_metadata: $ai_metadata) {
    status
    error
    channel_id
  }
}
`;

const CREATE_MESSAGE = gql`
mutation CreateChatMessage($channel_id: Int!, $message: String!, $system_message: Boolean = false, $all_operations: Boolean = false) {
  chatCreateMessage(channel_id: $channel_id, message: $message, system_message: $system_message, all_operations: $all_operations) {
    status
    error
    message_id
    request_id
    response_message_id
  }
}
`;

const EDIT_MESSAGE = gql`
mutation EditChatMessage($message_id: Int!, $message: String!) {
  chatEditMessage(message_id: $message_id, message: $message) {
    status
    error
    message_id
  }
}
`;

const DELETE_MESSAGE = gql`
mutation DeleteChatMessage($message_id: Int!) {
  chatDeleteMessage(message_id: $message_id) {
    status
    error
    message_id
  }
}
`;

const CANCEL_REQUEST = gql`
mutation CancelChatRequest($request_id: Int!) {
  chatCancelRequest(request_id: $request_id) {
    status
    error
    request_id
  }
}
`;

const RETRY_REQUEST = gql`
mutation RetryChatRequest($request_id: Int!) {
  chatRetryRequest(request_id: $request_id) {
    status
    error
    request_id
    message_id
    response_message_id
  }
}
`;

const MARK_READ = gql`
mutation MarkChatRead($channel_id: Int!, $last_read_message_id: Int) {
  chatMarkRead(channel_id: $channel_id, last_read_message_id: $last_read_message_id) {
    status
    error
  }
}
`;

const REFRESH_SPECIAL_MESSAGE = gql`
mutation RefreshSpecialMessage($message_id: Int!) {
  chatRefreshSpecialMessage(message_id: $message_id) {
    status
    error
    message_id
  }
}
`;

const CHAT_SEARCH = gql`
query ChatSearch($query: String!, $channel_id: Int, $limit: Int, $offset: Int) {
  chatSearch(query: $query, channel_id: $channel_id, limit: $limit, offset: $offset) {
    status
    error
    results {
      id
      channel_id
      channel_name
      channel_slug
      channel_type
      author_type
      sender_display_name
      message
      edited
      status
      created_at
      rank
    }
  }
}
`;

const allowedLinkSchemes = ["http:", "https:", "mailto:"];

const isGeneralChatChannel = (channel) => channel?.channel_type === "standard" && channel?.slug === "general";

const CHAT_SEARCH_SNIPPET_LENGTH = 260;
const CHAT_SEARCH_SNIPPET_CONTEXT = 90;
const timestampHasTimeZone = (timestampText) => /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(timestampText);
const utcWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const utcMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const padTimePart = (value) => String(value).padStart(2, "0");

const parseChatTimestamp = (timestamp) => {
    if(!timestamp){ return null; }
    if(timestamp instanceof Date){
        return Number.isNaN(timestamp.getTime()) ? null : timestamp;
    }
    if(typeof timestamp === "number"){
        const parsedNumber = new Date(timestamp);
        return Number.isNaN(parsedNumber.getTime()) ? null : parsedNumber;
    }
    const timestampText = String(timestamp).trim();
    if(timestampText === ""){ return null; }
    const normalizedTimestamp = timestampHasTimeZone(timestampText) ? timestampText : `${timestampText}Z`;
    const parsedTimestamp = new Date(normalizedTimestamp);
    return Number.isNaN(parsedTimestamp.getTime()) ? null : parsedTimestamp;
};

const formatUTCTimestamp = (date) => (
    `${utcWeekdays[date.getUTCDay()]} ${utcMonths[date.getUTCMonth()]} ${padTimePart(date.getUTCDate())} ` +
    `${date.getUTCFullYear()} ${padTimePart(date.getUTCHours())}:${padTimePart(date.getUTCMinutes())}:${padTimePart(date.getUTCSeconds())} UTC`
);

const formatTimestamp = (timestamp, viewUTCTime) => {
    const parsedTimestamp = parseChatTimestamp(timestamp);
    if(!parsedTimestamp){ return ""; }
    if(viewUTCTime){
        return formatUTCTimestamp(parsedTimestamp);
    }
    return `${parsedTimestamp.toDateString()} ${parsedTimestamp.toLocaleString(["en-us"], {hour12: true, hour: "2-digit", minute: "2-digit"})}`;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getSearchTerms = (query) => {
    const trimmedQuery = (query || "").trim();
    if(trimmedQuery === ""){
        return [];
    }
    const uniqueTerms = new Set();
    return [trimmedQuery, ...trimmedQuery.split(/\s+/)]
        .map((term) => term.replace(/^[^\w]+|[^\w]+$/g, ""))
        .filter((term) => term.length > 1 || trimmedQuery.length === 1)
        .filter((term) => {
            const normalizedTerm = term.toLocaleLowerCase();
            if(uniqueTerms.has(normalizedTerm)){
                return false;
            }
            uniqueTerms.add(normalizedTerm);
            return true;
        })
        .sort((a, b) => b.length - a.length);
};

const buildSearchSnippetParts = (message, query) => {
    const messageText = String(message || "");
    if(messageText === ""){
        return [];
    }
    const searchTerms = getSearchTerms(query);
    const lowerMessageText = messageText.toLocaleLowerCase();
    const firstMatch = searchTerms.reduce((bestMatch, term) => {
        const index = lowerMessageText.indexOf(term.toLocaleLowerCase());
        if(index === -1){
            return bestMatch;
        }
        if(!bestMatch || index < bestMatch.index){
            return {index, term};
        }
        return bestMatch;
    }, null);
    let snippetStart = 0;
    let snippetEnd = Math.min(messageText.length, CHAT_SEARCH_SNIPPET_LENGTH);
    if(firstMatch){
        snippetStart = Math.max(0, firstMatch.index - CHAT_SEARCH_SNIPPET_CONTEXT);
        snippetEnd = Math.min(messageText.length, snippetStart + CHAT_SEARCH_SNIPPET_LENGTH);
        snippetStart = Math.max(0, snippetEnd - CHAT_SEARCH_SNIPPET_LENGTH);
    }
    const hasLeadingText = snippetStart > 0;
    const hasTrailingText = snippetEnd < messageText.length;
    const snippetText = `${hasLeadingText ? "..." : ""}${messageText.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim()}${hasTrailingText ? "..." : ""}`;
    if(searchTerms.length === 0){
        return [{text: snippetText, highlight: false}];
    }
    const highlightExpression = new RegExp(searchTerms.map(escapeRegExp).join("|"), "gi");
    const parts = [];
    let lastIndex = 0;
    snippetText.replace(highlightExpression, (match, offset) => {
        if(offset > lastIndex){
            parts.push({text: snippetText.slice(lastIndex, offset), highlight: false});
        }
        parts.push({text: match, highlight: true});
        lastIndex = offset + match.length;
        return match;
    });
    if(lastIndex < snippetText.length){
        parts.push({text: snippetText.slice(lastIndex), highlight: false});
    }
    return parts;
};

const renderSearchSnippet = (message, query) => (
    buildSearchSnippetParts(message, query).map((part, index) => (
        part.highlight ? (
            <mark className="mythic-chat-search-highlight" key={`highlight-${index}`}>{part.text}</mark>
        ) : (
            <React.Fragment key={`text-${index}`}>{part.text}</React.Fragment>
        )
    ))
);

const timestampValue = (timestamp) => {
    if(!timestamp){ return 0; }
    const value = new Date(timestamp).getTime();
    return Number.isNaN(value) ? 0 : value;
};

const newerOrEqual = (incoming, existing) => {
    if(!existing){ return true; }
    const incomingUpdatedAt = timestampValue(incoming.updated_at);
    const existingUpdatedAt = timestampValue(existing.updated_at);
    return incomingUpdatedAt === 0 || existingUpdatedAt === 0 || incomingUpdatedAt >= existingUpdatedAt;
};

const shouldKeepExistingStreamingMessage = (incoming, existing) => {
    if(!incoming || !existing || incoming.id !== existing.id){
        return false;
    }
    const incomingUpdatedAt = timestampValue(incoming.updated_at);
    const existingUpdatedAt = timestampValue(existing.updated_at);
    if(incomingUpdatedAt === 0 || incomingUpdatedAt !== existingUpdatedAt){
        return false;
    }
    if(incoming.deleted || incoming.edited || existing.deleted || existing.edited){
        return false;
    }
    if(existing.author_type !== "ai" || !["pending", "streaming"].includes(existing.status)){
        return false;
    }
    return (incoming.message || "").length < (existing.message || "").length;
};

const sortChannels = (a, b) => {
    if(a.archived !== b.archived){ return a.archived ? 1 : -1; }
    if(a.channel_type !== b.channel_type){ return a.channel_type.localeCompare(b.channel_type); }
    return (a.name || "").localeCompare(b.name || "");
};

const sortContainers = (a, b) => (a.name || "").localeCompare(b.name || "");
const sortByID = (a, b) => a.id - b.id;

const mergeRowsByID = (current, incoming, sortFunction, limit) => {
    if(!incoming || incoming.length === 0){
        return current;
    }
    const rowsByID = new Map((current || []).map((row) => [row.id, row]));
    incoming.forEach((row) => {
        const existing = rowsByID.get(row.id);
        if(newerOrEqual(row, existing)){
            const mergedRow = {...existing, ...row};
            if(shouldKeepExistingStreamingMessage(row, existing)){
                mergedRow.message = existing.message;
            }
            rowsByID.set(row.id, mergedRow);
        }
    });
    const merged = [...rowsByID.values()].sort(sortFunction);
    return limit ? merged.slice(-limit) : merged;
};

const mergeReadStateRows = (current, incoming) => {
    if(!incoming || incoming.length === 0){
        return current;
    }
    return incoming.reduce((prev, currentState) => {
        const existing = prev[currentState.channel_id] || 0;
        return {
            ...prev,
            [currentState.channel_id]: Math.max(existing, currentState.last_read_message_id || 0),
        };
    }, current);
};

const markdownPlugins = [remarkGfm];
const markdownTableAlignments = ["left", "right", "center"];
const getMarkdownTableAlign = (align) => markdownTableAlignments.includes(align) ? align : "left";

const MarkdownHeading = ({level, children}) => (
    <Typography component={`h${level}`} className={`mythic-chat-heading mythic-chat-heading-${level}`}>
        {children}
    </Typography>
);

const markdownComponents = {
    p: ({children}) => <Typography component="p" className="mythic-chat-paragraph">{children}</Typography>,
    h1: ({children}) => <MarkdownHeading level={1}>{children}</MarkdownHeading>,
    h2: ({children}) => <MarkdownHeading level={2}>{children}</MarkdownHeading>,
    h3: ({children}) => <MarkdownHeading level={3}>{children}</MarkdownHeading>,
    h4: ({children}) => <MarkdownHeading level={4}>{children}</MarkdownHeading>,
    h5: ({children}) => <MarkdownHeading level={5}>{children}</MarkdownHeading>,
    h6: ({children}) => <MarkdownHeading level={6}>{children}</MarkdownHeading>,
    ul: ({children}) => <ul className="mythic-chat-list">{children}</ul>,
    ol: ({children}) => <ol className="mythic-chat-list">{children}</ol>,
    blockquote: ({children}) => <Box component="blockquote" className="mythic-chat-blockquote">{children}</Box>,
    hr: () => <hr className="mythic-chat-rule" />,
    table: ({children}) => (
        <TableContainer className="mythicElement mythic-chat-table-wrap">
            <Table className="mythic-chat-table" size="small">{children}</Table>
        </TableContainer>
    ),
    thead: ({children}) => <TableHead>{children}</TableHead>,
    tbody: ({children}) => <TableBody>{children}</TableBody>,
    tr: ({children}) => <TableRow hover>{children}</TableRow>,
    th: ({children, align}) => <TableCell component="th" scope="col" align={getMarkdownTableAlign(align)}>{children}</TableCell>,
    td: ({children, align}) => <TableCell align={getMarkdownTableAlign(align)}>{children}</TableCell>,
    pre: ({children}) => {
        let language = "";
        React.Children.forEach(children, (child) => {
            const className = child?.props?.className || "";
            const match = className.match(/language-([^ ]+)/);
            if(match){
                language = match[1];
            }
        });
        return (
            <Box className="mythic-chat-code-block">
                {language && <span className="mythic-chat-code-language">{language}</span>}
                <pre>{children}</pre>
            </Box>
        );
    },
    code: ({className, children}) => (
        <code className={className || "mythic-chat-inline-code"}>{children}</code>
    ),
    a: ({href, children}) => {
        if(!href){
            return children;
        }
        try{
            const url = new URL(href, window.location.origin);
            if(!allowedLinkSchemes.includes(url.protocol)){
                return children;
            }
        }catch(error){
            return children;
        }
        return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    },
};

const MarkdownMessage = ({message}) => {
    if(!message){
        return null;
    }
    return (
        <Box className="mythic-chat-markdown">
            <ReactMarkdown remarkPlugins={markdownPlugins} components={markdownComponents} skipHtml>
                {message}
            </ReactMarkdown>
        </Box>
    );
};

const CHAT_SPECIAL_TYPE_EVENTING_USER_INTERACTION = "eventing_user_interaction";

const getChatMessageMetadata = (message) => {
    const metadata = message?.metadata || {};
    return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
};

const getEventingInteractionSnapshot = (message) => {
    const metadata = getChatMessageMetadata(message);
    if(metadata.special_type !== CHAT_SPECIAL_TYPE_EVENTING_USER_INTERACTION){
        return null;
    }
    const snapshot = metadata.eventing_user_interaction || {};
    return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot : {};
};

const getChatEventingPrompt = (snapshot) => {
    if(snapshot.approval_required && snapshot.approval_prompt){
        return snapshot.approval_prompt;
    }
    if(snapshot.input_required && snapshot.input_prompt){
        return snapshot.input_prompt;
    }
    if(snapshot.approval_required && snapshot.input_required){
        return "Approval and input are required before this step can continue.";
    }
    if(snapshot.approval_required){
        return "Approval is required before this step can continue.";
    }
    return "Input is required before this step can continue.";
};

const chatEventingStatusLabels = {
    awaiting_approval: "Awaiting approval",
    input_needed: "Input needed",
    queued: "Queued",
    running: "Running",
    success: "Success",
    error: "Error",
    cancelled: "Cancelled",
    skipped: "Skipped",
};

const getChatEventingStatusText = (snapshot) => {
    if(snapshot.status === "awaiting_approval"){
        return "Awaiting approval";
    }
    if(snapshot.status === "input_needed"){
        return "Input needed";
    }
    return chatEventingStatusLabels[snapshot.status] || snapshot.status || "Unknown";
};

const getChatEventingStateClass = (snapshot) => {
    switch(snapshot.status){
        case "success":
            return "success";
        case "error":
        case "cancelled":
            return "error";
        case "running":
            return "running";
        case "queued":
            return "queued";
        case "awaiting_approval":
        case "input_needed":
            return "waiting";
        default:
            return snapshot.waiting ? "waiting" : "neutral";
    }
};

const ChatEventingUserInteractionCard = ({message, me, onRefresh, onReview, refreshing}) => {
    const metadata = getChatMessageMetadata(message);
    const snapshot = getEventingInteractionSnapshot(message) || {};
    const waiting = Boolean(snapshot.waiting);
    const statusText = getChatEventingStatusText(snapshot);
    const stateClass = getChatEventingStateClass(snapshot);
    const stepName = snapshot.step_name || `Step ${snapshot.eventstepinstance_id || ""}`.trim();
    const requirementText = [
        snapshot.approval_required ? "approval" : null,
        snapshot.input_required ? `${snapshot.input_count || 0} input${snapshot.input_count === 1 ? "" : "s"}` : null,
    ].filter(Boolean).join(" + ");
    const refreshedAt = metadata.refreshed_at || snapshot.user_interaction_updated_at;
    const detailItems = [
        snapshot.step_action ? {label: "Action", value: snapshot.step_action} : null,
        requirementText ? {label: "Needs", value: requirementText} : null,
        snapshot.run_operator_username ? {label: "Run as", value: snapshot.run_operator_username} : null,
        snapshot.resolved_by_username ? {label: "Resolved by", value: snapshot.resolved_by_username} : null,
    ].filter(Boolean);
    return (
        <Box className={`mythic-chat-special-card mythic-chat-eventing-card mythic-chat-eventing-card-${stateClass}`.trim()}>
            <Box className="mythic-chat-special-card-header">
                <Box className="mythic-chat-special-card-title-wrap">
                    <Typography className="mythic-chat-special-card-title" variant="subtitle2">{stepName}</Typography>
                    <Typography className="mythic-chat-special-card-subtitle" variant="caption">Eventing user interaction</Typography>
                </Box>
                <Chip
                    size="small"
                    className={`mythic-chat-special-status mythic-chat-special-status-${stateClass}`.trim()}
                    label={statusText}
                    variant="outlined"
                />
            </Box>
            <Box className="mythic-chat-special-card-prompt">{getChatEventingPrompt(snapshot)}</Box>
            <Box className="mythic-chat-special-card-details">
                {detailItems.map((item) => (
                    <span className="mythic-chat-special-card-detail" key={`${message.id}-${item.label}`}>
                        <span className="mythic-chat-special-card-detail-label">{item.label}</span>
                        <span className="mythic-chat-special-card-detail-value">{item.value}</span>
                    </span>
                ))}
            </Box>
            <Box className="mythic-chat-special-card-footer">
                <Typography className="mythic-chat-special-card-refresh-time" variant="caption">
                    {refreshedAt ? `Refreshed ${formatTimestamp(refreshedAt, me?.user?.view_utc_time)}` : ""}
                </Typography>
                <Box className="mythic-chat-special-card-actions">
                    <MythicStyledTooltip title="Refresh">
                        <span>
                            <IconButton
                                aria-label="Refresh eventing interaction"
                                className="mythic-chat-special-refresh-button"
                                disabled={refreshing}
                                onClick={() => onRefresh(message)}
                                size="small"
                            >
                                <RestartAltIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </MythicStyledTooltip>
                    <Button
                        size="small"
                        variant="contained"
                        className="mythic-table-row-action mythic-table-row-action-hover-success"
                        disabled={!waiting}
                        onClick={() => onReview(message)}
                    >
                        Review
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

const channelDisplayName = (channel) => `# ${channel?.name || ""}`;

const parseChatContainerModels = (container) => {
    if(!container || !Array.isArray(container.subscriptions)){
        return [];
    }
    return container.subscriptions.map((subscription) => {
        let model = subscription;
        if(typeof subscription === "string"){
            try{
                model = JSON.parse(subscription);
            } catch(error){
                model = {name: subscription, description: ""};
            }
        }
        if(typeof model !== "object" || model === null){
            return {name: `${model}`, description: ""};
        }
        const modelName = model.name || model.Name || "";
        return {
            name: modelName === "" ? "" : `${modelName}`,
            description: model.description || model.Description || model.type || "",
            metadata: model.metadata || model.Metadata || {},
        };
    }).filter((model) => model.name);
};

const parseJSONLikeObject = (value) => {
    if(!value){
        return {};
    }
    if(typeof value === "object" && !Array.isArray(value)){
        return value;
    }
    if(typeof value === "string"){
        try{
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        }catch(error){
            return {};
        }
    }
    return {};
};

const getChannelAIMetadata = (channel) => parseJSONLikeObject(channel?.ai_metadata);

const getChannelAIConfig = (channel) => {
    const metadata = getChannelAIMetadata(channel);
    return parseJSONLikeObject(metadata.config || metadata.configuration);
};

const modelForChannel = (channel, chatContainers) => {
    if(!channel || channel.channel_type !== "ai"){
        return null;
    }
    const container = chatContainers.find((item) => item.id === channel.chat_container_id) || channel.chat_container;
    return parseChatContainerModels(container).find((model) => model.name === channel.chat_model) || null;
};

const getModelConfigOptions = (model) => {
    const metadata = model?.metadata || {};
    const rawOptions = metadata.configuration_options ||
        metadata.config_options ||
        metadata?.configuration?.options ||
        metadata?.config?.options ||
        [];
    if(!Array.isArray(rawOptions)){
        return [];
    }
    return rawOptions.map((option) => {
        const name = option.name || option.key || option.Name || option.Key || "";
        const choices = Array.isArray(option.choices || option.Choices) ? (option.choices || option.Choices).map((choice) => {
            if(choice && typeof choice === "object"){
                const value = choice.value ?? choice.Value ?? choice.name ?? choice.Name ?? choice.label ?? choice.Label ?? "";
                return {
                    value,
                    label: `${choice.label ?? choice.Label ?? value}`,
                    description: choice.description || choice.Description || "",
                };
            }
            return {value: choice, label: `${choice}`, description: ""};
        }) : [];
        const type = `${option.type || option.Type || (choices.length > 0 ? "choice" : "string")}`.toLowerCase();
        return {
            name: `${name}`,
            displayName: option.display_name || option.displayName || option.DisplayName || option.label || option.Label || `${name}`,
            description: option.description || option.Description || "",
            type: choices.length > 0 ? "choice" : type,
            required: Boolean(option.required || option.Required),
            defaultValue: option.default_value ?? option.defaultValue ?? option.DefaultValue ?? option.default ?? option.Default ?? "",
            choices,
        };
    }).filter((option) => option.name);
};

const configValueForField = (value) => {
    if(value === undefined || value === null){
        return "";
    }
    return `${value}`;
};

const buildDefaultConfigValues = (options, existing = {}) => {
    return options.reduce((prev, option) => {
        const existingValue = existing[option.name];
        prev[option.name] = configValueForField(existingValue !== undefined ? existingValue : option.defaultValue);
        return prev;
    }, {});
};

const normalizeConfigForSubmit = (values, options) => {
    return options.reduce((prev, option) => {
        const rawValue = values[option.name];
        if(rawValue === undefined || rawValue === null || `${rawValue}`.trim() === ""){
            return prev;
        }
        if(option.type === "number"){
            const numberValue = Number(rawValue);
            if(!Number.isNaN(numberValue)){
                prev[option.name] = numberValue;
            }
            return prev;
        }
        prev[option.name] = rawValue;
        return prev;
    }, {});
};

const configHasMissingRequiredValues = (values, options) => options.some((option) => (
    option.required && `${values[option.name] ?? ""}`.trim() === ""
));

const applyConfigToMetadata = (metadata, config) => ({
    ...parseJSONLikeObject(metadata),
    config,
});

const ChatConfigurationFields = ({options, values, setValues}) => {
    if(options.length === 0){
        return null;
    }
    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 1.25}}>
            <Typography variant="subtitle2">AI Configuration</Typography>
            {options.map((option) => {
                if(option.type === "choice"){
                    return (
                        <FormControl size="small" fullWidth key={option.name}>
                            <InputLabel>{option.displayName}</InputLabel>
                            <Select
                                label={option.displayName}
                                value={configValueForField(values[option.name])}
                                onChange={(e) => setValues((prev) => ({...prev, [option.name]: e.target.value}))}
                            >
                                {option.choices.map((choice) => (
                                    <MenuItem value={configValueForField(choice.value)} key={`${option.name}-${choice.value}`}>
                                        <Box sx={{display: "flex", flexDirection: "column", py: 0.25}}>
                                            <Typography variant="body2">{choice.label}</Typography>
                                            {choice.description &&
                                                <Typography variant="caption" color="text.secondary" sx={{whiteSpace: "normal"}}>
                                                    {choice.description}
                                                </Typography>
                                            }
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                            {option.description &&
                                <Typography variant="caption" color="text.secondary" sx={{mt: 0.5}}>
                                    {option.description}
                                </Typography>
                            }
                        </FormControl>
                    );
                }
                return (
                    <TextField
                        key={option.name}
                        fullWidth
                        size="small"
                        type={option.type === "number" ? "number" : "text"}
                        label={option.displayName}
                        required={option.required}
                        value={configValueForField(values[option.name])}
                        helperText={option.description}
                        onChange={(e) => setValues((prev) => ({...prev, [option.name]: e.target.value}))}
                    />
                );
            })}
        </Box>
    );
};

const ChatEmptyState = ({icon, title, detail}) => (
    <Box className="mythic-chat-empty-state">
        {icon}
        <Typography variant="subtitle2">{title}</Typography>
        {detail && <Typography variant="caption" color="text.secondary">{detail}</Typography>}
    </Box>
);

const ChannelButton = ({channel, selected, unread, onSelect}) => {
    const theme = useTheme();
    const isAI = channel.channel_type === "ai";
    const accentColor = isAI ? theme.palette.info.main : theme.palette.primary.main;
    const secondary = channel.description || (isAI ? channel.chat_container?.name || channel.chat_model || "" : "");
    const states = [
        channel.archived ? {label: "Archived", className: "mythic-chat-channel-state-archived"} : null,
        channel.locked ? {label: "Locked", className: "mythic-chat-channel-state-locked"} : null,
        isAI && channel.chat_container && !channel.chat_container.container_running ? {label: "Offline", className: "mythic-chat-channel-state-offline"} : null,
    ].filter(Boolean);
    return (
        <button
            type="button"
            onClick={() => onSelect(channel.id)}
            className={`mythic-chat-channel-button${selected ? " mythic-chat-channel-button-selected" : ""}${channel.archived ? " mythic-chat-channel-button-archived" : ""}`}
            style={{
                "--mythic-chat-channel-accent": accentColor,
                "--mythic-chat-channel-warning": theme.palette.warning.main,
                "--mythic-chat-channel-error": theme.palette.error.main,
                "--mythic-chat-channel-muted": theme.palette.text.secondary,
                borderColor: selected ? alpha(accentColor, 0.28) : "transparent",
                backgroundColor: selected ? alpha(accentColor, theme.palette.mode === "dark" ? 0.18 : 0.1) : channel.archived ? alpha(theme.palette.text.secondary, 0.06) : "transparent",
                color: theme.palette.text.primary,
            }}
        >
            <span className="mythic-chat-channel-icon">
                {channel.archived ? <ArchiveIcon fontSize="small" /> : isAI ? <SmartToyTwoToneIcon fontSize="small" /> : <ForumTwoToneIcon fontSize="small" />}
            </span>
            <span className="mythic-chat-channel-main">
                <span className="mythic-chat-channel-name">{channelDisplayName(channel)}</span>
                {secondary && <span className="mythic-chat-channel-meta">{secondary}</span>}
                {states.length > 0 &&
                    <span className="mythic-chat-channel-states">
                        {states.map((state) => (
                            <span key={state.label} className={`mythic-chat-channel-state ${state.className}`}>{state.label}</span>
                        ))}
                    </span>
                }
            </span>
            {unread && <span className="mythic-chat-unread-badge">Unread</span>}
        </button>
    );
};

const MessageBubble = ({message, request, me, onEdit, onDelete, onCancel, onRetry, onRefreshSpecial, onReviewSpecial, refreshingSpecialMessageID, editing, editText, setEditText, saveEdit, cancelEdit}) => {
    const theme = useTheme();
    const isMine = message.operator_id === me?.user?.user_id;
    const isAI = message.author_type === "ai";
    const isSystem = message.author_type === "system";
    const eventingInteractionSnapshot = getEventingInteractionSnapshot(message);
    const eventingInteractionStateClass = eventingInteractionSnapshot ? getChatEventingStateClass(eventingInteractionSnapshot) : "";
    const canEdit = isMine && message.author_type === "operator" && !message.deleted;
    const canDelete = !message.deleted && (isMine || message.author_type !== "operator");
    const streaming = message.status === "pending" || message.status === "streaming";
    const softBorderColor = theme.table?.borderSoft || theme.borderColor || theme.palette.divider;
    const chatMessageColors = theme.chat?.message || {};
    const markdownSurface = chatMessageColors.markdownSurface || (theme.palette.mode === "dark" ? alpha(theme.palette.common.black, 0.24) : alpha(theme.palette.common.black, 0.045));
    const markdownSurfaceStrong = chatMessageColors.markdownSurfaceStrong || (theme.palette.mode === "dark" ? alpha(theme.palette.common.white, 0.08) : alpha(theme.palette.common.black, 0.06));
    const messageBackgroundColor = isSystem ? chatMessageColors.systemBackground :
        isAI ? chatMessageColors.aiBackground :
            isMine ? chatMessageColors.selfBackground : chatMessageColors.operatorBackground;
    return (
        <Box className={`mythic-chat-message-row ${isMine ? "mythic-chat-message-row-mine" : ""}`}>
            <Box
                className={`mythic-chat-message ${isAI ? "mythic-chat-message-ai" : ""} ${isSystem ? "mythic-chat-message-system" : ""} ${eventingInteractionSnapshot ? `mythic-chat-message-special-eventing mythic-chat-message-special-eventing-${eventingInteractionStateClass}` : ""}`.trim()}
                sx={{
                    "--mythic-chat-markdown-border": softBorderColor,
                    "--mythic-chat-markdown-surface": markdownSurface,
                    "--mythic-chat-markdown-surface-strong": markdownSurfaceStrong,
                    borderColor: softBorderColor,
                    backgroundColor: messageBackgroundColor || theme.palette.background.paper,
                    boxShadow: theme.palette.mode === "dark" ? `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.05)}` : `0 1px 2px ${alpha(theme.palette.common.black, 0.06)}`,
                }}
            >
                <Box className="mythic-chat-message-header">
                    <Box className="mythic-chat-author">
                        {isAI && <SmartToyTwoToneIcon fontSize="small" color="info" />}
                        <span>{message.sender_display_name || message.operator?.username || "unknown"}</span>
                        {message.edited && !message.deleted && <Chip size="small" variant="outlined" label="edited" />}
                        {streaming && <Chip size="small" color="warning" variant="outlined" label={message.status} />}
                    </Box>
                    <Box className="mythic-chat-message-actions">
                        <Typography variant="caption" color="text.secondary">{formatTimestamp(message.created_at, me?.user?.view_utc_time)}</Typography>
                        {request && streaming &&
                            <MythicStyledTooltip title="Cancel request">
                                <IconButton size="small" onClick={() => onCancel(request.id)}>
                                    <StopCircleIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                        {request && (message.status === "error" || message.status === "cancelled") &&
                            <MythicStyledTooltip title="Retry request">
                                <IconButton size="small" onClick={() => onRetry(request.id)}>
                                    <RestartAltIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                        {canEdit &&
                            <MythicStyledTooltip title="Edit message">
                                <IconButton size="small" onClick={() => onEdit(message)}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                        {canDelete &&
                            <MythicStyledTooltip title="Delete message">
                                <IconButton size="small" onClick={() => onDelete(message.id)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                    </Box>
                </Box>
                {editing ? (
                    <Box className="mythic-chat-edit-box">
                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            size="small"
                        />
                        <Box className="mythic-chat-edit-actions">
                            <Button size="small" onClick={cancelEdit}>Cancel</Button>
                            <Button size="small" variant="contained" onClick={saveEdit}>Save</Button>
                        </Box>
                    </Box>
                ) : eventingInteractionSnapshot ? (
                    <ChatEventingUserInteractionCard
                        message={message}
                        me={me}
                        onRefresh={onRefreshSpecial}
                        onReview={onReviewSpecial}
                        refreshing={refreshingSpecialMessageID === message.id}
                    />
                ) : (
                    <MarkdownMessage message={message.message} />
                )}
                {request?.error &&
                    <Typography variant="caption" color="error" sx={{display: "block", mt: 0.5}}>{request.error}</Typography>
                }
            </Box>
        </Box>
    );
};

const ChatCreateDialog = ({open, onClose, onCreate, chatContainers}) => {
    const theme = useTheme();
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [channelType, setChannelType] = React.useState("standard");
    const [containerID, setContainerID] = React.useState("");
    const [model, setModel] = React.useState("");
    const [configValues, setConfigValues] = React.useState({});
    const [locked, setLocked] = React.useState(true);
    React.useEffect(() => {
        if(open){
            setName("");
            setDescription("");
            setChannelType("standard");
            setContainerID("");
            setModel("");
            setConfigValues({});
            setLocked(true);
        }
    }, [open]);
    const selectedContainer = React.useMemo(() => (
        chatContainers.find((container) => `${container.id}` === `${containerID}`)
    ), [chatContainers, containerID]);
    const selectedContainerModels = React.useMemo(() => (
        parseChatContainerModels(selectedContainer)
    ), [selectedContainer]);
    const selectedModel = React.useMemo(() => (
        selectedContainerModels.find((containerModel) => containerModel.name === model) || null
    ), [selectedContainerModels, model]);
    const configOptions = React.useMemo(() => getModelConfigOptions(selectedModel), [selectedModel]);
    React.useEffect(() => {
        if(channelType !== "ai" || !containerID){
            return;
        }
        if(model && !selectedContainerModels.some((containerModel) => containerModel.name === model)){
            setModel("");
            return;
        }
        if(model === "" && selectedContainerModels.length === 1){
            setModel(selectedContainerModels[0].name);
        }
    }, [channelType, containerID, model, selectedContainerModels]);
    React.useEffect(() => {
        if(channelType === "ai" && model){
            setConfigValues(buildDefaultConfigValues(configOptions));
        } else {
            setConfigValues({});
        }
    }, [channelType, containerID, model, configOptions]);
    const changeChannelType = (event) => {
        const nextType = event.target.value;
        setChannelType(nextType);
        if(nextType !== "ai"){
            setContainerID("");
            setModel("");
            setConfigValues({});
        }
    };
    const changeContainer = (event) => {
        const nextContainerID = event.target.value;
        const nextContainer = chatContainers.find((container) => `${container.id}` === `${nextContainerID}`);
        const nextModels = parseChatContainerModels(nextContainer);
        setContainerID(nextContainerID);
        setModel(nextModels.length === 1 ? nextModels[0].name : "");
        setConfigValues({});
    };
    const createDisabled = name.trim() === "" ||
        (channelType === "ai" && (!containerID || selectedContainerModels.length === 0 || model === "" || configHasMissingRequiredValues(configValues, configOptions)));
    const submit = () => {
        const aiConfig = channelType === "ai" ? normalizeConfigForSubmit(configValues, configOptions) : {};
        onCreate({
            name,
            description,
            channel_type: channelType,
            chat_container_id: channelType === "ai" ? Number(containerID) : null,
            chat_model: channelType === "ai" ? model : "",
            locked: channelType === "ai" ? locked : false,
            ai_metadata: channelType === "ai" ? applyConfigToMetadata({}, aiConfig) : {},
        });
    };
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{channelType === "ai" ? "New AI Chat" : "New Channel"}</DialogTitle>
            <DialogContent className="mythic-chat-dialog-content" sx={{display: "flex", flexDirection: "column", gap: 1.75, pt: "20px !important", px: 3}}>
                <FormControl size="small" fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select label="Type" value={channelType} onChange={changeChannelType}>
                        <MenuItem value="standard">Standard</MenuItem>
                        <MenuItem value="ai">AI</MenuItem>
                    </Select>
                </FormControl>
                <TextField label="Name" size="small" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                <TextField label="Description" size="small" value={description} onChange={(e) => setDescription(e.target.value)} />
                {channelType === "ai" &&
                    <>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Container</InputLabel>
                            <Select label="Container" value={containerID} onChange={changeContainer}>
                                {chatContainers.length === 0 &&
                                    <MenuItem value="" disabled>No chat containers available</MenuItem>
                                }
                                {chatContainers.map((container) => (
                                    <MenuItem value={`${container.id}`} key={container.id}>
                                        {container.name}{container.container_running ? "" : " (offline)"}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {containerID !== "" &&
                            <>
                                {selectedContainerModels.length > 0 ? (
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>Model</InputLabel>
                                        <Select
                                            label="Model"
                                            value={model}
                                            onChange={(e) => setModel(e.target.value)}
                                            renderValue={(selected) => selected}
                                        >
                                            {selectedContainerModels.map((containerModel) => (
                                                <MenuItem value={containerModel.name} key={`${containerID}-${containerModel.name}`}>
                                                    <Box sx={{display: "flex", flexDirection: "column", py: 0.5, minWidth: 0}}>
                                                        <Typography variant="body2">{containerModel.name}</Typography>
                                                        {containerModel.description &&
                                                            <Typography variant="caption" color="text.secondary" sx={{whiteSpace: "normal"}}>
                                                                {containerModel.description}
                                                            </Typography>
                                                        }
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                ) : (
                                    <Box sx={{border: `1px solid ${alpha(theme.palette.warning.main, 0.32)}`, borderRadius: 1, p: 1.25, backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.12 : 0.08)}}>
                                        <Typography variant="body2">No models reported</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            This chat container needs to report at least one model before it can be used for a new AI chat.
                                        </Typography>
                                    </Box>
                                )}
                            </>
                        }
                        {configOptions.length > 0 &&
                            <ChatConfigurationFields options={configOptions} values={configValues} setValues={setConfigValues} />
                        }
                        <Box sx={{border: `1px solid ${alpha(theme.palette.info.main, 0.22)}`, borderRadius: 1, p: 1.25, backgroundColor: alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.12 : 0.07)}}>
                            <FormControlLabel
                                control={<Switch checked={locked} onChange={(e) => setLocked(e.target.checked)} />}
                                label="Lock this AI chat"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{display: "block"}}>
                                Locked AI chats remain visible to everyone in the operation, but only the lock owner and operation admins or leads can send prompts into that session.
                            </Typography>
                        </Box>
                    </>
                }
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={submit} variant="contained" disabled={createDisabled}>
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const ChatSearchDialog = ({open, onClose, onSearch, searchText, setSearchText, searchQuery, results, loading, hasSearched, onSelectResult, viewUTCTime}) => {
    const trimmedSearchText = searchText.trim();
    const searchResults = results || [];
    const highlightQuery = searchQuery || trimmedSearchText;
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{className: "mythic-chat-search-dialog"}}>
            <DialogTitle>Search Chat</DialogTitle>
            <DialogContent className="mythic-chat-dialog-content mythic-chat-search-content" sx={{display: "flex", flexDirection: "column", gap: 1.75, pt: "20px !important", px: 3}}>
                <Box className="mythic-chat-search-form">
                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        label="Search"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => {
                            if(e.key === "Enter"){
                                onSearch();
                            }
                        }}
                    />
                    <Button variant="contained" startIcon={<SearchIcon />} disabled={trimmedSearchText === "" || loading} onClick={onSearch}>
                        {loading ? "Searching" : "Search"}
                    </Button>
                </Box>
                <Box className="mythic-chat-search-results">
                    {loading && <Box className="mythic-chat-search-empty">Searching...</Box>}
                    {!loading && hasSearched && searchResults.length === 0 && <Box className="mythic-chat-search-empty">No matches</Box>}
                    {!loading && searchResults.map((result) => (
                        <button
                            type="button"
                            className="mythic-chat-search-result"
                            key={result.id}
                            onClick={() => onSelectResult(result)}
                        >
                            <span className="mythic-chat-search-result-header">
                                <span className="mythic-chat-search-channel">
                                    {result.channel_type === "ai" ? <SmartToyTwoToneIcon fontSize="small" /> : <ForumTwoToneIcon fontSize="small" />}
                                    <span>{result.channel_type === "ai" ? result.channel_name : `#${result.channel_name}`}</span>
                                </span>
                                <span className="mythic-chat-search-meta">{result.sender_display_name} · {formatTimestamp(result.created_at, viewUTCTime)}</span>
                            </span>
                            <span className="mythic-chat-search-message">{renderSearchSnippet(result.message, highlightQuery)}</span>
                        </button>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

const ChatEditChannelDialog = ({open, channel, onClose, onSave, chatContainers = []}) => {
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [chatModel, setChatModel] = React.useState("");
    const [configValues, setConfigValues] = React.useState({});
    const isGeneralChannel = isGeneralChatChannel(channel);
    const isAIChannel = channel?.channel_type === "ai";
    const containerModels = React.useMemo(() => {
        if(!isAIChannel){
            return [];
        }
        const container = chatContainers.find((item) => item.id === channel.chat_container_id) || channel.chat_container;
        return parseChatContainerModels(container);
    }, [channel, chatContainers, isAIChannel]);
    const selectedModel = React.useMemo(() => (
        containerModels.find((containerModel) => containerModel.name === chatModel) || (chatModel ? null : modelForChannel(channel, chatContainers))
    ), [channel, chatContainers, chatModel, containerModels]);
    const configOptions = React.useMemo(() => getModelConfigOptions(selectedModel), [selectedModel]);
    React.useEffect(() => {
        if(open && channel){
            setName(channel.name || "");
            setDescription(channel.description || "");
            setChatModel(channel.chat_model || "");
            const initialModel = modelForChannel(channel, chatContainers);
            setConfigValues(buildDefaultConfigValues(getModelConfigOptions(initialModel), getChannelAIConfig(channel)));
        }
    }, [open, channel, chatContainers]);
    const changeModel = (event) => {
        const nextModelName = event.target.value;
        const nextModel = containerModels.find((containerModel) => containerModel.name === nextModelName) || null;
        const nextOptions = getModelConfigOptions(nextModel);
        setChatModel(nextModelName);
        setConfigValues((prev) => buildDefaultConfigValues(nextOptions, prev));
    };
    const submit = () => {
        if(!channel){
            return;
        }
        const update = {
            channel_id: channel.id,
            description,
        };
        if(!isGeneralChatChannel(channel)){
            update.name = name.trim();
        }
        if(isAIChannel){
            update.chat_model = chatModel;
            update.ai_metadata = applyConfigToMetadata(
                getChannelAIMetadata(channel),
                normalizeConfigForSubmit(configValues, configOptions),
            );
        }
        onSave(update);
    };
    const saveDisabled = (!isGeneralChannel && name.trim() === "") ||
        (isAIChannel && configHasMissingRequiredValues(configValues, configOptions));
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isAIChannel ? "Edit AI Chat" : "Edit Channel"}</DialogTitle>
            <DialogContent className="mythic-chat-dialog-content" sx={{display: "flex", flexDirection: "column", gap: 1.75, pt: "20px !important", px: 3}}>
                <TextField
                    autoFocus={!isGeneralChannel}
                    fullWidth
                    label="Name"
                    size="small"
                    disabled={isGeneralChannel}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <TextField
                    fullWidth
                    label="Description"
                    multiline
                    minRows={3}
                    size="small"
                    autoFocus={isGeneralChannel}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                {isAIChannel &&
                    <>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Model</InputLabel>
                            <Select
                                label="Model"
                                value={chatModel}
                                onChange={changeModel}
                                renderValue={(selected) => selected}
                            >
                                {containerModels.length === 0 &&
                                    <MenuItem value={chatModel} disabled>{chatModel || "No models reported"}</MenuItem>
                                }
                                {containerModels.map((containerModel) => (
                                    <MenuItem value={containerModel.name} key={`${channel?.id}-${containerModel.name}`}>
                                        <Box sx={{display: "flex", flexDirection: "column", py: 0.5, minWidth: 0}}>
                                            <Typography variant="body2">{containerModel.name}</Typography>
                                            {containerModel.description &&
                                                <Typography variant="caption" color="text.secondary" sx={{whiteSpace: "normal"}}>
                                                    {containerModel.description}
                                                </Typography>
                                            }
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <ChatConfigurationFields options={configOptions} values={configValues} setValues={setConfigValues} />
                    </>
                }
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={submit} variant="contained" disabled={saveDisabled}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const ChatSystemMessageDialog = ({open, selectedChannel, isMythicAdmin, onClose, onSend}) => {
    const [message, setMessage] = React.useState("");
    const [allOperations, setAllOperations] = React.useState(false);
    React.useEffect(() => {
        if(open){
            setMessage("");
            setAllOperations(false);
        }
    }, [open]);
    const submit = () => {
        const trimmed = message.trim();
        if(trimmed === "" || !selectedChannel){
            return;
        }
        onSend({message: trimmed, all_operations: isMythicAdmin && allOperations}).then(({data}) => {
            if(data?.chatCreateMessage?.status === "success"){
                onClose();
            }
        }).catch(() => {});
    };
    const destination = isMythicAdmin && allOperations ? "All operations" :
        selectedChannel ? channelDisplayName(selectedChannel) : "No channel";
    const sendDisabled = message.trim() === "" || !selectedChannel || (selectedChannel.archived && !(isMythicAdmin && allOperations));
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>System Message</DialogTitle>
            <DialogContent className="mythic-chat-dialog-content" sx={{display: "flex", flexDirection: "column", gap: 1.75, pt: "20px !important", px: 3}}>
                <Box className="mythic-chat-system-destination">
                    <CampaignTwoToneIcon fontSize="small" />
                    <Typography variant="body2" noWrap>{destination}</Typography>
                </Box>
                <TextField
                    autoFocus
                    fullWidth
                    label="Message"
                    multiline
                    minRows={4}
                    size="small"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                {isMythicAdmin &&
                    <Box className="mythic-chat-system-options">
                        <FormControlLabel
                            control={<Switch checked={allOperations} onChange={(e) => setAllOperations(e.target.checked)} />}
                            label="Send to all operations"
                        />
                    </Box>
                }
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={submit} variant="contained" disabled={sendDisabled}>
                    Send
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export function Chat({me}) {
    const theme = useTheme();
    const meContext = React.useContext(MeContext);
    const currentMe = me || meContext;
    const [selectedChannelID, setSelectedChannelID] = React.useState(null);
    const [showArchived, setShowArchived] = React.useState(false);
    const [composer, setComposer] = React.useState("");
    const [createOpen, setCreateOpen] = React.useState(false);
    const [editChannelOpen, setEditChannelOpen] = React.useState(false);
    const [systemMessageOpen, setSystemMessageOpen] = React.useState(false);
    const [archiveTarget, setArchiveTarget] = React.useState(null);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState("");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [editingID, setEditingID] = React.useState(null);
    const [editText, setEditText] = React.useState("");
    const [reviewMessage, setReviewMessage] = React.useState(null);
    const [refreshingSpecialMessageID, setRefreshingSpecialMessageID] = React.useState(null);
    const messagesContainerRef = React.useRef(null);
    const messagesEndRef = React.useRef(null);
    const messagesNearBottomRef = React.useRef(true);
    const messagesScrollStateRef = React.useRef({
        channelID: null,
        messageIDs: new Set(),
        lastMessageID: null,
        lastMessageUpdatedAt: null,
        lastMessageStatus: null,
        lastMessageLength: 0,
    });
    const streamStart = React.useRef(getSkewedNow().toISOString());
    const [baseChannels, setBaseChannels] = React.useState([]);
    const [allChatContainers, setAllChatContainers] = React.useState([]);
    const [readState, setReadState] = React.useState({});
    const [messages, setMessages] = React.useState([]);
    const [requests, setRequests] = React.useState([]);
    const selectedChannelIDRef = React.useRef(selectedChannelID);
    const selectedChannelStreamStart = React.useMemo(() => getSkewedNow().toISOString(), [selectedChannelID]);
    selectedChannelIDRef.current = selectedChannelID;

    const {data: channelData} = useQuery(CHAT_CHANNELS_QUERY, {fetchPolicy: "no-cache"});
    const {data: readStateData} = useQuery(CHAT_READ_STATE_QUERY, {fetchPolicy: "no-cache"});
    const {data: containerData} = useQuery(CHAT_CONTAINERS_QUERY, {fetchPolicy: "no-cache"});
    const {data: currentOperatorData} = useQuery(CHAT_CURRENT_OPERATOR_QUERY, {
        variables: {
            operator_id: currentMe?.user?.user_id || 0,
            operation_id: currentMe?.user?.current_operation_id || 0,
        },
        skip: !currentMe?.user?.user_id || !currentMe?.user?.current_operation_id,
        fetchPolicy: "no-cache",
        onError: (error) => console.log(error),
    });

    React.useEffect(() => {
        if(channelData?.chat_channel){
            setBaseChannels((prev) => mergeRowsByID(prev, channelData.chat_channel, sortChannels));
        }
    }, [channelData]);
    React.useEffect(() => {
        if(readStateData?.chat_read_state){
            setReadState((prev) => mergeReadStateRows(prev, readStateData.chat_read_state));
        }
    }, [readStateData]);
    React.useEffect(() => {
        if(containerData?.consuming_container){
            setAllChatContainers((prev) => mergeRowsByID(prev, containerData.consuming_container, sortContainers));
        }
    }, [containerData]);

    useSubscription(CHAT_CHANNELS_STREAM_SUBSCRIPTION, {
        variables: {now: streamStart.current},
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            const updates = data.data?.chat_channel_stream || [];
            if(updates.length > 0){
                setBaseChannels((prev) => mergeRowsByID(prev, updates, sortChannels));
            }
        },
        onError: (error) => console.log(error),
    });
    useSubscription(CHAT_READ_STATE_STREAM_SUBSCRIPTION, {
        variables: {now: streamStart.current},
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            const updates = data.data?.chat_read_state_stream || [];
            if(updates.length > 0){
                setReadState((prev) => mergeReadStateRows(prev, updates));
            }
        },
        onError: (error) => console.log(error),
    });
    useSubscription(CHAT_CONTAINERS_STREAM_SUBSCRIPTION, {
        variables: {now: streamStart.current},
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            const updates = data.data?.consuming_container_stream || [];
            if(updates.length > 0){
                setAllChatContainers((prev) => mergeRowsByID(prev, updates, sortContainers));
            }
        },
        onError: (error) => console.log(error),
    });

    const chatContainers = React.useMemo(() => {
        return allChatContainers.filter((container) => !container.deleted).sort(sortContainers);
    }, [allChatContainers]);
    const containerByID = React.useMemo(() => {
        return chatContainers.reduce((prev, container) => {
            prev[container.id] = container;
            return prev;
        }, {});
    }, [chatContainers]);
    const channels = React.useMemo(() => {
        return baseChannels.map((channel) => ({
            ...channel,
            chat_container: containerByID[channel.chat_container_id] || channel.chat_container,
        })).sort(sortChannels);
    }, [baseChannels, containerByID]);

    const selectedChannel = React.useMemo(() => {
        return channels.find((channel) => channel.id === selectedChannelID) || null;
    }, [channels, selectedChannelID]);
    const generalChannel = React.useMemo(() => {
        return channels.find((channel) => isGeneralChatChannel(channel)) || null;
    }, [channels]);
    const currentOperatorViewMode = currentOperatorData?.operatoroperation?.[0]?.view_mode || currentMe?.user?.view_mode || "";
    const isMythicAdmin = Boolean(currentMe?.user?.admin || currentOperatorData?.operator_by_pk?.admin);
    const canCreateSystemMessage = isMythicAdmin || currentOperatorViewMode === "lead";
    const selectedChannelIsGeneral = isGeneralChatChannel(selectedChannel);

    React.useEffect(() => {
        if(!selectedChannelID && channels.length > 0){
            const active = channels.find((channel) => !channel.archived) || channels[0];
            setSelectedChannelID(active.id);
        }
    }, [channels, selectedChannelID]);

    React.useEffect(() => {
        setMessages([]);
        setRequests([]);
    }, [selectedChannelID]);

    const {data: messageData} = useQuery(CHAT_MESSAGES_QUERY, {
        variables: {channel_id: selectedChannelID || 0, limit: CHAT_MESSAGE_LIMIT},
        skip: !selectedChannelID,
        fetchPolicy: "no-cache",
    });
    const {data: requestData} = useQuery(CHAT_REQUESTS_QUERY, {
        variables: {channel_id: selectedChannelID || 0, limit: CHAT_REQUEST_LIMIT},
        skip: !selectedChannelID,
        fetchPolicy: "no-cache",
    });
    React.useEffect(() => {
        const currentChannelID = selectedChannelIDRef.current;
        if(currentChannelID && messageData?.chat_message){
            const rows = messageData.chat_message.filter((message) => message.channel_id === currentChannelID);
            setMessages((prev) => mergeRowsByID(prev, rows, sortByID, CHAT_MESSAGE_LIMIT));
        }
    }, [messageData, selectedChannelID]);
    React.useEffect(() => {
        const currentChannelID = selectedChannelIDRef.current;
        if(currentChannelID && requestData?.chat_request){
            const rows = requestData.chat_request.filter((request) => request.channel_id === currentChannelID);
            setRequests((prev) => mergeRowsByID(prev, rows, sortByID, CHAT_REQUEST_LIMIT));
        }
    }, [requestData, selectedChannelID]);
    useSubscription(CHAT_MESSAGES_STREAM_SUBSCRIPTION, {
        variables: {channel_id: selectedChannelID || 0, now: selectedChannelStreamStart},
        skip: !selectedChannelID,
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            const currentChannelID = selectedChannelIDRef.current;
            const updates = (data.data?.chat_message_stream || []).filter((message) => message.channel_id === currentChannelID);
            if(updates.length > 0){
                setMessages((prev) => mergeRowsByID(prev, updates, sortByID, CHAT_MESSAGE_LIMIT));
            }
        },
        onError: (error) => console.log(error),
    });
    useSubscription(CHAT_REQUESTS_STREAM_SUBSCRIPTION, {
        variables: {channel_id: selectedChannelID || 0, now: selectedChannelStreamStart},
        skip: !selectedChannelID,
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            const currentChannelID = selectedChannelIDRef.current;
            const updates = (data.data?.chat_request_stream || []).filter((request) => request.channel_id === currentChannelID);
            if(updates.length > 0){
                setRequests((prev) => mergeRowsByID(prev, updates, sortByID, CHAT_REQUEST_LIMIT));
            }
        },
        onError: (error) => console.log(error),
    });
    const requestsByResponseID = React.useMemo(() => {
        return requests.reduce((prev, request) => {
            prev[request.response_message_id] = request;
            return prev;
        }, {});
    }, [requests]);

    const [createChannel] = useMutation(CREATE_CHANNEL, {
        onCompleted: (data) => {
            if(data.chatCreateChannel.status === "success"){
                setSelectedChannelID(data.chatCreateChannel.channel_id);
                setCreateOpen(false);
            } else {
                snackActions.error(data.chatCreateChannel.error);
            }
        },
        onError: (error) => snackActions.error(error.message),
    });
    const [updateChannel] = useMutation(UPDATE_CHANNEL, {
        onCompleted: (data) => {
            if(data.chatUpdateChannel.status !== "success"){
                snackActions.error(data.chatUpdateChannel.error);
            }
        },
        onError: (error) => snackActions.error(error.message),
    });
    const [createMessage] = useMutation(CREATE_MESSAGE, {
        onCompleted: (data) => {
            if(data.chatCreateMessage.status !== "success"){
                snackActions.error(data.chatCreateMessage.error);
            }
        },
        onError: (error) => snackActions.error(error.message),
    });
    const [editMessage] = useMutation(EDIT_MESSAGE, {
        onCompleted: (data) => {
            if(data.chatEditMessage.status === "success"){
                setEditingID(null);
                setEditText("");
            } else {
                snackActions.error(data.chatEditMessage.error);
            }
        },
        onError: (error) => snackActions.error(error.message),
    });
    const [deleteMessage] = useMutation(DELETE_MESSAGE, {
        onCompleted: (data) => {
            if(data.chatDeleteMessage.status !== "success"){
                snackActions.error(data.chatDeleteMessage.error);
            }
        },
        onError: (error) => snackActions.error(error.message),
    });
    const [cancelRequest] = useMutation(CANCEL_REQUEST, {
        onCompleted: (data) => {
            if(data.chatCancelRequest.status !== "success"){
                snackActions.error(data.chatCancelRequest.error);
            }
        },
        onError: (error) => snackActions.error(error.message),
    });
    const [retryRequest] = useMutation(RETRY_REQUEST, {
        onCompleted: (data) => {
            if(data.chatRetryRequest.status !== "success"){
                snackActions.error(data.chatRetryRequest.error);
            }
        },
        onError: (error) => snackActions.error(error.message),
    });
    const [markRead] = useMutation(MARK_READ);
    const [refreshSpecialMessage] = useMutation(REFRESH_SPECIAL_MESSAGE, {
        onCompleted: (data) => {
            if(data.chatRefreshSpecialMessage.status !== "success"){
                snackActions.error(data.chatRefreshSpecialMessage.error);
            }
        },
        onError: (error) => snackActions.error(error.message),
    });
    const [runSearch, {data: searchData, loading: searchLoading}] = useLazyQuery(CHAT_SEARCH, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.chatSearch.status !== "success"){
                snackActions.error(data.chatSearch.error);
            }
        },
        onError: (error) => snackActions.error(error.message),
    });

    const updateMessagesNearBottom = React.useCallback(() => {
        const messagesContainer = messagesContainerRef.current;
        if(!messagesContainer){
            messagesNearBottomRef.current = true;
            return;
        }
        messagesNearBottomRef.current = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 80;
    }, []);

    React.useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        const lastMessageMatchesChannel = Boolean(lastMessage && lastMessage.channel_id === selectedChannelID);
        const previousScrollState = messagesScrollStateRef.current;
        const messageIDs = new Set(messages.map((message) => message.id));
        const channelChanged = previousScrollState.channelID !== selectedChannelID;
        const hasNewMessages = messages.some((message) => !previousScrollState.messageIDs.has(message.id));
        const lastMessageChanged = Boolean(lastMessage &&
            previousScrollState.lastMessageID === lastMessage.id &&
            (
                previousScrollState.lastMessageUpdatedAt !== lastMessage.updated_at ||
                previousScrollState.lastMessageStatus !== lastMessage.status ||
                previousScrollState.lastMessageLength !== (lastMessage.message || "").length
            )
        );
        const shouldScrollToBottom = Boolean(
            lastMessageMatchesChannel &&
            (
                channelChanged ||
                hasNewMessages ||
                (lastMessageChanged && messagesNearBottomRef.current)
            )
        );

        messagesScrollStateRef.current = {
            channelID: selectedChannelID,
            messageIDs,
            lastMessageID: lastMessage?.id || null,
            lastMessageUpdatedAt: lastMessage?.updated_at || null,
            lastMessageStatus: lastMessage?.status || null,
            lastMessageLength: (lastMessage?.message || "").length,
        };

        if(shouldScrollToBottom){
            messagesEndRef.current?.scrollIntoView({block: "end"});
            messagesNearBottomRef.current = true;
        }

        if(selectedChannelID && lastMessageMatchesChannel){
            markRead({variables: {channel_id: selectedChannelID, last_read_message_id: lastMessage.id}}).catch(() => {});
        }
    }, [messages, selectedChannelID, markRead]);

    const standardChannels = channels.filter((channel) => channel.channel_type === "standard" && (showArchived || !channel.archived));
    const aiChannels = channels.filter((channel) => channel.channel_type === "ai" && (showArchived || !channel.archived));
    const channelHasUnread = React.useCallback((channel) => {
        const latestMessageID = channel.last_message_id || 0;
        if(latestMessageID === 0 || channel.id === selectedChannelID){
            return false;
        }
        return (readState[channel.id] || 0) < latestMessageID;
    }, [readState, selectedChannelID]);
    const activeAIRequest = React.useMemo(() => {
        if(selectedChannel?.channel_type !== "ai"){
            return null;
        }
        return requests.find((request) => request.channel_id === selectedChannel.id && ["pending", "streaming"].includes(request.status)) || null;
    }, [requests, selectedChannel]);

    const submitMessage = () => {
        const message = composer.trim();
        if(!message || !selectedChannel){
            return;
        }
        createMessage({variables: {channel_id: selectedChannel.id, message}});
        setComposer("");
    };
    const submitSystemMessage = ({message, all_operations}) => {
        if(!selectedChannel){
            return Promise.resolve({data: {chatCreateMessage: {status: "error", error: "No channel selected"}}});
        }
        return createMessage({
            variables: {
                channel_id: selectedChannel.id,
                message,
                system_message: true,
                all_operations,
            },
        }).then((result) => {
            if(result.data?.chatCreateMessage?.status === "success"){
                snackActions.success("System message sent");
                if(all_operations && generalChannel){
                    setSelectedChannelID(generalChannel.id);
                }
            }
            return result;
        });
    };
    const disabledReason = React.useMemo(() => {
        if(!selectedChannel){ return "No channel selected"; }
        if(selectedChannel.archived){ return "Archived"; }
        if(selectedChannel.channel_type === "ai" && selectedChannel.locked && selectedChannel.locked_by !== currentMe?.user?.user_id){
            return `Locked by ${selectedChannel.locked_operator?.username || "another operator"}`;
        }
        if(activeAIRequest){
            return "AI response in progress";
        }
        if(selectedChannel.channel_type === "ai" && selectedChannel.chat_container && !selectedChannel.chat_container.container_running){
            return "AI container offline";
        }
        return "";
    }, [selectedChannel, currentMe, activeAIRequest]);
    const composerDisabled = disabledReason !== "";
    const onCreateChannel = (variables) => createChannel({variables});
    const toggleArchive = () => {
        if(!selectedChannel || isGeneralChatChannel(selectedChannel)){
            return;
        }
        if(selectedChannel.archived){
            updateChannel({variables: {channel_id: selectedChannel.id, archived: false}});
        } else {
            setArchiveTarget(selectedChannel);
        }
    };
    const confirmArchiveChannel = () => {
        if(archiveTarget){
            updateChannel({variables: {channel_id: archiveTarget.id, archived: true}});
        }
    };
    const toggleLock = () => {
        if(selectedChannel?.channel_type === "ai"){
            updateChannel({variables: {channel_id: selectedChannel.id, locked: !selectedChannel.locked}});
        }
    };
    const saveChannelDetails = (variables) => {
        updateChannel({variables}).then(({data}) => {
            if(data?.chatUpdateChannel?.status === "success"){
                setEditChannelOpen(false);
            }
        }).catch(() => {});
    };
    const beginEdit = (message) => {
        setEditingID(message.id);
        setEditText(message.message);
    };
    const saveEdit = () => {
        if(editingID && editText.trim()){
            editMessage({variables: {message_id: editingID, message: editText}});
        }
    };
    const runChatSearch = () => {
        const trimmedSearchText = searchText.trim();
        if(trimmedSearchText){
            setSearchQuery(trimmedSearchText);
            runSearch({variables: {query: trimmedSearchText, limit: 50}});
        }
    };
    const selectSearchResult = (result) => {
        setSelectedChannelID(result.channel_id);
        setSearchOpen(false);
    };
    const refreshChatSpecialMessage = React.useCallback((message) => {
        if(!message?.id){
            return Promise.resolve();
        }
        setRefreshingSpecialMessageID(message.id);
        return refreshSpecialMessage({variables: {message_id: message.id}})
            .finally(() => setRefreshingSpecialMessageID(null));
    }, [refreshSpecialMessage]);
    const reviewChatSpecialMessage = (message) => {
        setReviewMessage(message);
    };
    const reviewSnapshot = getEventingInteractionSnapshot(reviewMessage);
    const metaChips = (
        <>
            <MythicPageHeaderChip label={`${channels.filter((channel) => !channel.archived).length} active`} />
            <MythicPageHeaderChip label={`${aiChannels.length} AI`} />
        </>
    );

    return (
        <MythicPageBody>
            <MythicPageHeader
                title="Operation Chat"
                subtitle="Channels and AI sessions for the current operation."
                icon={<ForumTwoToneIcon />}
                meta={metaChips}
                actions={
                    <Box sx={{display: "flex", gap: 1}}>
                        <Button size="small" className="mythic-table-row-action-hover-info" startIcon={<SearchIcon />} onClick={() => setSearchOpen(true)}>Search</Button>
                        <Button size="small" className="mythic-table-row-action-hover-success" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New channel</Button>
                    </Box>
                }
            />
            <Box
                className="mythic-chat-layout"
                sx={{
                    backgroundColor: "transparent",
                    boxShadow: "none",
                }}
            >
                <Box className="mythic-chat-sidebar">
                    <Box className="mythic-chat-sidebar-toolbar">
                        <Box className="mythic-chat-sidebar-heading">
                            <Typography variant="subtitle2">Channels</Typography>
                            <Chip className="mythic-chat-sidebar-count" size="small" label={`${channels.length} total`} />
                        </Box>
                        <FormControlLabel
                            sx={{m: 0}}
                            control={<Switch size="small" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />}
                            label={<Typography variant="caption">Show archived</Typography>}
                        />
                    </Box>
                    <Box className="mythic-chat-channel-section">
                        <Typography variant="caption" color="text.secondary">Standard</Typography>
                        {standardChannels.length === 0 ? (
                            <Box className="mythic-chat-empty-list">No standard channels</Box>
                        ) : (
                            standardChannels.map((channel) => (
                                <ChannelButton
                                    key={channel.id}
                                    channel={channel}
                                    selected={channel.id === selectedChannelID}
                                    unread={channelHasUnread(channel)}
                                    onSelect={setSelectedChannelID}
                                />
                            ))
                        )}
                    </Box>
                    <Divider />
                    <Box className="mythic-chat-channel-section">
                        <Typography variant="caption" color="text.secondary">AI</Typography>
                        {aiChannels.length === 0 ? (
                            <Box className="mythic-chat-empty-list">No AI chats</Box>
                        ) : (
                            aiChannels.map((channel) => (
                                <ChannelButton
                                    key={channel.id}
                                    channel={channel}
                                    selected={channel.id === selectedChannelID}
                                    unread={channelHasUnread(channel)}
                                    onSelect={setSelectedChannelID}
                                />
                            ))
                        )}
                    </Box>
                </Box>
                <Box className="mythic-chat-main">
                    <Box className="mythic-chat-conversation-header">
                        <Box sx={{display: "flex", alignItems: "center", gap: 1, minWidth: 0}}>
                            <Box
                                className="mythic-chat-conversation-icon"
                                sx={{
                                    color: selectedChannel?.channel_type === "ai" ? theme.palette.info.main : theme.palette.primary.main,
                                    borderColor: selectedChannel?.channel_type === "ai" ? alpha(theme.palette.info.main, 0.2) : alpha(theme.palette.primary.main, 0.2),
                                    backgroundColor: selectedChannel?.channel_type === "ai" ? alpha(theme.palette.info.main, 0.1) : alpha(theme.palette.primary.main, 0.1),
                                }}
                            >
                                {selectedChannel?.channel_type === "ai" ? <SmartToyTwoToneIcon fontSize="small" /> : <ForumTwoToneIcon fontSize="small" />}
                            </Box>
                            <Box sx={{minWidth: 0}}>
                                <Typography className="mythic-chat-conversation-title" variant="subtitle1" noWrap>{selectedChannel ? channelDisplayName(selectedChannel) : "Chat"}</Typography>
                                <Typography className="mythic-chat-conversation-subtitle" variant="caption" color="text.secondary" noWrap>
                                    {selectedChannel?.description || selectedChannel?.chat_container?.name || ""}
                                </Typography>
                            </Box>
                        </Box>
                        <Box className="mythic-chat-header-actions">
                            {selectedChannel &&
                                <MythicStyledTooltip title="Edit channel">
                                    <IconButton size="small" onClick={() => setEditChannelOpen(true)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </MythicStyledTooltip>
                            }
                            {selectedChannel?.channel_type === "ai" &&
                                <MythicStyledTooltip title={selectedChannel.locked ? "Unlock AI chat" : "Lock AI chat"}>
                                    <IconButton size="small" onClick={toggleLock}>
                                        {selectedChannel.locked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                                    </IconButton>
                                </MythicStyledTooltip>
                            }
                            {selectedChannel &&
                                <MythicStyledTooltip title={selectedChannelIsGeneral ? "General channel cannot be archived" : selectedChannel.archived ? "Unarchive channel" : "Archive channel"}>
                                    <span>
                                        <IconButton size="small" onClick={toggleArchive} disabled={selectedChannelIsGeneral}>
                                            {selectedChannel.archived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
                                        </IconButton>
                                    </span>
                                </MythicStyledTooltip>
                            }
                        </Box>
                    </Box>
                    <Box className="mythic-chat-messages" ref={messagesContainerRef} onScroll={updateMessagesNearBottom}>
                        {!selectedChannel ? (
                            <ChatEmptyState
                                icon={<ForumTwoToneIcon fontSize="large" />}
                                title="No channel selected"
                            />
                        ) : messages.length === 0 ? (
                            <ChatEmptyState
                                icon={selectedChannel.channel_type === "ai" ? <SmartToyTwoToneIcon fontSize="large" /> : <ForumTwoToneIcon fontSize="large" />}
                                title="No messages yet"
                                detail={selectedChannel.archived ? "This channel is archived." : "No message history for this channel."}
                            />
                        ) : (
                            messages.map((message) => (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    request={requestsByResponseID[message.id]}
                                    me={currentMe}
                                    onEdit={beginEdit}
                                    onDelete={(messageID) => deleteMessage({variables: {message_id: messageID}})}
                                    onCancel={(requestID) => cancelRequest({variables: {request_id: requestID}})}
                                    onRetry={(requestID) => retryRequest({variables: {request_id: requestID}})}
                                    onRefreshSpecial={refreshChatSpecialMessage}
                                    onReviewSpecial={reviewChatSpecialMessage}
                                    refreshingSpecialMessageID={refreshingSpecialMessageID}
                                    editing={editingID === message.id}
                                    editText={editText}
                                    setEditText={setEditText}
                                    saveEdit={saveEdit}
                                    cancelEdit={() => {setEditingID(null); setEditText("");}}
                                />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </Box>
                    <Box className="mythic-chat-composer" sx={{backgroundColor: theme.palette.background.paper}}>
                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            maxRows={8}
                            value={composer}
                            disabled={composerDisabled}
                            placeholder={composerDisabled ? disabledReason : "Message"}
                            onChange={(e) => setComposer(e.target.value)}
                            onKeyDown={(e) => {
                                if(e.nativeEvent?.isComposing){
                                    return;
                                }
                                if(e.key === "Enter" && !e.shiftKey){
                                    e.preventDefault();
                                    submitMessage();
                                }
                            }}
                            size="small"
                        />
                        {canCreateSystemMessage &&
                            <MythicStyledTooltip title="System message">
                                <span>
                                    <IconButton
                                        color="secondary"
                                        className="mythic-chat-system-button"
                                        disabled={!selectedChannel || (selectedChannel.archived && !isMythicAdmin)}
                                        onClick={() => setSystemMessageOpen(true)}
                                    >
                                        <CampaignTwoToneIcon />
                                    </IconButton>
                                </span>
                            </MythicStyledTooltip>
                        }
                        <IconButton
                            color="primary"
                            className="mythic-chat-send-button"
                            disabled={composerDisabled || composer.trim() === ""}
                            onClick={submitMessage}
                            sx={{
                                alignSelf: "center",
                                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                                borderRadius: `${theme.shape.borderRadius}px`,
                                flex: "0 0 auto",
                                height: 38,
                                width: 38,
                                "&:hover": {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                },
                            }}
                        >
                            <SendIcon />
                        </IconButton>
                    </Box>
                </Box>
            </Box>
            <ChatCreateDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreate={onCreateChannel}
                chatContainers={chatContainers}
            />
            <ChatEditChannelDialog
                open={editChannelOpen}
                channel={selectedChannel}
                chatContainers={chatContainers}
                onClose={() => setEditChannelOpen(false)}
                onSave={saveChannelDetails}
            />
            <ChatSystemMessageDialog
                open={systemMessageOpen}
                selectedChannel={selectedChannel}
                isMythicAdmin={isMythicAdmin}
                onClose={() => setSystemMessageOpen(false)}
                onSend={submitSystemMessage}
            />
            {archiveTarget &&
                <MythicConfirmDialog
                    open={Boolean(archiveTarget)}
                    title="Archive Channel?"
                    dialogText={`Archive ${channelDisplayName(archiveTarget)}? This hides the channel from the default chat list until archived channels are shown.`}
                    acceptText="Archive"
                    acceptColor="warning"
                    onClose={() => setArchiveTarget(null)}
                    onSubmit={confirmArchiveChannel}
                />
            }
            <ChatSearchDialog
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                onSearch={runChatSearch}
                searchText={searchText}
                setSearchText={setSearchText}
                searchQuery={searchQuery}
                results={searchData?.chatSearch?.results || []}
                loading={searchLoading}
                hasSearched={searchQuery !== ""}
                onSelectResult={selectSearchResult}
                viewUTCTime={currentMe?.user?.view_utc_time}
            />
            {reviewMessage && reviewSnapshot &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="md"
                    open={Boolean(reviewMessage)}
                    onClose={() => {
                        refreshChatSpecialMessage(reviewMessage).catch(() => {});
                        setReviewMessage(null);
                    }}
                    innerDialog={
                        <EventStepUserInteractionDialog
                            onClose={() => {
                                refreshChatSpecialMessage(reviewMessage).catch(() => {});
                                setReviewMessage(null);
                            }}
                            onResolved={() => refreshChatSpecialMessage(reviewMessage)}
                            selectedEventGroupInstance={reviewSnapshot.eventgroupinstance_id}
                            selectedStep={{id: reviewSnapshot.eventstepinstance_id}}
                        />}
                />
            }
        </MythicPageBody>
    );
}
