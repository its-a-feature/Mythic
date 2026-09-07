import React from 'react';
import {Box, Checkbox, InputAdornment, TextField, Typography} from '@mui/material';
import {MythicActionButton} from './MythicActionButton';
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
                <MythicChip label={`${visibleScopeCount} visible`} />
                <MythicChip label={selectedScopesLabel} />
                <MythicActionButton disabled={scopesUnavailable || visibleScopeCount === 0 || scopeIsSelected("*")} size="small" onClick={selectVisibleScopes}>
                    Select Visible
                </MythicActionButton>
                <MythicActionButton disabled={normalizedSelectedScopes.length === 0} size="small" onClick={clearScopes}>
                    Clear
                </MythicActionButton>
            </Box>
            {requiredScopes.length > 0 &&
                <Box className="mythic-api-token-scope-card items-start flex gap-3 mythic-api-token-scope-card-selected min-w-0 rounded cursor-pointer bg-surface border-subtle text-primary mythic-tone-primary bg-tone-1 border-tone-3" sx={{mb: 1.25}}>
                    <Box className="mythic-api-token-scope-card-copy min-w-0 w-full">
                        <Typography className="mythic-api-token-scope-card-title text-sm font-800 leading-125 min-w-0 wrap-anywhere text-primary">Needed for this use</Typography>
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
            <Box className="mythic-api-token-scope-library flex flex-column gap-5 overflow-auto rounded bg-neutral-1 border-subtle" sx={librarySx}>
                {scopesUnavailable &&
                    <Box className={`mythic-api-token-scope-state items-center flex justify-center rounded bg-surface-raised border-subtle text-muted text-center${scopeLoadFailed ? " mythic-api-token-scope-state-error mythic-tone-error bg-tone-1 border-tone-3 text-tone" : ""}`}>
                        <Typography variant="body2">
                            {scopeLoading ? "Loading scopes..." : (scopeQueryError?.message || scopeData?.apiTokenScopeDefinitions?.error || "Failed to load scopes")}
                        </Typography>
                    </Box>
                }
                {!scopesUnavailable &&
                    <>
                        <Box
                            className={`mythic-api-token-scope-card items-start flex gap-3 mythic-api-token-scope-card-full rounded cursor-pointer bg-surface border-subtle text-primary mythic-tone-warning bg-tone-1 border-tone-2${scopeIsSelected("*") ? " mythic-api-token-scope-card-selected mythic-tone-primary bg-tone-1 border-tone-3" : ""}${fullAccessDisabled ? " mythic-api-token-scope-card-disabled" : ""} min-w-0`}
                            component="label"
                        >
                            <Checkbox
                                disabled={fullAccessDisabled}
                                checked={scopeIsSelected("*")}
                                onChange={() => toggleScope("*")}
                            />
                            <Box className="mythic-api-token-scope-card-copy min-w-0 w-full">
                                <Typography className="mythic-api-token-scope-card-title text-sm font-800 leading-125 min-w-0 wrap-anywhere text-primary">Full access (*)</Typography>
                                <Typography className="mythic-api-token-scope-card-description text-xs leading-135 wrap-anywhere text-muted">
                                    Grants every current and future API scope available to this operator.
                                </Typography>
                            </Box>
                        </Box>
                        {visibleResources.length === 0 &&
                            <Box className="mythic-api-token-scope-state items-center flex justify-center rounded bg-surface-raised border-subtle text-muted text-center">
                                <Typography variant="body2">No scopes match your search.</Typography>
                            </Box>
                        }
                        {visibleResources.map(resource => {
                            const resourceWildcard = `${resource}.*`;
                            const canGrantResourceWildcard = grantableWildcards.includes(resourceWildcard);
                            const resourceScopes = [...groupedScopes[resource]].sort((a, b) => (a.access || "").localeCompare(b.access || ""));
                            const resourceWildcardSelected = scopeIsSelected("*") || scopeIsSelected(resourceWildcard);
                            return (
                                <Box className="mythic-api-token-resource-card p-6 flex flex-column gap-5 min-w-0 rounded bg-surface-raised border-subtle" key={resource}>
                                    <Box className="mythic-api-token-resource-header items-start flex flex-wrap gap-6 justify-between min-w-0">
                                        <Box sx={{minWidth: 0}}>
                                            <Typography className="mythic-api-token-resource-title text-sm font-800 leading-120 text-primary">
                                                {resource.split("_").join(" ")}
                                            </Typography>
                                            <Typography className="mythic-api-token-resource-subtitle">
                                                {resourceScopes.length === 1 ? "1 available scope" : `${resourceScopes.length} available scopes`}
                                            </Typography>
                                        </Box>
                                        <Box
                                            className={`mythic-api-token-resource-wildcard text-xs font-750 items-center inline-flex flex-none gap-2 rounded cursor-pointer bg-neutral-1 border-subtle text-muted${resourceWildcardSelected ? " mythic-api-token-resource-wildcard-selected" : ""}${!canGrantResourceWildcard ? " mythic-api-token-resource-wildcard-disabled" : ""}`}
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
                                    <Box className="mythic-api-token-scope-grid gap-4 min-w-0 grid">
                                        {resourceScopes.map(scope => {
                                            const includedByWildcard = scopeIsSelected("*") || scopeIsSelected(resourceWildcard);
                                            const scopeSelected = scopeIsSelected(scope.name) || includedByWildcard;
                                            return (
                                                <Box
                                                    className={`mythic-api-token-scope-card items-start flex gap-3 rounded cursor-pointer bg-surface border-subtle text-primary${scopeSelected ? " mythic-api-token-scope-card-selected mythic-tone-primary bg-tone-1 border-tone-3" : ""}${includedByWildcard ? " mythic-api-token-scope-card-inherited" : ""} min-w-0`}
                                                    component="label"
                                                    key={scope.name}
                                                >
                                                    <Checkbox
                                                        size="small"
                                                        disabled={includedByWildcard}
                                                        checked={scopeSelected}
                                                        onChange={() => toggleScope(scope.name)}
                                                    />
                                                    <Box className="mythic-api-token-scope-card-copy min-w-0 w-full">
                                                        <Box className="mythic-api-token-scope-card-title-row items-start flex gap-4 justify-between min-w-0">
                                                            <Typography className="mythic-api-token-scope-card-title text-sm font-800 leading-125 min-w-0 wrap-anywhere text-primary">{scope.display_name || scope.name}</Typography>
                                                            <MythicChip
                                                                compact
                                                                label={scope.access || "scope"}
                                                                size="small"
                                                                tone={scope.access === "read" ? "info" : ["write", "create", "update"].includes(scope.access) ? "success" : ["delete", "admin"].includes(scope.access) ? "error" : "neutral"}
                                                            />
                                                        </Box>
                                                        <Typography className="mythic-api-token-scope-name text-xs leading-135 wrap-anywhere text-muted font-mono">
                                                            {scope.name}
                                                        </Typography>
                                                        <Typography className="mythic-api-token-scope-card-description text-xs leading-135 wrap-anywhere text-muted">
                                                            {scope.description}
                                                        </Typography>
                                                        {scope.includes?.length > 0 &&
                                                            <Typography className="mythic-api-token-scope-includes text-xs leading-135 font-700 wrap-anywhere mythic-tone-info text-tone">
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
