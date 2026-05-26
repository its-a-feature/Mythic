
import {createPortal} from 'react-dom';

export const reorder = (
    list,
    startIndex,
    endIndex
) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

export const MythicDraggablePortal = ({children, isDragging}) => {
    if(isDragging && typeof document !== "undefined"){
        return createPortal(children, document.body);
    }
    return children;
};
