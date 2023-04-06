import React, { useCallback } from 'react';
import useStyles from './styles';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';

const CellPreMemo = ({ VariableSizeGridProps: { style, rowIndex, columnIndex, data } }) => {
    const rowClassName = data.gridUUID + "row" + rowIndex;
    const classes = useStyles();
    const contextMenuOptions = data?.rowContextMenuOptions || [];
    const dropdownAnchorRef = React.useRef(null);
    const theme = useTheme();
    const handleDoubleClick = useCallback(
        (e) => {
            data.onDoubleClickRow(e, rowIndex - 1); // minus 1 to account for header row
        },
        [data, rowIndex]
    );

    const item = data.items[rowIndex][columnIndex];
    const cellStyle = item?.props?.cellData?.cellStyle || {};
    const rowStyle = data.items[rowIndex][columnIndex]?.props?.rowData?.rowStyle || {};
    const onMouseEnter = () => {
        const cells = document.getElementsByClassName(rowClassName);
        if(cells.length > 0){
            for(const cell of cells){
                cell.classList.add(classes.hoveredRow);
            }
        }
    }
    const onMouseLeave = () => {
        const cells = document.getElementsByClassName(rowClassName);
        if(cells.length > 0){
            for(const cell of cells){
                cell.classList.remove(classes.hoveredRow);
            }
        }
    }
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const handleContextClick = useCallback(
        (event) => {
            event.preventDefault();
            if(item.disableFilterMenu){
                return;
            }
            if(contextMenuOptions && contextMenuOptions.length > 0){
                
                setOpenContextMenu(true);
            }
        },
        [contextMenuOptions, columnIndex] // eslint-disable-line react-hooks/exhaustive-deps
    );
    const handleMenuItemClick = (event, index) => {
        contextMenuOptions[index].click({event, columnIndex, rowIndex, data: data.items[rowIndex][columnIndex]?.props?.rowData || {}});
        setOpenContextMenu(false);
    };
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }
        setOpenContextMenu(false);
      };
    return (
        <div style={{...style, ...cellStyle, ...rowStyle}} 
            className={`${classes.cell} ${rowClassName}`} 
            onDoubleClick={handleDoubleClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onContextMenu={handleContextClick} 
            ref={dropdownAnchorRef}
            >
            <div className={classes.cellInner}>{item}</div>
            <Popper open={openContextMenu} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal style={{zIndex: 4}}>
                {({ TransitionProps, placement }) => (
                <Grow
                    {...TransitionProps}
                    style={{
                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                    }}
                >
                    <Paper variant="outlined" style={{backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light, color: "white"}}>
                    <ClickAwayListener onClickAway={handleClose}>
                        <MenuList id="split-button-menu"  >
                        {contextMenuOptions.map((option, index) => (
                            <MenuItem
                            key={option.name + index}
                            onClick={(event) => handleMenuItemClick(event, index)}
                            >
                            {option.name}
                            </MenuItem>
                        ))}
                        </MenuList>
                    </ClickAwayListener>
                    </Paper>
                </Grow>
                )}
            </Popper>
        </div>
    );
};
const Cell = React.memo(CellPreMemo);
export default Cell;

