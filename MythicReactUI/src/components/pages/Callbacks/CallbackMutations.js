import {gql } from '@apollo/client';

export const hideCallbacksMutation = gql`
mutation hideCallbacks ($callback_display_ids: [Int]!){
  updateCallback(input: {callback_display_ids: $callback_display_ids, active: false}) {
    status
    error
  }
}
`;
export const hideCallbackMutation = gql`
mutation hideCallback ($callback_display_id: Int!){
  updateCallback(input: {callback_display_id: $callback_display_id, active: false}) {
    status
    error
  }
}
`;
export const updateCallbackTriggerMutation = gql`
mutation updateCallbackTriggerMutation ($callback_display_id: Int!, $trigger_on_checkin_after_time: Int!){
  updateCallback(input: {callback_display_id: $callback_display_id, trigger_on_checkin_after_time: $trigger_on_checkin_after_time}) {
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
mutation updateDescriptionCallback($callback_display_id: Int!, $description: String!, $color: String!){
  updateCallback(input: {callback_display_id: $callback_display_id, description: $description, color: $color}) {
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

export const taskingDataFragment = gql`
    fragment taskData on task {
        comment
        parent_task_id
        agent_task_id
        tasking_location
        callback {
            display_id
            id
            user
            host
            integrity_level
            domain
            ip
            mythictree_groups
        }
        callback_id
        commentOperator{
            username
        }
        eventstepinstance {
            eventgroupinstance {
                eventgroup{
                    id
                }
                id
            }
            eventstep {
                name
            }
        }
        completed
        id
        display_id
        operator{
            username
        }
        original_params
        display_params
        status
        timestamp
        status_timestamp_submitted
        status_timestamp_processing
        status_timestamp_preprocessing
        command {
          cmd
          supported_ui_features
          id
          payloadtype {
            name
          }
        }
        command_name
        opsec_pre_blocked
        opsec_pre_bypassed
        opsec_post_blocked
        opsec_post_bypassed
        is_interactive_task
        interactive_task_type
        has_intercepted_response
        tasks(where: {is_interactive_task: {_eq: false}}, order_by: {id: asc}) {
            id
            comment
            agent_task_id
            commentOperator{
                username
            }
            callback {
                display_id
                id
                user
                host
                integrity_level
                domain
                ip
                mythictree_groups
            }
            completed
            subtask_group_name
            display_id
            operator{
                username
            }
            original_params
            display_params
            status
            timestamp
            command {
              cmd
              supported_ui_features
              id
            }
            command_name
            response_count
            tags {
                tagtype {
                    name
                    color
                    id
                  }
                id
            }
            tasks(order_by: {id: asc}) {
                id
            }
            has_intercepted_response
        }
        response_count
        tags {
            tagtype {
                name
                color
                id
              }
            id
        }
        token {
            id
        }
    }
`;
export const createTaskingMutation = gql`
mutation createTasking($callback_id: Int, $callback_ids: [Int], $command: String!, $params: String!, $files: [String], $token_id: Int, $tasking_location: String, $original_params: String, $parameter_group_name: String, $parent_task_id: Int, $is_interactive_task: Boolean, $interactive_task_type: Int, $payload_type: String) {
  createTask(callback_id: $callback_id, callback_ids: $callback_ids, command: $command, params: $params, files: $files, token_id: $token_id, tasking_location: $tasking_location, original_params: $original_params, parameter_group_name: $parameter_group_name, parent_task_id: $parent_task_id, is_interactive_task: $is_interactive_task, interactive_task_type: $interactive_task_type, payload_type: $payload_type) {
    status
    id
    error
  }
}
`;
export const exportCallbackConfigQuery = gql`
query exportCallbackConfigQuery($agent_callback_id: String!) {
  exportCallbackConfig(agent_callback_id: $agent_callback_id) {
      status
      error 
      config 
  }
}
`;
