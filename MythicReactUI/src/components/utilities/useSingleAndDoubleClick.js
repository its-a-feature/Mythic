import { useState, useEffect, useRef, useCallback } from 'react';

const useSingleAndDoubleClick = (onSingleClick, onDoubleClick, delay = 250) => {
    const [click, setClick] = useState(0);
    const onSingleClickRef = useRef(onSingleClick);
    const onDoubleClickRef = useRef(onDoubleClick);

    useEffect(() => {
        onSingleClickRef.current = onSingleClick;
        onDoubleClickRef.current = onDoubleClick;
    }, [onSingleClick, onDoubleClick]);

    useEffect(() => {
        if(click === 0){
            return;
        }
        const timer = setTimeout(() => {
            // simple click
            if (click === 1) onSingleClickRef.current();
            setClick(0);
        }, delay);

        // the duration between this click and the previous one
        // is less than the value of delay = double-click
        if (click === 2){
            setClick(0);
            onDoubleClickRef.current();
        }
        return () => clearTimeout(timer);
    }, [delay, click]);

    return useCallback(() => setClick((prev) => prev + 1), []);
};

export default useSingleAndDoubleClick;
