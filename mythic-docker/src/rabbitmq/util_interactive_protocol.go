package rabbitmq

import (
	"errors"
	"fmt"
	"strings"
)

const interactiveTaskFeature = "task_response:interactive"
const interactiveTaskProtocolFeaturePrefix = interactiveTaskFeature + ":"

// InteractiveTaskProtocolFromFeatures resolves the protocol declared by a
// payload command. The unsuffixed legacy feature defaults to terminal. A
// specific feature is authoritative and may not conflict with another one.
func InteractiveTaskProtocolFromFeatures(features []string) (InteractiveTaskProtocol, error) {
	hasLegacyTerminal := false
	protocol := InteractiveTaskProtocol("")
	for _, feature := range features {
		if feature == interactiveTaskFeature {
			hasLegacyTerminal = true
			continue
		}
		if !strings.HasPrefix(feature, interactiveTaskProtocolFeaturePrefix) {
			continue
		}
		candidate := InteractiveTaskProtocol(strings.TrimPrefix(feature, interactiveTaskProtocolFeaturePrefix))
		switch candidate {
		case InteractiveTaskProtocolTerminal, InteractiveTaskProtocolRDP,
			InteractiveTaskProtocolVNC:
		default:
			return "", fmt.Errorf("unsupported interactive task protocol %q", candidate)
		}
		if protocol != "" && protocol != candidate {
			return "", errors.New("command declares multiple interactive task protocols")
		}
		protocol = candidate
	}
	if protocol != "" {
		return protocol, nil
	}
	if hasLegacyTerminal {
		return InteractiveTaskProtocolTerminal, nil
	}
	return "", errors.New("command is not an interactive task")
}
