import React, { useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import {Link} from '@mui/material';
import {snackActions} from '../../utilities/Snackbar';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import {IconButton} from '@mui/material';
import { toLocalTime } from '../../utilities/Time';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {b64DecodeUnicode} from "../Callbacks/ResponseDisplay";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {MythicTextEditDialog} from "../../MythicComponents/MythicTextEditDialog";
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

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
    const [openGroupedKeylogData, setOpenGroupedKeylogData] = React.useState(false);
    useEffect( () => {
        setKeylogs(props.keylogs);
    }, [props.keylogs]);
    const groupedKeylogData = React.useRef({});
    const onGroupKeylogData = (programName, username, hostname) => {
        const aggregateKeylogData = keylogs.reduce( (prev, cur) => {
            if(cur.user === username && cur.task.callback.host === hostname && cur.window === programName){
                return prev + b64DecodeUnicode(cur.keystrokes_text) + "\n";
            }
            return prev;
        }, "");
        groupedKeylogData.current = {"keystrokes": aggregateKeylogData,
        "title": `${username}'s keylogs in ${programName} on ${hostname}`};
        setOpenGroupedKeylogData(true);
    }
    return (
        
        <TableContainer className="mythicElement" style={{height: "100%", overflowY: "auto"}}>
            <Table stickyHeader size="small" style={{"maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "12rem"}}>Task Info</TableCell>
                        <TableCell style={{width: "20rem"}}>User / Host / Window</TableCell>
                        <TableCell style={{maxWidth: "50%"}}>Keylogs</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {openGroupedKeylogData &&
                        <MythicDialog maxWidth={"100%"} fullWidth={true} open={openGroupedKeylogData} onClose={() => {setOpenGroupedKeylogData(false);}}
                                      innerDialog={
                                          <MythicTextEditDialog fullWidth open={openGroupedKeylogData} onClose={() => {setOpenGroupedKeylogData(false);}}
                                                                title={groupedKeylogData.current.title} value={groupedKeylogData.current.keystrokes}/>
                                      } />
                    }
                {keylogs.map( (op) => (
                    <KeylogTableRow
                        key={"keylog" + op.id}
                        onGroupKeylogData={onGroupKeylogData}
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
    const [keylogData, setKeylogData] = React.useState("");
    const [openDisplayKeylogData, setOpenDisplayKeylogData] = React.useState(false);
    React.useEffect( () => {
        const keystrokes = b64DecodeUnicode(props.keystrokes_text);
        setKeylogData(keystrokes);
    }, [props.keystrokes_text]);
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
                    <div className="mythic-search-result-stack">
                        <div className="mythic-search-result-link-row">
                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/callbacks/" + props.task.callback.display_id}>C-{props.task.callback.display_id}</Link>
                            <span className="mythic-search-result-secondary">/</span>
                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/task/" + props.task.display_id}>T-{props.task.display_id}</Link>
                        </div>

                        {props.task?.callback?.mythictree_groups.length > 0 ? (
                            <div className="mythic-search-result-secondary">
                                Groups: {props?.task?.callback.mythictree_groups.join(", ")}
                            </div>
                        ) : null}
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell style={{wordBreak: "break-all"}}>
                    <div className="mythic-search-result-stack mythic-search-result-stack-spacious">
                        <div className="mythic-search-result-inline">
                            <span className="mythic-search-result-label">User</span>
                            <span className="mythic-search-result-value">{props.user}</span>
                        </div>
                        <div className="mythic-search-result-inline">
                            <span className="mythic-search-result-label">Host</span>
                            <span className="mythic-search-result-value">{props.task.callback.host}</span>
                        </div>
                        <div className="mythic-search-result-inline">
                            <span className="mythic-search-result-label">Window</span>
                            <span className="mythic-search-result-value">{props.window}</span>
                        </div>
                        <div className="mythic-search-result-inline">
                            <span className="mythic-search-result-label">Time</span>
                            <span className="mythic-search-result-value">{toLocalTime(props.timestamp, me?.user?.view_utc_time || false)}</span>
                        </div>
                        <div className="mythic-search-result-action-row">
                            <MythicStyledTooltip title={"View current page data grouped together for this program"}>
                                <IconButton
                                    className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                                    onClick={() => props.onGroupKeylogData(props.window, props.user, props.task.callback.host)}
                                    size="small"
                                >
                                    <FullscreenIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                            <span className="mythic-search-result-secondary">View window together</span>
                        </div>
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <div className="mythic-search-result-stack">
                        <div className="mythic-search-result-action-row">
                            <MythicStyledTooltip title={"Copy to clipboard"}>
                                <IconButton
                                    className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                                    onClick={() => onCopyToClipboard(keylogData)}
                                    size="small"
                                >
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                            {keylogData.length > 500 ? (
                                <MythicStyledTooltip title={"Open full keylog data"}>
                                    <IconButton
                                        className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info"
                                        onClick={() => {setOpenDisplayKeylogData(true);}}
                                        size="small"
                                    >
                                        <OpenInNewIcon fontSize="small" />
                                    </IconButton>
                                </MythicStyledTooltip>
                            ) : null}
                        </div>
                        <pre className="mythic-search-result-code mythic-search-result-code-compact">{keylogData.slice(0, 500)}{keylogData.length > 500 ? "..." : null}</pre>
                        {openDisplayKeylogData &&
                            <MythicDialog maxWidth={"100%"} fullWidth={true} open={openDisplayKeylogData} onClose={() => {setOpenDisplayKeylogData(false);}}
                                  innerDialog={
                                <MythicTextEditDialog fullWidth open={openDisplayKeylogData} onClose={() => {setOpenDisplayKeylogData(false);}}
                                                      title={"Full keylog data"} value={keylogData}/>
                                } />
                        }
                    </div>
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}
