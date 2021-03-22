function HTTPPost(url, data) {
      const requestOptions = {
            method: "POST",
            headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
            },
            body: JSON.stringify(data)
        };
        return fetch(url, requestOptions);
}

export default HTTPPost;
