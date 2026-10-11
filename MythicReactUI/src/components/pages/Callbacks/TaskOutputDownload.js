import {gql} from '@apollo/client';

export const getAllTaskResponsesQuery = gql`
query taskOutputDownloadQuery($task_id: Int!) {
  response(where: {task_id: {_eq: $task_id}}, order_by: {id: asc}) {
    id
    task_id
    response: response_text
  }
}`;

export const prepareTaskOutputDownload = async ({client, taskID, decodeResponse}) => {
    if(!Number.isInteger(taskID)){
        throw new Error("Task output download requires a valid task ID");
    }
    if(typeof decodeResponse !== "function"){
        throw new Error("Task output download requires a response decoder");
    }
    const {data} = await client.query({
        query: getAllTaskResponsesQuery,
        variables: {task_id: taskID},
        fetchPolicy: "network-only"
    });
    if(!Array.isArray(data?.response)){
        throw new Error("Task output query returned an invalid response");
    }
    const output = data.response.reduce((previous, current) => {
        if(current.task_id !== taskID){
            throw new Error(`Task output query returned data for task ${current.task_id} instead of task ${taskID}`);
        }
        return previous + decodeResponse(current.response);
    }, decodeResponse(""));
    return {
        filename: `task_${taskID}.txt`,
        output
    };
};
