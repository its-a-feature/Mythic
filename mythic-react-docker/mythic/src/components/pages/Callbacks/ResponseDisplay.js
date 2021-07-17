import React, {useEffect} from 'react';
import LinearProgress from '@material-ui/core/LinearProgress';
import {useSubscription, gql } from '@apollo/client';


const subResponsesQuery = gql`
subscription subResponsesQuery($task_id: Int!) {
  response(where: {task_id: {_eq: $task_id}}) {
    id
    response: response_text
  }
}`;

export const ResponseDisplay = (props) =>{
    const [task, setTask] = React.useState({});
    const {loading, error, data} = useSubscription(subResponsesQuery, {variables: {task_id: props.task.id}, fetchPolicy: "cache-and-network",

    });
    useEffect( () => {
        setTask(props.task);
    }, [props.command_id, props.task]);
    if (error) {
     console.error(error);
     return <div>Error! {error.ToString()}</div>;
    }

  return (
      <div style={{overflow: "auto", width: "100%"}}>
        {loading ? (<LinearProgress style={{marginTop: "10px"}}/>): (
          data.response.map( (response) => (
            <pre key={"task" + task.id + "resp" + response.id}>{response.response}</pre>
          ) ) 
        )}
      </div>
  )
      
}

