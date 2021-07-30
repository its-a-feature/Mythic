import React from 'react';
import { SettingsOperatorTable } from './SettingsOperatorTable';
import {useMutation, useQuery, gql} from '@apollo/client';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';
import { snackActions } from '../../utilities/Snackbar';

const GET_Operator = gql`
query GetOperators {
  operator(where: {deleted: {_eq: false}}, order_by: {username: asc}) {
    active
    admin
    creation_time
    deleted
    id
    last_login
    username
    view_utc_time
    apitokens {
      token_value
      token_type
      active
      id
    }
  }
}
`;
const operatorsUpdateViewUTCTime = gql`
mutation SettingsUpdateOperatorViewUTCTime($id: Int!, $view_utc_time: Boolean) {
  update_operator_by_pk(pk_columns: {id: $id}, _set: {view_utc_time: $view_utc_time}) {
    id
    view_utc_time
  }
}
`;
const operatorsUpdateAdmin = gql`
mutation SettingsUpdateOperatorAdminMutation($id: Int!, $admin: Boolean) {
  update_operator_by_pk(pk_columns: {id: $id}, _set: {admin: $admin}) {
      id
      admin
  }
}
`;
const operatorsUpdateActive = gql`
mutation SettingsUpdateOperatorActiveMutation($id: Int!, $active: Boolean) {
  update_operator_by_pk(pk_columns: {id: $id}, _set: {active: $active}) {
      id
      active
  }
}
`;
const operatorsDelete = gql`
mutation SettingsDeleteOperatorMutation($id: Int!) {
  update_operator_by_pk(pk_columns: {id: $id}, _set: {deleted: true}) {
      id
      deleted
  }
}
`;
const operatorsUpdateUsername = gql`
mutation SettingsUsernameOperatorMutation($id: Int!, $username: String!) {
  update_operator_by_pk(pk_columns: {id: $id}, _set: {username: $username}) {
      id
      username
  }
}
`;
const newOperatorMutation = gql`
mutation NewOperator($username: String!, $password: String!) {
  createOperator(input: {password: $password, username: $username}) {
    active
    creation_time
    deleted
    error
    id
    last_login
    status
    username
    view_utc_time
  }
}
`;
export function Settings(props){
    const me = useReactiveVar(meState);
    const { loading, error, data } = useQuery(GET_Operator, {fetchPolicy: "network-only"});
    const [updateUTC] = useMutation(operatorsUpdateViewUTCTime, {
        onCompleted: (result) => {
          if(result.update_operator_by_pk === null){
            snackActions.warning("Cannot update another user's data without Admin permissions");
            return;
          }
          if(result.update_operator_by_pk.id === me.user.id){
              const state = meState();
              state.user.view_utc_time = result.update_operator_by_pk.view_utc_time;
              meState(state);
          }
          snackActions.success("Successfully updated");
        },
        onError: (err) => {
          console.log(err);
          snackActions.error("Unable to update operator timestamps without Admin permissions");
        }
    });
    const [deleteOperator] = useMutation(operatorsDelete, {
        update: (cache, {data}) => {
            const existingOperators = cache.readQuery({query: GET_Operator});
            const removedOperator = data.update_operator_by_pk;
            const newFinalOperators = existingOperators.operator.filter(op => (op.id !== removedOperator.id));
            cache.writeQuery({
                query: GET_Operator,
                data: {operator: newFinalOperators}
            });
        },
        onCompleted: (result) => {
          if(result.update_operator_by_pk === null){
            snackActions.warning("Cannot update another user's data without Admin permissions");
            return;
          }
          snackActions.success("Successfully updated");
        },
        onError: () => {
          snackActions.warning("Unable to delete operator without Admin permissions");
        }
    });
    const [updateAdmin] = useMutation(operatorsUpdateAdmin, {
      onCompleted: (result) => {
        if(result.update_operator_by_pk === null){
          snackActions.warning("Cannot update another user's data without Admin permissions");
          return;
        }
        snackActions.success("Successfully updated");
      },
      onError: () => {
        snackActions.warning("Unable to update operator admin status without Admin permissions");
      }
    });
    const [updateActive] = useMutation(operatorsUpdateActive, {
      onCompleted: (result) => {
        if(result.update_operator_by_pk === null){
          snackActions.warning("Cannot update another user's data without Admin permissions");
          return;
        }
        snackActions.success("Successfully updated");
      },
      onError: () => {
        snackActions.warning("Unable to update operator active status without Admin permissions");
      }
    });
    const [newOperator] = useMutation(newOperatorMutation, {
        update: (cache, {data}) => {
            if(data.createOperator.status === "success"){
                const existingOperators = cache.readQuery({query: GET_Operator});
                const newOperator = data.createOperator;
                cache.writeQuery({
                    query: GET_Operator,
                    data: {operator: [newOperator, ...existingOperators.operator]}
                });
            }else{
                snackActions.error(data.createOperator.error);
            }
        },
        onError: (err) => {
          snackActions.warning("Unable to create new operator");
          console.log(err);
        }
    });
    const [updateUsername] = useMutation(operatorsUpdateUsername, {
      onCompleted: (result) => {
        if(result.update_operator_by_pk === null){
          snackActions.warning("Cannot update another user's data without Admin permissions");
          return;
        }
        snackActions.success("Successfully updated");
      },
      onError: () => {
        snackActions.warning("Unable to update operator's username without Admin permissions");
      }
    })
    const onViewUTCChanged = (id, value) => {
        updateUTC({variables: {id, view_utc_time: value}});
    }
    const onAdminChanged = (id, value) => {
        updateAdmin({variables: {id, admin: value}});
    }
    const onActiveChanged = (id, value) => {
        updateActive({variables: {id, active: value}});
    }
    const onNewOperator = (username, password) => {
        newOperator({variables: {username, password}});
    }
    const onDeleteOperator = (id) => {
        deleteOperator({variables: {id}});
    }
    const onUsernameChanged = (id, value) => {
      updateUsername({variables: {id, username: value}})
    }
    if (loading) {
     return <LinearProgress />;;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    return (
    <div style={{height: "calc(94vh)", marginTop: "10px", marginRight: "5px"}}>
        <SettingsOperatorTable 
            onViewUTCChanged={onViewUTCChanged}
            onAdminChanged={onAdminChanged}
            onActiveChanged={onActiveChanged}
            onNewOperator={onNewOperator}
            onDeleteOperator={onDeleteOperator}
            onUsernameChanged={onUsernameChanged}
            {...data} />
        </div>
    );
} 
