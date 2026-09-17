import * as React from "react";
import { useState, useEffect } from "react";
import { MythicStyledTooltip } from './MythicStyledTooltip';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const formatDiff = (ms) => {
    if (ms < 0) ms = 0;
    const s = Math.trunc(ms / 1000) % 60;
    const m = Math.trunc(ms / 60000) % 60;
    const h = Math.trunc(ms / 3600000) % 24;
    const d = Math.trunc(ms / 86400000);
    return (d ? d + "d " : "") + (h ? h + "h " : "") + (m ? m + "m " : "") + s + "s";
};

export const MythicTimestamp = ({
    children,
    fromNow = false,
    duration = false,
    endTime,
    interval = 0,
    withTitle = false,
    titleFormat = "YYYY-MM-DD HH:mm:ss",
}) => {
    const compute = () => {
        const t = dayjs(children);
        if (!t.isValid()) return "";
        if (duration) {
            const end = dayjs(endTime);
            return formatDiff((end.isValid() ? end : dayjs()).diff(t));
        }
        return fromNow ? t.fromNow(true) : t.format(titleFormat);
    };
    const [display, setDisplay] = useState(compute);
    useEffect(() => {
        setDisplay(compute());
        if (!interval) return;
        const id = setInterval(() => setDisplay(compute()), interval);
        return () => clearInterval(id);
    }, [children, interval]);

    const title = withTitle ? dayjs(children).format(titleFormat) : "";
    if (withTitle) return (
        <MythicStyledTooltip title={title}>
            <span>{display}</span>
        </MythicStyledTooltip>
    );
    return <span>{display}</span>;
};
