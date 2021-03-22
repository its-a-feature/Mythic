import {useEffect, useRef } from 'react';

export function toLocalTime(date, view_utc_time) {
    try {
        if(date === null){
            return "N/A";
        }
        let init_date = new Date(date);
        if (view_utc_time) {
            return date + " UTC";
        }
        return init_date.toDateString() + " " + init_date.toTimeString().substring(0, 8);
    } catch (error) {
        console.log("warning", "Failed to get local time converted: " + error.toString());
    }

}

export function getTimeDifference(checkin_time) {
    let date = new Date();
    let now = date.getTime() + date.getTimezoneOffset() * 60000;
    let millisec = now - (new Date(checkin_time).getTime());
    let seconds = Math.trunc(((millisec / 1000)) % 60);
    let minutes = Math.trunc(((millisec / (1000 * 60))) % 60);
    let hours = Math.trunc(((millisec / (1000 * 60 * 60))) % 24);
    let days = Math.trunc(((millisec / (1000 * 60 * 60 * 24))) % 365);
    let output = "";
    if(days !== 0){ output += days + "d";}
    if(hours !== 0){ output += hours + "h";}
    if(minutes !== 0){ output += minutes + "m";}
    output += seconds + "s";
    return output;
}
//https://overreacted.io/making-setinterval-declarative-with-react-hooks/
export function useInterval(callback, delay) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    let id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}
