import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableContainer from '@material-ui/core/TableContainer';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import {EnhancedTableHead, stableSort, getComparator} from '../../MythicComponents/MythicTable';
import { CallbacksTableRow } from './CallbacksTableRow';
import { lighten, makeStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import clsx from 'clsx';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import VisibilityOffOutlinedIcon from '@material-ui/icons/VisibilityOffOutlined';
import {ThemeContext} from 'styled-components';
import { useContext} from 'react';

const useToolbarStyles = makeStyles((theme) => ({
  root: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(1),
  },
  highlight:
    theme.palette.type === 'light'
      ? {
          color: theme.palette.secondary.main,
          backgroundColor: lighten(theme.palette.secondary.light, 0.85),
        }
      : {
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.secondary.dark,
        },
  title: {
    flex: '1 1 100%',
  },
}));

const EnhancedTableToolbar = (props) => {
  const classes = useToolbarStyles();
  const theme = useContext(ThemeContext);
  const { numSelected } = props;

  return (
    <React.Fragment>
        {numSelected > 1 ? (
          <Toolbar className={clsx(classes.root, {[classes.highlight]: numSelected > 1, })} >
            <React.Fragment>
              <Typography className={classes.title} color="inherit" variant="subtitle1" component="div">
                {numSelected} selected
              </Typography>
              <Tooltip title="Hide Selected">
                <IconButton aria-label="hide">
                  <VisibilityOffOutlinedIcon />
                </IconButton>
              </Tooltip>
            </React.Fragment>
          </Toolbar>
      ) : (
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader, marginBottom: "5px", marginTop: "10px", width: "100%"}} variant={"elevation"}>
          <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
              Active Callbacks
          </Typography>
        </Paper>
      )
      }
    </React.Fragment>
    
      
    
  );
};
const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  paper: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  table: {
    minWidth: 750,
  },
  visuallyHidden: {
    border: 0,
    clip: 'rect(0 0 0 0)',
    height: 1,
    margin: -1,
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    top: 20,
    width: 1,
  },
}));
export function CallbacksTable(props){
      const classes = useStyles();
      const [order, setOrder] = React.useState('asc');
      const [orderBy, setOrderBy] = React.useState('interact');
      const [selected, setSelected] = React.useState([]);
      const handleSelectAllClick = (event) => {
        if (event.target.checked) {
          const newSelecteds = props.callbacks.map((n) => n.id);
          setSelected(newSelecteds);
          return;
        }
        setSelected([]);
      };
      const handleClick = (event, name) => {
        const selectedIndex = selected.indexOf(name);
        let newSelected = [];

        if (selectedIndex === -1) {
          newSelected = newSelected.concat(selected, name);
        } else if (selectedIndex === 0) {
          newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
          newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
          newSelected = newSelected.concat(
            selected.slice(0, selectedIndex),
            selected.slice(selectedIndex + 1),
          );
        }

        setSelected(newSelected);
      };
      const isSelected = (name) => selected.indexOf(name) !== -1;
      const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
      };
    const tableHeadCells = [
        {id: "id", numeric: true, disablePadding: false, label: "Interact"},
        {id: "ip", numeric: false, disablePadding: false, label: "IP"},
        {id: "host", numeric: false, disablePadding: false, label: "Host"},
        {id: "user", numeric: false, disablePadding: false, label: "User"},
        {id: "domain", numeric: false, disablePadding: false, label: "Domain"},
        {id: "os", numeric: false, disablePadding: false, label: "OS"},
        {id: "pid", numeric: true, disablePadding: false, label: "PID"},
        {id: "last_checkin", numeric: true, disablePadding: false, label: "Last Checkin"},
        {id: "description", numeric: false, disablePadding: false, label: "Description"},
        {id: "sleep", numeric: false, disablePadding: true, label: "Sleep"},
        {id: "type", numeric: false, disablePadding: false, label: "Type"},
        {id: "c2", numeric: false, disablePadding: true, label: "C2"}
    ]
    return (
        <div>  
            <TableContainer component={Paper} className="mythicElement" style={{"maxWidth": "100%", "overflow": "auto", height: "calc(" + props.topHeight + "vh)"}}>
                <EnhancedTableToolbar numSelected={selected.length}/>
                <Table size="small" >
                    <EnhancedTableHead numSelected={selected.length} rowCount={props.callbacks.length} classes={classes} headCells={tableHeadCells} onSelectAllClick={handleSelectAllClick} onRequestSort={handleRequestSort} orderBy={orderBy} order={order}/>
                    <TableBody >
                    {
                        stableSort(props.callbacks, getComparator(order, orderBy)).map( (cal, index) => (
                            <CallbacksTableRow handleClick={handleClick} isItemSelected={isSelected} onOpenTab={props.onOpenTab} key={"callback" + cal.id} {...cal} callbackgraphedges={props.callbackgraphedges}/>
                        ))
                    }
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    )
}

