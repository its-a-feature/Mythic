export const mergeRefreshedUser = (currentUser = {}, refreshedUser = {}) => {
  const currentOperation = refreshedUser.current_operation ?? refreshedUser.current_operation_name;
  return {
    ...currentUser,
    ...refreshedUser,
    ...(currentOperation !== undefined ? {current_operation: currentOperation} : {}),
  };
};

export const syncCurrentOperationUser = (currentUser, operator) => {
  if(!currentUser || !operator || operator.current_operation_id === undefined){
    return {changed: false, operationIDChanged: false, user: currentUser};
  }

  const currentOperationID = operator.current_operation_id ?? 0;
  const operationIDChanged = currentUser.current_operation_id !== currentOperationID;
  const operation = operator.operation;
  const operationUpdates = operation ? {
    current_operation: operation.name,
    current_operation_complete: operation.complete,
    current_operation_banner_text: operation.banner_text,
    current_operation_banner_color: operation.banner_color,
  } : currentOperationID === 0 ? {
    current_operation: "",
    current_operation_complete: false,
    current_operation_banner_text: "",
    current_operation_banner_color: "",
  } : {};
  const metadataChanged = Object.entries(operationUpdates).some(
    ([key, value]) => currentUser[key] !== value,
  );

  if(!operationIDChanged && !metadataChanged){
    return {changed: false, operationIDChanged: false, user: currentUser};
  }
  return {
    changed: true,
    operationIDChanged,
    user: {
      ...currentUser,
      current_operation_id: currentOperationID,
      ...operationUpdates,
    },
  };
};
