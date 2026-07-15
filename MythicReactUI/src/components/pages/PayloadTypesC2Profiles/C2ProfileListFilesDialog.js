import React from 'react';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {useQuery, gql, useMutation, useLazyQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {C2ProfileConfigDialog} from './C2ProfileConfigDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import IconButton from '@mui/material/IconButton';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FolderIcon from '@mui/icons-material/Folder';
import HomeIcon from '@mui/icons-material/Home';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import RefreshIcon from '@mui/icons-material/Refresh';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import {downloadFileFromMemory} from '../../utilities/Clipboard';
import {MythicDialogBody, MythicDialogButton, MythicDialogFooter, MythicDialogSection} from "../../MythicComponents/MythicDialogLayout";
import {MythicErrorState, MythicLoadingState} from "../../MythicComponents/MythicStateDisplay";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";

export const containerListFilesQuery = gql`
query listC2ProfileFilesQuery($container_name: String!, $path: String){
  containerListFiles(container_name: $container_name, path: $path){
    status
    error
    files
    folders
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

const normalizePath = (path) => {
  if (!path) {
    return "";
  }
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
};

const joinBrowserPath = (basePath, name) => {
  const base = normalizePath(basePath);
  const child = normalizePath(name);
  return base ? `${base}/${child}` : child;
};

const parentPath = (path) => {
  const parts = normalizePath(path).split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
};

const sortNames = (names) => [...new Set(names || [])].sort((a, b) => a.localeCompare(b, undefined, {sensitivity: "base"}));

const decodeBase64Binary = (data) => {
  const value = data || "";
  const paddingLength = (4 - (value.length % 4)) % 4;
  return atob(`${value}${"=".repeat(paddingLength)}`);
};

const fileBrowserContentSx = {
  height: {xs: "60vh", md: "64vh"},
  minHeight: {sm: "28rem"},
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const fileBrowserBodySx = {
  flex: "1 1 auto",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};

const fileBrowserSectionSx = {
  flex: "1 1 auto",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};

const fileBrowserTableSx = {
  flex: "1 1 auto",
  minHeight: 0,
  overflow: "auto",
};

const BrowserPath = ({path, onChangePath}) => {
  const parts = normalizePath(path).split("/").filter(Boolean);
  return (
    <Box sx={{display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1}}>
      <Breadcrumbs aria-label="container file path" maxItems={5} sx={{minWidth: 0}}>
        <Link
          component="button"
          underline="hover"
          color={parts.length === 0 ? "text.primary" : "inherit"}
          onClick={() => onChangePath("")}
          sx={{display: "inline-flex", alignItems: "center", gap: 0.5, font: "inherit"}}
        >
          <HomeIcon fontSize="small" />
          root
        </Link>
        {parts.map((part, index) => {
          const targetPath = parts.slice(0, index + 1).join("/");
          const isLast = index === parts.length - 1;
          if (isLast) {
            return (
              <Typography key={targetPath} color="text.primary" sx={{display: "inline-flex", alignItems: "center", minWidth: 0}}>
                {part}
              </Typography>
            );
          }
          return (
            <Link
              component="button"
              key={targetPath}
              underline="hover"
              color="inherit"
              onClick={() => onChangePath(targetPath)}
              sx={{font: "inherit"}}
            >
              {part}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export function C2ProfileListFilesDialog(props) {
  const [currentPath, setCurrentPath] = React.useState("");
  const normalizedCurrentPath = normalizePath(currentPath);
  const { loading, error, data, refetch } = useQuery(containerListFilesQuery, {
    variables: {container_name: props.container_name, path: normalizedCurrentPath},
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });
  const [configSubmit] = useMutation(containerWriteFileMutation, {
    onError: data => {
      console.error(data);
    },
    onCompleted: data => {
      if(data.containerWriteFile.status === "success"){
        snackActions.success("Updated file");
        refetch();
      }else{
        snackActions.error("Error updating: " + data.containerWriteFile.error );
      }
    }
  });
  const onFileChange = (evt) => {
    Array.from(evt.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const contents = e.target.result;
        configSubmit({
          variables: {
            container_name: props.container_name,
            file_path: joinBrowserPath(normalizedCurrentPath, file.name),
            data: btoa(contents),
          }
        });
      };
      reader.readAsBinaryString(file);
    });
    evt.target.value = "";
  };
  const onChangePath = React.useCallback((path) => {
    setCurrentPath(normalizePath(path));
  }, []);
  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);
  const listResponse = data?.containerListFiles;
  const folders = React.useMemo(() => sortNames(listResponse?.folders), [listResponse?.folders]);
  const files = React.useMemo(() => {
    const folderSet = new Set(folders);
    return sortNames(listResponse?.files).filter((name) => !folderSet.has(name));
  }, [folders, listResponse?.files]);
  const isInitialLoading = loading && !data;

  if (isInitialLoading) {
    return (
      <>
        <DialogTitle id="form-dialog-title">{props.container_name}'s Current Files</DialogTitle>
        <DialogContent dividers={true} sx={fileBrowserContentSx}>
          <Box sx={{flex: "1 1 auto", display: "flex", alignItems: "center"}}>
            <MythicLoadingState title="Loading container files" description="Fetching files from the service container." minHeight={180} />
          </Box>
        </DialogContent>
      </>
    );
  }
  if (error) {
    console.error(error);
    return (
      <>
        <DialogTitle id="form-dialog-title">{props.container_name}'s Current Files</DialogTitle>
        <DialogContent dividers={true} sx={fileBrowserContentSx}>
          <Box sx={{flex: "1 1 auto", display: "flex", alignItems: "center"}}>
            <MythicErrorState title="Unable to load container files" description={error.message} minHeight={180} />
          </Box>
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
            className="mythic-dialog-title-action mythic-action-tone-hover mythic-tone-success"
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
      <DialogContent dividers={true} sx={fileBrowserContentSx}>
        <MythicDialogBody compact sx={fileBrowserBodySx}>
          <MythicDialogSection
            title="Container Files"
            sx={fileBrowserSectionSx}
            actions={
              <Box sx={{display: "flex", alignItems: "center", gap: 0.5}}>
                <MythicStyledTooltip title="Parent folder">
                  <span>
                    <IconButton
                      className="mythic-compact-icon-action mythic-action-tone-hover mythic-tone-info"
                      disabled={normalizedCurrentPath === ""}
                      onClick={() => onChangePath(parentPath(normalizedCurrentPath))}
                      size="small"
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </MythicStyledTooltip>
                <MythicStyledTooltip title="Refresh folder">
                  <IconButton
                    className="mythic-compact-icon-action mythic-action-tone-hover mythic-tone-info"
                    onClick={onRefresh}
                    size="small"
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </MythicStyledTooltip>
              </Box>
            }
          >
            <Box sx={{display: "flex", alignItems: "center", gap: 1, minWidth: 0, mb: 1}}>
              <BrowserPath path={normalizedCurrentPath} onChangePath={onChangePath} />
            </Box>
            {listResponse?.status === "error" ? (
              <Box sx={{flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "center"}}>
                <MythicErrorState title="Unable to load folder" description={listResponse.error} minHeight={180} />
              </Box>
            ) : (
              <TableContainer className="mythicElement" sx={fileBrowserTableSx}>
                <Table stickyHeader size="small" style={{maxWidth: "100%"}}>
                  <TableHead>
                    <TableRow>
                      <TableCell style={{width: "3rem"}} />
                      <TableCell>Name</TableCell>
                      <TableCell style={{width: "6rem"}}>Type</TableCell>
                      <TableCell align="right" style={{width: "9rem"}}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {folders.map((folder) => (
                      <ContainerFolderRow
                        key={`folder-${normalizedCurrentPath}-${folder}`}
                        folder={folder}
                        onOpen={() => onChangePath(joinBrowserPath(normalizedCurrentPath, folder))}
                      />
                    ))}
                    {files.map((file) => (
                      <C2ProfileListFilesDialogTableRow
                        key={`file-${normalizedCurrentPath}-${file}`}
                        id={props.id}
                        container_name={props.container_name}
                        displayName={file}
                        filename={joinBrowserPath(normalizedCurrentPath, file)}
                        onRefresh={onRefresh}
                      />
                    ))}
                    {folders.length === 0 && files.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography color="text.secondary" sx={{py: 3, textAlign: "center"}}>
                            Empty folder
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
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

const ContainerFolderRow = ({folder, onOpen}) => {
  return (
    <TableRow hover onDoubleClick={onOpen} sx={{cursor: "pointer"}}>
      <TableCell>
        <FolderIcon color="primary" fontSize="small" />
      </TableCell>
      <TableCell>
        <Button
          endIcon={<KeyboardArrowRightIcon fontSize="small" />}
          onClick={onOpen}
          size="small"
          sx={{justifyContent: "flex-start", minWidth: 0, px: 0.5, textTransform: "none"}}
          variant="text"
        >
          {folder}
        </Button>
      </TableCell>
      <TableCell>Folder</TableCell>
      <TableCell align="right" />
    </TableRow>
  );
};

const C2ProfileListFilesDialogTableRow = ({container_name, id, filename, displayName, onRefresh}) => {
  const [openProfileConfigDialog, setOpenProfileConfigDialog] = React.useState(false);
  const [openDelete, setOpenDeleteDialog] = React.useState(false);
  const [configSubmit] = useMutation(containerWriteFileMutation, {
    onError: data => {
      console.error(data);
    },
    onCompleted: data => {
      if(data.containerWriteFile.status === "success"){
        snackActions.success("Updated file");
        onRefresh();
      }else{
        snackActions.error("Error updating: " + data.containerWriteFile.error );
      }
    }
  });
  const onConfigSubmit = (content) => {
    configSubmit({variables: {container_name: container_name, file_path: filename, data: content}});
  };
  const [removeFile] = useMutation(containerRemoveFileMutation, {
    onError: data => {
      console.error(data);
    },
    onCompleted: data => {
      if(data.containerRemoveFile.status === "success"){
        snackActions.success("Removed file");
        onRefresh();
      }else{
        snackActions.error("Error removing: " + data.containerRemoveFile.error );
      }
    }
  });
  const onAcceptDelete = () => {
    removeFile({variables: {container_name: container_name, filename: filename}});
  };
  const [getContainerFile] = useLazyQuery(containerDownloadFileQuery, {
    onCompleted: data => {
      if(data.containerDownloadFile.status === "success"){
        downloadFileFromMemory(decodeBase64Binary(data.containerDownloadFile.data), displayName || filename);
      } else {
        snackActions.error(data.containerDownloadFile.error);
      }
    },
    onError: error => {
      console.log(error);
      snackActions.error(error.message);
    }
  });
  const downloadFile = () => {
    getContainerFile({variables: {container_name: container_name, filename: filename}});
  };
  return (
    <React.Fragment>
      <TableRow hover>
        <TableCell>
          <InsertDriveFileIcon color="action" fontSize="small" />
        </TableCell>
        <TableCell>{displayName || filename}</TableCell>
        <TableCell>File</TableCell>
        <TableCell align="right">
          <MythicStyledTooltip title="Remove file">
            <IconButton className="mythic-compact-icon-action mythic-action-tone-hover mythic-tone-error" size="small" onClick={()=>{setOpenDeleteDialog(true);}} >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </MythicStyledTooltip>
          <MythicStyledTooltip title="Download file">
            <IconButton className="mythic-compact-icon-action mythic-icon-tone mythic-tone-success" size="small" onClick={downloadFile}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </MythicStyledTooltip>
          <MythicStyledTooltip title="Edit file">
            <IconButton className="mythic-compact-icon-action mythic-action-tone-hover mythic-tone-info" size="small" onClick={() => {setOpenProfileConfigDialog(true);}}>
              <EditIcon fontSize="small" />
            </IconButton>
          </MythicStyledTooltip>
        </TableCell>
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
  );
};
