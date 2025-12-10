import React from 'react';
import {gql} from '@apollo/client';
import Select from '@mui/material/Select';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import { snackActions } from '../../utilities/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import {PayloadSelect} from "../CreateWrapper/Step3SelectPayload";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import {getDefaultChoices, getDefaultValueForType, getSavedToType} from "./Step2SelectPayloadType";
import {CreatePayloadBuildParametersTable} from "./CreatePayloadBuildParametersTable";
import {ParseForDisplay} from "../Payloads/DetailedPayloadTable";
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import {getModifiedC2Params} from "./Step4C2Profiles";
import { Backdrop, CircularProgress } from '@mui/material';


const GET_Payload_Types = gql`
query getPayloadTypesQuery {
  payloadtype(where: {deleted: {_eq: false}, wrapper: {_eq: false}, agent_type: {_in: ["agent", "service"]}}) {
    id
    supported_os
    name
    note
    semver
    payloadtypec2profiles{
        c2profile{
            name
        }
    }
  }
}
 `;

export const GetPayloads = gql`
query payloads($payloadType: String!, $os: String!) {
  payload(where: {auto_generated: {_eq: false}, os: {_eq: $os}, payloadtype: {name: {_eq: $payloadType}}, deleted: {_eq: false}}, order_by: {id: desc}) {
      id
      description
      uuid
      creation_time
      build_phase
      payload_build_steps(order_by: {step_number: asc}) {
        step_name
        step_number
        step_success
        step_skip
        start_time
        end_time
        step_stdout
        step_stderr
        id
      }
      filemetum {
        agent_file_id
        filename_text
        id
      }
  }
}
 `;

export const GetBuildParametersQuery = gql`
query getPayloadTypesBuildParametersQuery($payloadtype: String!) {
  payloadtype(where: {name: {_eq: $payloadtype}}) {
    name
    id
    file_extension
    agent_type
    note
    supports_dynamic_loading
    supports_multiple_c2_in_build
    supports_multiple_c2_instances_in_build
    c2_parameter_deviations
    semver
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
        group_name
        supported_os
        hide_conditions
        ui_position
        dynamic_query_function
    }
  }
}
 `;
const GetPayloadBuildQuery = gql`
query getPayloadTypesBuildParametersQuery($payload_id: Int!) {
  payload_by_pk(id: $payload_id) {
    buildparameterinstances {
        build_parameter_id
        value
    }
    payloadcommands {
      command {
        cmd
      }
    }
    payloadtype {
        name
        id
        file_extension
        agent_type
        note
        supports_dynamic_loading
        supports_multiple_c2_in_build
        supports_multiple_c2_instances_in_build
        c2_parameter_deviations
        semver
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
            group_name
            supported_os
            hide_conditions
            ui_position
            dynamic_query_function
        }
    }
    c2profileparametersinstances{
        c2profileparameter {
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
          ui_position
          c2profile {
              name
              id
              is_p2p
              c2profileparametersinstances(where: {instance_name: {_is_null: false}}, distinct_on: instance_name, order_by: {instance_name: asc}){
                    instance_name
                    id
                }
          }
        }
        id
        value
        count
      }
    }
}
 `;

export function Step1SelectOS(props){
    const [os, setOS] = React.useState('');
    const [openBackdrop, setOpenBackdrop] = React.useState(true);
    const [payloadtypeData, setPayloadtypeData] = React.useState({});
    const [payloadtypesPerOS, setPayloadtypesPerOS] = React.useState({});
    const [C2PerOS, setC2PerOS] = React.useState({});
    const [osOptions, setOSOptions] = React.useState([]);
    const [selectedPayloadType, setSelectedPayloadType] = React.useState('');
    const [payloadOptions, setPayloadOptions] = React.useState([]);
    const payloadConfigRef = React.useRef({});
    const getPayloadTypeAndPreviousData = useMythicLazyQuery(GET_Payload_Types, {fetchPolicy: "network-only",
    });
    const getPayloads = useMythicLazyQuery(GetPayloads, { fetchPolicy: "network-only",
    })
    const getPayloadConfig = useMythicLazyQuery(GetPayloadBuildQuery, { fetchPolicy: "network-only",
    })
    React.useEffect( () => {
        getPayloadTypeAndPreviousData({})
            .then(({data}) => {
                let payloadTypeOS = {};
                let C2OS = {};
                const payloadTypeData = data.payloadtype.reduce( (prev, cur) => {
                    return {...prev, [cur.name]: {...cur}};
                }, {});
                setPayloadtypeData(payloadTypeData);
                const optionsReduced= data.payloadtype.reduce((currentOptions, payloadtype) => {
                    const adds = payloadtype.supported_os.reduce( (prev, os) => {
                        if(payloadTypeOS[os] === undefined){
                            payloadTypeOS[os] = [payloadtype.name];
                        } else {
                            payloadTypeOS[os].push(payloadtype.name);
                            payloadTypeOS[os].sort();
                        }
                        if(C2OS[os] === undefined){
                            C2OS[os] = [...payloadtype.payloadtypec2profiles.map(c => c.c2profile.name)];
                        } else {
                            let newProfiles = payloadtype.payloadtypec2profiles.map(c => c.c2profile.name);
                            C2OS[os] = C2OS[os].reduce( (prevC2, curC2) => {
                                if(prevC2.includes(curC2)){
                                    return [...prevC2];
                                }
                                return [...prevC2, curC2];
                            }, [...newProfiles]).sort();
                        }
                        if(!currentOptions.includes(os)){
                            return [...prev, os];
                        }
                        return prev;
                    }, []);
                    return [...currentOptions, ...adds];
                }, []);
                const sortedOptions = optionsReduced.sort();
                if(props.prevData !== undefined){
                    setOS(props.prevData.os);
                    setSelectedPayloadType(props.prevData.payload_type);
                }
                else if(os === "" && sortedOptions.length > 0){
                    setOS(sortedOptions[0]);
                    setSelectedPayloadType(payloadTypeOS[sortedOptions[0]][0]);
                } else if(sortedOptions.length === 0){
                    snackActions.error("No Payload Types installed");
                }
                setPayloadtypesPerOS(payloadTypeOS);
                setC2PerOS(C2OS);
                setOSOptions(sortedOptions);
            })
            .catch((data) => {console.log(data)})
    }, [props.prevData, props.first])
    React.useEffect( () => {
        setOpenBackdrop(true);
        getPayloads({variables: {payloadType: selectedPayloadType, os}})
            .then(({data}) => {
                setPayloadOptions(data.payload);
                setOpenBackdrop(false);
            })
            .catch(({data}) => {
                console.log(data);
                setOpenBackdrop(false);
            });
    }, [selectedPayloadType, os]);

    const finished = (clearNextPrevious) => {
        if(props.first){
            props.finished({
                "os": os,
                "payload_type": selectedPayloadType
            }, clearNextPrevious);
        } else {
            props.finished({...payloadConfigRef.current});
        }
    }
    const canceled = () => {
        props.canceled();
    }
    const onChangeOS = (e) => {
        setOS(e.target.value);
        setSelectedPayloadType(payloadtypesPerOS[e.target.value][0]);
    }
    const onSelectedPayload = (payload) => {
        let newConfig = {
            0: {
                "os": os,
                "payload_type": selectedPayloadType,
                "payload": payload.id,
            },
        };
        getPayloadConfig({variables: {payload_id: payload.id}})
            .then(({data}) => {
                newConfig[1] = {
                    os: os,
                    payload: payload.id,
                    payload_type: selectedPayloadType,
                    agent_type: data.payload_by_pk.payloadtype.agent_type,
                    description: data.payload_by_pk.payloadtype.note,
                    file_extension: data.payload_by_pk.payloadtype.file_extension,
                    supports_dynamic_loading: data.payload_by_pk.payloadtype.supports_dynamic_loading,
                    supports_multiple_c2_in_build: data.payload_by_pk.payloadtype.supports_multiple_c2_in_build,
                    supports_multiple_c2_instances_in_build: data.payload_by_pk.payloadtype.supports_multiple_c2_instances_in_build,
                    c2_parameter_deviations: data.payload_by_pk.payloadtype.c2_parameter_deviations,
                };
                const params = data.payload_by_pk.payloadtype.buildparameters.map((param) => {
                    for (let p = 0; p < data.payload_by_pk.buildparameterinstances.length; p++) {
                        if (data.payload_by_pk.buildparameterinstances[p]["build_parameter_id"] === param.id) {
                            let value = {
                                ...param, error: false,
                                value: data.payload_by_pk.buildparameterinstances[p]["value"],
                                trackedValue: data.payload_by_pk.buildparameterinstances[p]["value"],
                                initialValue:  data.payload_by_pk.buildparameterinstances[p]["value"],
                                choices: getDefaultChoices(param)
                            };
                            let newValue = getSavedToType(value);
                            return {
                                ...param, error: false,
                                value: newValue,
                                trackedValue: newValue,
                                initialValue: newValue,
                                choices: getDefaultChoices(param)
                            }
                        }
                    }
                    const initialValue = getDefaultValueForType(param);
                    return {
                        ...param, error: false,
                        value: initialValue,
                        trackedValue: initialValue,
                        initialValue: initialValue,
                        choices: getDefaultChoices(param)
                    }
                });
                //params.sort((a, b) => -b.description.localeCompare(a.description));
                params.sort(sortByUiPositionThenName);
                newConfig[1].parameters = params;
                newConfig[2] = data.payload_by_pk.payloadcommands.map( c => c.command.cmd);
                newConfig[3] = {
                    payload_type: selectedPayloadType,
                }
                const c2 = data.payload_by_pk.c2profileparametersinstances.reduce( (prev, cur) => {
                    let inst = {...cur, ...cur.c2profileparameter};
                    if(inst.parameter_type === "Array" || inst.parameter_type === "ChooseMultiple" || inst.parameter_type === "TypedArray" || inst.parameter_type === "FileMultiple"){
                        try{
                            inst["value"] = JSON.parse(inst["value"]);
                        }catch(error){
                            inst["value"] = inst["value"];
                        }
                        try{
                            inst["trackedValue"] = JSON.parse(inst["value"]);
                        }catch(error){
                            inst["trackedValue"] = inst["value"];
                        }
                        inst["initialValue"] = getDefaultValueForType(inst);
                        inst["choices"] = getDefaultChoices(inst);
                    } else if(inst.parameter_type === "Dictionary"){
                        //
                        let choices = getDefaultChoices(inst);
                        let finalDict = JSON.parse(inst["value"]); // this is a dictionary instead of an array, so fix it back
                        let finalDictKeys = Object.keys(finalDict);
                        let finalArray = [];
                        for(let i = 0; i < finalDictKeys.length; i++){
                            let newDict = {
                                name: finalDictKeys[i],
                                value: finalDict[finalDictKeys[i]],
                                default_show: true
                            };
                            for(let j = 0; j < choices.length; j++){
                                if(choices[j].name === finalDictKeys[i]){
                                    newDict["default_value"] = choices[j]["default_value"]
                                }
                            }
                            finalArray.push(newDict);
                        }
                        choices = choices.map(c => {return {...c, default_show: false}});
                        let initialValue = getDefaultValueForType(inst);
                        inst = {...inst, value: finalArray, choices: choices, trackedValue: finalArray, initialValue: initialValue, default_value: initialValue};
                    } else if(inst.parameter_type === "File") {
                        inst["choices"] = getDefaultChoices(inst);
                        inst["trackedValue"] = {name: inst["value"], legacy: true};
                        inst["initialValue"] = getDefaultValueForType(inst);
                    } else {
                        inst["choices"] = getDefaultChoices(inst);
                        inst["trackedValue"] = inst["value"];
                        inst["initialValue"] = getDefaultValueForType(inst);
                    }
                    for(let i = 0; i < prev.length; i++){
                        if(prev[i].name === cur.c2profileparameter.c2profile.name && prev[i].count === cur.count){
                            prev[i].c2profileparameters.push({
                                ...inst
                            });
                            return [...prev];
                        }
                    }
                    return [...prev, {
                        id: cur.c2profileparameter.c2profile.id,
                        is_p2p: cur.c2profileparameter.c2profile.is_p2p,
                        name: cur.c2profileparameter.c2profile.name,
                        count: cur.count,
                        selected_instance: "None",
                        c2profileparameters: [{
                            ...inst
                        }],
                        c2profileparametersinstances: [...cur.c2profileparameter.c2profile.c2profileparametersinstances]
                    }]
                }, []);
                //console.log("before getModifiedC2Params", c2);

                const profiles = c2.map( (profile) => {
                    const parameters = getModifiedC2Params(profile, profile.c2profileparameters, newConfig[1], true);
                    //parameters.sort((a,b) => -b.description.localeCompare(a.description));
                    parameters.sort(sortByUiPositionThenName);
                    return {...profile, c2profileparameters: parameters, "selected_instance": "None"};
                });
                newConfig[3].c2 = profiles;

                //console.log("newConfig", newConfig);
                props.setAllData(newConfig);
            })
            .catch((data) => console.log(data));

    }
    const onStartFresh = () => {
        finished(true)
    }
    const onUpdatePayloadConfig = (payload) => {
        payloadConfigRef.current = payload
    }
    return (
        <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column"
        }}>
            {/* Content area that can grow */}
            <div style={{
                flexGrow: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minHeight: 0 // Important for flex shrinking
            }}>
                {/* Top section - fixed height */}
                <div style={{
                    display: "flex",
                    flexShrink: 0 // Don't shrink this section
                }}>
                    <div style={{width: "100%", margin: "5px", border: "1px solid grey", borderRadius: "5px", padding: "10px"}}>
                        <Typography variant={"p"} style={{fontWeight: 600}}>
                            1. Select Operating System
                        </Typography>
                        <Select
                            value={os}
                            style={{width: "100%"}}
                            disabled={!props.first}
                            onChange={onChangeOS}
                        >
                            {
                                osOptions.map((opt) => (
                                    <MenuItem key={"step1" + opt} value={opt}>{opt}</MenuItem>
                                ))
                            }
                        </Select>
                        <Typography style={{fontWeight: 600}}>
                            Compatible Payload Types
                        </Typography>
                        {payloadtypesPerOS[os]?.join(", ")}
                        <Typography style={{fontWeight: 600}}>
                            Compatible C2 Profiles
                        </Typography>
                        {C2PerOS[os]?.join(", ")}
                    </div>
                    <div style={{width: "100%", margin: "5px", border: "1px solid grey", borderRadius: "5px", padding: "10px"}}>
                        <div style={{width: "100%", display: "flex", alignItems: "flex-start", marginBottom: "10px", flexDirection: "column"}}>
                            <Typography style={{fontWeight: 600}} variant={"p"}>
                                2. Select Payload Type
                            </Typography>
                            <Select
                                style={{width: "100%"}}
                                disabled={!props.first}
                                value={selectedPayloadType}
                                onChange={evt => setSelectedPayloadType(evt.target.value)}
                            >
                                {
                                    payloadtypesPerOS[os]?.map((opt) => (
                                        <MenuItem key={"step1" + opt} value={opt}>{opt}</MenuItem>
                                    ))
                                }
                            </Select>

                        </div>
                        <div style={{display: "flex"}}>
                            <MythicAgentSVGIcon payload_type={selectedPayloadType} style={{width: "80px", padding: "5px", objectFit: "unset"}} />
                            <Typography variant="body2" component="p" style={{whiteSpace: "pre-wrap"}}>
                                <b>Version: </b>{payloadtypeData[selectedPayloadType]?.semver}<br/>
                                <b>Description: </b>{payloadtypeData[selectedPayloadType]?.note}<br/>
                                <b>C2: </b>{payloadtypeData[selectedPayloadType]?.payloadtypec2profiles.map(c => c.c2profile.name).join(", ")}
                            </Typography>
                        </div>

                    </div>
                </div>

                {/* Bottom section - scrollable table area */}
                <div style={{
                    margin: "5px",
                    border: props.first ? "1px solid grey" : '',
                    borderRadius: "5px",
                    padding: "10px 5px 5px 10px",
                    display: "flex",
                    flexDirection: "column",
                    flexGrow: 1,
                    minHeight: 0, // Important for flex shrinking
                    overflow: "hidden"
                }}>
                    {props.first &&
                        <div style={{flexGrow: 1, overflowY: "auto", position: "relative"}}>
                            {openBackdrop &&
                                <Backdrop open={openBackdrop} onClick={()=>{setOpenBackdrop(false);}} style={{zIndex: 2000, position: "absolute"}}>
                                    <CircularProgress color="inherit" disableShrink  />
                                </Backdrop>
                            }
                            <StartFromExistingPayloadOrStartFresh first={props.first}
                                                                  last={props.last}
                                                                  canceled={canceled}
                                                                  onSelectedPayload={onSelectedPayload}
                                                                  payloadOptions={payloadOptions}
                                                                  onStartFresh={onStartFresh}
                            />
                        </div>

                    }
                    {!props.first &&
                        <ConfigureBuildParameters os={os} selectedPayloadType={selectedPayloadType}
                                                  prevData={props.prevData}
                                                  onUpdatePayloadConfig={onUpdatePayloadConfig} />
                    }
                </div>
            </div>

            {/* Navigation buttons - always at bottom */}
            <div style={{flexShrink: 0}}>
                <CreatePayloadNavigationButtons
                    first={props.first}
                    last={props.last}
                    canceled={canceled}
                    finished={finished}
                />
                <br/><br/>
            </div>
        </div>
    );
}

export const StartFromExistingPayloadOrStartFresh = (
    {first, last, canceled, onSelectedPayload, payloadOptions, onStartFresh}
) => {
    return (
        <>
            {/* Header section - fixed */}
            <div style={{flexShrink: 0}}>
                <Typography variant={"p"} style={{fontWeight: 600}}>
                    3. Continue from Existing Payload or
                    <Button size="small" color={"primary"} variant={"contained"} style={{marginLeft: "10px", color: "white", marginBottom: "5px"}}
                            onClick={onStartFresh}
                            startIcon={<AddCircleIcon color={"success"} style={{backgroundColor: "white", borderRadius: "10px"}}/>} >
                        Start Fresh
                    </Button>
                </Typography>

            </div>

            {/* Scrollable table container */}
            <div style={{
                flexGrow: 1,
                overflow: "auto",
                minHeight: 0 // Important for flex shrinking
            }}>
                <PayloadSelect
                    payloadOptions={payloadOptions}
                    first={first}
                    last={last}
                    canceled={canceled}
                    finished={onSelectedPayload}
                />
            </div>
        </>
    )
}
export const ConfigureBuildParameters = (
    {os, onUpdatePayloadConfig, selectedPayloadType, prevData}
) => {
    const [payloadTypeConfigPieces, setPayloadTypeConfigPieces] = React.useState({});
    const [payloadTypeParameters, setSelectedPayloadTypeParameters] = React.useState([]);
    const getPayloadTypeBuildParameters = useMythicLazyQuery(GetBuildParametersQuery, {fetchPolicy: "network-only"});
    const onChange = (name, value, error) => {
        const newParams = payloadTypeParameters.map( (param) => {
            if(param.name === name){
                return {...param, value, error}
            }
            return {...param};
        });
        setSelectedPayloadTypeParameters(newParams);
        onUpdatePayloadConfig({
            "payload_type": selectedPayloadType,
            "parameters": newParams,
            ...payloadTypeConfigPieces,
            "os": os});
    }
    React.useEffect( () => {
        if(selectedPayloadType === ""){return}
        getPayloadTypeBuildParameters({variables: {payloadtype: selectedPayloadType}})
            .then(({data}) => {
                if(data.payloadtype.length === 0){
                    return
                }
                let extraConfig = {
                    "file_extension": data.payloadtype[0].file_extension,
                    "agent_type": data.payloadtype[0].agent_type,
                    "supports_dynamic_loading": data.payloadtype[0].supports_dynamic_loading,
                    "description": data.payloadtype[0].note,
                    "supports_multiple_c2_in_build": data.payloadtype[0].supports_multiple_c2_in_build,
                    "supports_multiple_c2_instances_in_build": data.payloadtype[0].supports_multiple_c2_instances_in_build,
                    "c2_parameter_deviations": data.payloadtype[0].c2_parameter_deviations,
                    "payload": prevData?.payload,
                    "payload_type_id": data.payloadtype[0].id,
                }
                setPayloadTypeConfigPieces(extraConfig);
                if (prevData) {
                    const params = data.payloadtype[0].buildparameters.map((param) => {
                        for (let p = 0; p < prevData.parameters.length; p++) {
                            if (prevData.parameters[p]["name"] === param.name) {
                                return {
                                    ...param, error: false,
                                    value: prevData.parameters[p]["value"],
                                    trackedValue: prevData.parameters[p]["value"],
                                    initialValue: getDefaultValueForType(param),
                                    choices: getDefaultChoices(param)
                                }
                            }
                        }
                        const initialValue = getDefaultValueForType(param);
                        return {
                            ...param, error: false,
                            value: initialValue,
                            trackedValue: initialValue,
                            initialValue: initialValue,
                            choices: getDefaultChoices(param)
                        }
                    });
                    //params.sort((a, b) => -b.description.localeCompare(a.description));
                    params.sort(sortByUiPositionThenName);
                    setSelectedPayloadTypeParameters(params);
                    onUpdatePayloadConfig({
                        "payload_type": selectedPayloadType,
                        "parameters": prevData.parameters,
                        ...extraConfig,
                        "os": os
                    });
                    return;
                }
                const params = data.payloadtype[0].buildparameters.map((param) => {
                    const initialValue = getDefaultValueForType(param);
                    return {
                        ...param,
                        error: false,
                        default_value:initialValue,
                        value: initialValue,
                        trackedValue: initialValue,
                        initialValue: initialValue,
                        choices: getDefaultChoices(param)
                    }
                });
                //params.sort((a,b) => -b.description.localeCompare(a.description));
                params.sort(sortByUiPositionThenName);
                setSelectedPayloadTypeParameters(params);
                onUpdatePayloadConfig({
                    "payload_type": selectedPayloadType,
                    "parameters": params,
                    ...extraConfig,
                    "os": os});
            })
            .catch((data) => console.log(data));
    }, [selectedPayloadType, prevData?.payload]);
    return (
        <>
            {/* Header section - fixed */}
            <div style={{flexShrink: 0}}>
                <Typography variant={"p"} style={{fontWeight: 600}}>
                    3.5. Configure Payload Build Parameters
                </Typography>
            </div>
            <div style={{
                flexGrow: 1,
                overflow: "auto",
                display: "flex",
                flexDirection: "row",
                minHeight: 0 // Important for flex shrinking
            }}>
                <div style={{
                    width: "30%",
                    margin: "5px",
                    border: "1px solid grey",
                    borderRadius: "5px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    flexGrow: 1,
                    minHeight: 0, // Important for flex shrinking
                    overflow: "auto"
                }}>
                    <Typography textAlign="center" variant={"h7"} style={{fontWeight: 600, width: "100%"}}>
                        Configuration Summary
                    </Typography>
                    <ConfigurationSummary buildParameters={payloadTypeParameters} os={os} />
                </div>
                <div style={{
                    width: "100%",
                    margin: "5px",
                    border: "1px solid grey",
                    borderRadius: "5px",
                    padding: "0px",
                    display: "flex",
                    flexDirection: "column",
                    flexGrow: 1,
                    minHeight: 0, // Important for flex shrinking
                    overflow: "hidden"
                }}>
                    <CreatePayloadBuildParametersTable onChange={onChange} buildParameters={payloadTypeParameters} os={os}
                    payload_type={selectedPayloadType}/>
                </div>
            </div>
        </>
    )
}
export const sortByUiPositionThenName = (a, b) => {
    if(a.ui_position === b.ui_position){
        return -b.name.localeCompare(a.name);
    }else if(a.ui_position < b.ui_position){
        return -1;
    }else if(a.ui_position > b.ui_position){
        return 1;
    }
    return 0;
}
const HideConditionOperandEQ                  = "eq"
const HideConditionOperandNotEQ                                   = "neq"
const HideConditionOperandIN                                      = "in"
const HideConditionOperandNotIN                                   = "nin"
const HideConditionOperandLessThan                                = "lt"
const HideConditionOperandGreaterThan                             = "gt"
const HideConditionOperandLessThanOrEqual                         = "lte"
const HideConditionOperandGreaterThanOrEqual                      = "gte"
const HideConditionOperationStartsWith                            = "sw"
const HideConditionOperationEndsWith                              = "ew"
const HideConditionOperationContains                              = "co"
const HideConditionOperationNotContains                           = "nco"
export const GetGroupedParameters = ({buildParameters, os, c2_name}) => {
    let groups = buildParameters?.reduce( (prev, cur) => {
        if(prev.includes(cur?.group_name)){return [...prev]}
        return [...prev, cur.group_name];
    }, []);
    let groupedData = groups.map(g => {
        return {name: g, parameters: []}
    });
    if(c2_name){
        buildParameters.sort(sortByUiPositionThenName);
        return [{name: c2_name, parameters: buildParameters}];
    }
    for(let i = 0; i < buildParameters.length; i++){
        for(let j = 0; j < groupedData.length; j++){
            if(buildParameters[i].group_name === groupedData[j].name){
                // only add the parameter if it doesn't meet a hide_condition
                let should_hide = false;
                if((buildParameters[i]?.supported_os?.length || 0) > 0){
                    if(!buildParameters[i]?.supported_os?.includes(os)){
                        should_hide = true;
                    }
                }
                for(let k = 0; k < buildParameters[i]?.hide_conditions?.length || 0; k++){
                    for(let l = 0; l < buildParameters.length; l++){
                        if(buildParameters[l].name === buildParameters[i].hide_conditions[k].name){
                            switch(buildParameters[i].hide_conditions[k].operand){
                                case HideConditionOperandEQ:
                                    if(String(buildParameters[i].hide_conditions[k].value) === String(buildParameters[l].value)){
                                        should_hide = true;
                                    }
                                    break;
                                case HideConditionOperandNotEQ:
                                    if(String(buildParameters[i].hide_conditions[k].value) !== String(buildParameters[l].value)){
                                        should_hide = true;
                                    }
                                    break;
                                case HideConditionOperandIN:
                                    if(buildParameters[i].hide_conditions[k].choices.includes(buildParameters[l].value)){
                                        should_hide = true;
                                    }
                                    break;
                                case HideConditionOperandNotIN:
                                    if(!buildParameters[i].hide_conditions[k].choices.includes(buildParameters[l].value)){
                                        should_hide = true;
                                    }
                                    break;
                                case HideConditionOperandLessThan:
                                    try{
                                        if(parseInt(buildParameters[l].value) < parseInt(buildParameters[i].hide_conditions[k].value)){
                                            should_hide = true;
                                        }
                                    }catch(e){
                                        console.log("couldn't parse build parameter value as int", e);
                                    }

                                    break;
                                case HideConditionOperandLessThanOrEqual:
                                    try{
                                        if(parseInt(buildParameters[l].value) <= parseInt(buildParameters[i].hide_conditions[k].value)){
                                            should_hide = true;
                                        }
                                    }catch(e){
                                        console.log("couldn't parse build parameter value as int", e);
                                    }
                                    break;
                                case HideConditionOperandGreaterThan:
                                    try{
                                        if(parseInt(buildParameters[l].value) > parseInt(buildParameters[i].hide_conditions[k].value) ){
                                            should_hide = true;
                                        }
                                    }catch(e){
                                        console.log("couldn't parse build parameter value as int", e);
                                    }
                                    break;
                                case HideConditionOperandGreaterThanOrEqual:
                                    try{
                                        if(parseInt(buildParameters[l].value) >= parseInt(buildParameters[i].hide_conditions[k].value)){
                                            should_hide = true;
                                        }
                                    }catch(e){
                                        console.log("couldn't parse build parameter value as int", e);
                                    }
                                    break;
                                case HideConditionOperationStartsWith:
                                    if(String(buildParameters[l].value).startsWith(String(buildParameters[i].hide_conditions[k].value))){
                                        should_hide = true;
                                    }
                                    break;
                                case HideConditionOperationEndsWith:
                                    if(String(buildParameters[l].value).endsWith(String(buildParameters[i].hide_conditions[k].value))){
                                        should_hide = true;
                                    }
                                    break;
                                case HideConditionOperationContains:
                                    if(buildParameters[l].value.includes(buildParameters[i].hide_conditions[k].value)){
                                        should_hide = true;
                                    }
                                    break;
                                case HideConditionOperationNotContains:
                                    if(!buildParameters[l].value.includes(buildParameters[i].hide_conditions[k].value)){
                                        should_hide = true;
                                    }
                                    break;
                            }
                        }
                    }
                }
                if(should_hide){
                    break;
                }
                groupedData[j].parameters.push(buildParameters[i]);
                groupedData[j].parameters.sort(sortByUiPositionThenName);
                break;
            }
        }
    }
    groupedData.sort(sortByUiPositionThenName)
    //groupedData.sort((a,b) => -b.name.localeCompare(a.name));
    return groupedData;
}
export const ConfigurationSummary = ({buildParameters, os, c2_name}) => {
    const theme = useTheme();
    const [groupedParameters, setGroupedParameters] = React.useState([]);
    React.useEffect( () => {
        // grouped should be array of groupName
        setGroupedParameters(GetGroupedParameters({buildParameters, os, c2_name}));
    }, [buildParameters, c2_name]);
    return (
        groupedParameters?.map((b,i) => (
            <div key={b.name} >
                {b.name !== '' && b.name !== undefined && b.parameters.length > 0 &&
                    <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", }} variant={"elevation"}>
                        <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                            {b.name}
                        </Typography>
                    </Paper>
                }
                {b?.parameters?.map( (p,i) => (
                    <div key={p.name} style={{marginLeft: b.name === '' ? '' : "20px"}} className={i%2 > 0 ? 'alternateRow' : ''}>
                        <Typography style={{fontWeight: 600}} variant={"body2"}>
                            {p.name}
                        </Typography>
                        <div style={{marginLeft: "20px", marginTop: "5px", marginBottom: "5px", whiteSpace: "pre"}}>
                            <ParseForDisplay cmd={p} />
                        </div>
                    </div>
                ))}
            </div>
        ))
    )
}