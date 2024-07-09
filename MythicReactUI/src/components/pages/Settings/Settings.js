import React from 'react';
import { SettingsOperatorTable } from './SettingsOperatorTable';
import {useMutation, useQuery, gql} from '@apollo/client';
import { meState } from '../../../cache';
import { snackActions } from '../../utilities/Snackbar';

const GET_Operator = gql`
query GetOperators {
  operator(order_by: {username: asc}) {
    active
    admin
    creation_time
    deleted
    id
    last_login
    username
    view_utc_time
    account_type
    email
    operation {
        id
        name
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
  updateOperatorStatus(operator_id: $id, admin: $admin) {
    status
    error
    id
    admin
  }
}
`;
const operatorsUpdateActive = gql`
mutation SettingsUpdateOperatorActiveMutation($id: Int!, $active: Boolean) {
  updateOperatorStatus(operator_id: $id, active: $active) {
    status
    error
    id
    active
  }
}
`;
const operatorsDelete = gql`
mutation SettingsDeleteOperatorMutation($id: Int!, $deleted: Boolean) {
  updateOperatorStatus(operator_id: $id, deleted: $deleted) {
    status
    error
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
mutation NewOperator($username: String!, $password: String!, $bot: Boolean, $email: String) {
  createOperator(input: {password: $password, username: $username, bot: $bot, email: $email}) {
    active
    creation_time
    deleted
    error
    id
    last_login
    status
    username
    view_utc_time
    account_type
    email
  }
}
`;
const operatorsUpdatePassword = gql`
mutation operatorsUpdatePasswordMutation($user_id: Int!, $new_password: String, $old_password: String, $email: String){
  updatePasswordAndEmail(user_id: $user_id, new_password: $new_password, old_password: $old_password, email: $email){
    status
    error
    email
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
            if(result.updateOperatorStatus.status === "error"){
              snackActions.warning(result.updateOperatorStatus.error);
              return;
            }
            const updatedOperators = operators.map(o => {
                if(o.id === result.updateOperatorStatus.id){
                    return {...o, deleted: result.updateOperatorStatus.deleted}
                }else{
                    return {...o}
                }
            });
            setOperators(updatedOperators);
            snackActions.success("Successfully updated");
        },
        onError: (err) => {
            console.log(err)
            snackActions.warning("Unable to delete operator without Admin permissions");
        }
    });
    const [updateAdmin] = useMutation(operatorsUpdateAdmin, {
      onCompleted: (result) => {
          if(result.updateOperatorStatus.status === "error"){
              snackActions.warning(result.updateOperatorStatus.error);
              return;
          }
          const updatedOperators = operators.map(o => {
              if(o.id === result.updateOperatorStatus.id){
                  return {...o, admin: result.updateOperatorStatus.admin}
              }else{
                  return {...o}
              }
          });
          setOperators(updatedOperators);
          snackActions.success("Successfully updated");
      },
      onError: (err) => {
          console.log(err);
          snackActions.warning("Unable to update operator admin status without Admin permissions");
      }
    });
    const [updateActive] = useMutation(operatorsUpdateActive, {
      onCompleted: (result) => {
          if(result.updateOperatorStatus.status === "error"){
              snackActions.warning(result.updateOperatorStatus.error);
              return;
          }
          const updatedOperators = operators.map(o => {
              if(o.id === result.updateOperatorStatus.id){
                  return {...o, active: result.updateOperatorStatus.active}
              }else{
                  return {...o}
              }
          });
          setOperators(updatedOperators);
          snackActions.success("Successfully updated");
      },
      onError: (err) => {
          console.log(err);
          snackActions.warning("Unable to update operator active status without Admin permissions");
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
        if(result.updatePasswordAndEmail.status === "success"){
          snackActions.success("Successfully updated password");
          if(result.updatePasswordAndEmail.operator_id > 0){
              const updatedOperators = operators.map(o => {
                  if(o.id === result.updatePasswordAndEmail.operator_id){
                      return {...o, email: result.updatePasswordAndEmail.email}
                  }
                  return {...o}
              });
              setOperators(updatedOperators);
          }
        }else{
          snackActions.warning(result.updatePasswordAndEmail.error);
        }
      },
      onError: (data) => {
          console.log(data);
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
    const onNewOperator = (username, password, email) => {
        newOperator({variables: {username, password, email}});
    }
    const onNewBot = (username) => {
        newOperator({variables: {username:username, password: "", bot: true}})
    }
    const onDeleteOperator = (id, value) => {
        deleteOperator({variables: {id, deleted: value}});
    }
    const onUsernameChanged = (id, value) => {
      updateUsername({variables: {id, username: value}})
    }
    const onPasswordChanged = ({user_id, old_password, new_password, email}) => {
      updatePassword({variables: {user_id, new_password, old_password, email}})
    }

    return (
      <div style={{display: "flex", height: "100%", flexDirection: "column"}}>
        <SettingsOperatorTable 
            me={me}
            onViewUTCChanged={onViewUTCChanged}
            onAdminChanged={onAdminChanged}
            onActiveChanged={onActiveChanged}
            onNewOperator={onNewOperator}
            onNewBot={onNewBot}
            onDeleteOperator={onDeleteOperator}
            onUsernameChanged={onUsernameChanged}
            onPasswordChanged={onPasswordChanged}
            operators={operators} />
        </div>
    );
} 
