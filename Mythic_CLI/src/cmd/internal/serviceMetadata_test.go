package internal

import (
	"reflect"
	"testing"
)

func TestMythicReactNonDebugVolumes(t *testing.T) {
	tests := []struct {
		name            string
		useBuildContext bool
		useVolume       bool
		want            []string
	}{
		{
			name:            "published image uses baked UI",
			useBuildContext: false,
			useVolume:       false,
			want: []string{
				"./mythic-react-docker/config:/etc/nginx",
			},
		},
		{
			name:            "local image mounts build_ui output",
			useBuildContext: true,
			useVolume:       false,
			want: []string{
				"./mythic-react-docker/config:/etc/nginx",
				"./mythic-react-docker/mythic/public:/mythic/new",
			},
		},
		{
			name:            "named volumes remain unchanged",
			useBuildContext: false,
			useVolume:       true,
			want: []string{
				"mythic_react_volume_config:/etc/nginx",
				"mythic_react_volume_public:/mythic/new",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := mythicReactNonDebugVolumes(tt.useBuildContext, tt.useVolume)
			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("mythicReactNonDebugVolumes() = %v, want %v", got, tt.want)
			}
		})
	}
}
