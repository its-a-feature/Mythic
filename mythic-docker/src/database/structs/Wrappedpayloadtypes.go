package databaseStructs

type Wrappedpayloadtypes struct {
	ID        int         `db:"id"`
	WrapperID int         `db:"wrapper_id"`
	Wrapper   Payloadtype `db:"wrapper"`
	WrappedID int         `db:"wrapped_id"`
	Wrapped   Payloadtype `db:"wrapped"`
}
