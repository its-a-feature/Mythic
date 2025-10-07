import React from 'react';
import {useQuery, gql} from '@apollo/client';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import {snackActions} from '../../utilities/Snackbar';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import {getDefaultChoices, getDefaultValueForType, getSavedToType} from "../CreatePayload/Step2SelectPayloadType";
import { Backdrop, CircularProgress } from '@mui/material';
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import {
    ConfigureBuildParameters,
    GetPayloads,
    StartFromExistingPayloadOrStartFresh
} from "../CreatePayload/Step1SelectOS";


const GET_Payload_Types = gql`
query getPayloadTypesQuery {
  payloadtype(where: {deleted: {_eq: false}, wrapper: {_eq: true}}) {
    id
    supported_os
    name
    note
    semver
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
        }
    }
  }
}
 `;

export function Step1SelectOS(props){
    const [os, setOS] = React.useState('');
    const [openBackdrop, setOpenBackdrop] = React.useState(true);
    const [payloadtypeData, setPayloadtypeData] = React.useState({});
    const [payloadtypesPerOS, setPayloadtypesPerOS] = React.useState({});
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
                    setSelectedPayloadType(props.prevData.payload_type);
                }
                else if(os === "" && sortedOptions.length > 0){
                    setOS(sortedOptions[0]);
                    setSelectedPayloadType(payloadTypeOS[sortedOptions[0]][0]);
                } else if(sortedOptions.length === 0){
                    snackActions.error("No Payload Types installed");
                }
                setPayloadtypesPerOS(payloadTypeOS);
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
                params.sort((a, b) => -b.description.localeCompare(a.description));
                newConfig[1].parameters = params;
                newConfig[2] = data.payload_by_pk.payloadcommands.map( c => c.command.cmd);
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
