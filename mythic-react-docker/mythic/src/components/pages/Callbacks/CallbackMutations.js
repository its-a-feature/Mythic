import {gql } from '@apollo/client';

export const hideCallbackMutation = gql`
mutation hideCallback ($callback_id: Int!){
  updateCallback(input: {callback_id: $callback_id, active: false}) {
    status
    error
  }
}
`;
export const hideCallbackMutations = gql`
mutation hideCallback ($callback_id: Int!){
  updateCallback(input: {callback_id: $callback_id, active: false}) {
    status
    error
  }
}
`;

export const removeEdgeMutation = gql`
mutation removeEdgeMutation ($edge_id: Int!, $end_timestamp: timestamp!){
    update_callbackgraphedge_by_pk(pk_columns: {id: $edge_id}, _set: {end_timestamp: $end_timestamp}) {
        end_timestamp
        id
      }
}
`;

export const addEdgeMutation = gql`
mutation addEdgeMutation ($source_id: Int!, $destination_id: Int!, $profile_id: Int!){
  insert_callbackgraphedge_one(object: {c2_profile_id: $profile_id, destination_id: $destination_id, direction: 1, source_id: $source_id}) {
    id
  }
}
`;
