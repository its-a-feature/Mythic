import React, { useEffect } from 'react';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import GetAppIcon from '@mui/icons-material/GetApp';
import IconButton from '@mui/material/IconButton';

export function DownloadHistoryDialog(props){
   const [history, setHistory] = React.useState([]);
   const theme = useTheme();

   useEffect( () => {
    setHistory(props.value);
   }, [props.value]);
  return (
    <React.Fragment>
      <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
        
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
                          <IconButton
                            href={"/api/v1.4/files/download/" + hist.agent_file_id}
                            style={{color: theme.palette.success.main}}
                            size="large"><GetAppIcon /></IconButton>
                        ) : (hist.chunks_received + "/" + hist.total_chunks)}</TableCell>
                        <TableCell>{hist.timestamp}</TableCell>
                        <TableCell>{hist.task.id}</TableCell>
                        <TableCell>{hist.comment}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
              </Table>
            </TableContainer>
          
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
    </React.Fragment>
  );
}
