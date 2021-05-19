import React, {useEffect} from 'react';
import {TaskDisplay} from '../Callbacks/TaskDisplay';
import {useSubscription, gql, useLazyQuery } from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';
import  {useParams} from "react-router-dom";
import {useReactiveVar} from '@apollo/client';
import { meState } from '../../../cache';
import {getBrowserScripts, getSupportScripts, scriptsQuery} from '../../utilities/BrowserScriptHelpers';

const subTaskQuery = gql`
subscription subTaskQuery($task_id: Int!) {
  task_by_pk(id: $task_id) {
        comment
        commentOperator{
            username
        }
        completed
        id
        operator{
            username
        }
        display_params
        original_params
        status
        timestamp
        command {
          cmd
          id
        }
        responses{
            id
        }
        opsec_pre_blocked
        opsec_pre_bypassed
        opsec_post_blocked
        opsec_post_bypassed
    }
}`;
var browserscripts = {};
var support_scripts = {};
export function SingleTaskView(props){
   const {taskId} = useParams();
   const [commandId, setCommandId] = React.useState(0);
   const me = useReactiveVar(meState);
   const [getScripts, { loading: scriptLoading}] = useLazyQuery(scriptsQuery, {
        onCompleted: data => {
            console.log(data);
            //consolidate the browserscriptoperation and browserscript 
            // operation scripts get applied instead of operator-specific scripts
            
            try{
                eval(getSupportScripts(data));
                eval(getBrowserScripts(data));
            }catch(error){
                console.error(error);
            }
            console.log(browserscripts);
            console.log(support_scripts);
        },
        onError: data => {
            console.log("error!", data)
        }
    });
   const {loading, error, data} = useSubscription(subTaskQuery, {
     variables: {task_id: parseInt(taskId)},
     onSubscriptionData: completedData => {
        setCommandId(completedData.subscriptionData.data.task_by_pk.command.id);
     }
    });
    useEffect( () => {
        getScripts({variables: {operator_id: me.user.id, operation_id: me.user.current_operation_id } });
    }, []);
    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}}/>;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
  return (
    <div style={{marginTop: "10px", maxHeight: "calc(92vh)"}}>
        <TaskDisplay task={data.task_by_pk} command_id={commandId} browserscripts={browserscripts} />
    </div>
  );
}
//
