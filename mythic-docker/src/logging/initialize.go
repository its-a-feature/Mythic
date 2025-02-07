package logging

import (
	"os"
	"runtime"
	"time"

	"github.com/its-a-feature/Mythic/utils"
	"github.com/rs/zerolog"
)

var (
	logger zerolog.Logger
)

/*
zerolog allows for logging at the following levels (from highest to lowest):

panic (zerolog.PanicLevel, 5)
fatal (zerolog.FatalLevel, 4)
error (zerolog.ErrorLevel, 3)
warn (zerolog.WarnLevel, 2)
info (zerolog.InfoLevel, 1)
debug (zerolog.DebugLevel, 0)
trace (zerolog.TraceLevel, -1)
*/

func Initialize() {
	var zl zerolog.Logger
	switch utils.MythicConfig.DebugLevel {
	case "warning":
		zl = zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "info":
		zl = zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "debug":
		zl = zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "trace":
		zl = zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})
		zerolog.SetGlobalLevel(zerolog.TraceLevel)
	default:
		zl = zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	zl = zl.With().Timestamp().Logger()
	logger = zl
	logger.Info().Msg("Logging Initialized")
}

func LogFatalError(err error, message string, messages ...interface{}) {
	if pc, _, line, ok := runtime.Caller(1); ok {
		if err == nil {
			logger.Error().Fields(messages).Msg(message)
			//logger.Error(errors.New(message), "", messages...)
		} else {
			logger.Error().Err(err).Fields(append([]interface{}{"func", runtime.FuncForPC(pc).Name(), "line", line}, messages...)).Msg(message)
			//logger.Error(err, message, append([]interface{}{"func", runtime.FuncForPC(pc).Name(), "line", line}, messages...)...)
		}
	} else {
		if err == nil {
			logger.Error().Fields(messages).Msg(message)
			//logger.Error(errors.New(message), "", messages...)
		} else {
			logger.Error().Err(err).Fields(messages).Msg(message)
			//logger.Error(err, message, messages...)
		}
	}
	os.Exit(1)
}

func LogTrace(message string, messages ...interface{}) {
	if pc, _, line, ok := runtime.Caller(1); ok {
		logger.Trace().Fields(append([]interface{}{"func", runtime.FuncForPC(pc).Name(), "line", line}, messages...)).Msg(message)
		//logger.V(2).Info(message, append([]interface{}{"func", runtime.FuncForPC(pc).Name(), "line", line}, messages...)...)
	} else {
		logger.Trace().Fields(messages).Msg(message)
		//logger.V(2).Info(message, messages...)
	}
}

func LogDebug(message string, messages ...interface{}) {
	if pc, _, line, ok := runtime.Caller(1); ok {
		logger.Debug().Fields(append([]interface{}{"func", runtime.FuncForPC(pc).Name(), "line", line}, messages...)).Msg(message)
		//logger.V(1).Info(message, append([]interface{}{"func", runtime.FuncForPC(pc).Name(), "line", line}, messages...)...)
	} else {
		logger.Debug().Fields(messages).Msg(message)
		//logger.V(1).Info(message, messages...)
	}
}

func LogInfo(message string, messages ...interface{}) {
	if pc, _, line, ok := runtime.Caller(1); ok {
		logger.Info().Fields(append([]interface{}{"func", runtime.FuncForPC(pc).Name(), "line", line}, messages...)).Msg(message)
		//logger.V(0).Info(message, append([]interface{}{"func", runtime.FuncForPC(pc).Name(), "line", line}, messages...)...)
	} else {
		logger.Info().Fields(messages).Msg(message)
		//logger.V(0).Info(message, messages...)
	}
}

func LogWarning(message string, messages ...interface{}) {
	if pc, _, line, ok := runtime.Caller(1); ok {
		logger.Warn().Fields(append([]interface{}{"func", runtime.FuncForPC(pc).Name(), "line", line}, messages...)).Msg(message)
		//logger.V(1).Info(message, append([]interface{}{"func", runtime.FuncForPC(pc).Name(), "line", line}, messages...)...)
	} else {
		logger.Warn().Fields(messages).Msg(message)
		//logger.V(1).Info(message, messages...)
	}
}

func LogError(err error, message string, messages ...interface{}) {
	if pc, _, line, ok := runtime.Caller(1); ok {
		if err == nil {
			logger.Error().Fields(messages).Msg(message)
			//logger.Error(errors.New(message), "", messages...)
		} else {
			logger.Error().Err(err).Fields(append([]interface{}{"func", runtime.FuncForPC(pc).Name(), "line", line}, messages...)).Msg(message)
			//logger.Error(err, message, append([]interface{}{"func", runtime.FuncForPC(pc).Name(), "line", line}, messages...)...)
		}
	} else {
		if err == nil {
			logger.Error().Fields(messages).Msg(message)
			//logger.Error(errors.New(message), "", messages...)
		} else {
			logger.Error().Err(err).Fields(messages).Msg(message)
			//logger.Error(err, message, messages...)
		}
	}

}
