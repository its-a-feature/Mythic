import {Button, Link} from '@mui/material';
import {snackActions} from "./Snackbar";

export const handleAuthLink = async (event, href) => {
    event.preventDefault(); // Prevent default anchor link navigation
    try {
        const response = await fetch(href, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
        });

        if (response.ok) {
            const blob = await response.blob();
            const fileURL = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = fileURL;
            const filename = response.headers.get("content-disposition");
            console.log(filename, filename.split('filename=')[1]);
            link.download = filename.split('filename=')[1].replaceAll('"', "");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(fileURL);
        } else {
            console.error('Authorization failed');
            snackActions.error("Failed to download file");
            console.error(response);
        }
    } catch (error) {
        console.error('Error:', error);
    }
};

export function FileDownloadLinkWithAuth({href, children, ...props}){

    return (
        <Link href={href} onClick={(e) => handleAuthLink(e, href)} {...props}>
            {children}
        </Link>
    );
}

export function FileDownloadButtonWithAuth({href, children, ...props}){

    return (
        <Button href={href} onClick={(e) => handleAuthLink(e, href)} {...props}>
            {children}
        </Button>
    );
}