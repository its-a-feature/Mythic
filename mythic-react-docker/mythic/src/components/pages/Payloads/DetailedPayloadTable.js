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
      filename
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
    c2profileparametersinstances(order_by: {c2profile: {name: asc}}) {
      value
      c2profileparameter {
        description
      }
      c2profile {
        name
      }
      enc_key
      dec_key
    }
  }
}
`;
export function DetailedPayloadTable(props){
    const me = useReactiveVar(meState);
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
                    return {...prev, [cur.c2profile.name]: [{description: cur.c2profileparameter.description, value: cur.value, enc_key: cur.enc_key, dec_key: cur.dec_key}]}
                }
                return {...prev, [cur.c2profile.name]: [...prev[cur.c2profile.name], {description: cur.c2profileparameter.description, value: cur.value, enc_key: cur.enc_key, dec_key: cur.dec_key}]}
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
            <Typography variant="h6" gutterBottom component="div" style={{display: "inline-block"}}>
                Payload Information
            </Typography>
            <Table size="small" aria-label="details" style={{"tableLayout": "fixed", "overflowWrap": "break-word"}}>
                <TableHead>
                  <TableRow>
                    <TableCell style={{width: "30%"}}>Payload Info</TableCell>
                    <TableCell>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <TableCell>Payload Type</TableCell>
                        <TableCell>{data.payload[0].payloadtype.ptype}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>UUID</TableCell>
                        <TableCell>{data.payload[0].uuid}</TableCell>
                    </TableRow>
                    { data.payload[0].filemetum ? (
                        <TableRow key={'filename'}>
                            <TableCell>Filename</TableCell>
                            <TableCell>{data.payload[0].filemetum.filename}</TableCell>
                        </TableRow>
                        
                    ) : null }

                    <TableRow>
                        <TableCell>Download URL</TableCell>
                        <TableCell>{window.location.origin + "/direct/download/" + data.payload[0].filemetum.agent_file_id}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>SHA1</TableCell>
                        <TableCell>{data.payload[0].filemetum.sha1}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>MD5</TableCell>
                        <TableCell>{data.payload[0].filemetum.md5}</TableCell>
                    </TableRow>
                </TableBody>
              </Table>
            <Typography variant="h6" gutterBottom component="div" style={{display: "inline-block"}}>
                Build Parameters
            </Typography>
            <Table size="small" aria-label="details" style={{"tableLayout": "fixed", "overflowWrap": "break-word"}}>
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
                        <Typography variant="h6" gutterBottom component="div" style={{display: "inline-block"}}>
                            {c2.c2_profile}
                        </Typography>
                        <Table size="small" aria-label="details" style={{"tableLayout": "fixed", "overflowWrap": "break-word"}}>
                            <TableHead>
                              <TableRow>
                                <TableCell style={{width: "30%"}}>Parameter</TableCell>
                                <TableCell>Value</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {
                                c2.parameters.map( (cmd, j) => (
                                    <TableRow key={"c2frag" + props.payload_id + c2.c2_profile + j}>
                                        <TableCell>{cmd.description}</TableCell>
                                        <TableCell>{cmd.value}
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
        <Typography variant="h6" gutterBottom component="div" style={{display: "inline-block"}}>
            Loaded Commands
        </Typography>
        <Table size="small" aria-label="details" style={{"tableLayout": "fixed", "overflowWrap": "break-word"}}>
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
                    <TableRow key={cmd.cmd + props.payload_id}>
                        <TableCell>{cmd.cmd}</TableCell>
                        <TableCell>{cmd.mythic}</TableCell>
                        <TableCell>{cmd.payload}</TableCell>
                    </TableRow>
                ))
                
              }
            </TableBody>
          </Table>
          
                  
            
        </React.Fragment>
        )
}

