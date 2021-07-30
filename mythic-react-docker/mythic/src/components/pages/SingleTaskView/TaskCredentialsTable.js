import React, { useEffect } from 'react';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import {useTheme} from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

export function TaskCredentialsTable(props){
   const [credentials, setCredentials] = React.useState([]);
   const theme = useTheme();

   useEffect( () => {
    const condensed = props.tasks.reduce( (prev, tsk) => {
      return [...prev, ...tsk.credentials];
    }, []);
    setCredentials(condensed);
   }, [props.tasks]);
   if(credentials.length === 0){
     return (null)
   }
  return (
    <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
            <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Credentials
            </Typography>
        </Paper>
        
        <Paper elevation={5} style={{position: "relative", backgroundColor: theme.body}} variant={"elevation"}>
        <TableContainer component={Paper} className="mythicElement">
          <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell>Task</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Realm</TableCell>
                        <TableCell>Account</TableCell>
                        <TableCell>Credentials</TableCell>
                        <TableCell>Comment</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                  {credentials.map( (cred) => (
                    <TableRow key={"cred" + cred.id}>
                      <TableCell>{cred.task_id}</TableCell>
                      <TableCell>{cred.type}</TableCell>
                      <TableCell>{cred.realm}</TableCell>
                      <TableCell>{cred.account}</TableCell>
                      <TableCell>{cred.credential_text}</TableCell>
                      <TableCell>{cred.comment}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </TableContainer>
        </Paper>
    </React.Fragment>
  );
}
