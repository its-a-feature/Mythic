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

const blockListNameSort = (a, b) => (a.name || "").localeCompare(b.name || "");
const commandSort = (a, b) => (a?.command?.cmd || "").localeCompare(b?.command?.cmd || "");
const getPayloadTypeName = (row) => row?.command?.payloadtype?.name || "Unknown";
const groupBlockListRows = (rows = []) => {
    return rows.reduce((prev, row) => {
        const payloadTypeName = getPayloadTypeName(row);
        if(prev[payloadTypeName] === undefined){
            prev[payloadTypeName] = [];
        }
        prev[payloadTypeName].push(row);
        prev[payloadTypeName].sort(commandSort);
        return prev;
    }, {});
};
const mergeBlockListEntries = (existingEntries = {}, incomingEntries = {}) => {
    const mergedEntries = {...existingEntries};
    for(const [payloadTypeName, entries] of Object.entries(incomingEntries)){
        const entryMap = new Map((mergedEntries[payloadTypeName] || []).map((entry) => [entry.id, entry]));
        entries.forEach((entry) => entryMap.set(entry.id, entry));
        mergedEntries[payloadTypeName] = [...entryMap.values()].sort(commandSort);
    }
    return mergedEntries;
};
const addRowsToBlockLists = (currentBlockLists, rows) => {
    if(!rows || rows.length === 0){
        return currentBlockLists;
    }
    const blockListName = rows[0].name;
    const incomingEntries = groupBlockListRows(rows);
    let found = false;
    const updatedBlockLists = currentBlockLists.map((blockList) => {
        if(blockList.name !== blockListName){
            return {...blockList};
        }
        found = true;
        return {...blockList, entries: mergeBlockListEntries(blockList.entries, incomingEntries)};
    });
    if(!found){
        updatedBlockLists.push({name: blockListName, entries: incomingEntries});
    }
    return updatedBlockLists.sort(blockListNameSort);
};
const removeEntryIDsFromBlockLists = (currentBlockLists, blockListName, deletedIDs = []) => {
    if(deletedIDs.length === 0){
        return currentBlockLists;
    }
    const deletedIDSet = new Set(deletedIDs);
    return currentBlockLists.reduce((prev, blockList) => {
        if(blockList.name !== blockListName){
            return [...prev, {...blockList}];
        }
        const entries = Object.entries(blockList.entries || {}).reduce((entryPrev, [payloadTypeName, entries]) => {
            const filteredEntries = (entries || []).filter((entry) => !deletedIDSet.has(entry.id)).sort(commandSort);
            if(filteredEntries.length > 0){
                entryPrev[payloadTypeName] = filteredEntries;
            }
            return entryPrev;
        }, {});
        if(Object.keys(entries).length === 0){
            return prev;
        }
        return [...prev, {...blockList, entries}];
    }, []).sort(blockListNameSort);
};

export function CommandBlockListTable(props){
    const [openNew, setOpenNewDialog] = React.useState(false);
    const [blockLists, setBlockLists] = React.useState([]);
    const [newBlockListEntries] = useMutation(newBlockListEntry);
    const [deleteBlockList] = useMutation(deleteBlockListMutation);
    const [deleteBlockListEntries] = useMutation(deleteBlockListEntriesMutation);
    React.useEffect( () => {
        setBlockLists([...(props.blockLists || [])].sort(blockListNameSort));
    }, [props.blockLists])
    const onSubmitNewBlockList = async ({toAdd}) => {
        if(toAdd.length === 0){
            snackActions.warning("Select at least one command for the block list");
            return false;
        }
        try{
            const {data} = await newBlockListEntries({variables: {entries: toAdd}});
            const rows = data?.insert_disabledcommandsprofile?.returning || [];
            if(rows.length === 0){
                snackActions.warning("No block list entries were created");
                return false;
            }
            setBlockLists((current) => addRowsToBlockLists(current, rows));
            snackActions.success("Successfully created block list");
            return true;
        }catch(err){
            snackActions.warning("Unable to create new block list");
            console.log(err);
            return false;
        }
    }
    const onSubmitEdits = async ({toAdd, toRemove}) => {
        const removeEntryIDs = toRemove.map(c => c.command_id);
        if(toAdd.length === 0 && removeEntryIDs.length === 0){
            return true;
        }
        try{
            const [addResult, deleteResult] = await Promise.all([
                toAdd.length > 0 ? newBlockListEntries({variables: {entries: toAdd}}) : Promise.resolve(null),
                removeEntryIDs.length > 0 ? deleteBlockListEntries({variables: {entries: removeEntryIDs, name: toRemove[0].name}}) : Promise.resolve(null),
            ]);
            const addedRows = addResult?.data?.insert_disabledcommandsprofile?.returning || [];
            if(addedRows.length > 0){
                setBlockLists((current) => addRowsToBlockLists(current, addedRows));
            }
            if(deleteResult){
                const deleteData = deleteResult?.data?.deleteBlockListEntry;
                if(deleteData?.status !== "success"){
                    snackActions.error(deleteData?.error || "Unable to remove block list entries");
                    return false;
                }
                setBlockLists((current) => removeEntryIDsFromBlockLists(current, deleteData.name, deleteData.deleted_ids || []));
            }
            snackActions.success("Successfully updated block list");
            return true;
        }catch(err){
            snackActions.warning("Unable to update block list");
            console.log(err);
            return false;
        }
    }
    const onAcceptDelete = async ({name}) => {
        try{
            const {data} = await deleteBlockList({variables:{name}});
            if(data?.deleteBlockList?.status === "success"){
                setBlockLists((current) => current.filter((blockList) => blockList.name !== data.deleteBlockList.name));
                snackActions.success("Successfully deleted block list");
            }else{
                snackActions.error(data?.deleteBlockList?.error || "Unable to delete block list");
            }
        }catch(err){
            snackActions.warning("Unable to delete block list");
            console.log(err);
        }
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
                innerDialog={<EditBlockListDialog editable={true} currentSelected={{}} onSubmit={onSubmitNewBlockList} dialogTitle="Create New Block List" onClose={() => setOpenNewDialog(false)}
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
    const [openUpdate, setOpenUpdateDialog] = React.useState(false);
    const {blockedCommandDisplay, updatedEntries} = React.useMemo(() => {
        let newDisplay = [];
        let entries = {};
        for(const [key, value] of Object.entries(props.entries || {})){
            const entryRows = Array.isArray(value) ? value : [];
            const commands = entryRows.map((entry) => entry.command).filter(Boolean);
            const commandNames = commands.map((command) => command.cmd).sort().join(", ");
            newDisplay.push(
                {name: key, commands: commandNames}
            )
            entries[key] = commands;
        }
        return {blockedCommandDisplay: newDisplay, updatedEntries: entries};
    }, [props.entries])
    const onAcceptDelete = () => {
        setOpenDeleteDialog(false);
        props.onAcceptDelete({name: props.name})
    }
    const onSubmitEdits = ({toAdd, toRemove}) => {
        return props.onSubmitEdits({toAdd, toRemove})
    }
    return (
        <TableRow hover>
            <TableCell>
                <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={()=>{setOpenDeleteDialog(true);}}><DeleteIcon fontSize="small" /></IconButton>
                {openDelete &&
                    <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDelete}/>
                }
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
