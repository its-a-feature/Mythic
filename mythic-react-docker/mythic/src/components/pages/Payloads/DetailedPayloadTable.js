import React from 'react';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableHead from '@material-ui/core/TableHead';
import Typography from '@material-ui/core/Typography';
import {useQuery, gql} from '@apollo/client';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';
import Paper from '@material-ui/core/Paper';
import {useTheme} from '@material-ui/core/styles';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';

const GET_Payload_Details = gql`
query GetPayloadDetails($payload_id: Int!, $operation_id: Int!) {
  payload(where: {id: {_eq: $payload_id}, operation_id: {_eq: $operation_id}}) {
    uuid
    payloadtype{
        ptype
    }
    payloadcommands {
      id
      version
      command {
        cmd
        id
        version
      }
    }
    filemetum {
      filename_text
      agent_file_id
      id
      md5
      sha1
    }
    buildparameterinstances {
      parameter
      id
      buildparameter {
        description
      }
    }
    os
    c2profileparametersinstances(order_by: {c2profile: {name: asc}}) {
      value
      c2profileparameter {
        description
        parameter_type
      }
      c2profile {
        name
      }
      enc_key_base64
      dec_key_base64
    }
  }
}
`;
export function DetailedPayloadTable(props){
    const me = useReactiveVar(meState);
    const theme = useTheme();
    const [commands, setCommands] = React.useState([]);
    const [buildParameters, setBuildParameters] = React.useState([]);
    const [c2Profiles, setC2Profiles] = React.useState([]);
    const { loading, error, data } = useQuery(GET_Payload_Details, {
        variables: {payload_id: props.payload_id, operation_id: me.user.current_operation_id},
        onCompleted: data => {
            const commandState = data.payload[0].payloadcommands.map( (c) => 
            { 
                return {cmd: c.command.cmd, mythic: c.command.version, payload: c.version} 
            }).sort((a,b) => (a.cmd > b.cmd) ? 1: ((b.cmd > a.cmd) ? -1 : 0));
            setCommands(commandState);
            const buildParametersState = data.payload[0].buildparameterinstances.map( (b) =>
            {
                return {description: b.buildparameter.description, value: b.parameter}
            }).sort((a,b) => (a.description > b.description) ? 1: ((b.description > a.description) ? -1 : 0));
            setBuildParameters(buildParametersState);
            const c2Profiles = data.payload[0].c2profileparametersinstances.reduce( (prev, cur) => {
                if( !(cur.c2profile.name in prev) ){
                    return {...prev, [cur.c2profile.name]: [{description: cur.c2profileparameter.description, 
                      value: cur.value, 
                      enc_key: cur.enc_key_base64, 
                      dec_key: cur.dec_key_base64,
                      parameter_type: cur.c2profileparameter.parameter_type,
                    }]}
                }
                return {...prev, [cur.c2profile.name]: [...prev[cur.c2profile.name], {description: cur.c2profileparameter.description, 
                  value: cur.value, 
                  enc_key: cur.enc_key_base64, 
                  dec_key: cur.dec_key_base64,
                  parameter_type: cur.c2profileparameter.parameter_type,
                }]}
            }, {});
            const c2ProfilesState = Object.keys(c2Profiles).reduce( (prev, cur) => {
                return [...prev, {
                    c2_profile: cur,
                    parameters: c2Profiles[cur].sort((a,b) => (a.description > b.description) ? 1: ((b.description > a.description) ? -1 : 0))
                }];
            }, []);
            setC2Profiles(c2ProfilesState);
        }
        });
    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}}/>;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    return (
        <React.Fragment>
          <DialogTitle id="form-dialog-title">Payload Configuration</DialogTitle>
          <DialogContent dividers={true}>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
              <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                  Payload Information
              </Typography>
            </Paper>
            <Table size="small" aria-label="details" style={{ "overflowWrap": "break-word"}}>
                <TableHead>
                  <TableRow hover>
                    <TableCell >Payload Info</TableCell>
                    <TableCell>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow hover>
                        <TableCell>Payload Type</TableCell>
                        <TableCell>{data.payload[0].payloadtype.ptype}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Selected OS</TableCell>
                        <TableCell>{data.payload[0].os}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>UUID</TableCell>
                        <TableCell>{data.payload[0].uuid}</TableCell>
                    </TableRow>
                    { data.payload[0].filemetum ? (
                        <TableRow key={'filename_text'} hover>
                            <TableCell>Filename</TableCell>
                            <TableCell>{data.payload[0].filemetum.filename_text}</TableCell>
                        </TableRow>
                        
                    ) : null }

                    <TableRow hover>
                        <TableCell>Download URL</TableCell>
                        <TableCell>{window.location.origin + "/direct/download/" + data.payload[0].filemetum.agent_file_id}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>SHA1</TableCell>
                        <TableCell>{data.payload[0].filemetum.sha1}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>MD5</TableCell>
                        <TableCell>{data.payload[0].filemetum.md5}</TableCell>
                    </TableRow>
                </TableBody>
              </Table>
              <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                    Build Parameters
                </Typography>
              </Paper>
            <Table size="small" aria-label="details" style={{ "overflowWrap": "break-word"}}>
                <TableHead>
                  <TableRow>
                    <TableCell style={{width: "30%"}}>Parameter</TableCell>
                    <TableCell>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {
                    buildParameters.map( (cmd, i) => (
                        <TableRow key={"buildprop" + i + "for" + props.payload_id}>
                            <TableCell>{cmd.description}</TableCell>
                            <TableCell>{cmd.value}</TableCell>
                        </TableRow>
                    ))
                    
                  }
                </TableBody>
              </Table>
                { c2Profiles.map( (c2) => (
                    <React.Fragment key={"c2frag" + props.payload_id + c2.c2_profile}>
                          <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                            <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                                {c2.c2_profile}
                            </Typography>
                          </Paper>
                        <Table size="small" aria-label="details" style={{"overflowWrap": "break-word"}}>
                            <TableHead>
                              <TableRow>
                                <TableCell style={{width: "30%"}}>Parameter</TableCell>
                                <TableCell>Value</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody style={{whiteSpace: "pre"}}>
                              {
                                c2.parameters.map( (cmd, j) => (
                                    <TableRow key={"c2frag" + props.payload_id + c2.c2_profile + j} hover>
                                        <TableCell>{cmd.description}</TableCell>
                                        <TableCell>
                                          {cmd.parameter_type === "Dictionary" ? (
                                            JSON.stringify(JSON.parse(cmd.value), null, 2)
                                            ) : (cmd.value)}
                                          {cmd.enc_key === null ? (null) : (<React.Fragment>
                                            <br/><b>Encryption Key: </b> {cmd.enc_key}
                                          </React.Fragment>) }
                                        {cmd.dec_key === null ? (null) : (<React.Fragment>
                                            <br/><b>Decryption Key: </b> {cmd.dec_key}
                                        </React.Fragment>) }
                                        </TableCell>
                                    </TableRow>
                                ))
                                
                              }
                            </TableBody>
                          </Table>
                      </React.Fragment>
                ))}
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
              <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                  Loaded Commands
              </Typography>
            </Paper>
            <Table size="small" aria-label="details" style={{"overflowWrap": "break-word"}}>
            <TableHead>
              <TableRow>
                <TableCell>Command Name</TableCell>
                <TableCell>Mythic Version</TableCell>
                <TableCell>Loaded Version</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {
                commands.map( (cmd) => (
                    <TableRow key={cmd.cmd + props.payload_id} hover>
                        <TableCell>{cmd.cmd}</TableCell>
                        <TableCell>{cmd.mythic}</TableCell>
                        <TableCell>{cmd.payload}</TableCell>
                    </TableRow>
                ))
                
              }
            </TableBody>
          </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={props.onClose} variant="contained" color="primary">
              Close
            </Button>
        </DialogActions>
        </React.Fragment>
        )
}

