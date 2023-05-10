import React, {useEffect} from 'react';
import {useLazyQuery, gql } from '@apollo/client';
import {TaskArtifactsTable} from './TaskArtifactsTable';
import {TaskMITREATTACKTable} from './TaskMITREATTACKTable';
import {TaskFilesTable} from './TaskFilesTable';
import {TaskCredentialsTable} from './TaskCredentialsTable';


const MetadataQuery = gql`
query taskMetadataQuery($task_range: [Int!]) {
    task(where: {id: {_in: $task_range}}) {
      credentials {
        account
        comment
        credential_text
        id
        realm
        type
        task_id
      }
      filemeta {
        agent_file_id
        complete
        deleted
        filename_text
        full_remote_path_text
        host
        id
        comment
        total_chunks
        chunks_received
        is_download_from_agent
        is_payload
        is_screenshot
        md5
        sha1
        task {
            comment
            id
        }
      }
      taskartifacts {
        artifact_text
        host
        task_id
        base_artifact
        id
      }
      tokens {
        token_id
        id
        host
      }
      attacktasks(distinct_on: attack_id) {
        attack {
          name
          os
          id
          t_num
          tactic
        }
        id
      }
      id
    }
  }`;
export function TaskMetadataTable(props){
   const [tasks, setTasks] = React.useState([]);

   const [getMetadata] = useLazyQuery(MetadataQuery, {
        onCompleted: data => {
            setTasks(data.task);
        },
        onError: data => {
            console.log("error!", data)
        }
    });
    useEffect( () => {
        getMetadata({variables: {task_range: props.taskIDs } });
    }, [props.taskIDs, getMetadata]);
  return (
    <div style={{marginTop: "10px", marginRight: "5px"}}>
        <TaskArtifactsTable tasks={tasks}/>
        <TaskMITREATTACKTable tasks={tasks}/>
        <TaskFilesTable tasks={tasks}/>
        <TaskCredentialsTable tasks={tasks}/>
    </div>
  );
}
