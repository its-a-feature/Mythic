import React from 'react';
import {useTheme} from '@mui/material/styles';
import SmartToyTwoToneIcon from '@mui/icons-material/SmartToyTwoTone';
import {ImageWithAuth} from "../utilities/ImageWithAuth";

const defaultIconProps = {fontSize: "small"};

const shallowEqualObjects = (left = {}, right = {}) => {
    if(left === right){
        return true;
    }
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if(leftKeys.length !== rightKeys.length){
        return false;
    }
    return leftKeys.every((key) => left[key] === right[key]);
};

const MythicChatContainerIconComponent = ({containerName, className = "", imgClassName = "", iconProps = defaultIconProps, altText}) => {
    const theme = useTheme();
    const [imageFailed, setImageFailed] = React.useState(false);
    const iconName = String(containerName || "").trim();
    const imageSrc = iconName ? `/static/${iconName}_${theme.palette.mode}.svg` : "";
    const handleImageError = React.useCallback(() => {
        setImageFailed(true);
    }, []);
    React.useEffect(() => {
        setImageFailed(false);
    }, [imageSrc]);
    if(!imageSrc || imageFailed){
        return <SmartToyTwoToneIcon {...iconProps} />;
    }
    return (
        <ImageWithAuth
            alt={altText || iconName}
            className={`${className} ${imgClassName}`.trim()}
            onError={handleImageError}
            src={imageSrc}
        />
    );
};

export const MythicChatContainerIcon = React.memo(MythicChatContainerIconComponent, (previousProps, nextProps) => (
    previousProps.containerName === nextProps.containerName &&
    previousProps.className === nextProps.className &&
    previousProps.imgClassName === nextProps.imgClassName &&
    previousProps.altText === nextProps.altText &&
    shallowEqualObjects(previousProps.iconProps || defaultIconProps, nextProps.iconProps || defaultIconProps)
));
