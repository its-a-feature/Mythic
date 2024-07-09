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
import MenuBookIcon from '@mui/icons-material/MenuBook';
import IconButton from '@mui/material/IconButton';

const GET_Payload_Details = gql`
query GetPayloadDetails($payload_name: String!) {
  command(where: {payloadtype: {name: {_eq: $payload_name}}}, order_by: {cmd: asc}) {
    cmd
    description
    id
    version
    needs_admin
  }
}
`;

export function PayloadTypeCommandDialog({service, payload_name, onClose}) {
    const [commands, setCommands] = useState([]);
    const { loading, error } = useQuery(GET_Payload_Details, {
        variables: {payload_name: payload_name},
        onCompleted: data => {
            setCommands(data.command);
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
        <DialogTitle id="form-dialog-title">{payload_name}'s Commands</DialogTitle>
        <DialogContentText style={{paddingLeft: "10px"}}>
            These are the commands associated with this container
        </DialogContentText>
        <DialogContent dividers={true} style={{paddingTop: 0}}>
            <div style={{display: "flex", flexGrow: 1}}>
                <Table size="small" stickyHeader={true} aria-label="details"
                       style={{"tableLayout": "fixed", "overflowWrap": "break-word", overflowY:"auto"}}>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{width: "20%"}}>Command</TableCell>
                            <TableCell style={{width: "5rem"}}>Version</TableCell>
                            <TableCell style={{width: "5rem"}}>Admin</TableCell>
                            <TableCell style={{width: "4rem"}}>Docs</TableCell>
                            <TableCell>Description</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            commands.map((param) => (
                                <TableRow key={"command" + param.id} hover>
                                    <TableCell>
                                        {param.cmd}
                                    </TableCell>
                                    <TableCell>{param.version}</TableCell>
                                    <TableCell>{param.needs_admin ? "True" : "False"}</TableCell>
                                    <TableCell>
                                        <IconButton
                                            color="secondary"
                                            href={service.wrapper ? "/docs/wrappers/" + service.name : "/docs/agents/" + service.name}
                                            target="_blank"
                                            size="large">
                                            <MenuBookIcon/>
                                        </IconButton>
                                    </TableCell>
                                    <TableCell>{param.description}</TableCell>
                                </TableRow>
                            ))

                        }
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
        <DialogActions>
            <Button variant="contained" onClick={onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

