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
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

const GET_Payload_Details = gql`
query GetPayloadDetails($payload_name: String!) {
  command(where: {payloadtype: {name: {_eq: $payload_name}}}, order_by: {cmd: asc}) {
    cmd
    description
    id
    version
    needs_admin
    deleted
  }
}
`;

export function PayloadTypeCommandDialog({service, payload_name, onClose}) {
    const [commands, setCommands] = useState([]);
    const theme = useTheme();
    const { loading, error } = useQuery(GET_Payload_Details, {
        variables: {payload_name: payload_name},
        onCompleted: data => {
            const deleted = data.command.filter(c => c.deleted);
            const notDeleted = data.command.filter(c => !c.deleted);
            setCommands([...notDeleted, ...deleted]);
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
        <DialogContent dividers={true} style={{padding: 0}}>
                <Table size="small" stickyHeader={true} aria-label="details"
                       style={{"tableLayout": "fixed", "overflowWrap": "break-word", overflowY:"auto", width: "100%", height: "100%"}}>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{width: "20%"}}>Command</TableCell>
                            <TableCell style={{width: "6rem"}}>Version</TableCell>
                            <TableCell style={{width: "5rem"}}>Admin</TableCell>
                            <TableCell style={{width: "5rem"}}>Docs</TableCell>
                            <TableCell>Description</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            commands.map((param) => (
                                <TableRow key={"command" + param.id} hover style={{backgroundColor: param.deleted? theme.palette.action.disabledBackground : ''}}>
                                    <TableCell>
                                        <Typography style={{textDecoration: param.deleted ? 'line-through' : ''}}>
                                            {param.cmd}
                                        </Typography>
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
        </DialogContent>
        <DialogActions>
            <Button variant="contained" onClick={onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

