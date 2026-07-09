import React from 'react';

export const ImageWithAuth = ({ src, onError, alt = "", ...props }) => {
    const [imageSrc, setImageSrc] = React.useState('');
    const onErrorRef = React.useRef(onError);

    React.useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    React.useEffect(() => {
        let objectUrl = "";
        let cancelled = false;
        if(!src){
            setImageSrc("");
            return undefined;
        }
        setImageSrc((currentImageSrc) => currentImageSrc ? "" : currentImageSrc);
        const fetchImage = async () => {
            const headers = {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                MythicSource: "web"
            };
            try {
                const response = await fetch(src, { headers });
                if(!response.ok){
                    throw new Error(`Failed to fetch image: ${response.status}`);
                }
                const blob = await response.blob();
                objectUrl = URL.createObjectURL(blob);
                if(cancelled){
                    URL.revokeObjectURL(objectUrl);
                    return;
                }
                setImageSrc(objectUrl);
            } catch (error) {
                console.error('Error fetching image:', error);
                if(onErrorRef.current && !cancelled){
                    onErrorRef.current(error);
                }
                // Handle error (e.g., set a fallback image)
            }
        };
        fetchImage();
        // Cleanup: revoke the object URL when the component unmounts or src changes
        return () => {
            cancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);

    if(!imageSrc){
        return null;
    }
    return <img alt={alt} src={imageSrc} onError={(event) => onErrorRef.current?.(event)} {...props} />;
};
