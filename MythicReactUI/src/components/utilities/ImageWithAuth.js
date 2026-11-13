import React from 'react';
import {mythicFetch} from "./MythicConnection";
import {sanitizeSVG} from "./sanitizeSVG";

const imageCache = new Map();
const IMAGE_CACHE_LIFETIME = 5 * 60 * 1000;

const getImageBlob = (src) => {
    const token = localStorage.getItem('access_token');
    const key = JSON.stringify([src, token]);
    if(imageCache.has(key)){
        return imageCache.get(key);
    }
    // Cache the promise immediately so simultaneous mounts share the fetch and sanitization.
    const promise = (async () => {
        const response = await mythicFetch(src, {headers: {
            Authorization: `Bearer ${token}`,
            MythicSource: "web",
        }});
        if(!response.ok){
            throw new Error(`Failed to fetch image: ${response.status}`);
        }
        return sanitizeSVG(await response.blob());
    })();
    imageCache.set(key, promise);
    promise.then(
        () => setTimeout(() => imageCache.delete(key), IMAGE_CACHE_LIFETIME),
        () => imageCache.delete(key), // Allow failed requests to be retried on the next mount.
    );
    return promise;
};

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
            try {
                const blob = await getImageBlob(src);
                if(cancelled){return}
                objectUrl = URL.createObjectURL(blob);
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
