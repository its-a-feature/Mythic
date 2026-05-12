package rabbitmq

import (
	"testing"

	"github.com/its-a-feature/Mythic/database"
)

func TestOperationMessageWarningLevelNormalization(t *testing.T) {
	level, warning := normalizeOperationMessageWarningLevel("warning", false)
	if level != database.MESSAGE_LEVEL_INFO || !warning {
		t.Fatalf("expected warning level to normalize to info warning=true, got level=%q warning=%v", level, warning)
	}

	level, warning = normalizeOperationMessageWarningLevel(database.MESSAGE_LEVEL_AGENT_MESSGAGE, true)
	if level != database.MESSAGE_LEVEL_AGENT_MESSGAGE || !warning {
		t.Fatalf("expected explicit warning flag to preserve level, got level=%q warning=%v", level, warning)
	}
}

func TestUnresolvedErrorCacheUsesSourceAndLevel(t *testing.T) {
	previousUnresolvedErrors := unresolvedErrors
	unresolvedErrors = make(map[int]map[string]map[string]int)
	t.Cleanup(func() {
		unresolvedErrors = previousUnresolvedErrors
	})

	addUnresolvedError(10, "container_down", database.MESSAGE_LEVEL_INFO, 42)
	if messageID := checkUnresolvedError(10, "container_down", database.MESSAGE_LEVEL_INFO); messageID != 42 {
		t.Fatalf("expected cached message ID 42, got %d", messageID)
	}
	if messageID := checkUnresolvedError(10, "container_down", database.MESSAGE_LEVEL_AGENT_MESSGAGE); messageID != 0 {
		t.Fatalf("expected different level to miss cache, got %d", messageID)
	}

	removeUnresolvedErrorSource(10, "container_down")
	if messageID := checkUnresolvedError(10, "container_down", database.MESSAGE_LEVEL_INFO); messageID != 0 {
		t.Fatalf("expected source removal to clear cache, got %d", messageID)
	}
}

func TestDownContainerSourceIsStable(t *testing.T) {
	if source := getDownContainerSource("poseidon"); source != "poseidon_container_down" {
		t.Fatalf("expected stable down-container source, got %q", source)
	}
}
