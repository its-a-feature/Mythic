package databaseStructs

type Operation struct {
	ID         int    `db:"id"`
	Name       string `db:"name"`
	AdminID    int    `db:"admin_id"`
	Complete   bool   `db:"complete"`
	Webhook    string `db:"webhook"`
	Channel    string `db:"channel"`
	Deleted    bool   `db:"deleted"`
	AlertCount int    `db:"alert_count"`
}
