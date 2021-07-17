import React, {useState, useEffect} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import {TaskParametersDialogRow} from './TaskParametersDialogRow';
import {useQuery, gql, useLazyQuery, useMutation } from '@apollo/client';

//if we need to get all the loaded commands for the callback and filter, use this
const GetLoadedCommandsQuery = gql`
query GetLoadedCommandsQuery($callback_id: Int!) {
  loadedcommands(where: {callback_id: {_eq: $callback_id}}) {
    id
    command {
      cmd
      attributes
      id
    }
  }
}
`;
//if we need to get all the possible commands for a payload type and filter, use this
const getAllCommandsQuery = gql`
query getAllCommandsQuery($payload_type_id: Int!){
    command(where: {payload_type_id: {_eq: $payload_type_id}, deleted: {_eq: false}}) {
        attributes
        cmd
        id
    }
}
`;
//if we need to get all the possible edges for the callback, use this
const getAllEdgesQuery = gql`
query getAllEdgesQuery($callback_id: Int!){
    callbackgraphedge(where: {_or: [{source_id:{_eq: $callback_id}}, {destination_id: {_eq: $callback_id}}]}) {
        id
        c2profile {
          id
          name
        }
        direction
        destination{
            agent_callback_id
            host
            id
            payload {
              id
              uuid
            }
            c2profileparametersinstances {
              enc_key_base64
              dec_key_base64
              value
              id
              c2_profile_id
              c2profileparameter {
                crypto_type
                name
                id
              }
            }
        }
        source{
            agent_callback_id
            host
            id
            payload {
              uuid
              id
            }
            c2profileparametersinstances {
              enc_key_base64
              dec_key_base64
              c2_profile_id
              value
              id
              c2profileparameter {
                crypto_type
                name
                id
              }
            }
        }
        end_timestamp
      }
    }
`;
// get all payloads query
const getAllPayloadsQuery = gql`
query getAllPayloadsQuery($operation_id: Int!){
    payload(where: {deleted: {_eq: false}, build_phase: {_eq: "success"}, operation_id: {_eq: $operation_id}}) {
    id
    tag
    uuid
    payloadc2profiles {
      id
      c2profile {
        name
        id
      }
    }
    payloadtype{
        id
        ptype
    }
    filemetum {
        id
        filename_text
    }
    buildparameterinstances {
      parameter
      id
      buildparameter {
        name
        id
      }
    }
  }
}
`;
// get all payloads on hosts
const getAllPayloadsOnHostsQuery = gql`
query getAllPayloadsOnHostsQuery($operation_id: Int!){
    payloadonhost(where: {deleted: {_eq: false}, operation_id: {_eq: $operation_id}, payload: {c2profileparametersinstances: {c2profile: {is_p2p: {_eq: true}}}}}) {
    host
    id
    payload {
      auto_generated
      id
      tag
      filemetum {
        filename_text
        id
      }
      uuid
      c2profileparametersinstances(where: {c2profile: {is_p2p: {_eq: true}}}) {
        c2profile {
          name
          id
        }
        c2profileparameter {
          crypto_type
          name
          id
        }
        value
        enc_key_base64
        dec_key_base64
        id
      }
      callbacks(where: {active: {_eq: true}}) {
        agent_callback_id
        id
        host
        description
        enc_key_base64
        dec_key_base64
        crypto_type
      }
    }
  }
}
`;
// use this to add a payload on a host
const addPayloadOnHostMutation = gql`
    mutation addPayloadOnHostMutation($host: String!, $payload_id: Int!){
        insert_payloadonhost(objects: {host: $host, payload_id: $payload_id}) {
            affected_rows
          }
    }
`;
// use this to get all of the parameters and information for the command we're trying to execute
const getCommandQuery = gql`
query getCommandQuery($id: Int!){
  command_by_pk(id: $id) {
    attributes
    author
    cmd
    description
    help_cmd
    id
    needs_admin
    version
    payloadtype{
        ptype
    }
    commandparameters {
      choice_filter_by_command_attributes
      choices
      choices_are_all_commands
      choices_are_loaded_commands
      default_value
      description
      id
      name
      required
      supported_agent_build_parameters
      supported_agents
      type
    }
    commandopsec {
      authentication
      id
      injection_method
      process_creation
    }
  }
}
`;
export function TaskParametersDialog(props) {
    const [parameters, setParameters] = useState([]);
    const [rawParameters, setRawParameters] = useState(false);
    const [requiredPieces, setRequiredPieces] = useState({all: false, loaded: false, edges: false});
    //get all the data about our command that we can
    const [getAllCommands, { data: allCommandsLoading}] = useLazyQuery(getAllCommandsQuery, {
        fetchPolicy: "cache-and-network"
    });
    const [getLoadedCommands, { data: loadedCommandsLoading}] = useLazyQuery(GetLoadedCommandsQuery, {
        fetchPolicy: "cache-and-network"
    });
    const [getAllEdges, { data: loadedAllEdgesLoading}] = useLazyQuery(getAllEdgesQuery, {
        fetchPolicy: "cache-and-network"
    });
    const [getAllPayloads, { data: loadedAllPayloadsLoading}] = useLazyQuery(getAllPayloadsQuery, {
        fetchPolicy: "cache-and-network"
    });
    const [getAllPayloadsOnHosts, { data: loadedAllPayloadsOnHostsLoading}] = useLazyQuery(getAllPayloadsOnHostsQuery, {
        fetchPolicy: "cache-and-network"
    });
    const [addPayloadOnHost] = useMutation(addPayloadOnHostMutation, {
        onCompleted: data => {
            console.log(data);
            getAllPayloadsOnHosts({variables: {operation_id: props.callback.operation_id}})
        }
    });
    useQuery(getCommandQuery, {
        variables: {id: props.command.id},
        onCompleted: data => {
            // do an initial pass to see what other quries we need to make
            let requiredPiecesInitial = {all: false, loaded: false, edges: false};
            data.command_by_pk.commandparameters.forEach( (cmd) => {
                if(cmd.type === "LinkInfo"){
                    requiredPiecesInitial["edges"] = true;
                }else if(cmd.choices_are_all_commands){
                    requiredPiecesInitial["all"] = true;
                }else if(cmd.choices_are_loaded_commands){
                    requiredPiecesInitial["loaded"] = true;
                }else if(cmd.type === "AgentConnect"){
                    requiredPiecesInitial["connect"] = true;
                    //need payloads as well in case the user wants to add a payload to a host
                    requiredPiecesInitial["payloads"] = true;
                }else if(cmd.type === "PayloadList"){
                    requiredPiecesInitial["payloads"] = true;
                }
            });
            if(requiredPiecesInitial["edges"]){getAllEdges({variables: {callback_id: props.callback.id} });}
            if(requiredPiecesInitial["all"]){getAllCommands({variables: {payload_type_id: props.callback.payload.payloadtype.id}});}
            if(requiredPiecesInitial["loaded"]){getLoadedCommands({variables: {callback_id: props.callback.id} });}
            if(requiredPiecesInitial["payloads"]){getAllPayloads({variables: {operation_id: props.callback.operation_id} });}
            if(requiredPiecesInitial["connect"]){getAllPayloadsOnHosts({variables: {operation_id: props.callback.operation_id} });}
            setRequiredPieces(requiredPiecesInitial);
            setRawParameters({...data});
        }
    });
    const intersect = (a, b) => {
      let setB = new Set(b);
      return [...new Set(a)].filter(x => setB.has(x));
    }
    
    useEffect( () => {
        const getLinkInfoFromAgentConnect = (choices) => {
            if(choices.length > 0){
                const c2profileparameters = choices[0]["payloads"][0]["c2info"][0].parameters.reduce( (prev, opt) => {
                    return {...prev, [opt.name]: opt.value}
                }, {});
                let agentConnectValue = {host: choices[0]["host"], agent_uuid: choices[0]["payloads"][0].uuid,
                c2_profile: {name: choices[0]["payloads"][0]["c2info"][0].name, parameters: c2profileparameters}};
                if(choices[0]["payloads"][0].type === "callback"){
                    agentConnectValue["callback_uuid"] = props.choices[0]["payloads"][0]["agent_callback_id"];
                }
                return agentConnectValue;
            }else{
                return {};
            }
        };
        const getLinkInfoValue = (choices) => {
            let choice;
            if(choices.length > 0){
                if(choices[0]["source"]["id"] === props.callback_id){
                    choice = choices[0]["source"];
                }else{
                    choice = choices[0]["destination"];
                }
                const c2profileparameters = choice["c2profileparametersinstances"].reduce( (prev, opt) => {
                    if(opt.c2_profile_id === choices[0]["c2profile"]["id"]){
                        return {...prev, [opt.c2profileparameter.name]: !opt.c2profileparameter.crypto_type ? opt.value : {crypto_type: opt.c2profileparameter.crypto_type, enc_key: opt.enc_key_base64, dec_key: opt.dec_key_base64} }
                    }else{
                        return {...prev};
                    }
                }, {});
                let agentConnectValue = {host: choice.host, agent_uuid: choice.payload.uuid, callback_uuid: choice.agent_callback_id, c2_profile: {name: choices[0]["c2profile"]["name"], parameters: c2profileparameters} };
                return agentConnectValue;
            }else{
                return {};
            }
        }
        if(rawParameters && (!requiredPieces["loaded"] || loadedCommandsLoading) &&
                       (!requiredPieces["all"] || allCommandsLoading) &&
                       (!requiredPieces["edges"] || loadedAllEdgesLoading) &&
                       (!requiredPieces["payloads"] || loadedAllPayloadsLoading) && 
                       (!requiredPieces["connect"] || loadedAllPayloadsOnHostsLoading) ){
            //only process the parameter once we have fetched all of the required pieces
            const params = rawParameters.command_by_pk.commandparameters.map( (cmd) => {
                switch(cmd.type){
                    case "Boolean":
                        console.log(cmd);
                        if(cmd.default_value){
                            return {...cmd, value: cmd.default_value.toLowerCase() === "true"}
                        }else{
                            return {...cmd, value: false}
                        }
                    case "String":
                    case "Number":
                        return {...cmd, value: cmd.default_value};
                    case "Array":
                        if(cmd.default_value.length > 0){
                            return {...cmd, value: JSON.parse(cmd.default_value)};
                        }else{
                            return {...cmd, value: []};
                        }
                    case "Choice":
                    case "ChoiceMultiple":
                        let choices = cmd.choices.split("\n");
                        let defaultV = cmd.default_value;
                        if(cmd.type === "ChoiceMultiple"){
                            if(cmd.default_value !== ""){
                                defaultV = JSON.parse(cmd.default_value);
                            }else{
                                defaultV = [];
                            }
                        }
                        let filter = JSON.parse(cmd.choice_filter_by_command_attributes);
                        if(cmd.choices_are_all_commands){
                            //get all of the latest commands
                            choices = [...allCommandsLoading.command];
                            choices = choices.reduce( (prev, c) => {
                                let match = true;
                                let cmd_attributes = JSON.parse(c.attributes);
                                for(const [key, value] of Object.entries(filter)){
                                    if(key === "spawn_and_injectable"){
                                        if(value !== cmd_attributes[key]){
                                            match = false;
                                        }
                                    }else if(key === "supported_os" && value.length > 0){
                                        if(intersect(value, cmd_attributes[key]).length === 0){
                                            match = false;
                                        }
                                    }
                                }
                                if(match){
                                    return [...prev, c.cmd];
                                }else{
                                    return prev;
                                }
                            }, []);
                            if(choices.length > 0){
                                if(cmd.type === "ChoiceMultiple"){defaultV = []}
                                else{defaultV = choices[0];}
                            }
                        }else if(cmd.choices_are_loaded_commands){
                            //get all of the loaded commands
                            choices = [...loadedCommandsLoading.loadedcommands];
                            choices = choices.reduce( (prev, c) => {
                                let match = true;
                                let cmd_attributes = JSON.parse(c.command.attributes);
                                for(const [key, value] of Object.entries(filter)){
                                    if(key === "spawn_and_injectable"){
                                        if(value !== cmd_attributes[key]){
                                            match = false;
                                        }
                                    }else if(key === "supported_os" && value.length > 0){
                                        if(intersect(value, cmd_attributes[key]).length === 0){
                                            match = false;
                                        }
                                    }
                                }
                                if(match){
                                    return [...prev, c.command.cmd];
                                }else{
                                    return prev;
                                }
                            }, []);
                            if(choices.length > 0){
                                if(cmd.type === "ChoiceMultiple"){defaultV = []}
                                else{defaultV = choices[0];}
                            }
                        }
                        
                        return {...cmd, choices: choices, default_value: defaultV, value: defaultV}
                    
                    case "File":
                        return {...cmd, value: {} }
                    /*
                    case "Credential-JSON":
                    case "Credential-Account":
                    case "Credential-Realm":
                    case "Credential-Type":
                    case "Credential-Credential":
                    */
                    case "AgentConnect":
                    //want to make a format of [ {host: "hostname", payloads: [ {uuid: "uuid" } ], callbacks: [ { agent_callback_id: "uuid" } ] } ]
                        const agentConnectNewPayloads = loadedAllPayloadsLoading.payload.reduce( (prev, payload) => {
                            const profiles = payload.payloadc2profiles.reduce( (prev, profile) => {
                                return [...prev, profile.c2profile.name];
                            }, []).join(",");
                            return [...prev, {...payload, display: payload.filemetum.filename_text + " - " + profiles + " - " + payload.tag}]
                        }, []);
                        const organized = loadedAllPayloadsOnHostsLoading.payloadonhost.reduce( (prev, entry) => {
                            let found = false;
                            const updates = prev.map( (host) => {
                                if(host.host === entry.host){
                                    found = true;
                                    //now we need to merge this entry with our current payloads/callbacks for the host
                                    let duplicated_payload = false;
                                    host.payloads.forEach( (p) => {
                                        if(p.id === entry.payload.id){duplicated_payload = true}
                                    });
                                    if(duplicated_payload){return host}
                                    const c2info = entry.payload.c2profileparametersinstances.reduce( (prev, cur) => {
                                    const val = !cur.c2profileparameter.crypto_type ? cur.value : {crypto_type: cur.c2profileparameter.crypto_type, enc_key: cur.enc_key_base64, dec_key: cur.dec_key_base64};
                                        if(cur.c2profile.name in prev){
                                            //we just want to add a new entry to the c2profile.name list
                                            
                                            return {...prev, [cur.c2profile.name]: [...prev[cur.c2profile.name], { name: cur.c2profileparameter.name, value:  val } ] }
                                    }else{
                                        return {...prev, [cur.c2profile.name]: [ { name: cur.c2profileparameter.name, value: val } ] }
                                        }
                                    }, {});
                                    let c2array = [];
                                    for( const [key, value] of Object.entries(c2info)){
                                        c2array.push({name: key, parameters: value});
                                    }
                                    const payloadInfo = {...entry.payload, c2info: c2array, display: entry.payload.filemetum.filename_text + " - " + entry.payload.tag, type: "payload"};
                                    const callbacks = entry.payload.callbacks.reduce( (prior, callback) => {
                                        if(callback.host === entry.host){
                                            return [...prior, {...entry.payload, c2info: c2array, c2profileparametersinstances: entry.payload.c2profileparametersinstances,  display: "Callback " + callback.id + " - " + callback.description, ...callback, type: "callback"}];
                                        }else{
                                            return prior;
                                        }
                                    }, []);
                                    return {...host, payloads: [...host.payloads, payloadInfo, ...callbacks]}
                                }else{
                                    //this doesn't match our host, so don't modify
                                    return host; 
                                }
                            });
                            if(!found){
                                const c2info = entry.payload.c2profileparametersinstances.reduce( (prev, cur) => {
                                    const val = !cur.c2profileparameter.crypto_type ? cur.value : {crypto_type: cur.c2profileparameter.crypto_type, enc_key: cur.enc_key_base64, dec_key: cur.dec_key_base64};
                                    if(cur.c2profile.name in prev){
                                        //we just want to add a new entry to the c2profile.name list
                                        
                                        return {...prev, [cur.c2profile.name]: [...prev[cur.c2profile.name], { name: cur.c2profileparameter.name, value:  val } ] }
                                    }else{
                                        return {...prev, [cur.c2profile.name]: [ { name: cur.c2profileparameter.name, value: val } ] }
                                    }
                                }, {});
                                let c2array = [];
                                for( const [key, value] of Object.entries(c2info)){
                                    c2array.push({name: key, parameters: value});
                                }
                                const payloadInfo = {...entry.payload, c2info: c2array, display: entry.payload.filemetum.filename_text + " - " + entry.payload.tag, type: "payload"};
                                const callbacks = entry.payload.callbacks.reduce( (prior, callback) => {
                                    if(callback.host === entry.host){
                                        return [...prior, {...entry.payload, c2info: c2array, c2profileparametersinstances: entry.payload.c2profileparametersinstances,  display: "Callback " + callback.id + " - " + callback.description, ...callback, type: "callback"}];
                                    }else{
                                        return prior;
                                    }
                                }, []);
                                return [...prev, {host: entry.host, payloads: [payloadInfo, ...callbacks] } ]
                            }else{
                                return updates;
                            }
                        }, []);
                        return {...cmd, choices: organized, payload_choices: agentConnectNewPayloads, value: getLinkInfoFromAgentConnect(organized)}
                    case "PayloadList":
                        let supported_agents = cmd.supported_agents.split(",");
                        if(supported_agents.indexOf("") !== -1){supported_agents.splice(supported_agents.indexOf(""))}
                        const build_requirements = JSON.parse(cmd.supported_agent_build_parameters);
                        const payloads = loadedAllPayloadsLoading.payload.reduce( (prev, payload) => {
                            const profiles = payload.payloadc2profiles.reduce( (prev, profile) => {
                                return [...prev, profile.c2profile.name];
                            }, []).join(",");
                            if(supported_agents.length > 0 && !supported_agents.includes(payload.payloadtype.ptype)){return prev};
                            let matched = true;
                            if(payload.payloadtype.ptype in build_requirements){
                                //this means we have a filtering condition on our payload
                                for(const [key, value] of Object.entries(build_requirements[payload.payloadtype.ptype])){
                                    payload.buildparameterinstances.forEach( (build_param) => {
                                        if(build_param.buildparameter.name === key){
                                            if(build_param.parameter !== value){matched = false}
                                        }
                                    });
                                }
                            }
                            if(matched){
                                return [...prev, {...payload, display: payload.filemetum.filename_text + " - " + profiles + " - " + payload.tag}]
                            }else{
                                return prev;
                            }
                            
                        }, []);
                        //now filter the payloads based on supported_agents and supported_agent_build_parameters
                        if(payloads.length > 0){
                            return {...cmd, choices: payloads, default_value: payloads[0].uuid, value: payloads[0].uuid}
                        }else{
                            return {...cmd, choices: payloads, value: null}
                        }
                    case "LinkInfo":
                        const edge_choices = loadedAllEdgesLoading.callbackgraphedge.reduce( (prev, edge) => {
                            if(edge.source.id === edge.destination.id) {return prev}
                            if(edge.direction === 1){
                                return [...prev, {...edge, display: "Callback " + edge.source.id + " --" + edge.c2profile.name + "--> Callback " + edge.destination.id + (edge.end_timestamp === null? "(Active)" : "(Dead at " + edge.end_timestamp + ")")}];
                            }else if(edge.direction === 2){
                                return [...prev, {...edge, display: "Callback " + edge.destination.id + "-> " + edge.c2profile.name + "--> Callback " + edge.source.id + (edge.end_timestamp === null? "(Active)" : "(Dead at " + edge.end_timestamp + ")")}];
                            } else{
                                return prev;
                            }
                        }, []);
                        if(edge_choices.length > 0){
                            return {...cmd, choices: edge_choices, value: getLinkInfoValue(edge_choices)};
                        }else{
                            return {...cmd, choices: edge_choices, value: {}};
                        }
                    default:
                        return {...cmd}
                }
            } );
            const sorted = params.sort((a, b) => (a.name > b.name) ? 1 : -1)
            setParameters(sorted);
        }
    }, [rawParameters, loadedCommandsLoading, allCommandsLoading, loadedAllEdgesLoading, requiredPieces, loadedAllPayloadsLoading, loadedAllPayloadsOnHostsLoading, props.callback_id, props.choices]);
    const onSubmit = () => {
        const collapsedParameters = parameters.reduce( (prev, param) => {
            switch(param.type){
                case "String":
                case "Boolean":
                case "Number":
                case "Choice":
                case "ChoiceMultiple":
                case "AgentConnect":
                case "PayloadList":
                case "LinkInfo":
                    return {...prev, [param.name]: param.value}
                case "File":
                    return {...prev, [param.name]: param.value.name}
                default:
                    return {...prev}
            }
        }, {});
        const collapsedFiles = parameters.reduce( (prev, param) => {
            if(param.type === "File"){
                return {...prev, [param.name]: param.value.contents}
            }else{
                return {...prev}
            }
        }, {});
        props.onSubmit(props.command.cmd, JSON.stringify(collapsedParameters), JSON.stringify(collapsedFiles));
    }
    const onAgentConnectAddNewPayloadOnHost = (host, payload) => {
        addPayloadOnHost({variables: {host: host, payload_id: payload} })
    }
    const onChange = (name, value, error) => {
        
        const params = parameters.map( (param) => {
            if(param.name === name){
                return {...param, value: value};
            }else{
                return {...param};
            }
        });
        setParameters(params);
    }
    
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.command.cmd}'s Parameters</DialogTitle>
        <DialogContent dividers={true}>
            <Typography component="div">
                <b>Help</b> <pre style={{margin:0}}>{props.command.help_cmd}</pre>
                <b>Description</b> <pre style={{margin:0}}>{props.command.description}</pre>
                <b>Requires Admin?</b> {props.command.needs_admin ? "True": "False"}
            </Typography>
            <TableContainer component={Paper} className="mythicElement"> 
                <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{width: "30%"}}>Parameter</TableCell>
                            <TableCell>Value</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {parameters.map( (op) => (
                            <TaskParametersDialogRow key={"taskparameterrow" + op.id} onChange={onChange} {...op} callback_id={props.callback.id} onAgentConnectAddNewPayloadOnHost={onAgentConnectAddNewPayloadOnHost}/>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button onClick={onSubmit} variant="contained" color="secondary">
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

