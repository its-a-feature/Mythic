package InteractiveTask

import "testing"

func TestIsValidKeepsReservedGapInvalid(t *testing.T) {
	for value := 0; value < int(interactiveEnd); value++ {
		if !IsValid(value) {
			t.Fatalf("existing interactive value %d should remain valid", value)
		}
	}
	for value := int(interactiveEnd); value < int(FileEditorRequest); value++ {
		if IsValid(value) {
			t.Fatalf("reserved value %d should be invalid", value)
		}
	}
}

func TestFileEditorMessageTypes(t *testing.T) {
	for _, value := range []MessageType{FileEditorRequest, FileEditorResponse, FileEditorError} {
		if !IsValid(int(value)) {
			t.Fatalf("file editor value %d should be valid", value)
		}
	}
	if IsValid(103) {
		t.Fatal("unused file editor value should be invalid")
	}
	if !IsError(Error) || !IsError(FileEditorError) || IsError(FileEditorResponse) {
		t.Fatal("error message classification is incorrect")
	}
}
