package authentication

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

func TestTokenValid(t *testing.T) {
	t.Parallel()
	type args struct {
		header map[string][]string
	}
	gin.SetMode(gin.TestMode)

	user := databaseStructs.Operator{ID: 123, CurrentOperationID: sql.NullInt64{Int64: 9, Valid: true}}
	access_token, _, _, _ := mythicjwt.GenerateJWT(user, mythicjwt.AUTH_METHOD_USER, 0, 0)

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
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			req := &http.Request{
				Header: make(http.Header),
			}
			req.Header = tt.args.header
			c.Request = req
			// engine.Header["Authorization"] = tt.args.authHeader
			if _, err := GetClaims(c); (err != nil) != tt.wantErr {
				t.Errorf("GetClaims() error = %v, wantErr %v", err, tt.wantErr)
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

	user := databaseStructs.Operator{ID: 123, CurrentOperationID: sql.NullInt64{Int64: 9, Valid: true}}
	access_token, _, _, _ := mythicjwt.GenerateJWT(user, mythicjwt.AUTH_METHOD_USER, 0, 0)

	tests := []struct {
		name    string
		args    args
		want    *mythicjwt.CustomClaims
		wantErr bool
	}{
		{
			name: "Valid bearer Claim",
			args: args{
				header: map[string][]string{
					"Authorization": {"Bearer " + access_token},
				},
			},
			want: &mythicjwt.CustomClaims{
				UserID:      123,
				AuthMethod:  mythicjwt.AUTH_METHOD_USER,
				OperationID: 9,
				Scopes:      []string{mythicjwt.SCOPE_ALL},
				StandardClaims: jwt.StandardClaims{
					IssuedAt:  time.Now().Unix(),
					ExpiresAt: time.Now().Add(mythicjwt.JWTTimespan).UTC().Unix(),
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
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
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

func TestGetClaimsRabbitMQAuthContextDirectDownload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	fileUUID := "file-uuid-123"
	token, err := rabbitmq.GenerateRabbitMQAuthContextToken(rabbitmq.RabbitMQAuthContext{
		OperatorID:   7,
		OperationID:  9,
		APITokensID:  11,
		SourceScopes: []string{mythicjwt.SCOPE_FILE_READ},
		FileUUID:     fileUUID,
	})
	if err != nil {
		t.Fatalf("failed to create RabbitMQ auth context token: %v", err)
	}
	router := gin.New()
	var got *mythicjwt.CustomClaims
	var gotErr error
	router.GET("/direct/download/:file_uuid", func(c *gin.Context) {
		got, gotErr = GetClaims(c)
		c.Status(http.StatusNoContent)
	})
	req := httptest.NewRequest(http.MethodGet, "/direct/download/"+fileUUID, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	if gotErr != nil {
		t.Fatalf("GetClaims() error = %v", gotErr)
	}
	if got == nil {
		t.Fatalf("GetClaims() returned nil claims")
	}
	if got.UserID != 7 || got.OperationID != 9 || got.APITokensID != 11 || got.FileUUID != fileUUID {
		t.Fatalf("GetClaims() = %#v", got)
	}
	if !mythicjwt.AllowsScope(got.Scopes, mythicjwt.SCOPE_FILE_READ) {
		t.Fatalf("GetClaims() scopes = %#v, missing file.read", got.Scopes)
	}
}

func TestGetClaimsRabbitMQAuthContextDirectDownloadRejectsMismatch(t *testing.T) {
	gin.SetMode(gin.TestMode)
	token, err := rabbitmq.GenerateRabbitMQAuthContextToken(rabbitmq.RabbitMQAuthContext{
		OperatorID:   7,
		OperationID:  9,
		SourceScopes: []string{mythicjwt.SCOPE_FILE_READ},
		FileUUID:     "expected-file",
	})
	if err != nil {
		t.Fatalf("failed to create RabbitMQ auth context token: %v", err)
	}
	router := gin.New()
	var gotErr error
	router.GET("/direct/download/:file_uuid", func(c *gin.Context) {
		_, gotErr = GetClaims(c)
		c.Status(http.StatusNoContent)
	})
	req := httptest.NewRequest(http.MethodGet, "/direct/download/other-file", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	if gotErr == nil {
		t.Fatalf("GetClaims() expected file mismatch error")
	}
}

func TestGetClaimsRabbitMQAuthContextRejectsNonDownloadRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	token, err := rabbitmq.GenerateRabbitMQAuthContextToken(rabbitmq.RabbitMQAuthContext{
		OperatorID:   7,
		OperationID:  9,
		SourceScopes: []string{mythicjwt.SCOPE_FILE_READ},
		FileUUID:     "expected-file",
	})
	if err != nil {
		t.Fatalf("failed to create RabbitMQ auth context token: %v", err)
	}
	router := gin.New()
	var gotErr error
	router.GET("/not-download/:file_uuid", func(c *gin.Context) {
		_, gotErr = GetClaims(c)
		c.Status(http.StatusNoContent)
	})
	req := httptest.NewRequest(http.MethodGet, "/not-download/expected-file", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	if gotErr == nil {
		t.Fatalf("GetClaims() expected route mismatch error")
	}
}

func TestGetClaimsRabbitMQAuthContextRejectsInvalidatedToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	token, err := rabbitmq.GenerateRabbitMQAuthContextToken(rabbitmq.RabbitMQAuthContext{
		OperatorID:   7,
		OperationID:  9,
		SourceScopes: []string{mythicjwt.SCOPE_FILE_READ},
		FileUUID:     "expected-file",
	})
	if err != nil {
		t.Fatalf("failed to create RabbitMQ auth context token: %v", err)
	}
	rabbitmq.InvalidateRabbitMQAuthContextToken(token)
	router := gin.New()
	var gotErr error
	router.GET("/direct/download/:file_uuid", func(c *gin.Context) {
		_, gotErr = GetClaims(c)
		c.Status(http.StatusNoContent)
	})
	req := httptest.NewRequest(http.MethodGet, "/direct/download/expected-file", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	if gotErr == nil {
		t.Fatalf("GetClaims() expected invalidated token error")
	}
}

func TestRefreshJWT(t *testing.T) {
	type args struct {
		access_token  string
		refresh_token string
	}
	userID := 42
	user := databaseStructs.Operator{ID: userID, CurrentOperationID: sql.NullInt64{Int64: 9, Valid: true}}
	access_token, refresh_token, _, _ := mythicjwt.GenerateJWT(user, mythicjwt.AUTH_METHOD_USER, 0, 0)

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
			access_token, refresh_token, user, err := mythicjwt.RefreshJWT(tt.args.access_token, tt.args.refresh_token)
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
