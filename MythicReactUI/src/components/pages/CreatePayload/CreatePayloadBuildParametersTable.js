import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { CreatePayloadParameter } from './CreatePayloadParameter';
import {GetGroupedParameters} from "./Step1SelectOS";
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';


export function CreatePayloadBuildParametersTable(props){
    const theme = useTheme();
    const buildParameters = GetGroupedParameters({
        buildParameters: props.buildParameters,
        os: props.os,
        c2_name: props.c2_name,
    });
    return (
        <div style={{height: "100%", overflowY: "auto", width: "100%"}}>
            {buildParameters.map(b => (
                b.parameters.length > 0 &&
                <span key={b?.name || 'undefined'}>
                    {b.name !== '' && b.name !== undefined &&
                        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", }} variant={"elevation"}>
                            <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                                {b.name}
                            </Typography>
                        </Paper>
                    }
                    <TableContainer className="mythicElement">
                        <Table stickyHeader={true} size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                            <TableHead>
                                <TableRow>
                                    <TableCell style={{width: "30%"}}>Build Parameter</TableCell>
                                    <TableCell>Value</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {b.parameters.map( (op) => (
                                    <CreatePayloadParameter selected_os={props.os} key={"buildparamtablerow" + op.id}
                                                            payload_type={props.payload_type}
                                                            instance_name={props.instance_name} onChange={props.onChange} {...op} />
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </span>
            ))}
        </div>

    );
} 
