import React from 'react';
import {Button} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {EditBlockListDialog} from './EditBlockListDialog';
import {snackActions} from '../../utilities/Snackbar';
import {useMutation, gql} from '@apollo/client';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import EditIcon from '@mui/icons-material/Edit';
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {MythicToolbarButton} from "../../MythicComponents/MythicTableToolbar";
import {MythicTableEmptyState} from "../../MythicComponents/MythicStateDisplay";

const newBlockListEntry = gql`
mutation newBlockListsEntries($entries: [disabledcommandsprofile_insert_input!]!) {
    insert_disabledcommandsprofile(objects: $entries) {
        returning {
            id
            name
            command{
              id
              cmd
              payloadtype{
                name
              }
            }
        }
    }
}
`;
const deleteBlockListMutation = gql`
mutation deleteEntireBlockList($name: String!){
    deleteBlockList(name: $name){
        status
        error
        name
    }
}
`;
const deleteBlockListEntriesMutation = gql`
mutation deleteBlockListEntries($name: String!, $entries: [Int!]!){
    deleteBlockListEntry(name: $name, entries: $entries){
        status
        error
        name
        deleted_ids
    }
}
`;

export function CommandBlockListTable(props){
    const [openNew, setOpenNewDialog] = React.useState(false);
    const [blockLists, setBlockLists] = React.useState([]);
    const [newBlockListEntries] = useMutation(newBlockListEntry, {
        onCompleted: (data) => {
            const newBlockList = data.insert_disabledcommandsprofile.returning.reduce( (prev, cur) => {
                if(prev[cur.command.payloadtype.name] === undefined){
                    prev[cur.command.payloadtype.name] = [];
                }
                prev[cur.command.payloadtype.name].push(cur);
                return {...prev};
            }, {});
            // check if this is part of a new block list
            
            let currentBlockLists = [...blockLists];
            let found = false;
            const newBlockLists = currentBlockLists.map( cbl => {
                if(cbl["name"] === data.insert_disabledcommandsprofile.returning[0].name){
                    found = true;
                    // now we need to update cbl["entries"] based on the newBlockList dictionary
                    let newEntries = {};
                    for(const [key, value] of Object.entries(newBlockList)){
                        if(newEntries[key] === undefined){
                            newEntries[key] = [...value];
                        }else{
                            newEntries[key] = [...newEntries[key], ...value];
                        }
                    }
                    for(const [key, value] of Object.entries(cbl["entries"])){
                        if(newEntries[key] === undefined){
                            newEntries[key] = [...value];
                        }else{
                            newEntries[key] = [...newEntries[key], ...value];
                        }
                    }
                    return {...cbl, entries: newEntries};
                }else{
                    return {...cbl};
                }
            });
            if(!found){
                setBlockLists([...newBlockLists, {"name": data.insert_disabledcommandsprofile.returning[0].name, "entries": newBlockList}]);
            }else{
                setBlockLists([...newBlockLists]);
            }
        },
        onError: (err) => {
          snackActions.warning("Unable to create new block lists");
          console.log(err);
        }
    });
    const [deleteBlockList] = useMutation(deleteBlockListMutation, {
        onCompleted: (data) => {
            if(data.deleteBlockList.status === "success"){
                const filteredBlockLists = blockLists.filter( b => b.name !== data.deleteBlockList.name);
                setBlockLists(filteredBlockLists);
                snackActions.success("Successfully deleted block list");
            }else{
                snackActions.error(data.deleteBlockList.error);
            }
        },
        onError: (err) => {
            snackActions.warning("Unable to delete block list");
            console.log(err);
        }
    })
    const [deleteBlockListEntries] = useMutation(deleteBlockListEntriesMutation, {
        onCompleted: (data) => {
            if(data.deleteBlockListEntry.status === "success"){
                snackActions.success("Successfully deleted block list");
                let currentBlockLists = [...blockLists];
                const newBlockLists = currentBlockLists.map( cbl => {
                    if(cbl["name"] === data.deleteBlockListEntry.name){
                        // now we need to update cbl["entries"] based on the newBlockList dictionary
                        let newEntries = {};
                        for(const [key, value] of Object.entries(cbl["entries"])){
                            const filteredValues = value.filter( e => !data.deleteBlockListEntry.deleted_ids.includes(e.id));
                            newEntries[key] = filteredValues;
                        }
                        return {...cbl, entries: newEntries};
                    }else{
                        return {...cbl};
                    }
                });
                setBlockLists([...newBlockLists]);
            }else{
                snackActions.error(data.deleteBlockListEntry.error);
            }
        },
        onError: (err) => {
            snackActions.warning("Unable to delete block list");
            console.log(err);
        }
    })
    React.useEffect( () => {
        setBlockLists(props.blockLists);
    }, [props.blockLists])
    const onSubmitNewBlockList = ({toAdd}) => {
        newBlockListEntries({variables: {entries: toAdd}});
    }
    const onSubmitEdits = ({toAdd, toRemove}) => {
        if(toAdd.length > 0){
            newBlockListEntries({variables: {entries: toAdd}});
        }
        const removeEntryIDs = toRemove.map(c => c.command_id);
        if(removeEntryIDs.length > 0){
            deleteBlockListEntries({variables: {entries: removeEntryIDs, name: toRemove[0]["name"]}});
        }
        
    }
    const onAcceptDelete = ({name}) => {
        deleteBlockList({variables:{name}})
    }
    if(props?.me?.user?.current_operation_id === 0){
        return null;
    }
    const blockListCountLabel = blockLists.length === 1 ? "1 list" : `${blockLists.length} lists`;
    return (
        <>
        <MythicPageHeader
            title={"Command Block Lists"}
            subtitle={"Control which commands are blocked for selected payload types."}
            meta={<MythicPageHeaderChip label={blockListCountLabel} />}
            actions={
                <MythicToolbarButton variant="contained" color="primary" onClick={()=>{setOpenNewDialog(true);}} startIcon={<AddCircleIcon />}>
                    Block List
                </MythicToolbarButton>
            }
        />
        {openNew &&
            <MythicDialog open={openNew} fullWidth={true} maxWidth="lg"
                onClose={()=>{setOpenNewDialog(false);}}
                innerDialog={<EditBlockListDialog editable={true} currentSelected={[]} onSubmit={onSubmitNewBlockList} dialogTitle="Create New Block List" onClose={() => setOpenNewDialog(false)}
                />}
            />
        }
        <TableContainer className="mythicElement">
            <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "2rem"}}></TableCell>
                        <TableCell style={{width: "7rem"}}>Modify</TableCell>
                        <TableCell style={{width: "15rem"}}>Name</TableCell>
                        <TableCell >Blocked Commands</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {blockLists.length === 0 &&
                        <MythicTableEmptyState
                            colSpan={4}
                            compact
                            title="No command block lists"
                            description="Create a block list to prevent selected commands from being used in this operation."
                        />
                    }
                    {
                        blockLists.map( b => (
                            <CommandBlockListTableRow key={b.name} {...b} onAcceptDelete={onAcceptDelete} onSubmitEdits={onSubmitEdits}/>
                        ))
                    }
                </TableBody>
            </Table>
        </TableContainer>
    </>
    )
}

function CommandBlockListTableRow(props){
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const [blockedCommandDisplay, setBlockedCommandDisplay] = React.useState([]);
    const [openUpdate, setOpenUpdateDialog] = React.useState(false);
    const [updatedEntries, setUpdatedEntries] = React.useState({});
    React.useEffect(() => {
        let newDisplay = [];
        let entries = {};
        for(const [key, value] of Object.entries(props.entries)){
            const commandNames = value.map(c => c.command.cmd).sort().join(", ");
            newDisplay.push(
                {name: key, commands: commandNames}
            )
            entries[key] = value.map(c => c.command);
        }
        setUpdatedEntries(entries);
        setBlockedCommandDisplay(newDisplay);
    }, [props.entries])
    const onAcceptDelete = () => {
        setOpenDeleteDialog(false);
        props.onAcceptDelete({name: props.name})
    }
    const onSubmitEdits = ({toAdd, toRemove}) => {
        props.onSubmitEdits({toAdd, toRemove})
    }
    return (
        <TableRow hover>
            <TableCell>
                <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={()=>{setOpenDeleteDialog(true);}}><DeleteIcon fontSize="small" /></IconButton>
                <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDelete}/>
            </TableCell>
            <TableCell>
                <Button className="mythic-table-row-action" size="small" onClick={()=>{setOpenUpdateDialog(true);}} startIcon={<EditIcon/>} variant="outlined">Edit</Button>
                {openUpdate &&
                    <MythicDialog open={openUpdate} fullWidth maxWidth={"lg"}
                        onClose={()=>{setOpenUpdateDialog(false);}} 
                        innerDialog={<EditBlockListDialog editable={false} blockListName={props.name} currentSelected={updatedEntries} onSubmit={onSubmitEdits} dialogTitle="Edit Block List" onClose={() => setOpenUpdateDialog(false)}
                        />}
                    />
                }
                
            </TableCell>
            <TableCell>{props.name}</TableCell>
            <TableCell>
                {blockedCommandDisplay.map( b => (
                    <div key={props.name + b.name}>{b.name} - {b.commands}</div>
                    
                ))}
            </TableCell>
        </TableRow>
    )
}
