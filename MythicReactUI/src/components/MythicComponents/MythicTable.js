import React from 'react';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Checkbox from '@mui/material/Checkbox';


function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

export function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

export function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}




export function EnhancedTableHead(props) {
  const { classes, onSelectAllClick, order, orderBy, numSelected, onRequestSort } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            indeterminate={numSelected > 0 && numSelected < props.rowCount}
            checked={props.rowCount > 0 && numSelected === props.rowCount}
            onChange={onSelectAllClick}
            inputProps={{ 'aria-label': 'select all desserts' }}
          />
        </TableCell>
        {props.headCells.map((headCell) => (
          props.shownColumns === undefined || props.shownColumns.includes(headCell.id) || headCell.id === "id" ? (
            <TableCell
              key={headCell.id}
              align={'left'}
              padding={headCell.disablePadding ? 'none' : 'default'}
              sortDirection={orderBy === headCell.id ? order : false}
            >
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={createSortHandler(headCell.id)}
              >
                {headCell.label}
                {orderBy === headCell.id ? (
                  <span className={classes.visuallyHidden}>
                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </span>
                ) : null}
              </TableSortLabel>
            </TableCell>
          ) : (null)
        ))}
      </TableRow>
    </TableHead>
  );
}

export function EnhancedTableRow(props){
    
  const labelId = `enhanced-table-checkbox-${props.index}`;

  return (
    <TableRow
      hover
      
      role="checkbox"
      aria-checked={props.isItemSelected}
      tabIndex={-1}
      key={props.id}
      selected={props.isItemSelected}
      style={props.style === undefined ? {} : props.style}
    >
      <TableCell padding="checkbox">
        <Checkbox
          onClick={(event) => props.handleClick(event, props.id)}
          checked={props.isItemSelected}
          inputProps={{ 'aria-labelledby': labelId }}
        />
      </TableCell>
      {props.children}
    </TableRow>
  );

}
