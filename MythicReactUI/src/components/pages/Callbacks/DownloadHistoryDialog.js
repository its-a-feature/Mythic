import React, { useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {Button, Link, Typography} from '@mui/material';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {PreviewFileMediaDialog} from "../Search/PreviewFileMedia";
import {faPhotoVideo} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

export function DownloadHistoryDialog(props){
   const [history, setHistory] = React.useState([]);
    const [openPreviewMediaDialog, setOpenPreviewMediaDialog] = React.useState(false);
    const previewMediaRef = React.useRef();
    const onPreviewMedia = (event, hist) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        setOpenPreviewMediaDialog(true);
        previewMediaRef.current = hist;
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
                          <TableCell style={{width: "15rem"}}>Time</TableCell>
                          <TableCell style={{width: "5rem"}}>Task</TableCell>
                          <TableCell style={{width: "5rem"}}>Callback</TableCell>
                          <TableCell>Comment</TableCell>
                      </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map( (hist) => (
                      <TableRow key={'hist' + hist.id}>
                        <TableCell >
                            {hist.complete ? (
                                <div style={{display: "inline-flex", alignItems: "center"}}>
                                    <MythicStyledTooltip title={"Preview Media"}>
                                        <FontAwesomeIcon icon={faPhotoVideo} style={{
                                            height: "25px", marginRight: "5px", position: "relative", cursor: "pointer", display: "inline-block"}}
                                                         onClick={(e) => onPreviewMedia(e, hist)} />
                                    </MythicStyledTooltip>

                                    {hist.deleted ? (
                                        <Typography variant="body2" style={{wordBreak: "break-all"}}>{hist.full_remote_path_text === "" ? hist.filename_text : hist.full_remote_path_text}</Typography>
                                    ) : (
                                        <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" + hist.agent_file_id}>{hist.full_remote_path_text === "" ? hist.filename_text : hist.full_remote_path_text}</Link>
                                    )
                                    }
                                </div>

                        ) : (hist.chunks_received + "/" + hist.total_chunks)}
                        </TableCell>
                        <TableCell>{hist.timestamp}</TableCell>
                        <TableCell>
                            {hist.task &&
                                <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                      href={"/new/task/" + hist.task.display_id}>
                                    T-{hist.task.display_id}
                                </Link>
                            }

                        </TableCell>
                          <TableCell>
                              {hist.task &&
                                  <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                                        href={"/new/callbacks/" + hist.task.callback.display_id}>
                                      C-{hist.task.callback.display_id}
                                  </Link>
                              }

                          </TableCell>
                        <TableCell>{hist.comment}</TableCell>
                      </TableRow>
                    ))}
                      {openPreviewMediaDialog &&
                          <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewMediaDialog}
                                        onClose={(e)=>{setOpenPreviewMediaDialog(false);}}
                                        innerDialog={<PreviewFileMediaDialog
                                            agent_file_id={previewMediaRef.current?.agent_file_id}
                                            filename={previewMediaRef.current?.filename_text}
                                            onClose={(e)=>{setOpenPreviewMediaDialog(false);}} />}
                          />
                      }
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
