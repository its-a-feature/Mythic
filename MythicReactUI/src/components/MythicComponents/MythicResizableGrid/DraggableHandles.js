import React, { useState } from 'react';
import {classes} from './styles';
import Draggable from 'react-draggable';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const DraggableHandles = React.forwardRef(({ height, rowHeight, width, minColumnWidth, columnWidths, onStop }, ref) => {
    const [isDragging, setIsDragging] = useState(-1);
    const nodeRef = React.useRef(null);
    return (
        <div
            ref={ref}
            className={classes.draggableHandlesContainer}
            style={{
                height: height,
                width: width,
                pointerEvents: isDragging >= 0 ? 'initial' : 'none',
            }}>
            {columnWidths.map((_, i) => {
                // leftOffset is the sum of the width of all columns left of i
                const leftOffset = columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
                return (
                    <Draggable
                        key={i}
                        nodeRef={nodeRef}
                        axis='x'
                        bounds={{
                            left: minColumnWidth - columnWidths[i],
                            right: Number.POSITIVE_INFINITY,
                            top: 0,
                            bottom: 0,
                        }}
                        offsetParent={document.body}

                        defaultPosition={{x: 0, y: 0}}
                        position={{x: 0, y: 0}}
                        onStart={() => {
                            setIsDragging(i);
                        }}
                        onStop={(e, data) => {
                            setIsDragging(-1);
                            onStop(data.x, i);
                        }}>
                            <MoreVertIcon
                                ref={nodeRef}
                                className={isDragging === i ? classes.draggableHandlesClickAreaSelected : classes.draggableHandlesClickArea}
                                style={{
                                    left: leftOffset + columnWidths[i] - 1 - 7,
                                }}>
                            </MoreVertIcon>
                    </Draggable>
                );
            })}
        </div>
    );
});

export default DraggableHandles;