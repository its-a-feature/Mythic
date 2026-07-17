import {MythicActionButton} from "../../MythicComponents/MythicActionButton";
import React from 'react';
import {Box, Typography, Link} from '@mui/material';
import TableRow from '@mui/material/TableRow';
import DeleteIcon from '@mui/icons-material/Delete';
import Switch from '@mui/material/Switch';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {toLocalTime} from "../../utilities/Time";

export function APITokenRow(props){
    return (
        <>
            <TableRow hover >
                <MythicStyledTableCell>
                    {props.deleted ? null : (
                        <MythicActionButton iconOnly appearance="raised" colorMode="hover" tone="error" size="small" onClick={() => {props.onDeleteAPIToken(props.id)}}>
                            <DeleteIcon fontSize="small" />
                        </MythicActionButton>
                    )}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Box className="mythic-state-toggle-cell">
                        <Switch
                            color="success"
                            disabled={props.deleted}
                            checked={props.active}
                            onChange={() => {props.onToggleActive(props.id, !props.active)}}
                            inputProps={{ 'aria-label': 'Toggle API token active state' }}
                            name="active"
                            size="small"
                        />
                    </Box>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Typography>
                        {props.created_by_operator?.username}
                    </Typography>
                    {props.creation_time &&
                        <Typography color="textSecondary" style={{fontSize: "0.75rem"}}>
                            Created at: {toLocalTime(props.creation_time, props.me?.user?.view_utc_time)}
                        </Typography>
                    }
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {(props.scopes || []).join(", ")}
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
