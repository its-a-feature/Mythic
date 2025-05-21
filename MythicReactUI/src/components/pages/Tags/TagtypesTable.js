import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { TagtypesTableRow } from './TagtypesTableRow';
import {useTheme} from '@mui/material/styles';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {NewTagtypesDialog} from './NewTagtypesDialog';
import {gql, useMutation, useLazyQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import {downloadFileFromMemory} from '../../utilities/Clipboard';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";

const importTagtypesMutation = gql`
 mutation importMultipleTagtypes($tagtypes: String!) {
  importTagtypes(tagtypes: $tagtypes) {
    status
    error
  }
}
 `;

const exportTagtypesQuery = gql`
query getAllTagTypes {
    tagtype(order_by: {name: asc}) {
        color
        description
        name
    }
}
`;

export function TagtypesTable({tagtypes, onDeleteTagtype, onNewTag, onUpdateTagtype, me}){
    const theme = useTheme();
    const fileValue = React.useRef("");
    const [openNewDialog, setOpenNewDialog] = React.useState(false);
    const [importTagTypes] = useMutation(importTagtypesMutation, {
        update: (cache, {data}) => {
            console.log(data);
            if(data.importTagtypes.status === "success"){
                snackActions.success("Successfully loaded tagtypes");
            } else {
                snackActions.error(data.importTagtypes.error);
            }
        },
        onError: error => {
            console.log(error);
        }
      }); 
    const onFileChange = (evt) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const contents = e.target.result;
            try{
                importTagTypes({variables: {tagtypes: String(contents)}});
            }catch(error){
                snackActions.error("Failed to parse file as JSON")
            }

        }
        reader.readAsBinaryString(evt.target.files[0]);
    }
    const exportTagTypesSuccess = (data) => {
        let finalData = data.tagtype.map( c => {return {...c, __typename: undefined}})
        downloadFileFromMemory(JSON.stringify(finalData, null, 2), "tagtypes.json");
    }
    const exportTagTypesError = (data) => {
        console.log(data);
    }
    const exportTagtypes = useMythicLazyQuery(exportTagtypesQuery, {
    })
    const onClickExportTagTypes = (e) => {
        exportTagtypes({variables: {operation_id: me?.user?.current_operation_id || 0}})
            .then(({data}) => exportTagTypesSuccess(data)).catch(({data}) => exportTagTypesError(data));
    }
    return (
        <div style={{display: "flex", flexDirection: "column", width: "100%", height: "100%"}}>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main}} variant={"elevation"}>
                <Typography variant="h5" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    Types of Tags
                </Typography>
                <Button component="label" size={"small"}
                        style={{float:"right", marginRight: "5px", color: "white"}} >
                    <FileUploadIcon  /> {"Import"}
                    <input onChange={onFileChange} value={fileValue.current} type="file" hidden /> 
                </Button>
                <Button style={{float: "right", marginRight: "5px", color: "white"}} size={"small"}
                    onClick={onClickExportTagTypes}>
                    <FileDownloadIcon />Export</Button>
                <Button onClick={()=>setOpenNewDialog(true)} style={{float: "right", marginRight: "5px", color: "white"}}
                         size={"small"}>
                    <AddCircleIcon color={"success"} style={{backgroundColor: "white", borderRadius: "10px", marginRight: "3px"}} />New</Button>
                {openNewDialog &&
                    <MythicDialog fullWidth={true} maxWidth="md" open={openNewDialog}
                        onClose={()=>{setOpenNewDialog(false);}} 
                        innerDialog={<NewTagtypesDialog onClose={()=>{setOpenNewDialog(false);}} onSubmit={onNewTag} />}
                    />
                }
            </Paper>  
            <div style={{display: "flex", flexGrow: 1, overflow: "auto"}}>
                <TableContainer className="mythicElement">
                    <Table stickyHeader={true} size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{width: "3rem"}}>Delete</TableCell>
                                <TableCell style={{width: "3rem"}}>Modify</TableCell>
                                <TableCell style={{width: "7rem"}}>Instances</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Description</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                        
                        {tagtypes.map( (op) => (
                            <TagtypesTableRow
                                onDeleteTagtype={onDeleteTagtype}
                                onUpdateTagtype={onUpdateTagtype}
                                key={"tagtype" + op.id}
                                {...op}
                            />
                        ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </div>
    )
}

