import React from 'react';
import { SettingsOperatorTable } from './SettingsOperatorTable';
import {useMutation, useQuery, gql} from '@apollo/client';
import { meState } from '../../../cache';
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
const operatorsUpdatePassword = gql`
mutation operatorsUpdatePasswordMutation($user_id: Int!, $new_password: String!, $old_password: String){
  updatePassword(user_id: $user_id, new_password: $new_password, old_password: $old_password){
    status
    error
  }
}
`;
const createAPITokenMutation = gql`
mutation createAPITokenMutation{
  createAPIToken(token_type: "User"){
    id
    token_value
    status
    error
    operator_id
  }
}
`;
const deleteAPITokenMutation = gql`
mutation deleteAPIToken($id: Int!){
  delete_apitokens_by_pk(id: $id){
    id
    operator_id
  }
}
`;
export function Settings({me}){
    const [operators, setOperators] = React.useState([]);
    useQuery(GET_Operator, {fetchPolicy: "no-cache",
      onCompleted: (data) => {
        setOperators(data.operator);
      }
    });
    //console.log(me.user);
    const [updateUTC] = useMutation(operatorsUpdateViewUTCTime, {
        onCompleted: (result) => {
          if(result.update_operator_by_pk === null){
            snackActions.warning("Cannot update another user's data without Admin permissions");
            return;
          }
          const updatedOperators = operators.map(o => {
            if(o.id === result.update_operator_by_pk.id){
              return {...o, view_utc_time: result.update_operator_by_pk.view_utc_time}
            }else{
              return {...o}
            }
          })
          if(result.update_operator_by_pk.id === me.user.id){
              meState({...meState(), user: {...meState().user, view_utc_time: result.update_operator_by_pk.view_utc_time}});
              localStorage.setItem("user", JSON.stringify(meState().user));
          }
          setOperators(updatedOperators);
          snackActions.success("Successfully updated");
        },
        onError: (err) => {
          console.log(err);
          snackActions.error("Unable to update operator timestamps without Admin permissions");
        }
    });
    const [deleteOperator] = useMutation(operatorsDelete, {
        onCompleted: (result) => {
          if(result.update_operator_by_pk === null){
            snackActions.warning("Cannot update another user's data without Admin permissions");
            return;
          }
          const updatedOperators = operators.filter( o => o.id !== result.update_operator_by_pk.id);
          setOperators(updatedOperators);
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
        const updatedOperators = operators.map(o => {
          if(o.id === result.update_operator_by_pk.id){
            return {...o, admin: result.update_operator_by_pk.admin}
          }else{
            return {...o}
          }
        });
        setOperators(updatedOperators);
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
        const updatedOperators = operators.map(o => {
          if(o.id === result.update_operator_by_pk.id){
            return {...o, active: result.update_operator_by_pk.active}
          }else{
            return {...o}
          }
        });
        setOperators(updatedOperators);
        snackActions.success("Successfully updated");
      },
      onError: () => {
        snackActions.warning("Unable to update operator active status without Admin permissions");
      }
    });
    const [createAPIToken] = useMutation(createAPITokenMutation, {
      onCompleted: (data) => {
        if(data.createAPIToken.status === "success"){
          snackActions.success("Successfully created new API Token");
          const updatedOperators = operators.map( o => {
            if(o.id === data.createAPIToken.operator_id){
              return {...o, apitokens: [...o.apitokens, {...data.createAPIToken}]}
            }else{
              return {...o}
            }
          });
          setOperators(updatedOperators);
        }else{
          snackActions.error(data.createAPIToken.error);
        }
      },
      onError: (result) => {
        console.log(result);
      }
    });
    const [deleteAPIToken] = useMutation(deleteAPITokenMutation, {
      onCompleted: (data) => {
        const updatedOperators = operators.map( o => {
          if(o.id === data.delete_apitokens_by_pk.operator_id){
            return {...o, apitokens: o.apitokens.filter(api => api.id !== data.delete_apitokens_by_pk.id)}
          }else{
            return {...o}
          }
        });
        setOperators(updatedOperators);
      },
      onError: (data) => {

      }
    });
    const [newOperator] = useMutation(newOperatorMutation, {
        onCompleted: (data) => {
            if(data.createOperator.status === "success"){
                const newOperator = data.createOperator;
                setOperators( [...operators, newOperator]);
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
        const updatedOperators = operators.map( o => {
          if(o.id === result.update_operator_by_pk.id){
            return {...o, username: result.update_operator_by_pk.username};
          }else{
            return {...o}
          }
        });
        setOperators(updatedOperators);
        snackActions.success("Successfully updated");
      },
      onError: () => {
        snackActions.warning("Unable to update operator's username without Admin permissions");
      }
    });
    const [updatePassword] = useMutation(operatorsUpdatePassword, {
      onCompleted: (result) => {
        if(result.updatePassword.status === "success"){
          snackActions.success("Successfully updated password");
        }else{
          snackActions.warning(result.updatePassword.error);
        }
      },
      onError: () => {
        snackActions.warning("Unable to update operator's password without Admin permissions");
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
    const onPasswordChanged = ({user_id, old_password, new_password}) => {
      updatePassword({variables: {user_id, new_password, old_password}})
    }
    const onCreateAPIToken = () => {
      createAPIToken({variables: {}})
    }
    const onDeleteAPIToken = (id) => {
      deleteAPIToken({variables: {id}})
    }
    return (
      <div style={{display: "flex", flexGrow: 1, flexDirection: "column"}}>
        <SettingsOperatorTable 
            me={me}
            onViewUTCChanged={onViewUTCChanged}
            onAdminChanged={onAdminChanged}
            onActiveChanged={onActiveChanged}
            onNewOperator={onNewOperator}
            onDeleteOperator={onDeleteOperator}
            onUsernameChanged={onUsernameChanged}
            onPasswordChanged={onPasswordChanged}
            onCreateAPIToken={onCreateAPIToken}
            onDeleteAPIToken={onDeleteAPIToken}
            operators={operators} />
        </div>
    );
} 
