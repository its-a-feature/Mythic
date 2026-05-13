package rabbitmq

import (
	"time"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
)

const (
	shortLivedAPITokenTTL             = 5 * time.Minute
	shortLivedAPITokenCleanupInterval = 1 * time.Minute
)

// expireAPIToken marks a single token unusable. The active/deleted guard keeps
// repeated cleanup paths cheap and idempotent when a timer and sweeper overlap.
func expireAPIToken(apitokenID int) {
	_, err := database.DB.Exec(`UPDATE apitokens
		SET active=false, deleted=true
		WHERE id=$1 AND (active=true OR deleted=false)`, apitokenID)
	if err != nil {
		logging.LogError(err, "failed to mark apitoken as deleted", "apitoken_id", apitokenID)
	}
}

// expireAPITokenAfterShortLivedTTL handles the best-case in-process expiry for
// temporary tokens. A periodic sweeper also covers process restarts and failures
// that happen after token creation but before this timer fires.
func expireAPITokenAfterShortLivedTTL(apitokenID int) {
	timer := time.NewTimer(shortLivedAPITokenTTL)
	defer timer.Stop()
	<-timer.C
	expireAPIToken(apitokenID)
}

// expireAPITokensForTask retires all task-scoped tokens when the container-side
// task function is done with them. Task tokens are lifecycle-driven, not TTL-driven.
func expireAPITokensForTask(taskID int) {
	_, err := database.DB.Exec(`UPDATE apitokens
		SET active=false, deleted=true
		WHERE task_id=$1 AND (active=true OR deleted=false)`, taskID)
	if err != nil {
		logging.LogError(err, "Failed to update the task apitokens to set to deleted", "task_id", taskID)
	}
}

// expireAPITokensForPayload retires payload-scoped tokens as soon as the payload
// build lifecycle finishes. The short-lived sweeper is only a fallback.
func expireAPITokensForPayload(payloadID int) {
	_, err := database.DB.Exec(`UPDATE apitokens
		SET active=false, deleted=true
		WHERE payload_id=$1 AND (active=true OR deleted=false)`, payloadID)
	if err != nil {
		logging.LogError(err, "Failed to update the payload apitokens to set to deleted", "payload_id", payloadID)
	}
}

// startShortLivedAPITokenCleanup continuously cleans TTL-based tokens that lost
// their original in-process timer because Mythic restarted or token creation failed mid-flow.
func startShortLivedAPITokenCleanup() {
	cleanupExpiredShortLivedAPITokens()
	ticker := time.NewTicker(shortLivedAPITokenCleanupInterval)
	defer ticker.Stop()
	for range ticker.C {
		cleanupExpiredShortLivedAPITokens()
	}
}

func cleanupExpiredShortLivedAPITokens() {
	cutoff := time.Now().UTC().Add(-shortLivedAPITokenTTL)
	_, err := database.DB.Exec(`UPDATE apitokens
		SET active=false, deleted=true
		WHERE (active=true OR deleted=false)
		AND creation_time < $1
		AND token_type IN ($2, $3, $4)`,
		cutoff,
		mythicjwt.AUTH_METHOD_ON_START,
		mythicjwt.AUTH_METHOD_CALLBACK,
		mythicjwt.AUTH_METHOD_PAYLOAD)
	if err != nil {
		logging.LogError(err, "failed to clean expired short-lived apitokens")
	}
}
