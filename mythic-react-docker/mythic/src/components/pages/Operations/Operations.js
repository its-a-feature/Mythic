import React from 'react';
import { OperationTable } from './OperationTable';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';

const GET_Operations = gql`
query GetOperations {
  operation(order_by: {name: asc}) {
    complete
    name
    id
    admin {
      username
      id
    }
    operatoroperations {
      view_mode
      operator {
        username
        id
      }
      id
    }
  }
  operator(where: {active: {_eq: true}, deleted: {_eq: false}}) {
    id
    username
  }
}
`;
export function Operations(props){
    const { loading, error, data } = useQuery(GET_Operations, {fetchPolicy: "network-only"});

    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}}/>
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    return (
    <div style={{height: "calc(94vh)", marginTop: "10px", marginRight: "5px"}}>
        <OperationTable 
            {...data} />
        </div>
    );
} 
