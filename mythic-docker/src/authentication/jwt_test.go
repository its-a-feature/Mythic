package authentication

import (
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

func TestTokenValid(t *testing.T) {
	t.Parallel()
	type args struct {
		header map[string][]string
	}
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	user := databaseStructs.Operator{ID: 123}
	access_token, _, _, _ := GenerateJWT(user, AUTH_METHOD_USER)

	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "Missing Auth Header",
			args: args{
				header: map[string][]string{},
			},
			wantErr: true,
		},
		{
			name: "Valid token",
			args: args{
				header: map[string][]string{
					"Authorization": {"Bearer " + access_token},
				},
			},
			wantErr: false,
		},
		{
			name: "Invalid bearer",
			args: args{
				header: map[string][]string{
					"Authorization": {"Bearer invalid bearer"},
				},
			},
			wantErr: true,
		},
		{
			name: "Bearer too short",
			args: args{
				header: map[string][]string{
					"Authorization": {"Bearer tooshort"},
				},
			},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		tt := tt // shadowing
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			req := &http.Request{
				Header: make(http.Header),
			}
			req.Header = tt.args.header
			c.Request = req
			// engine.Header["Authorization"] = tt.args.authHeader
			if err := TokenValid(c); (err != nil) != tt.wantErr {
				t.Errorf("TokenValid() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestGetClaims(t *testing.T) {
	t.Parallel()
	type args struct {
		header map[string][]string
	}
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	user := databaseStructs.Operator{ID: 123}
	access_token, _, _, _ := GenerateJWT(user, AUTH_METHOD_USER)

	tests := []struct {
		name    string
		args    args
		want    *CustomClaims
		wantErr bool
	}{
		{
			name: "Valid Claim",
			args: args{
				header: map[string][]string{
					"Authorization": {"Bearer " + access_token},
				},
			},
			want: &CustomClaims{
				UserID:     123,
				AuthMethod: AUTH_METHOD_USER,
				StandardClaims: jwt.StandardClaims{
					IssuedAt:  time.Now().Unix(),
					ExpiresAt: time.Now().Add(JWTTimespan).UTC().Unix(),
				},
			},
			wantErr: false,
		},
		{
			name: "Bad claim format",
			args: args{
				header: map[string][]string{
					"Authorization": {"Bearer " + "invalid_preffix" + access_token},
				},
			},
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		tt := tt // shadowing
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			req := &http.Request{
				Header: make(http.Header),
			}
			req.Header = tt.args.header
			c.Request = req
			got, err := GetClaims(c)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetClaims() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("GetClaims() = %v, want %v", got, tt.want)
			}
		})
	}
}
