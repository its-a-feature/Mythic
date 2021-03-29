function(task, response) {
    let rows = [];
    for (let i = 0; i < response.length; i++) {
        try {
            var data = JSON.parse(response[i]['response']);
        } catch (error) {
            //return error.ToString();
            return escapeHTML(response);
        }

        data.forEach(function (r) {
            var row_style = "";
            if (r["IsDir"]) {
                row_style = "background-color: #5E28DC";
            }
            rows.push({
                "Filename": escapeHTML(r['file_name']),
                "Size": escapeHTML(r['size']),
                "Lastmodified": escapeHTML(r['timestamp']),
                "IsDir": escapeHTML(r['IsDir']),
                "row-style": row_style,
                "cell-style": {}
            });
        });
    }
    return support_scripts['atlas_create_table']([{"name": "Filename", "size": "10em"}, {
        "name": "Size",
        "size": "2em"
    }, {"name": "Lastmodified", "size": "3em"}, {"name": "IsDir", "size": "2em"}], rows);
}
