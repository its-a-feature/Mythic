import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from 'react';
import PropTypes from 'prop-types';
import AutoSizer from 'react-virtualized-auto-sizer';
import useScrollbarSize from 'react-scrollbar-size';
import { VariableSizeGrid } from 'react-window';
import HeaderCell from './HeaderCell';
import Cell from './Cell';
import {classes} from './styles';
import {GetMythicSetting, useSetMythicSetting} from "../MythicSavedUserSetting";
import FitScreenIcon from '@mui/icons-material/FitScreen';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';

const HeaderCellContext = createContext({});

const MIN_COLUMN_WIDTH = 100;
const MIN_FLEX_COLUMN_WIDTH = 150;
const AUTOSIZE_HORIZONTAL_PADDING = 44;
const AUTOSIZE_HEADER_EXTRA_WIDTH = 28;
const headerMenuIconStyle = {fontSize: "1rem", marginRight: "8px"};
const normalizeHeaderContextMenuOption = (option) => {
    if(option?.name === "Filter Column"){
        return {
            ...option,
            icon: <FilterAltOutlinedIcon style={headerMenuIconStyle} />,
        };
    }
    if(option?.menuItems){
        return {
            ...option,
            menuItems: option.menuItems.map(normalizeHeaderContextMenuOption),
        };
    }
    return option;
};

let autosizeCanvas;

const getNumericWidth = (value) => {
    const width = Number(value);
    return Number.isFinite(width) ? width : undefined;
};
const getColumnMinWidth = (column) => {
    const configuredMinWidth = getNumericWidth(column?.minWidth);
    return Math.max(configuredMinWidth || 0, column?.fillWidth ? MIN_FLEX_COLUMN_WIDTH : MIN_COLUMN_WIDTH);
};
const getColumnMaxWidth = (column) => {
    const configuredMaxWidth = getNumericWidth(column?.maxWidth);
    return configuredMaxWidth && configuredMaxWidth > 0 ? configuredMaxWidth : Infinity;
};
const clampColumnWidth = (column, width) => {
    const minWidth = getColumnMinWidth(column);
    const maxWidth = getColumnMaxWidth(column);
    const numericWidth = getNumericWidth(width) || minWidth;
    return Math.floor(Math.min(maxWidth, Math.max(numericWidth, minWidth)));
};
const getPreferredColumnWidth = (column) => {
    return column?.width === undefined ? getColumnMinWidth(column) : column.width;
};
const distributeFillWidth = ({columns, columnWidths, totalWidth}) => {
    const availableWidth = Math.max(0, Math.floor(totalWidth || 0));
    const currentWidth = columnWidths.reduce((a, b) => a + b, 0);
    const widthDifference = availableWidth - currentWidth;
    if(widthDifference <= 0 || columns.length === 0){
        return columnWidths;
    }
    const fillColumnIndexes = columns.reduce((previous, column, index) => {
        return column.fillWidth ? [...previous, index] : previous;
    }, []);
    const targetIndexes = fillColumnIndexes.length > 0 ? fillColumnIndexes : [columns.length - 1];
    let remainingWidth = widthDifference;
    const updatedColumnWidths = [...columnWidths];
    for(let i = 0; i < targetIndexes.length; i++){
        const columnIndex = targetIndexes[i];
        const share = i === targetIndexes.length - 1 ? remainingWidth : Math.floor(widthDifference / targetIndexes.length);
        const currentColumnWidth = updatedColumnWidths[columnIndex];
        const nextColumnWidth = clampColumnWidth(columns[columnIndex], currentColumnWidth + share);
        updatedColumnWidths[columnIndex] = nextColumnWidth;
        remainingWidth -= nextColumnWidth - currentColumnWidth;
    }
    return updatedColumnWidths;
};
const getInitialColumnWidths = ({columns, savedWidths = [], totalWidth = 0}) => {
    const hasSavedWidths = savedWidths.length === columns.length;
    const baseColumnWidths = columns.map((column, index) => {
        return clampColumnWidth(column, hasSavedWidths ? savedWidths[index] : getPreferredColumnWidth(column));
    });
    if(hasSavedWidths){
        return baseColumnWidths;
    }
    return distributeFillWidth({columns, columnWidths: baseColumnWidths, totalWidth});
};
const areColumnWidthsEqual = (first = [], second = []) => {
    if(first.length !== second.length){
        return false;
    }
    return first.every((width, index) => Math.floor(width || MIN_COLUMN_WIDTH) === Math.floor(second[index] || MIN_COLUMN_WIDTH));
};
const normalizeColumnWidths = (columnWidths = []) => {
    return columnWidths.map((columnWidth) => Math.floor(getNumericWidth(columnWidth) || MIN_COLUMN_WIDTH));
};
const getMeasureContext = () => {
    if(typeof document === "undefined"){
        return null;
    }
    if(autosizeCanvas === undefined){
        autosizeCanvas = document.createElement("canvas");
    }
    const context = autosizeCanvas.getContext("2d");
    if(context === null){
        return null;
    }
    const referenceElement = document.querySelector(`.${classes.cell}`) || document.body;
    const computedStyle = window.getComputedStyle(referenceElement);
    context.font = [
        computedStyle.fontStyle,
        computedStyle.fontVariant,
        computedStyle.fontWeight,
        computedStyle.fontSize,
        computedStyle.fontFamily,
    ].join(" ");
    return context;
};
const getDisplayText = (value) => {
    if(value === undefined || value === null){
        return "";
    }
    if(typeof value === "string"){
        const trimmedValue = value.trim();
        if(trimmedValue.startsWith("[")){
            try{
                const parsedValue = JSON.parse(trimmedValue);
                if(Array.isArray(parsedValue) && parsedValue.length > 0){
                    return getDisplayText(parsedValue[0]);
                }
            }catch(error){
                // Keep the original string when it is not a serialized array.
            }
        }
        return value;
    }
    if(typeof value === "number" || typeof value === "boolean"){
        return String(value);
    }
    if(Array.isArray(value)){
        return value.map((entry) => getDisplayText(entry)).filter(Boolean).join(", ");
    }
    if(React.isValidElement(value)){
        return getDisplayText(value.props?.cellData || value.props?.children);
    }
    if(typeof value === "object"){
        if(value.plaintext !== undefined){
            return getDisplayText(value.plaintext);
        }
        if(value.name !== undefined){
            return getDisplayText(value.name);
        }
        if(value.button?.name !== undefined){
            return getDisplayText(value.button.name);
        }
        if(value.display !== undefined){
            return getDisplayText(value.display);
        }
        return "";
    }
    return "";
};
const getCellAutosizeText = ({column, cell}) => {
    const cellProps = cell?.props || {};
    const columnKey = column?.key || column?.plaintext;
    const rowData = cellProps.rowData || {};
    const cellDataText = getDisplayText(cellProps.cellData);
    if(cellDataText !== ""){
        return cellDataText;
    }
    if(columnKey !== undefined){
        return getDisplayText(rowData?.[columnKey]);
    }
    return getDisplayText(cell);
};
const measureAutosizeText = (context, text) => {
    const normalizedText = getDisplayText(text);
    if(normalizedText === ""){
        return 0;
    }
    const lines = normalizedText.split(/\r?\n/);
    return lines.reduce((longestLineWidth, line) => {
        const textWidth = context ? context.measureText(line).width : line.length * 8;
        return Math.max(longestLineWidth, textWidth);
    }, 0);
};
const getAutosizedColumnWidth = ({column, columnIndex, headerNameKey, items}) => {
    const measureContext = getMeasureContext();
    const headerText = getDisplayText(column?.[headerNameKey] || column?.name || column?.plaintext);
    const headerWidth = measureAutosizeText(measureContext, headerText.toUpperCase()) + AUTOSIZE_HEADER_EXTRA_WIDTH;
    const widestCellWidth = items.reduce((widestWidth, itemRow) => {
        const cellText = getCellAutosizeText({column, cell: itemRow[columnIndex]});
        return Math.max(widestWidth, measureAutosizeText(measureContext, cellText));
    }, 0);
    return clampColumnWidth(column, Math.max(headerWidth, widestCellWidth) + AUTOSIZE_HORIZONTAL_PADDING);
};

const CellRendererPreMemo = ({ style, rowIndex, columnIndex, data }) => {
    return rowIndex === 0 ? null : <Cell style={style} rowIndex={rowIndex} columnIndex={columnIndex} data={data} />;
};
const CellRenderer = React.memo(CellRendererPreMemo);
const innerElementType = React.forwardRef(({ children, style }, ref) => {
    const HeaderCellData = useContext(HeaderCellContext);
    const resizingColumnIndex = HeaderCellData.resizingColumnIndex;
    const resizeGuideLeft = resizingColumnIndex >= 0 ?
        HeaderCellData.columnWidths.slice(0, resizingColumnIndex + 1).reduce((a, b) => a + b, 0) :
        -1;
    const onHeaderDoubleClick = React.useCallback( (e, columnIndex) => {
        if (HeaderCellData.columns[columnIndex].disableAutosize) return;
        HeaderCellData.autosizeColumn({columnIndex});
    }, [HeaderCellData.columns, HeaderCellData.autosizeColumn]);
    return (
        <div ref={ref} style={{...style, position: "relative"}}>
            {/* always render header cells */}
            <div
                className={classes.headerCellRow}
                style={{
                    height: HeaderCellData.getRowHeight(0),
                }}>
                {HeaderCellData.columns.map((column, i) => {
                    const leftOffset = HeaderCellData.columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
                    return (
                        <HeaderCell
                            key={i}
                            headerNameKey={HeaderCellData.headerNameKey}
                            onClick={HeaderCellData.onClickHeader}
                            onDoubleClick={onHeaderDoubleClick}
                            contextMenuOptions={HeaderCellData.contextMenuOptions}
                            sortIndicatorIndex={HeaderCellData.sortIndicatorIndex}
                            sortDirection={HeaderCellData.sortDirection}
                            isResizing={HeaderCellData.resizingColumnIndex === i}
                            onResizePointerDown={HeaderCellData.startColumnResize}
                            VariableSizeGridProps={{
                                style: {
                                    position: 'absolute',
                                    top: 0,
                                    left: leftOffset,
                                    height: HeaderCellData.getRowHeight(0),
                                    width: HeaderCellData.getColumnWidth(i),
                                },
                                rowIndex: 0,
                                columnIndex: i,
                                data: { items: HeaderCellData.itemsWithHeader },
                            }}
                        />
                    );
                })}
            </div>
            {/* render other cells as usual */}
            {children}
            {resizingColumnIndex >= 0 &&
                <div
                    className={classes.resizeGuide}
                    style={{
                        left: resizeGuideLeft,
                        height: style.height,
                    }}
                />
            }
        </div>
    );
});

export const GetShortRandomString = () => {
    return (Math.random() + 1).toString(36).substring(2);
}
const ResizableGridWrapper = ({
    name,
    columns,
    sortIndicatorIndex,
    sortDirection,
    items,
    headerNameKey,
    onClickHeader,
    onDoubleClickRow,
    contextMenuOptions,
    rowContextMenuOptions,
    onRowContextMenuClick,
    rowHeight,
    headerRowHeight,
    widthMeasureKey,
    callbackTableGridRef,
    onRowClick,
    ...AutoSizerProps
}) => {
    /* Hooks */
    const { width: scrollbarWidth } = useScrollbarSize();
    const localColumnsRef = React.useRef(columns);
    const initialSavedWidths = name === undefined ? [] : GetMythicSetting({setting_name: `${name}_column_widths`, default_value: {}, output: "json-array"});
    const savedColumnWidths = Array.isArray(initialSavedWidths) ? initialSavedWidths : [];
    const [columnWidths, setColumnWidths] = useState(() => getInitialColumnWidths({
        columns,
        savedWidths: savedColumnWidths,
        totalWidth: AutoSizerProps.width - scrollbarWidth,
    }));
    const gridUUID = React.useMemo( () => GetShortRandomString(), []);
    const gridRef = useRef(null);
    const columnWidthsRef = useRef(columnWidths);
    const lastResetColumnIndexRef = useRef(0);
    const activeResizeRef = useRef(null);
    const resizeFrameRef = useRef(null);
    const cleanupResizeListenersRef = useRef(null);
    const [resizingColumnIndex, setResizingColumnIndex] = useState(-1);
    const [updateSetting] = useSetMythicSetting();
    const setColumnWidthsAndRef = useCallback( (newColumnWidths, resetColumnIndex=0) => {
        const normalizedColumnWidths = normalizeColumnWidths(newColumnWidths);
        if(areColumnWidthsEqual(columnWidthsRef.current, normalizedColumnWidths)){
            return false;
        }
        lastResetColumnIndexRef.current = resetColumnIndex;
        columnWidthsRef.current = normalizedColumnWidths;
        setColumnWidths(normalizedColumnWidths);
        return true;
    }, []);
    const getColumnWidth = useCallback(
        (index) => {
            return columnWidths[index] || MIN_COLUMN_WIDTH;
        },
        [columnWidths]
    );
    const getRowHeight = useCallback(
        (index) => {
            if(index === 0){
                return headerRowHeight;
            }
            return rowHeight;
        },
        [rowHeight, headerRowHeight]
    );
    useEffect(() => {
        if(savedColumnWidths.length === columns.length && localColumnsRef.current.length === columns.length){
            return;
        }
        localColumnsRef.current = columns;
        const updatedColumnWidths = getInitialColumnWidths({
            columns,
            savedWidths: [],
            totalWidth: AutoSizerProps.width - scrollbarWidth,
        });
        const didUpdateWidths = setColumnWidthsAndRef(updatedColumnWidths);
        if(didUpdateWidths && name !== undefined){
            updateSetting({setting_name: `${name}_column_widths`, value: updatedColumnWidths});
        }

    }, [scrollbarWidth, columns, AutoSizerProps.width, localColumnsRef.current, setColumnWidthsAndRef]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if(gridRef.current){
            gridRef.current.resetAfterColumnIndex(lastResetColumnIndexRef.current, true);
        }
    }, [columnWidths]);

    /* Event Handlers */

    const startColumnResize = useCallback( (event, columnIndex) => {
        if(columns[columnIndex]?.disableResize){
            return;
        }
        const initialWidths = columnWidthsRef.current.map( (columnWidth) => Math.floor(columnWidth || MIN_COLUMN_WIDTH));
        const startClientX = event.clientX;
        const startWidth = initialWidths[columnIndex] || MIN_COLUMN_WIDTH;
        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;
        const applyResizeWidth = (clientX) => {
            const activeResize = activeResizeRef.current;
            if(!activeResize){
                return;
            }
            activeResize.latestClientX = clientX;
            if(resizeFrameRef.current !== null){
                return;
            }
            resizeFrameRef.current = window.requestAnimationFrame(() => {
                resizeFrameRef.current = null;
                const currentResize = activeResizeRef.current;
                if(!currentResize){
                    return;
                }
                const resizeDelta = currentResize.latestClientX - currentResize.startClientX;
                const nextColumnWidth = clampColumnWidth(columns[currentResize.columnIndex], currentResize.startWidth + resizeDelta);
                const updatedColumnWidths = currentResize.initialWidths.map( (columnWidth, index) => {
                    return currentResize.columnIndex === index ? nextColumnWidth : columnWidth;
                });
                setColumnWidthsAndRef(updatedColumnWidths, currentResize.columnIndex);
            });
        };
        const cleanupResizeListeners = () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            cleanupResizeListenersRef.current = null;
        };
        const finishResize = (clientX) => {
            const currentResize = activeResizeRef.current;
            if(!currentResize){
                cleanupResizeListeners();
                return;
            }
            if(resizeFrameRef.current !== null){
                window.cancelAnimationFrame(resizeFrameRef.current);
                resizeFrameRef.current = null;
            }
            const resizeDelta = clientX - currentResize.startClientX;
            const nextColumnWidth = clampColumnWidth(columns[currentResize.columnIndex], currentResize.startWidth + resizeDelta);
            const updatedColumnWidths = currentResize.initialWidths.map( (columnWidth, index) => {
                return currentResize.columnIndex === index ? nextColumnWidth : columnWidth;
            });
            activeResizeRef.current = null;
            const didUpdateWidths = setColumnWidthsAndRef(updatedColumnWidths, currentResize.columnIndex);
            if(didUpdateWidths && name !== undefined){
                updateSetting({setting_name: `${name}_column_widths`, value: updatedColumnWidths});
            }
            setResizingColumnIndex(-1);
            cleanupResizeListeners();
        };
        function handlePointerMove(pointerEvent){
            pointerEvent.preventDefault();
            applyResizeWidth(pointerEvent.clientX);
        }
        function handlePointerUp(pointerEvent){
            pointerEvent.preventDefault();
            finishResize(pointerEvent.clientX);
        }
        event.currentTarget.setPointerCapture?.(event.pointerId);
        activeResizeRef.current = {
            columnIndex,
            initialWidths,
            latestClientX: startClientX,
            startClientX,
            startWidth,
        };
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        setResizingColumnIndex(columnIndex);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
        cleanupResizeListenersRef.current = cleanupResizeListeners;
    }, [columns, name, setColumnWidthsAndRef, updateSetting]);
    useEffect(() => {
        return () => {
            cleanupResizeListenersRef.current?.();
            activeResizeRef.current = null;
            if(resizeFrameRef.current !== null){
                window.cancelAnimationFrame(resizeFrameRef.current);
                resizeFrameRef.current = null;
            }
        };
    }, []);
    const autosizeColumn =  useCallback( ({columnIndex}) => {
        const column = columns[columnIndex];
        if(column?.disableDoubleClick || column?.disableAutosize){
            return
        }
        const currentColumnWidths = columnWidthsRef.current;
        const updatedColumnWidths = currentColumnWidths.map((columnWidth, index) => {
            if (columnIndex === index) {
                return getAutosizedColumnWidth({column, columnIndex, headerNameKey, items});
            }
            return Math.floor(columnWidth);
        });
        const didUpdateWidths = setColumnWidthsAndRef(updatedColumnWidths, columnIndex);
        if(didUpdateWidths){
            if(name !== undefined){
                updateSetting({setting_name: `${name}_column_widths`, value: updatedColumnWidths});
            }
        }
    }, [columns, headerNameKey, items, name, setColumnWidthsAndRef, updateSetting]);
    const autosizeAllColumns = useCallback( () => {
        const currentColumnWidths = columnWidthsRef.current;
        const updatedColumnWidths = currentColumnWidths.map((columnWidth, columnIndex) => {
            const column = columns[columnIndex];
            if(column?.disableDoubleClick || column?.disableAutosize){
                return Math.floor(columnWidth);
            }
            return getAutosizedColumnWidth({column, columnIndex, headerNameKey, items});
        });
        const didUpdateWidths = setColumnWidthsAndRef(updatedColumnWidths, 0);
        if(didUpdateWidths && name !== undefined){
            updateSetting({setting_name: `${name}_column_widths`, value: updatedColumnWidths});
        }
    }, [columns, headerNameKey, items, name, setColumnWidthsAndRef, updateSetting]);
    const resetColumnWidths = useCallback( () => {
        const updatedColumnWidths = getInitialColumnWidths({
            columns,
            savedWidths: [],
            totalWidth: AutoSizerProps.width - scrollbarWidth,
        });
        const didUpdateWidths = setColumnWidthsAndRef(updatedColumnWidths, 0);
        if(didUpdateWidths && name !== undefined){
            updateSetting({setting_name: `${name}_column_widths`, value: updatedColumnWidths});
        }
    }, [AutoSizerProps.width, columns, name, scrollbarWidth, setColumnWidthsAndRef, updateSetting]);
    const headerContextMenuOptions = React.useMemo( () => {
        const sizingOptions = [
            {
                name: "Autosize Column",
                type: "item",
                icon: <FitScreenIcon style={headerMenuIconStyle} />,
                disabled: ({columnIndex}) => columns[columnIndex]?.disableDoubleClick || columns[columnIndex]?.disableAutosize,
                click: ({columnIndex}) => autosizeColumn({columnIndex}),
            },
            {
                name: "Autosize All Columns",
                type: "item",
                icon: <ViewColumnIcon style={headerMenuIconStyle} />,
                disabled: columns.every((column) => column?.disableDoubleClick || column?.disableAutosize),
                click: () => autosizeAllColumns(),
            },
            {
                name: "Reset Column Widths",
                type: "item",
                icon: <RestartAltIcon style={headerMenuIconStyle} />,
                click: () => resetColumnWidths(),
            },
        ];
        return [...sizingOptions, ...(contextMenuOptions || []).map(normalizeHeaderContextMenuOption)];
    }, [autosizeAllColumns, autosizeColumn, columns, contextMenuOptions, resetColumnWidths]);

    useEffect( () => {
        if(callbackTableGridRef){
            callbackTableGridRef.current = gridRef.current;
        }
    }, [gridRef.current])
    const itemsWithHeader = [columns, ...items];
    const headerCellData = {
        "getRowHeight": getRowHeight,
        "columns": columns,
        "columnWidths": columnWidths,
        "headerNameKey": headerNameKey,
        "onClickHeader": onClickHeader,
        "autosizeColumn": autosizeColumn,
        "contextMenuOptions": headerContextMenuOptions,
        "sortIndicatorIndex": sortIndicatorIndex,
        "sortDirection": sortDirection,
        "getColumnWidth": getColumnWidth,
        "resizingColumnIndex": resizingColumnIndex,
        "startColumnResize": startColumnResize,
        "itemsWithHeader": itemsWithHeader,
    };
    return (
        <>
            <HeaderCellContext.Provider value={headerCellData}>
                <VariableSizeGrid
                    className={classes.grid}
                    height={Math.max(1, AutoSizerProps.height)}
                    width={AutoSizerProps.width}
                    columnCount={columns.length}
                    columnWidth={getColumnWidth}
                    headerNameKey={headerNameKey}
                    rowCount={itemsWithHeader.length}
                    rowHeight={getRowHeight}
                    itemData={{ items: itemsWithHeader,
                        onDoubleClickRow, gridUUID,
                        rowContextMenuOptions, onRowClick,
                        onRowContextMenuClick}}
                    innerElementType={innerElementType}
                    overscanRowCount={20}
                    useIsScrolling={false}
                    ref={gridRef}>
                    {CellRenderer}
                </VariableSizeGrid>
            </HeaderCellContext.Provider>

        </>
    );
};

const MythicResizableGrid = ({
    columns,
    sortIndicatorIndex,
    sortDirection,
    items,
    onClickHeader,
    headerNameKey,
    onDoubleClickRow,
    contextMenuOptions,
    rowContextMenuOptions,
    onRowContextMenuClick,
    widthMeasureKey,
    rowHeight = 20,
    headerRowHeight = 20,
    callbackTableGridRef,
    onRowClick,
    name,
}) => {
    return (
        <div className={classes.root}>
            <AutoSizer style={{height: "100%", width: "100%"}}>
                {(AutoSizerProps) => (
                    <ResizableGridWrapper
                        name={name}
                        columns={columns}
                        callbackTableGridRef={callbackTableGridRef}
                        headerNameKey={headerNameKey}
                        sortIndicatorIndex={sortIndicatorIndex}
                        sortDirection={sortDirection}
                        items={items}
                        widthMeasureKey={widthMeasureKey}
                        rowHeight={rowHeight}
                        headerRowHeight={headerRowHeight}
                        onClickHeader={onClickHeader}
                        onDoubleClickRow={onDoubleClickRow}
                        contextMenuOptions={contextMenuOptions}
                        rowContextMenuOptions={rowContextMenuOptions}
                        onRowContextMenuClick={onRowContextMenuClick}
                        onRowClick={onRowClick}
                        {...AutoSizerProps}
                    />
                )}
            </AutoSizer>
        </div>
    );
};

MythicResizableGrid.propTypes = {
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string,
            width: PropTypes.number,
            disableAutosize: PropTypes.bool,
            disableResize: PropTypes.bool,
            disableSort: PropTypes.bool
        })
    ).isRequired,
    sortIndicatorIndex: PropTypes.number,
    sortDirection: PropTypes.oneOf(['ASC', 'DESC']),
    items: PropTypes.arrayOf(PropTypes.array).isRequired,
    onClickHeader: PropTypes.func,
    onDoubleClickRow: PropTypes.func,
    contextMenuOptions: PropTypes.array,
    rowContextMenuOptions: PropTypes.array,
    rowHeight: PropTypes.number,
    headerRowHeight: PropTypes.number,
    headerNameKey: PropTypes.string,
    widthMeasureKey: PropTypes.string
};

export default MythicResizableGrid;
