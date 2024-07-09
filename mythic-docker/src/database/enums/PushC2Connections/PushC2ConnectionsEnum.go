package PushC2Connections

type ConnectionType int

const (
	NeverConnected ConnectionType = iota
	DisconnectedOneToOne
	DisconnectedOneToMany
	Connected
	ConnectedOneToOne
	ConnectedOneToMany
)
