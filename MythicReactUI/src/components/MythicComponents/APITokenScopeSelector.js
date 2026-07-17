import React from 'react';
import {Box, Button, Checkbox, InputAdornment, TextField, Typography} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import {gql, useQuery} from "@apollo/client";
import {MythicChip} from './MythicChip';

export const defaultAPITokenScopes = ["*"];

export const apiTokenScopeDefinitionsQuery = gql`
query apiTokenScopeDefinitionsQuery {
  apiTokenScopeDefinitions {
    status
    error
    scopes {
      name
      display_name
      description
      resource
      access
      includes
    }
    grantable_wildcards
  }
}
`;

export const normalizeAPITokenScopeSelection = (scopes = []) => {
    const uniqueScopes = Array.from(new Set((scopes || []).filter((scope) => Boolean(scope)))).sort();
    if(uniqueScopes.includes("*")){
        return ["*"];
    }
    return uniqueScopes.reduce((prev, scope) => {
        const resource = scope.endsWith(".*") ? scope.slice(0, -2) : scope.split(".")[0];
        if(scope.endsWith(".*")){
            return [
                ...prev.filter((selectedScope) => !selectedScope.startsWith(`${resource}.`)),
                scope,
            ].sort();
        }
        if(prev.includes(`${resource}.*`)){
            return prev;
        }
        return [...prev, scope].sort();
    }, []);
};

export function APITokenScopeSelector({
    selectedScopes = [],
    onChange,
    requiredScopes = [],
    requiredScopeDescriptions = {},
    fetchPolicy = "cache-first",
    libraryMaxHeight,
    className = "",
    sx = {},
}) {
    const [filter, setFilter] = React.useState("");
    const normalizedSelectedScopes = React.useMemo(() => {
        return normalizeAPITokenScopeSelection(selectedScopes);
    }, [selectedScopes]);
    const {data: scopeData, loading: scopeLoading, error: scopeQueryError} = useQuery(apiTokenScopeDefinitionsQuery, {
        fetchPolicy,
    });
    const availableScopes = React.useMemo(() => {
        if(scopeData?.apiTokenScopeDefinitions?.status !== "success"){
            return [];
        }
        return scopeData?.apiTokenScopeDefinitions?.scopes || [];
    }, [scopeData]);
    const grantableWildcards = React.useMemo(() => {
        return scopeData?.apiTokenScopeDefinitions?.grantable_wildcards || [];
    }, [scopeData]);
    const groupedScopes = React.useMemo(() => {
        return availableScopes.reduce((prev, cur) => {
            const resource = cur.resource || "other";
            return {
                ...prev,
                [resource]: [...(prev[resource] || []), cur],
            };
        }, {});
    }, [availableScopes]);
    const visibleResources = React.useMemo(() => {
        const normalizedFilter = filter.toLowerCase();
        return Object.keys(groupedScopes).sort().filter(resource => {
            if(normalizedFilter === ""){
                return true;
            }
            if(resource.toLowerCase().includes(normalizedFilter)){
                return true;
            }
            return groupedScopes[resource].some(scope =>
                scope.name.toLowerCase().includes(normalizedFilter) ||
                (scope.display_name || "").toLowerCase().includes(normalizedFilter) ||
                (scope.description || "").toLowerCase().includes(normalizedFilter)
            );
        });
    }, [filter, groupedScopes]);
    const visibleScopeCount = React.useMemo(() => {
        return visibleResources.reduce((prev, resource) => prev + groupedScopes[resource].length, 0);
    }, [groupedScopes, visibleResources]);
    const scopeLoadFailed = scopeQueryError !== undefined || scopeData?.apiTokenScopeDefinitions?.status === "error";
    const scopesUnavailable = scopeLoading || scopeLoadFailed;
    const selectedScopesLabel = normalizedSelectedScopes.includes("*") ? "Full access selected" : `${normalizedSelectedScopes.length} selected`;
    const fullAccessDisabled = !grantableWildcards.includes("*");
    const emitScopes = (nextScopes) => {
        if(onChange){
            onChange(normalizeAPITokenScopeSelection(nextScopes));
        }
    }
    const scopeIsSelected = (scope) => {
        return normalizedSelectedScopes.includes(scope);
    }
    const toggleScope = (scope) => {
        if(scope === "*"){
            emitScopes(scopeIsSelected("*") ? [] : defaultAPITokenScopes);
            return;
        }
        const resource = scope.endsWith(".*") ? scope.slice(0, -2) : scope.split(".")[0];
        const withoutAll = normalizedSelectedScopes.filter(s => s !== "*");
        const withoutResourceWildcard = withoutAll.filter(s => s !== `${resource}.*`);
        if(scope.endsWith(".*")){
            emitScopes(normalizedSelectedScopes.includes(scope) ? withoutResourceWildcard : [
                ...withoutResourceWildcard.filter(s => !s.startsWith(`${resource}.`)),
                scope,
            ].sort());
            return;
        }
        if(normalizedSelectedScopes.includes(scope)){
            emitScopes(withoutResourceWildcard.filter(s => s !== scope));
            return;
        }
        emitScopes([...withoutResourceWildcard, scope].sort());
    }
    const selectVisibleScopes = () => {
        const visibleScopeNames = visibleResources.flatMap(resource => groupedScopes[resource].map(scope => scope.name));
        emitScopes(Array.from(new Set([
            ...normalizedSelectedScopes.filter(scope => scope !== "*"),
            ...visibleScopeNames,
        ])).sort());
    }
    const clearScopes = () => {
        emitScopes([]);
    }
    const librarySx = libraryMaxHeight === undefined ? undefined : {maxHeight: libraryMaxHeight};

    return (
        <Box className={className} sx={sx}>
            <Box sx={{alignItems: "center", display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1}}>
                <MythicChip className="mythic-api-token-scope-count" size="small" label={`${visibleScopeCount} visible`} />
                <MythicChip className="mythic-api-token-scope-count" size="small" label={selectedScopesLabel} />
                <Button disabled={scopesUnavailable || visibleScopeCount === 0 || scopeIsSelected("*")} size="small" onClick={selectVisibleScopes}>
                    Select Visible
                </Button>
                <Button disabled={normalizedSelectedScopes.length === 0} size="small" onClick={clearScopes}>
                    Clear
                </Button>
            </Box>
            {requiredScopes.length > 0 &&
                <Box className="mythic-api-token-scope-card mythic-api-token-scope-card-selected" sx={{mb: 1.25}}>
                    <Box className="mythic-api-token-scope-card-copy">
                        <Typography className="mythic-api-token-scope-card-title">Needed for this use</Typography>
                        {requiredScopes.map((scope) => (
                            <Typography key={`required-${scope}`} variant="caption" color="text.secondary" sx={{display: "block"}}>
                                {scope}: {requiredScopeDescriptions[scope] || "Required for this workflow."}
                            </Typography>
                        ))}
                    </Box>
                </Box>
            }
            <TextField
                className="mythic-api-token-scope-search"
                size="small"
                fullWidth
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Search scopes"
                disabled={scopesUnavailable}
                InputProps={{startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>}}
            />
            <Box className="mythic-api-token-scope-library" sx={librarySx}>
                {scopesUnavailable &&
                    <Box className={`mythic-api-token-scope-state${scopeLoadFailed ? " mythic-api-token-scope-state-error" : ""}`}>
                        <Typography variant="body2">
                            {scopeLoading ? "Loading scopes..." : (scopeQueryError?.message || scopeData?.apiTokenScopeDefinitions?.error || "Failed to load scopes")}
                        </Typography>
                    </Box>
                }
                {!scopesUnavailable &&
                    <>
                        <Box
                            className={`mythic-api-token-scope-card mythic-api-token-scope-card-full${scopeIsSelected("*") ? " mythic-api-token-scope-card-selected" : ""}${fullAccessDisabled ? " mythic-api-token-scope-card-disabled" : ""}`}
                            component="label"
                        >
                            <Checkbox
                                disabled={fullAccessDisabled}
                                checked={scopeIsSelected("*")}
                                onChange={() => toggleScope("*")}
                            />
                            <Box className="mythic-api-token-scope-card-copy">
                                <Typography className="mythic-api-token-scope-card-title">Full access (*)</Typography>
                                <Typography className="mythic-api-token-scope-card-description">
                                    Grants every current and future API scope available to this operator.
                                </Typography>
                            </Box>
                        </Box>
                        {visibleResources.length === 0 &&
                            <Box className="mythic-api-token-scope-state">
                                <Typography variant="body2">No scopes match your search.</Typography>
                            </Box>
                        }
                        {visibleResources.map(resource => {
                            const resourceWildcard = `${resource}.*`;
                            const canGrantResourceWildcard = grantableWildcards.includes(resourceWildcard);
                            const resourceScopes = [...groupedScopes[resource]].sort((a, b) => (a.access || "").localeCompare(b.access || ""));
                            const resourceWildcardSelected = scopeIsSelected("*") || scopeIsSelected(resourceWildcard);
                            return (
                                <Box className="mythic-api-token-resource-card" key={resource}>
                                    <Box className="mythic-api-token-resource-header">
                                        <Box sx={{minWidth: 0}}>
                                            <Typography className="mythic-api-token-resource-title">
                                                {resource.split("_").join(" ")}
                                            </Typography>
                                            <Typography className="mythic-api-token-resource-subtitle">
                                                {resourceScopes.length === 1 ? "1 available scope" : `${resourceScopes.length} available scopes`}
                                            </Typography>
                                        </Box>
                                        <Box
                                            className={`mythic-api-token-resource-wildcard${resourceWildcardSelected ? " mythic-api-token-resource-wildcard-selected" : ""}${!canGrantResourceWildcard ? " mythic-api-token-resource-wildcard-disabled" : ""}`}
                                            component="label"
                                        >
                                            <Checkbox
                                                size="small"
                                                disabled={scopeIsSelected("*") || !canGrantResourceWildcard}
                                                checked={resourceWildcardSelected}
                                                onChange={() => toggleScope(resourceWildcard)}
                                            />
                                            <span>{resourceWildcard}</span>
                                        </Box>
                                    </Box>
                                    <Box className="mythic-api-token-scope-grid">
                                        {resourceScopes.map(scope => {
                                            const includedByWildcard = scopeIsSelected("*") || scopeIsSelected(resourceWildcard);
                                            const scopeSelected = scopeIsSelected(scope.name) || includedByWildcard;
                                            return (
                                                <Box
                                                    className={`mythic-api-token-scope-card${scopeSelected ? " mythic-api-token-scope-card-selected" : ""}${includedByWildcard ? " mythic-api-token-scope-card-inherited" : ""}`}
                                                    component="label"
                                                    key={scope.name}
                                                >
                                                    <Checkbox
                                                        size="small"
                                                        disabled={includedByWildcard}
                                                        checked={scopeSelected}
                                                        onChange={() => toggleScope(scope.name)}
                                                    />
                                                    <Box className="mythic-api-token-scope-card-copy">
                                                        <Box className="mythic-api-token-scope-card-title-row">
                                                            <Typography className="mythic-api-token-scope-card-title">{scope.display_name || scope.name}</Typography>
                                                            <MythicChip
                                                                compact
                                                                label={scope.access || "scope"}
                                                                size="small"
                                                                tone={scope.access === "read" ? "info" : ["write", "create", "update"].includes(scope.access) ? "success" : ["delete", "admin"].includes(scope.access) ? "error" : "neutral"}
                                                            />
                                                        </Box>
                                                        <Typography className="mythic-api-token-scope-name">
                                                            {scope.name}
                                                        </Typography>
                                                        <Typography className="mythic-api-token-scope-card-description">
                                                            {scope.description}
                                                        </Typography>
                                                        {scope.includes?.length > 0 &&
                                                            <Typography className="mythic-api-token-scope-includes">
                                                                Includes {scope.includes.join(", ")}
                                                            </Typography>
                                                        }
                                                    </Box>
                                                </Box>
                                            )
                                        })}
                                    </Box>
                                </Box>
                            );
                        })}
                    </>
                }
            </Box>
        </Box>
    )
}
