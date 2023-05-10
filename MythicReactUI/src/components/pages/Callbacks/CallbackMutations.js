import {gql } from '@apollo/client';

export const hideCallbackMutation = gql`
mutation hideCallback ($callback_display_id: Int!){
  updateCallback(input: {callback_display_id: $callback_display_id, active: false}) {
    status
    error
  }
}
`;
export const toggleHideCallbackMutations = gql`
mutation hideCallback ($callback_display_id: Int!, $active: Boolean!){
  updateCallback(input: {callback_display_id: $callback_display_id, active: $active}) {
    status
    error
  }
}
`;

export const removeEdgeMutation = gql`
mutation removeEdgeMutation ($edge_id: Int!){
    callbackgraphedge_remove(edge_id: $edge_id) {
        status
        error
      }
}
`;

export const addEdgeMutation = gql`
mutation addEdgeMutation ($source_id: Int!, $destination_id: Int!, $c2profile: String!){
  callbackgraphedge_add(c2profile: $c2profile, destination_id: $destination_id, source_id: $source_id) {
    status
    error
  }
}
`;
export const unlockCallbackMutation = gql`
mutation unlockCallback($callback_display_id: Int!){
  updateCallback(input: {callback_display_id: $callback_display_id, locked: false}) {
    status
    error
  }
}
`;
export const lockCallbackMutation = gql`
mutation lockCallack($callback_display_id: Int!){
  updateCallback(input: {callback_display_id: $callback_display_id, locked: true}) {
    status
    error
  }
}
`;
export const updateDescriptionCallbackMutation = gql`
mutation updateDescriptionCallack($callback_display_id: Int!, $description: String!){
  updateCallback(input: {callback_display_id: $callback_display_id, description: $description}) {
    status
    error
  }
}
`;
export const updateSleepInfoCallbackMutation = gql`
mutation updateSleepInfoCallback($callback_display_id: Int!, $sleep_info: String!){
  updateCallback(input: {callback_display_id: $callback_display_id, sleep_info: $sleep_info}) {
    status
    error
  }
}
`;
export const updateIPsCallbackMutation = gql`
mutation updateIPsCallback($callback_display_id: Int!, $ips: [String]!){
  updateCallback(input: {callback_display_id: $callback_display_id, ips: $ips}) {
    status
    error
  }
}
`;
