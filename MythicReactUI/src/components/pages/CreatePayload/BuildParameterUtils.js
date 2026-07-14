const HideConditionOperandEQ = "eq";
const HideConditionOperandNotEQ = "neq";
const HideConditionOperandIN = "in";
const HideConditionOperandNotIN = "nin";
const HideConditionOperandLessThan = "lt";
const HideConditionOperandGreaterThan = "gt";
const HideConditionOperandLessThanOrEqual = "lte";
const HideConditionOperandGreaterThanOrEqual = "gte";
const HideConditionOperationStartsWith = "sw";
const HideConditionOperationEndsWith = "ew";
const HideConditionOperationContains = "co";
const HideConditionOperationNotContains = "nco";

export const sortByUiPositionThenName = (a, b) => {
    if(a.ui_position === b.ui_position){
        return -b.name.localeCompare(a.name);
    }else if(a.ui_position < b.ui_position){
        return -1;
    }else if(a.ui_position > b.ui_position){
        return 1;
    }
    return 0;
};

// The picker and final build submission both use this function so wrapper
// conditions are evaluated with the exact set of visible build parameters.
export const GetGroupedParameters = ({buildParameters, os, c2_name}) => {
    const parameters = [...(buildParameters || [])];
    const hasExplicitGroups = parameters.some(cur => cur?.group_name !== undefined && cur?.group_name !== "");
    const getGroupName = (param) => {
        if(param?.group_name !== undefined && param.group_name !== ""){
            return param.group_name;
        }
        return hasExplicitGroups ? "" : (c2_name || "");
    };
    const groups = parameters.reduce((previous, current) => {
        const groupName = getGroupName(current);
        return previous.includes(groupName) ? previous : [...previous, groupName];
    }, []);
    const groupedData = groups.map(name => ({name, parameters: []}));
    parameters.sort(sortByUiPositionThenName);

    for(const parameter of parameters){
        const group = groupedData.find(candidate => candidate.name === getGroupName(parameter));
        if(group === undefined){
            continue;
        }
        let shouldHide = false;
        if(os && (parameter?.supported_os?.length || 0) > 0 && !parameter.supported_os.includes(os)){
            shouldHide = true;
        }
        for(const condition of parameter?.hide_conditions || []){
            const comparedParameter = parameters.find(candidate => candidate.name === condition.name);
            if(comparedParameter === undefined){
                continue;
            }
            switch(condition.operand){
                case HideConditionOperandEQ:
                    shouldHide = String(condition.value) === String(comparedParameter.value);
                    break;
                case HideConditionOperandNotEQ:
                    shouldHide = String(condition.value) !== String(comparedParameter.value);
                    break;
                case HideConditionOperandIN:
                    shouldHide = condition.choices.includes(comparedParameter.value);
                    break;
                case HideConditionOperandNotIN:
                    shouldHide = !condition.choices.includes(comparedParameter.value);
                    break;
                case HideConditionOperandLessThan:
                    shouldHide = parseInt(comparedParameter.value) < parseInt(condition.value);
                    break;
                case HideConditionOperandLessThanOrEqual:
                    shouldHide = parseInt(comparedParameter.value) <= parseInt(condition.value);
                    break;
                case HideConditionOperandGreaterThan:
                    shouldHide = parseInt(comparedParameter.value) > parseInt(condition.value);
                    break;
                case HideConditionOperandGreaterThanOrEqual:
                    shouldHide = parseInt(comparedParameter.value) >= parseInt(condition.value);
                    break;
                case HideConditionOperationStartsWith:
                    shouldHide = String(comparedParameter.value).startsWith(String(condition.value));
                    break;
                case HideConditionOperationEndsWith:
                    shouldHide = String(comparedParameter.value).endsWith(String(condition.value));
                    break;
                case HideConditionOperationContains:
                    shouldHide = String(comparedParameter.value).includes(String(condition.value));
                    break;
                case HideConditionOperationNotContains:
                    shouldHide = !String(comparedParameter.value).includes(String(condition.value));
                    break;
                default:
                    break;
            }
            if(shouldHide){
                break;
            }
        }
        if(!shouldHide){
            group.parameters.push(parameter);
            group.parameters.sort(sortByUiPositionThenName);
        }
    }
    groupedData.sort(sortByUiPositionThenName);
    return groupedData;
};
