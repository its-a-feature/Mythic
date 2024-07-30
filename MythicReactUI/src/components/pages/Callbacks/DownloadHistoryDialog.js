import React, { useEffect } from 'react';
import {useTheme} from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {Button, Link, Typography} from '@mui/material';
import {snackActions} from "../../utilities/Snackbar";
import {previewFileQuery} from "../Search/FileMetaTable";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import hexFile from "../../../assets/file_bin.png";
import txtFile from "../../../assets/file_txt.png";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {PreviewFileMediaDialog} from "../Search/PreviewFileMedia";
import {PreviewFileStringDialog} from "../Search/PreviewFileStringDialog";
import {PreviewFileHexDialog} from "../Search/PreviewFileHexDialog";
import {faPhotoVideo} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import { useMutation } from '@apollo/client';

export function DownloadHistoryDialog(props){
   const [history, setHistory] = React.useState([]);
   const theme = useTheme();
    const [fileContents, setFileContents] = React.useState('');
    const [openPreviewStringsDialog, setOpenPreviewStringsDialog] = React.useState(false);
    const [openPreviewHexDialog, setOpenPreviewHexDialog] = React.useState(false);
    const [openPreviewMediaDialog, setOpenPreviewMediaDialog] = React.useState(false);
    const [previewFileString] = useMutation(previewFileQuery, {
        onCompleted: (data) => {
            if(data.previewFile.status === "success"){
                setFileContents(data.previewFile.contents);
                setOpenPreviewStringsDialog(true);
            }else{
                snackActions.error(data.previewFile.error)
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error(data);
        }
    });
    const [previewFileHex] = useMutation(previewFileQuery, {
        onCompleted: (data) => {
            if(data.previewFile.status === "success"){
                setFileContents(data.previewFile.contents);
                setOpenPreviewHexDialog(true);
            }else{
                snackActions.error(data.previewFile.error)
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error(data);
        }
    });
    const onPreviewStrings = (event, hist) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        previewFileString({variables: {file_id: hist.agent_file_id}})
    }
    const onPreviewHex = (event, hist) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        previewFileHex({variables: {file_id: hist.agent_file_id}})
    }
    const onPreviewMedia = (event, hist) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        setOpenPreviewMediaDialog(true);
    }
   useEffect( () => {
    setHistory(props.value);
   }, [props.value]);
  return (
    <React.Fragment>
      <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
        
          <TableContainer className="mythicElement">
            <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                  <TableHead>
                      <TableRow>
                          <TableCell style={{}}></TableCell>
                          <TableCell>Time</TableCell>
                          <TableCell>Task</TableCell>
                          <TableCell>Callback</TableCell>
                          <TableCell>Comment</TableCell>
                      </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map( (hist) => (
                      <TableRow key={'hist' + hist.id}>
                        <TableCell >
                            {hist.complete ? (
                                <>
                                    <MythicStyledTooltip title={"Preview HEX XXD"}>
                                        <img src={hexFile} alt={"preview hex"} style={{height: "35px", cursor: "pointer"}}
                                             onClick={(e) => onPreviewHex(e, hist)}/>
                                    </MythicStyledTooltip>
                                    <MythicStyledTooltip title={"Preview Strings"}>
                                        <img src={txtFile} alt={"preview strings"} style={{height: "35px", cursor: "pointer"}}
                                             onClick={(e) => onPreviewStrings(e, hist)} />
                                    </MythicStyledTooltip>
                                    <MythicStyledTooltip title={"Preview Media"}>
                                        <FontAwesomeIcon icon={faPhotoVideo} style={{height: "25px", bottom: "5px", position: "relative", cursor: "pointer", display: "inline-block"}}
                                                         onClick={(e) => onPreviewMedia(e, hist)} />
                                    </MythicStyledTooltip>
                                    {openPreviewMediaDialog &&
                                        <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewMediaDialog}
                                                      onClose={(e)=>{setOpenPreviewMediaDialog(false);}}
                                                      innerDialog={<PreviewFileMediaDialog
                                                          agent_file_id={hist.agent_file_id}
                                                          filename={hist.filename_text}
                                                          onClose={(e)=>{setOpenPreviewMediaDialog(false);}} />}
                                        />
                                    }
                                    {openPreviewStringsDialog &&
                                        <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewStringsDialog}
                                                      onClose={()=>{setOpenPreviewStringsDialog(false);}}
                                                      innerDialog={<PreviewFileStringDialog onClose={()=>{setOpenPreviewStringsDialog(false);}}
                                                                                            filename={hist.filename_text} contents={fileContents}
                                                      />}
                                        />
                                    }
                                    {openPreviewHexDialog &&
                                        <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewHexDialog}
                                                      onClose={()=>{setOpenPreviewHexDialog(false);}}
                                                      innerDialog={<PreviewFileHexDialog onClose={()=>{setOpenPreviewHexDialog(false);}}
                                                                                         filename={hist.filename_text} contents={fileContents}
                                                      />}
                                        />
                                    }
                                    <br/>
                                    {props.deleted ? (
                                        <Typography variant="body2" style={{wordBreak: "break-all"}}>{hist.full_remote_path_text === "" ? hist.filename_text : hist.full_remote_path_text}</Typography>
                                    ) : (
                                        <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" + hist.agent_file_id}>{hist.full_remote_path_text === "" ? hist.filename_text : hist.full_remote_path_text}</Link>
                                    )
                                    }
                                </>

                        ) : (hist.chunks_received + "/" + hist.total_chunks)}
                        </TableCell>
                        <TableCell>{hist.timestamp}</TableCell>
                        <TableCell>
                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                  href={"/new/task/" + hist.task.display_id}>
                                {hist.task.display_id}
                            </Link>
                        </TableCell>
                          <TableCell>
                              <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                    href={"/new/callbacks/" + hist.task.callback.display_id}>
                                  {hist.task.callback.display_id}
                              </Link>
                          </TableCell>
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
