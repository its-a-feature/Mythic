import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {Typography} from '@mui/material';
import {useTheme} from '@mui/material/styles';

export function EventGroupConsumingContainersDialog({onClose, selectedEventGroup}) {

    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">
                Eventing containers needed for this workflow to succeed
            </DialogTitle>

            <DialogContent dividers={true} style={{maxHeight: "calc(70vh)"}}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Container Name</TableCell>
                            <TableCell>Container Status</TableCell>
                            <TableCell>Needed Functions</TableCell>
                            <TableCell>Available Functions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {selectedEventGroup.eventgroupconsumingcontainers.map( e => (
                            <EventGroupConsumingContainersDialogTableRow key={e.id} container={e} />
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
            </DialogActions>
        </React.Fragment>
    );
}

function EventGroupConsumingContainersDialogTableRow({container}) {
    const theme = useTheme();
    const [subscriptions, setSubscriptions] = React.useState([]);
    React.useEffect( () => {
        if(container.consuming_container){
            const parsedLocalEventing = container?.consuming_container?.subscriptions?.map( s => {
                try{
                    return JSON.parse(s);
                }catch(error){
                    console.log(error);
                    return {name: "", description: s};
                }
            })
            setSubscriptions(parsedLocalEventing);
        }

    }, [container?.consuming_container?.subscriptions])
    return (
        <TableRow >
            <MythicStyledTableCell >{container.consuming_container_name}</MythicStyledTableCell>
            <MythicStyledTableCell>
                <Typography variant="body2" component="p" color={container?.consuming_container?.container_running ? theme.palette.success.main : theme.palette.error.main} >
                    <b>{container?.consuming_container ? container?.consuming_container?.container_running ? "Online" : "Offline" : "Doesn't Exist"}</b>
                </Typography>
            </MythicStyledTableCell>
            <MythicStyledTableCell>
                {container.function_names.join(", ")}
            </MythicStyledTableCell>
            <MythicStyledTableCell>
                {subscriptions.map(s => (
                    <Typography key={s.name}>
                        <b>{s.name}</b> - {s.description}
                    </Typography>
                ))}
            </MythicStyledTableCell>
        </TableRow>
    )
}