import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import LinearProgress from '@mui/material/LinearProgress';
import { getDefaultChoices } from '../CreatePayload/Step2SelectPayloadType';
import { getDefaultValueForType } from '../CreatePayload/Step2SelectPayloadType';

const GET_C2_Details = gql`
query GetPC2Details($payload_name: String!) {
  c2profile(where: {name: {_eq: $payload_name}}) {
    c2profileparameters(where: {deleted: {_eq: false}}) {
      default_value
      description
      format_string
      name
      parameter_type
      id
      randomize
      required
      verifier_regex
      choices
    }
  }
}
`;

export function C2ProfileBuildDialog(props) {
    const [buildParams, setBuildParams] = useState([]);
    const { loading, error } = useQuery(GET_C2_Details, {
        variables: {payload_name: props.container_name},
        onCompleted: data => {
            const buildParams = data.c2profile[0].c2profileparameters.map((param) => {
              let choices = getDefaultChoices(param);
              if(choices.length > 0){
                if(param.parameter_type === "Dictionary"){
                  choices = choices.reduce( (prev, cur) => {
                    return {...prev, [cur.name]: cur.default_value};
                  }, {});
                  choices = JSON.stringify(choices, null, 2);
                } else {
                  choices = choices.join(", ")
                }
                
              } else {
                choices = "";
              }
              let default_value = getDefaultValueForType(param);
              if(param.parameter_type === "Array" || param.parameter_type === "ChooseMultiple"){
                default_value = default_value.join(", ")
              } else if(param.parameter_type === "Boolean") {
                  default_value = default_value ? "True" : "False"
              } else if(param.parameter_type === "File") {
                  default_value = "";
              } else if(param.parameter_type === "Dictionary"){
                let defaultChoices = getDefaultChoices(param);
                defaultChoices = defaultChoices.reduce( (prev, cur) => {
                  if(cur.default_show){
                    return {...prev, [cur.name]: cur.default_value};
                  }else{
                    return {...prev};
                  }
                }, {});
                default_value = JSON.stringify(defaultChoices, null, 2);
              }
              return {...param, choices: choices, default_value: default_value}
            });
            setBuildParams(buildParams);
        }
        });
    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error! {error.message}</div>;
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.container_name}'s Build Parameters</DialogTitle>
        <DialogContent dividers={true}>
          <DialogContentText>
            These are the build parameters associated with this payload
          </DialogContentText>
            <Table size="small" aria-label="details" style={{"tableLayout": "fixed", "overflowWrap": "break-word"}}>
                <TableHead>
                  <TableRow>
                    <TableCell style={{width: "20%"}}>Parameter</TableCell>
                    <TableCell>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {
                    buildParams.map( (param) => (
                        <TableRow key={"buildprop" + param.id} hover>
                            <TableCell>{param.description}</TableCell>
                            <TableCell>
                            <b>Scripting/Building Name: </b><pre style={{display: "inline-block", whiteSpace: "pre-wrap", margin: 0}}>{param.name}</pre><br/>
                            <b>Parameter Type: </b><pre style={{display: "inline-block", whiteSpace: "pre-wrap", margin: 0}}>{param.parameter_type}</pre><br/>
                            <b>Default Value: </b><pre style={{display: "inline-block", whiteSpace: "pre-wrap", margin: 0}}>{param.default_value}</pre><br/>
                            {param.choices.length > 0 ? (
                              <React.Fragment>
                                <b>Parameter Options: </b><pre style={{display: "inline-block", whiteSpace: "pre-wrap", margin: 0}}>{param.choices}</pre><br/>
                              </React.Fragment>
                            ) : null}
                            <b>Required? </b><pre style={{display: "inline-block", whiteSpace: "pre-wrap", margin: 0}}>{param.required ? "Yes": "No"}</pre><br/>
                            <b>Verifier Regex: </b><pre style={{display: "inline-block", whiteSpace: "pre-wrap", margin: 0}}>{param.verifier_regex}</pre><br/>
                            <b>Randomized: </b><pre style={{display: "inline-block", whiteSpace: "pre-wrap", margin: 0}}>{param.randomize ? "Yes": "No"}</pre><br/>
                            {param.randomize ? (
                              <React.Fragment>
                                <b>Format String: </b><pre style={{display: "inline-block", whiteSpace: "pre-wrap", margin: 0}}>{param.format_string}</pre><br/>
                              </React.Fragment>
                            ) : (null)}
                            </TableCell>
                        </TableRow>
                    ))
                    
                  }
                </TableBody>
              </Table>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

