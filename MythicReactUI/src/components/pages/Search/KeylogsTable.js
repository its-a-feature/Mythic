import React, { useEffect } from 'react';
import {useTheme} from '@mui/material/styles';
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
import {snackActions} from '../../utilities/Snackbar';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import {IconButton, Typography} from '@mui/material';
import { toLocalTime } from '../../utilities/Time';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {b64DecodeUnicode} from "../Callbacks/ResponseDisplay";
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {MythicTextEditDialog} from "../../MythicComponents/MythicTextEditDialog";
import FullscreenIcon from '@mui/icons-material/Fullscreen';

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
    const theme = useTheme();
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
                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/callbacks/" + props.task.callback.display_id}>C-{props.task.callback.display_id}</Link>
                    {" / "}
                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/task/" + props.task.display_id}>T-{props.task.display_id}</Link>

                    {props.task?.callback?.mythictree_groups.length > 0 ? (
                        <Typography variant="body2" style={{wordBreak: "break-all"}}>
                            <b>Groups: </b>{props?.task?.callback.mythictree_groups.join(", ")}
                        </Typography>
                    ) : null}
                </MythicStyledTableCell>
                <MythicStyledTableCell style={{wordBreak: "break-all"}}>
                    <Typography variant="body2" ><b>User: </b>{props.user}</Typography>
                    <Typography variant="body2" ><b>Host: </b>{props.task.callback.host}</Typography>
                    <Typography variant="body2" ><b>Window:</b> {props.window} </Typography>
                    <Typography variant="body2" ><b>Time: </b>{toLocalTime(props.timestamp, me?.user?.view_utc_time || false)}</Typography>
                    <Typography variant="body2" style={{display: "inline-block"}}><b>View Window Together: </b></Typography>
                    <MythicStyledTooltip title={"View current page data grouped together for this program"} tooltipStyle={{
                        display: "inline-block"
                    }}>
                        <IconButton onClick={() => props.onGroupKeylogData(props.window, props.user, props.task.callback.host)}>
                            <FullscreenIcon />
                        </IconButton>
                    </MythicStyledTooltip>


                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <MythicStyledTooltip title={"Copy to clipboard"} style={{display: "inline-block"}}>
                        <IconButton onClick={() => onCopyToClipboard(keylogData)} size="small">
                            <FontAwesomeIcon icon={faCopy} />
                        </IconButton>
                    </MythicStyledTooltip>
                    <Typography variant="body2" style={{wordBreak: "break-all", whiteSpace: "pre-wrap", display: "inline-block"}}>
                        {keylogData.slice(0, 500)}
                        {keylogData.length > 500 ? (
                            <>
                                {"..."}<br/>
                                <FontAwesomeIcon icon={faExternalLinkAlt} style={{color: theme.palette.info.main, cursor: "pointer"}} size="lg"
                                onClick={() => {setOpenDisplayKeylogData(true);}}/>
                            </>
                        ) : null}
                        {openDisplayKeylogData &&
                            <MythicDialog maxWidth={"100%"} fullWidth={true} open={openDisplayKeylogData} onClose={() => {setOpenDisplayKeylogData(false);}}
                                  innerDialog={
                                <MythicTextEditDialog fullWidth open={openDisplayKeylogData} onClose={() => {setOpenDisplayKeylogData(false);}}
                                                      title={"Full keylog data"} value={keylogData}/>
                                } />
                        }
                    </Typography>
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}
