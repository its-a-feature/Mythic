package eventing

import (
	"golang.org/x/exp/slices"
	"os"
	"testing"
)

func TestIngest(t *testing.T) {
	t.Parallel()
	type args struct {
		filePath string
	}

	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "test buildchain",
			args: args{
				filePath: "./testdata/buildchain.yaml",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		// shadowing tt to avoid races
		// see https://gist.github.com/posener/92a55c4cd441fc5e5e85f27bca008721
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			fileContents, _ := os.ReadFile(tt.args.filePath)
			_, err := Ingest(fileContents)
			if (err != nil) != tt.wantErr {
				t.Errorf("ingest() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}

func TestDependencies(t *testing.T) {
	t.Parallel()
	type args struct {
		filePath string
	}

	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "test buildchain",
			args: args{
				filePath: "./testdata/buildchain.yaml",
			},
			wantErr: false,
		},

		{
			name: "test buildchain cyclic",
			args: args{
				filePath: "./testdata/buildchain_cyclic.yaml",
			},
			wantErr: true,
		},

		{
			name: "test large actions",
			args: args{
				filePath: "./testdata/large_actions.yaml",
			},
			wantErr: false,
		},

		{
			name: "test buildchain unknown dep",
			args: args{
				filePath: "./testdata/buildchain_invaliddep.yaml",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		// shadowing tt to avoid races
		// see https://gist.github.com/posener/92a55c4cd441fc5e5e85f27bca008721
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			fileContents, _ := os.ReadFile(tt.args.filePath)
			got, err := Ingest(fileContents)
			if err != nil {
				t.Errorf("ingest() error = %v", err)
				return
			}
			err = ResolveDependencies(&got)
			//for _, s := range got.Steps {
			//t.Logf("%s: step: %s, order: %d", tt.name, s.Name, s.Order)
			//}
			//t.Logf("parsed results: %v", got)
			if (err != nil) != tt.wantErr {
				t.Errorf("resolveDependencies() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}

func TestValidActions(t *testing.T) {
	t.Parallel()
	type args struct {
		filePath string
	}

	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "test buildchain",
			args: args{
				filePath: "./testdata/buildchain.yaml",
			},
			wantErr: false,
		},

		{
			name: "test buildchain invalid actions",
			args: args{
				filePath: "./testdata/buildchain_invalid_action.yaml",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		// shadowing tt to avoid races
		// see https://gist.github.com/posener/92a55c4cd441fc5e5e85f27bca008721
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			fileContents, _ := os.ReadFile(tt.args.filePath)
			got, err := Ingest(fileContents)
			if err != nil {
				t.Errorf("ingest() error = %v", err)
				return
			}
			err = EnsureActions(&got)
			//t.Logf("parsed results: %v", got)
			if (err != nil) != tt.wantErr {
				t.Errorf("ensureActions() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}

func TestValidTrigger(t *testing.T) {
	t.Parallel()
	type args struct {
		filePath string
	}

	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "test buildchain",
			args: args{
				filePath: "./testdata/buildchain.yaml",
			},
			wantErr: false,
		},

		{
			name: "test buildchain invalid trigger",
			args: args{
				filePath: "./testdata/buildchain_invalid_action.yaml",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		// shadowing tt to avoid races
		// see https://gist.github.com/posener/92a55c4cd441fc5e5e85f27bca008721
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			fileContents, _ := os.ReadFile(tt.args.filePath)
			got, err := Ingest(fileContents)
			if err != nil {
				t.Errorf("ingest() error = %v", err)
				return
			}
			err = EnsureTrigger(&got, true)
			//t.Logf("parsed results: %v", got)
			if (err != nil) != tt.wantErr {
				t.Errorf("ensureTrigger() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}

func TestValidOrder(t *testing.T) {
	t.Parallel()
	type args struct {
		filePath string
	}

	tests := []struct {
		name   string
		args   args
		orders []int
	}{
		{
			name: "test buildchain",
			args: args{
				filePath: "./testdata/buildchain.yaml",
			},
			orders: []int{0, 1},
		},

		{
			name: "test larger order",
			args: args{
				filePath: "./testdata/large_actions.yaml",
			},
			orders: []int{0, 1, 2},
		},
	}

	for _, tt := range tests {
		// shadowing tt to avoid races
		// see https://gist.github.com/posener/92a55c4cd441fc5e5e85f27bca008721
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			fileContents, _ := os.ReadFile(tt.args.filePath)
			got, err := Ingest(fileContents)
			if err != nil {
				t.Errorf("ingest() error = %v", err)
				return
			}
			err = ResolveDependencies(&got)
			//t.Logf("parsed results: %v", got)
			if err != nil {
				t.Errorf("ResolveDependencies() error = %v", err)
				return
			}
			for i, _ := range got.Steps {
				if !slices.Contains(tt.orders, got.Steps[i].Order) {
					t.Errorf("Bad order detected: %d with step %s", got.Steps[i].Order, got.Steps[i].Name)
					for j, _ := range got.Steps {
						t.Errorf("Step: %s, Order: %d", got.Steps[j].Name, got.Steps[j].Order)
					}
					return
				}
			}
		})
	}
}
