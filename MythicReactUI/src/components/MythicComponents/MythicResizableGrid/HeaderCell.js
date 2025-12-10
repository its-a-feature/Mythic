import { Box, Typography } from '@mui/material';
import { useCallback } from 'react';
import useSingleAndDoubleClick from '../../utilities/useSingleAndDoubleClick';
import {classes} from './styles';
import React from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faFilter} from '@fortawesome/free-solid-svg-icons';
import {ContextMenu} from "./Cell";

const HeaderCell = ({
    onClick = () => {},
    onDoubleClick = () => {},
    contextMenuOptions = [],
    sortIndicatorIndex,
    sortDirection,
    headerNameKey = "name",
    VariableSizeGridProps: { style, rowIndex, columnIndex, data },
}) => {
    const dropdownAnchorRef = React.useRef(null);
    const item = data.items[rowIndex][columnIndex];
    const isFiltered = item?.filtered || false;
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
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const handleContextClick = useCallback(
        (event) => {
            event.preventDefault();
            if(item.disableFilterMenu){
                return;
            }
            if(contextMenuOptions && contextMenuOptions.length > 0){
                contextMenuLocationRef.current.x = event.clientX;
                contextMenuLocationRef.current.y = event.clientY;
                setOpenContextMenu(true);
            }
        },
        [contextMenuOptions, columnIndex] // eslint-disable-line react-hooks/exhaustive-deps
    );
    const handleMenuItemClick = (event, clickOption) => {
        event.preventDefault();
        event.stopPropagation();
        clickOption({event, columnIndex, rowIndex, data: data.items[rowIndex][columnIndex]?.props?.rowData || {}});
        setOpenContextMenu(false);
    };

    const handleClicks = useSingleAndDoubleClick(handleClick, handleDoubleClick);

    return (
        <div style={style} className={classes.headerCell} onClick={handleClicks} onContextMenu={handleContextClick} ref={dropdownAnchorRef}>
            <Box display='flex' alignItems='center' justifyContent='space-between' width='100%'>
                <Typography className={classes.cellInner} variant='body1'>
                    {item[headerNameKey].toUpperCase()}
                </Typography>
                {isFiltered && <FontAwesomeIcon icon={faFilter} />}
                {sortIndicatorIndex === columnIndex && (sortDirection === 'ASC' ? <div>↑</div> : <div>↓</div>)}
                <ContextMenu dropdownAnchorRef={dropdownAnchorRef} contextMenuOptions={contextMenuOptions}
                             disableFilterMenu={item?.disableFilterMenu} openContextMenu={openContextMenu}
                             contextMenuLocationRef={contextMenuLocationRef}
                             setOpenContextMenu={setOpenContextMenu} handleMenuItemClick={handleMenuItemClick}
                />
            </Box>
        </div>
    );
};

export default HeaderCell;
