import React from 'react';
import {IconButton, Typography, Link} from '@mui/material';
import TableRow from '@mui/material/TableRow';
import DeleteIcon from '@mui/icons-material/Delete';
import Switch from '@mui/material/Switch';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {copyStringToClipboard} from "../../utilities/Clipboard";
import {snackActions} from "../../utilities/Snackbar";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";

export function APITokenRow(props){
    const onCopyTokenValue = () => {
        let success = copyStringToClipboard(props.token_value);
        if(success){
            snackActions.success("copied token to clipboard");
        } else {
            snackActions.error("failed to copy token to clipboard");
        }
    }
    return (
        <>
            <TableRow hover >
                <MythicStyledTableCell>
                    {props.deleted ? null : (
                        <IconButton size="small" onClick={() => {props.onDeleteAPIToken(props.id)}}
                                    color="error" variant="contained">
                            <DeleteIcon/>
                        </IconButton>
                    )}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Switch
                        color={ "info"}
                        disabled={props.deleted}
                        checked={props.active}
                        onChange={() => {props.onToggleActive(props.id, !props.active)}}
                        inputProps={{ 'aria-label': 'primary checkbox' }}
                        name="active"
                    />
                </MythicStyledTableCell>
                <MythicStyledTableCell>{props.created_by_operator?.username}</MythicStyledTableCell>
                <MythicStyledTableCell>
                    <MythicStyledTooltip title={"Copy to clipboard"} >
                        <IconButton onClick={onCopyTokenValue} >
                            <ContentCopyIcon />
                        </IconButton>
                    </MythicStyledTooltip>
                </MythicStyledTableCell>
                <MythicStyledTableCell>{props.token_type}</MythicStyledTableCell>
                <MythicStyledTableCell>{props.name}</MythicStyledTableCell>
                <MythicStyledTableCell>
                    {props.eventstepinstance &&
                    <>
                        <Typography>
                            {props.eventstepinstance?.eventgroupinstance?.eventgroup?.name}{" / "}
                            <Link target={"_blank"} color="textPrimary" underline="always"
                                href={'/new/eventing?eventgroup=' +
                                props?.eventstepinstance?.eventgroupinstance?.eventgroup?.id +
                                "&eventgroupinstance=" + props?.eventstepinstance?.eventgroupinstance?.id
                            }>
                            { props.eventstepinstance?.eventstep?.name}{" (" + props?.eventstepinstance?.eventgroupinstance?.id + ")"}
                        </Link>
                        </Typography>
                    </>
                    }
                </MythicStyledTableCell>

            </TableRow>
        </>

        )
}

