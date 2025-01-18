import React, {useState} from 'react';
import {useQuery, gql} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import {MythicModifyStringDialog} from "../../MythicComponents/MythicDialog";
import { meState } from '../../../cache';
import {toLocalTime} from "../../utilities/Time";

const getParametersQuery = gql`
query getParametersQuery ($task_id: Int!) {
  task_by_pk(id: $task_id) {
    display_params
    original_params
    params
    tasking_location
    parameter_group_name
    command_name
    id
    timestamp
    status_timestamp_preprocessing
    status_timestamp_processing
    status_timestamp_processed
    command {
      cmd
      id
      payloadtype {
        name
        id
      }
    }
  }
}
`;

export function TaskViewParametersDialog(props) {
    const [comment, setComment] = useState("");
    const { loading, error } = useQuery(getParametersQuery, {
        variables: {task_id: props.task_id},
        onCompleted: data => {
            let workingComment = "Original Parameters:\n" + data.task_by_pk.original_params;
            workingComment += "\n\nAgent Parameters:\n" + data.task_by_pk.params;
            workingComment += "\n\nDisplay Parameters:\n" + data.task_by_pk.display_params;
            workingComment += "\n\nTasking Location:\n" + data.task_by_pk.tasking_location;
            workingComment += "\n\nParameter Group:\n" + data.task_by_pk.parameter_group_name;
            if(data.task_by_pk.command){
              if(data.task_by_pk.command.cmd !== data.task_by_pk.command_name){
                workingComment += "\n\nOriginal Command: " + data.task_by_pk.command.cmd;
                workingComment += "\nIssued Command: " + data.task_by_pk.command_name;
              }
              workingComment += "\n\nPayload Type:\n" + data.task_by_pk.command.payloadtype.name;
            }
            workingComment += "\n\n--------IMPORTANT TIMESTAMPS--------\n\n";
            workingComment += "Task Submitted by Operator : " + toLocalTime(data.task_by_pk.status_timestamp_preprocessing, meState()?.user?.view_utc_time) + "\n";
            workingComment += "Task Picked up by Agent    : " + toLocalTime(data.task_by_pk.status_timestamp_processing, meState()?.user?.view_utc_time) + "\n";
            workingComment += "First message from Task    : " + toLocalTime(data.task_by_pk.status_timestamp_processed, meState()?.user?.view_utc_time) + "\n";
            workingComment += "Last message from Task     : " + toLocalTime(data.task_by_pk.timestamp, meState()?.user?.view_utc_time) + "\n";
            setComment(workingComment);
        },
        fetchPolicy: "network-only"
    });
    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
  return (
    <React.Fragment>
        <MythicModifyStringDialog title={`View Task Parameters And Timestamps`}
                                  onClose={props.onClose}
                                  maxRows={40}
                                  wrap={true}
                                  value={comment} />
  </React.Fragment>
  );
}

