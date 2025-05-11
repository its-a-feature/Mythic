import React, {useState} from 'react';
import {Button, Typography} from '@mui/material';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useLazyQuery, useMutation} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import {CreatePayloadC2ProfileParametersTable} from '../CreatePayload/CreatePayloadC2ProfileParametersTable';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import {useTheme} from '@mui/material/styles';
import { snackActions } from '../../utilities/Snackbar';
import {getDefaultValueForType, getDefaultChoices} from '../CreatePayload/Step2SelectPayloadType';
import {UploadTaskFile} from "../../MythicComponents/MythicFileUpload";
import IosShareIcon from '@mui/icons-material/IosShare';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import DeleteIcon from '@mui/icons-material/Delete';

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
    }
    c2profileparametersinstances(where: {instance_name: {_is_null: false}}, distinct_on: instance_name, order_by: {instance_name: asc}){
      instance_name
      id
    }
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
    }
    id
    value
  }
}
`;
const deleteInstanceMutation = gql`
mutation deleteSavedInstance($name: String!, $c2_profile_id: Int!){
  delete_c2profileparametersinstance(where: {instance_name: {_eq: $name}, c2_profile_id: {_eq: $c2_profile_id}}){
    affected_rows
  }
}
`;
const createInstanceMutation = gql`
mutation createNewC2Instance($instance_name: String!, $c2_instance: String!, $c2profile_id: Int!){
  create_c2_instance(c2_instance: $c2_instance, instance_name: $instance_name, c2profile_id: $c2profile_id){
    status
    error
  }
}
`;
const importInstanceMutation = gql`
mutation importNewC2Instance($c2_instance: jsonb!, $instance_name: String!, $c2profile_name: String!){
import_c2_instance(
    c2_instance: $c2_instance,
    instance_name: $instance_name
    c2profile_name: $c2profile_name
  ){
    status
    error
  }
}
`;

export function C2ProfileSavedInstancesDialog(props) {
    const theme = useTheme();
    const [instanceName, setInstanceName] = useState("");
    const [selectedInstance, setSelectedInstance] = useState("");
    const [createdInstances, setCreatedInstances] = useState([]);
    const [baseParameters, setBaseParameters] = useState([]);
    const [currentParameters, setCurrentParameters] = useState([]);
    const { loading } = useQuery(getProfileConfigQuery, {
        variables: {id: props.id},
        onCompleted: data => {
            const parameters = data.c2profile_by_pk.c2profileparameters.map( (param) => {
              const initialValue = getDefaultValueForType(param);
              return {...param, error: false, value: initialValue, 
                  trackedValue: initialValue, 
                  initialValue: initialValue, 
                  choices: getDefaultChoices(param)};
            });
          parameters.sort((a,b) => -b.description.localeCompare(a.description));
          setBaseParameters([...parameters]);
          setCurrentParameters([...parameters]);
          setCreatedInstances(data.c2profile_by_pk.c2profileparametersinstances);
        },
        onError: data => {
          console.log(data);
        },
        fetchPolicy: "network-only"
    });
    const [getInstanceValues] = useLazyQuery(getProfileInstanceQuery, {
      onCompleted: (data) => {
          try{
              const updates = data.c2profileparametersinstance.map( (cur) => {
                  let inst = {...cur, ...cur.c2profileparameter};
                  if(inst.parameter_type === "Array" || inst.parameter_type === "ChooseMultiple" || inst.parameter_type === "FileMultiple"){
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
                      inst["choices"] = getDefaultChoices(inst);
                      inst["initialValue"] = getDefaultValueForType(inst);
                  } else if(inst.parameter_type === "Dictionary") {
                      //
                      let defaultValue = getDefaultValueForType(inst);
                      let finalDict = JSON.parse(inst["value"]); // this is a dictionary instead of an array, so fix it back
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
                  } else {
                      inst["choices"] = getDefaultChoices(inst);
                      inst["trackedValue"] = inst["value"];
                      inst["initialValue"] = getDefaultValueForType(inst);
                  }
                  return inst;
              })
              updates.sort( (a, b) => a.description < b.description ? -1 : 1);
              //console.log(updates);
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
    const [deleteInstance] = useMutation(deleteInstanceMutation, {
      onCompleted: (data) => {
        setSelectedInstance("")
        setInstanceName("");
        setCurrentParameters([...baseParameters]);
        const updatedInstances = createdInstances.filter( (cur) => cur.instance_name !== selectedInstance);
        setCreatedInstances(updatedInstances);
        snackActions.success("Sucessfully deleted instance");
      },
      onError: (data) => {
        snackActions.error("Failed to delete instance: " + data);
      }
    });
    const [createInstance] = useMutation(createInstanceMutation, {
      onCompleted: (data) => {
        if(data.create_c2_instance.status === "success"){
          snackActions.success("Successfully created instance");
        }else{
          snackActions.error("Failed to create instance: " + data.create_c2_instance.error);
        }
        props.onClose();
        
      },
      onError: (data) => {
        snackActions.error("Failed to create instance: " + data);
      }
    });
    const [importInstance] = useMutation(importInstanceMutation, {
        onCompleted: (data) => {
            if(data.import_c2_instance.status === "success"){
                snackActions.success("Successfully imported instance")
            } else {
                snackActions.error(data.import_c2_instance.error);
            }
        },
        onError: (error) => {
            snackActions.error("Failed to import file")
            console.log(error)
        }
    })
    if (loading) {
     return <LinearProgress />;
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
                    const newUUID = await UploadTaskFile(param.value, "Uploaded as c2 parameter for saved C2 Parameter Instance '" + instanceName + "'");
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
                        const newUUID = await UploadTaskFile(param.value[j], "Uploaded as c2 parameter for saved C2 Parameter Instance '" + instanceName + "'");
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
        createInstance({variables: {instance_name: instanceName, c2profile_id: props.id, c2_instance: JSON.stringify(instanceParam)}});
    }
    const onChange = (name, value, error) => {
      setInstanceName(value);
    }
    const updateC2Parameter = (c2Name, parameterName, value, error) => {
      const c2params = currentParameters.map( (param) => {
        if (param.name === parameterName){
            return {...param, error, value}
        }
        return param;
      });
      //console.log(c2params);
      setCurrentParameters(c2params);
    }
    const onChangeCreatedInstanceName = (evt) => {
      setSelectedInstance(evt.target.value);
      setInstanceName(evt.target.value);
      if(evt.target.value === ""){
        setCurrentParameters([...baseParameters]);
      }else{
        setCurrentParameters([]);
        getInstanceValues({variables: {name: evt.target.value, c2_profile_id: props.id}});
      }
    }
    const deleteInstanceButton = () => {
      setCurrentParameters([]);
      deleteInstance({variables: {name: selectedInstance, c2_profile_id: props.id}})
    }
    const exportInstanceButton = () => {
        let configuration = {
            c2profile_name: props.name,
            c2_instance: {},
            instance_name: instanceName
        };
        configuration.c2_instance = currentParameters.reduce( (prev, cur) => {
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
                importInstance({variables: {
                        c2_instance: data["c2_instance"],
                        instance_name: data["instance_name"],
                        c2profile_name: data["c2profile_name"]
                    }});
            }catch(error){
                console.log(error);
                snackActions.error("Failed to import file");
            }
        }
        reader.readAsBinaryString(evt.target.files[0]);
    }
  return (
      <React.Fragment>
          <DialogTitle id="form-dialog-title">Save an Instance of {props.name}'s Parameters</DialogTitle>
          <DialogContent dividers={true}>
            <Typography style={{paddingBottom: "10px"}}>
              Saving an instance of the parameters allows you to select them from a dropdown when creating agents later, saving time and typos.
            </Typography>
              {createdInstances.length > 0 ? (
                <Grid container spacing={2} style={{paddingTop: "10px"}}>
                  <Grid size={6}>
                    <FormControl style={{width: "100%"}}>
                    <InputLabel >Select an Existing Instance</InputLabel>
                        <Select
                          style={{width: "100%", marginBottom: "10px"}}
                          value={selectedInstance}
                          label="Select an Existing Instance"
                          onChange={onChangeCreatedInstanceName}
                        >
                          <MenuItem value="">New Instance</MenuItem>
                        {
                            createdInstances.map((opt, i) => (
                                <MenuItem key={"buildparamopt" + i} value={opt.instance_name}>{opt.instance_name}</MenuItem>
                            ))
                        }
                        </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={6}>
                    {selectedInstance.length > 0 ? (
                        <>
                            <Button style={{backgroundColor: theme.palette.error.main, color: "white", marginRight: "10px"}} variant="contained" onClick={deleteInstanceButton}>
                                <DeleteIcon style={{marginRight: "5px"}} /> Delete</Button>
                            <Button style={{backgroundColor: theme.palette.success.main, color: "white"}} variant="contained" onClick={exportInstanceButton}>
                                <IosShareIcon style={{marginRight: "5px"}} /> Export</Button>
                        </>
                      ) : null}
                      <Button style={{backgroundColor: theme.palette.warning.main, color: "white", marginLeft: "10px"}} component="label" variant="contained">
                          <SystemUpdateAltIcon style={{marginRight: "5px"}} />Import
                          <input onChange={onFileChange} type="file" hidden />
                      </Button>
                  </Grid>
              </Grid>
              ) : null}
              <MythicTextField name="Instance Name" onChange={onChange} value={instanceName} width={createdInstances.length === 0 ? 20 : undefined}
                               style={{paddingTop: "10px"}}
                               inline={createdInstances.length === 0}/>
              {createdInstances.length === 0 &&
                  <>
                      <Button style={{backgroundColor: theme.palette.warning.main, color: "white", marginLeft: "10px",  marginTop: "20px"}} component="label" variant="contained">
                          <SystemUpdateAltIcon style={{marginRight: "5px"}} />Import
                          <input onChange={onFileChange} type="file" hidden />
                      </Button>
                  </>
              }
              <CreatePayloadC2ProfileParametersTable {...props} returnAllDictValues={true} c2profileparameters={currentParameters} onChange={updateC2Parameter} />
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={props.onClose} color="primary">
              Close
            </Button>
            <Button variant="contained" onClick={onConfigSubmit} color="success">
              {selectedInstance.length > 0 ? (selectedInstance !== instanceName ? "Create": "Update") : ("Create")}
            </Button>
          </DialogActions>
      </React.Fragment>
  );
}

