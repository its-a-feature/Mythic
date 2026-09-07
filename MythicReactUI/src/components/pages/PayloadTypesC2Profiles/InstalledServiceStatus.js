import React from 'react';

const getServiceStatusTone = (isOnline, fallbackTone = "success") => isOnline ? fallbackTone : "error";

const InstalledServiceStatusSummary = ({label, tone, details = []}) => (
    <div className={`mythic-service-status-summary items-start flex flex-column gap-3 mythic-tone-${tone} min-w-0`}>
        <div className="mythic-service-status-primary text-sm font-800 leading-125 items-center flex gap-3 min-w-0 text-primary">
            <span className="mythic-service-status-dot flex-none rounded-full" />
            <span className="mythic-service-status-primary-label truncate whitespace-nowrap">{label}</span>
        </div>
        {details.length > 0 &&
            <div className="mythic-service-status-details text-xs font-650 leading-130 items-center flex flex-wrap min-w-0 text-muted">
                {details.map((detail) => (
                    <span
                        className={`mythic-service-status-detail items-center inline-flex gap-2 mythic-tone-${detail.tone || "secondary"} min-w-0`}
                        key={`${detail.label}-${detail.value}`}
                    >
                        <span className="mythic-service-status-mini-dot flex-none rounded-full" />
                        <span className="mythic-service-status-detail-label">{detail.label}</span>
                        <span className="mythic-service-status-detail-value font-750 text-primary">{detail.value}</span>
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
        return [{label: "Server", value: "unavailable", tone: "secondary"}];
    }
    return [{label: "Container", value: "online", tone: getServiceStatusTone(service.container_running, "secondary")}];
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
