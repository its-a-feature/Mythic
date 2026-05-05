import React, {useState} from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import { getDefaultChoices } from '../CreatePayload/Step2SelectPayloadType';
import { getDefaultValueForType } from '../CreatePayload/Step2SelectPayloadType';
import {MythicDialogBody, MythicDialogButton, MythicDialogFooter, MythicDialogSection} from "../../MythicComponents/MythicDialogLayout";
import {MythicErrorState, MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";
import {BuildParameterList} from "./InstalledServiceParameterDetails";

const GET_Payload_Details = gql`
query GetPayloadDetails($payload_name: String!) {
  payloadtype(where: {name: {_eq: $payload_name}}) {
    buildparameters (where: {deleted: {_eq: false}}, order_by: {name: asc} ){
      description
      name
      id
      default_value
      parameter_type
      required
      verifier_regex
      choices
      crypto_type
      randomize
      format_string
    }
  }
}
`;

export function PayloadTypeBuildDialog(props) {
    const [buildParams, setBuildParams] = useState([]);
    const { loading, error } = useQuery(GET_Payload_Details, {
        variables: {payload_name: props.payload_name},
        onCompleted: data => {
            const buildParams = data.payloadtype[0].buildparameters.map((param) => {
              let choices = getDefaultChoices(param);
              if(!param.parameter_type.includes("Choose") && !param.parameter_type.includes("Array")){
                  choices = [];
              }
              if(param.parameter_type.includes("File")){
                  choices = [];
              }
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
              if(param.parameter_type === "Array" || param.parameter_type === "ChooseMultiple" || param.parameter_type === "FileMultiple"){
                default_value = default_value.join(", ")
              } else if(param.parameter_type === "Boolean"){
                default_value = default_value ? "True" : "False"
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
              } else if(param.parameter_type === "File"){
                  default_value = "";
              }
              return {...param, choices: choices, default_value: default_value}
            });
            setBuildParams(buildParams);
        }
        });
    if (loading) {
     return (
       <>
         <DialogTitle id="form-dialog-title">{props.payload_name}'s Build Parameters</DialogTitle>
         <DialogContent dividers={true}>
           <MythicLoadingState title="Loading build parameters" description="Fetching parameter definitions for this payload type." minHeight={180} />
         </DialogContent>
       </>
     );
    }
    if (error) {
     console.error(error);
     return (
       <>
         <DialogTitle id="form-dialog-title">{props.payload_name}'s Build Parameters</DialogTitle>
         <DialogContent dividers={true}>
           <MythicErrorState title="Unable to load build parameters" description={error.message} minHeight={180} />
         </DialogContent>
       </>
     );
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.payload_name}'s Build Parameters</DialogTitle>
        <DialogContent dividers={true}>
          <MythicDialogBody compact>
          <MythicDialogSection
            title="Build Parameters"
            description={`${buildParams.length} parameter${buildParams.length === 1 ? "" : "s"} defined for this payload type.`}
          >
            <BuildParameterList parameters={buildParams} />
          </MythicDialogSection>
          </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
        </MythicDialogFooter>
  </React.Fragment>
  );
}
