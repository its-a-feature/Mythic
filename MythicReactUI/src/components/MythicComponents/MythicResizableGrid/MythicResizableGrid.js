import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from 'react';
import PropTypes from 'prop-types';
import AutoSizer from 'react-virtualized-auto-sizer';
import useScrollbarSize from 'react-scrollbar-size';
import { VariableSizeGrid } from 'react-window';
import HeaderCell from './HeaderCell';
import Cell from './Cell';
import DraggableHandles from './DraggableHandles';
import {classes} from './styles';
import {GetMythicSetting, useSetMythicSetting} from "../MythicSavedUserSetting";

const HeaderCellContext = createContext({});

const MIN_COLUMN_WIDTH = 20;
const MIN_FLEX_COLUMN_WIDTH = 150;


const CellRendererPreMemo = ({ style, rowIndex, columnIndex, data }) => {
    return rowIndex === 0 ? null : <Cell style={style} rowIndex={rowIndex} columnIndex={columnIndex} data={data} />;
};
const CellRenderer = React.memo(CellRendererPreMemo);
const innerElementType = React.forwardRef(({ children, style }, ref) => {
    const HeaderCellData = useContext(HeaderCellContext);
    const onHeaderDoubleClick = React.useCallback( (e, columnIndex) => {
        if (HeaderCellData.columns[columnIndex].disableAutosize) return;
        HeaderCellData.autosizeColumn({columnIndex});
    }, [HeaderCellData.columns, HeaderCellData.autosizeColumn]);
    return (
        <div ref={ref} style={style}>
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
    const [columnWidths, setColumnWidths] = useState(columns.map((column, index) => {
        if(initialSavedWidths.length > 0){
            return initialSavedWidths[index];
        }
        if(column.fillWidth){
            return Math.max(column?.width || 0, MIN_FLEX_COLUMN_WIDTH);
        }
        return Math.max(column?.width || 0, MIN_COLUMN_WIDTH);
    }));
    const gridUUID = React.useMemo( () => GetShortRandomString(), []);
    const gridRef = useRef(null);
    const dragHandlesRef = useRef(null);
    const [updateSetting] = useSetMythicSetting();
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
        if(initialSavedWidths.length > 0 && localColumnsRef.current.length === columns.length){
            return;
        }
        localColumnsRef.current = columns;
        const totalWidth = AutoSizerProps.width - scrollbarWidth;
        const updatedColumnWidths = columns.map((column, index) => {
            return column.width || MIN_COLUMN_WIDTH
        });
        const totalWidthDiff = totalWidth - updatedColumnWidths.reduce((a, b) => a + b, 0);
        if (totalWidthDiff !== 0) {
            let updatedWidthIndexs = [];
            for(let i = 0; i < columns.length; i++){
                // check if any of the columns have the `fillWidth` property to true
                if(columns[i]["fillWidth"]){
                    updatedWidthIndexs.push(i);
                }
            }
            if(updatedWidthIndexs.length === 0){
                updatedWidthIndexs.push(columns.length - 1);
            }
            for(let i = 0; i < updatedWidthIndexs.length; i++){
                updatedColumnWidths[updatedWidthIndexs[i]] += Math.max(totalWidthDiff / updatedWidthIndexs.length, MIN_FLEX_COLUMN_WIDTH);
            }
            //updatedColumnWidths[updatedWidthIndex] += totalWidthDiff;
        }
        setColumnWidths(updatedColumnWidths);
        if(name !== undefined){
            updateSetting({setting_name: `${name}_column_widths`, value: updatedColumnWidths});
        }

    }, [scrollbarWidth, columns, AutoSizerProps.width, localColumnsRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        gridRef.current.resetAfterColumnIndex(0, true);
        if(name !== undefined){
            updateSetting({setting_name: `${name}_column_widths`, value: columnWidths});
        }
    }, [columnWidths]);

    /* Event Handlers */

    const resizeColumn = useCallback( (x, columnIndex) => {
        const updatedColumnWidths = columnWidths.map((columnWidth, index) => {
            if (columnIndex === index) {
                return Math.floor(Math.max(columnWidth + x, MIN_COLUMN_WIDTH));
            }
            return Math.floor(columnWidth);
        });
        setColumnWidths(updatedColumnWidths);
        if(name !== undefined){
            updateSetting({setting_name: `${name}_column_widths`, value: updatedColumnWidths});
        }

    }, [columnWidths]);
    const autosizeColumn =  useCallback( ({columnIndex}) => {
        if(columns[columnIndex].disableDoubleClick){
            return
        }
        const longestElementInColumn = Math.max(...items.map((itemRow) => {
            if(columns[columnIndex].key === undefined){
                if(columns[columnIndex].plaintext){
                    columns[columnIndex].key = columns[columnIndex].plaintext;
                } else {
                    return 30;
                }
            }
            if(columns[columnIndex].key !== undefined){
                if(columns[columnIndex].key.includes("time")){
                    return 30;
                }
                if(columns[columnIndex].key === "mythictree_groups"){
                    return itemRow[columnIndex]?.props?.cellData.length;
                }
                if(columns[columnIndex].type === "size"){
                    if(itemRow[columnIndex]?.props?.cellData){
                        return String(itemRow[columnIndex]?.props?.cellData?.plaintext)?.length;
                    }
                    return itemRow[columnIndex].length;
                }
                try{
                    items = JSON.parse(itemRow[columnIndex]?.props?.rowData?.[columns[columnIndex].key]);
                    if(Array.isArray(items) && items.length > 0){
                        return String(items[0]).length;
                    }
                }catch(error){
                    //console.log(itemRow[columnIndex]?.props?.rowData?.[columns[columnIndex].key])
                }
                if(typeof itemRow[columnIndex]?.props?.cellData === 'string' ){
                    return itemRow[columnIndex]?.props?.cellData.length;
                }

                let data = itemRow[columnIndex]?.props?.rowData?.[columns[columnIndex].key];
                if(columns[columnIndex].inMetadata){
                    return itemRow[columnIndex]?.props?.cellData.length;
                }
                if(data === undefined){
                    return MIN_COLUMN_WIDTH;
                }
                if(data.plaintext){
                    return String(data.plaintext)?.length;
                } else if(data?.button?.name) {
                    return String(data?.button?.name)?.length ;
                } else {
                    return MIN_COLUMN_WIDTH;
                }
                //return String(itemRow[columnIndex]?.props?.rowData?.[columns[columnIndex].key]).length || -1;
            } else if(typeof(itemRow[columnIndex]?.props?.cellData) === "string") {
                try {
                    items = JSON.parse(itemRow[columnIndex]?.props?.cellData);
                    if (Array.isArray(items) && items.length > 0) {
                        return String(items[0]).length;
                    }
                } catch (error) {
                    return itemRow[columnIndex]?.props?.cellData.length;
                }
            } else if(Array.isArray(itemRow[columnIndex]?.props?.cellData)){
                return itemRow[columnIndex]?.props?.cellData.join(", ").length;
            }else {
                return itemRow[columnIndex]?.props?.cellData?.length || -1;
            }

        }));
        const updatedColumnWidths = columnWidths.map((columnWidth, index) => {
            if (columnIndex === index) {
                if(isNaN(longestElementInColumn)){
                    return MIN_COLUMN_WIDTH;
                }
                return Math.floor(Math.max(longestElementInColumn * 10 + 40, MIN_COLUMN_WIDTH));
            }
            return Math.floor(columnWidth);
        });
        //console.log(updatedColumnWidths, columnWidths, longestElementInColumn);
        let updatedValues = false;
        for(let i = 0; i < updatedColumnWidths.length; i++){
            if(updatedColumnWidths[i] !== columnWidths[i]){
                updatedValues = true;
                break;
            }
        }
        if(updatedValues){
            setColumnWidths(() => updatedColumnWidths);
        }
    }, [columnWidths]);

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
        "contextMenuOptions": contextMenuOptions,
        "sortIndicatorIndex": sortIndicatorIndex,
        "sortDirection": sortDirection,
        "getColumnWidth": getColumnWidth,
        "itemsWithHeader": itemsWithHeader,
    };
    const localOnScroll = React.useCallback( ({scrollLeft}) => {

        if (dragHandlesRef.current) {
            dragHandlesRef.current.scrollTo({ left: scrollLeft });
        }
    }, [dragHandlesRef.current])
    return (
        <>
            <HeaderCellContext.Provider value={headerCellData}>
                <VariableSizeGrid
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
                    onScroll={localOnScroll}
                    ref={gridRef}>
                    {CellRenderer}
                </VariableSizeGrid>
                <DraggableHandles
                    height={AutoSizerProps.height}
                    rowHeight={headerRowHeight}
                    width={AutoSizerProps.width}
                    minColumnWidth={MIN_COLUMN_WIDTH}
                    columnWidths={columnWidths}
                    onStop={resizeColumn}
                    ref={dragHandlesRef}
                />
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
        <AutoSizer style={{height: "100%"}}>
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
    );
};

MythicResizableGrid.propTypes = {
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string,
            width: PropTypes.number,
            disableAutosize: PropTypes.bool,
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
