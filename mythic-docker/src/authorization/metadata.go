package authorization

import (
	_ "embed"
	"encoding/json"
)

//go:embed metadata.generated.json
var generatedMetadata []byte

// Current is immutable after startup. Only query documents and request facts
// are processed at request time; schema bindings are decoded once.
// generate this with `make build_authorization` from the root directory if needed
var Current Metadata

func init() {
	if err := json.Unmarshal(generatedMetadata, &Current); err != nil {
		panic(err)
	}
}
