import {gql} from '@apollo/client';

export const CHAT_CHANNEL_FIELDS = gql`
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

export const CHAT_CONTAINER_FIELDS = gql`
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

export const CHAT_MESSAGE_FIELDS = gql`
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

export const CHAT_REQUEST_FIELDS = gql`
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

export const CHAT_CHANNELS_QUERY = gql`
${CHAT_CHANNEL_FIELDS}
query ChatChannels {
  chat_channel(order_by: [{archived: asc}, {channel_type: asc}, {name: asc}]) {
    ...ChatChannelFields
  }
}
`;

export const CHAT_CHANNELS_STREAM_SUBSCRIPTION = gql`
${CHAT_CHANNEL_FIELDS}
subscription ChatChannelsStream($now: timestamp!) {
  chat_channel_stream(batch_size: 50, cursor: {initial_value: {updated_at: $now}, ordering: ASC}) {
    ...ChatChannelFields
  }
}
`;

export const CHAT_READ_STATE_QUERY = gql`
query ChatReadState {
  chat_read_state {
    channel_id
    last_read_message_id
    muted
    updated_at
  }
}
`;

export const CHAT_READ_STATE_STREAM_SUBSCRIPTION = gql`
subscription ChatReadStateStream($now: timestamp!) {
  chat_read_state_stream(batch_size: 50, cursor: {initial_value: {updated_at: $now}, ordering: ASC}) {
    channel_id
    last_read_message_id
    muted
    updated_at
  }
}
`;

export const CHAT_CONTAINERS_QUERY = gql`
${CHAT_CONTAINER_FIELDS}
query ChatContainers {
  consuming_container(where: {type: {_eq: "chat"}}, order_by: {name: asc}) {
    ...ChatContainerFields
  }
}
`;

export const CHAT_CONTAINERS_STREAM_SUBSCRIPTION = gql`
${CHAT_CONTAINER_FIELDS}
subscription ChatContainersStream($now: timestamptz!) {
  consuming_container_stream(batch_size: 50, cursor: {initial_value: {updated_at: $now}, ordering: ASC}, where: {type: {_eq: "chat"}}) {
    ...ChatContainerFields
  }
}
`;

export const CHAT_OPERATOR_ALIASES_QUERY = gql`
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

export const CHAT_CURRENT_OPERATOR_QUERY = gql`
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

export const CHAT_MESSAGES_QUERY = gql`
${CHAT_MESSAGE_FIELDS}
query ChatMessages($where: chat_message_bool_exp!, $limit: Int!) {
  chat_message(where: $where, order_by: {id: desc}, limit: $limit) {
    ...ChatMessageFields
  }
}
`;

export const CHAT_MESSAGES_STREAM_SUBSCRIPTION = gql`
${CHAT_MESSAGE_FIELDS}
subscription ChatMessagesStream($where: chat_message_bool_exp!, $now: timestamp!) {
  chat_message_stream(batch_size: 50, cursor: {initial_value: {updated_at: $now}, ordering: ASC}, where: $where) {
    ...ChatMessageFields
  }
}
`;

export const CHAT_REQUESTS_QUERY = gql`
${CHAT_REQUEST_FIELDS}
query ChatRequests($channel_id: Int!, $limit: Int!) {
  chat_request(where: {channel_id: {_eq: $channel_id}}, order_by: {id: desc}, limit: $limit) {
    ...ChatRequestFields
  }
}
`;

export const CHAT_REQUESTS_STREAM_SUBSCRIPTION = gql`
${CHAT_REQUEST_FIELDS}
subscription ChatRequestsStream($channel_id: Int!, $now: timestamp!) {
  chat_request_stream(batch_size: 25, cursor: {initial_value: {updated_at: $now}, ordering: ASC}, where: {channel_id: {_eq: $channel_id}}) {
    ...ChatRequestFields
  }
}
`;

export const CREATE_CHANNEL = gql`
mutation CreateChatChannel($name: String!, $description: String, $channel_type: String, $chat_container_id: Int, $chat_model: String, $locked: Boolean, $ai_metadata: jsonb, $apitokens_id: Int) {
  chatCreateChannel(name: $name, description: $description, channel_type: $channel_type, chat_container_id: $chat_container_id, chat_model: $chat_model, locked: $locked, ai_metadata: $ai_metadata, apitokens_id: $apitokens_id) {
    status
    error
    id
    channel_id
  }
}
`;

export const UPDATE_CHANNEL = gql`
mutation UpdateChatChannel($channel_id: Int!, $name: String, $description: String, $archived: Boolean, $locked: Boolean, $chat_model: String, $ai_metadata: jsonb, $apitokens_id: Int, $muted: Boolean) {
  chatUpdateChannel(channel_id: $channel_id, name: $name, description: $description, archived: $archived, locked: $locked, chat_model: $chat_model, ai_metadata: $ai_metadata, apitokens_id: $apitokens_id, muted: $muted) {
    status
    error
    channel_id
  }
}
`;

export const CHAT_API_TOKENS_QUERY = gql`
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

export const CREATE_API_TOKEN = gql`
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

export const CREATE_MESSAGE = gql`
mutation CreateChatMessage($channel_id: Int!, $message: String!, $system_message: Boolean = false, $all_operations: Boolean = false, $delegation_id: String, $delegation_name: String) {
  chatCreateMessage(channel_id: $channel_id, message: $message, system_message: $system_message, all_operations: $all_operations, delegation_id: $delegation_id, delegation_name: $delegation_name) {
    status
    error
    message_id
    request_id
  }
}
`;

export const CHAT_TOOL_OUTPUT_QUERY = gql`
query ChatToolOutput($message_id: Int!) {
  chat_message_by_pk(id: $message_id) {
    id
    tool_output
  }
}
`;

export const EDIT_MESSAGE = gql`
mutation EditChatMessage($message_id: Int!, $message: String!) {
  chatEditMessage(message_id: $message_id, message: $message) {
    status
    error
    message_id
  }
}
`;

export const DELETE_MESSAGE = gql`
mutation DeleteChatMessage($message_id: Int!) {
  chatDeleteMessage(message_id: $message_id) {
    status
    error
    message_id
  }
}
`;

export const CANCEL_REQUEST = gql`
mutation CancelChatRequest($request_id: Int!) {
  chatCancelRequest(request_id: $request_id) {
    status
    error
    request_id
  }
}
`;

export const RETRY_REQUEST = gql`
mutation RetryChatRequest($request_id: Int!) {
  chatRetryRequest(request_id: $request_id) {
    status
    error
    request_id
    message_id
  }
}
`;

export const MARK_READ = gql`
mutation MarkChatRead($channel_id: Int!, $last_read_message_id: Int) {
  chatMarkRead(channel_id: $channel_id, last_read_message_id: $last_read_message_id) {
    status
    error
  }
}
`;

export const REFRESH_SPECIAL_MESSAGE = gql`
mutation RefreshSpecialMessage($message_id: Int!) {
  chatRefreshSpecialMessage(message_id: $message_id) {
    status
    error
    message_id
  }
}
`;

export const INPUT_RESPONSE = gql`
mutation ChatInputResponse($message_id: Int!, $action: String!, $response: String, $choice_id: String) {
  chatInputResponse(message_id: $message_id, action: $action, response: $response, choice_id: $choice_id) {
    status
    error
    message_id
    request_id
  }
}
`;

export const CHAT_SEARCH = gql`
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