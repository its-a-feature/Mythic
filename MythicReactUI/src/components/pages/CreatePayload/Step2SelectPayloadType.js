import React, {  } from 'react';
import {useQuery, gql} from '@apollo/client';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import {CreatePayloadBuildParametersTable} from './CreatePayloadBuildParametersTable';
import Typography from '@mui/material/Typography';
import * as RandExp from 'randexp';
import MenuItem from '@mui/material/MenuItem';

const GET_Payload_Types = gql`
query getPayloadTypesBuildParametersQuery($os: jsonb!) {
  payloadtype(where: {supported_os: {_contains: $os}, deleted: {_eq: false}, wrapper: {_eq: false}, _or: [ {agent_type: {_eq: "agent"}}, {agent_type: {_eq: "service"}}] }, order_by: {name: asc}) {
    name
    id
    file_extension
    agent_type
    supports_dynamic_loading
    buildparameters(where: {deleted: {_eq: false} }, order_by: {description: asc}) {
        default_value
        description
        format_string
        id
        name
        parameter_type
        randomize
        required
        verifier_regex
        choices
    }
  }
}
 `;
export const getDefaultValueForType = (parameter) => {
    // all default values will be strings, so convert them
    if(parameter.randomize && parameter.format_string !== ""){
        return new RandExp(parameter.format_string).gen();
    }
    switch (parameter.parameter_type) {
        case "String":
            return parameter.default_value;
        case "Number":
            // automatic casting to number for multiplication
            return parameter.default_value * 1;
        case "ChooseOne":
            return parameter.default_value;
        case "ChooseOneCustom":
            return parameter.default_value;
        case "ChooseMultiple":
            // default_value will be a json string of an array
            return JSON.parse(parameter.default_value);
        case "Array":
            return JSON.parse(parameter.default_value);
        case "TypedArray":
            return JSON.parse(parameter.default_value);
        case "Boolean":
            return parameter.default_value === "true";
        case "Dictionary":
            // this will be an array of configuration
            if(typeof parameter.choices === "string"){
                let dictChoices = JSON.parse(parameter.choices);
                return dictChoices.map( (c) => {
                    return {...c, value: c.default_value}
                })
            }else{
                return parameter.choices.map( c => {
                    return {...c, value: c.default_value}
                });
            }
        case "FileMultiple":
            return [];
        case "File":
            return {name: ""};
        case "Date":
            // date default_value is a string of a number representing the day offset
            var tmpDate = new Date();
            tmpDate.setDate(tmpDate.getDate() + parseInt(parameter.default_value * 1));
            return tmpDate.toISOString().slice(0,10); 
        default:
            break;
    }
}
export const getDefaultChoices = (parameter) => {
    if(typeof parameter.choices === "string"){
        return JSON.parse(parameter.choices);
    } else {
        return parameter.choices;
    }
    
}

export function Step2SelectPayloadType(props){
    const [selectedPayloadType, setSelectedPayloadType] = React.useState('');
    const [fileExtension, setFileExtension] = React.useState('');
    const [supportsDynamicLoading, setSupportsDynamicLoading] = React.useState(false);
    const [agentType, setAgentType] = React.useState("agent");
    const [payloadTypeParameters, setSelectedPayloadTypeParameters] = React.useState([]);
    const { loading, error, data } = useQuery(GET_Payload_Types,
        {variables:{os: props.buildOptions },
        fetchPolicy: "no-cache",
        onCompleted: data => {
            if(data.payloadtype.length > 0){
                if(props.prevData !== undefined && props.prevData.os === props.buildOptions){
                    //console.log("prevdata", props.prevData);
                    setSelectedPayloadType(props.prevData.payload_type);
                    setFileExtension(props.prevData.file_extension);
                    setAgentType(props.prevData.agent_type);
                    setSupportsDynamicLoading(props.prevData.supports_dynamic_loading);
                    const payloadtypedata = data.payloadtype.reduce( (prev, payload) => {
                        if(payload.name === props.prevData.payload_type){
                            const params = payload.buildparameters.map( (param) => {
                                for(let p = 0; p < props.prevData.parameters.length; p++){
                                    if(props.prevData.parameters[p]["name"] === param.name){
                                        return {...param, error: false, 
                                            value: props.prevData.parameters[p]["value"], 
                                            trackedValue: props.prevData.parameters[p]["value"], 
                                            initialValue: getDefaultValueForType(param),
                                            choices: getDefaultChoices(param)
                                        }
                                    }
                                }
                            });
                            return [...prev, ...params];
                        }
                        return [...prev];
                    }, []);
                    payloadtypedata.sort((a,b) => -b.description.localeCompare(a.description));
                    setSelectedPayloadTypeParameters(payloadtypedata);
                    
                }else{
                    setSelectedPayloadType(data.payloadtype[0].name);
                    setFileExtension(data.payloadtype[0].file_extension);
                    setAgentType(data.payloadtype[0].agent_type);
                    setSupportsDynamicLoading(data.payloadtype[0].supports_dynamic_loading);
                    const payloadtypedata = data.payloadtype.reduce( (prev, payloadtype) => {
                        if(payloadtype.name === data.payloadtype[0].name){
                            const params = payloadtype.buildparameters.map( (param) => {
                                const initialValue = getDefaultValueForType(param);
                                return {...param, error: false, 
                                    value: initialValue, 
                                    trackedValue: initialValue, 
                                    initialValue: initialValue, 
                                    choices: getDefaultChoices(param)}
                            });
                            return [...prev, ...params];
                        }
                        return [...prev];
                    }, []);
                    payloadtypedata.sort((a,b) => -b.description.localeCompare(a.description));
                    setSelectedPayloadTypeParameters(payloadtypedata);
                }
            }
        }
    });

    
    const finished = () => {
        /*
        const finishedParams = payloadTypeParameters.map( (param) => {
            return {"name": param.name, "value": param.value}
        });
        */
        props.finished({"payload_type": selectedPayloadType, 
                        "parameters": payloadTypeParameters, 
                        "file_extension": fileExtension, 
                        "supports_dynamic_loading": supportsDynamicLoading,
                        "agent_type": agentType,
                        "os": props.buildOptions});
    }
    const canceled = () => {
        props.canceled();
    }
    const changePayloadType = (evt) => {
        setSelectedPayloadType(evt.target.value);
        const payloadtypedata = data.payloadtype.reduce( (prev, payload) => {
            if(payload.name === evt.target.value){
                setFileExtension(payload.file_extension);
                setSupportsDynamicLoading(payload.supports_dynamic_loading);
                setAgentType(payload.agent_type);
                const params = payload.buildparameters.map( (param) => {
                    const initialValue = getDefaultValueForType(param);
                    return {...param, error: false, 
                        value: initialValue, 
                        trackedValue: initialValue, 
                        initialValue: initialValue,  
                        choices: getDefaultChoices(param)}
                });
                return [...prev, ...params];
            }
            return [...prev];
        }, []);
        payloadtypedata.sort((a,b) => -b.description.localeCompare(a.description));
        setSelectedPayloadTypeParameters(payloadtypedata);
    }
    const onChange = (name, value, error) => {
        const newParams = payloadTypeParameters.map( (param) => {
            if(param.name === name){
                return {...param, value, error}
            }
            return {...param};
        });
        setSelectedPayloadTypeParameters(newParams);
    }
    if (loading) {
        return <div><CircularProgress /></div>;
    }
    if (error) {
        console.error(error);
        return <div>Error! {error.message}</div>;
    }
    return (
        <div style={{height: "100%", display: "flex", flexDirection: "column"}}>
            <Typography variant="h3" align="left" id="selectospage" component="div" 
                style={{"marginLeft": "10px"}}>
                  Select Target Payload Type
            </Typography>
            <Select
              value={selectedPayloadType}
              onChange={changePayloadType}
            >
            {
                data.payloadtype.map((opt) => (
                    <MenuItem key={"step2" + opt.name} value={opt.name}>{opt.name}</MenuItem>
                ))
            }
            </Select><br/>
            <div style={{display: "flex", flexGrow: 1, overflowY: "auto"}}>
                <CreatePayloadBuildParametersTable onChange={onChange} buildParameters={payloadTypeParameters} />
            </div>
            <CreatePayloadNavigationButtons first={props.first} last={props.last} canceled={canceled} finished={finished} />
            <br/><br/>
        </div>
    );
} 
