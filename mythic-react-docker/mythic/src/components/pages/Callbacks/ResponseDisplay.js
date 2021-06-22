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
    const [commandID, setCommandID] = React.useState(0);
    const [task, setTask] = React.useState({});
    const {loading, error, data} = useSubscription(subResponsesQuery, {variables: {task_id: props.task.id}, fetchPolicy: "cache-and-network"});
    useEffect( () => {
        setCommandID(props.command_id);
        setTask(props.task);
    }, [props.command_id, props.task]);
    
    if (loading) {
     return <LinearProgress style={{paddingTop: "10px"}}/>;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    
    if (!data) {
        return <LinearProgress style={{paddingTop: "10px"}}/>;
    }else if(data.response.length === 0){
        return (
            <div style={{overflow: "auto", width: "100%"}}> 
                <pre>No data for task</pre>
          </div>
        )
    }

  return (
      <div style={{overflow: "auto", width: "100%"}}>
        {data.response.map( (response) => (
                <pre key={"task" + task.id + "resp" + response.id}>{response.response}</pre>
        ) ) 
        }
        
      </div>
  )
      
}

