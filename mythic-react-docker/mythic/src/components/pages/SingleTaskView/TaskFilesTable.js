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
import Link from '@material-ui/core/Link';


export function TaskFilesTable(props){
   const [files, setFiles] = React.useState([]);
   const theme = useTheme();

   useEffect( () => {
    const condensed = props.tasks.reduce( (prev, tsk) => {
      return [...prev, ...tsk.filemeta];
    }, []);
    setFiles(condensed);
    condensed.sort((a,b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
   }, [props.tasks]);
   if(files.length === 0){
     return (null)
   }
  return (
    <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
            <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Files / Screenshots
            </Typography>
        </Paper>
        
        <Paper elevation={5} style={{position: "relative", backgroundColor: theme.body}} variant={"elevation"}>
        <TableContainer component={Paper} className="mythicElement">
          <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell>Filename</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Remote Path</TableCell>
                        <TableCell>Comment</TableCell>
                        <TableCell>Hashes</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                  {files.map( (file) => (
                    <TableRow key={"file" + file.id}>
                      <TableCell>
                        {!file.deleted && file.complete ? (
                          <Link href={window.origin + "/api/v1.4/files/download/" + file.agent_file_id} style={{textDecoration: "underline", color: "inherit"}}>{file.filename_text}</Link>
                        ) : ( 
                          !file.complete ? (
                            file.filename_text +  " (" + file.chunks_received + "/" + file.total_chunks + ")"
                          ) : (file.filename_text)
                         )}
                        </TableCell>
                      <TableCell>
                        {file.is_screenshot ? ("Screenshot") : (
                          file.is_payload ? ("Payload") : (
                            file.is_download_from_agent ? ("Download") : (
                              "Upload"
                            )
                          )
                        )}
                      </TableCell>
                      <TableCell>{file.full_remote_path_text === "" ? ("") : (file.host + ":" + file.full_remote_path_text) }</TableCell>
                      <TableCell>{file.task.comment}</TableCell>
                      <TableCell>MD5:<br/>{file.md5}<br/>SHA1:<br/>{file.sha1}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </TableContainer>
        </Paper>
    </React.Fragment>
  );
}
