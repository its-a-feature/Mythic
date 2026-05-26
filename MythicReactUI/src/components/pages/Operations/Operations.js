import React from 'react';
import { OperationTable } from './OperationTable';
import {useQuery, gql} from '@apollo/client';
import {CommandBlockListTable} from './CommandBlockListTable';
import { snackActions } from '../../utilities/Snackbar';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import {MythicPageBody} from "../../MythicComponents/MythicPageBody";

const GET_Operations = gql`
query GetOperations {
  operation(order_by: {name: asc}) {
    complete
    banner_text
    banner_color
    name
    id
    deleted
    admin {
      username
      account_type
      id
    }
    operatoroperations {
      view_mode
      operator {
        username
        account_type
        id
      }
      id
    }
  }
  operator(where: {active: {_eq: true}, deleted: {_eq: false}}) {
    id
    username
    account_type
  }
}
`;
const GET_BlockLists = gql`
query getBlockLists {
  disabledcommandsprofile(order_by: {name: asc}) {
    id
    name
    command{
      id
      cmd
      payloadtype{
        name
      }
    }
  }
}
`;
export function Operations(props){
  const [blockLists, setBlockLists] = React.useState([]);
  const [operations, setOperations] = React.useState([]);
    useQuery(GET_Operations, {fetchPolicy: "network-only",
      onCompleted: (data) => {
        setOperations(data.operation);
      },
      onError: (data) => {
        snackActions.error("Failed to get list of operations");
      }
    });
    const getBlockListsSuccess = React.useCallback((data) => {
      const condensed = (data?.disabledcommandsprofile || []).reduce( (prev, cur) => {
        const payloadTypeName = cur?.command?.payloadtype?.name || "Unknown";
        if(prev[cur.name] === undefined){
          prev[cur.name] = {};
        }
        if(prev[cur.name][payloadTypeName] === undefined){
          prev[cur.name][payloadTypeName] = [];
        }
        prev[cur.name][payloadTypeName].push(cur);
        return prev;
      }, {});
      let arrayForm = Object.entries(condensed).map(([key, value]) => ({"name": key, entries: value}));
      arrayForm.sort((a, b) => a.name.localeCompare(b.name));
      setBlockLists(arrayForm);
    }, []);
    const getBlockListsError = React.useCallback(() => {
      snackActions.error("Failed to get blocklist options");
    }, []);
    const getBlockListOptions = React.useMemo(() => ({fetchPolicy: "network-only"}), []);
    const getBlockLists = useMythicLazyQuery(GET_BlockLists, getBlockListOptions);
    const refreshBlockLists = React.useCallback(() => {
      return getBlockLists().then(({data}) => getBlockListsSuccess(data)).catch((error) => getBlockListsError(error));
    }, [getBlockLists, getBlockListsError, getBlockListsSuccess]);
    const onUpdateOperation = ({id, name, complete}) => {
      const updatedOperations = operations.map( o => {
        if(o.id === id){
          return {...o, name, complete};
        }
        return {...o};
      })
      setOperations(updatedOperations);
    }
    const onNewOperation = ({id, name}) => {
      setOperations([...operations, {id, name, admin: {id: props.me.user.user_id, username: props.me.user.username}}])
    }
    const updateDeleted = ({id, deleted}) => {
      const updatedOps = operations.map( o => {
        if (o.id === id){
          return {...o, deleted: deleted}
        } else {
          return {...o}
        }
      });
      setOperations(updatedOps);
    }
    const onUpdateCurrentOperation = (operation_id) => {
      refreshBlockLists();
    }
    React.useEffect( () => {
      refreshBlockLists();
    }, [refreshBlockLists]);
    return (
      <MythicPageBody>
        <OperationTable operations={operations}
                        onUpdateOperation={onUpdateOperation}
                        onNewOperation={onNewOperation} me={props.me}
                        onUpdateCurrentOperation={onUpdateCurrentOperation}
                        updateDeleted={updateDeleted}/>
        <CommandBlockListTable blockLists={blockLists} me={props.me} />
      </MythicPageBody>
    );
} 
