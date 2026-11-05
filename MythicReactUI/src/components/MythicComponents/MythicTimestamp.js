import * as React from "react";
import { useState, useEffect } from "react";
import { MythicStyledTooltip } from './MythicStyledTooltip';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
dayjs.extend(relativeTime);
dayjs.extend(utc);

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
    serverSkew = 0,
}) => {
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        if (!interval) return;
        const id = setInterval(() => setNow(Date.now()), interval);
        return () => clearInterval(id);
    }, [interval]);

    // Mythic's server timestamps without an explicit offset represent UTC.
    const t = dayjs.utc(children);
    const compute = () => {
        if (!t.isValid()) return "";
        const serverNow = dayjs(now).add(serverSkew, 'ms');
        if (duration) {
            const end = endTime != null ? dayjs.utc(endTime) : serverNow;
            if (!end.isValid()) return "";
            return formatDiff(end.diff(t));
        }
        if (fromNow) {
            const seconds = Math.round(Math.abs(serverNow.diff(t)) / 1000);
            if (seconds < 60) return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
            return t.from(serverNow, true);
        }
        return t.local().format(titleFormat);
    };
    const display = compute();

    const title = withTitle && t.isValid() ? t.local().format(titleFormat) : "";
    if (withTitle) return (
        <MythicStyledTooltip title={title}>
            <span>{display}</span>
        </MythicStyledTooltip>
    );
    return <span>{display}</span>;
};
