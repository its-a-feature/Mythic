import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql, useMutation, useLazyQuery} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
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
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error! {error.message}</div>;
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.container_name}'s Current Files
          <Button color="success" size="small" style={{float: "right"}} variant="contained" component="label">
            <FileUploadIcon /> Upload File
            <input onChange={onFileChange} type="file" multiple hidden />
          </Button>
        </DialogTitle>
          <TableContainer >
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
        
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
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
          <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} ><DeleteIcon color="error" /></IconButton>
        </TableCell>
        <TableCell>
          <IconButton size="small" onClick={downloadFile}><DownloadIcon color="success" /></IconButton>
        </TableCell>
        <TableCell>
          <IconButton size="small" onClick={() => {setOpenProfileConfigDialog(true);}}><EditIcon color="info" /></IconButton>
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

