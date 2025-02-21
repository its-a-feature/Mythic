import React from 'react';
import { styled } from '@mui/material/styles';
import {TextField} from '@mui/material';
import {useDebounce} from "../utilities/useDebounce";
const PREFIX = 'MythicTextField';

const classes = {
    root: `${PREFIX}-root`
};

const Root = styled('div')({
      [`&.${classes.root}`]: {
        '& input:valid + fieldset': {
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
      },
    });

const ValidationTextField = TextField;

const MythicTextField = ({
                             placeholder,
                             name,
                             validate,
                             width,
                             onChange,
                             requiredValue,
                             type = "text",
                             onEnter,
                             autoFocus,
                             autoComplete,
                             showLabel,
                             variant = "outlined",
                             inline,
                             marginBottom = "5px",
                             value,
                             disabled = false,
                             marginTop = "0px",
                             InputProps = {},
                             inputLabelProps  = {},
                             multiline = false,
                             maxRows = 10,
                             errorText = "",
                             helperText = "",
                            debounceDelay = 100,
                         }) => {
    const [localValue, setLocalValue] = React.useState({value: value, event: null});
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
    };
    const checkError = () => {
        return validate ? validate(localValue.value) : false
    }
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
                label={showLabel === undefined ? name : showLabel ? name : undefined}
                autoFocus={autoFocus}
                variant={variant === undefined ? "outlined" : variant}
                data-lpignore={true}
                autoComplete={autoComplete === undefined ? "new-password" : (autoComplete ? "on" : "new-password")}
                disabled={disabled === undefined ? false : disabled}
                required={requiredValue ? requiredValue : false}
                InputLabelProps={inputLabelProps}
                multiline={multiline ? multiline : false}
                maxRows={maxRows}
                error={checkError()}
                type={type === undefined ? "text" : type}
                onWheel={ event => event.target.blur() }
                InputProps={{...InputProps, spellCheck: false}}
                helperText={checkError() ? errorText : helperText}
                style={{
                    padding:0,
                    marginBottom: marginBottom ? marginBottom : "5px",
                    marginTop: marginTop ? marginTop: "0px",
                    display: inline ? "inline-block": "",
                }}
                classes={{
                    root: classes.root
                }} />
        </Root>
    );
}
export default MythicTextField;
