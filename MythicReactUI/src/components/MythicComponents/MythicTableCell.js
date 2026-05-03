import {styled} from '@mui/material/styles';
import TableCell from '@mui/material/TableCell';
const MythicStyledTableCell = styled(TableCell, {})(({theme}) => ({
  borderBottom: `1px solid ${theme.table?.borderSoft || theme.borderColor}`,
  lineHeight: 1.35,
  padding: "6px 10px !important",
  verticalAlign: "middle",
  "&.MuiTableCell-head": {
    borderBottom: `1px solid ${theme.table?.border || theme.borderColor}`,
    padding: "6px 10px !important",
  },
  "&:first-of-type": {
    paddingLeft: "12px !important",
  },
  "&:last-of-type": {
    paddingRight: "12px !important",
  },
}));
export default MythicStyledTableCell;
