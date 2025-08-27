import React from 'react';
import {useQuery, gql} from '@apollo/client';
import CircularProgress from '@mui/material/CircularProgress';
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
import {getDefaultChoices, getDefaultValueForType} from "./Step2SelectPayloadType";
import {CreatePayloadBuildParametersTable} from "./CreatePayloadBuildParametersTable";


const GET_Payload_Types = gql`
query getPayloadTypesQuery {
  payloadtype(where: {deleted: {_eq: false}, wrapper: {_eq: false}, agent_type: {_in: ["agent", "service"]}}) {
    id
    supported_os
    name
    note
  }
}
 `;

const GetPayloads = gql`
query payloads($payloadType: String!, $os: String!) {
  payload(where: {auto_generated: {_eq: false}, os: {_eq: $os}, payloadtype: {name: {_eq: $payloadType}}, build_phase: {_eq: "success"}, deleted: {_eq: false}}, order_by: {id: desc}) {
      id
      description
      uuid
      creation_time
      filemetum {
        agent_file_id
        filename_text
        id
      }
  }
}
 `;

const GetBuildParametersQuery = gql`
query getPayloadTypesBuildParametersQuery($payloadtype: String!) {
  payloadtype(where: {name: {_eq: $payloadtype}}) {
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

export function Step1SelectOS(props){
    const [os, setOS] = React.useState('');
    const [payloadtypeData, setPayloadtypeData] = React.useState({});
    const [payloadtypesPerOS, setPayloadtypesPerOS] = React.useState({});
    const [osOptions, setOSOptions] = React.useState([]);
    const [selectedPayloadType, setSelectedPayloadType] = React.useState('');
    const [payloadOptions, setPayloadOptions] = React.useState([]);
    const [selectedPayload, setSelectedPayload] = React.useState('');
    const { loading } = useQuery(GET_Payload_Types, {fetchPolicy: "network-only",
    onCompleted: (data) => {
        let payloadTypeOS = {};
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
            setSelectedPayloadType(props.prevData.payloadtype);
        }
        else if(os === "" && sortedOptions.length > 0){
            setOS(sortedOptions[0]);
            setSelectedPayloadType(payloadTypeOS[sortedOptions[0]][0]);
        } else if(sortedOptions.length === 0){
            snackActions.error("No Payload Types installed");
        }
        setPayloadtypesPerOS(payloadTypeOS);
        setOSOptions(sortedOptions);
    },
    onError: (data) => {
        console.error(data);
        snackActions.error(data.message)
    }
    });
    const getPayloads = useMythicLazyQuery(GetPayloads, { fetchPolicy: "network-only",
    })
    React.useEffect( () => {
        getPayloads({variables: {payloadType: selectedPayloadType, os}})
            .then(({data}) => {
                setPayloadOptions(data.payload);
            })
            .catch(({data}) => console.log(data));
    }, [selectedPayloadType, os]);
    if (loading) {
     return <div><CircularProgress /></div>;
    }
    const finished = () => {
        if(props.first){
            props.finished({
                "os": os,
                "payloadtype": selectedPayloadType,
                "payload": selectedPayload === "" ? undefined : selectedPayload
            });
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
        setSelectedPayload(payload);
    }
    const onStartFresh = () => {
        finished()
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
                    <div style={{width: "100%", margin: "10px", border: "1px solid grey", borderRadius: "5px", padding: "10px"}}>
                        <Typography variant={"h6"} style={{fontWeight: 600}}>
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
                    </div>
                    <div style={{width: "100%", margin: "10px", border: "1px solid grey", borderRadius: "5px", padding: "10px"}}>
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
                                <b>Description: </b>{payloadtypeData[selectedPayloadType]?.note}
                            </Typography>
                        </div>

                    </div>
                </div>

                {/* Bottom section - scrollable table area */}
                <div style={{
                    margin: "10px",
                    border: "1px solid grey",
                    borderRadius: "5px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    flexGrow: 1,
                    minHeight: 0, // Important for flex shrinking
                    overflow: "hidden"
                }}>
                    {props.first &&
                        <StartFromExistingPayloadOrStartFresh first={props.first}
                                                              last={props.last}
                                                              canceled={canceled}
                                                              onSelectedPayload={onSelectedPayload}
                                                              payloadOptions={payloadOptions}
                                                              onStartFresh={onStartFresh}
                        />
                    }
                    {!props.first &&
                        <ConfigureBuildParameters os={os} selectedPayloadType={selectedPayloadType}
                                                  selectedPayload={selectedPayload}
                                                  finished={finished}
                                                  canceled={canceled} />
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

const StartFromExistingPayloadOrStartFresh = (
    {first, last, canceled, onSelectedPayload, payloadOptions, onStartFresh}
) => {
    return (
        <>
            {/* Header section - fixed */}
            <div style={{flexShrink: 0}}>
                <Typography variant={"h6"} style={{fontWeight: 600}}>
                    3. Start from Existing Payload or
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
const ConfigureBuildParameters = (
    {os, canceled, finished, selectedPayloadType, selectedPayload}
) => {
    const [fileExtension, setFileExtension] = React.useState('');
    const [supportsDynamicLoading, setSupportsDynamicLoading] = React.useState(false);
    const [agentType, setAgentType] = React.useState("agent");
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
    }
    React.useEffect( () => {
        getPayloadTypeBuildParameters({variables: {payloadtype: selectedPayloadType}})
            .then(({data}) => {
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
            })
            .catch(({data}) => console.log(data));
    }, [selectedPayloadType]);
    return (
        <>
            {/* Header section - fixed */}
            <div style={{flexShrink: 0}}>
                <Typography variant={"h6"} style={{fontWeight: 600}}>
                    4. Configure Payload Build Parameters
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
                    margin: "10px",
                    border: "1px solid grey",
                    borderRadius: "5px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    flexGrow: 1,
                    minHeight: 0, // Important for flex shrinking
                    overflow: "hidden"
                }}>
                    <Typography variant={"h7"} style={{fontWeight: 600}}>
                        Configuration Summary
                    </Typography>
                    <ConfigurationSummary buildParameters={payloadTypeParameters} />
                </div>
                <div style={{
                    width: "100%",
                    margin: "10px",
                    border: "1px solid grey",
                    borderRadius: "5px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    flexGrow: 1,
                    minHeight: 0, // Important for flex shrinking
                    overflow: "hidden"
                }}>
                    <CreatePayloadBuildParametersTable onChange={onChange} buildParameters={payloadTypeParameters} />
                </div>
            </div>
        </>
    )
}
const ConfigurationSummary = ({buildParameters}) => {
    const [buildSummary, setBuildSummary] = React.useState([]);
    React.useEffect( () => {
        const summaryData = buildParameters.map( b => {
            return {
                name: b.name,
                value: JSON.stringify(b.value),
            }
        });
        setBuildSummary(summaryData);
    }, [buildParameters]);
    return (
        buildSummary.map(b => (
            <div key={b.name}>
                <Typography style={{fontWeight: 600}}>
                    {b.name}
                </Typography>
                {b.value}
            </div>
        ))
    )
}