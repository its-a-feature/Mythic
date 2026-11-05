import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {MythicTimestamp} from './MythicTimestamp';

jest.mock('./MythicStyledTooltip', () => ({
    MythicStyledTooltip: ({children, title}) => <div title={title}>{children}</div>,
}));

describe('MythicTimestamp', () => {
    let container;
    let root;
    const start = '2026-01-15T12:00:00.000000';

    const render = (props) => {
        act(() => root.render(<MythicTimestamp {...props} />));
        return container.textContent;
    };

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-01-15T12:00:10Z'));
        global.IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement('div');
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        expect(jest.getTimerCount()).toBe(0);
        jest.useRealTimers();
        delete global.IS_REACT_ACT_ENVIRONMENT;
    });

    it('uses UTC for timezone-less end timestamps and respects explicit offsets', () => {
        const props = {children: start + 'Z', duration: true};
        expect(render({...props, endTime: '2026-01-15T12:01:00.000000'})).toBe('1m 0s');
        expect(render({...props, endTime: '2026-01-15T04:01:00-08:00'})).toBe('1m 0s');
    });

    it('recomputes when only the end time changes', () => {
        const props = {children: start + 'Z', duration: true};
        render({...props, endTime: '2026-01-15T12:01:00'});
        expect(render({...props, endTime: '2026-01-15T12:02:00'})).toBe('2m 0s');
    });

    it('uses updated server skew immediately and on subsequent ticks', () => {
        const props = {children: start + 'Z', fromNow: true, interval: 1000};
        expect(render(props)).toBe('10 seconds');
        expect(render({...props, serverSkew: 3600000})).toBe('an hour');
        act(() => jest.advanceTimersByTime(1000));
        expect(container.textContent).toBe('an hour');
    });

    it('keeps numeric seconds through 59 seconds and updates every tick', () => {
        const props = {children: start + 'Z', fromNow: true, interval: 1000};
        expect(render(props)).toBe('10 seconds');
        act(() => jest.advanceTimersByTime(49000));
        expect(container.textContent).toBe('59 seconds');
        act(() => jest.advanceTimersByTime(1000));
        expect(container.textContent).toBe('a minute');
    });

    it('shows zero seconds for fresh check-ins, including after the age resets', () => {
        const props = {fromNow: true, interval: 1000};
        expect(render({...props, children: new Date(Date.now() - 200).toISOString()})).toBe('0 seconds');
        act(() => jest.advanceTimersByTime(1000));
        expect(container.textContent).toBe('1 second');
        act(() => jest.advanceTimersByTime(1000));
        expect(container.textContent).toBe('2 seconds');
        expect(render({...props, children: new Date(Date.now()).toISOString()})).toBe('0 seconds');
        act(() => jest.advanceTimersByTime(1000));
        expect(container.textContent).toBe('1 second');
    });

    it('recomputes when display mode or format changes', () => {
        const props = {children: start + 'Z'};
        expect(render({...props, fromNow: true})).toBe('10 seconds');
        expect(render({...props, titleFormat: 'YYYY'})).toBe('2026');
        expect(render({...props, titleFormat: 'MM'})).toBe('01');
    });

    it('renders invalid timestamps as empty text and clears timers on unmount', () => {
        expect(render({children: 'invalid', fromNow: true, interval: 1000})).toBe('');
        expect(jest.getTimerCount()).toBe(1);
        render({children: start, duration: true, endTime: 'invalid'});
        expect(container.textContent).toBe('');
        expect(jest.getTimerCount()).toBe(0);
    });
});
