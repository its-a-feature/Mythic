import { Box, Typography } from '@mui/material';
import { useCallback } from 'react';
import useSingleAndDoubleClick from '../../utilities/useSingleAndDoubleClick';
import {classes} from './styles';
import React from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faFilter} from '@fortawesome/free-solid-svg-icons';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';

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
    const theme = useTheme();
    const item = data.items[rowIndex][columnIndex];
    const isFiltered = item?.filtered || false;
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
                
                setOpenContextMenu(true);
            }
        },
        [contextMenuOptions, columnIndex] // eslint-disable-line react-hooks/exhaustive-deps
    );
    const handleMenuItemClick = (event, index) => {
        contextMenuOptions[index].click({event, columnIndex});
        setOpenContextMenu(false);
    };
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }
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
                <Popper open={openContextMenu} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal style={{zIndex: 4}}>
                  {({ TransitionProps, placement }) => (
                    <Grow
                      {...TransitionProps}
                      style={{
                        transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                      }}
                    >
                      <Paper variant="outlined" style={{backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light}}>
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
            </Box>
        </div>
    );
};

export default HeaderCell;
