package webcontroller

import (
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
)

var ()

func GetUserIDFromGin(c *gin.Context) (int, error) {
	if customClaims, err := authentication.GetClaims(c); err != nil {
		return 0, err
	} else {
		return customClaims.UserID, nil
	}
}
