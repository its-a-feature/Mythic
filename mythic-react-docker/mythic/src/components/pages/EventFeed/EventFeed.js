import React  from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useReactiveVar } from '@apollo/client';
import { meState } from '../../../cache';
import {EventFeedTable} from './EventFeedTable';
import { useSnackbar } from 'notistack';
import LinearProgress from '@material-ui/core/LinearProgress';


const GET_Event_Feed = gql`
query GetOperationEventLogs($operation_id: Int!) {
  operationeventlog(where: {operation_id: {_eq: $operation_id}, deleted: {_eq: false}}, order_by: {timestamp: asc}, limit: 50) {
    id
    level
    message
    resolved
    timestamp
    count
    operator {
      username
    }
  }
}
 `;
 const Create_Operational_Event_Log = gql`
mutation CreateOperationEventLog($message: String!, $level: String!) {
  insert_operationeventlog_one(object:{level: $level, message: $message}) {
    id
  }
}
 `;

 const SUB_Event_Feed = gql`
subscription OperationEventLogSubscription($operation_id: Int!) {
  operationeventlog(where: {deleted: {_eq: false}, operation_id: {_eq: $operation_id}}, limit: 1, order_by: {timestamp: desc}) {
    id
    level
    message
    resolved
    timestamp
    count
    operator {
      username
    }
  }
}
 `;
  const Update_Deleted = gql`
mutation UpdateDeletedOperationEventLog($id: Int!) {
  update_operationeventlog(where:{id: {_eq: $id}}, _set: {deleted: true}) {
    returning{
        id
        deleted
    }
  }
}
 `;
function EventFeedFunc(props){
    const me = useReactiveVar(meState);
    const { enqueueSnackbar } = useSnackbar();
    const { loading, error, data, subscribeToMore } = useQuery(GET_Event_Feed, {variables: {operation_id: me.user.current_operation_id}});
    const [newOperationEventLog] = useMutation(Create_Operational_Event_Log);
    
    const [updateDeleted] = useMutation(Update_Deleted, {
        update: (cache, {data}) => {
            const existingMessages = cache.readQuery({query: GET_Event_Feed, variables: {operation_id: me.user.current_operation_id}});
            const removedMessage = data.update_operationeventlog.returning[0];
            const newFinalMessages = existingMessages.operationeventlog.filter(op => (op.id !== removedMessage.id));
            cache.writeQuery({
                query: GET_Event_Feed,
                variables: {operation_id: me.user.current_operation_id},
                data: {operationeventlog: newFinalMessages}
            });
        }
    });
    
    const onUpdateDeleted = (id) => {
        updateDeleted({variables: {id}});
    }
    const onSubmitMessage = (level, message) => {
        newOperationEventLog({variables: {level, message}});
    }
    if (loading) {
     return <LinearProgress style={{marginTop: "20px" }}/>;
    }
    if (error) {
     console.error(error);
     enqueueSnackbar("Failed to get event feed data", {variant: "error"});
     return null;
    }
    return (
        <EventFeedTable onSubmitMessage={onSubmitMessage} {...data} subscribeToMoreMessages={() => subscribeToMore({
            document: SUB_Event_Feed,
            variables: {operation_id: me.user.current_operation_id},
            shouldResubscribe: true,
            updateQuery: (prev, {subscriptionData} ) => {
                console.log("in subscription", subscriptionData);
                if(!subscriptionData.data) return prev;
                const exists = prev.operationeventlog.find(
                  ({ id }) => id === subscriptionData.data.operationeventlog[0].id
                );
                if (exists) return prev;
                
                return Object.assign({}, prev, {
                    operationeventlog: [...prev.operationeventlog, subscriptionData.data.operationeventlog[0]]
                });
            }
        })}
        onUpdateDeleted={onUpdateDeleted}
        />
    );
}
export const EventFeed = React.memo(EventFeedFunc, (prev, next) => {console.log(prev, next);});;
EventFeed.whyDidYouRender = true;
