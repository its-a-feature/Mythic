import {MythicActionButton} from "../../MythicComponents/MythicActionButton";
import React from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {MythicDraggablePortal, reorder} from "../../MythicComponents/MythicDraggableList";
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
        <DialogContent dividers={true} sx={{p: 0, overflow: "hidden"}}>
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
                    <div className="mythic-reorder-list flex flex-fill flex-column gap-4 min-h-0 overflow-auto" ref={provided.innerRef} {...provided.droppableProps}>
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
            {(provided, snapshot) => {
                const row = (
                    <div
                        ref={provided.innerRef}
                        className={`mythic-reorder-row items-center flex flex-none gap-4 rounded bg-surface-raised border-subtle text-primary shadow-none${snapshot.isDragging ? " mythic-reorder-row-dragging mythic-tone-primary bg-tone-1 border-tone-3 shadow-3" : ""}${item.visible ? "" : " mythic-reorder-row-disabled"} min-w-0 w-full`}
                        {...provided.draggableProps}
                    >
                        <span className="mythic-reorder-drag-handle items-center inline-flex justify-center rounded bg-neutral-2 border-subtle text-muted" {...provided.dragHandleProps}>
                            <DragHandleIcon fontSize="small" />
                        </span>
                        <div className="mythic-reorder-row-main items-center flex flex-fill gap-4 min-w-0">
                            <span className="mythic-reorder-row-title text-sm font-750 leading-125 min-w-0 truncate whitespace-nowrap">{item.name}</span>
                        </div>
                        <div className="mythic-reorder-row-actions items-center flex flex-none gap-3">
                            <MythicActionButton iconOnly
                                aria-label={item.visible ? `Hide ${item.name}` : `Show ${item.name}`}
                                appearance="raised" colorMode="hover" tone={item.visible ? "error" : "info"}
                                size="small"
                                onClick={() => onToggleVisibility(index)}
                            >
                                {item.visible ? (
                                    <VisibilityIcon fontSize="small" />
                                ) : (
                                    <VisibilityOffIcon fontSize="small" />
                                )}
                            </MythicActionButton>
                        </div>
                    </div>
                );
                return (
                    <MythicDraggablePortal isDragging={snapshot.isDragging}>
                        {row}
                    </MythicDraggablePortal>
                );
            }}
        </Draggable>
    );
};
