import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import TableRow from '@mui/material/TableRow';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import Link from '@mui/material/Link';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
import {GetMythicSetting, useSetMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Input from '@mui/material/Input';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {normalizeTaskingDisplayFields, operatorSettingDefaults, taskingContextFieldsOptions, taskingDisplayFieldOptions, taskTimestampDisplayFieldOptions} from "../../../cache";
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {snackActions} from "../../utilities/Snackbar";
import {userSettingsQuery} from "../../App";
import {copyStringToClipboard} from "../../utilities/Clipboard";
import {useLazyQuery } from '@apollo/client';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import {MythicColorSwatchInput} from "../../MythicComponents/MythicColorInput";
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicDialogSection,
} from "../../MythicComponents/MythicDialogLayout";
import {reorder} from "../../MythicComponents/MythicDraggableList";
import {
    Draggable,
    DragDropContext,
    Droppable,
} from "@hello-pangea/dnd";

const interactTypeOptions = [
    {value: "interact", display: "Accordions"},
    {value: "interactSplit", display: "Split View"},
    {value: "interactConsole", display: "Console Like"}
];
const commonFontFamilies = [
    operatorSettingDefaults.fontFamily,
    "-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",\"Segoe UI Symbol\"",
    "Monaco"
];
const getTaskingDisplayOption = (fieldName) => {
    return taskingDisplayFieldOptions.find((option) => option.name === fieldName);
}
const getTaskingDisplayLayoutItems = (visibleFields) => {
    const visibleSet = new Set(visibleFields);
    const orderedVisibleItems = visibleFields.reduce((prev, fieldName) => {
        const option = getTaskingDisplayOption(fieldName);
        if(option){
            return [...prev, {...option, visible: true}];
        }
        return prev;
    }, []);
    const hiddenItems = taskingDisplayFieldOptions.reduce((prev, option) => {
        if(visibleSet.has(option.name)){
            return prev;
        }
        return [...prev, {...option, visible: false}];
    }, []);
    return [...orderedVisibleItems, ...hiddenItems];
}
const TaskingMetadataSummary = ({value, onChange}) => {
    const [openLayoutDialog, setOpenLayoutDialog] = React.useState(false);
    const selectedOptions = value.map(getTaskingDisplayOption).filter(Boolean);
    const hiddenCount = taskingDisplayFieldOptions.length - selectedOptions.length;
    const onSubmitLayout = (items) => {
        onChange(normalizeTaskingDisplayFields(items.reduce((prev, item) => {
            if(item.visible){
                return [...prev, item.name];
            }
            return prev;
        }, [])));
        setOpenLayoutDialog(false);
    }
    return (
        <>
            <Box className="mythic-tasking-visibility-panel mythic-tasking-visibility-summary-panel">
                <Box>
                    <Typography component="div" className="mythic-tasking-visibility-title">
                        Tasking metadata
                    </Typography>
                    <Typography component="div" className="mythic-tasking-visibility-description">
                        Selected chips appear in this order above task commands.
                    </Typography>
                </Box>
                <Box className="mythic-tasking-visibility-summary-actions">
                    <Typography component="div" className="mythic-tasking-visibility-count">
                        {selectedOptions.length} shown{hiddenCount > 0 ? `, ${hiddenCount} hidden` : ""}
                    </Typography>
                    <Button
                        className="mythic-dialog-title-action mythic-tasking-visibility-manage-button"
                        onClick={() => setOpenLayoutDialog(true)}
                        size="small"
                        variant="outlined"
                    >
                        Manage
                    </Button>
                </Box>
                <Box className="mythic-tasking-visibility-chip-row">
                    {selectedOptions.length > 0 ? (
                        selectedOptions.map((option, index) => (
                            <span className="mythic-tasking-visibility-chip" key={option.name}>
                                <span className="mythic-tasking-visibility-chip-index">{index + 1}</span>
                                {option.display}
                            </span>
                        ))
                    ) : (
                        <Typography component="div" className="mythic-tasking-visibility-empty">
                            No tasking metadata selected.
                        </Typography>
                    )}
                </Box>
            </Box>
            {openLayoutDialog &&
                <MythicDialog
                    open={openLayoutDialog}
                    onClose={() => setOpenLayoutDialog(false)}
                    maxWidth="sm"
                    innerDialog={
                        <TaskingMetadataLayoutDialog
                            initialItems={getTaskingDisplayLayoutItems(value)}
                            onClose={() => setOpenLayoutDialog(false)}
                            onReset={() => onSubmitLayout(getTaskingDisplayLayoutItems(operatorSettingDefaults.taskingDisplayFields))}
                            onSubmit={onSubmitLayout}
                        />
                    }
                />
            }
        </>
    )
}
const TaskingMetadataLayoutDialog = ({initialItems, onClose, onReset, onSubmit}) => {
    const [items, setItems] = React.useState(initialItems);
    const onDragEnd = ({destination, source}) => {
        if(!destination){
            return;
        }
        setItems(reorder(items, source.index, destination.index));
    }
    const onToggleVisibility = (index) => {
        setItems(items.map((item, itemIndex) => {
            if(itemIndex === index){
                return {...item, visible: !item.visible};
            }
            return item;
        }));
    }
    return (
        <>
            <DialogTitle id="form-dialog-title">Tasking Metadata Layout</DialogTitle>
            <DialogContent dividers={true} sx={{p: 0}}>
                <MythicDialogBody sx={{height: "min(70vh, 38rem)", p: 1}}>
                    <MythicDialogSection
                        title="Metadata Chips"
                        description="Drag to set display order. Toggle visibility to choose what appears in tasking."
                        sx={{display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0}}
                    >
                        <TaskingMetadataDraggableList
                            items={items}
                            onDragEnd={onDragEnd}
                            onToggleVisibility={onToggleVisibility}
                        />
                    </MythicDialogSection>
                </MythicDialogBody>
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={onClose}>
                    Cancel
                </MythicDialogButton>
                <MythicDialogButton onClick={onReset} intent="warning">
                    Reset
                </MythicDialogButton>
                <MythicDialogButton onClick={() => onSubmit(items)} intent="primary">
                    Save
                </MythicDialogButton>
            </MythicDialogFooter>
        </>
    )
}
const TaskingMetadataDraggableList = ({items, onDragEnd, onToggleVisibility}) => {
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="tasking-metadata-layout-list">
                {(provided) => (
                    <div className="mythic-reorder-list" ref={provided.innerRef} {...provided.droppableProps}>
                        {items.map((item, index) => (
                            <TaskingMetadataDraggableListItem
                                item={item}
                                index={index}
                                key={item.name}
                                onToggleVisibility={onToggleVisibility}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    )
}
const TaskingMetadataDraggableListItem = ({item, index, onToggleVisibility}) => {
    return (
        <Draggable draggableId={item.name} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    className={`mythic-reorder-row mythic-tasking-metadata-row${snapshot.isDragging ? " mythic-reorder-row-dragging" : ""}${item.visible ? "" : " mythic-reorder-row-disabled"}`}
                    {...provided.draggableProps}
                >
                    <span className="mythic-reorder-drag-handle" {...provided.dragHandleProps}>
                        <DragHandleIcon fontSize="small" />
                    </span>
                    <div className="mythic-reorder-row-main">
                        <span className="mythic-reorder-row-title">{item.display}</span>
                        <span className="mythic-reorder-row-description">{item.description}</span>
                    </div>
                    <div className="mythic-reorder-row-actions">
                        <IconButton
                            aria-label={item.visible ? `Hide ${item.display}` : `Show ${item.display}`}
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
    )
}
const isValidColor = (color) =>{
    if(typeof color !== "string"){
        return false;
    }
    if(color.length !== 7){
        return false;
    }
    if(color[0] !== "#"){
        return false;
    }
    return true;
}

const COLOR_EDITOR_SECTIONS = [
    {
        title: "Application Shell",
        description: "Page chrome, surfaces, typography, and borders.",
        colors: [
            {name: "background", display: "App Background", description: "Main page background behind views and dialogs.", preview: "surface"},
            {name: "paper", display: "Panel Background", description: "Menus, dialogs, and content surfaces.", preview: "surface"},
            {name: "pageHeader", display: "Page Headers", description: "Header bars at the top of major pages.", preview: "surface"},
            {name: "text", display: "Text", description: "Primary readable text throughout the UI.", preview: "surface"},
            {name: "borderColor", display: "Borders", description: "Outlines around panels, tables, and controls.", preview: "surface"},
        ],
    },
    {
        title: "Navigation",
        description: "Left navigation gradient, labels, and icons.",
        colors: [
            {name: "navBarColor", display: "Navigation Top", description: "Start color for the navigation background.", preview: "navigation"},
            {name: "navBarBottomColor", display: "Navigation Bottom", description: "End color for the navigation background.", preview: "navigation"},
            {name: "navBarIcons", display: "Navigation Icons", description: "Icon color in the navigation bar.", preview: "navigation"},
            {name: "navBarText", display: "Navigation Text", description: "Text color in the navigation bar.", preview: "navigation"},
        ],
    },
    {
        title: "Tables and Selection",
        description: "Table headers, hover states, and selected callback emphasis.",
        colors: [
            {name: "tableHeader", display: "Table Header", description: "Sticky header rows in tables and data grids.", preview: "table"},
            {name: "tableHover", display: "Table Hover", description: "Rows when hovered or softly emphasized.", preview: "table"},
            {name: "selectedCallbackColor", display: "Active Callback", description: "Currently active callback row highlight.", preview: "table"},
            {name: "selectedCallbackHierarchyColor", display: "Tree Host Highlight", description: "Current host highlight in tree views.", preview: "table"},
        ],
    },
    {
        title: "Status Colors",
        description: "Button, alert, tag, and status accents.",
        colors: [
            {name: "primary", display: "Primary", description: "Primary actions and key affordances.", preview: "status"},
            {name: "secondary", display: "Secondary", description: "Secondary actions and supporting accents.", preview: "status"},
            {name: "info", display: "Info", description: "Informational actions and notices.", preview: "status"},
            {name: "success", display: "Success", description: "Success actions, healthy states, and confirmations.", preview: "status"},
            {name: "warning", display: "Warning", description: "Warning actions and caution states.", preview: "status"},
            {name: "error", display: "Error", description: "Danger actions, failed states, and errors.", preview: "status"},
        ],
    },
    {
        title: "Tasking",
        description: "Task prompt, context badges, and command output.",
        colors: [
            {name: "taskPromptTextColor", display: "Prompt Text", description: "Tasking prompt text.", preview: "task"},
            {name: "taskPromptCommandTextColor", display: "Command Text", description: "Command and parameter text in tasking.", preview: "task"},
            {name: "taskContextColor", display: "Context", description: "Generic tasking context labels.", preview: "task"},
            {name: "taskContextImpersonationColor", display: "Impersonation Context", description: "User or impersonation tasking context labels.", preview: "task"},
            {name: "taskContextExtraColor", display: "Extra Context", description: "Additional tasking context labels.", preview: "task"},
            {name: "outputBackgroundColor", display: "Output Background", description: "Task output and terminal-style response background.", preview: "output"},
            {name: "outputTextColor", display: "Output Text", description: "Task output and terminal-style response text.", preview: "output"},
        ],
    },
    {
        title: "File Browsing",
        description: "File browser empty-folder treatment.",
        colors: [
            {name: "emptyFolderColor", display: "Empty Folder", description: "Empty folder icon and text in file-based browsers.", preview: "file"},
        ],
    },
];

const clonePalette = (sourcePalette) => {
    const clonedPalette = {};
    Object.entries(sourcePalette || {}).forEach(([key, value]) => {
        clonedPalette[key] = typeof value === "object" && value !== null ? {...value} : value;
    });
    return clonedPalette;
}

const addAlpha = (color, alphaHex) => {
    if(isValidColor(color)){
        return `${color}${alphaHex}`;
    }
    return color;
}

const getPaletteValue = (palette, name, mode) => {
    const color = palette?.[name]?.[mode];
    if(isValidColor(color)){
        return color;
    }
    const defaultColor = operatorSettingDefaults.palette?.[name]?.[mode];
    if(isValidColor(defaultColor)){
        return defaultColor;
    }
    return mode === "dark" ? "#1f2937" : "#f8fafc";
}

const getReadableTextColor = (backgroundColor) => {
    if(!isValidColor(backgroundColor)){
        return "#ffffff";
    }
    const red = parseInt(backgroundColor.slice(1, 3), 16);
    const green = parseInt(backgroundColor.slice(3, 5), 16);
    const blue = parseInt(backgroundColor.slice(5, 7), 16);
    const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
    return brightness >= 140 ? "#111827" : "#ffffff";
}

const ModeColorControl = ({mode, name, color, onChange}) => (
    <Box sx={{minWidth: 0}}>
        <Typography variant="caption" sx={{display: "block", color: "text.secondary", mb: 0.5}}>
            {mode === "dark" ? "Dark" : "Light"}
        </Typography>
        <MythicColorSwatchInput
            color={color}
            label={`${name} ${mode} color`}
            onChange={(value) => onChange(name, mode, value)}
        />
    </Box>
);

const PreviewLabel = ({children, color}) => (
    <Typography
        variant="caption"
        sx={{
            color,
            display: "block",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
        }}
    >
        {children}
    </Typography>
);

const ColorUsagePreview = ({option, palette, mode}) => {
    const background = getPaletteValue(palette, "background", mode);
    const paper = getPaletteValue(palette, "paper", mode);
    const text = getPaletteValue(palette, "text", mode);
    const border = getPaletteValue(palette, "borderColor", mode);
    const navTop = getPaletteValue(palette, "navBarColor", mode);
    const navBottom = getPaletteValue(palette, "navBarBottomColor", mode);
    const navIcon = getPaletteValue(palette, "navBarIcons", mode);
    const navText = getPaletteValue(palette, "navBarText", mode);
    const tableHeader = getPaletteValue(palette, "tableHeader", mode);
    const tableHover = getPaletteValue(palette, "tableHover", mode);
    const selectedCallback = getPaletteValue(palette, "selectedCallbackColor", mode);
    const selectedHierarchy = getPaletteValue(palette, "selectedCallbackHierarchyColor", mode);
    const outputBackground = getPaletteValue(palette, "outputBackgroundColor", mode);
    const outputText = getPaletteValue(palette, "outputTextColor", mode);
    const promptText = getPaletteValue(palette, "taskPromptTextColor", mode);
    const commandText = getPaletteValue(palette, "taskPromptCommandTextColor", mode);
    const context = getPaletteValue(palette, "taskContextColor", mode);
    const impersonation = getPaletteValue(palette, "taskContextImpersonationColor", mode);
    const extra = getPaletteValue(palette, "taskContextExtraColor", mode);
    const previewColor = getPaletteValue(palette, option.name, mode);
    const shellSx = {
        border: `1px solid ${addAlpha(border, "99")}`,
        borderRadius: "6px",
        overflow: "hidden",
        minHeight: 74,
        backgroundColor: background,
    };
    switch(option.preview){
        case "navigation":
            return (
                <Box sx={{...shellSx, display: "flex"}}>
                    <Box sx={{width: 58, background: `linear-gradient(180deg, ${navTop}, ${navBottom})`, p: 1}}>
                        <PhoneCallbackIcon style={{color: navIcon, fontSize: 18}}/>
                        <PreviewLabel color={navText}>Tasks</PreviewLabel>
                    </Box>
                    <Box sx={{flex: 1, backgroundColor: paper, p: 1}}>
                        <PreviewLabel color={text}>{mode} navigation</PreviewLabel>
                        <Box sx={{height: 7, mt: 1, borderRadius: "4px", backgroundColor: previewColor}} />
                    </Box>
                </Box>
            );
        case "table":
            return (
                <Box sx={shellSx}>
                    <Box sx={{height: 22, px: 1, display: "flex", alignItems: "center", backgroundColor: tableHeader}}>
                        <PreviewLabel color={text}>Table header</PreviewLabel>
                    </Box>
                    <Box sx={{height: 18, px: 1, display: "flex", alignItems: "center", borderTop: `1px solid ${addAlpha(border, "99")}`, backgroundColor: paper}}>
                        <PreviewLabel color={text}>Normal row</PreviewLabel>
                    </Box>
                    <Box sx={{height: 18, px: 1, display: "flex", alignItems: "center", backgroundColor: addAlpha(tableHover, "CC")}}>
                        <PreviewLabel color={text}>Hover row</PreviewLabel>
                    </Box>
                    <Box sx={{height: 18, display: "grid", gridTemplateColumns: "1fr 1fr"}}>
                        <Box sx={{px: 1, backgroundColor: addAlpha(selectedCallback, "CC")}}>
                            <PreviewLabel color={text}>Active</PreviewLabel>
                        </Box>
                        <Box sx={{px: 1, backgroundColor: addAlpha(selectedHierarchy, "CC")}}>
                            <PreviewLabel color={text}>Tree</PreviewLabel>
                        </Box>
                    </Box>
                </Box>
            );
        case "status":
            return (
                <Box sx={{...shellSx, p: 1, backgroundColor: paper}}>
                    <Box sx={{display: "inline-flex", alignItems: "center", px: 1, py: 0.5, borderRadius: "4px", backgroundColor: previewColor, color: getReadableTextColor(previewColor), fontSize: "0.75rem", fontWeight: 700}}>
                        {option.display}
                    </Box>
                    <Box sx={{mt: 1, height: 10, borderRadius: "4px", backgroundColor: addAlpha(previewColor, "66")}} />
                    <PreviewLabel color={text}>{mode} accent</PreviewLabel>
                </Box>
            );
        case "task":
            return (
                <Box sx={{...shellSx, p: 1, backgroundColor: paper}}>
                    <PreviewLabel color={promptText}>operator@host</PreviewLabel>
                    <Typography variant="caption" sx={{color: commandText, display: "block", lineHeight: 1.2}}>
                        shell whoami
                    </Typography>
                    <Box sx={{display: "flex", gap: 0.5, mt: 0.75, minWidth: 0}}>
                        {[context, impersonation, extra].map((color, index) => (
                            <Box key={`${mode}-${color}-${index}`} sx={{height: 12, flex: 1, borderRadius: "3px", backgroundColor: color}} />
                        ))}
                    </Box>
                </Box>
            );
        case "output":
            return (
                <Box sx={{...shellSx, p: 1, backgroundColor: outputBackground}}>
                    <Typography variant="caption" sx={{color: outputText, display: "block", fontFamily: "monospace", lineHeight: 1.25}}>
                        user\host
                    </Typography>
                    <Typography variant="caption" sx={{color: outputText, display: "block", fontFamily: "monospace", lineHeight: 1.25}}>
                        completed
                    </Typography>
                </Box>
            );
        case "file":
            return (
                <Box sx={{...shellSx, p: 1, backgroundColor: paper}}>
                    <Box sx={{height: 24, borderRadius: "4px", backgroundColor: addAlpha(previewColor, "33"), border: `1px solid ${addAlpha(previewColor, "99")}`}} />
                    <Typography variant="caption" sx={{color: previewColor, display: "block", mt: 0.75, fontWeight: 700}}>
                        Empty folder
                    </Typography>
                </Box>
            );
        case "surface":
        default:
            return (
                <Box sx={{...shellSx, p: 0.75}}>
                    <Box sx={{height: 16, borderRadius: "4px 4px 0 0", backgroundColor: getPaletteValue(palette, "pageHeader", mode)}} />
                    <Box sx={{p: 0.75, backgroundColor: paper, border: `1px solid ${addAlpha(border, "99")}`, borderTop: 0, borderRadius: "0 0 4px 4px"}}>
                        <PreviewLabel color={text}>{mode} surface</PreviewLabel>
                        <Box sx={{height: 7, mt: 0.75, borderRadius: "4px", backgroundColor: previewColor}} />
                    </Box>
                </Box>
            );
    }
}

const ColorTokenEditor = ({option, palette, onChange}) => (
    <Box
        sx={{
            display: "grid",
            gridTemplateColumns: {xs: "1fr", md: "minmax(170px, 0.8fr) minmax(250px, 1fr) minmax(260px, 1.1fr)"},
            gap: 1.5,
            alignItems: "center",
            p: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            "&:first-of-type": {borderTop: 0},
        }}
    >
        <Box sx={{minWidth: 0}}>
            <Typography variant="body2" sx={{fontWeight: 700}}>
                {option.display}
            </Typography>
            <Typography variant="caption" sx={{color: "text.secondary", display: "block", lineHeight: 1.3}}>
                {option.description}
            </Typography>
        </Box>
        <Box sx={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, minWidth: 0}}>
            <ModeColorControl
                mode="dark"
                name={option.name}
                color={palette?.[option.name]?.dark}
                onChange={onChange}
            />
            <ModeColorControl
                mode="light"
                name={option.name}
                color={palette?.[option.name]?.light}
                onChange={onChange}
            />
        </Box>
        <Box sx={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, minWidth: 0}}>
            <ColorUsagePreview option={option} palette={palette} mode="dark" />
            <ColorUsagePreview option={option} palette={palette} mode="light" />
        </Box>
    </Box>
);

const BackgroundImageEditor = ({palette, backgroundFileImageDarkRef, backgroundFileImageLightRef, onChangePaletteColor, onFileBackgroundImageChangeDark, onFileBackgroundImageChangeLight}) => (
    <Box sx={{mt: 2}}>
        <Box sx={{mb: 1}}>
            <Typography variant="h6" sx={{fontWeight: 700}}>Background Images</Typography>
            <Typography variant="caption" sx={{color: "text.secondary"}}>
                Optional page background images for each theme mode.
            </Typography>
        </Box>
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"},
                gap: 1.5,
            }}
        >
            {[
                {mode: "dark", label: "Dark", ref: backgroundFileImageDarkRef, onChange: onFileBackgroundImageChangeDark},
                {mode: "light", label: "Light", ref: backgroundFileImageLightRef, onChange: onFileBackgroundImageChangeLight},
            ].map((imageOption) => (
                <Box
                    key={imageOption.mode}
                    sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "8px",
                        overflow: "hidden",
                        backgroundColor: imageOption.mode === "dark" ? "#111827" : "#f8fafc",
                    }}
                >
                    <Box sx={{display: "flex", alignItems: "center", gap: 1, p: 1}}>
                        <Typography variant="body2" sx={{fontWeight: 700, flexGrow: 1, color: imageOption.mode === "dark" ? "#ffffff" : "#111827"}}>
                            {imageOption.label}
                        </Typography>
                        <Button size="small" color="info" variant="contained" onClick={() => imageOption.ref.current.click()}>
                            Upload
                            <input ref={imageOption.ref} onChange={imageOption.onChange} type="file" hidden />
                        </Button>
                        <Button size="small" color="warning" variant="contained" onClick={() => onChangePaletteColor("backgroundImage", imageOption.mode, null)}>
                            Remove
                        </Button>
                    </Box>
                    <Box
                        sx={{
                            height: 120,
                            backgroundImage: palette.backgroundImage?.[imageOption.mode],
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            borderTop: "1px solid",
                            borderColor: "divider",
                        }}
                    />
                </Box>
            ))}
        </Box>
    </Box>
);

const ColorPaletteEditor = ({palette, onChangePaletteColor, backgroundFileImageDarkRef, backgroundFileImageLightRef, onFileBackgroundImageChangeDark, onFileBackgroundImageChangeLight}) => (
    <Box sx={{width: "100%", py: 1}}>
        <Typography variant="h4" sx={{mb: 0.5}}>
            Theme Colors
        </Typography>
        <Typography variant="body2" sx={{color: "text.secondary", mb: 2}}>
            Colors are grouped by where operators will see them, with dark and light previews shown side by side.
        </Typography>
        {COLOR_EDITOR_SECTIONS.map((section) => (
            <Box key={section.title} sx={{mb: 2.5}}>
                <Box sx={{mb: 1}}>
                    <Typography variant="h6" sx={{fontWeight: 700}}>{section.title}</Typography>
                    <Typography variant="caption" sx={{color: "text.secondary"}}>{section.description}</Typography>
                </Box>
                <Box
                    sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "8px",
                        overflow: "hidden",
                        backgroundColor: "background.paper",
                    }}
                >
                    {section.colors.map((option) => (
                        <ColorTokenEditor
                            key={option.name}
                            option={option}
                            palette={palette}
                            onChange={onChangePaletteColor}
                        />
                    ))}
                </Box>
            </Box>
        ))}
        <BackgroundImageEditor
            palette={palette}
            backgroundFileImageDarkRef={backgroundFileImageDarkRef}
            backgroundFileImageLightRef={backgroundFileImageLightRef}
            onChangePaletteColor={onChangePaletteColor}
            onFileBackgroundImageChangeDark={onFileBackgroundImageChangeDark}
            onFileBackgroundImageChangeLight={onFileBackgroundImageChangeLight}
        />
    </Box>
);

export function SettingsOperatorUIConfigDialog(props) {
    const fileInputRef = React.useRef(null);
    const backgroundFileImageLightRef = React.useRef(null);
    const backgroundFileImageDarkRef = React.useRef(null);
    const [getUserPreferences] = useLazyQuery(userSettingsQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            //console.log("got preferences", data.getOperatorPreferences.preferences)
            if(data.getOperatorPreferences.status === "success"){
                let settingString = JSON.stringify(data.getOperatorPreferences.preferences, null, 4);
                copyStringToClipboard(settingString);
                snackActions.info("Copied settings to clipboard");
            } else {
                snackActions.error(`Failed to get user preferences:\n${data.getOperatorPreferences.error}`);
            }
        },
        onError: (error) => {
            console.log(error);
            snackActions.error(error.message);
        }
    })
    const [getUserColorPreferences] = useLazyQuery(userSettingsQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            //console.log("got preferences", data.getOperatorPreferences.preferences)
            if(data.getOperatorPreferences.status === "success"){
                let settingString = JSON.stringify({palette: data.getOperatorPreferences.preferences?.palette}, null, 4);
                copyStringToClipboard(settingString);
                snackActions.info("Copied settings to clipboard");
            } else {
                snackActions.error(`Failed to get user preferences:\n${data.getOperatorPreferences.error}`);
            }
        },
        onError: (error) => {
            console.log(error);
            snackActions.error(error.message);
        }
    })

    const initialLocalStorageInteractType = GetMythicSetting({setting_name: 'interactType', default_value: operatorSettingDefaults.interactType});
    const [interactType, setInteractType] = React.useState(initialLocalStorageInteractType);

    const initialLocalStorageFontSizeValue = GetMythicSetting({setting_name: "fontSize", default_value: operatorSettingDefaults.fontSize});
    const [fontSize, setFontSize] = React.useState(initialLocalStorageFontSizeValue);

    const initialLocalStorageFontFamilyValue = GetMythicSetting({setting_name: "fontFamily", default_value: operatorSettingDefaults.fontFamily});
    const [fontFamily, setFontFamily] = React.useState(initialLocalStorageFontFamilyValue);

    const initialShowMediaValue = GetMythicSetting({setting_name: "showMedia", default_value: operatorSettingDefaults.showMedia});
    const [showMedia, setShowMedia] = React.useState(initialShowMediaValue);

    const initialTaskingDisplayFields = normalizeTaskingDisplayFields(GetMythicSetting({setting_name: "taskingDisplayFields", default_value: operatorSettingDefaults.taskingDisplayFields}));
    const [taskingDisplayFields, setTaskingDisplayFields] = React.useState(initialTaskingDisplayFields);

    const initialUseDisplayParamsForCLIHistory = GetMythicSetting({setting_name: "useDisplayParamsForCLIHistory", default_value: operatorSettingDefaults.useDisplayParamsForCLIHistory});
    const [useDisplayParamsForCLIHistory, setUseDisplayParamsForCLIHistory] = React.useState(initialUseDisplayParamsForCLIHistory);

    const initialTaskTimestampDisplayField = GetMythicSetting({setting_name: "taskTimestampDisplayField", default_value: operatorSettingDefaults.taskTimestampDisplayField});
    const [taskTimestampDisplayField, setTaskTimestampDisplayField] = React.useState(initialTaskTimestampDisplayField);

    const initialHideBrowserTasking = GetMythicSetting({setting_name: "hideBrowserTasking", default_value: operatorSettingDefaults.hideBrowserTasking});
    const [hideBrowserTasking, setHideBrowserTasking] = React.useState(initialHideBrowserTasking);

    const initialHideTaskingContext = GetMythicSetting({setting_name: "hideTaskingContext", default_value: operatorSettingDefaults.hideTaskingContext});
    const [hideTaskingContext, setHideTaskingContext] = React.useState(initialHideTaskingContext);

    const initialTaskingContextField = GetMythicSetting({setting_name: "taskingContextFields", default_value: operatorSettingDefaults.taskingContextFields});
    const [taskingContextFields, setTaskingContextFields] = React.useState(initialTaskingContextField);

    const initialShowOPSECBypassUsername = GetMythicSetting({setting_name: "showOPSECBypassUsername", default_value: operatorSettingDefaults.showOPSECBypassUsername});
    const [showOPSECBypassUsername, setShowOPSECBypassUsername] = React.useState(initialShowOPSECBypassUsername);

    const initialPalette = GetMythicSetting({setting_name: 'palette', default_value: operatorSettingDefaults.palette});
    const [palette, setPalette] = React.useState({
        primary: {
            dark: isValidColor(initialPalette?.primary?.dark) ? initialPalette?.primary?.dark : operatorSettingDefaults.palette.primary.dark,
            light: isValidColor(initialPalette?.primary?.light) ? initialPalette?.primary?.light : operatorSettingDefaults.palette.primary.light,
        },
        error: {
            dark: isValidColor(initialPalette?.error?.dark) ? initialPalette?.error?.dark : operatorSettingDefaults.palette.error.dark,
            light: isValidColor(initialPalette?.error?.light) ? initialPalette?.error?.light : operatorSettingDefaults.palette.error.light,
        },
        success: {
            dark: isValidColor(initialPalette?.success?.dark) ? initialPalette?.success?.dark : operatorSettingDefaults.palette.success.dark,
            light: isValidColor(initialPalette?.success?.light) ? initialPalette?.success?.light : operatorSettingDefaults.palette.success.light,
        },
        info: {
            dark: isValidColor(initialPalette?.info?.dark) ? initialPalette?.info?.dark : operatorSettingDefaults.palette.info.dark,
            light: isValidColor(initialPalette?.info?.light) ? initialPalette?.info?.light : operatorSettingDefaults.palette.info.light,
        },
        warning: {
            dark: isValidColor(initialPalette?.warning?.dark) ? initialPalette?.warning?.dark : operatorSettingDefaults.palette.warning.dark,
            light: isValidColor(initialPalette?.warning?.light) ? initialPalette?.warning?.light : operatorSettingDefaults.palette.warning.light,
        },
        secondary: {
            dark: isValidColor(initialPalette?.secondary?.dark) ? initialPalette?.secondary?.dark : operatorSettingDefaults.palette.secondary.dark,
            light: isValidColor(initialPalette?.secondary?.light) ? initialPalette?.secondary?.light : operatorSettingDefaults.palette.secondary.light,
        },
        background: {
            dark: isValidColor(initialPalette?.background?.dark) ? initialPalette?.background?.dark : operatorSettingDefaults.palette.background.dark,
            light: isValidColor(initialPalette?.background?.light) ? initialPalette?.background?.light : operatorSettingDefaults.palette.background.light,
        },
        tableHeader: {
            dark: isValidColor(initialPalette?.tableHeader?.dark) ? initialPalette?.tableHeader?.dark : operatorSettingDefaults.palette.tableHeader.dark,
            light: isValidColor(initialPalette?.tableHeader?.light) ? initialPalette?.tableHeader?.light : operatorSettingDefaults.palette.tableHeader.light,
        },
        tableHover: {
            dark: isValidColor(initialPalette?.tableHover?.dark) ? initialPalette?.tableHover?.dark : operatorSettingDefaults.palette.tableHover.dark,
            light: isValidColor(initialPalette?.tableHover?.light) ? initialPalette?.tableHover?.light : operatorSettingDefaults.palette.tableHover.light,
        },
        pageHeader: {
            dark: isValidColor(initialPalette?.pageHeader?.dark) ? initialPalette?.pageHeader?.dark : operatorSettingDefaults.palette.pageHeader.dark,
            light: isValidColor(initialPalette?.pageHeader?.light) ? initialPalette?.pageHeader?.light : operatorSettingDefaults.palette.pageHeader.light,
        },
        text: {
            dark: isValidColor(initialPalette?.text?.dark) ? initialPalette?.text?.dark : operatorSettingDefaults.palette.text.dark,
            light: isValidColor(initialPalette?.text?.light) ? initialPalette?.text?.light : operatorSettingDefaults.palette.text.light,
        },
        paper: {
            dark: isValidColor(initialPalette?.paper?.dark) ? initialPalette?.paper?.dark : operatorSettingDefaults.palette.paper.dark,
            light: isValidColor(initialPalette?.paper?.light) ? initialPalette?.paper?.light : operatorSettingDefaults.palette.paper.light,
        },
        selectedCallbackColor: {
            dark: isValidColor(initialPalette?.selectedCallbackColor?.dark) ? initialPalette?.selectedCallbackColor?.dark : operatorSettingDefaults.palette.selectedCallbackColor.dark,
            light: isValidColor(initialPalette?.selectedCallbackColor?.light) ? initialPalette?.selectedCallbackColor?.light : operatorSettingDefaults.palette.selectedCallbackColor.light,
        },
        selectedCallbackHierarchyColor: {
            dark: isValidColor(initialPalette?.selectedCallbackHierarchyColor?.dark) ? initialPalette?.selectedCallbackHierarchyColor?.dark : operatorSettingDefaults.palette.selectedCallbackHierarchyColor.dark,
            light: isValidColor(initialPalette?.selectedCallbackHierarchyColor?.light) ? initialPalette?.selectedCallbackHierarchyColor?.light : operatorSettingDefaults.palette.selectedCallbackHierarchyColor.light,
        },
        backgroundImage: {
            dark: initialPalette?.backgroundImage?.dark || operatorSettingDefaults.palette.backgroundImage.dark,
            light: initialPalette?.backgroundImage?.light || operatorSettingDefaults.palette.backgroundImage.light,
        },
        navBarIcons: {
            dark: isValidColor(initialPalette?.navBarIcons?.dark) ? initialPalette?.navBarIcons?.dark : operatorSettingDefaults.palette.navBarIcons.dark,
            light: isValidColor(initialPalette?.navBarIcons?.light) ? initialPalette?.navBarIcons?.light : operatorSettingDefaults.palette.navBarIcons.light,
        },
        navBarText: {
            dark: isValidColor(initialPalette?.navBarText?.dark) ? initialPalette?.navBarText?.dark : operatorSettingDefaults.palette.navBarText.dark,
            light: isValidColor(initialPalette?.navBarText?.light) ? initialPalette?.navBarText?.light : operatorSettingDefaults.palette.navBarText.light,
        },
        navBarColor: {
            dark: isValidColor(initialPalette?.navBarColor?.dark) ? initialPalette?.navBarColor?.dark : operatorSettingDefaults.palette.navBarColor.dark,
            light: isValidColor(initialPalette?.navBarColor?.light) ? initialPalette?.navBarColor?.light : operatorSettingDefaults.palette.navBarColor.light,
        },
        navBarBottomColor: {
            dark: isValidColor(initialPalette?.navBarBottomColor?.dark) ? initialPalette?.navBarBottomColor?.dark : operatorSettingDefaults.palette.navBarBottomColor.dark,
            light: isValidColor(initialPalette?.navBarBottomColor?.light) ? initialPalette?.navBarBottomColor?.light : operatorSettingDefaults.palette.navBarBottomColor.light,
        },
        taskPromptTextColor: {
            dark: isValidColor(initialPalette?.taskPromptTextColor?.dark) ? initialPalette?.taskPromptTextColor?.dark : operatorSettingDefaults.palette.taskPromptTextColor.dark,
            light: isValidColor(initialPalette?.taskPromptTextColor?.light) ? initialPalette?.taskPromptTextColor?.light : operatorSettingDefaults.palette.taskPromptTextColor.light,
        },
        taskPromptCommandTextColor: {
            dark: isValidColor(initialPalette?.taskPromptCommandTextColor?.dark) ? initialPalette?.taskPromptCommandTextColor?.dark : operatorSettingDefaults.palette.taskPromptCommandTextColor.dark,
            light: isValidColor(initialPalette?.taskPromptCommandTextColor?.light) ? initialPalette?.taskPromptCommandTextColor?.light : operatorSettingDefaults.palette.taskPromptCommandTextColor.light,
        },
        taskContextColor: {
            dark: isValidColor(initialPalette?.taskContextColor?.dark) ? initialPalette?.taskContextColor?.dark : operatorSettingDefaults.palette.taskContextColor.dark,
            light: isValidColor(initialPalette?.taskContextColor?.light) ? initialPalette?.taskContextColor?.light : operatorSettingDefaults.palette.taskContextColor.light,
        },
        taskContextImpersonationColor: {
            dark: isValidColor(initialPalette?.taskContextImpersonationColor?.dark) ? initialPalette?.taskContextImpersonationColor?.dark : operatorSettingDefaults.palette.taskContextImpersonationColor.dark,
            light: isValidColor(initialPalette?.taskContextImpersonationColor?.light) ? initialPalette?.taskContextImpersonationColor?.light : operatorSettingDefaults.palette.taskContextImpersonationColor.light,
        },
        taskContextExtraColor: {
            dark: isValidColor(initialPalette?.taskContextExtraColor?.dark) ? initialPalette?.taskContextExtraColor?.dark : operatorSettingDefaults.palette.taskContextExtraColor.dark,
            light: isValidColor(initialPalette?.taskContextExtraColor?.light) ? initialPalette?.taskContextExtraColor?.light : operatorSettingDefaults.palette.taskContextExtraColor.light,
        },
        emptyFolderColor: {
            dark: isValidColor(initialPalette?.emptyFolderColor?.dark) ? initialPalette?.emptyFolderColor?.dark : operatorSettingDefaults.palette.emptyFolderColor.dark,
            light: isValidColor(initialPalette?.emptyFolderColor?.light) ? initialPalette?.emptyFolderColor?.light : operatorSettingDefaults.palette.emptyFolderColor.light,
        },
        outputBackgroundColor: {
            dark: isValidColor(initialPalette?.outputBackgroundColor?.dark) ? initialPalette?.outputBackgroundColor?.dark : operatorSettingDefaults.palette.outputBackgroundColor.dark,
            light: isValidColor(initialPalette?.outputBackgroundColor?.light) ? initialPalette?.outputBackgroundColor?.light : operatorSettingDefaults.palette.outputBackgroundColor.light,
        },
        outputTextColor: {
            dark: isValidColor(initialPalette?.outputTextColor?.dark) ? initialPalette?.outputTextColor?.dark : operatorSettingDefaults.palette.outputTextColor.dark,
            light: isValidColor(initialPalette?.outputTextColor?.light) ? initialPalette?.outputTextColor?.light : operatorSettingDefaults.palette.outputTextColor.light,
        },
        borderColor: {
            dark: isValidColor(initialPalette?.borderColor?.dark) ? initialPalette?.borderColor?.dark : operatorSettingDefaults.palette.borderColor.dark,
            light: isValidColor(initialPalette?.borderColor?.light) ? initialPalette?.borderColor?.light : operatorSettingDefaults.palette.borderColor.light,
        },
    });
    const [resumeNotifications, setResumeNotifications] = React.useState(false);
    const [, updateSettings, clearSettings] = useSetMythicSetting();
    const onChangeFontFamily = (name, value, error) => {
      setFontFamily(value);
    }
    const onHideBrowserTaskingChanged = (evt) => {
        setHideBrowserTasking(!hideBrowserTasking);
    }
    const onShowOPSECBypassUsernameChanged = (evt) => {
        setShowOPSECBypassUsername(!showOPSECBypassUsername);
    }
    const onHideTaskingContextChanged = (evt) => {
        setHideTaskingContext(!hideTaskingContext);
    }
    const onShowMediaChanged = (evt) => {
        setShowMedia(!showMedia);
    }
    const onResumeNotifications = (evt) => {
        setResumeNotifications(!resumeNotifications);
    }
    const onChangeInteractType = (evt) => {
        setInteractType(evt.target.value);
    }
    const onChangeTaskTimestampDisplayField = (evt) => {
        setTaskTimestampDisplayField(evt.target.value);
    }
    const onChangeUseDisplayParamsForCLIHistory = (evt) => {
        setUseDisplayParamsForCLIHistory(!useDisplayParamsForCLIHistory);
    }
    const onChangePaletteColor = (name, mode, value) => {
        setPalette({...palette, [name]: {...palette[name], [mode]: value}});
    }
    const onChangeTaskingContextFields = (evt) => {
        setTaskingContextFields(evt.target.value);
    }
    const onAccept = () => {
      if(resumeNotifications){
          localStorage.setItem("dnd", JSON.stringify({
              "doNotDisturb": false,
              "doNotDisturbTimeStart": new Date(),
              "doNotDisturbMinutes": 0
          }))
      }
      updateSettings({settings: {
              taskingDisplayFields: normalizeTaskingDisplayFields(taskingDisplayFields),
              fontSize: parseInt(fontSize),
              fontFamily,
              showMedia,
              interactType,
              useDisplayParamsForCLIHistory,
              taskTimestampDisplayField,
              hideBrowserTasking,
              hideTaskingContext,
              taskingContextFields,
              showOPSECBypassUsername,
              palette: palette
      }});
      snackActions.success("updating settings");
      props.onClose();
    }
    const changeCommonFontFamilies = (event) => {
        if(event.target.value !== " "){
            setFontFamily(event.target.value);
        }
    }
    const setDefaults = () => {
      setFontSize(operatorSettingDefaults.fontSize);
      setFontFamily(operatorSettingDefaults.fontFamily);
      setTaskingDisplayFields(operatorSettingDefaults.taskingDisplayFields);
      setShowMedia(operatorSettingDefaults.showMedia);
      setInteractType(operatorSettingDefaults.interactType);
      setUseDisplayParamsForCLIHistory(operatorSettingDefaults.useDisplayParamsForCLIHistory);
      setResumeNotifications(false);
      setPalette(clonePalette(operatorSettingDefaults.palette));
      setTaskTimestampDisplayField(operatorSettingDefaults.taskTimestampDisplayField);
      setHideTaskingContext(operatorSettingDefaults.hideTaskingContext);
      setTaskingContextFields(operatorSettingDefaults.taskingContextFields);
      setShowOPSECBypassUsername(operatorSettingDefaults.showOPSECBypassUsername);
    }
    const clearAllUserSettings = () => {
        clearSettings();
        props.onClose();
    }
    const setColorDefaults = (mode) => {
        let newPaletteOptions = clonePalette(palette);
        for(const [key, value] of Object.entries(operatorSettingDefaults.palette)){
            newPaletteOptions[key] = {...newPaletteOptions[key], [mode]: value[mode]};
        }
        setPalette(newPaletteOptions);
    }
    const onFileChange = async (evt) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const contents = e.target.result;
            try{
                let jsonData = JSON.parse(String(contents));
                let currentSettings = {
                    taskingDisplayFields,
                    fontSize: parseInt(fontSize),
                    fontFamily,
                    showMedia,
                    interactType,
                    useDisplayParamsForCLIHistory,
                    taskTimestampDisplayField,
                    hideBrowserTasking,
                    hideTaskingContext,
                    taskingContextFields,
                    showOPSECBypassUsername,
                    palette: palette
                }
                const mergedSettings = {...currentSettings, ...jsonData};
                mergedSettings.taskingDisplayFields = normalizeTaskingDisplayFields(mergedSettings.taskingDisplayFields);
                updateSettings({settings: mergedSettings});
                snackActions.info("Updating settings");
                props.onClose();
            }catch(error){
                console.log(error);
                snackActions.error("Failed to parse file as JSON");
            }
        }
        reader.readAsBinaryString(evt.target.files[0]);
    }
    const onFileBackgroundImageChangeLight = async (evt) => {
        const reader = new FileReader();
        const filenameExtension = evt.target.files[0].name.split(".")[1];
        reader.onload = (e) => {
            const contents = e.target.result;
            let backgroundImage = `url("data:image/${filenameExtension};base64,${btoa(contents)}`;
            setPalette({...palette, backgroundImage: {...palette.backgroundImage, light: backgroundImage}});
        }
        reader.readAsBinaryString(evt.target.files[0]);
    }
    const onFileBackgroundImageChangeDark = async (evt) => {
        const reader = new FileReader();
        const filenameExtension = evt.target.files[0].name.split(".")[1];
        reader.onload = (e) => {
            const contents = e.target.result;
            let backgroundImage = `url("data:image/${filenameExtension};base64,${btoa(contents)}`;
            setPalette({...palette, backgroundImage: {...palette.backgroundImage, dark: backgroundImage}});
        }
        reader.readAsBinaryString(evt.target.files[0]);
    }

    const getCurrentPreferences = () => {
        getUserPreferences();
    }
    const getCurrentColorPreferences = () => {
        getUserColorPreferences();
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">
            <Box className="mythic-dialog-title-row mythic-ui-settings-title-row">
                <Box className="mythic-ui-settings-title-copy">
                    <Typography component="div" className="mythic-ui-settings-title">
                        Configure UI Settings
                    </Typography>
                    <Typography variant={"body2"} className="mythic-ui-settings-subtitle">
                        Community themes are located on <Link target={"_blank"} href={"https://github.com/MythicMeta/CommunityThemes"}>GitHub</Link>
                    </Typography>
                </Box>
                <Box className="mythic-ui-settings-title-actions">
                    <MythicStyledTooltip title={"Copy all preferences as JSON"}>
                        <Button
                            className="mythic-dialog-title-action mythic-ui-settings-title-button mythic-ui-settings-title-button-info"
                            onClick={getCurrentPreferences}
                            size="small"
                            variant="outlined"
                            startIcon={<CloudDownloadIcon fontSize="small" />}
                        >
                            Export
                        </Button>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={"Copy only color preferences as JSON"}>
                        <Button
                            className="mythic-dialog-title-action mythic-ui-settings-title-button mythic-ui-settings-title-button-info"
                            onClick={getCurrentColorPreferences}
                            size="small"
                            variant="outlined"
                            startIcon={
                                <ColorLensIcon fontSize="small" />
                            }
                        >
                            Export Colors
                        </Button>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={"Import preferences from a JSON file"}>
                        <Button
                            className="mythic-dialog-title-action mythic-ui-settings-title-button mythic-ui-settings-title-button-success"
                            onClick={()=>fileInputRef.current.click()}
                            size="small"
                            variant="outlined"
                            startIcon={<CloudUploadIcon fontSize="small" />}
                        >
                            Import
                            <input ref={fileInputRef} onChange={onFileChange} type="file" hidden />
                        </Button>
                    </MythicStyledTooltip>
                </Box>
            </Box>
        </DialogTitle>
        <TableContainer className="mythicElement" style={{paddingLeft: "10px", paddingRight: "10px"}}>
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                  
                  <TableRow hover>
                      <MythicStyledTableCell>Font Family</MythicStyledTableCell>
                      <MythicStyledTableCell>
                        <MythicTextField value={fontFamily} onChange={onChangeFontFamily} showLabel={false} multiline maxRows={5} />
                          <Select
                              value={" "}
                              onChange={changeCommonFontFamilies}
                              input={<Input style={{width: "100%"}}/>}
                          >
                              <MenuItem value={" "}>Select a common font family</MenuItem>
                              {commonFontFamilies.map( (opt) => (
                                  <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                              ) )}
                          </Select>
                    </MythicStyledTableCell>
                    </TableRow>
                  <TableRow>
                      <MythicStyledTableCell colSpan={2} style={{paddingTop: "16px", paddingBottom: "16px"}}>
                          <TaskingMetadataSummary value={taskingDisplayFields} onChange={setTaskingDisplayFields} />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Automatically show Media in Browser scripts</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={showMedia}
                              onChange={onShowMediaChanged}
                              color="info"
                              inputProps={{ 'aria-label': 'info checkbox' }}
                              name="show_media"
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Resume Info/Warning Notifications</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={resumeNotifications}
                              onChange={onResumeNotifications}
                              color="info"
                              inputProps={{ 'aria-label': 'info checkbox' }}
                              name="resumeNotifications"
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Show Display Parameters in CLI History</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={useDisplayParamsForCLIHistory}
                              onChange={onChangeUseDisplayParamsForCLIHistory}
                              color="info"
                              inputProps={{ 'aria-label': 'info checkbox' }}
                              name="use display params"
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>
                          Choose default type of tasking display
                      </MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Select
                              labelId="demo-dialog-select-label"
                              id="demo-dialog-select"
                              value={interactType}
                              onChange={onChangeInteractType}
                              input={<Input style={{width: "100%"}}/>}
                          >
                              {interactTypeOptions.map( (opt) => (
                                  <MenuItem value={opt.value} key={opt.value}>{opt.display}</MenuItem>
                              ) )}
                          </Select>
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>
                          Choose Which Timestamp to display for Tasks
                      </MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Select
                              labelId="demo-dialog-select-label"
                              id="demo-dialog-select"
                              value={taskTimestampDisplayField}
                              onChange={onChangeTaskTimestampDisplayField}
                              input={<Input style={{width: "100%"}}/>}
                          >
                              {taskTimestampDisplayFieldOptions.map( (opt) => (
                                  <MenuItem value={opt.name} key={opt.name}>{opt.display}</MenuItem>
                              ) )}
                          </Select>
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Hide Browser-based Tasking</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={hideBrowserTasking}
                              onChange={onHideBrowserTaskingChanged}
                              color="info"
                              inputProps={{ 'aria-label': 'info checkbox' }}
                              name="hideBrowserTasking"
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Show OPSEC Bypass Approvers</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={showOPSECBypassUsername}
                              onChange={onShowOPSECBypassUsernameChanged}
                              color="info"
                              inputProps={{ 'aria-label': 'info checkbox' }}
                              name="showOPSECBypassUsername"
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Hide Tasking Context Tabs</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={hideTaskingContext}
                              onChange={onHideTaskingContextChanged}
                              color="info"
                              inputProps={{ 'aria-label': 'info checkbox' }}
                              name="hideTaskingContext"
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Tasking Context Fields</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Select
                              multiple={true}
                              value={taskingContextFields}
                              onChange={onChangeTaskingContextFields}
                              input={<Input style={{width: "100%"}}/>}
                          >
                              {taskingContextFieldsOptions.map( (opt) => (
                                  <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                              ) )}
                          </Select>
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow>
                      <MythicStyledTableCell colSpan={2} style={{paddingTop: "16px", paddingBottom: "16px"}}>
                          <ColorPaletteEditor
                              palette={palette}
                              onChangePaletteColor={onChangePaletteColor}
                              backgroundFileImageDarkRef={backgroundFileImageDarkRef}
                              backgroundFileImageLightRef={backgroundFileImageLightRef}
                              onFileBackgroundImageChangeDark={onFileBackgroundImageChangeDark}
                              onFileBackgroundImageChangeLight={onFileBackgroundImageChangeLight}
                          />
                      </MythicStyledTableCell>
                  </TableRow>
              </TableBody>
          </Table>
        </TableContainer>
        <DialogActions>
            <Button onClick={props.onClose} variant="contained" color="primary">
                Cancel
            </Button>
            <Button onClick={clearAllUserSettings} variant="contained" color="error">
                Clear ALL User Settings
            </Button>
            <Button onClick={setDefaults} variant="contained" color="warning">
                Reset ALL
            </Button>
            <Button onClick={() => setColorDefaults("dark")} variant={"contained"} color={"info"}>Reset Dark Mode</Button>
            <Button onClick={() => setColorDefaults("light")} variant={"contained"} color={"info"}>Reset Light Mode</Button>
            <Button onClick={onAccept} variant="contained" color="success">
                Update
            </Button>
        </DialogActions>
    </React.Fragment>
  );
}
