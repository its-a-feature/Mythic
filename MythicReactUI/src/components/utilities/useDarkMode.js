import { useEffect, useState } from 'react';
export const useDarkMode = () => {
    const [theme, setTheme] = useState('dark');
    const [mountedComponent, setMountedComponent] = useState(false)
    const setMode = mode => {
        window.localStorage.setItem('theme', mode)
        setTheme(mode)
    };

    const themeToggler = () => {
        theme === 'light' ? setMode('dark') : setMode('light')
    };

    useEffect(() => {
        const localTheme = window.localStorage.getItem('theme');
        if(localTheme){setTheme(localTheme)}
        else{
            const checkIsDarkSchemePreferred = () => window?.matchMedia?.('(prefers-color-scheme:dark)')?.matches || false;
            if(checkIsDarkSchemePreferred()){
                setMode('dark');
            } else {
                setMode('light');
            }
        }
        //localTheme ? setTheme(localTheme) : setMode('dark')
        setMountedComponent(true)
    }, []);

    return [theme, themeToggler, mountedComponent]
};
