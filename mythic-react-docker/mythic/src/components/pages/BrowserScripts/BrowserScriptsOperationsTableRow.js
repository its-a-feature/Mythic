import React, {useEffect} from 'react';
import {Button} from '@material-ui/core';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import AceEditor from 'react-ace';
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-github";
import {muiTheme} from '../../../themes/Themes';

export function BrowserScriptsOperationsTableRow(props){
    const [openViewScript, setOpenViewScript] = React.useState(false);
    const [displayName, setDisplayName] = React.useState("");

    useEffect( () => {
        setDisplayName(props.browserscript.command === null ? "Support Script: " + props.browserscript.name : props.browserscript.command.cmd);
    }, [props.browserscript]);
    return (
        <React.Fragment>
            <TableRow key={"opscript" + props.browserscript.id}>
                <TableCell>{props.browserscript.payloadtype.ptype}</TableCell>
                <TableCell>{displayName}</TableCell>
                <TableCell>{props.browserscript.user_modified ? "User Modified" : "" } </TableCell>
                <TableCell>{props.operation.admin.username}</TableCell>
                <TableCell><Button size="small" variant="contained" style={{color: muiTheme.palette.info.main}} onClick={() => {setOpenViewScript(true);}}> View </Button></TableCell>    
                <MythicDialog fullWidth={true} maxWidth="md" open={openViewScript} 
                    onClose={()=>{setOpenViewScript(false);}} 
                    innerDialog={
                        <AceEditor
                            mode="javascript"
                            theme="github"
                            width="100%"
                            value={atob(props.browserscript.script)} 
                            focus={true}
                            readOnly={true}
                            onChange={() => {}}
                            setOptions={{
                            
                            }}
                        />
                    } />
            </TableRow>
        </React.Fragment>
        )
}

