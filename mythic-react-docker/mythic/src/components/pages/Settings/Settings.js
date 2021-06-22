import React from 'react';
import { SettingsOperatorTable } from './SettingsOperatorTable';
import {useMutation, useQuery, gql} from '@apollo/client';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import { useSnackbar } from 'notistack';
import LinearProgress from '@material-ui/core/LinearProgress';

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
  update_operator(where: {id: {_eq: $id}}, _set: {view_utc_time: $view_utc_time}) {
    returning {
      id
      view_utc_time
    }
  }
}
`;
const operatorsUpdateAdmin = gql`
mutation SettingsUpdateOperatorAdminMutation($id: Int!, $admin: Boolean) {
  update_operator(where: {id: {_eq: $id}}, _set: {admin: $admin}) {
    returning {
      id
      admin
    }
  }
}
`;
const operatorsUpdateActive = gql`
mutation SettingsUpdateOperatorActiveMutation($id: Int!, $active: Boolean) {
  update_operator(where: {id: {_eq: $id}}, _set: {active: $active}) {
    returning {
      id
      active
    }
  }
}
`;
const operatorsDelete = gql`
mutation SettingsDeleteOperatorMutation($id: Int!) {
  update_operator(where: {id: {_eq: $id}}, _set: {deleted: true}) {
    returning {
      id
    }
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
    const { enqueueSnackbar } = useSnackbar();
    const { loading, error, data } = useQuery(GET_Operator);
    const [updateUTC] = useMutation(operatorsUpdateViewUTCTime, {
        update: (cache, {data}) => {
            if(data.update_operator.returning[0].id === me.user.id){
                const state = meState();
                state.user.view_utc_time = data.update_operator.returning[0].view_utc_time;
                meState(state);
            }
        }
    });
    const [deleteOperator] = useMutation(operatorsDelete, {
        update: (cache, {data}) => {
            const existingOperators = cache.readQuery({query: GET_Operator});
            const removedOperator = data.update_operator.returning[0];
            const newFinalOperators = existingOperators.operator.filter(op => (op.id !== removedOperator.id));
            cache.writeQuery({
                query: GET_Operator,
                data: {operator: newFinalOperators}
            });
        }
    });
    const [updateAdmin] = useMutation(operatorsUpdateAdmin);
    const [updateActive] = useMutation(operatorsUpdateActive);
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
                enqueueSnackbar(data.createOperator.error, {variant: "error"});
            }
        }
    });
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
    if (loading) {
     return <LinearProgress />;;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    return (
    <div style={{height: "calc(94vh)", marginTop: "10px"}}>
        <SettingsOperatorTable 
            onViewUTCChanged={onViewUTCChanged}
            onAdminChanged={onAdminChanged}
            onActiveChanged={onActiveChanged}
            onNewOperator={onNewOperator}
            onDeleteOperator={onDeleteOperator}
            {...data} />
        </div>
    );
} 
