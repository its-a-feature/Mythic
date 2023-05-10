import React, { useState } from 'react';
import useStyles from './styles';
import Draggable from 'react-draggable';

const DraggableHandles = React.forwardRef(({ height, rowHeight, width, minColumnWidth, columnWidths, onStop }, ref) => {
    const classes = useStyles();
    const [isDragging, setIsDragging] = useState(false);
    return (
        <div
            ref={ref}
            className={classes.draggableHandlesContainer}
            style={{
                height: height,
                width: width,
                pointerEvents: isDragging ? 'initial' : 'none',
            }}>
            {columnWidths.map((_, i) => {
                const leftOffset = columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
                return (
                    <Draggable
                        key={i}
                        axis='x'
                        bounds={{
                            left: minColumnWidth - columnWidths[i],
                            right: Number.POSITIVE_INFINITY,
                            top: 0,
                            bottom: 0,
                        }}
                        position={isDragging ? null : { x: 0, y: 0 }}
                        onStart={() => {
                            setIsDragging(i);
                        }}
                        onStop={(e, data) => {
                            setIsDragging(false);
                            onStop(data.x, i);
                        }}>
                        <div
                            className={classes.draggableHandlesClickArea}
                            style={{
                                left: leftOffset + columnWidths[i] - 1 - 8,
                                height: rowHeight,
                            }}>
                            <div
                                className={classes.draggableHandlesIndicator}
                                style={{
                                    display: isDragging === i ? 'block' : 'none',
                                    height: height / 2,
                                }}
                            />
                        </div>
                    </Draggable>
                );
            })}
        </div>
    );
});

export default DraggableHandles;
