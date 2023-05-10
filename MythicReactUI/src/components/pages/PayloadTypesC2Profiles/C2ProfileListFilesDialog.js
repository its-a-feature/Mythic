import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql, useMutation, useLazyQuery} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
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

const listC2ProfileFilesQuery = gql`
query listC2ProfileFilesQuery($id: Int!){
  c2profileListFiles(id: $id){
    status
    error
    files
  }
}
`;
const setProfileConfigMutation = gql`
mutation setProfileConfiguration($id: Int!, $file_path: String!, $data: String!) {
  uploadContainerFile(id: $id, file_path: $file_path, data: $data) {
    status
    error
    filename
  }
}
`;
const removeFileMutation = gql`
mutation removeContainerFileMutation($id: Int!, $filename: String!) {
  removeContainerFile(id: $id, filename: $filename) {
    status
    error
  }
}
`;
const getProfileConfigQuery = gql`
query getProfileConfigOutput($id: Int!, $filename: String!) {
  downloadContainerFile(id: $id, filename: $filename) {
    status
    error
    filename
    data
  }
}
`;


export function C2ProfileListFilesDialog(props) {
    
    const { loading, error, data } = useQuery(listC2ProfileFilesQuery, {
        variables: {id: props.id},
        onCompleted: data => {
          
        },
        fetchPolicy: "network-only"
    });
    const [configSubmit] = useMutation(setProfileConfigMutation, {
      update: (cache, {data}) => {
          
      },
      onError: data => {
          console.error(data);
      },
      onCompleted: data => {
          //console.log(data);
          if(data.uploadContainerFile.status === "success"){
              snackActions.success("Updated file");
          }else{
              snackActions.error("Error updating: " + data.uploadContainerFile.error );
          }
      }
    });
    const onFileChange = (evt) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const contents = e.target.result;
          configSubmit({variables: {id: props.id, file_path: evt.target.files[0].name, data: btoa(contents)}});
      }
      reader.readAsBinaryString(evt.target.files[0]);
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
        <DialogTitle id="form-dialog-title">{props.name}'s Current Files
          <Button color="success" size="small" style={{float: "right"}} variant="contained" component="label">
            <FileUploadIcon /> Upload File
            <input onChange={onFileChange} type="file" hidden /> 
          </Button>
        </DialogTitle>
          <TableContainer component={Paper}>
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
                  {data.c2profileListFiles.files && data.c2profileListFiles.files.map( f => (
                    <C2ProfileListFilesDialogTableRow id={props.id} name={props.name} filename={f} />
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

const C2ProfileListFilesDialogTableRow = ({name, id, filename}) => {
  const [openProfileConfigDialog, setOpenProfileConfigDialog] = React.useState(false);
  const [openDelete, setOpenDeleteDialog] = React.useState(false);
  const [configSubmit] = useMutation(setProfileConfigMutation, {
    update: (cache, {data}) => {
        
    },
    onError: data => {
        console.error(data);
    },
    onCompleted: data => {
        //console.log(data);
        if(data.uploadContainerFile.status === "success"){
            snackActions.success("Updated file");
        }else{
            snackActions.error("Error updating: " + data.uploadContainerFile.error );
        }
    }
  });
  const onConfigSubmit = (content) => {
    //console.log(content)
    configSubmit({variables: {id: id, file_path: filename, data: content}});
  }
  const [removeFile] = useMutation(removeFileMutation, {
    update: (cache, {data}) => {
        
    },
    onError: data => {
        console.error(data);
    },
    onCompleted: data => {
        //console.log(data);
        if(data.removeContainerFile.status === "success"){
            snackActions.success("Removed file");
        }else{
            snackActions.error("Error removing: " + data.removeContainerFile.error );
        }
    }
  });
  const onAcceptDelete = () => {
    removeFile({variables: {id: id, filename: filename}})
  }
  const [getContainerFile] = useLazyQuery(getProfileConfigQuery, {
    onCompleted: data => {
      if(data.downloadContainerFile.status === "success"){
        downloadFileFromMemory(atob(data.downloadContainerFile.data), filename);
      } else {
        snackActions.error(data.downloadContainerFile.error);
      }
    },
    onError: error => {
      console.log(error);
      snackActions.error(error.message);
    }
  })
  const downloadFile = () => {
    getContainerFile({variables: {id: id, filename: filename}})
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
          innerDialog={<C2ProfileConfigDialog filename={filename} onConfigSubmit={onConfigSubmit} payload_name={name} onClose={()=>{setOpenProfileConfigDialog(false);}} profile_id={id} />}
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

