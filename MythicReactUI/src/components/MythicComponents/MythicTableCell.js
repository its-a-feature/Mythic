import {styled} from '@mui/material/styles';
import TableCell from '@mui/material/TableCell';
const MythicStyledTableCell = styled(TableCell, {name: "StyledTableRow", slot: "Wrapper"})({
  padding: "0 0 0 10px"
});
export default MythicStyledTableCell;
