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
import AddIcon from '@mui/icons-material/Add';
import {downloadFileFromMemory} from '../../utilities/Clipboard';

const importTagtypesMutation = gql`
 mutation importMultipleTagtypes($tagtypes: String!) {
  importTagtypes(tagtypes: $tagtypes) {
    status
    error
  }
}
 `;

const exportTagtypesQuery = gql`
query getAllTagTypes($operation_id: Int!) {
    tagtype(where: {operation_id: {_eq: $operation_id}}) {
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
    const [exportTagtypes] = useLazyQuery(exportTagtypesQuery, {
        onCompleted: data => {
            console.log(data);
            // remove __typename entry from each tagtype field
            let finalData = data.tagtype.map( c => {return {...c, __typename: undefined}})
            downloadFileFromMemory(JSON.stringify(finalData, null, 2), "tagtypes.json");
        },
        onError: error => {
            console.log(error);
        }
    })
    return (
        <div style={{display: "flex", flexDirection: "column", width: "100%", height: "100%"}}>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    Types of Tags
                </Typography>
                <Button variant="contained" component="label" style={{float:"right", marginTop: "5px", marginRight: "5px"}} color="success"> 
                    <FileUploadIcon /> {"Import"}
                    <input onChange={onFileChange} value={fileValue.current} type="file" hidden /> 
                </Button>
                <Button style={{float: "right", marginTop: "5px", marginRight: "5px"}} color="success" variant='contained' 
                    onClick={() => exportTagtypes({variables: {operation_id: me?.user?.current_operation_id || 0}})}>
                    <FileDownloadIcon />Export</Button>
                <Button onClick={()=>setOpenNewDialog(true)} style={{float: "right", marginTop: "5px", marginRight: "5px"}} color="success" variant='contained'>
                    <AddIcon />New</Button>
                {openNewDialog &&
                    <MythicDialog fullWidth={true} maxWidth="sm" open={openNewDialog} 
                        onClose={()=>{setOpenNewDialog(false);}} 
                        innerDialog={<NewTagtypesDialog onClose={()=>{setOpenNewDialog(false);}} onSubmit={onNewTag} />}
                    />
                }
            </Paper>  
            <div style={{display: "flex", flexGrow: 1, overflow: "auto"}}>
                <TableContainer component={Paper} className="mythicElement">
                    <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{width: "4rem"}}>Delete</TableCell>
                                <TableCell style={{width: "6rem"}}>Modify</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Tag Number</TableCell>
                                <TableCell>Color</TableCell>
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

