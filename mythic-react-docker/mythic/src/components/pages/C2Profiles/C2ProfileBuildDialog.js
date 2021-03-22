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
    }
  }
}
`;

export function C2ProfileBuildDialog(props) {
    const [buildParams, setBuildParams] = useState([]);
    const { loading, error } = useQuery(GET_C2_Details, {
        variables: {payload_name: props.payload_name},
        onCompleted: data => {
            setBuildParams(data.c2profile[0].c2profileparameters);
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
                            Default Parameter:<br/>{param.default_value}<br/>
                            Required value?<br/>{param.required ? "Yes": "No"}<br/>
                            Verifier Regex:<br/>{param.verifier_regex}<br/>
                            Randomize value?: <br/>{param.randomize ? "Yes" : "No" }<br/>
                            Random Format String: <br/>{param.format_string}<br/>
                            </TableCell>
                        </TableRow>
                    ))
                    
                  }
                </TableBody>
              </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

