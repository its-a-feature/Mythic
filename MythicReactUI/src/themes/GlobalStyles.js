import { createGlobalStyle} from "styled-components"
import {alpha} from "@mui/material/styles";
// hex transparencies https://gist.github.com/lopspower/03fb1cc0ac9f32ef38f4
const getSectionHeaderAccent = (props) => props.theme.sectionHeader?.accent || props.theme.palette.primary.main;
const getSectionHeaderGradient = (props) => {
    if(props.theme.gradients?.sectionHeader){
        return props.theme.gradients.sectionHeader;
    }
    const headerTextColor = props.theme.pageHeaderText?.main || props.theme.palette.text.primary;
    return `linear-gradient(90deg, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.28 : 0.18)} 0%, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.12 : 0.08)} 48%, ${alpha(headerTextColor, props.theme.palette.mode === "dark" ? 0.055 : 0.04)} 100%)`;
};
const getSubtleAccentGradient = (props) => props.theme.gradients?.subtleAccent ||
    `linear-gradient(135deg, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.13 : 0.075)} 0%, ${alpha(props.theme.palette.background.paper, 0)} 62%)`;
const getSubtleAccentHorizontalGradient = (props) => props.theme.gradients?.subtleAccentHorizontal ||
    `linear-gradient(90deg, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)} 0%, ${alpha(props.theme.palette.background.paper, 0)} 100%)`;
const getSoftBorderColor = (props) => props.theme.table?.borderSoft || props.theme.borderColor;

// Keep theme-dependent values here so the large global stylesheet stays static across theme changes.
export const ThemeVariables = createGlobalStyle`
:root {
    --mythic-radius: ${(props) => props.theme.shape.borderRadius}px;
    --mythic-nav-background: ${(props) => props.theme.navigation.background};
    --mythic-nav-background-color: ${(props) => props.theme.navigation.backgroundColor};
    --mythic-nav-text: ${(props) => props.theme.navigation.text};
    --mythic-nav-icon: ${(props) => props.theme.navigation.icon};
    --mythic-nav-muted: ${(props) => props.theme.navigation.muted};
    --mythic-nav-hover: ${(props) => props.theme.navigation.hover};
    --mythic-warning-main: ${(props) => props.theme.palette.warning.main};
    --mythic-error-main: ${(props) => props.theme.palette.error.main};
    --mythic-global-001: ${(props) => props.theme.palette.background.default};
    --mythic-global-002: ${(props) => props.theme.palette.text.primary};
    --mythic-global-003: ${(props) => props.theme.typography.fontFamily};
    --mythic-global-004: ${(props) => props.theme.palette.primary.main + "40"};
    --mythic-global-005: ${(props) => props.theme.borderColor};
    --mythic-global-006: ${(props) => props.theme.tableHeader};
    --mythic-global-007: ${(props) => props.theme.table?.border || props.theme.borderColor};
    --mythic-global-008: ${(props) => props.theme.shape.borderRadius}px;
    --mythic-global-009: ${(props) => props.theme.palette.background.paper};
    --mythic-global-010: ${(props) => props.theme.table?.borderSoft || props.theme.borderColor};
    --mythic-global-011: ${(props) => props.theme.table?.rowStripe || props.theme.tableHover + "66"};
    --mythic-global-012: ${(props) => props.theme.table?.rowHover || props.theme.tableHover + "CC"};
    --mythic-global-013: ${(props) => props.theme.surfaces?.hover || props.theme.palette.action.hover};
    --mythic-global-014: ${(props) => props.theme.palette.background.contrast};
    --mythic-global-015: ${(props) => props.theme.palette.text.contrast};
    --mythic-global-016: ${(props) => props.theme.shadows[1]};
    --mythic-global-017: ${(props) => props.theme.sectionHeader?.accent || props.theme.palette.primary.main};
    --mythic-global-018: ${(props) => props.theme.palette.graphGroupRGBA};
    --mythic-global-019: ${(props) => props.theme.shape.borderRadius + 2}px;
    --mythic-global-020: ${(props) => props.theme.palette.mode === 'dark' ? "0 18px 48px rgba(0, 0, 0, 40%)" : "0 18px 48px rgba(15, 23, 42, 12%)"};
    --mythic-global-021: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.08)};
    --mythic-global-022: ${(props) => alpha(props.theme.palette.info.main, 0.36)};
    --mythic-global-023: ${(props) => props.theme.palette.info.main};
    --mythic-global-024: ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.22 : 0.08)};
    --mythic-global-025: ${(props) => props.theme.palette.text.secondary};
    --mythic-global-026: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.16 : 0.08)};
    --mythic-global-027: ${(props) => props.theme.palette.primary.main};
    --mythic-global-028: ${(props) => getSubtleAccentGradient(props)};
    --mythic-global-029: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"};
    --mythic-global-030: ${(props) => alpha(props.theme.palette.primary.main, 0.38)};
    --mythic-global-031: ${(props) => alpha(props.theme.palette.background.paper, props.theme.palette.mode === "dark" ? 0.96 : 0.98)};
    --mythic-global-032: ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.32 : 0.12)};
    --mythic-global-033: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.18 : 0.09)};
    --mythic-global-034: ${(props) => alpha(props.theme.palette.success.main, 0.38)};
    --mythic-global-035: ${(props) => props.theme.palette.success.main};
    --mythic-global-036: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.18 : 0.09)};
    --mythic-global-037: ${(props) => alpha(props.theme.palette.warning.main, 0.38)};
    --mythic-global-038: ${(props) => props.theme.palette.warning.main};
    --mythic-global-039: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.16 : 0.08)};
    --mythic-global-040: ${(props) => alpha(props.theme.palette.warning.main, 0.34)};
    --mythic-global-041: ${(props) => props.theme.selectedCallbackColor + "DD"};
    --mythic-global-042: ${(props) => alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.045 : 0.035)};
    --mythic-global-043: ${(props) => alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.09 : 0.075)};
    --mythic-global-044: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    --mythic-global-045: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    --mythic-global-046: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    --mythic-global-047: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    --mythic-global-048: ${(props) => props.theme.palette.error.main};
    --mythic-global-049: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    --mythic-global-050: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.22 : 0.14)};
    --mythic-global-051: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    --mythic-global-052: ${(props) => alpha(props.theme.palette.background.paper, props.theme.palette.mode === "dark" ? 0.94 : 0.98)};
    --mythic-global-053: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.16 : 0.08)};
    --mythic-global-054: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.42 : 0.28)};
    --mythic-global-055: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    --mythic-global-056: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.46 : 0.3)};
    --mythic-global-057: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.16 : 0.08)};
    --mythic-global-058: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.42 : 0.28)};
    --mythic-global-059: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.45 : 0.3)};
    --mythic-global-060: ${(props) => alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.08 : 0.05)};
    --mythic-global-061: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.paper};
    --mythic-global-062: ${(props) => props.theme.palette.mode === "dark" ? "0 -10px 24px rgba(0,0,0,0.22)" : "0 -10px 24px rgba(15,23,42,0.06)"};
    --mythic-global-063: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.025)"};
    --mythic-global-064: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.16 : 0.09)};
    --mythic-global-065: ${(props) => props.theme.typography.fontFamilyMonospace || "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"};
    --mythic-global-066: ${(props) => props.theme.palette.text.disabled};
    --mythic-global-067: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.44 : 0.3)};
    --mythic-global-068: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.46 : 0.3)};
    --mythic-global-069: ${getSectionHeaderGradient};
    --mythic-global-070: ${(props) => props.theme.pageHeaderText?.main || props.theme.palette.text.primary};
    --mythic-global-071: ${getSectionHeaderAccent};
    --mythic-global-072: ${(props) => alpha(props.theme.palette.background.default, props.theme.palette.mode === "dark" ? 0.7 : 0.52)};
    --mythic-global-073: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.16 : 0.09)};
    --mythic-global-074: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.42 : 0.28)};
    --mythic-global-075: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.46 : 0.32)};
    --mythic-global-076: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.02)"};
    --mythic-global-077: ${(props) => props.theme.palette.mode === "dark" ? "0 -10px 28px rgba(0, 0, 0, 0.24)" : "0 -10px 28px rgba(15, 23, 42, 0.06)"};
    --mythic-global-078: ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.22 : 0.1)};
    --mythic-global-079: ${(props) => alpha(props.theme.palette.common.white, props.theme.palette.mode === "dark" ? 0.12 : 0.18)};
    --mythic-global-080: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.035) : alpha(props.theme.palette.common.black, 0.018)};
    --mythic-global-081: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.05) : alpha(props.theme.palette.common.black, 0.026)};
    --mythic-global-082: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)};
    --mythic-global-083: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.52 : 0.36)};
    --mythic-global-084: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)};
    --mythic-global-085: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.025) : alpha(props.theme.palette.common.black, 0.014)};
    --mythic-global-086: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    --mythic-global-087: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.36 : 0.24)};
    --mythic-global-088: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.14 : 0.08)};
    --mythic-global-089: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.36 : 0.24)};
    --mythic-global-090: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)};
    --mythic-global-091: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.14 : 0.08)};
    --mythic-global-092: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.16 : 0.1)};
    --mythic-global-093: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.045) : alpha(props.theme.palette.common.black, 0.024)};
    --mythic-global-094: ${(props) => props.theme.surfaces?.raised || props.theme.palette.background.paper};
    --mythic-global-095: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.2)};
    --mythic-global-096: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.12)};
    --mythic-global-097: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.24)};
    --mythic-global-098: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.78)};
    --mythic-global-099: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.18 : 0.1)};
    --mythic-global-100: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.42 : 0.28)};
    --mythic-global-101: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.045)"};
    --mythic-global-102: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.025)"};
    --mythic-global-103: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.032)"};
    --mythic-global-104: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.5 : 0.34)};
    --mythic-global-105: ${(props) => props.theme.typography.fontFamilyMono || "monospace"};
    --mythic-global-106: ${(props) => alpha(props.theme.palette.background.paper, props.theme.palette.mode === "dark" ? 0.72 : 0.82)};
    --mythic-global-107: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.018)"};
    --mythic-global-108: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.42 : 0.28)};
    --mythic-global-109: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.42)};
    --mythic-global-110: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.12 : 0.06)};
    --mythic-global-111: ${(props) => alpha(props.theme.palette.primary.main, 0.28)};
    --mythic-global-112: ${(props) => props.theme.palette.mode === "dark" ? "none" : "0 8px 18px rgba(15, 23, 42, 0.035)"};
    --mythic-global-113: ${(props) => props.theme.table?.headerHover || props.theme.tableHover};
    --mythic-global-114: ${(props) => alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.28 : 0.22)};
    --mythic-global-115: ${(props) => props.theme.palette.mode === "dark" ? "0 0 0 1px rgba(255,255,255,0.04)" : "0 1px 2px rgba(15, 23, 42, 0.08)"};
    --mythic-global-116: ${(props) => alpha(props.theme.palette.mode === "dark" ? props.theme.palette.info.light : props.theme.palette.info.dark || props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.24 : 0.14)};
    --mythic-global-117: ${(props) => alpha(props.theme.palette.mode === "dark" ? props.theme.palette.info.light : props.theme.palette.info.dark || props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.72 : 0.5)};
    --mythic-global-118: ${(props) => props.theme.palette.mode === "dark" ? props.theme.palette.info.light : props.theme.palette.info.dark || props.theme.palette.info.main};
    --mythic-global-119: ${(props) => alpha(props.theme.palette.mode === "dark" ? props.theme.palette.info.light : props.theme.palette.info.dark || props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.34 : 0.22)};
    --mythic-global-120: ${(props) => alpha(props.theme.palette.mode === "dark" ? props.theme.palette.info.light : props.theme.palette.info.dark || props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.86 : 0.68)};
    --mythic-global-121: ${(props) => alpha(props.theme.palette.mode === "dark" ? props.theme.palette.primary.light : props.theme.palette.primary.dark || props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.24 : 0.14)};
    --mythic-global-122: ${(props) => alpha(props.theme.palette.mode === "dark" ? props.theme.palette.primary.light : props.theme.palette.primary.dark || props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.72 : 0.5)};
    --mythic-global-123: ${(props) => props.theme.palette.mode === "dark" ? props.theme.palette.primary.light : props.theme.palette.primary.dark || props.theme.palette.primary.main};
    --mythic-global-124: ${(props) => alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.5 : 0.38)};
    --mythic-global-125: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.24 : 0.14)};
    --mythic-global-126: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.32 : 0.22)};
    --mythic-global-127: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.45 : 0.28)};
    --mythic-global-128: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.11 : 0.07)};
    --mythic-global-129: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.3 : 0.2)};
    --mythic-global-130: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.52 : 0.34)};
    --mythic-global-131: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    --mythic-global-132: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.4)};
    --mythic-global-133: ${(props) => alpha(props.theme.palette.secondary.main, props.theme.palette.mode === "dark" ? 0.22 : 0.13)};
    --mythic-global-134: ${(props) => alpha(props.theme.palette.secondary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.4)};
    --mythic-global-135: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.72 : 0.58)};
    --mythic-global-136: ${(props) => props.theme.palette.secondary.main};
    --mythic-global-137: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.16 : 0.09)};
    --mythic-global-138: ${(props) => alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.055 : 0.035)};
    --mythic-global-139: ${(props) => props.theme.pageHeader?.main || props.theme.surfaces?.muted || props.theme.palette.background.default};
    --mythic-global-140: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    --mythic-global-141: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.34 : 0.22)};
    --mythic-global-142: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    --mythic-global-143: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.34 : 0.22)};
    --mythic-global-144: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    --mythic-global-145: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.34 : 0.22)};
    --mythic-global-146: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.12 : 0.07)};
    --mythic-global-147: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.32 : 0.2)};
    --mythic-global-148: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)};
    --mythic-global-149: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.32 : 0.2)};
    --mythic-global-150: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.2 : 0.12)};
    --mythic-global-151: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)};
    --mythic-global-152: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.32 : 0.2)};
    --mythic-global-153: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)};
    --mythic-global-154: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.32 : 0.2)};
    --mythic-global-155: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.54 : 0.36)};
    --mythic-global-156: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.48 : 0.32)};
    --mythic-global-157: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.24 : 0.14)};
    --mythic-global-158: ${(props) => alpha(props.theme.palette.primary.main, 0.55)};
    --mythic-global-159: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.22 : 0.13)};
    --mythic-global-160: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.58 : 0.42)};
    --mythic-global-161: ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.2 : 0.08)};
    --mythic-global-162: ${(props) => alpha(props.theme.palette.success.main, 0.42)};
    --mythic-global-163: ${(props) => alpha(props.theme.palette.warning.main, 0.46)};
    --mythic-global-164: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.2 : 0.11)};
    --mythic-global-165: ${(props) => alpha(props.theme.palette.error.main, 0.48)};
    --mythic-global-166: ${(props) => getSubtleAccentHorizontalGradient(props)};
    --mythic-global-167: ${(props) => `linear-gradient(90deg, ${alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.16 : 0.08)} 0%, ${alpha(props.theme.palette.background.paper, 0)} 70%)`};
    --mythic-global-168: ${(props) => alpha(props.theme.palette.success.main, 0.28)};
    --mythic-global-169: ${(props) => `linear-gradient(90deg, ${alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.18 : 0.09)} 0%, ${alpha(props.theme.palette.background.paper, 0)} 70%)`};
    --mythic-global-170: ${(props) => alpha(props.theme.palette.warning.main, 0.32)};
    --mythic-global-171: ${(props) => `linear-gradient(90deg, ${alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.18 : 0.09)} 0%, ${alpha(props.theme.palette.background.paper, 0)} 70%)`};
    --mythic-global-172: ${(props) => alpha(props.theme.palette.error.main, 0.34)};
    --mythic-global-173: ${(props) => `repeating-linear-gradient(90deg, ${props.theme.palette.success.main} 0, ${props.theme.palette.success.main} 5px, transparent 5px, transparent 9px)`};
    --mythic-global-174: ${(props) => `linear-gradient(180deg, ${alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.2 : 0.1)} 0%, ${alpha(props.theme.palette.background.paper, 0)} 100%)`};
    --mythic-global-175: ${(props) => alpha(props.theme.palette.primary.main, 0.42)};
    --mythic-global-176: ${(props) => alpha(props.theme.palette.primary.main, 0.72)};
    --mythic-global-177: ${(props) => alpha(props.theme.palette.error.main, 0.38)};
    --mythic-global-178: ${(props) => `linear-gradient(180deg, ${alpha(props.theme.sectionHeader?.background || props.theme.palette.background.paper, props.theme.palette.mode === "dark" ? 0.96 : 0.98)} 0%, ${alpha(props.theme.palette.background.paper, props.theme.palette.mode === "dark" ? 0.86 : 0.94)} 100%)`};
    --mythic-global-179: ${(props) => props.theme.palette.mode === "dark" ? "0 10px 28px rgba(0,0,0,0.22)" : "0 10px 24px rgba(15, 23, 42, 0.08)"};
    --mythic-global-180: ${(props) => props.theme.palette.mode === "dark" ? "drop-shadow(0 0 4px rgba(255,255,255,0.14))" : "drop-shadow(0 1px 3px rgba(15,23,42,0.18))"};
    --mythic-global-181: ${(props) => props.theme.palette.mode === "dark" ? "drop-shadow(0 0 6px rgba(255,255,255,0.18))" : "drop-shadow(0 2px 6px rgba(15,23,42,0.18))"};
    --mythic-global-182: ${(props) => alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.28 : 0.2)};
    --mythic-global-183: ${(props) => props.theme.palette.mode === "dark" ? "0 6px 18px rgba(0,0,0,0.34)" : "0 6px 14px rgba(15, 23, 42, 0.16)"};
    --mythic-global-184: ${(props) => alpha(props.theme.palette.primary.main, 0.5)};
    --mythic-global-185: ${(props) => alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.08 : 0.06)};
    --mythic-global-186: ${(props) => alpha(props.theme.palette.primary.main, 0.48)};
    --mythic-global-187: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.14 : 0.09)};
    --mythic-global-188: ${(props) => alpha(props.theme.palette.success.main, 0.32)};
    --mythic-global-189: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.16 : 0.1)};
    --mythic-global-190: ${(props) => alpha(props.theme.palette.warning.main, 0.35)};
    --mythic-global-191: ${(props) => alpha(props.theme.palette.text.secondary, props.theme.palette.mode === "dark" ? 0.12 : 0.08)};
    --mythic-global-192: ${(props) => alpha(props.theme.palette.background.paper, props.theme.palette.mode === "dark" ? 0.82 : 0.88)};
    --mythic-global-193: ${(props) => props.theme.palette.mode === "dark" ? "0 8px 22px rgba(0,0,0,0.36)" : "0 8px 18px rgba(15, 23, 42, 0.18)"};
    --mythic-global-194: ${(props) => alpha(props.theme.palette.warning.main, 0.45)};
    --mythic-global-195: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.18 : 0.08)};
    --mythic-global-196: ${(props) => alpha(props.theme.palette.success.main, 0.36)};
    --mythic-global-197: ${(props) => alpha(props.theme.palette.warning.main, 0.36)};
    --mythic-global-198: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.secondary, 0.76)};
    --mythic-global-199: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.14 : 0.07)};
    --mythic-global-200: ${(props) => alpha(props.theme.palette.info.main, 0.42)};
    --mythic-global-201: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.18 : 0.09)};
    --mythic-global-202: ${(props) => alpha(props.theme.palette.primary.main, 0.34)};
    --mythic-global-203: ${(props) => alpha(props.theme.palette.success.main, 0.4)};
    --mythic-global-204: ${(props) => alpha(props.theme.palette.warning.main, 0.42)};
    --mythic-global-205: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)"};
    --mythic-global-206: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.42 : 0.3)};
    --mythic-global-207: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.025)"};
    --mythic-global-208: ${(props) => props.theme.outputBackgroundColor};
    --mythic-global-209: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.26 : 0.18)};
    --mythic-global-210: ${(props) => alpha(props.theme.outputBackgroundColor || props.theme.palette.background.paper, props.theme.palette.mode === "dark" ? 0.86 : 0.72)};
    --mythic-global-211: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.2 : 0.16)};
    --mythic-global-212: ${(props) => props.theme.outputTextColor};
    --mythic-global-213: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.1 : 0.07)};
    --mythic-global-214: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.24 : 0.2)};
    --mythic-global-215: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.48 : 0.34)};
    --mythic-global-216: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.08 : 0.05)};
    --mythic-global-217: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.18 : 0.14)};
    --mythic-global-218: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, 0.72)};
    --mythic-global-219: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.12 : 0.08)};
    --mythic-global-220: ${(props) => props.theme.outputTextColor || props.theme.palette.text.primary};
    --mythic-global-221: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.2 : 0.13)};
    --mythic-global-222: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.28 : 0.2)};
    --mythic-global-223: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, 0.58)};
    --mythic-global-224: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, 0.7)};
    --mythic-global-225: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.18 : 0.12)};
    --mythic-global-226: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.38 : 0.28)};
    --mythic-global-227: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.34 : 0.24)};
    --mythic-global-228: ${(props) => alpha(props.theme.outputTextColor || props.theme.palette.text.primary, 0.82)};
    --mythic-global-229: ${(props) => props.theme.table?.selected || props.theme.selectedCallbackColor + "CC"};
    --mythic-global-230: ${(props) => props.theme.table?.selectedHierarchy || props.theme.selectedCallbackHierarchyColor + "CC"};
    --mythic-global-231: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.018)"};
    --mythic-global-232: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.028)" : "rgba(0,0,0,0.012)"};
    --mythic-global-233: ${(props) => props.theme.palette.success.main + "2b"};
    --mythic-global-234: ${(props) => props.theme.palette.success.main + "88"};
    --mythic-global-235: ${(props) => props.theme.palette.primary.main + "18"};
    --mythic-global-236: ${(props) => props.theme.palette.primary.main + "55"};
    --mythic-global-237: ${(props) => props.theme.palette.primary.main + "22"};
    --mythic-global-238: ${(props) => props.theme.palette.primary.main + "77"};
    --mythic-global-239: ${(props) => props.theme.palette.primary.main + "16"};
    --mythic-global-240: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.58 : 0.42)};
    --mythic-global-241: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.58 : 0.42)};
    --mythic-global-242: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.035)" : "rgba(15,23,42,0.025)"};
    --mythic-global-243: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.34 : 0.24)};
    --mythic-global-244: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.38 : 0.24)};
    --mythic-global-245: ${(props) => Math.max(4, props.theme.shape.borderRadius - 1)}px;
    --mythic-global-246: ${(props) => props.theme.palette.info.contrastText};
    --mythic-global-247: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.13 : 0.07)};
    --mythic-global-248: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.46 : 0.28)};
    --mythic-global-249: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.62 : 0.42)};
    --mythic-global-250: ${(props) => props.theme.pageHeader.main};
    --mythic-global-251: ${(props) => alpha(getSectionHeaderAccent(props), props.theme.palette.mode === "dark" ? 0.55 : 0.38)};
    --mythic-global-252: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.22)};
    --mythic-global-253: ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.28 : 0.12)};
    --mythic-global-254: ${(props) => (props.theme.pageHeaderText?.main || props.theme.palette.text.primary) + "1a"};
    --mythic-global-255: ${(props) => (props.theme.pageHeaderText?.main || props.theme.palette.text.primary) + "3d"};
    --mythic-global-256: ${(props) => (props.theme.pageHeaderText?.main || props.theme.palette.text.primary) + "29"};
    --mythic-global-257: ${(props) => (props.theme.pageHeaderText?.main || props.theme.palette.text.primary) + "6b"};
    --mythic-global-258: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"};
    --mythic-global-259: ${(props) => props.theme.palette.primary.main + "1f"};
    --mythic-global-260: ${(props) => props.theme.palette.primary.main + "88"};
    --mythic-global-261: ${(props) => props.theme.palette.mode === "dark" ? "0 12px 28px rgba(0,0,0,0.32)" : "0 12px 28px rgba(15,23,42,0.14)"};
    --mythic-global-262: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.018)"};
    --mythic-global-263: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"};
    --mythic-global-264: ${(props) => props.theme.palette.info.main + "12"};
    --mythic-global-265: ${(props) => props.theme.palette.info.main + "40"};
    --mythic-global-266: ${(props) => props.theme.palette.mode === "dark" ? "rgba(0,0,0,0.36)" : "rgba(15,23,42,0.06)"};
    --mythic-global-267: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.035)"};
    --mythic-global-268: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.15 : 0.08)};
    --mythic-global-269: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.34 : 0.22)};
    --mythic-global-270: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.012)"};
    --mythic-global-271: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.14 : 0.08)};
    --mythic-global-272: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.34 : 0.24)};
    --mythic-global-273: ${(props) => props.theme.palette.primary.contrastText};
    --mythic-global-274: ${(props) => props.theme.palette.primary.dark || props.theme.palette.primary.main};
    --mythic-global-275: ${(props) => props.theme.palette.warning.main + "22"};
    --mythic-global-276: ${(props) => props.theme.palette.warning.main + "88"};
    --mythic-global-277: ${(props) => props.theme.palette.error.main + "22"};
    --mythic-global-278: ${(props) => props.theme.palette.error.main + "99"};
    --mythic-global-279: ${(props) => props.theme.palette.info.main + "1c"};
    --mythic-global-280: ${(props) => props.theme.palette.info.main + "66"};
    --mythic-global-281: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"};
    --mythic-global-282: ${(props) => props.theme.surfaces?.muted || alpha(props.theme.palette.text.primary, props.theme.palette.mode === "dark" ? 0.045 : 0.035)};
    --mythic-global-283: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.13 : 0.075)};
    --mythic-global-284: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.44 : 0.32)};
    --mythic-global-285: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.28 : 0.18)};
    --mythic-global-286: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.06) : alpha(props.theme.palette.common.black, 0.035)};
    --mythic-global-287: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.014)"};
    --mythic-global-288: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.14 : 0.08)};
    --mythic-global-289: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.5 : 0.32)};
    --mythic-global-290: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.03)"};
    --mythic-global-291: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.2 : 0.1)};
    --mythic-global-292: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.58 : 0.38)};
    --mythic-global-293: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.4 : 0.26)};
    --mythic-global-294: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.54 : 0.34)};
    --mythic-global-295: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.54 : 0.34)};
    --mythic-global-296: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.54 : 0.34)};
    --mythic-global-297: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.45 : 0.3)};
    --mythic-global-298: ${(props) => props.theme.palette.mode === "dark" ? "rgba(0,0,0,0.26)" : "rgba(15,23,42,0.045)"};
    --mythic-global-299: ${(props) => props.theme.palette.mode === "dark" ? "none" : "0 8px 18px rgba(15, 23, 42, 0.04)"};
    --mythic-global-300: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.22 : 0.1)};
    --mythic-global-301: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.45 : 0.32)};
    --mythic-global-302: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.1) : alpha(props.theme.palette.common.black, 0.08)};
    --mythic-global-303: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.5 : 0.32)};
    --mythic-global-304: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.black, 0.18) : alpha(props.theme.palette.common.white, 0.62)};
    --mythic-global-305: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.012)"};
    --mythic-global-306: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.045) : alpha(props.theme.palette.common.black, 0.028)};
    --mythic-global-307: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.24 : 0.12)};
    --mythic-global-308: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.62 : 0.42)};
    --mythic-global-309: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.055) : alpha(props.theme.palette.common.black, 0.028)};
    --mythic-global-310: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.error.main, 0.14) : alpha(props.theme.palette.error.main, 0.08)};
    --mythic-global-311: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.45 : 0.28)};
    --mythic-global-312: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.72 : 0.48)};
    --mythic-global-313: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.5 : 0.35)};
    --mythic-global-314: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.56 : 0.4)};
    --mythic-global-315: ${(props) => props.theme.palette.mode === "dark" ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "0 1px 2px rgba(15,23,42,0.06)"};
    --mythic-global-316: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.34 : 0.24)};
    --mythic-global-317: ${(props) => props.theme.palette.mode === "dark" ? `inset 0 1px 0 ${alpha(props.theme.palette.common.white, 0.055)}, 0 8px 18px ${alpha(props.theme.palette.common.black, 0.18)}` : `0 8px 18px ${alpha(props.theme.palette.common.black, 0.08)}`};
    --mythic-global-318: ${(props) => props.theme.surfaces?.muted || props.theme.palette.background.default};
    --mythic-global-319: ${(props) => alpha(getSectionHeaderAccent(props), props.theme.palette.mode === "dark" ? 0.34 : 0.2)};
    --mythic-global-320: ${(props) => props.theme.palette.info.main + "2b"};
    --mythic-global-321: ${(props) => props.theme.palette.info.main + "88"};
    --mythic-global-322: ${(props) => props.theme.palette.error.main + "2b"};
    --mythic-global-323: ${(props) => props.theme.palette.error.main + "88"};
    --mythic-global-324: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.028) : alpha(props.theme.palette.common.black, 0.014)};
    --mythic-global-325: ${getSubtleAccentGradient};
    --mythic-global-326: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.03) : alpha(props.theme.palette.common.black, 0.018)};
    --mythic-global-327: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.018) : alpha(props.theme.palette.common.black, 0.01)};
    --mythic-global-328: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.035) : alpha(props.theme.palette.common.black, 0.025)};
    --mythic-global-329: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.52 : 0.34)};
    --mythic-global-330: ${(props) => alpha(props.theme.palette.info.main, props.theme.palette.mode === "dark" ? 0.22 : 0.12)};
    --mythic-global-331: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.22 : 0.12)};
    --mythic-global-332: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.52 : 0.34)};
    --mythic-global-333: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.24 : 0.14)};
    --mythic-global-334: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.52 : 0.34)};
    --mythic-global-335: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.22 : 0.12)};
    --mythic-global-336: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.52 : 0.34)};
    --mythic-global-337: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.045) : alpha(props.theme.palette.common.black, 0.025)};
    --mythic-global-338: ${(props) => props.theme.pageHeader?.main || props.theme.surfaces?.muted || props.theme.palette.background.paper};
    --mythic-global-339: ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.24 : 0.1)};
    --mythic-global-340: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.1)};
    --mythic-global-341: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.16)};
    --mythic-global-342: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.42)};
    --mythic-global-343: ${(props) => props.theme.palette.mode === "dark" ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "0 1px 2px rgba(15,23,42,0.05)"};
    --mythic-global-344: ${(props) => props.theme.palette.primary.main + "10"};
    --mythic-global-345: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.5 : 0.34)};
    --mythic-global-346: ${(props) => alpha(props.theme.palette.primary.main, props.theme.palette.mode === "dark" ? 0.68 : 0.48)};
    --mythic-global-347: ${(props) => props.theme.palette.primary.main + "45"};
    --mythic-global-348: ${(props) => props.theme.palette.mode === "dark" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)"};
    --mythic-global-349: ${(props) => props.theme.palette.mode === "dark" ? "0 12px 28px rgba(0,0,0,0.35)" : "0 12px 28px rgba(15,23,42,0.14)"};
    --mythic-global-350: ${(props) => props.theme.palette.warning.main + "2b"};
    --mythic-global-351: ${(props) => props.theme.palette.success.main + "1c"};
    --mythic-global-352: ${(props) => props.theme.palette.success.main + "66"};
    --mythic-global-353: ${(props) => props.theme.palette.error.main + "1c"};
    --mythic-global-354: ${(props) => props.theme.palette.error.main + "66"};
    --mythic-global-355: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.035)"};
    --mythic-global-356: ${(props) => props.theme.typography.fontFamilyMonospace || "monospace"};
    --mythic-global-357: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.028)"};
    --mythic-global-358: ${(props) => props.theme.palette.primary.main + "38"};
    --mythic-global-359: ${(props) => props.theme.tableHover};
    --mythic-global-360: ${(props) => props.theme.palette.primary.main + "44"};
    --mythic-global-361: ${(props) => props.theme.palette.primary.main + "66"};
    --mythic-global-362: ${(props) => props.theme.palette.action.disabled};
    --mythic-global-363: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"};
    --mythic-global-364: ${(props) => props.theme.palette.action.disabledBackground};
    --mythic-global-365: ${(props) => props.theme.palette.info.main + "35"};
    --mythic-global-366: ${(props) => props.theme.palette.error.main + "18"};
    --mythic-global-367: ${(props) => props.theme.palette.info.main + "14"};
    --mythic-global-368: ${(props) => props.theme.palette.info.main + "45"};
    --mythic-global-369: ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.18 : 0.06)};
    --mythic-global-370: ${(props) => props.theme.palette.warning.main + "16"};
    --mythic-global-371: ${(props) => props.theme.palette.warning.main + "45"};
    --mythic-global-372: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.026)" : "rgba(0,0,0,0.018)"};
    --mythic-global-373: ${(props) => props.theme.palette.info.main + "10"};
    --mythic-global-374: ${(props) => props.theme.palette.info.main + "2f"};
    --mythic-global-375: ${getSubtleAccentHorizontalGradient};
    --mythic-global-376: ${(props) => props.theme.palette.mode === "dark" ? "inset 0 1px 0 rgba(255,255,255,0.055)" : "inset 0 1px 0 rgba(255,255,255,0.78)"};
    --mythic-global-377: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.055) : alpha(props.theme.palette.common.black, 0.035)};
    --mythic-global-378: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.26 : 0.16)};
    --mythic-global-379: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.66 : 0.48)};
    --mythic-global-380: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.28 : 0.18)};
    --mythic-global-381: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.68 : 0.5)};
    --mythic-global-382: ${(props) => alpha(props.theme.palette.common.black, props.theme.palette.mode === "dark" ? 0.24 : 0.09)};
    --mythic-global-383: ${(props) => props.theme.palette.success.main + "55"};
    --mythic-global-384: ${(props) => props.theme.palette.info.main + "55"};
    --mythic-global-385: ${(props) => props.theme.palette.warning.main + "60"};
    --mythic-global-386: ${(props) => alpha(props.theme.palette.text.secondary, 0.35)};
    --mythic-global-387: ${(props) => props.theme.palette.info.main + "16"};
    --mythic-global-388: ${(props) => props.theme.palette.success.main + "16"};
    --mythic-global-389: ${(props) => props.theme.palette.success.main + "45"};
    --mythic-global-390: ${(props) => props.theme.palette.error.main + "16"};
    --mythic-global-391: ${(props) => props.theme.palette.error.main + "50"};
    --mythic-global-392: ${(props) => props.theme.palette.warning.main + "18"};
    --mythic-global-393: ${(props) => props.theme.palette.warning.main + "52"};
    --mythic-global-394: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)"};
    --mythic-global-395: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.01)"};
    --mythic-global-396: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.012)"};
    --mythic-global-397: ${(props) => props.theme.palette.mode === "dark" ? "rgba(0,0,0,0.24)" : "rgba(255,255,255,0.72)"};
    --mythic-global-398: ${(props) => props.theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"};
    --mythic-global-399: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.055) : alpha(props.theme.palette.common.black, 0.04)};
    --mythic-global-400: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.035) : alpha(props.theme.palette.common.black, 0.022)};
    --mythic-global-401: ${(props) => props.theme.pageHeader?.main || props.theme.palette.background.contrast};
    --mythic-global-402: ${(props) => alpha(props.theme.palette.success.main, props.theme.palette.mode === "dark" ? 0.14 : 0.1)};
    --mythic-global-403: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.16 : 0.12)};
    --mythic-global-404: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.16 : 0.1)};
    --mythic-global-405: ${(props) => alpha(props.theme.palette.text.secondary, 0.55)};
    --mythic-global-406: ${(props) => props.theme.palette.mode === "dark" ? alpha(props.theme.palette.common.white, 0.085) : alpha(props.theme.palette.common.black, 0.052)};
    --mythic-global-407: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.58 : 0.4)};
    --mythic-global-408: ${(props) => alpha(props.theme.palette.error.main, props.theme.palette.mode === "dark" ? 0.56 : 0.38)};
    --mythic-global-409: ${(props) => props.theme.table?.header || props.theme.tableHeader};
    --mythic-global-410: ${(props) => alpha(props.theme.palette.background.paper, props.theme.palette.mode === "dark" ? 0.72 : 0.86)};
    --mythic-global-411: ${(props) => alpha(props.theme.pageHeaderText?.main || props.theme.palette.text.primary, 0.18)};
    --mythic-global-412: ${(props) => props.theme.pageHeader?.main || props.theme.palette.background.paper};
    --mythic-global-413: ${getSoftBorderColor};
    --mythic-global-414: ${(props) => props.theme.palette.action.selected};
    --mythic-global-415: ${(props) => `linear-gradient(135deg, ${alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.34 : 0.24)} 0%, ${alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.18 : 0.12)} 58%, ${alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.08 : 0.06)} 100%)`};
    --mythic-global-416: ${(props) => alpha(props.theme.palette.warning.main, props.theme.palette.mode === "dark" ? 0.36 : 0.28)};
    --mythic-global-417: ${(props) => props.theme.palette.action.hover};
    --mythic-global-418: ${(props) => props.theme.outputBackgroundColor + "20"};
}
`;

export const GlobalStyles = createGlobalStyle`
body {
    margin: 0;
    background-color: var(--mythic-global-001);
    color: var(--mythic-global-002);
    font-family: var(--mythic-global-003);
}
html, body, #root {
    height: 100%;
    width: 100%;
    color-scheme: light dark;
}
* {
    box-sizing: border-box;
}
::selection {
    background-color: var(--mythic-global-004);
}
* {
    scrollbar-color: var(--mythic-global-005) transparent;
    scrollbar-width: thin;
}
*::-webkit-scrollbar {
    height: 10px;
    width: 10px;
}
*::-webkit-scrollbar-thumb {
    background-color: var(--mythic-global-005);
    border: 3px solid transparent;
    border-radius: 999px;
    background-clip: padding-box;
}
*::-webkit-scrollbar-track {
    background: transparent;
}
@media screen and (max-width: 1100px) {
    .hideOnSmallWidth {
        display: none;
    }
}
.MuiAccordion-root {
    border: 0px !important;
}
.MuiAccordionDetails-root{
    padding-bottom: 0;
    padding-top: 0;
}
.MuiAccordionSummary-content.Mui-expanded{
    margin: 0px 0px 0px 0px !important;
    min-height: unset;
}
.MuiAccordionSummary-root.Mui-expanded{
    min-height: unset;
}
// placeholder/helper text for input boxes
.MuiFormLabel-root {
    background: transparent;
}
.MuiTableCell-head {
    background-color: var(--mythic-global-006) !important;
    color: var(--mythic-global-002);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
    border-top: 0;
    border-bottom: 1px solid var(--mythic-global-007);
}
.MuiTableContainer-root.mythicElement {
    border: 1px solid var(--mythic-global-007);
    border-radius: var(--mythic-global-008);
    background-color: var(--mythic-global-009);
    min-height: 0;
}
.MuiTableContainer-root.mythicElement .MuiTableContainer-root.mythicElement {
    border-color: var(--mythic-global-010);
}
.MuiTableBody-root > .MuiTableRow-root:nth-of-type(even):not(.Mui-selected):not(.selectedCallback):not(.selectedCallbackHierarchy) {
  background-color:  var(--mythic-global-011);
}
.alternateRow {
    background-color:  var(--mythic-global-011);
}
.MythicResizableGridRowHighlight {
  background-color:  var(--mythic-global-011);
} 
.MuiTableRow-hover {
    &:hover,
    &--hovered {
        background-color: var(--mythic-global-012) !important;
        color: var(--mythic-global-002) !important;
    }
}

.MuiSelect-select.MuiSelect-select{
    padding-left: 10px
}
.MuiListItem-root {
    &:hover,
    &--hovered {
        background-color: var(--mythic-global-013) !important;
        color: var(--mythic-global-002) !important;
    }
}
.menuEntry {
  cursor: pointer;
}

tspan {
  font-size: 15px;
  stroke: none;
}
.mythic-navigation-icon {
    color: var(--mythic-nav-icon) !important;
}
.mythic-navigation-warning-icon {
    color: var(--mythic-warning-main) !important;
}
.mythic-navigation-muted-text {
    color: var(--mythic-nav-muted);
}
.mythic-navigation-action-text {
    color: var(--mythic-nav-text) !important;
}

.MuiTab-root {
    min-height: unset;
    max-width: unset;
}
.MuiTooltip-tooltip {
    background-color: var(--mythic-global-014);
    color: var(--mythic-global-015);
    box-shadow: var(--mythic-global-016);
    font-size: 13px;
}
.MuiTooltip-arrow {
    color: var(--mythic-global-014);
}
.MuiTreeItem-root.Mui-selected > .MuiTreeItem-content .MuiTreeItem-label{
    background-color: transparent;
}
.MuiTreeItem-root.Mui-selected:hover > .MuiTreeItem-content .MuiTreeItem-label{
    background-color: transparent;
}
.MuiTreeItem-root:hover > .MuiTreeItem-content .MuiTreeItem-label {
    background-color: transparent;
}
.MuiAppBar-root{
    z-index: 1
}
.ace-monokai .ace_invalid {
    color: #F8F8F0;
    background-color: #52524d;
}
.ace_gutter, .ace_scrollbar {
    z-index: 0 !important
}
.gutter {
  background-color: var(--mythic-global-005);
  background-repeat: no-repeat;
  background-position: 50%;
}

.gutter.gutter-horizontal {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');
  cursor: col-resize;
  width: 5px !important;
}

.gutter.gutter-vertical {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=');
  cursor: row-resize;
  height: 5px !important;
}
.resizer {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 5px;
  background: rgba(0, 0, 0, 0.5);
  cursor: col-resize;
  user-select: none;
  touch-action: none;
}

.resizer.isResizing {
  background: var(--mythic-global-017);
  opacity: 1;
}
.groupNode {
    border: 1px solid var(--mythic-global-005);
    padding: 5px;
    border-radius: 5px;
    background: var(--mythic-global-018) !important;
}
.groupEventNode {
    border: 1px solid var(--mythic-global-005);
    padding: 2px;
    border-radius: 5px;
    background: var(--mythic-global-018) !important;
}
.circleImageNode {
     height: 50px;
     display: block;
     border-radius: 0%;
}
.react-flow__edge-path, .react-flow__edge-text, .react-flow__edge-textbg, .react-flow__edge, .react-flow__edges {
   z-index: -1 !important;
}
.context-menu {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-005);
    border-radius: var(--mythic-global-019);
    box-shadow: var(--mythic-global-020);
    position: absolute;
    z-index: 10;
}
.context-menu-button {
    border: none;
    display: block;
    padding: 0.5em;
    text-align: left;
    width: 100%;
    background-color: var(--mythic-global-009);
    color: unset;
}
.mythic-graph-context-menu.context-menu {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 11rem;
    padding: 0.25rem;
    z-index: 1400;
}
.mythic-graph-context-menu .mythic-graph-context-menu-button.MuiButton-root {
    align-items: center;
    background-color: transparent !important;
    border: 1px solid transparent !important;
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002) !important;
    display: flex;
    font-size: 0.76rem;
    font-weight: 750;
    justify-content: flex-start;
    min-height: 30px;
    padding: 0.38rem 0.5rem;
    text-align: left;
    text-transform: none;
}
.mythic-graph-context-menu .mythic-graph-context-menu-button.MuiButton-root:hover {
    background-color: var(--mythic-global-021) !important;
    border-color: var(--mythic-global-022) !important;
    color: var(--mythic-global-023) !important;
}
.mythic-graph-canvas .react-flow__controls {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: 0 6px 18px var(--mythic-global-024) !important;
    overflow: hidden;
}
.mythic-graph-canvas .react-flow__controls-button {
    background-color: var(--mythic-global-009);
    border-bottom-color: var(--mythic-global-010);
    color: var(--mythic-global-025);
}
.mythic-graph-canvas .react-flow__controls-button:hover {
    background-color: var(--mythic-global-026);
    color: var(--mythic-global-027);
}
.mythic-graph-canvas .react-flow__controls-button svg {
    color: inherit;
}
.mythic-graph-canvas .react-flow__minimap {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: 0 6px 18px var(--mythic-global-024);
    overflow: hidden;
}
.mythic-graph-empty-state {
    align-items: center;
    background: var(--mythic-global-028);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    height: 100%;
    justify-content: center;
    min-height: 12rem;
    padding: 1.25rem;
    text-align: center;
    width: 100%;
}
.mythic-graph-empty-title.MuiTypography-root {
    color: var(--mythic-global-002);
    font-size: 1rem;
    font-weight: 850;
}
.mythic-graph-empty-description.MuiTypography-root {
    color: var(--mythic-global-025);
    font-size: 0.8rem;
}
.mythic-graph-empty-action.MuiButton-root {
    background-color: var(--mythic-global-029) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008);
    box-shadow: none !important;
    color: var(--mythic-global-002) !important;
    font-size: 0.76rem;
    font-weight: 750;
    margin-top: 0.35rem;
    min-height: 30px;
    text-transform: none;
}
.mythic-graph-empty-action.MuiButton-root:hover {
    background-color: var(--mythic-global-021) !important;
    border-color: var(--mythic-global-022) !important;
    color: var(--mythic-global-023) !important;
}
.mythic-callback-graph-options {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    margin: 0.65rem;
    max-width: min(44rem, calc(100vw - 3rem));
    min-width: min(28rem, calc(100vw - 3rem));
}
.mythic-callback-graph-options-toggle.MuiButton-root,
.mythic-callback-graph-option-button.MuiButton-root {
    background-color: var(--mythic-global-009) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008);
    box-shadow: 0 6px 18px var(--mythic-global-024) !important;
    color: var(--mythic-global-002) !important;
    font-size: 0.74rem;
    font-weight: 800;
    min-height: 30px;
    text-transform: none;
}
.mythic-callback-graph-options-toggle.MuiButton-root {
    align-self: flex-start;
}
.mythic-callback-graph-options-toggle.MuiButton-root:hover,
.mythic-callback-graph-option-button.MuiButton-root:hover {
    background-color: var(--mythic-global-026) !important;
    border-color: var(--mythic-global-030) !important;
    color: var(--mythic-global-027) !important;
}
.mythic-callback-graph-options-panel {
    background-color: var(--mythic-global-031);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: 0 12px 32px var(--mythic-global-032);
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    min-width: 0;
    padding: 0.65rem;
}
.mythic-callback-graph-options-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    min-width: 0;
}
.mythic-callback-graph-option-button.MuiButton-root {
    box-shadow: none !important;
}
.mythic-callback-graph-option-button-active.MuiButton-root {
    background-color: var(--mythic-global-033) !important;
    border-color: var(--mythic-global-034) !important;
    color: var(--mythic-global-035) !important;
}
.mythic-callback-graph-option-button-warning.MuiButton-root {
    background-color: var(--mythic-global-036) !important;
    border-color: var(--mythic-global-037) !important;
    color: var(--mythic-global-038) !important;
}
.mythic-callback-graph-options-fields {
    display: grid;
    gap: 0.65rem;
    grid-template-columns: minmax(12rem, 0.8fr) minmax(18rem, 1.4fr);
    min-width: 0;
}
.mythic-callback-graph-options-field.MuiFormControl-root {
    background-color: var(--mythic-global-009);
    min-width: 0;
}
.mythic-callback-graph-options-field .MuiInputBase-root {
    min-height: 38px;
}
.mythic-callback-graph-options-warning {
    background-color: var(--mythic-global-039);
    border: 1px solid var(--mythic-global-040);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-038);
    font-size: 0.74rem;
    font-weight: 780;
    padding: 0.45rem 0.55rem;
}
@media (max-width: 760px) {
    .mythic-callback-graph-options {
        min-width: min(20rem, calc(100vw - 2rem));
    }
    .mythic-callback-graph-options-fields {
        grid-template-columns: minmax(0, 1fr);
    }
}

.selectedTask {
    background-color: var(--mythic-global-041) !important;
}
.mythic-file-browser-tableTop {
    background-color: var(--mythic-global-031);
    border-bottom: 1px solid var(--mythic-global-010);
    padding: 0.45rem 0.55rem 0.4rem;
}
.mythic-file-browser-pathInput.MuiInputBase-root {
    background-color: var(--mythic-global-009);
}
.mythic-file-browser-pathInput.MuiInputBase-root.MuiOutlinedInput-adornedStart {
    padding-left: 0.22rem;
}
.mythic-file-browser-pathInput.MuiInputBase-root.MuiOutlinedInput-adornedEnd {
    padding-right: 0.22rem;
}
.mythic-file-browser-pathInput .MuiInputBase-input {
    min-width: 8rem;
    padding-bottom: 10px;
    padding-top: 10px;
}
.mythic-file-browser-toolbarGroup {
    align-items: center;
    background-color: var(--mythic-global-042);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    flex: 0 0 auto;
    gap: 0.15rem;
    min-height: 32px;
    min-width: 0;
    padding: 0.12rem;
}
.mythic-file-browser-toolbarGroupStart {
    margin-right: 0.45rem;
}
.mythic-file-browser-toolbarGroupEnd {
    margin-left: 0.45rem;
}
.mythic-file-browser-tokenSelect {
    max-width: 12rem;
    min-width: 8.5rem;
    overflow: hidden;
}
.mythic-file-browser-tokenSelect .MuiInputBase-root,
.mythic-file-browser-tokenSelect .MuiSelect-select {
    font-size: 0.78rem;
    min-height: 0;
}
.mythic-file-browser-iconButton.MuiIconButton-root {
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    height: 28px;
    padding: 0;
    transition: background-color 120ms ease, color 120ms ease, opacity 120ms ease;
    width: 28px;
}
.mythic-file-browser-iconButton.MuiIconButton-root:hover {
    background-color: var(--mythic-global-043);
    color: var(--mythic-global-002);
}
.mythic-file-browser-iconButton.MuiIconButton-root.Mui-disabled {
    opacity: 0.42;
}
.mythic-file-browser-iconButton.mythic-file-browser-hoverInfo:hover {
    background-color: var(--mythic-global-044);
    color: var(--mythic-global-023);
}
.mythic-file-browser-iconButton.mythic-file-browser-hoverSuccess:hover {
    background-color: var(--mythic-global-045);
    color: var(--mythic-global-035);
}
.mythic-file-browser-iconButton.mythic-file-browser-hoverWarning:hover {
    background-color: var(--mythic-global-046);
    color: var(--mythic-global-038);
}
.mythic-file-browser-iconButton.mythic-file-browser-hoverError:hover {
    background-color: var(--mythic-global-047);
    color: var(--mythic-global-048);
}
.mythic-file-browser-iconButton.mythic-file-browser-activeSuccess {
    background-color: var(--mythic-global-049);
    color: var(--mythic-global-035);
}
.mythic-file-browser-iconButton.mythic-file-browser-activeWarning {
    background-color: var(--mythic-global-050);
    color: var(--mythic-global-038);
}
.mythic-file-browser-iconButton.mythic-file-browser-activeError {
    background-color: var(--mythic-global-051);
    color: var(--mythic-global-048);
}
.mythic-process-browser-tableTop {
    padding: 0.5rem 0.6rem;
}
.mythic-process-browser-toolbar {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    min-width: 0;
    width: 100%;
}
.mythic-process-browser-control {
    align-items: center;
    background-color: var(--mythic-global-042);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    gap: 0.35rem;
    min-height: 32px;
    min-width: 0;
    padding: 0.15rem 0.18rem 0.15rem 0.55rem;
}
.mythic-process-browser-controlGroup {
    flex: 1 1 18rem;
    max-width: 30rem;
}
.mythic-process-browser-controlHost {
    flex: 1 1 16rem;
    max-width: 28rem;
    padding-right: 0.35rem;
}
.mythic-process-browser-searchInput {
    flex: 2 1 24rem;
    min-width: 16rem !important;
}
.mythic-process-browser-searchInput .MuiInputBase-root {
    background-color: var(--mythic-global-009);
    font-size: 0.78rem;
    min-height: 32px;
}
.mythic-process-browser-searchInput .MuiInputBase-input {
    padding-bottom: 6px;
    padding-top: 6px;
}
.mythic-process-browser-searchInput .MuiInputAdornment-root {
    color: var(--mythic-global-025);
}
.mythic-process-browser-controlLabel {
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 750;
}
.mythic-process-browser-selectControl {
    flex: 1 1 auto;
    min-width: 8rem !important;
}
.mythic-process-browser-select.MuiInputBase-root {
    background-color: var(--mythic-global-009);
    font-size: 0.78rem;
    min-height: 28px;
}
.mythic-process-browser-select .MuiSelect-select {
    min-height: 0 !important;
    overflow: hidden;
    padding-bottom: 5px;
    padding-top: 5px;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-process-browser-actions {
    margin-left: auto;
}
.mythic-process-browser-table-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    position: relative;
    width: 100%;
}
.mythic-process-browser-grid-shell {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}
.mythic-process-summary-strip {
    align-items: center;
    background-color: var(--mythic-global-052);
    border-bottom: 1px solid var(--mythic-global-010);
    display: flex;
    flex: 0 0 auto;
    flex-wrap: nowrap;
    gap: 0.35rem;
    min-height: 34px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.35rem 0.6rem;
}
.mythic-process-summary-chip,
.mythic-process-indicator {
    align-items: center;
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 800;
    gap: 0.2rem;
    line-height: 1;
    max-width: 12rem;
    min-height: 20px;
    overflow: hidden;
    padding: 0.22rem 0.4rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-process-summary-chip-muted {
    opacity: 0.58;
}
.mythic-process-summary-chip-info,
.mythic-process-indicator-info {
    background-color: var(--mythic-global-053);
    border-color: var(--mythic-global-054);
    color: var(--mythic-global-023);
}
.mythic-process-summary-chip-warning,
.mythic-process-indicator-warning {
    background-color: var(--mythic-global-055);
    border-color: var(--mythic-global-056);
    color: var(--mythic-global-038);
}
.mythic-process-indicator-deleted {
    background-color: var(--mythic-global-057);
    border-color: var(--mythic-global-058);
    color: var(--mythic-global-048);
}
.mythic-process-indicator {
    font-size: 0.62rem;
    min-height: 18px;
    padding: 0.18rem 0.32rem;
}
.mythic-process-indicator svg {
    font-size: 0.78rem;
}
.mythic-process-match-chips {
    align-items: center;
    display: inline-flex;
    flex: 0 0 auto;
    gap: 0.18rem;
    min-width: 0;
}
.mythic-process-match-chip {
    align-items: center;
    background-color: var(--mythic-global-044);
    border: 1px solid var(--mythic-global-059);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-023);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.6rem;
    font-weight: 850;
    line-height: 1;
    min-height: 17px;
    padding: 0.16rem 0.28rem;
}
.mythic-process-match-chip-ancestor {
    background-color: var(--mythic-global-060);
    border-color: var(--mythic-global-010);
    color: var(--mythic-global-025);
}
.mythic-process-inspector {
    background-color: var(--mythic-global-061);
    border-top: 1px solid var(--mythic-global-010);
    box-shadow: var(--mythic-global-062);
    flex: 0 0 auto;
    min-width: 0;
    padding: 0.55rem 0.65rem 0.65rem;
}
.mythic-process-inspector-header {
    align-items: center;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-process-inspector-title {
    align-items: center;
    color: var(--mythic-global-002);
    display: flex;
    flex: 1 1 auto;
    font-size: 0.86rem;
    font-weight: 800;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-process-inspector-title > span:first-of-type {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-process-inspector-title svg {
    color: var(--mythic-global-025);
    flex: 0 0 auto;
}
.mythic-process-inspector-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 0.3rem;
}
.mythic-process-inspector-body {
    display: grid;
    gap: 0.65rem;
    grid-template-columns: minmax(22rem, 1.25fr) minmax(18rem, 1fr);
    margin-top: 0.5rem;
    min-width: 0;
}
.mythic-process-inspector-details {
    display: grid;
    gap: 0.35rem;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    min-width: 0;
}
.mythic-process-inspector-detail {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
    padding: 0.34rem 0.45rem;
}
.mythic-process-inspector-detailWide {
    grid-column: span 2;
}
.mythic-process-inspector-detail span {
    color: var(--mythic-global-025);
    display: block;
    font-size: 0.66rem;
    font-weight: 800;
    line-height: 1.1;
}
.mythic-process-inspector-detail strong {
    color: var(--mythic-global-002);
    display: block;
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.25;
    margin-top: 0.16rem;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-process-inspector-side {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
}
.mythic-process-inspector-tags {
    align-items: center;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    gap: 0.35rem;
    min-height: 32px;
    min-width: 0;
    overflow: hidden;
    padding: 0.28rem 0.35rem;
}
.mythic-process-inspector-tags .MuiIconButton-root {
    align-items: center !important;
    background-color: var(--mythic-global-063) !important;
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025) !important;
    display: inline-flex !important;
    flex: 0 0 auto;
    height: 22px;
    justify-content: center !important;
    padding: 0 !important;
    width: 22px;
}
.mythic-process-inspector-tags .MuiIconButton-root:hover {
    background-color: var(--mythic-global-064) !important;
    color: var(--mythic-global-027) !important;
}
.mythic-process-inspector-command {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    font-family: var(--mythic-global-065);
    font-size: 0.72rem;
    line-height: 1.35;
    max-height: 3.3rem;
    min-height: 2.1rem;
    overflow: auto;
    padding: 0.4rem 0.5rem;
    white-space: pre-wrap;
    word-break: break-word;
}
.mythic-credential-search {
    display: flex;
    flex: 1 1 auto;
    flex-direction: row;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}
.mythic-credential-search-results,
.mythic-credential-search-inspector {
    background-color: var(--mythic-global-061);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}
.mythic-credential-search > .gutter.gutter-horizontal {
    flex: 0 0 8px;
}
.mythic-credential-search-table-wrap {
    height: 100%;
    overflow: auto;
}
.mythic-credential-search-table {
    table-layout: fixed;
    width: 100%;
}
.mythic-credential-search-row {
    cursor: pointer;
}
.mythic-credential-search-row .MuiTableCell-root {
    border-bottom-color: var(--mythic-global-010);
    height: 3.45rem;
    max-height: 3.45rem;
    overflow: hidden;
    padding-bottom: 0.28rem;
    padding-top: 0.28rem;
    vertical-align: middle;
}
.mythic-credential-search-row-selected .MuiTableCell-root,
.mythic-credential-search-row.Mui-selected .MuiTableCell-root,
.mythic-credential-search-row.Mui-selected:hover .MuiTableCell-root {
    background-color: var(--mythic-global-063);
}
.mythic-credential-search-id-cell,
.mythic-credential-search-chip-list,
.mythic-credential-search-tag-summary {
    align-items: center;
    display: flex;
    gap: 0.25rem;
    min-width: 0;
}
.mythic-credential-search-id-cell,
.mythic-credential-search-chip-list {
    flex-wrap: wrap;
}
.mythic-credential-search-tag-summary {
    overflow: hidden;
}
.mythic-credential-search-tag-summary .mythic-tag-list {
    flex: 1 1 auto;
    max-width: 100%;
}
.mythic-credential-search-id {
    color: var(--mythic-global-002);
    font-family: var(--mythic-global-065);
    font-size: 0.78rem;
    font-weight: 850;
}
.mythic-credential-search-primary-cell {
    display: grid;
    gap: 0.14rem;
    min-width: 0;
}
.mythic-credential-search-primary-cell > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-credential-search-primary-cell > span:first-child {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    font-weight: 800;
}
.mythic-credential-search-primary-cell > span:nth-child(2),
.mythic-credential-search-muted,
.mythic-credential-search-source {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
}
.mythic-credential-search-row-flags {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
}
.mythic-credential-search-source {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-credential-search-mini-chip,
.mythic-credential-search-type-chip,
.mythic-credential-search-inline-chip {
    height: 19px !important;
    max-width: 100%;
}
.mythic-credential-search-mini-chip .MuiChip-label,
.mythic-credential-search-type-chip .MuiChip-label,
.mythic-credential-search-inline-chip .MuiChip-label {
    font-size: 0.66rem;
    font-weight: 750;
    line-height: 1;
    overflow: hidden;
    padding-left: 0.34rem;
    padding-right: 0.34rem;
    text-overflow: ellipsis;
}
.mythic-credential-search-inspector {
    display: flex;
    flex-direction: column;
}
.mythic-credential-search-inspector-empty {
    align-items: center;
    color: var(--mythic-global-025);
    gap: 0.45rem;
    justify-content: center;
    min-height: 14rem;
}
.mythic-credential-search-inspector-header {
    align-items: flex-start;
    border-bottom: 1px solid var(--mythic-global-010);
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
    padding: 0.65rem 0.75rem;
}
.mythic-credential-search-inspector-title {
    align-items: center;
    color: var(--mythic-global-002);
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    font-size: 0.92rem;
    font-weight: 850;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-credential-search-inspector-title svg {
    color: var(--mythic-global-025);
}
.mythic-credential-search-inspector-title > span:first-of-type {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-credential-search-inspector-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.3rem;
    justify-content: flex-end;
}
.mythic-credential-search-inspector-body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.55rem;
    min-height: 0;
    overflow: auto;
    padding: 0.65rem;
}
.mythic-credential-search-section {
    border-bottom: 1px solid var(--mythic-global-010);
    min-width: 0;
    padding-bottom: 0.55rem;
}
.mythic-credential-search-section:last-child {
    border-bottom: 0;
    padding-bottom: 0;
}
.mythic-credential-search-section-header {
    align-items: center;
    color: var(--mythic-global-025);
    display: flex;
    font-size: 0.69rem;
    font-weight: 850;
    gap: 0.5rem;
    justify-content: space-between;
    letter-spacing: 0;
    margin-bottom: 0.38rem;
    min-width: 0;
    text-transform: uppercase;
}
.mythic-credential-search-section-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 0.25rem;
}
.mythic-credential-search-section-body {
    display: grid;
    gap: 0.35rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
}
.mythic-credential-search-section-chips,
.mythic-credential-search-empty-value,
.mythic-credential-search-metadata-grid,
.mythic-credential-search-warning-list,
.mythic-credential-search-secret-row,
.mythic-credential-search-comment,
.mythic-credential-search-tags {
    grid-column: 1 / -1;
}
.mythic-credential-search-detail,
.mythic-credential-search-metadata-pair {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
    padding: 0.38rem 0.48rem;
}
.mythic-credential-search-detail-wide {
    grid-column: 1 / -1;
}
.mythic-credential-search-detail > span,
.mythic-credential-search-metadata-pair > span {
    color: var(--mythic-global-025);
    display: block;
    font-size: 0.66rem;
    font-weight: 800;
    line-height: 1.1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-credential-search-detail strong,
.mythic-credential-search-metadata-pair strong {
    color: var(--mythic-global-002);
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1.25;
    margin-top: 0.18rem;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-credential-search-detail-value-row {
    align-items: center;
    display: grid;
    gap: 0.35rem;
    grid-template-columns: minmax(0, 1fr) auto;
    margin-top: 0.18rem;
    min-width: 0;
}
.mythic-credential-search-detail-value-row strong {
    margin-top: 0;
}
.mythic-credential-search-detail-action {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
}
.mythic-credential-search-detail .mythic-credential-search-inline-chip {
    margin-top: 0.28rem;
}
.mythic-credential-search-code,
.mythic-credential-search-secret,
.mythic-credential-search-metadata-pair strong,
.mythic-credential-search-nested-metadata {
    font-family: var(--mythic-global-065);
}
.mythic-credential-search-metadata-grid {
    display: grid;
    gap: 0.35rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
}
.mythic-credential-search-nested-metadata {
    display: grid;
    gap: 0.16rem;
    min-width: 0;
    white-space: normal;
}
.mythic-credential-search-nested-metadata > div {
    display: grid;
    gap: 0.25rem;
    grid-template-columns: minmax(4rem, auto) minmax(0, 1fr);
    min-width: 0;
}
.mythic-credential-search-nested-metadata span {
    color: var(--mythic-global-025);
    font-size: 0.66rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-credential-search-nested-metadata strong {
    font-size: 0.66rem;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-credential-search-warning-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    min-width: 0;
}
.mythic-credential-search-warning-chip {
    height: 20px !important;
    max-width: 100%;
}
.mythic-credential-search-warning-chip .MuiChip-label {
    font-size: 0.66rem;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-credential-search-secret,
.mythic-credential-search-comment {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    font-size: 0.74rem;
    line-height: 1.35;
    max-height: 8rem;
    min-height: 2rem;
    min-width: 0;
    overflow: auto;
    padding: 0.45rem 0.55rem;
    white-space: pre-wrap;
    word-break: break-word;
}
.mythic-credential-search-secret-row {
    align-items: flex-start;
    display: grid;
    gap: 0.35rem;
    grid-template-columns: minmax(0, 1fr) auto;
    min-width: 0;
}
.mythic-credential-search-field-action.MuiIconButton-root,
.mythic-credential-search-secret-copy.MuiIconButton-root {
    flex: 0 0 auto;
    height: 22px !important;
    margin-top: 0;
    width: 22px !important;
}
.mythic-credential-search-comment {
    color: var(--mythic-global-025);
    font-family: inherit;
}
.mythic-credential-search-tags {
    align-items: center;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    gap: 0.35rem;
    min-height: 34px;
    min-width: 0;
    overflow: hidden;
    padding: 0.3rem 0.4rem;
}
.mythic-credential-search-tags .MuiIconButton-root {
    align-items: center !important;
    background-color: var(--mythic-global-063) !important;
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025) !important;
    display: inline-flex !important;
    flex: 0 0 auto;
    height: 22px;
    justify-content: center !important;
    padding: 0 !important;
    width: 22px;
}
.mythic-credential-search-tags .MuiIconButton-root:hover {
    background-color: var(--mythic-global-064) !important;
    color: var(--mythic-global-027) !important;
}
.mythic-process-name-cell,
.mythic-process-string-cell {
    align-items: center;
    display: flex;
    height: 100%;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-process-name-cell {
    gap: 0.25rem;
}
.mythic-process-row-deleted {
    color: var(--mythic-global-066);
    text-decoration: line-through;
}
.mythic-process-indent {
    flex: 0 0 auto;
    height: 1px;
}
.mythic-process-expand-button.MuiIconButton-root {
    align-items: center;
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    flex: 0 0 auto;
    height: 22px;
    justify-content: center;
    padding: 0;
    transition: background-color 120ms ease, color 120ms ease;
    width: 22px;
}
.mythic-process-expand-button.MuiIconButton-root:hover {
    background-color: var(--mythic-global-064);
    color: var(--mythic-global-027);
}
.mythic-process-expand-spacer {
    flex: 0 0 22px;
    height: 22px;
}
.mythic-process-name-icon {
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    opacity: 0.85;
}
.mythic-process-name-text,
.mythic-process-string-cell {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1 1 auto;
}
.mythic-process-name-text {
    min-width: 0;
}
.mythic-process-string-cell {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    padding-left: 0.25rem;
    padding-right: 0.25rem;
}
.mythic-tag-cell {
    align-items: center;
    display: flex;
    gap: 0.35rem;
    min-width: 0;
    overflow: hidden;
}
.mythic-tag-cell-fill {
    height: 100%;
    width: 100%;
}
.mythic-tag-cell .MuiIconButton-root {
    align-items: center !important;
    background-color: var(--mythic-global-063) !important;
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025) !important;
    display: inline-flex !important;
    flex: 0 0 auto;
    float: none !important;
    height: 22px;
    justify-content: center !important;
    padding: 0 !important;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 22px;
}
.mythic-tag-cell .MuiIconButton-root:hover {
    background-color: var(--mythic-global-064) !important;
    border-color: var(--mythic-global-067);
    color: var(--mythic-global-027) !important;
}
.mythic-tag-cell .MuiIconButton-root svg {
    font-size: 0.92rem;
}
.mythic-tag-list {
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    flex-wrap: nowrap;
    gap: 0.2rem;
    min-width: 0;
    overflow: hidden;
}
.mythic-tag-list .MuiChip-root {
    flex: 0 0 auto;
    float: none !important;
    height: 18px !important;
    max-width: 5.5rem;
}
.mythic-tag-list .MuiChip-label {
    font-size: 0.68rem;
    font-weight: 800;
    padding-left: 0.35rem;
    padding-right: 0.35rem;
    text-overflow: ellipsis;
}
.mythic-tag-list-truncate .MuiChip-label {
    min-width: 0;
    overflow: hidden !important;
}
.mythic-process-action-button.MuiIconButton-root {
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    height: 24px;
    padding: 0;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 24px;
}
.mythic-process-action-button.MuiIconButton-root:hover,
.mythic-process-action-button.MuiIconButton-root[aria-expanded="true"] {
    background-color: var(--mythic-global-044);
    border-color: var(--mythic-global-068);
    color: var(--mythic-global-023);
}
.mythic-process-menu-icon {
    align-items: center;
    color: var(--mythic-global-025);
    display: inline-flex;
    flex: 0 0 1.25rem;
    justify-content: center;
    margin-right: 0.45rem;
}
.mythic-process-menu-icon svg,
.mythic-process-menu-icon .svg-inline--fa {
    font-size: 0.95rem;
}
.mythic-process-menu-icon-success {
    color: var(--mythic-global-035);
}
.mythic-process-menu-icon-warning {
    color: var(--mythic-global-038);
}
.mythic-process-menu-icon-error {
    color: var(--mythic-global-048);
}
@media (max-width: 1100px) {
    .mythic-process-inspector-body {
        grid-template-columns: 1fr;
    }
    .mythic-process-inspector-details {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .mythic-credential-search {
        flex-direction: column;
        overflow: hidden;
    }
    .mythic-credential-search > .gutter.gutter-horizontal {
        display: none;
    }
    .mythic-credential-search > .mythic-credential-search-results,
    .mythic-credential-search > .mythic-credential-search-inspector {
        flex: 1 1 0 !important;
        height: auto !important;
        min-height: 0;
        width: 100% !important;
    }
}
@media (max-width: 760px) {
    .mythic-credential-search {
        gap: 0.55rem;
    }
    .mythic-credential-search-table {
        min-width: 45rem;
    }
    .mythic-credential-search-inspector-header {
        align-items: stretch;
        flex-direction: column;
    }
    .mythic-credential-search-inspector-actions {
        justify-content: flex-start;
    }
    .mythic-credential-search-section-body,
    .mythic-credential-search-metadata-grid {
        grid-template-columns: 1fr;
    }
}
.mythic-tree-groups-title.MuiDialogTitle-root {
    background: var(--mythic-global-069);
    border-bottom: 1px solid var(--mythic-global-010);
    color: var(--mythic-global-070);
    font-size: 0.98rem;
    font-weight: 800;
    padding: 0.75rem 0.9rem;
    position: relative;
}
.mythic-tree-groups-title.MuiDialogTitle-root::before {
    background: var(--mythic-global-071);
    content: "";
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 3px;
}
.mythic-tree-groups-title-copy {
    display: flex;
    flex: 1 1 18rem;
    flex-direction: column;
    gap: 0.14rem;
    min-width: 0;
}
.mythic-tree-groups-title-copy span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-tree-groups-title-copy span:last-child,
.mythic-tree-groups-help {
    color: var(--mythic-global-025);
    font-size: 0.76rem;
    font-weight: 550;
    line-height: 1.35;
}
.mythic-tree-groups-content.MuiDialogContent-root {
    background-color: var(--mythic-global-001);
    padding: 0.75rem;
}
.mythic-tree-groups-content .MuiBackdrop-root {
    background-color: var(--mythic-global-072);
}
.mythic-tree-groups-help {
    background-color: var(--mythic-global-061);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    margin-bottom: 0.65rem;
    padding: 0.55rem 0.7rem;
}
.mythic-tree-groups-section + .mythic-tree-groups-section {
    margin-top: 0.65rem;
}
.mythic-tree-groups-table-wrap {
    max-height: min(48vh, 32rem);
    overflow: auto;
}
.mythic-tree-groups-section .mythic-tree-groups-table-wrap {
    max-height: min(36vh, 24rem);
}
.mythic-tree-groups-callback-icons {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 0.4rem;
}
.mythic-tree-groups-status {
    align-items: center;
    background-color: var(--mythic-global-063);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    height: 26px;
    justify-content: center;
    width: 26px;
}
.mythic-tree-groups-statusActive {
    background-color: var(--mythic-global-073);
    border-color: var(--mythic-global-074);
    color: var(--mythic-global-035);
}
.mythic-tree-groups-statusInactive {
    background-color: var(--mythic-global-055);
    border-color: var(--mythic-global-075);
    color: var(--mythic-global-038);
}
.mythic-tree-groups-agent-icon {
    align-items: center;
    display: inline-flex;
    height: 30px;
    justify-content: center;
    width: 30px;
}
.mythic-tree-groups-callback-id {
    color: var(--mythic-global-002);
    font-size: 0.84rem;
    font-weight: 800;
}
.mythic-tree-groups-table-value {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-tree-groups-description-cell {
    max-width: 24rem;
}
.mythic-tree-groups-empty {
    align-items: center;
    background-color: var(--mythic-global-076);
    border: 1px dashed var(--mythic-global-007);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: flex;
    font-size: 0.8rem;
    justify-content: center;
    min-height: 6rem;
    padding: 0.9rem;
    text-align: center;
}
.mythic-tasking-composer {
    background-color: var(--mythic-global-031);
    border-top: 1px solid var(--mythic-global-010);
    box-shadow: var(--mythic-global-077);
    flex: 0 0 auto;
    min-width: 0;
    padding: 0.55rem 0.65rem 0.6rem;
    position: relative;
    width: 100%;
}
.mythic-tasking-context-row {
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: 0.28rem;
    margin-bottom: 0.45rem;
    min-height: 24px;
    min-width: 0;
    padding-bottom: 0.05rem;
}
.mythic-tasking-context-row > span[data-tooltip-id="my-tooltip"] {
    display: inline-flex !important;
    max-width: 100%;
    min-width: 0;
}
.mythic-tasking-context-chip {
    align-items: flex-start;
    border: 1px solid var(--mythic-global-078);
    border-radius: var(--mythic-global-008);
    cursor: pointer;
    display: inline-flex;
    flex: 0 1 auto;
    font-size: 0.72rem;
    font-weight: 750;
    gap: 0.28rem;
    line-height: 1.2;
    max-width: 100%;
    min-height: 22px;
    overflow-wrap: anywhere;
    padding: 0.24rem 0.48rem;
    transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
    white-space: normal;
    word-break: break-word;
}
.mythic-tasking-context-chip:hover,
.mythic-tasking-context-chip:focus-visible {
    box-shadow: inset 0 0 0 1px currentColor;
    outline: none;
    transform: translateY(-1px);
}
.mythic-tasking-context-chip:active {
    transform: translateY(0);
}
.mythic-tasking-context-chip-emphasized {
    box-shadow: inset 0 0 0 1px var(--mythic-global-079);
}
.mythic-tasking-context-chip-label {
    flex: 0 0 auto;
    font-size: 0.64rem;
    font-weight: 850;
    letter-spacing: 0;
    opacity: 0.78;
}
.mythic-tasking-context-chip-value {
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
}
.mythic-tasking-command-row {
    align-items: flex-end;
    display: flex;
    gap: 0.45rem;
    min-width: 0;
    width: 100%;
}
.mythic-tasking-token-select {
    flex: 0 0 13rem;
    max-width: 40%;
    min-width: 9.5rem;
}
.mythic-tasking-token-select .MuiOutlinedInput-root {
    background-color: var(--mythic-global-009);
    border-radius: var(--mythic-global-008);
    min-height: 37px;
}
.mythic-tasking-token-select .MuiSelect-select {
    font-size: 0.78rem;
    font-weight: 650;
    min-height: 0 !important;
    overflow: hidden;
    padding-bottom: 0.52rem;
    padding-top: 0.52rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-tasking-command-input {
    flex: 1 1 auto;
    min-width: 10rem;
}
.mythic-tasking-command-input .MuiOutlinedInput-root {
    align-items: flex-end;
    background-color: var(--mythic-global-080);
    border-radius: var(--mythic-global-008);
    padding: 0.1rem 0.24rem 0.1rem 0;
}
.mythic-tasking-command-input .MuiOutlinedInput-root:hover {
    background-color: var(--mythic-global-081);
}
.mythic-tasking-command-input .MuiInputBase-input {
    font-family: var(--mythic-global-003);
    font-size: 0.86rem;
    line-height: 1.45;
    padding-bottom: 0.48rem;
    padding-top: 0.48rem;
}
.mythic-tasking-command-prefix {
    align-items: center;
    color: var(--mythic-global-025);
    display: inline-flex;
    flex: 0 0 auto;
    height: 30px;
    justify-content: center;
    margin-left: 0.35rem;
    margin-right: 0.35rem;
    margin-top: 0.12rem;
    opacity: 0.86;
}
.mythic-tasking-action-row {
    align-items: center;
    align-self: flex-end;
    display: inline-flex;
    flex: 0 0 auto;
    gap: 0.18rem;
    margin-bottom: 0.12rem;
    padding-left: 0.28rem;
}
.mythic-tasking-action-button.MuiIconButton-root {
    background-color: var(--mythic-global-063);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    height: 28px;
    padding: 0;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 28px;
}
.mythic-tasking-action-button-neutral.MuiIconButton-root:hover {
    background-color: var(--mythic-global-044);
    border-color: var(--mythic-global-082);
    color: var(--mythic-global-023);
}
.mythic-tasking-action-button-warning.MuiIconButton-root:hover {
    background-color: var(--mythic-global-046);
    border-color: var(--mythic-global-083);
    color: var(--mythic-global-038);
}
.mythic-tasking-action-button-success.MuiIconButton-root:hover {
    background-color: var(--mythic-global-045);
    border-color: var(--mythic-global-084);
    color: var(--mythic-global-035);
}
.mythic-tasking-payload-chip {
    align-items: center;
    background-color: var(--mythic-global-063);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    flex: 0 0 auto;
    height: 28px;
    justify-content: center;
    width: 28px;
}
.mythic-tasking-parameter-preview {
    align-items: center;
    background-color: var(--mythic-global-080);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: grid;
    gap: 0.55rem;
    grid-template-columns: minmax(7.5rem, auto) minmax(0, 1fr);
    margin-top: 0.45rem;
    min-height: 42px;
    min-width: 0;
    padding: 0.45rem 0.55rem;
}
.mythic-tasking-parameter-preview-empty-state {
    background-color: var(--mythic-global-085);
}
.mythic-tasking-parameter-preview-heading {
    align-items: center;
    display: flex;
    gap: 0.35rem;
    min-width: 0;
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-tasking-parameter-preview-heading svg {
    color: var(--mythic-global-066);
    font-size: 1rem;
}
.mythic-tasking-parameter-preview-more {
    align-items: center;
    background-color: var(--mythic-global-063);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 750;
    min-height: 22px;
    padding: 0.12rem 0.4rem;
}
.mythic-tasking-parameter-preview-chip-row {
    align-items: center;
    display: flex;
    flex-wrap: nowrap;
    gap: 0.28rem;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 0.02rem;
}
.mythic-tasking-parameter-preview-empty {
    align-items: center;
    color: var(--mythic-global-066);
    display: flex;
    font-size: 0.74rem;
    font-weight: 650;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-tasking-parameter-preview-empty svg {
    color: var(--mythic-global-066);
    font-size: 1rem;
}
.mythic-tasking-parameter-preview-empty span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-tasking-parameter-preview-chip.MuiChip-root {
    background-color: var(--mythic-global-063);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 750;
    height: 22px;
    max-width: min(16rem, 100%);
}
.mythic-tasking-parameter-preview-chip.MuiChip-clickable:hover {
    background-color: var(--mythic-global-086);
    border-color: var(--mythic-global-087);
    color: var(--mythic-global-023);
}
.mythic-tasking-parameter-preview-chip-required.MuiChip-root {
    background-color: var(--mythic-global-088);
    border-color: var(--mythic-global-089);
    color: var(--mythic-global-038);
}
.mythic-tasking-parameter-preview-chip-required.MuiChip-clickable:hover {
    background-color: var(--mythic-global-055);
    border-color: var(--mythic-global-090);
    color: var(--mythic-global-038);
}
.mythic-tasking-parameter-preview-chip-active.MuiChip-root {
    background-color: var(--mythic-global-091);
    border-color: var(--mythic-global-054);
    color: var(--mythic-global-023);
}
.mythic-tasking-parameter-preview-chip .MuiChip-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-tasking-parameter-preview-chip-label {
    align-items: center;
    display: inline-flex;
    gap: 0.25rem;
    min-width: 0;
}
.mythic-tasking-parameter-preview-chip-status {
    background-color: var(--mythic-global-092);
    border-radius: 999px;
    color: inherit;
    flex: 0 0 auto;
    font-size: 0.58rem;
    font-weight: 850;
    line-height: 1;
    padding: 0.14rem 0.28rem;
}
.mythic-tasking-parameter-preview-chip-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-tasking-parameter-preview-chip-type {
    color: inherit;
    flex: 0 0 auto;
    font-size: 0.62rem;
    font-weight: 650;
    opacity: 0.66;
}
.mythic-tasking-reverse-search {
    align-items: center;
    background-color: var(--mythic-global-093);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    gap: 0.45rem;
    margin-bottom: 0.45rem;
    min-width: 0;
    padding: 0.28rem;
}
.mythic-tasking-reverse-search-label {
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 800;
    padding-left: 0.3rem;
}
.mythic-tasking-reverse-search-input .MuiOutlinedInput-root {
    background-color: var(--mythic-global-009);
}
.mythic-tasking-filter-dialog {
    background-color: var(--mythic-global-094);
    color: var(--mythic-global-002);
}
.mythic-accent-dialog-title.MuiDialogTitle-root {
    background-image: var(--mythic-global-069) !important;
    border-bottom: 1px solid var(--mythic-global-010) !important;
    color: var(--mythic-global-070);
    cursor: move;
    padding: 1rem 1.15rem !important;
    position: relative;
}
.mythic-accent-dialog-title.MuiDialogTitle-root::before,
.mythic-detail-section-header::before,
.mythic-section-header::before,
.mythic-dashboard-edit-toolbar::before {
    background-color: var(--mythic-global-071);
    bottom: 0;
    box-shadow: 0 0 0 1px var(--mythic-global-095);
    content: "";
    left: 0;
    position: absolute;
    top: 0;
    width: 6px;
}
.mythic-accent-dialog-title-row {
    align-items: center;
    display: flex;
    gap: 0.8rem;
    min-width: 0;
    min-height: 42px;
    padding-left: 0.55rem;
}
.mythic-accent-dialog-title-icon {
    align-items: center;
    background-color: var(--mythic-global-096);
    border: 1px solid var(--mythic-global-097);
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    flex: 0 0 auto;
    height: 32px;
    justify-content: center;
    width: 32px;
}
.mythic-tasking-filter-title-main {
    color: var(--mythic-global-070);
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.15;
}
.mythic-accent-dialog-title-subtitle {
    color: var(--mythic-global-098);
    font-size: 0.76rem;
    font-weight: 600;
    line-height: 1.25;
    margin-top: 0.15rem;
}
.mythic-tasking-filter-dialog-actions.MuiDialogActions-root {
    background-color: var(--mythic-global-061) !important;
    border-top: 1px solid var(--mythic-global-010) !important;
    gap: 0.65rem !important;
    padding: 0.85rem 1rem !important;
}
.mythic-tasking-filter-dialog-actions.MuiDialogActions-root .MuiButton-root {
    min-height: 36px;
    min-width: 8.25rem;
    padding-left: 1rem;
    padding-right: 1rem;
}
.mythic-tasking-filter-dialog-actions.MuiDialogActions-root .MuiButton-root:first-of-type {
    margin-right: auto;
}
.mythic-tasking-filter-dialog-content.MuiDialogContent-root {
    background-color: var(--mythic-global-094);
    max-height: min(72vh, 48rem);
    min-width: min(46rem, calc(100vw - 3rem));
    overflow: auto;
    padding: 1rem !important;
}
.mythic-tasking-filter-summary {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-height: 28px;
}
.mythic-tasking-filter-summary-chip.MuiChip-root {
    background-color: var(--mythic-global-099);
    border: 1px solid var(--mythic-global-100);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-027);
    font-size: 0.72rem;
    font-weight: 750;
}
.mythic-tasking-filter-summary-chip .MuiChip-icon {
    color: inherit;
    font-size: 1rem;
}
.mythic-tasking-filter-summary-chip-muted.MuiChip-root {
    background-color: var(--mythic-global-063);
    border-color: var(--mythic-global-010);
    color: var(--mythic-global-025);
}
.mythic-column-stack {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-width: 0;
}
.mythic-tasking-filter-select .MuiOutlinedInput-root {
    background-color: var(--mythic-global-009);
    border-radius: var(--mythic-global-008);
    min-height: 38px;
}
.mythic-tasking-filter-select .MuiSelect-select {
    align-items: center;
    display: flex;
    min-height: 0 !important;
    padding-bottom: 0.42rem;
    padding-top: 0.42rem;
}
.mythic-tasking-filter-select-empty {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-weight: 650;
}
.mythic-tasking-filter-select-chips {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    min-width: 0;
}
.mythic-tasking-filter-selected-chip.MuiChip-root {
    background-color: var(--mythic-global-101);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    font-size: 0.72rem;
    font-weight: 700;
}
.mythic-tasking-filter-command-grid {
    align-items: start;
    display: grid;
    gap: 0.6rem;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    min-width: 0;
    width: 100%;
}
.mythic-tasking-filter-choice-divider {
    align-self: center;
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 750;
    padding-top: 1.55rem;
    text-align: center;
}
.mythic-tasking-filter-clear-button.MuiButton-root {
    align-self: flex-start;
    background-color: var(--mythic-global-102) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008);
    box-shadow: none;
    color: var(--mythic-global-025) !important;
    font-size: 0.72rem;
    font-weight: 750;
    margin-top: 0.4rem;
    min-height: 28px;
    text-transform: none;
}
.mythic-tasking-filter-clear-button.MuiButton-root:hover {
    background-color: var(--mythic-global-055) !important;
    border-color: var(--mythic-global-090) !important;
    color: var(--mythic-global-038) !important;
}
@media screen and (max-width: 760px) {
    .mythic-tasking-filter-dialog-content.MuiDialogContent-root {
        min-width: 0;
    }
    .mythic-tasking-filter-command-grid {
        grid-template-columns: 1fr;
    }
    .mythic-tasking-filter-choice-divider {
        padding-top: 0;
    }
    .mythic-tasking-filter-dialog-actions.MuiDialogActions-root .MuiButton-root,
    .mythic-tasking-filter-dialog-actions.MuiDialogActions-root .MuiButton-root:first-of-type {
        flex: 1 1 100%;
        margin-right: 0;
    }
}
@media screen and (max-width: 760px) {
    .mythic-tasking-command-row {
        align-items: stretch;
        flex-direction: column;
    }
    .mythic-tasking-token-select {
        flex: 0 0 auto;
        max-width: 100%;
        width: 100% !important;
    }
    .mythic-tasking-parameter-preview {
        grid-template-columns: 1fr;
    }
}
.mythic-task-parameters-title-copy {
    flex: 1 1 auto;
    min-width: 12rem;
}
.mythic-task-parameters-title-main {
    color: var(--mythic-global-070);
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.15;
    overflow-wrap: anywhere;
}
.mythic-task-parameters-title-meta {
    align-items: center;
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    gap: 0.35rem;
    justify-content: flex-end;
    min-width: 0;
}
.mythic-task-parameters-title-chip.MuiChip-root {
    background-color: var(--mythic-global-096);
    border: 1px solid var(--mythic-global-097);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-070);
    font-size: 0.72rem;
    font-weight: 750;
}
.mythic-task-parameters-title-chip .MuiChip-icon {
    color: inherit;
    font-size: 1rem;
}
.mythic-task-parameters-title-chip-warning.MuiChip-root {
    background-color: var(--mythic-global-050);
    border-color: var(--mythic-global-083);
    color: var(--mythic-global-038);
}
.mythic-task-parameters-content.MuiDialogContent-root {
    background-color: var(--mythic-global-094);
    max-height: min(76vh, 52rem);
    min-width: min(58rem, calc(100vw - 3rem));
    overflow: auto;
    padding: 1rem !important;
    position: relative;
}
.mythic-task-parameters-backdrop.MuiBackdrop-root {
    position: absolute;
    z-index: 2;
}
.mythic-task-parameters-overview,
.mythic-task-parameters-group-card,
.mythic-task-parameter-card {
    background-color: var(--mythic-global-061);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
}
.mythic-task-parameters-overview {
    padding: 0.75rem;
}
.mythic-task-parameters-section-label {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1.25;
}
.mythic-task-parameters-section-description {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    line-height: 1.35;
    margin-top: 0.12rem;
}
.mythic-task-parameters-description {
    color: var(--mythic-global-025);
    font-family: var(--mythic-global-003);
    font-size: 0.82rem;
    line-height: 1.45;
    margin: 0.35rem 0 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-task-parameters-group-card {
    align-items: center;
    display: grid;
    gap: 0.75rem;
    grid-template-columns: minmax(0, 1fr) minmax(14rem, 20rem);
    padding: 0.75rem;
}
.mythic-task-parameters-group-select {
    width: 100%;
}
.mythic-task-parameters-list {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    margin-top: 0.75rem;
    min-width: 0;
}
.mythic-task-parameter-card {
    display: grid;
    gap: 0.85rem;
    grid-template-columns: minmax(14rem, 0.38fr) minmax(0, 0.62fr);
    padding: 0.8rem;
}
.mythic-task-parameter-card-required {
    border-left: 4px solid var(--mythic-global-038);
}
.mythic-task-parameter-copy {
    min-width: 0;
}
.mythic-task-parameter-heading {
    align-items: flex-start;
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-task-parameter-title {
    color: var(--mythic-global-002);
    font-size: 0.88rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-task-parameter-chip-row {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.25rem;
    justify-content: flex-end;
}
.mythic-task-parameter-chip.MuiChip-root {
    background-color: var(--mythic-global-103);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 750;
    height: 22px;
}
.mythic-task-parameter-chip-required.MuiChip-root {
    background-color: var(--mythic-global-046);
    border-color: var(--mythic-global-104);
    color: var(--mythic-global-038);
}
.mythic-task-parameter-description {
    color: var(--mythic-global-025);
    font-size: 0.76rem;
    line-height: 1.4;
    margin-top: 0.35rem;
    overflow-wrap: anywhere;
}
.mythic-task-parameter-description-muted {
    color: var(--mythic-global-066);
    font-style: italic;
}
.mythic-task-parameter-name {
    color: var(--mythic-global-066);
    font-family: var(--mythic-global-105);
    font-size: 0.7rem;
    line-height: 1.35;
    margin-top: 0.4rem;
    overflow-wrap: anywhere;
}
.mythic-task-parameter-control {
    min-width: 0;
    position: relative;
}
.mythic-task-parameter-control-shell {
    min-width: 0;
    position: relative;
}
.mythic-task-parameter-control-backdrop.MuiBackdrop-root {
    background-color: var(--mythic-global-106);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    position: absolute;
    z-index: 2;
}
.mythic-task-parameter-control .MuiFormControl-root,
.mythic-task-parameter-control .MuiTextField-root {
    width: 100%;
}
.mythic-task-parameter-control .MuiInputBase-root {
    min-height: 38px;
}
.mythic-task-parameter-control .MuiInput-root {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    padding-left: 0.45rem;
    padding-right: 0.45rem;
}
.mythic-task-parameter-control .MuiInput-root::before,
.mythic-task-parameter-control .MuiInput-root::after {
    display: none;
}
.mythic-task-parameter-control .mythicElement {
    background-color: transparent;
    border: 0;
    box-shadow: none;
}
.mythic-task-parameter-select-row {
    align-items: center;
    display: grid;
    gap: 0.45rem;
    grid-template-columns: minmax(0, 1fr) auto;
    min-width: 0;
}
.mythic-task-parameter-select-control {
    min-width: 0;
    width: 100%;
}
.mythic-task-parameter-select-value,
.mythic-task-parameter-select-placeholder {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-task-parameter-select-placeholder {
    color: var(--mythic-global-066);
}
.mythic-task-parameter-selected-values {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    min-width: 0;
}
.mythic-task-parameter-selected-chip.MuiChip-root {
    background-color: var(--mythic-global-029);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    height: 22px;
    max-width: 100%;
}
.mythic-task-parameter-selected-chip .MuiChip-label {
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-task-parameter-menu-text {
    display: inline-block;
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    word-break: break-word;
}
.mythic-task-parameter-empty-inline {
    align-items: center;
    background-color: var(--mythic-global-107);
    border: 1px dashed var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: flex;
    font-size: 0.74rem;
    font-weight: 650;
    min-height: 38px;
    padding: 0.45rem 0.65rem;
}
.mythic-task-parameter-refresh.MuiIconButton-root {
    align-self: center;
}
.mythic-task-choice-custom {
    align-items: center;
    display: grid;
    gap: 0.55rem;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
    min-width: 0;
}
.mythic-task-choice-custom-select,
.mythic-task-choice-custom-input {
    min-width: 0;
}
.mythic-task-choice-custom-divider {
    align-items: center;
    color: var(--mythic-global-066);
    display: inline-flex;
    font-size: 0.68rem;
    font-weight: 800;
    justify-content: center;
}
.mythic-task-choice-custom-divider span {
    background-color: var(--mythic-global-061);
    border: 1px solid var(--mythic-global-010);
    border-radius: 999px;
    padding: 0.16rem 0.4rem;
}
.mythic-task-parameter-boolean-row {
    align-items: center;
    background-color: var(--mythic-global-107);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    gap: 0.45rem;
    padding: 0.25rem 0.55rem 0.25rem 0.35rem;
}
.mythic-task-parameter-boolean-chip.MuiChip-root {
    background-color: var(--mythic-global-055);
    border: 1px solid var(--mythic-global-108);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-038);
    font-size: 0.68rem;
    font-weight: 750;
    height: 22px;
}
.mythic-task-parameter-boolean-chip-enabled.MuiChip-root {
    background-color: var(--mythic-global-045);
    border-color: var(--mythic-global-074);
    color: var(--mythic-global-035);
}
.mythic-task-parameter-field-row {
    align-items: center;
    display: grid;
    gap: 0.65rem;
    grid-template-columns: minmax(8.5rem, 0.28fr) minmax(0, 0.72fr);
    min-width: 0;
}
.mythic-task-parameter-field-label {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 750;
    line-height: 1.3;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-task-parameter-field-control {
    min-width: 0;
}
.mythic-task-parameter-field-actions {
    align-items: center;
    display: flex;
    gap: 0.4rem;
    justify-content: flex-end;
}
.mythic-task-parameter-switch-row {
    align-items: center;
    background-color: var(--mythic-global-107);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    gap: 0.6rem;
    justify-content: space-between;
    padding: 0.45rem 0.65rem;
}
.mythic-task-array-editor,
.mythic-task-agent-connect-editor {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    min-width: 0;
}
.mythic-task-array-entry,
.mythic-task-typed-array-entry {
    align-items: center;
    display: grid;
    gap: 0.55rem;
    min-width: 0;
}
.mythic-task-array-entry {
    grid-template-columns: auto minmax(0, 1fr);
}
.mythic-task-typed-array-entry {
    grid-template-columns: auto minmax(8rem, 0.3fr) minmax(0, 0.7fr);
}
.mythic-task-array-delete.MuiIconButton-root {
    align-self: center;
}
.mythic-task-array-entry-control,
.mythic-task-typed-array-value,
.mythic-task-typed-array-choice {
    min-width: 0;
}
.mythic-task-parameter-add-button.MuiButton-root {
    align-self: flex-start;
}
.mythic-task-agent-connect-panel,
.mythic-task-agent-connect-parameters {
    background-color: var(--mythic-global-107);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    padding: 0.65rem;
}
.mythic-task-agent-connect-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: flex-end;
}
.mythic-task-agent-connect-parameters-title {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1.3;
    margin-bottom: 0.55rem;
}
.mythic-task-agent-connect-parameter {
    align-items: start;
    display: grid;
    gap: 0.65rem;
    grid-template-columns: minmax(8rem, 0.32fr) minmax(0, 0.68fr);
    min-width: 0;
}
.mythic-task-agent-connect-parameter-name {
    color: var(--mythic-global-025);
    font-family: var(--mythic-global-105);
    font-size: 0.72rem;
    line-height: 1.35;
    overflow-wrap: anywhere;
}
.mythic-task-agent-connect-parameter-value {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    font-family: var(--mythic-global-105);
    font-size: 0.72rem;
    line-height: 1.4;
    margin: 0;
    max-height: 14rem;
    min-width: 0;
    overflow: auto;
    padding: 0.5rem;
    white-space: pre-wrap;
    word-break: break-word;
}
.mythic-task-credential-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: flex-end;
}
.mythic-task-credential-menu-item {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    min-width: 0;
}
.mythic-task-credential-menu-comment {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    line-height: 1.3;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-task-file-dropzone {
    background-color: var(--mythic-global-107);
    border: 1px dashed var(--mythic-global-109);
    border-radius: var(--mythic-global-008);
    cursor: pointer;
    padding: 1rem;
    text-align: center;
    transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}
.mythic-task-file-dropzone:hover,
.mythic-task-file-dropzone-dragging {
    background-color: var(--mythic-global-110);
    border-color: var(--mythic-global-027);
    box-shadow: inset 0 0 0 1px var(--mythic-global-111);
}
.mythic-task-file-dropzone-content {
    align-items: center;
    color: var(--mythic-global-025);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-task-file-dropzone-icon {
    color: var(--mythic-global-027);
}
.mythic-task-parameters-actions.MuiDialogActions-root {
    padding: 0.85rem 1rem !important;
}
@media screen and (max-width: 900px) {
    .mythic-accent-dialog-title-row,
    .mythic-task-parameters-group-card,
    .mythic-task-parameter-card {
        grid-template-columns: 1fr;
    }
    .mythic-accent-dialog-title-row {
        align-items: flex-start;
        flex-wrap: wrap;
    }
    .mythic-task-parameters-title-meta {
        justify-content: flex-start;
        width: 100%;
    }
    .mythic-task-parameters-content.MuiDialogContent-root {
        min-width: 0;
    }
    .mythic-task-parameter-field-row,
    .mythic-task-typed-array-entry,
    .mythic-task-agent-connect-parameter {
        grid-template-columns: 1fr;
    }
    .mythic-task-choice-custom {
        grid-template-columns: 1fr;
    }
    .mythic-task-choice-custom-divider {
        justify-content: flex-start;
    }
    .mythic-task-array-entry {
        align-items: flex-start;
    }
}
.mythic-file-browser-iconButtonCompound.MuiIconButton-root {
    gap: 0;
    padding: 0 0.15rem;
    width: auto;
}
.mythic-file-browser-iconButtonCompound .MuiSvgIcon-root + .MuiSvgIcon-root {
    font-size: 1rem;
    margin-left: -0.15rem;
}
.mythic-file-browser-labelButton.MuiIconButton-root {
    height: 20px;
    margin: 0 0.1rem;
    width: 20px;
}
.mythic-file-browser-labelButton .MuiSvgIcon-root {
    font-size: 0.9rem;
}
.MythicResizableGrid-root {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-007);
    border-radius: var(--mythic-global-008);
    box-shadow: var(--mythic-global-112);
    flex: 1 1 auto;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    position: relative;
    width: 100%;
}
.MythicResizableGrid-grid {
    background-color: var(--mythic-global-009);
    outline: none;
}
.MythicResizableGrid-headerCellRow {
    background-color: var(--mythic-global-006);
    box-shadow: inset 0 -1px 0 var(--mythic-global-007);
    display: flex;
    flex-direction: row;
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
}
.MythicResizableGrid-headerCell {
    align-items: center;
    background-color: var(--mythic-global-006) !important;
    border-bottom: 1px solid var(--mythic-global-007);
    border-right: 1px solid var(--mythic-global-010);
    box-sizing: border-box;
    color: var(--mythic-global-002);
    cursor: pointer;
    display: flex;
    font-size: 0.76rem;
    font-weight: 700;
    justify-content: space-between;
    letter-spacing: 0;
    min-width: 0;
    overflow: hidden;
    padding: 0 0.45rem 0 0.65rem;
    position: relative;
    transition: background-color 120ms ease, color 120ms ease;
    user-select: none;
    &:first-child-of-type {
        border-left: 0;
    }
    &:hover {
        background-color: var(--mythic-global-113);
    }
}
.MythicResizableGrid-headerCellNoSort {
    cursor: default;
}
.MythicResizableGrid-headerContent {
    align-items: center;
    display: flex;
    gap: 0.4rem;
    justify-content: space-between;
    min-width: 0;
    width: 100%;
}
.MythicResizableGrid-headerCell .MythicResizableGrid-cellInner {
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.2;
}
.MythicResizableGrid-headerLabel {
    color: var(--mythic-global-002);
    display: block;
    letter-spacing: 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
}
.MythicResizableGrid-headerActions {
    align-items: center;
    display: inline-flex;
    flex: 0 0 auto;
    gap: 0.25rem;
    min-width: 0;
}
.MythicResizableGrid-headerIndicator {
    align-items: center;
    appearance: none;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-114);
    border-radius: var(--mythic-global-008);
    box-shadow: var(--mythic-global-115);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.95rem;
    font-family: inherit;
    height: 18px;
    justify-content: center;
    line-height: 1;
    margin: 0;
    padding: 0;
    width: 18px;
}
.MythicResizableGrid-headerFilterIcon {
    background-color: var(--mythic-global-116);
    border-color: var(--mythic-global-117);
    color: var(--mythic-global-118);
    cursor: pointer;
}
.MythicResizableGrid-headerFilterIcon:hover {
    background-color: var(--mythic-global-119);
    border-color: var(--mythic-global-120);
}
.MythicResizableGrid-headerSortIcon {
    background-color: var(--mythic-global-121);
    border-color: var(--mythic-global-122);
    color: var(--mythic-global-123);
}
.MythicResizableGrid-headerResizeHandle {
    bottom: 0;
    cursor: col-resize;
    position: absolute;
    right: 0;
    top: 0;
    touch-action: none;
    user-select: none;
    width: 9px;
    z-index: 2;
}
.MythicResizableGrid-headerResizeHandle::before {
    content: "";
    position: absolute;
    bottom: 18%;
    right: 4px;
    top: 18%;
    width: 2px;
    border-radius: 999px;
    background-color: var(--mythic-global-124);
    opacity: 0.72;
    pointer-events: none;
    transition: opacity 120ms ease, background-color 120ms ease;
}
.MythicResizableGrid-headerResizeHandle::after {
    content: "";
    inset: 0 -2px;
    position: absolute;
}
.MythicResizableGrid-headerCell:hover .MythicResizableGrid-headerResizeHandle::before {
    opacity: 1;
}
.MythicResizableGrid-headerResizeHandle:hover,
.MythicResizableGrid-headerResizeHandleActive {
    background-color: var(--mythic-global-125);
}
.MythicResizableGrid-headerResizeHandle:hover::before,
.MythicResizableGrid-headerResizeHandleActive::before {
    background-color: var(--mythic-global-023);
    opacity: 1;
}
.MythicResizableGrid-resizeGuide {
    background-color: var(--mythic-global-023);
    box-shadow: 0 0 0 1px var(--mythic-global-126),
        0 0 10px var(--mythic-global-127);
    pointer-events: none;
    position: absolute;
    top: 0;
    transform: translateX(-1px);
    width: 2px;
    z-index: 12;
}
.MythicResizableGrid-cell {
    align-items: center;
    background-image: none;
    background-color: var(--mythic-global-009);
    border-bottom: 1px solid var(--mythic-global-010);
    border-right: 1px solid var(--mythic-global-010);
    box-sizing: border-box;
    color: var(--mythic-global-002);
    cursor: default !important;
    display: flex;
    font-family: var(--mythic-global-003);
    font-size: 0.86rem;
    font-variant-numeric: tabular-nums;
    min-width: 0;
    padding: 0 0.65rem;
    position: relative;
    transition: background-color 120ms ease, background-image 120ms ease, border-color 120ms ease, box-shadow 120ms ease, color 120ms ease;
}
.MythicResizableGrid-cell.MythicResizableGridRowHighlight {
    background-color: var(--mythic-global-011);
}
.MythicResizableGrid-cell.MythicResizableGrid-hoveredRow {
    background-image: linear-gradient(0deg,
        var(--mythic-global-128),
        var(--mythic-global-128)) !important;
    border-bottom-color: var(--mythic-global-129);
}
.MythicResizableGrid-cell.MythicResizableGrid-contextRow {
    background-image: linear-gradient(0deg,
        var(--mythic-global-044),
        var(--mythic-global-044)) !important;
    border-bottom-color: var(--mythic-global-130);
    box-shadow: inset 0 1px 0 var(--mythic-global-130);
}
.MythicResizableGrid-cell.selectedCallback {
    background-image: linear-gradient(0deg,
        var(--mythic-global-131),
        var(--mythic-global-131)) !important;
    border-bottom-color: var(--mythic-global-132);
    box-shadow: inset 0 1px 0 var(--mythic-global-132),
        inset 0 -1px 0 var(--mythic-global-132);
}
.MythicResizableGrid-cell.selectedCallbackHierarchy {
    background-image: linear-gradient(0deg,
        var(--mythic-global-133),
        var(--mythic-global-133)) !important;
    border-bottom-color: var(--mythic-global-134);
    box-shadow: inset 0 1px 0 var(--mythic-global-134),
        inset 0 -1px 0 var(--mythic-global-134);
}
.MythicResizableGrid-cell.MythicResizableGrid-rowInteractive {
    cursor: pointer !important;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowFirstCell::before {
    background-color: var(--mythic-global-135);
    border-radius: 999px;
    bottom: 5px;
    content: "";
    left: 3px;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    top: 5px;
    transition: background-color 120ms ease, opacity 120ms ease, width 120ms ease;
    width: 3px;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowFirstCell.MythicResizableGrid-hoveredRow::before {
    opacity: 0.72;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowFirstCell.MythicResizableGrid-contextRow::before {
    background-color: var(--mythic-global-023);
    opacity: 1;
    width: 4px;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowFirstCell.selectedCallback::before {
    background-color: var(--mythic-global-027);
    opacity: 1;
    width: 4px;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowFirstCell.selectedCallbackHierarchy::before {
    background-color: var(--mythic-global-136);
    opacity: 1;
    width: 4px;
}
.MythicResizableGrid-cell.mythic-process-filter-match-row {
    background-image: linear-gradient(0deg,
        var(--mythic-global-137),
        var(--mythic-global-137)) !important;
    border-bottom-color: var(--mythic-global-068);
}
.MythicResizableGrid-cell.mythic-process-filter-ancestor-row {
    background-image: linear-gradient(0deg,
        var(--mythic-global-138),
        var(--mythic-global-138)) !important;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowFirstCell.mythic-process-filter-match-row::before {
    background-color: var(--mythic-global-023);
    opacity: 1;
    width: 4px;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowFirstCell.mythic-process-filter-ancestor-row::before {
    background-color: var(--mythic-global-025);
    opacity: 0.35;
    width: 3px;
}
.MythicResizableGrid-cell.MythicResizableGrid-rowLastCell {
    border-right-color: var(--mythic-global-007);
}
.MythicResizableGrid-cellInner {
    align-items: center;
    display: flex;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
}
.mythic-grid-filter-dialog {
    background-color: var(--mythic-global-094);
    color: var(--mythic-global-002);
}
.mythic-grid-filter-dialog-title {
    background-color: var(--mythic-global-139);
    background-image: var(--mythic-global-069);
    border-bottom: 1px solid var(--mythic-global-010);
    color: var(--mythic-global-070);
    font-size: 0.98rem !important;
    font-weight: 850 !important;
    line-height: 1.2 !important;
    padding: 0.85rem 1rem !important;
}
.mythic-grid-filter-dialog-content {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    min-width: min(38rem, calc(100vw - 3rem));
    padding: 1rem !important;
}
.mythic-grid-filter-dialog-copy {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.35;
}
.mythic-grid-filter-dialog-mode-row {
    align-items: center;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
}
.mythic-grid-filter-dialog-label {
    color: var(--mythic-global-002);
    font-size: 0.8rem;
    font-weight: 800;
}
.mythic-grid-filter-dialog-fields {
    display: grid;
    gap: 0.85rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}
.mythic-grid-filter-dialog-actions {
    border-top: 1px solid var(--mythic-global-010);
    padding: 0.7rem 1rem !important;
}
@media (max-width: 720px) {
    .mythic-grid-filter-dialog-content {
        min-width: 0;
    }
    .mythic-grid-filter-dialog-fields {
        grid-template-columns: 1fr;
    }
}
.mythic-callback-interactCell {
    align-items: center;
    display: inline-flex;
    gap: 0.18rem;
    height: 100%;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-callback-interactCell > span[data-tooltip-id="my-tooltip"] {
    align-items: center;
    display: inline-flex !important;
    flex: 0 0 auto;
    height: 22px;
    line-height: 1;
}
.mythic-callback-cellInline {
    align-items: center;
    display: inline-flex;
    gap: 0.28rem;
    height: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-callback-cellInlineCenter {
    justify-content: center;
}
.mythic-callback-cellInline > span[data-tooltip-id="my-tooltip"] {
    align-items: center;
    display: inline-flex !important;
    flex: 0 0 auto;
    height: 22px;
    line-height: 1;
}
.mythic-callback-cellText {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-callback-action-menu-header.MuiMenuItem-root,
.mythic-callback-action-menu-header.MuiMenuItem-root.Mui-disabled {
    cursor: default;
    opacity: 1;
    padding: 0.55rem 0.8rem 0.45rem;
}
.mythic-callback-action-menu-label {
    display: flex;
    flex-direction: column;
    gap: 0.08rem;
    min-width: 0;
}
.mythic-callback-action-menu-label-primary {
    color: var(--mythic-global-002);
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.2;
}
.mythic-callback-action-menu-label-secondary {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-callback-action-menu-section.MuiMenuItem-root,
.mythic-callback-action-menu-section.MuiMenuItem-root.Mui-disabled {
    border-top: 1px solid var(--mythic-global-010);
    cursor: default;
    margin-top: 0.25rem;
    min-height: 26px;
    opacity: 1;
    padding: 0.45rem 0.8rem 0.18rem;
}
.mythic-callback-action-menu-section:first-of-type {
    border-top: 0;
}
.mythic-callback-action-menu-section-label {
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 850;
    letter-spacing: 0.02em;
    line-height: 1.2;
}
.mythic-callback-action-menu-item.MuiMenuItem-root {
    align-items: center;
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    font-weight: 650;
    gap: 0;
    margin: 0.08rem 0.35rem;
    min-height: 34px;
    padding: 0.35rem 0.5rem;
}
.mythic-callback-action-menu-item.MuiMenuItem-root:hover,
.mythic-callback-action-menu-item.MuiMenuItem-root[data-open="true"] {
    background-color: var(--mythic-global-026);
}
.mythic-callback-action-menu-nested-label {
    align-items: center;
    display: inline-flex;
    gap: 0;
    min-width: 0;
}
.mythic-callback-action-menu-icon {
    align-items: center;
    background-color: var(--mythic-global-063);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.82rem;
    height: 22px;
    justify-content: center;
    line-height: 1;
    margin-right: 0.7rem;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 22px;
}
.mythic-callback-action-menu-icon svg {
    display: block;
    font-size: 0.92rem;
}
.mythic-callback-action-menu-icon-primary {
    background-color: var(--mythic-global-140);
    border-color: var(--mythic-global-141);
    color: var(--mythic-global-027);
}
.mythic-callback-action-menu-icon-warning {
    background-color: var(--mythic-global-142);
    border-color: var(--mythic-global-143);
    color: var(--mythic-global-038);
}
.mythic-callback-action-menu-icon-error {
    background-color: var(--mythic-global-144);
    border-color: var(--mythic-global-145);
    color: var(--mythic-global-048);
}
.mythic-callback-action-menu-item.MuiMenuItem-root:hover .mythic-callback-action-menu-icon-neutral,
.mythic-callback-action-menu-item.MuiMenuItem-root[data-open="true"] .mythic-callback-action-menu-icon-neutral {
    background-color: var(--mythic-global-064);
    border-color: var(--mythic-global-067);
    color: var(--mythic-global-027);
}
.mythic-callback-iconButton.MuiIconButton-root {
    border: 1px solid transparent;
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    height: 22px;
    padding: 0;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 22px;
}
.mythic-callback-iconButton.MuiIconButton-root:hover {
    background-color: var(--mythic-global-064);
    color: var(--mythic-global-027);
}
.mythic-callback-cellIconButton.MuiIconButton-root {
    background-color: var(--mythic-global-063);
    border-color: var(--mythic-global-010);
}
.mythic-callback-cellIconButton.MuiIconButton-root svg {
    display: block;
    font-size: 0.92rem;
}
.mythic-callback-cellIconButtonNeutral.MuiIconButton-root:hover {
    background-color: var(--mythic-global-064);
    border-color: var(--mythic-global-100);
    color: var(--mythic-global-027);
}
.mythic-callback-cellIconButtonSuccess.MuiIconButton-root {
    background-color: var(--mythic-global-146);
    border-color: var(--mythic-global-147);
    color: var(--mythic-global-035);
}
.mythic-callback-cellIconButtonSuccess.MuiIconButton-root:hover {
    background-color: var(--mythic-global-049);
    border-color: var(--mythic-global-148);
    color: var(--mythic-global-035);
}
.mythic-callback-cellIconButtonInfo.MuiIconButton-root {
    background-color: var(--mythic-global-086);
    border-color: var(--mythic-global-149);
    color: var(--mythic-global-023);
}
.mythic-callback-cellIconButtonInfo.MuiIconButton-root:hover {
    background-color: var(--mythic-global-150);
    border-color: var(--mythic-global-151);
    color: var(--mythic-global-023);
}
.mythic-callback-cellIconButtonWarning.MuiIconButton-root {
    background-color: var(--mythic-global-142);
    border-color: var(--mythic-global-152);
    color: var(--mythic-global-038);
}
.mythic-callback-cellIconButtonWarning.MuiIconButton-root:hover {
    background-color: var(--mythic-global-046);
    border-color: var(--mythic-global-153);
    color: var(--mythic-global-038);
}
.mythic-callback-cellIconButtonHoverInfo.MuiIconButton-root:hover {
    background-color: var(--mythic-global-150);
    border-color: var(--mythic-global-151);
    color: var(--mythic-global-023);
}
.mythic-callback-cellIconButtonHoverWarning.MuiIconButton-root:hover {
    background-color: var(--mythic-global-046);
    border-color: var(--mythic-global-153);
    color: var(--mythic-global-038);
}
.mythic-callback-cellIconButtonError.MuiIconButton-root {
    background-color: var(--mythic-global-144);
    border-color: var(--mythic-global-154);
    color: var(--mythic-global-048);
}
.mythic-callback-cellIconButtonError.MuiIconButton-root:hover {
    background-color: var(--mythic-global-051);
    border-color: var(--mythic-global-155);
    color: var(--mythic-global-048);
}
.mythic-callback-interactButtonHighIntegrity.MuiIconButton-root {
    background-color: var(--mythic-global-047);
    border-color: var(--mythic-global-156);
    color: var(--mythic-global-048);
}
.mythic-callback-interactButtonHighIntegrity.MuiIconButton-root:hover,
.mythic-callback-menuButtonHighIntegrity.MuiIconButton-root:hover {
    background-color: var(--mythic-global-157);
    color: var(--mythic-global-048);
}
.mythic-callback-menuButton.MuiIconButton-root {
    margin-left: -0.12rem;
}
.mythic-callback-menuButtonHighIntegrity.MuiIconButton-root {
    color: var(--mythic-global-048);
}
.mythic-callback-displayId {
    align-items: center;
    color: inherit;
    display: inline-flex;
    flex: 0 0 auto;
    font-weight: 700;
    height: 22px;
    line-height: 22px;
    max-width: 3.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-callback-statusBadge {
    align-items: center;
    appearance: none;
    background-color: var(--mythic-global-063);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-sizing: border-box;
    color: var(--mythic-global-025);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.82rem;
    font-family: inherit;
    height: 20px;
    justify-content: center;
    line-height: 1;
    margin-left: 0.08rem;
    padding: 0;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 22px;
}
.mythic-callback-statusBadgeButton {
    cursor: pointer;
}
.mythic-callback-statusBadgeButton:focus-visible {
    outline: 2px solid var(--mythic-global-158);
    outline-offset: 2px;
}
.mythic-callback-statusBadgeAlert:hover {
    background-color: var(--mythic-global-159);
    border-color: var(--mythic-global-160);
    color: var(--mythic-global-038);
}
.mythic-callback-statusBadgeProxy:hover {
    background-color: var(--mythic-global-150);
    border-color: var(--mythic-global-151);
    color: var(--mythic-global-023);
}
.mythic-callback-statusBadgeLock:hover {
    background-color: var(--mythic-global-159);
    border-color: var(--mythic-global-160);
    color: var(--mythic-global-038);
}
.mythic-callback-statusBadgeDead:hover {
    background-color: var(--mythic-global-159);
    border-color: var(--mythic-global-160);
    color: var(--mythic-global-038);
}
.mythic-callback-statusBadge svg {
    display: block;
    font-size: inherit;
}
.mythic-callback-tag-list .MuiChip-root {
    border: 1px solid var(--mythic-global-161);
}
.mythic-callback-tagsEmpty {
    color: var(--mythic-global-066);
    font-size: 0.72rem;
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-c2-path-title.MuiDialogTitle-root {
    background-color: var(--mythic-global-061);
    border-bottom: 1px solid var(--mythic-global-010);
    padding: 0.85rem 1rem;
}
.mythic-c2-path-title-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-c2-path-title-copy {
    min-width: min(100%, 18rem);
}
.mythic-c2-path-title-text.MuiTypography-root {
    color: var(--mythic-global-002);
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-c2-path-title-subtitle.MuiTypography-root {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    line-height: 1.35;
    margin-top: 0.18rem;
}
.mythic-c2-path-summary {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}
.mythic-c2-path-summary-chip {
    align-items: center;
    background-color: var(--mythic-global-063);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    font-size: 0.7rem;
    font-weight: 800;
    gap: 0.28rem;
    line-height: 1;
    padding: 0.32rem 0.45rem;
    white-space: nowrap;
}
.mythic-c2-path-summary-chip svg {
    font-size: 0.9rem;
}
.mythic-c2-path-summary-chip-success {
    background-color: var(--mythic-global-045);
    border-color: var(--mythic-global-162);
    color: var(--mythic-global-035);
}
.mythic-c2-path-summary-chip-warning {
    background-color: var(--mythic-global-046);
    border-color: var(--mythic-global-163);
    color: var(--mythic-global-038);
}
.mythic-c2-path-summary-chip-error {
    background-color: var(--mythic-global-164);
    border-color: var(--mythic-global-165);
    color: var(--mythic-global-048);
}
.mythic-c2-path-content.MuiDialogContent-root {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: min(72vh, 820px);
    min-height: 28rem;
    padding: 0.85rem;
}
.mythic-c2-path-route-panel {
    align-items: center;
    background: var(--mythic-global-166);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
    padding: 0.65rem 0.7rem;
}
.mythic-c2-path-route-panel-success {
    background: var(--mythic-global-167);
    border-color: var(--mythic-global-168);
}
.mythic-c2-path-route-panel-warning {
    background: var(--mythic-global-169);
    border-color: var(--mythic-global-170);
}
.mythic-c2-path-route-panel-error {
    background: var(--mythic-global-171);
    border-color: var(--mythic-global-172);
}
.mythic-c2-path-route-state {
    align-items: center;
    display: flex;
    gap: 0.65rem;
    min-width: min(100%, 18rem);
}
.mythic-c2-path-route-icon {
    align-items: center;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    flex: 0 0 auto;
    height: 2rem;
    justify-content: center;
    width: 2rem;
}
.mythic-c2-path-route-panel-success .mythic-c2-path-route-icon {
    color: var(--mythic-global-035);
}
.mythic-c2-path-route-panel-warning .mythic-c2-path-route-icon {
    color: var(--mythic-global-038);
}
.mythic-c2-path-route-panel-error .mythic-c2-path-route-icon {
    color: var(--mythic-global-048);
}
.mythic-c2-path-route-copy {
    min-width: 0;
}
.mythic-c2-path-route-label.MuiTypography-root {
    color: var(--mythic-global-002);
    font-size: 0.84rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-c2-path-route-description.MuiTypography-root {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    line-height: 1.35;
    margin-top: 0.12rem;
}
.mythic-c2-path-legend {
    align-items: center;
    display: flex;
    flex: 1 1 24rem;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: flex-end;
    min-width: min(100%, 18rem);
}
.mythic-c2-path-legend-item {
    align-items: center;
    background-color: var(--mythic-global-063);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    font-size: 0.7rem;
    font-weight: 750;
    gap: 0.3rem;
    line-height: 1;
    padding: 0.32rem 0.45rem;
    white-space: nowrap;
}
.mythic-c2-path-legend-item svg {
    font-size: 0.9rem;
}
.mythic-c2-path-edge-swatch {
    border-radius: 999px;
    display: inline-block;
    height: 0.18rem;
    width: 1.25rem;
}
.mythic-c2-path-edge-swatch-active {
    background-image: var(--mythic-global-173);
}
.mythic-c2-path-edge-swatch-ended {
    background-color: var(--mythic-global-048);
}
.mythic-c2-path-toolbar {
    align-items: center;
    background-color: var(--mythic-global-061);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
    padding: 0.7rem;
}
.mythic-c2-path-toolbar-copy {
    min-width: min(100%, 14rem);
}
.mythic-c2-path-toolbar-title.MuiTypography-root {
    color: var(--mythic-global-002);
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.2;
}
.mythic-c2-path-toolbar-description.MuiTypography-root {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    line-height: 1.35;
    margin-top: 0.12rem;
}
.mythic-c2-path-controls {
    align-items: center;
    display: flex;
    flex: 1 1 24rem;
    flex-wrap: wrap;
    gap: 0.65rem;
    justify-content: flex-end;
    min-width: min(100%, 18rem);
}
.mythic-c2-path-control.MuiFormControl-root {
    min-width: 11rem;
}
.mythic-c2-path-control-wide.MuiFormControl-root {
    min-width: min(100%, 20rem);
}
.mythic-c2-path-canvas {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}
.mythic-c2-path-canvas .react-flow__controls {
    box-shadow: none;
}
.mythic-c2-path-canvas .react-flow__controls-button {
    background-color: var(--mythic-global-009);
    border-color: var(--mythic-global-010);
    color: var(--mythic-global-025);
}
.mythic-c2-path-canvas .react-flow__controls-button:hover {
    background-color: var(--mythic-global-026);
    color: var(--mythic-global-027);
}
.mythic-c2-agent-node {
    align-items: center;
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    height: 100%;
    justify-content: center;
    min-width: 0;
    overflow: visible;
    position: relative;
    transition: background-color 120ms ease, box-shadow 120ms ease, outline-color 120ms ease;
    width: 100%;
}
.mythic-c2-agent-node-focused {
    background: var(--mythic-global-174);
    box-shadow: 0 0 0 2px var(--mythic-global-175);
    outline: 1px solid var(--mythic-global-176);
    outline-offset: 2px;
}
.mythic-c2-agent-node-mythic {
    opacity: 0.96;
}
.mythic-c2-agent-node-label.MuiTypography-root {
    color: var(--mythic-global-002);
    font-size: 0.72rem;
    font-weight: 760;
    line-height: 1.15;
    margin: 0;
    max-width: 100%;
    overflow: hidden;
    padding: 0 0.25rem 0.15rem;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-c2-agent-node-egress-routes {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
    justify-content: center;
    max-height: 3rem;
    max-width: 8rem;
    margin-bottom: 0.16rem;
    overflow: hidden;
    pointer-events: none;
    position: relative;
    z-index: 2;
}
.mythic-c2-agent-node-egress-route {
    align-items: center;
    background-color: var(--mythic-global-052);
    border: 1px solid var(--mythic-global-010);
    border-radius: 999px;
    color: var(--mythic-global-025);
    display: inline-flex;
    font-size: 0.62rem;
    font-weight: 760;
    gap: 0.38rem;
    line-height: 1;
    max-width: 6.4rem;
    min-height: 1.75rem;
    overflow: hidden;
    padding: 0 0.38rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-c2-agent-node-egress-route-active {
    border-color: var(--mythic-global-034);
    color: var(--mythic-global-025);
}
.mythic-c2-agent-node-egress-route-ended {
    border-color: var(--mythic-global-177);
    color: var(--mythic-global-025);
}
.mythic-c2-agent-node-egress-route-more {
    border-style: dashed;
    max-width: none;
}
.mythic-c2-agent-node-egress-route-icon {
    display: block;
    flex: 0 0 auto;
    height: 1.25rem;
    width: 1.5rem;
}
.mythic-c2-agent-node-egress-route > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-c2-group-node {
    background: var(--mythic-global-178);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-019);
    box-shadow: var(--mythic-global-179);
    color: var(--mythic-global-002);
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    height: 100%;
    justify-content: flex-start;
    min-width: 0;
    overflow: hidden;
    padding: 0.7rem;
    position: relative;
    width: 100%;
}
.mythic-c2-group-node::before {
    background-color: var(--mythic-global-017);
    content: "";
    height: 3px;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
}
.mythic-c2-group-node-handle {
    height: 12px !important;
    opacity: 0 !important;
    pointer-events: none !important;
    width: 12px !important;
}
.mythic-c2-flow-canvas .react-flow__edges {
    z-index: 28 !important;
}
.mythic-c2-flow-canvas .react-flow__nodes {
    z-index: 18 !important;
}
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge {
    opacity: 0.95;
    transition: opacity 120ms ease, filter 120ms ease, stroke 120ms ease;
}
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge .react-flow__edge-interaction {
    stroke-width: 5px !important;
}
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge-aggregate .react-flow__edge-interaction {
    stroke-width: 8px !important;
}
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge:hover,
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge:focus-within {
    filter: var(--mythic-global-180);
    opacity: 1;
}
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge:hover .react-flow__edge-path,
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge:focus-within .react-flow__edge-path {
    stroke-width: 3.1px !important;
}
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge-active:hover .react-flow__edge-path,
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge-active:focus-within .react-flow__edge-path,
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge-success:hover .react-flow__edge-path,
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge-success:focus-within .react-flow__edge-path {
    stroke: var(--mythic-global-035) !important;
}
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge-ended:hover .react-flow__edge-path,
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge-ended:focus-within .react-flow__edge-path {
    stroke: var(--mythic-global-048) !important;
}
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge-warning:hover .react-flow__edge-path,
.mythic-c2-flow-canvas .react-flow__edge.mythic-c2-edge-warning:focus-within .react-flow__edge-path {
    stroke: var(--mythic-global-038) !important;
}
.mythic-c2-flow-canvas .react-flow__edgelabel-renderer {
    z-index: 34 !important;
}
.mythic-c2-edge-label {
    opacity: 0.95;
    transition: opacity 120ms ease, transform 120ms ease, filter 120ms ease;
}
.mythic-c2-edge-label:hover,
.mythic-c2-edge-label:focus-within {
    filter: var(--mythic-global-181);
    opacity: 1;
}
.mythic-c2-edge-profile-chip {
    align-items: center;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-182);
    border-radius: 999px;
    box-shadow: var(--mythic-global-183);
    color: var(--mythic-global-025);
    display: inline-flex;
    font-size: 0.68rem;
    font-weight: 760;
    gap: 0.34rem;
    line-height: 1;
    max-width: 10.5rem;
    min-height: 2rem;
    overflow: hidden;
    padding: 0.24rem 0.56rem;
    white-space: nowrap;
}
.mythic-c2-edge-profile-chip-with-icon {
    padding-left: 0.28rem;
}
.mythic-c2-edge-profile-icon {
    align-items: flex-end;
    display: inline-flex !important;
    flex: 0 0 auto;
    height: 1.45rem !important;
    justify-content: center;
    line-height: 0;
    min-width: 1.55rem;
    overflow: visible;
}
.mythic-c2-edge-profile-icon img {
    display: block;
    height: 1.5rem !important;
    margin: 0 !important;
    width: auto;
}
.mythic-c2-edge-profile-icon svg,
.mythic-c2-edge-profile-icon .svg-inline--fa {
    flex: 0 0 auto;
}
.mythic-c2-edge-profile-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-c2-edge-text-label {
    align-items: center;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-182);
    border-radius: 999px;
    box-shadow: var(--mythic-global-183);
    color: var(--mythic-global-025);
    display: inline-flex;
    font-size: 0.66rem;
    font-weight: 740;
    line-height: 1;
    max-width: 8rem;
    overflow: hidden;
    padding: 0.3rem 0.46rem;
    pointer-events: none;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-c2-group-node-header {
    align-items: flex-start;
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-c2-group-node-title-wrap {
    min-width: 0;
}
.mythic-c2-group-node-kicker.MuiTypography-root {
    color: var(--mythic-global-025);
    font-size: 0.64rem;
    font-weight: 760;
    line-height: 1;
    margin-bottom: 0.18rem;
}
.mythic-c2-group-node-title.MuiTypography-root {
    color: var(--mythic-global-002);
    font-size: 0.9rem;
    font-weight: 800;
    line-height: 1.12;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-c2-group-node-toggle {
    background: transparent;
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    cursor: pointer;
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 760;
    line-height: 1;
    padding: 0.32rem 0.45rem;
}
.mythic-c2-group-node-toggle:hover,
.mythic-c2-group-node-actions button:hover {
    background-color: var(--mythic-global-026);
    border-color: var(--mythic-global-184);
    color: var(--mythic-global-027);
}
.mythic-c2-group-node-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
}
.mythic-c2-group-node-stat {
    align-items: center;
    background-color: var(--mythic-global-185);
    border: 1px solid var(--mythic-global-010);
    border-radius: 999px;
    color: var(--mythic-global-025);
    cursor: pointer;
    display: inline-flex;
    font-family: inherit;
    font-size: 0.66rem;
    font-weight: 720;
    line-height: 1;
    min-height: 1.2rem;
    padding: 0 0.42rem;
}
.mythic-c2-group-node-stat:hover {
    background-color: var(--mythic-global-026);
    border-color: var(--mythic-global-186);
    color: var(--mythic-global-027);
}
.mythic-c2-group-node-stat-success {
    background-color: var(--mythic-global-187);
    border-color: var(--mythic-global-188);
    color: var(--mythic-global-025);
}
.mythic-c2-group-node-stat-warning {
    background-color: var(--mythic-global-189);
    border-color: var(--mythic-global-190);
    color: var(--mythic-global-038);
}
.mythic-c2-group-node-stat-neutral {
    background-color: var(--mythic-global-191);
    border-color: var(--mythic-global-010);
    color: var(--mythic-global-025);
}
.mythic-c2-group-node-muted {
    color: var(--mythic-global-025);
    font-size: 0.66rem;
    font-weight: 620;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-c2-group-node-members {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-c2-group-node-members-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    max-height: 2.95rem;
    overflow: hidden;
}
.mythic-c2-group-node-member {
    background-color: var(--mythic-global-185);
    border: 1px solid var(--mythic-global-010);
    border-radius: 999px;
    color: var(--mythic-global-025);
    cursor: pointer;
    font-family: inherit;
    font-size: 0.64rem;
    font-weight: 740;
    line-height: 1;
    padding: 0.22rem 0.4rem;
}
.mythic-c2-group-node-member-active {
    border-color: var(--mythic-global-188);
    color: var(--mythic-global-025);
}
.mythic-c2-group-node-member:hover {
    background-color: var(--mythic-global-026);
    border-color: var(--mythic-global-186);
    color: var(--mythic-global-027);
}
.mythic-c2-group-node-member-muted {
    border-style: dashed;
    cursor: default;
}
.mythic-c2-group-node-actions {
    background-color: var(--mythic-global-192);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    padding: 0.24rem;
    position: relative;
    width: fit-content;
    z-index: 2;
}
.mythic-c2-group-node-actions button {
    background: transparent;
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    cursor: pointer;
    font-size: 0.64rem;
    font-weight: 740;
    padding: 0.24rem 0.42rem;
}
.mythic-c2-group-edge-summary {
    align-items: center;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-182);
    border-radius: 999px;
    box-shadow: var(--mythic-global-193);
    color: var(--mythic-global-025);
    cursor: pointer;
    display: inline-flex;
    font-size: 0.68rem;
    font-weight: 740;
    gap: 0.35rem;
    line-height: 1;
    padding: 0.34rem 0.5rem;
    white-space: nowrap;
}
.mythic-c2-group-edge-summary-success {
    border-color: var(--mythic-global-162);
    color: var(--mythic-global-035);
}
.mythic-c2-group-edge-summary-warning {
    border-color: var(--mythic-global-194);
    color: var(--mythic-global-038);
}
.mythic-c2-group-edge-summary:hover {
    background-color: var(--mythic-global-195);
    border-color: var(--mythic-global-158);
    color: var(--mythic-global-027);
}
.mythic-c2-collapsed-edge-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-bottom: 0.75rem;
}
.mythic-c2-collapsed-edge-chip {
    align-items: center;
    background-color: var(--mythic-global-185);
    border: 1px solid var(--mythic-global-010);
    border-radius: 999px;
    color: var(--mythic-global-025);
    display: inline-flex;
    font-size: 0.76rem;
    font-weight: 740;
    min-height: 1.6rem;
    padding: 0 0.65rem;
}
.mythic-c2-collapsed-edge-chip-success {
    background-color: var(--mythic-global-187);
    border-color: var(--mythic-global-196);
    color: var(--mythic-global-035);
}
.mythic-c2-collapsed-edge-chip-warning {
    background-color: var(--mythic-global-189);
    border-color: var(--mythic-global-197);
    color: var(--mythic-global-038);
}
.mythic-c2-collapsed-edge-profiles.MuiTypography-root {
    color: var(--mythic-global-025);
    font-size: 0.8rem;
    font-weight: 650;
    margin-bottom: 0.75rem;
}
.mythic-c2-collapsed-edge-filter.MuiOutlinedInput-root {
    margin-bottom: 0.75rem;
}
.mythic-c2-collapsed-edge-list {
    max-height: min(52vh, 34rem);
    overflow-y: auto;
}
.mythic-c2-collapsed-edge-card {
    cursor: default;
}
.mythic-c2-collapsed-edge-card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.25rem;
}
.mythic-c2-collapsed-edge-action.MuiButton-root {
    font-size: 0.68rem;
    min-height: 1.6rem;
    padding: 0.22rem 0.48rem;
    text-transform: none;
}
.mythic-c2-action-title-text.MuiTypography-root {
    color: var(--mythic-global-070);
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-c2-action-title-subtitle.MuiTypography-root {
    color: var(--mythic-global-198);
    font-size: 0.78rem;
    line-height: 1.35;
    margin-top: 0.18rem;
}
.mythic-c2-action-body {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    min-width: 0;
}
.mythic-c2-action-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
}
.mythic-c2-action-card {
    align-items: flex-start;
    background-color: var(--mythic-global-061);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    cursor: pointer;
    display: flex;
    gap: 0.65rem;
    justify-content: space-between;
    min-width: 0;
    padding: 0.65rem;
    text-align: left;
    width: 100%;
}
.mythic-c2-action-card:hover,
.mythic-c2-action-card-selected {
    background-color: var(--mythic-global-199);
    border-color: var(--mythic-global-200);
}
.mythic-c2-action-card-main {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
}
.mythic-c2-action-route {
    align-items: center;
    color: var(--mythic-global-002);
    display: flex;
    flex-wrap: wrap;
    font-size: 0.78rem;
    font-weight: 800;
    gap: 0.35rem;
}
.mythic-c2-action-route-profile {
    align-items: center;
    background-color: var(--mythic-global-201);
    border: 1px solid var(--mythic-global-202);
    border-radius: 999px;
    color: var(--mythic-global-027);
    display: inline-flex;
    font-size: 0.7rem;
    font-weight: 850;
    line-height: 1;
    padding: 0.22rem 0.42rem;
}
.mythic-c2-action-card-description.MuiTypography-root {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    line-height: 1.35;
}
.mythic-c2-action-state {
    align-items: center;
    border-radius: 999px;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 850;
    line-height: 1;
    padding: 0.24rem 0.42rem;
    white-space: nowrap;
}
.mythic-c2-action-state-active {
    background-color: var(--mythic-global-045);
    border: 1px solid var(--mythic-global-203);
    color: var(--mythic-global-035);
}
.mythic-c2-action-state-ended,
.mythic-c2-action-state-warning {
    background-color: var(--mythic-global-055);
    border: 1px solid var(--mythic-global-204);
    color: var(--mythic-global-038);
}
.mythic-c2-action-empty,
.mythic-c2-edge-empty-selection {
    align-items: center;
    background-color: var(--mythic-global-205);
    border: 1px dashed var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: flex;
    font-size: 0.78rem;
    min-height: 3rem;
    padding: 0.65rem;
}
.mythic-c2-action-command-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}
.mythic-c2-action-command-name {
    color: var(--mythic-global-002);
    font-family: var(--mythic-global-105);
    font-size: 0.82rem;
    font-weight: 850;
}
.mythic-c2-edge-form-grid,
.mythic-c2-edge-profile-row {
    margin-top: 0.75rem;
}
.mythic-c2-edge-source-field .mythic-c2-edge-callback-summary {
    margin-top: 0.45rem;
}
.mythic-c2-edge-callback-summary {
    align-items: flex-start;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 38px;
    padding: 0.55rem;
}
.mythic-c2-edge-summary-label.MuiTypography-root {
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 850;
    line-height: 1;
}
.mythic-c2-edge-summary-main {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-c2-edge-summary-label + .mythic-c2-edge-summary-main {
    margin-top: 0.35rem;
}
.mythic-c2-edge-callback-id {
    color: var(--mythic-global-002);
    font-size: 0.84rem;
    font-weight: 850;
}
.mythic-c2-edge-summary-description {
    color: var(--mythic-global-025);
    font-size: 0.76rem;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-callback-trigger-summary {
    align-items: flex-start;
    background-color: var(--mythic-global-061);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    gap: 0.75rem;
    min-width: 0;
    padding: 0.75rem;
}
.mythic-callback-trigger-summary-icon {
    align-items: center;
    background-color: var(--mythic-global-063);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    flex: 0 0 auto;
    height: 34px;
    justify-content: center;
    width: 34px;
}
.mythic-callback-trigger-summary-icon-active {
    background-color: var(--mythic-global-189);
    border-color: var(--mythic-global-206);
    color: var(--mythic-global-038);
}
.mythic-callback-trigger-summary-copy {
    min-width: 0;
}
.mythic-callback-trigger-summary-title.MuiTypography-root {
    color: var(--mythic-global-002);
    font-size: 0.9rem;
    font-weight: 800;
    line-height: 1.25;
}
.mythic-callback-trigger-summary-description.MuiTypography-root {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    line-height: 1.4;
    margin-top: 0.2rem;
}
.mythic-callback-trigger-rule-list {
    display: grid;
    gap: 0.45rem;
}
.mythic-callback-trigger-rule {
    background-color: var(--mythic-global-207);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    line-height: 1.4;
    padding: 0.55rem 0.65rem;
}
.mythic-callback-trigger-rule strong {
    color: var(--mythic-global-002);
}
.MythicInteractiveTerminal {
    background-color: var(--mythic-global-208);
}
.MythicInteractiveTerminal .xterm {
    height: 100%;
    padding: 6px 8px;
}
.MythicInteractiveTerminal .xterm-viewport {
    background-color: transparent !important;
}
.mythic-interactive-terminal-frame {
    border: 1px solid var(--mythic-global-209);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-interactive-terminal-toolbar {
    align-items: stretch;
    background-color: var(--mythic-global-210);
    border-bottom: 1px solid var(--mythic-global-211);
    color: var(--mythic-global-212);
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 0.3rem;
    min-height: 2.35rem;
    min-width: 0;
    padding: 0.3rem 0.45rem;
}
.mythic-interactive-terminal-toolbar-row {
    align-items: center;
    display: flex;
    gap: 0.45rem;
    min-width: 0;
    width: 100%;
}
.mythic-interactive-terminal-config-chip {
    align-items: center;
    background-color: var(--mythic-global-213);
    border: 1px solid var(--mythic-global-214);
    border-radius: var(--mythic-global-008);
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 800;
    gap: 0.3rem;
    line-height: 1;
    min-height: 1.65rem;
    padding: 0.28rem 0.48rem;
}
.mythic-interactive-terminal-config-chip:hover {
    background-color: var(--mythic-global-150);
    border-color: var(--mythic-global-215);
}
.mythic-interactive-terminal-toolbar-spacer {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-interactive-terminal-toggle-group {
    align-items: center;
    background-color: var(--mythic-global-216);
    border: 1px solid var(--mythic-global-211);
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    flex: 0 0 auto;
    overflow: hidden;
}
.mythic-interactive-terminal-toggle-button {
    align-items: center;
    background-color: transparent;
    border: 0;
    border-right: 1px solid var(--mythic-global-217);
    color: var(--mythic-global-218);
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 auto;
    height: 1.8rem;
    justify-content: center;
    padding: 0;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    width: 1.8rem;
}
.mythic-interactive-terminal-toggle-button:last-child {
    border-right: 0;
}
.mythic-interactive-terminal-toggle-button:hover {
    background-color: var(--mythic-global-219);
    color: var(--mythic-global-220);
}
.mythic-interactive-terminal-toggle-button.is-off {
    background-color: var(--mythic-global-221);
    color: var(--mythic-global-038);
}
.mythic-interactive-terminal-toggle-button.is-off:hover {
    background-color: var(--mythic-global-222);
    color: var(--mythic-global-038);
}
.mythic-interactive-terminal-shell {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    position: relative;
    width: 100%;
}
.mythic-interactive-terminal-empty-hint {
    color: var(--mythic-global-223);
    font-family: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.8rem;
    left: 0.75rem;
    pointer-events: none;
    position: absolute;
    top: 0.65rem;
}
.mythic-interactive-terminal-pending-chip {
    border: 1px solid var(--mythic-global-214);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-212);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1;
    padding: 0.22rem 0.36rem;
}
.mythic-interactive-terminal-pending {
    align-items: center;
    color: var(--mythic-global-224);
    display: flex;
    flex: 0 1 auto;
    gap: 0.3rem;
    margin-left: 0.15rem;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
}
.mythic-interactive-terminal-pending > span:first-child {
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
}
.mythic-interactive-terminal-pending-chip {
    background-color: var(--mythic-global-225);
    border-color: var(--mythic-global-226);
    max-width: 9rem;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-interactive-terminal-raw-warning {
    background-color: var(--mythic-global-189);
    border: 1px solid var(--mythic-global-227);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-228);
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1.35;
    padding: 0.35rem 0.5rem;
}
.mythic-response-render-toolbar {
    background-color: var(--mythic-global-210);
    border-bottom: 1px solid var(--mythic-global-211);
    color: var(--mythic-global-212);
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    min-width: 0;
}
.mythic-response-render-toolbar-toggle {
    align-items: center;
    background-color: transparent;
    border: 0;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    gap: 0.35rem;
    justify-content: flex-start;
    min-height: 2rem;
    min-width: 0;
    padding: 0.28rem 0.55rem;
    text-align: left;
    width: 100%;
}
.mythic-response-render-toolbar-toggle:hover {
    background-color: var(--mythic-global-219);
}
.mythic-response-render-toolbar-title {
    font-size: 0.75rem;
    font-weight: 850;
    line-height: 1;
}
.mythic-response-render-toolbar-mode {
    align-items: center;
    background-color: var(--mythic-global-213);
    border: 1px solid var(--mythic-global-214);
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1;
    min-height: 1.35rem;
    padding: 0.18rem 0.4rem;
}
.mythic-response-render-toolbar-controls {
    align-items: center;
    display: flex;
    flex-wrap: nowrap;
    gap: 0.45rem;
    min-width: 0;
    min-height: calc(1.8rem + 2px);
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.08rem 0.55rem 0.45rem;
}
.mythic-response-render-mode-group,
.mythic-response-render-action-group {
    align-items: center;
    background-color: var(--mythic-global-216);
    border: 1px solid var(--mythic-global-211);
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    flex: 0 0 auto;
    overflow: hidden;
}
.mythic-response-render-mode-button {
    align-items: center;
    background-color: transparent;
    border: 0;
    border-right: 1px solid var(--mythic-global-217);
    color: var(--mythic-global-218);
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    font-size: 0.72rem;
    font-weight: 800;
    gap: 0.25rem;
    justify-content: center;
    min-height: 1.8rem;
    padding: 0 0.52rem;
    transition: background-color 120ms ease, color 120ms ease;
}
.mythic-response-render-mode-button:last-child {
    border-right: 0;
}
.mythic-response-render-mode-button:hover {
    background-color: var(--mythic-global-219);
    color: var(--mythic-global-220);
}
.mythic-response-render-mode-button.is-selected {
    background-color: var(--mythic-global-225);
    color: var(--mythic-global-220);
}
.mythic-response-render-action-group {
    gap: 0;
}
.mythic-response-render-action-button {
    align-items: center;
    background-color: transparent;
    border: 0;
    border-right: 1px solid var(--mythic-global-217);
    color: var(--mythic-global-218);
    cursor: pointer;
    display: inline-flex;
    height: 1.8rem;
    justify-content: center;
    padding: 0;
    transition: background-color 120ms ease, color 120ms ease;
    width: 1.8rem;
}
.mythic-response-render-action-button:last-child {
    border-right: 0;
}
.mythic-response-render-action-button:hover {
    background-color: var(--mythic-global-219);
    color: var(--mythic-global-220);
}
.mythic-response-render-action-button.is-selected {
    background-color: var(--mythic-global-225);
    color: var(--mythic-global-220);
}
.mythic-response-syntax-group {
    align-items: center;
    background-color: var(--mythic-global-216);
    border: 1px solid var(--mythic-global-211);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-218);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 800;
    gap: 0.35rem;
    height: 1.8rem;
    line-height: 1;
    min-width: 0;
    overflow: hidden;
    padding: 0 0.42rem;
}
.mythic-response-syntax-select {
    background-color: transparent;
    border: 0;
    color: var(--mythic-global-220);
    cursor: pointer;
    font: inherit;
    height: 100%;
    min-width: 7.2rem;
    outline: none;
}
.mythic-response-syntax-select option {
    color: initial;
}
.mythic-response-markdown {
    box-sizing: border-box;
    color: var(--mythic-global-212);
    font-size: 0.86rem;
    line-height: 1.45;
    min-height: 0;
    max-width: 100%;
    overflow: auto;
    padding: 0.65rem 0.75rem;
    width: 100%;
}
.mythic-response-markdown.is-expanded {
    height: 100%;
}
.mythic-response-markdown.is-capped {
    max-height: 360px;
}
.mythic-response-markdown > :first-child {
    margin-top: 0;
}
.mythic-response-markdown > :last-child {
    margin-bottom: 0;
}
.mythic-response-markdown p {
    margin: 0 0 0.55rem;
    overflow-wrap: anywhere;
}
.mythic-response-markdown h1,
.mythic-response-markdown h2,
.mythic-response-markdown h3,
.mythic-response-markdown h4,
.mythic-response-markdown h5,
.mythic-response-markdown h6 {
    font-weight: 850;
    letter-spacing: 0;
    line-height: 1.22;
    margin: 0.8rem 0 0.45rem;
}
.mythic-response-markdown h1,
.mythic-response-markdown h2 {
    font-size: 1.05rem;
}
.mythic-response-markdown h3,
.mythic-response-markdown h4,
.mythic-response-markdown h5,
.mythic-response-markdown h6 {
    font-size: 0.92rem;
}
.mythic-response-markdown ul,
.mythic-response-markdown ol {
    margin: 0.35rem 0 0.65rem;
    padding-left: 1.35rem;
}
.mythic-response-markdown li {
    margin: 0.14rem 0;
}
.mythic-response-markdown blockquote {
    background-color: var(--mythic-global-216);
    border: 1px solid var(--mythic-global-211);
    border-left: 3px solid var(--mythic-global-215);
    border-radius: var(--mythic-global-008);
    margin: 0.5rem 0;
    padding: 0.45rem 0.6rem;
}
.mythic-response-markdown hr {
    border: 0;
    border-top: 1px solid var(--mythic-global-211);
    margin: 0.75rem 0;
}
.mythic-response-markdown a {
    color: var(--mythic-global-023);
}
.mythic-response-markdown-inline-code {
    background-color: var(--mythic-global-216);
    border: 1px solid var(--mythic-global-211);
    border-radius: 4px;
    font-family: var(--mythic-global-065);
    font-size: 0.9em;
    padding: 1px 4px;
}
.mythic-response-markdown-code-block {
    background-color: var(--mythic-global-216);
    border: 1px solid var(--mythic-global-211);
    border-radius: var(--mythic-global-008);
    font-family: var(--mythic-global-065);
    font-size: 0.82rem;
    margin: 0.45rem 0 0.65rem;
    overflow-x: auto;
    padding: 0.65rem;
}
.mythic-response-markdown-code-block code {
    font-family: inherit;
}
.mythic-response-markdown.is-wrapped .mythic-response-markdown-code-block code {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-response-markdown.is-unwrapped .mythic-response-markdown-code-block code {
    white-space: pre;
}
.mythic-response-markdown-table {
    border-collapse: collapse;
    display: block;
    margin: 0.45rem 0 0.65rem;
    max-width: 100%;
    overflow-x: auto;
    width: fit-content;
}
.mythic-response-markdown-table th,
.mythic-response-markdown-table td {
    border: 1px solid var(--mythic-global-211);
    padding: 0.35rem 0.5rem;
    text-align: left;
    vertical-align: top;
}
.mythic-response-markdown-table th {
    background-color: var(--mythic-global-216);
    font-weight: 850;
}
.mythic-response-terminal-shell {
    min-width: 0;
    width: 100%;
}
.mythic-response-terminal {
    min-height: 0;
    width: 100%;
}
@media (max-width: 760px) {
    .mythic-interactive-terminal-toolbar-row {
        flex-wrap: wrap;
    }
    .mythic-interactive-terminal-config-chip {
        flex: 1 1 auto;
        justify-content: center;
    }
}
.Toastify__toast {
    word-break: break-all;
    white-space: pre-wrap !important;
    display: flex;
    align-items: center;
    min-width: 100%;
    width: 100%;
}
.MuiPaper-root {
    border: 1px solid var(--mythic-global-005);
    border-radius: var(--mythic-global-008);
    background-color: var(--mythic-global-009);
    background-image: unset;
}
.no-box-shadow {
    box-shadow: unset;
}
.no-border {
    border: 0px !important;
}

.MuiList-root {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-005);
    border-radius: var(--mythic-global-008);
    line-height: 28px;
}
.dropdownMenuColored {
    background-color: var(--mythic-global-009) !important;
    border: 1px solid var(--mythic-global-005);
    border-radius: var(--mythic-global-008);
    //color: white;
}
// gets the title of the table
.MuiPaper-root > .MuiBox-root:first-child {
    margin: 0 0 0 0;
    padding: 0 0 0 5px;
    min-height: 2rem;
}
.MuiPaper-root > .MuiTableContainer-root.mythicElement {
    display: flex;
    flex-grow: 1;
}
.MuiTableContainer-root.mythic-fixed-row-table-wrap {
    display: block !important;
}
.MuiTableContainer-root.mythic-fixed-row-table-wrap > .MuiTable-root {
    height: auto !important;
}
// gets the footer of the table
.MuiPaper-root > .MuiBox-root > * {
    margin: 0;
    padding: 0 60px 0 5px;
    min-height: 2rem;
}
.selectedCallback {
    background-color: var(--mythic-global-229);
}
.selectedCallbackHierarchy {
    background-color: var(--mythic-global-230);
}

.roundedBottomCorners {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
}
.MuiInputLabel-root {
    color:  var(--mythic-global-025) !important;
}
.MuiOutlinedInput-notchedOutline {
    border-color: var(--mythic-global-005) !important;
}
.MuiInput-underline {
    border-color: var(--mythic-global-005) !important;
}
.MuiSelect-outlined {
    border-color: var(--mythic-global-005) !important;
}
.Mui-focused {
    border-color: var(--mythic-global-027) !important;
}
.MuiInputBase-input {
    border-color: var(--mythic-global-005) !important;
}
.MuiInput-root::after {
    border-color: var(--mythic-global-027) !important;
}
.MuiTableCell-root {
    padding: 6px 10px;
    border-bottom: 1px solid var(--mythic-global-010);
    font-variant-numeric: tabular-nums;
    line-height: 1.35;
    vertical-align: middle;
}
.mythic-table-footer {
    background: transparent;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem 0 0.75rem;
}
.mythic-table-footer .MuiPagination-root {
    padding: 0;
}
.mythic-table-total {
    color: var(--mythic-global-025);
    font-size: 0.82rem;
    font-weight: 650;
    padding-left: 0;
    white-space: nowrap;
}
.mythic-table-empty {
    color: var(--mythic-global-025);
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 8rem;
    margin: 0.5rem;
    padding: 1rem;
    text-align: center;
    width: 100%;
    background-color: var(--mythic-global-231);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    font-size: 0.86rem;
    font-weight: 750;
}
.mythic-table-toolbar {
    align-items: center;
    background-color: var(--mythic-global-061);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.5rem;
    height: auto;
    max-height: none;
    min-height: fit-content;
    overflow: visible;
    padding: 0.5rem;
    width: 100%;
}
.mythic-table-toolbar-search {
    align-items: stretch;
    background-color: var(--mythic-global-232);
    gap: 0.55rem;
    padding: 0.55rem;
}
.mythic-table-toolbar-group {
    align-content: center;
    align-items: center;
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    gap: 0.4rem;
    max-width: 100%;
    min-width: min(100%, 9rem);
}
.mythic-table-toolbar-search .mythic-table-toolbar-group {
    gap: 0.35rem;
}
.mythic-table-toolbar-group-label {
    color: var(--mythic-global-025);
    flex: 0 0 100%;
    font-size: 0.66rem;
    font-weight: 800;
    line-height: 1;
    padding-left: 0.1rem;
}
.mythic-table-toolbar-group-grow {
    flex: 1 1 20rem;
    min-width: min(100%, 16rem);
}
.mythic-table-toolbar-group .MuiFormControl-root,
.mythic-table-toolbar-group .MythicTextField-root {
    margin: 0;
    min-width: 0;
}
.mythic-toolbar-select {
    min-height: 32px;
    min-width: min(100%, 10rem);
    width: 100%;
}
.mythic-table-toolbar-search .mythic-toolbar-select,
.mythic-table-toolbar-search .MythicTextField-root .MuiInputBase-root {
    background-color: var(--mythic-global-009);
}
.mythic-toolbar-button {
    white-space: nowrap;
}
.mythic-toolbar-button-hover-success {
    background-color: var(--mythic-global-029) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008) !important;
    box-shadow: none !important;
    color: var(--mythic-global-002) !important;
    font-weight: 750;
    min-height: 32px;
    text-transform: none;
}
.mythic-toolbar-button-hover-success:hover {
    background-color: var(--mythic-global-233) !important;
    border-color: var(--mythic-global-234) !important;
    color: var(--mythic-global-035) !important;
}
.mythic-toolbar-toggle {
    background-color: var(--mythic-global-207) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008) !important;
    color: var(--mythic-global-025) !important;
    gap: 0.35rem;
    min-height: 32px;
    text-transform: none;
    white-space: nowrap;
}
.mythic-toolbar-toggle.Mui-selected {
    background-color: var(--mythic-global-235) !important;
    border-color: var(--mythic-global-236) !important;
    color: var(--mythic-global-027) !important;
}
.mythic-toolbar-toggle:hover,
.mythic-toolbar-toggle.Mui-selected:hover {
    background-color: var(--mythic-global-237) !important;
    border-color: var(--mythic-global-238) !important;
    color: var(--mythic-global-027) !important;
}
.mythic-toolbar-icon-button {
    color: var(--mythic-global-025) !important;
    margin-right: 2px;
}
.mythic-toolbar-icon-button:hover {
    background-color: var(--mythic-global-239) !important;
    color: var(--mythic-global-027) !important;
}
.mythic-dialog-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
    width: 100%;
}
.mythic-dialog-body-compact {
    gap: 0.55rem;
}
.mythic-dialog-title-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-dialog-title-action {
    background-color: var(--mythic-global-029) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008);
    box-shadow: none !important;
    color: var(--mythic-global-002) !important;
    font-size: 0.76rem;
    font-weight: 750;
    min-height: 30px;
    text-transform: none;
}
.mythic-ui-settings-title-row {
    align-items: flex-start;
}
.mythic-ui-settings-title-copy {
    display: flex;
    flex: 1 1 22rem;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}
.mythic-ui-settings-title {
    color: var(--mythic-global-002);
    font-size: 1.05rem;
    font-weight: 750;
    line-height: 1.25;
}
.mythic-ui-settings-subtitle {
    color: var(--mythic-global-025);
    line-height: 1.35;
}
.mythic-ui-settings-title-actions {
    align-items: center;
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-end;
    min-width: 0;
}
.mythic-ui-settings-title-button.MuiButton-root {
    min-height: 31px;
    min-width: auto;
    padding: 0.35rem 0.65rem;
}
.mythic-ui-settings-title-button-info.MuiButton-root:hover {
    background-color: var(--mythic-global-044) !important;
    border-color: var(--mythic-global-240) !important;
    color: var(--mythic-global-023) !important;
}
.mythic-ui-settings-title-button-success.MuiButton-root:hover {
    background-color: var(--mythic-global-045) !important;
    border-color: var(--mythic-global-241) !important;
    color: var(--mythic-global-035) !important;
}
.mythic-tasking-visibility-panel {
    background-color: var(--mythic-global-242);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.8rem;
}
.mythic-tasking-visibility-summary-panel {
    display: grid;
    grid-template-columns: minmax(12rem, 0.85fr) minmax(12rem, 1.15fr);
}
.mythic-tasking-visibility-header {
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-tasking-visibility-title {
    color: var(--mythic-global-002);
    font-size: 0.92rem;
    font-weight: 800;
    line-height: 1.25;
}
.mythic-tasking-visibility-description {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    line-height: 1.35;
}
.mythic-tasking-visibility-count {
    background-color: var(--mythic-global-092);
    border: 1px solid var(--mythic-global-243);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-023);
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1;
    padding: 0.35rem 0.5rem;
    white-space: nowrap;
}
.mythic-tasking-visibility-summary-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: flex-end;
    min-width: 0;
}
.mythic-tasking-visibility-manage-button.MuiButton-root {
    min-height: 30px;
    padding: 0.3rem 0.65rem;
}
.mythic-tasking-visibility-chip-row {
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: 0.35rem;
    grid-column: 1 / -1;
    min-width: 0;
}
.mythic-tasking-visibility-chip {
    align-items: center;
    background-color: var(--mythic-global-091);
    border: 1px solid var(--mythic-global-244);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    display: inline-flex;
    font-size: 0.76rem;
    font-weight: 750;
    gap: 0.35rem;
    line-height: 1.2;
    min-height: 28px;
    min-width: 0;
    padding: 0.22rem 0.52rem 0.22rem 0.3rem;
}
.mythic-tasking-visibility-chip-index {
    align-items: center;
    background-color: var(--mythic-global-023);
    border-radius: var(--mythic-global-245);
    color: var(--mythic-global-246);
    display: inline-flex;
    font-size: 0.68rem;
    font-weight: 850;
    height: 19px;
    justify-content: center;
    min-width: 19px;
    padding: 0 0.24rem;
}
.mythic-tasking-visibility-empty {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-style: italic;
}
.mythic-tasking-visibility-grid {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
}
.mythic-tasking-visibility-option.MuiButton-root {
    align-items: flex-start;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: none;
    color: var(--mythic-global-025);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    justify-content: flex-start;
    min-height: 4.2rem;
    padding: 0.65rem 0.75rem;
    text-align: left;
    text-transform: none;
}
.mythic-tasking-visibility-option.MuiButton-root:hover {
    background-color: var(--mythic-global-247);
    border-color: var(--mythic-global-248);
}
.mythic-tasking-visibility-option.MuiButton-root.selected {
    background-color: var(--mythic-global-044);
    border-color: var(--mythic-global-249);
    color: var(--mythic-global-002);
    box-shadow: inset 3px 0 0 var(--mythic-global-023);
}
.mythic-tasking-visibility-option-title {
    color: inherit;
    font-size: 0.8rem;
    font-weight: 800;
    line-height: 1.2;
}
.mythic-tasking-visibility-option-description {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.25;
}
.mythic-tasking-metadata-row .mythic-reorder-row-main {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.12rem;
}
.mythic-reorder-row-description {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
@media (max-width: 760px) {
    .mythic-tasking-visibility-summary-panel {
        grid-template-columns: 1fr;
    }
    .mythic-tasking-visibility-summary-actions {
        justify-content: flex-start;
    }
}
.mythic-dialog-title-select {
    background-color: var(--mythic-global-029);
    border-radius: var(--mythic-global-008);
    min-width: 11rem;
}
.mythic-detail-section-header {
    align-items: center;
    background-color: var(--mythic-global-250);
    background-image: var(--mythic-global-069);
    border: 1px solid var(--mythic-global-251);
    border-radius: var(--mythic-global-008);
    box-shadow: inset 0 1px 0 var(--mythic-global-252), 0 2px 6px var(--mythic-global-253);
    color: var(--mythic-global-070);
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: space-between;
    margin: 0.75rem 0 0.5rem;
    min-height: 58px;
    min-width: 0;
    overflow: hidden;
    padding: 0.7rem 0.85rem 0.7rem 1rem;
    position: relative;
    width: 100%;
}
.mythic-section-header {
    background-image: var(--mythic-global-069) !important;
    border-color: var(--mythic-global-251) !important;
    box-shadow: inset 0 1px 0 var(--mythic-global-252), 0 2px 6px var(--mythic-global-253) !important;
    overflow: hidden !important;
    padding-left: 1rem !important;
    position: relative !important;
}
.mythic-detail-section-title {
    color: var(--mythic-global-070);
    font-size: 1.25rem;
    font-weight: 750;
    letter-spacing: 0;
    line-height: 1.18;
}
.mythic-detail-section-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.45rem;
}
.mythic-detail-section-header .MuiButton-root,
.mythic-detail-section-header .MuiIconButton-root {
    background-color: var(--mythic-global-254) !important;
    border: 1px solid var(--mythic-global-255) !important;
    border-radius: var(--mythic-global-008) !important;
    box-shadow: none !important;
    color: var(--mythic-global-070) !important;
    font-size: 0.76rem;
    font-weight: 750;
    min-height: 32px;
    text-transform: none;
}
.mythic-detail-section-header .MuiButton-root:hover,
.mythic-detail-section-header .MuiIconButton-root:hover {
    background-color: var(--mythic-global-256) !important;
    border-color: var(--mythic-global-257) !important;
}
.mythic-dialog-section {
    background-color: var(--mythic-global-061);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
    padding: 0.75rem;
}
.mythic-dialog-section-header {
    align-items: flex-start;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    margin-bottom: 0.65rem;
    min-width: 0;
}
.mythic-dialog-section-title {
    color: var(--mythic-global-002);
    font-size: 0.86rem;
    font-weight: 700;
    line-height: 1.25;
}
.mythic-dialog-section-description {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    line-height: 1.35;
    margin-top: 0.12rem;
}
.mythic-dialog-section-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 0.4rem;
}
.mythic-dialog-section-actions .MuiButton-root {
    background-color: var(--mythic-global-029) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002) !important;
    font-size: 0.74rem;
    font-weight: 750;
    min-height: 28px;
    text-transform: none;
}
.mythic-dialog-section-actions .MuiButton-root:hover {
    background-color: var(--mythic-global-258) !important;
}
.mythic-reorder-list {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.45rem;
    max-height: 100%;
    min-height: 0;
    overflow: auto;
    padding: 0.1rem;
}
.mythic-reorder-row {
    align-items: center;
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: none;
    color: var(--mythic-global-002);
    display: flex;
    flex: 0 0 auto;
    gap: 0.5rem;
    min-height: 44px;
    min-width: 0;
    padding: 0.45rem 0.55rem;
    transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
    width: 100%;
}
.mythic-reorder-row:hover {
    background-color: var(--mythic-global-013);
    border-color: var(--mythic-global-007);
}
.mythic-reorder-row-dragging {
    background-color: var(--mythic-global-259);
    border-color: var(--mythic-global-260);
    box-shadow: var(--mythic-global-261);
}
.mythic-reorder-row-disabled {
    background-color: var(--mythic-global-262);
}
.mythic-reorder-row-disabled .mythic-reorder-row-title {
    color: var(--mythic-global-025);
}
.mythic-reorder-drag-handle {
    align-items: center;
    background-color: var(--mythic-global-263);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    cursor: grab;
    display: inline-flex;
    flex: 0 0 30px;
    height: 30px;
    justify-content: center;
    width: 30px;
}
.mythic-reorder-drag-handle:active {
    cursor: grabbing;
}
.mythic-reorder-row-main {
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    gap: 0.5rem;
    min-width: 0;
}
.mythic-reorder-row-title {
    font-size: 0.82rem;
    font-weight: 750;
    line-height: 1.25;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-reorder-row-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 0.35rem;
}
.mythic-reorder-select {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-reorder-select .MuiSelect-select {
    min-height: 30px;
    padding-bottom: 0.25rem;
    padding-top: 0.25rem;
}
.mythic-parameter-list {
    display: grid;
    gap: 0.65rem;
    min-width: 0;
}
.mythic-parameter-card {
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
    padding: 0.75rem;
}
.mythic-parameter-card-header {
    align-items: flex-start;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-parameter-title {
    color: var(--mythic-global-002);
    font-size: 0.9rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-parameter-description {
    color: var(--mythic-global-025);
    font-size: 0.8rem;
    line-height: 1.4;
    margin-top: 0.25rem;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-metadata-grid {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
    margin-top: 0.65rem;
    min-width: 0;
}
.mythic-metadata-item {
    background-color: var(--mythic-global-207);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
    padding: 0.5rem 0.55rem;
}
.mythic-metadata-label {
    color: var(--mythic-global-025);
    display: block;
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1.2;
    text-transform: uppercase;
}
.mythic-metadata-value,
.mythic-metadata-code {
    color: var(--mythic-global-002);
    display: block;
    font-size: 0.78rem;
    line-height: 1.35;
    margin-top: 0.18rem;
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-metadata-code {
    font-family: var(--mythic-global-105);
}
.mythic-parameter-notes {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.65rem;
}
.mythic-parameter-note {
    background-color: var(--mythic-global-264);
    border: 1px solid var(--mythic-global-265);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    line-height: 1.4;
    padding: 0.55rem 0.65rem;
}
.mythic-parameter-note strong {
    color: var(--mythic-global-002);
}
.mythic-code-block {
    background-color: var(--mythic-global-266);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    display: block;
    font-family: var(--mythic-global-105);
    font-size: 0.76rem;
    line-height: 1.45;
    margin: 0.45rem 0 0;
    overflow: auto;
    padding: 0.55rem 0.65rem;
    white-space: pre;
}
.mythic-json-title-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    justify-content: space-between;
    min-width: 0;
    width: 100%;
}
.mythic-json-dialog-body.MuiDialogContent-root {
    gap: 0.65rem;
    max-height: min(72vh, 54rem);
    overflow: auto;
    padding: 0.85rem !important;
}
.mythic-json-panel {
    background-color: var(--mythic-global-107);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
    padding: 0.55rem;
}
.mythic-json-panel-root {
    background-color: var(--mythic-global-061);
}
.mythic-json-panel-header {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-json-panel-title {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-json-type-badge {
    align-items: center;
    background-color: var(--mythic-global-267);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1;
    min-height: 22px;
    padding: 0.22rem 0.42rem;
    white-space: nowrap;
}
.mythic-json-type-object,
.mythic-json-type-array {
    background-color: var(--mythic-global-268);
    border-color: var(--mythic-global-269);
    color: var(--mythic-global-023);
}
.mythic-json-table-wrap {
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    max-height: 48vh;
    overflow: auto;
}
.mythic-json-table-wrap .MuiTableCell-root {
    border-bottom-color: var(--mythic-global-010);
    vertical-align: top;
}
.mythic-json-table-wrap .MuiTableHead-root .MuiTableCell-root {
    color: var(--mythic-global-002);
    font-size: 0.72rem;
    font-weight: 800;
}
.mythic-json-key-cell {
    background-color: var(--mythic-global-270);
}
.mythic-json-key-stack {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
    min-width: 0;
}
.mythic-json-key {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1.25;
    overflow-wrap: anywhere;
}
.mythic-json-value-cell {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    line-height: 1.35;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-json-index-cell {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    font-weight: 800;
    text-align: right;
}
.mythic-json-value-primitive {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    line-height: 1.35;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-json-value-empty {
    color: var(--mythic-global-066);
    font-size: 0.76rem;
    font-style: italic;
}
.mythic-json-value-boolean {
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1;
    padding: 0.22rem 0.45rem;
}
.mythic-json-value-true {
    background-color: var(--mythic-global-271);
    border-color: var(--mythic-global-272);
    color: var(--mythic-global-035);
}
.mythic-json-value-false {
    background-color: var(--mythic-global-088);
    border-color: var(--mythic-global-227);
    color: var(--mythic-global-038);
}
.mythic-json-empty-state {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-style: italic;
    padding: 0.45rem 0.2rem;
}
.MuiDialogActions-root,
.mythic-dialog-actions {
    align-items: center;
    background-color: var(--mythic-global-061);
    border-top: 1px solid var(--mythic-global-010);
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: flex-end;
    margin: 0;
    padding: 0.65rem 0.9rem;
}
.MuiDialogActions-root > :not(style) ~ :not(style) {
    margin-left: 0;
}
.MuiDialogActions-root .MuiButton-root,
.mythic-dialog-actions .MuiButton-root {
    align-items: center;
    background-color: var(--mythic-global-029) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008);
    box-shadow: none !important;
    color: var(--mythic-global-002) !important;
    font-size: 0.78rem;
    font-weight: 750;
    justify-content: center;
    letter-spacing: 0;
    line-height: 1.2;
    min-height: 34px;
    min-width: min(100%, 7rem);
    padding: 0.35rem 0.85rem;
    text-transform: none;
    white-space: nowrap;
}
.MuiDialogActions-root .MuiButton-root:hover,
.mythic-dialog-actions .MuiButton-root:hover {
    background-color: var(--mythic-global-258) !important;
    border-color: var(--mythic-global-007) !important;
}
.MuiDialogActions-root .MuiButton-root.MuiButton-colorSuccess,
.MuiDialogActions-root .MuiButton-root.MuiButton-containedSuccess,
.MuiDialogActions-root .MuiButton-root.MuiButton-outlinedSuccess,
.MuiDialogActions-root .mythic-dialog-button-primary,
.mythic-dialog-actions .MuiButton-root.MuiButton-colorSuccess,
.mythic-dialog-actions .MuiButton-root.MuiButton-containedSuccess,
.mythic-dialog-actions .MuiButton-root.MuiButton-outlinedSuccess,
.mythic-dialog-actions .mythic-dialog-button-primary {
    background-color: var(--mythic-global-027) !important;
    border-color: var(--mythic-global-027) !important;
    color: var(--mythic-global-273) !important;
}
.MuiDialogActions-root .MuiButton-root.MuiButton-colorSuccess:hover,
.MuiDialogActions-root .MuiButton-root.MuiButton-containedSuccess:hover,
.MuiDialogActions-root .MuiButton-root.MuiButton-outlinedSuccess:hover,
.MuiDialogActions-root .mythic-dialog-button-primary:hover,
.mythic-dialog-actions .MuiButton-root.MuiButton-colorSuccess:hover,
.mythic-dialog-actions .MuiButton-root.MuiButton-containedSuccess:hover,
.mythic-dialog-actions .MuiButton-root.MuiButton-outlinedSuccess:hover,
.mythic-dialog-actions .mythic-dialog-button-primary:hover {
    background-color: var(--mythic-global-274) !important;
    border-color: var(--mythic-global-274) !important;
}
.MuiDialogActions-root .MuiButton-root.MuiButton-colorWarning,
.MuiDialogActions-root .MuiButton-root.MuiButton-containedWarning,
.MuiDialogActions-root .MuiButton-root.MuiButton-outlinedWarning,
.MuiDialogActions-root .mythic-dialog-button-warning,
.mythic-dialog-actions .MuiButton-root.MuiButton-colorWarning,
.mythic-dialog-actions .MuiButton-root.MuiButton-containedWarning,
.mythic-dialog-actions .MuiButton-root.MuiButton-outlinedWarning,
.mythic-dialog-actions .mythic-dialog-button-warning {
    background-color: var(--mythic-global-275) !important;
    border-color: var(--mythic-global-276) !important;
    color: var(--mythic-global-038) !important;
}
.MuiDialogActions-root .MuiButton-root.MuiButton-colorError,
.MuiDialogActions-root .MuiButton-root.MuiButton-containedError,
.MuiDialogActions-root .MuiButton-root.MuiButton-outlinedError,
.MuiDialogActions-root .mythic-dialog-button-destructive,
.mythic-dialog-actions .MuiButton-root.MuiButton-colorError,
.mythic-dialog-actions .MuiButton-root.MuiButton-containedError,
.mythic-dialog-actions .MuiButton-root.MuiButton-outlinedError,
.mythic-dialog-actions .mythic-dialog-button-destructive {
    background-color: var(--mythic-global-277) !important;
    border-color: var(--mythic-global-278) !important;
    color: var(--mythic-global-048) !important;
}
.MuiDialogActions-root .MuiButton-root.MuiButton-colorInfo,
.MuiDialogActions-root .MuiButton-root.MuiButton-containedInfo,
.MuiDialogActions-root .MuiButton-root.MuiButton-outlinedInfo,
.MuiDialogActions-root .mythic-dialog-button-info,
.mythic-dialog-actions .MuiButton-root.MuiButton-colorInfo,
.mythic-dialog-actions .MuiButton-root.MuiButton-containedInfo,
.mythic-dialog-actions .MuiButton-root.MuiButton-outlinedInfo,
.mythic-dialog-actions .mythic-dialog-button-info {
    background-color: var(--mythic-global-279) !important;
    border-color: var(--mythic-global-280) !important;
    color: var(--mythic-global-023) !important;
}
.MuiDialogActions-root .MuiButton-root.Mui-disabled,
.mythic-dialog-actions .MuiButton-root.Mui-disabled {
    background-color: var(--mythic-global-281) !important;
    border-color: var(--mythic-global-010) !important;
    color: var(--mythic-global-066) !important;
}
.mythic-raw-select-dialog-content.MuiDialogContent-root {
    background-color: var(--mythic-global-009);
    padding: 0;
}
.mythic-raw-select-list {
    gap: 0.45rem;
    max-height: min(55vh, 28rem);
    overflow-y: auto;
    padding: 0.6rem;
}
.mythic-raw-select-row {
    align-items: center;
    background-color: var(--mythic-global-282);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    cursor: pointer;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-height: 42px;
    min-width: 0;
    padding: 0.45rem 0.55rem 0.45rem 0.75rem;
    transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
    width: 100%;
}
.mythic-raw-select-row:hover {
    background-color: var(--mythic-global-283);
    border-color: var(--mythic-global-284);
}
.mythic-raw-select-row:focus-visible {
    border-color: var(--mythic-global-023);
    box-shadow: 0 0 0 2px var(--mythic-global-285);
    outline: none;
}
.mythic-raw-select-value.MuiTypography-root {
    color: var(--mythic-global-002);
    font-size: 0.86rem;
    font-variant-numeric: tabular-nums;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-raw-select-action.MuiButton-root {
    flex: 0 0 auto;
    min-height: 28px;
    min-width: 5rem;
    padding: 0.25rem 0.65rem;
}
.mythic-raw-select-empty {
    align-items: center;
    color: var(--mythic-global-025);
    display: flex;
    justify-content: center;
    min-height: 8rem;
    padding: 1rem;
    text-align: center;
}
.mythic-dialog-grid {
    align-items: start;
    display: grid;
    gap: 0.65rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--mythic-dialog-grid-min, 16rem)), 1fr));
    min-width: 0;
    width: 100%;
}
.mythic-dialog-choice-row {
    align-items: center;
    display: grid;
    gap: 0.55rem;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    width: 100%;
}
.mythic-dialog-choice-divider {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 700;
    text-align: center;
}
.mythic-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
    width: 100%;
}
.mythic-form-grid {
    align-items: start;
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--mythic-form-grid-min, 16rem)), 1fr));
    min-width: 0;
    width: 100%;
}
.mythic-form-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-form-field-copy {
    min-width: 0;
}
.mythic-form-field-label {
    color: var(--mythic-global-002);
    display: block;
    font-size: 0.78rem;
    font-weight: 750;
    letter-spacing: 0;
    line-height: 1.25;
}
.mythic-form-field-required {
    color: var(--mythic-global-048);
}
.mythic-form-field-description {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    line-height: 1.35;
    margin-top: 0.1rem;
}
.mythic-form-field-control {
    min-width: 0;
    width: 100%;
}
.mythic-form-field-control .MuiFormControl-root,
.mythic-form-field-control .MuiTextField-root,
.mythic-form .MuiFormControl-root,
.mythic-form .MuiTextField-root {
    margin: 0 !important;
}
.mythic-form-field-control .MuiFormControl-root:has(> .MuiInputLabel-root),
.mythic-form-field-control .MuiTextField-root:has(> .MuiInputLabel-root),
.mythic-form .MuiFormControl-root:has(> .MuiInputLabel-root),
.mythic-form .MuiTextField-root:has(> .MuiInputLabel-root) {
    margin-top: 0.45rem !important;
}
.mythic-form-field-control .MuiInputBase-root,
.mythic-form .MuiInputBase-root {
    min-height: 38px;
}
.mythic-form-note {
    background-color: var(--mythic-global-063);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    font-size: 0.8rem;
    line-height: 1.4;
    padding: 0.65rem 0.75rem;
}
.mythic-tag-editor-frame {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-tag-editor-frame .ace_editor {
    background-color: var(--mythic-global-009) !important;
}
.mythic-tag-data-split {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    min-width: 0;
    width: 100%;
}
.mythic-tag-data-preview-frame {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    max-height: 30rem;
    min-height: 10rem;
    min-width: 0;
    overflow: auto;
    padding: 0.55rem;
}
.mythic-tag-data-preview-frame-full {
    max-height: min(48vh, 34rem);
}
.mythic-tag-readonly-value {
    align-items: center;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    display: flex;
    font-size: 0.84rem;
    line-height: 1.35;
    min-height: 34px;
    min-width: 0;
    overflow-wrap: anywhere;
    padding: 0.45rem 0.6rem;
    width: 100%;
}
.mythic-tag-data-preview-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
}
.mythic-tag-data-preview-row {
    background-color: var(--mythic-global-107);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: grid;
    gap: 0.5rem;
    grid-template-columns: minmax(7rem, 0.35fr) minmax(0, 1fr);
    min-width: 0;
    padding: 0.45rem 0.55rem;
}
.mythic-tag-data-preview-key {
    color: var(--mythic-global-025);
    font-size: 0.76rem;
    font-weight: 800;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-tag-data-preview-value {
    color: var(--mythic-global-002);
    font-size: 0.82rem;
    line-height: 1.35;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-tag-data-preview-value pre {
    margin: 0;
    white-space: pre-wrap;
}
.mythic-tag-data-preview-empty {
    align-items: center;
    color: var(--mythic-global-025);
    display: flex;
    font-size: 0.82rem;
    justify-content: center;
    min-height: 9rem;
    text-align: center;
}
@media (max-width: 900px) {
    .mythic-tag-data-split {
        grid-template-columns: 1fr;
    }
}
.mythic-form-switch-row {
    align-items: center;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
    padding: 0.65rem 0.75rem;
    width: 100%;
}
.mythic-form-switch-control {
    flex: 0 0 auto;
}
.mythic-api-token-scope-count {
    background-color: var(--mythic-global-286) !important;
    border: 1px solid var(--mythic-global-010) !important;
    color: var(--mythic-global-002) !important;
    font-size: 0.72rem;
    font-weight: 750;
}
.mythic-api-token-scope-search {
    margin-bottom: 0.65rem !important;
}
.mythic-api-token-scope-search .MuiInputBase-root {
    background-color: var(--mythic-global-094);
}
.mythic-api-token-scope-library {
    background-color: var(--mythic-global-287);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    max-height: 48vh;
    min-height: 14rem;
    overflow: auto;
    padding: 0.65rem;
}
.mythic-api-token-scope-state {
    align-items: center;
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: flex;
    justify-content: center;
    min-height: 7rem;
    padding: 1rem;
    text-align: center;
}
.mythic-api-token-scope-state-error {
    background-color: var(--mythic-global-288);
    border-color: var(--mythic-global-289);
    color: var(--mythic-global-048);
}
.mythic-api-token-resource-card {
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    min-width: 0;
    padding: 0.75rem;
}
.mythic-api-token-resource-header {
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-api-token-resource-title {
    color: var(--mythic-global-002);
    font-size: 0.9rem;
    font-weight: 800;
    line-height: 1.2;
    text-transform: capitalize;
}
.mythic-api-token-resource-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    line-height: 1.35;
    margin-top: 0.15rem;
}
.mythic-api-token-resource-wildcard {
    align-items: center;
    background-color: var(--mythic-global-290);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.76rem;
    font-weight: 750;
    gap: 0.25rem;
    min-height: 32px;
    padding: 0.1rem 0.55rem 0.1rem 0.2rem;
}
.mythic-api-token-resource-wildcard-selected {
    background-color: var(--mythic-global-291);
    border-color: var(--mythic-global-292);
    color: var(--mythic-global-027);
}
.mythic-api-token-resource-wildcard-disabled {
    cursor: default;
    opacity: 0.68;
}
.mythic-api-token-resource-wildcard .MuiCheckbox-root {
    padding: 0.1rem;
}
.mythic-api-token-scope-grid {
    display: grid;
    gap: 0.55rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    min-width: 0;
}
.mythic-api-token-scope-card {
    align-items: flex-start;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    cursor: pointer;
    display: flex;
    gap: 0.35rem;
    min-width: 0;
    padding: 0.55rem 0.65rem 0.6rem 0.35rem;
    transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}
.mythic-api-token-scope-card:hover {
    background-color: var(--mythic-global-013);
    border-color: var(--mythic-global-007);
}
.mythic-api-token-scope-card-selected {
    background-color: var(--mythic-global-026);
    border-color: var(--mythic-global-292);
}
.mythic-api-token-scope-card-inherited {
    cursor: default;
}
.mythic-api-token-scope-card-disabled {
    cursor: default;
    opacity: 0.68;
}
.mythic-api-token-scope-card .MuiCheckbox-root {
    padding: 0.1rem;
}
.mythic-api-token-scope-card-full {
    background-color: var(--mythic-global-142);
    border-color: var(--mythic-global-293);
}
.mythic-api-token-scope-card-copy {
    min-width: 0;
    width: 100%;
}
.mythic-api-token-scope-card-title-row {
    align-items: flex-start;
    display: flex;
    gap: 0.45rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-api-token-scope-card-title {
    color: var(--mythic-global-002);
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-api-token-scope-name {
    color: var(--mythic-global-025);
    font-family: var(--mythic-global-105);
    font-size: 0.7rem;
    line-height: 1.35;
    margin-top: 0.18rem;
    overflow-wrap: anywhere;
}
.mythic-api-token-scope-card-description,
.mythic-api-token-scope-includes {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    line-height: 1.35;
    margin-top: 0.25rem;
    overflow-wrap: anywhere;
}
.mythic-api-token-scope-includes {
    color: var(--mythic-global-023);
    font-weight: 700;
}
.mythic-api-token-access-chip {
    border-radius: var(--mythic-global-008) !important;
    flex: 0 0 auto;
    font-size: 0.66rem !important;
    font-weight: 800 !important;
    height: 20px !important;
    text-transform: capitalize;
}
.mythic-api-token-access-chip-read {
    background-color: var(--mythic-global-150) !important;
    border: 1px solid var(--mythic-global-294) !important;
    color: var(--mythic-global-023) !important;
}
.mythic-api-token-access-chip-write,
.mythic-api-token-access-chip-create,
.mythic-api-token-access-chip-update {
    background-color: var(--mythic-global-049) !important;
    border: 1px solid var(--mythic-global-295) !important;
    color: var(--mythic-global-035) !important;
}
.mythic-api-token-access-chip-delete,
.mythic-api-token-access-chip-admin {
    background-color: var(--mythic-global-051) !important;
    border: 1px solid var(--mythic-global-296) !important;
    color: var(--mythic-global-048) !important;
}
.mythic-api-token-access-chip-unknown {
    background-color: var(--mythic-global-029) !important;
    border: 1px solid var(--mythic-global-010) !important;
    color: var(--mythic-global-025) !important;
}
.mythic-api-token-copy-warning {
    background-color: var(--mythic-global-039);
    border-color: var(--mythic-global-297);
    color: var(--mythic-global-002);
}
.mythic-api-token-value-field .MuiInputBase-root {
    background-color: var(--mythic-global-298);
    font-family: var(--mythic-global-105);
    font-size: 0.78rem;
    line-height: 1.45;
}
.mythic-browser-script-dialog-content {
    display: flex;
    flex-direction: column;
    height: min(74vh, calc(100vh - 9rem));
    min-height: min(38rem, calc(100vh - 9rem));
    overflow: hidden;
}
.mythic-browser-script-dialog-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
}
.mythic-browser-script-dialog-body > .mythic-browser-script-target-panel {
    flex: 0 0 auto;
}
.mythic-browser-script-target-panel {
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: var(--mythic-global-299);
    overflow: hidden;
}
.mythic-browser-script-target-summary {
    align-items: center;
    display: flex;
    gap: 0.65rem;
    justify-content: space-between;
    min-height: 42px;
    padding: 0.42rem 0.5rem 0.42rem 0.7rem;
}
.mythic-browser-script-target-panel-open .mythic-browser-script-target-summary {
    border-bottom: 1px solid var(--mythic-global-010);
}
.mythic-browser-script-target-copy {
    align-items: center;
    display: flex;
    gap: 0.65rem;
    min-width: 0;
}
.mythic-browser-script-target-label {
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    font-size: 0.74rem;
    font-weight: 800;
    line-height: 1;
}
.mythic-browser-script-target-chips {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-browser-script-target-chips .MuiChip-root {
    background-color: var(--mythic-global-286);
    border: 1px solid var(--mythic-global-010);
    color: var(--mythic-global-002);
    font-size: 0.72rem;
    font-weight: 750;
    max-width: 18rem;
}
.mythic-browser-script-target-chips .MuiChip-label {
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-browser-script-target-toggle {
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008) !important;
    color: var(--mythic-global-025) !important;
}
.mythic-browser-script-target-toggle:hover {
    background-color: var(--mythic-global-300) !important;
    border-color: var(--mythic-global-301) !important;
    color: var(--mythic-global-027) !important;
}
.mythic-browser-script-target-details {
    background-color: var(--mythic-global-061);
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.65rem;
}
.mythic-browser-script-workbench {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    width: 100%;
}
.mythic-browser-script-top-split {
    display: flex;
    min-height: 0;
    min-width: 0;
    width: 100%;
}
.mythic-browser-script-workbench > .gutter.gutter-vertical,
.mythic-browser-script-top-split > .gutter.gutter-horizontal {
    background-color: var(--mythic-global-302);
    border-radius: 999px;
    flex: 0 0 auto;
}
.mythic-browser-script-workbench > .gutter.gutter-vertical:hover,
.mythic-browser-script-top-split > .gutter.gutter-horizontal:hover {
    background-color: var(--mythic-global-303);
}
.mythic-browser-script-pane {
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}
.mythic-browser-script-editor-pane {
    height: 100%;
}
.mythic-browser-script-console-pane {
    height: 100%;
}
.mythic-browser-script-preview-pane {
    height: 100%;
}
.mythic-browser-script-pane-header {
    align-items: center;
    background-color: var(--mythic-global-061);
    border-bottom: 1px solid var(--mythic-global-010);
    color: var(--mythic-global-002);
    display: flex;
    flex: 0 0 auto;
    font-size: 0.78rem;
    font-weight: 800;
    justify-content: space-between;
    letter-spacing: 0;
    min-height: 34px;
    padding: 0.4rem 0.65rem;
}
.mythic-browser-script-pane-header span:last-child {
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 750;
}
.mythic-browser-script-editor-frame {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
}
.mythic-browser-script-editor-frame .ace_editor {
    background-color: var(--mythic-global-304);
    font-family: var(--mythic-global-105) !important;
}
.mythic-browser-script-preview-controls {
    background-color: var(--mythic-global-305);
    border-bottom: 1px solid var(--mythic-global-010);
    flex: 0 0 auto;
    padding: 0.65rem;
}
.mythic-browser-script-preview-frame {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    padding: 0.55rem;
}
.mythic-browser-script-response {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    max-width: 100%;
    min-width: 0;
    overflow-x: hidden;
    width: 100%;
}
.mythic-browser-script-response > * {
    max-width: 100%;
    min-width: 0;
}
.mythic-browser-script-response-expanded {
    flex: 1 1 auto;
    min-height: 0;
}
.mythic-browser-script-response-expanded > *:only-child {
    min-height: 0;
}
.mythic-response-media {
    display: flex;
    flex-direction: column;
    min-width: 0;
    width: 100%;
}
.mythic-response-media-metadata {
    flex: 0 0 auto !important;
    max-height: none !important;
    min-height: fit-content !important;
    overflow-x: auto !important;
    overflow-y: visible !important;
}
.mythic-response-media-tabs {
    flex: 0 0 auto;
}
.mythic-response-media-panel {
    min-width: 0;
}
.mythic-response-media-panel[hidden] {
    display: none !important;
}
.mythic-response-inline-output {
    align-items: center;
    color: var(--mythic-global-002);
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    min-height: 34px;
    min-width: 0;
    width: 100%;
}
.mythic-response-inline-text {
    color: var(--mythic-global-002);
    display: inline-block;
    flex: 0 1 auto;
    margin: 0;
    max-width: 100%;
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-response-inline-action {
    flex: 0 0 auto;
}
.mythic-response-tabs {
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    max-width: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-response-tabs-bar {
    background-color: var(--mythic-global-061);
    border-bottom: 1px solid var(--mythic-global-010);
    flex: 0 0 auto;
    min-width: 0;
    overflow: hidden;
    padding: 0.35rem;
}
.mythic-response-tabs-list {
    max-height: 34px;
    min-height: 34px;
}
.mythic-response-tabs-list .MuiTabs-flexContainer {
    flex-wrap: nowrap;
    gap: 0.35rem;
}
.mythic-response-tabs-list .MuiTabs-scroller {
    overflow-x: auto !important;
    overflow-y: hidden !important;
}
.mythic-response-tabs-list .MuiTabs-scrollButtons {
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    flex: 0 0 30px;
    min-height: 30px;
    width: 30px;
}
.mythic-response-tab {
    background-color: var(--mythic-global-306) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008) !important;
    color: var(--mythic-global-025) !important;
    flex: 0 0 auto;
    font-size: 0.76rem;
    font-weight: 750;
    line-height: 1.2;
    max-width: min(16rem, 55vw);
    min-height: 30px;
    min-width: 0;
    overflow: hidden;
    padding: 0.35rem 0.7rem;
    text-transform: none;
}
.mythic-response-tab:hover {
    background-color: var(--mythic-global-195) !important;
    border-color: var(--mythic-global-100) !important;
    color: var(--mythic-global-002) !important;
}
.mythic-response-tab.Mui-selected {
    background-color: var(--mythic-global-307) !important;
    border-color: var(--mythic-global-308) !important;
    color: var(--mythic-global-027) !important;
}
.mythic-response-tab-label {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-response-tabs-panel {
    flex: 1 1 auto;
    flex-direction: column;
    max-width: 100%;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    padding: 0.5rem;
    width: 100%;
}
.mythic-response-table {
    display: flex;
    flex-direction: column;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-response-table-grid {
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-response-table-cell {
    align-items: center;
    display: inline-flex;
    gap: 0.3rem;
    max-width: 100%;
    min-width: 0;
    vertical-align: middle;
    white-space: nowrap;
}
.mythic-response-table-action-cell {
    gap: 0.45rem;
}
.mythic-response-table-cell pre {
    line-height: 1.2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.mythic-response-table-cell .MuiIconButton-root {
    flex: 0 0 auto;
}
.mythic-browser-scripts-table {
    max-width: 100%;
    min-width: 60rem;
    table-layout: fixed;
    width: 100%;
}
.mythic-browser-script-spacer-cell {
    min-width: 0;
    padding-left: 0 !important;
    padding-right: 0 !important;
    width: auto;
}
.mythic-browser-script-script-cell {
    align-items: center;
    display: flex;
    gap: 0.6rem;
    min-width: 0;
}
.mythic-browser-script-payload-icon {
    align-items: center;
    background-color: var(--mythic-global-309);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    flex: 0 0 auto;
    height: 40px;
    justify-content: center;
    width: 40px;
}
.mythic-browser-script-script-copy {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    min-width: 0;
}
.mythic-browser-script-command-name {
    color: var(--mythic-global-002);
    font-size: 0.86rem;
    font-weight: 750;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-browser-script-payload-name {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    font-weight: 650;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-browser-script-active-cell {
    align-items: center;
    display: flex;
    gap: 0.4rem;
    min-width: 0;
}
.mythic-browser-script-actions {
    justify-content: center;
}
@media screen and (max-width: 1050px) {
    .mythic-browser-script-dialog-content {
        height: calc(100vh - 8rem);
    }
    .mythic-browser-script-dialog-body {
        overflow: auto;
    }
    .mythic-browser-script-workbench {
        flex: 0 0 auto;
        min-height: 42rem;
    }
    .mythic-browser-script-top-split {
        min-width: 44rem;
    }
}
.mythic-single-task-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 0;
    min-width: 0;
    overflow: visible;
    width: 100%;
}
.mythic-single-task-card-row {
    align-items: flex-start;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    width: 100%;
}
.mythic-single-task-card-row-removing {
    grid-template-columns: minmax(0, 1fr) auto;
}
.mythic-single-task-display {
    min-width: 0;
    width: 100%;
}
.mythic-single-task-remove-control {
    align-items: center;
    background-color: var(--mythic-global-310);
    border: 1px solid var(--mythic-global-311);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-048);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 750;
    gap: 0.1rem;
    justify-content: center;
    margin-top: 4px;
    min-height: 52px;
    min-width: 4.25rem;
    padding: 0.35rem 0.45rem;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}
.mythic-single-task-remove-control:hover,
.mythic-single-task-remove-control-selected {
    background-color: var(--mythic-global-157);
    border-color: var(--mythic-global-312);
}
.mythic-single-task-remove-control .MuiCheckbox-root {
    padding: 0;
}
.mythic-single-task-callback-link {
    color: inherit !important;
    font-weight: 800;
    overflow-wrap: anywhere;
}
.mythic-single-task-metadata {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-top: 0.3rem;
    min-width: 0;
    width: 100%;
}
.mythic-single-task-metadata-section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
    width: 100%;
}
.mythic-single-task-table-wrap {
    background-color: var(--mythic-global-094);
    overflow: auto;
}
.mythic-single-task-table {
    min-width: 48rem;
    table-layout: fixed;
}
.mythic-single-task-files-table {
    min-width: 68rem;
}
.mythic-single-task-mitre-table {
    min-width: 32rem;
}
.mythic-single-task-cell-break {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    word-break: break-word;
}
.mythic-single-task-table-link {
    color: inherit !important;
    font-weight: 700;
    text-decoration: underline !important;
}
.mythic-single-task-hash-list {
    display: flex;
    flex-direction: column;
    font-family: var(--mythic-global-105);
    font-size: 0.74rem;
    gap: 0.2rem;
    overflow-wrap: anywhere;
}
.mythic-single-task-credential-cell {
    align-items: flex-start;
    display: flex;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-single-task-credential-text {
    max-width: 42rem;
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
}
.mythic-single-task-empty-card {
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
    width: 100%;
}
.mythic-single-task-dialog-control {
    margin-top: 0.45rem !important;
}
.mythic-single-task-dialog-grid {
    align-items: flex-start;
    display: grid;
    gap: 0.65rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
    margin-top: 0.65rem;
    min-width: 0;
}
@media screen and (max-width: 760px) {
    .mythic-single-task-card-row-removing {
        grid-template-columns: minmax(0, 1fr);
    }
    .mythic-single-task-remove-control {
        align-items: center;
        flex-direction: row;
        justify-content: flex-start;
        margin-top: 0;
        min-height: 38px;
        width: 100%;
    }
}
.mythic-create-flow-shell {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    min-height: 0;
}
.mythic-create-flow-content {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 0;
    overflow: hidden;
}
.mythic-create-flow-footer {
    flex: 0 0 auto;
}
.mythic-create-selection-grid {
    display: grid;
    flex: 0 0 auto;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
    min-width: 0;
}
.mythic-create-builder-split {
    display: grid;
    flex: 1 1 auto;
    gap: 0.75rem;
    grid-template-columns: minmax(15rem, 0.34fr) minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
}
.mythic-create-builder-split-three {
    grid-template-columns: minmax(14rem, 0.3fr) minmax(14rem, 0.3fr) minmax(0, 0.4fr);
}
.mythic-create-section {
    background-color: var(--mythic-global-061);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    padding: 0.75rem;
}
.mythic-create-section-fill {
    flex: 1 1 auto;
}
.mythic-create-section-plain {
    background-color: transparent;
    border: 0;
    padding: 0;
}
.mythic-create-section-scroll {
    overflow: auto;
}
.mythic-create-section-header {
    align-items: flex-start;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-create-section-title {
    color: var(--mythic-global-002);
    font-size: 0.88rem;
    font-weight: 800;
    line-height: 1.25;
}
.mythic-create-section-description {
    color: var(--mythic-global-025);
    font-size: 0.76rem;
    line-height: 1.35;
    margin-top: 0.12rem;
}
.mythic-create-section-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.4rem;
}
.mythic-create-section .MuiFormControl-root,
.mythic-create-section .MuiTextField-root {
    margin: 0 !important;
}
.mythic-create-section .MuiFormControl-root:has(> .MuiInputLabel-root),
.mythic-create-section .MuiTextField-root:has(> .MuiInputLabel-root) {
    margin-top: 0.45rem !important;
}
.mythic-create-select {
    width: 100%;
}
.mythic-create-agent-summary {
    align-items: flex-start;
    display: flex;
    gap: 0.75rem;
    min-width: 0;
}
.mythic-create-subsection {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-height: 0;
    min-width: 0;
    padding: 0.65rem;
}
.mythic-create-subsection-fill {
    flex: 1 1 auto;
    overflow: hidden;
}
.mythic-create-subsection-scroll {
    flex: 1 1 auto;
    overflow: auto;
}
.mythic-create-agent-icon {
    align-items: center;
    background-color: var(--mythic-global-063);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex: 0 0 4.75rem;
    height: 4.75rem;
    justify-content: center;
    padding: 0.35rem;
}
.mythic-create-agent-icon svg,
.mythic-create-agent-icon img {
    max-height: 100%;
    max-width: 100%;
}
.mythic-create-meta-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-create-meta-label {
    color: var(--mythic-global-025);
    display: block;
    font-size: 0.72rem;
    font-weight: 750;
    line-height: 1.2;
}
.mythic-create-meta-value {
    color: var(--mythic-global-002);
    font-size: 0.82rem;
    line-height: 1.35;
    overflow-wrap: anywhere;
}
.mythic-create-parameter-scroll {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    min-height: 0;
    overflow: auto;
    width: 100%;
}
.mythic-create-parameter-group-header {
    align-items: center;
    background-image: var(--mythic-global-069);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-070);
    display: flex;
    font-size: 0.82rem;
    font-weight: 800;
    gap: 0.25rem;
    line-height: 1.25;
    min-width: 0;
    padding: 0.45rem 0.65rem;
}
.mythic-create-parameter-group-header-collapsible {
    cursor: pointer;
    user-select: none;
}
.mythic-create-parameter-group-header-collapsible:focus-visible {
    outline: 2px solid var(--mythic-global-023);
    outline-offset: 2px;
}
.mythic-create-parameter-group-header-icon {
    flex: 0 0 auto;
    margin-left: -0.2rem;
}
.mythic-create-parameter-group-header-title {
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-create-summary-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-create-summary-group-header {
    background-image: var(--mythic-global-069);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.25;
    padding: 0.45rem 0.65rem;
}
.mythic-create-summary-row {
    border-bottom: 1px solid var(--mythic-global-010);
    padding: 0.45rem 0.1rem 0.5rem;
}
.mythic-create-summary-row:last-child {
    border-bottom: 0;
}
.mythic-create-summary-name {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1.25;
}
.mythic-create-summary-value {
    color: var(--mythic-global-025);
    font-size: 0.76rem;
    line-height: 1.35;
    margin-top: 0.18rem;
    overflow-wrap: anywhere;
    padding-left: 0.65rem;
    white-space: pre-wrap;
}
.mythic-create-parameter-card {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-left: 4px solid transparent;
    border-radius: var(--mythic-global-008);
    display: grid;
    gap: 0.75rem;
    grid-template-columns: minmax(13rem, 0.32fr) minmax(0, 1fr);
    min-width: 0;
    padding: 0.7rem 0.75rem;
}
.mythic-create-parameter-card-modified {
    border-left-color: var(--mythic-global-038);
}
.mythic-create-parameter-copy {
    min-width: 0;
}
.mythic-create-parameter-title-row {
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-create-parameter-title {
    color: var(--mythic-global-002);
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
}
.mythic-create-parameter-description {
    color: var(--mythic-global-025);
    font-size: 0.75rem;
    line-height: 1.38;
    margin-top: 0.24rem;
}
.mythic-create-parameter-chips {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.35rem;
}
.mythic-create-parameter-chip {
    background-color: var(--mythic-global-267);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1;
    padding: 0.22rem 0.38rem;
}
.mythic-create-parameter-chip-required {
    border-color: var(--mythic-global-313);
    color: var(--mythic-global-048);
}
.mythic-create-parameter-chip-modified {
    border-color: var(--mythic-global-314);
    color: var(--mythic-global-038);
}
.mythic-create-parameter-control {
    min-width: 0;
    position: relative;
}
.mythic-create-parameter-control .MuiFormControl-root,
.mythic-create-parameter-control .MuiTextField-root,
.mythic-create-parameter-control .MythicTextField-root {
    margin: 0 !important;
    width: 100%;
}
.mythic-create-parameter-control .MuiFormControl-root:has(> .MuiInputLabel-root),
.mythic-create-parameter-control .MuiTextField-root:has(> .MuiInputLabel-root) {
    margin-top: 0.45rem !important;
}
.mythic-create-inline-control {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    min-width: 0;
    position: relative;
    width: 100%;
}
.mythic-create-inline-control > .MuiFormControl-root {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-create-choice-divider {
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    font-size: 0.7rem;
    font-weight: 800;
}
.mythic-create-array-table.MuiTableContainer-root {
    border-color: var(--mythic-global-010);
}
.mythic-create-array-table .MuiTableCell-root {
    padding: 0.35rem 0.45rem !important;
}
.mythic-create-dictionary-row {
    align-items: center;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: 2rem minmax(8rem, 0.28fr) minmax(0, 1fr);
    margin-bottom: 0.45rem;
    min-width: 0;
}
.mythic-create-dictionary-add {
    align-items: center;
    display: flex;
    gap: 0.5rem;
}
@media (max-width: 900px) {
    .mythic-create-builder-split,
    .mythic-create-builder-split-three,
    .mythic-create-parameter-card {
        grid-template-columns: 1fr;
    }
}
.mythic-dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    padding: 0.75rem 0 0.9rem;
    position: relative;
    width: 100%;
}
.mythic-dashboard-custom {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    width: 100%;
}
.mythic-dashboard-row {
    align-items: stretch;
    display: grid;
    flex: 0 0 auto;
    gap: 0.75rem;
    grid-auto-flow: dense;
    grid-template-columns: var(--mythic-dashboard-row-template, repeat(auto-fit, minmax(min(100%, 19rem), 1fr)));
    min-width: 0;
    padding: 0 0.75rem;
    width: 100%;
}
.mythic-dashboard-row-editing {
    align-items: start;
}
.mythic-dashboard-card {
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: var(--mythic-global-315) !important;
    display: flex;
    flex: 1 1 18rem;
    flex-direction: column;
    grid-column: span 1;
    height: var(--mythic-dashboard-card-height, 18rem);
    max-height: var(--mythic-dashboard-card-height, 18rem);
    min-height: var(--mythic-dashboard-card-height, 18rem);
    min-width: 0;
    overflow: hidden;
    position: relative;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
    width: 100%;
}
.mythic-dashboard-card:hover {
    border-color: var(--mythic-global-316);
    box-shadow: var(--mythic-global-317) !important;
}
.mythic-dashboard-card-wide {
    grid-column: span 2;
}
.mythic-dashboard-card-table {
    grid-column: span 2;
    max-width: min(100%, 58rem);
}
.mythic-dashboard-row > .mythic-dashboard-card-table:only-child {
    max-width: min(100%, 64rem);
}
.mythic-dashboard-card-metric {
    grid-column: span 1;
}
.mythic-dashboard-card-header {
    align-items: center;
    background-color: var(--mythic-global-318);
    background-image: var(--mythic-global-069);
    border-bottom: 1px solid var(--mythic-global-319);
    display: flex;
    flex: 0 0 auto;
    gap: 0.65rem;
    justify-content: space-between;
    min-height: 42px;
    min-width: 0;
    overflow: hidden;
    padding: 0.55rem 0.65rem 0.55rem 0.85rem;
    position: relative;
}
.mythic-dashboard-card-header::before {
    background-color: var(--mythic-global-071);
    bottom: 0;
    content: "";
    left: 0;
    position: absolute;
    top: 0;
    width: 4px;
}
.mythic-dashboard-card-title {
    color: var(--mythic-global-002);
    font-size: 0.86rem;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.2;
    min-width: 0;
}
.mythic-dashboard-card-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.35rem;
    justify-content: flex-end;
}
.mythic-dashboard-card-body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    padding: 0.35rem 0.5rem 0.55rem;
}
.mythic-dashboard-card-body-centered {
    align-items: center;
    justify-content: center;
}
.mythic-dashboard-card-body-empty {
    padding: 0.75rem;
}
.mythic-dashboard-icon-button,
.mythic-table-row-icon-action {
    background-color: var(--mythic-global-029) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008) !important;
    box-shadow: none !important;
    color: var(--mythic-global-002) !important;
    height: 30px;
    padding: 0;
    width: 30px;
}
.mythic-dashboard-icon-button:hover,
.mythic-table-row-icon-action:hover {
    background-color: var(--mythic-global-258) !important;
    border-color: var(--mythic-global-007) !important;
}
.mythic-dashboard-icon-button-danger {
    color: var(--mythic-global-048) !important;
}
.mythic-dashboard-icon-button-hover-danger:hover {
    color: var(--mythic-global-048) !important;
}
.mythic-dashboard-icon-button-hover-info:hover {
    background-color: var(--mythic-global-320) !important;
    border-color: var(--mythic-global-321) !important;
    color: var(--mythic-global-023) !important;
}
.mythic-dashboard-icon-button.Mui-disabled,
.mythic-dashboard-table-action.Mui-disabled,
.mythic-table-row-action.Mui-disabled,
.mythic-table-row-icon-action.Mui-disabled {
    background-color: var(--mythic-global-281) !important;
    border-color: var(--mythic-global-010) !important;
    color: var(--mythic-global-066) !important;
}
.mythic-dashboard-perspective-toggle {
    flex: 0 1 auto;
    min-width: 0;
}
.mythic-dashboard-perspective-toggle .MuiToggleButton-root {
    min-width: 5.6rem !important;
}
.mythic-dashboard-primary-button,
.mythic-dashboard-table-action,
.mythic-table-row-action {
    background-color: var(--mythic-global-029) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008) !important;
    box-shadow: none !important;
    color: var(--mythic-global-002) !important;
    font-size: 0.74rem;
    font-weight: 750;
    min-height: 30px;
    text-transform: none;
}
.mythic-dashboard-primary-button {
    background-color: var(--mythic-global-027) !important;
    border-color: var(--mythic-global-027) !important;
    color: var(--mythic-global-273) !important;
}
.mythic-dashboard-primary-button:hover {
    background-color: var(--mythic-global-274) !important;
    border-color: var(--mythic-global-274) !important;
}
.mythic-dashboard-table-action:hover {
    background-color: var(--mythic-global-258) !important;
}
.mythic-dashboard-table-action-hover-danger:hover {
    background-color: var(--mythic-global-322) !important;
    border-color: var(--mythic-global-323) !important;
    color: var(--mythic-global-048) !important;
}
.mythic-dashboard-chart-body {
    gap: 0.35rem;
    padding: 0.5rem 0.55rem 0.55rem;
}
.mythic-dashboard-chart-canvas {
    background-color: var(--mythic-global-324);
    background-image: var(--mythic-global-325);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-dashboard-chart-canvas-pie {
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
}
.mythic-dashboard-chart-canvas-line {
    align-items: stretch;
    justify-content: center;
    padding: 0.2rem 0.3rem 0;
}
.mythic-dashboard-chart-canvas-empty {
    align-items: stretch;
    justify-content: stretch;
    padding: 0.75rem;
}
.mythic-dashboard-chart-canvas .MuiChartsLegend-root {
    color: var(--mythic-global-025);
}
.mythic-dashboard-chart-canvas .MuiChartsAxis-line,
.mythic-dashboard-chart-canvas .MuiChartsAxis-tick {
    stroke: var(--mythic-global-007);
}
.mythic-dashboard-chart-canvas .MuiChartsAxis-tickLabel,
.mythic-dashboard-chart-canvas .MuiChartsAxis-label {
    fill: var(--mythic-global-025) !important;
}
.mythic-dashboard-chart-slider-row {
    align-items: center;
    background-color: var(--mythic-global-326);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex: 0 0 auto;
    justify-content: center;
    min-height: 2rem;
    padding: 0.15rem 0.8rem;
}
.mythic-dashboard-table-body {
    padding: 0;
}
.mythic-dashboard-empty-container {
    display: flex;
    overflow: hidden;
}
.mythic-dashboard-table-container {
    background-color: var(--mythic-global-327);
    flex: 1 1 auto;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    scrollbar-gutter: stable;
    width: 100%;
}
.mythic-dashboard-table {
    max-width: 100%;
    min-width: 100%;
    overflow: auto;
    width: 100%;
}
.mythic-dashboard-summary-table {
    table-layout: fixed;
}
.mythic-dashboard-card-table .MuiTableCell-root {
    vertical-align: middle;
}
.mythic-dashboard-summary-table .MuiTableCell-root {
    font-size: 0.75rem;
    height: 2.15rem;
    line-height: 1.25;
    overflow: hidden;
    padding-bottom: 0.35rem !important;
    padding-top: 0.35rem !important;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-dashboard-summary-table .MuiTableRow-hover:hover .MuiTableCell-root {
    background-color: var(--mythic-global-328);
}
.mythic-dashboard-table-cell-primary {
    min-width: 0;
}
.mythic-dashboard-table-cell-tight,
.mythic-dashboard-table-cell-count,
.mythic-dashboard-table-cell-actions {
    text-align: right;
    white-space: nowrap !important;
    width: 1%;
}
.mythic-dashboard-table-cell-count {
    color: var(--mythic-global-002);
    font-weight: 850;
}
.mythic-dashboard-table-cell-actions {
    min-width: 6.25rem;
}
.mythic-dashboard-table-cell-wrap {
    overflow: visible !important;
    overflow-wrap: anywhere;
    white-space: normal !important;
}
.mythic-dashboard-table-cell-account {
    align-items: flex-start;
    display: flex !important;
    flex-direction: row;
    gap: 0.45rem;
}
.mythic-dashboard-table-cell-wrap .MuiTypography-root,
.mythic-dashboard-table-comment {
    overflow-wrap: anywhere;
    white-space: normal !important;
}
.mythic-dashboard-table-identity,
.mythic-dashboard-table-file-row,
.mythic-dashboard-table-actions-inline {
    align-items: center;
    display: flex;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-dashboard-table-actions-inline {
    justify-content: flex-end;
}
.mythic-dashboard-table-file-row {
    max-width: 100%;
}
.mythic-dashboard-table-stack {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    min-width: 0;
}
.mythic-dashboard-table-primary-text,
.mythic-dashboard-table-link,
.mythic-dashboard-summary-table .MuiTypography-root {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-dashboard-table-primary-text,
.mythic-dashboard-table-link {
    display: inline-block;
    max-width: 100%;
}
.mythic-dashboard-table-secondary {
    color: var(--mythic-global-025);
    font-size: 0.7rem !important;
    font-weight: 650;
    line-height: 1.2 !important;
}
.mythic-dashboard-table-cell-wrap .MuiTypography-root,
.mythic-dashboard-table-cell-wrap .mythic-dashboard-table-primary-text,
.mythic-dashboard-table-cell-wrap .mythic-dashboard-table-secondary {
    overflow: visible;
    text-overflow: clip;
    white-space: normal !important;
}
.mythic-dashboard-credentials-table {
    table-layout: fixed;
}
.mythic-dashboard-credentials-table .MuiTableCell-root {
    height: auto;
    line-height: 1.3;
    overflow: visible;
    padding-bottom: 0.5rem !important;
    padding-top: 0.5rem !important;
    vertical-align: top;
}
.mythic-dashboard-credentials-table .mythic-dashboard-table-cell-account {
    display: table-cell !important;
    width: 42%;
}
.mythic-dashboard-credential-account {
    align-items: flex-start;
    display: flex;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-dashboard-credentials-table .mythic-dashboard-table-comment {
    display: block;
    line-height: 1.35 !important;
}
.mythic-dashboard-table-icon-action {
    color: var(--mythic-global-025);
    cursor: pointer;
    display: inline-block;
    flex: 0 0 auto;
    height: 1.1rem;
    width: 1.1rem;
}
.mythic-dashboard-table-icon-action:hover,
.mythic-dashboard-table-icon-action-info:hover {
    color: var(--mythic-global-023);
}
.mythic-dashboard-tasking-table {
    table-layout: fixed;
}
.mythic-dashboard-tasking-cell {
    max-width: 0;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-dashboard-tasking-list {
    display: flex;
    flex-direction: column;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-dashboard-tasking-list .TaskDisplay-root,
.mythic-dashboard-tasking-list .TaskDisplayAccordion-root,
.mythic-dashboard-tasking-list .TaskDisplayAccordion-content,
.mythic-dashboard-tasking-list .TaskDisplayAccordionDetails-root {
    max-width: 100%;
    min-width: 0;
}
.mythic-dashboard-tasking-list .MuiAccordion-root,
.mythic-dashboard-tasking-list .MuiGrid-root,
.mythic-dashboard-tasking-list .mythic-response-table,
.mythic-dashboard-tasking-list .mythic-response-table-grid {
    max-width: 100%;
    min-width: 0;
    width: 100%;
}
.mythic-dashboard-tasking-list .MuiCollapse-root,
.mythic-dashboard-tasking-list .MuiCollapse-wrapper,
.mythic-dashboard-tasking-list .MuiCollapse-wrapperInner {
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
}
.mythic-dashboard-card-table .MuiButton-root {
    white-space: nowrap;
}
.mythic-dashboard-screenshot-row {
    align-items: center;
    display: flex !important;
    height: 100%;
    justify-content: space-between;
    min-width: 0;
    width: 100%;
}
.mythic-dashboard-screenshot-nav-cell {
    align-items: center;
    border-bottom: 0 !important;
    display: flex !important;
    flex: 0 0 2.75rem;
    justify-content: center;
    min-width: 2.75rem;
    padding: 0.25rem !important;
}
.mythic-dashboard-screenshot-preview-cell {
    align-items: center;
    border-bottom: 0 !important;
    display: flex !important;
    flex: 1 1 auto;
    justify-content: center;
    min-width: 0;
    overflow: hidden;
    padding: 0.25rem !important;
}
.mythic-dashboard-screenshot-image {
    cursor: pointer;
    display: block;
    height: 12.5rem;
    max-height: 100%;
    max-width: 100%;
    min-width: 0;
    object-fit: contain;
    width: 100%;
}
.mythic-dashboard-empty-state {
    align-items: center;
    background-color: var(--mythic-global-076);
    border: 1px dashed var(--mythic-global-007);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    font-size: 0.82rem;
    gap: 0.75rem;
    justify-content: center;
    line-height: 1.4;
    min-height: 0;
    padding: 1rem;
    text-align: center;
}
.mythic-dashboard-empty-copy {
    max-width: 26rem;
}
.mythic-dashboard-empty-action {
    align-items: center;
    display: flex;
    justify-content: center;
}
.mythic-dashboard-metric-body {
    cursor: pointer;
    padding: 0.45rem 0.65rem 0.65rem;
}
.mythic-dashboard-metric-title-row {
    align-items: center;
    display: flex;
    gap: 0.65rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-dashboard-metric-title-row .MuiFormControl-root {
    margin: 0 !important;
}
.mythic-dashboard-kpi-body {
    padding: 0.55rem 0.65rem 0.65rem;
}
.mythic-dashboard-widget-settings-popover {
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-007);
    color: var(--mythic-global-002);
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    max-width: 17rem;
    min-width: 14rem;
    padding: 0.8rem;
}
.mythic-dashboard-widget-settings-title {
    color: var(--mythic-global-002);
    font-size: 0.82rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-dashboard-widget-settings-copy {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 650;
    line-height: 1.35;
}
.mythic-dashboard-callback-kpi,
.mythic-dashboard-service-kpi {
    background-color: var(--mythic-global-080);
    background-image: var(--mythic-global-325);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex: 1 1 auto;
    gap: 0.75rem;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    padding: 0.8rem;
}
.mythic-dashboard-callback-kpi {
    cursor: pointer;
    flex-direction: column;
    justify-content: space-between;
}
.mythic-dashboard-callback-kpi:hover,
.mythic-dashboard-callback-kpi:focus-visible {
    border-color: var(--mythic-global-329);
    outline: none;
}
.mythic-dashboard-service-kpi {
    align-items: center;
    flex-direction: row;
    justify-content: space-between;
}
.mythic-dashboard-kpi-main {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    justify-content: center;
    min-height: 0;
    min-width: 0;
}
.mythic-dashboard-kpi-status-row {
    align-items: center;
    display: flex;
    gap: 0.45rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-dashboard-kpi-chip {
    align-items: center;
    border: 1px solid transparent;
    border-radius: 999px;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.66rem;
    font-weight: 850;
    line-height: 1;
    max-width: 100%;
    overflow: hidden;
    padding: 0.25rem 0.45rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-dashboard-kpi-chip-info {
    background-color: var(--mythic-global-330);
    border-color: var(--mythic-global-130);
    color: var(--mythic-global-023);
}
.mythic-dashboard-kpi-chip-success {
    background-color: var(--mythic-global-331);
    border-color: var(--mythic-global-332);
    color: var(--mythic-global-035);
}
.mythic-dashboard-kpi-chip-warning {
    background-color: var(--mythic-global-333);
    border-color: var(--mythic-global-334);
    color: var(--mythic-global-038);
}
.mythic-dashboard-kpi-chip-danger {
    background-color: var(--mythic-global-335);
    border-color: var(--mythic-global-336);
    color: var(--mythic-global-048);
}
.mythic-dashboard-kpi-chip-neutral {
    background-color: var(--mythic-global-286);
    border-color: var(--mythic-global-010);
    color: var(--mythic-global-025);
}
.mythic-dashboard-kpi-percent {
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    font-size: 0.74rem;
    font-weight: 850;
    line-height: 1;
}
.mythic-dashboard-kpi-value-row {
    align-items: baseline;
    display: flex;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-dashboard-kpi-value {
    color: var(--mythic-global-002);
    font-size: 3.35rem;
    font-weight: 880;
    letter-spacing: 0;
    line-height: 0.98;
}
.mythic-dashboard-kpi-total {
    color: var(--mythic-global-025);
    font-size: 1.25rem;
    font-weight: 760;
    line-height: 1;
}
.mythic-dashboard-kpi-label {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-weight: 750;
    letter-spacing: 0;
    line-height: 1.25;
    margin-top: 0.25rem;
}
.mythic-dashboard-kpi-secondary-panel {
    align-items: center;
    background-color: var(--mythic-global-337);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.55rem 0.65rem;
}
.mythic-dashboard-kpi-secondary-value {
    color: var(--mythic-global-002);
    flex: 0 0 auto;
    font-size: 1.65rem;
    font-weight: 880;
    line-height: 1;
}
.mythic-dashboard-kpi-secondary-label {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1.25;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-dashboard-kpi-gauge {
    align-items: center;
    display: flex;
    flex: 0 0 7rem;
    justify-content: center;
    min-width: 7rem;
}
.mythic-dashboard-metric-content,
.mythic-dashboard-metric-link {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    justify-content: center;
    min-height: 0;
}
.mythic-dashboard-metric-value {
    color: var(--mythic-global-002);
    display: inline-block;
    font-weight: 850 !important;
    letter-spacing: 0;
    line-height: 0.95;
    margin-left: 0.1rem;
}
.mythic-dashboard-metric-total {
    color: var(--mythic-global-025);
    display: inline-block;
    font-weight: 700 !important;
    margin-left: 0.35rem;
}
.mythic-dashboard-metric-label {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-weight: 750;
    letter-spacing: 0;
    line-height: 1.25;
    margin-top: 0.35rem;
}
.mythic-dashboard-metric-secondary {
    color: var(--mythic-global-002);
    font-weight: 850 !important;
    letter-spacing: 0;
    line-height: 1;
    margin-top: 0.1rem;
}
.mythic-dashboard-slider {
    align-self: center;
    margin: 0;
    width: min(100%, 32rem);
}
.mythic-dashboard-slider .MuiSlider-rail {
    opacity: 0.28;
}
.mythic-dashboard-slider .MuiSlider-thumb {
    height: 12px;
    width: 12px;
}
.mythic-dashboard-edit-rail {
    align-items: center;
    background-color: var(--mythic-global-061);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 0.4rem;
    justify-content: center;
    padding: 0.45rem;
}
.mythic-dashboard-edit-toolbar {
    align-items: center;
    background-color: var(--mythic-global-338) !important;
    background-image: var(--mythic-global-069) !important;
    border: 1px solid var(--mythic-global-251);
    border-radius: var(--mythic-global-008);
    box-shadow: inset 0 1px 0 var(--mythic-global-252), 0 2px 6px var(--mythic-global-339);
    color: var(--mythic-global-070);
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    grid-column: 1 / -1;
    justify-content: space-between;
    min-width: 0;
    overflow: hidden;
    padding: 0.52rem 0.65rem 0.52rem 1rem;
    position: relative;
}
.mythic-dashboard-edit-toolbar-title {
    color: inherit;
    font-size: 0.78rem;
    font-weight: 850;
    letter-spacing: 0;
    line-height: 1.2;
    white-space: nowrap;
}
.mythic-dashboard-edit-toolbar-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-end;
    min-width: 0;
}
.mythic-dashboard-edit-toolbar .MuiButton-root.mythic-dashboard-table-action {
    background-color: var(--mythic-global-340) !important;
    border-color: var(--mythic-global-097) !important;
    color: var(--mythic-global-070) !important;
}
.mythic-dashboard-edit-toolbar .MuiButton-root.mythic-dashboard-table-action:hover {
    background-color: var(--mythic-global-341) !important;
    border-color: var(--mythic-global-342) !important;
}
.mythic-dashboard-edit-toolbar .MuiButton-root.mythic-table-row-action-hover-info:hover {
    background-color: var(--mythic-global-320) !important;
    border-color: var(--mythic-global-321) !important;
    color: var(--mythic-global-023) !important;
}
.mythic-dashboard-edit-toolbar .MuiButton-root.mythic-dashboard-table-action-hover-danger:hover {
    background-color: var(--mythic-global-322) !important;
    border-color: var(--mythic-global-323) !important;
    color: var(--mythic-global-048) !important;
}
.mythic-dashboard-widget-dialog {
    background-color: var(--mythic-global-318);
    min-height: 28rem;
}
.mythic-dashboard-widget-dialog-header {
    align-items: center;
    background-color: var(--mythic-global-094);
    background-image: var(--mythic-global-069);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    min-width: 0;
    padding: 0.7rem 0.8rem;
}
.mythic-dashboard-widget-dialog-title {
    color: var(--mythic-global-002);
    font-size: 0.9rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-dashboard-widget-dialog-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    font-weight: 650;
    line-height: 1.25;
    margin-top: 0.18rem;
}
.mythic-dashboard-widget-grid {
    display: grid;
    gap: 0.65rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    min-width: 0;
}
.mythic-dashboard-widget-option {
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: var(--mythic-global-343);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 6.4rem;
    min-width: 0;
    padding: 0.7rem;
    transition: background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}
.mythic-dashboard-widget-option:hover,
.mythic-dashboard-widget-option:focus-visible {
    background-color: var(--mythic-global-344);
    border-color: var(--mythic-global-345);
    box-shadow: var(--mythic-global-317);
    outline: none;
}
.mythic-dashboard-widget-option-selected {
    background-image: var(--mythic-global-325);
    border-color: var(--mythic-global-346);
}
.mythic-dashboard-widget-option-top {
    align-items: flex-start;
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-dashboard-widget-option-title {
    color: var(--mythic-global-002);
    font-size: 0.84rem;
    font-weight: 820;
    line-height: 1.2;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-dashboard-widget-option-summary {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.35;
    overflow-wrap: anywhere;
}
.mythic-dashboard-widget-category {
    align-items: center;
    background-color: var(--mythic-global-235);
    border: 1px solid var(--mythic-global-347);
    border-radius: 999px;
    color: var(--mythic-global-027);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.64rem;
    font-weight: 850;
    line-height: 1;
    padding: 0.24rem 0.42rem;
    white-space: nowrap;
}
.mythic-dashboard-loading-overlay {
    align-items: center;
    background-color: var(--mythic-global-348);
    display: flex;
    inset: 0;
    justify-content: center;
    position: absolute;
    z-index: 5;
}
.mythic-dashboard-loading-card {
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: var(--mythic-global-349);
    color: var(--mythic-global-002);
    font-size: 0.84rem;
    font-weight: 750;
    padding: 0.75rem 0.9rem;
}
@media (max-width: 900px) {
    .mythic-dashboard-row {
        grid-template-columns: 1fr;
    }
    .mythic-dashboard-card,
    .mythic-dashboard-card-wide,
    .mythic-dashboard-card-table {
        grid-column: span 1;
        max-width: 100%;
    }
    .mythic-dashboard-perspective-toggle {
        width: 100%;
    }
    .mythic-dashboard-perspective-toggle .MuiToggleButton-root {
        flex: 1 1 0;
        min-width: 0 !important;
    }
    .mythic-dashboard-edit-toolbar {
        align-items: stretch;
        flex-direction: column;
    }
    .mythic-dashboard-edit-toolbar-actions {
        justify-content: flex-start;
    }
}
.mythic-form-code-editor {
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-height: 16rem;
    min-width: 0;
    overflow: hidden;
}
.mythic-dialog-body .MuiFormControl-root,
.mythic-dialog-body .MuiTextField-root {
    margin: 0 !important;
}
.mythic-dialog-body .MuiFormControl-root:has(> .MuiInputLabel-root),
.mythic-dialog-body .MuiTextField-root:has(> .MuiInputLabel-root) {
    margin-top: 0.45rem !important;
}
.mythic-table-bulk-actions {
    align-items: center;
    border-bottom: 1px solid var(--mythic-global-010);
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem;
    width: 100%;
}
.mythic-table-bulk-actions .mythic-table-row-action {
    flex: 1 1 13rem;
    justify-content: center;
    margin: 0 !important;
}
.mythic-table-row-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}
.mythic-table-row-actions-nowrap {
    flex-wrap: nowrap;
}
.mythic-state-toggle-cell {
    align-items: center;
    display: flex;
    gap: 0.4rem;
    min-width: 0;
}
.mythic-state-chip {
    align-items: center;
    border: 1px solid var(--mythic-global-010);
    border-radius: 999px;
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1;
    min-height: 24px;
    padding: 0.25rem 0.55rem;
    white-space: nowrap;
}
.mythic-state-chip-compact {
    font-size: 0.66rem;
    min-height: 1.25rem;
    padding: 0 0.35rem;
}
.mythic-state-chip-active,
.mythic-state-chip-enabled {
    background-color: var(--mythic-global-045);
    border-color: var(--mythic-global-084);
    color: var(--mythic-global-035);
}
.mythic-state-chip-inactive,
.mythic-state-chip-disabled,
.mythic-state-chip-warning {
    background-color: var(--mythic-global-055);
    border-color: var(--mythic-global-090);
    color: var(--mythic-global-038);
}
.mythic-state-chip-neutral {
    background-color: var(--mythic-global-306);
    border-color: var(--mythic-global-010);
    color: var(--mythic-global-025);
}
.mythic-state-chip-error {
    background-color: var(--mythic-global-047);
    border-color: var(--mythic-global-156);
    color: var(--mythic-global-048);
}
.mythic-state-chip-info {
    background-color: var(--mythic-global-044);
    border-color: var(--mythic-global-082);
    color: var(--mythic-global-023);
}
.mythic-payload-progress-cell {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-table-row-action:hover {
    background-color: var(--mythic-global-258) !important;
    border-color: var(--mythic-global-007) !important;
}
.mythic-table-row-action-info {
    background-color: var(--mythic-global-279) !important;
    border-color: var(--mythic-global-280) !important;
    color: var(--mythic-global-023) !important;
}
.mythic-table-row-action-info:hover {
    background-color: var(--mythic-global-320) !important;
    border-color: var(--mythic-global-321) !important;
}
.mythic-table-row-action-hover-info:hover {
    background-color: var(--mythic-global-320) !important;
    border-color: var(--mythic-global-321) !important;
    color: var(--mythic-global-023) !important;
}
.mythic-table-row-action-hover-success:hover {
    background-color: var(--mythic-global-233) !important;
    border-color: var(--mythic-global-234) !important;
    color: var(--mythic-global-035) !important;
}
.mythic-table-row-action-hover-warning:hover {
    background-color: var(--mythic-global-350) !important;
    border-color: var(--mythic-global-276) !important;
    color: var(--mythic-global-038) !important;
}
.mythic-table-row-action-hover-danger:hover {
    background-color: var(--mythic-global-322) !important;
    border-color: var(--mythic-global-323) !important;
    color: var(--mythic-global-048) !important;
}
.mythic-table-row-action-success {
    background-color: var(--mythic-global-351) !important;
    border-color: var(--mythic-global-352) !important;
    color: var(--mythic-global-035) !important;
}
.mythic-table-row-action-success:hover {
    background-color: var(--mythic-global-233) !important;
    border-color: var(--mythic-global-234) !important;
}
.mythic-table-row-action-danger {
    background-color: var(--mythic-global-353) !important;
    border-color: var(--mythic-global-354) !important;
    color: var(--mythic-global-048) !important;
}
.mythic-table-row-action-danger:hover {
    background-color: var(--mythic-global-322) !important;
    border-color: var(--mythic-global-323) !important;
}
.mythic-table-row-icon-action-danger {
    color: var(--mythic-global-048) !important;
}
.mythic-table-row-icon-action-success {
    color: var(--mythic-global-035) !important;
}
.mythic-table-row-icon-action-info {
    color: var(--mythic-global-023) !important;
}
.mythic-table-row-icon-action-warning {
    color: var(--mythic-global-038) !important;
}
.mythic-table-row-icon-action-hover-info:hover {
    color: var(--mythic-global-023) !important;
}
.mythic-table-row-icon-action-hover-success:hover {
    color: var(--mythic-global-035) !important;
}
.mythic-table-row-icon-action-hover-warning:hover {
    color: var(--mythic-global-038) !important;
}
.mythic-table-row-icon-action-hover-danger:hover {
    color: var(--mythic-global-048) !important;
}
.mythic-search-result-stack {
    display: flex;
    flex-direction: column;
    gap: 0.22rem;
    min-width: 0;
}
.mythic-search-result-stack-spacious {
    gap: 0.38rem;
}
.mythic-search-result-inline {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-search-result-inline-nowrap {
    flex-wrap: nowrap;
}
.mythic-search-result-primary {
    color: var(--mythic-global-002);
    font-size: 0.82rem;
    font-weight: 750;
    line-height: 1.35;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-search-result-secondary {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    line-height: 1.35;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-search-result-label {
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 750;
    line-height: 1.2;
}
.mythic-search-result-value {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    line-height: 1.35;
    overflow-wrap: anywhere;
}
.mythic-search-result-code {
    background-color: var(--mythic-global-355);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    display: block;
    font-family: var(--mythic-global-356);
    font-size: 0.76rem;
    line-height: 1.4;
    margin: 0;
    max-width: 100%;
    min-width: 0;
    overflow-wrap: anywhere;
    padding: 0.42rem 0.5rem;
    white-space: pre-wrap;
}
.mythic-search-result-code-compact {
    max-height: 7.5rem;
    overflow: hidden;
}
.mythic-search-result-metric {
    align-items: center;
    background-color: var(--mythic-global-357);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    gap: 0.28rem;
    min-height: 24px;
    padding: 0.18rem 0.45rem;
}
.mythic-search-result-metric-label {
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 750;
}
.mythic-search-result-action-row {
    align-items: center;
    display: flex;
    flex-wrap: nowrap;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-search-result-link-row {
    align-items: center;
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.2rem;
    min-width: 0;
}
.mythic-tag-search-tag-cell {
    align-items: center;
    display: flex;
    min-width: 0;
    overflow: hidden;
}
.mythic-tag-search-tag-cell .MuiChip-root {
    flex: 0 1 auto;
    float: none !important;
    height: 20px !important;
    max-width: 100%;
}
.mythic-tag-search-tag-cell .MuiChip-label {
    font-size: 0.72rem;
    font-weight: 800;
    min-width: 0;
    overflow: hidden !important;
    padding-left: 0.45rem;
    padding-right: 0.45rem;
    text-overflow: ellipsis;
}
.mythic-tag-search-element-card {
    background-color: var(--mythic-global-107);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
    padding: 0.48rem 0.55rem;
}
.mythic-tag-search-element-header {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-tag-search-element-type {
    background-color: var(--mythic-global-026);
    border: 1px solid var(--mythic-global-141);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 760;
    line-height: 1.25;
    padding: 0.16rem 0.45rem;
    white-space: nowrap;
}
.mythic-tag-search-details-grid {
    display: grid;
    gap: 0.4rem 0.65rem;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    min-width: 0;
}
.mythic-tag-search-detail {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}
.mythic-tag-search-detail-wide {
    grid-column: 1 / -1;
}
.mythic-tag-search-code {
    font-size: 0.72rem;
    max-height: 7.5rem;
    overflow: auto;
}
.mythic-tag-search-inline-code {
    display: inline-block;
    padding: 0.24rem 0.42rem;
}
.mythic-tag-search-callback-summary {
    background-color: var(--mythic-global-355);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: inline-block;
    font-size: 0.76rem;
    line-height: 1.35;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    padding: 0.28rem 0.45rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-workspace {
    display: flex;
    flex: 1 1 auto;
    gap: 0.5rem;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-split {
    display: flex;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-eventing-sidebar,
.mythic-eventing-content {
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-sidebar {
    display: flex !important;
    flex-direction: column;
}
.mythic-eventing-content {
    display: flex !important;
}
.mythic-eventing-content > div {
    min-height: 0;
    min-width: 0;
}
.mythic-eventing-list {
    background: transparent !important;
    border: 0 !important;
    padding: 0.35rem !important;
}
.mythic-eventing-sidebar-toolbar {
    border-bottom: 1px solid var(--mythic-global-010);
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.65rem 0.65rem 0.55rem;
}
.mythic-eventing-sidebar-title-row {
    align-items: flex-start;
    display: flex;
    gap: 0.65rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-eventing-sidebar-title {
    color: var(--mythic-global-002);
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.2;
}
.mythic-eventing-sidebar-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.2;
    margin-top: 0.12rem;
}
.mythic-eventing-sidebar-count {
    align-items: center;
    background-color: var(--mythic-global-239);
    border: 1px solid var(--mythic-global-358);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-027);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1;
    min-height: 1.45rem;
    padding: 0 0.45rem;
}
.mythic-eventing-sidebar-search .MuiOutlinedInput-root {
    background-color: var(--mythic-global-107);
    border-radius: var(--mythic-global-008);
    font-size: 0.82rem;
}
.mythic-eventing-sidebar-search .MuiOutlinedInput-input {
    padding-bottom: 0.45rem;
    padding-top: 0.45rem;
}
.mythic-eventing-filter-row {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.35rem;
    overflow-x: auto;
    scrollbar-width: none;
}
.mythic-eventing-filter-row::-webkit-scrollbar {
    display: none;
}
.mythic-eventing-filter-button {
    align-items: center;
    background-color: transparent;
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 auto;
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 750;
    gap: 0.35rem;
    min-height: 1.65rem;
    padding: 0 0.45rem;
    white-space: nowrap;
}
.mythic-eventing-filter-button:hover {
    background-color: var(--mythic-global-359);
    border-color: var(--mythic-global-360);
    color: var(--mythic-global-002);
}
.mythic-eventing-filter-button-active {
    background-color: var(--mythic-global-239);
    border-color: var(--mythic-global-361);
    color: var(--mythic-global-027);
}
.mythic-eventing-filter-count {
    color: inherit;
    opacity: 0.78;
}
.mythic-eventing-list-scroll {
    flex-grow: 1;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
}
.mythic-eventing-list-header {
    background-color: var(--mythic-global-094) !important;
    color: var(--mythic-global-025) !important;
    font-size: 0.74rem !important;
    font-weight: 800 !important;
    letter-spacing: 0 !important;
    line-height: 1.2 !important;
    padding: 0.45rem 0.55rem !important;
    text-transform: none;
}
.mythic-eventing-list-item {
    align-items: flex-start !important;
    border: 1px solid transparent;
    border-radius: var(--mythic-global-008);
    cursor: pointer;
    display: flex !important;
    gap: 0.5rem;
    margin-bottom: 0.2rem;
    min-height: 3.35rem;
    min-width: 0;
    padding: 0.45rem 0.55rem !important;
}
.mythic-eventing-list-item-all {
    margin: 0.45rem 0.35rem 0.2rem !important;
    width: auto !important;
}
.mythic-eventing-list-item:hover {
    background-color: var(--mythic-global-359) !important;
    border-color: var(--mythic-global-010);
}
.mythic-eventing-list-item-selected {
    background-color: var(--mythic-global-235) !important;
    border-color: var(--mythic-global-361);
    box-shadow: inset 3px 0 0 var(--mythic-global-027);
}
.mythic-eventing-status-dot {
    border-radius: 999px;
    box-shadow: 0 0 0 3px var(--mythic-global-009);
    flex: 0 0 0.52rem;
    height: 0.52rem;
    margin-top: 0.42rem;
    width: 0.52rem;
}
.mythic-eventing-status-all {
    background-color: var(--mythic-global-023);
}
.mythic-eventing-status-runnable {
    background-color: var(--mythic-global-035);
}
.mythic-eventing-status-needs_approval {
    background-color: transparent;
    border: 2px solid var(--mythic-global-038);
    border-radius: 0.16rem;
    transform: rotate(45deg);
}
.mythic-eventing-status-disabled {
    background-color: var(--mythic-global-362);
    position: relative;
}
.mythic-eventing-status-disabled::after {
    background-color: var(--mythic-global-009);
    border-radius: 999px;
    content: "";
    height: 2px;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    width: 0.72rem;
}
.mythic-eventing-status-deleted {
    background-color: var(--mythic-global-048);
}
.mythic-eventing-list-item-content {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-eventing-list-item-main {
    align-items: center;
    display: flex;
    gap: 0.45rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-eventing-list-item-name {
    color: var(--mythic-global-002);
    flex: 1 1 auto;
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-list-item-name-deleted {
    color: var(--mythic-global-025);
    text-decoration: line-through;
}
.mythic-eventing-list-item-meta {
    color: var(--mythic-global-025);
    display: flex;
    flex-wrap: wrap;
    font-size: 0.72rem;
    font-weight: 650;
    gap: 0.25rem 0.45rem;
    line-height: 1.2;
    margin-top: 0.22rem;
    min-width: 0;
}
.mythic-eventing-runas-chip {
    align-items: center;
    background-color: var(--mythic-global-363);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1;
    min-height: 1.2rem;
    padding: 0 0.35rem;
}
.mythic-eventing-list-empty {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-weight: 650;
    padding: 0.8rem 0.55rem;
    text-align: center;
}
.mythic-eventing-wizard-dialog-content {
    height: min(95vh, 920px);
    margin: 0 !important;
    overflow: hidden;
    padding: 0 !important;
}
.mythic-eventing-wizard {
    background-color: var(--mythic-global-094);
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    min-width: 0;
}
.mythic-eventing-wizard .MuiFormControl-root:has(> .MuiInputLabel-root),
.mythic-eventing-wizard .MuiTextField-root:has(> .MuiInputLabel-root) {
    margin-top: 0.45rem !important;
}
.mythic-eventing-wizard-header {
    border-bottom: 1px solid var(--mythic-global-010);
    padding: 0.75rem 1rem;
}
.mythic-eventing-wizard-title-row {
    align-items: flex-start;
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-eventing-wizard-title {
    color: var(--mythic-global-002);
    font-size: 1.02rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-wizard-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.15rem;
}
.mythic-eventing-wizard-progress-chip {
    align-items: center;
    background-color: var(--mythic-global-239);
    border: 1px solid var(--mythic-global-358);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-027);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.74rem;
    font-weight: 850;
    line-height: 1;
    min-height: 1.55rem;
    padding: 0 0.55rem;
}
.mythic-eventing-wizard-content {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
}
.mythic-eventing-wizard-content-heading {
    border-bottom: 1px solid var(--mythic-global-010);
    padding: 0.75rem 1rem;
}
.mythic-eventing-wizard-content-title {
    color: var(--mythic-global-002);
    font-size: 0.9rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-wizard-content-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.12rem;
}
.mythic-eventing-wizard-step {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
}
.mythic-eventing-wizard-step-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: 0.8rem 1rem;
}
.mythic-eventing-wizard-table-container {
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    flex: 1 1 auto;
    overflow: visible !important;
    width: 100%;
}
.mythic-eventing-wizard-table {
    border-collapse: separate !important;
    border-spacing: 0 0.5rem !important;
}
.mythic-eventing-wizard-table .MuiTableHead-root {
    display: none;
}
.mythic-eventing-wizard-table .MuiTableRow-root {
    background-color: var(--mythic-global-262);
}
.mythic-eventing-wizard-table .MuiTableCell-root {
    border-bottom: 1px solid var(--mythic-global-010) !important;
    border-top: 1px solid var(--mythic-global-010) !important;
    padding: 0.65rem 0.75rem !important;
    vertical-align: top;
}
.mythic-eventing-wizard-table .MuiTableCell-root:first-of-type {
    border-left: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008) 0 0 var(--mythic-global-008);
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    font-weight: 850;
    text-transform: none;
    width: 10rem;
}
.mythic-eventing-wizard-table .MuiTableCell-root:last-of-type {
    border-radius: 0 var(--mythic-global-008) var(--mythic-global-008) 0;
    border-right: 1px solid var(--mythic-global-010) !important;
}
.mythic-eventing-step-table .MuiTableCell-root:first-of-type {
    width: 9rem;
}
.mythic-eventing-wizard-table .MuiTypography-root {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    line-height: 1.35;
    margin-top: 0.35rem;
}
.mythic-eventing-metadata-layout {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
}
.mythic-eventing-metadata-card {
    background-color: var(--mythic-global-262);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-metadata-card-wide {
    grid-column: 1 / -1;
}
.mythic-eventing-metadata-card-header {
    background-color: var(--mythic-global-305);
    border-bottom: 1px solid var(--mythic-global-010);
    padding: 0.7rem 0.75rem 0.6rem;
}
.mythic-eventing-metadata-card-title {
    color: var(--mythic-global-002);
    font-size: 0.88rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-metadata-card-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.16rem;
}
.mythic-eventing-metadata-field-grid {
    display: grid;
    gap: 0.65rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0.75rem;
}
.mythic-eventing-metadata-field {
    min-width: 0;
    padding: 0.75rem;
}
.mythic-eventing-metadata-field + .mythic-eventing-metadata-field {
    border-top: 1px solid var(--mythic-global-010);
}
.mythic-eventing-metadata-field-grid .mythic-eventing-metadata-field {
    padding: 0;
}
.mythic-eventing-metadata-field-grid .mythic-eventing-metadata-field + .mythic-eventing-metadata-field {
    border-top: 0;
}
.mythic-eventing-metadata-label {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1.2;
    margin-bottom: 0.4rem;
}
.mythic-eventing-metadata-empty {
    align-items: center;
    background-color: var(--mythic-global-364);
    border: 1px solid var(--mythic-global-362);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    font-size: 0.74rem;
    font-weight: 800;
    min-height: 1.65rem;
    padding: 0 0.55rem;
}
.mythic-eventing-trigger-parameter-list .mythic-create-parameter-card {
    grid-template-columns: minmax(14rem, 0.36fr) minmax(0, 1fr);
}
.mythic-eventing-choice-row {
    align-items: flex-start;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}
.mythic-eventing-choice-row > .MuiFormControl-root,
.mythic-eventing-choice-row > .mythic-eventing-choice-custom {
    margin-top: 0.45rem;
}
.mythic-eventing-choice-row > .MuiFormControl-root .MuiTextField-root,
.mythic-eventing-choice-row > .mythic-eventing-choice-custom .MuiFormControl-root,
.mythic-eventing-choice-row > .mythic-eventing-choice-custom .MuiTextField-root {
    margin-top: 0 !important;
}
.mythic-eventing-choice-separator {
    align-items: center;
    align-self: center;
    background-color: var(--mythic-global-363);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    font-size: 0.68rem;
    font-weight: 850;
    height: 1.45rem;
    justify-content: center;
    min-width: 1.9rem;
}
.mythic-eventing-choice-custom {
    min-width: 0;
}
.mythic-eventing-array-list {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.mythic-eventing-array-row {
    align-items: center;
    display: flex;
    gap: 0.35rem;
    min-width: 0;
    width: 100%;
}
.mythic-eventing-array-row > .MuiIconButton-root {
    flex: 0 0 auto;
}
.mythic-eventing-array-row > div {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-eventing-file-select {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.mythic-eventing-file-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}
.mythic-eventing-file-chip {
    align-items: center;
    background-color: var(--mythic-global-264);
    border: 1px solid var(--mythic-global-365);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 750;
    gap: 0.2rem;
    line-height: 1.2;
    min-height: 1.45rem;
    padding: 0 0.18rem 0 0.45rem;
}
.mythic-eventing-file-chip-name {
    max-width: 14rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-file-chip-remove.MuiIconButton-root {
    color: var(--mythic-global-025) !important;
    height: 1.15rem;
    padding: 0;
    width: 1.15rem;
}
.mythic-eventing-file-chip-remove.MuiIconButton-root:hover {
    background-color: var(--mythic-global-366) !important;
    color: var(--mythic-global-048) !important;
}
.mythic-eventing-file-chip-remove svg {
    font-size: 0.82rem;
}
.mythic-eventing-metadata-editor {
    min-height: 16rem;
    padding: 0.75rem;
}
.mythic-eventing-metadata-editor > div {
    min-height: 15rem;
}
@media (max-width: 1100px) {
    .mythic-eventing-metadata-layout,
    .mythic-eventing-metadata-field-grid,
    .mythic-eventing-choice-row {
        grid-template-columns: 1fr;
    }
    .mythic-eventing-choice-separator {
        justify-self: start;
    }
}
.mythic-eventing-wizard-toolbar {
    align-items: center;
    border-bottom: 1px solid var(--mythic-global-010);
    display: flex;
    gap: 0.85rem;
    justify-content: space-between;
    padding: 0.7rem 1rem;
}
.mythic-eventing-wizard-toolbar-title {
    color: var(--mythic-global-002);
    font-size: 0.86rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-wizard-toolbar-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 650;
    margin-top: 0.1rem;
}
.mythic-eventing-wizard-toolbar-actions {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: flex-end;
}
.mythic-eventing-wizard-step-browser {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
}
.mythic-eventing-wizard-step-browser-empty {
    display: block;
}
.mythic-eventing-step-nav {
    background-color: var(--mythic-global-262);
    border-right: 1px solid var(--mythic-global-010);
    display: flex;
    flex: 0 0 14.5rem;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
}
.mythic-eventing-step-nav-header {
    border-bottom: 1px solid var(--mythic-global-010);
    padding: 0.7rem 0.75rem 0.55rem;
}
.mythic-eventing-step-nav-title {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-step-nav-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.7rem;
    font-weight: 650;
    line-height: 1.2;
    margin-top: 0.12rem;
}
.mythic-eventing-step-nav-list {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.35rem;
    min-height: 0;
    overflow-y: auto;
    padding: 0.55rem;
}
.mythic-eventing-step-nav-item {
    align-items: flex-start;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    cursor: pointer;
    display: flex;
    font-family: inherit;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.45rem 0.5rem;
    text-align: left;
    width: 100%;
}
.mythic-eventing-step-nav-item:hover {
    background-color: var(--mythic-global-359);
    border-color: var(--mythic-global-010);
    color: var(--mythic-global-002);
}
.mythic-eventing-step-nav-item-active {
    background-color: var(--mythic-global-239);
    border-color: var(--mythic-global-236);
    color: var(--mythic-global-002);
}
.mythic-eventing-step-nav-number {
    align-items: center;
    background-color: var(--mythic-global-235);
    border: 1px solid var(--mythic-global-358);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-027);
    display: inline-flex;
    flex: 0 0 1.45rem;
    font-size: 0.72rem;
    font-weight: 900;
    height: 1.45rem;
    justify-content: center;
    line-height: 1;
}
.mythic-eventing-step-nav-copy {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
}
.mythic-eventing-step-nav-name {
    color: inherit;
    font-size: 0.76rem;
    font-weight: 850;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-step-nav-action {
    color: var(--mythic-global-025);
    font-size: 0.66rem;
    font-weight: 700;
    line-height: 1.2;
    margin-top: 0.16rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-wizard-step-scroll-browser {
    flex: 1 1 auto;
    scroll-padding-top: 0.75rem;
}
@media (max-width: 900px) {
    .mythic-eventing-wizard-step-browser {
        flex-direction: column;
    }
    .mythic-eventing-step-nav {
        border-bottom: 1px solid var(--mythic-global-010);
        border-right: 0;
        flex: 0 0 auto;
        max-height: 10rem;
    }
    .mythic-eventing-step-nav-list {
        flex-direction: row;
        overflow-x: auto;
        overflow-y: hidden;
    }
    .mythic-eventing-step-nav-item {
        flex: 0 0 12rem;
    }
}
.mythic-eventing-step-shell {
    margin-bottom: 0.75rem;
    scroll-margin-top: 0.75rem;
}
.mythic-eventing-step-shell-header {
    align-items: center;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    margin-bottom: 0.35rem;
}
.mythic-eventing-step-shell-title {
    color: var(--mythic-global-027);
    font-size: 0.72rem;
    font-weight: 900;
    line-height: 1.2;
    text-transform: none;
}
.mythic-eventing-step-shell-subtitle {
    color: var(--mythic-global-002);
    font-size: 0.88rem;
    font-weight: 850;
    line-height: 1.2;
    margin-top: 0.1rem;
}
.mythic-eventing-step-config-card,
.mythic-eventing-wizard-review-card,
.mythic-eventing-wizard-empty {
    background-color: var(--mythic-global-262);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    overflow: hidden;
}
.mythic-eventing-step-config-card-modern {
    background-color: var(--mythic-global-318);
}
.mythic-eventing-step-config-summary {
    align-items: flex-start;
    background-color: var(--mythic-global-287);
    border-bottom: 1px solid var(--mythic-global-010);
    display: flex;
    gap: 0.8rem;
    justify-content: space-between;
    min-width: 0;
    padding: 0.75rem;
}
.mythic-eventing-step-config-summary-copy {
    min-width: 0;
}
.mythic-eventing-step-config-summary-title {
    color: var(--mythic-global-002);
    font-size: 0.92rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-step-config-summary-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.16rem;
}
.mythic-eventing-step-config-summary-actions {
    align-items: flex-start;
    display: flex;
    flex: 0 0 auto;
    gap: 0.55rem;
}
.mythic-eventing-step-action-chip {
    align-items: center;
    background-color: var(--mythic-global-367);
    border: 1px solid var(--mythic-global-368);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1.2;
    min-height: 1.65rem;
    padding: 0 0.55rem;
}
.mythic-eventing-step-action-chip-warning {
    background-color: var(--mythic-global-046);
    border-color: var(--mythic-global-104);
    color: var(--mythic-global-038);
}
.mythic-eventing-step-switch-stack {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
}
.mythic-eventing-step-switch-row {
    align-items: center;
    background-color: var(--mythic-global-231);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    cursor: pointer;
    display: flex;
    gap: 0.55rem;
    min-width: 16rem;
    padding: 0.3rem 0.35rem 0.3rem 0.6rem;
}
.mythic-eventing-step-switch-row-compact {
    margin-top: 0.5rem;
    min-width: 0;
    width: 100%;
}
.mythic-eventing-step-switch-copy {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
}
.mythic-eventing-step-switch-title {
    color: var(--mythic-global-002);
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-step-switch-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.66rem;
    font-weight: 600;
    line-height: 1.25;
    margin-top: 0.08rem;
}
.mythic-eventing-step-config-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
}
.mythic-eventing-step-config-section {
    background-color: var(--mythic-global-094);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: 0 1px 2px var(--mythic-global-369);
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-step-config-section-header {
    background-image: var(--mythic-global-069);
    border-bottom: 1px solid var(--mythic-global-010);
    padding: 0.62rem 0.7rem 0.55rem;
}
.mythic-eventing-step-config-section-title {
    color: var(--mythic-global-002);
    font-size: 0.82rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-step-config-section-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.14rem;
}
.mythic-eventing-step-config-section-body {
    padding: 0.7rem;
}
.mythic-eventing-step-field-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
}
.mythic-eventing-step-section-stack {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
}
.mythic-eventing-step-config-section-wide {
    width: 100%;
}
.mythic-eventing-step-field {
    min-width: 0;
}
.mythic-eventing-step-field-heading {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.35rem;
}
.mythic-eventing-step-field-label {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-step-field-required {
    align-items: center;
    background-color: var(--mythic-global-370);
    border: 1px solid var(--mythic-global-371);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-038);
    display: inline-flex;
    font-size: 0.64rem;
    font-weight: 850;
    line-height: 1;
    min-height: 1.2rem;
    padding: 0 0.35rem;
}
.mythic-eventing-step-field-description {
    color: var(--mythic-global-025);
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.35;
    margin-bottom: 0.45rem;
}
.mythic-eventing-step-field-control {
    min-width: 0;
}
.mythic-eventing-step-dynamic-section {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
}
.mythic-eventing-step-user-interaction-section {
    align-items: stretch;
    width: 100%;
}
.mythic-eventing-step-user-interaction-section .mythic-eventing-step-switch-stack,
.mythic-eventing-step-user-interaction-section .mythic-eventing-step-switch-row {
    width: 100%;
}
.mythic-eventing-step-user-interaction-section > .mythic-table-row-action {
    align-self: flex-start;
}
.mythic-eventing-step-approval-policy-row {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
    min-width: 0;
    width: 100%;
}
.mythic-eventing-step-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    width: 100%;
}
.mythic-eventing-step-list-item {
    align-items: flex-start;
    background-color: var(--mythic-global-372);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    gap: 0.45rem;
    min-width: 0;
    padding: 0.5rem;
    width: 100%;
}
.mythic-eventing-step-list-item-editable {
    display: block;
}
.mythic-eventing-step-list-item-editable.mythic-eventing-user-input-field-row {
    align-items: flex-start;
    display: flex;
}
.mythic-eventing-step-list-item > .MuiIconButton-root {
    flex: 0 0 auto;
    margin-top: 0.45rem;
}
.mythic-eventing-user-input-field-row > .MuiIconButton-root {
    margin-top: 0.35rem;
}
.mythic-eventing-user-input-field-row .mythic-eventing-step-field-grid {
    width: 100%;
}
.mythic-eventing-user-input-source-cell,
.mythic-eventing-user-input-choices {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
    width: 100%;
}
.mythic-eventing-user-input-choices {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    margin-top: 0.55rem;
    padding: 0.55rem;
}
.mythic-eventing-user-input-choices-header,
.mythic-eventing-user-input-choice-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
    width: 100%;
}
.mythic-eventing-user-input-choice-row {
    align-items: center;
    display: grid;
    gap: 0.45rem;
    grid-template-columns: 2rem minmax(0, 1fr);
    min-width: 0;
    width: 100%;
}
.mythic-eventing-user-input-choice-list > .mythic-table-row-action {
    align-self: flex-start;
}
.mythic-eventing-step-list-content {
    flex: 1 1 auto;
    min-width: 0;
}
.mythic-eventing-step-input-grid {
    align-items: center;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: 2rem minmax(9rem, 0.75fr) minmax(10rem, 0.8fr) minmax(14rem, 1.45fr);
    min-width: 0;
}
.mythic-eventing-step-output-grid {
    align-items: center;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: 2rem minmax(9rem, 0.75fr) minmax(14rem, 1.5fr);
    min-width: 0;
}
.mythic-eventing-step-list-item-editable .mythic-eventing-step-row-action {
    align-self: center;
    justify-self: center;
    margin-top: 0.45rem !important;
}
.mythic-eventing-step-input-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text),
.mythic-eventing-step-output-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) {
    margin-top: 0.45rem;
}
.mythic-eventing-step-input-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) .MuiFormControl-root,
.mythic-eventing-step-input-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) .MuiTextField-root,
.mythic-eventing-step-output-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) .MuiFormControl-root,
.mythic-eventing-step-output-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) .MuiTextField-root {
    margin-top: 0 !important;
}
.mythic-eventing-step-list-item-editable .mythic-eventing-choice-row {
    align-items: center;
}
.mythic-eventing-step-list-item-editable .mythic-eventing-choice-separator {
    align-self: center;
}
.mythic-eventing-step-helper-text {
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 600;
    grid-column: 2 / -1;
    line-height: 1.35;
    margin-top: -0.05rem;
}
.mythic-eventing-step-empty-inline {
    align-items: center;
    background-color: var(--mythic-global-364);
    border: 1px dashed var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: flex;
    font-size: 0.74rem;
    font-weight: 700;
    min-height: 2.3rem;
    padding: 0 0.65rem;
}
.mythic-eventing-step-action-data {
    min-width: 0;
}
.mythic-eventing-step-help-text {
    background-color: var(--mythic-global-373);
    border: 1px solid var(--mythic-global-374);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.4;
    margin: 0 0 0.65rem;
    padding: 0.55rem 0.65rem;
}
.mythic-eventing-action-data-card {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-left: 4px solid transparent;
    border-radius: var(--mythic-global-008);
    display: grid;
    gap: 0.75rem;
    grid-template-columns: minmax(13rem, 0.34fr) minmax(0, 1fr);
    min-width: 0;
    padding: 0.7rem 0.75rem;
}
.mythic-eventing-action-data-copy {
    min-width: 0;
}
.mythic-eventing-action-data-title-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}
.mythic-eventing-action-data-title {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    font-weight: 850 !important;
    line-height: 1.25;
}
.mythic-eventing-action-data-chip {
    background-color: var(--mythic-global-370);
    border: 1px solid var(--mythic-global-371);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-038);
    display: inline-flex;
    align-items: center;
    font-size: 0.64rem;
    font-weight: 850;
    line-height: 1;
    min-height: 1.2rem;
    padding: 0 0.35rem;
}
.mythic-eventing-action-data-description {
    color: var(--mythic-global-025);
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.28rem;
}
.mythic-eventing-action-data-control {
    min-width: 0;
}
.mythic-eventing-action-data-control .MuiFormControl-root,
.mythic-eventing-action-data-control .MuiTextField-root {
    width: 100%;
}
.mythic-eventing-task-create-command-row {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-eventing-task-create-command-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-start;
}
.mythic-eventing-task-helper-summary {
    background-color: var(--mythic-global-373);
    border: 1px solid var(--mythic-global-374);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    font-size: 0.76rem;
    font-weight: 650;
    line-height: 1.4;
    margin-bottom: 0.65rem;
    padding: 0.55rem 0.65rem;
}
.mythic-eventing-task-helper-filter {
    margin-bottom: 0.65rem;
}
.mythic-eventing-task-helper-table {
    height: min(50vh, 34rem);
    min-height: 18rem;
    overflow-y: auto;
}
.mythic-eventing-task-helper-preview {
    color: var(--mythic-global-025);
    display: -webkit-box;
    font-size: 0.74rem;
    line-height: 1.35;
    max-height: 2.1rem;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}
.mythic-eventing-action-array-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-eventing-action-array-row {
    align-items: center;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: 2rem minmax(0, 1fr);
    min-width: 0;
}
.mythic-eventing-step-config-card .mythic-eventing-wizard-table {
    border-spacing: 0 !important;
}
.mythic-eventing-step-config-card .mythic-eventing-wizard-table .MuiTableRow-root {
    background-color: transparent;
}
.mythic-eventing-step-config-card .mythic-eventing-wizard-table .MuiTableCell-root {
    border-left: 0 !important;
    border-radius: 0 !important;
    border-right: 0 !important;
    border-top: 0 !important;
}
	@media (max-width: 1200px) {
	    .mythic-eventing-step-input-grid {
	        grid-template-columns: 2rem minmax(0, 1fr);
	    }
	    .mythic-eventing-step-input-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) {
	        grid-column: 2;
	    }
	}
@media (max-width: 900px) {
    .mythic-eventing-step-config-summary,
    .mythic-eventing-step-config-summary-actions {
        flex-direction: column;
    }
    .mythic-eventing-step-config-summary-actions,
    .mythic-eventing-step-switch-row {
        width: 100%;
    }
	    .mythic-eventing-step-field-grid {
	        grid-template-columns: 1fr;
	    }
	    .mythic-eventing-step-output-grid {
	        grid-template-columns: 2rem minmax(0, 1fr);
	    }
	    .mythic-eventing-step-output-grid > :not(.mythic-eventing-step-row-action):not(.mythic-eventing-step-helper-text) {
	        grid-column: 2;
	    }
	    .mythic-eventing-action-data-card,
	    .mythic-eventing-trigger-parameter-list .mythic-create-parameter-card {
	        grid-template-columns: 1fr;
	    }
	}
.mythic-eventing-wizard-empty {
    color: var(--mythic-global-025);
    font-size: 0.82rem;
    font-weight: 650;
    padding: 1.4rem;
    text-align: center;
}
.mythic-eventing-wizard-empty-title {
    color: var(--mythic-global-002);
    font-size: 0.92rem;
    font-weight: 850;
    margin-bottom: 0.25rem;
}
.mythic-eventing-wizard-empty-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.76rem;
    font-weight: 650;
}
.mythic-eventing-wizard-review-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
.mythic-eventing-wizard-review-toolbar {
    align-items: center;
    border-bottom: 1px solid var(--mythic-global-010);
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.65rem;
}
.mythic-eventing-wizard-editor {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
}
.mythic-eventing-wizard-editor > div {
    height: 100%;
}
.mythic-eventing-wizard-actions {
    border-top: 1px solid var(--mythic-global-010);
    gap: 0.45rem;
    margin: 0 !important;
    padding: 0.65rem 1rem !important;
}
.mythic-eventing-editor-dialog-title {
    align-items: flex-start;
    border-bottom: 1px solid var(--mythic-global-010);
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    padding: 0.85rem 1rem !important;
}
.mythic-eventing-editor-title {
    color: var(--mythic-global-002);
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-editor-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.76rem;
    font-weight: 600;
    line-height: 1.35;
    margin-top: 0.15rem;
}
.mythic-eventing-editor-title-actions {
    display: flex;
    flex: 0 0 auto;
    gap: 0.35rem;
}
.mythic-eventing-editor-dialog-content {
    height: min(84vh, 800px);
    margin: 0 !important;
    overflow: hidden;
    padding: 0 !important;
}
.mythic-eventing-editor-dialog-content > div {
    height: 100%;
}
.mythic-eventing-list-item .MuiListItemText-primary {
    font-size: 0.84rem;
    font-weight: 700;
    line-height: 1.25;
}
.mythic-eventing-detail {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    height: 100%;
    margin-left: 0 !important;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    padding: 0.5rem;
}
.mythic-eventing-graph-panel {
    background-color: var(--mythic-global-318);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    flex: 0 0 200px;
    min-height: 200px;
    overflow: hidden;
}
.mythic-eventing-workflow-overview {
    background-color: var(--mythic-global-094);
    background-image: var(--mythic-global-375);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: var(--mythic-global-376);
    color: var(--mythic-global-002);
    container-type: inline-size;
    display: grid;
    flex: 0 0 auto;
    gap: 0.75rem;
    grid-template-columns: minmax(9.5rem, 0.55fr) minmax(13rem, 0.82fr) minmax(0, 2.2fr);
    min-width: 0;
    overflow: hidden;
    padding: 0.72rem 0.78rem;
    width: 100%;
}
.mythic-eventing-workflow-overview-header {
    align-items: flex-start;
    border-bottom: 1px solid var(--mythic-global-010);
    display: flex;
    gap: 0.75rem;
    grid-column: 1 / -1;
    justify-content: space-between;
    min-width: 0;
    padding-bottom: 0.7rem;
}
.mythic-eventing-workflow-overview-title-block {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.28rem;
    min-width: 0;
}
.mythic-eventing-workflow-overview-title-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-eventing-workflow-overview-title {
    color: var(--mythic-global-002);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.18;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-eventing-workflow-overview-description {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.35;
    max-width: 64rem;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-eventing-workflow-overview-header-actions {
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-end;
    max-width: 100%;
    min-width: min(100%, 13.5rem);
}
.mythic-eventing-workflow-overview-header-actions .MuiButton-root.mythic-table-row-action {
    flex: 0 1 auto;
    min-width: 6.5rem;
    max-width: 100%;
    white-space: normal;
}
.mythic-eventing-workflow-overview-section {
    display: flex;
    flex-direction: column;
    gap: 0.62rem;
    min-width: 0;
}
.mythic-eventing-workflow-overview-section + .mythic-eventing-workflow-overview-section {
    border-left: 1px solid var(--mythic-global-010);
    padding-left: 0.75rem;
}
.mythic-eventing-workflow-overview-primary {
    display: flex;
    flex-direction: column;
    gap: 0.62rem;
}
.mythic-eventing-workflow-overview-field,
.mythic-eventing-workflow-action-group {
    display: flex;
    flex-direction: column;
    gap: 0.34rem;
    min-width: 0;
}
.mythic-eventing-workflow-overview-label {
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.15;
}
.mythic-eventing-workflow-overview-value {
    color: var(--mythic-global-002);
    font-size: 0.86rem;
    font-weight: 800;
    line-height: 1.25;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-eventing-workflow-overview-subvalue {
    color: var(--mythic-global-025);
    font-size: 0.76rem;
    font-weight: 650;
    line-height: 1.3;
    min-width: 0;
    overflow-wrap: anywhere;
}
.mythic-eventing-workflow-overview-icon-line {
    align-items: center;
    display: inline-flex;
    gap: 0.35rem;
}
.mythic-eventing-workflow-overview-icon-line svg {
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    font-size: 0.95rem;
}
.mythic-eventing-workflow-chip-row,
.mythic-eventing-workflow-button-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-eventing-workflow-keyword-chip {
    align-items: center;
    background-color: var(--mythic-global-377);
    border: 1px solid var(--mythic-global-010);
    border-radius: 999px;
    color: var(--mythic-global-002);
    display: inline-flex;
    font-size: 0.7rem;
    font-weight: 760;
    line-height: 1.1;
    max-width: 16rem;
    min-height: 1.35rem;
    overflow: hidden;
    padding: 0.18rem 0.46rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-workflow-keyword-more {
    color: var(--mythic-global-025);
}
.mythic-eventing-workflow-overview-actions {
    gap: 0.7rem;
}
.mythic-eventing-workflow-button-row .MuiButton-root.mythic-table-row-action {
    flex: 0 1 auto;
    gap: 0.25rem;
    justify-content: flex-start;
    line-height: 1.2;
    max-width: 100%;
    min-width: auto;
    padding-left: 0.55rem;
    padding-right: 0.65rem;
    text-align: left;
    white-space: normal;
}
.mythic-eventing-workflow-button-row .MuiButton-startIcon {
    margin-left: 0;
    margin-right: 0.28rem;
}
.MuiButton-root.mythic-eventing-workflow-approval-button {
    background-color: var(--mythic-global-377) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008) !important;
    box-shadow: none !important;
    font-size: 0.72rem;
    font-weight: 800;
    min-height: 1.5rem;
    padding: 0.15rem 0.55rem;
    text-transform: none;
}
.MuiButton-root.mythic-eventing-workflow-approval-button .MuiButton-startIcon {
    margin-left: 0;
    margin-right: 0.28rem;
}
.MuiButton-root.mythic-eventing-workflow-approval-approved {
    background-color: var(--mythic-global-045) !important;
    border-color: var(--mythic-global-084) !important;
    color: var(--mythic-global-035) !important;
}
.MuiButton-root.mythic-eventing-workflow-approval-approved:hover {
    background-color: var(--mythic-global-378) !important;
    border-color: var(--mythic-global-379) !important;
}
.MuiButton-root.mythic-eventing-workflow-approval-needs-approval {
    background-color: var(--mythic-global-046) !important;
    border-color: var(--mythic-global-104) !important;
    color: var(--mythic-global-038) !important;
}
.MuiButton-root.mythic-eventing-workflow-approval-needs-approval:hover {
    background-color: var(--mythic-global-380) !important;
    border-color: var(--mythic-global-381) !important;
}
@container (max-width: 58rem) {
    .mythic-eventing-workflow-overview {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .mythic-eventing-workflow-overview-header {
        align-items: stretch;
        flex-direction: column;
        grid-column: 1 / -1;
    }
    .mythic-eventing-workflow-overview-header-actions {
        justify-content: flex-start;
    }
    .mythic-eventing-workflow-overview-section + .mythic-eventing-workflow-overview-section {
        border-left: 1px solid var(--mythic-global-010);
        border-top: 0;
        padding-left: 0.75rem;
        padding-top: 0;
    }
    .mythic-eventing-workflow-overview-actions {
        border-left: 0 !important;
        border-top: 1px solid var(--mythic-global-010) !important;
        grid-column: 1 / -1;
        padding-left: 0 !important;
        padding-top: 0.65rem !important;
    }
}
.mythic-eventing-instances-grid {
    display: flex;
    flex: 1 1 auto;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    position: relative;
    width: 100%;
}
.mythic-eventing-instance-cell {
    align-items: center;
    display: flex;
    min-width: 0;
    width: 100%;
}
.mythic-eventing-instance-id-cell {
    gap: 0.28rem;
    justify-content: space-between;
}
.mythic-eventing-instance-id {
    color: var(--mythic-global-002);
    font-weight: 850;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.MuiIconButton-root.mythic-eventing-instance-id-menu-button {
    flex: 0 0 auto;
}
.mythic-eventing-instance-status-cell .mythic-eventing-status-chip {
    max-width: 100%;
}
.mythic-eventing-instance-status-cell .mythic-eventing-status-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-instances-time-cell {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    justify-content: center;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-eventing-instances-time-line {
    align-items: center;
    display: flex;
    gap: 0.38rem;
    line-height: 1.25;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-instances-time-line svg {
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    font-size: 0.92rem;
}
.mythic-eventing-instances-time-secondary {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
}
.mythic-eventing-flow-canvas {
    background-color: var(--mythic-global-318);
    height: 100%;
    min-height: 0;
    position: relative;
    width: 100%;
}
.mythic-eventing-flow-canvas .react-flow__pane {
    cursor: grab;
}
.mythic-eventing-flow-badge {
    align-items: center;
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: 0 6px 18px var(--mythic-global-024);
    color: var(--mythic-global-025);
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 800;
    left: 0.75rem;
    line-height: 1;
    min-height: 1.75rem;
    padding: 0 0.55rem;
    position: absolute;
    top: 0.75rem;
    z-index: 5;
}
.mythic-graph-controls-muted-hover .react-flow__controls-button:hover {
    background-color: var(--mythic-global-359);
    color: var(--mythic-global-002);
}
.mythic-eventing-flow-canvas .react-flow__node-eventNode {
    background: transparent !important;
    border: 0 !important;
    box-sizing: border-box;
    box-shadow: none !important;
    padding: 0 !important;
}
.mythic-eventing-flow-canvas .react-flow__node-eventNode.selected,
.mythic-eventing-flow-canvas .react-flow__node-eventNode:focus,
.mythic-eventing-flow-canvas .react-flow__node-eventNode:focus-visible {
    box-shadow: none !important;
}
.mythic-eventing-flow-canvas .groupEventNode {
    background: transparent !important;
    border: 0 !important;
    padding: 0 !important;
}
.mythic-eventing-flow-node {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    box-shadow: 0 8px 22px var(--mythic-global-382);
    color: var(--mythic-global-002);
    display: flex;
    flex-direction: column;
    gap: 0.42rem;
    height: 100%;
    justify-content: flex-start;
    min-width: 0;
    overflow: hidden;
    padding: 0.58rem 0.64rem;
    width: 100%;
}
.mythic-eventing-flow-node-success {
    border-color: var(--mythic-global-383);
}
.mythic-eventing-flow-node-running {
    border-color: var(--mythic-global-384);
}
.mythic-eventing-flow-node-awaiting_approval,
.mythic-eventing-flow-node-input_needed {
    border-color: var(--mythic-global-104);
}
.mythic-eventing-flow-node-error {
    border-color: var(--mythic-global-354);
}
.mythic-eventing-flow-node-cancelled {
    border-color: var(--mythic-global-385);
}
.mythic-eventing-flow-node-skipped {
    border-color: var(--mythic-global-386);
}
.mythic-eventing-flow-node-waiting,
.mythic-eventing-flow-node-configured {
    border-color: var(--mythic-global-007);
}
.mythic-eventing-flow-node-main {
    align-items: center;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.34rem;
    justify-content: flex-start;
    min-width: 0;
}
.mythic-eventing-flow-node-title {
    color: var(--mythic-global-002);
    display: -webkit-box;
    font-size: 0.84rem !important;
    font-weight: 850 !important;
    line-height: 1.18 !important;
    margin: 0 !important;
    min-height: 1.95rem;
    overflow: hidden;
    overflow-wrap: anywhere;
    text-overflow: ellipsis;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    white-space: normal;
}
.mythic-eventing-flow-node-meta {
    align-items: center;
    color: var(--mythic-global-025);
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-eventing-flow-node-meta .MuiTypography-root {
    color: var(--mythic-global-025) !important;
    float: none !important;
    font-size: 0.68rem !important;
    line-height: 1.2;
}
.mythic-eventing-flow-node-action {
    align-items: center;
    background-color: var(--mythic-global-387);
    border-color: var(--mythic-global-368);
    color: var(--mythic-global-023);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    flex: 0 1 auto;
    font-size: 0.66rem;
    font-weight: 750;
    line-height: 1;
    max-width: 100%;
    min-height: 1.28rem;
    overflow: hidden;
    padding: 0 0.38rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-status-chip {
    align-items: center;
    background-color: var(--mythic-global-364);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    display: inline-flex;
    flex: 0 1 auto;
    font-size: 0.7rem;
    font-weight: 850;
    line-height: 1;
    max-width: 100%;
    min-height: 1.45rem;
    min-width: 0;
    padding: 0 0.45rem;
    width: fit-content;
}
.mythic-eventing-status-chip .MuiSvgIcon-root {
    flex: 0 0 auto;
    font-size: 0.95rem !important;
    margin: 0 0.28rem 0 0 !important;
}
.mythic-eventing-status-chip span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-status-chip-success {
    background-color: var(--mythic-global-388);
    border-color: var(--mythic-global-389);
    color: var(--mythic-global-035);
}
.mythic-eventing-status-chip-running {
    background-color: var(--mythic-global-387);
    border-color: var(--mythic-global-368);
    color: var(--mythic-global-023);
}
.mythic-eventing-status-chip-awaiting_approval,
.mythic-eventing-status-chip-input_needed {
    background-color: var(--mythic-global-046);
    border-color: var(--mythic-global-104);
    color: var(--mythic-global-038);
}
.mythic-eventing-status-chip-error {
    background-color: var(--mythic-global-390);
    border-color: var(--mythic-global-391);
    color: var(--mythic-global-048);
}
.mythic-eventing-status-chip-cancelled {
    background-color: var(--mythic-global-392);
    border-color: var(--mythic-global-393);
    color: var(--mythic-global-038);
}
.mythic-eventing-status-chip-skipped,
.mythic-eventing-status-chip-configured {
    background-color: var(--mythic-global-355);
    border-color: var(--mythic-global-007);
    color: var(--mythic-global-025);
}
.mythic-eventing-status-chip-waiting {
    background-color: var(--mythic-global-364);
    border-color: var(--mythic-global-362);
    color: var(--mythic-global-025);
}
.mythic-eventing-user-interaction-dialog-content {
    background-color: var(--mythic-global-318);
}
.mythic-eventing-user-interaction-modal {
    display: grid;
    gap: 0.85rem;
    grid-template-columns: minmax(11rem, 15rem) minmax(0, 1fr);
    min-width: 0;
}
.mythic-eventing-user-interaction-modal-single {
    grid-template-columns: minmax(0, 1fr);
}
.mythic-eventing-user-interaction-step-picker {
    display: flex;
    flex-direction: column;
    gap: 0.38rem;
    min-width: 0;
}
.mythic-eventing-user-interaction-step-option {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    min-width: 0;
    padding: 0.52rem 0.58rem;
    text-align: left;
}
.mythic-eventing-user-interaction-step-option:hover,
.mythic-eventing-user-interaction-step-option-active {
    border-color: var(--mythic-global-104);
    box-shadow: inset 3px 0 0 var(--mythic-global-104);
}
.mythic-eventing-user-interaction-step-name {
    font-size: 0.78rem;
    font-weight: 850;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-user-interaction-step-meta {
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 700;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-user-interaction-workspace {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
}
.mythic-eventing-user-interaction-step-summary,
.mythic-eventing-user-interaction-section {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
    padding: 0.75rem;
}
.mythic-eventing-user-interaction-step-summary {
    align-items: flex-start;
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
}
.mythic-eventing-user-interaction-summary-chips {
    align-items: center;
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    gap: 0.35rem;
    justify-content: flex-end;
    min-width: 0;
}
.mythic-eventing-user-interaction-section-title {
    color: var(--mythic-global-002);
    font-size: 0.82rem;
    font-weight: 850;
    line-height: 1.2;
    margin-bottom: 0.35rem;
}
.mythic-eventing-user-interaction-section-label {
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 850;
    letter-spacing: 0;
    line-height: 1.1;
    margin-bottom: 0.35rem;
    text-transform: uppercase;
}
.mythic-eventing-user-interaction-title {
    color: var(--mythic-global-002);
    font-size: 1rem;
    font-weight: 850;
    line-height: 1.2;
    overflow-wrap: anywhere;
}
.mythic-eventing-user-interaction-prompt,
.mythic-eventing-user-interaction-permission {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.35;
    margin-top: 0.18rem;
    overflow-wrap: anywhere;
}
.mythic-eventing-user-interaction-prompt {
    color: var(--mythic-global-002);
    white-space: pre-wrap;
}
.mythic-eventing-user-interaction-policy-note {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1.3;
    margin-top: 0.45rem;
}
.mythic-eventing-user-interaction-required {
    background-color: var(--mythic-global-046);
    border: 1px solid var(--mythic-global-104);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-038);
    display: inline-flex;
    font-size: 0.62rem;
    font-weight: 800;
    line-height: 1;
    margin-left: 0.38rem;
    padding: 0.18rem 0.3rem;
}
.mythic-eventing-user-interaction-inputs {
    display: flex;
    flex-direction: column;
    gap: 0.58rem;
    margin-top: 0.62rem;
    min-width: 0;
}
.mythic-eventing-user-interaction-input-row {
    align-items: flex-start;
    display: grid;
    gap: 0.75rem;
    grid-template-columns: minmax(9rem, 0.45fr) minmax(12rem, 1fr);
    min-width: 0;
}
.mythic-eventing-user-interaction-input-copy {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    min-width: 0;
    padding-top: 0.28rem;
}
.mythic-eventing-user-interaction-input-name {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    font-weight: 850;
    line-height: 1.2;
    overflow-wrap: anywhere;
}
.mythic-eventing-user-interaction-input-description {
    color: var(--mythic-global-025);
    font-size: 0.7rem;
    font-weight: 650;
    line-height: 1.25;
    overflow-wrap: anywhere;
}
@media (max-width: 820px) {
    .mythic-eventing-user-interaction-modal,
    .mythic-eventing-user-interaction-input-row {
        grid-template-columns: minmax(0, 1fr);
    }
}
.mythic-eventing-detail-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.55rem;
}
.mythic-eventing-detail-chip {
    align-items: center;
    background-color: var(--mythic-global-394);
    border: 1px solid var(--mythic-global-252);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-070);
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 800;
    gap: 0.35rem;
    line-height: 1;
    min-height: 1.55rem;
    padding: 0 0.48rem;
}
.mythic-eventing-detail-chip-label {
    color: inherit;
    opacity: 0.72;
}
.mythic-eventing-detail-chip-value {
    color: inherit;
    max-width: 14rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-dialog-header {
    padding: 0.75rem 0.75rem 0.5rem;
}
.mythic-eventing-header-title {
    align-items: center;
    color: inherit;
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-width: 0;
}
.mythic-eventing-header-title > span:last-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-eventing-header-duration {
    align-items: flex-end;
    color: inherit;
    display: inline-flex;
    flex-direction: column;
    gap: 0.2rem;
    line-height: 1.2;
    text-align: right;
}
.mythic-eventing-header-duration-label {
    color: inherit;
    font-size: 0.68rem;
    font-weight: 850;
    opacity: 0.7;
}
.mythic-eventing-header-duration .MuiTypography-root {
    color: inherit !important;
    float: none !important;
    font-size: 0.78rem !important;
    font-weight: 800;
}
.mythic-eventing-render-dialog-content {
    height: min(75vh, 720px);
    margin: 0 !important;
    min-height: 24rem;
    overflow: hidden;
    padding: 0 !important;
}
.mythic-eventing-render-dialog-content .mythic-eventing-flow-canvas {
    height: 100%;
}
.mythic-eventing-detail-dialog-content {
    background-color: var(--mythic-global-001);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: min(75vh, 760px);
    min-height: 24rem;
    overflow: auto;
    padding: 0.75rem !important;
}
.mythic-eventing-detail-dialog-content-state {
    align-items: stretch;
    justify-content: center;
}
.mythic-eventing-detail-dialog-content > .mythic-eventing-detail-section {
    flex: 0 0 auto;
}
.mythic-eventing-detail-dialog-actions {
    background-color: var(--mythic-global-009);
    border-top: 1px solid var(--mythic-global-010);
    gap: 0.45rem;
    margin: 0 !important;
    padding: 0.65rem 1rem !important;
}
.mythic-eventing-detail-section {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-detail-section-header {
    align-items: center;
    background-color: var(--mythic-global-107);
    border-bottom: 1px solid var(--mythic-global-010);
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-height: 2.5rem;
    padding: 0.62rem 0.75rem;
}
.mythic-eventing-detail-section-collapsed .mythic-eventing-detail-section-header {
    border-bottom: 0;
}
.mythic-eventing-detail-section-title-stack {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.mythic-eventing-detail-section-toggle {
    align-items: center;
    background: transparent;
    border: 0;
    color: var(--mythic-global-002);
    cursor: pointer;
    display: flex;
    flex: 1 1 auto;
    font: inherit;
    gap: 0.45rem;
    margin: -0.25rem 0;
    min-width: 0;
    outline: none;
    padding: 0.25rem 0;
    text-align: left;
}
.mythic-eventing-detail-section-toggle:focus-visible .mythic-eventing-detail-section-title {
    color: var(--mythic-global-027);
    text-decoration: underline;
    text-underline-offset: 0.18rem;
}
.mythic-eventing-detail-section-toggle:hover .mythic-eventing-detail-section-title {
    color: var(--mythic-global-027);
}
.mythic-eventing-detail-section-toggle-icon {
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    transition: transform 140ms ease, color 140ms ease;
}
.mythic-eventing-detail-section-expanded .mythic-eventing-detail-section-toggle-icon {
    color: var(--mythic-global-027);
    transform: rotate(180deg);
}
.mythic-eventing-detail-section-title {
    color: var(--mythic-global-002);
    font-size: 0.86rem;
    font-weight: 850;
    line-height: 1.2;
}
.mythic-eventing-detail-section-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.32;
    margin-top: 0.14rem;
}
.mythic-eventing-detail-section-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 0.4rem;
    justify-content: flex-end;
}
.mythic-eventing-detail-section-body {
    min-width: 0;
    padding: 0.72rem;
}
.mythic-eventing-section-empty {
    background-color: var(--mythic-global-395);
    border: 1px dashed var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    overflow: hidden;
}
.mythic-eventing-detail-count {
    align-items: center;
    border-radius: var(--mythic-global-008);
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 850;
    justify-content: center;
    line-height: 1;
    min-height: 1.45rem;
    min-width: 1.45rem;
    padding: 0 0.4rem;
}
.mythic-eventing-detail-count-active {
    background-color: var(--mythic-global-239);
    border: 1px solid var(--mythic-global-347);
    color: var(--mythic-global-002);
}
.mythic-eventing-detail-count-empty {
    background-color: var(--mythic-global-262);
    border: 1px solid var(--mythic-global-010);
    color: var(--mythic-global-025);
    font-weight: 750;
    opacity: 0.62;
}
.mythic-eventing-detail-accordion {
    background-color: var(--mythic-global-009) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008) !important;
    box-shadow: none !important;
    margin: 0 !important;
    overflow: hidden;
}
.mythic-eventing-detail-accordion:before {
    display: none;
}
.mythic-eventing-detail-accordion + .mythic-eventing-detail-accordion {
    margin-top: 0.5rem !important;
}
.mythic-eventing-detail-accordion .MuiAccordionSummary-root {
    background-color: var(--mythic-global-305);
    min-height: 2.4rem !important;
    padding: 0 0.7rem !important;
}
.mythic-eventing-detail-accordion .MuiAccordionSummary-content {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    font-weight: 850;
    margin: 0.48rem 0 !important;
}
.mythic-eventing-detail-accordion .MuiAccordionDetails-root {
    border-top: 1px solid var(--mythic-global-010);
    padding: 0.7rem !important;
}
.mythic-eventing-metadata-accordion .MuiAccordionDetails-root {
    max-height: min(48vh, 30rem);
    overflow: auto;
}
.mythic-eventing-metadata-comparison {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
}
.mythic-eventing-metadata-comparison-single .mythic-eventing-metadata-pair-grid {
    grid-template-columns: 1fr;
}
.mythic-eventing-metadata-pair {
    min-width: 0;
}
.mythic-eventing-metadata-pair-title {
    color: var(--mythic-global-025);
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1.2;
    margin-bottom: 0.35rem;
}
.mythic-eventing-metadata-pair-grid,
.mythic-eventing-metadata-static-grid {
    display: grid;
    gap: 0.55rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
}
.mythic-eventing-metadata-panel {
    background-color: var(--mythic-global-396);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
    overflow: hidden;
}
.mythic-eventing-metadata-panel-title {
    background-color: var(--mythic-global-231);
    border-bottom: 1px solid var(--mythic-global-010);
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 850;
    line-height: 1.2;
    padding: 0.45rem 0.55rem;
}
.mythic-eventing-code-block {
    background-color: var(--mythic-global-397);
    color: var(--mythic-global-002);
    margin: 0;
    max-height: 18rem;
    min-height: 3.4rem;
    overflow: auto;
    padding: 0;
}
.mythic-eventing-code-block .ace_editor {
    background-color: transparent !important;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
}
.mythic-eventing-code-block .ace_gutter {
    background-color: var(--mythic-global-398) !important;
    border-right: 1px solid var(--mythic-global-010);
    color: var(--mythic-global-025) !important;
}
.mythic-eventing-code-block .ace_scroller {
    background-color: transparent !important;
}
.mythic-eventing-code-block-empty {
    align-items: center;
    color: var(--mythic-global-025);
    display: flex;
    font-family: var(--mythic-global-003);
    font-size: 0.74rem;
    font-weight: 700;
    padding: 0.62rem;
}
.mythic-eventing-detail-table-wrap {
    max-height: 18rem;
    overflow: auto;
}
.mythic-eventing-detail-table-wrap .MuiTable-root {
    min-width: 650px;
}
.mythic-eventing-detail-table-wrap .MuiTableCell-root {
    vertical-align: middle;
}
.mythic-eventing-resource-link {
    word-break: break-all;
}
.mythic-eventing-resource-secondary {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.35;
}
.mythic-eventing-resource-command {
    color: var(--mythic-global-002);
    font-weight: 850;
}
@media (max-width: 900px) {
    .mythic-eventing-header-duration {
        align-items: flex-start;
        text-align: left;
    }
    .mythic-eventing-metadata-pair-grid,
    .mythic-eventing-metadata-static-grid {
        grid-template-columns: 1fr;
    }
}
.mythic-service-actions {
    gap: 0.55rem;
}
.mythic-installed-service-identity {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-installed-service-name {
    color: var(--mythic-global-002);
    font-weight: 850;
    line-height: 1.25;
    overflow-wrap: anywhere;
}
.mythic-installed-service-name-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    min-width: 0;
}
.mythic-installed-service-metadata-grid {
    display: grid;
    gap: 0.32rem 0.7rem;
    grid-template-columns: 7rem minmax(0, 1fr);
    min-width: 0;
}
.mythic-installed-service-metadata-item {
    display: contents;
}
.mythic-installed-service-metadata-label,
.mythic-installed-service-detail-label {
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 750;
    line-height: 1.2;
}
.mythic-installed-service-metadata-label {
    align-self: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-installed-service-metadata-value,
.mythic-installed-service-detail-value {
    color: var(--mythic-global-002);
    font-size: 0.8rem;
    font-weight: 500;
    line-height: 1.25;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
}
.mythic-installed-service-metadata-grid .mythic-installed-service-chip-list {
    flex-wrap: nowrap;
    overflow: hidden;
}
.mythic-installed-service-metadata-custom-value {
    min-width: 0;
}
.mythic-installed-service-metadata-code {
    background-color: var(--mythic-global-377);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    display: inline-block;
    font-family: var(--mythic-global-105);
    font-size: 0.75rem;
    line-height: 1.25;
    max-width: 100%;
    overflow: hidden;
    padding: 0.12rem 0.32rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-installed-service-chip-list {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    min-width: 0;
}
.mythic-installed-service-chip {
    background-color: var(--mythic-global-399);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 750;
    line-height: 1.2;
    max-width: 9rem;
    min-width: 0;
    overflow: hidden;
    padding: 0.16rem 0.42rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-installed-service-chip-more {
    color: var(--mythic-global-025);
}
.mythic-installed-service-action-chip-list {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    min-width: 0;
}
.mythic-installed-service-action-chip {
    align-items: center;
    background-color: var(--mythic-global-399);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    cursor: pointer;
    display: inline-flex;
    font-size: 0.72rem;
    font-weight: 700;
    gap: 0.3rem;
    line-height: 1.2;
    max-width: 11rem;
    min-height: 24px;
    min-width: 0;
    overflow: hidden;
    padding: 0.12rem 0.38rem 0.12rem 0.48rem;
    transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}
.mythic-installed-service-action-chip > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-installed-service-action-chip .MuiSvgIcon-root {
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    font-size: 0.92rem;
}
.mythic-installed-service-action-chip:hover {
    background-color: var(--mythic-global-044);
    border-color: var(--mythic-global-151);
    color: var(--mythic-global-023);
}
.mythic-installed-service-action-chip:hover .MuiSvgIcon-root {
    color: var(--mythic-global-023);
}
.mythic-installed-service-action-chip:disabled {
    color: var(--mythic-global-066);
    cursor: default;
    opacity: 0.72;
}
.mythic-installed-service-action-chip:disabled:hover {
    background-color: var(--mythic-global-399);
    border-color: var(--mythic-global-010);
    color: var(--mythic-global-066);
}
.mythic-installed-service-empty-value {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-weight: 650;
}
.mythic-installed-service-description {
    color: var(--mythic-global-025);
    min-width: 0;
}
.mythic-installed-service-description > span {
    display: block;
    font-size: 0.68rem;
    font-weight: 750;
    line-height: 1.2;
    margin-bottom: 0.18rem;
}
.mythic-installed-service-description > p {
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    color: var(--mythic-global-002);
    display: -webkit-box;
    font-size: 0.8rem;
    font-weight: 500;
    line-height: 1.35;
    margin: 0;
    overflow: hidden;
    white-space: pre-wrap;
}
.mythic-installed-service-browser-metadata {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
}
.mythic-installed-service-browser-author {
    color: var(--mythic-global-002);
    font-size: 0.82rem;
    font-weight: 500;
    line-height: 1.3;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-installed-service-browser-metrics {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.6rem;
    min-width: 0;
}
.mythic-installed-service-browser-metric {
    align-items: center;
    display: inline-flex;
    gap: 0.3rem;
    min-width: 0;
}
.mythic-installed-service-browser-metric > span:first-child {
    color: var(--mythic-global-025);
    font-size: 0.68rem;
    font-weight: 750;
    line-height: 1.2;
}
.mythic-installed-service-browser-metric > strong {
    color: var(--mythic-global-002);
    font-size: 0.78rem;
    font-weight: 500;
    line-height: 1.2;
}
.mythic-installed-service-detail-row .mythic-installed-service-detail-cell {
    border-bottom: 0 !important;
    padding: 0 !important;
}
.mythic-installed-service-detail-panel {
    background-color: var(--mythic-global-400);
    border-top: 1px solid var(--mythic-global-010);
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    margin: 0;
    padding: 0.85rem 1rem 1rem;
}
.mythic-installed-service-detail-section {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    min-width: 0;
    overflow: hidden;
}
.mythic-installed-service-detail-section-header {
    align-items: center;
    background-color: var(--mythic-global-401);
    border-bottom: 1px solid var(--mythic-global-010);
    color: var(--mythic-global-070);
    display: flex;
    font-size: 0.76rem;
    font-weight: 850;
    justify-content: space-between;
    letter-spacing: 0;
    min-height: 2rem;
    padding: 0.35rem 0.6rem;
}
.mythic-installed-service-detail-section-body {
    padding: 0.65rem;
}
.mythic-installed-service-detail-list {
    display: grid;
    gap: 0.5rem 0.85rem;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}
.mythic-installed-service-detail-list-item {
    display: flex;
    flex-direction: column;
    gap: 0.22rem;
    min-width: 0;
}
.mythic-installed-service-definition-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
}
.mythic-installed-service-definition-row {
    align-items: center;
    background-color: var(--mythic-global-400);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
    padding: 0.5rem 0.6rem;
}
.mythic-installed-service-definition-main {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}
.mythic-installed-service-definition-title {
    color: var(--mythic-global-002);
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.25;
    overflow-wrap: anywhere;
}
.mythic-installed-service-definition-subtitle,
.mythic-installed-service-definition-description {
    color: var(--mythic-global-025);
    font-size: 0.75rem;
    font-weight: 650;
    line-height: 1.35;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-installed-service-definition-action {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
}
.mythic-service-status-summary {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: 0.32rem;
    margin-top: 0.28rem;
    min-width: 0;
}
.mythic-installed-service-identity .mythic-service-status-summary {
    margin-top: 0;
}
.mythic-service-status-primary {
    align-items: center;
    color: var(--mythic-global-002);
    display: flex;
    font-size: 0.84rem;
    font-weight: 800;
    gap: 0.38rem;
    line-height: 1.25;
    min-width: 0;
}
.mythic-service-status-primary-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-service-status-dot,
.mythic-service-status-mini-dot {
    border-radius: 999px;
    flex: 0 0 auto;
}
.mythic-service-status-dot {
    height: 0.55rem;
    width: 0.55rem;
}
.mythic-service-status-mini-dot {
    height: 0.38rem;
    width: 0.38rem;
}
.mythic-service-status-summary-success .mythic-service-status-dot {
    background-color: var(--mythic-global-035);
    box-shadow: 0 0 0 3px var(--mythic-global-402);
}
.mythic-service-status-summary-warning .mythic-service-status-dot {
    background-color: var(--mythic-global-038);
    box-shadow: 0 0 0 3px var(--mythic-global-403);
}
.mythic-service-status-summary-error .mythic-service-status-dot {
    background-color: var(--mythic-global-048);
    box-shadow: 0 0 0 3px var(--mythic-global-404);
}
.mythic-service-status-details {
    align-items: center;
    color: var(--mythic-global-025);
    display: flex;
    flex-wrap: wrap;
    font-size: 0.73rem;
    font-weight: 650;
    gap: 0.35rem 0.55rem;
    line-height: 1.3;
    min-width: 0;
}
.mythic-service-status-detail {
    align-items: center;
    display: inline-flex;
    gap: 0.22rem;
    min-width: 0;
}
.mythic-service-status-detail-label {
    color: var(--mythic-global-025);
}
.mythic-service-status-detail-value {
    color: var(--mythic-global-002);
    font-weight: 750;
}
.mythic-service-status-detail-neutral .mythic-service-status-mini-dot {
    background-color: var(--mythic-global-405);
}
.mythic-service-status-detail-success .mythic-service-status-mini-dot {
    background-color: var(--mythic-global-035);
}
.mythic-service-status-detail-warning .mythic-service-status-mini-dot {
    background-color: var(--mythic-global-038);
}
.mythic-service-status-detail-error .mythic-service-status-mini-dot {
    background-color: var(--mythic-global-048);
}
.mythic-split-action-group {
    box-shadow: none !important;
    display: inline-flex;
    overflow: hidden;
}
.mythic-split-action-group .MuiButton-root,
.mythic-split-action-group .MuiIconButton-root {
    border-radius: 0 !important;
    height: 30px;
    margin-left: -1px;
}
.mythic-split-action-group .MuiButton-root:first-of-type,
.mythic-split-action-group .MuiIconButton-root:first-of-type {
    border-bottom-left-radius: var(--mythic-global-008) !important;
    border-top-left-radius: var(--mythic-global-008) !important;
    margin-left: 0;
}
.mythic-split-action-group .MuiButton-root:last-of-type,
.mythic-split-action-group .MuiIconButton-root:last-of-type {
    border-bottom-right-radius: var(--mythic-global-008) !important;
    border-top-right-radius: var(--mythic-global-008) !important;
}
.mythic-split-action-group .mythic-table-row-action {
    min-width: 7.5rem;
}
.mythic-split-action-group .mythic-table-row-icon-action {
    width: 34px;
}
.mythic-split-action-group .mythic-table-row-icon-action-success {
    background-color: var(--mythic-global-351) !important;
    border-color: var(--mythic-global-352) !important;
}
.mythic-split-action-group .mythic-table-row-icon-action-success:hover {
    background-color: var(--mythic-global-233) !important;
    border-color: var(--mythic-global-234) !important;
}
.mythic-split-action-group .mythic-table-row-icon-action-danger {
    background-color: var(--mythic-global-353) !important;
    border-color: var(--mythic-global-354) !important;
}
.mythic-split-action-group .mythic-table-row-icon-action-danger:hover {
    background-color: var(--mythic-global-322) !important;
    border-color: var(--mythic-global-323) !important;
}
.MuiIconButton-root.mythic-response-action-button {
    background-color: var(--mythic-global-306) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008) !important;
    box-shadow: none !important;
    color: var(--mythic-global-025) !important;
    height: 30px;
    padding: 0;
    transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease;
    width: 30px;
}
.MuiIconButton-root.mythic-response-action-button .MuiSvgIcon-root,
.MuiIconButton-root.mythic-response-action-button .svg-inline--fa {
    color: inherit !important;
}
.MuiIconButton-root.mythic-response-action-button:hover {
    background-color: var(--mythic-global-406) !important;
    border-color: var(--mythic-global-007) !important;
    color: var(--mythic-global-002) !important;
}
.mythic-response-action-menu {
    padding: 0.25rem !important;
}
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-menu-item {
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-025);
    min-height: 34px;
}
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-menu-item .MuiListItemIcon-root {
    color: inherit;
    min-width: 2rem;
}
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-menu-item .MuiSvgIcon-root,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-menu-item .svg-inline--fa {
    color: inherit !important;
}
.MuiIconButton-root.mythic-response-action-button.mythic-response-action-hover-info:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-info:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-info.Mui-focusVisible {
    background-color: var(--mythic-global-044) !important;
    border-color: var(--mythic-global-151) !important;
    color: var(--mythic-global-023) !important;
}
.MuiIconButton-root.mythic-response-action-button.mythic-response-action-hover-success:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-success:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-success.Mui-focusVisible {
    background-color: var(--mythic-global-045) !important;
    border-color: var(--mythic-global-148) !important;
    color: var(--mythic-global-035) !important;
}
.MuiIconButton-root.mythic-response-action-button.mythic-response-action-hover-warning:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-warning:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-warning.Mui-focusVisible {
    background-color: var(--mythic-global-046) !important;
    border-color: var(--mythic-global-407) !important;
    color: var(--mythic-global-038) !important;
}
.MuiIconButton-root.mythic-response-action-button.mythic-response-action-hover-danger:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-danger:hover,
.mythic-response-action-menu .MuiMenuItem-root.mythic-response-action-hover-danger.Mui-focusVisible {
    background-color: var(--mythic-global-047) !important;
    border-color: var(--mythic-global-408) !important;
    color: var(--mythic-global-048) !important;
}
.mythic-menu-item-hover-info .MuiSvgIcon-root,
.mythic-menu-item-hover-success .MuiSvgIcon-root,
.mythic-menu-item-hover-warning .MuiSvgIcon-root,
.mythic-menu-item-hover-danger .MuiSvgIcon-root {
    color: inherit !important;
}
.mythic-menu-item-hover-info:hover,
.mythic-menu-item-hover-info.Mui-focusVisible {
    background-color: var(--mythic-global-044) !important;
    color: var(--mythic-global-023) !important;
}
.mythic-menu-item-hover-success:hover,
.mythic-menu-item-hover-success.Mui-focusVisible {
    background-color: var(--mythic-global-045) !important;
    color: var(--mythic-global-035) !important;
}
.mythic-menu-item-hover-warning:hover,
.mythic-menu-item-hover-warning.Mui-focusVisible {
    background-color: var(--mythic-global-046) !important;
    color: var(--mythic-global-038) !important;
}
.mythic-menu-item-hover-danger:hover,
.mythic-menu-item-hover-danger.Mui-focusVisible {
    background-color: var(--mythic-global-390) !important;
    color: var(--mythic-global-048) !important;
}
.mythic-status-stack {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
}
.mythic-dialog-switch-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin: 0;
    width: 100%;
}
.mythic-dialog-preview {
    align-items: center;
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    min-height: 38px;
    min-width: 0;
    padding: 0 0.75rem;
}
.mythic-dialog-file-target {
    align-items: center;
    background-color: var(--mythic-global-009);
    border: 1px dashed var(--mythic-global-007);
    border-radius: var(--mythic-global-008);
    display: flex;
    justify-content: center;
    min-height: 7rem;
    padding: 0.75rem;
}
.mythic-dialog-table-wrap {
    max-height: min(45vh, 28rem);
}
.mythic-transfer-section {
    margin-top: 0.75rem;
}
.mythic-block-list-dialog-content {
    min-height: min(70vh, 42rem);
}
.mythic-block-list-dialog-body {
    gap: 0.75rem;
}
.mythic-block-list-loading {
    align-items: center;
    color: var(--mythic-global-002);
    display: flex;
    gap: 0.65rem;
    min-height: 8rem;
    justify-content: center;
}
.mythic-block-list-payload-tabs {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    margin-bottom: 0.75rem;
    min-height: 38px;
}
.mythic-block-list-payload-tabs .MuiTab-root {
    min-height: 38px;
    padding: 0.35rem 0.7rem;
}
.mythic-block-list-payload-tab-label {
    align-items: center;
    display: flex;
    gap: 0.45rem;
    min-width: 0;
}
.mythic-block-list-payload-tab-label > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-block-list-payload-tab-count {
    align-items: center;
    background-color: var(--mythic-global-029);
    border: 1px solid var(--mythic-global-010);
    border-radius: 999px;
    color: var(--mythic-global-002);
    display: inline-flex;
    font-size: 0.68rem;
    font-weight: 700;
    justify-content: center;
    line-height: 1;
    min-width: 1.4rem;
    padding: 0.18rem 0.38rem;
}
.mythic-block-list-transfer-grid {
    align-items: stretch;
    display: grid;
    gap: 0.5rem;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}
.mythic-transfer-list {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    border-radius: var(--mythic-global-008);
    display: flex;
    flex-direction: column;
    min-height: 16rem;
    min-width: 0;
    overflow: hidden;
    width: 100%;
}
.mythic-transfer-list-header {
    background-color: var(--mythic-global-409);
    border-bottom: 1px solid var(--mythic-global-007);
    color: var(--mythic-global-002);
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.25;
    padding: 0.45rem 0.6rem;
    text-transform: uppercase;
}
.mythic-transfer-list-body {
    flex: 1 1 auto;
    max-height: 30vh;
    min-height: 12rem;
    overflow: auto;
}
.mythic-transfer-list .MuiList-root {
    background: transparent;
    border: 0;
    border-radius: 0;
}
.mythic-transfer-controls {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    justify-content: center;
    padding: 0 0.5rem;
}
.mythic-transfer-controls .MuiButton-root {
    background-color: var(--mythic-global-029) !important;
    border: 1px solid var(--mythic-global-010) !important;
    border-radius: var(--mythic-global-008);
    box-shadow: none !important;
    color: var(--mythic-global-002) !important;
    min-height: 30px;
    min-width: 34px;
    padding: 0.25rem 0.45rem;
}
.mythic-transfer-controls .MuiButton-root:hover {
    background-color: var(--mythic-global-258) !important;
}
@media screen and (max-width: 700px) {
    .mythic-dialog-choice-row {
        grid-template-columns: 1fr;
    }
    .mythic-dialog-choice-divider {
        text-align: left;
    }
    .mythic-block-list-transfer-grid {
        grid-template-columns: 1fr;
    }
    .mythic-block-list-transfer-grid .mythic-transfer-controls {
        flex-direction: row;
    }
}
.MuiTabs-root {
    min-height: 34px;
}
.MuiTab-root {
    min-width: unset !important;
    max-width: unset;
    white-space: unset !important;
}
.MuiTabs-scrollButtons {
    width: unset;
}
.MuiTabs-flexContainer {
    flex-wrap: wrap;
}
.MuiTabs-scrollButtons.Mui-disabled {
  opacity: 0.3;
}
.mythic-search-tabs-bar.MuiPaper-root {
    background-image: var(--mythic-global-069);
}
.mythic-search-tabs.MuiTabs-root {
    min-height: 42px;
}
.mythic-search-tabs .MuiTabs-flexContainer {
    flex-wrap: nowrap;
}
.mythic-search-tabs .MuiTab-root {
    min-height: 42px;
    padding: 0.45rem 0.7rem;
}
.mythic-search-tab-label {
    align-items: center;
    display: inline-flex;
    gap: 0.42rem;
    white-space: nowrap;
}
.mythic-search-tab-label .MuiSvgIcon-root,
.mythic-search-tab-label .svg-inline--fa {
    color: inherit;
    font-size: 1rem;
}
.mythic-chat-layout {
    display: flex;
    min-height: 0;
    flex: 1 1 auto;
    overflow: visible;
}
.mythic-chat-layout > .gutter.gutter-horizontal {
    cursor: col-resize;
    margin: 0;
    position: relative;
    margin-top: 10px;
    margin-bottom: 10px;
}
.mythic-chat-layout > .gutter.gutter-horizontal::after {
    background-color: var(--mythic-global-411);
    border-radius: 999px;
    content: "";
    position: absolute;
    transition: background-color 120ms ease;
}
.mythic-chat-layout > .gutter.gutter-horizontal:hover::after {
    background-color: var(--mythic-global-070);
}
.mythic-chat-sidebar {
    background-color: var(--mythic-global-410);
    border: 1px solid var(--mythic-global-411);
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    border-radius: 8px;
    box-shadow: inset 0 1px 0 var(--mythic-global-096);
    overflow: hidden;
}
.mythic-chat-layout-channels-collapsed .mythic-chat-sidebar {
    border-left-width: 0;
    border-right-width: 0;
    opacity: 0;
    pointer-events: none;
}
.mythic-chat-sidebar-toolbar {
    background-color: var(--mythic-global-412);
    border-bottom: 1px solid var(--mythic-global-411);
    color: var(--mythic-global-070);
    min-height: 48px;
}
.mythic-chat-sidebar-toolbar,
.mythic-chat-conversation-header,
.mythic-chat-composer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
}
.mythic-chat-sidebar-heading {
    align-items: center;
    display: flex;
    gap: 8px;
    min-width: 0;
}
.mythic-chat-sidebar-heading .MuiTypography-root {
    font-weight: 750;
}
.mythic-chat-sidebar-count {
    background-color: var(--mythic-global-340) !important;
    border: 1px solid var(--mythic-global-097) !important;
    color: var(--mythic-global-070) !important;
    font-size: 0.68rem !important;
    font-weight: 800 !important;
    height: 22px !important;
}
.mythic-chat-conversation-header {
    background-color: var(--mythic-global-412);
    border-bottom: 1px solid var(--mythic-global-411);
    box-shadow: inset 0 1px 0 var(--mythic-global-096);
    color: var(--mythic-global-070);
    min-height: 54px;
}
.mythic-chat-composer {
    box-shadow: inset 0 1px 0 var(--mythic-global-413);
    align-items: center;
}
.mythic-chat-channel-section {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 8px;
    overflow-y: auto;
}
.mythic-chat-channel-section > .MuiTypography-caption {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
}
.mythic-chat-channel-button {
    align-items: center;
    border: 1px solid transparent;
    border-radius: 7px;
    cursor: pointer;
    display: grid;
    gap: 8px;
    grid-template-columns: 26px minmax(0, 1fr) auto;
    min-height: 42px;
    padding: 6px 8px;
    text-align: left;
    transition: background-color 120ms ease, border-color 120ms ease;
}
.mythic-chat-channel-button:hover {
    background-color: var(--mythic-global-013) !important;
    border-color: var(--mythic-global-413) !important;
}
.mythic-chat-channel-button-selected {
    box-shadow: inset 3px 0 0 var(--mythic-chat-channel-accent);
}
.mythic-chat-channel-icon,
.mythic-chat-author,
.mythic-chat-search-channel {
    align-items: center;
    display: inline-flex;
    gap: 5px;
}
.mythic-chat-channel-icon {
    color: var(--mythic-chat-channel-accent);
    justify-content: center;
}
.mythic-chat-channel-button-archived .mythic-chat-channel-icon {
    color: var(--mythic-chat-channel-warning);
}
.mythic-chat-channel-button-archived .mythic-chat-channel-name,
.mythic-chat-channel-button-archived .mythic-chat-channel-meta {
    color: var(--mythic-chat-channel-muted);
}
.mythic-chat-channel-main {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}
.mythic-chat-channel-name {
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-chat-channel-meta {
    font-size: 0.74rem;
    opacity: 0.72;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-chat-channel-states {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}
.mythic-chat-channel-state,
.mythic-chat-unread-badge {
    align-items: center;
    background: var(--mythic-global-414);
    border-radius: 999px;
    display: inline-flex;
    font-size: 0.66rem;
    font-weight: 800;
    line-height: 1.2;
    padding: 2px 6px;
    white-space: nowrap;
}
.mythic-chat-channel-state-archived {
    color: var(--mythic-chat-channel-warning);
    box-shadow: inset 0 0 0 1px var(--mythic-chat-channel-warning);
}
.mythic-chat-channel-state-locked {
    color: var(--mythic-chat-channel-warning);
}
.mythic-chat-channel-state-offline {
    color: var(--mythic-chat-channel-error);
}
.mythic-chat-unread-badge {
    align-self: center;
    color: var(--mythic-chat-channel-error);
    box-shadow: inset 0 0 0 1px var(--mythic-chat-channel-error);
}
.mythic-chat-main {
    background-color: var(--mythic-global-009);
    border: 1px solid var(--mythic-global-010);
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    border-radius: 8px;
    overflow: hidden;
}
.mythic-chat-conversation-icon {
    align-items: center;
    border: 1px solid;
    border-radius: 7px;
    display: inline-flex;
    flex: 0 0 auto;
    height: 32px;
    justify-content: center;
    width: 32px;
}
.mythic-chat-conversation-title {
    font-weight: 800 !important;
    line-height: 1.2 !important;
}
.mythic-chat-conversation-subtitle {
    opacity: 0.82;
}
.mythic-chat-header-actions {
    align-items: center;
    display: flex;
    gap: 5px;
}
.mythic-chat-messages {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
    overflow-y: auto;
    padding: 10px;
}
.mythic-chat-message-row {
    display: flex;
    justify-content: flex-start;
}
.mythic-chat-message-row-mine {
    justify-content: flex-end;
}
.mythic-chat-message {
    border: 1px solid var(--mythic-chat-markdown-border);
    border-radius: 8px;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    padding: 0;
    width: fit-content;
}
.mythic-chat-message-header {
    align-items: center;
    background: var(--mythic-chat-markdown-surface);
    border-bottom: 1px solid var(--mythic-chat-markdown-border);
    display: flex;
    gap: 8px;
    justify-content: space-between;
    margin: 0;
    padding: 7px 10px;
}
.mythic-chat-message-system .mythic-chat-message-header {
    background: var(--mythic-global-415);
    border-bottom-color: var(--mythic-global-416);
}
.mythic-chat-author {
    font-weight: 750;
    min-width: 0;
}
.mythic-chat-author > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-chat-message-actions {
    align-items: center;
    display: flex;
    gap: 2px;
    white-space: nowrap;

}
.mythic-chat-message-actions .MuiTypography-caption {
    font-size: 0.72rem;
    font-weight: 650;
}
.mythic-chat-message-actions .MuiIconButton-root,
.mythic-chat-header-actions .MuiIconButton-root {
    border-radius: 6px;
    height: 28px;
    width: 28px;
}
.mythic-chat-paragraph {
    margin: 0 0 6px 0;
    overflow-wrap: anywhere;
    white-space: normal;
}
.mythic-chat-paragraph:last-child {
    margin-bottom: 0;
}
.mythic-chat-markdown {
    overflow-wrap: anywhere;
    padding: 8px 10px 9px;
}
.mythic-chat-special-card {
    display: flex;
    flex-direction: column;
    gap: 0.62rem;
    min-width: min(26rem, calc(100vw - 3rem));
    padding: 0.72rem 0.78rem;
}
.mythic-chat-eventing-card-waiting,
.mythic-chat-message-special-eventing-waiting,
.mythic-chat-message-special-mcp-waiting {
    --mythic-chat-special-accent-text: var(--mythic-global-038);
    --mythic-chat-special-accent-border: var(--mythic-global-037);
    --mythic-chat-special-accent-strong: var(--mythic-global-037);
    --mythic-chat-special-accent-soft: var(--mythic-global-036);
    --mythic-chat-special-chip-bg: var(--mythic-global-036);
}
.mythic-chat-eventing-card-success,
.mythic-chat-message-special-eventing-success,
.mythic-chat-message-special-mcp-success {
    --mythic-chat-special-accent-text: var(--mythic-global-035);
    --mythic-chat-special-accent-border: var(--mythic-global-034);
    --mythic-chat-special-accent-strong: var(--mythic-global-034);
    --mythic-chat-special-accent-soft: var(--mythic-global-033);
    --mythic-chat-special-chip-bg: var(--mythic-global-033);
}
.mythic-chat-eventing-card-error,
.mythic-chat-message-special-eventing-error,
.mythic-chat-message-special-mcp-error {
    --mythic-chat-special-accent-text: var(--mythic-global-048);
    --mythic-chat-special-accent-border: var(--mythic-global-058);
    --mythic-chat-special-accent-strong: var(--mythic-global-058);
    --mythic-chat-special-accent-soft: var(--mythic-global-047);
    --mythic-chat-special-chip-bg: var(--mythic-global-047);
}
.mythic-chat-eventing-card-running,
.mythic-chat-message-special-eventing-running,
.mythic-chat-message-special-mcp-running {
    --mythic-chat-special-accent-text: var(--mythic-global-023);
    --mythic-chat-special-accent-border: var(--mythic-global-022);
    --mythic-chat-special-accent-strong: var(--mythic-global-022);
    --mythic-chat-special-accent-soft: var(--mythic-global-021);
    --mythic-chat-special-chip-bg: var(--mythic-global-021);
}
.mythic-chat-eventing-card-queued,
.mythic-chat-eventing-card-neutral,
.mythic-chat-message-special-eventing-queued,
.mythic-chat-message-special-eventing-neutral,
.mythic-chat-message-special-mcp-queued,
.mythic-chat-message-special-mcp-neutral {
    --mythic-chat-special-accent-text: var(--mythic-global-027);
    --mythic-chat-special-accent-border: var(--mythic-global-030);
    --mythic-chat-special-accent-strong: var(--mythic-global-030);
    --mythic-chat-special-accent-soft: var(--mythic-global-026);
    --mythic-chat-special-chip-bg: var(--mythic-global-026);
}
.mythic-chat-message-special-eventing .mythic-chat-message-header,
.mythic-chat-message-special-mcp .mythic-chat-message-header {
    background: linear-gradient(90deg, var(--mythic-chat-special-accent-soft), transparent 72%);
    border-bottom-color: var(--mythic-chat-special-accent-border);
}
.mythic-chat-message-special-eventing .mythic-chat-author > span,
.mythic-chat-message-special-mcp .mythic-chat-author > span {
    color: var(--mythic-chat-special-accent-text);
}
.mythic-chat-special-card-header {
    align-items: center;
    display: flex;
    gap: 0.8rem;
    justify-content: space-between;
    min-width: 0;
}
.mythic-chat-special-card-title-wrap {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.14rem;
    min-width: 0;
}
.mythic-chat-special-card-title {
    color: var(--mythic-chat-special-accent-text);
    font-size: 0.9rem !important;
    font-weight: 850 !important;
    line-height: 1.2 !important;
    overflow-wrap: anywhere;
}
.mythic-chat-special-card-subtitle {
    color: var(--mythic-global-025);
    font-size: 0.72rem !important;
    font-weight: 700 !important;
    line-height: 1.25 !important;
    overflow-wrap: anywhere;
}
.mythic-chat-special-status.MuiChip-root {
    background-color: var(--mythic-chat-special-chip-bg) !important;
    border-color: var(--mythic-chat-special-accent-border) !important;
    border-radius: var(--mythic-global-008);
    color: var(--mythic-chat-special-accent-text) !important;
    flex: 0 0 auto;
    font-size: 0.7rem;
    font-weight: 800;
    height: 1.48rem;
}
.mythic-chat-special-status .MuiChip-label {
    color: inherit;
}
.mythic-chat-special-card-prompt {
    background-color: var(--mythic-chat-markdown-surface);
    border: 1px solid var(--mythic-chat-markdown-border);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    font-size: 0.8rem;
    font-weight: 650;
    line-height: 1.35;
    overflow-wrap: anywhere;
    padding: 0.54rem 0.62rem;
    white-space: pre-wrap;
}
.mythic-chat-special-card-details {
    display: grid;
    gap: 0.38rem 0.75rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
}
.mythic-chat-special-card-detail {
    display: flex;
    flex-direction: column;
    gap: 0.08rem;
    min-width: 0;
}
.mythic-chat-special-card-detail-label {
    color: var(--mythic-global-025);
    font-size: 0.62rem;
    font-weight: 850;
    letter-spacing: 0;
    line-height: 1.1;
    text-transform: uppercase;
}
.mythic-chat-special-card-detail-value {
    color: var(--mythic-global-002);
    font-size: 0.74rem;
    font-weight: 700;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-chat-special-card-footer {
    align-items: center;
    border-top: 1px solid var(--mythic-chat-markdown-border);
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    min-width: 0;
    padding-top: 0.58rem;
}
.mythic-chat-special-card-refresh-time {
    color: var(--mythic-global-025);
    flex: 1 1 auto;
    font-size: 0.68rem !important;
    font-weight: 650 !important;
    line-height: 1.2 !important;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-chat-special-card-actions {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    gap: 0.38rem;
    justify-content: flex-end;
}
.mythic-chat-mcp-arguments,
.mythic-chat-mcp-annotations {
    background-color: var(--mythic-chat-markdown-surface-strong);
    border: 1px solid var(--mythic-chat-markdown-border);
    border-radius: var(--mythic-global-008);
    color: var(--mythic-global-002);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace !important;
    font-size: 0.72rem !important;
    line-height: 1.35 !important;
    margin: 0 !important;
    max-height: 14rem;
    overflow: auto;
    padding: 0.55rem 0.62rem;
    white-space: pre-wrap;
}
.mythic-chat-mcp-annotations {
    color: var(--mythic-global-025);
    max-height: 8rem;
}
.mythic-chat-special-refresh-button.MuiIconButton-root {
    border: 1px solid var(--mythic-chat-markdown-border);
    border-radius: var(--mythic-global-008);
    height: 1.9rem;
    width: 1.9rem;
}
.mythic-chat-special-refresh-button.MuiIconButton-root:hover {
    border-color: var(--mythic-global-378);
}
.mythic-chat-edit-box {
    padding: 8px 10px 9px;
}
.mythic-chat-message > .MuiTypography-caption {
    padding: 0 10px 8px;
}
.mythic-chat-heading {
    font-weight: 800;
    line-height: 1.25;
    margin: 0 0 6px 0;
}
.mythic-chat-heading-1,
.mythic-chat-heading-2 {
    font-size: 1rem;
}
.mythic-chat-heading-3,
.mythic-chat-heading-4,
.mythic-chat-heading-5,
.mythic-chat-heading-6 {
    font-size: 0.9rem;
}
.mythic-chat-list {
    margin: 4px 0 8px 0;
    padding-left: 1.25rem;
}
.mythic-chat-list li {
    margin: 2px 0;
    padding-left: 0.15rem;
}
.mythic-chat-blockquote {
    background: var(--mythic-chat-markdown-surface);
    border: 1px solid var(--mythic-chat-markdown-border);
    border-left: 3px solid var(--mythic-chat-markdown-border);
    border-radius: 7px;
    color: inherit;
    margin: 6px 0;
    padding: 4px 8px 4px 10px;
}
.mythic-chat-rule {
    border: 0;
    border-top: 1px solid var(--mythic-chat-markdown-border);
    margin: 8px 0;
}
.mythic-chat-inline-code {
    background: var(--mythic-chat-markdown-surface);
    border: 1px solid var(--mythic-chat-markdown-border);
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.88em;
    padding: 1px 4px;
}
.mythic-chat-code-block {
    margin: 6px 0;
    position: relative;
}
.mythic-chat-code-block pre {
    background: var(--mythic-chat-markdown-surface);
    border: 1px solid var(--mythic-chat-markdown-border);
    border-radius: 7px;
    margin: 0;
    overflow-x: auto;
    padding: 10px;
}
.mythic-chat-code-block code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.86rem;
}
.mythic-chat-code-language {
    background: var(--mythic-chat-markdown-surface-strong);
    border: 1px solid var(--mythic-chat-markdown-border);
    border-radius: 4px;
    font-size: 0.68rem;
    font-weight: 700;
    padding: 1px 5px;
    position: absolute;
    right: 6px;
    top: 5px;
}
.mythic-chat-table-wrap {
    margin: 6px 0;
    max-width: 100%;
    overflow-x: auto;
    width: fit-content;
}
.mythic-chat-table {
    font-size: 0.82rem;
    min-width: 100%;
    width: 100%;
}
.mythic-chat-table .MuiTableCell-root {
    font-size: 0.82rem;
    vertical-align: top;
}
.mythic-chat-edit-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.mythic-chat-edit-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
}
.mythic-chat-dialog-content {
    padding-top: 20px !important;
}
.mythic-chat-composer .MuiFormControl-root {
    flex: 1 1 auto;
}
.mythic-chat-composer .MuiOutlinedInput-root {
    align-items: center;
    background: transparent;
    padding-left: 0;
}
.mythic-chat-composer .MuiOutlinedInput-notchedOutline {
    border: 0 !important;
}
.mythic-chat-composer .MuiInputBase-input {
    padding-left: 0 !important;
}
.mythic-chat-send-button .MuiSvgIcon-root {
    display: block;
}
.mythic-chat-system-button.MuiIconButton-root {
    border-radius: var(--mythic-global-008);
    flex: 0 0 auto;
    height: 38px;
    width: 38px;
}
.mythic-chat-system-destination {
    align-items: center;
    background-color: var(--mythic-global-013);
    border: 1px solid var(--mythic-global-413);
    border-radius: 7px;
    display: flex;
    gap: 8px;
    min-width: 0;
    padding: 8px 10px;
}
.mythic-chat-system-destination .MuiSvgIcon-root {
    color: var(--mythic-global-038);
}
.mythic-chat-system-options {
    background-color: var(--mythic-global-013);
    border: 1px solid var(--mythic-global-413);
    border-radius: 7px;
    padding: 4px 10px;
}
.mythic-chat-dialog-content .MuiFormControl-root {
    margin-top: 4px;
}
.mythic-chat-search-dialog.MuiDialog-paper {
    height: min(720px, calc(100vh - 64px));
}
.mythic-chat-search-content {
    flex: 1 1 auto;
    min-height: 0;
}
.mythic-chat-search-form {
    align-items: center;
    display: grid;
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) auto;
}
.mythic-chat-search-form .MuiFormControl-root {
    margin-top: 0;
}
.mythic-chat-search-form .MuiButton-root {
    height: 40px;
    white-space: nowrap;
}
.mythic-chat-empty-state {
    align-items: center;
    align-self: center;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 6px;
    justify-content: center;
    min-height: 12rem;
    opacity: 0.72;
    text-align: center;
}
.mythic-chat-empty-list {
    background: var(--mythic-global-417);
    border-radius: 7px;
    font-size: 0.76rem;
    opacity: 0.72;
    padding: 9px;
}
.mythic-chat-search-results {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
    overflow-y: auto;
}
.mythic-chat-search-result {
    background: transparent;
    border: 1px solid var(--mythic-global-413);
    border-radius: 7px;
    color: inherit;
    cursor: pointer;
    display: grid;
    gap: 6px;
    padding: 9px 10px;
    text-align: left;
    transition: background-color 120ms ease, border-color 120ms ease;
}
.mythic-chat-search-result:hover {
    background-color: var(--mythic-global-013);
    border-color: var(--mythic-global-038);
}
.mythic-chat-search-result-header {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    min-width: 0;
}
.mythic-chat-search-channel {
    font-weight: 750;
    min-width: 0;
}
.mythic-chat-search-channel > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.mythic-chat-search-message {
    display: -webkit-box;
    line-height: 1.42;
    overflow: hidden;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
}
.mythic-chat-search-meta {
    flex: 0 0 auto;
    font-size: 0.74rem;
    opacity: 0.72;
    white-space: nowrap;
}
.mythic-chat-search-highlight {
    background-color: var(--mythic-global-036);
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px var(--mythic-global-037);
    color: inherit;
    font-weight: 800;
    padding: 0 2px;
}
.mythic-chat-search-empty {
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    justify-content: center;
    opacity: 0.7;
    text-align: center;
}
@media (max-width: 900px) {
    .mythic-chat-sidebar {
        max-height: 220px;
    }
    .mythic-chat-message {
        max-width: 100%;
        min-width: 0;
    }
    .mythic-chat-special-card-details {
        grid-template-columns: minmax(0, 1fr);
    }
    .mythic-chat-special-card-footer {
        align-items: flex-start;
        flex-direction: column;
        gap: 0.5rem;
    }
    .mythic-chat-special-card-actions {
        justify-content: flex-start;
        width: 100%;
    }
    .mythic-chat-search-dialog.MuiDialog-paper {
        height: calc(100vh - 32px);
    }
    .mythic-chat-search-form {
        grid-template-columns: 1fr;
    }
    .mythic-chat-search-form .MuiButton-root {
        width: 100%;
    }
    .mythic-chat-search-result-header {
        align-items: flex-start;
        flex-direction: column;
        gap: 3px;
    }
    .mythic-chat-search-meta {
        white-space: normal;
    }
}
.ace_editor{
    background-color: var(--mythic-global-418);
}
.ace_gutter {
    //background: transparent !important;
    background-color: var(--mythic-global-418) !important;
    color: var(--mythic-global-212) !important;
}
.ace_editor .ace_text-layer {
    color: var(--mythic-global-212);
}
.rounded-tab { 
    border-top-left-radius: var(--mythic-global-008);
    border-top-right-radius: var(--mythic-global-008);
    padding: 2px 10px 0 10px;
    border-top: 1px solid var(--mythic-global-005);
    border-left: 1px solid var(--mythic-global-005);
    border-right: 1px solid var(--mythic-global-005);
    border-bottom: 1px solid var(--mythic-global-005);
    position: relative;
    top: 2px;
    word-break: break-all;
}
.empty-table-header {
    border: 1px solid var(--mythic-global-005) !important;
    height: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
}
.code-box {
    border: 1px solid var(--mythic-global-005) !important;
    padding: 0px 5px 0px 5px;
    overflow: auto;
    white-space: pre;
    background-color: black;
    color: white;
}
.mythic-reference-picker-dialog {
    min-height: 520px;
}
.mythic-reference-picker-toolbar {
    align-items: center;
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
}
.mythic-reference-picker-body {
    border: 1px solid var(--mythic-global-005);
    border-radius: 6px;
    height: min(560px, calc(100vh - 280px));
    min-height: 360px;
    overflow: hidden;
}
.mythic-reference-picker-body > .mythic-credential-search {
    height: 100%;
    width: 100%;
}
.mythic-tasking-reference-chip {
    flex: 0 0 auto;
}
.mythic-tasking-reference-field-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    min-width: min(520px, 80vw);
}
.mythic-tasking-reference-field-button.MuiButton-root {
    justify-content: flex-start;
    text-transform: none;
}
.mythic-tasking-reference-field-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    width: 100%;
}
.mythic-tasking-reference-field-row.MuiButton-root {
    align-items: stretch;
    justify-content: flex-start;
    padding: 6px 8px;
    text-align: left;
    text-transform: none;
}
.mythic-tasking-reference-field-row-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    width: 100%;
}
.mythic-tasking-reference-field-row-header {
    align-items: flex-start;
    display: flex;
    gap: 6px;
    justify-content: space-between;
    min-width: 0;
}
.mythic-tasking-reference-field-row-label {
    color: var(--mythic-global-025);
    flex: 0 0 auto;
    font-size: 0.78rem;
    font-weight: 800;
    min-width: 0;
}
.mythic-tasking-reference-field-row-reference {
    font-family: var(--mythic-global-065);
    font-size: 0.72rem;
    min-width: 0;
    text-align: right;
    overflow-wrap: anywhere;
}
.mythic-tasking-reference-field-row-value {
    color: var(--mythic-global-025);
    font-family: var(--mythic-global-065);
    font-size: 0.72rem;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    min-width: 0;
    overflow: hidden;
    overflow-wrap: anywhere;
    white-space: normal;
}
.mythic-tasking-reference-review-context {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 10px;
    min-width: 0;
}
.mythic-tasking-reference-review-command {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-weight: 800;
}
.mythic-tasking-reference-review-preview {
    background-color: var(--mythic-global-013);
    border: 1px solid var(--mythic-global-005);
    border-radius: 6px;
    font-family: var(--mythic-global-065);
    font-size: 0.78rem;
    line-height: 1.45;
    margin: 0;
    max-height: min(360px, 45vh);
    overflow: auto;
    padding: 8px;
    white-space: pre-wrap;
    word-break: break-word;
}
.mythic-tasking-reference-review-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.mythic-tasking-reference-review-row {
    align-items: stretch;
    border: 1px solid var(--mythic-global-005);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    padding: 8px;
}
.mythic-tasking-reference-review-row-header {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    min-width: 0;
}
.mythic-tasking-reference-review-row-meta {
    align-items: flex-end;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}
.mythic-tasking-reference-review-label {
    color: var(--mythic-global-025);
    font-size: 0.78rem;
    font-weight: 800;
}
.mythic-tasking-reference-review-raw {
    color: var(--mythic-global-025);
    font-family: var(--mythic-global-065);
    font-size: 0.72rem;
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: right;
}
.mythic-tasking-reference-review-value {
    color: var(--mythic-global-025);
    display: -webkit-box;
    font-family: var(--mythic-global-065);
    font-size: 0.74rem;
    line-height: 1.35;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    min-width: 0;
    overflow: hidden;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.mythic-reference-display {
    display: inline;
}
.mythic-reference-token {
    align-items: center;
    background-color: var(--mythic-global-199);
    border: 1px solid var(--mythic-global-200);
    border-radius: 5px;
    cursor: pointer;
    display: inline-flex;
    font-family: var(--mythic-global-065);
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.4;
    margin: 0 2px;
    max-width: 100%;
    min-width: 0;
    overflow-wrap: anywhere;
    padding: 0 5px;
    vertical-align: baseline;
}
.mythic-reference-token-warning {
    background-color: var(--mythic-global-055);
    border-color: var(--mythic-global-056);
}
`
