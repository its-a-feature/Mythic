package webcontroller

import (
	"database/sql"
	"strings"
	"testing"

	"github.com/its-a-feature/Mythic/rabbitmq"
)

type fakeOperatorAliasRecord struct {
	ID                   int
	OperatorID           int
	PayloadTypeID        int
	ConsumingContainerID int
	SlashCommand         string
	ActualCommand        string
}

type fakeOperatorAliasGetter struct {
	records []fakeOperatorAliasRecord
}

func (f fakeOperatorAliasGetter) Get(dest interface{}, query string, args ...interface{}) error {
	operatorID := args[0].(int)
	slashCommand := args[2].(string)
	actualCommand := args[3].(string)
	excludeID := args[4].(int)
	for _, record := range f.records {
		if record.ID == excludeID ||
			record.OperatorID != operatorID ||
			record.SlashCommand != slashCommand ||
			record.ActualCommand != actualCommand {
			continue
		}
		if strings.Contains(query, "payloadtype_id=$2") {
			if record.PayloadTypeID != args[1].(int) || record.ConsumingContainerID != 0 {
				continue
			}
		} else {
			if record.ConsumingContainerID != args[1].(int) || record.PayloadTypeID != 0 {
				continue
			}
		}
		*(dest.(*int)) = record.ID
		return nil
	}
	return sql.ErrNoRows
}

func TestNormalizePortableOperatorAlias(t *testing.T) {
	normalized, actualCommand, errText := normalizePortableOperatorAlias(OperatorAliasPortableAlias{
		SlashCommand:  "  ///TEST_alias  ",
		ActualCommand: "  shell whoami  ",
	})
	if errText != "" {
		t.Fatalf("unexpected validation error: %s", errText)
	}
	if normalized != "test_alias" {
		t.Fatalf("normalized command = %q, want test_alias", normalized)
	}
	if actualCommand != "shell whoami" {
		t.Fatalf("actual command = %q, want shell whoami", actualCommand)
	}

	_, _, errText = normalizePortableOperatorAlias(OperatorAliasPortableAlias{
		SlashCommand:  "/1bad",
		ActualCommand: "shell whoami",
	})
	if errText == "" {
		t.Fatal("expected invalid slash command to fail")
	}
}

func TestOperatorAliasExactDuplicateExistsIsScoped(t *testing.T) {
	getter := fakeOperatorAliasGetter{records: []fakeOperatorAliasRecord{
		{ID: 1, OperatorID: 7, PayloadTypeID: 11, SlashCommand: "same", ActualCommand: "shell whoami"},
		{ID: 2, OperatorID: 7, ConsumingContainerID: 22, SlashCommand: "same", ActualCommand: "shell whoami"},
	}}

	exists, err := operatorAliasExactDuplicateExists(getter, 7, "same", "shell whoami", rabbitmq.OperatorAliasScope{PayloadTypeID: 11}, 0)
	if err != nil {
		t.Fatalf("unexpected duplicate check error: %v", err)
	}
	if !exists {
		t.Fatal("expected duplicate in the same payload type scope")
	}

	exists, err = operatorAliasExactDuplicateExists(getter, 7, "same", "shell whoami", rabbitmq.OperatorAliasScope{PayloadTypeID: 12}, 0)
	if err != nil {
		t.Fatalf("unexpected duplicate check error: %v", err)
	}
	if exists {
		t.Fatal("same slash and actual command should be allowed in a different payload type scope")
	}

	exists, err = operatorAliasExactDuplicateExists(getter, 7, "same", "shell whoami", rabbitmq.OperatorAliasScope{ConsumingContainerID: 22}, 2)
	if err != nil {
		t.Fatalf("unexpected duplicate check error: %v", err)
	}
	if exists {
		t.Fatal("excluded alias id should not be treated as a duplicate")
	}
}

func TestOperatorAliasImportSkippedCounts(t *testing.T) {
	response := OperatorAliasImportOutput{Status: "success", Skipped: []OperatorAliasImportSkipped{}}
	response.addSkippedAlias(0, OperatorAliasPortableAlias{}, operatorAliasSkipDuplicateReason, "duplicate")
	response.addSkippedAlias(1, OperatorAliasPortableAlias{}, operatorAliasSkipMissingReason, "missing")
	response.addSkippedAlias(2, OperatorAliasPortableAlias{}, operatorAliasSkipInvalidReason, "invalid")

	if response.SkippedCount != 3 {
		t.Fatalf("skipped count = %d, want 3", response.SkippedCount)
	}
	if response.SkippedDuplicateCount != 1 || response.SkippedMissingCount != 1 || response.SkippedInvalidCount != 1 {
		t.Fatalf("skip reason counts = duplicate:%d missing:%d invalid:%d, want 1 each",
			response.SkippedDuplicateCount, response.SkippedMissingCount, response.SkippedInvalidCount)
	}
}
