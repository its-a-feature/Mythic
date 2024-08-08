import React, { useCallback } from 'react';
import {classes} from './styles';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import {Dropdown, DropdownMenuItem, DropdownNestedMenuItem} from "../MythicNestedMenus";

const CellPreMemo = ({ VariableSizeGridProps: { style, rowIndex, columnIndex, data } }) => {
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const rowClassName = data.gridUUID + "row" + rowIndex;
    const [contextMenuOptions, setContextMenuOptions] = React.useState(data?.rowContextMenuOptions || []);
    const dropdownAnchorRef = React.useRef(null);
    const handleDoubleClick = useCallback(
        (e) => {
            data.onDoubleClickRow(e, rowIndex - 1); // minus 1 to account for header row
        },
        [data, rowIndex]
    );
    const item = data.items[rowIndex][columnIndex];
    const cellStyle = item?.props?.cellData?.cellStyle || {};
    const rowStyle = data.items[rowIndex][columnIndex]?.props?.rowData?.rowStyle || {};
    const selectedClass = data.items[rowIndex][columnIndex]?.props?.rowData?.selected ? "selectedCallback" : "";
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
    const handleMenuItemClick = (event, clickOption) => {
        clickOption({event, columnIndex, rowIndex, data: data.items[rowIndex][columnIndex]?.props?.rowData || {}});
        setOpenContextMenu(false);
    };
    const handleContextClick = useCallback(
        (event) => {
            event.preventDefault();
            if(item.disableFilterMenu){
                return;
            }
            if(data.onRowContextMenuClick){
                const newMenuItems = data.onRowContextMenuClick({rowDataStatic: data.items[rowIndex][columnIndex]?.props?.rowData});
                if(newMenuItems.length > 0){
                    setContextMenuOptions(newMenuItems);
                    setOpenContextMenu(true);
                    return;
                }
            }
            if(contextMenuOptions && contextMenuOptions.length > 0){
                setOpenContextMenu(true);
            }
        },
        [contextMenuOptions, data.onRowContextMenuClick] // eslint-disable-line react-hooks/exhaustive-deps
    );
    return (
        <div style={{...style, ...cellStyle, ...rowStyle}}
            className={`${classes.cell} ${rowClassName} ${selectedClass}`}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onContextMenu={handleContextClick} 
            ref={dropdownAnchorRef}
            >
            <div className={classes.cellInner} style={{height: style.height}}>
                {item}
            </div>
            <ContextMenu dropdownAnchorRef={dropdownAnchorRef} contextMenuOptions={contextMenuOptions}
                disableFilterMenu={item.disableFilterMenu} openContextMenu={openContextMenu}
                         setOpenContextMenu={setOpenContextMenu} handleMenuItemClick={handleMenuItemClick}
            />
        </div>
    );
};
const ContextMenu = ({openContextMenu, dropdownAnchorRef, contextMenuOptions, setOpenContextMenu, handleMenuItemClick}) => {
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
            return;
        }
        setOpenContextMenu(false);
    };

    return (
        openContextMenu &&
        <ClickAwayListener onClickAway={handleClose} mouseEvent={"onMouseDown"}>
            <Dropdown
                isOpen={dropdownAnchorRef.current}
                onOpen={setOpenContextMenu}
                externallyOpen={openContextMenu}
                menu={[
                    contextMenuOptions.map((option, index) => (
                        option.type === 'item' ? (
                            <DropdownMenuItem
                                key={option.name}
                                disabled={option.disabled}
                                onClick={(event) => handleMenuItemClick(event, option.click)}
                            >
                                {option.icon}{option.name}
                            </DropdownMenuItem>
                        ) : option.type === 'menu' ? (
                            <DropdownNestedMenuItem
                                label={option.name}
                                disabled={option.disabled}
                                menu={
                                    option.menuItems.map((menuOption, indx) => (
                                        <DropdownMenuItem
                                            key={menuOption.name}
                                            disabled={menuOption.disabled}
                                            onClick={(event) => handleMenuItemClick(event, menuOption.click)}
                                        >
                                            {menuOption.icon}{menuOption.name}
                                        </DropdownMenuItem>
                                    ))
                                }
                            />
                        ) : null
                    )),
                ]}
            />
        </ClickAwayListener>

    )
}
const Cell = React.memo(CellPreMemo);
export default Cell;

/*
<Popper open={openContextMenu} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal style={{zIndex: 4}}>
            {({ TransitionProps, placement }) => (
                <Grow
                    {...TransitionProps}
                    style={{
                        transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                    }}
                >
                    <Paper variant="outlined" style={{backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light, color: "white"}}>
                        <ClickAwayListener onClickAway={handleClose} mouseEvent={"onMouseDown"}>
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
 */