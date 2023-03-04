package webcontroller

import (
	"encoding/json"
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
)

type UpdateCallbackInputInput struct {
	Input UpdateCallbackInput `json:"input" binding:"required"`
}

type UpdateCallbackInput struct {
	Input UpdateCallback `json:"input" binding:"required"`
}

type UpdateCallback struct {
	CallbackID  int       `json:"callback_id" binding:"required"`
	Active      *bool     `json:"active,omitempty"`
	Locked      *bool     `json:"locked,omitempty"`
	Description *string   `json:"description,omitempty"`
	IPs         *[]string `json:"ips,omitempty"`
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
	if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		c.JSON(http.StatusOK, UpdateCallbackResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	} else {
		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		callback := databaseStructs.Callback{}
		if err := database.DB.Get(&callback, `SELECT 
		id, active, description, locked, locked_operator_id, registered_payload_id, operation_id, ip
		FROM callback
		WHERE
		id=$1 and operation_id=$2`,
			input.Input.Input.CallbackID,
			operatorOperation.CurrentOperation.ID); err != nil {
			logging.LogError(err, "Failed to get callback")
			c.JSON(http.StatusOK, UpdateCallbackResponse{
				Status: "error",
				Error:  "Failed to get callback",
			})
			return
		} else if operatorOperation.CurrentOperation.ID != callback.OperationID {
			c.JSON(http.StatusOK, UpdateCallbackResponse{
				Status: "error",
				Error:  "Cannot update callback that's not in your current operation",
			})
			return
		} else {
			if input.Input.Input.Description != nil {
				if err := updateCallbackDescription(callback, *input.Input.Input.Description); err != nil {
					c.JSON(http.StatusOK, UpdateCallbackResponse{
						Status: "error",
						Error:  err.Error(),
					})
					return
				}
			}
			if input.Input.Input.Active != nil {
				if err := updateCallbackActiveStatus(callback, *input.Input.Input.Active); err != nil {
					c.JSON(http.StatusOK, UpdateCallbackResponse{
						Status: "error",
						Error:  err.Error(),
					})
					return
				}
			}
			if input.Input.Input.Locked != nil {
				if err := updateCallbackLock(callback, *operatorOperation, *input.Input.Input.Locked); err != nil {
					c.JSON(http.StatusOK, UpdateCallbackResponse{
						Status: "error",
						Error:  err.Error(),
					})
					return
				}
			}
			if input.Input.Input.IPs != nil {
				if err := updateCallbackIPs(callback, *input.Input.Input.IPs); err != nil {

				}
			}
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
	} else if description != "" {
		// set the description to something new
		return updateCallbackDescriptionHelper(callback, description)
	} else {
		return nil
	}
}

func updateCallbackDescriptionHelper(callback databaseStructs.Callback, description string) error {
	if _, err := database.DB.Exec(`UPDATE callback SET description=$1 WHERE id=$2`, description, callback.ID); err != nil {
		logging.LogError(err, "Failed to update callback description in updateCallbackDescriptionHelper")
		return err
	} else {
		return nil
	}
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
	if err := database.DB.Select(&associatedC2Profiles, `SELECT
    	c2profile.id "c2profile.id",
    	c2profile.name "c2profile.name"
    	FROM callbackc2profiles
    	JOIN c2profile on callbackc2profiles.c2_profile_id = c2profile.id
    	WHERE callback_id=$1 AND c2profile.is_p2p=false`, callback.ID); err != nil {
		logging.LogError(err, "Failed to fetch associated callbacks with c2 profile")
	} else {
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
			if _, err := database.DB.Exec(`UPDATE callback SET active=false WHERE id=$1`, callback.ID); err != nil {
				logging.LogError(err, "Failed to update callback active status to false")
				return err
			}
		} else if !callback.Active && active {
			if _, err := database.DB.Exec(`UPDATE callback SET active=true WHERE id=$1`, callback.ID); err != nil {
				logging.LogError(err, "Failed to update callback active status to true")
				return err
			}
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
	} else if ipsbytes, err := json.Marshal(newIPs); err != nil {
		logging.LogError(err, "Failed to marshal new IP array")
		return err
	} else if _, err := database.DB.Exec(`UPDATE callback SET ip=$1 WHERE id=$2`, string(ipsbytes), callback.ID); err != nil {
		logging.LogError(err, "Failed to update callback ip string")
		return err
	} else {
		return nil
	}
}
