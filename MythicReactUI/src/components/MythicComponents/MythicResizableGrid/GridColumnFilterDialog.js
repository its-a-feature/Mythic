import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

const DEFAULT_FILTER = {
    include: [],
    exclude: [],
    includeMode: "any",
    caseSensitive: false,
};

const splitFilterTerms = (value) => {
    if(Array.isArray(value)){
        return value.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if(value === undefined || value === null){
        return [];
    }
    return String(value)
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
};

export const normalizeGridColumnFilter = (value) => {
    if(value === undefined || value === null){
        return {...DEFAULT_FILTER};
    }
    if(typeof value === "string" || typeof value === "number" || typeof value === "boolean"){
        return {
            ...DEFAULT_FILTER,
            include: splitFilterTerms(value),
        };
    }
    if(typeof value === "object"){
        return {
            include: splitFilterTerms(value.include),
            exclude: splitFilterTerms(value.exclude),
            includeMode: value.includeMode === "all" ? "all" : "any",
            caseSensitive: Boolean(value.caseSensitive),
        };
    }
    return {...DEFAULT_FILTER};
};

export const isGridColumnFilterActive = (value) => {
    const normalizedFilter = normalizeGridColumnFilter(value);
    return normalizedFilter.include.length > 0 || normalizedFilter.exclude.length > 0;
};

export const getUpdatedGridFilterOptions = (filterOptions, key, value) => {
    const nextFilterOptions = {...filterOptions};
    if(!key){
        return nextFilterOptions;
    }
    const normalizedFilter = normalizeGridColumnFilter(value);
    if(isGridColumnFilterActive(normalizedFilter)){
        nextFilterOptions[key] = normalizedFilter;
    }else{
        delete nextFilterOptions[key];
    }
    return nextFilterOptions;
};

export const gridValuePassesFilter = (value, filterOption) => {
    const normalizedFilter = normalizeGridColumnFilter(filterOption);
    if(!isGridColumnFilterActive(normalizedFilter)){
        return true;
    }
    const cellText = String(value ?? "");
    const haystack = normalizedFilter.caseSensitive ? cellText : cellText.toLowerCase();
    const normalizeTerm = (term) => normalizedFilter.caseSensitive ? term : term.toLowerCase();
    const termMatches = (term) => haystack.includes(normalizeTerm(term));
    const includeMatches = normalizedFilter.include.length === 0 ? true :
        normalizedFilter.includeMode === "all" ?
            normalizedFilter.include.every(termMatches) :
            normalizedFilter.include.some(termMatches);
    if(!includeMatches){
        return false;
    }
    return !normalizedFilter.exclude.some(termMatches);
};

export function GridColumnFilterDialog({filterValue, onClose, onSubmit, selectedColumn}) {
    const normalizedFilter = React.useMemo(() => normalizeGridColumnFilter(filterValue), [filterValue]);
    const [includeText, setIncludeText] = React.useState(normalizedFilter.include.join("\n"));
    const [excludeText, setExcludeText] = React.useState(normalizedFilter.exclude.join("\n"));
    const [includeMode, setIncludeMode] = React.useState(normalizedFilter.includeMode);
    const [caseSensitive, setCaseSensitive] = React.useState(normalizedFilter.caseSensitive);
    const columnName = selectedColumn?.name || selectedColumn?.plaintext || selectedColumn?.key || "Column";
    const buildFilter = () => ({
        include: splitFilterTerms(includeText),
        exclude: splitFilterTerms(excludeText),
        includeMode,
        caseSensitive,
    });
    const handleSubmit = () => {
        onSubmit(buildFilter());
        onClose();
    };
    const handleClear = () => {
        onSubmit({...DEFAULT_FILTER});
        onClose();
    };
    const onIncludeModeChange = (event, value) => {
        if(value !== null){
            setIncludeMode(value);
        }
    };
    return (
        <div className="mythic-grid-filter-dialog">
            <DialogTitle className="mythic-grid-filter-dialog-title">
                Filter {columnName}
            </DialogTitle>
            <DialogContent className="mythic-grid-filter-dialog-content">
                <Typography className="mythic-grid-filter-dialog-copy" component="div">
                    Add one term per line, or separate terms with commas. Include terms decide what can stay visible; exclude terms remove matching rows.
                </Typography>
                <Box className="mythic-grid-filter-dialog-mode-row">
                    <Typography className="mythic-grid-filter-dialog-label" component="div">
                        Include matching
                    </Typography>
                    <ToggleButtonGroup
                        exclusive
                        onChange={onIncludeModeChange}
                        size="small"
                        value={includeMode}
                    >
                        <ToggleButton value="any">Any</ToggleButton>
                        <ToggleButton value="all">All</ToggleButton>
                    </ToggleButtonGroup>
                </Box>
                <div className="mythic-grid-filter-dialog-fields">
                    <TextField
                        fullWidth
                        label="Include rows matching"
                        minRows={4}
                        multiline
                        onChange={(event) => setIncludeText(event.target.value)}
                        placeholder={"admin\nprod"}
                        value={includeText}
                    />
                    <TextField
                        fullWidth
                        label="Exclude rows matching"
                        minRows={4}
                        multiline
                        onChange={(event) => setExcludeText(event.target.value)}
                        placeholder={"debug\ntest"}
                        value={excludeText}
                    />
                </div>
                <FormControlLabel
                    control={
                        <Switch
                            checked={caseSensitive}
                            onChange={(event) => setCaseSensitive(event.target.checked)}
                            size="small"
                        />
                    }
                    label="Case sensitive"
                />
            </DialogContent>
            <DialogActions className="mythic-grid-filter-dialog-actions">
                <Button onClick={handleClear}>Clear</Button>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained">Apply Filter</Button>
            </DialogActions>
        </div>
    );
}
