function(header, element, unique_id){
	//takes in information about the header to make and the element to collapse within it (as a string)
	var output = "<div class='card'><div class='card-header border border-dark shadow'><a class='btn' type='button' data-toggle='collapse' data-target='#bstask" + unique_id + "' aria-expanded='false' aria-controls='bstask" + unique_id + "'>"+ header['name'] + "</a></div>";
      output += "<div class='collapse' id=\"bstask" + unique_id + "\" style='width:100%'>";
      output += "<div class='bg-card-body-l2 card-body border border-dark shadow'>" + element + "</div></div></div>";
  return output;
}