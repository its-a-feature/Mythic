import React, { useEffect } from 'react';
import Paper from '@material-ui/core/Paper';
import {useTheme} from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import GetAppIcon from '@material-ui/icons/GetApp';
import IconButton from '@material-ui/core/IconButton';

export function DownloadHistoryDialog(props){
   const [history, setHistory] = React.useState([]);
   const theme = useTheme();

   useEffect( () => {
    setHistory(props.value);
   }, [props.value]);
  return (
    <React.Fragment>
      <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
        <DialogContent dividers={true}>
          <Paper elevation={5} style={{position: "relative", backgroundColor: theme.body}} variant={"elevation"}>
          <TableContainer component={Paper} className="mythicElement">
            <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                  <TableHead>
                      <TableRow>
                          <TableCell style={{width: "5rem"}}>Download</TableCell>
                          <TableCell>Time</TableCell>
                          <TableCell>Task</TableCell>
                          <TableCell>Comment</TableCell>
                      </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map( (hist) => (
                      <TableRow key={'hist' + hist.id}>
                        <TableCell >{hist.complete ? (
                          <IconButton href={"/api/v1.4/files/download/" + hist.agent_file_id} style={{color: theme.palette.success.main}}><GetAppIcon /></IconButton>
                        ) : (hist.chunks_received + "/" + hist.total_chunks)}</TableCell>
                        <TableCell>{hist.timestamp}</TableCell>
                        <TableCell>{hist.task.id}</TableCell>
                        <TableCell>{hist.task.comment}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
    </React.Fragment>
  );
}
