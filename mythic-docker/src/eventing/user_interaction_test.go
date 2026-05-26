package eventing

import "testing"

func TestUserInteractionChoiceContainsSupportsPrimitiveAndLabelValueChoices(t *testing.T) {
	field := map[string]interface{}{
		"type": "ChooseOne",
		"choices": []interface{}{
			"alpha",
			map[string]interface{}{
				"label": "Second choice",
				"value": "bravo",
			},
			map[string]interface{}{
				"label": "Numeric choice",
				"value": float64(3),
			},
		},
	}

	if !UserInteractionChoiceContains(field, "alpha") {
		t.Fatalf("expected primitive choice to be accepted")
	}
	if !UserInteractionChoiceContains(field, "bravo") {
		t.Fatalf("expected label/value choice to be accepted")
	}
	if !UserInteractionChoiceContains(field, 3) {
		t.Fatalf("expected numeric choice to compare by value")
	}
	if UserInteractionChoiceContains(field, "charlie") {
		t.Fatalf("unexpected choice was accepted")
	}
}

func TestNormalizeUserInteractionChoicesSupportsMapsAndNewlineStrings(t *testing.T) {
	mapChoices := NormalizeUserInteractionChoices(map[string]interface{}{
		"Bravo": "bravo",
		"Alpha": "alpha",
	})
	if len(mapChoices) != 2 {
		t.Fatalf("expected two map choices, got %d", len(mapChoices))
	}
	firstChoice, ok := mapChoices[0].(map[string]interface{})
	if !ok {
		t.Fatalf("expected normalized map choice")
	}
	if firstChoice["label"] != "Alpha" || firstChoice["value"] != "alpha" {
		t.Fatalf("expected map choices to be sorted and label/value normalized, got %#v", firstChoice)
	}

	stringChoices := NormalizeUserInteractionChoices("one\n\ntwo\n")
	if len(stringChoices) != 2 || stringChoices[0] != "one" || stringChoices[1] != "two" {
		t.Fatalf("expected newline choices to be split, got %#v", stringChoices)
	}
}
