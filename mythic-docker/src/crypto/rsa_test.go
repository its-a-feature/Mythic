package mythicCrypto

import (
	"os"
	"reflect"
	"testing"
)

func TestRsaEncryptBytes(t *testing.T) {
	t.Parallel()
	type args struct {
		plainBytes []byte
		publicKey  string
	}

	tests := []struct {
		name    string
		args    args
		wantLen int
		wantErr bool
	}{
		{
			name: "test RSA 4096 key success",
			args: args{
				plainBytes: []byte("test"),
				publicKey:  "./testdata/test_key.pub",
			},
			wantLen: 512,
			wantErr: false,
		},
		{
			name: "test key failure",
			args: args{
				plainBytes: []byte("test"),
				publicKey:  "./testdata/invalid.pub",
			},
			wantLen: 0,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		// shadowing tt to avoid races
		// see https://gist.github.com/posener/92a55c4cd441fc5e5e85f27bca008721
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			pubPem, _ := os.ReadFile(tt.args.publicKey)
			got, err := RsaEncryptBytes(tt.args.plainBytes, pubPem)
			if (err != nil) != tt.wantErr {
				t.Errorf("RsaEncryptBytes() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(len(got), tt.wantLen) {
				t.Errorf("RsaEncryptBytes() = \n%v\n, want \n%v\n", len(got), tt.wantLen)
			}
		})
	}
}
