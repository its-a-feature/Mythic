package webcontroller

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/database/enums/PushC2Connections"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/grpc"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
	"time"
)

type UpdateCallbackInputInput struct {
	Input UpdateCallbackInput `json:"input" binding:"required"`
}

type UpdateCallbackInput struct {
	Input UpdateCallback `json:"input" binding:"required"`
}

type UpdateCallback struct {
	CallbackDisplayID         *int      `json:"callback_display_id,omitempty"`
	CallbackDisplayIDs        *[]int    `json:"callback_display_ids,omitempty"`
	Active                    *bool     `json:"active,omitempty"`
	Locked                    *bool     `json:"locked,omitempty"`
	Description               *string   `json:"description,omitempty"`
	IPs                       *[]string `json:"ips,omitempty"`
	Host                      *string   `json:"host,omitempty"`
	User                      *string   `json:"user,omitempty"`
	OS                        *string   `json:"os,omitempty"`
	Architecture              *string   `json:"architecture,omitempty"`
	ExtraInfo                 *string   `json:"extra_info,omitempty"`
	SleepInfo                 *string   `json:"sleep_info,omitempty"`
	PID                       *int      `json:"pid,omitempty"`
	ProcessName               *string   `json:"process_name,omitempty"`
	IntegrityLevel            *int      `json:"integrity_level,omitempty"`
	Domain                    *string   `json:"domain,omitempty"`
	Dead                      *bool     `json:"dead,omitempty"`
	Color                     *string   `json:"color,omitempty"`
	TriggerOnCheckinAfterTime *int      `json:"trigger_on_checkin_after_time,omitempty"`
}

type UpdateCallbackResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func UpdateCallbackWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdateCallbackInputInput // we'll fix this after the new stuff comes out to not have the double input
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, UpdateCallbackResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		c.JSON(http.StatusOK, UpdateCallbackResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	callback := databaseStructs.Callback{}
	var callbacks []int
	if input.Input.Input.CallbackDisplayIDs != nil {
		callbacks = *input.Input.Input.CallbackDisplayIDs
	} else if input.Input.Input.CallbackDisplayID != nil {
		callbacks = []int{*input.Input.Input.CallbackDisplayID}
	} else {
		logging.LogError(nil, "Must supply callback_display_id or callback_display_ids when updating callbacks")
		c.JSON(http.StatusOK, UpdateCallbackResponse{
			Status: "error",
			Error:  "Must supply callback_display_id or callback_display_ids when updating callbacks",
		})
		return
	}
	for _, currentCallbackDisplayID := range callbacks {
		err := database.DB.Get(&callback, `SELECT 
			*
			FROM callback
			WHERE display_id=$1 and operation_id=$2`, currentCallbackDisplayID,
			operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(err, "Failed to get callback")
			c.JSON(http.StatusOK, UpdateCallbackResponse{
				Status: "error",
				Error:  "Failed to get callback",
			})
			return
		}
		if input.Input.Input.Description != nil {
			if err = updateCallbackDescription(callback, *input.Input.Input.Description); err != nil {
				c.JSON(http.StatusOK, UpdateCallbackResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			}
		}
		if input.Input.Input.Active != nil {
			if err = updateCallbackActiveStatus(callback, *input.Input.Input.Active); err != nil {
				c.JSON(http.StatusOK, UpdateCallbackResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			}
		}
		if input.Input.Input.Locked != nil {
			if err = updateCallbackLock(callback, *operatorOperation, *input.Input.Input.Locked); err != nil {
				c.JSON(http.StatusOK, UpdateCallbackResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			}
		}
		if input.Input.Input.IPs != nil {
			if err = updateCallbackIPs(callback, *input.Input.Input.IPs); err != nil {
				logging.LogError(err, "failed to update callback IPs")
				c.JSON(http.StatusOK, UpdateCallbackResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			}
		}
		if input.Input.Input.TriggerOnCheckinAfterTime != nil {
			if err = updateCallbackTriggerOnCheckinAfterTime(callback, *input.Input.Input.TriggerOnCheckinAfterTime); err != nil {
				logging.LogError(err, "failed to update callback TriggerOnCheckinAfterTime")
				c.JSON(http.StatusOK, UpdateCallbackResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			}
		}
		if input.Input.Input.Host != nil {
			callback.Host = *input.Input.Input.Host
		}
		if input.Input.Input.User != nil {
			callback.User = *input.Input.Input.User
		}
		if input.Input.Input.OS != nil {
			callback.Os = *input.Input.Input.OS
		}
		if input.Input.Input.Architecture != nil {
			callback.Architecture = *input.Input.Input.Architecture
		}
		if input.Input.Input.ExtraInfo != nil {
			callback.ExtraInfo = *input.Input.Input.ExtraInfo
		}
		if input.Input.Input.SleepInfo != nil {
			callback.SleepInfo = *input.Input.Input.SleepInfo
		}
		if input.Input.Input.PID != nil {
			callback.PID = *input.Input.Input.PID
		}
		if input.Input.Input.ProcessName != nil {
			callback.ProcessName = *input.Input.Input.ProcessName
		}
		if input.Input.Input.IntegrityLevel != nil {
			callback.IntegrityLevel = *input.Input.Input.IntegrityLevel
		}
		if input.Input.Input.Domain != nil {
			callback.Domain = *input.Input.Input.Domain
		}
		if input.Input.Input.Dead != nil {
			callback.Dead = *input.Input.Input.Dead
		}
		if input.Input.Input.Color != nil {
			callback.Color = *input.Input.Input.Color
		}
		_, err = database.DB.NamedExec(`UPDATE callback SET 
				host=:host, "user"=:user, os=:os, architecture=:architecture, extra_info=:extra_info,
				sleep_info=:sleep_info, pid=:pid, process_name=:process_name, integrity_level=:integrity_level,
				"domain"=:domain, dead=:dead, color=:color WHERE id=:id`, callback)
		if err != nil {
			logging.LogError(err, "failed to update callback information")
			c.JSON(http.StatusOK, UpdateCallbackResponse{
				Status: "error",
				Error:  err.Error(),
			})
		}
	}

	c.JSON(http.StatusOK, UpdateCallbackResponse{
		Status: "success",
	})
	return
}

func updateCallbackDescription(callback databaseStructs.Callback, description string) error {
	if description == "" {
		// reset the description back to that of the backing payload
		payload := databaseStructs.Payload{}
		if err := database.DB.Get(&payload, `SELECT description FROM payload WHERE id=$1`, callback.RegisteredPayloadID); err != nil {
			logging.LogError(err, "Failed to get associated payload in updateCallbackDescription")
			return err
		} else {
			return updateCallbackDescriptionHelper(callback, payload.Description)
		}
	}
	// set the description to something new
	return updateCallbackDescriptionHelper(callback, description)
}

func updateCallbackDescriptionHelper(callback databaseStructs.Callback, description string) error {
	_, err := database.DB.Exec(`UPDATE callback SET description=$1 WHERE id=$2`, description, callback.ID)
	if err != nil {
		logging.LogError(err, "Failed to update callback description in updateCallbackDescriptionHelper")
	}
	return err
}

func updateCallbackLock(callback databaseStructs.Callback, operatorOperation databaseStructs.Operatoroperation, lockStatus bool) error {
	if callback.Locked != lockStatus {
		if lockStatus {
			logging.LogInfo("updating info", "operator_id", operatorOperation.CurrentOperator.ID, "callback", callback.ID)
			// we're not locked and want to lock it
			if _, err := database.DB.Exec(`UPDATE callback SET locked=true, locked_operator_id=$1 WHERE id=$2`,
				operatorOperation.CurrentOperator.ID, callback.ID); err != nil {
				logging.LogError(err, "Failed to update callback lock state")
				return err
			} else {
				return nil
			}
		} else {
			// we are locked and want to unlock it
			// to unlock it we must either be the one that locked it or the admin for the operation
			if callback.LockedOperatorID.Int64 == int64(operatorOperation.CurrentOperator.ID) {
				// we locked it, so we can unlock it
				if _, err := database.DB.Exec(`UPDATE callback SET locked=false, locked_operator_id=NULL WHERE id=$1`, callback.ID); err != nil {
					logging.LogError(err, "Failed to unlock callback")
					return err
				} else {
					return nil
				}
			} else if operatorOperation.CurrentOperator.ID == operatorOperation.CurrentOperation.AdminID {
				if _, err := database.DB.Exec(`UPDATE callback SET locked=false, locked_operator_id=NULL WHERE id=$1`, callback.ID); err != nil {
					logging.LogError(err, "Failed to unlock callback")
					return err
				} else {
					return nil
				}
			} else if operatorOperation.CurrentOperator.Admin {
				if _, err := database.DB.Exec(`UPDATE callback SET locked=false, locked_operator_id=NULL WHERE id=$1`, callback.ID); err != nil {
					logging.LogError(err, "Failed to unlock callback")
					return err
				} else {
					return nil
				}
			} else {
				return errors.New("Cannot unlock callback. Must be operation lead or the operator that locked it")
			}
		}
	}
	// the status didn't change
	return nil
}

func updateCallbackActiveStatus(callback databaseStructs.Callback, active bool) error {
	// when making something inactive, mark all of its edges as dead
	// when making something active, just change the active status
	associatedC2Profiles := []databaseStructs.Callbackc2profiles{}
	if callback.LastCheckin.Unix() == time.UnixMicro(0).Unix() && !active {
		switch grpc.PushC2Server.CheckClientConnected(callback.ID) {
		case PushC2Connections.ConnectedOneToOne:
			go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Not hiding callback %d, it has an active PushC2 connection", callback.DisplayID),
				callback.OperationID, "", database.MESSAGE_LEVEL_INFO)
			return nil
		case PushC2Connections.ConnectedOneToMany:
			if !callback.Dead {
				go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Callback %d uses a PushC2OneToMany connection, it might not be dead, but won't check in.", callback.DisplayID),
					callback.OperationID, "", database.MESSAGE_LEVEL_INFO)
			}
		default:
		}
	}
	err := database.DB.Select(&associatedC2Profiles, `SELECT
    	c2profile.id "c2profile.id",
    	c2profile.name "c2profile.name"
    	FROM callbackc2profiles
    	JOIN c2profile on callbackc2profiles.c2_profile_id = c2profile.id
    	WHERE callback_id=$1 AND c2profile.is_p2p=false`, callback.ID)
	if err != nil {
		logging.LogError(err, "Failed to fetch associated callbacks with c2 profile")
		return nil
	}
	for _, c2profile := range associatedC2Profiles {
		if callback.Active && !active {
			if err := rabbitmq.RemoveEdgeByIds(callback.ID, callback.ID, c2profile.C2Profile.Name); err != nil {
				logging.LogError(err, "Failed to update callback edge status")
				return err
			}
		} else if !callback.Active && active {
			if err := rabbitmq.AddEdgeById(callback.ID, callback.ID, c2profile.C2Profile.Name); err != nil {
				logging.LogError(err, "Failed to update callback edge status")
				return err
			}
		}
	}
	if callback.Active && !active {
		if _, err := database.DB.Exec(`UPDATE callback SET active=false, dead=true WHERE id=$1`, callback.ID); err != nil {
			logging.LogError(err, "Failed to update callback active status to false")
			return err
		} else {
			rabbitmq.MarkCallbackInfoInactive(callback.ID)
		}
	} else if !callback.Active && active {
		if _, err := database.DB.Exec(`UPDATE callback SET active=true, dead=false WHERE id=$1`, callback.ID); err != nil {
			logging.LogError(err, "Failed to update callback active status to true")
			return err
		}
	}
	return nil
}

func updateCallbackIPs(callback databaseStructs.Callback, newIPs []string) error {
	//logging.LogDebug("Updating new callback information", "ips", newIPs)
	if len(newIPs) == 0 {
		if _, err := database.DB.Exec(`UPDATE callback SET ip=$1 WHERE id=$2`, "[]", callback.ID); err != nil {
			logging.LogError(err, "Failed to update callback ip string to empty array")
			return err
		} else {
			return nil
		}
	}
	ipsbytes, err := json.Marshal(newIPs)
	if err != nil {
		logging.LogError(err, "Failed to marshal new IP array")
		return err
	}
	_, err = database.DB.Exec(`UPDATE callback SET ip=$1 WHERE id=$2`, string(ipsbytes), callback.ID)
	if err != nil {
		logging.LogError(err, "Failed to update callback ip string")
		return err
	}
	return nil
}

func updateCallbackTriggerOnCheckinAfterTime(callback databaseStructs.Callback, triggerOnCheckinAfterTime int) error {
	newTriggerTime := 0
	if triggerOnCheckinAfterTime > 0 {
		newTriggerTime = triggerOnCheckinAfterTime
	}
	callback.TriggerOnCheckinAfterTime = newTriggerTime
	_, err := database.DB.NamedExec(`UPDATE callback SET 
				trigger_on_checkin_after_time=:trigger_on_checkin_after_time 
                WHERE id=:id`, callback)
	if err != nil {
		return err
	}
	rabbitmq.UpdateCallbackInfoTriggerOnCheckin(callback.ID, newTriggerTime)
	return nil
}
