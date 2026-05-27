import remarkGfm from 'remark-gfm';

export const markdownPlugins = [remarkGfm];
export const allowedMarkdownLinkSchemes = ["http:", "https:", "mailto:"];

export const isAllowedMarkdownLink = (href) => {
    if(!href){
        return false;
    }
    try{
        const url = new URL(href, window.location.origin);
        return allowedMarkdownLinkSchemes.includes(url.protocol);
    }catch(error){
        return false;
    }
}
