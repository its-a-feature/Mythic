import React from 'react';
import { OperationTable } from './OperationTable';
import {useQuery, gql, useLazyQuery} from '@apollo/client';
import {CommandBlockListTable} from './CommandBlockListTable';
import { snackActions } from '../../utilities/Snackbar';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";

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
    const getBlockListsSuccess = (data) => {
      const condensed = data.disabledcommandsprofile.reduce( (prev, cur) => {
        if(prev[cur.name] === undefined){
          prev[cur.name] = {};
        }
        if(prev[cur.name][cur.command.payloadtype.name] === undefined){
          prev[cur.name][cur.command.payloadtype.name] = [];
        }
        prev[cur.name][cur.command.payloadtype.name].push(cur);
        return {...prev};
      }, {});
      // now break out into array
      let arrayForm = [];
      for(const [key, value] of Object.entries(condensed)){
        arrayForm.push({"name": key, entries: value});
      }
      setBlockLists(arrayForm);
    }
    const getBlockListsError = (data) => {
      snackActions.error("Failed to get blocklist options");
    }
    const getBlockLists = useMythicLazyQuery(GET_BlockLists, {fetchPolicy: "network-only"
    });
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
      getBlockLists().then(({data}) => getBlockListsSuccess(data)).catch(({data}) => getBlockListsError(data));
    }
    React.useEffect( () => {
      getBlockLists().then(({data}) => getBlockListsSuccess(data)).catch(({data}) => getBlockListsError(data));
    }, []);
    return (
      <div style={{  height: "100%", display: "flex", flexDirection: "column"}}>
        <OperationTable operations={operations}
                        onUpdateOperation={onUpdateOperation}
                        onNewOperation={onNewOperation} me={props.me}
                        onUpdateCurrentOperation={onUpdateCurrentOperation}
                        updateDeleted={updateDeleted}/>
        <CommandBlockListTable blockLists={blockLists} me={props.me} />
      </div>
    );
} 
