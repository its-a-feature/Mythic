import React, {useState} from 'react';
import {Button, Stack, Typography} from '@mui/material';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useLazyQuery, useMutation} from '@apollo/client';
import {CreatePayloadC2ProfileParametersTable} from '../CreatePayload/CreatePayloadC2ProfileParametersTable';
import {CreatePayloadBuildParametersTable} from '../CreatePayload/CreatePayloadBuildParametersTable';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import { snackActions } from '../../utilities/Snackbar';
import {getDefaultValueForType, getDefaultChoices} from '../CreatePayload/Step2SelectPayloadType';
import {UploadTaskFile} from "../../MythicComponents/MythicFileUpload";
import IosShareIcon from '@mui/icons-material/IosShare';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import {MythicDialogButton, MythicDialogFooter} from "../../MythicComponents/MythicDialogLayout";
import {MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";

const getProfileConfigQuery = gql`
query getProfileParameters($id: Int!) {
  c2profile_by_pk(id: $id) {
    c2profileparameters(where: {deleted: {_eq: false}}, order_by: {name: asc}){
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
      hide_conditions
      ui_position
    }
    c2profileparametersinstances(where: {instance_name: {_is_null: false}}, distinct_on: instance_name, order_by: {instance_name: asc}){
      instance_name
      id
    }
  }
}
`;
const getBuildParameterConfigQuery = gql`
query getBuildParameters($id: Int!) {
  payloadtype_by_pk(id: $id) {
    buildparameters(where: {deleted: {_eq: false}}, order_by: {name: asc}){
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
      crypto_type
      group_name
      supported_os
      hide_conditions
      ui_position
      dynamic_query_function
    }
  }
  buildparameterinstance(where: {instance_name: {_is_null: false}, buildparameter: {payload_type_id: {_eq: $id}}}, distinct_on: instance_name, order_by: {instance_name: asc}) {
    instance_name
    id
  }
}
`;
const getProfileInstanceQuery = gql`
query getProfileInstanceQuery($name: String!, $c2_profile_id: Int!) {
  c2profileparametersinstance(where: {instance_name: {_eq: $name}, c2_profile_id: {_eq: $c2_profile_id}}) {
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
      group_name
      hide_conditions
      ui_position
    }
    id
    value
  }
}
`;
const getBuildParameterInstanceQuery = gql`
query getBuildParameterInstanceQuery($name: String!, $payload_type_id: Int!) {
  buildparameterinstance(where: {instance_name: {_eq: $name}, buildparameter: {payload_type_id: {_eq: $payload_type_id}, deleted: {_eq: false}}}) {
    buildparameter {
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
      crypto_type
      group_name
      supported_os
      hide_conditions
      ui_position
      dynamic_query_function
    }
    id
    value
  }
}
`;
const deleteC2InstanceMutation = gql`
mutation deleteSavedC2Instance($name: String!, $c2_profile_id: Int!){
  delete_c2profileparametersinstance(where: {instance_name: {_eq: $name}, c2_profile_id: {_eq: $c2_profile_id}}){
    affected_rows
  }
}
`;
const deleteBuildParameterInstanceMutation = gql`
mutation deleteSavedBuildParameterInstance($name: String!, $payload_type_id: Int!){
  delete_buildparameterinstance(where: {instance_name: {_eq: $name}, buildparameter: {payload_type_id: {_eq: $payload_type_id}}}){
    affected_rows
  }
}
`;
const createC2InstanceMutation = gql`
mutation createNewC2Instance($instance_name: String!, $c2_instance: String!, $c2profile_id: Int!){
  createC2Instance(c2_instance: $c2_instance, instance_name: $instance_name, c2profile_id: $c2profile_id){
    status
    error
  }
}
`;
const createBuildParameterInstanceMutation = gql`
mutation createNewBuildParameterInstance($instance_name: String!, $build_parameter_instance: String!, $payload_type_id: Int!){
  createBuildParameterInstance(build_parameter_instance: $build_parameter_instance, instance_name: $instance_name, payload_type_id: $payload_type_id){
    status
    error
  }
}
`;
const importC2InstanceMutation = gql`
mutation importNewC2Instance($c2_instance: jsonb!, $instance_name: String!, $c2profile_name: String!){
  importC2Instance(
    c2_instance: $c2_instance,
    instance_name: $instance_name
    c2profile_name: $c2profile_name
  ){
    status
    error
  }
}
`;
const importBuildParameterInstanceMutation = gql`
mutation importNewBuildParameterInstance($build_parameter_instance: jsonb!, $instance_name: String!, $payload_type_name: String!){
  importBuildParameterInstance(
    build_parameter_instance: $build_parameter_instance,
    instance_name: $instance_name
    payload_type_name: $payload_type_name
  ){
    status
    error
  }
}
`;

const parseJSONValue = (value, fallback) => {
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
};

const parseBooleanValue = (value) => {
    if(typeof value === "boolean"){
        return value;
    }
    if(typeof value === "string"){
        return value.toLowerCase() === "true" || value.toLowerCase() === "t";
    }
    return Boolean(value);
};

const hydrateParameter = (instance, parameterKey) => {
    let inst = {...instance, ...instance[parameterKey]};
    if(inst.parameter_type === "Array" || inst.parameter_type === "TypedArray" ||
        inst.parameter_type === "ChooseMultiple" || inst.parameter_type === "FileMultiple"){
        const parsedValue = parseJSONValue(inst.value, inst.value);
        inst["value"] = parsedValue;
        inst["trackedValue"] = parsedValue;
        inst["choices"] = getDefaultChoices(inst);
        inst["initialValue"] = getDefaultValueForType(inst);
    } else if(inst.parameter_type === "Dictionary") {
        let defaultValue = getDefaultValueForType(inst);
        let finalDict = parseJSONValue(inst["value"], {});
        let finalDictKeys = Object.keys(finalDict);
        let finalArray = [];
        let choices = getDefaultChoices(inst);
        for (let i = 0; i < finalDictKeys.length; i++) {
            let newDict = {
                name: finalDictKeys[i],
                value: finalDict[finalDictKeys[i]],
                default_show: true
            };
            for (let j = 0; j < choices.length; j++) {
                if (choices[j].name === finalDictKeys[i]) {
                    newDict["default_value"] = choices[j]["default_value"]
                }
            }
            finalArray.push(newDict);
        }

        choices = choices.map(c => {
            return {...c, default_show: false}
        });
        return {
            ...inst,
            value: finalArray,
            choices: choices,
            trackedValue: finalArray,
            default_value: defaultValue,
            initialValue: defaultValue
        };
    } else if(inst.parameter_type === "File") {
        inst["choices"] = getDefaultChoices(inst);
        inst["trackedValue"] = {name: inst["value"], legacy: true};
        inst["initialValue"] = getDefaultValueForType(inst);
    } else if(inst.parameter_type === "Boolean") {
        inst["choices"] = getDefaultChoices(inst);
        inst["value"] = parseBooleanValue(inst["value"]);
        inst["trackedValue"] = inst["value"];
        inst["initialValue"] = getDefaultValueForType(inst);
    } else {
        inst["choices"] = getDefaultChoices(inst);
        inst["trackedValue"] = inst["value"];
        inst["initialValue"] = getDefaultValueForType(inst);
    }
    return inst;
};

const prepareBaseParameters = (parameters) => {
    const prepared = parameters.map( (param) => {
        const initialValue = getDefaultValueForType(param);
        return {...param, error: false, value: initialValue,
            trackedValue: initialValue,
            initialValue: initialValue,
            choices: getDefaultChoices(param)};
    });
    prepared.sort((a,b) => -b.description.localeCompare(a.description));
    return prepared;
};

export function SavedParameterInstancesDialog(props) {
    const isBuildParameterInstance = props.instanceType === "build";
    const [instanceName, setInstanceName] = useState("");
    const [selectedInstance, setSelectedInstance] = useState("");
    const [createdInstances, setCreatedInstances] = useState([]);
    const [baseParameters, setBaseParameters] = useState([]);
    const [currentParameters, setCurrentParameters] = useState([]);
    const labels = isBuildParameterInstance ? {
        title: `Save an Instance of ${props.name}'s Build Parameters`,
        loadingDescription: "Fetching saved build parameter sets.",
        helperText: "Saving an instance of the build parameters allows you to select them from a dropdown when creating agents later, saving time and typos.",
        uploadText: "Uploaded as build parameter for saved Build Parameter Instance",
        createError: "Failed to create build parameter instance: ",
        deleteSuccess: "Successfully deleted build parameter instance",
        importSuccess: "Successfully imported build parameter instance",
        exportProfileName: "payload_type_name",
        exportParametersName: "build_parameter_instance",
    } : {
        title: `Save an Instance of ${props.name}'s Parameters`,
        loadingDescription: "Fetching saved C2 profile parameter sets.",
        helperText: "Saving an instance of the parameters allows you to select them from a dropdown when creating agents later, saving time and typos.",
        uploadText: "Uploaded as c2 parameter for saved C2 Parameter Instance",
        createError: "Failed to create instance: ",
        deleteSuccess: "Successfully deleted instance",
        importSuccess: "Successfully imported instance",
        exportProfileName: "c2profile_name",
        exportParametersName: "c2_instance",
    };
    const { loading } = useQuery(isBuildParameterInstance ? getBuildParameterConfigQuery : getProfileConfigQuery, {
        variables: {id: props.id},
        onCompleted: data => {
            const parameters = prepareBaseParameters(isBuildParameterInstance ?
                data.payloadtype_by_pk.buildparameters :
                data.c2profile_by_pk.c2profileparameters);
            setBaseParameters([...parameters]);
            setCurrentParameters([...parameters]);
            setCreatedInstances(isBuildParameterInstance ?
                data.buildparameterinstance :
                data.c2profile_by_pk.c2profileparametersinstances);
        },
        onError: data => {
            console.log(data);
        },
        fetchPolicy: "network-only"
    });
    const [getInstanceValues] = useLazyQuery(isBuildParameterInstance ? getBuildParameterInstanceQuery : getProfileInstanceQuery, {
        onCompleted: (data) => {
            try{
                const rows = isBuildParameterInstance ? data.buildparameterinstance : data.c2profileparametersinstance;
                const parameterKey = isBuildParameterInstance ? "buildparameter" : "c2profileparameter";
                const updates = rows.map( (cur) => hydrateParameter(cur, parameterKey));
                updates.sort( (a, b) => a.description < b.description ? -1 : 1);
                setCurrentParameters(updates);
            }catch(error){
                console.log(error);
            }

        },
        onError: (data) => {
            snackActions.error("Failed to fetch instance data: " + data);
            console.log(data);
        },
        fetchPolicy: "no-cache"
    })
    const [deleteInstance] = useMutation(isBuildParameterInstance ? deleteBuildParameterInstanceMutation : deleteC2InstanceMutation, {
        onCompleted: () => {
            setSelectedInstance("")
            setInstanceName("");
            setCurrentParameters([...baseParameters]);
            const updatedInstances = createdInstances.filter( (cur) => cur.instance_name !== selectedInstance);
            setCreatedInstances(updatedInstances);
            snackActions.success(labels.deleteSuccess);
        },
        onError: (data) => {
            snackActions.error("Failed to delete instance: " + data);
        }
    });
    const [createInstance] = useMutation(isBuildParameterInstance ? createBuildParameterInstanceMutation : createC2InstanceMutation, {
        onCompleted: (data) => {
            const result = isBuildParameterInstance ? data.createBuildParameterInstance : data.createC2Instance;
            if(result.status === "success"){
                snackActions.success("Successfully created instance");
            }else{
                snackActions.error(labels.createError + result.error);
            }
            props.onClose();

        },
        onError: (data) => {
            snackActions.error(labels.createError + data);
        }
    });
    const [importInstance] = useMutation(isBuildParameterInstance ? importBuildParameterInstanceMutation : importC2InstanceMutation, {
        onCompleted: (data) => {
            const result = isBuildParameterInstance ? data.importBuildParameterInstance : data.importC2Instance;
            if(result.status === "success"){
                snackActions.success(labels.importSuccess)
            } else {
                snackActions.error(result.error);
            }
        },
        onError: (error) => {
            snackActions.error("Failed to import file")
            console.log(error)
        }
    })
    if (loading) {
     return (
       <>
         <DialogTitle id="form-dialog-title">{labels.title}</DialogTitle>
         <DialogContent dividers={true}>
           <MythicLoadingState title="Loading saved instances" description={labels.loadingDescription} minHeight={180} />
         </DialogContent>
       </>
     );
    }
    const onConfigSubmit = async () => {
        if(instanceName.length === 0){
            snackActions.warning("Must supply an instance name");
            return;
        }
        let instanceParam = {};
        for(let j = 0; j < currentParameters.length; j++){
            let param = currentParameters[j];
            if(param.parameter_type === "Dictionary"){
                const newDict = param.value.reduce( (prev, cur) => {
                    if(cur.default_show){
                        return {...prev, [cur.name]: cur.value};
                    }
                    return {...prev}
                }, {});
                instanceParam = {...instanceParam, [param.name]: newDict};
            } else if (param.parameter_type === "File") {
                if(typeof param.value === "string"){
                    instanceParam = {...instanceParam, [param.name]: param.value};
                } else {
                    const newUUID = await UploadTaskFile(param.value, `${labels.uploadText} '${instanceName}'`);
                    if (newUUID) {
                        if (newUUID !== "Missing file in form") {
                            instanceParam = {...instanceParam, [param.name]: newUUID};
                        }
                    } else {
                        snackActions.error("Failed to upload files")
                        return;
                    }
                }
            }else if(param.parameter_type === "FileMultiple"){
                let fileMultipleValues = [];
                for(let j = 0; j < param.value.length; j++){
                    if (typeof param.value[j] === "string") {
                        fileMultipleValues.push(param.value[j]);
                    } else {
                        const newUUID = await UploadTaskFile(param.value[j], `${labels.uploadText} '${instanceName}'`);
                        if (newUUID) {
                            if (newUUID !== "Missing file in form") {
                                fileMultipleValues.push(newUUID);
                            }
                        } else {
                            snackActions.error("Failed to upload files")
                            return;
                        }
                    }
                }
                instanceParam = {...instanceParam, [param.name]: fileMultipleValues};
            } else {
                instanceParam = {...instanceParam, [param.name]: param.value};
            }
        }
        if(isBuildParameterInstance){
            createInstance({variables: {instance_name: instanceName, payload_type_id: props.id,
                    build_parameter_instance: JSON.stringify(instanceParam)}});
        }else{
            createInstance({variables: {instance_name: instanceName, c2profile_id: props.id,
                    c2_instance: JSON.stringify(instanceParam)}});
        }
    }
    const onChange = (name, value) => {
        setInstanceName(value);
    }
    const updateParameter = (first, second, third, fourth) => {
        const parameterName = isBuildParameterInstance ? first : second;
        const value = isBuildParameterInstance ? second : third;
        const error = isBuildParameterInstance ? third : fourth;
        const updatedParams = currentParameters.map( (param) => {
            if (param.name === parameterName){
                return {...param, error, value, trackedValue: value}
            }
            return param;
        });
        setCurrentParameters(updatedParams);
    }
    const onChangeCreatedInstanceName = (evt) => {
        setSelectedInstance(evt.target.value);
        setInstanceName(evt.target.value);
        if(evt.target.value === ""){
            setCurrentParameters([...baseParameters]);
        }else{
            setCurrentParameters([]);
            if(isBuildParameterInstance){
                getInstanceValues({variables: {name: evt.target.value, payload_type_id: props.id}});
            }else{
                getInstanceValues({variables: {name: evt.target.value, c2_profile_id: props.id}});
            }
        }
    }
    const deleteInstanceButton = () => {
        setCurrentParameters([]);
        if(isBuildParameterInstance){
            deleteInstance({variables: {name: selectedInstance, payload_type_id: props.id}})
        }else{
            deleteInstance({variables: {name: selectedInstance, c2_profile_id: props.id}})
        }
    }
    const exportInstanceButton = () => {
        let configuration = {
            [labels.exportProfileName]: props.name,
            [labels.exportParametersName]: {},
            instance_name: instanceName
        };
        configuration[labels.exportParametersName] = currentParameters.reduce( (prev, cur) => {
            switch (cur.parameter_type) {
                case "Dictionary":
                    const condensed = cur.value.reduce( (p, c) => {
                        return {...p, [c.name]: c.value}
                    }, {});
                    return {...prev, [cur.name]: condensed};
                default:
                    return {...prev, [cur.name]:cur.value};
            }
        }, {});
        const dataBlob = new Blob([JSON.stringify(configuration, null, 2)], {type: 'text/plain'});
        const ele = document.getElementById("download_instance");
        if(ele !== null){
            ele.href = URL.createObjectURL(dataBlob);
            ele.download = instanceName +  ".json";
            ele.click();
        }else{
            const element = document.createElement("a");
            element.id = "download_instance";
            element.href = URL.createObjectURL(dataBlob);
            element.download = instanceName + ".json";
            document.body.appendChild(element);
            element.click();
        }
    }
    const onFileChange = (evt) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            snackActions.info("Uploading...");
            try{
                let data = JSON.parse(String(e.target.result));
                if(isBuildParameterInstance){
                    importInstance({variables: {
                            build_parameter_instance: data["build_parameter_instance"],
                            instance_name: data["instance_name"],
                            payload_type_name: data["payload_type_name"]
                        }});
                }else{
                    importInstance({variables: {
                            c2_instance: data["c2_instance"],
                            instance_name: data["instance_name"],
                            c2profile_name: data["c2profile_name"]
                        }});
                }
            }catch(error){
                console.log(error);
                snackActions.error("Failed to import file");
            }
        }
        reader.readAsBinaryString(evt.target.files[0]);
    }
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">{labels.title}</DialogTitle>
            <DialogContent dividers={true}>
                <Typography style={{paddingBottom: "10px"}}>
                    {labels.helperText}
                </Typography>
                <Grid container spacing={2} alignItems="flex-start" style={{paddingTop: "10px", paddingBottom: "10px"}}>
                    <Grid size={{xs: 12, md: 4}}>
                        <FormControl style={{width: "100%"}}>
                            <InputLabel>Select an Existing Instance</InputLabel>
                            <Select
                                style={{width: "100%"}}
                                value={selectedInstance}
                                label="Select an Existing Instance"
                                onChange={onChangeCreatedInstanceName}
                            >
                                <MenuItem value="">New Instance</MenuItem>
                                {
                                    createdInstances.map((opt, i) => (
                                        <MenuItem key={"savedparamopt" + i} value={opt.instance_name}>{opt.instance_name}</MenuItem>
                                    ))
                                }
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{xs: 12, md: 4}}>
                        <MythicTextField name="Instance Name" onChange={onChange} value={instanceName}
                                         marginTop="0px" marginBottom="0px"/>
                    </Grid>
                    <Grid size={{xs: 12, md: 4}}>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" style={{minHeight: "56px"}}>
                            <Button className="mythic-table-row-action mythic-table-row-action-hover-danger" disabled={selectedInstance.length === 0} startIcon={<DeleteIcon fontSize="small" />} variant="outlined" onClick={deleteInstanceButton}>
                                Delete</Button>
                            <Button className="mythic-table-row-action mythic-table-row-action-success" disabled={selectedInstance.length === 0} startIcon={<IosShareIcon fontSize="small" />} variant="outlined" onClick={exportInstanceButton}>
                                Export</Button>
                            <Button className="mythic-table-row-action mythic-table-row-action-hover-info" component="label" startIcon={<SystemUpdateAltIcon fontSize="small" />} variant="outlined">
                                Import
                                <input onChange={onFileChange} type="file" hidden />
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
                {isBuildParameterInstance ? (
                    <CreatePayloadBuildParametersTable
                        buildParameters={currentParameters}
                        payload_type={props.name}
                        os={props.selected_os || ""}
                        onChange={updateParameter}
                    />
                ) : (
                    <CreatePayloadC2ProfileParametersTable {...props} returnAllDictValues={true} c2_name={props.name} c2profileparameters={currentParameters} onChange={updateParameter} />
                )}
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={props.onClose}>
                    Close
                </MythicDialogButton>
                <MythicDialogButton intent="primary" onClick={onConfigSubmit}>
                    {selectedInstance.length > 0 ? (selectedInstance !== instanceName ? "Create": "Update") : ("Create")}
                </MythicDialogButton>
            </MythicDialogFooter>
        </React.Fragment>
    );
}

export function C2ProfileSavedInstancesDialog(props) {
    return <SavedParameterInstancesDialog {...props} instanceType="c2" />;
}

export function PayloadTypeBuildParameterInstancesDialog(props) {
    return <SavedParameterInstancesDialog {...props} instanceType="build" />;
}
