import React, {useEffect} from 'react';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Input from '@mui/material/Input';
import {Button, IconButton} from '@mui/material';
import MythicTextField from '../../MythicComponents/MythicTextField';
import Paper from '@mui/material/Paper';
import TableHead from '@mui/material/TableHead';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import {useTheme} from '@mui/material/styles';
import CancelIcon from '@mui/icons-material/Cancel';
import {Typography} from '@mui/material';
import {useMutation, gql } from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {CredentialTableNewCredentialDialog} from '../Search/CredentialTableNewCredentialDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { Backdrop } from '@mui/material';
import {CircularProgress} from '@mui/material';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';

const getDynamicQueryParams = gql`
mutation getDynamicParamsMutation($callback: Int!, $command: String!, $payload_type: String!, $parameter_name: String!){
    dynamic_query_function(callback: $callback, command: $command, payload_type: $payload_type, parameter_name: $parameter_name){
        status
        error
        choices
    }
}
`;
const credentialFragment = gql`
fragment credentialData on credential{
    account
    comment
    credential_text
    id
    realm
    type
    task_id
    timestamp
    deleted
    operator {
        username
    }
}
`;
const createCredentialMutation = gql`
${credentialFragment}
mutation createCredential($comment: String!, $account: String!, $realm: String!, $type: String!, $credential: bytea!) {
    insert_credential_one(object: {account: $account, credential_raw: $credential, comment: $comment, realm: $realm, type: $type}) {
      ...credentialData
    }
  }
`;

export function TaskParametersDialogRow(props){
    const [value, setValue] = React.useState('');
    const theme = useTheme();
    const [ChoiceOptions, setChoiceOptions] = React.useState([]);
    const [boolValue, setBoolValue] = React.useState(false);
    const [arrayValue, setArrayValue] = React.useState([""]);
    const [choiceMultipleValue, setChoiceMultipleValue] = React.useState([]);
    const [agentConnectNewHost, setAgentConnectNewHost] = React.useState("");
    const [agentConnectHostOptions, setAgentConnectHostOptions] = React.useState([]);
    const [agentConnectNewPayload, setAgentConnectNewPayload] = React.useState(0);
    const [agentConnectHost, setAgentConnectHost] = React.useState(0);
    const [agentConnectPayloadOptions, setAgentConnectPayloadOptions] = React.useState([]);
    const [agentConnectPayload, setAgentConnectPayload] = React.useState(0);
    const [agentConnectC2ProfileOptions, setAgentConnectC2ProfileOptions] = React.useState([]);
    const [agentConnectC2Profile, setAgentConnectC2Profile] = React.useState(0);
    const [openAdditionalPayloadOnHostMenu, setOpenAdditionalPayloadOnHostmenu] = React.useState(false);
    const [createCredentialDialogOpen, setCreateCredentialDialogOpen] = React.useState(false);
    const [fileValue, setFileValue] = React.useState({name: ""});
    const [backdropOpen, setBackdropOpen] = React.useState(false);
    const usingDynamicParamChoices = React.useRef(false);
    const updateToLatestCredential = React.useRef(false);
    const [getDynamicParams] = useMutation(getDynamicQueryParams, {
        onCompleted: (data) => {
            console.log(data);
            if(data.dynamic_query_function.status === "success"){
                try{
                    setChoiceOptions([...data.dynamic_query_function.choices]);
                    usingDynamicParamChoices.current = true;
                    if(props.type === "ChooseOne"){
                        if(data.dynamic_query_function.choices.length > 0){
                            setValue(data.dynamic_query_function.choices[0]);
                            props.onChange(props.name, data.dynamic_query_function.choices[0], false);
                        }
                    }
                }catch(error){
                    setBackdropOpen(false);
                    snackActions.warning("Failed to parse dynamic parameter results");
                    setChoiceOptions([]);
                }
                
            }else{
                snackActions.warning(data.dynamic_query_function.error);
            }
            setBackdropOpen(false);
        },
        onError: (data) => {
            snackActions.warning("Failed to perform dynamic parameter query");
            console.log(data);
            setBackdropOpen(false);
        }
    })
    const [createCredential] = useMutation(createCredentialMutation, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            snackActions.success("Successfully created new credential");
            updateToLatestCredential.current = true;
            props.addedCredential(data.insert_credential_one);
        },
        onError: (data) => {
            snackActions.error("Failed to create credential");
            console.log(data);
        }
    })
    useEffect( () => {
        if(props.dynamic_query_function !== ""){
            if(ChoiceOptions.length === 0){
                setBackdropOpen(true);
                snackActions.info("Querying payload type container for options...");
                getDynamicParams({variables:{
                    callback: props.callback_id,
                    parameter_name: props.name,
                    command: props.commandInfo.cmd,
                    payload_type: props.commandInfo.payloadtype.name
                }})
            }
        }
       if(props.type === "Boolean"){
            if(value === ""){
                setBoolValue(props.value);
                setValue(props.value);
            }
       }else if(props.type === "Array"){
            if(arrayValue.length === 0 && props.value.length > 0){
                setArrayValue(props.value);
            }
       }else if(props.type === "ChooseMultiple" && props.dynamic_query_function === null){
           if(value === ""){
               //console.log(props.value);
                setChoiceMultipleValue(props.value);
                setValue(props.value);
                setChoiceOptions(props.choices);
           }
       }
       else if(props.type === "AgentConnect"){
            if(props.choices.length > 0){
                //setAgentConnectHost(0);
                let hostNum = 0;
                if(agentConnectHost < props.choices.length){
                    hostNum = agentConnectHost;
                }else{
                    setAgentConnectHost(0);
                }
                setAgentConnectHostOptions(props.choices);
                let payloadNum = 0;
                if(agentConnectPayload < props.choices[hostNum]["payloads"].length){
                    payloadNum = agentConnectPayload;
                }else{
                    setAgentConnectPayload(0);
                }
                setAgentConnectPayloadOptions(props.choices[hostNum]["payloads"]);
                if(props.choices[hostNum]["payloads"].length > 0){
                    //setAgentConnectPayload(0);  
                    if(props.choices[hostNum]["payloads"][payloadNum]["c2info"].length > 0){
                        setAgentConnectC2ProfileOptions(props.choices[hostNum]["payloads"][payloadNum]["c2info"]);
                        //setAgentConnectC2Profile(0);
                    }
                }else{
                    snackActions.warning("Mythic knows of no host with a P2P payload. Please add one.");
                }
            }else{
                setAgentConnectHostOptions([]);
                setAgentConnectC2ProfileOptions([]);
                snackActions.warning("Mythic knows of no host with a P2P payload. Please add one.")
            }
       }else{
           if(value === ""){
               if(props.type === "Number"){
                   if(props.value === ""){
                       setValue(0);
                   }else{
                        setValue(parseInt(props.value));
                   }
               }else{
                    setValue(props.value);
               }
           }
           if(props.type === "CredentialJson"){
               //console.log("updating choiceOptions from useEffect in dialog row: ", [...props.choices])
               setChoiceOptions([...props.choices]);
               if(updateToLatestCredential.current){
                setValue(props.choices.length-1);
                props.onChange(props.name, {...props.choices[props.choices.length-1]}, false);
                updateToLatestCredential.current = false;
               }
           }
           if(props.dynamic_query_function === null && value===""){
                setChoiceOptions([...props.choices]);
                setValue(props.value);
           }else if(props.choices.length != ChoiceOptions.length){
               if(!usingDynamicParamChoices.current){
                    setChoiceOptions([...props.choices]);
               }    
               
           }
           
       }
       
    }, [props.choices, props.default_value, props.type, props.value, setBoolValue, value]);
    const onChangeAgentConnect = (host_index, payload_index, c2_index) => {
        const c2profileparameters = props.choices[host_index]["payloads"][payload_index]["c2info"][c2_index].parameters.reduce( (prev, opt) => {
            return {...prev, [opt.name]: opt.value}
        }, {});
        let agentConnectValue = {host: props.choices[host_index]["host"], agent_uuid: props.choices[host_index]["payloads"][payload_index].uuid,
        c2_profile: {name: props.choices[host_index]["payloads"][payload_index]["c2info"][c2_index].name, parameters: c2profileparameters}};
        if(props.choices[host_index]["payloads"][payload_index].type === "callback"){
            agentConnectValue["callback_uuid"] = props.choices[host_index]["payloads"][payload_index]["agent_callback_id"];
        }else{
            agentConnectValue["callback_uuid"] = "";
        }
        props.onChange(props.name, agentConnectValue, false);
    }
    const onChangeLinkInfo = (index) => {
        let choice;
        if(props.choices[index]["source"]["id"] === props.callback_id){
            choice = props.choices[index]["destination"];
        }else{
            choice = props.choices[index]["source"];
        }
        const c2profileparameters = choice["c2profileparametersinstances"].reduce( (prev, opt) => {
            if(opt.c2_profile_id === props.choices[index]["c2profile"]["id"]){
                return {...prev, [opt.c2profileparameter.name]: !opt.c2profileparameter.crypto_type ? opt.value : {crypto_type: opt.c2profileparameter.crypto_type, enc_key: opt.enc_key, dec_key: opt.dec_key} }
            }else{
                return {...prev};
            }
        }, {});
        let agentConnectValue = {host: choice.host, agent_uuid: choice.payload.uuid, callback_uuid: choice.agent_callback_id, c2_profile: {name: props.choices[index]["c2profile"]["name"], parameters: c2profileparameters} };
        props.onChange(props.name, agentConnectValue, false);
        setValue(index);
    }
    const onChangeValue = (evt) => {
        setValue(evt.target.value);
        props.onChange(props.name, evt.target.value, false);
    }
    const onChangeCredentialJSONValue = (evt) => {
        setValue(evt.target.value);
        props.onChange(props.name, ChoiceOptions[evt.target.value], false);
    }
    const onChangeChoiceMultiple = (event) => {
        const { options } = event.target;
        const value = [];
        for (let i = 0, l = options.length; i < l; i += 1) {
          if (options[i].selected) {
            value.push(options[i].value);
          }
        }
        setChoiceMultipleValue(value);
        setValue(value);
        props.onChange(props.name, value, false);
    }
    const onChangeText = (name, value, error) => {
        setValue(value);
        props.onChange(props.name, value, error);
    }
    const onChangeNumber = (name, value, error) => {
        setValue(parseInt(value));
        props.onChange(props.name, parseInt(value), error);
    }
    const onSwitchChange = (event) => {
        setBoolValue(event.target.checked);
        setValue(event.target.checked);
        props.onChange(props.name, event.target.checked);
    }
    const onFileChange = (evt) => {
       setFileValue({name: evt.target.files[0].name});
       props.onChange(props.name, evt.target.files[0]);
        
    }
    const onChangeAgentConnectHost = (event) => {
        setAgentConnectHost(event.target.value); 
        setAgentConnectPayloadOptions(props.choices[event.target.value]["payloads"]);
        if(props.choices[event.target.value]["payloads"].length > 0){
            setAgentConnectPayload(0);  
            if(props.choices[event.target.value]["payloads"][0]["c2info"].length > 0){
                setAgentConnectC2ProfileOptions(props.choices[0]["payloads"][0]["c2info"]);
                setAgentConnectC2Profile(0);
                onChangeAgentConnect(event.target.value, 0, 0);
            }else{
                setAgentConnectC2ProfileOptions([]);
                setAgentConnectC2Profile(null);
            }
        }else{
            setAgentConnectPayloadOptions([]);
            setAgentConnectPayload(null);
            setAgentConnectC2ProfileOptions([]);
            setAgentConnectC2Profile(null);
        }
    }
    const onChangeAgentConnectPayload = (event) => {
        setAgentConnectPayload(event.target.value);
        setAgentConnectC2ProfileOptions(props.choices[agentConnectHost]["payloads"][event.target.value]["c2info"]);
        if(props.choices[agentConnectHost]["payloads"][event.target.value]["c2info"].length > 0){
            setAgentConnectC2Profile(0);
            onChangeAgentConnect(agentConnectHost, event.target.value, 0);
        }else{
            setAgentConnectC2Profile(null);
        }
    }
    const onChangeAgentConnectC2Profile = (event) => {
        setAgentConnectC2Profile(event.target.value);
        onChangeAgentConnect(agentConnectHost, agentConnectPayload, event.target.value);
    }
    const onChangeAgentConnectNewHost = (name, value, error) => {
        setAgentConnectNewHost(value);
    }
    const onChangeAgentConnectNewPayload = (event) => {
        setAgentConnectNewPayload(event.target.value);
    }
    const onAgentConnectAddNewPayloadOnHost = () => {
        if(agentConnectNewHost === ""){
            snackActions.error("Must set a hostname");
            return;
        }
        props.onAgentConnectAddNewPayloadOnHost(agentConnectNewHost.toUpperCase(), props.payload_choices[agentConnectNewPayload].id);
        setOpenAdditionalPayloadOnHostmenu(false);
    }
    const onAgentConnectRemovePayloadOnHost = () => {
        if(props.choices[agentConnectHost]["payloads"][agentConnectPayload].payloadOnHostID){
            props.onAgentConnectRemovePayloadOnHost(props.choices[agentConnectHost]["payloads"][agentConnectPayload].payloadOnHostID);
        }else{
            snackActions.warning("Can't remove a callback");
        }
        
    }
    const testParameterValues = (curVal) => {
        if( props.required && props.verifier_regex !== ""){
            return !RegExp(props.verifier_regex).test(curVal);
        }else if(props.verifier_regex !== "" && curVal !== ""){
            return !RegExp(props.verifier_regex).test(curVal);
        }else{
            return false;
        }
    }
    const addNewArrayValue = () => {
        const newArray = [...arrayValue, ""];
        setArrayValue(newArray);
        props.onChange(props.name, newArray, false);
    }
    const removeArrayValue = (index) => {
        let removed = [...arrayValue];
        removed.splice(index, 1);
        setArrayValue(removed);
        props.onChange(props.name, removed, false);
    }
    const onChangeArrayText = (value, error, index) => {
        let values = [...arrayValue];
        if(value.includes("\n")){
            let new_values = value.split("\n");
            values = [...values, ...new_values.slice(1)];
            values[index] = new_values[0];
        }else{
            values[index] = value;
        }
        
        setArrayValue(values);
        props.onChange(props.name, values, false);
    }
    const onCreateCredential = ({type, account, realm, comment, credential}) => {
        createCredential({variables: {type, account, realm, comment, credential}})
    }
    const getParameterObject = () => {
        switch(props.type){
            case "ChooseOne":
            case "ChooseMultiple":
                return (
                    <React.Fragment>
                        <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
                            <CircularProgress color="inherit" />
                        </Backdrop>
                        <FormControl style={{width: "100%"}}>
                            <Select
                            native
                            autoFocus={props.autoFocus}
                            multiple={props.type === "ChooseMultiple"}
                            value={props.type === "ChooseMultiple" ? choiceMultipleValue : value}
                            onChange={props.type === "ChooseMultiple" ? onChangeChoiceMultiple : onChangeValue}
                            input={<Input />}
                            >
                            {
                                ChoiceOptions.map((opt, i) => (
                                    <option key={props.name + i} value={opt}>{opt}</option>
                                ))
                            }
                            </Select>
                        </FormControl>
                    </React.Fragment>
                    
                )
            case "Array":
                return (
                    <TableContainer component={Paper} className="mythicElement">
                        <Table size="small" style={{tableLayout: "fixed", maxWidth: "100%", "overflow": "auto"}}>
                            <TableBody>
                                {arrayValue.map( (a, i) => (
                                    <TableRow key={'array' + props.name + i} >
                                        <MythicStyledTableCell style={{width: "2rem", paddingLeft:"0"}}>
                                            <IconButton onClick={(e) => {removeArrayValue(i)}} size="large"><DeleteIcon color="error" /> </IconButton>
                                        </MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <MythicTextField required={props.required} fullWidth={true} placeholder={""} value={a} multiline={true} autoFocus={props.autoFocus || i > 0}
                                                onChange={(n,v,e) => onChangeArrayText(v, e, i)} display="inline-block" maxRows={5}
                                                validate={testParameterValues} errorText={"Must match: " + props.verifier_regex}
                                            />
                                        </MythicStyledTableCell>
                                    </TableRow>
                                ))}
                                <TableRow >
                                    <MythicStyledTableCell style={{width: "5rem", paddingLeft:"0"}}>
                                        <IconButton onClick={addNewArrayValue} size="large"> <AddCircleIcon color="success"  /> </IconButton>
                                    </MythicStyledTableCell>
                                    <MythicStyledTableCell></MythicStyledTableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )
            case "String":
                return (
                    <MythicTextField required={props.required} placeholder={props.default_value} value={value} multiline={true} maxRows={5}
                        onChange={onChangeText} display="inline-block" onEnter={props.onSubmit} autoFocus={props.autoFocus}
                        validate={testParameterValues} errorText={"Must match: " + props.verifier_regex}
                    />
                )
            case "Number":
                return (
                    <MythicTextField required={props.required} placeholder={props.default_value} value={value} multiline={false} type="number"
                        onChange={onChangeNumber} display="inline-block" onEnter={props.onSubmit} autoFocus={props.autoFocus}
                        validate={testParameterValues} errorText={"Must match: " + props.verifier_regex}
                    />
                )
            case "Boolean":
                return (
                    <Switch checked={boolValue} onChange={onSwitchChange} />
                )
            case "File":
                return (
                    <Button variant="contained" component="label"> 
                        { fileValue.name === "" ? "Select File" : fileValue.name } 
                    <input onChange={onFileChange} type="file" hidden /> </Button>
                )
            case "LinkInfo":
                return (
                    <FormControl>
                        <Select
                          native
                          value={value}
                          autoFocus={props.autoFocus}
                          onChange={(evt) => {onChangeLinkInfo(evt.target.value)}}
                          input={<Input />}
                        >
                        {
                            props.choices.map((opt, i) => (
                                <option key={props.name + i} value={i}>{opt.display}</option>
                            ))
                        }
                        </Select>
                    </FormControl>
                )
            case "PayloadList":
                return (
                    <FormControl>
                        <Select
                          native
                          value={value}
                          autoFocus={props.autoFocus}
                          onChange={onChangeValue}
                          input={<Input />}
                        >
                        {
                            props.choices.map((opt, i) => (
                                <option key={props.name + i} value={opt.uuid}>{opt.display}</option>
                            ))
                        }
                        </Select>
                    </FormControl>
                )
            case "AgentConnect":
                return (
                    <TableContainer component={Paper} className="mythicElement"> 
                        <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "auto"}}>
                            <TableBody>
                                {openAdditionalPayloadOnHostMenu ? (
                                <React.Fragment>
                                    <TableRow>
                                        <MythicStyledTableCell style={{width: "15em"}}>Hostname</MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <MythicTextField required={true} placeholder={"hostname"} value={agentConnectNewHost} multiline={false} autoFocus={props.autoFocus}
                                                onChange={onChangeAgentConnectNewHost} display="inline-block"/>
                                        </MythicStyledTableCell>
                                    </TableRow>
                                    <TableRow>
                                        <MythicStyledTableCell>Payload on that host</MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <FormControl>
                                                <Select
                                                  native
                                                  value={agentConnectNewPayload}
                                                  onChange={onChangeAgentConnectNewPayload}
                                                  input={<Input />}
                                                >
                                                {props.payload_choices ? (
                                                    props.payload_choices.map((opt, i) => (
                                                        <option key={props.name + "newpayload" + i} value={i}>{opt.display}</option>
                                                    ))
                                                ) : ( <option key={props.name + "nooptionnewpayload"} value="-1">No Payloads</option> )}
                                                </Select>
                                            </FormControl>
                                        </MythicStyledTableCell>
                                    </TableRow>
                                    <TableRow>
                                        <MythicStyledTableCell>
                                            <Button component="span"  style={{color: theme.palette.success.main, padding: 0}} onClick={onAgentConnectAddNewPayloadOnHost}><AddCircleIcon />Confirm</Button>
                                        </MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <Button component="span" style={{color: theme.palette.warning.main, padding: 0}} onClick={() =>{setOpenAdditionalPayloadOnHostmenu(false)}}><CancelIcon />Cancel</Button>
                                        </MythicStyledTableCell>
                                    </TableRow>
                                </React.Fragment>
                                ) : (<React.Fragment>
                                    <TableRow>
                                        <MythicStyledTableCell style={{width: "14em"}}>
                                            Host 
                                        </MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <FormControl>
                                                <Select
                                                native
                                                value={agentConnectHost}
                                                onChange={onChangeAgentConnectHost}
                                                input={<Input />}
                                                >
                                                {
                                                    agentConnectHostOptions.map((opt, i) => (
                                                        <option key={props.name + "connecthost" + i} value={i}>{opt.host}</option>
                                                    ))
                                                }
                                                </Select>
                                            </FormControl>
                                        </MythicStyledTableCell>
                                    </TableRow>
                                    <TableRow>
                                        <MythicStyledTableCell>Payload</MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <FormControl>
                                                <Select
                                                native
                                                value={agentConnectPayload}
                                                onChange={onChangeAgentConnectPayload}
                                                input={<Input />}
                                                >
                                                {
                                                    agentConnectPayloadOptions.map((opt, i) => (
                                                        <option key={props.name + "connectagent" + i} value={i}>{opt.display}</option>
                                                    ))
                                                }
                                                </Select>
                                            </FormControl>
                                            
                                        </MythicStyledTableCell>
                                    </TableRow>
                                                <TableRow>
                                                    <MythicStyledTableCell>
                                                    <Button component="span" style={{color: theme.palette.success.main, padding: 0}} onClick={() =>{setOpenAdditionalPayloadOnHostmenu(true)}}><AddCircleIcon />Register New</Button>
                                                    </MythicStyledTableCell>
                                                    <MythicStyledTableCell>
                                                    <Button component="span" style={{color: theme.palette.error.main, padding: 0}} onClick={onAgentConnectRemovePayloadOnHost}><DeleteIcon />Remove Listed</Button>
                                                    </MythicStyledTableCell>
                                                </TableRow>
                                    <TableRow>
                                        <MythicStyledTableCell>C2 Profile</MythicStyledTableCell>
                                        <MythicStyledTableCell>
                                            <FormControl>
                                                    <Select
                                                    native
                                                    value={agentConnectC2Profile}
                                                    onChange={onChangeAgentConnectC2Profile}
                                                    input={<Input />}
                                                    >
                                                    {
                                                        agentConnectC2ProfileOptions.map((opt, i) => (
                                                            <option key={props.name + "connectprofile" + i} value={i}>{opt.name}</option>
                                                        ))
                                                    }
                                                    </Select>
                                                </FormControl>
                                        </MythicStyledTableCell>
                                    </TableRow>
                                </React.Fragment>) }

                                    
                            </TableBody>
                        </Table>
                        {agentConnectC2ProfileOptions.length > 0 && !openAdditionalPayloadOnHostMenu ? (
                            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                                <TableHead>
                                        <TableRow>
                                            <MythicStyledTableCell style={{width: "30%"}}>Parameter</MythicStyledTableCell>
                                            <MythicStyledTableCell>Value</MythicStyledTableCell>
                                        </TableRow>
                                    </TableHead>
                                <TableBody>
                                    
                                    {agentConnectC2ProfileOptions[agentConnectC2Profile]["parameters"].map( (opt, i) => (
                                        <TableRow key={"agentconnectparameters" + props.name + i}>
                                            <MythicStyledTableCell>{opt.name}</MythicStyledTableCell>
                                            <MythicStyledTableCell><pre>{JSON.stringify(opt.value, null, 2)}</pre></MythicStyledTableCell>
                                        </TableRow>
                                    ) ) }
                                </TableBody>
                            </Table>
                        ): (null)}
                    </TableContainer>
                )
            case "CredentialJson":
                return (
                    <React.Fragment>
                        <MythicDialog fullWidth={true} maxWidth="md" open={createCredentialDialogOpen} 
                            onClose={()=>{setCreateCredentialDialogOpen(false);}} 
                            innerDialog={<CredentialTableNewCredentialDialog onSubmit={onCreateCredential} onClose={()=>{setCreateCredentialDialogOpen(false);}} />}
                        />
                        <FormControl style={{width: "100%"}}>
                            <Select
                                native
                                value={value}
                                autoFocus={props.autoFocus}
                                onChange={onChangeCredentialJSONValue}
                                input={<Input />}
                            >
                            {
                                ChoiceOptions.map((opt, i) => (
                                    <option key={props.name + i} value={i}>
                                        {opt.account + "@" + opt.realm + " - " + opt.credential_text.substring(0, 10) + " - " + opt.comment}
                                    </option>
                                ))
                            }
                            </Select>
                        </FormControl>
                        <Button size="small" color="primary" onClick={ () => {setCreateCredentialDialogOpen(true);}} variant="contained">New Credential</Button>
                    </React.Fragment>
                    
                )
           default:
            return null
        }
    }
    return (
            <TableRow key={"buildparam" + props.id}>
                <MythicStyledTableCell >
                    <MythicStyledTooltip title={props.description.length > 0 ? props.description : "No Description"}>
                        {props.display_name}
                    </MythicStyledTooltip>
                    {props.required ? (
                        <Typography component="div" style={{color: theme.palette.warning.main}}>Required</Typography>
                    ) : (null) }
                 </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {getParameterObject()}
                </MythicStyledTableCell>
            </TableRow>
        )
}

