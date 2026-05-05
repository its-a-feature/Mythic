import React from 'react';
import {useQuery, gql} from '@apollo/client';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import {snackActions} from '../../utilities/Snackbar';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import {getDefaultChoices, getDefaultValueForType, getSavedToType} from "../CreatePayload/Step2SelectPayloadType";
import { Backdrop } from '@mui/material';
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import {MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";
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
        <div className="mythic-create-flow-shell">
            <div className="mythic-create-flow-content">
                <div className="mythic-create-selection-grid">
                    <section className="mythic-create-section">
                        <div className="mythic-create-section-header">
                            <div>
                                <Typography component="div" className="mythic-create-section-title">
                                    Select operating system
                                </Typography>
                                <Typography component="div" className="mythic-create-section-description">
                                    Filter wrapper types by the target platform.
                                </Typography>
                            </div>
                        </div>
                        <Select
                            className="mythic-create-select"
                            value={os}
                            disabled={!props.first}
                            onChange={onChangeOS}
                        >
                            {
                                osOptions.map((opt) => (
                                    <MenuItem key={"step1" + opt} value={opt}>{opt}</MenuItem>
                                ))
                            }
                        </Select>
                        <div>
                            <span className="mythic-create-meta-label">Compatible wrapper types</span>
                            <div className="mythic-create-meta-value">{payloadtypesPerOS[os]?.join(", ")}</div>
                        </div>
                    </section>
                    <section className="mythic-create-section">
                        <div className="mythic-create-section-header">
                            <div>
                                <Typography component="div" className="mythic-create-section-title">
                                    Select wrapper type
                                </Typography>
                                <Typography component="div" className="mythic-create-section-description">
                                    Choose the wrapper family to configure for this build.
                                </Typography>
                            </div>
                        </div>
                        <Select
                            className="mythic-create-select"
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
                        <div className="mythic-create-agent-summary">
                            <div className="mythic-create-agent-icon">
                                <MythicAgentSVGIcon payload_type={selectedPayloadType} style={{width: "100%", height: "100%", objectFit: "contain"}} />
                            </div>
                            <div className="mythic-create-meta-list">
                                <div>
                                    <span className="mythic-create-meta-label">Version</span>
                                    <div className="mythic-create-meta-value">{payloadtypeData[selectedPayloadType]?.semver || "Unknown"}</div>
                                </div>
                                <div>
                                    <span className="mythic-create-meta-label">Description</span>
                                    <div className="mythic-create-meta-value">{payloadtypeData[selectedPayloadType]?.note || "No description available."}</div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
                <section className="mythic-create-section mythic-create-section-fill">
                    {props.first ? (
                        <div style={{display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0, overflow: "hidden", position: "relative"}}>
                            {openBackdrop &&
                                <Backdrop open={openBackdrop} onClick={()=>{setOpenBackdrop(false);}} style={{zIndex: 2000, position: "absolute"}}>
                                    <MythicLoadingState compact title="Loading payloads" description="Fetching compatible payloads." sx={{color: "inherit"}} />
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
                    ) : (
                        <ConfigureBuildParameters os={os} selectedPayloadType={selectedPayloadType}
                                                  prevData={props.prevData}
                                                  onUpdatePayloadConfig={onUpdatePayloadConfig} />
                    )}
                </section>
            </div>

            <div className="mythic-create-flow-footer">
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
