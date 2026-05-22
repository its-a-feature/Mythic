package eventing

import "strings"

const (
	UserInteractionApproverOperator = "operator"
	UserInteractionApproverLead     = "lead"
)

func UserInteractionApprovalRequired(config map[string]interface{}) bool {
	if value, ok := config["approval_required"]; ok {
		return userInteractionBool(value)
	}
	return false
}

func UserInteractionInputRequired(config map[string]interface{}) bool {
	if value, ok := config["input_required"]; ok && userInteractionBool(value) {
		return true
	}
	return len(UserInteractionInputs(config)) > 0
}

func UserInteractionHasRequirements(config map[string]interface{}) bool {
	return UserInteractionApprovalRequired(config) || UserInteractionInputRequired(config)
}

func UserInteractionBotApprovalApprover(config map[string]interface{}) string {
	approvalPolicy, ok := config["approval_policy"].(map[string]interface{})
	if !ok {
		return UserInteractionApproverOperator
	}
	botContext, ok := approvalPolicy["bot_context"].(map[string]interface{})
	if !ok {
		return UserInteractionApproverOperator
	}
	approver, ok := botContext["approver"].(string)
	if !ok {
		return UserInteractionApproverOperator
	}
	switch strings.ToLower(approver) {
	case UserInteractionApproverLead:
		return UserInteractionApproverLead
	default:
		return UserInteractionApproverOperator
	}
}

func UserInteractionInputs(config map[string]interface{}) []map[string]interface{} {
	inputs := []map[string]interface{}{}
	inputValue, ok := config["inputs"]
	if !ok || inputValue == nil {
		return inputs
	}
	switch typedInputs := inputValue.(type) {
	case []interface{}:
		for _, rawInput := range typedInputs {
			if inputMap, ok := rawInput.(map[string]interface{}); ok {
				inputs = append(inputs, inputMap)
			}
		}
	case []map[string]interface{}:
		inputs = append(inputs, typedInputs...)
	case map[string]interface{}:
		for name, rawInput := range typedInputs {
			inputMap := map[string]interface{}{"name": name}
			if rawInputMap, ok := rawInput.(map[string]interface{}); ok {
				for key, value := range rawInputMap {
					inputMap[key] = value
				}
			} else {
				inputMap["default_value"] = rawInput
			}
			inputs = append(inputs, inputMap)
		}
	}
	return inputs
}

func UserInteractionFieldName(field map[string]interface{}) string {
	if value, ok := field["name"]; ok {
		if name, ok := value.(string); ok {
			return name
		}
	}
	return ""
}

func UserInteractionFieldRequired(field map[string]interface{}) bool {
	if value, ok := field["required"]; ok {
		return userInteractionBool(value)
	}
	return false
}

func userInteractionBool(value interface{}) bool {
	switch typedValue := value.(type) {
	case bool:
		return typedValue
	case string:
		return strings.ToLower(typedValue) == "true"
	default:
		return false
	}
}
