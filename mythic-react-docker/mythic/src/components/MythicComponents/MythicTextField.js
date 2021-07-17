import React from 'react';
import PropTypes from 'prop-types';
import {TextField} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
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
        type: PropTypes.string
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
    render(){
        return (
            <div style={{width:  this.props.width ? this.props.width + "rem" : "100%"}}>
                <ValidationTextField 
                    fullWidth={true} 
                    placeholder={this.props.placeholder} 
                    value={this.props.value} 
                    onChange={this.onChange} 
                    label={this.props.name} 
                    variant="outlined" 
                    disabled={this.props.disabled === undefined ? false : this.props.disabled}
                    required={this.props.requiredValue ? this.props.requiredValue : false} 
                    InputLabelProps={this.props.inputLabelProps}
                    multiline={this.props.multiline ? this.props.multiline : false}
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
