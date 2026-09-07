import React from 'react';
import {useTheme} from '@mui/material/styles';
import {getReadableTextColor, isValidHexColor} from './MythicColorInput';
import {MythicChip} from './MythicChip';

export const getTagReadableTextColor = (theme, color) => {
  return isValidHexColor(color) ? getReadableTextColor(color) : theme.palette.text.primary;
}

export const TagTypeChip = ({tagtype, label, sx={}}) => {
  const theme = useTheme();
  const color = tagtype?.color || "";
  const textColor = getTagReadableTextColor(theme, color);
  return (
    <MythicChip
        color={color}
        label={label || tagtype?.name || "Tag"}
        size="small"
        sx={{
          backgroundColor: color || "transparent",
          border: "1px solid",
          borderColor: theme.borderColor,
          color: textColor,
          ...sx,
        }}
    />
  );
}
