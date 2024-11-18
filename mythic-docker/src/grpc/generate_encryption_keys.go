package grpc

import (
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/grpc/services"
	"github.com/its-a-feature/Mythic/logging"
	"io"
	"time"
)

func (t *translationContainerServer) GenerateEncryptionKeys(stream services.TranslationContainer_GenerateEncryptionKeysServer) error {
	clientName := ""
	// initially wait for a request from the other side with blank data to indicate who is talking to us
	initial, err := stream.Recv()
	if err == io.EOF {
		logging.LogDebug("Client closed before ever sending anything, err is EOF")
		return nil // the client closed before ever sending anything
	}
	if err != nil {
		logging.LogError(err, "Client ran into an error before sending anything")
		return err
	}
	clientName = initial.GetTranslationContainerName()
	getMessageToSend, sendBackMessageResponse, err := t.addNewGenerateKeysClient(clientName)
	if err != nil {
		logging.LogError(err, "Failed to add new channels to listen for connection")
		return err
	}
	logging.LogDebug("Got translation container name from remote connection", "name", clientName)
	for {
		select {
		case <-stream.Context().Done():
			logging.LogError(stream.Context().Err(), fmt.Sprintf("client disconnected: %s", clientName))
			t.SetGenerateKeysChannelExited(clientName)
			return errors.New(fmt.Sprintf("client disconnected: %s", clientName))
		case msgToSend, ok := <-getMessageToSend:
			if !ok {
				logging.LogError(nil, "got !ok from messageToSend, channel was closed")
				t.SetGenerateKeysChannelExited(clientName)
				return nil
			}
			err = stream.Send(&msgToSend)
			if err != nil {
				logging.LogError(err, "Failed to send message through stream to translation container")
				select {
				case sendBackMessageResponse <- services.TrGenerateEncryptionKeysMessageResponse{
					Success:                  false,
					Error:                    err.Error(),
					TranslationContainerName: clientName,
				}:
				case <-time.After(t.GetChannelTimeout()):
					logging.LogError(errors.New("timeout sending to channel"), "gRPC stream connection needs to exit due to timeouts")
				}
				t.SetGenerateKeysChannelExited(clientName)
				return err
			}
			resp, err := stream.Recv()
			if err == io.EOF {
				// cleanup the connection channels first before returning
				logging.LogError(err, "connection closed in stream.Rev after sending message")
				select {
				case sendBackMessageResponse <- services.TrGenerateEncryptionKeysMessageResponse{
					Success:                  false,
					Error:                    err.Error(),
					TranslationContainerName: clientName,
				}:
				case <-time.After(t.GetChannelTimeout()):
					logging.LogError(errors.New("timeout sending to channel"), "gRPC stream connection needs to exit due to timeouts")
				}
				t.SetGenerateKeysChannelExited(clientName)
				return nil
			}
			if err != nil {
				// cleanup the connection channels first before returning
				logging.LogError(err, "Failed to read from translation container")
				select {
				case sendBackMessageResponse <- services.TrGenerateEncryptionKeysMessageResponse{
					Success:                  false,
					Error:                    err.Error(),
					TranslationContainerName: clientName,
				}:
				case <-time.After(t.GetChannelTimeout()):
					logging.LogError(errors.New("timeout sending to channel"), "gRPC stream connection needs to exit due to timeouts")
				}
				t.SetGenerateKeysChannelExited(clientName)
				return err
			}
			select {
			case sendBackMessageResponse <- *resp:
			case <-time.After(t.GetChannelTimeout()):
				logging.LogError(errors.New("timeout sending to channel"), "gRPC stream connection needs to exit due to timeouts")
				t.SetGenerateKeysChannelExited(clientName)
				return err
			}
		}
	}
}
