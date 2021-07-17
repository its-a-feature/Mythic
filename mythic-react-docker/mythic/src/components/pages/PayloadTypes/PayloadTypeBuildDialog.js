import React, {useState} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import {useQuery, gql} from '@apollo/client';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableHead from '@material-ui/core/TableHead';
import LinearProgress from '@material-ui/core/LinearProgress';

const GET_Payload_Details = gql`
query GetPayloadDetails($payload_name: String!) {
  payloadtype(where: {ptype: {_eq: $payload_name}}) {
    buildparameters (where: {deleted: {_eq: false} } ){
      description
      name
      id
      parameter
      parameter_type
      required
      verifier_regex
    }
  }
}
`;

export function PayloadTypeBuildDialog(props) {
    const [buildParams, setBuildParams] = useState([]);
    const { loading, error } = useQuery(GET_Payload_Details, {
        variables: {payload_name: props.payload_name},
        onCompleted: data => {
            console.log(data);
            setBuildParams(data.payloadtype[0].buildparameters);
        }
        });
    if (loading) {
     return <LinearProgress />;;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.payload_name}'s Build Parameters</DialogTitle>
        <DialogContent dividers={true}>
          <DialogContentText>
            These are the build parameters associated with this payload
          </DialogContentText>
            <Table size="small" aria-label="details" style={{"tableLayout": "fixed", "overflowWrap": "break-word"}}>
                <TableHead>
                  <TableRow>
                    <TableCell>Parameter</TableCell>
                    <TableCell>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {
                    buildParams.map( (param) => (
                        <TableRow key={"buildprop" + param.id}>
                            <TableCell>{param.description}</TableCell>
                            <TableCell>
                            Scripting/Building Name:<br/>{param.name}<br/>
                            Parameter Type:<br/>{param.parameter_type}<br/>
                            Default Parameter:<br/>{param.parameter}<br/>
                            Required value?<br/>{param.required ? "Yes": "No"}<br/>
                            Verifier Regex:<br/>{param.verifier_regex}<br/>
                            </TableCell>
                        </TableRow>
                    ))
                    
                  }
                </TableBody>
              </Table>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={props.handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

