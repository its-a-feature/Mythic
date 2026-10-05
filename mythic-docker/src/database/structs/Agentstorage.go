package databaseStructs

type Agentstorage struct {
	ID                 int    `db:"id"`
	Data               []byte `db:"data"`
	UniqueID           string `db:"unique_id"`
	OperationID        int    `db:"operation_id"`
	ContainerPrincipal string `db:"container_principal"`
}
