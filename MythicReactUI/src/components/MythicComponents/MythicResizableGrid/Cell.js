import React, { useCallback } from 'react';
import {classes} from './styles';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import {Dropdown, DropdownMenuItem, DropdownNestedMenuItem} from "../MythicNestedMenus";

const CellPreMemo = ({ style, rowIndex, columnIndex, data  }) => {
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const rowClassName = data.gridUUID + "row" + rowIndex;
    const rowHighlight = rowIndex % 2 === 1 ? 'MythicResizableGridRowHighlight' : '';
    const [contextMenuOptions, setContextMenuOptions] = React.useState(data?.rowContextMenuOptions || []);
    const dropdownAnchorRef = React.useRef(null);
    const item = data.items[rowIndex][columnIndex];
    const cellStyle = item?.props?.cellData?.cellStyle || {};
    const rowStyle = data.items[rowIndex][columnIndex]?.props?.rowData?.rowStyle || {};
    const contextMenuLocationRef = React.useRef({x: 0, y: 0});
    const ownsContextRowRef = React.useRef(false);
    const updateRowClass = useCallback((className, shouldAdd) => {
        const cells = document.getElementsByClassName(rowClassName);
        if(cells.length > 0){
            for(const cell of cells){
                cell.classList.toggle(className, shouldAdd);
            }
        }
    }, [rowClassName]);
    const handleDoubleClick = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            data.onDoubleClickRow(e, rowIndex - 1, data.items[rowIndex][columnIndex]?.props?.rowData); // minus 1 to account for header row
        },
        [columnIndex, data, rowIndex]
    );
    const handleClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if(data.onRowClick){
            data.onRowClick({event, rowDataStatic: data.items[rowIndex][columnIndex]?.props?.rowData})
        }
    };
    const selectedClass = data.items[rowIndex][columnIndex]?.props?.rowData?.selected ? "selectedCallback" : "";
    const rowFirstCellClass = columnIndex === 0 ? classes.rowFirstCell : "";
    const rowLastCellClass = columnIndex === data.items[rowIndex].length - 1 ? classes.rowLastCell : "";
    const rowInteractiveClass = data.onRowClick ? classes.rowInteractive : "";
    const setHoveredRow = useCallback((enabled) => {
        updateRowClass(classes.hoveredRow, enabled);
    }, [updateRowClass]);
    const setContextRow = useCallback((enabled) => {
        updateRowClass(classes.contextRow, enabled);
    }, [updateRowClass]);
    const onMouseEnter = useCallback(() => {
        setHoveredRow(true);
    }, [setHoveredRow]);
    const onMouseLeave = useCallback(() => {
        if(!ownsContextRowRef.current){
            setHoveredRow(false);
        }
    }, [setHoveredRow]);
    const handleMenuItemClick = (event, clickOption) => {
        event.preventDefault();
        event.stopPropagation();
        clickOption({event, columnIndex, rowIndex, data: data.items[rowIndex][columnIndex]?.props?.rowData || {}});
        setOpenContextMenu(false);
    };
    React.useEffect( () => {
        if(openContextMenu){
            ownsContextRowRef.current = true;
            setContextRow(true);
            setHoveredRow(true);
        } else if(ownsContextRowRef.current){
            ownsContextRowRef.current = false;
            setContextRow(false);
            setHoveredRow(false);
        }
    }, [openContextMenu, setContextRow, setHoveredRow]);
    React.useEffect( () => {
        return () => {
            if(ownsContextRowRef.current){
                setContextRow(false);
                setHoveredRow(false);
            }
        };
    }, [setContextRow, setHoveredRow]);
    const handleContextClick = useCallback(
        (event) => {
            event.preventDefault();
            event.stopPropagation();
            if(item?.disableFilterMenu){
                return;
            }
            contextMenuLocationRef.current.x = event.clientX;
            contextMenuLocationRef.current.y = event.clientY;
            if(data.onRowContextMenuClick){
                const newMenuItems = data.onRowContextMenuClick({rowDataStatic: data.items[rowIndex][columnIndex]?.props?.rowData});
                Promise.resolve(newMenuItems).then(function(value) {
                    if(value.length > 0){
                        setContextMenuOptions(value);
                        setOpenContextMenu(true);
                    }
                })
            } else {
                if(contextMenuOptions && contextMenuOptions.length > 0){
                    setOpenContextMenu(true);
                }
            }
        },
        [contextMenuOptions, data.onRowContextMenuClick] // eslint-disable-line react-hooks/exhaustive-deps
    );
    return (
        <div style={{...style, ...cellStyle, ...rowStyle}}
            className={`${classes.cell} ${rowClassName} ${rowHighlight} ${selectedClass} ${rowFirstCellClass} ${rowLastCellClass} ${rowInteractiveClass}`}
            onDoubleClick={handleDoubleClick}
            onClick={handleClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onContextMenu={handleContextClick} 
            ref={dropdownAnchorRef}
            >
            <div className={classes.cellInner} style={{height: style.height}}>
                {item}
            </div>
            <ContextMenu dropdownAnchorRef={dropdownAnchorRef} contextMenuOptions={contextMenuOptions}
                disableFilterMenu={item?.disableFilterMenu} openContextMenu={openContextMenu}
                         contextMenuLocationRef={contextMenuLocationRef}
                         setOpenContextMenu={setOpenContextMenu} handleMenuItemClick={handleMenuItemClick}
            />
        </div>
    );
};
export const ContextMenu = ({openContextMenu, dropdownAnchorRef, contextMenuOptions, setOpenContextMenu, handleMenuItemClick, contextMenuLocationRef}) => {
    const handleClose = (event) => {
        //if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
        //    return;
        //}
        setOpenContextMenu(false);
    };

    return (
        openContextMenu &&
        <ClickAwayListener onClickAway={handleClose} mouseEvent={"onMouseDown"}>
            <Dropdown
                isOpen={dropdownAnchorRef.current}
                onOpen={setOpenContextMenu}
                externallyOpen={openContextMenu}
                absoluteX={contextMenuLocationRef.current.x}
                absoluteY={contextMenuLocationRef.current.y}
                anchorReference={"anchorPosition"}
                menu={[
                    contextMenuOptions.map((option, index) => (
                        option.type === 'item' ? (
                            <DropdownMenuItem
                                key={option.name}
                                disabled={option.disabled}
                                className={option.danger ? "mythic-menu-item-hover-danger" : undefined}
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
                                        className={menuOption.danger ? "mythic-menu-item-hover-danger" : undefined}
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
