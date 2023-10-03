package InteractiveTask

type MessageType int

const (
	Input MessageType = iota
	Output
	Error
	Exit
	Escape    //^[ 0x1B
	CtrlA     //^A - 0x01 - start
	CtrlB     //^B - 0x02 - back
	CtrlC     //^C - 0x03 - interrupt process
	CtrlD     //^D - 0x04 - delete (exit if nothing sitting on input)
	CtrlE     //^E - 0x05 - end
	CtrlF     //^F - 0x06 - forward
	CtrlG     //^G - 0x07 - cancel search
	Backspace //^H - 0x08 - backspace
	Tab       //^I - 0x09 - tab
	CtrlK     //^K - 0x0B - kill line forwards
	CtrlL     //^L - 0x0C - clear screen
	CtrlN     //^N - 0x0E - next history
	CtrlP     //^P - 0x10 - previous history
	CtrlQ     //^Q - 0x11 - unpause output
	CtrlR     //^R - 0x12 - search history
	CtrlS     //^S - 0x13 - pause output
	CtrlU     //^U - 0x15 - kill line backwards
	CtrlW     //^W - 0x17 - kill word backwards
	CtrlY     //^Y - 0x19 - yank
	CtrlZ     //^Z - 0x1A - suspend process
	end
)

func IsValid(value int) bool {
	return value >= 0 && value < int(end)
}
