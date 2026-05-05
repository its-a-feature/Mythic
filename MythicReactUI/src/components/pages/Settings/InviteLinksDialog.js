import React from 'react';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
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
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import MythicTextField from "../../MythicComponents/MythicTextField";
import {copyStringToClipboard} from "../../utilities/Clipboard";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {useTheme} from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicDialogSection,
    MythicFormField,
    MythicFormGrid,
    MythicFormNote
} from "../../MythicComponents/MythicDialogLayout";

const GetInviteLinks = gql`
query getOutstandingInviteLinks {
  getInviteLinks {
    status
    error
    links
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
            <div className="mythic-dialog-title-row">
                <span>Manage Outstanding Invite Links</span>
                <MythicStyledTooltip tooltipStyle={{display: "inline-flex"}}
                                     title={"Generate invite link for somebody to create their own username/password"}>
                    <Button className="mythic-dialog-title-action" onClick={createInviteLink} size="small" variant="outlined">
                        Generate Invite Link
                    </Button>
                </MythicStyledTooltip>
            </div>
        </DialogTitle>
        {openInviteLinksDialog &&
            <MythicDialog open={openInviteLinksDialog}
                          fullWidth={true}
                          onClose={()=>{setOpenInviteLinksDialog(false);}}
                          innerDialog={<CreateInviteLinksDialog onClose={onCloseInviteDialog}
                                                                create={createInviteRef.current}
                                                                existing_invite={selectedInviteRef.current}/>}
            />
        }
        <DialogContent dividers={true}>
            <MythicDialogBody>
                <MythicDialogSection
                    title="Outstanding Links"
                    description="Invite links are temporary and are deleted if Mythic restarts."
                >
                    <TableContainer className="mythicElement">
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
                                            <IconButton size="small" onClick={() => updateInviteLink(l)}>
                                                <EditIcon fontSize="small"/>
                                            </IconButton>
                                        </TableCell>
                                        <TableCell>
                                            {l.valid &&
                                                <IconButton size={"small"} color={"success"} onClick={() => copyStringToClipboard(l.link)}>
                                                    <ContentCopyIcon fontSize="small"/>
                                                </IconButton>
                                            }

                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </MythicDialogSection>
            </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Cancel
          </MythicDialogButton>
        </MythicDialogFooter>
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
            <DialogContent dividers={true}>
                <MythicDialogBody>
                    <MythicFormNote>
                        Invite links are temporary and are deleted if Mythic restarts.
                    </MythicFormNote>
                    <MythicDialogSection title="Invite Details">
                        <MythicFormGrid minWidth="18rem">
                            <MythicFormField label="Invite Code Name">
                                <MythicTextField
                                    onChange={onChangeText}
                                    name={"name"}
                                    value={linkData.name}
                                    showLabel={false}
                                    placeholder={"Descriptive name for link..."}
                                    disabled={!props.create}
                                    marginTop="0px"
                                    marginBottom="0px"
                                />
                            </MythicFormField>
                            <MythicFormField label="Custom Invite Code">
                                <MythicTextField
                                    onChange={onChangeText}
                                    name={"short_code"}
                                    value={linkData.short_code}
                                    showLabel={false}
                                    placeholder={"Custom Invite Code..."}
                                    disabled={!props.create}
                                    marginTop="0px"
                                    marginBottom="0px"
                                />
                            </MythicFormField>
                            <MythicFormField label="Total Uses" required>
                                <MythicTextField
                                    onChange={onChangeText}
                                    name={"total"}
                                    value={linkData.total}
                                    showLabel={false}
                                    type={"Number"}
                                    marginTop="0px"
                                    marginBottom="0px"
                                />
                            </MythicFormField>
                        </MythicFormGrid>
                    </MythicDialogSection>
                    <MythicDialogSection title="Operation Assignment">
                        <MythicFormGrid minWidth="18rem">
                            <MythicFormField label="Assign to Operation" description="Optionally add the invited user to an operation after signup.">
                                <FormControl fullWidth size="small">
                                    <InputLabel id="invite-operation-label">Operation</InputLabel>
                                    <Select
                                        labelId="invite-operation-label"
                                        value={linkData.operation_id}
                                        label="Operation"
                                        disabled={!props.create}
                                        onChange={onChangeOperationID}
                                    >
                                        <MenuItem value={0}>Optionally Assign to Operation</MenuItem>
                                        {operationOptions.map( (opt) => (
                                            <MenuItem value={opt.id} key={opt.id}>{opt.name}</MenuItem>
                                        ) )}
                                    </Select>
                                </FormControl>
                            </MythicFormField>
                            {linkData.operation_id > 0 &&
                                <MythicFormField label="Desired Role in Operation" description="Choose the role they should receive for that operation.">
                                    <FormControl fullWidth size="small">
                                        <InputLabel id="invite-role-label">Role</InputLabel>
                                        <Select
                                            labelId="invite-role-label"
                                            value={linkData.operation_role}
                                            label="Role"
                                            disabled={!props.create}
                                            onChange={onChangeOperationRole}
                                        >
                                            {operatorRoleOptions.map( (opt) => (
                                                <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                                            ) )}
                                        </Select>
                                    </FormControl>
                                </MythicFormField>
                            }
                        </MythicFormGrid>
                    </MythicDialogSection>
                </MythicDialogBody>
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={props.onClose}>
                    Cancel
                </MythicDialogButton>
                <MythicDialogButton intent="primary" onClick={submit}>
                    {props.create ? "Create" : "Update"}
                </MythicDialogButton>
            </MythicDialogFooter>
        </React.Fragment>
    );
}
