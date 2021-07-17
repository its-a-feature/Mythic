import React, {useEffect} from 'react';
import Table from '@material-ui/core/Table';
import TableContainer from '@material-ui/core/TableContainer';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import Switch from '@material-ui/core/Switch';
import Input from '@material-ui/core/Input';
import {Button} from '@material-ui/core';
import MythicTextField from '../../MythicComponents/MythicTextField';
import Paper from '@material-ui/core/Paper';
import TableHead from '@material-ui/core/TableHead';
import IconButton from '@material-ui/core/IconButton';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import DeleteIcon from '@material-ui/icons/Delete';
import {useTheme} from '@material-ui/core/styles';
import CancelIcon from '@material-ui/icons/Cancel';
import {Typography} from '@material-ui/core';

export function TaskParametersDialogRow(props){
    const [value, setValue] = React.useState('');
    const theme = useTheme();
    const [boolValue, setBoolValue] = React.useState(false);
    const [choiceMultipleValue, setChoiceMultipleValue] = React.useState([]);
    const [agentConnectNewHost, setAgentConnectNewHost] = React.useState("");
    const [agentConnectNewPayload, setAgentConnectNewPayload] = React.useState(0);
    const [agentConnectHost, setAgentConnectHost] = React.useState();
    const [agentConnectPayloadOptions, setAgentConnectPayloadOptions] = React.useState([]);
    const [agentConnectPayload, setAgentConnectPayload] = React.useState();
    const [agentConnectC2ProfileOptions, setAgentConnectC2ProfileOptions] = React.useState([]);
    const [agentConnectC2Profile, setAgentConnectC2Profile] = React.useState();
    const [openAdditionalPayloadOnHostMenu, setOpenAdditionalPayloadOnHostmenu] = React.useState(false);
    const [fileValue, setFileValue] = React.useState({name: ""});
    useEffect( () => {
       if(props.type === "Boolean"){
            if(value === ""){
                setBoolValue(props.value);
                setValue(props.value);
            }
       }else if(props.type === "ChoiceMultiple"){
           if(value === ""){
                setChoiceMultipleValue(props.value);
                setValue(props.value);
           }
       }
       else if(props.type === "AgentConnect"){
            if(props.choices.length > 0){
                setAgentConnectHost(0);
                setAgentConnectPayloadOptions(props.choices[0]["payloads"]);
                if(props.choices[0]["payloads"].length > 0){
                    setAgentConnectPayload(0);  
                    if(props.choices[0]["payloads"][0]["c2info"].length > 0){
                        setAgentConnectC2ProfileOptions(props.choices[0]["payloads"][0]["c2info"]);
                        setAgentConnectC2Profile(0);
                    }
                }else{
                
                }
            }else{
            
            }
       }else{
           if(value === ""){
            setValue(props.default_value);
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
            choice = props.choices[index]["source"];
        }else{
            choice = props.choices[index]["destination"];
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
    const onSwitchChange = (name, value) => {
        setBoolValue(value);
        setValue(value);
        props.onChange(name, value);
    }
    const onFileChange = (evt) => {
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const contents = btoa(e.target.result);
            setFileValue({name: evt.target.files[0].name, contents: contents});
            props.onChange(props.name, {name: evt.target.files[0].name, contents: contents});
        }
        reader.readAsBinaryString(evt.target.files[0]);
        
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
        props.onAgentConnectAddNewPayloadOnHost(agentConnectNewHost, props.payload_choices[agentConnectNewPayload].id);
        setOpenAdditionalPayloadOnHostmenu(false);
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
    const getParameterObject = () => {
        switch(props.type){
            case "Choice":
            case "ChoiceMultiple":
                return (
                    <FormControl>
                        <Select
                          native
                          multiple={props.type === "ChoiceMultiple"}
                          value={props.type === "ChoiceMultiple" ? choiceMultipleValue : value}
                          onChange={props.type === "ChoiceMultiple" ? onChangeChoiceMultiple : onChangeValue}
                          input={<Input />}
                        >
                        {
                            props.choices.map((opt, i) => (
                                <option key={props.name + i} value={opt}>{opt}</option>
                            ))
                        }
                        </Select>
                    </FormControl>
                )
            case "String":
                return (
                    <MythicTextField required={props.required} placeholder={props.default_value} value={value} multiline={false}
                        onChange={onChangeText} display="inline-block"
                        validate={testParameterValues} errorText={"Must match: " + props.verifier_regex}
                    />
                )
            case "Number":
                return (
                    <MythicTextField required={props.required} placeholder={props.default_value} value={value} multiline={false} type="number"
                        onChange={onChangeNumber} display="inline-block"
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
                        <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                            <TableBody>
                                {openAdditionalPayloadOnHostMenu ? (
                                <React.Fragment>
                                    <TableRow>
                                        <TableCell style={{width: "6em"}}>Hostname</TableCell>
                                        <TableCell>
                                            <MythicTextField required={true} placeholder={"hostname"} value={agentConnectNewHost} multiline={false}
                                                onChange={onChangeAgentConnectNewHost} display="inline-block"/>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Payload on that host</TableCell>
                                        <TableCell>
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
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>
                                            <Button component="span" variant="contained" style={{backgroundColor: theme.palette.success.main, padding: 0, color: "white"}} onClick={onAgentConnectAddNewPayloadOnHost}><AddCircleIcon />Add</Button>
                                        </TableCell>
                                        <TableCell>
                                            <Button component="span" style={{color: theme.palette.warning.main, padding: 0}} onClick={() =>{setOpenAdditionalPayloadOnHostmenu(false)}}><CancelIcon />Cancel</Button>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                                ) : (null) }
                                <TableRow>
                                    <TableCell style={{width: "6em"}}>
                                        Host 
                                        <IconButton component="span" variant="contained" style={{color: theme.palette.success.main, padding: 0}} onClick={() =>{setOpenAdditionalPayloadOnHostmenu(true)}}><AddCircleIcon /></IconButton>
                                        <IconButton component="span" variant="contained" style={{color: theme.palette.error.main, padding: 0}}><DeleteIcon /></IconButton>
                                    </TableCell>
                                    <TableCell>
                                        <FormControl>
                                            <Select
                                              native
                                              value={agentConnectHost}
                                              onChange={onChangeAgentConnectHost}
                                              input={<Input />}
                                            >
                                            {
                                                props.choices.map((opt, i) => (
                                                    <option key={props.name + "connecthost" + i} value={i}>{opt.host}</option>
                                                ))
                                            }
                                            </Select>
                                        </FormControl>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Payload</TableCell>
                                    <TableCell>
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
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>C2 Profile</TableCell>
                                    <TableCell>
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
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                        {agentConnectC2ProfileOptions.length > 0 ? (
                            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                                <TableHead>
                                        <TableRow>
                                            <TableCell style={{width: "30%"}}>Parameter</TableCell>
                                            <TableCell>Value</TableCell>
                                        </TableRow>
                                    </TableHead>
                                <TableBody>
                                    
                                    {agentConnectC2ProfileOptions[agentConnectC2Profile]["parameters"].map( (opt) => (
                                        <TableRow>
                                            <TableCell>{opt.name}</TableCell>
                                            <TableCell><pre>{JSON.stringify(opt.value, null, 2)}</pre></TableCell>
                                        </TableRow>
                                    ) ) }
                                </TableBody>
                            </Table>
                        ): (null)}
                    </TableContainer>
                )
           default:
            return null
        }
    }
    
    return (
            <TableRow key={"buildparam" + props.id}>
                <TableCell>{props.description}
                {props.required ? (
                    <Typography style={{color: theme.palette.warning.main}}>Required</Typography>
                ) : (null) }
                 </TableCell>
                <TableCell>
                    {getParameterObject()}
                </TableCell>
            </TableRow>
        )
}

