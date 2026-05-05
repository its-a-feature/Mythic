import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { TagtypesTableRow } from './TagtypesTableRow';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {NewTagtypesDialog} from './NewTagtypesDialog';
import {gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import {downloadFileFromMemory} from '../../utilities/Clipboard';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {MythicToolbarButton} from "../../MythicComponents/MythicTableToolbar";
import {MythicTableEmptyState} from "../../MythicComponents/MythicStateDisplay";

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
    const tagTypeCountLabel = tagtypes.length === 1 ? "1 type" : `${tagtypes.length} types`;
    const tagInstanceCount = tagtypes.reduce((total, tagtype) => total + (tagtype.tags_aggregate?.aggregate?.count || 0), 0);
    const tagInstanceCountLabel = tagInstanceCount === 1 ? "1 tag" : `${tagInstanceCount} tags`;
    return (
        <>
            <MythicPageHeader
                title={"Types of Tags"}
                subtitle={"Create reusable tag types, import shared sets, and export operation taxonomy."}
                meta={
                    <>
                        <MythicPageHeaderChip label={tagTypeCountLabel} />
                        <MythicPageHeaderChip label={tagInstanceCountLabel} />
                    </>
                }
                actions={
                    <>
                        <MythicToolbarButton component="label" variant="outlined" color="primary" startIcon={<FileUploadIcon />}>
                            Import
                            <input onChange={onFileChange} value={fileValue.current} type="file" hidden />
                        </MythicToolbarButton>
                        <MythicToolbarButton variant="outlined" color="primary" onClick={onClickExportTagTypes} startIcon={<FileDownloadIcon />}>
                            Export
                        </MythicToolbarButton>
                        <MythicToolbarButton variant="contained" color="primary" onClick={()=>setOpenNewDialog(true)} startIcon={<AddCircleIcon />}>
                            Tag Type
                        </MythicToolbarButton>
                    </>
                }
            />
            {openNewDialog &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openNewDialog}
                    onClose={()=>{setOpenNewDialog(false);}}
                    innerDialog={<NewTagtypesDialog onClose={()=>{setOpenNewDialog(false);}} onSubmit={onNewTag} />}
                />
            }
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
                        {tagtypes.length === 0 &&
                            <MythicTableEmptyState
                                colSpan={5}
                                compact
                                title="No tag types"
                                description="Create or import tag types to standardize labels across Mythic."
                            />
                        }
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
        </>
    )
}
