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
			name: "Valid bearer Claim",
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
			name: "Bad bearer claim format",
			args: args{
				header: map[string][]string{
					"Authorization": {"Bearer " + "invalid_preffix" + access_token},
				},
			},
			want:    nil,
			wantErr: true,
		},
		{
			name: "Valid apitoken Claim",
			args: args{
				header: map[string][]string{
					"Apitoken": {access_token}, // "Apitoken" and not "apitoken" here because Go uses the canonical form (first letter of the word and after hyphens as uppercase)
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
			name: "Empty apitoken",
			args: args{
				header: map[string][]string{
					"Apitoken": {""},
				},
			},
			want:    nil,
			wantErr: true,
		},
		{
			name: "No auth",
			args: args{
				header: map[string][]string{},
			},
			want:    nil,
			wantErr: true,
		},
		{
			name: "Both token bad",
			args: args{
				header: map[string][]string{
					"Apitoken":      {"badtoken"},
					"Authorization": {"Bearer bad"},
				},
			},
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		tt := tt // shadowing
		t.Run(tt.name, func(t *testing.T) {
			// t.Parallel()
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

func TestRefreshJWT(t *testing.T) {
	type args struct {
		access_token  string
		refresh_token string
	}
	userID := 42
	user := databaseStructs.Operator{ID: userID}
	access_token, refresh_token, _, _ := GenerateJWT(user, AUTH_METHOD_USER)

	tests := []struct {
		name                     string
		args                     args
		new_access_token_min_len int
		new_refresh_token_len    int
		user                     int
		wantErr                  bool
	}{
		{
			name: "refresh valid token",
			args: args{
				access_token:  access_token,
				refresh_token: refresh_token,
			},
			new_access_token_min_len: 30,
			new_refresh_token_len:    20,
			user:                     userID,
			wantErr:                  false,
		},
		{
			name: "refresh unknown token",
			args: args{
				access_token:  "invalidToken",
				refresh_token: refresh_token,
			},
			wantErr: true,
		},
		{
			name: "empty access token",
			args: args{
				access_token:  "",
				refresh_token: refresh_token,
			},
			wantErr: true,
		},
		{
			name: "empty refresh token",
			args: args{
				access_token:  access_token,
				refresh_token: "",
			},
			wantErr: true,
		},
		{
			name: "invalid refresh token",
			args: args{
				access_token:  access_token,
				refresh_token: "invalid_token",
			},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			access_token, refresh_token, user, err := RefreshJWT(tt.args.access_token, tt.args.refresh_token)
			if (err != nil) != tt.wantErr {
				t.Errorf("RefreshJWT() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if len(access_token) < tt.new_access_token_min_len {
				t.Errorf("RefreshJWT() len(access_token) = %v, want %v", len(access_token), tt.new_access_token_min_len)
			}
			if len(refresh_token) != tt.new_refresh_token_len {
				t.Errorf("RefreshJWT() len(refresh_token) = %v, want %v", len(refresh_token), tt.new_refresh_token_len)
			}
			if user != tt.user {
				t.Errorf("RefreshJWT() user = %v, want %v", user, tt.user)
			}
		})
	}
}
