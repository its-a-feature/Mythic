function HTTPGet(url) {
      const requestOptions = {
            method: "GET",
            headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
            'refresh': localStorage.getItem('refresh_token')
            
            }
        };
        return fetch(url, requestOptions);
}

export default HTTPGet;
