export const createTokenRefreshCoordinator = ({
  fetchImpl,
  getTokens,
  onSuccess,
  onTerminalFailure,
  isValidResponse,
  endpoint = "/refresh",
}) => {
  let inFlightRefresh = null;

  const refresh = () => {
    if(inFlightRefresh){
      return inFlightRefresh;
    }

    inFlightRefresh = (async () => {
      const tokens = getTokens();
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.accessToken}`,
          MythicSource: "web",
        },
        body: JSON.stringify({
          refresh_token: tokens.refreshToken,
          access_token: tokens.accessToken,
        }),
      };

      try{
        const response = await fetchImpl(endpoint, requestOptions);
        if(!response.ok){
          if(response.status === 401 || response.status === 403){
            onTerminalFailure();
          }
          return false;
        }

        let data;
        try{
          data = await response.json();
        }catch(error){
          onTerminalFailure();
          return false;
        }

        if(!isValidResponse(data)){
          onTerminalFailure();
          return false;
        }

        onSuccess(data);
        return true;
      }catch(error){
        return false;
      }finally{
        inFlightRefresh = null;
      }
    })();

    return inFlightRefresh;
  };

  return refresh;
};

export const shouldInvalidateSessionAfterRefreshFailure = (accessTokenIsValid) => !accessTokenIsValid;
