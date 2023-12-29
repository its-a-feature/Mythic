import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from 'react';
import PropTypes from 'prop-types';
import AutoSizer from 'react-virtualized-auto-sizer';
import useScrollbarSize from 'react-scrollbar-size';
import { VariableSizeGrid } from 'react-window';
import HeaderCell from './HeaderCell';
import Cell from './Cell';
import DraggableHandles from './DraggableHandles';
import {classes} from './styles';
const HeaderCellContext = createContext({});

const MIN_COLUMN_WIDTH = 100;

const CellRenderer = (VariableSizeGridProps) => {
    return VariableSizeGridProps.rowIndex === 0 ? null : <Cell VariableSizeGridProps={VariableSizeGridProps} />;
};
const innerElementType = React.forwardRef(({ children, ...rest }, ref) => {
    const HeaderCellData = useContext(HeaderCellContext);
    return (
        <div ref={ref} {...rest}>
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
                            onDoubleClick={(e, columnIndex) => {
                                if (column.disableAutosize) return;
                                HeaderCellData.autosizeColumn({columnIndex});
                            }}
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

const getShortRandomString = () => {
    return (Math.random() + 1).toString(36).substring(2);
}
const ResizableGridWrapper = ({
    columns,
    sortIndicatorIndex,
    sortDirection,
    items,
    headerNameKey,
    onClickHeader,
    onDoubleClickRow,
    contextMenuOptions,
    rowContextMenuOptions,
    rowHeight,
    widthMeasureKey,
    ...AutoSizerProps
}) => {
    /* Hooks */
    const { width: scrollbarWidth } = useScrollbarSize();

    const [columnWidths, setColumnWidths] = useState(columns.map((column) => column.width || MIN_COLUMN_WIDTH));
    const gridUUID = React.useMemo( () => getShortRandomString(), []);
    const gridRef = useRef(null);
    const dragHandlesRef = useRef(null);
    const getColumnWidth = useCallback(
        (index) => {
            return columnWidths[index] || MIN_COLUMN_WIDTH;
        },
        [columnWidths]
    );
    const getRowHeight = useCallback(
        (index) => {
            return rowHeight;
        },
        [rowHeight]
    );

    useEffect(() => {
        const totalWidth = AutoSizerProps.width - scrollbarWidth;
        const updatedColumnWidths = columns.map((column) => column.width || MIN_COLUMN_WIDTH);
        const totalWidthDiff = totalWidth - updatedColumnWidths.reduce((a, b) => a + b, 0);
        if (totalWidthDiff > 0) {
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
                updatedColumnWidths[updatedWidthIndexs[i]] += totalWidthDiff / updatedWidthIndexs.length;
            }
            //updatedColumnWidths[updatedWidthIndex] += totalWidthDiff;
        }
        setColumnWidths(updatedColumnWidths);
    }, [scrollbarWidth, columns, AutoSizerProps.width]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        gridRef.current.resetAfterColumnIndex(0, true);
    }, [columnWidths]);

    /* Event Handlers */

    const resizeColumn = (x, columnIndex) => {
        const updatedWidths = columnWidths.map((columnWidth, index) => {
            if (columnIndex === index) {
                return Math.floor(Math.max(columnWidth + x, MIN_COLUMN_WIDTH));
            }
            return Math.floor(columnWidth);
        });
        setColumnWidths(updatedWidths);
    };

    const autosizeColumn =  ({columnIndex}) => {
        const longestElementInColumn = Math.max(...items.map((itemRow) => {
            if(!columns[columnIndex].key){
                if(columns[columnIndex].plaintext){
                    columns[columnIndex].key = columns[columnIndex].plaintext;
                } else {
                    return 30;
                }

            }
            if(columns[columnIndex].key){
                if(columns[columnIndex].key.includes("time")){
                    return 30;
                }
                if(columns[columnIndex].key === "mythictree_groups"){
                    return itemRow[columnIndex]?.props?.cellData.length;
                }
                try{
                    items = JSON.parse(itemRow[columnIndex]?.props?.rowData?.[columns[columnIndex].key]);
                    if(Array.isArray(items) && items.length > 0){
                        return String(items[0]).length;
                    }
                }catch(error){
                    //console.log(itemRow[columnIndex]?.props?.rowData?.[columns[columnIndex].key])
                }
                let data = itemRow[columnIndex]?.props?.rowData?.[columns[columnIndex].key];
                if(!data){
                    return 3;
                }
                if(data.plaintext){
                    return String(data.plaintext).length || -1;
                } else {
                    return String(data).length || -1;
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
        const updatedWidths = columnWidths.map((columnWidth, index) => {
            if (columnIndex === index) {
                return Math.floor(Math.max(longestElementInColumn * 10 + 40, MIN_COLUMN_WIDTH));
            }
            return Math.floor(columnWidth);
        });
        setColumnWidths(updatedWidths);
    };

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
    }
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
                    itemData={{ items: itemsWithHeader, onDoubleClickRow, gridUUID, rowContextMenuOptions}}
                    innerElementType={innerElementType}
                    overscanRowCount={5}
                    onScroll={({ scrollLeft }) => {
                        if (dragHandlesRef.current) {
                            dragHandlesRef.current.scrollTo({ left: scrollLeft });
                        }
                    }}
                    ref={gridRef}>
                    {CellRenderer}
                </VariableSizeGrid>
                <DraggableHandles
                    height={AutoSizerProps.height}
                    rowHeight={getRowHeight(0)}
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
    widthMeasureKey,
    rowHeight = 32,
}) => {
    return (
        <AutoSizer style={{height: "100%"}}>
            {(AutoSizerProps) => (
                <ResizableGridWrapper
                    columns={columns}
                    headerNameKey={headerNameKey}
                    sortIndicatorIndex={sortIndicatorIndex}
                    sortDirection={sortDirection}
                    items={items}
                    widthMeasureKey={widthMeasureKey}
                    rowHeight={rowHeight}
                    onClickHeader={onClickHeader}
                    onDoubleClickRow={onDoubleClickRow}
                    contextMenuOptions={contextMenuOptions}
                    rowContextMenuOptions={rowContextMenuOptions}
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
    headerNameKey: PropTypes.string,
    widthMeasureKey: PropTypes.string
};

export default MythicResizableGrid;
