import React from 'react';
import PropTypes from 'prop-types';
import {TextField} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
const ValidationTextField = withStyles({
      root: {
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
    })(TextField);

class MythicTextField extends React.Component {
    
    static propTypes = {
        placeholder: PropTypes.string,
        name: PropTypes.string,
        validate: PropTypes.func,
        width: PropTypes.number,
        onChange: PropTypes.func.isRequired,
        requiredValue: PropTypes.bool,
        type: PropTypes.string,
        onEnter: PropTypes.func,
        autoFocus: PropTypes.bool,
        autoComplete: PropTypes.bool,
        showLabel: PropTypes.bool
    }
    onChange = evt => {
        const name = this.props.name;
        const value = evt.target.value;
        const error = this.props.validate ? this.props.validate(value) : false;
        this.props.onChange(name, value, error);
    }
    checkError = () => {
        return this.props.validate ? this.props.validate(this.props.value) : false
    }
    onKeyPress = (event) => {
      if(event.key === "Enter"){
        if(this.props.onEnter !== undefined){
          this.props.onEnter(event);
        }
      }else{
        this.onChange(event);
      }
    }
    render(){
        return (
            <div style={{width:  this.props.width ? this.props.width + "rem" : "100%"}}>
                <ValidationTextField 
                    fullWidth={true} 
                    placeholder={this.props.placeholder} 
                    value={this.props.value} 
                    onChange={this.onChange}
                    onKeyPress={this.onKeyPress} 
                    label={this.props.showLabel === undefined ? this.props.name : this.props.showLabel ? this.props.name : undefined} 
                    autoFocus={this.props.autoFocus ? true : false}
                    variant="outlined" 
                    data-lpignore={true}
                    autoComplete={this.props.autoComplete === undefined ? "off" : (this.props.autoComplete ? "on" : "off")}
                    disabled={this.props.disabled === undefined ? false : this.props.disabled}
                    required={this.props.requiredValue ? this.props.requiredValue : false} 
                    InputLabelProps={this.props.inputLabelProps}
                    multiline={this.props.multiline ? this.props.multiline : false}
                    maxRows={this.props.maxRows}
                    error={this.checkError()} 
                    type={this.props.type === undefined ? "text" : this.props.type}
                    InputProps={this.props.InputProps}
                    helperText={this.checkError() ? this.props.errorText : this.props.helperText}
                    style={{
                        padding:0,
                        marginBottom: this.props.marginBottom ? this.props.marginBottom : "10px"
                    }}/>
            </div>
        )
    }
}
export default MythicTextField;
