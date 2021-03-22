import React, {useEffect, useState} from 'react';
import LinearProgress from '@material-ui/core/LinearProgress';
import {useSubscription, gql, useLazyQuery } from '@apollo/client';
import {useReactiveVar} from '@apollo/client';
import { meState } from '../../../cache';
import {ResponseDisplayBrowserScript} from './ResponseDisplayBrowserScript';


const subResponsesQuery = gql`
subscription subResponsesQuery($task_id: Int!) {
  response(where: {task_id: {_eq: $task_id}}) {
    id
    response: response_text
  }
}`;

export const ResponseDisplay = (props) =>{
    const [commandID, setCommandID] = React.useState(0);
    const [browserScripts, setBrowserScripts] = React.useState({});
    const [task, setTask] = React.useState({});
    const [enableBrowserscripts, setEnableBrowserscripts] = React.useState(true);
    const {loading, error, data} = useSubscription(subResponsesQuery, {variables: {task_id: props.task.id}, fetchPolicy: "cache-and-network"});
    useEffect( () => {
        setCommandID(props.command_id);
        setBrowserScripts(props.browserscripts);
        setTask(props.task);
        setEnableBrowserscripts(props.enable_browserscripts);
        console.log(props.command_id, props.browserscripts);
    }, [props.command_id, props.task, props.browserscripts, props.enable_browserscripts]);
    
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
        {commandID in browserScripts && browserScripts && enableBrowserscripts ? (
            <ResponseDisplayBrowserScript browserScripts={browserScripts} commandID={commandID} task={task} data={data} />
        ) : (
            data.response.map( (response) => (
                <pre key={"task" + task.id + "resp" + response.id}>{response.response}</pre>
        ) ) 
        ) }
        
      </div>
  )
      
}
ResponseDisplay.whyDidYouRender = true;

