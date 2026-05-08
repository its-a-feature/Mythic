import React from 'react';
import Box from '@mui/material/Box';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Popper from '@mui/material/Popper';
import {HexColorInput, HexColorPicker} from 'react-colorful';

export const isValidHexColor = (color) => {
    if(typeof color !== "string"){
        return false;
    }
    if(color.length !== 7){
        return false;
    }
    if(color[0] !== "#"){
        return false;
    }
    return /^#[0-9a-fA-F]{6}$/.test(color);
}

export const getReadableTextColor = (backgroundColor) => {
    if(!isValidHexColor(backgroundColor)){
        return "#ffffff";
    }
    const red = parseInt(backgroundColor.slice(1, 3), 16);
    const green = parseInt(backgroundColor.slice(3, 5), 16);
    const blue = parseInt(backgroundColor.slice(5, 7), 16);
    const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
    return brightness >= 140 ? "#111827" : "#ffffff";
}

export const MythicColorSwatchInput = ({color, label, onChange, inputWidth = "96px", sx = {}}) => {
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const swatchRef = React.useRef(null);
    const safeColor = isValidHexColor(color) ? color : "#000000";
    return (
        <ClickAwayListener onClickAway={() => setPickerOpen(false)}>
            <Box sx={{display: "flex", alignItems: "center", gap: 1, minWidth: 0, position: "relative", ...sx}}>
                <Box
                    component="button"
                    type="button"
                    ref={swatchRef}
                    onClick={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                        setPickerOpen((open) => !open);
                    }}
                    aria-label={label}
                    aria-expanded={pickerOpen}
                    sx={{
                        alignItems: "center",
                        backgroundColor: "transparent",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "inline-flex",
                        flex: "0 0 auto",
                        height: 30,
                        justifyContent: "center",
                        p: "2px",
                        width: 34,
                    }}
                >
                    <Box
                        sx={{
                            backgroundColor: safeColor,
                            borderRadius: "3px",
                            height: "100%",
                            width: "100%",
                        }}
                    />
                </Box>
                <Popper
                    open={pickerOpen}
                    anchorEl={swatchRef.current}
                    placement="bottom-start"
                    style={{zIndex: 100000}}
                >
                    <Box
                        onMouseDown={(evt) => evt.stopPropagation()}
                        onClick={(evt) => evt.stopPropagation()}
                        sx={{
                            backgroundColor: "background.paper",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: "6px",
                            boxShadow: 8,
                            mt: 0.5,
                            p: 1,
                            "& .react-colorful": {
                                width: 210,
                                height: 160,
                            },
                        }}
                    >
                        <HexColorPicker color={safeColor} onChange={onChange} />
                    </Box>
                </Popper>
                <HexColorInput
                    color={color}
                    onChange={onChange}
                    prefixed={true}
                    style={{
                        width: inputWidth,
                        minWidth: 0,
                        height: "30px",
                        boxSizing: "border-box",
                        borderRadius: "4px",
                        border: "1px solid rgba(128,128,128,0.45)",
                        background: "transparent",
                        color: "inherit",
                        padding: "0 8px",
                        fontFamily: "inherit",
                        fontSize: "0.85rem",
                    }}
                />
            </Box>
        </ClickAwayListener>
    );
}
