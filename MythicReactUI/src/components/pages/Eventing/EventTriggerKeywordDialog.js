import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {useMutation, gql} from '@apollo/client';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {IconButton} from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import DeleteIcon from '@mui/icons-material/Delete';
import {TextField} from '@mui/material';
import {snackActions} from "../../utilities/Snackbar";

const triggerKeywordMutation = gql(`
mutation triggerKeywordMutation($keyword: String!, $keywordEnvData: jsonb!){
    eventingTriggerKeyword(keyword: $keyword, keywordEnvData: $keywordEnvData){
        status
        error
    }   
}
`);

export function EventTriggerKeywordDialog({onClose, selectedEventGroup}) {
    const [selectedKeyword, setSelectedKeyword] = React.useState(selectedEventGroup?.keywords?.[0] || "");
    const [dictionaryData, setDictionaryData] = React.useState([]);
    const typeOptions = ["text", "number"];
    const [triggerKeyword] = useMutation(triggerKeywordMutation, {
        onCompleted: (data) => {
            if(data.eventingTriggerKeyword.status === "success"){
                snackActions.success("Successfully initiated trigger");
                onClose();
            } else {
                snackActions.error(data.eventingTriggerKeyword.error);
            }
        },
        onError: (data) => {
            console.log(data);
        }
    })
    const handleKeywordChange = (event) => {
        setSelectedKeyword(event.target.value);
    }
    const addRow = () => {
        setDictionaryData([...dictionaryData, {
            "type": "text",
            "key": "",
            "value": "",
        }])
    }
    const changeRowType = (event, index) => {
        let newType = event.target.value;
        const newDictionaryData = dictionaryData.map( (row, i) => {
            if(index === i){
                return {key: row["key"], type: newType, value: newType === "number" ? 0 : ""};
            }
            return {...row};
        });
        setDictionaryData(newDictionaryData);
    }
    const removeRow = (index) => {
        let newDictionaryData = [...dictionaryData];
        newDictionaryData.splice(index, 1);
        setDictionaryData(newDictionaryData);
    }
    const onChangeRowKey = (value, index) => {
        const newDictionaryData = dictionaryData.map( (e, i) => {
            if(index === i){
                return {...e, key: value};
            }
            return {...e};
        });
        setDictionaryData(newDictionaryData);
    }
    const onChangeRowValue = (value, index) => {
        const newDictionaryData = dictionaryData.map( (e, i) => {
            if(index === i){
                return {...e, value: value};
            }
            return {...e};
        });
        setDictionaryData(newDictionaryData);
    }
    const onSubmit = () => {
        const keywordEnvData = dictionaryData.reduce( (prev, cur) => {
            try{
                if(cur.type === "number"){
                    prev[cur.key] = parseInt(cur.value);
                } else {
                    prev[cur.key] = cur.value;
                }
            }catch(error){
                prev[cur.key] = cur.value;
            }
            return {...prev};
        }, {});
        triggerKeyword({variables: {keyword: selectedKeyword, keywordEnvData:keywordEnvData}});
    }
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">Trigger a workflow by keyword</DialogTitle>
            <DialogContent dividers={true} style={{maxHeight: "calc(70vh)"}}>
                <DialogContentText>
                    Send a dictionary of data when triggering this workflow by a specific keyword.
                </DialogContentText>
                <Select
                    style={{marginBottom: "10px", width: "100%"}}
                    value={selectedKeyword}
                    onChange={handleKeywordChange}
                >
                    {
                        selectedEventGroup.keywords.map((opt, i) => (
                            <MenuItem key={"keyword" + opt} value={opt}>{opt}</MenuItem>
                        ))
                    }
                </Select>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{width: "50%"}}>Key</TableCell>
                            <TableCell>Value</TableCell>
                        </TableRow>
                        {dictionaryData.map( (e, index) => (
                            <TableRow key={"dictionarydata" + index}>
                                <MythicStyledTableCell style={{display: "flex"}} >
                                    <IconButton color={"error"} onClick={() => removeRow(index)} >
                                        <DeleteIcon />
                                    </IconButton>
                                    <Select
                                        style={{}}
                                        value={e.type}
                                        onChange={(evt) => changeRowType(evt, index)}
                                    >
                                        {
                                            typeOptions.map((opt, i) => (
                                                <MenuItem key={"type" + opt} value={opt}>{opt}</MenuItem>
                                            ))
                                        }
                                    </Select>
                                    <TextField value={e.key}
                                               style={{width: "100%"}}
                                               onChange={(evt) => onChangeRowKey(evt.target.value, index)} />
                                </MythicStyledTableCell>
                                <MythicStyledTableCell>
                                    <TextField value={e.value}
                                               style={{width: "100%"}}
                                               onChange={(evt) => onChangeRowValue(evt.target.value, index)} />
                                </MythicStyledTableCell>
                            </TableRow>
                        ))}
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <MythicStyledTableCell>
                                <Button onClick={addRow} color={"success"}>
                                    Add Entry
                                </Button>
                            </MythicStyledTableCell>
                            <MythicStyledTableCell></MythicStyledTableCell>
                        </TableRow>
                    </TableBody>
                </Table>

            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
                <Button onClick={onSubmit} variant="contained" color="success">
                    Submit
                </Button>
            </DialogActions>
        </React.Fragment>
    );
}