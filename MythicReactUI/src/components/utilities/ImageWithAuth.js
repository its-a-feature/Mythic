import React from 'react';

export const ImageWithAuth = ({ src, ...props }) => {
    const [imageSrc, setImageSrc] = React.useState('');
    const headers = {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        MythicSource: "web"
    }
    React.useEffect(() => {
        const fetchImage = async () => {
            try {
                const response = await fetch(src, { headers });
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                setImageSrc(objectUrl);
            } catch (error) {
                console.error('Error fetching image:', error);
                // Handle error (e.g., set a fallback image)
            }
        };
        fetchImage();
        // Cleanup: revoke the object URL when the component unmounts or src changes
        return () => {
            if (imageSrc) {
                URL.revokeObjectURL(imageSrc);
            }
        };
    }, [src]);

    return <img src={imageSrc} {...props} />;
};