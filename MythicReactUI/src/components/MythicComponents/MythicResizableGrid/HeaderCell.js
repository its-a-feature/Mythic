import { Box, Typography } from '@mui/material';
import { useCallback } from 'react';
import useSingleAndDoubleClick from '../../utilities/useSingleAndDoubleClick';
import {classes} from './styles';
import React from 'react';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {ContextMenu} from "./Cell";

const HeaderCell = ({
    onClick = () => {},
    onDoubleClick = () => {},
    contextMenuOptions = [],
    sortIndicatorIndex,
    sortDirection,
    headerNameKey = "name",
    isResizing = false,
    onResizePointerDown = () => {},
    VariableSizeGridProps: { style, rowIndex, columnIndex, data },
}) => {
    const dropdownAnchorRef = React.useRef(null);
    const item = data.items[rowIndex][columnIndex];
    const isFiltered = item?.filtered || false;
    const isSorted = sortIndicatorIndex === columnIndex;
    const HeaderSortIcon = sortDirection === 'ASC' ? KeyboardArrowUpIcon : KeyboardArrowDownIcon;
    const headerLabel = item?.[headerNameKey] || "";
    const contextMenuLocationRef = React.useRef({x: 0, y: 0});
    const handleClick = useCallback(
        (e) => {
            onClick(e, columnIndex);
        },
        [onClick, columnIndex]
    );

    const handleDoubleClick = useCallback(
        (e) => {
            onDoubleClick(e, columnIndex);
        },
        [onDoubleClick, columnIndex]
    );
    const handleResizePointerDown = useCallback(
        (event) => {
            event.preventDefault();
            event.stopPropagation();
            onResizePointerDown(event, columnIndex);
        },
        [onResizePointerDown, columnIndex]
    );
    const handleResizeDoubleClick = useCallback(
        (event) => {
            event.preventDefault();
            event.stopPropagation();
            onDoubleClick(event, columnIndex);
        },
        [onDoubleClick, columnIndex]
    );
    const stopResizeClickPropagation = useCallback(
        (event) => {
            event.preventDefault();
            event.stopPropagation();
        },
        []
    );
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const menuContext = React.useMemo(() => {
        return {columnIndex, rowIndex, data: data.items[rowIndex][columnIndex]?.props?.rowData || {}};
    }, [columnIndex, data.items, rowIndex]);
    const resolvedContextMenuOptions = React.useMemo(() => {
        const resolveOption = (option) => {
            const resolvedOption = {
                ...option,
                disabled: typeof option.disabled === "function" ? option.disabled(menuContext) : option.disabled,
            };
            if(option.menuItems){
                resolvedOption.menuItems = option.menuItems.map(resolveOption);
            }
            return resolvedOption;
        };
        return contextMenuOptions.map(resolveOption);
    }, [contextMenuOptions, menuContext]);
    const handleContextClick = useCallback(
        (event) => {
            event.preventDefault();
            if(resolvedContextMenuOptions && resolvedContextMenuOptions.length > 0){
                contextMenuLocationRef.current.x = event.clientX;
                contextMenuLocationRef.current.y = event.clientY;
                setOpenContextMenu(true);
            }
        },
        [resolvedContextMenuOptions]
    );
    const handleMenuItemClick = (event, clickOption) => {
        event.preventDefault();
        event.stopPropagation();
        clickOption({event, ...menuContext});
        setOpenContextMenu(false);
    };
    const filterMenuOption = React.useMemo(
        () => resolvedContextMenuOptions.find((option) => option.type === "item" && option.name === "Filter Column"),
        [resolvedContextMenuOptions]
    );
    const handleFilterIndicatorClick = useCallback(
        (event) => {
            event.preventDefault();
            event.stopPropagation();
            if(filterMenuOption?.disabled || !filterMenuOption?.click){
                return;
            }
            filterMenuOption.click({event, ...menuContext});
            setOpenContextMenu(false);
        },
        [filterMenuOption, menuContext]
    );

    const handleClicks = useSingleAndDoubleClick(handleClick, handleDoubleClick);
    const className = `${classes.headerCell} ${item.disableSort ? classes.headerCellNoSort : ""}`;

    return (
        <div
            style={style}
            className={className}
            onClick={handleClicks}
            onContextMenu={handleContextClick}
            ref={dropdownAnchorRef}
            title={typeof headerLabel === "string" ? headerLabel : undefined}
        >
            <Box className={classes.headerContent}>
                <Typography className={`${classes.cellInner} ${classes.headerLabel}`} component='div' variant='body1'>
                    {typeof headerLabel === "string" ? headerLabel : headerLabel}
                </Typography>
                <Box className={classes.headerActions}>
                    {isFiltered &&
                        <button
                            aria-label={`Edit filter for ${typeof headerLabel === "string" ? headerLabel : "column"}`}
                            className={`${classes.headerIndicator} ${classes.headerFilterIcon}`}
                            onClick={handleFilterIndicatorClick}
                            title="Edit Filter"
                            type="button"
                        >
                            <FilterAltOutlinedIcon fontSize="inherit" />
                        </button>
                    }
                    {isSorted &&
                        <span className={`${classes.headerIndicator} ${classes.headerSortIcon}`} title={`Sorted ${sortDirection === 'ASC' ? 'ascending' : 'descending'}`}>
                            <HeaderSortIcon fontSize="inherit" />
                        </span>
                    }
                </Box>
                <ContextMenu dropdownAnchorRef={dropdownAnchorRef} contextMenuOptions={resolvedContextMenuOptions}
                             disableFilterMenu={item?.disableFilterMenu} openContextMenu={openContextMenu}
                             contextMenuLocationRef={contextMenuLocationRef}
                             setOpenContextMenu={setOpenContextMenu} handleMenuItemClick={handleMenuItemClick}
                />
            </Box>
            {!item.disableResize &&
                <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${typeof headerLabel === "string" ? headerLabel : "column"} column`}
                    className={`${classes.headerResizeHandle} ${isResizing ? classes.headerResizeHandleActive : ""}`}
                    onPointerDown={handleResizePointerDown}
                    onDoubleClick={handleResizeDoubleClick}
                    onClick={stopResizeClickPropagation}
                />
            }
        </div>
    );
};

export default HeaderCell;
