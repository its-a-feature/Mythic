import { makeVar } from '@apollo/client';

export const meState = makeVar({});
export const menuOpen = makeVar(false);

if (localStorage.getItem("access_token") !== null){
    meState({
        loggedIn: true,
        access_token: localStorage.getItem("access_token"),
        refresh_token: localStorage.getItem("refresh_token"),
        user: JSON.parse(localStorage.getItem("user"))
    });
}
export const successfulLogin = (data) => {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    meState({
        loggedIn: true,
        ...data
    });
}
export const successfulRefresh = (data) => {
    localStorage.setItem("access_token", data.access_token);
}
