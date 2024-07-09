import React from 'react';
import { useQuery, gql} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';

const GetC2ProfilesAndPayloadTypes = gql`
query GetC2AndPayloadType {
  c2profile(where: {deleted: {_eq: false}}) {
    name
    id
    container_running
  }
  payloadtype(where: {deleted: {_eq: false}, agent_type: {_eq: "agent"}}) {
    name
    wrapper
    id
    container_running
    payloadtypec2profiles {
      c2profile {
        name
        id
      }
    }
  }
  wrappers: payloadtype(where: {deleted: {_eq: false}, agent_type: {_eq: "agent"}, wrapper: {_eq: true}}) {
    name
    wrapper
    id
    container_running
    wrap_these_payload_types {
      wrapped {
        wrapper
        id
        name
      }
    }
  }
}
`;

export function AgentC2Overview(props){
    const theme = useTheme();
    const [c2Profiles, setC2Profiles] = React.useState([]);
    const [payloadTypeRows, setPayloadTypeRows] = React.useState([]);
    const [payloadTypeRowsNoWrappers, setPayloadTypeRowsNoWrappers] = React.useState([]);
    const [wrappers, setWrappers] = React.useState([]);
    const { loading } = useQuery(GetC2ProfilesAndPayloadTypes, {fetchPolicy: "network-only",
      onCompleted: (data) => {
        const c2Headers = data.c2profile.map( (c2) => c2.name);
        const payloadRows = data.payloadtype.map( (payload) => {
          const payloadc2 = payload.payloadtypec2profiles.map( (c2) => {
            return c2.c2profile.name;
          })
          return {name: payload.name, payloadtypec2profiles: payloadc2, wrapper: payload.wrapper };
        });
        
        c2Headers.sort();
        payloadRows.sort( (a,b) => a.name < b.name ? -1 : 1);
        const payloadTypeNoWrappers = payloadRows.filter( p => !p.wrapper);
        const wrapperRows = data.wrappers.map( (payload) => {
          const wrapped = payload.wrap_these_payload_types.map( (w) => {
            return w.wrapped.name;
          });
          return {name: payload.name, wrapped}
        });
        wrapperRows.sort( (a,b) => a.name < b.name ? -1 : 1);
        setWrappers(wrapperRows);
        setC2Profiles(c2Headers);
        setPayloadTypeRows(payloadRows);
        setPayloadTypeRowsNoWrappers(payloadTypeNoWrappers);
      },
      onError: (data) => {

      }
    });
    if (loading) {
     return <LinearProgress />;
    }
    return (
    <div style={{ marginTop: "10px", marginRight: "5px"}}>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main, marginBottom: "5px", marginTop: "10px", marginRight: "5px"}} variant={"elevation"}>
            <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Agent / C2 Overview
            </Typography>
        </Paper>
        <TableContainer component={Paper} className="mythicElement">   
        <Table  size="small">
            <TableHead>
                <TableRow hover>
                    <TableCell></TableCell>
                    {c2Profiles.map( (c2) => (
                      <TableCell key={c2}>{c2}</TableCell>
                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {payloadTypeRowsNoWrappers.map( (payload) => (
                  <TableRow key={payload.name} hover>
                    <TableCell>{payload.name}</TableCell>
                    {c2Profiles.map( (c2) => (
                      <TableCell key={'payload' + c2}>
                        {payload.payloadtypec2profiles.includes(c2) ? 
                        <MythicStyledTooltip title={payload.name + " supports " + c2}>
                            <CheckCircleIcon color="success"/>
                        </MythicStyledTooltip>
                     : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
        {wrappers.length > 0 && 
          <TableContainer component={Paper} className="mythicElement" style={{marginTop: "10px"}}>   
              <Table  size="small">
                  <TableHead>
                      <TableRow hover>
                          <TableCell></TableCell>
                          {payloadTypeRows.map( (pt) => (
                            <TableCell key={'wrapped' + pt.name}>{pt.name}</TableCell>
                          ))}
                      </TableRow>
                  </TableHead>
                  <TableBody>
                      {wrappers.map( (payload) => (
                        <TableRow key={'wrapper' + payload.name} hover>
                          <TableCell>{payload.name}</TableCell>
                          {payloadTypeRows.map( (wr) => (
                            <TableCell key={'payload' + wr.name}>
                              {payload.wrapped.includes(wr.name) ? 
                              <MythicStyledTooltip title={payload.name + " wraps " + wr.name}>
                                  <CheckCircleIcon color="success"/>
                              </MythicStyledTooltip>
                          : ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </TableContainer>
        }
      </div>
    );
} 
