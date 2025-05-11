import React from 'react';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Button, Link} from '@mui/material';

export function MitreMapDisplayDialog({entry, showCountGrouping, onClose}){
    const [commands, setCommands] = React.useState([]);
    const [tasks, setTasks] = React.useState([]);
    React.useEffect( () => {
      switch(showCountGrouping){
        case "":
          break;
        case "command":
          const groupedCommands = entry.commands.reduce( (prev, cur) => {
            if(cur.payloadtype.name in prev){
              prev[cur.payloadtype.name].push(cur.cmd);
            }else{
              prev[cur.payloadtype.name] = [cur.cmd];
            }
            return {...prev};
          }, {});
          setCommands(Object.entries(groupedCommands));
          break;
        case "task":
          const groupedTasks = entry.tasks.reduce( ( prev, cur) => {
            if(cur.callback.payload.payloadtype.name in prev){
              prev[cur.callback.payload.payloadtype.name].push({
                id: cur.id,
                command: cur.command_name + " " + cur.display_params,
                comment: cur.comment,
                callback_id: cur.callback.id
              });
            }else{
              prev[cur.callback.payload.payloadtype.name] = [{
                id: cur.id,
                command: cur.command_name + " " + cur.display_params,
                comment: cur.comment,
                callback_id: cur.callback.id
              }];
            }
            return {...prev};
          }, {});
          setTasks(Object.entries(groupedTasks));
          break;
      }
    }, [entry, showCountGrouping]);
    return (
        <React.Fragment>
          <DialogTitle id="form-dialog-title">{entry.name} - <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"https://attack.mitre.org/techniques/" + entry.t_num.replace(".", "/")} >{entry.t_num}</Link></DialogTitle>
          <DialogContent dividers={true}>
            {showCountGrouping === "command" ? 
            (
              <DetailedCommandMappingTables commands={commands} />
            ) : 
            (
              <DetailedTaskMappingTables tasks={tasks} />
            )}
           
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} variant="contained" color="primary">
              Close
            </Button>
        </DialogActions>
        </React.Fragment>
        )
}

function DetailedCommandMappingTables({commands}){
  const me = useReactiveVar(meState);
    const theme = useTheme();
    return (
      <React.Fragment>
        {commands.map( c => (
          <div key={"agent" + c[0]}>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
              <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                {c[0]}
              </Typography>
            </Paper>
            <Table size="small" aria-label="details" style={{ "overflowWrap": "break-word"}}>
              <TableHead>
                <TableRow>
                  <TableCell>Command</TableCell>
                  <TableCell style={{width: "5rem"}}>Documentation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {c[1].map( entry => (
                  <TableRow hover key={"command" + entry}>
                      <TableCell>{entry}</TableCell>
                      <TableCell>
                      <Button variant="contained" color="primary" target="_blank"
                              href={"/docs/agents/" + c[0] + "/commands/" + entry}>Docs</Button>
                      </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </React.Fragment>
    )
}

function DetailedTaskMappingTables({tasks}){
  const me = useReactiveVar(meState);
    const theme = useTheme();
    return (
      <React.Fragment>
        {tasks.map( c => (
          <React.Fragment>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
              <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                {c[0]}
              </Typography>
            </Paper>
            <Table size="small" aria-label="details" style={{ "overflowWrap": "break-word"}}>
            <TableHead>
                <TableRow>
                  <TableCell style={{width: "5rem"}}>Callback</TableCell>
                  <TableCell style={{width: "5rem"}}>Task</TableCell>
                  <TableCell>Command</TableCell>
                  <TableCell>Comment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {c[1].map( entry => (
                  <TableRow hover>
                      <TableCell>
                        <Link style={{wordBreak: "break-all"}} underline="always" target="_blank" href={"/new/callbacks/" + entry.callback_id} >{entry.callback_id}</Link>
                      </TableCell>
                      <TableCell>
                      <Link style={{wordBreak: "break-all"}} underline="always" target="_blank" href={"/new/task/" + entry.id} >{entry.id}</Link>
                        </TableCell>
                      <TableCell>{entry.command}</TableCell>
                      <TableCell>{entry.comment}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </React.Fragment>
        ))}
      </React.Fragment>
    )
}