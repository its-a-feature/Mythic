import React, { useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCopy} from '@fortawesome/free-solid-svg-icons';
import {Link} from '@mui/material';
import Paper from '@mui/material/Paper';
import {snackActions} from '../../utilities/Snackbar';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import {IconButton, Typography} from '@mui/material';
import { toLocalTime } from '../../utilities/Time';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';

/*
export function KeylogsTableOld(props){
    const [keylogs, setKeylogs] = React.useState([]);
    useEffect( () => {
        const condensed = props.keylogs.reduce( (prev, cur) => {
            if(prev[cur.user] === undefined){
                prev[cur.user] = {[cur.task.callback.host]: {[cur.window]: [{...cur}]}}
            }else if(prev[cur.user][cur.task.callback.host] === "undefined"){
                prev[cur.user][cur.task.callback.host] = {[cur.window]: [{...cur}]}
            }else if(prev[cur.user][cur.task.callback.host][cur.window] === undefined){
                prev[cur.user][cur.task.callback.host][cur.window] = [{...cur}];
            }else{
                prev[cur.user][cur.task.callback.host][cur.window].push({...cur});
            }
            return {...prev}
        },{})
        //now that we have it split into a dictionary, we need to split it back out into an array for easy processing
        let newArrayData = [];
        for(const [key, value] of Object.entries(condensed)){
            // key should be a User, Host, or Window
            let newSecondLevel = [];
            //console.log("key", key, "value", value);
            for(const [key2, value2] of Object.entries(value)){
                // key2 should be a Host, User, or Host
                let newThirdLevel = []
                //console.log("key2", key2, "value2", value2);
                for( const[key3, value3] of Object.entries(value2)){
                    // key3 should be Window, Window, or User
                    // value3 should always be an array of keylog entries so we can get the actual keystrokes
                    //console.log("key3", key3, "value3", value3);
                    newThirdLevel.push({"name": key3, "value": value3.reverse()});
                }
                //console.log("newThirdLevel", newThirdLevel);
                newSecondLevel.push({"name": key2, "value": newThirdLevel.reverse()});
            }
            newArrayData.push({"name": key, "value": newSecondLevel.reverse()});
        }
        console.log(newArrayData);
        setKeylogs([...newArrayData]);
    }, [props.keylogs]);
//k0["name"]
    return (
        
        <Grid container spacing={0} direction="row" columns={12}>
            {keylogs.map( k0 => (
                <React.Fragment key={k0["name"]}>
                    <Grid item xs={2} style={{borderBottom: "2px solid grey"}}>{k0["name"]}</Grid>
                    <Grid container item spacing={0} xs={10} style={{borderBottom: "2px solid grey"}}>
                        {k0.value.map( (k1, k1i) => (
                            <React.Fragment key={k0["name"] + k1["name"]}>
                                <Grid item xs={2} style={{borderBottom: k1i + 1 !== k0.value.length ? "2px solid grey": ""}}>{k1["name"]}</Grid>
                                <Grid container item spacing={0} xs={10} style={{borderBottom: k1i + 1 !== k0.value.length ? "2px solid grey" : ""}}>
                                    {k1.value.map( (k2, k2i) => (
                                        <React.Fragment key={k0["name"] + k1["name"] + k2["name"]}>
                                            <Grid item xs={2} style={{borderBottom: k2i + 1 !== k1.value.length ? "2px solid grey" : ""}}> {k2["name"]} </Grid>
                                            <Grid container item spacing={0} xs={10} style={{borderBottom: k2i + 1 !== k1.value.length ? "2px solid grey": ""}}>
                                                <Grid item xs={12}>
                                                    {k2.value.map( (k3, k3i) => (
                                                        <span key={k0["name"] + k1["name"] + k2["name"] + k3i}>{k3.keystrokes_text}</span>
                                                    ))}
                                                </Grid>
                                            </Grid>
                                        </React.Fragment>
                                    ))}
                                </Grid>
                            </React.Fragment>
                        ))}
                    </Grid>
                </React.Fragment>
            ))}
        </Grid>
        
    )
}
*/
export function KeylogsTable(props){
    const [keylogs, setKeylogs] = React.useState([]);
    useEffect( () => {
        setKeylogs(props.keylogs);
    }, [props.keylogs]);
//k0["name"]
    return (
        
        <TableContainer component={Paper} className="mythicElement" >
            <Table stickyHeader size="small" style={{"maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "4rem"}}>Callback</TableCell>
                        <TableCell style={{width: "4rem"}}>Task</TableCell>
                        <TableCell style={{width: "12rem"}}>Timestamp</TableCell>
                        <TableCell >User</TableCell>
                        <TableCell >Host</TableCell>
                        <TableCell >Window</TableCell>
                        <TableCell style={{maxWidth: "70%"}}>Keylogs</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {keylogs.map( (op) => (
                    <KeylogTableRow
                        key={"keylog" + op.id}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
        
    )
}
function KeylogTableRow(props){
    const me = useReactiveVar(meState);
    const onCopyToClipboard = (data) => {
        let result = copyStringToClipboard(data);
        if(result){
          snackActions.success("Copied text!");
        }else{
          snackActions.error("Failed to copy text");
        }
    }
    return (
        <React.Fragment>
            <TableRow hover>
                <MythicStyledTableCell>
                    <Link style={{wordBreak: "break-all"}} underline="always" target="_blank" href={"/new/callbacks/" + props.task.callback.id}>{props.task.callback.id}</Link>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Link style={{wordBreak: "break-all"}} underline="always" target="_blank" href={"/new/task/" + props.task.id}>{props.task.id}</Link>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}>{toLocalTime(props.timestamp, me?.user?.view_utc_time || false)}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Typography variant="body2" >{props.user}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <Typography variant="body2" >{props.task.callback.host}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <Typography variant="body2" >{props.window}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <MythicStyledTooltip title={"Copy to clipboard"} style={{display: "inline-block"}}>
                        <IconButton onClick={() => onCopyToClipboard(props.keystrokes_text)} size="small">
                            <FontAwesomeIcon icon={faCopy} />
                        </IconButton>
                    </MythicStyledTooltip>
                    <Typography variant="body2" style={{wordBreak: "break-all", whiteSpace: "pre-wrap", display: "inline-block"}}>{props.keystrokes_text}</Typography>   
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}

/*
    <TableCell>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}>{toLocalTime(props.timestamp, me.user.view_utc_time)}</Typography>
                </TableCell>
                <TableCell >
                    <Typography variant="body2" style={{wordBreak: "break-all", display: "inline-block"}}>{props.task.callback.host}</Typography>
                </TableCell>
                <TableCell >
                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" 
                        href={"/new/task/" + props.task.id}>
                            {props.task.id}
                    </Link>
                </TableCell>
                <TableCell>
                <Typography variant="body2" style={{wordBreak: "break-all", maxWidth: "40rem"}}>{props.keystrokes_text}</Typography>
                </TableCell>
*/
