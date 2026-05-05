import React from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import {reorder} from "../../MythicComponents/MythicDraggableList";
import {
    Draggable,
    DragDropContext,
    Droppable,
} from "@hello-pangea/dnd";
import DragHandleIcon from '@mui/icons-material/DragHandle';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicDialogSection,
} from "../../MythicComponents/MythicDialogLayout";

export function CallbacksTableColumnsReorderDialog({initialItems, onSubmit, onClose, onReset, visible, hidden}) {
    const [items, setItems] = React.useState(initialItems);
    const onDragEnd = ({ destination, source }) => {
        // dropped outside the list
        if (!destination) return;
        const newItems = reorder(items, source.index, destination.index);
        setItems(newItems);
    };
    React.useEffect( () => {
        setItems((currentItems) => currentItems.map( c => {
            if(visible.includes(c.name)){
                return {...c, visible: true};
            }
            return {...c, visible: false};
        }));
    }, [visible, hidden]);
    const onToggleVisibility = (i) => {
        const newItems = items.map( (c, index) => {
            if(index === i){
                return {...c, visible: !c.visible};
            }
            return {...c};
        });
        setItems(newItems);
    }
    const onFinish = () => {
        onSubmit(items);
    }

  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Column Layout</DialogTitle>
        <DialogContent dividers={true} sx={{p: 0}}>
            <MythicDialogBody sx={{height: "min(70vh, 42rem)", p: 1}}>
                <MythicDialogSection
                    title="Columns"
                    sx={{display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0}}
                >
                    <DraggableList items={items} onToggleVisibility={onToggleVisibility} onDragEnd={onDragEnd} />
                </MythicDialogSection>
            </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={onClose}>
            Close
          </MythicDialogButton>
            <MythicDialogButton onClick={onReset} intent="warning">
                Reset
            </MythicDialogButton>
          <MythicDialogButton onClick={onFinish} intent="primary">
            Save
          </MythicDialogButton>
        </MythicDialogFooter>
  </React.Fragment>
  );
}

export const DraggableList = ({ items, onDragEnd, onToggleVisibility }) => {
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="callback-table-column-list">
                {(provided) => (
                    <div className="mythic-reorder-list" ref={provided.innerRef} {...provided.droppableProps}>
                        {items.map((item, index) => (
                            <DraggableListItem onToggleVisibility={onToggleVisibility} item={item} index={index} key={item.key} />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
};
export const DraggableListItem = ({ item, index, onToggleVisibility }) => {
    return (
        <Draggable draggableId={item.key} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    className={`mythic-reorder-row${snapshot.isDragging ? " mythic-reorder-row-dragging" : ""}${item.visible ? "" : " mythic-reorder-row-disabled"}`}
                    {...provided.draggableProps}
                >
                    <span className="mythic-reorder-drag-handle" {...provided.dragHandleProps}>
                        <DragHandleIcon fontSize="small" />
                    </span>
                    <div className="mythic-reorder-row-main">
                        <span className="mythic-reorder-row-title">{item.name}</span>
                    </div>
                    <div className="mythic-reorder-row-actions">
                        <IconButton
                            aria-label={item.visible ? `Hide ${item.name}` : `Show ${item.name}`}
                            className={`mythic-table-row-icon-action ${item.visible ? "mythic-table-row-icon-action-hover-danger" : "mythic-table-row-icon-action-hover-info"}`}
                            size="small"
                            onClick={() => onToggleVisibility(index)}
                        >
                            {item.visible ? (
                                <VisibilityIcon fontSize="small" />
                            ) : (
                                <VisibilityOffIcon fontSize="small" />
                            )}
                        </IconButton>
                    </div>
                </div>
            )}
        </Draggable>
    );
};
