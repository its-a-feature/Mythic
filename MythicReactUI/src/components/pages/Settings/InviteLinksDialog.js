import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
import {useMutation, useQuery, useLazyQuery, gql} from '@apollo/client';
import {snackActions} from "../../utilities/Snackbar";
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import MythicTextField from "../../MythicComponents/MythicTextField";
import {copyStringToClipboard} from "../../utilities/Clipboard";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import DialogContentText from '@mui/material/DialogContentText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Input from '@mui/material/Input';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {useTheme} from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';

const GetInviteLinks = gql`
query getOutstandingInviteLinks {
  getInviteLinks {
    status
    error
    links
  }
}
`;
const DeleteInviteLink = gql`
mutation deleteInviteLink($code: String!) {
    deleteInviteLink(code: $code){
        status
        error
    }
}
`;
const UpdateInviteLink = gql`
mutation UpdateInviteLink($code: String!, $total: Int!) {
    updateInviteLink(code: $code, total: $total){
        status
        error
    }
}
`;
const CreateInviteLink = gql`
mutation CreateInviteLink($operation_id: Int, $operation_role: String, $name: String, $short_code: String, $total: Int) {
    createInviteLink(total: $total, operation_role: $operation_role, operation_id: $operation_id, name: $name, short_code: $short_code){
        status
        error
        link
    }
}
`;
const getOperations = gql`
query getOperations {
    operation{
        name
        deleted
        complete
        id
    }
}
`;
export function InviteLinksDialog(props) {
    const theme = useTheme();
    const [inviteLinks, setInviteLinks] = React.useState([]);
    const [getInviteLinks] = useLazyQuery(GetInviteLinks, {fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.getInviteLinks.status === "error"){
                snackActions.error(data.getInviteLinks.error);
                return
            }
            const links = [...data.getInviteLinks.links];
            links.sort((a,b) => {
                let aDate = new Date(a);
                let bDate = new Date(b);
                return aDate > bDate ? -1 : bDate > aDate ? 1 : 0
            })
            links.sort((a,b) => a.valid ? -1 : b.valid ? 1 : 0)
            setInviteLinks(links);
        }
    });
    const operationDataRef = React.useRef({});
    useQuery(getOperations, {
        onCompleted: (result) => {
            operationDataRef.current = result.operation.reduce( (prev, cur) => {
                return {...prev, [cur.id]: cur.name}
            }, {});
        },
        onError: (err) => {
            console.log(err);
            snackActions.error("Unable to query operation data");
            props.onClose();
        }
    })
    const [deleteInviteLink] = useMutation(DeleteInviteLink, {
        onCompleted: (result) => {
            if(result.deleteInviteLink.status === "success"){
                getInviteLinks();
            } else {
                snackActions.error(result.deleteInviteLink.error);
            }
        },
        onError: (err) => {
            console.log(err);
            snackActions.error("Unable to update global without Admin permissions");
            props.onClose();
        }
    });
    const deletingCode = React.useRef("");
    const onDeleteInvite = (code) => {
        deletingCode.current = code;
        deleteInviteLink({variables: {code}});
    }
    const [openInviteLinksDialog, setOpenInviteLinksDialog] = React.useState(false);
    const selectedInviteRef = React.useRef({});
    const createInviteRef = React.useRef(true);
    const createInviteLink = () => {
        createInviteRef.current = true;
        selectedInviteRef.current = {};
        setOpenInviteLinksDialog(true);
    }
    const updateInviteLink = (invite) => {
        createInviteRef.current = false;
        selectedInviteRef.current = {...invite};
        setOpenInviteLinksDialog(true);
    }
    const onCloseInviteDialog = () => {
        getInviteLinks();
        setOpenInviteLinksDialog(false);
    }
    React.useEffect( () => {
        getInviteLinks();
    }, []);
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">
            Manage Outstanding Invite Links
            <MythicStyledTooltip tooltipStyle={{float: "right", display: "inline-block"}}
                                 title={"Generate invite link for somebody to create their own username/password"}>
                <Button onClick={createInviteLink} variant={"contained"}>
                    Generate Invite Link
                </Button>
            </MythicStyledTooltip>
        </DialogTitle>
        <DialogContentText>
            <b style={{marginLeft: "10px"}}>{"Note:"}</b> Invite links are deleted if Mythic restarts
        </DialogContentText>
        {openInviteLinksDialog &&
            <MythicDialog open={openInviteLinksDialog}
                          fullWidth={true}
                          onClose={()=>{setOpenInviteLinksDialog(false);}}
                          innerDialog={<CreateInviteLinksDialog onClose={onCloseInviteDialog}
                                                                create={createInviteRef.current}
                                                                existing_invite={selectedInviteRef.current}/>}
            />
        }
          <TableContainer  className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableHead>
                  <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Creator</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell style={{width: "9rem"}}>Usage</TableCell>
                      <TableCell style={{width: "3rem"}}>Link</TableCell>
                  </TableRow>
              </TableHead>
              <TableBody>
                  {inviteLinks.map( l => (
                      <TableRow hover key={l.code}>
                          <TableCell>
                              {l.valid &&
                                  <MythicStyledTooltip title={"Delete the invite link so it can't be used'"}>
                                      <IconButton size="small" disableFocusRipple={true}
                                                  disableRipple={true} onClick={()=>{onDeleteInvite(l.code);}} color="error" variant="contained">
                                          <DeleteIcon/></IconButton>
                                  </MythicStyledTooltip>
                              }
                              {!l.valid &&
                                  <MythicStyledTooltip title={"Restore the invite link so it can't be used'"}>
                                      <IconButton size="small" disableFocusRipple={true}
                                                  disableRipple={true} onClick={()=>{onDeleteInvite(l.code);}} color="success" variant="contained">
                                          <RestoreFromTrashOutlinedIcon/></IconButton>
                                  </MythicStyledTooltip>
                              }
                              <Typography style={{textDecoration: l.valid ? "" : "line-through", display: "inline-block"}}>
                                  {l.code}
                              </Typography>

                          </TableCell>
                          <TableCell>{l.name}</TableCell>
                          <TableCell>{l.operator}</TableCell>
                          <TableCell>
                              {l.operation_id > 0 &&
                                <Typography>
                                    {operationDataRef.current[l.operation_id]} as {l.operation_role}
                                </Typography>
                              }
                          </TableCell>
                          <TableCell>
                              <Typography style={{display: "inline-block", fontWeight: "600"}}
                                          color={l.used >= l.total ? theme.palette.error.main : theme.palette.success.main}>
                                  {l.used}
                              </Typography>
                              <Typography style={{display: "inline-block"}} color={"secondary"}>
                                  {" /"} {l.total}
                              </Typography>
                              <IconButton onClick={() => updateInviteLink(l)}>
                                  <EditIcon/>
                              </IconButton>
                          </TableCell>
                          <TableCell>
                              {l.valid &&
                                  <IconButton size={"small"} color={"success"} onClick={() => copyStringToClipboard(l.link)}>
                                        <ContentCopyIcon/>
                                  </IconButton>
                              }

                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
            </Table>
        </TableContainer>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Cancel
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

export function CreateInviteLinksDialog(props) {
    const [linkData, setLinkData] = React.useState({
        operation_id: props?.existing_invite?.operation_id || 0,
        operation_role: props?.existing_invite?.operation_role || "spectator",
        name: props?.existing_invite?.name || "",
        short_code: props?.existing_invite?.code || "",
        total: props?.existing_invite?.total || 1
    });
    const [operationOptions, setOperationOptions] = React.useState([]);
    const operatorRoleOptions = ["spectator", "operator"];
    useQuery(getOperations, {
        onCompleted: (result) => {
            const operations = result.operation.reduce( (prev, cur) => {
                if(cur.deleted || cur.complete){
                    return [...prev];
                }
                return [...prev, cur];
            }, []);
            operations.sort((a,b) => a.name < b.name ? -1 : b.name < a.name ? 1 : 0)
            setOperationOptions(operations);
        },
        onError: (err) => {
            console.log(err);
            snackActions.error("Unable to query operation data");
            props.onClose();
        }
    })
    const [createInviteLinkMutation] = useMutation(CreateInviteLink, {
        onCompleted: (result) => {
            if(result.createInviteLink.status === "success"){
                copyStringToClipboard(result.createInviteLink.link);
                snackActions.success("Successfully Created and link copied to clipboard!");
                props.onClose();
            } else {
                snackActions.error(result.createInviteLink.error);
            }
        },
        onError: (err) => {
            console.log(err);
            snackActions.error("Unable to create without global admin permissions");
            props.onClose();
        }
    });
    const [updateInviteLinkMutation] = useMutation(UpdateInviteLink, {
        onCompleted: (result) => {
            if(result.updateInviteLink.status === "success"){
                snackActions.success("Successfully Updated!");
                props.onClose();
            } else {
                snackActions.error(result.updateInviteLink.error);
            }
        },
        onError: (err) => {
            console.log(err);
            snackActions.error("Unable to update without Admin permissions");
            props.onClose();
        }
    })
    const onChangeText = (name, value, error) => {
        switch(name){
            case "name":
                setLinkData({...linkData, name: value});
                break;
            case "short_code":
                setLinkData({...linkData, short_code: value});
                break;
            case "total":
                let newInt = parseInt(value);
                if(newInt <= 1){
                    newInt = 1;
                }
                setLinkData({...linkData, total: newInt});
                break;
        }
    }
    const onChangeOperationID = (event) => {
        setLinkData({...linkData, operation_id: event.target.value});
    }
    const onChangeOperationRole = (event) => {
        setLinkData({...linkData, operation_role: event.target.value});
    }
    const submit = () => {
        if(props.create) {
            createInviteLinkMutation({variables: {...linkData}});
        } else {
            updateInviteLinkMutation({variables: {code: linkData.short_code, total: linkData.total}});
        }
    }
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">{props.create ? "Create" : "Update"} Invite Link</DialogTitle>
            <DialogContentText>
                <b style={{marginLeft: "10px"}}>{"Note:"}</b> Invite links are deleted if Mythic restarts
            </DialogContentText>
            <TableContainer >
                <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll", marginRight: "10px"}}>
                    <TableBody>
                        <TableRow hover>
                            <MythicStyledTableCell>Invite Code Name</MythicStyledTableCell>
                            <MythicStyledTableCell>
                                <MythicTextField onChange={onChangeText} name={"name"} value={linkData.name}
                                                 showLabel={false}
                                                 placeholder={"Descriptive name for link..."} disabled={!props.create} />
                            </MythicStyledTableCell>
                        </TableRow>
                        <TableRow hover>
                            <MythicStyledTableCell>Custom Invite Code</MythicStyledTableCell>
                            <MythicStyledTableCell>
                                <MythicTextField onChange={onChangeText} name={"short_code"} value={linkData.short_code}
                                                 showLabel={false}
                                                 placeholder={"Custom Invite Code..."} disabled={!props.create} />
                            </MythicStyledTableCell>
                        </TableRow>
                        <TableRow hover>
                            <MythicStyledTableCell>Assign to Operation</MythicStyledTableCell>
                            <MythicStyledTableCell>
                                <Select
                                    value={linkData.operation_id}
                                    disabled={!props.create}
                                    onChange={onChangeOperationID}
                                    input={<Input style={{width: "100%"}}/>}
                                >
                                    <MenuItem value={0}>Optionally Assign to Operation</MenuItem>
                                    {operationOptions.map( (opt) => (
                                        <MenuItem value={opt.id} key={opt.id}>{opt.name}</MenuItem>
                                    ) )}
                                </Select>
                            </MythicStyledTableCell>
                        </TableRow>
                        {linkData.operation_id > 0 &&
                            <TableRow hover>
                                <MythicStyledTableCell>Desired Role in Operation</MythicStyledTableCell>
                                <MythicStyledTableCell>
                                    <Select
                                        value={linkData.operation_role}
                                        disabled={!props.create}
                                        onChange={onChangeOperationRole}
                                        input={<Input style={{width: "100%"}}/>}
                                    >
                                        {operatorRoleOptions.map( (opt) => (
                                            <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                                        ) )}
                                    </Select>
                                </MythicStyledTableCell>
                            </TableRow>
                        }

                        <TableRow hover>
                            <MythicStyledTableCell>Total Uses</MythicStyledTableCell>
                            <MythicStyledTableCell>
                                <MythicTextField onChange={onChangeText} name={"total"} value={linkData.total}
                                                 showLabel={false} type={"Number"} />
                            </MythicStyledTableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            <DialogActions>
                <Button onClick={props.onClose} variant="contained" color="primary">
                    Cancel
                </Button>
                <Button onClick={submit} variant={"contained"} color="success" >
                    {props.create ? "Create" : "Update"}
                </Button>
            </DialogActions>
        </React.Fragment>
    );
}

