import { useState, useEffect } from 'react';

const useSingleAndDoubleClick = (onSingleClick, onDoubleClick, delay = 250) => {
    const [click, setClick] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            // simple click
            if (click === 1) onSingleClick();
            setClick(0);
        }, delay);

        // the duration between this click and the previous one
        // is less than the value of delay = double-click
        if (click === 2){
            onDoubleClick();
            setClick(0);
        }
        return () => clearTimeout(timer);
    }, [delay, onSingleClick, onDoubleClick, click]);

    return () => setClick((prev) => prev + 1);
};

export default useSingleAndDoubleClick;
