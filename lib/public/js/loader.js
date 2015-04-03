
function loadAndWait(todoCode) {
	$("#loading-modal").modal('show');

	todoCode(function() {
		$("#loading-modal").modal('hide');		
	})

}