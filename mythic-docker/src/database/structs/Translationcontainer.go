package databaseStructs

type Translationcontainer struct {
	ID               int    `db:"id"`
	Name             string `db:"name"`
	Description      string `db:"description"`
	Author           string `db:"author"`
	Deleted          bool   `db:"deleted"`
	ContainerRunning bool   `db:"container_running"`
}
