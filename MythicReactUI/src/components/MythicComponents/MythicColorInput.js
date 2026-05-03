import React from 'react';
import Box from '@mui/material/Box';
import {HexColorInput} from 'react-colorful';

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
    const safeColor = isValidHexColor(color) ? color : "#000000";
    return (
        <Box sx={{display: "flex", alignItems: "center", gap: 1, minWidth: 0, ...sx}}>
            <Box
                component="input"
                type="color"
                value={safeColor}
                onChange={(evt) => onChange(evt.target.value)}
                aria-label={label}
                sx={{
                    width: 34,
                    height: 30,
                    flex: "0 0 auto",
                    p: 0,
                    border: "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    "&::-webkit-color-swatch-wrapper": {p: 0},
                    "&::-webkit-color-swatch": {
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "4px",
                    },
                    "&::-moz-color-swatch": {
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "4px",
                    },
                }}
            />
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
    );
}
