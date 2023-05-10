import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { BrowserScriptsOperationsTableRow } from './BrowserScriptsOperationsTableRow';
import {useTheme} from '@mui/material/styles';


export function BrowserScriptsOperationsTable(props){
    const theme = useTheme();
    return (
        props.browserscriptoperation.length > 0 &&
            <React.Fragment>
                <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main, marginBottom: "5px", marginTop: "10px", marginRight: "5px"}} variant={"elevation"}>
                    <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                        Operation Browser Scripts
                    </Typography>
                </Paper>
                <TableContainer component={Paper} className="mythicElement" style={{maxHeight: "calc(30vh)"}}>
                    <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "100%", "overflow": "scroll"}}>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{width: "10em"}}>Payload</TableCell>
                                <TableCell style={{}}>Command</TableCell>
                                <TableCell style={{width: "5em"}}>User Modified?</TableCell>
                                <TableCell style={{}}>Operator</TableCell>
                                <TableCell style={{width: "5em"}}>View Script</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                        {props.browserscriptoperation.map( (op) => (
                            <BrowserScriptsOperationsTableRow
                                key={"opscriptrow" + op.browserscript.id}
                                {...op}
                            />
                        ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </React.Fragment>
    )
}

