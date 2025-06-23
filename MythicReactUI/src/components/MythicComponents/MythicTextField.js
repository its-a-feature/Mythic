import React from 'react';
import { styled } from '@mui/material/styles';
import {TextField} from '@mui/material';
import {useDebounce} from "../utilities/useDebounce";
const PREFIX = 'MythicTextField';

const classes = {
    root: `${PREFIX}Div-root`,
    textFieldRoot: `${PREFIX}-root`
};

const Root = styled('div')(({theme}) => ({
      [`&.${classes.root}`]: {

      },
}));

const ValidationTextField = styled(TextField)(({theme}) => ({
    [`&.${classes.textFieldRoot}`]: {
        '& fieldset': {
            borderColor: 'grey',
            borderWidth: 1,
        },
        '& input:invalid + fieldset': {
            borderColor: 'red',
            borderWidth: 2,
        },
        '& input:valid:focus + fieldset': {
            borderLeftWidth: 6,
            padding: '4px !important', // override inline-style
        },
        '& textarea:focus + textarea + fieldset': {
            borderLeftWidth: 6,
            //padding: '4px !important', // override inline-style
        },
    },
}));

const MythicTextField = ({
                             placeholder,
                             name,
                             validate,
                             width,
                             onChange,
                             requiredValue=false,
                             type = "text",
                             onEnter,
                             autoFocus,
                             autoComplete=false,
                             showLabel = true,
                             variant = "outlined",
                             inline,
                             marginBottom = "5px",
                             value,
                             disabled = false,
                             marginTop = "5px",
                             InputProps = {},
                             inputLabelProps  = {},
                             multiline = false,
                             maxRows = 10,
                             errorText = "",
                             helperText = "",
                            debounceDelay = 100,
                         }) => {
    const [localValue, setLocalValue] = React.useState({value: value, event: null});
    const [localError, setLocalError] = React.useState(false);
    const debouncedLocalInput = useDebounce(localValue, debounceDelay);
    React.useEffect( () => {
        const error = validate ? validate(debouncedLocalInput.value) : false;
        onChange(name, debouncedLocalInput.value, error, debouncedLocalInput.event);
    }, [debouncedLocalInput]);
    React.useEffect( () => {
        setLocalValue({value: value, event: null});
    }, [value]);
    const handleChange = (evt) => {
        const newValue = evt.target.value;
        // Update local state immediately for responsive UI
        setLocalValue({value: newValue, event: evt});
        setLocalError(validate ? validate(newValue) : false);
    };
    const onKeyPress = (event) => {
      if(event.key === "Enter") {
          if(event.shiftKey){
              handleChange(event);
              return;
          }
          if (onEnter !== undefined) {
              event.stopPropagation();
              event.preventDefault();
              onEnter(event);
          }
      }else{
          handleChange(event);
      }
    }

    return (
        <Root style={{width:  width ? width + "rem" : "100%", display: inline ? "inline-block": "",}}>
            <ValidationTextField
                fullWidth={true}
                placeholder={placeholder}
                value={localValue.value}
                onChange={handleChange}
                color={"secondary"}
                onKeyDown={onKeyPress}
                label={showLabel ? name : undefined}
                autoFocus={autoFocus}
                variant={variant}
                data-lpignore={true}
                autoComplete={autoComplete === undefined ? "new-password" : (autoComplete ? "on" : "off")}
                disabled={disabled}
                required={requiredValue}
                InputLabelProps={inputLabelProps}
                multiline={multiline}
                maxRows={maxRows}
                error={localError}
                type={type}
                onWheel={ event => event.target.blur() }
                InputProps={{...InputProps, spellCheck: false}}
                helperText={localError ? errorText : helperText}
                style={{
                    padding:0,
                    marginBottom: marginBottom ? marginBottom : "5px",
                    marginTop: marginTop ? marginTop: "5px",
                    display: inline ? "inline-block": "",
                }}
                classes={{
                    root: classes.textFieldRoot
                }} />
        </Root>
    );
}
export default MythicTextField;
