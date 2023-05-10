package databaseStructs

type Buildparameter struct {
	ID            int             `db:"id"`
	Name          string          `db:"name"`
	ParameterType string          `db:"parameter_type"`
	Description   string          `db:"description"`
	PayloadTypeID int             `db:"payload_type_id"`
	Required      bool            `db:"required"`
	VerifierRegex string          `db:"verifier_regex"`
	Deleted       bool            `db:"deleted"`
	DefaultValue  string          `db:"default_value"`
	IsCryptoType  bool            `db:"crypto_type"`
	FormatString  string          `db:"format_string"`
	Randomize     bool            `db:"randomize"`
	Choices       MythicJSONArray `db:"choices"`
}
