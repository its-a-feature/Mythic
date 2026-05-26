package rabbitmq

import (
	"testing"

	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
)

func TestResolveUserInteractionConfigValueSourcesFromStepOutputs(t *testing.T) {
	allEventSteps := []databaseStructs.EventStepInstance{
		{
			Outputs: eventing.GetMythicJSONTextFromStruct(map[string]interface{}{
				"default_choice": "bravo",
				"choices":        []interface{}{"alpha", "bravo"},
			}),
			EventStep: databaseStructs.EventStep{
				Name: "lookup",
			},
		},
	}
	config := map[string]interface{}{
		"input_required": true,
		"inputs": []interface{}{
			map[string]interface{}{
				"name": "selection",
				"type": "ChooseOne",
				"default_value_source": map[string]interface{}{
					"type":  "lookup.default_choice",
					"value": "lookup.default_choice",
				},
				"choices_source": map[string]interface{}{
					"type":  "lookup.choices",
					"value": "lookup.choices",
				},
			},
		},
	}

	resolvedConfig := resolveUserInteractionConfigValueSources(config, allEventSteps)
	inputs := eventing.UserInteractionInputs(resolvedConfig)
	if len(inputs) != 1 {
		t.Fatalf("expected one input, got %d", len(inputs))
	}
	if inputs[0]["default_value"] != "bravo" {
		t.Fatalf("expected default value to resolve from step output, got %#v", inputs[0]["default_value"])
	}
	choices := eventing.UserInteractionFieldChoices(inputs[0])
	if len(choices) != 2 || choices[0] != "alpha" || choices[1] != "bravo" {
		t.Fatalf("expected choices to resolve from step output, got %#v", choices)
	}
}
