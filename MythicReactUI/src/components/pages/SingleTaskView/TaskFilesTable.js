import React, { useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Link from '@mui/material/Link';
import {b64DecodeUnicode} from '../Callbacks/ResponseDisplay';


export function TaskFilesTable(props){
   const [files, setFiles] = React.useState([]);
   const theme = useTheme();

   useEffect( () => {
    const condensed = props.tasks.reduce( (prev, tsk) => {
        const fls = tsk.filemeta.map(c => {return {...c, display_id: tsk.display_id}});
      return [...prev, ...fls];
    }, []);
    setFiles(condensed);
    condensed.sort((a,b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
   }, [props.tasks]);
   if(files.length === 0){
     return null
   }
  return (
    <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
            <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Files / Screenshots
            </Typography>
        </Paper>
        
        <Paper elevation={5} style={{position: "relative", backgroundColor: theme.body}}>
        <TableContainer className="mythicElement">
          <Table  size="small" style={{ "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell>Filename</TableCell>
                        <TableCell style={{width: "5rem"}}>Type</TableCell>
                        <TableCell >Remote Path</TableCell>
                        <TableCell >Comment</TableCell>
                        <TableCell >Hashes</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                  {files.map( (file) => (
                    <TableRow key={"file" + file.id} hover>
                      <TableCell>
                        {!file.deleted && file.complete ? (
                          <Link href={"/direct/download/" + file.agent_file_id} style={{textDecoration: "underline", color: "inherit"}}>{b64DecodeUnicode(file.filename_text)}</Link>
                        ) : ( 
                          !file.complete ? (
                            b64DecodeUnicode(file.filename_text) +  " (" + file.chunks_received + "/" + file.total_chunks + ")"
                          ) : (b64DecodeUnicode(file.filename_text))
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
                      <TableCell style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>{b64DecodeUnicode(file.full_remote_path_text) === "" ? ("") : (file.host + "\n" + b64DecodeUnicode(file.full_remote_path_text)) }</TableCell>
                      <TableCell style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>{file.comment}</TableCell>
                      <TableCell>{"MD5: "}{file.md5}<br/>{"SHA1: "}{file.sha1}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </TableContainer>
        </Paper>
    </React.Fragment>
  );
}
