package eventing

import "testing"

func TestNormalizeUserInteractionChoicesSupportsSlices(t *testing.T) {
	interfaceChoices := NormalizeUserInteractionChoices([]interface{}{"alpha", "bravo"})
	if len(interfaceChoices) != 2 || interfaceChoices[0] != "alpha" || interfaceChoices[1] != "bravo" {
		t.Fatalf("expected interface choices to be preserved, got %#v", interfaceChoices)
	}

	stringChoices := NormalizeUserInteractionChoices([]string{"one", "two"})
	if len(stringChoices) != 2 || stringChoices[0] != "one" || stringChoices[1] != "two" {
		t.Fatalf("expected string choices to be preserved, got %#v", stringChoices)
	}
}
