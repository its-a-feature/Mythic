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
	Name                 string
	Alias                string
	AliasType            string
}

type fakeOperatorAliasGetter struct {
	records []fakeOperatorAliasRecord
}

func (f fakeOperatorAliasGetter) Get(dest interface{}, query string, args ...interface{}) error {
	operatorID := args[0].(int)
	nameArgIndex := 2
	aliasArgIndex := 3
	aliasTypeArgIndex := 4
	excludeIDArgIndex := 5
	if strings.Contains(query, "payloadtype_id IS NULL AND consuming_container_id IS NULL") {
		nameArgIndex = 1
		aliasArgIndex = 2
		aliasTypeArgIndex = 3
		excludeIDArgIndex = 4
	}
	name := args[nameArgIndex].(string)
	aliasText := args[aliasArgIndex].(string)
	aliasType := args[aliasTypeArgIndex].(string)
	excludeID := args[excludeIDArgIndex].(int)
	for _, record := range f.records {
		if record.ID == excludeID ||
			record.OperatorID != operatorID ||
			record.Name != name ||
			record.Alias != aliasText ||
			record.AliasType != aliasType {
			continue
		}
		if strings.Contains(query, "payloadtype_id=$2") {
			if record.PayloadTypeID != args[1].(int) || record.ConsumingContainerID != 0 {
				continue
			}
		} else if strings.Contains(query, "consuming_container_id=$2") {
			if record.ConsumingContainerID != args[1].(int) || record.PayloadTypeID != 0 {
				continue
			}
		} else if record.PayloadTypeID != 0 || record.ConsumingContainerID != 0 {
			continue
		}
		*(dest.(*int)) = record.ID
		return nil
	}
	return sql.ErrNoRows
}

func TestNormalizePortableOperatorAlias(t *testing.T) {
	normalized, aliasText, aliasType, errText := normalizePortableOperatorAlias(OperatorAliasPortableAlias{
		Name:      "  ///TEST_alias  ",
		Alias:     "  shell whoami  ",
		AliasType: "command",
	})
	if errText != "" {
		t.Fatalf("unexpected validation error: %s", errText)
	}
	if normalized != "test_alias" {
		t.Fatalf("normalized command = %q, want test_alias", normalized)
	}
	if aliasText != "shell whoami" {
		t.Fatalf("alias = %q, want shell whoami", aliasText)
	}
	if aliasType != rabbitmq.OperatorAliasTypeCommand {
		t.Fatalf("alias type = %q, want command", aliasType)
	}

	_, _, _, errText = normalizePortableOperatorAlias(OperatorAliasPortableAlias{
		Name:  "/1bad",
		Alias: "shell whoami",
	})
	if errText == "" {
		t.Fatal("expected invalid alias name to fail")
	}

	_, _, _, errText = normalizePortableOperatorAlias(OperatorAliasPortableAlias{
		Name:      "cred",
		Alias:     "secret",
		AliasType: "generic",
	})
	if errText == "" {
		t.Fatal("expected reserved generic alias name to fail")
	}
}

func TestOperatorAliasExactDuplicateExistsIsScoped(t *testing.T) {
	getter := fakeOperatorAliasGetter{records: []fakeOperatorAliasRecord{
		{ID: 1, OperatorID: 7, PayloadTypeID: 11, Name: "same", Alias: "shell whoami", AliasType: "command"},
		{ID: 2, OperatorID: 7, ConsumingContainerID: 22, Name: "same", Alias: "shell whoami", AliasType: "command"},
		{ID: 3, OperatorID: 7, Name: "same", Alias: "shell whoami", AliasType: "command"},
	}}

	exists, err := operatorAliasExactDuplicateExists(getter, 7, "same", "shell whoami", "command", rabbitmq.OperatorAliasScope{PayloadTypeID: 11}, 0)
	if err != nil {
		t.Fatalf("unexpected duplicate check error: %v", err)
	}
	if !exists {
		t.Fatal("expected duplicate in the same payload type scope")
	}

	exists, err = operatorAliasExactDuplicateExists(getter, 7, "same", "shell whoami", "command", rabbitmq.OperatorAliasScope{PayloadTypeID: 12}, 0)
	if err != nil {
		t.Fatalf("unexpected duplicate check error: %v", err)
	}
	if exists {
		t.Fatal("same name and alias should be allowed in a different payload type scope")
	}

	exists, err = operatorAliasExactDuplicateExists(getter, 7, "same", "shell whoami", "command", rabbitmq.OperatorAliasScope{ConsumingContainerID: 22}, 2)
	if err != nil {
		t.Fatalf("unexpected duplicate check error: %v", err)
	}
	if exists {
		t.Fatal("excluded alias id should not be treated as a duplicate")
	}

	exists, err = operatorAliasExactDuplicateExists(getter, 7, "same", "shell whoami", "command", rabbitmq.OperatorAliasScope{}, 0)
	if err != nil {
		t.Fatalf("unexpected duplicate check error: %v", err)
	}
	if !exists {
		t.Fatal("expected duplicate in the global scope")
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
