import React from 'react';

const getServiceStatusTone = (isOnline, fallbackTone = "success") => isOnline ? fallbackTone : "error";

const InstalledServiceStatusSummary = ({label, tone, details = []}) => (
    <div className={`mythic-service-status-summary mythic-service-status-summary-${tone}`.trim()}>
        <div className="mythic-service-status-primary">
            <span className="mythic-service-status-dot" />
            <span className="mythic-service-status-primary-label">{label}</span>
        </div>
        {details.length > 0 &&
            <div className="mythic-service-status-details">
                {details.map((detail) => (
                    <span
                        className={`mythic-service-status-detail mythic-service-status-detail-${detail.tone || "neutral"}`.trim()}
                        key={`${detail.label}-${detail.value}`}
                    >
                        <span className="mythic-service-status-mini-dot" />
                        <span className="mythic-service-status-detail-label">{detail.label}</span>
                        <span className="mythic-service-status-detail-value">{detail.value}</span>
                    </span>
                ))}
            </div>
        }
    </div>
);

export const InstalledServiceContainerStatus = ({isOnline}) => (
    <InstalledServiceStatusSummary
        label={isOnline ? "Container online" : "Container offline"}
        tone={isOnline ? "success" : "error"}
    />
);

const getC2ProfileStatusSummary = (service) => {
    if(!service.container_running){
        return {label: "Container offline", tone: "error"};
    }
    if(service.is_p2p){
        return {label: "Container online", tone: "success"};
    }
    if(service.running){
        return {label: "Accepting connections", tone: "success"};
    }
    return {label: "Server stopped", tone: "warning"};
}

const getC2ProfileStatusDetails = (service) => {
    if(service.is_p2p){
        return [];
    }
    if(!service.container_running){
        return [{label: "Server", value: "unavailable", tone: "neutral"}];
    }
    return [{label: "Container", value: "online", tone: getServiceStatusTone(service.container_running, "neutral")}];
}

export const C2ProfileStatusSummary = ({service}) => {
    const summary = getC2ProfileStatusSummary(service);
    return (
        <InstalledServiceStatusSummary
            label={summary.label}
            tone={summary.tone}
            details={getC2ProfileStatusDetails(service)}
        />
    )
}
