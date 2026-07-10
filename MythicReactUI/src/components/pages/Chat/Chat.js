import React, {useState} from 'react';
import {gql, useLazyQuery, useMutation, useQuery, useSubscription} from '@apollo/client';
import ReactMarkdown from 'react-markdown';
import Split from 'react-split';
import {alpha, useTheme} from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import CampaignTwoToneIcon from '@mui/icons-material/CampaignTwoTone';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import EditIcon from '@mui/icons-material/Edit';
import ForumTwoToneIcon from '@mui/icons-material/ForumTwoTone';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import SmartToyTwoToneIcon from '@mui/icons-material/SmartToyTwoTone';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {MythicPageBody} from "../../MythicComponents/MythicPageBody";
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicConfirmDialog} from "../../MythicComponents/MythicConfirmDialog";
import {MythicChatContainerIcon} from "../../MythicComponents/MythicChatContainerIcon";
import {GetMythicSetting, useSetMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import {MeContext} from "../../App";
import {snackActions} from "../../utilities/Snackbar";
import {getSkewedNow} from "../../utilities/Time";
import {markdownPlugins} from "../../utilities/Markdown";
import {markdownComponents} from "../../utilities/MarkdownComponents";
import {EventStepUserInteractionDialog} from "../Eventing/EventStepRender";
import {SettingsAPITokenDialog} from "../Settings/SettingsOperatorDialog";
import {SchemaFormRenderer, emptyValueForSchema} from "../CreatePayload/SchemaFormRenderer";
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {getIconName} from "../Callbacks/ResponseDisplayTable";
import {MythicDraggablePortal, reorder} from "../../MythicComponents/MythicDraggableList";
import {
    Draggable,
    DragDropContext,
    Droppable,
} from "@hello-pangea/dnd";
import {MythicColorSwatchInput} from "../../MythicComponents/MythicColorInput";
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {findIconDefinition} from '@fortawesome/fontawesome-svg-core';

const CHAT_MESSAGE_LIMIT = 250;
const CHAT_REQUEST_LIMIT = 50;
const CHAT_UPDATE_LIMIT = 100;
const CHAT_SPLIT_STORAGE_KEY = "chatSplitSizes";
const CHAT_SPLIT_DEFAULT_SIZES = [20, 80];
const CHAT_CHANNEL_SPLIT_STORAGE_KEY = "chatChannelSplitSizes";
const CHAT_CHANNEL_SPLIT_DEFAULT_SIZES = [52, 48];
const CHAT_DELEGATION_SPLIT_STORAGE_KEY = "chatDelegationSplitSizes";
const CHAT_DELEGATION_SPLIT_DEFAULT_SIZES = [70, 30];
const CHAT_SELECTED_CHANNEL_SETTING = "chatSelectedChannelID";
const CHAT_DIALOG_TEXT_FIELD_PROPS = {
    multiline: true,
    minRows: 1,
    maxRows: 5,
};

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
    apitokens_id
    updated_at
    apitoken {
      id
      name
      scopes
      token_type
      active
      deleted
      operator_id
      created_by
    }
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
    chat_request_id
    chat_response_key
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
    muted
    updated_at
  }
}
`;

const CHAT_READ_STATE_STREAM_SUBSCRIPTION = gql`
subscription ChatReadStateStream($now: timestamp!) {
  chat_read_state_stream(batch_size: 50, cursor: {initial_value: {updated_at: $now}, ordering: ASC}) {
    channel_id
    last_read_message_id
    muted
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

const CHAT_OPERATOR_ALIASES_QUERY = gql`
query ChatOperatorAliases {
  operator_alias(where: {active: {_eq: true}, alias_type: {_in: ["command", "generic"]}, payloadtype_id: {_is_null: true}}, order_by: {name: asc}) {
    id
    name
    alias
    alias_type
    payloadtype_id
    consuming_container_id
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
  operation_bot: operator(where: {account_type: {_eq: "bot"}, current_operation_id: {_eq: $operation_id}, active: {_eq: true}, deleted: {_eq: false}}, limit: 1, order_by: {id: asc}) {
    id
    username
    account_type
    current_operation_id
    active
    deleted
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

const CHAT_MESSAGES_UPDATED_QUERY = gql`
${CHAT_MESSAGE_FIELDS}
query ChatMessagesUpdated($channel_id: Int!, $since: timestamp!, $limit: Int!) {
  chat_message(where: {channel_id: {_eq: $channel_id}, updated_at: {_gte: $since}}, order_by: [{updated_at: asc}, {id: asc}], limit: $limit) {
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

const CHAT_REQUESTS_UPDATED_QUERY = gql`
${CHAT_REQUEST_FIELDS}
query ChatRequestsUpdated($channel_id: Int!, $since: timestamp!, $limit: Int!) {
  chat_request(where: {channel_id: {_eq: $channel_id}, updated_at: {_gte: $since}}, order_by: [{updated_at: asc}, {id: asc}], limit: $limit) {
    ...ChatRequestFields
  }
}
`;

const CREATE_CHANNEL = gql`
mutation CreateChatChannel($name: String!, $description: String, $channel_type: String, $chat_container_id: Int, $chat_model: String, $locked: Boolean, $ai_metadata: jsonb, $apitokens_id: Int) {
  chatCreateChannel(name: $name, description: $description, channel_type: $channel_type, chat_container_id: $chat_container_id, chat_model: $chat_model, locked: $locked, ai_metadata: $ai_metadata, apitokens_id: $apitokens_id) {
    status
    error
    id
    channel_id
  }
}
`;

const UPDATE_CHANNEL = gql`
mutation UpdateChatChannel($channel_id: Int!, $name: String, $description: String, $archived: Boolean, $locked: Boolean, $chat_model: String, $ai_metadata: jsonb, $apitokens_id: Int, $muted: Boolean) {
  chatUpdateChannel(channel_id: $channel_id, name: $name, description: $description, archived: $archived, locked: $locked, chat_model: $chat_model, ai_metadata: $ai_metadata, apitokens_id: $apitokens_id, muted: $muted) {
    status
    error
    channel_id
  }
}
`;

const CHAT_API_TOKENS_QUERY = gql`
query ChatAPITokens($operator_ids: [Int!]!) {
  apitokens(where: {operator_id: {_in: $operator_ids}, token_type: {_eq: "api"}, deleted: {_eq: false}, active: {_eq: true}}, order_by: [{operator_id: asc}, {id: desc}]) {
    id
    name
    scopes
    token_type
    active
    deleted
    operator_id
    created_by
    creation_time
  }
}
`;

const CREATE_API_TOKEN = gql`
mutation CreateChatAPIToken($operator_id: Int, $name: String, $scopes: [String!]) {
  createAPIToken(operator_id: $operator_id, name: $name, scopes: $scopes) {
    id
    token_value
    scopes
    token_type
    status
    error
    operator_id
    name
    created_by
    creation_time
  }
}
`;

const CREATE_MESSAGE = gql`
mutation CreateChatMessage($channel_id: Int!, $message: String!, $system_message: Boolean = false, $all_operations: Boolean = false, $delegation_id: String, $delegation_name: String) {
  chatCreateMessage(channel_id: $channel_id, message: $message, system_message: $system_message, all_operations: $all_operations, delegation_id: $delegation_id, delegation_name: $delegation_name) {
    status
    error
    message_id
    request_id
  }
}
`;

const CHAT_TOOL_OUTPUT_QUERY = gql`
query ChatToolOutput($message_id: Int!) {
  chat_message_by_pk(id: $message_id) {
    id
    tool_output
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

const INPUT_RESPONSE = gql`
mutation ChatInputResponse($message_id: Int!, $action: String!, $response: String, $choice_id: String) {
  chatInputResponse(message_id: $message_id, action: $action, response: $response, choice_id: $choice_id) {
    status
    error
    message_id
    request_id
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

const isGeneralChatChannel = (channel) => channel?.channel_type === "standard" && channel?.slug === "general";

const getStoredChatSplitSizes = () => {
    try {
        let sizes = JSON.parse(localStorage.getItem(CHAT_SPLIT_STORAGE_KEY));
        return sizes ? sizes : CHAT_SPLIT_DEFAULT_SIZES;
    } catch(error) {
        return CHAT_SPLIT_DEFAULT_SIZES;
    }
};

const getStoredChatChannelSplitSizes = () => {
    try {
        let sizes = JSON.parse(localStorage.getItem(CHAT_CHANNEL_SPLIT_STORAGE_KEY));
        return sizes ? sizes : CHAT_CHANNEL_SPLIT_DEFAULT_SIZES;
    } catch(error) {
        return CHAT_CHANNEL_SPLIT_DEFAULT_SIZES;
    }
};

const getStoredChatDelegationSplitSizes = () => {
    try {
        let sizes = JSON.parse(localStorage.getItem(CHAT_DELEGATION_SPLIT_STORAGE_KEY));
        return sizes ? sizes : CHAT_DELEGATION_SPLIT_DEFAULT_SIZES;
    } catch(error) {
        return CHAT_DELEGATION_SPLIT_DEFAULT_SIZES;
    }
};

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
        const existing = prev[currentState.channel_id] || {lastReadMessageID: 0, muted: false};
        return {
            ...prev,
            [currentState.channel_id]: {
                lastReadMessageID: Math.max(existing.lastReadMessageID || 0, currentState.last_read_message_id || 0),
                muted: Boolean(currentState.muted),
            },
        };
    }, current);
};

const getChannelReadState = (readState, channelID) => readState[channelID] || {lastReadMessageID: 0, muted: false};

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
            displayName: model.display_name || model.displayName || model.DisplayName || model.label || model.Label || modelName,
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

const normalizeSlashCommandName = (value) => `${value || ""}`.trim().replace(/^\/+/, "").toLowerCase();

const getModelSlashCommands = (model) => {
    const metadata = model?.metadata || {};
    const rawCommands = metadata.slash_commands || metadata.slashCommands || metadata.slashcommands || [];
    if(!Array.isArray(rawCommands)){
        return [];
    }
    return rawCommands.reduce((prev, command) => {
        if(typeof command === "string"){
            const name = normalizeSlashCommandName(command);
            return name ? [...prev, {name, description: "", source: "model"}] : prev;
        }
        if(command && typeof command === "object"){
            const name = normalizeSlashCommandName(command.name || command.Name || command.command || command.Command || command.slash_command || command.slashCommand);
            if(!name){
                return prev;
            }
            return [...prev, {
                name,
                description: command.description || command.Description || "",
                source: "model",
            }];
        }
        return prev;
    }, []);
};

const getAIChatSlashOptions = (channel, chatContainers, aliases) => {
    if(!channel || channel.channel_type !== "ai"){
        return [];
    }
    const modelCommands = getModelSlashCommands(modelForChannel(channel, chatContainers));
    const aliasCommands = (aliases || [])
        .filter((alias) => alias.alias_type === "command" && (alias.consuming_container_id === null || alias.consuming_container_id === channel.chat_container_id))
        .reduce((prev, alias) => {
            if(!alias.name){
                return prev;
            }
            return [...prev, {
                name: alias.name,
                description: alias.alias,
                source: "alias",
                actualCommand: alias.alias,
            }];
        }, []);
    const options = [...modelCommands, ...aliasCommands];
    return options.sort((a, b) => a.name.localeCompare(b.name));
};

const getAIChatGenericAliasOptions = (channel, aliases) => {
    if(!channel || channel.channel_type !== "ai"){
        return [];
    }
    const matchingAliases = (aliases || []).filter((alias) => (
        alias.alias_type === "generic" &&
        alias.payloadtype_id === null &&
        (alias.consuming_container_id === null || alias.consuming_container_id === channel.chat_container_id)
    ));
    const aliasesByName = {};
    [...matchingAliases].sort((a, b) => {
        const aScoped = a.consuming_container_id ? 0 : 1;
        const bScoped = b.consuming_container_id ? 0 : 1;
        return aScoped - bScoped || a.name.localeCompare(b.name);
    }).forEach((alias) => {
        if(alias.name && !aliasesByName[alias.name]){
            aliasesByName[alias.name] = alias;
        }
    });
    return Object.values(aliasesByName).sort((a, b) => a.name.localeCompare(b.name));
};

const parseComposerSlashCommand = (message) => {
    const trimmed = message.trim();
    if(!trimmed.startsWith("/")){
        return {isSlash: false, name: "", argument: ""};
    }
    const withoutSlash = trimmed.replace(/^\/+/, "");
    const [first = ""] = withoutSlash.split(/\s+/, 1);
    const name = normalizeSlashCommandName(first);
    const argument = withoutSlash.length > first.length ? withoutSlash.slice(first.length).trim() : "";
    return {isSlash: true, name, argument};
};

const getMatchingSlashOptions = (composerSlash, slashOptions) => {
    if(!composerSlash.isSlash){
        return [];
    }
    const normalizedName = composerSlash.name;
    if(normalizedName === ""){
        return slashOptions.slice(0, 8);
    }
    const startsWith = slashOptions.filter((option) => option.name.startsWith(normalizedName));
    const includes = slashOptions.filter((option) => !option.name.startsWith(normalizedName) && option.name.includes(normalizedName));
    return [...startsWith, ...includes].slice(0, 8);
};

const getGenericAliasCompletionContext = (message, cursorPosition, selectionEnd, genericAliasOptions = []) => {
    const beforeCursor = message.slice(0, cursorPosition);
    const atIndex = beforeCursor.lastIndexOf("@");
    if(atIndex < 0){
        return undefined;
    }
    const partial = beforeCursor.slice(atIndex + 1);
    if(!/^[A-Za-z0-9_-]*$/.test(partial)){
        return undefined;
    }
    const beforeAt = atIndex > 0 ? message[atIndex - 1] : "";
    if(beforeAt !== "" && /[A-Za-z0-9_-]/.test(beforeAt)){
        return undefined;
    }
    const suffixMatch = message.slice(selectionEnd).match(/^[A-Za-z0-9_-]*/);
    const end = selectionEnd + (suffixMatch ? suffixMatch[0].length : 0);
    const namePrefix = partial.toLowerCase();
    const startsWith = genericAliasOptions.filter((alias) => alias.name.startsWith(namePrefix));
    const includes = genericAliasOptions.filter((alias) => !alias.name.startsWith(namePrefix) && alias.name.includes(namePrefix));
    const matches = [...startsWith, ...includes].slice(0, 8);
    if(matches.length === 0){
        return undefined;
    }
    return {
        start: atIndex,
        end,
        matches,
    };
};

const isKnownSlashCommand = (selectedChannel, composerSlash, slashOptions) => {
    if(selectedChannel?.channel_type !== "ai"){
        return true;
    }
    if(!composerSlash.isSlash){
        return true;
    }
    if(composerSlash.name === ""){
        return false;
    }
    return slashOptions.some((option) => option.name === composerSlash.name);
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
        const jsonStringSchema = option.json_string_schema || null;
        const rawType = `${option.type || option.Type || (jsonStringSchema ? "json" : (choices.length > 0 ? "choice" : "string"))}`.toLowerCase();
        const type = rawType === "jsonstring" || rawType === "json_string" ? "json" : rawType;
        return {
            name: `${name}`,
            displayName: option.display_name || option.displayName || option.DisplayName || option.label || option.Label || `${name}`,
            description: option.description || option.Description || "",
            type: choices.length > 0 ? "choice" : type,
            required: Boolean(option.required || option.Required),
            defaultValue: option.default_value ?? option.defaultValue ?? option.DefaultValue ?? option.default ?? option.Default ?? "",
            choices,
            jsonStringSchema,
            minRows: Number(option.min_rows || option.minRows || option.MinRows || 6),
            displayAsChip: Boolean(option.display_as_chip || option.displayAsChip || option.DisplayAsChip),
        };
    }).filter((option) => option.name);
};

const parseBooleanConfigValue = (value) => {
    if(typeof value === "boolean"){
        return value;
    }
    if(typeof value === "number"){
        return value !== 0;
    }
    const text = `${value ?? ""}`.trim().toLowerCase();
    return ["1", "true", "yes", "y", "on"].includes(text);
};

const jsonTextForConfigValue = (value) => {
    if(value === undefined || value === null){
        return "";
    }
    if(typeof value === "string"){
        const trimmed = value.trim();
        if(trimmed === ""){
            return "";
        }
        try{
            return JSON.stringify(JSON.parse(trimmed), null, 2);
        }catch(error){
            return value;
        }
    }
    try{
        return JSON.stringify(value, null, 2);
    }catch(error){
        return `${value}`;
    }
};

const configValueForField = (value, option = {}) => {
    if(option.type === "boolean"){
        return parseBooleanConfigValue(value);
    }
    if(option.type === "json"){
        return typeof value === "string" ? value : jsonTextForConfigValue(value);
    }
    if(value === undefined || value === null){
        return "";
    }
    return `${value}`;
};

const buildDefaultConfigValues = (options, existing = {}) => {
    return options.reduce((prev, option) => {
        const existingValue = existing[option.name];
        prev[option.name] = configValueForField(existingValue !== undefined ? existingValue : option.defaultValue, option);
        return prev;
    }, {});
};

const parseJSONConfigValue = (rawValue) => {
    if(rawValue === undefined || rawValue === null || rawValue === ""){
        return {empty: true, value: null, error: ""};
    }
    if(typeof rawValue !== "string"){
        return {empty: false, value: rawValue, error: ""};
    }
    try{
        return {empty: false, value: JSON.parse(rawValue), error: ""};
    }catch(error){
        return {empty: false, value: null, error: error.message};
    }
};

const normalizeConfigForSubmit = (values, options) => {
    return options.reduce((prev, option) => {
        const rawValue = values[option.name];
        if(option.type === "boolean"){
            if(rawValue !== undefined && rawValue !== null){
                prev[option.name] = parseBooleanConfigValue(rawValue);
            }
            return prev;
        }
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
        if(option.type === "json"){
            const parsed = parseJSONConfigValue(rawValue);
            if(!parsed.empty && !parsed.error){
                prev[option.name] = parsed.value;
            }
            return prev;
        }
        prev[option.name] = rawValue;
        return prev;
    }, {});
};

const configHasMissingRequiredValues = (values, options) => options.some((option) => (
    option.required && option.type !== "boolean" && `${values[option.name] ?? ""}`.trim() === ""
));

const configHasInvalidValues = (values, options) => options.some((option) => {
    const rawValue = values[option.name];
    if(rawValue === undefined || rawValue === null || `${rawValue}`.trim() === ""){
        return false;
    }
    if(option.type === "number"){
        return Number.isNaN(Number(rawValue));
    }
    if(option.type === "json"){
        return Boolean(parseJSONConfigValue(rawValue).error);
    }
    return false;
});

const hasUsableJSONStringSchema = (schema) => (
    schema && typeof schema === "object" && !Array.isArray(schema) &&
    typeof schema.type === "string" && schema.type.length > 0
);

const ChatJSONConfigurationField = ({option, values, setValues}) => {
    const parsed = parseJSONConfigValue(values[option.name]);
    const rendererSchema = hasUsableJSONStringSchema(option.jsonStringSchema) ? option.jsonStringSchema : null;
    const hasVisualEditor = Boolean(rendererSchema);
    const [editorTab, setEditorTab] = React.useState(() => hasVisualEditor && !parsed.error ? "visual" : "source");
    const [visualParseError, setVisualParseError] = React.useState("");
    const sourceValue = configValueForField(values[option.name], option);
    const visualValue = hasVisualEditor && editorTab === "visual" && !parsed.error ?
        (parsed.empty ? emptyValueForSchema(rendererSchema) : parsed.value) :
        null;
    React.useEffect(() => {
        if(!hasVisualEditor && editorTab !== "source"){
            setEditorTab("source");
        }
        if(hasVisualEditor && editorTab === "visual" && parsed.error){
            setVisualParseError(parsed.error);
            setEditorTab("source");
        }
        if(!parsed.error && visualParseError !== ""){
            setVisualParseError("");
        }
    }, [editorTab, hasVisualEditor, parsed.error, visualParseError]);
    const setSourceValue = (nextValue) => {
        setValues((prev) => ({...prev, [option.name]: nextValue}));
    };
    const formatValue = () => {
        if(parsed.error || parsed.empty){
            return;
        }
        setSourceValue(JSON.stringify(parsed.value, null, 2));
    };
    const onVisualChange = (newValue) => {
        setSourceValue(JSON.stringify(newValue, null, 2));
    };
    const onSwitchToVisual = () => {
        if(!hasVisualEditor){
            return;
        }
        if(parsed.error){
            setVisualParseError(parsed.error);
            setEditorTab("source");
            return;
        }
        setVisualParseError("");
        setEditorTab("visual");
    };
    if(!hasVisualEditor){
        return (
            <Box key={option.name} sx={{display: "flex", flexDirection: "column", gap: 0.75, minWidth: 0}}>
                <TextField
                    fullWidth
                    multiline
                    minRows={Math.max(8, option.minRows || 6)}
                    size="small"
                    label={option.displayName}
                    required={option.required}
                    value={sourceValue}
                    error={Boolean(parsed.error)}
                    helperText={parsed.error || option.description}
                    onChange={(e) => setSourceValue(e.target.value)}
                    inputProps={{spellCheck: "false"}}
                />
                <Box sx={{display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75}}>
                    <Button size="small" variant="outlined" onClick={formatValue} disabled={parsed.empty || Boolean(parsed.error)}>
                        Format JSON
                    </Button>
                </Box>
            </Box>
        );
    }

    return (
        <Box
            key={option.name}
            className="mythic-dialog-section"
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
                minWidth: 0,
                p: 1,
            }}
        >
            <Box sx={{alignItems: "flex-start", display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: "space-between", minWidth: 0}}>
                <Box sx={{display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0}}>
                    <Typography component="div" className="mythic-dialog-section-title">
                        {option.displayName}
                    </Typography>
                    {option.description &&
                        <Typography component="div" className="mythic-dialog-section-description">
                            {option.description}
                        </Typography>
                    }
                </Box>
                <Tabs
                    value={editorTab}
                    onChange={(event, nextTab) => {
                        if(nextTab === "visual"){
                            onSwitchToVisual();
                        }else{
                            setEditorTab("source");
                        }
                    }}
                    style={{minHeight: "32px"}}
                    TabIndicatorProps={{style: {height: "2px"}}}
                >
                    <Tab value="visual" label="Visual" style={{minHeight: "32px", textTransform: "none"}} />
                    <Tab value="source" label="Source" style={{minHeight: "32px", textTransform: "none"}} />
                </Tabs>
            </Box>
            {editorTab === "visual" && visualValue !== null &&
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.75,
                        minWidth: 0,
                    }}
                >
                    <SchemaFormRenderer
                        schema={rendererSchema}
                        value={visualValue}
                        onChange={onVisualChange}
                    />
                </Box>
            }
            {editorTab === "source" &&
                <Box sx={{display: "flex", flexDirection: "column", gap: 0.75, minWidth: 0}}>
                    {visualParseError !== "" &&
                        <Typography component="div" color="error" className="mythic-form-field-description">
                            Visual tab unavailable: {visualParseError}
                        </Typography>
                    }
                    <TextField
                        fullWidth
                        multiline
                        minRows={Math.max(8, option.minRows || 6)}
                        size="small"
                        label="Source"
                        required={option.required}
                        value={sourceValue}
                        error={Boolean(parsed.error)}
                        helperText={parsed.error || ""}
                        onChange={(e) => setSourceValue(e.target.value)}
                        inputProps={{spellCheck: "false"}}
                    />
                    <Box sx={{display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75}}>
                        <Button size="small" variant="outlined" onClick={formatValue} disabled={parsed.empty || Boolean(parsed.error)}>
                            Format JSON
                        </Button>
                    </Box>
                </Box>
            }
        </Box>
    );
};

const AI_CHAT_REQUIRED_TOKEN_SCOPES = ["apitoken.write", "chat-ai.write"];

const tokenHasScope = (token, scope) => {
    const scopes = token?.scopes || [];
    if(scopes.includes("*") || scopes.includes(scope)){
        return true;
    }
    const resource = scope.split(".")[0];
    return scopes.includes(`${resource}.*`);
};

const tokenMeetsAIChatRequirements = (token) => AI_CHAT_REQUIRED_TOKEN_SCOPES.every((scope) => tokenHasScope(token, scope));

const formatTokenLabel = (token) => {
    if(!token){
        return "";
    }
    const status = token.active && !token.deleted ? "" : " inactive";
    return `${token.name || `Token ${token.id}`} (#${token.id})${status}`;
};

const tokenOwnerLabel = (owner) => {
    if(!owner){
        return "";
    }
    return owner.accountType === "bot" ? `Operation bot (${owner.username})` : `Current user (${owner.username})`;
};

const applyConfigToMetadata = (metadata, config) => ({
    ...parseJSONLikeObject(metadata),
    config,
});

const getChannelMetadataItems = (channel) => {
    const metadata = getChannelAIMetadata(channel);
    const channelMetadata = parseJSONLikeObject(metadata.channel_metadata);
    return Array.isArray(channelMetadata.items) ? channelMetadata.items : [];
};

const getChannelMetadataDefaultDisplayString = (channel) => {
    const metadata = getChannelAIMetadata(channel);
    const channelMetadata = parseJSONLikeObject(metadata.channel_metadata);
    return typeof channelMetadata.default_display === "string" ? channelMetadata.default_display :
        typeof channelMetadata.display === "string" ? channelMetadata.display :
            "";
};

const getChannelMetadataDisplayString = (channel) => {
    const metadata = getChannelAIMetadata(channel);
    const display = parseJSONLikeObject(metadata.channel_metadata_display);
    return typeof display.display === "string" ? display.display : "";
};

const getEffectiveChannelMetadataDisplayString = (channel, displayStringOverride) => {
    const userDisplayString = displayStringOverride === undefined ? getChannelMetadataDisplayString(channel) : `${displayStringOverride || ""}`;
    return userDisplayString.trim() === "" ? getChannelMetadataDefaultDisplayString(channel) : userDisplayString;
};

const applyMetadataDisplayToMetadata = (metadata, displayString) => {
    const nextMetadata = parseJSONLikeObject(metadata);
    const trimmedDisplay = `${displayString || ""}`.trim();
    if(trimmedDisplay === ""){
        delete nextMetadata.channel_metadata_display;
    } else {
        nextMetadata.channel_metadata_display = {
            ...parseJSONLikeObject(nextMetadata.channel_metadata_display),
            display: trimmedDisplay,
        };
    }
    return nextMetadata;
};

const isChipEligibleConfigOption = (option) => (
    Boolean(option.displayAsChip) && ["string", "number", "boolean", "choice"].includes(option.type)
);

const formatConfigChipValue = (option, rawValue) => {
    if(option.type === "boolean"){
        return parseBooleanConfigValue(rawValue) ? "Yes" : "No";
    }
    if(option.type === "choice"){
        const choice = option.choices.find((item) => `${item.value}` === `${rawValue}`);
        return choice?.label || `${rawValue ?? ""}`;
    }
    return `${rawValue ?? ""}`;
};

const getChannelConfigChips = (channel, chatContainers) => {
    if(!channel || channel.channel_type !== "ai"){
        return [];
    }
    const model = modelForChannel(channel, chatContainers || []);
    const config = getChannelAIConfig(channel);
    return getModelConfigOptions(model)
        .filter(isChipEligibleConfigOption)
        .reduce((chips, option) => {
            const rawValue = config[option.name];
            if(rawValue === undefined || rawValue === null || `${rawValue}`.trim() === ""){
                return chips;
            }
            return [...chips, {
                key: `config:${option.name}`,
                label: option.displayName || option.name,
                value: formatConfigChipValue(option, rawValue),
                tooltip: option.description,
                color: "neutral",
            }];
        }, []);
};

const getChannelModelChip = (channel, chatContainers) => {
    if(!channel || channel.channel_type !== "ai" || !channel.chat_model){
        return null;
    }
    const model = modelForChannel(channel, chatContainers || []);
    return {
        key: "model",
        label: "Model",
        value: model?.displayName || channel.chat_model,
        tooltip: model?.description || "Selected chat container model.",
        color: "neutral",
    };
};

const getChannelListChips = (channel, chatContainers) => {
    const modelChip = getChannelModelChip(channel, chatContainers);
    const configChips = getChannelConfigChips(channel, chatContainers);
    return modelChip ? [modelChip, ...configChips] : configChips;
};

const metadataDisplayKeyPattern = /^[A-Za-z0-9_.-]+$/;
const metadataDisplayColorPattern = /^(neutral|info|success|warning|error|danger|#[0-9a-fA-F]{6})$/;
const metadataScaleColorPattern = /^scale\((.+)\)$/i;

const normalizeChipColor = (color) => {
    const text = `${color || ""}`.trim();
    if(text === ""){
        return "";
    }
    return metadataDisplayColorPattern.test(text) ? text.toLowerCase() : "";
};

const parseMetadataScaleColor = (rawColor) => {
    const match = `${rawColor || ""}`.trim().match(metadataScaleColorPattern);
    if(!match){
        return null;
    }
    const stops = match[1].split("|").map((rawStop) => {
        const [rawAt, ...rawColorParts] = rawStop.split(":");
        const at = Number(`${rawAt || ""}`.trim());
        const color = normalizeChipColor(rawColorParts.join(":"));
        if(Number.isNaN(at) || color === ""){
            return null;
        }
        return {at, color};
    }).filter(Boolean).sort((a, b) => a.at - b.at);
    return stops.length > 0 ? {type: "scale", source: "value", stops} : null;
};

const parseMetadataColorValue = (rawColor) => {
    const text = `${rawColor || ""}`.trim();
    if(text === ""){
        return {color: "", warning: ""};
    }
    const scaleColor = parseMetadataScaleColor(text);
    if(scaleColor){
        return {color: scaleColor, warning: ""};
    }
    const color = normalizeChipColor(text);
    if(color){
        return {color, warning: ""};
    }
    return {color: "", warning: `Invalid color "${text}"`};
};

const parseMetadataDisplayItem = (rawItem) => {
    const text = `${rawItem || ""}`.trim();
    if(text === ""){
        return {item: null, warning: ""};
    }
    const equalIndex = text.indexOf("=");
    const label = equalIndex >= 0 ? text.slice(0, equalIndex).trim() : "";
    const keyAndFormat = equalIndex >= 0 ? text.slice(equalIndex + 1).trim() : text;
    if(equalIndex >= 0 && label === ""){
        return {item: null, warning: `Missing label in "${text}"`};
    }
    const formatIndex = keyAndFormat.lastIndexOf(":");
    const key = (formatIndex >= 0 ? keyAndFormat.slice(0, formatIndex) : keyAndFormat).trim();
    const format = formatIndex >= 0 ? keyAndFormat.slice(formatIndex + 1).trim() : "";
    if(!metadataDisplayKeyPattern.test(key)){
        return {item: null, warning: `Invalid metadata key "${key || text}"`};
    }
    if(format && !metadataDisplayKeyPattern.test(format)){
        return {item: null, warning: `Invalid format "${format}" for ${key}`};
    }
    return {
        item: {
            key,
            label: label || "",
            format: format || "",
        },
        warning: "",
    };
};

const parseMetadataDisplayItems = (text) => {
    const warnings = [];
    const items = `${text || ""}`.split(",").reduce((prev, rawItem) => {
        const parsed = parseMetadataDisplayItem(rawItem);
        if(parsed.warning){
            warnings.push(parsed.warning);
        }
        return parsed.item ? [...prev, parsed.item] : prev;
    }, []);
    return {items, warnings};
};

const parseMetadataDisplayColors = (text) => {
    const warnings = [];
    const colors = {};
    `${text || ""}`.split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => {
        const equalIndex = item.indexOf("=");
        if(equalIndex <= 0){
            warnings.push(`Invalid color rule "${item}"`);
            return;
        }
        const key = item.slice(0, equalIndex).trim();
        const rawColor = item.slice(equalIndex + 1).trim();
        if(!metadataDisplayKeyPattern.test(key)){
            warnings.push(`Invalid color metadata key "${key}"`);
            return;
        }
        const parsedColor = parseMetadataColorValue(rawColor);
        if(parsedColor.warning){
            warnings.push(`${parsedColor.warning} for ${key}`);
            return;
        }
        if(parsedColor.color){
            colors[key] = parsedColor.color;
        }
    });
    return {colors, warnings};
};

const parseMetadataDisplayString = (displayString) => {
    const display = `${displayString || ""}`.trim();
    const result = {
        collapsed: null,
        maxVisible: null,
        items: [],
        hidden: [],
        colors: {},
        warnings: [],
    };
    if(display === ""){
        return result;
    }
    const segments = display.split(";").map((segment) => segment.trim()).filter(Boolean);
    const hasChipsDirective = segments.some((segment) => segment.toLowerCase().startsWith("chips:"));
    segments.forEach((segment, index) => {
        const lowerSegment = segment.toLowerCase();
        if(lowerSegment === "collapsed"){
            result.collapsed = true;
            return;
        }
        if(lowerSegment === "expanded"){
            result.collapsed = false;
            return;
        }
        if(lowerSegment.startsWith("max=")){
            const maxVisible = Number(segment.slice(segment.indexOf("=") + 1).trim());
            if(Number.isInteger(maxVisible) && maxVisible > 0){
                result.maxVisible = maxVisible;
            } else {
                result.warnings.push(`Invalid max value in "${segment}"`);
            }
            return;
        }
        if(lowerSegment.startsWith("chips:")){
            const parsed = parseMetadataDisplayItems(segment.slice(segment.indexOf(":") + 1));
            result.items = parsed.items;
            result.warnings.push(...parsed.warnings);
            return;
        }
        if(lowerSegment.startsWith("hide:")){
            const hidden = segment.slice(segment.indexOf(":") + 1).split(",").map((item) => item.trim()).filter(Boolean);
            const validHidden = hidden.filter((item) => metadataDisplayKeyPattern.test(item));
            const invalidHidden = hidden.filter((item) => !metadataDisplayKeyPattern.test(item));
            result.hidden = validHidden;
            invalidHidden.forEach((item) => result.warnings.push(`Invalid hidden metadata key "${item}"`));
            return;
        }
        if(lowerSegment.startsWith("colors:")){
            const parsed = parseMetadataDisplayColors(segment.slice(segment.indexOf(":") + 1));
            result.colors = parsed.colors;
            result.warnings.push(...parsed.warnings);
            return;
        }
        if(!hasChipsDirective && index === 0){
            const parsed = parseMetadataDisplayItems(segment);
            result.items = parsed.items;
            result.warnings.push(...parsed.warnings);
            return;
        }
        result.warnings.push(`Unknown display segment "${segment}"`);
    });
    return result;
};

const normalizeMetadataItem = (item) => {
    if(!item || typeof item !== "object"){
        return null;
    }
    const key = `${item.key || item.name || ""}`.trim();
    if(!metadataDisplayKeyPattern.test(key)){
        return null;
    }
    return {
        key,
        label: item.label || item.display_name || item.displayName || key,
        value: item.value,
        displayValue: item.display_value ?? item.displayValue,
        format: item.format || "",
        color: item.color || "",
        click: `${item.click || ""}`.trim(),
        clickConfirmationText: item.click_confirmation_text || item.clickConfirmationText || "",
        tooltip: item.tooltip || item.description || "",
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : 1000,
    };
};

const formatMetadataValue = (item) => {
    if(item.displayValue !== undefined && item.displayValue !== null && `${item.displayValue}` !== ""){
        return `${item.displayValue}`;
    }
    const value = item.value;
    if(value === undefined || value === null){
        return "";
    }
    if(item.format === "percent"){
        const numberValue = Number(value);
        if(!Number.isNaN(numberValue)){
            return `${numberValue <= 1 ? Math.round(numberValue * 100) : numberValue}%`;
        }
    }
    if(item.format === "currency"){
        const numberValue = Number(value);
        if(!Number.isNaN(numberValue)){
            return new Intl.NumberFormat(undefined, {style: "currency", currency: "USD", maximumFractionDigits: 2}).format(numberValue);
        }
    }
    if(item.format === "number"){
        const numberValue = Number(value);
        if(!Number.isNaN(numberValue)){
            return new Intl.NumberFormat().format(numberValue);
        }
    }
    if(typeof value === "boolean"){
        return value ? "Yes" : "No";
    }
    return `${value}`;
};

const colorValueToString = (color) => {
    if(!color){
        return "";
    }
    if(typeof color === "string"){
        return color;
    }
    if(color.type === "scale" && Array.isArray(color.stops)){
        return `scale(${color.stops.map((stop) => `${stop.at}:${stop.color}`).join("|")})`;
    }
    return "";
};

const resolveScaledChipColor = (color, item) => {
    if(!color || color.type !== "scale" || !Array.isArray(color.stops)){
        return "";
    }
    const sourceValue = color.source && color.source !== "value" ? item[color.source] : item.value;
    const value = Number(sourceValue);
    if(Number.isNaN(value)){
        return "";
    }
    const sortedStops = color.stops
        .map((stop) => ({at: Number(stop.at), color: normalizeChipColor(stop.color)}))
        .filter((stop) => !Number.isNaN(stop.at) && stop.color)
        .sort((a, b) => a.at - b.at);
    if(sortedStops.length === 0){
        return "";
    }
    return sortedStops.reduce((selectedColor, stop) => value >= stop.at ? stop.color : selectedColor, sortedStops[0].color);
};

const resolveMetadataChipColor = (item, colorOverride) => {
    const selectedColor = colorOverride || item.color || "neutral";
    const color = typeof selectedColor === "string" ? normalizeChipColor(selectedColor) : resolveScaledChipColor(selectedColor, item);
    return color || "neutral";
};

const chipColorStyle = (color) => {
    if(typeof color === "string" && color.startsWith("#")){
        return {
            "--mythic-chat-chip-custom-color": color,
            "--mythic-chat-chip-custom-border": alpha(color, 0.42),
            "--mythic-chat-chip-custom-bg": alpha(color, 0.14),
        };
    }
    return undefined;
};

const normalizeMetadataClickCommand = (click) => {
    const command = `${click || ""}`.trim();
    if(command === ""){
        return "";
    }
    return command.startsWith("/") ? command : `/${command}`;
};

const buildChannelMetadataChips = (channel, displayStringOverride) => {
    const displayString = getEffectiveChannelMetadataDisplayString(channel, displayStringOverride);
    const parsedDisplay = parseMetadataDisplayString(displayString);
    const hidden = new Set(parsedDisplay.hidden);
    const metadataItemsByKey = new Map();
    getChannelMetadataItems(channel).map(normalizeMetadataItem).filter(Boolean).forEach((item) => {
        if(!hidden.has(item.key)){
            metadataItemsByKey.set(item.key, item);
        }
    });
    const orderedKeys = new Set();
    const orderedItems = parsedDisplay.items.reduce((prev, override) => {
        const item = metadataItemsByKey.get(override.key);
        if(!item){
            return prev;
        }
        orderedKeys.add(override.key);
        return [...prev, {
            ...item,
            label: override.label || item.label,
            format: override.format || item.format,
        }];
    }, []);
    const remainingItems = [...metadataItemsByKey.values()]
        .filter((item) => !orderedKeys.has(item.key))
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
    const chips = [...orderedItems, ...remainingItems]
        .map((item) => {
            const color = resolveMetadataChipColor(item, parsedDisplay.colors[item.key]);
            return {
                key: item.key,
                label: item.label,
                value: formatMetadataValue(item),
                color: color.startsWith("#") ? "custom" : color,
                click: normalizeMetadataClickCommand(item.click),
                clickConfirmationText: item.clickConfirmationText,
                tooltip: item.tooltip,
                colorStyle: chipColorStyle(color),
            };
        })
        .filter((item) => item.value !== "");
    return {
        chips,
        collapsed: parsedDisplay.collapsed === null ? false : parsedDisplay.collapsed,
        maxVisible: parsedDisplay.maxVisible || 6,
        warnings: parsedDisplay.warnings,
    };
};

const getAvailableChannelMetadataKeys = (channel) => (
    getChannelMetadataItems(channel)
        .map(normalizeMetadataItem)
        .filter(Boolean)
        .map((item) => item.key)
        .filter((key, index, keys) => keys.indexOf(key) === index)
);

const getAvailableChannelMetadataItems = (channel) => (
    getChannelMetadataItems(channel)
        .map(normalizeMetadataItem)
        .filter(Boolean)
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
);

const metadataDisplayExample = "expanded; max=6; chips: 5hr=five_hour_tokens, Cost=total_cost:currency; colors: total_cost=warning";
const metadataNamedColorOptions = ["neutral", "info", "success", "warning", "error", "danger"];
const metadataDefaultScaleStops = [
    {at: 0, color: "success"},
    {at: 75, color: "warning"},
    {at: 90, color: "error"},
];

const sanitizeMetadataDisplayLabel = (label) => `${label || ""}`.replace(/[,;=]/g, " ").trim();

const metadataDisplayItemToString = (row) => {
    const key = `${row.key || ""}`.trim();
    const label = sanitizeMetadataDisplayLabel(row.labelOverride);
    const format = `${row.formatOverride || ""}`.trim();
    if(key === ""){
        return "";
    }
    const labelPrefix = label ? `${label}=` : "";
    return `${labelPrefix}${key}${format ? `:${format}` : ""}`;
};

const metadataWizardRowsFromDisplay = (channel, displayString) => {
    const parsed = parseMetadataDisplayString(displayString);
    const hidden = new Set(parsed.hidden);
    const ordered = new Map(parsed.items.map((item, index) => [item.key, {...item, index}]));
    const rowsByKey = new Map();
    getAvailableChannelMetadataItems(channel).forEach((item, index) => {
        const override = ordered.get(item.key);
        rowsByKey.set(item.key, {
            key: item.key,
            baseLabel: item.label,
            labelOverride: override?.label || "",
            formatOverride: override?.format || "",
            visible: !hidden.has(item.key),
            order: override ? override.index + 1 : index + 1 + parsed.items.length,
            colorOverride: colorValueToString(parsed.colors[item.key]),
            value: formatMetadataValue(item),
            format: item.format,
            color: colorValueToString(item.color),
            click: item.click,
            clickConfirmationText: item.clickConfirmationText,
            tooltip: item.tooltip,
        });
    });
    parsed.items.forEach((item, index) => {
        if(rowsByKey.has(item.key)){
            return;
        }
        rowsByKey.set(item.key, {
            key: item.key,
            baseLabel: item.key,
            labelOverride: item.label || "",
            formatOverride: item.format || "",
            visible: !hidden.has(item.key),
            order: index + 1,
            colorOverride: colorValueToString(parsed.colors[item.key]),
            value: "",
            format: "",
            color: "",
            tooltip: "Custom key from the current display string. This container has not reported metadata details for it yet.",
        });
    });
    parsed.hidden.forEach((key, index) => {
        if(rowsByKey.has(key)){
            return;
        }
        rowsByKey.set(key, {
            key,
            baseLabel: key,
            labelOverride: "",
            formatOverride: "",
            visible: false,
            order: rowsByKey.size + index + 1,
            colorOverride: colorValueToString(parsed.colors[key]),
            value: "",
            format: "",
            color: "",
            tooltip: "Hidden custom key from the current display string.",
        });
    });
    Object.entries(parsed.colors).forEach(([key, color]) => {
        if(rowsByKey.has(key)){
            return;
        }
        rowsByKey.set(key, {
            key,
            baseLabel: key,
            labelOverride: "",
            formatOverride: "",
            visible: true,
            order: rowsByKey.size + 1,
            colorOverride: colorValueToString(color),
            value: "",
            format: "",
            color: "",
            tooltip: "Custom color key from the current display string.",
        });
    });
    return [...rowsByKey.values()].sort((a, b) => Number(a.order) - Number(b.order) || a.key.localeCompare(b.key));
};

const buildMetadataDisplayStringFromWizard = (rows, hiddenInitially, maxVisible) => {
    const max = Number(maxVisible);
    const visibleRows = rows.filter((row) => row.visible);
    const hiddenRows = rows.filter((row) => !row.visible);
    const segments = [
        hiddenInitially ? "collapsed" : "expanded",
        `max=${Number.isInteger(max) && max > 0 ? max : 6}`,
    ];
    if(visibleRows.length > 0){
        segments.push(`chips: ${visibleRows.map(metadataDisplayItemToString).filter(Boolean).join(", ")}`);
    }
    if(hiddenRows.length > 0){
        segments.push(`hide: ${hiddenRows.map((row) => row.key).filter(Boolean).join(", ")}`);
    }
    const colorRules = rows
        .map((row) => ({key: row.key, color: `${row.colorOverride || ""}`.trim()}))
        .filter((row) => row.key && row.color)
        .map((row) => `${row.key}=${row.color}`);
    if(colorRules.length > 0){
        segments.push(`colors: ${colorRules.join(", ")}`);
    }
    return segments.join("; ");
};

const metadataColorEditorStateFromString = (colorValue) => {
    const text = `${colorValue || ""}`.trim();
    if(text === ""){
        return {mode: "default", named: "neutral", custom: "#4f46e5", scaleStops: metadataDefaultScaleStops};
    }
    const scale = parseMetadataScaleColor(text);
    if(scale){
        return {
            mode: "scale",
            named: "neutral",
            custom: "#4f46e5",
            scaleStops: scale.stops.length > 0 ? scale.stops : metadataDefaultScaleStops,
        };
    }
    if(text.startsWith("#")){
        return {mode: "custom", named: "neutral", custom: normalizeChipColor(text) || "#4f46e5", scaleStops: metadataDefaultScaleStops};
    }
    return {mode: "named", named: normalizeChipColor(text) || "neutral", custom: "#4f46e5", scaleStops: metadataDefaultScaleStops};
};

const metadataColorEditorStringFromState = (state) => {
    if(state.mode === "default"){
        return "";
    }
    if(state.mode === "custom"){
        return normalizeChipColor(state.custom) || "";
    }
    if(state.mode === "scale"){
        const stops = (state.scaleStops || [])
            .map((stop) => ({at: Number(stop.at), color: normalizeChipColor(stop.color)}))
            .filter((stop) => !Number.isNaN(stop.at) && stop.color)
            .sort((a, b) => a.at - b.at);
        if(stops.length === 0){
            return "";
        }
        return `scale(${stops.map((stop) => `${stop.at}:${stop.color}`).join("|")})`;
    }
    return normalizeChipColor(state.named) || "";
};

const ChatMetadataColorEditor = ({value, fallback, onChange}) => {
    const state = React.useMemo(() => metadataColorEditorStateFromString(value), [value]);
    const updateState = (updates) => {
        onChange(metadataColorEditorStringFromState({...state, ...updates}));
    };
    const updateScaleStop = (index, updates) => {
        updateState({
            mode: "scale",
            scaleStops: state.scaleStops.map((stop, stopIndex) => stopIndex === index ? {...stop, ...updates} : stop),
        });
    };
    const addScaleStop = () => {
        const stops = state.scaleStops.length > 0 ? state.scaleStops : metadataDefaultScaleStops;
        const lastAt = stops.reduce((max, stop) => Math.max(max, Number(stop.at) || 0), 0);
        updateState({
            mode: "scale",
            scaleStops: [...stops, {at: lastAt + 10, color: "error"}],
        });
    };
    const removeScaleStop = (index) => {
        const nextStops = state.scaleStops.filter((_, stopIndex) => stopIndex !== index);
        updateState({
            mode: "scale",
            scaleStops: nextStops.length > 0 ? nextStops : metadataDefaultScaleStops,
        });
    };
    return (
        <Box className="mythic-chat-metadata-color-editor">
            <Select
                size="small"
                value={state.mode}
                onChange={(e) => updateState({mode: e.target.value})}
                fullWidth
            >
                <MenuItem value="default">Container default{fallback ? ` (${fallback})` : ""}</MenuItem>
                <MenuItem value="named">Named color</MenuItem>
                <MenuItem value="custom">Custom color</MenuItem>
                <MenuItem value="scale">Scale cutoffs</MenuItem>
            </Select>
            {state.mode === "named" &&
                <Select
                    size="small"
                    value={state.named}
                    onChange={(e) => updateState({named: e.target.value})}
                    fullWidth
                >
                    {metadataNamedColorOptions.map((color) => <MenuItem value={color} key={`metadata-color-${color}`}>{color}</MenuItem>)}
                </Select>
            }
            {state.mode === "custom" &&
                <MythicColorSwatchInput
                    color={state.custom}
                    label="Custom chip color"
                    onChange={(color) => updateState({custom: color})}
                    inputWidth="110px"
                    sx={{width: "100%"}}
                />
            }
            {state.mode === "scale" &&
                <Box className="mythic-chat-metadata-color-scale">
                    <Box className="mythic-chat-metadata-color-scale-header">
                        <Typography variant="caption" color="text.secondary">
                            Apply the last color whose cutoff is at or below the value.
                        </Typography>
                        <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={addScaleStop}>
                            Add cutoff
                        </Button>
                    </Box>
                    {state.scaleStops.map((stop, index) => (
                        <Box className="mythic-chat-metadata-color-scale-row" key={`scale-stop-${index}`}>
                            <TextField
                                size="small"
                                label="At least"
                                type="number"
                                value={stop.at}
                                onChange={(e) => updateScaleStop(index, {at: e.target.value})}
                            />
                            <Select
                                size="small"
                                value={stop.color}
                                onChange={(e) => updateScaleStop(index, {color: e.target.value})}
                            >
                                {metadataNamedColorOptions.map((color) => <MenuItem value={color} key={`scale-${index}-${color}`}>{color}</MenuItem>)}
                            </Select>
                            <IconButton
                                aria-label="Remove cutoff"
                                className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger"
                                size="small"
                                onClick={() => removeScaleStop(index)}
                                disabled={state.scaleStops.length <= 1}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                </Box>
            }
        </Box>
    );
};

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
                if(option.type === "boolean"){
                    return (
                        <Box key={option.name}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(values[option.name])}
                                        onChange={(e) => setValues((prev) => ({...prev, [option.name]: e.target.checked}))}
                                    />
                                }
                                label={option.displayName}
                            />
                            {option.description &&
                                <Typography variant="caption" color="text.secondary" sx={{display: "block", mt: -0.75}}>
                                    {option.description}
                                </Typography>
                            }
                        </Box>
                    );
                }
                if(option.type === "json"){
                    return <ChatJSONConfigurationField key={option.name} option={option} values={values} setValues={setValues} />;
                }
                return (
                    <TextField
                        key={option.name}
                        fullWidth
                        size="small"
                        type={option.type === "number" ? "number" : "text"}
                        label={option.displayName}
                        required={option.required}
                        value={configValueForField(values[option.name], option)}
                        helperText={option.description}
                        multiline={option.type !== "number"}
                        minRows={option.type !== "number" ? 1 : undefined}
                        maxRows={option.type !== "number" ? 5 : undefined}
                        onChange={(e) => setValues((prev) => ({...prev, [option.name]: e.target.value}))}
                    />
                );
            })}
        </Box>
    );
};

const ChatAPITokenSelector = ({value, setValue, currentToken, currentUser, operationBot}) => {
    const [openCreateToken, setOpenCreateToken] = React.useState(false);
    const [localTokens, setLocalTokens] = React.useState([]);
    const ownerOptions = React.useMemo(() => {
        const owners = [];
        if(currentUser?.id){
            owners.push({
                id: currentUser.id,
                username: currentUser.username || `Operator ${currentUser.id}`,
                accountType: "user",
            });
        }
        if(operationBot?.id && !owners.some((owner) => owner.id === operationBot.id)){
            owners.push({
                id: operationBot.id,
                username: operationBot.username || `Operator ${operationBot.id}`,
                accountType: "bot",
            });
        }
        return owners;
    }, [currentUser?.id, currentUser?.username, operationBot?.id, operationBot?.username]);
    const ownerIDs = React.useMemo(() => ownerOptions.map((owner) => owner.id), [ownerOptions]);
    const ownerIDKey = React.useMemo(() => ownerIDs.join(","), [ownerIDs]);
    const [tokenOwnerID, setTokenOwnerID] = React.useState("");
    const {data, loading} = useQuery(CHAT_API_TOKENS_QUERY, {
        variables: {operator_ids: ownerIDs.length > 0 ? ownerIDs : [0]},
        skip: ownerIDs.length === 0,
        fetchPolicy: "no-cache",
    });
    React.useEffect(() => {
        setLocalTokens([]);
    }, [ownerIDKey]);
    React.useEffect(() => {
        if(data?.apitokens){
            setLocalTokens(data.apitokens);
        }
    }, [data]);
    React.useEffect(() => {
        if(currentToken?.operator_id && ownerOptions.some((owner) => owner.id === currentToken.operator_id)){
            setTokenOwnerID(currentToken.operator_id);
            return;
        }
        setTokenOwnerID((previousOwnerID) => (
            ownerOptions.length > 0 && !ownerOptions.some((owner) => `${owner.id}` === `${previousOwnerID}`) ?
                ownerOptions[0].id :
                previousOwnerID
        ));
    }, [currentToken?.id, currentToken?.operator_id, ownerOptions]);
    const selectedOwner = ownerOptions.find((owner) => `${owner.id}` === `${tokenOwnerID}`) || null;
    const tokens = React.useMemo(() => {
        const combined = localTokens.filter((token) => `${token.operator_id}` === `${tokenOwnerID}`);
        if(currentToken?.id && `${currentToken.operator_id}` === `${tokenOwnerID}` && !combined.some((token) => token.id === currentToken.id)){
            combined.unshift(currentToken);
        }
        if(value && !combined.some((token) => `${token.id}` === `${value}`)){
            combined.unshift({id: value, name: `Token ${value}`, scopes: [], active: true, deleted: false, operator_id: tokenOwnerID});
        }
        return combined;
    }, [localTokens, currentToken, value, tokenOwnerID]);
    const selectedToken = tokens.find((token) => `${token.id}` === `${value}`) || null;
    const createTokenInitialScopes = React.useMemo(() => selectedToken?.scopes || [], [selectedToken]);
    const [createAPIToken] = useMutation(CREATE_API_TOKEN, {
        onCompleted: (result) => {
            if(result.createAPIToken.status === "success"){
                const {token_value, ...createdToken} = result.createAPIToken;
                setLocalTokens((prev) => [{...createdToken, active: true, deleted: false}, ...prev]);
                setTokenOwnerID(createdToken.operator_id);
                setValue(createdToken.id);
                snackActions.success("Created and selected API token");
                setOpenCreateToken(false);
            }else{
                snackActions.error(result.createAPIToken.error);
            }
        },
        onError: (error) => snackActions.error(error.message),
    });
    const createToken = (name, scopes) => {
        createAPIToken({variables: {operator_id: selectedOwner?.id, name, scopes}});
    };
    const changeTokenOwner = (event) => {
        setTokenOwnerID(Number(event.target.value));
        setValue("");
    };
    const tokenSelectorDisabled = !selectedOwner;
    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 1}}>
            <Box sx={{border: `1px solid ${alpha("#ffffff", 0.12)}`, borderRadius: 1, p: 1.25}}>
                <Typography variant="subtitle2">AI Chat API Token</Typography>
                <Typography variant="caption" color="text.secondary" sx={{display: "block", mt: 0.5}}>
                    AI chat can use a token for your operator account or the operation bot{operationBot?.username ? ` (${operationBot.username})` : ""}. The token must include apitoken.write to generate scoped Mythic API tokens and chat-ai.write to stream responses back to this channel.
                </Typography>
                <Box sx={{display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1}}>
                    {AI_CHAT_REQUIRED_TOKEN_SCOPES.map((scope) => (
                        <Chip key={scope} size="small" label={scope} color={selectedToken && tokenHasScope(selectedToken, scope) ? "success" : "warning"} />
                    ))}
                </Box>
            </Box>
            <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "minmax(160px, 0.55fr) minmax(220px, 1fr) auto"}, gap: 1, alignItems: "stretch"}}>
                <FormControl size="small" fullWidth required>
                    <InputLabel>Owner</InputLabel>
                    <Select
                        label="Owner"
                        value={tokenOwnerID ? `${tokenOwnerID}` : ""}
                        disabled={ownerOptions.length === 0}
                        onChange={changeTokenOwner}
                    >
                        {ownerOptions.length === 0 &&
                            <MenuItem value="" disabled>No token owners available</MenuItem>
                        }
                        {ownerOptions.map((owner) => (
                            <MenuItem value={`${owner.id}`} key={`chat-token-owner-${owner.id}`}>
                                {tokenOwnerLabel(owner)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" fullWidth required>
                    <InputLabel>API Token</InputLabel>
                    <Select
                        label="API Token"
                        value={value ? `${value}` : ""}
                        disabled={tokenSelectorDisabled}
                        onChange={(event) => setValue(Number(event.target.value))}
                    >
                        {!selectedOwner &&
                            <MenuItem value="" disabled>Select a token owner first</MenuItem>
                        }
                        {tokens.length === 0 &&
                            <MenuItem value="" disabled>{loading ? "Loading API tokens..." : "No active API tokens available"}</MenuItem>
                        }
                        {tokens.map((token) => (
                            <MenuItem value={`${token.id}`} key={`chat-token-${token.id}`}>
                                <Box sx={{display: "flex", flexDirection: "column", py: 0.25}}>
                                    <Typography variant="body2">{formatTokenLabel(token)}</Typography>
                                    <Typography variant="caption" color={tokenMeetsAIChatRequirements(token) ? "text.secondary" : "warning.main"} sx={{whiteSpace: "normal"}}>
                                        {(token.scopes || []).join(", ") || "No scopes"}
                                    </Typography>
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    variant="outlined"
                    size="small"
                    disabled={tokenSelectorDisabled}
                    onClick={() => setOpenCreateToken(true)}
                    sx={{height: 40, whiteSpace: "nowrap", px: 2}}
                >
                    Create
                </Button>
            </Box>
            {selectedToken &&
                <Box sx={{display: "flex", flexWrap: "wrap", gap: 0.5}}>
                    {selectedOwner &&
                        <Chip size="small" variant="outlined" label={tokenOwnerLabel(selectedOwner)} />
                    }
                    {(selectedToken.scopes || []).map((scope) => <Chip size="small" key={`${selectedToken.id}-${scope}`} label={scope} />)}
                </Box>
            }
            {openCreateToken &&
                <MythicDialog
                    open={openCreateToken}
                    fullWidth={true}
                    maxWidth="md"
                    onClose={() => setOpenCreateToken(false)}
                    innerDialog={
                        <SettingsAPITokenDialog
                            title={`New AI Chat API Token${selectedOwner ? ` for ${selectedOwner.username}` : ""}`}
                            name={`${selectedOwner?.accountType === "bot" ? "Operation bot" : "Operator"} AI chat token`}
                            initialScopes={createTokenInitialScopes}
                            requiredScopes={AI_CHAT_REQUIRED_TOKEN_SCOPES}
                            requiredScopeDescriptions={{
                                "apitoken.write": "Required so the chat container can request scoped Mythic API tokens for tools.",
                                "chat-ai.write": "Required so the chat container can stream AI responses back into this channel.",
                            }}
                            onAccept={createToken}
                            handleClose={() => setOpenCreateToken(false)}
                        />
                    }
                />
            }
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

const ChatDisplayChip = ({chip, className = ""}) => {
    const chipColor = chip.color || "neutral";
    const clickable = Boolean(chip.click);
    const chipClassName = `mythic-chat-display-chip mythic-chat-display-chip-${chipColor}${clickable ? " mythic-chat-display-chip-clickable" : ""}${className ? ` ${className}` : ""}`;
    const children = (
        <>
            <span className="mythic-chat-display-chip-label">{chip.label}:</span>
            <span className="mythic-chat-display-chip-value">{chip.value}</span>
        </>
    );
    const content = (
        clickable ? (
            <button
                className={chipClassName}
                onClick={() => chip.onClick?.(chip)}
                style={chip.colorStyle}
                type="button"
            >
                {children}
            </button>
        ) : (
            <span
                className={chipClassName}
                style={chip.colorStyle}
            >
                {children}
            </span>
        )
    );
    if(chip.tooltip){
        return <MythicStyledTooltip title={chip.tooltip}>{content}</MythicStyledTooltip>;
    }
    return content;
};

const ChatDisplayChipRow = ({chips, className = "", onChipClick}) => {
    if(!chips || chips.length === 0){
        return null;
    }
    return (
        <span className={`mythic-chat-display-chip-row${className ? ` ${className}` : ""}`}>
            {chips.map((chip) => <ChatDisplayChip key={chip.key} chip={{...chip, onClick: onChipClick}} />)}
        </span>
    );
};

const ChatChannelMetadataBar = ({channel, displayStringOverride, onChipClick}) => {
    const metadataState = React.useMemo(() => buildChannelMetadataChips(channel, displayStringOverride), [channel, displayStringOverride]);
    const [hidden, setHidden] = React.useState(metadataState.collapsed);
    React.useEffect(() => {
        setHidden(metadataState.collapsed);
    }, [channel?.id, metadataState.collapsed]);
    if(!channel || channel.channel_type !== "ai" || metadataState.chips.length === 0){
        return null;
    }
    const visibleChips = metadataState.chips.slice(0, metadataState.maxVisible);
    const overflowCount = Math.max(0, metadataState.chips.length - visibleChips.length);
    return (
        <Box className={`mythic-chat-metadata-bar${hidden ? " mythic-chat-metadata-bar-hidden" : ""}`}>
            <IconButton
                className="mythic-chat-metadata-toggle"
                size="small"
                onClick={() => setHidden((prev) => !prev)}
            >
                {hidden ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
            </IconButton>
            {hidden ? (
                <Typography variant="caption" color="text.secondary">Metadata hidden</Typography>
            ) : (
                <Box className="mythic-chat-metadata-content">
                    <ChatDisplayChipRow chips={visibleChips} onChipClick={onChipClick} />
                    {overflowCount > 0 &&
                        <span className="mythic-chat-display-chip mythic-chat-display-chip-neutral">
                            <span className="mythic-chat-display-chip-value">+{overflowCount} more</span>
                        </span>
                    }
                </Box>
            )}
        </Box>
    );
};

const ChatMetadataDisplayPreview = ({channel, displayString}) => {
    const metadataState = React.useMemo(() => buildChannelMetadataChips(channel, displayString), [channel, displayString]);
    const availableKeys = React.useMemo(() => getAvailableChannelMetadataKeys(channel), [channel]);
    const availableKeyText = availableKeys.length > 0 ? `Available keys: ${availableKeys.join(", ")}` : "";
    if(metadataState.chips.length === 0){
        return (
            <Box className="mythic-chat-metadata-preview">
                <Typography variant="caption" color="text.secondary">No channel metadata chips available yet.</Typography>
                {availableKeyText &&
                    <Typography variant="caption" color="text.secondary" sx={{display: "block", mt: 0.5}}>
                        {availableKeyText}
                    </Typography>
                }
            </Box>
        );
    }
    return (
        <Box className="mythic-chat-metadata-preview">
            <Box sx={{display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center"}}>
                <ChatDisplayChipRow chips={metadataState.chips.slice(0, metadataState.maxVisible)} />
                {metadataState.chips.length > metadataState.maxVisible &&
                    <span className="mythic-chat-display-chip mythic-chat-display-chip-neutral">
                        <span className="mythic-chat-display-chip-value">+{metadataState.chips.length - metadataState.maxVisible}</span>
                    </span>
                }
            </Box>
            {availableKeyText &&
                <Typography variant="caption" color="text.secondary" sx={{display: "block", mt: 0.75}}>
                    {availableKeyText}
                </Typography>
            }
        </Box>
    );
};

const ChatMetadataWizardDraggableList = ({rows, onDragEnd, updateRow}) => (
    <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="chat-metadata-display-wizard-list">
            {(provided) => (
                <div className="mythic-reorder-list mythic-chat-metadata-wizard-list" ref={provided.innerRef} {...provided.droppableProps}>
                    {rows.map((row, index) => (
                        <ChatMetadataWizardDraggableRow
                            key={row.key}
                            row={row}
                            index={index}
                            updateRow={updateRow}
                        />
                    ))}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    </DragDropContext>
);

const ChatMetadataWizardDraggableRow = ({row, index, updateRow}) => (
    <Draggable draggableId={`metadata-display-${row.key}`} index={index}>
        {(provided, snapshot) => {
            const rowContent = (
                <div
                    ref={provided.innerRef}
                    className={`mythic-reorder-row mythic-chat-metadata-wizard-row${snapshot.isDragging ? " mythic-reorder-row-dragging" : ""}${row.visible ? "" : " mythic-reorder-row-disabled"}`}
                    {...provided.draggableProps}
                >
                    <span className="mythic-reorder-drag-handle" {...provided.dragHandleProps}>
                        <DragHandleIcon fontSize="small" />
                    </span>
                    <div className="mythic-chat-metadata-wizard-row-grid">
                        <Box className="mythic-chat-metadata-wizard-row-key">
                            <Typography variant="body2" sx={{fontFamily: "monospace"}} noWrap>{row.key}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                                {row.value !== "" ? `Current: ${row.value}` : "No current value"}
                            </Typography>
                        </Box>
                        <TextField
                            size="small"
                            label="Label"
                            value={row.labelOverride}
                            placeholder={row.baseLabel}
                            onChange={(e) => updateRow(row.key, {labelOverride: e.target.value})}
                            fullWidth
                        />
                        <Select
                            size="small"
                            displayEmpty
                            value={row.formatOverride}
                            onChange={(e) => updateRow(row.key, {formatOverride: e.target.value})}
                            fullWidth
                        >
                            <MenuItem value="">Default{row.format ? ` (${row.format})` : ""}</MenuItem>
                            <MenuItem value="number">Number</MenuItem>
                            <MenuItem value="percent">Percent</MenuItem>
                            <MenuItem value="currency">Currency</MenuItem>
                            <MenuItem value="string">String</MenuItem>
                        </Select>
                        <ChatMetadataColorEditor
                            value={row.colorOverride}
                            fallback={row.color || "neutral"}
                            onChange={(colorOverride) => updateRow(row.key, {colorOverride})}
                        />
                        <Typography className="mythic-chat-metadata-wizard-row-detail" variant="caption" color="text.secondary">
                            {row.tooltip || "No description reported."}
                        </Typography>
                    </div>
                    <div className="mythic-reorder-row-actions">
                        <IconButton
                            aria-label={row.visible ? `Hide ${row.key}` : `Show ${row.key}`}
                            className={`mythic-table-row-icon-action ${row.visible ? "mythic-table-row-icon-action-hover-danger" : "mythic-table-row-icon-action-hover-info"}`}
                            size="small"
                            onClick={() => updateRow(row.key, {visible: !row.visible})}
                        >
                            {row.visible ? (
                                <VisibilityIcon fontSize="small" />
                            ) : (
                                <VisibilityOffIcon fontSize="small" />
                            )}
                        </IconButton>
                    </div>
                </div>
            );
            return (
                <MythicDraggablePortal isDragging={snapshot.isDragging}>
                    {rowContent}
                </MythicDraggablePortal>
            );
        }}
    </Draggable>
);

const ChatMetadataDisplayWizard = ({open, channel, displayString, onClose, onApply}) => {
    const parsedDisplay = React.useMemo(() => parseMetadataDisplayString(displayString), [displayString]);
    const [hiddenInitially, setHiddenInitially] = React.useState(false);
    const [maxVisible, setMaxVisible] = React.useState(6);
    const [rows, setRows] = React.useState([]);
    React.useEffect(() => {
        if(open){
            setHiddenInitially(parsedDisplay.collapsed === true);
            setMaxVisible(parsedDisplay.maxVisible || 6);
            setRows(metadataWizardRowsFromDisplay(channel, displayString));
        }
    }, [open, channel, displayString, parsedDisplay.collapsed, parsedDisplay.maxVisible]);
    const updateRow = (key, updates) => {
        setRows((prev) => prev.map((row) => row.key === key ? {...row, ...updates} : row));
    };
    const onDragEnd = ({destination, source}) => {
        if(!destination){
            return;
        }
        setRows((prev) => reorder(prev, source.index, destination.index));
    };
    const generatedDisplay = React.useMemo(
        () => buildMetadataDisplayStringFromWizard(rows, hiddenInitially, maxVisible),
        [rows, hiddenInitially, maxVisible],
    );
    const generatedWarnings = React.useMemo(() => parseMetadataDisplayString(generatedDisplay).warnings, [generatedDisplay]);
    const apply = () => {
        onApply(generatedDisplay);
        onClose();
    };
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
            <DialogTitle>Metadata Display Wizard</DialogTitle>
            <DialogContent className="mythic-chat-dialog-content" sx={{display: "flex", flexDirection: "column", gap: 1.5, pt: "20px !important", px: 3}}>
                <Box className="mythic-chat-metadata-wizard-top-grid">
                    <Box className="mythic-chat-metadata-wizard-top-card">
                        <Typography className="mythic-chat-metadata-wizard-top-title" variant="subtitle2">Initial visibility</Typography>
                        <Box className="mythic-chat-metadata-wizard-top-body">
                            <FormControlLabel
                                className="mythic-chat-metadata-wizard-visibility-control"
                                control={<Switch checked={!hiddenInitially} onChange={(e) => setHiddenInitially(!e.target.checked)} />}
                                label="Show initially"
                            />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{display: "block"}}>
                            Users can still hide or show the bar locally from the chat header.
                        </Typography>
                    </Box>
                    <Box className="mythic-chat-metadata-wizard-top-card">
                        <Typography className="mythic-chat-metadata-wizard-top-title" variant="subtitle2">Visible limit</Typography>
                        <Box className="mythic-chat-metadata-wizard-top-body">
                            <TextField
                                label="Max visible"
                                type="number"
                                size="small"
                                value={maxVisible}
                                onChange={(e) => setMaxVisible(e.target.value)}
                                inputProps={{min: 1}}
                                helperText="Overflow renders as +N more."
                                fullWidth
                            />
                        </Box>
                    </Box>
                    <Box className="mythic-chat-metadata-wizard-top-card">
                        <Typography className="mythic-chat-metadata-wizard-top-title" variant="subtitle2">Preview</Typography>
                        <Box className="mythic-chat-metadata-wizard-top-body mythic-chat-metadata-wizard-preview-body">
                            <ChatMetadataDisplayPreview channel={channel} displayString={generatedDisplay} />
                        </Box>
                    </Box>
                </Box>
                <Box sx={{display: "flex", flexDirection: "column", gap: 0.75, minHeight: 0}}>
                    <Typography variant="subtitle2">Metadata chips</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Drag rows to set display order. Hidden rows do not count toward the max visible preview.
                    </Typography>
                    {rows.length === 0 ? (
                        <Box sx={{border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.25}}>
                            <Typography variant="body2" color="text.secondary">
                                No metadata items have been reported for this channel yet. You can still edit the display string manually.
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{maxHeight: 420, overflow: "auto"}}>
                            <ChatMetadataWizardDraggableList rows={rows} onDragEnd={onDragEnd} updateRow={updateRow} />
                        </Box>
                    )}
                </Box>
                <TextField
                    label="Generated display string"
                    value={generatedDisplay}
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    InputProps={{readOnly: true}}
                    helperText={generatedWarnings.length > 0 ? generatedWarnings.join("; ") : "This is what will be written into the Metadata display field."}
                    error={generatedWarnings.length > 0}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={apply} variant="contained" disabled={generatedWarnings.length > 0}>Apply</Button>
            </DialogActions>
        </Dialog>
    );
};

const ChatMetadataDisplayField = ({channel, value, setValue, warnings}) => {
    const [wizardOpen, setWizardOpen] = React.useState(false);
    return (
        <Box sx={{display: "flex", flexDirection: "column", gap: 0.75}}>
            <TextField
                fullWidth
                label="Metadata display"
                size="small"
                value={value}
                placeholder={metadataDisplayExample}
                onChange={(e) => setValue(e.target.value)}
                helperText={warnings.length > 0 ? warnings.join("; ") : "Optional compact display string for AI metadata chips."}
                error={warnings.length > 0}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <MythicStyledTooltip title="Open metadata display wizard">
                                <IconButton size="small" onClick={() => setWizardOpen(true)}>
                                    <SettingsSuggestIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        </InputAdornment>
                    ),
                }}
                {...CHAT_DIALOG_TEXT_FIELD_PROPS}
            />
            <Typography variant="caption" color="text.secondary">
                Example: {metadataDisplayExample}
            </Typography>
            <ChatMetadataDisplayPreview channel={channel} displayString={value} />
            <ChatMetadataDisplayWizard
                open={wizardOpen}
                channel={channel}
                displayString={value}
                onClose={() => setWizardOpen(false)}
                onApply={setValue}
            />
        </Box>
    );
};

const ChannelButtonComponent = ({channel, selected, unread, muted, chatContainers, onSelect, onToggleMute}) => {
    const theme = useTheme();
    const isAI = channel.channel_type === "ai";
    const accentColor = isAI ? theme.palette.info.main : theme.palette.primary.main;
    const secondary = channel.description || (isAI ? channel.chat_container?.name || channel.chat_model || "" : "");
    const channelListChips = getChannelListChips(channel, chatContainers);
    const states = [
        channel.archived ? {label: "Archived", className: "mythic-chat-channel-state-archived"} : null,
        channel.locked ? {label: "Locked", className: "mythic-chat-channel-state-locked"} : null,
        isAI && channel.chat_container && !channel.chat_container.container_running ? {label: "Offline", className: "mythic-chat-channel-state-offline"} : null,
    ].filter(Boolean);
    return (
        <Box
            className="mythic-chat-channel-row"
            style={{
                "--mythic-chat-channel-accent": accentColor,
                "--mythic-chat-channel-warning": theme.palette.warning.main,
                "--mythic-chat-channel-error": theme.palette.error.main,
                "--mythic-chat-channel-muted": theme.palette.text.secondary,
                "--mythic-chat-channel-info": theme.palette.info.main,
            }}
        >
            <button
                type="button"
                onClick={() => onSelect(channel.id)}
                className={`mythic-chat-channel-button${selected ? " mythic-chat-channel-button-selected" : ""}${channel.archived ? " mythic-chat-channel-button-archived" : ""}`}
                style={{
                    borderColor: selected ? alpha(accentColor, 0.28) : "transparent",
                    backgroundColor: selected ? alpha(accentColor, theme.palette.mode === "dark" ? 0.18 : 0.1) : channel.archived ? alpha(theme.palette.text.secondary, 0.06) : "transparent",
                    color: theme.palette.text.primary,
                }}
            >
                <span className="mythic-chat-channel-icon">
                    {channel.archived ? (
                        <ArchiveIcon fontSize="small" />
                    ) : isAI ? (
                        <MythicChatContainerIcon
                            altText={channel.chat_container?.name || channelDisplayName(channel)}
                            containerName={channel.chat_container?.name}
                            imgClassName="mythic-chat-channel-icon-image"
                            iconProps={{fontSize: "small"}}
                        />
                    ) : (
                        <ForumTwoToneIcon fontSize="small" />
                    )}
                </span>
                <span className="mythic-chat-channel-main">
                    <span className="mythic-chat-channel-name">{channelDisplayName(channel)}</span>
                    {secondary && <span className="mythic-chat-channel-meta">{secondary} </span>}
                    {channelListChips.length > 0 &&
                        <ChatDisplayChipRow chips={channelListChips} className="mythic-chat-channel-config-chips" />
                    }
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
            <MythicStyledTooltip title={muted ? "Unsilence notifications" : "Silence notifications"}>
                <IconButton
                    className={`mythic-chat-channel-mute-button${muted ? " mythic-chat-channel-mute-button-muted" : ""}`}
                    size="small"
                    onClick={() => onToggleMute(channel)}
                    aria-label={muted ? `Unsilence ${channelDisplayName(channel)}` : `Silence ${channelDisplayName(channel)}`}
                >
                    {muted ? <NotificationsOffIcon fontSize="small" /> : <NotificationsActiveIcon fontSize="small" />}
                </IconButton>
            </MythicStyledTooltip>
        </Box>
    );
};
const ChannelButton = React.memo(ChannelButtonComponent);
const ChatCreateDialog = ({open, onClose, onCreate, chatContainers, currentUser, operationBot, initialChannel}) => {
    const theme = useTheme();
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [channelType, setChannelType] = React.useState("standard");
    const [containerID, setContainerID] = React.useState("");
    const [model, setModel] = React.useState("");
    const [configValues, setConfigValues] = React.useState({});
    const [locked, setLocked] = React.useState(true);
    const [apiTokenID, setAPITokenID] = React.useState("");
    const [metadataDisplay, setMetadataDisplay] = React.useState("");
    React.useEffect(() => {
        if(open){
            const cloningAI = initialChannel?.channel_type === "ai";
            setName(initialChannel?.name ? `${initialChannel.name} copy` : "");
            setDescription(initialChannel?.description || "");
            setChannelType(cloningAI ? "ai" : "standard");
            setContainerID(cloningAI && initialChannel?.chat_container_id ? `${initialChannel.chat_container_id}` : "");
            setModel(cloningAI ? initialChannel?.chat_model || "" : "");
            setConfigValues({});
            setLocked(cloningAI ? Boolean(initialChannel.locked) : true);
            setAPITokenID(cloningAI && initialChannel?.apitokens_id ? `${initialChannel.apitokens_id}` : "");
            setMetadataDisplay(cloningAI ? getChannelMetadataDisplayString(initialChannel) : "");
        }
    }, [open, initialChannel]);
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
            const cloningSameModel = initialChannel?.channel_type === "ai" &&
                `${initialChannel.chat_container_id}` === `${containerID}` &&
                initialChannel.chat_model === model;
            setConfigValues(buildDefaultConfigValues(configOptions, cloningSameModel ? getChannelAIConfig(initialChannel) : {}));
        } else {
            setConfigValues({});
        }
    }, [channelType, containerID, model, configOptions, initialChannel]);
    const changeChannelType = (event) => {
        const nextType = event.target.value;
        setChannelType(nextType);
        if(nextType !== "ai"){
            setContainerID("");
            setModel("");
            setConfigValues({});
            setAPITokenID("");
            setMetadataDisplay("");
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
        (channelType === "ai" && (
            !containerID ||
            selectedContainerModels.length === 0 ||
            model === "" ||
            !apiTokenID ||
            configHasMissingRequiredValues(configValues, configOptions) ||
            configHasInvalidValues(configValues, configOptions)
        ));
    const submit = () => {
        const aiConfig = channelType === "ai" ? normalizeConfigForSubmit(configValues, configOptions) : {};
        const aiMetadata = channelType === "ai" ? applyMetadataDisplayToMetadata(applyConfigToMetadata({}, aiConfig), metadataDisplay) : {};
        onCreate({
            name,
            description,
            channel_type: channelType,
            chat_container_id: channelType === "ai" ? Number(containerID) : null,
            chat_model: channelType === "ai" ? model : "",
            locked: channelType === "ai" ? locked : false,
            ai_metadata: aiMetadata,
            apitokens_id: channelType === "ai" ? Number(apiTokenID) : null,
        });
    };
    const metadataDisplayWarnings = React.useMemo(() => parseMetadataDisplayString(metadataDisplay).warnings, [metadataDisplay]);
    const metadataPreviewChannel = initialChannel?.channel_type === "ai" ? initialChannel : null;
    return (
        <Dialog open={open} onClose={onClose} maxWidth={channelType === "ai" ? "lg" : "sm"} fullWidth>
            <DialogTitle>{initialChannel?.channel_type === "ai" ? "Clone AI Chat" : (channelType === "ai" ? "New AI Chat" : "New Channel")}</DialogTitle>
            <DialogContent className="mythic-chat-dialog-content" sx={{display: "flex", flexDirection: "column", gap: 1.75, pt: "20px !important", px: 3}}>
                <FormControl size="small" fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select label="Type" value={channelType} onChange={changeChannelType}>
                        <MenuItem value="standard">Standard</MenuItem>
                        <MenuItem value="ai">AI</MenuItem>
                    </Select>
                </FormControl>
                <TextField label="Name" size="small" value={name} onChange={(e) => setName(e.target.value)} autoFocus {...CHAT_DIALOG_TEXT_FIELD_PROPS} />
                <TextField label="Description" size="small" value={description} onChange={(e) => setDescription(e.target.value)} {...CHAT_DIALOG_TEXT_FIELD_PROPS} />
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
                        <ChatMetadataDisplayField
                            channel={metadataPreviewChannel}
                            value={metadataDisplay}
                            setValue={setMetadataDisplay}
                            warnings={metadataDisplayWarnings}
                        />
                        <ChatAPITokenSelector
                            value={apiTokenID}
                            setValue={setAPITokenID}
                            currentUser={currentUser}
                            operationBot={operationBot}
                        />
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

const ChatEditChannelDialog = ({open, channel, onClose, onSave, chatContainers = [], currentUser, operationBot}) => {
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [chatModel, setChatModel] = React.useState("");
    const [configValues, setConfigValues] = React.useState({});
    const [apiTokenID, setAPITokenID] = React.useState("");
    const [metadataDisplay, setMetadataDisplay] = React.useState("");
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
            setAPITokenID(channel.apitokens_id || "");
            setMetadataDisplay(getChannelMetadataDisplayString(channel));
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
            const metadataWithConfig = applyConfigToMetadata(
                getChannelAIMetadata(channel),
                normalizeConfigForSubmit(configValues, configOptions),
            );
            update.ai_metadata = applyMetadataDisplayToMetadata(metadataWithConfig, metadataDisplay);
            update.apitokens_id = Number(apiTokenID);
        }
        onSave(update);
    };
    const metadataDisplayWarnings = React.useMemo(() => parseMetadataDisplayString(metadataDisplay).warnings, [metadataDisplay]);
    const saveDisabled = (!isGeneralChannel && name.trim() === "") ||
        (isAIChannel && (!apiTokenID || configHasMissingRequiredValues(configValues, configOptions) || configHasInvalidValues(configValues, configOptions)));
    return (
        <Dialog open={open} onClose={onClose} maxWidth={isAIChannel ? "lg" : "sm"} fullWidth>
            <DialogTitle>{isAIChannel ? "Edit AI Chat" : "Edit Channel"}</DialogTitle>
            <DialogContent className="mythic-chat-dialog-content" sx={{display: "flex", flexDirection: "column", gap: 1.75, pt: "20px !important", px: 3}}>
                <TextField
                    autoFocus={!isGeneralChannel}
                    fullWidth
                    label="Name"
                    size="small"
                    disabled={isGeneralChannel}
                    value={name}
                    {...CHAT_DIALOG_TEXT_FIELD_PROPS}
                    onChange={(e) => setName(e.target.value)}
                />
                <TextField
                    fullWidth
                    label="Description"
                    multiline
                    minRows={1}
                    maxRows={5}
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
                        <ChatMetadataDisplayField
                            channel={channel}
                            value={metadataDisplay}
                            setValue={setMetadataDisplay}
                            warnings={metadataDisplayWarnings}
                        />
                        <ChatAPITokenSelector
                            value={apiTokenID}
                            setValue={setAPITokenID}
                            currentToken={channel?.apitoken}
                            currentUser={currentUser}
                            operationBot={operationBot}
                        />
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

const ChatComposer = React.memo(({
    selectedChannel,
    composerScope = "",
    slashOptions,
    genericAliasOptions = [],
    messageHistory = [],
    disabledReason,
    activeAIRequest,
    canCreateSystemMessage,
    isMythicAdmin,
    onOpenSystemMessage,
    onSendMessage,
    onCancelRequest,
}) => {
    const theme = useTheme();
    const inputRef = React.useRef(null);
    const historyDraftRef = React.useRef("");
    const [composer, setComposer] = React.useState("");
    const [historyIndex, setHistoryIndex] = React.useState(null);
    const composerSlash = React.useMemo(() => parseComposerSlashCommand(composer), [composer]);
    const slashCommandIsKnown = React.useMemo(() => (
        isKnownSlashCommand(selectedChannel, composerSlash, slashOptions)
    ), [selectedChannel, composerSlash, slashOptions]);
    const matchingSlashOptions = React.useMemo(() => (
        getMatchingSlashOptions(composerSlash, slashOptions)
    ), [composerSlash, slashOptions]);
    const composerDisabled = disabledReason !== "";
    const sendDisabled = composerDisabled || composer.trim() === "" || !slashCommandIsKnown;
    const showSlashOptions = selectedChannel?.channel_type === "ai" && composerSlash.isSlash && !slashCommandIsKnown;

    React.useEffect(() => {
        setHistoryIndex(null);
        historyDraftRef.current = "";
    }, [selectedChannel?.id, composerScope]);

    const focusComposer = (cursorPosition) => {
        const applyFocus = () => {
            inputRef.current?.focus();
            if(typeof cursorPosition === "number" && inputRef.current?.setSelectionRange){
                const adjustedCursorPosition = Math.min(cursorPosition, inputRef.current.value.length);
                inputRef.current.setSelectionRange(adjustedCursorPosition, adjustedCursorPosition);
            }
        };
        if(typeof window !== "undefined" && window.requestAnimationFrame){
            window.requestAnimationFrame(applyFocus);
            return;
        }
        applyFocus();
    };
    const selectSlashOption = (option) => {
        setComposer(`/${option.name}${composerSlash.argument ? ` ${composerSlash.argument}` : " "}`);
        focusComposer();
    };
    const completeGenericAliasReference = () => {
        const input = inputRef.current;
        const cursorPosition = typeof input?.selectionStart === "number" ? input.selectionStart : composer.length;
        const selectionEnd = typeof input?.selectionEnd === "number" ? input.selectionEnd : cursorPosition;
        const completionContext = getGenericAliasCompletionContext(composer, cursorPosition, selectionEnd, genericAliasOptions);
        if(!completionContext){
            return false;
        }
        // Chat generic aliases are expanded server-side for AI channels. Complete
        // the nearest @ token so aliases still work inside slash-command prompts.
        const replacement = `@${completionContext.matches[0].name}`;
        const updatedComposer = `${composer.slice(0, completionContext.start)}${replacement}${composer.slice(completionContext.end)}`;
        setComposer(updatedComposer);
        focusComposer(completionContext.start + replacement.length);
        return true;
    };
    const composerCursorAllowsHistory = (event, direction) => {
        if(messageHistory.length === 0 || showSlashOptions || event.altKey || event.ctrlKey || event.metaKey){
            return false;
        }
        const input = event.target;
        const inputValue = typeof input.value === "string" ? input.value : composer;
        const cursorPosition = typeof input.selectionStart === "number" ? input.selectionStart : composer.length;
        const selectionEnd = typeof input.selectionEnd === "number" ? input.selectionEnd : cursorPosition;
        if(cursorPosition !== selectionEnd){
            return false;
        }
        if(direction < 0){
            return !inputValue.slice(0, cursorPosition).includes("\n");
        }
        return !inputValue.slice(selectionEnd).includes("\n");
    };
    const navigateComposerHistory = (direction) => {
        if(direction < 0){
            if(historyIndex === null){
                historyDraftRef.current = composer;
                const nextMessage = messageHistory[0] || "";
                setHistoryIndex(0);
                setComposer(nextMessage);
                focusComposer(nextMessage.length);
                return;
            }
            const nextIndex = Math.min(historyIndex + 1, messageHistory.length - 1);
            const nextMessage = messageHistory[nextIndex] || "";
            setHistoryIndex(nextIndex);
            setComposer(nextMessage);
            focusComposer(nextMessage.length);
            return;
        }
        if(historyIndex === null){
            return;
        }
        const nextIndex = historyIndex - 1;
        if(nextIndex < 0){
            const draft = historyDraftRef.current;
            setHistoryIndex(null);
            setComposer(draft);
            focusComposer(draft.length);
            return;
        }
        const nextMessage = messageHistory[nextIndex] || "";
        setHistoryIndex(nextIndex);
        setComposer(nextMessage);
        focusComposer(nextMessage.length);
    };
    const submitMessage = () => {
        const message = composer.trim();
        if(sendDisabled || message === ""){
            return;
        }
        if(onSendMessage(message)){
            setComposer("");
            setHistoryIndex(null);
            historyDraftRef.current = "";
        }
    };

    return (
        <Box className="mythic-chat-composer" sx={{backgroundColor: theme.palette.background.paper}}>
            <Box sx={{display: "flex", flexDirection: "column", gap: 0.75, flex: "1 1 auto", minWidth: 0}}>
                {activeAIRequest &&
                    <Box
                        sx={{
                            alignItems: "center",
                            backgroundColor: alpha(theme.palette.warning.main, 0.08),
                            border: `1px solid ${alpha(theme.palette.warning.main, 0.24)}`,
                            borderRadius: `${theme.shape.borderRadius}px`,
                            display: "flex",
                            gap: 1,
                            justifyContent: "space-between",
                            px: 1,
                            py: 0.5,
                        }}
                    >
                        <Box sx={{display: "flex", flexDirection: "column", minWidth: 0}}>
                            <Typography variant="caption" sx={{fontWeight: 700}}>AI response in progress</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>{activeAIRequest.status || "streaming"}</Typography>
                        </Box>
                        <MythicStyledTooltip title="Cancel request">
                            <IconButton size="small" color="warning" onClick={() => onCancelRequest(activeAIRequest.id)}>
                                <StopCircleIcon fontSize="small" />
                            </IconButton>
                        </MythicStyledTooltip>
                    </Box>
                }
                {showSlashOptions &&
                    <Box sx={{
                        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                        borderRadius: `${theme.shape.borderRadius}px`,
                        display: "flex",
                        flexDirection: "column",
                        maxHeight: 210,
                        overflow: "auto",
                    }}>
                        {matchingSlashOptions.length === 0 ? (
                            <Box sx={{px: 1.25, py: 1, color: "text.secondary", fontSize: "0.82rem"}}>No matching slash commands</Box>
                        ) : matchingSlashOptions.map((option) => (
                            <button
                                type="button"
                                key={`${option.source}-${option.name}`}
                                onClick={() => selectSlashOption(option)}
                                style={{
                                    alignItems: "center",
                                    background: "transparent",
                                    border: 0,
                                    color: "inherit",
                                    cursor: "pointer",
                                    display: "flex",
                                    gap: "10px",
                                    justifyContent: "space-between",
                                    padding: "7px 10px",
                                    textAlign: "left",
                                    width: "100%",
                                }}
                            >
                                <Box sx={{display: "flex", flexDirection: "column", minWidth: 0}}>
                                    <Typography variant="body2" sx={{fontFamily: "monospace"}}>/{option.name}</Typography>
                                    {option.source === "alias" &&
                                        <Typography variant="caption" color="text.secondary" noWrap>/{option.name} -&gt; {option.actualCommand}</Typography>
                                    }
                                    {option.source === "model" && option.description &&
                                        <Typography variant="caption" color="text.secondary" noWrap>{option.description}</Typography>
                                    }
                                </Box>
                                <Chip size="small" label={option.source === "alias" ? "alias" : "model"} />
                            </button>
                        ))}
                    </Box>
                }
                <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={8}
                    value={composer}
                    disabled={composerDisabled}
                    placeholder={composerDisabled ? disabledReason : "Message"}
                    error={composerSlash.isSlash && !slashCommandIsKnown}
                    helperText={composerSlash.isSlash && !slashCommandIsKnown ? "Unknown slash command" : ""}
                    inputRef={inputRef}
                    onChange={(e) => {
                        setComposer(e.target.value);
                        setHistoryIndex(null);
                        historyDraftRef.current = "";
                    }}
                    onKeyDown={(e) => {
                        if(e.nativeEvent?.isComposing){
                            return;
                        }
                        if(e.key === "ArrowUp" && composerCursorAllowsHistory(e, -1)){
                            e.preventDefault();
                            navigateComposerHistory(-1);
                            return;
                        }
                        if(e.key === "ArrowDown" && historyIndex !== null && composerCursorAllowsHistory(e, 1)){
                            e.preventDefault();
                            navigateComposerHistory(1);
                            return;
                        }
                        if(e.key === "Tab" && completeGenericAliasReference()){
                            e.preventDefault();
                            return;
                        }
                        if(e.key === "Tab" && showSlashOptions && matchingSlashOptions.length > 0){
                            e.preventDefault();
                            selectSlashOption(matchingSlashOptions[0]);
                            return;
                        }
                        if(e.key === "Enter" && !e.shiftKey){
                            e.preventDefault();
                            submitMessage();
                        }
                    }}
                    size="small"
                />
            </Box>
            {canCreateSystemMessage &&
                <MythicStyledTooltip title="System message">
                    <span>
                        <IconButton
                            color="secondary"
                            className="mythic-chat-system-button"
                            disabled={!selectedChannel || (selectedChannel.archived && !isMythicAdmin)}
                            onClick={onOpenSystemMessage}
                        >
                            <CampaignTwoToneIcon />
                        </IconButton>
                    </span>
                </MythicStyledTooltip>
            }
            <IconButton
                color="primary"
                className="mythic-chat-send-button"
                disabled={sendDisabled}
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
    );
});

const ChatDelegationPane = ({
    delegation,
    messages,
    requestsByID,
    me,
    selectedChannel,
    slashOptions,
    genericAliasOptions,
    messageHistory,
    disabledReason,
    activeAIRequest,
    onClose,
    onSendMessage,
    onCancelRequest,
    onEdit,
    onDelete,
    onRetry,
    onRefreshSpecial,
    onReviewSpecial,
    onSubmitInputResponse,
    onViewToolOutput,
    refreshingSpecialMessageID,
    submittingInputResponseID,
    editingID,
    editText,
    setEditText,
    saveEdit,
    cancelEdit,
}) => {
    const theme = useTheme();
    const snapshot = delegation?.snapshot || {};
    const stateClass = getSubagentStateClass(snapshot);
    const visual = getSubagentVisual(delegation?.id, snapshot, theme);
    const toolCount = Number(snapshot.tool_count ?? snapshot.tools_done ?? snapshot.completed_tools);
    const toolTotal = Number(snapshot.tool_total ?? snapshot.tools_total ?? snapshot.total_tools);
    const hasProgress = !Number.isNaN(toolCount) && !Number.isNaN(toolTotal) && toolTotal > 0;
    const prompt = delegation?.prompt || snapshot.prompt || snapshot.title || "";
    if(!delegation){
        return null;
    }
    return (
        <Box
            sx={{
                borderLeft: "1px solid",
                borderColor: "divider",
                display: "flex",
                flex: "1 1 auto",
                height: "100%",
                flexDirection: "column",
                minHeight: 0,
                minWidth: 0,
                width: "100%",
            }}
        >
            <Box className="mythic-chat-conversation-header" sx={{minHeight: 48}}>
                <Box sx={{alignItems: "center", display: "flex", gap: 1, minWidth: 0}}>
                    <ChatSubagentAvatar visual={visual} size={30} />
                    <Box sx={{display: "flex", flexDirection: "column", minWidth: 0}}>
                        <Box sx={{alignItems: "center", display: "flex", gap: 0.75, minWidth: 0}}>
                            <MythicStyledTooltip title={delegation.title || delegation.name || "Sub-agent"}>
                                <Typography className="mythic-chat-conversation-title" variant="subtitle2" noWrap>
                                    {delegation.title || delegation.name || "Sub-agent"}
                                </Typography>
                            </MythicStyledTooltip>
                            <Chip
                                size="small"
                                className={`mythic-chat-special-status mythic-chat-special-status-${stateClass}`.trim()}
                                label={getSubagentStatusText(snapshot)}
                                variant="outlined"
                            />
                            {hasProgress &&
                                <Chip
                                    size="small"
                                    className={`mythic-chat-special-status mythic-chat-special-status-${stateClass}`.trim()}
                                    label={`${toolCount}/${toolTotal} tools`}
                                    variant="outlined"
                                />
                            }
                        </Box>
                        <Typography className="mythic-chat-conversation-subtitle" variant="caption" color="text.secondary" noWrap>
                            {delegation.name || delegation.id}
                        </Typography>
                    </Box>
                </Box>
                <MythicStyledTooltip title="Close sub-agent view">
                    <IconButton size="small" onClick={onClose}>
                        <KeyboardArrowRightIcon fontSize="small" />
                    </IconButton>
                </MythicStyledTooltip>
            </Box>
            {prompt &&
                <Box className="mythic-chat-delegation-prompt">
                    <Typography className="mythic-chat-delegation-prompt-label" variant="caption">
                        Prompt
                    </Typography>
                    <Typography className="mythic-chat-delegation-prompt-text" variant="body2">
                        {prompt}
                    </Typography>
                </Box>
            }
            <Box className="mythic-chat-messages" sx={{padding: "8px"}}>
                {messages.length === 0 ? (
                    <ChatEmptyState
                        icon={<SmartToyTwoToneIcon fontSize="large" />}
                        title="No sub-agent activity"
                        detail="Delegated messages will appear here."
                    />
                ) : (
                    messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            request={message.chat_request_id ? requestsByID[message.chat_request_id] : null}
                            me={me}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onRetry={onRetry}
                            onRefreshSpecial={onRefreshSpecial}
                            onReviewSpecial={onReviewSpecial}
                            onSubmitInputResponse={onSubmitInputResponse}
                            onOpenDelegation={null}
                            onViewToolOutput={onViewToolOutput}
                            refreshingSpecialMessageID={refreshingSpecialMessageID}
                            submittingInputResponseID={submittingInputResponseID}
                            editing={editingID === message.id}
                            editText={editText}
                            setEditText={setEditText}
                            saveEdit={saveEdit}
                            cancelEdit={cancelEdit}
                        />
                    ))
                )}
            </Box>
            <ChatComposer
                selectedChannel={selectedChannel}
                composerScope={`delegation:${delegation.id}`}
                slashOptions={slashOptions}
                genericAliasOptions={genericAliasOptions}
                messageHistory={messageHistory}
                disabledReason={disabledReason}
                activeAIRequest={activeAIRequest}
                canCreateSystemMessage={false}
                isMythicAdmin={false}
                onOpenSystemMessage={() => {}}
                onSendMessage={(message) => onSendMessage(message, delegation)}
                onCancelRequest={onCancelRequest}
            />
        </Box>
    );
};

export function Chat({me}) {
    const theme = useTheme();
    const meContext = React.useContext(MeContext);
    const currentMe = me || meContext;
    const initialSavedChannelID = GetMythicSetting({setting_name: CHAT_SELECTED_CHANNEL_SETTING, default_value: 0});
    const [selectedChannelID, setSelectedChannelID] = React.useState(Number(initialSavedChannelID) || null);
    const [saveMythicSetting] = useSetMythicSetting();
    const [showArchived, setShowArchived] = React.useState(false);
    const [createOpen, setCreateOpen] = React.useState(false);
    const [createInitialChannel, setCreateInitialChannel] = React.useState(null);
    const [editChannelOpen, setEditChannelOpen] = React.useState(false);
    const [systemMessageOpen, setSystemMessageOpen] = React.useState(false);
    const [archiveTarget, setArchiveTarget] = React.useState(null);
    const [metadataClickTarget, setMetadataClickTarget] = React.useState(null);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState("");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [editingID, setEditingID] = React.useState(null);
    const [editText, setEditText] = React.useState("");
    const [reviewMessage, setReviewMessage] = React.useState(null);
    const [inputResponseTarget, setInputResponseTarget] = React.useState(null);
    const [inputResponseText, setInputResponseText] = React.useState("");
    const [selectedDelegationSeed, setSelectedDelegationSeed] = React.useState(null);
    const [toolOutputTarget, setToolOutputTarget] = React.useState(null);
    const [refreshingSpecialMessageID, setRefreshingSpecialMessageID] = React.useState(null);
    const [submittingInputResponseID, setSubmittingInputResponseID] = React.useState(null);
    const [chatSplitSizes, setChatSplitSizes] = React.useState(getStoredChatSplitSizes);
    const [channelSplitSizes, setChannelSplitSizes] = React.useState(getStoredChatChannelSplitSizes);
    const [delegationSplitSizes, setDelegationSplitSizes] = React.useState(getStoredChatDelegationSplitSizes);
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
    const readStateRef = React.useRef({});
    const submittedReadStateRef = React.useRef({});
    const pendingReadStateRef = React.useRef({});
    const markReadTimersRef = React.useRef({});
    const streamStart = React.useRef(getSkewedNow().toISOString());
    const [baseChannels, setBaseChannels] = React.useState([]);
    const [allChatContainers, setAllChatContainers] = React.useState([]);
    const [operatorAliases, setOperatorAliases] = React.useState([]);
    const [readState, setReadState] = React.useState({});
    const [messages, setMessages] = React.useState([]);
    const [requests, setRequests] = React.useState([]);
    const selectedChannelIDRef = React.useRef(selectedChannelID);
    const selectedChannelRefreshCursorRef = React.useRef({
        channelID: selectedChannelID,
        messagesSince: streamStart.current,
        requestsSince: streamStart.current,
    });
    selectedChannelIDRef.current = selectedChannelID;
    readStateRef.current = readState;
    const selectChannel = React.useCallback((channelID, persist = true) => {
        const numericChannelID = Number(channelID) || null;
        setSelectedChannelID(numericChannelID);
        if(persist && numericChannelID){
            saveMythicSetting({
                setting_name: CHAT_SELECTED_CHANNEL_SETTING,
                value: numericChannelID,
                broadcast: false,
            });
        }
    }, [saveMythicSetting]);

    const {data: channelData} = useQuery(CHAT_CHANNELS_QUERY, {fetchPolicy: "no-cache"});
    const {data: readStateData} = useQuery(CHAT_READ_STATE_QUERY, {fetchPolicy: "no-cache"});
    const {data: containerData} = useQuery(CHAT_CONTAINERS_QUERY, {fetchPolicy: "no-cache"});
    const {data: aliasData} = useQuery(CHAT_OPERATOR_ALIASES_QUERY, {fetchPolicy: "no-cache"});
    const {data: currentOperatorData} = useQuery(CHAT_CURRENT_OPERATOR_QUERY, {
        variables: {
            operator_id: currentMe?.user?.user_id || 0,
            operation_id: currentMe?.user?.current_operation_id || 0,
        },
        skip: !currentMe?.user?.user_id || !currentMe?.user?.current_operation_id,
        fetchPolicy: "no-cache",
        onError: (error) => console.log(error),
    });
    const bumpSelectedChannelRefreshCursor = React.useCallback((cursorKey, channelID, rows) => {
        if(!channelID || !Array.isArray(rows) || rows.length === 0){
            return;
        }
        const currentCursor = selectedChannelRefreshCursorRef.current;
        if(currentCursor.channelID !== channelID){
            return;
        }
        const latestRow = rows.reduce((latest, row) => {
            return timestampValue(row.updated_at) > timestampValue(latest?.updated_at) ? row : latest;
        }, null);
        if(!latestRow?.updated_at){
            return;
        }
        if(timestampValue(latestRow.updated_at) > timestampValue(currentCursor[cursorKey])){
            selectedChannelRefreshCursorRef.current = {
                ...currentCursor,
                [cursorKey]: latestRow.updated_at,
            };
        }
    }, []);
    const [fetchUpdatedMessages] = useLazyQuery(CHAT_MESSAGES_UPDATED_QUERY, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            const currentChannelID = selectedChannelIDRef.current;
            const rows = (data?.chat_message || []).filter((message) => message.channel_id === currentChannelID);
            if(rows.length > 0){
                setMessages((prev) => mergeRowsByID(prev, rows, sortByID, CHAT_MESSAGE_LIMIT));
                bumpSelectedChannelRefreshCursor("messagesSince", currentChannelID, rows);
            }
        },
        onError: (error) => console.log(error),
    });
    const [fetchUpdatedRequests] = useLazyQuery(CHAT_REQUESTS_UPDATED_QUERY, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            const currentChannelID = selectedChannelIDRef.current;
            const rows = (data?.chat_request || []).filter((request) => request.channel_id === currentChannelID);
            if(rows.length > 0){
                setRequests((prev) => mergeRowsByID(prev, rows, sortByID, CHAT_REQUEST_LIMIT));
                bumpSelectedChannelRefreshCursor("requestsSince", currentChannelID, rows);
            }
        },
        onError: (error) => console.log(error),
    });
    const fetchSelectedChannelUpdates = React.useCallback((channelID) => {
        if(!channelID){
            return;
        }
        let cursor = selectedChannelRefreshCursorRef.current;
        if(cursor.channelID !== channelID){
            cursor = {
                channelID,
                messagesSince: getSkewedNow().toISOString(),
                requestsSince: getSkewedNow().toISOString(),
            };
            selectedChannelRefreshCursorRef.current = cursor;
        }
        fetchUpdatedMessages({
            variables: {
                channel_id: channelID,
                since: cursor.messagesSince || streamStart.current,
                limit: CHAT_UPDATE_LIMIT,
            },
        });
        fetchUpdatedRequests({
            variables: {
                channel_id: channelID,
                since: cursor.requestsSince || streamStart.current,
                limit: CHAT_UPDATE_LIMIT,
            },
        });
    }, [fetchUpdatedMessages, fetchUpdatedRequests]);

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
    React.useEffect(() => {
        if(aliasData?.operator_alias){
            setOperatorAliases(aliasData.operator_alias);
        }
    }, [aliasData]);

    useSubscription(CHAT_CHANNELS_STREAM_SUBSCRIPTION, {
        variables: {now: streamStart.current},
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            const updates = data.data?.chat_channel_stream || [];
            if(updates.length > 0){
                setBaseChannels((prev) => mergeRowsByID(prev, updates, sortChannels));
                const currentChannelID = selectedChannelIDRef.current;
                if(currentChannelID && updates.some((channel) => channel.id === currentChannelID)){
                    fetchSelectedChannelUpdates(currentChannelID);
                }
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
    const currentUser = React.useMemo(() => ({
        id: currentOperatorData?.operator_by_pk?.id || currentMe?.user?.user_id || 0,
        username: currentOperatorData?.operator_by_pk?.username || currentMe?.user?.username || "Current user",
    }), [currentOperatorData?.operator_by_pk?.id, currentOperatorData?.operator_by_pk?.username, currentMe?.user?.user_id, currentMe?.user?.username]);
    const currentOperatorViewMode = currentOperatorData?.operatoroperation?.[0]?.view_mode || currentMe?.user?.view_mode || "";
    const operationBot = currentOperatorData?.operation_bot?.[0] || null;
    const isMythicAdmin = Boolean(currentMe?.user?.admin || currentOperatorData?.operator_by_pk?.admin);
    const canCreateSystemMessage = isMythicAdmin || currentOperatorViewMode === "lead";
    const selectedChannelIsGeneral = isGeneralChatChannel(selectedChannel);
    const selectedChannelReadState = getChannelReadState(readState, selectedChannelID);
    const selectedChannelMuted = Boolean(selectedChannelReadState.muted);
    const updateChatSplitSizes = React.useCallback((sizes) => {
        setChatSplitSizes(sizes);
        localStorage.setItem(CHAT_SPLIT_STORAGE_KEY, JSON.stringify(sizes));
    }, []);
    const updateChannelSplitSizes = React.useCallback((sizes) => {
        setChannelSplitSizes(sizes);
        localStorage.setItem(CHAT_CHANNEL_SPLIT_STORAGE_KEY, JSON.stringify(sizes));
    }, []);
    const updateDelegationSplitSizes = React.useCallback((sizes) => {
        setDelegationSplitSizes(sizes);
        localStorage.setItem(CHAT_DELEGATION_SPLIT_STORAGE_KEY, JSON.stringify(sizes));
    }, []);

    React.useEffect(() => {
        if(channels.length > 0 && !selectedChannel){
            const active = channels.find((channel) => !channel.archived) || channels[0];
            selectChannel(active.id, false);
        }
    }, [channels, selectedChannel, selectChannel]);

    React.useEffect(() => {
        setMessages([]);
        setRequests([]);
        setSelectedDelegationSeed(null);
        selectedChannelRefreshCursorRef.current = {
            channelID: selectedChannelID,
            messagesSince: getSkewedNow().toISOString(),
            requestsSince: getSkewedNow().toISOString(),
        };
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
            bumpSelectedChannelRefreshCursor("messagesSince", currentChannelID, rows);
        }
    }, [bumpSelectedChannelRefreshCursor, messageData, selectedChannelID]);
    React.useEffect(() => {
        const currentChannelID = selectedChannelIDRef.current;
        if(currentChannelID && requestData?.chat_request){
            const rows = requestData.chat_request.filter((request) => request.channel_id === currentChannelID);
            setRequests((prev) => mergeRowsByID(prev, rows, sortByID, CHAT_REQUEST_LIMIT));
            bumpSelectedChannelRefreshCursor("requestsSince", currentChannelID, rows);
        }
    }, [bumpSelectedChannelRefreshCursor, requestData, selectedChannelID]);
    const requestsByID = React.useMemo(() => {
        return requests.reduce((prev, request) => {
            prev[request.id] = request;
            return prev;
        }, {});
    }, [requests]);

    const [createChannel] = useMutation(CREATE_CHANNEL, {
        onCompleted: (data) => {
            if(data.chatCreateChannel.status === "success"){
                selectChannel(data.chatCreateChannel.channel_id);
                setCreateOpen(false);
                setCreateInitialChannel(null);
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
    const queueMarkRead = React.useCallback((channelID, messageID) => {
        if(!channelID || !messageID){
            return;
        }
        const currentReadID = getChannelReadState(readStateRef.current, channelID).lastReadMessageID || 0;
        const submittedReadID = submittedReadStateRef.current[channelID] || 0;
        const pendingReadID = pendingReadStateRef.current[channelID] || 0;
        if(messageID <= Math.max(currentReadID, submittedReadID, pendingReadID)){
            return;
        }
        pendingReadStateRef.current[channelID] = messageID;
        if(markReadTimersRef.current[channelID]){
            clearTimeout(markReadTimersRef.current[channelID]);
        }
        markReadTimersRef.current[channelID] = setTimeout(() => {
            const lastReadMessageID = pendingReadStateRef.current[channelID] || 0;
            delete pendingReadStateRef.current[channelID];
            delete markReadTimersRef.current[channelID];
            const latestKnownReadID = Math.max(
                getChannelReadState(readStateRef.current, channelID).lastReadMessageID || 0,
                submittedReadStateRef.current[channelID] || 0
            );
            if(lastReadMessageID <= latestKnownReadID){
                return;
            }
            submittedReadStateRef.current[channelID] = lastReadMessageID;
            markRead({variables: {channel_id: channelID, last_read_message_id: lastReadMessageID}}).catch(() => {
                if((submittedReadStateRef.current[channelID] || 0) <= lastReadMessageID){
                    submittedReadStateRef.current[channelID] = getChannelReadState(readStateRef.current, channelID).lastReadMessageID || 0;
                }
            });
        }, 750);
    }, [markRead]);
    React.useEffect(() => {
        Object.entries(readState).forEach(([channelID, channelReadState]) => {
            const lastReadMessageID = channelReadState?.lastReadMessageID || 0;
            submittedReadStateRef.current[channelID] = Math.max(submittedReadStateRef.current[channelID] || 0, lastReadMessageID);
            if((pendingReadStateRef.current[channelID] || 0) <= lastReadMessageID){
                delete pendingReadStateRef.current[channelID];
                if(markReadTimersRef.current[channelID]){
                    clearTimeout(markReadTimersRef.current[channelID]);
                    delete markReadTimersRef.current[channelID];
                }
            }
        });
    }, [readState]);
    React.useEffect(() => {
        return () => {
            Object.values(markReadTimersRef.current).forEach((timer) => clearTimeout(timer));
            markReadTimersRef.current = {};
        };
    }, []);
    const [refreshSpecialMessage] = useMutation(REFRESH_SPECIAL_MESSAGE, {
        onCompleted: (data) => {
            if(data.chatRefreshSpecialMessage.status !== "success"){
                snackActions.error(data.chatRefreshSpecialMessage.error);
            }
        },
        onError: (error) => snackActions.error(error.message),
    });
    const [submitInputResponse] = useMutation(INPUT_RESPONSE, {
        onCompleted: (data) => {
            setSubmittingInputResponseID(null);
            if(data.chatInputResponse.status === "success"){
                setInputResponseTarget(null);
                setInputResponseText("");
            }
            if(data.chatInputResponse.status !== "success"){
                snackActions.error(data.chatInputResponse.error);
            }
        },
        onError: (error) => {
            setSubmittingInputResponseID(null);
            snackActions.error(error.message);
        },
    });
    const submitInputResponseAction = React.useCallback((message, action, response = "", choiceID = "") => {
        if(!message?.id){
            return;
        }
        setSubmittingInputResponseID(message.id);
        submitInputResponse({
            variables: {
                message_id: message.id,
                action,
                response,
                choice_id: choiceID,
            },
        }).catch(() => {
            setSubmittingInputResponseID(null);
        });
    }, [submitInputResponse]);
    const handleInputResponseAction = React.useCallback((message, action, options = {}) => {
        if(action === "respond"){
            setInputResponseTarget(message);
            setInputResponseText("");
            return;
        }
        submitInputResponseAction(message, action, options.response || "", options.choice_id || "");
    }, [submitInputResponseAction]);
    const [runSearch, {data: searchData, loading: searchLoading}] = useLazyQuery(CHAT_SEARCH, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.chatSearch.status !== "success"){
                snackActions.error(data.chatSearch.error);
            }
        },
        onError: (error) => snackActions.error(error.message),
    });
    const [loadToolOutput, {data: toolOutputData, loading: toolOutputLoading, error: toolOutputError}] = useLazyQuery(CHAT_TOOL_OUTPUT_QUERY, {
        fetchPolicy: "no-cache",
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
            queueMarkRead(selectedChannelID, lastMessage.id);
        }
    }, [messages, selectedChannelID, queueMarkRead]);

    const standardChannels = channels.filter((channel) => channel.channel_type === "standard" && (showArchived || !channel.archived));
    const aiChannels = channels.filter((channel) => channel.channel_type === "ai" && (showArchived || !channel.archived));
    const channelHasUnread = React.useCallback((channel) => {
        const latestMessageID = channel.last_message_id || 0;
        if(latestMessageID === 0 || channel.id === selectedChannelID){
            return false;
        }
        return (getChannelReadState(readState, channel.id).lastReadMessageID || 0) < latestMessageID;
    }, [readState, selectedChannelID]);
    const activeAIRequest = React.useMemo(() => {
        if(selectedChannel?.channel_type !== "ai"){
            return null;
        }
        return requests.find((request) => request.channel_id === selectedChannel.id && ["pending", "streaming"].includes(request.status)) || null;
    }, [requests, selectedChannel]);
    const slashOptions = React.useMemo(() => (
        getAIChatSlashOptions(selectedChannel, chatContainers, operatorAliases)
    ), [selectedChannel, chatContainers, operatorAliases]);
    const genericAliasOptions = React.useMemo(() => (
        getAIChatGenericAliasOptions(selectedChannel, operatorAliases)
    ), [selectedChannel, operatorAliases]);
    const mainMessages = React.useMemo(() => (
        messages.filter(shouldShowMessageInMainChat)
    ), [messages]);
    const selectedDelegation = React.useMemo(() => {
        if(!selectedDelegationSeed?.id){
            return null;
        }
        const summaryMessage = messages.find((message) => (
            getMessageDelegationID(message) === selectedDelegationSeed.id && Boolean(getSubagentSnapshot(message))
        ));
        const snapshot = getSubagentSnapshot(summaryMessage) || {};
        return {
            ...selectedDelegationSeed,
            name: getMessageDelegationName(summaryMessage) || snapshot.name || selectedDelegationSeed.name,
            title: snapshot.title || selectedDelegationSeed.title,
            prompt: snapshot.prompt || selectedDelegationSeed.prompt || snapshot.title || "",
            snapshot: Object.keys(snapshot).length > 0 ? snapshot : (selectedDelegationSeed.snapshot || {}),
        };
    }, [messages, selectedDelegationSeed]);
    const delegationMessages = React.useMemo(() => {
        if(!selectedDelegation?.id){
            return [];
        }
        return messages.filter((message) => (
            getMessageDelegationID(message) === selectedDelegation.id &&
            !getSubagentSnapshot(message)
        ));
    }, [messages, selectedDelegation?.id]);
    const messageHistory = React.useMemo(() => {
        const seenMessages = new Set();
        return [...messages].reverse().reduce((prev, message) => {
            const messageText = (message.message || "").trim();
            if(message.author_type !== "operator" || message.operator_id !== currentMe?.user?.user_id || message.deleted || messageText === ""){
                return prev;
            }
            if(seenMessages.has(messageText)){
                return prev;
            }
            seenMessages.add(messageText);
            return [...prev, messageText];
        }, []);
    }, [messages, currentMe?.user?.user_id]);
    const delegationMessageHistory = React.useMemo(() => {
        const seenMessages = new Set();
        return [...delegationMessages].reverse().reduce((prev, message) => {
            const messageText = (message.message || "").trim();
            if(message.author_type !== "operator" || message.operator_id !== currentMe?.user?.user_id || message.deleted || messageText === ""){
                return prev;
            }
            if(seenMessages.has(messageText)){
                return prev;
            }
            seenMessages.add(messageText);
            return [...prev, messageText];
        }, []);
    }, [delegationMessages, currentMe?.user?.user_id]);
    const submitMessage = React.useCallback((messageText, delegation = null) => {
        const message = messageText.trim();
        if(!message || !selectedChannel){
            return false;
        }
        createMessage({
            variables: {
                channel_id: selectedChannel.id,
                message,
                delegation_id: delegation?.id || null,
                delegation_name: delegation?.name || null,
            },
        });
        return true;
    }, [createMessage, selectedChannel]);
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
                    selectChannel(generalChannel.id);
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
    const handleMetadataChipClick = React.useCallback((chip) => {
        if(!chip?.click){
            return;
        }
        if(disabledReason){
            snackActions.error(disabledReason);
            return;
        }
        setMetadataClickTarget(chip);
    }, [disabledReason]);
    const confirmMetadataChipClick = React.useCallback(() => {
        if(!metadataClickTarget?.click){
            return;
        }
        submitMessage(metadataClickTarget.click);
        setMetadataClickTarget(null);
    }, [metadataClickTarget, submitMessage]);
    const onCreateChannel = (variables) => createChannel({variables});
    const openSystemMessageDialog = React.useCallback(() => setSystemMessageOpen(true), []);
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
    const toggleMute = React.useCallback((channel) => {
        if(!channel?.id){
            return;
        }
        const previousReadState = getChannelReadState(readStateRef.current, channel.id);
        const nextMuted = !previousReadState.muted;
        setReadState((prev) => ({
            ...prev,
            [channel.id]: {
                ...getChannelReadState(prev, channel.id),
                muted: nextMuted,
            },
        }));
        updateChannel({variables: {channel_id: channel.id, muted: nextMuted}})
            .then(({data}) => {
                if(data?.chatUpdateChannel?.status !== "success"){
                    setReadState((prev) => ({
                        ...prev,
                        [channel.id]: {
                            ...getChannelReadState(prev, channel.id),
                            muted: previousReadState.muted,
                        },
                    }));
                }
            })
            .catch(() => {
                setReadState((prev) => ({
                    ...prev,
                    [channel.id]: {
                        ...getChannelReadState(prev, channel.id),
                        muted: previousReadState.muted,
                    },
                }));
            });
    }, [updateChannel]);
    const saveChannelDetails = (variables) => {
        updateChannel({variables}).then(({data}) => {
            if(data?.chatUpdateChannel?.status === "success"){
                setEditChannelOpen(false);
            }
        }).catch(() => {});
    };
    const openNewChannelDialog = () => {
        setCreateInitialChannel(null);
        setCreateOpen(true);
    };
    const openCloneChannelDialog = () => {
        if(selectedChannel?.channel_type === "ai"){
            setCreateInitialChannel(selectedChannel);
            setCreateOpen(true);
        }
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
        selectChannel(result.channel_id);
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
    const openDelegation = React.useCallback((message) => {
        const delegationID = getMessageDelegationID(message);
        if(!delegationID){
            return;
        }
        const snapshot = getSubagentSnapshot(message) || {};
        setSelectedDelegationSeed({
            id: delegationID,
            name: getMessageDelegationName(message) || snapshot.name || "Sub-agent",
            title: snapshot.title || getMessageDelegationName(message) || "Sub-agent",
            prompt: snapshot.prompt || snapshot.title || message.message || "",
            snapshot,
        });
    }, []);
    const openToolOutput = React.useCallback((message) => {
        if(!message?.id){
            return;
        }
        setToolOutputTarget(message);
        loadToolOutput({variables: {message_id: message.id}});
    }, [loadToolOutput]);
    const reviewSnapshot = getEventingInteractionSnapshot(reviewMessage);
    const metaChips = (
        <>
            <MythicPageHeaderChip label={`${channels.filter((channel) => !channel.archived).length} active`} />
            <MythicPageHeaderChip label={`${aiChannels.length} AI`} />
        </>
    );
    const selectedConfigChips = getChannelConfigChips(selectedChannel, chatContainers);

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
                        <Button size="small" className="mythic-table-row-action-hover-success" variant="contained" startIcon={<AddIcon />} onClick={openNewChannelDialog}>New channel</Button>
                    </Box>
                }
            />
            <Split
                className={`mythic-chat-layout`}
                direction="horizontal"
                sizes={chatSplitSizes}
                minSize={[0, 0]}
                onDragEnd={updateChatSplitSizes}
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
                    <Split
                        className="mythic-chat-channel-split"
                        direction="vertical"
                        sizes={channelSplitSizes}
                        minSize={[90, 90]}
                        gutterSize={5}
                        onDragEnd={updateChannelSplitSizes}
                    >
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
                                        muted={getChannelReadState(readState, channel.id).muted}
                                        chatContainers={chatContainers}
                                        onSelect={selectChannel}
                                        onToggleMute={toggleMute}
                                    />
                                ))
                            )}
                        </Box>
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
                                        muted={getChannelReadState(readState, channel.id).muted}
                                        chatContainers={chatContainers}
                                        onSelect={selectChannel}
                                        onToggleMute={toggleMute}
                                    />
                                ))
                            )}
                        </Box>
                    </Split>
                </Box>
                <Box className="mythic-chat-main">
                    <Box className="mythic-chat-conversation-header">
                        <Box sx={{display: "flex", alignItems: "center", gap: 1, minWidth: 0}}>
                            <Box
                                className="mythic-chat-conversation-icon"
                                sx={{
                                    color: selectedChannel?.channel_type === "ai" ? "" : theme.palette.primary.main,
                                    borderColor: selectedChannel?.channel_type === "ai" ? "" : alpha(theme.palette.primary.main, 0.2),
                                    backgroundColor: selectedChannel?.channel_type === "ai" ? "" : alpha(theme.palette.primary.main, 0.1),
                                }}
                            >
                                {selectedChannel?.channel_type === "ai" ? (
                                    <MythicChatContainerIcon
                                        className="mythic-chat-conversation-icon"
                                        altText={selectedChannel?.chat_container?.name || channelDisplayName(selectedChannel)}
                                        containerName={selectedChannel?.chat_container?.name}
                                        iconProps={{fontSize: "small"}}
                                    />
                                ) : (
                                    <ForumTwoToneIcon fontSize="small" />
                                )}
                            </Box>
                            <Box sx={{minWidth: 0}}>
                                <Typography className="mythic-chat-conversation-title" variant="subtitle1" noWrap>{selectedChannel ? channelDisplayName(selectedChannel) : "Chat"}</Typography>
                                <Typography className="mythic-chat-conversation-subtitle" variant="caption" color="text.secondary" noWrap>
                                    {selectedChannel?.description || selectedChannel?.chat_container?.name || ""}
                                </Typography>
                                {selectedConfigChips.length > 0 &&
                                    <ChatDisplayChipRow chips={selectedConfigChips} className="mythic-chat-header-config-chips" />
                                }
                            </Box>
                        </Box>
                        <Box className="mythic-chat-header-actions">
                            {selectedChannel &&
                                <MythicStyledTooltip title={selectedChannelMuted ? "Unsilence notifications" : "Silence notifications"}>
                                    <IconButton size="small" onClick={() => toggleMute(selectedChannel)}>
                                        {selectedChannelMuted ? <NotificationsOffIcon fontSize="small" /> : <NotificationsActiveIcon fontSize="small" />}
                                    </IconButton>
                                </MythicStyledTooltip>
                            }
                            {selectedChannel &&
                                <MythicStyledTooltip title="Edit channel">
                                    <IconButton size="small" onClick={() => setEditChannelOpen(true)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </MythicStyledTooltip>
                            }
                            {selectedChannel?.channel_type === "ai" &&
                                <MythicStyledTooltip title="Clone AI chat">
                                    <IconButton size="small" onClick={openCloneChannelDialog}>
                                        <ContentCopyIcon fontSize="small" />
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
                    <Split
                        className="mythic-chat-layout mythic-chat-delegation-split"
                        direction="horizontal"
                        sizes={selectedDelegation ? delegationSplitSizes : [100, 0]}
                        minSize={selectedDelegation ? [0, 320] : [0, 0]}
                        gutterSize={selectedDelegation ? 5 : 0}
                        onDragEnd={selectedDelegation ? updateDelegationSplitSizes : undefined}
                    >
                        <Box sx={{display: "flex", flex: "1 1 auto", flexDirection: "column", minHeight: 0, minWidth: 0, overflow: "hidden"}}>
                            <ChatChannelMetadataBar channel={selectedChannel} onChipClick={handleMetadataChipClick} />
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
                                ) : mainMessages.length === 0 ? (
                                    <ChatEmptyState
                                        icon={selectedChannel.channel_type === "ai" ? <SmartToyTwoToneIcon fontSize="large" /> : <ForumTwoToneIcon fontSize="large" />}
                                        title="No main-channel messages"
                                        detail="Delegated activity is available from sub-agent cards."
                                    />
                                ) : (
                                    mainMessages.map((message) => (
                                        <MessageBubble
                                            key={message.id}
                                            message={message}
                                            request={message.chat_request_id ? requestsByID[message.chat_request_id] : null}
                                            me={currentMe}
                                            onEdit={beginEdit}
                                            onDelete={(messageID) => deleteMessage({variables: {message_id: messageID}})}
                                            onRetry={(requestID) => retryRequest({variables: {request_id: requestID}})}
                                            onRefreshSpecial={refreshChatSpecialMessage}
                                            onReviewSpecial={reviewChatSpecialMessage}
                                            onSubmitInputResponse={handleInputResponseAction}
                                            onOpenDelegation={openDelegation}
                                            onViewToolOutput={openToolOutput}
                                            refreshingSpecialMessageID={refreshingSpecialMessageID}
                                            submittingInputResponseID={submittingInputResponseID}
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
                            <ChatComposer
                                selectedChannel={selectedChannel}
                                slashOptions={slashOptions}
                                genericAliasOptions={genericAliasOptions}
                                messageHistory={messageHistory}
                                disabledReason={disabledReason}
                                activeAIRequest={activeAIRequest}
                                canCreateSystemMessage={canCreateSystemMessage}
                                isMythicAdmin={isMythicAdmin}
                                onOpenSystemMessage={openSystemMessageDialog}
                                onSendMessage={submitMessage}
                                onCancelRequest={(requestID) => cancelRequest({variables: {request_id: requestID}})}
                            />
                        </Box>
                        <Box sx={{display: selectedDelegation ? "flex" : "none", height: "100%", minHeight: 0, minWidth: 0, overflow: "hidden"}}>
                            {selectedDelegation &&
                            <ChatDelegationPane
                                delegation={selectedDelegation}
                                messages={delegationMessages}
                                requestsByID={requestsByID}
                                me={currentMe}
                                selectedChannel={selectedChannel}
                                slashOptions={slashOptions}
                                genericAliasOptions={genericAliasOptions}
                                messageHistory={delegationMessageHistory}
                                disabledReason={disabledReason}
                                activeAIRequest={activeAIRequest}
                                onClose={() => setSelectedDelegationSeed(null)}
                                onSendMessage={submitMessage}
                                onCancelRequest={(requestID) => cancelRequest({variables: {request_id: requestID}})}
                                onEdit={beginEdit}
                                onDelete={(messageID) => deleteMessage({variables: {message_id: messageID}})}
                                onRetry={(requestID) => retryRequest({variables: {request_id: requestID}})}
                                onRefreshSpecial={refreshChatSpecialMessage}
                                onReviewSpecial={reviewChatSpecialMessage}
                                onSubmitInputResponse={handleInputResponseAction}
                                onViewToolOutput={openToolOutput}
                                refreshingSpecialMessageID={refreshingSpecialMessageID}
                                submittingInputResponseID={submittingInputResponseID}
                                editingID={editingID}
                                editText={editText}
                                setEditText={setEditText}
                                saveEdit={saveEdit}
                                cancelEdit={() => {setEditingID(null); setEditText("");}}
                            />
                            }
                        </Box>
                    </Split>
                </Box>
            </Split>
            {createOpen &&
                <ChatCreateDialog
                    open={createOpen}
                    onClose={() => {setCreateOpen(false); setCreateInitialChannel(null);}}
                    onCreate={onCreateChannel}
                    chatContainers={chatContainers}
                    currentUser={currentUser}
                    operationBot={operationBot}
                    initialChannel={createInitialChannel}
                />
            }
            {editChannelOpen &&
                <ChatEditChannelDialog
                    open={editChannelOpen}
                    channel={selectedChannel}
                    chatContainers={chatContainers}
                    onClose={() => setEditChannelOpen(false)}
                    onSave={saveChannelDetails}
                    currentUser={currentUser}
                    operationBot={operationBot}
                />
            }
            {systemMessageOpen &&
                <ChatSystemMessageDialog
                    open={systemMessageOpen}
                    selectedChannel={selectedChannel}
                    isMythicAdmin={isMythicAdmin}
                    onClose={() => setSystemMessageOpen(false)}
                    onSend={submitSystemMessage}
                />
            }
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
            {metadataClickTarget &&
                <MythicConfirmDialog
                    open={Boolean(metadataClickTarget)}
                    title="Run Chat Action?"
                    dialogText={metadataClickTarget.clickConfirmationText || `Run ${metadataClickTarget.click}?`}
                    acceptText="Run"
                    acceptColor="info"
                    onClose={() => setMetadataClickTarget(null)}
                    onSubmit={confirmMetadataChipClick}
                />
            }
            {searchOpen &&
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
            }
            {inputResponseTarget &&
                <Dialog open={Boolean(inputResponseTarget)} onClose={() => {setInputResponseTarget(null); setInputResponseText("");}} maxWidth="sm" fullWidth>
                    <DialogTitle>Respond To Input Request</DialogTitle>
                    <DialogContent className="mythic-chat-dialog-content" sx={{display: "flex", flexDirection: "column", gap: 1.75, pt: "20px !important", px: 3}}>
                        <TextField
                            autoFocus
                            fullWidth
                            multiline
                            minRows={4}
                            size="small"
                            label="Response"
                            value={inputResponseText}
                            onChange={(e) => setInputResponseText(e.target.value)}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => {setInputResponseTarget(null); setInputResponseText("");}}>Cancel</Button>
                        <Button
                            variant="contained"
                            disabled={inputResponseText.trim() === "" || submittingInputResponseID === inputResponseTarget?.id}
                            onClick={() => submitInputResponseAction(inputResponseTarget, "respond", inputResponseText.trim())}
                        >
                            Send
                        </Button>
                    </DialogActions>
                </Dialog>
            }
            {toolOutputTarget &&
                <Dialog
                    open={Boolean(toolOutputTarget)}
                    onClose={() => setToolOutputTarget(null)}
                    maxWidth="lg"
                    fullWidth
                    PaperProps={{
                        sx: {
                            height: "82vh",
                            maxHeight: "82vh",
                        },
                    }}
                >
                <DialogTitle sx={{px: 1.5, py: 1}}>Tool Output</DialogTitle>
                    <DialogContent
                        className="mythic-chat-dialog-content"
                        sx={{
                            display: "flex",
                            flex: "1 1 auto",
                            flexDirection: "column",
                            minHeight: 0,
                            overflow: "hidden",
                            p: "0 !important",
                        }}
                    >
                        {toolOutputLoading ? (
                            <Typography variant="body2" color="text.secondary" sx={{p: 2}}>Loading output...</Typography>
                        ) : toolOutputError ? (
                            <Typography variant="body2" color="error" sx={{p: 2}}>{toolOutputError.message}</Typography>
                        ) : (
                            <Box sx={{display: "flex", flex: "1 1 auto", minHeight: 0, minWidth: 0}}>
                                <ResponseDisplayPlaintext
                                    plaintext={toolOutputData?.chat_message_by_pk?.tool_output || "No tool output stored for this message."}
                                    initial_render_mode="plaintext"
                                    initial_show_options={true}
                                    toolbarTitle="Tool output"
                                    autoFormat={false}
                                    expand={true}
                                    readOnly={true}
                                    enableCredentialCreation={false}
                                />
                            </Box>
                        )}
                    </DialogContent>
                <DialogActions sx={{px: 1.5, py: 1}}>
                        <Button onClick={() => setToolOutputTarget(null)}>Close</Button>
                    </DialogActions>
                </Dialog>
            }
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

const getChatMarkdownSurfaceSx = (theme) => {
    const chatMessageColors = theme.chat?.message || {};
    return {
        "--mythic-chat-markdown-border": theme.table?.borderSoft || theme.borderColor || theme.palette.divider,
        "--mythic-chat-markdown-surface": chatMessageColors.markdownSurface,
        "--mythic-chat-markdown-surface-strong": chatMessageColors.markdownSurfaceStrong,
    };
};

const ChatAssistantMessage = ({message, timestamp, viewUTCTime}) => {
    const theme = useTheme();
    const formattedTimestamp = formatTimestamp(timestamp, viewUTCTime);
    return (
        <Box
            className="mythic-chat-assistant-message"
            sx={getChatMarkdownSurfaceSx(theme)}
        >
            {formattedTimestamp &&
                <Typography variant="caption" color="text.secondary" className="mythic-chat-assistant-timestamp">
                    {formattedTimestamp}
                </Typography>
            }
            <MarkdownMessage message={message} />
        </Box>
    );
};

const CHAT_SPECIAL_TYPE_EVENTING_USER_INTERACTION = "eventing_user_interaction";
const CHAT_SPECIAL_TYPE_INPUT_REQUESTED = "input_requested";
const CHAT_SPECIAL_TYPE_TOOL_USE = "tool_use";
const CHAT_SPECIAL_TYPE_SUBAGENT = "subagent";

const subagentFallbackIcons = ["SA", "AI", "OPS", "T1", "JOB", "RUN"];
const subagentFallbackPalette = ["info", "success", "warning", "primary", "secondary"];

const getChatMessageMetadata = (message) => {
    const metadata = message?.metadata || {};
    if(typeof metadata === "string"){
        try{
            const parsed = JSON.parse(metadata);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        }catch(error){
            return {};
        }
    }
    return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
};

const getMetadataString = (metadata, key) => {
    const value = metadata?.[key];
    return typeof value === "string" ? value.trim() : "";
};

const getMessageDelegationID = (message) => getMetadataString(getChatMessageMetadata(message), "delegation_id");

const getMessageDelegationName = (message) => getMetadataString(getChatMessageMetadata(message), "delegation_name");

const getEventingInteractionSnapshot = (message) => {
    const metadata = getChatMessageMetadata(message);
    if(metadata.special_type !== CHAT_SPECIAL_TYPE_EVENTING_USER_INTERACTION){
        return null;
    }
    const snapshot = metadata.eventing_user_interaction || {};
    return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot : {};
};

const getInputRequestedSnapshot = (message) => {
    const metadata = getChatMessageMetadata(message);
    if(metadata.special_type !== CHAT_SPECIAL_TYPE_INPUT_REQUESTED){
        return null;
    }
    const snapshot = metadata.input_requested || {};
    return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot : {};
};

const getToolUseSnapshot = (message) => {
    const metadata = getChatMessageMetadata(message);
    if(metadata.special_type !== CHAT_SPECIAL_TYPE_TOOL_USE){
        return null;
    }
    const snapshot = metadata.tool_use || {};
    return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot : {};
};

const getSubagentSnapshot = (message) => {
    const metadata = getChatMessageMetadata(message);
    if(metadata.special_type !== CHAT_SPECIAL_TYPE_SUBAGENT){
        return null;
    }
    const snapshot = metadata.subagent || {};
    return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot : {};
};

const hashStringToIndex = (value, length) => {
    if(length <= 0){
        return 0;
    }
    const text = `${value || ""}`;
    let hash = 0;
    for(let i = 0; i < text.length; i++){
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % length;
};

const isPendingChatHumanInteraction = (message) => {
    const inputRequestedSnapshot = getInputRequestedSnapshot(message);
    if(inputRequestedSnapshot){
        return (inputRequestedSnapshot.status || "pending") === "pending";
    }
    const eventingInteractionSnapshot = getEventingInteractionSnapshot(message);
    if(eventingInteractionSnapshot){
        return Boolean(eventingInteractionSnapshot.waiting);
    }
    return false;
};

const shouldShowMessageInMainChat = (message) => {
    const delegationID = getMessageDelegationID(message);
    if(!delegationID){
        return true;
    }
    if(getSubagentSnapshot(message)){
        return true;
    }
    return isPendingChatHumanInteraction(message);
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

const ChatEventingUserInteractionEvent = ({message, me, onRefresh, onReview, refreshing}) => {
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
    const [showDetails, setShowDetails] = useState(waiting);
    React.useEffect(() => {
        if(!waiting){
            setShowDetails(false);
        }
    }, [waiting]);
    return (
        <Box className={`mythic-chat-inline-event mythic-chat-inline-event-${stateClass}`.trim()}>
            <Box className="mythic-chat-inline-event-summary">
                <Box className="mythic-chat-inline-event-main">
                    <Chip
                        size="small"
                        className={`mythic-chat-special-status mythic-chat-special-status-${stateClass}`.trim()}
                        label={statusText}
                        variant="outlined"
                    />
                    <Typography className="mythic-chat-inline-event-title" variant="body2" noWrap>
                        Eventing interaction: {stepName}
                    </Typography>
                </Box>
                <Box className="mythic-chat-inline-event-actions">
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
                    {waiting &&
                        <Button
                            size="small"
                            variant="contained"
                            className="mythic-table-row-action mythic-table-row-action-hover-success"
                            onClick={() => onReview(message)}
                        >
                            Review
                        </Button>
                    }
                    <Button
                        size="small"
                        variant="text"
                        className="mythic-chat-inline-details-toggle"
                        startIcon={showDetails ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                        onClick={() => setShowDetails((open) => !open)}
                    >
                        Details
                    </Button>
                </Box>
            </Box>
            <Collapse in={showDetails} timeout="auto" unmountOnExit>
                <Box className="mythic-chat-inline-event-details">
                    <Typography variant="caption" className="mythic-chat-inline-event-description">
                        {getChatEventingPrompt(snapshot)}
                    </Typography>
                    <Box className="mythic-chat-special-card-details">
                        {detailItems.map((item) => (
                            <span className="mythic-chat-special-card-detail" key={`${message.id}-${item.label}`}>
                                <span className="mythic-chat-special-card-detail-label">{item.label}</span>
                                <span className="mythic-chat-special-card-detail-value">{item.value}</span>
                            </span>
                        ))}
                    </Box>
                    {refreshedAt &&
                        <Typography className="mythic-chat-special-card-refresh-time" variant="caption">
                            Refreshed {formatTimestamp(refreshedAt, me?.user?.view_utc_time)}
                        </Typography>
                    }
                </Box>
            </Collapse>
        </Box>
    );
};

const getInputRequestedStatusText = (snapshot) => {
    const status = snapshot.status || "pending";
    if(status === "pending"){
        return "Input requested";
    }
    if(status === "accepted"){
        return "Accepted";
    }
    if(status === "rejected"){
        return "Rejected";
    }
    if(status === "responded"){
        return "Responded";
    }
    if(status === "selected"){
        return "Selected";
    }
    if(status === "cancelled"){
        return "Cancelled";
    }
    return status;
};

const getInputRequestedStateClass = (snapshot) => {
    switch(snapshot.status || "pending"){
        case "accepted":
        case "selected":
            return "success";
        case "rejected":
        case "cancelled":
            return "error";
        case "responded":
            return "queued";
        case "pending":
            return "waiting";
        default:
            return "neutral";
    }
};

const ChatInputRequestedEvent = ({message, me, onSubmit, submitting}) => {
    const snapshot = getInputRequestedSnapshot(message) || {};
    const pending = (snapshot.status || "pending") === "pending";
    const stateClass = getInputRequestedStateClass(snapshot);
    const statusText = getInputRequestedStatusText(snapshot);
    const inputType = snapshot.input_type || "approval";
    const title = snapshot.title || "Input requested";
    const prompt = snapshot.prompt || message.message || "";
    const choices = Array.isArray(snapshot.choices) ? snapshot.choices : [];
    const response = snapshot.response && typeof snapshot.response === "object" && !Array.isArray(snapshot.response) ? snapshot.response : null;
    const [showDetails, setShowDetails] = useState(pending);
    React.useEffect(() => {
        if(!pending){
            setShowDetails(false);
        }
    }, [pending]);
    const detailItems = [
        {label: "Type", value: inputType},
        message.updated_at ? {label: "Updated", value: formatTimestamp(message.updated_at, me?.user?.view_utc_time)} : null,
        snapshot.resolved_at ? {label: "Resolved", value: formatTimestamp(snapshot.resolved_at, me?.user?.view_utc_time)} : null,
        snapshot.resolved_by ? {label: "Resolved by", value: snapshot.resolved_by} : null,
        response?.action ? {label: "Action", value: response.action} : null,
    ].filter(Boolean);
    const dataText = jsonTextForConfigValue(snapshot.data || {});
    const responseText = response ? jsonTextForConfigValue(response) : "";
    return (
        <Box className={`mythic-chat-inline-event mythic-chat-inline-event-${stateClass}`.trim()}>
            <Box className="mythic-chat-inline-event-summary">
                <Box className="mythic-chat-inline-event-main">
                    <Chip
                        size="small"
                        className={`mythic-chat-special-status mythic-chat-special-status-${stateClass}`.trim()}
                        label={statusText}
                        variant="outlined"
                    />
                    <Typography className="mythic-chat-inline-event-title" variant="body2" noWrap>
                        {title}
                    </Typography>
                </Box>
                <Box className="mythic-chat-inline-event-actions">
                    {pending && inputType === "approval" &&
                        <>
                            <Button
                                size="small"
                                variant="contained"
                                className="mythic-table-row-action mythic-table-row-action-hover-success"
                                disabled={submitting}
                                onClick={() => onSubmit(message, "accept")}
                            >
                                Accept
                            </Button>
                            <Button
                                size="small"
                                variant="text"
                                disabled={submitting}
                                onClick={() => onSubmit(message, "reject")}
                            >
                                Reject
                            </Button>
                            <Button
                                size="small"
                                variant="text"
                                disabled={submitting}
                                onClick={() => onSubmit(message, "respond")}
                            >
                                Respond
                            </Button>
                        </>
                    }
                    {pending && inputType === "text" &&
                        <Button
                            size="small"
                            variant="contained"
                            className="mythic-table-row-action mythic-table-row-action-hover-success"
                            disabled={submitting}
                            onClick={() => onSubmit(message, "respond")}
                        >
                            Respond
                        </Button>
                    }
                    <Button
                        size="small"
                        variant="text"
                        className="mythic-chat-inline-details-toggle"
                        startIcon={showDetails ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                        onClick={() => setShowDetails((open) => !open)}
                    >
                        Details
                    </Button>
                </Box>
            </Box>
            <Collapse in={showDetails} timeout="auto" unmountOnExit>
                <Box className="mythic-chat-inline-event-details">
                    {prompt &&
                        <Typography variant="caption" className="mythic-chat-inline-event-description">
                            {prompt}
                        </Typography>
                    }
                    {snapshot.description &&
                        <Typography variant="caption" className="mythic-chat-inline-event-description">
                            {snapshot.description}
                        </Typography>
                    }
                    {pending && inputType === "single_choice" &&
                        <Box className="mythic-chat-input-choice-list">
                            {choices.map((choice, index) => {
                                const choiceID = choice?.id || `${index}`;
                                return (
                                    <Button
                                        key={`${message.id}-choice-${choiceID}`}
                                        className="mythic-chat-input-choice"
                                        disabled={submitting}
                                        onClick={() => onSubmit(message, "select", {choice_id: choiceID})}
                                        variant="outlined"
                                    >
                                        <Box className="mythic-chat-input-choice-content">
                                            <Typography variant="body2" className="mythic-chat-input-choice-label">
                                                {choice?.label || choiceID}
                                            </Typography>
                                            {choice?.description &&
                                                <Typography variant="caption" color="text.secondary" className="mythic-chat-input-choice-description">
                                                    {choice.description}
                                                </Typography>
                                            }
                                        </Box>
                                    </Button>
                                );
                            })}
                        </Box>
                    }
                    <Box className="mythic-chat-special-card-details">
                        {detailItems.map((item) => (
                            <span className="mythic-chat-special-card-detail" key={`${message.id}-${item.label}`}>
                                <span className="mythic-chat-special-card-detail-label">{item.label}</span>
                                <span className="mythic-chat-special-card-detail-value">{item.value}</span>
                            </span>
                        ))}
                    </Box>
                    {dataText !== "{}" &&
                        <Typography component="pre" variant="caption" className="mythic-chat-input-data">
                            {dataText}
                        </Typography>
                    }
                    {responseText &&
                        <Typography component="pre" variant="caption" className="mythic-chat-input-data">
                            {responseText}
                        </Typography>
                    }
                </Box>
            </Collapse>
        </Box>
    );
};

const getToolUseStatusText = (snapshot) => {
    switch(snapshot.status || "started"){
        case "started":
            return "Running";
        case "completed":
            return "Finished";
        case "error":
            return "Failed";
        case "waiting_confirmation":
            return "Waiting confirmation";
        default:
            return snapshot.status || "Tool use";
    }
};

const getToolUseStateClass = (snapshot) => {
    switch(snapshot.status || "started"){
        case "completed":
            return "success";
        case "error":
            return "error";
        case "waiting_confirmation":
            return "waiting";
        case "started":
            return "running";
        default:
            return "neutral";
    }
};

const getSubagentStatusText = (snapshot) => {
    switch(`${snapshot.status || "running"}`.toLowerCase()){
        case "finished":
        case "completed":
        case "complete":
            return "Finished";
        case "failed":
        case "error":
            return "Failed";
        case "cancelled":
            return "Cancelled";
        case "running":
        case "started":
            return "Running";
        default:
            return snapshot.status || "Sub-agent";
    }
};

const getSubagentStateClass = (snapshot) => {
    switch(`${snapshot.status || "running"}`.toLowerCase()){
        case "finished":
        case "completed":
        case "complete":
            return "success";
        case "failed":
        case "error":
        case "cancelled":
            return "error";
        case "running":
        case "started":
            return "running";
        default:
            return "neutral";
    }
};

const isTerminalSubagentSnapshot = (snapshot) => ["finished", "completed", "complete", "failed", "error", "cancelled"].includes(`${snapshot.status || ""}`.toLowerCase());

const normalizeFontAwesomeIconName = (value) => {
    const text = `${value || ""}`.trim();
    if(text === ""){
        return "";
    }
    if(text.includes(" ")){
        const parts = text.split(/\s+/).filter(Boolean);
        return normalizeFontAwesomeIconName(parts[parts.length - 1]);
    }
    return text
        .replace(/^fas?-/, "")
        .replace(/^fa-/, "")
        .replace(/^fa(?=[A-Z])/, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/_/g, "-")
        .toLowerCase();
};

const resolveSubagentFontAwesomeIcon = (iconName) => {
    const text = `${iconName || ""}`.trim();
    if(text === ""){
        return null;
    }
    const browserScriptIcon = getIconName(text);
    if(browserScriptIcon && typeof browserScriptIcon === "object"){
        return browserScriptIcon;
    }
    const normalizedIconName = normalizeFontAwesomeIconName(text);
    if(normalizedIconName === ""){
        return null;
    }
    return findIconDefinition({prefix: "fas", iconName: normalizedIconName}) || null;
};

const getSubagentVisual = (delegationID, snapshot, theme) => {
    const hashSource = delegationID || snapshot.title || snapshot.name || "subagent";
    const fallbackIcon = subagentFallbackIcons[hashStringToIndex(hashSource, subagentFallbackIcons.length)];
    const paletteName = subagentFallbackPalette[hashStringToIndex(`${hashSource}:color`, subagentFallbackPalette.length)];
    const fallbackColor = theme.palette[paletteName]?.main || theme.palette.info.main;
    const configuredIcon = `${snapshot.icon || ""}`.trim();
    const fontAwesomeIcon = resolveSubagentFontAwesomeIcon(configuredIcon);
    return {
        icon: fontAwesomeIcon ? "" : `${configuredIcon || fallbackIcon}`.slice(0, 4),
        fontAwesomeIcon,
        color: snapshot.icon_color || fallbackColor,
    };
};

const ChatSubagentAvatar = ({visual, size = 26}) => {
    const theme = useTheme();
    const visualSoftColor = React.useMemo(() => {
        try{
            return alpha(visual.color, theme.palette.mode === "dark" ? 0.2 : 0.12);
        }catch(error){
            return alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.2 : 0.12);
        }
    }, [theme, visual.color]);
    const visualBorderColor = React.useMemo(() => {
        try{
            return alpha(visual.color, 0.4);
        }catch(error){
            return alpha(theme.palette.info.main, 0.4);
        }
    }, [theme.palette.info.main, visual.color]);
    return (
        <Box
            sx={{
                alignItems: "center",
                backgroundColor: visualSoftColor,
                border: `1px solid ${visualBorderColor}`,
                borderRadius: 1,
                color: visual.color,
                display: "inline-flex",
                flex: "0 0 auto",
                fontSize: size > 28 ? "0.78rem" : "0.68rem",
                fontWeight: 850,
                height: size,
                justifyContent: "center",
                lineHeight: 1,
                minWidth: size,
                px: 0.5,
            }}
        >
            {visual.fontAwesomeIcon ? (
                <FontAwesomeIcon icon={visual.fontAwesomeIcon} />
            ) : (
                visual.icon
            )}
        </Box>
    );
};

const ChatSubagentEvent = ({message, me, onOpenDelegation}) => {
    const theme = useTheme();
    const snapshot = getSubagentSnapshot(message) || {};
    const delegationID = getMessageDelegationID(message);
    const delegationName = getMessageDelegationName(message) || snapshot.name || "Sub-agent";
    const summaryOutput = [message.message, snapshot.summary, snapshot.output, snapshot.result, snapshot.final_output]
        .find((value) => typeof value === "string" && value.trim()) || "";
    const title = snapshot.title || delegationName;
    const stateClass = getSubagentStateClass(snapshot);
    const visual = getSubagentVisual(delegationID, snapshot, theme);
    const terminal = isTerminalSubagentSnapshot(snapshot);
    const prompt = snapshot.prompt || "";
    const toolCount = Number(snapshot.tool_count ?? snapshot.tools_done ?? snapshot.completed_tools);
    const toolTotal = Number(snapshot.tool_total ?? snapshot.tools_total ?? snapshot.total_tools);
    const hasProgress = !Number.isNaN(toolCount) && !Number.isNaN(toolTotal) && toolTotal > 0;
    const [showDetails, setShowDetails] = useState(false);
    const detailItems = [
        delegationName ? {label: "Agent", value: delegationName} : null,
        delegationID ? {label: "Delegation", value: delegationID} : null,
        message.updated_at ? {label: terminal ? "End" : "Updated", value: formatTimestamp(message.updated_at, me?.user?.view_utc_time)} : null,
    ].filter(Boolean);
    return (
        <Box className={`mythic-chat-inline-event mythic-chat-inline-event-${stateClass}`.trim()}>
            <Box className="mythic-chat-inline-event-summary">
                <Box className="mythic-chat-inline-event-main">
                    <ChatSubagentAvatar visual={visual} />
                    <Chip
                        size="small"
                        className={`mythic-chat-special-status mythic-chat-special-status-${stateClass}`.trim()}
                        label={getSubagentStatusText(snapshot)}
                        variant="outlined"
                    />
                    {hasProgress &&
                        <Chip
                            size="small"
                            className={`mythic-chat-special-status mythic-chat-special-status-${stateClass}`.trim()}
                            label={`${toolCount}/${toolTotal} tools`}
                            variant="outlined"
                        />
                    }
                    <Typography className="mythic-chat-inline-event-title" variant="body2" noWrap>
                        {title}
                    </Typography>
                </Box>
                <Box className="mythic-chat-inline-event-actions">
                    {summaryOutput &&
                        <Button
                            size="small"
                            variant="text"
                            className="mythic-chat-inline-details-toggle"
                            startIcon={showDetails ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                            onClick={() => setShowDetails((open) => !open)}
                        >
                            Summary
                        </Button>
                    }
                    {onOpenDelegation &&
                        <Button
                            size="small"
                            variant="outlined"
                            className="mythic-chat-inline-details-toggle"
                            onClick={() => onOpenDelegation(message)}
                        >
                            Open
                        </Button>
                    }
                </Box>
            </Box>
            <Collapse in={showDetails} timeout="auto" unmountOnExit>
                <Box className="mythic-chat-inline-event-details">
                    {prompt &&
                        <Typography variant="caption" className="mythic-chat-inline-event-description">
                            {prompt}
                        </Typography>
                    }
                    <Box className="mythic-chat-special-card-details">
                        {detailItems.map((item) => (
                            <span className="mythic-chat-special-card-detail" key={`${message.id}-${item.label}`}>
                                <span className="mythic-chat-special-card-detail-label">{item.label}</span>
                                <span className="mythic-chat-special-card-detail-value">{item.value}</span>
                            </span>
                        ))}
                    </Box>
                    {summaryOutput &&
                        <Box
                            className="mythic-chat-assistant-message mythic-chat-subagent-summary-output"
                            sx={getChatMarkdownSurfaceSx(theme)}
                        >
                            <MarkdownMessage message={summaryOutput} />
                        </Box>
                    }
                </Box>
            </Collapse>
        </Box>
    );
};

const ChatToolUseEvent = ({message, me, onViewToolOutput}) => {
    const snapshot = getToolUseSnapshot(message) || {};
    const [showDetails, setShowDetails] = useState(false);
    const stateClass = getToolUseStateClass(snapshot);
    const toolName = snapshot.tool_name || "unknown_tool";
    const source = snapshot.tool_source || "unknown";
    const sourceLabel = source === "mcp" ? "MCP" : source === "mythic" ? "Mythic" : "Tool";
    const isDuplicateMCPConfirmationWait = source === "mcp" && (snapshot.status || "") === "waiting_confirmation";
    const detailItems = [
        {label: "Source", value: source},
        snapshot.server_name ? {label: "Server", value: snapshot.server_name} : null,
        snapshot.tool_call_id ? {label: "Call ID", value: snapshot.tool_call_id} : null,
        snapshot.tool_call_round ? {label: "Round", value: snapshot.tool_call_round} : null,
        snapshot.tool_call_count ? {label: "Call", value: `${snapshot.tool_call_index || 1} of ${snapshot.tool_call_count}`} : null,
        snapshot.requires_confirmation ? {label: "Confirmation", value: "Required"} : null,
        snapshot.confirmed ? {label: "Approval", value: "Confirmed"} : null,
        message.updated_at ? {label: "Updated", value: formatTimestamp(message.updated_at, me?.user?.view_utc_time)} : null,
    ].filter(Boolean);
    if(isDuplicateMCPConfirmationWait){
        return null;
    }
    return (
        <Box className={`mythic-chat-inline-event mythic-chat-inline-event-${stateClass}`.trim()}>
            <Box className="mythic-chat-inline-event-summary">
                <Box className="mythic-chat-inline-event-main">
                    <Chip
                        size="small"
                        className={`mythic-chat-special-status mythic-chat-special-status-${stateClass}`.trim()}
                        label={getToolUseStatusText(snapshot)}
                        variant="outlined"
                    />
                    <Typography className="mythic-chat-inline-event-title" variant="body2" noWrap>
                        {sourceLabel} tool: {toolName}
                    </Typography>
                </Box>
                <Button
                    size="small"
                    variant="text"
                    className="mythic-chat-inline-details-toggle"
                    startIcon={showDetails ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                    onClick={() => setShowDetails((open) => !open)}
                >
                    Details
                </Button>
                {snapshot.output_available && onViewToolOutput &&
                    <Button
                        size="small"
                        variant="outlined"
                        className="mythic-chat-inline-details-toggle"
                        onClick={() => onViewToolOutput(message)}
                    >
                        View output
                    </Button>
                }
            </Box>
            <Collapse in={showDetails} timeout="auto" unmountOnExit>
                <Box className="mythic-chat-inline-event-details">
                    {message.message &&
                        <Typography variant="caption" className="mythic-chat-inline-event-description">
                            {message.message}
                        </Typography>
                    }
                    <Box className="mythic-chat-special-card-details">
                        {detailItems.map((item) => (
                            <span className="mythic-chat-special-card-detail" key={`${message.id}-${item.label}`}>
                                <span className="mythic-chat-special-card-detail-label">{item.label}</span>
                                <span className="mythic-chat-special-card-detail-value">{item.value}</span>
                            </span>
                        ))}
                    </Box>
                    {snapshot.result_preview &&
                        <Typography component="pre" variant="caption" className="mythic-chat-tooluse-result">
                            {snapshot.result_preview}
                        </Typography>
                    }
                </Box>
            </Collapse>
        </Box>
    );
};

const ChatSpecialEventFrame = ({message, me, children}) => {
    const theme = useTheme();
    const formattedTimestamp = formatTimestamp(message.created_at, me?.user?.view_utc_time);
    return (
        <Box
            sx={{
                ...getChatMarkdownSurfaceSx(theme),
                minWidth: 0,
                width: "100%",
            }}
        >
            {formattedTimestamp &&
                <Typography variant="caption" color="text.secondary" className="mythic-chat-assistant-timestamp">
                    {formattedTimestamp}
                </Typography>
            }
            {children}
        </Box>
    );
};

export const MessageBubble = ({message, request, me, onEdit, onDelete, onRetry, onRefreshSpecial, onReviewSpecial, onSubmitInputResponse, onOpenDelegation, onViewToolOutput, refreshingSpecialMessageID, submittingInputResponseID, editing, editText, setEditText, saveEdit, cancelEdit}) => {
    const theme = useTheme();
    const [actionMenuAnchor, setActionMenuAnchor] = React.useState(null);
    const isMine = message.operator_id === me?.user?.user_id;
    const isAI = message.author_type === "ai";
    const isSystem = message.author_type === "system";
    const eventingInteractionSnapshot = getEventingInteractionSnapshot(message);
    const inputRequestedSnapshot = getInputRequestedSnapshot(message);
    const toolUseSnapshot = getToolUseSnapshot(message);
    const subagentSnapshot = getSubagentSnapshot(message);
    const canEdit = isMine && message.author_type === "operator" && !message.deleted;
    const canDelete = !message.deleted && (isMine || message.author_type !== "operator");
    const canCopy = !message.deleted && `${message.message || ""}` !== "";
    const hasMessageActions = canCopy || canEdit || canDelete;
    const streaming = message.status === "streaming";
    const softBorderColor = theme.table?.borderSoft || theme.borderColor || theme.palette.divider;
    const chatMessageColors = theme.chat?.message || {};
    const markdownSurface = chatMessageColors.markdownSurface;
    const markdownSurfaceStrong = chatMessageColors.markdownSurfaceStrong;
    const messageBackgroundColor = isSystem ? chatMessageColors.systemBackground :
        isMine ? chatMessageColors.selfBackground :
            chatMessageColors.operatorBackground;
    const closeActionMenu = () => setActionMenuAnchor(null);
    const copyMessageText = async () => {
        const text = `${message.message || ""}`;
        closeActionMenu();
        try {
            if(typeof navigator !== "undefined" && navigator.clipboard?.writeText){
                await navigator.clipboard.writeText(text);
            } else if(typeof document !== "undefined"){
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.setAttribute("readonly", "");
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
            } else {
                throw new Error("clipboard unavailable");
            }
            snackActions.success("Copied message text");
        } catch (error) {
            snackActions.error("Failed to copy message text");
        }
    };
    if(subagentSnapshot){
        return (
            <ChatSpecialEventFrame message={message} me={me}>
                <ChatSubagentEvent message={message} me={me} onOpenDelegation={onOpenDelegation} />
            </ChatSpecialEventFrame>
        );
    }
    if(toolUseSnapshot){
        if((toolUseSnapshot.tool_source || "unknown") === "mcp" && (toolUseSnapshot.status || "") === "waiting_confirmation"){
            return null;
        }
        return (
            <ChatSpecialEventFrame message={message} me={me}>
                <ChatToolUseEvent message={message} me={me} onViewToolOutput={onViewToolOutput} />
            </ChatSpecialEventFrame>
        );
    }
    if(inputRequestedSnapshot){
        return (
            <ChatSpecialEventFrame message={message} me={me}>
                <ChatInputRequestedEvent
                    message={message}
                    me={me}
                    onSubmit={onSubmitInputResponse}
                    submitting={submittingInputResponseID === message.id}
                />
            </ChatSpecialEventFrame>
        );
    }
    if(eventingInteractionSnapshot){
        return (
            <ChatEventingUserInteractionEvent
                message={message}
                me={me}
                onRefresh={onRefreshSpecial}
                onReview={onReviewSpecial}
                refreshing={refreshingSpecialMessageID === message.id}
            />
        );
    }
    if(isAI && !eventingInteractionSnapshot){
        return (
            <ChatAssistantMessage
                message={message.message}
                timestamp={message.created_at}
                viewUTCTime={me?.user?.view_utc_time}
            />
        );
    }
    return (
        <Box className={`mythic-chat-message-row ${isMine ? "mythic-chat-message-row-mine" : ""}`}>
            <Box
                className={`mythic-chat-message ${isAI ? "mythic-chat-message-ai" : ""} ${isSystem ? "mythic-chat-message-system" : ""}`.trim()}
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
                        {request && ["error", "cancelled"].includes(request.status) && (message.status === "error" || message.status === "cancelled") &&
                            <MythicStyledTooltip title="Retry request">
                                <IconButton size="small" onClick={() => onRetry(request.id)}>
                                    <RestartAltIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                        {hasMessageActions &&
                            <>
                                <MythicStyledTooltip title="Message actions">
                                    <IconButton
                                        size="small"
                                        aria-controls={actionMenuAnchor ? `chat-message-actions-${message.id}` : undefined}
                                        aria-haspopup="true"
                                        aria-expanded={actionMenuAnchor ? "true" : undefined}
                                        onClick={(e) => setActionMenuAnchor(e.currentTarget)}
                                    >
                                        <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                </MythicStyledTooltip>
                                <Menu
                                    id={`chat-message-actions-${message.id}`}
                                    anchorEl={actionMenuAnchor}
                                    open={Boolean(actionMenuAnchor)}
                                    onClose={closeActionMenu}
                                    anchorOrigin={{vertical: "bottom", horizontal: "right"}}
                                    transformOrigin={{vertical: "top", horizontal: "right"}}
                                >
                                    {canCopy &&
                                        <MenuItem onClick={copyMessageText}>
                                            <ListItemIcon>
                                                <ContentCopyIcon fontSize="small" />
                                            </ListItemIcon>
                                            <ListItemText>Copy text</ListItemText>
                                        </MenuItem>
                                    }
                                    {canEdit &&
                                        <MenuItem onClick={() => { closeActionMenu(); onEdit(message); }}>
                                            <ListItemIcon>
                                                <EditIcon fontSize="small" />
                                            </ListItemIcon>
                                            <ListItemText>Edit</ListItemText>
                                        </MenuItem>
                                    }
                                    {canDelete &&
                                        <MenuItem onClick={() => { closeActionMenu(); onDelete(message.id); }}>
                                            <ListItemIcon>
                                                <DeleteIcon fontSize="small" />
                                            </ListItemIcon>
                                            <ListItemText>Delete</ListItemText>
                                        </MenuItem>
                                    }
                                </Menu>
                            </>
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
