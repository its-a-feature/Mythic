import React, {  } from 'react';
import {useQuery, gql} from '@apollo/client';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import {CreatePayloadBuildParametersTable} from './CreatePayloadBuildParametersTable';
import {snackActions} from '../../utilities/Snackbar';
import Typography from '@mui/material/Typography';
import {getDefaultValueForType, getDefaultChoices} from '../CreatePayload/Step2SelectPayloadType';
import MenuItem from '@mui/material/MenuItem';

const GET_Payload_Types = gql`
query getPayloadTypesBuildParametersQuery($os: jsonb!) {
  payloadtype(where: {supported_os: {_contains: $os}, deleted: {_eq: false}, wrapper: {_eq: true}}, order_by: {name: asc}) {
    name
    id
    file_extension
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

export function Step2SelectPayloadType(props){
    const [selectedPayloadType, setSelectedPayloadType] = React.useState('');
    const [selectedPayloadTypeID, setSelectedPayloadTypeID] = React.useState(0);
    const [fileExtension, setFileExtension] = React.useState('');
    const [payloadTypeParameters, setSelectedPayloadTypeParameters] = React.useState([]);
    const { loading, error, data } = useQuery(GET_Payload_Types,
        {variables:{os: props.buildOptions},
        fetchPolicy: "no-cache",
        onCompleted: data => {
            if(data.payloadtype.length > 0){
                if(props.prevData !== undefined && props.prevData.os === props.buildOptions){

                    setSelectedPayloadType(props.prevData.payload_type);
                    setSelectedPayloadTypeID(props.prevData.payload_type_id);
                    setFileExtension(props.prevData.file_extension);
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
                    if(payloadtypedata.length === 0){
                        snackActions.warning("No available payload types exist for the selected OS");
                    }
                }else{
                    setSelectedPayloadType(data.payloadtype[0].name);
                    setSelectedPayloadTypeID(data.payloadtype[0].id);
                    setFileExtension(data.payloadtype[0].file_extension);
                    const payloadtypedata = data.payloadtype.reduce( (prev, payload) => {
                        if(payload.name === data.payloadtype[0].name){
                            const params = payload.buildparameters.map( (param) => {
                                const initialValue = getDefaultValueForType(param);
                                return {...param, error: false, value: initialValue, 
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
        if(selectedPayloadType === ""){
            snackActions.warning("No payload type selected");
            return;
        }
        props.finished({"payload_type": selectedPayloadType, 
                        "parameters": payloadTypeParameters, 
                        "payload_type_id": selectedPayloadTypeID,
                        "file_extension": fileExtension, 
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
                setSelectedPayloadTypeID(payload.id);
                const params = payload.buildparameters.map( (param) => {
                    const initialValue = getDefaultValueForType(param);
                        return {...param, error: false, value: initialValue, 
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
                <CreatePayloadBuildParametersTable onChange={onChange} buildParameters={payloadTypeParameters}/>
            </div>
            <CreatePayloadNavigationButtons first={props.first} last={props.last} canceled={canceled}
                                            finished={finished}/>
            <br/><br/>
        </div>
    );
} 
