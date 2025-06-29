import React from 'react';
import {Button, Link} from '@mui/material';
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
import { DataGrid } from '@mui/x-data-grid';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";

const createAPITokenMutation = gql`
mutation createAPITokenMutation($operator_id: Int, $name: String){
  createAPIToken(token_type: "User", operator_id: $operator_id, name: $name){
    id
    token_value
    token_type
    status
    error
    operator_id
    name
    created_by
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
        apitokens(where: {operator_id: {_eq: $operator_id}}) {
          token_value
          token_type
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
    const [openExperimentalUIConfig, setOpenExperimentalUIConfig] = React.useState(false);
    const [openSecretsConfig, setOpenSecretsConfig] = React.useState(false);
    const [showDeleted, setShowDeleted] = React.useState(false);
    const [apiTokens, setAPITokens] = React.useState([]);
    const queryAPITokensSuccess = (data) => {
        setAPITokens(data.apitokens);
    }
    const queryAPITokens = useMythicLazyQuery(GetAPITokens, {
        fetchPolicy: "no-cache"
    });
    const [createAPIToken] = useMutation(createAPITokenMutation, {
        onCompleted: (data) => {
            if(data.createAPIToken.status === "success"){
                snackActions.success("Successfully created new API Token");
                setAPITokens([...apiTokens, {...data.createAPIToken, deleted: false, active: true,
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
    const onSubmitNewAPIToken = (name) => {
        onCreateAPIToken({operator_id:props.id, name: name});
        setOpenNewAPIToken(false);
    }
    const onCreateAPIToken = ({operator_id, name}) => {
        createAPIToken({variables: {operator_id, name}})
    }
    const onDeleteAPIToken = (id) => {
        deleteAPIToken({variables: {id}})
    }
    const onToggleActive = (id, active) => {
        toggleAPITokenActive({variables:{id, active}})
    }
    React.useEffect( () => {
        if(open){
            queryAPITokens({variables: {operator_id: props.id}})
                .then(({data}) => queryAPITokensSuccess(data)).catch(({data}) => console.log(data));
        }
    }, [open]);
    return (
        <React.Fragment>
            <TableRow key={props.id}>
                <MythicStyledTableCell >
                    <IconButton size="large" onClick={()=>{setOpenDeleteDialog(true);}}
                              disabled={(isMe || !props.userIsAdmin)} color={props.deleted ? "success": "error"}
                              variant="contained">
                        {props.deleted ? <RestoreFromTrashIcon /> : <DeleteIcon/>}
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
            <TableRow>
              {((props.id === me.user.id) || (props.userIsAdmin && props.account_type === "bot")) &&
                <MythicStyledTableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                  <Collapse in={open} timeout="auto" unmountOnExit>
                    <Box margin={1}>
                      <Typography variant="h6" gutterBottom component="div" style={{display: "inline-block"}}>
                        API Tokens
                      </Typography>
                        {showDeleted ? (
                            <MythicStyledTooltip title={"Hide API Tokens"} tooltipStyle={{float: "right"}}>
                                <IconButton size="small" style={{float: "right"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)}><VisibilityIcon /></IconButton>
                            </MythicStyledTooltip>

                        ) : (
                            <MythicStyledTooltip title={"Show Deleted API Tokens"} tooltipStyle={{float: "right"}}>
                                <IconButton size="small" style={{float: "right"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)} ><VisibilityOffIcon /></IconButton>
                            </MythicStyledTooltip>
                        )}

                      <Button size="small" onClick={() => {setOpenNewAPIToken(true)}} style={{marginRight: "20px", float: "right"}}
                              variant={"contained"}
                              startIcon={<AddCircleOutlineOutlinedIcon color="success" />} >
                          API Token
                      </Button>
                        {openNewAPIToken &&
                            <MythicDialog open={openNewAPIToken}
                                          fullWidth={true}
                                          onClose={()=>{setOpenNewAPIToken(false);}}
                                          innerDialog={<SettingsAPITokenDialog title="New API Token Name" onAccept={onSubmitNewAPIToken} handleClose={()=>{setOpenNewAPIToken(false);}}  {...props}/>}
                            />
                        }
                        <APITokens apiTokens={apiTokens} onDeleteAPIToken={onDeleteAPIToken} onToggleActive={onToggleActive} showDeleted={showDeleted} />
                    </Box>
                  </Collapse>
                </MythicStyledTableCell>
              }
            
          </TableRow>
        </React.Fragment>
        )
}
const columns = [
    {   field: 'deleted',
        headerName: 'Delete',
        width: 60,
        renderCell: (params) => (
            params.row.deleted ? null : (
                <IconButton size="small" onClick={() => {params.row.onDeleteAPIToken(params.row.id)}}
                            color="error" variant="contained">
                    <DeleteIcon/>
                </IconButton>
            )
        ),
        valueGetter: (value, row) => row.deleted
    },
    {
        field: 'active',
        headerName: 'Active',
        width: 80,
        valueGetter: (value, row) => row.active,
        renderCell: (params) => (
                <Switch
                    color={ "info"}
                    disabled={params.row.deleted}
                    checked={params.row.active}
                    onChange={() => {params.row.onToggleActive(params.row.id, !params.row.active)}}
                    inputProps={{ 'aria-label': 'info checkbox' }}
                    name="active"
                />
        )
    },
    {
        field: 'created_by',
        headerName: 'Created By',
        flex: 1,
        valueGetter: (value, row) => row.created_by_operator?.username,
    },
    {
        field: 'token',
        headerName: 'Token',
        width: 60,
        valueGetter: (value, row) => row.token_value,
        renderCell: (params) => (
            <MythicStyledTooltip title={"Copy to clipboard"} >
                <IconButton onClick={() => params.row.onCopyTokenValue(params.row.token_value)} >
                    <ContentCopyIcon />
                </IconButton>
            </MythicStyledTooltip>
        )
    },
    {
        field: 'token_type',
        headerName: 'Type',
        width: 150,
    },
    {
        field: 'name',
        headerName: 'Name',
        flex: 1,
    },
    {
        field: 'eventstepinstance',
        headerName: 'Eventing Usage',
        flex: 1,
        renderCell: (params) => (
            params.row.eventstepinstance &&
                <>
                    <Typography>
                        {params.row.eventstepinstance?.eventgroupinstance?.eventgroup?.name}{" / "}
                        <Link target={"_blank"} color="textPrimary" underline="always"
                              href={'/new/eventing?eventgroup=' +
                                  params.row?.eventstepinstance?.eventgroupinstance?.eventgroup?.id +
                                  "&eventgroupinstance=" + params.row?.eventstepinstance?.eventgroupinstance?.id
                              }>
                            { params.row.eventstepinstance?.eventstep?.name}{" (" + params.row?.eventstepinstance?.eventgroupinstance?.id + ")"}
                        </Link>
                    </Typography>
                </>

        ),
        sortable: false,
        valueGetter: (value, row) => {
            return row.eventstepinstance?.eventgroupinstance?.eventgroup?.name
        }
    },
];
const APITokens = ({apiTokens, onDeleteAPIToken, onToggleActive, showDeleted}) => {
    const onCopyTokenValue = (token_value) => {
        let success = copyStringToClipboard(token_value);
        if(success){
            snackActions.success("copied token to clipboard");
        } else {
            snackActions.error("failed to copy token to clipboard");
        }
    }
    const [data, setData] = React.useState([]);
    React.useEffect( () => {
        setData(apiTokens.reduce( (prev, c) => {
            if(showDeleted || (!showDeleted && !c.deleted)){
                return [...prev, {...c, onCopyTokenValue: onCopyTokenValue,
                    onDeleteAPIToken: onDeleteAPIToken, onToggleActive: onToggleActive,
                }];
            }
            return [...prev];
        }, []));
    }, [apiTokens, showDeleted]);
    return (
        <div style={{display: "flex", flexDirection: "column", width: "100%", height: "calc(30vh)"}}>
            <DataGrid
                rows={data}
                columns={columns}
                initialState={{
                    pagination: {
                        paginationModel: {
                        },
                    },
                    sorting: {
                        sortModel: [{ field: 'id', sort: 'desc' }],
                    },
                }}
                autoPageSize
                density={"compact"}
            />
        </div>

    )
}

