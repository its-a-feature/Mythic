import React from 'react';
import {Button, DialogContent, DialogTitle, TextField} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import {SettingsAPITokenDialog, SettingsOperatorDialog} from './SettingsOperatorDialog';
import { SettingsOperatorDeleteDialog } from './SettingsOperatorDeleteDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { toLocalTime } from '../../utilities/Time';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {SettingsOperatorUIConfigDialog} from './SettingsOperatorUIConfigDialog';
import SettingsIcon from '@mui/icons-material/Settings';
import { snackActions } from '../../utilities/Snackbar';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import PasswordIcon from '@mui/icons-material/Password';
import {SettingsOperatorExperimentalUIConfigDialog} from "./SettingsOperatorExperimentalUIConfigDialog";
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import {SettingsOperatorSecretsConfigDialog} from "./SettingsOperatorSecretsConfigDialog";
import SmartToyTwoToneIcon from '@mui/icons-material/SmartToyTwoTone';
import {useTheme} from '@mui/material/styles';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {gql, useMutation} from '@apollo/client';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {copyStringToClipboard} from "../../utilities/Clipboard";
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";
import {MythicTableEmptyState, MythicTableErrorState, MythicTableLoadingState} from "../../MythicComponents/MythicStateDisplay";
import {MythicClientSideTablePagination, useMythicClientPagination} from "../../MythicComponents/MythicTablePagination";
import {APITokenRow} from "./SettingsOperatorAPITokenRow";
import {MythicSectionHeader} from "../../MythicComponents/MythicPageHeader";
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicFormNote
} from "../../MythicComponents/MythicDialogLayout";

const createAPITokenMutation = gql`
mutation createAPITokenMutation($operator_id: Int, $name: String, $scopes: [String!]){
  createAPIToken(operator_id: $operator_id, name: $name, scopes: $scopes){
    id
    token_value
    scopes
    token_type
    status
    error
    operator_id
    name
    created_by
    creation_time
  }
}
`;
export const deleteAPITokenMutation = gql`
mutation deleteAPITokens($id: Int!){
  deleteAPIToken(apitokens_id: $id){
    status
    error
    id
    operator_id
  }
}
`;
export const toggleAPITokenActiveMutation = gql`
mutation toggleAPITokenActiveMutation($id: Int!, $active: Boolean!){
  update_apitokens_by_pk(pk_columns: {id: $id}, _set: {active: $active}){
    id
    operator_id
    active
  }
}
`;
const GetAPITokens = gql`
    query getUserAPITokens($operator_id: Int!){
        apitokens(where: {operator_id: {_eq: $operator_id}}, order_by: {id: desc}) {
          scopes
          token_type
          creation_time
          active
          name
          deleted
          eventstepinstance {
            eventstep {
                id
                name
            }
            eventgroupinstance {
                id
                eventgroup {
                    id
                    name
                }
            }
          }
          created_by_operator {
            username
            id
          }
          id
        }
    }
`;
export function SettingsOperatorTableRow(props){
    const theme = useTheme();
    const [open, setOpen] = React.useState(false);
    const [openUpdate, setOpenUpdateDialog] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const [openUIConfig, setOpenUIConfig] = React.useState(false);
    const [openNewAPIToken, setOpenNewAPIToken] = React.useState(false);
    const [newAPITokenValue, setNewAPITokenValue] = React.useState("");
    const [openExperimentalUIConfig, setOpenExperimentalUIConfig] = React.useState(false);
    const [openSecretsConfig, setOpenSecretsConfig] = React.useState(false);
    const [showDeleted, setShowDeleted] = React.useState(false);
    const [apiTokens, setAPITokens] = React.useState([]);
    const [apiTokensLoading, setAPITokensLoading] = React.useState(false);
    const [apiTokensError, setAPITokensError] = React.useState("");
    const apiTokenQueryOptions = React.useMemo(() => ({fetchPolicy: "no-cache"}), []);
    const queryAPITokens = useMythicLazyQuery(GetAPITokens, apiTokenQueryOptions);
    const [createAPIToken] = useMutation(createAPITokenMutation, {
        onCompleted: (data) => {
            if(data.createAPIToken.status === "success"){
                snackActions.success("Successfully created new API Token");
                const {token_value, ...createdToken} = data.createAPIToken;
                setNewAPITokenValue(token_value);
                setAPITokens([...apiTokens, {...createdToken, deleted: false, active: true,
                created_by_operator: {username:me?.user?.username, id: me?.user?.user_id}}]);

            }else{
                snackActions.error(data.createAPIToken.error);
            }
        },
        onError: (result) => {
            console.log(result);
        }
    });
    const [deleteAPIToken] = useMutation(deleteAPITokenMutation, {
        onCompleted: (data) => {
            if(data.deleteAPIToken.status === "error"){
                snackActions.error(data.deleteAPIToken.error);
                return
            }
            const updatedTokens = apiTokens.map( a => {
                if(a.id === data.deleteAPIToken.id){
                    return {...a, deleted: true};
                }
                return {...a};
            })
            setAPITokens(updatedTokens);
            snackActions.success("successfully deleted API Token");
        },
        onError: (data) => {
            console.log(data);
        }
    });
    const [toggleAPITokenActive] = useMutation(toggleAPITokenActiveMutation, {
        onCompleted: (data) => {
            const updatedTokens = apiTokens.map( a => {
                if(a.id === data.update_apitokens_by_pk.id){
                    return {...a, active: data.update_apitokens_by_pk.active};
                }
                return {...a};
            })
            setAPITokens(updatedTokens);
        },
        onError: (data) => {

        }
    })
    const me = props.me;
    const isMe = ( me?.user?.user_id || 0 ) === props.id;
    const onViewUTCChanged = (evt) => {
        const {id} = props;
        props.onViewUTCChanged(id, !props[evt.target.name]);
    }
    const onAdminChanged = (evt) => {
        const {id} = props;
        props.onAdminChanged(id, !props[evt.target.name]);
    }
    const onActiveChanged = (evt) => {
        const {id} = props;
        props.onActiveChanged(id, !props[evt.target.name]);
    }
    const onAccept = (id, username, passwordOld, passwordNew, email) => {
        if(username !== props.username){
          props.onUsernameChanged(id, username);
        }
        if(passwordNew.length > 0){
          props.onPasswordChanged({user_id: id, old_password: passwordOld, new_password: passwordNew});
        } else if (passwordOld.length > 0) {
          snackActions.warning("Old password set but not new password");
          return;
        }
        if(props.email !== email){
            props.onPasswordChanged({user_id: id, email});
        }
        setOpenUpdateDialog(false);
    }
    const onAcceptDelete = (id) => {
        props.onDeleteOperator(id, !props.deleted);
        setOpenDeleteDialog(false);
    }
    const onSubmitNewAPIToken = (name, scopes) => {
        createAPIToken({variables: {operator_id: props.id, name, scopes}})
        setOpenNewAPIToken(false);
    }
    const onDeleteAPIToken = (id) => {
        deleteAPIToken({variables: {id}})
    }
    const onToggleActive = (id, active) => {
        toggleAPITokenActive({variables:{id, active}})
    }
    React.useEffect( () => {
        let active = true;
        if(open){
            setAPITokensLoading(true);
            setAPITokensError("");
            queryAPITokens({variables: {operator_id: props.id}})
                .then(({data}) => {
                    if(active){
                        setAPITokens(data.apitokens);
                    }
                }).catch((error) => {
                    console.log(error);
                    if(active){
                        setAPITokensError("Unable to load API tokens for this operator.");
                    }
                }).finally(() => {
                    if(active){
                        setAPITokensLoading(false);
                    }
                });
        }
        return () => {
            active = false;
        }
    }, [open, props.id, queryAPITokens]);
    return (
        <React.Fragment>
            <TableRow key={props.id}>
                <MythicStyledTableCell >
                    <IconButton className={`mythic-table-row-icon-action ${props.deleted ? "mythic-table-row-icon-action-success" : "mythic-table-row-icon-action-hover-danger"}`} size="small" onClick={()=>{setOpenDeleteDialog(true);}}
                              disabled={(isMe || !props.userIsAdmin)}>
                        {props.deleted ? <RestoreFromTrashIcon fontSize="small" /> : <DeleteIcon fontSize="small" />}
                    </IconButton>
                  {openDelete && 
                      <MythicDialog open={openDelete} 
                      onClose={()=>{setOpenDeleteDialog(false);}} 
                      innerDialog={<SettingsOperatorDeleteDialog onClose={()=>{setOpenDeleteDialog(false);}}  onAccept={onAcceptDelete} {...props} />}
                        />
                  }
                  
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                        {props.account_type === "bot" &&
                            <SmartToyTwoToneIcon style={{marginRight: "10px"}} />
                        }
                        <Typography style={{fontSize: 16}}>
                            <b>{props.username}</b>
                        </Typography>
                    </div>
                    {props.operation?.name &&
                        <Typography style={{fontSize: theme.typography.pxToRem(12),}}>
                            Current Op: {props.operation.name}
                        </Typography>
                    }
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <MythicStyledTooltip title={"Adjust Username/Password"}>
                        <IconButton size="medium"
                                    disabled={!(isMe || props.userIsAdmin)}
                                    onClick={()=>{setOpenUpdateDialog(true);}}
                                    color="error" ><PasswordIcon /></IconButton>
                    </MythicStyledTooltip>
                  {openUpdate &&
                    <MythicDialog open={openUpdate} 
                     onClose={()=>{setOpenUpdateDialog(false);}} 
                    innerDialog={<SettingsOperatorDialog onAccept={onAccept}
                                                         handleClose={()=>{setOpenUpdateDialog(false);}}
                                                         title="Update Operator Username/Password"  {...props}/>}
                />
                  }
                    
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Switch
                        checked={props.view_utc_time}
                        disabled={!isMe}
                        onChange={onViewUTCChanged}
                        color="info"
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="view_utc_time"
                      />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                  {((props.id === me.user.id) || (props.userIsAdmin && props.account_type === "bot")) &&
                      <>
                          <MythicStyledTooltip title={"Configure UI preferences"} tooltipStyle={{display: "inline-block"}}>
                              <IconButton size="medium"
                                          disabled={props.account_type === "bot"}
                                          onClick={()=>{setOpenUIConfig(true);}}
                                          color="info" variant='contained'>
                                  <SettingsIcon />
                              </IconButton>
                          </MythicStyledTooltip>

                        {openUIConfig &&
                          <MythicDialog open={openUIConfig} onClose={()=>{setOpenUIConfig(false)}} maxWidth={"md"} fullWidth
                          innerDialog={<SettingsOperatorUIConfigDialog  onClose={()=>{setOpenUIConfig(false);}} {...props} />}
                          />
                        }
                          <MythicStyledTooltip title={"Secrets"} >
                              <IconButton size="medium" onClick={()=>{setOpenSecretsConfig(true);}}
                                          color="error" variant='contained'>
                                  <VpnKeyIcon />
                              </IconButton>
                          </MythicStyledTooltip>
                          {openSecretsConfig &&
                              <MythicDialog open={openSecretsConfig} onClose={()=>{setOpenSecretsConfig(false)}} maxWidth={"xl"} fullWidth
                                            innerDialog={<SettingsOperatorSecretsConfigDialog  onClose={()=>{setOpenSecretsConfig(false);}} {...props} />}
                              />
                          }
                        <MythicStyledTooltip title={"Experimental UI Settings"} >
                            <IconButton size="medium" onClick={()=>{setOpenExperimentalUIConfig(true);}}
                                        color="warning" variant='contained'
                                        disabled={props.account_type === "bot"}
                            >
                                <RocketLaunchIcon />
                            </IconButton>
                        </MythicStyledTooltip>
                          {openExperimentalUIConfig &&
                              <MythicDialog open={openExperimentalUIConfig} onClose={()=>{setOpenExperimentalUIConfig(false)}} maxWidth={"md"} fullWidth
                                            innerDialog={<SettingsOperatorExperimentalUIConfigDialog  onClose={()=>{setOpenExperimentalUIConfig(false);}} {...props} />}
                              />
                          }
                      </>
                  }
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Switch
                        color={ isMe || !props.userIsAdmin ? "secondary" : "info"}
                        checked={props.active}
                        disabled={isMe || !props.userIsAdmin}
                        onChange={onActiveChanged}
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="active"
                      />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <b>Last Login: </b>{toLocalTime(props.last_login, me?.user?.view_utc_time )}<br/>
                    <Typography style={{fontSize: theme.typography.pxToRem(12),}}>
                        Created at: {toLocalTime(props.creation_time, me?.user?.view_utc_time )}
                    </Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell>{props.email}</MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Switch
                        color={ isMe || !props.userIsAdmin ? "secondary" : "info"}
                        checked={props.admin}
                        disabled={isMe || !props.userIsAdmin || props.account_type === "bot"}
                        onChange={onAdminChanged}
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="admin"
                      />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                  { ((props.id === me.user.id) || (props.userIsAdmin && props.account_type === "bot")) &&
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                      {open ? <KeyboardArrowUpIcon className="mythicElement"/> : <KeyboardArrowDownIcon className="mythicElement"/>}
                    </IconButton>
                  }
                    
                </MythicStyledTableCell>
            </TableRow>
              {((props.id === me.user.id) || (props.userIsAdmin && props.account_type === "bot")) && open &&
                  <TableRow>
                    <MythicStyledTableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                      <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box margin={1}>
                          <MythicSectionHeader
                            dense
                            title="API Tokens"
                            actions={
                              <>
                              {showDeleted ? (
                                  <MythicStyledTooltip title={"Hide API Tokens"}>
                                      <IconButton className="mythic-dialog-title-action" size="small" onClick={() => setShowDeleted(!showDeleted)}><VisibilityIcon fontSize="small" /></IconButton>
                                  </MythicStyledTooltip>

                              ) : (
                                  <MythicStyledTooltip title={"Show Deleted API Tokens"}>
                                      <IconButton className="mythic-dialog-title-action" size="small" onClick={() => setShowDeleted(!showDeleted)}><VisibilityOffIcon fontSize="small" /></IconButton>
                                  </MythicStyledTooltip>
                              )}
                              <Button
                                  className="mythic-dialog-title-action"
                                  size="small"
                                  onClick={() => {setOpenNewAPIToken(true)}}
                                  variant="outlined"
                                  startIcon={<AddCircleOutlineOutlinedIcon fontSize="small" />}
                              >
                                  API Token
                              </Button>
                              </>
                            }
                          />
                            {openNewAPIToken &&
                                <MythicDialog open={openNewAPIToken}
                                              fullWidth={true}
                                              onClose={()=>{setOpenNewAPIToken(false);}}
                                              maxWidth={"md"}
                                              innerDialog={<SettingsAPITokenDialog title="New API Token" onAccept={onSubmitNewAPIToken} handleClose={()=>{setOpenNewAPIToken(false);}}  {...props}/>}
                                />
                            }
                            {newAPITokenValue !== "" &&
                                <MythicDialog open={newAPITokenValue !== ""}
                                              fullWidth={true}
                                              maxWidth={"md"}
                                              onClose={()=>{setNewAPITokenValue("");}}
                                              innerDialog={<APITokenValueDialog
                                                  tokenValue={newAPITokenValue}
                                                  onClose={()=>{setNewAPITokenValue("");}}
                                              />}
                                />
                            }
                            <APITokens
                                error={apiTokensError}
                                loading={apiTokensLoading}
                                me={me}
                                apiTokens={apiTokens}
                                onDeleteAPIToken={onDeleteAPIToken}
                                onToggleActive={onToggleActive}
                                showDeleted={showDeleted}
                            />
                        </Box>
                      </Collapse>
                    </MythicStyledTableCell>
                  </TableRow>
              }
        </React.Fragment>
        )
}
const APITokenValueDialog = ({tokenValue, onClose}) => {
    const onCopyTokenValue = () => {
        let success = copyStringToClipboard(tokenValue);
        if(success){
            snackActions.success("copied token to clipboard");
        } else {
            snackActions.error("failed to copy token to clipboard");
        }
    }
    return (
        <>
            <DialogTitle id="form-dialog-title">Copy API Token</DialogTitle>
            <DialogContent dividers={true}>
                <MythicDialogBody>
                    <MythicFormNote>
                        This token value is only shown once. Copy it now before closing this dialog.
                    </MythicFormNote>
                    <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        value={tokenValue}
                        InputProps={{readOnly: true}}
                    />
                </MythicDialogBody>
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={onCopyTokenValue} startIcon={<ContentCopyIcon />}>
                    Copy
                </MythicDialogButton>
                <MythicDialogButton intent="primary" onClick={onClose}>
                    I Copied It
                </MythicDialogButton>
            </MythicDialogFooter>
        </>
    );
}
const APITokens = ({apiTokens, error, loading, onDeleteAPIToken, onToggleActive, showDeleted, me}) => {
    const data = React.useMemo(() => {
        return apiTokens
            .filter((token) => showDeleted || !token.deleted)
            .sort((left, right) => right.id - left.id);
    }, [apiTokens, showDeleted]);
    const pagination = useMythicClientPagination({
        items: data,
        resetKey: showDeleted ? "show-deleted" : "hide-deleted",
    });

    return (
        <>
            <TableContainer className="mythicElement mythic-dialog-table-wrap mythic-fixed-row-table-wrap" style={{height: "calc(30vh)", minHeight: "12rem", overflowY: "auto"}}>
                <Table stickyHeader size="small" style={{height: "auto"}}>
                    <TableHead>
                        <TableRow>
                            <MythicStyledTableCell style={{width: "3rem"}} />
                            <MythicStyledTableCell style={{width: "5rem"}}>Active</MythicStyledTableCell>
                            <MythicStyledTableCell>Created By</MythicStyledTableCell>
                            <MythicStyledTableCell>Scopes</MythicStyledTableCell>
                            <MythicStyledTableCell style={{width: "9rem"}}>Type</MythicStyledTableCell>
                            <MythicStyledTableCell>Name</MythicStyledTableCell>
                            <MythicStyledTableCell>Eventing Usage</MythicStyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <MythicTableLoadingState
                                colSpan={7}
                                columns={7}
                                compact
                                minHeight={86}
                                rows={3}
                                title="Loading API tokens"
                                description="Fetching tokens for this operator."
                            />
                        ) : error ? (
                            <MythicTableErrorState
                                colSpan={7}
                                compact
                                minHeight={150}
                                title="Unable to load API tokens"
                                description={error}
                            />
                        ) : data.length === 0 ? (
                            <MythicTableEmptyState
                                colSpan={7}
                                compact
                                minHeight={160}
                                title="No API tokens"
                                description={showDeleted ? "This operator does not have any API tokens yet." : "This operator does not have any active API tokens."}
                            />
                        ) : (
                            pagination.pageData.map((token) => (
                                <APITokenRow
                                    key={"api-token" + token.id}
                                    {...token}
                                    me={me}
                                    onDeleteAPIToken={onDeleteAPIToken}
                                    onToggleActive={onToggleActive}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            {!loading && !error &&
                <MythicClientSideTablePagination pagination={pagination} />
            }
        </>
    )
}
