import React from 'react';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql, useMutation, useLazyQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {C2ProfileConfigDialog} from './C2ProfileConfigDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import {downloadFileFromMemory} from '../../utilities/Clipboard';
import {MythicDialogBody, MythicDialogButton, MythicDialogFooter, MythicDialogSection} from "../../MythicComponents/MythicDialogLayout";
import {MythicErrorState, MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";

export const containerListFilesQuery = gql`
query listC2ProfileFilesQuery($container_name: String!){
  containerListFiles(container_name: $container_name){
    status
    error
    files
  }
}
`;
export const containerWriteFileMutation = gql`
mutation setProfileConfiguration($container_name: String!, $file_path: String!, $data: String!) {
  containerWriteFile(container_name: $container_name, file_path: $file_path, data: $data) {
    status
    error
    filename
  }
}
`;
export const containerRemoveFileMutation = gql`
mutation removeContainerFileMutation($container_name: String!, $filename: String!) {
  containerRemoveFile(container_name: $container_name, filename: $filename) {
    status
    error
  }
}
`;
export const containerDownloadFileQuery = gql`
query getProfileConfigOutput($container_name: String!, $filename: String!) {
  containerDownloadFile(container_name: $container_name, filename: $filename) {
    status
    error
    filename
    data
  }
}
`;


export function C2ProfileListFilesDialog(props) {
    
    const { loading, error, data } = useQuery(containerListFilesQuery, {
        variables: {container_name: props.container_name},
        onCompleted: data => {
          
        },
        fetchPolicy: "network-only"
    });
    const [configSubmit] = useMutation(containerWriteFileMutation, {
      update: (cache, {data}) => {
          
      },
      onError: data => {
          console.error(data);
      },
      onCompleted: data => {
          //console.log(data);
          if(data.containerWriteFile.status === "success"){
              snackActions.success("Updated file");
          }else{
              snackActions.error("Error updating: " + data.containerWriteFile.error );
          }
      }
    });
    const onFileChange = (evt) => {
        for(let i = 0; i < evt.target.files.length; i++){
            const reader = new FileReader();
            reader.onload = (e) => {
                const contents = e.target.result;
                configSubmit({variables: {container_name: props.container_name, file_path: evt.target.files[i].name, data: btoa(contents)}});
            }
            reader.readAsBinaryString(evt.target.files[i]);
        }
  }
  
    if (loading) {
     return (
       <>
         <DialogTitle id="form-dialog-title">{props.container_name}'s Current Files</DialogTitle>
         <DialogContent dividers={true}>
           <MythicLoadingState title="Loading container files" description="Fetching files from the service container." minHeight={180} />
         </DialogContent>
       </>
     );
    }
    if (error) {
     console.error(error);
     return (
       <>
         <DialogTitle id="form-dialog-title">{props.container_name}'s Current Files</DialogTitle>
         <DialogContent dividers={true}>
           <MythicErrorState title="Unable to load container files" description={error.message} minHeight={180} />
         </DialogContent>
       </>
     );
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">
          <div className="mythic-dialog-title-row">
            <span>{props.container_name}'s Current Files</span>
            <Button
              className="mythic-dialog-title-action mythic-dialog-button-success"
              component="label"
              size="small"
              startIcon={<FileUploadIcon fontSize="small" />}
              variant="outlined"
            >
              Upload File
              <input onChange={onFileChange} type="file" multiple hidden />
            </Button>
          </div>
        </DialogTitle>
        <DialogContent dividers={true}>
          <MythicDialogBody compact>
            <MythicDialogSection title="Container Files" description="Download, edit, upload, or remove files from this installed service.">
          <TableContainer className="mythicElement">
            <Table stickyHeader size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "4rem"}}>Delete</TableCell>
                        <TableCell style={{width: "4rem"}}>Download</TableCell>
                        <TableCell style={{width: "4rem"}}>Edit</TableCell>
                        <TableCell>File</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                  {data.containerListFiles.files && data.containerListFiles.files.map( f => (
                    <C2ProfileListFilesDialogTableRow key={"file" + f} id={props.id} container_name={props.container_name} filename={f} />
                  ))}
                </TableBody>
            </Table>
        </TableContainer>
            </MythicDialogSection>
          </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
        </MythicDialogFooter>
  </React.Fragment>
  );
}

const C2ProfileListFilesDialogTableRow = ({container_name, id, filename}) => {
  const [openProfileConfigDialog, setOpenProfileConfigDialog] = React.useState(false);
  const [openDelete, setOpenDeleteDialog] = React.useState(false);
  const [configSubmit] = useMutation(containerWriteFileMutation, {
    update: (cache, {data}) => {
        
    },
    onError: data => {
        console.error(data);
    },
    onCompleted: data => {
        //console.log(data);
        if(data.containerWriteFile.status === "success"){
            snackActions.success("Updated file");
        }else{
            snackActions.error("Error updating: " + data.containerWriteFile.error );
        }
    }
  });
  const onConfigSubmit = (content) => {
    //console.log(content)
    configSubmit({variables: {container_name: container_name, file_path: filename, data: content}});
  }
  const [removeFile] = useMutation(containerRemoveFileMutation, {
    update: (cache, {data}) => {
        
    },
    onError: data => {
        console.error(data);
    },
    onCompleted: data => {
        //console.log(data);
        if(data.containerRemoveFile.status === "success"){
            snackActions.success("Removed file");
        }else{
            snackActions.error("Error removing: " + data.containerRemoveFile.error );
        }
    }
  });
  const onAcceptDelete = () => {
    removeFile({variables: {container_name: container_name, filename: filename}})
  }
  const [getContainerFile] = useLazyQuery(containerDownloadFileQuery, {
    onCompleted: data => {
      if(data.containerDownloadFile.status === "success"){
        downloadFileFromMemory(atob(data.containerDownloadFile.data), filename);
      } else {
        snackActions.error(data.containerDownloadFile.error);
      }
    },
    onError: error => {
      console.log(error);
      snackActions.error(error.message);
    }
  })
  const downloadFile = () => {
    getContainerFile({variables: {container_name: container_name, filename: filename}})
  }
  return (
    <React.Fragment>
      <TableRow hover>
        <TableCell>
          <MythicStyledTooltip title="Remove file">
            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={()=>{setOpenDeleteDialog(true);}} >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </MythicStyledTooltip>
        </TableCell>
        <TableCell>
          <MythicStyledTooltip title="Download file">
            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-success" size="small" onClick={downloadFile}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </MythicStyledTooltip>
        </TableCell>
        <TableCell>
          <MythicStyledTooltip title="Edit file">
            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small" onClick={() => {setOpenProfileConfigDialog(true);}}>
              <EditIcon fontSize="small" />
            </IconButton>
          </MythicStyledTooltip>
        </TableCell>
        <TableCell>{filename}</TableCell>
      </TableRow>
      {openProfileConfigDialog &&
        <MythicDialog fullWidth={true} maxWidth="lg" open={openProfileConfigDialog} 
          onClose={()=>{setOpenProfileConfigDialog(false);}} 
          innerDialog={<C2ProfileConfigDialog filename={filename} onConfigSubmit={onConfigSubmit} container_name={container_name} onClose={()=>{setOpenProfileConfigDialog(false);}} profile_id={id} />}
        />
        }
        {openDelete && 
          <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} 
            open={openDelete} 
            acceptText={"Remove"} 
            acceptColor={"error"} />
        }
      </React.Fragment>
  )
}
