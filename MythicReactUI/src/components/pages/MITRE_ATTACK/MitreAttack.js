import React from 'react';
import { MitreGrid } from './MitreGrid';
import {useQuery, gql, useLazyQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import { Backdrop } from '@mui/material';
import {CircularProgress} from '@mui/material';
import { MythicSelectFromListDialog } from '../../MythicComponents/MythicSelectFromListDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';

const Get_MITREATTACK = gql`
query GetMitreAttack {
  attack(order_by: {t_num: asc}){
    id
    name
    t_num
    os
    tactic
  }
}
`;
const Get_TaskAttacks= gql`
query GetMitreTaskAttack($operation_id: Int!) {
  attacktask(where: {task: {callback: {operation_id: {_eq: $operation_id}}}}) {
    attack_id
    task {
      id
      command_name
      comment
      display_params
      callback {
        id
        payload {
          payloadtype {
            name
          }
        }
      }
    }
  }
}
`;
const Get_TaskAttacksFiltered = gql`
query GetMitreTaskAttack($operation_id: Int!, $payload_type: String!) {
  attacktask(where: {task: {callback: {operation_id: {_eq: $operation_id}, payload: {payloadtype: {name: {_eq: $payload_type}}}}}}) {
    attack_id
    task {
      id
      command_name
      comment
      display_params
      callback {
        id
        payload {
          payloadtype {
            name
          }
        }
      }
    }
  }
}
`;
const Get_TaskAttacksFilteredByTag = gql`
query GetMitreTaskAttack($tasks: [Int!]!) {
  attacktask(where: {task_id: {_in: $tasks}}) {
    attack_id
    task {
      id
      command_name
      comment
      display_params
      callback {
        id
        payload {
          payloadtype {
            name
          }
        }
      }
    }
  }
}
`;
const Get_CommandAttacks= gql`
query GetMitreCommandAttack{
  attackcommand {
    attack_id
    command {
      cmd
      payloadtype {
        name
      }
    }
  }
}
`;
const Get_CommandAttacksFiltered = gql`
query GetMitreCommandAttack($payload_type: String!){
  attackcommand(where: {command: {payloadtype: {name: {_eq: $payload_type}}}}) {
    attack_id
    command {
      cmd
      payloadtype {
        name
      }
    }
  }
}
`;
const getTaskTagsQuery = gql`
query getTaskTags {
  tag(where: {task_id: {_is_null: false}}) {
    id
    tagtype {
      name
    }
    task_id
  }
}
`;

export function MitreAttack({me}){
    const [backdropOpen, setBackdropOpen] = React.useState(true);
    const [mitreAttack, setMitreAttack] = React.useState({
      "Reconnaissance": {rows: [], tactic: "Reconnaissance", commands: 0, tasks: 0},
      "Resource Development": {rows: [], tactic: "Resource Development", commands: 0, tasks: 0},
      "Initial Access": {rows: [], tactic: "Initial Access", commands: 0, tasks: 0},
      "Execution": {rows: [], tactic: "Execution", commands: 0, tasks: 0},
      "Persistence": {rows: [], tactic: "Persistence", commands: 0, tasks: 0},
      "Privilege Escalation": {rows: [], tactic: "Privilege Escalation", commands: 0, tasks: 0},
      "Defense Evasion": {rows: [], tactic: "Defense Evasion", commands: 0, tasks: 0},
      "Credential Access": {rows: [], tactic: "Credential Access", commands: 0, tasks: 0},
      "Discovery": {rows: [], tactic: "Discovery", commands: 0, tasks: 0},
      "Lateral Movement": {rows: [], tactic: "Lateral Movement", commands: 0, tasks: 0},
      "Collection": {rows: [], tactic: "Collection", commands: 0, tasks: 0},
      "Command And Control": {rows: [], tactic: "Command And Control", commands: 0, tasks: 0},
      "Exfiltration": {rows: [], tactic: "Exfiltration", commands: 0, tasks: 0},
      "Impact": {rows: [], tactic: "Impact", commands: 0, tasks: 0},
    });
    const [showCountGrouping, setShowCountGrouping] = React.useState("");
    const [taskTagOptions, setTaskTagOptions] = React.useState([]);
    const [tagOptions, setTagOptions] = React.useState([]);
    const [openSelectTagDialog, setOpenSelectTagDialog] = React.useState(false);
    const [getTaskTags] = useLazyQuery(getTaskTagsQuery, {
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        setTaskTagOptions(data.tag);
        const uniqueTags = data.tag.reduce( (prev, cur) => {
          if(prev.includes(cur.tagtype.name)){
            return [...prev];
          }else{
            return [...prev, cur.tagtype.name];
          }
        }, []);
        const uniqueTagObjects = uniqueTags.map(c => {return {cmd: c}});
        setTagOptions(uniqueTagObjects);
        setOpenSelectTagDialog(true);
        setBackdropOpen(false);
      },
      onError: (error) => {

      }
    });
    const onFilterByTags = () => {
      setBackdropOpen(true);
      getTaskTags()
    }
    const [getCommands] = useLazyQuery(Get_CommandAttacks,{
      onError: data => {
        console.error(data)
      },
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        let attackCommands = [...data.attackcommand];
        let updatingMitre = {...mitreAttack};
        for(const key in updatingMitre){
          let column_total = 0;
          for(let i = 0; i < updatingMitre[key].rows.length; i++){
            // updatingMitre[key].rows[i] is a specific cell in the attack matrix
            // now check if there's a data.attackcommand entry with attack_id == updatingMitre[key].rows[i].id
            updatingMitre[key].rows[i].commands = [];
            attackCommands = attackCommands.filter( (attackcommand) => {
              //console.log(attackcommand, updatingMitre[key].rows[i]);
              if(attackcommand.attack_id === updatingMitre[key].rows[i].id){
                updatingMitre[key].rows[i].commands.push({...attackcommand.command});
                // we've already added this entry from data.attackcommand, so not bother processing it for the next row/column
                return true;
              }
              return true;
            });
            column_total += updatingMitre[key].rows[i].commands.length;
          }
          updatingMitre[key].commands = column_total;
        }
        setMitreAttack(updatingMitre);
        setShowCountGrouping("command");
      }
    });
    const [getCommandsFiltered] = useLazyQuery(Get_CommandAttacksFiltered,{
      onError: data => {
        console.error(data)
      },
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        let attackCommands = [...data.attackcommand];
        let updatingMitre = {...mitreAttack};
        for(const key in updatingMitre){
          let column_total = 0;
          for(let i = 0; i < updatingMitre[key].rows.length; i++){
            // updatingMitre[key].rows[i] is a specific cell in the attack matrix
            // now check if there's a data.attackcommand entry with attack_id == updatingMitre[key].rows[i].id
            updatingMitre[key].rows[i].commands = [];
            attackCommands = attackCommands.filter( (attackcommand) => {
              //console.log(attackcommand, updatingMitre[key].rows[i]);
              if(attackcommand.attack_id === updatingMitre[key].rows[i].id){
                updatingMitre[key].rows[i].commands.push({...attackcommand.command});
                // we've already added this entry from data.attackcommand, so not bother processing it for the next row/column
                return true;
              }
              return true;
            });
            column_total += updatingMitre[key].rows[i].commands.length;
          }
          updatingMitre[key].commands = column_total;
        }
        setMitreAttack(updatingMitre);
        setShowCountGrouping("command");
      }
    });
    const [getTasks] = useLazyQuery(Get_TaskAttacks,{
      onError: data => {
        console.error(data)
      },
      fetchPolicy: "network-only",
      onCompleted: (data) => {

        let attackTasks = [...data.attacktask];
        let updatingMitre = {...mitreAttack};
        for(const key in updatingMitre){
          let column_total = 0;
          for(let i = 0; i < updatingMitre[key].rows.length; i++){
            // updatingMitre[key].rows[i] is a specific cell in the attack matrix
            // now check if there's a data.attackcommand entry with attack_id == updatingMitre[key].rows[i].id
            updatingMitre[key].rows[i].tasks = [];
            attackTasks = attackTasks.filter( (attacktask) => {
              //console.log(attackcommand, updatingMitre[key].rows[i]);
              if(attacktask.attack_id === updatingMitre[key].rows[i].id){
                updatingMitre[key].rows[i].tasks.push({...attacktask.task});
                // we've already added this entry from data.attackcommand, so not bother processing it for the next row/column
                return true;
              }
              return true;
            });
            column_total += updatingMitre[key].rows[i].tasks.length;
          }
          updatingMitre[key].tasks = column_total;
        }
        setMitreAttack(updatingMitre);
        setShowCountGrouping("task");
      }
    });
    const [getTasksFiltered] = useLazyQuery(Get_TaskAttacksFiltered,{
      onError: data => {
        console.error(data)
      },
      fetchPolicy: "network-only",
      onCompleted: (data) => {

        let attackTasks = [...data.attacktask];
        let updatingMitre = {...mitreAttack};
        for(const key in updatingMitre){
          let column_total = 0;
          for(let i = 0; i < updatingMitre[key].rows.length; i++){
            // updatingMitre[key].rows[i] is a specific cell in the attack matrix
            // now check if there's a data.attackcommand entry with attack_id == updatingMitre[key].rows[i].id
            updatingMitre[key].rows[i].tasks = [];
            attackTasks = attackTasks.filter( (attacktask) => {
              //console.log(attackcommand, updatingMitre[key].rows[i]);
              if(attacktask.attack_id === updatingMitre[key].rows[i].id){
                updatingMitre[key].rows[i].tasks.push({...attacktask.task});
                // we've already added this entry from data.attackcommand, so not bother processing it for the next row/column
                return true;
              }
              return true;
            });
            column_total += updatingMitre[key].rows[i].tasks.length;
          }
          updatingMitre[key].tasks = column_total;
        }
        setMitreAttack(updatingMitre);
        setShowCountGrouping("task");
      }
    });
    const [getTasksFilteredByTag] = useLazyQuery(Get_TaskAttacksFilteredByTag, {
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        let attackTasks = [...data.attacktask];
        let updatingMitre = {...mitreAttack};
        for(const key in updatingMitre){
          let column_total = 0;
          for(let i = 0; i < updatingMitre[key].rows.length; i++){
            // updatingMitre[key].rows[i] is a specific cell in the attack matrix
            // now check if there's a data.attackcommand entry with attack_id == updatingMitre[key].rows[i].id
            updatingMitre[key].rows[i].tasks = [];
            attackTasks = attackTasks.filter( (attacktask) => {
              //console.log(attackcommand, updatingMitre[key].rows[i]);
              if(attacktask.attack_id === updatingMitre[key].rows[i].id){
                updatingMitre[key].rows[i].tasks.push({...attacktask.task});
                // we've already added this entry from data.attackcommand, so not bother processing it for the next row/column
                return true;
              }
              return true;
            });
            column_total += updatingMitre[key].rows[i].tasks.length;
          }
          updatingMitre[key].tasks = column_total;
        }
        setMitreAttack(updatingMitre);
        setBackdropOpen(false);
        setShowCountGrouping("task");
      }
    })
    useQuery(Get_MITREATTACK, {
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
        const mitre = data.attack.reduce( (prev, cur) => {
          const entry = {...cur, os: JSON.parse(cur["os"]), tactic: JSON.parse(cur["tactic"]), commands: [], tasks: []};
          let p = {...prev};
          for(let i = 0; i < entry.tactic.length; i++){
            if(p[entry.tactic[i]]){
              // the tactic exists already, so we can just add this as a row
              p[entry.tactic[i]].rows.push(entry);
            }else{
              p[entry.tactic[i]] = {rows: [entry], tactic: entry.tactic[i], commands: 0, tasks: 0};
            }
          }
          return {...p};
        }, {});
        if(Object.keys(mitre).length !== 0 ){
          setMitreAttack(mitre);
        }
        
        setBackdropOpen(false);
      },
      onError: (error) => {
        snackActions.error("Failed to fetch MITRE data: " + error.toString());
      }
    });
    const onGetTasks = () => {
      getTasks({variables: {operation_id: me?.user?.current_operation_id || 0}});
    }
    const onGetTasksFiltered = (payload_type) => {
      getTasksFiltered({variables: {operation_id: me?.user?.current_operation_id || 0, payload_type: payload_type}});
    }
    const onGetCommandsFiltered = (payload_type) => {
      getCommandsFiltered({variables: {payload_type: payload_type}});
    }
    const onSubmitSelectTag = (tag) => {
      setBackdropOpen(true);
      const taskIds = taskTagOptions.reduce( (prev, cur) => {
        if(cur.tagtype.name === tag.cmd){
          return [...prev, cur.task_id];
        }else{
          return [...prev];
        }
      }, []);
      getTasksFilteredByTag({variables: {tasks: taskIds}})
    }
    return (
      <React.Fragment>
        <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
            <CircularProgress color="inherit" disableShrink />
        </Backdrop>
        <MitreGrid 
          entries={mitreAttack} 
          onGetCommands={getCommands} 
          onGetTasks={onGetTasks} 
          onGetTasksFiltered={onGetTasksFiltered}
          onGetCommandsFiltered={onGetCommandsFiltered}
          onFilterByTags={onFilterByTags}
          showCountGrouping={showCountGrouping}
          />
          {openSelectTagDialog && 
              <MythicDialog fullWidth={true} maxWidth="sm" open={openSelectTagDialog}
                      onClose={()=>{setOpenSelectTagDialog(false);}} 
                      innerDialog={<MythicSelectFromListDialog onClose={()=>{setOpenSelectTagDialog(false);}}
                                          onSubmit={onSubmitSelectTag} options={tagOptions} title={"Select Tag"} 
                                          action={"select"} identifier={"cmd"} display={"cmd"}/>}
                  />
          }
      </React.Fragment>
        
    );
} 
